// Inspection session state and the serialized scan coordinator. The session
// publishes zero-I/O bootstrap Repository generation 0 synchronously with
// exactly one enabled idle Repository Source; the Repository and Global
// generation sequences are independent because their lifecycles are
// (Repository always exists, Global exists only between enable and
// disable). The coordinator serializes scans, keeps one request ID across a
// scan lifecycle, commits atomic N+1 replacements per sequence, and retains
// explicit-rescan stale state.
import { isAbsolute, join, resolve } from 'node:path';
import {
  SUPPORTED_TOOL_ORDER,
  createOpaqueId,
  createSourceBoundaryDto,
} from '../../shared/entities';
import { VENDOR_SURFACE_ORDER } from '../../shared/registries/behavior-text';
import type { VendorSurface } from '../../shared/registries/behavior-types';
import {
  SKILL_NAMING,
  facesSameNameCollision,
  skillCollisionGates,
} from '../../shared/skill-naming';
import { sameNameSkillResolutionFor } from '../../shared/registries/skill-resolution';
import {
  createBootstrapGeneration,
  prepareNextRepositoryGeneration,
  type GenerationOutcome,
  type GlobalScanGeneration,
  type RepositoryScanGeneration,
} from './scan-generation';
import type { FileOpener } from '../host/file-opener';
import { clearStaleFailures, deriveSnapshotState, upsertStaleFailure } from './stale-failures';
import type { SourceBoundaryDto, SupportedTool } from '../../shared/entities';
import type {
  CustomizationFileDto,
  CustomizationFileSummaryDto,
  DeclaredEntryDto,
  FileDetailDto,
  FileOpenTarget,
  FileRecognitionDto,
  InspectionDataResult,
  InstructionInventoryEntryDto,
  McpCarrierDetailDto,
  McpDeclarationDto,
  McpServerDeclarationDto,
  McpInventoryEntryDto,
  PermissionPolicyDetailDto,
  PromptDefinitionDto,
  AgentDefinitionDto,
  AgentInventoryEntryDto,
  PromptInventoryEntryDto,
  PermissionsInventoryEntryDto,
  RuleInventoryEntryDto,
  SameNameSkillResolutionDto,
  SkillDefinitionDto,
  ScanProgressPhase,
  ScanProgressDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceStatus,
  StaleSourceFailure,
} from '../../shared/api-types';
import type { RecognitionDetails, ToolRecognition } from '../inspection/recognizers/candidate';
import type { SerializedDiagnostic } from '../../shared/diagnostics';

/** The validated CLI selection handed to session bootstrap (FR-001). */
export interface SessionBootstrapInput {
  /** The one captured `process.cwd()` (FR-001). */
  readonly invocationCwd: string;
  /** The validated `--root` value; null when the option was omitted. */
  readonly rootOptionValue: string | null;
  /**
   * The applications this machine can open a committed file in, probed once
   * before the host binds. Held rather than copied: the snapshot derives the
   * offered targets from it, so what a page offers and what an open request
   * can launch are one fact (contracts/http-api.md § open-file).
   */
  readonly fileOpener: FileOpener;
}

/**
 * One Source's mutable operational overlay: what the coordinator writes as
 * attempts are admitted, progress is reported, and results commit, distinct
 * from the committed generations themselves. Constructed idle, which is the
 * whole bootstrap overlay — every later value is a coordinator write.
 */
class MutableSourceState {
  /** The Source this operational overlay belongs to. */
  public readonly sourceId: string;

  /** The Source's public status; see {@link SourceStatus}. */
  public status: SourceStatus = 'idle';

  /**
   * The latest admitted scan request for this Source. Null before any
   * admission, and again once every admitted attempt has been revoked
   * (data-model.md § Source).
   */
  public scanRequestId: string | null = null;

  /**
   * This Source's scan progress, which outlives the scan: the completed
   * counters and the `complete` phase stay so a Ready or Partial Source can
   * state what its committed attempt did. Null while the Source is `idle` or
   * `failed` (data-model.md § Source `progress`).
   */
  public progress: ScanProgressDto | null = null;

  /** Diagnostic IDs currently attached to this Source. */
  public diagnosticIds: readonly string[] = [];

  /** Starts the overlay idle for one Source. */
  public constructor(sourceId: string) {
    this.sourceId = sourceId;
  }
}
function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Projects one committed file into its content-free snapshot summary row
 * (contracts/http-api.md § get-session `files[]`). `sourceText` is
 * deliberately never copied: complete authored content is served only by the
 * detail routes, one file at a time (FR-027), so browsing an inventory never
 * fetches file contents at all.
 */
function summarizeFile(file: CustomizationFileDto): CustomizationFileSummaryDto {
  const base = {
    sourceId: file.sourceId,
    sourceRelativePath: file.sourceRelativePath,
    diagnosticIds: file.diagnosticIds,
  };
  switch (file.encoding) {
    case 'utf-8':
    case 'utf-8-replaced':
      return {
        ...base,
        encoding: file.encoding,
        hadLeadingBom: file.hadLeadingBom,
        sizeBytes: file.sizeBytes,
      };
    case 'binary':
      return { ...base, encoding: file.encoding, sizeBytes: file.sizeBytes };
    case 'unknown':
      return { ...base, encoding: file.encoding };
  }
}

/**
 * Projects the skill inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `skills[]`, data-model.md § Inventory
 * unit): one entry per name as one tool resolves it, each listing every
 * `SKILL.md` a recognizing tool resolves it for.
 *
 * Every tool resolves the authored name — or the skill directory name when
 * the file declares none or declares it empty, so every row has a name to be
 * listed under — and a Claude recognition of a nested skill prefixes it
 * root-relative (FR-007), so one file's recognitions can land on two
 * entries — each listing only the tools that resolve that entry's name.
 *
 * A recognition names its file by Source-relative Path, so the projection
 * needs no filesystem access and two snapshots of one generation publish the
 * same rows.
 */
function projectSkillInventory(
  recognitions: readonly ToolRecognition[],
  skillCompanionsByPath: ReadonlyMap<string, readonly string[]>,
): SkillInventoryEntryDto[] {
  const byName = new Map<string, { name: string; definitions: SkillDefinitionDto[] }>();
  for (const recognition of recognitions) {
    if (!isSkillRecognition(recognition)) {
      continue;
    }
    const naming = SKILL_NAMING[recognition.tool];
    const path = recognition.sourceRelativePath;
    const declared = recognition.details.declaredName;
    const name = naming.rowName(path, declared);
    let entry = byName.get(name);
    if (entry === undefined) {
      entry = { name, definitions: [] };
      byName.set(name, entry);
    }
    // A definition is one recognition — the ToolRecognition unit, one per
    // `(file, tool)`, which is also the identity the detail route addresses
    // as `/skills/<tool>/<source-relative path>` — so a file two products resolve to one
    // name is two definitions of that entry, and a product resolving a
    // different name — Claude prefixing a nested skill — defines on that
    // name's entry instead. The census is the file's, so each of its
    // definitions carries the same list; the parse state is the
    // recognition's own, and the extraction-failure reference each failed
    // definition republishes is the kind's one shared record — the parse ran
    // once (FR-028). A failed extraction leaves
    // the authored name unknown — not absent — so the row keeps only the
    // directory-derived provisional identity, and the invocation name is
    // published only where the tool's naming survives the failure
    // (skill-naming.ts).
    entry.definitions.push({
      sourceRelativePath: path,
      tool: recognition.tool,
      // The surfaces this one recognition's admissions rest on, derived the
      // same way every other kind's row derives them (FR-009): a definition is
      // a recognition, so it states them too.
      surfaces: surfacesOf(recognition),
      parseStatus: recognition.parseStatus,
      invocationName:
        recognition.parseStatus === 'failed'
          ? naming.invocationNameForFailedExtraction(path)
          : naming.invocationName(path, declared),
      diagnosticIds: recognition.diagnosticIds,
      companionFiles: skillCompanionsByPath.get(path) ?? [],
    });
  }
  // One collision gate per recognizing tool over the whole generation's
  // definitions — a gate can span rows, Claude's does — through the shared
  // assembly the client's filtered view also uses (skill-naming.ts), so the
  // two surfaces cannot drift.
  const collisionGates = skillCollisionGates(
    [...byName.values()].flatMap((entry) => entry.definitions),
  );

  const entries = [...byName.values()].map((entry): SkillInventoryEntryDto => {
    // Files in Source-relative Path order, then the contracted tool order
    // within one file, so two snapshots of one generation publish the same
    // rows and an opaque ID never decides a visible order.
    const definitions = entry.definitions.toSorted((left, right) => {
      const pathDelta = compareStrings(left.sourceRelativePath, right.sourceRelativePath);
      return pathDelta !== 0
        ? pathDelta
        : SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
    });
    return {
      name: entry.name,
      definitions,
      // A resolution belongs to one tool, and it answers what that tool does
      // when *it* faces the collision its rule is about. Counting the row's
      // definitions for every tool alike would state Claude's rule and
      // Codex's rule for a row holding one file each tool recognizes alone —
      // a collision neither product has.
      sameNameResolutions: resolutionsFor(definitions, collisionGates),
    };
  });
  // Entries in name order: the row's own key sorts it, and an opaque ID never
  // decides a visible order.
  return entries.sort((left, right) => compareStrings(left.name, right.name));
}

/**
 * One recognition's surfaces, in the closed surface order: the union over its
 * own admissions, derived where they are published rather than stored — an
 * admission holds the rule that authorized it, and a rule already names the
 * behaviors it rests on, so a stored list would be a second copy of what those
 * records say. The union is what makes a root
 * `.github/copilot-instructions.md` name all three Copilot surfaces while the
 * same filename in a subdirectory names the CLI's alone — two admissions of
 * one file against one.
 *
 * Every publication of a recognition states them, whatever the kind's row unit
 * is (FR-009): a file-unit row's `recognitions[]`, and a skill definition,
 * which is one recognition under a name.
 *
 * Naming a surface is never a claim that the surface loaded the file
 * (FR-009).
 */
function surfacesOf(recognition: ToolRecognition): VendorSurface[] {
  const surfaces = new Set<VendorSurface>();
  for (const provenance of recognition.provenances) {
    for (const surface of provenance.recognizingSurfaces) {
      surfaces.add(surface);
    }
  }
  return VENDOR_SURFACE_ORDER.filter((surface) => surfaces.has(surface));
}

/**
 * The recognitions of one file, in the closed tool order with each product's
 * surfaces in the closed surface order — the wire shape every kind whose row
 * is addressed by a path publishes ({@link FileRecognitionDto}), the
 * instructions rows, the rule rows, and the permissions rows among them.
 *
 * One entry per tool, so a tool that recognized the file through more than one
 * rule states the union of those admissions' surfaces
 * ({@link surfacesOf} answers for one recognition; this merges by tool).
 */
function fileRecognitionsOf(recognitions: readonly ToolRecognition[]): FileRecognitionDto[] {
  const byTool = Map.groupBy(recognitions, (recognition) => recognition.tool);
  return SUPPORTED_TOOL_ORDER.filter((tool) => byTool.has(tool)).map((tool) => {
    const surfaces = new Set(byTool.get(tool)?.flatMap((recognition) => surfacesOf(recognition)));
    return { tool, surfaces: VENDOR_SURFACE_ORDER.filter((surface) => surfaces.has(surface)) };
  });
}

/**
 * Projects the instructions inventory from a generation's recognitions
 * (contracts/http-api.md § get-session, data-model.md § Inventory unit): one
 * entry per applicability range, listing each file that range governs with the
 * recognitions attached to it, in the closed tool order.
 *
 * A recognition's surfaces are the union over its own admissions, computed
 * here because this is where they are published: an admission holds the rule
 * that authorized it, and a rule already names the behaviors it rests on, so
 * a stored surface list would be a second copy of what those records say. The
 * union is what makes a root `.github/copilot-instructions.md` name all three
 * Copilot surfaces while the same filename in a subdirectory names the CLI's
 * alone — two admissions of one file against one.
 *
 * A null range is a row like any other — the row of files whose range is not
 * known, because their product reads this filename's range from its
 * declaration alone and the declarations supply none a row can be keyed by,
 * an unreadable declaration block among them (data-model.md § Inventory
 * unit). It sorts after every ranged row.
 *
 * Grouping is by exact text equality of the range each recognition derived —
 * nothing here parses a glob, normalizes a spelling, or decides whether two
 * ranges overlap — so the root `AGENTS.md` and `CLAUDE.md` share one row while
 * a `packages/api/CLAUDE.md` has its own. Ranges are in range order and files
 * within a range in Source-relative Path order, so two snapshots of one
 * generation publish the same rows and an opaque ID never decides a visible
 * order.
 *
 * Two recognitions of one file can derive different ranges when their rules
 * name different container directories; the file then appears under each,
 * carrying only the recognitions that put it there. That is the honest outcome
 * of two products governing differently, not a collision to resolve.
 */
function projectInstructionInventory(
  recognitions: readonly ToolRecognition[],
): InstructionInventoryEntryDto[] {
  const byRangeAndPath = new Map<string | null, Map<string, ToolRecognition[]>>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'instructions') {
      continue;
    }
    const range = recognition.details.applicabilityRange;
    let byPath = byRangeAndPath.get(range);
    if (byPath === undefined) {
      byPath = new Map();
      byRangeAndPath.set(range, byPath);
    }
    const group = byPath.get(recognition.sourceRelativePath);
    if (group === undefined) {
      byPath.set(recognition.sourceRelativePath, [recognition]);
    } else {
      group.push(recognition);
    }
  }
  return (
    [...byRangeAndPath.entries()]
      .map(([applicabilityRange, byPath]) => ({
        applicabilityRange,
        files: [...byPath.entries()]
          .map(([sourceRelativePath, group]) => ({
            sourceRelativePath,
            recognitions: fileRecognitionsOf(group),
          }))
          .sort((left, right) => compareStrings(left.sourceRelativePath, right.sourceRelativePath)),
      }))
      // Ranged rows in range order, and the one no-range row after them all —
      // nulls-last is the comparator's own rule ({@link compareStrings}).
      .sort((left, right) => compareStrings(left.applicabilityRange, right.applicabilityRange))
  );
}

/**
 * Projects the rules inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `rules[]`, data-model.md § Inventory
 * unit): one row per recognized rule file — the unit is the file — listing the
 * products that recognized it in the closed tool order, so two products
 * recognizing one file is two recognitions on one row.
 *
 * Rows are in Source-relative Path order, so two snapshots of one generation
 * publish the same rows and an opaque ID never decides a visible order.
 */
function projectRuleInventory(recognitions: readonly ToolRecognition[]): RuleInventoryEntryDto[] {
  const byPath = Map.groupBy(
    recognitions.filter((recognition) => recognition.details.kind === 'rule'),
    (recognition) => recognition.sourceRelativePath,
  );
  return [...byPath.entries()]
    .map(([sourceRelativePath, group]) => ({
      sourceRelativePath,
      recognitions: fileRecognitionsOf(group),
    }))
    .sort((left, right) => compareStrings(left.sourceRelativePath, right.sourceRelativePath));
}

/**
 * Projects the prompts-and-commands inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `prompts[]`, data-model.md § Inventory
 * unit): one entry per name a reader invokes, each listing every prompt or
 * command file a recognizing tool invokes it by.
 *
 * The name is the recognition's own — the admitting rule derived it from the
 * path when the file was recognized (`registry.ts`
 * § CompiledStaticPromptRule) — so this projection groups by it rather than
 * deriving it a second time where the two could disagree.
 *
 * Grouped like the skill inventory and not like the rules one, because the
 * unit is the same shape: a name, and the recognitions that resolve it. What
 * differs is where the name comes from — a skill declares one and a command
 * never does — which is why a command definition publishes no authored-name
 * parse state (data-model.md § Inventory unit).
 */
function projectPromptInventory(
  recognitions: readonly ToolRecognition[],
): PromptInventoryEntryDto[] {
  const byName = new Map<string, PromptDefinitionDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'prompt/command') {
      continue;
    }
    const definitions = byName.get(recognition.details.invocationName);
    const definition: PromptDefinitionDto = {
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      // The surfaces this one recognition's admissions rest on, derived the
      // same way every other kind's row derives them (FR-009).
      surfaces: surfacesOf(recognition),
      diagnosticIds: recognition.diagnosticIds,
    };
    if (definitions === undefined) {
      byName.set(recognition.details.invocationName, [definition]);
    } else {
      definitions.push(definition);
    }
  }
  return (
    [...byName.entries()]
      .map(([name, definitions]) => ({
        name,
        // Files in Source-relative Path order, then the contracted tool order
        // within one file, so two snapshots of one generation publish the same
        // rows and an opaque ID never decides a visible order.
        definitions: definitions.toSorted((left, right) => {
          const pathDelta = compareStrings(left.sourceRelativePath, right.sourceRelativePath);
          return pathDelta !== 0
            ? pathDelta
            : SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
        }),
      }))
      // Entries in name order: the row's own key sorts it.
      .sort((left, right) => compareStrings(left.name, right.name))
  );
}

/**
 * Projects the custom-agent inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `agents[]`, data-model.md § Inventory
 * unit): one entry per agent name the admitting rules resolve, each listing
 * every file a recognizing tool defines that agent in.
 *
 * The name is the recognition's own — read out of the file's declarations
 * when it was recognized (`candidate.ts`) — so this projection groups by it
 * rather than deriving it a second time where the two could disagree.
 *
 * Grouped like the MCP inventory rather than like the skill one, because the
 * name can be genuinely unknown: under a product that identifies an agent by
 * its declared `name`, a file declaring none, one declaring anything but a
 * scalar, and one whose declarations could not be read at all share the
 * null-named row that closes the list. No path fallback stands in for them —
 * those vendors make the declared `name` the source of truth and the filename
 * a convention, so a row named after the path would report an agent the
 * product does not have. Which fact names a definition is its admitting rule's
 * answer, so a Copilot definition of the same file is named by the
 * configuration file's own name and rows separately
 * (`rules/registry.ts` § CompiledStaticAgentRule.agentNameOf,
 * data-model.md § Inventory unit).
 */
function projectAgentInventory(recognitions: readonly ToolRecognition[]): AgentInventoryEntryDto[] {
  const byName = new Map<string | null, AgentDefinitionDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'agent') {
      continue;
    }
    const name = recognition.details.agentName ?? null;
    const definition: AgentDefinitionDto = {
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      // The surfaces this one recognition's admissions rest on, derived the
      // same way every other kind's row derives them (FR-009).
      surfaces: surfacesOf(recognition),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
    };
    const definitions = byName.get(name);
    if (definitions === undefined) {
      byName.set(name, [definition]);
    } else {
      definitions.push(definition);
    }
  }
  return (
    [...byName.entries()]
      .map(([name, definitions]) => ({
        name,
        // Files in Source-relative Path order, then the contracted tool order
        // within one file, so two snapshots of one generation publish the same
        // rows and an opaque ID never decides a visible order.
        definitions: definitions.toSorted((left, right) => {
          const pathDelta = compareStrings(left.sourceRelativePath, right.sourceRelativePath);
          return pathDelta !== 0
            ? pathDelta
            : SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
        }),
      }))
      // Entries in name order, the null-named row last: it is not a name, so
      // it closes the list rather than sorting among the names.
      .sort((left, right) =>
        left.name === null || right.name === null
          ? Number(left.name === null) - Number(right.name === null)
          : compareStrings(left.name, right.name),
      )
  );
}

/**
 * Projects the permissions inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `permissions[]`, data-model.md
 * § Inventory unit): one row per declared permission policy, named by the path
 * of the file that declares it. A recognition of this kind is what "declares a
 * policy" means, so every recognized path is a row and a file that declares
 * none never reaches here.
 *
 * Written out rather than shared with {@link projectRuleInventory}: the two
 * rows are different subjects, so the first fact a policy row gains that a rule
 * row has no answer for would break a shared projection, and what they have in
 * common today is a grouping loop.
 */
function projectPermissionsInventory(
  recognitions: readonly ToolRecognition[],
): PermissionsInventoryEntryDto[] {
  const byPath = Map.groupBy(
    recognitions.filter((recognition) => recognition.details.kind === 'permissions'),
    (recognition) => recognition.sourceRelativePath,
  );
  return [...byPath.entries()]
    .map(([sourceRelativePath, group]) => ({
      sourceRelativePath,
      recognitions: fileRecognitionsOf(group),
      // The extraction diagnostics the recognitions reference, deduplicated:
      // the block is read once per file, so every recognition of it points at
      // the one record (FR-028).
      diagnosticIds: [...new Set(group.flatMap((recognition) => recognition.diagnosticIds))],
    }))
    .sort((left, right) => compareStrings(left.sourceRelativePath, right.sourceRelativePath));
}

/**
 * Projects the MCP inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `mcp[]`, data-model.md § Inventory
 * unit): one entry per declared server name, listing every declaration that
 * resolves it — one per `(carrier, tool)`, the same grouping the skill
 * inventory gives its definitions — so a second carrier declaring the same
 * name joins the name's row rather than starting another.
 *
 * A carrier that currently publishes no named declaration still appears: the
 * one null-named entry closes the list with such carriers, where each
 * declaration's own `parseStatus` tells "the rows are unknown" (a failed
 * extraction) apart from "the carrier declares none" (FR-028). Entries are in
 * name order with the null row last, and declarations within an entry in
 * carrier-path then closed tool order, so two snapshots of one generation
 * publish the same rows and an opaque ID never decides a visible order.
 */
function projectMcpInventory(recognitions: readonly ToolRecognition[]): McpInventoryEntryDto[] {
  const byName = new Map<string | null, McpDeclarationDto[]>();
  // Which carriers publish at least one named declaration through any
  // product's reading. The no-name row is a statement about the file — "this
  // carrier currently publishes no named declaration" — so a reading that
  // finds no server in a file another product reads servers out of (the
  // CLI's bare schema against Claude's wrapper-only reading of one shared
  // root) must not put that same file under the no-name row beside its own
  // named rows.
  const pathsWithNames = new Set(
    recognitions
      .filter(isMcpRecognition)
      .filter(
        (recognition) =>
          recognition.parseStatus === 'parsed' && recognition.details.servers.length > 0,
      )
      .map((recognition) => recognition.sourceRelativePath),
  );
  for (const recognition of recognitions) {
    if (!isMcpRecognition(recognition)) {
      continue;
    }
    // The surfaces are the union over the recognition's own admissions,
    // computed here because this is where they are published — the same rule
    // the instructions inventory applies, and for the same reason: an
    // admission holds the rule that authorized it, and a stored surface list
    // would be a second copy of what those records say.
    const recognizingSurfaces = new Set<VendorSurface>();
    for (const provenance of recognition.provenances) {
      for (const surface of provenance.recognizingSurfaces) {
        recognizingSurfaces.add(surface);
      }
    }
    const declaration: McpDeclarationDto = {
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      surfaces: VENDOR_SURFACE_ORDER.filter((surface) => recognizingSurfaces.has(surface)),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
    };
    // A parsed reading contributes one declaration per name it declares; a
    // carrier with no named declaration from any reading — failed, or
    // declaring none — lands on the null row so its state stays a visible
    // row rather than a file in no kind (FR-028). A reading that finds no
    // server in a carrier whose names another reading publishes contributes
    // nothing: the no-name row is the file's statement, and the file does
    // publish named declarations.
    const names =
      recognition.parseStatus === 'parsed' && recognition.details.servers.length > 0
        ? recognition.details.servers.map((server) => server.name)
        : pathsWithNames.has(recognition.sourceRelativePath)
          ? []
          : [null];
    for (const name of names) {
      const declarations = byName.get(name);
      if (declarations === undefined) {
        byName.set(name, [declaration]);
      } else {
        declarations.push(declaration);
      }
    }
  }
  return (
    [...byName.entries()]
      .map(([name, declarations]): McpInventoryEntryDto => ({
        name,
        declarations: declarations.toSorted((left, right) => {
          const pathDelta = compareStrings(left.sourceRelativePath, right.sourceRelativePath);
          return pathDelta !== 0
            ? pathDelta
            : SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
        }),
      }))
      // Named rows in name order, and the one no-name row after them all —
      // nulls-last is the comparator's own rule ({@link compareStrings}).
      .sort((left, right) => compareStrings(left.name, right.name))
  );
}

/**
 * A recognition narrowed to the MCP kind, so {@link projectMcpInventory}
 * reads `details.servers` where its guard has already proved the kind instead
 * of re-narrowing per access.
 */
type McpRecognition = ToolRecognition & {
  readonly details: Extract<RecognitionDetails, { kind: 'MCP' }>;
};

/** Whether one recognition is the MCP kind, narrowing it for the grouping. */
function isMcpRecognition(recognition: ToolRecognition): recognition is McpRecognition {
  return recognition.details.kind === 'MCP';
}

/**
 * The union of one carrier's parsed readings, one entry per declared name in
 * the readings' publish order ({@link InspectionSession.mcpCarrierDetail}).
 * A shared name is one declaration read twice — every reading of one file
 * parses the same text, so the first occurrence carries the same fields any
 * later one would.
 */
function unionOfServerReadings(
  recognitions: readonly McpRecognition[],
): readonly McpServerDeclarationDto[] {
  const byName = new Map<string, McpServerDeclarationDto>();
  for (const recognition of recognitions) {
    if (recognition.parseStatus !== 'parsed') {
      continue;
    }
    for (const server of recognition.details.servers) {
      if (!byName.has(server.name)) {
        byName.set(server.name, server);
      }
    }
  }
  return [...byName.values()];
}

/**
 * A recognition narrowed to the skill kind, so {@link projectSkillInventory}
 * reads `details.declaredName` where its guard has already proved the skill
 * kind instead of re-narrowing per access.
 */
type SkillRecognition = ToolRecognition & {
  readonly details: Extract<RecognitionDetails, { kind: 'skill' }>;
};

/** Whether one recognition is the skill kind, narrowing it for the grouping. */
function isSkillRecognition(recognition: ToolRecognition): recognition is SkillRecognition {
  return recognition.details.kind === 'skill';
}

/**
 * A recognition narrowed to the instructions kind, so {@link
 * InspectionSession.fileDetail} reads the presentation fields where its guard
 * has already proved the kind instead of re-narrowing per access.
 */
type InstructionRecognition = ToolRecognition & {
  readonly details: Extract<RecognitionDetails, { kind: 'instructions' }>;
};

/** Whether one recognition is the instructions kind, narrowing it for the detail. */
function isInstructionRecognition(
  recognition: ToolRecognition,
): recognition is InstructionRecognition {
  return recognition.details.kind === 'instructions';
}
/**
 * The same-name resolution of each product behind a grouped entry, deduplicated
 * and in the contracted tool order. It states what each vendor documents so the
 * grouping never implies a winner the Inspector has not recorded (FR-007).
 *
 * Each statement is derived from the product's own shipped strategies, so it
 * cannot disagree with them. A product that establishes none contributes no
 * statement rather than a guessed one; a product with no skill rule also
 * recognizes no skill, so it cannot reach this at all.
 */
function resolutionsFor(
  definitions: readonly SkillDefinitionDto[],
  collisionGates: ReadonlyMap<SupportedTool, (rowPaths: readonly string[]) => boolean>,
): SameNameSkillResolutionDto[] {
  return [...new Set(definitions.map((definition) => definition.tool))]
    .sort((left, right) => SUPPORTED_TOOL_ORDER.indexOf(left) - SUPPORTED_TOOL_ORDER.indexOf(right))
    .flatMap((tool) => {
      // Which collision a tool's quoted rule answers is that tool's own
      // naming policy, asked through the shared per-view machinery
      // (skill-naming.ts): Codex's and Copilot's is the row-internal count,
      // Claude's spans rows through the skill directory clash.
      if (!facesSameNameCollision(collisionGates, tool, definitions)) {
        return [];
      }
      const resolution = sameNameSkillResolutionFor(tool);
      return resolution === null ? [] : [{ tool, resolution }];
    });
}

/**
 * Locale-independent string order, so every host sorts a snapshot alike.
 *
 * Null orders after every string. The one nullable ordering key in this
 * projection is the instructions inventory's applicability range, whose null
 * row closes the list (contracts/http-api.md § get-session): a row of files
 * that declare no range is not "less than" any range, so it follows them all,
 * and the rule lives here so the sort call reads like every other one instead
 * of restating it as a ternary.
 */
function compareStrings(left: string | null, right: string | null): number {
  if (left === null || right === null) {
    return left === null ? (right === null ? 0 : 1) : -1;
  }
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Builds the snapshot's deterministic inventory order: Source kind, the
 * Global tool where present, then the Source-relative path
 * (contracts/http-api.md § get-session). The pair is a total order already:
 * a path is unique within its Source, so no further key exists to need.
 */
function sortInventory(
  rows: readonly CustomizationFileSummaryDto[],
  sourceOrder: ReadonlyMap<string, number>,
): CustomizationFileSummaryDto[] {
  return rows.toSorted((left, right) => {
    const sourceDelta =
      (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }
    return compareStrings(left.sourceRelativePath, right.sourceRelativePath);
  });
}

/**
 * Creates the bootstrap session synchronously with zero filesystem I/O.
 * The selection (invocation cwd, `--root` value, selected root) is retained
 * internally for later scans and lifecycle correlation; publicly it
 * surfaces only as the non-authorizing boundary presentation. There is no
 * separate admission layer: the first scan simply reads the retained
 * selected root, and a missing or unreadable root fails that scan with the
 * source-scoped `root-unreadable` Diagnostic (FR-002).
 */
export class InspectionSession {
  /** Opaque identity of this process's one session. */
  public readonly sessionId: string;

  /** UTC bootstrap timestamp; also generation 0's start and finish. */
  public readonly createdAt: string;

  /** The bootstrap Repository Source's stable ID. */
  public readonly repositorySourceId: string;

  /** The one captured `process.cwd()` (FR-001); identity, not read authority. */
  public readonly invocationCwd: string;

  /**
   * The sole validated `--root` value, null when omitted; retained for
   * lifecycle correlation (data-model.md § InspectionSession).
   */
  public readonly rootOptionValue: string | null;

  /** The selected Repository root later scans traverse (FR-001); never serialized. */
  public readonly selectedRepositoryRoot: string;

  /**
   * The applications this machine can open a committed file in. Private
   * because nothing outside reads it: the snapshot derives the offered
   * targets from it and {@link openCommittedFile} performs the launch, so
   * what is offered and what can be launched cannot disagree.
   */
  readonly #fileOpener: FileOpener;

  /** Last committed Repository generation (never null after bootstrap); written by the coordinator's commit. */
  public committedRepositoryGeneration: RepositoryScanGeneration;

  /** Last committed Global generation; null while disabled (FR-042). */
  public committedGlobalGeneration: GlobalScanGeneration | null = null;

  /** Stale overlays from failed explicit rescans, sorted by sourceId; written by the coordinator. */
  public staleFailures: readonly StaleSourceFailure[] = [];

  /**
   * Session-owned lifecycle Diagnostics (at most one per lifecycle owner,
   * data-model.md § Diagnostic), keyed by diagnosticId; every retained
   * record is referenced by exactly one public owner field.
   */
  public readonly sessionDiagnostics = new Map<string, SerializedDiagnostic>();

  /**
   * The current Repository `root-unreadable` lifecycle Diagnostic from the
   * automatic first scan (FR-002); cleared by the affected Source's
   * successful commit or replaced by an explicit-rescan stale owner.
   */
  public repositoryFailureDiagnosticId: string | null = null;

  /** Per-Source mutable operational overlays. */
  public readonly sourceStates: Map<string, MutableSourceState>;

  /** The Repository Source's non-authorizing boundary presentation. */
  public readonly boundary: SourceBoundaryDto;

  /** Bootstraps generation 0 from the launch-time facts (FR-001/FR-002). */
  public constructor(input: SessionBootstrapInput) {
    this.createdAt = nowIso();
    this.sessionId = createOpaqueId();
    this.repositorySourceId = createOpaqueId();
    this.invocationCwd = input.invocationCwd;
    this.rootOptionValue = input.rootOptionValue;
    this.#fileOpener = input.fileOpener;
    // Resolved lexically (FR-001): the captured invocation directory when
    // `--root` was omitted, the option value unchanged when it is absolute,
    // and the option resolved against the captured directory when it is
    // relative. `node:path` operations only — no filesystem is touched, so
    // this makes no claim about whether the root exists, and it never probes
    // for a repository marker to find one.
    this.selectedRepositoryRoot =
      input.rootOptionValue === null
        ? input.invocationCwd
        : isAbsolute(input.rootOptionValue)
          ? input.rootOptionValue
          : resolve(input.invocationCwd, input.rootOptionValue);
    this.boundary = createSourceBoundaryDto(
      this.selectedRepositoryRoot,
      input.rootOptionValue === null ? 'process-cwd' : 'root-option',
    );
    this.committedRepositoryGeneration = createBootstrapGeneration(this.createdAt);
    this.sourceStates = new Map([
      [this.repositorySourceId, new MutableSourceState(this.repositorySourceId)],
    ]);
  }

  /**
   * Resolves one committed file's complete detail, including the authored
   * source the snapshot deliberately withholds (FR-027).
   *
   * The path is the file's identity (FR-030), resolved against the current
   * committed generations only, so a request made after a commit answers with
   * what the new generation holds at that path — or null when it holds
   * nothing — never with a previous generation's record. The lookup spans
   * both sequences because the two are independent; a path is unique per
   * Source, and the shipped milestone has one Source — the Global tasks add
   * the Source dimension when a second one can hold the same path.
   */
  /**
   * Hands one committed file to an application on the reader's machine
   * (contracts/http-api.md § open-file), answering whether there was a file
   * to hand over. `false` means the current committed generations hold
   * nothing at that path — the same staleness every detail function answers
   * with, from the same causes: never scanned, or removed by the commit that
   * replaced the snapshot the page was rendered from.
   *
   * The path is resolved against the committed generations rather than
   * trusted, so the only absolute path a launch can ever receive is one this
   * session published (FR-022). Only the Repository generation has a root on
   * this session today; a Global generation's own root arrives with the phase
   * that enables one, and until then its files answer `false` instead of
   * being opened from the wrong root.
   */
  public async openCommittedFile(
    sourceRelativePath: string,
    target: FileOpenTarget,
  ): Promise<boolean> {
    const committed = this.committedRepositoryGeneration.files.some(
      (candidate) => candidate.sourceRelativePath === sourceRelativePath,
    );
    if (!committed) {
      return false;
    }
    // The Source-relative Path is the file's identity and is always spelled
    // with `/`; the platform's own separator is what `join` supplies.
    await this.#fileOpener.openFile(
      join(this.selectedRepositoryRoot, ...sourceRelativePath.split('/')),
      target,
    );
    return true;
  }

  public fileDetail(sourceRelativePath: string): FileDetailDto | null {
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      const file = generation.files.find(
        (candidate) => candidate.sourceRelativePath === sourceRelativePath,
      );
      if (file === undefined) {
        continue;
      }
      // The file's own diagnostic references are the response's whole set:
      // the (file, kind) extraction-failure record is among them (FR-028).
      // Filtered from the generation's own ordered records rather than built
      // from the ID set, so the detail keeps the deterministic emission order
      // the commit published (data-model.md § Diagnostic).
      const diagnostics = generation.diagnostics.filter((diagnostic) =>
        file.diagnosticIds.includes(diagnostic.diagnosticId),
      );
      // The parse the detail shows is the file's, not a recognizing tool's:
      // every recognition of the file's kind shares the one extraction
      // (candidate.ts), so any one of them carries it. The variants are tried
      // in a fixed order — the three Markdown kinds, then the custom-agent
      // kind, then the rule kind — and a
      // file no recognition owns is the plain one: a census companion, or a
      // diagnostic-only candidate (contracts/http-api.md § get-file-detail).
      // One file can hold two of these kinds: `CLAUDE.md` is a Claude
      // instruction file at every depth, so a `.claude/rules/CLAUDE.md` is
      // also a Claude rule and is a row in both inventories. A detail is
      // addressed by the path alone, so both rows open the one answer this
      // order settles on — which is why neither page requires its own kind of
      // what arrives; what each renders is the document, and every variant
      // carries it the same way. Only
      // the explicit carriers hold MCP recognitions: a file of another kind that spells MCP-looking
      // configuration is that kind's ordinary content, served here under its
      // own kind with every declared key visible in its presentation.
      const skill = generation.recognitions.find(
        (recognition): recognition is SkillRecognition =>
          recognition.sourceRelativePath === sourceRelativePath && isSkillRecognition(recognition),
      );
      if (skill !== undefined) {
        return {
          kind: 'skill',
          file,
          // Null exactly for a failed extraction: nothing was parsed, and the
          // diagnostic above is the failure's record (FR-028).
          presentation:
            skill.parseStatus === 'parsed'
              ? { frontmatter: skill.details.frontmatter, bodyText: skill.details.bodyText }
              : null,
          diagnostics,
        };
      }
      // A standalone MCP carrier has no FileDetail at all: its detail is
      // `mcpCarrierDetail`'s own result, because every variant this function
      // serves carries the full file, and the carrier's whole admission rests
      // on its bytes reaching no response (FR-007). Null is the same
      // stale-resource answer as a path the generations hold nothing at
      // (contracts/http-api.md § get-file-detail). Decided before the
      // instructions variant, which does carry the full body text: a Codex
      // `project_doc_fallback_filenames` entry naming `.mcp.json` makes the
      // root carrier an instructions candidate too, and answering that
      // recognition first would hand out the bytes FR-007 withholds — the
      // carrier's protection wins over the fallback recognition's detail.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceRelativePath === sourceRelativePath && isMcpRecognition(recognition),
        )
      ) {
        return null;
      }
      const instruction = generation.recognitions.find(
        (recognition): recognition is InstructionRecognition =>
          recognition.sourceRelativePath === sourceRelativePath &&
          isInstructionRecognition(recognition),
      );
      if (instruction !== undefined) {
        return {
          kind: 'instructions',
          file,
          // The same all-or-nothing rule as the skill variant (FR-028).
          presentation:
            instruction.parseStatus === 'parsed'
              ? {
                  frontmatter: instruction.details.frontmatter,
                  bodyText: instruction.details.bodyText,
                }
              : null,
          diagnostics,
        };
      }
      // A recognized command file: the file plus the same one parse, because a
      // command file carries a skill's frontmatter keys. Decided after the
      // instructions variant, and that order is what a `.claude/commands/`
      // directory holding a `CLAUDE.md` or an `AGENTS.md` settles on — such a
      // file is an instruction file by its name and a command by its
      // directory, and a detail is addressed by the path alone. Either variant
      // renders the same document and the same declarations, so which one the
      // order reaches changes nothing a reader sees.
      //
      // A loop rather than `find`: the callback's narrowing would not reach
      // here without a hand-authored predicate, which asserts the kind instead
      // of proving it, while `continue` narrows `details` by the compiler's own
      // control flow.
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceRelativePath !== sourceRelativePath ||
          recognition.details.kind !== 'prompt/command'
        ) {
          continue;
        }
        return {
          kind: 'prompt/command',
          file,
          // The same all-or-nothing rule as the skill variant (FR-028).
          presentation:
            recognition.parseStatus === 'parsed'
              ? {
                  frontmatter: recognition.details.frontmatter,
                  bodyText: recognition.details.bodyText,
                }
              : null,
          diagnostics,
        };
      }
      // A recognized custom-agent file: the file and the two halves its own
      // parse resolved. Decided after the three Markdown kinds, and the
      // overlap that order settles is shipped rather than hypothetical: a
      // `.claude/agents/CLAUDE.md` is a Claude subagent by its directory and a
      // Claude instruction file by its name, so both rules admit it and this
      // order hands it out as the instructions variant. Nothing is lost by
      // that: a Markdown agent's two halves are the frontmatter block and the
      // body, which is exactly what `MarkdownPresentationDto` carries, so the
      // agent route maps that variant onto its own shape rather than treating
      // the file as unparsed (`pages/agents/[...path].vue` § presentation).
      // Reordering would only move the problem: the instruction route would
      // then receive an agent variant it has no mapping for.
      //
      // A loop rather than `find`: the callback's narrowing would not reach
      // here without a hand-authored predicate, which asserts the kind instead
      // of proving it, while `continue` narrows `details` by the compiler's own
      // control flow.
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceRelativePath !== sourceRelativePath ||
          recognition.details.kind !== 'agent'
        ) {
          continue;
        }
        return {
          kind: 'agent',
          file,
          // Null exactly for a failed extraction, the same all-or-nothing rule
          // the skill variant follows: both halves are unknown rather than
          // absent, and the complete source stays readable (FR-028).
          presentation:
            recognition.parseStatus === 'parsed'
              ? {
                  metadata: recognition.details.metadata,
                  instructionsText: recognition.details.instructionsText,
                }
              : null,
          diagnostics,
        };
      }
      // A declared permission policy has no FileDetail at all, the same way a
      // standalone MCP carrier has none: what a permissions row names is a
      // policy rather than a file (data-model.md § Inventory unit), so it is
      // `permissionPolicyDetail`'s resource, and answering here would publish
      // it as a file — as "no recognition owns this", for a path whose own
      // inventory row says one does. Null is the same stale-resource answer
      // as a path the generations hold nothing at (contracts/http-api.md
      // § get-file-detail).
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'permissions',
        )
      ) {
        return null;
      }
      // A recognized rule file: the file, and nothing read out of it. A rule
      // is published as the one document its author wrote — a Claude rule
      // whole, frontmatter block included — so the variant carries no
      // presentation (contracts/http-api.md § get-file-detail). Decided after
      // the two Markdown kinds because one file can hold two of these kinds —
      // a `.claude/rules/CLAUDE.md` is a Claude rule by its directory and a
      // Claude instruction file by its name — and a detail is addressed by
      // the path alone, so this fixed order is what settles which variant
      // both rows open.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'rule',
        )
      ) {
        return {
          kind: 'rule',
          file,
          diagnostics,
        };
      }
      return {
        kind: 'file',
        file,
        diagnostics,
      };
    }
    return null;
  }

  /**
   * Resolves one declared permission policy — the whole document its author
   * wrote, with the declaring file's own facts and diagnostics
   * (contracts/http-api.md § get-permission-policy-detail).
   *
   * Its own resolver rather than a `fileDetail` branch because a permissions
   * row names a policy, not a file (data-model.md § Inventory unit): the row's
   * identity is the declaring file's path, which is what this takes, and the
   * shipped policy happens to be the whole document while the form a carrier
   * declares as one block arrives with the phase that recognizes one.
   *
   * Null when the current committed generations hold no permissions
   * recognition at the path, which the handler answers as the
   * `stale-resource` rejection.
   */
  public permissionPolicyDetail(sourceRelativePath: string): PermissionPolicyDetailDto | null {
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      // The recognition itself decides the form: a carrier's reading published
      // the block it declared, and a file that is the policy carries no such
      // reading. Narrowed by the compiler's own control flow over the kind and
      // the field the two members differ in — a loop rather than `find`,
      // because a callback's narrowing does not reach the caller without a
      // hand-authored predicate (data-model.md § ToolRecognition).
      let policy: readonly DeclaredEntryDto[] | null | undefined;
      let declared = false;
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceRelativePath !== sourceRelativePath ||
          recognition.details.kind !== 'permissions'
        ) {
          continue;
        }
        declared = true;
        if ('declaredPolicy' in recognition.details) {
          // Null exactly for a failed extraction, whose Diagnostic the file
          // already carries: the block is unknown rather than absent (FR-028).
          policy = recognition.parseStatus === 'failed' ? null : recognition.details.declaredPolicy;
          break;
        }
      }
      if (!declared) {
        continue;
      }
      const file = generation.files.find(
        (candidate) => candidate.sourceRelativePath === sourceRelativePath,
      );
      if (file === undefined) {
        // A recognition exists only for a committed file, so the pair cannot
        // separate within one generation; failing loudly beats serving a
        // policy whose file facts this commit does not hold.
        throw new Error('a permissions recognition names a file its generation does not hold');
      }
      // The declaring file's own diagnostic references, in the commit's
      // deterministic order — the same rule `fileDetail` applies (FR-028).
      const diagnostics = generation.diagnostics.filter((diagnostic) =>
        file.diagnosticIds.includes(diagnostic.diagnosticId),
      );
      // Returned per branch rather than through one literal carrying a union
      // `form`: each form is its own member of the result, and building one
      // object from a widened discriminant would need a cast to prove what the
      // branch already knows.
      return policy === undefined
        ? {
            form: 'whole-document',
            file,
            diagnostics,
          }
        : {
            form: 'declared-block',
            // The content-free summary: the carrier's facts without its source
            // text, absent from the shape rather than withheld at render time
            // (FR-007).
            file: summarizeFile(file),
            declaredPolicy: policy,
            diagnostics,
          };
    }
    return null;
  }

  /**
   * Resolves one MCP carrier's declarations — the servers it declares and
   * its own content-free file facts, never its source text (FR-007;
   * contracts/http-api.md § get-mcp-carrier-detail). Only the explicit
   * carriers hold MCP recognitions: a file of
   * any other kind that spells MCP-looking configuration never resolves
   * here — its configuration is that kind's own detail content. Null when
   * the current committed generations hold no MCP recognition at the path,
   * which the handler answers as the `stale-resource` rejection.
   */
  public mcpCarrierDetail(sourceRelativePath: string): McpCarrierDetailDto | null {
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      // Every MCP recognition at the path, not the first: one physical
      // carrier can be read by several products, and since the CLI's bare
      // schema exists their readings can differ — Claude reads no server out
      // of a bare-form root `.mcp.json` while the Copilot CLI does — so the
      // file-unit detail answers with the union of the readings rather than
      // with whichever tool's recognition happens to sit first.
      const mcpRecognitions = generation.recognitions.filter(
        (recognition): recognition is McpRecognition =>
          recognition.sourceRelativePath === sourceRelativePath && isMcpRecognition(recognition),
      );
      const [mcp] = mcpRecognitions;
      if (mcp === undefined) {
        continue;
      }
      const file = generation.files.find(
        (candidate) => candidate.sourceRelativePath === sourceRelativePath,
      );
      if (file === undefined) {
        // A recognition exists only for a committed file, so the pair cannot
        // separate within one generation; failing loudly beats serving a
        // detail whose file facts this commit does not hold.
        throw new Error('an MCP recognition names a file its generation does not hold');
      }
      // The file's own diagnostic references, in the commit's deterministic
      // order — the same rule `fileDetail` applies (FR-028).
      const diagnostics = generation.diagnostics.filter((diagnostic) =>
        file.diagnosticIds.includes(diagnostic.diagnosticId),
      );
      return {
        // The content-free summary: the carrier's facts without its source
        // text, absent from the shape rather than withheld at render time
        // (FR-007).
        file: summarizeFile(file),
        // Null exactly for a failed extraction: the readings run over the
        // one source text through the same parser family, so they fail
        // together, nothing was parsed, the rows are unknown rather than
        // absent, and the diagnostic above is the failure's record (FR-028).
        // Otherwise the union of the parsed readings, one entry per declared
        // name in the readings' own publish order: each recognizing tool runs
        // its own documented reading over the one decoded text — the CLI's
        // bare schema exists, so the readings can differ — and a name two
        // readings both publish is one entry, while which product reads a
        // given name stays the inventory's per-declaration fact rather than
        // a field here.
        servers: mcpRecognitions.every((recognition) => recognition.parseStatus !== 'parsed')
          ? null
          : unionOfServerReadings(mcpRecognitions),
        diagnostics,
      };
    }
    return null;
  }

  /**
   * The adoption-guard values every inspection-data success carries beside
   * its payload (contracts/http-api.md § Common results and errors), read
   * straight off the committed state: a detail request binds three scalars
   * and must not pay for the full snapshot projection to get them. The
   * Global content epoch is the Global scaffold's fixed 0 until the Global
   * tasks arrive.
   */
  public dataEnvelope(): Omit<InspectionDataResult<never>, 'data'> {
    return {
      globalContentEpoch: 0,
      repositoryGeneration: this.committedRepositoryGeneration.generation,
      globalGeneration: this.committedGlobalGeneration?.generation ?? null,
    };
  }

  /**
   * Rebuilds the public projection from this session's state on every call.
   * Internal authority fields (the selected root and coordinator state) are
   * simply absent from the projection rather than filtered afterwards, and
   * immutability is owned by the readonly types, not re-enforced at runtime.
   */
  public snapshot(): SessionSnapshot {
    const repository = this.sourceStates.get(this.repositorySourceId);
    if (repository === undefined) {
      throw new Error('the repository source state is missing');
    }
    const committedFiles = [
      ...this.committedRepositoryGeneration.files,
      ...(this.committedGlobalGeneration?.files ?? []),
    ];
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      fileOpenTargets: this.#fileOpener.targets,
      sources: [
        {
          sourceId: this.repositorySourceId,
          kind: 'repository',
          tool: null,
          enabled: true,
          status: repository.status,
          boundary: this.boundary,
          generation: this.committedRepositoryGeneration.generation,
          scanRequestId: repository.scanRequestId,
          progress: repository.progress,
          diagnosticIds: [...repository.diagnosticIds],
        },
      ],
      files: sortInventory(
        committedFiles.map((file) => summarizeFile(file)),
        // Only the Repository Source exists at this milestone, so the
        // Source-kind key is constant; the Global tasks extend this map
        // with the fixed Global tool order.
        new Map([[this.repositorySourceId, 0]]),
      ),
      instructions: projectInstructionInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      skills: projectSkillInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        // Paths are unique per Source, and the shipped milestone has one
        // Source; the Global tasks merge per-Source maps here.
        new Map([
          ...this.committedRepositoryGeneration.skillCompanionsByPath,
          ...(this.committedGlobalGeneration?.skillCompanionsByPath ?? new Map()),
        ]),
      ),
      mcp: projectMcpInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      agents: projectAgentInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      prompts: projectPromptInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      rules: projectRuleInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      permissions: projectPermissionsInventory([
        ...this.committedRepositoryGeneration.recognitions,
        ...(this.committedGlobalGeneration?.recognitions ?? []),
      ]),
      // Semantic emission order (data-model.md § Diagnostic): session-owned
      // lifecycle records (repository, Global tools, published Sources)
      // precede the generations' candidate-owned records.
      diagnostics: [
        ...this.sessionDiagnostics.values(),
        ...this.committedRepositoryGeneration.diagnostics,
        ...(this.committedGlobalGeneration?.diagnostics ?? []),
      ],
      ...this.dataEnvelope(),
      snapshotState: deriveSnapshotState(this.staleFailures),
      staleFailures: this.staleFailures,
      globalControl: null,
      globalEnableInProgress: null,
      globalDisableInProgress: null,
      sessionDiagnosticIds: [...this.sessionDiagnostics.keys()],
      repositoryFailureDiagnosticId: this.repositoryFailureDiagnosticId,
    };
  }
}

/**
 * Who initiated a scan attempt: the automatic startup scan owns no session
 * API request, while an explicit command arrives as a session-API request
 * with its operation ID (FR-030 request correlation).
 */
export type TriggerOwner =
  /** The ownerless automatic startup scan, which has no operation ID. */
  | { readonly kind: 'startup'; readonly operationId: null }
  /** An explicit session-API request with its operation ID. */
  | { readonly kind: 'request'; readonly operationId: string };

/**
 * How a terminal scan failure is represented (data-model.md
 * § StaleSourceFailure): a deterministic returned fatal outcome carries its
 * closed lifecycle Diagnostic, while a thrown/rejected accepted job carries
 * the failed request's error message.
 */
export type ScanFailure =
  /** A thrown or rejected accepted job, preserving its real error message. */
  | { readonly kind: 'error'; readonly message: string }
  /** A deterministic returned fatal outcome with its lifecycle Diagnostic. */
  | { readonly kind: 'diagnostic'; readonly diagnostic: SerializedDiagnostic };

/**
 * Coordinator admission outcome: 'admitted' issues the request-correlated
 * scanRequestId; 'conflict' is the fixed scan-in-progress rejection while a
 * scan for the same Source is already active (FR-030).
 */
export type AdmitScanResult =
  /** The scan was admitted and received its request-correlated ID. */
  | { readonly kind: 'admitted'; readonly scanRequestId: string }
  /** The Source already has a running or queued scan (FR-030). */
  | { readonly kind: 'conflict' };

/**
 * One admitted scan attempt's coordinator-side lifecycle state, constructed
 * at admission and mutated only by revocation.
 */
class AttemptState {
  /** The request ID issued at admission and kept across the scan lifecycle. */
  public readonly scanRequestId: string;

  /** The one Source this attempt scans. */
  public readonly sourceId: string;

  /** Who initiated the attempt; see {@link TriggerOwner}. */
  public readonly triggerOwner: TriggerOwner;

  /** True for a user-requested rescan; its failure leaves a stale overlay (FR-030). */
  public readonly explicit: boolean;

  /** Whether the attempt may still publish; a revoked attempt commits nothing. */
  public publicationAuthority:
    /** The admitted attempt may publish its terminal result. */
    | 'active'
    /** A disable barrier revoked publication authority. */
    | 'revoked' = 'active';

  /**
   * The Source overlay exactly as admission found it, captured here at
   * construction. A revoked attempt's discarded late result restores it
   * wholesale, so the committed status with its final complete progress, or a
   * retained failure presentation, survives the discard and the revoked
   * request never surfaces as a terminal outcome (spec.md § publication
   * matrix "No later success status"; data-model.md § ScanProgress
   * null/retention rules).
   */
  public readonly priorOverlay: Pick<MutableSourceState, 'status' | 'scanRequestId' | 'progress'>;

  /**
   * Admits one attempt with its publication authority active, capturing the
   * Source overlay as it stands — the admission is the moment "prior" means.
   */
  public constructor(
    scanRequestId: string,
    sourceId: string,
    triggerOwner: TriggerOwner,
    explicit: boolean,
    sourceState: MutableSourceState,
  ) {
    this.scanRequestId = scanRequestId;
    this.sourceId = sourceId;
    this.triggerOwner = triggerOwner;
    this.explicit = explicit;
    this.priorOverlay = {
      status: sourceState.status,
      scanRequestId: sourceState.scanRequestId,
      progress: sourceState.progress,
    };
  }
}

/**
 * Serializes scan admission and commit for one session. At most one scan per
 * source is running or queued; a commit atomically replaces its own
 * sequence's committed generation with exactly N+1 and clears stale state
 * only for the sources it refreshed. Only the Repository path exists yet;
 * Global commits arrive with the Global tasks.
 */
export class SessionCoordinator {
  /** The one session whose internal state this coordinator serializes. */
  readonly #session: InspectionSession;

  /**
   * The attempts still running, by scanRequestId. An entry is removed the
   * moment its attempt reaches a terminal outcome, so presence in this map is
   * the single record of "still running": a late result for a removed ID finds
   * nothing and is discarded instead of committed (FR-029). A commit that
   * throws removes nothing, which is what lets the failure the caller reports
   * still be recorded against the same attempt.
   */
  readonly #attempts = new Map<string, AttemptState>();

  /**
   * Sources that have committed at least once — the discriminator that
   * makes a later request-owned scan an "explicit rescan" whose failure
   * creates the stale overlay (FR-030).
   */
  #hasCommittedBefore = new Set<string>();

  /** Binds the coordinator to the one session whose state it serializes. */
  public constructor(session: InspectionSession) {
    this.#session = session;
  }

  /**
   * Admits one scan command for a Source and issues its opaque
   * `scanRequestId` (FR-030). While a scan for the same Source is running
   * or queued, returns the fixed `conflict` instead of stacking attempts.
   */
  public admitScan(sourceId: string, triggerOwner: TriggerOwner): AdmitScanResult {
    const sourceState = this.#session.sourceStates.get(sourceId);
    if (sourceState === undefined) {
      throw new TypeError('unknown sourceId');
    }
    // At most one scan command per source is running or queued; a duplicate
    // returns the documented conflict instead of stacking attempts.
    for (const attempt of this.#attempts.values()) {
      if (attempt.sourceId === sourceId) {
        return { kind: 'conflict' };
      }
    }
    const scanRequestId = createOpaqueId();
    // Only a session-API-triggered rescan of a Source with a committed
    // snapshot counts as "explicit": automatic first scans and initial
    // commits never create stale-failure overlays (data-model.md
    // § StaleSourceFailure). The Repository Source always has one — the
    // bootstrap committed generation 0 — so its very first user-requested
    // rescan after a failed automatic scan already leaves the stale overlay
    // on terminal failure instead of silently discarding it.
    const explicit =
      triggerOwner.kind === 'request' &&
      (sourceId === this.#session.repositorySourceId || this.#hasCommittedBefore.has(sourceId));
    this.#attempts.set(
      scanRequestId,
      new AttemptState(scanRequestId, sourceId, triggerOwner, explicit, sourceState),
    );
    sourceState.status = 'scanning';
    sourceState.scanRequestId = scanRequestId;
    sourceState.progress = {
      scanRequestId,
      // An admitted attempt begins with its configuration read, not with the
      // walk: `runSourceScan` runs each vendor's reader before enumerating
      // anything, so seeding `enumerating` would name a stage that has not
      // started, and the walk's own first report moves the phase on.
      phase: 'deriving',
      queuedAt: null,
      startedAt: new Date().toISOString(),
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      diagnosticCount: 0,
    };
    return { kind: 'admitted', scanRequestId };
  }

  /**
   * Revokes an attempt's right to commit (disable, shutdown, supersession):
   * a result that completes afterwards is discarded instead of committed
   * (FR-029 late-result discard).
   */
  public revokePublicationAuthority(scanRequestId: string): void {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt !== undefined) {
      attempt.publicationAuthority = 'revoked';
    }
  }

  /**
   * Revokes every running attempt at once, for a shutdown that cannot name
   * them: closing the host stops new requests but not a scan already reading,
   * and a result arriving afterwards must commit nothing.
   */
  public revokeAllPublicationAuthority(): void {
    for (const attempt of this.#attempts.values()) {
      attempt.publicationAuthority = 'revoked';
    }
  }

  /**
   * Advances a running scan's progress (contracts/http-api.md § get-session
   * `progress`). The attempt reports what it has done so far, so a refresh
   * mid-scan shows the phase it is in rather than the zeros an admission
   * starts at. A revoked or unknown request writes nothing: progress
   * is presentation, and a superseded attempt must not speak for the Source.
   */
  public reportProgress(
    scanRequestId: string,
    update: {
      readonly phase: ScanProgressPhase;
      readonly visitedEntries: number;
      readonly candidateFiles: number;
      readonly readBytes: number;
      /** Attempt-local diagnostics accumulated so far (data-model.md § ScanProgress). */
      readonly diagnosticCount: number;
    },
  ): void {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined || attempt.publicationAuthority !== 'active') {
      return;
    }
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (sourceState?.progress?.scanRequestId !== scanRequestId) {
      return;
    }
    sourceState.progress = {
      ...sourceState.progress,
      phase: update.phase,
      visitedEntries: update.visitedEntries,
      candidateFiles: update.candidateFiles,
      readBytes: update.readBytes,
      diagnosticCount: update.diagnosticCount,
    };
  }

  /**
   * Commits an attempt's result as its sequence's exact N+1 generation and
   * clears stale state only for the Sources it refreshed (FR-030). A
   * revoked or already terminal attempt commits nothing.
   */
  public async completeScan(
    scanRequestId: string,
    result: {
      readonly files: readonly CustomizationFileDto[];
      /** The attempt's recognitions; published as constructed by the commit. */
      readonly recognitions: readonly ToolRecognition[];
      /** Each recognized skill entry point's census, keyed by its path. */
      readonly skillCompanionsByPath: ReadonlyMap<string, readonly string[]>;
      readonly diagnostics: readonly SerializedDiagnostic[];
      /**
       * The attempt's closed publication outcome (FR-028): 'partial' exactly
       * when a file-confined outcome exists. The producer decides it; the
       * coordinator only records it, so a partial result can never be
       * silently relabeled complete.
       */
      readonly outcome: GenerationOutcome;
      /**
       * How many directory entries the attempt's walk looked at. The committed
       * progress reports it, so a finished scan states its own work rather than
       * the zero an admission starts the counters at.
       */
      readonly visitedEntries: number;
      /** Allowlisted candidate files the walk discovered (data-model.md § ScanProgress). */
      readonly candidateFiles: number;
      /** Bytes the attempt accepted, as counted while reading. */
      readonly readBytes: number;
    },
  ): Promise<void> {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined) {
      return;
    }
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (sourceState === undefined) {
      return;
    }
    if (attempt.publicationAuthority === 'revoked') {
      // Cleanup-only: the late result is discarded, public generation state
      // is untouched, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}). That
      // includes `scanRequestId`, which becomes null again when the revoked
      // attempt was the Source's first: a Source whose every admission was
      // revoked states no request rather than one whose result was thrown
      // away (data-model.md § Source `scanRequestId`).
      this.#attempts.delete(scanRequestId);
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      return;
    }
    // The entry is removed only after the fallible commit below succeeds.
    // Generation preparation can throw — the regression suite drives a thrown
    // failure through it — and removing the entry
    // first would leave the rejecting promise reaching the caller's catch while
    // `failScan` found no attempt and silently dropped it, leaving the Source
    // stuck 'scanning' with no stale/failed record. Keeping it lets that
    // `failScan` record the terminal failure (FR-030).
    const now = new Date().toISOString();
    const next = prepareNextRepositoryGeneration(this.#session.committedRepositoryGeneration, {
      scannedSourceIds: [attempt.sourceId],
      scanRequestId,
      startedAt: sourceState.progress?.startedAt ?? now,
      finishedAt: now,
      outcome: result.outcome,
      files: result.files,
      recognitions: result.recognitions,
      skillCompanionsByPath: result.skillCompanionsByPath,
      diagnostics: result.diagnostics,
    });
    // Atomic replacement: commit the generation, then update overlays. The
    // stale entry — and any lifecycle Diagnostic it references — is cleared
    // only for the Source this commit refreshed; failures for other Sources
    // are carried forward untouched (data-model.md § StaleSourceFailure).
    this.#session.committedRepositoryGeneration = next;
    this.#dropLifecycleDiagnosticsFor(attempt.sourceId);
    this.#session.staleFailures = clearStaleFailures(this.#session.staleFailures, [
      attempt.sourceId,
    ]);
    sourceState.status = result.outcome === 'partial' ? 'partial' : 'ready';
    // The completed counters are what the attempt actually did. Leaving them at
    // the zero an admission starts them with would report "0 files" beside a
    // published inventory (contracts/http-api.md § get-session `progress`).
    sourceState.progress = {
      scanRequestId,
      queuedAt: sourceState.progress?.queuedAt ?? null,
      startedAt: sourceState.progress?.startedAt ?? now,
      phase: 'complete',
      visitedEntries: result.visitedEntries,
      candidateFiles: result.candidateFiles,
      // The attempt's own tally, not a sum over the publication: an empty
      // override is read but not published, so deriving it here would
      // understate the work.
      readBytes: result.readBytes,
      diagnosticCount: result.diagnostics.length,
    };
    this.#hasCommittedBefore.add(attempt.sourceId);
    // Terminal: the entry is removed, which is the whole record that this
    // attempt is over. A late duplicate result for the same request finds no
    // entry and is ignored (FR-029), and the map stays bounded by the number of
    // *running* attempts rather than by session lifetime.
    this.#attempts.delete(scanRequestId);
  }

  /**
   * Records the terminal failure of an accepted scan (FR-030,
   * data-model.md § Diagnostic lifecycle owners). An explicit rescan — a
   * session-API request for an already committed Source — keeps the last
   * committed snapshot and marks it stale with the failure representation:
   * the failed request's error message, or the deterministic outcome's
   * lifecycle Diagnostic (retained in the session and referenced by the
   * stale entry). Any other failed scan (the automatic initial scan, or a
   * first scan of a never-committed Source) has no snapshot to mark stale:
   * the Source is marked failed, and a deterministic Repository outcome
   * retains its Diagnostic through `repositoryFailureDiagnosticId`. The
   * session keeps at most one current failure record per lifecycle owner.
   * A revoked attempt's failure is discarded like a revoked success
   * (FR-029): it publishes neither 'failed' nor a stale overlay.
   */
  public failScan(scanRequestId: string, failure: ScanFailure): void {
    const attempt = this.#attempts.get(scanRequestId);
    if (attempt === undefined) {
      return;
    }
    // A terminal attempt leaves the map whatever its outcome. Every admission
    // walks the retained entries, so a failure that stayed would slow each
    // later admission and keep the map growing for the life of the session.
    this.#attempts.delete(scanRequestId);
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (sourceState === undefined) {
      return;
    }
    if (attempt.publicationAuthority === 'revoked') {
      // Late-result discard: a failure that lands after revocation
      // publishes nothing, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}).
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      return;
    }
    // At most one current failure record per lifecycle owner: replacing a
    // failure drops the record the previous one referenced.
    this.#dropLifecycleDiagnosticsFor(attempt.sourceId);
    if (failure.kind === 'diagnostic') {
      this.#session.sessionDiagnostics.set(failure.diagnostic.diagnosticId, failure.diagnostic);
    }
    // Only an explicit rescan creates the stale overlay — the one case where
    // a previously committed snapshot exists and stays visible
    // (data-model.md § StaleSourceFailure). The coordinator enforces this
    // itself instead of trusting callers to pick the right method.
    if (attempt.explicit) {
      this.#session.staleFailures = upsertStaleFailure(this.#session.staleFailures, {
        sourceId: attempt.sourceId,
        failureRef:
          failure.kind === 'diagnostic'
            ? { kind: 'diagnostic', diagnosticId: failure.diagnostic.diagnosticId }
            : { kind: 'error', message: failure.message },
        failedAt: new Date().toISOString(),
        baseGeneration: this.#session.committedRepositoryGeneration.generation,
      });
    } else if (
      failure.kind === 'diagnostic' &&
      attempt.sourceId === this.#session.repositorySourceId
    ) {
      // Automatic/initial Repository failure: the actionable Diagnostic is
      // referenced through the session's repository owner field (FR-002).
      this.#session.repositoryFailureDiagnosticId = failure.diagnostic.diagnosticId;
    }
    sourceState.status = 'failed';
    sourceState.progress = null;
  }

  /**
   * Drops the lifecycle Diagnostic records currently owned by one Source —
   * the repository owner reference and any stale-entry reference — so a
   * successful refresh or a replacing failure never leaves an orphaned
   * record (data-model.md § Diagnostic: every retained record has exactly
   * one public owner reference).
   */
  #dropLifecycleDiagnosticsFor(sourceId: string): void {
    if (sourceId === this.#session.repositorySourceId) {
      const previous = this.#session.repositoryFailureDiagnosticId;
      if (previous !== null) {
        this.#session.sessionDiagnostics.delete(previous);
        this.#session.repositoryFailureDiagnosticId = null;
      }
    }
    for (const entry of this.#session.staleFailures) {
      if (entry.sourceId === sourceId && entry.failureRef.kind === 'diagnostic') {
        this.#session.sessionDiagnostics.delete(entry.failureRef.diagnosticId);
      }
    }
  }
}
