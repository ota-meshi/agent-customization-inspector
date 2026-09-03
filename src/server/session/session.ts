// Inspection session state and the serialized scan coordinator. The session
// publishes zero-I/O bootstrap Repository generation 0 synchronously with
// exactly one enabled idle Repository Source; the Repository and Global
// generation sequences are independent because their lifecycles are
// (Repository always exists, Global exists only between enable and
// disable). The coordinator serializes scans, keeps one request ID across a
// scan lifecycle, commits atomic N+1 replacements per sequence, and retains
// explicit-rescan stale state.
import { isAbsolute, resolve } from 'node:path';
import {
  SUPPORTED_TOOL_ORDER,
  createOpaqueId,
  createSourceBoundaryDto,
  fileIdentityKey,
} from '../../shared/entities';
import { VENDOR_SURFACE_ORDER } from '../../shared/registries/behavior-text';
import type { VendorSurface } from '../../shared/registries/behavior-types';
import {
  facesSameNameCollision,
  skillCollisionGates,
  type SameNameCollisionDefinition,
} from '../../shared/skill-collision';
import { sameNameSkillResolutionFor } from '../../shared/registries/skill-resolution';
import {
  createBootstrapGeneration,
  createGlobalEnableGeneration,
  prepareNextGlobalGeneration,
  prepareNextRepositoryGeneration,
  type GenerationOutcome,
  type GlobalScanGeneration,
  type RepositoryScanGeneration,
} from './scan-generation';
import {
  GlobalConsentRecord,
  GlobalToolControl,
  inMemberOrder,
  type GlobalEnableMember,
  type GlobalResolvedOutcome,
} from './global-control';
import type { FileOpener } from '../host/file-opener';
import { clearStaleFailures, deriveSnapshotState, upsertStaleFailure } from './stale-failures';
import type { SourceBoundaryDto, SupportedTool } from '../../shared/entities';
import { GLOBAL_MEMBER_ORDER } from '../../shared/api-text';
import type {
  GlobalMemberId,
  CustomizationFileDto,
  CustomizationFileSummaryDto,
  DeclaredEntryDto,
  FileDetailDto,
  FileOpenTarget,
  FileRecognitionDto,
  GlobalDisableCommitKind,
  GlobalDisableInProgressDto,
  GlobalDisableResultDto,
  GlobalEnableInProgressDto,
  GlobalEnableResultDto,
  GlobalFenceRecoverySnapshot,
  InspectionDataResult,
  SourceSelector,
  SourceDto,
  InstructionInventoryEntryDto,
  HookCarrierDetailDto,
  HookDeclarationDto,
  HookEventDeclarationDto,
  RecognitionParseStatus,
  HookInventoryEntryDto,
  McpCarrierDetailDto,
  McpDeclarationDto,
  McpServerDeclarationDto,
  McpInventoryEntryDto,
  PermissionPolicyDetailDto,
  OutputStyleDefinitionDto,
  OutputStyleInventoryEntryDto,
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PluginFileDetailDto,
  PluginFileDetailParams,
  PluginCarrierDto,
  PluginDeclarationDto,
  PluginInventoryEntryDto,
  PromptDefinitionDto,
  AgentDefinitionDto,
  AgentInventoryEntryDto,
  PromptInventoryEntryDto,
  PermissionsInventoryEntryDto,
  RuleInventoryEntryDto,
  SameNameSkillResolutionDto,
  SettingsInventoryEntryDto,
  SkillDefinitionDto,
  ScanProgressPhase,
  ScanProgressDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceStatus,
  StaleSourceFailure,
} from '../../shared/api-types';
import { pathUnderRoot } from '../inspection/traversal';
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

/**
 * One Global Source's identity beside its overlay: which member it belongs to
 * and the boundary its admitted root presents. The overlay above is shared with
 * the Repository Source, which has neither.
 */
interface GlobalSourceIdentity {
  /** The member whose consented home this Source is. */
  readonly member: GlobalMemberId;
  /** The non-authorizing escaped presentation of the admitted root (FR-002). */
  readonly boundary: SourceBoundaryDto;
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
 * The files one customization's directory holds: every published file under
 * `directory` that is not itself a recognized customization
 * (contracts/inspection-path-allowlist.md § Bounded companion census).
 *
 * Derived here rather than carried, because the files are the generation's own
 * `files[]` and a second list of them could disagree. What a recognition does
 * carry is the directory — the skill's own, or the plugin root a catalog entry
 * named — since that is the fact the published files do not state.
 *
 * "Not a customization of its own" is read as "carries no recognition": a file
 * a rule admitted keeps its own row (FR-007), and a row that listed it here
 * would state its diagnostics, offer it for comparison, and speak for a file
 * its own kind already publishes. One case reads the same either way: a file a
 * rule admitted but the scan could not read carries no recognition, so it is
 * listed here — it is in the directory, and this scan established no kind for
 * it.
 */
function directoryFilesOf(
  sourceId: string,
  directory: string,
  files: readonly CustomizationFileDto[],
  recognized: ReadonlySet<string>,
  censusEscapedRoots: ReadonlySet<string>,
): string[] {
  // The owning customization's Source scopes the census: `files` spans every
  // committed Source, and a path prefix says nothing across boundaries — a
  // consented home and the repository can both hold `skills/<name>/` (FR-030).
  // The prefix test is exact at the directory boundary because the caller
  // passes the directory with its trailing separator — the entry point's own
  // path sliced past its last `/` — so `skills/deploy/` never swallows a
  // `skills/deploy2/` sibling.
  return directory === '' || censusEscapedRoots.has(fileIdentityKey(sourceId, directory))
    ? []
    : files
        .filter(
          (file) =>
            file.sourceId === sourceId &&
            file.sourceRelativePath.startsWith(directory) &&
            !recognized.has(fileIdentityKey(sourceId, file.sourceRelativePath)),
        )
        .map((file) => file.sourceRelativePath)
        // Path order, not walk order: the generation's `files[]` arrive in
        // commit order, and a census list is rendered as a tree whose order
        // must not depend on which file the scan happened to read first.
        .toSorted(compareStrings);
}

/**
 * Every published file one plugin root holds: a plugin *is* its root, so the
 * whole directory is what it ships (contracts/inspection-path-allowlist.md
 * § Bounded companion census).
 *
 * Where {@link directoryFilesOf} drops a file that carries a recognition, this
 * keeps it. The two lists answer different questions: a companion is a file
 * *accompanying* a customization, so one that is a customization itself is not
 * among them, while a plugin's files are the directory the plugin is — its own
 * manifest included, and a file another rule admitted included too. That file
 * keeps its own row, where its declarations and diagnostics are; leaving it out
 * here would publish a plugin whose own page is missing a file its root holds,
 * and — for a catalog offering a root that is itself a plugin by placement —
 * a plugin this scan says it holds no manifest for while listing that manifest
 * as a row of its own.
 */
function pluginRootFilesOf(
  sourceId: string,
  pluginRoot: string,
  files: readonly CustomizationFileDto[],
  censusEscapedRoots: ReadonlySet<string>,
): string[] {
  // The carrier's own Source scopes the enumeration, for the reason
  // {@link directoryFilesOf} gives: a root path is relative to one boundary,
  // and `files` spans them all (FR-030). The prefix test is exact at the
  // directory boundary because every vendor publishes `pluginRoot` with its
  // trailing separator (rules/plugins/{codex,claude,copilot}.ts), so
  // `plugins/foo/` never swallows a `plugins/foobar/` sibling.
  //
  // Derived from the published files rather than kept as a second scan-time
  // membership fact, which could disagree with them (AGENTS.md § publish one
  // fact). The derivation is closed over this Source's own published paths,
  // so nothing outside the Source can enter it; the one fact that cannot be
  // derived here — whether the census refused the root itself — is the
  // verdict the generation carries and the gate above honours.
  // The census's own verdict outranks the spelling: a root whose real path
  // escaped the Source belongs to no Source
  // (contracts/inspection-path-allowlist.md § Bounded companion census), so a
  // file another rule independently admitted below the same spelling — an
  // `AGENTS.md` the walk reached through the link — must not be attributed to
  // it. The verdict travels with the generation
  // (scan-generation.ts § censusEscapedDirectories) because nothing at this
  // layer may re-derive it: that would be filesystem I/O outside the scan.
  return pluginRoot === '' || censusEscapedRoots.has(fileIdentityKey(sourceId, pluginRoot))
    ? []
    : files
        .filter(
          (file) => file.sourceId === sourceId && file.sourceRelativePath.startsWith(pluginRoot),
        )
        .map((file) => file.sourceRelativePath)
        // Path order, not walk order — and the same order the two-declaration
        // merge below re-sorts its union into, so one carrier's list never
        // reads differently before and after a sibling declaration lands.
        .toSorted(compareStrings);
}

/**
 * A comparator over a kind's row members — a definition, a declaration, a
 * carrier — in the snapshot's published Source order, then Source-relative
 * Path, then the closed tool order, so two snapshots of one generation publish
 * the same rows and an opaque ID never decides a visible order. The Source
 * leads because the inventory reads that way everywhere else: the selected
 * repository above the reader's own configuration directories
 * (`#inventorySourceOrder`).
 */
function memberComparator(
  sourceOrder: ReadonlyMap<string, number>,
): (
  left: { sourceId: string; sourceRelativePath: string; tool: SupportedTool },
  right: { sourceId: string; sourceRelativePath: string; tool: SupportedTool },
) => number {
  return (left, right) => {
    const rankDelta =
      (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    const pathDelta = compareStrings(left.sourceRelativePath, right.sourceRelativePath);
    return pathDelta !== 0
      ? pathDelta
      : SUPPORTED_TOOL_ORDER.indexOf(left.tool) - SUPPORTED_TOOL_ORDER.indexOf(right.tool);
  };
}

/**
 * Projects the skill inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `skills[]`, data-model.md § Inventory
 * unit): one entry per invocation name as one tool resolves it, each listing
 * every `SKILL.md` a recognizing tool invokes under it.
 *
 * The name is the one the recognizing tool's own documentation invokes the
 * file by, resolved by the admitting rule at recognition time (FR-007,
 * rules/skills/compiled-rule.ts § CompiledStaticSkillRule): Codex and Copilot invoke the
 * authored name — or the skill directory name when the file declares none or
 * declares it empty, so every row has a name to be listed under — while
 * Claude Code derives its command from the skill directory whatever the
 * frontmatter declares, root-relative-prefixed when nested. So one file's
 * recognitions land on two entries whenever the tools invoke it differently,
 * each entry listing only the tools that reach it under that entry's name.
 *
 * A recognition names its file by Source-relative Path, so the projection
 * needs no filesystem access and two snapshots of one generation publish the
 * same rows.
 */
function projectSkillInventory(
  recognitions: readonly ToolRecognition[],
  files: readonly CustomizationFileDto[],
  sourceOrder: ReadonlyMap<string, number>,
  censusEscapedDirectories: readonly { sourceId: string; directory: string }[],
): SkillInventoryEntryDto[] {
  // The census's verdict outranks the spelling, exactly as it does for a
  // plugin root ({@link pluginRootFilesOf}): a directory whose real path
  // escaped the Source belongs to no Source
  // (contracts/inspection-path-allowlist.md § Bounded companion census), so a
  // file another rule independently admitted below the same spelling must not
  // be listed as a companion of the skill. The verdict travels with the
  // generation because nothing at this layer may re-derive it — that would be
  // filesystem I/O outside the scan.
  const censusEscapedRoots = new Set(
    censusEscapedDirectories.map((entry) => fileIdentityKey(entry.sourceId, entry.directory)),
  );
  const recognized = new Set(
    recognitions.map((recognition) =>
      fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath),
    ),
  );
  const byName = new Map<string, { name: string; definitions: SkillDefinitionDto[] }>();
  for (const recognition of recognitions) {
    if (!isSkillRecognition(recognition)) {
      continue;
    }
    const path = recognition.sourceRelativePath;
    // The name the recognizing tool invokes this file by, resolved once where
    // the extraction was read (candidate.ts `recognizeSkill`).
    const name = recognition.details.invocationName;
    let entry = byName.get(name);
    if (entry === undefined) {
      entry = { name, definitions: [] };
      byName.set(name, entry);
    }
    // A definition is one recognition — the ToolRecognition unit, one per
    // `(file, tool)` — so a file two products invoke by one name is two
    // definitions of that entry, and a product invoking the file by a
    // different name defines on that name's entry instead. The detail route
    // is the file's own, `/skills/detail/<source>/<path>`: two products read
    // one file's bytes, and the names they invoke it by are what the rows
    // carry. The census is the file's, so each of its
    // definitions carries the same list; the parse state is the
    // recognition's own, and the extraction-failure reference each failed
    // definition republishes is the kind's one shared record — the parse ran
    // once (FR-028). A failed extraction leaves an authored-name tool's name
    // unknown — not absent — so its definition lands on the
    // directory-derived provisional row, which the same-name machinery reads
    // as grouping rather than as collision evidence (skill-collision.ts).
    entry.definitions.push({
      sourceId: recognition.sourceId,
      sourceRelativePath: path,
      tool: recognition.tool,
      // The surfaces this one recognition's admissions rest on, derived the
      // same way every other kind's row derives them (FR-009): a definition is
      // a recognition, so it states them too.
      surfaces: surfacesOf(recognition),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
      // The skill's own directory: a skill is its directory, so the entry
      // point's path is where the files it ships are.
      companionFiles: directoryFilesOf(
        recognition.sourceId,
        path.slice(0, path.lastIndexOf('/') + 1),
        files,
        recognized,
        censusEscapedRoots,
      ),
    });
  }
  // One collision gate per recognizing tool over the whole generation's
  // definitions — a gate can span rows, Claude's does — through the shared
  // assembly the client's filtered view also uses (skill-collision.ts), so the
  // two surfaces cannot drift.
  const collisionGates = skillCollisionGates(
    [...byName.values()].flatMap((entry) => entry.definitions),
  );

  const entries = [...byName.values()].map((entry): SkillInventoryEntryDto => {
    // Files in the published Source order, then Source-relative Path, then
    // the contracted tool order within one file ({@link memberComparator}).
    const definitions = entry.definitions.toSorted(memberComparator(sourceOrder));
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
  sourceRank: ReadonlyMap<string, number>,
): InstructionInventoryEntryDto[] {
  // Keyed by the Source as well as the range, because a range is relative to
  // its own Source root: the repository's `**` and a consented home's `**` are
  // different scopes, and a file at the same Source-relative Path in each is
  // two files (FR-030).
  const byRow = new Map<string, Map<string, ToolRecognition[]>>();
  const rowKeys = new Map<string, { readonly sourceId: string; readonly range: string | null }>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'instructions') {
      continue;
    }
    const range = recognition.details.applicabilityRange;
    // A NUL joins the two halves: no Source ID or range can contain one, so
    // the composite cannot be forged by a range that happens to look like a
    // key (data-model.md § RootPresentationEncoding rejects NUL outright).
    const rowKey = `${recognition.sourceId}\u0000${range ?? ''}`;
    rowKeys.set(rowKey, { sourceId: recognition.sourceId, range });
    let byPath = byRow.get(rowKey);
    if (byPath === undefined) {
      byPath = new Map();
      byRow.set(rowKey, byPath);
    }
    const group = byPath.get(recognition.sourceRelativePath);
    if (group === undefined) {
      byPath.set(recognition.sourceRelativePath, [recognition]);
    } else {
      group.push(recognition);
    }
  }
  return (
    [...byRow.entries()]
      .map(([rowKey, byPath]) => ({
        sourceId: rowKeys.get(rowKey)!.sourceId,
        applicabilityRange: rowKeys.get(rowKey)!.range,
        files: [...byPath.entries()]
          .map(([sourceRelativePath, group]) => ({
            sourceRelativePath,
            recognitions: fileRecognitionsOf(group),
          }))
          .sort((left, right) => compareStrings(left.sourceRelativePath, right.sourceRelativePath)),
      }))
      // Rows in Source order — the caller's own ranking, so the repository's
      // rows come before a consented home's — then in range order within a
      // Source, with the one no-range row after them all (nulls-last is the
      // comparator's own rule, {@link compareStrings}).
      .sort(
        (left, right) =>
          (sourceRank.get(left.sourceId) ?? Number.MAX_SAFE_INTEGER) -
            (sourceRank.get(right.sourceId) ?? Number.MAX_SAFE_INTEGER) ||
          compareStrings(left.applicabilityRange, right.applicabilityRange),
      )
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
function projectRuleInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): RuleInventoryEntryDto[] {
  const byPath = Map.groupBy(
    recognitions.filter((recognition) => recognition.details.kind === 'rule'),
    (recognition) => fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath),
  );
  return [...byPath.values()]
    .map((group) => ({
      sourceId: group[0]!.sourceId,
      sourceRelativePath: group[0]!.sourceRelativePath,
      recognitions: fileRecognitionsOf(group),
    }))
    .sort((left, right) => {
      // Rows in the published Source order, then path — the same reading
      // order as `files[]` ({@link memberComparator}).
      const rankDelta =
        (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
      return rankDelta !== 0
        ? rankDelta
        : compareStrings(left.sourceRelativePath, right.sourceRelativePath);
    });
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
  sourceOrder: ReadonlyMap<string, number>,
): PromptInventoryEntryDto[] {
  const byName = new Map<string, PromptDefinitionDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'prompt/command') {
      continue;
    }
    const definitions = byName.get(recognition.details.invocationName);
    const definition: PromptDefinitionDto = {
      sourceId: recognition.sourceId,
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
        // Files in the published Source order, then Source-relative Path,
        // then the contracted tool order within one file
        // ({@link memberComparator}).
        definitions: definitions.toSorted(memberComparator(sourceOrder)),
      }))
      // Entries in name order: the row's own key sorts it.
      .sort((left, right) => compareStrings(left.name, right.name))
  );
}

/**
/**
 * Every documented form a plugin's own manifest may take inside the root one
 * declaration named, across every product that recognizes the carrier
 * declaring it, in the closed tool order and without repetition.
 *
 * Which file inside a plugin root a client reads as that plugin's declaration
 * of itself is each vendor's own contract, so one carrier that three products
 * read resolves one plugin to one root with three lists of forms to look for
 * there. A surface showing the plugin's own manifest wants the forms rather
 * than one product's, because the root ships whichever form its author chose:
 * publishing a single product's list would state that this scan holds no
 * manifest for a plugin whose manifest it is listing among the plugin's files.
 *
 * Folded per declared root, not per name: two entries of one name may name two
 * directories, and a form built from one root says nothing about the other.
 */
function pluginManifestPathsAt(
  recognitions: readonly ToolRecognition[],
  sourceRelativePath: string,
  declaration: PluginDeclarationDto,
): readonly string[] {
  const forms: string[] = [];
  for (const tool of SUPPORTED_TOOL_ORDER) {
    for (const recognition of recognitions) {
      if (
        recognition.tool !== tool ||
        recognition.sourceRelativePath !== sourceRelativePath ||
        recognition.details.kind !== 'plugin'
      ) {
        continue;
      }
      for (const candidate of recognition.details.plugins) {
        if (
          candidate.name !== declaration.name ||
          candidate.pluginRoot !== declaration.pluginRoot
        ) {
          continue;
        }
        for (const form of candidate.manifestPaths) {
          if (!forms.includes(form)) {
            forms.push(form);
          }
        }
      }
    }
  }
  return forms;
}

/**
 * The plugin inventory (contracts/http-api.md § get-session `plugins[]`,
 * data-model.md § Inventory unit): one row per plugin name, listing every
 * carrier that resolves it.
 *
 * The name is the recognition's own — the rule that admitted the carrier
 * resolved it, because how a name follows from a declaration is that vendor's
 * contract (Codex addresses a catalog's offering as `plugin@marketplace` and a
 * derived manifest under the offering that reached it) — so this projection
 * groups by it rather than deriving it a second time where the two could
 * disagree.
 *
 * Grouped exactly as the MCP inventory is, and for the same reason: the row
 * unit is a declaration inside a file rather than the file, so a carrier's one
 * recognition holds every declaration it makes and this projection splits them.
 * A carrier that resolves no name at all — a catalog listing nothing, a
 * manifest with no `name` that no offering reached, an extraction that failed —
 * lands on the one null-named row, so its state stays a visible row rather than
 * a file in no kind (FR-028).
 */
function projectPluginInventory(
  recognitions: readonly ToolRecognition[],
  files: readonly CustomizationFileDto[],
  sourceOrder: ReadonlyMap<string, number>,
  censusEscapedDirectories: readonly { sourceId: string; directory: string }[],
): PluginInventoryEntryDto[] {
  // Keyed by the file-identity spelling, because a root path is relative to
  // one Source and two Sources can hold one spelling (FR-030).
  const censusEscapedRoots: ReadonlySet<string> = new Set(
    censusEscapedDirectories.map((entry) => fileIdentityKey(entry.sourceId, entry.directory)),
  );
  const byName = new Map<string | null, { carriers: PluginCarrierDto[] }>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'plugin') {
      continue;
    }
    // The surfaces are the union over the recognition's own admissions,
    // computed here because this is where they are published — the rule every
    // other inventory applies.
    const recognizingSurfaces = new Set<VendorSurface>();
    for (const provenance of recognition.provenances) {
      for (const surface of provenance.recognizingSurfaces) {
        recognizingSurfaces.add(surface);
      }
    }
    const carrier = {
      sourceId: recognition.sourceId,
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      surfaces: VENDOR_SURFACE_ORDER.filter((surface) => recognizingSurfaces.has(surface)),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
      carrier: recognition.details.carrier,
    };
    // One row per name the carrier resolves. A carrier that resolves none joins
    // the null row: "this file resolves no plugin name" is what that row says.
    const names =
      recognition.details.plugins.length === 0
        ? [null]
        : recognition.details.plugins.map((plugin) => plugin.name);
    for (const [index, name] of names.entries()) {
      const row = byName.get(name) ?? { carriers: [] };
      byName.set(name, row);
      // What this carrier's offering of this name reaches: the directory the
      // declaration named, as the census enumerated it. A carrier declaring
      // one name twice — two entries, two directories — reaches both, so the
      // one carrier of that row carries their files together.
      const reached = pluginRootFilesOf(
        recognition.sourceId,
        recognition.details.plugins[index]?.pluginRoot ?? '',
        files,
        censusEscapedRoots,
      );
      const existing = row.carriers.find(
        (candidate) =>
          candidate.sourceId === carrier.sourceId &&
          candidate.sourceRelativePath === carrier.sourceRelativePath &&
          candidate.tool === carrier.tool,
      );
      if (existing === undefined) {
        row.carriers.push({ ...carrier, files: reached });
      } else {
        // One carrier resolving the same name twice is one carrier of that
        // row: listing it twice would say two files resolve the name.
        row.carriers.splice(row.carriers.indexOf(existing), 1, {
          ...existing,
          // Sorted after the merge, not merely deduplicated: the two offerings
          // are in the catalog's own order, so a later entry naming `a/` would
          // otherwise follow an earlier one naming `z/` in a list the DTO
          // publishes as sorted (`api-types.ts` § PluginCarrierDto.files).
          files: [...new Set([...existing.files, ...reached])].toSorted(compareStrings),
        });
      }
    }
  }
  return (
    [...byName.entries()]
      .map(([name, row]): PluginInventoryEntryDto => ({
        name,
        carriers: row.carriers.toSorted(memberComparator(sourceOrder)),
      }))
      // Named rows in name order, and the one no-name row after them all —
      // nulls-last is the comparator's own rule ({@link compareStrings}).
      .sort((left, right) => compareStrings(left.name, right.name))
  );
}

/**
 * Projects the output-style inventory from a generation's recognitions
 * (contracts/http-api.md § get-session `outputStyles[]`, data-model.md
 * § Inventory unit): one entry per style name a reader selects, each listing
 * every file a recognizing tool selects under it.
 *
 * The name is the recognition's own — the admitting rule resolved it from the
 * path and the file's declarations when it was recognized (`registry.ts`
 * § CompiledStaticOutputStyleRule) — so this projection groups by it rather
 * than deriving it a second time where the two could disagree.
 *
 * Grouped like the prompts inventory, because the unit is the same shape: a
 * name, and the recognitions that resolve it. The row states no winner for a
 * name two files carry: the vendor's rule is the layer closest to the working
 * directory, and this product observes no working directory (FR-009).
 */
function projectOutputStyleInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): OutputStyleInventoryEntryDto[] {
  const byName = new Map<string, OutputStyleDefinitionDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'output style') {
      continue;
    }
    const definitions = byName.get(recognition.details.styleName);
    const definition: OutputStyleDefinitionDto = {
      sourceId: recognition.sourceId,
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      // The surfaces this one recognition's admissions rest on, derived the
      // same way every other kind's row derives them (FR-009).
      surfaces: surfacesOf(recognition),
      diagnosticIds: recognition.diagnosticIds,
    };
    if (definitions === undefined) {
      byName.set(recognition.details.styleName, [definition]);
    } else {
      definitions.push(definition);
    }
  }
  return (
    [...byName.entries()]
      .map(([name, definitions]) => ({
        name,
        // Files in the published Source order, then Source-relative Path,
        // then the contracted tool order within one file
        // ({@link memberComparator}).
        definitions: definitions.toSorted(memberComparator(sourceOrder)),
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
function projectAgentInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): AgentInventoryEntryDto[] {
  const byName = new Map<string | null, AgentDefinitionDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'agent') {
      continue;
    }
    const name = recognition.details.agentName ?? null;
    const definition: AgentDefinitionDto = {
      sourceId: recognition.sourceId,
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
        // Files in the published Source order, then Source-relative Path,
        // then the contracted tool order within one file
        // ({@link memberComparator}).
        definitions: definitions.toSorted(memberComparator(sourceOrder)),
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
  sourceOrder: ReadonlyMap<string, number>,
): PermissionsInventoryEntryDto[] {
  const byPath = Map.groupBy(
    recognitions.filter((recognition) => recognition.details.kind === 'permissions'),
    (recognition) => fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath),
  );
  return [...byPath.values()]
    .map((group) => ({
      sourceId: group[0]!.sourceId,
      sourceRelativePath: group[0]!.sourceRelativePath,
      recognitions: fileRecognitionsOf(group),
      // The extraction diagnostics the recognitions reference, deduplicated:
      // the block is read once per file, so every recognition of it points at
      // the one record (FR-028).
      diagnosticIds: [...new Set(group.flatMap((recognition) => recognition.diagnosticIds))],
    }))
    .sort((left, right) => {
      // Rows in the published Source order, then path — the same reading
      // order as `files[]` ({@link memberComparator}).
      const rankDelta =
        (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
      return rankDelta !== 0
        ? rankDelta
        : compareStrings(left.sourceRelativePath, right.sourceRelativePath);
    });
}

/**
 * Projects the settings-and-configuration inventory from a generation's
 * recognitions (contracts/http-api.md § get-session `settings[]`,
 * data-model.md § Inventory unit): one entry per recognized settings or
 * configuration file, in Source-relative Path order, because the kind's unit
 * is the file.
 *
 * Written out rather than shared with the rules or permissions projection
 * above: the three rows are different subjects — a rule file, a policy a file
 * declares, and the file a product reads its settings from — so the first
 * fact one of them gains that the others have no answer for would break a
 * shared projection, and the duplication is four lines.
 */
function projectSettingsInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): SettingsInventoryEntryDto[] {
  // Grouped by the file's whole identity — Source and Source-relative Path
  // (FR-030) — because the kind's unit is the file: a consented home's
  // `settings.json` and a same-path document in another Source are two rows.
  const byFile = Map.groupBy(
    recognitions.filter((recognition) => recognition.details.kind === 'settings/config'),
    (recognition) => fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath),
  );
  return [...byFile.values()]
    .map((group) => ({
      sourceId: group[0]!.sourceId,
      sourceRelativePath: group[0]!.sourceRelativePath,
      recognitions: fileRecognitionsOf(group),
    }))
    .sort((left, right) => {
      // Rows in the published Source order, then path — the same reading
      // order as `files[]`, and the reason {@link memberComparator} gives.
      const rankDelta =
        (sourceOrder.get(left.sourceId) ?? 0) - (sourceOrder.get(right.sourceId) ?? 0);
      return rankDelta !== 0
        ? rankDelta
        : compareStrings(left.sourceRelativePath, right.sourceRelativePath);
    });
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
function projectMcpInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): McpInventoryEntryDto[] {
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
      // The file's whole identity (FR-030): another Source's same-path
      // carrier publishing names says nothing about this one's emptiness.
      .map((recognition) => fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath)),
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
      sourceId: recognition.sourceId,
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      surfaces: VENDOR_SURFACE_ORDER.filter((surface) => recognizingSurfaces.has(surface)),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
    };
    // A parsed reading contributes one declaration per name it declares, and a
    // reading that publishes none lands on the null row so its state stays a
    // visible row rather than a file in no kind (FR-028).
    //
    // The two ways a reading publishes no name are not the same fact, and only
    // one of them can be answered by another reading of the same file. A
    // reading that failed leaves this product's servers *unknown* rather than
    // absent, so it reaches the null row whatever the file's other readings
    // found: one carrier can be read strictly by one product and leniently by
    // another — a root `.mcp.json` is JSONC to Copilot's editor host and strict
    // JSON to Claude Code — so a file whose names one product publishes is
    // exactly where the other product's failure has to be stated, and the hook
    // inventory states its own the same way (contracts/http-api.md
    // § get-session `mcp[]`).
    //
    // A reading that parsed and found no server does contribute nothing there:
    // the file's statement is the named rows the other reading published, and
    // the two vendors' schemas differing over one carrier — the bare map the
    // CLI accepts and the wrapper Claude Code requires — is not a finding about
    // the file.
    const names =
      recognition.parseStatus === 'parsed' && recognition.details.servers.length > 0
        ? recognition.details.servers.map((server) => server.name)
        : recognition.parseStatus === 'failed' ||
            !pathsWithNames.has(
              fileIdentityKey(recognition.sourceId, recognition.sourceRelativePath),
            )
          ? [null]
          : [];
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
        declarations: declarations.toSorted(memberComparator(sourceOrder)),
      }))
      // Named rows in name order, and the one no-name row after them all —
      // nulls-last is the comparator's own rule ({@link compareStrings}).
      .sort((left, right) => compareStrings(left.name, right.name))
  );
}

/**
 * The hook inventory: one row per declared lifecycle event, each listing every
 * declaration that declares it — one per `(carrier, tool)` — and one closing
 * row for the carriers publishing no event (contracts/http-api.md
 * § get-session `hooks[]`, data-model.md § Inventory unit).
 *
 * The MCP projection's own rule, over events instead of server names: a second
 * carrier declaring one event joins that event's row rather than starting
 * another, and a carrier whose emptiness is a finding lands on the null row so
 * its state stays a visible row rather than a file in no kind (FR-028).
 *
 * A standalone `hooks.json` and the inline `[hooks]` of the same layer are two
 * files, so both belong on an event's row when both declare it: Codex loads
 * both rather than choosing (`codex.hooks.additive`), and each declaration says
 * which form it is.
 */
function projectHookInventory(
  recognitions: readonly ToolRecognition[],
  sourceOrder: ReadonlyMap<string, number>,
): HookInventoryEntryDto[] {
  const byEvent = new Map<string | null, HookDeclarationDto[]>();
  for (const recognition of recognitions) {
    if (recognition.details.kind !== 'hook') {
      continue;
    }
    // The surfaces are the union over the recognition's own admissions,
    // computed here because this is where they are published — the rule every
    // other inventory applies.
    const recognizingSurfaces = new Set<VendorSurface>();
    for (const provenance of recognition.provenances) {
      for (const surface of provenance.recognizingSurfaces) {
        recognizingSurfaces.add(surface);
      }
    }
    const declaration: HookDeclarationDto = {
      sourceId: recognition.sourceId,
      sourceRelativePath: recognition.sourceRelativePath,
      tool: recognition.tool,
      carrier: recognition.details.carrier,
      surfaces: VENDOR_SURFACE_ORDER.filter((surface) => recognizingSurfaces.has(surface)),
      parseStatus: recognition.parseStatus,
      diagnosticIds: recognition.diagnosticIds,
    };
    // A parsed reading contributes one declaration per event it declares; a
    // carrier declaring none — failed, or holding no hook map at all — lands on
    // the null row. One file can carry two products' readings — Claude and
    // Copilot both read `.claude/settings*.json` — so the events of a file are
    // the union of its readings ({@link unionOfHookReadings}), and the null
    // row is reached only when every reading of it declares none.
    //
    // Deduplicated per carrier, because a file can declare one event more than
    // once and a row lists a carrier once however many of its blocks reach
    // that event.
    //
    // A carrier that declares none reaches the null row only when its emptiness
    // is a finding: a file whose whole purpose is hooks and holds none is one,
    // and so is any carrier whose declarations could not be read, where the
    // events are unknown rather than absent (FR-028). A file that merely *may*
    // contain a hook table — a settings or config document — and does not is
    // not: the row would say "this file declares no hooks" of every repository
    // that configures anything, and put a Hook tab on one with no hook
    // anywhere.
    const events: readonly (string | null)[] =
      recognition.details.events.length > 0
        ? [...new Set(recognition.details.events.map((event) => event.event))]
        : recognition.parseStatus === 'failed' || recognition.details.carrier === 'standalone'
          ? [null]
          : [];
    for (const event of events) {
      const declarations = byEvent.get(event);
      if (declarations === undefined) {
        byEvent.set(event, [declaration]);
      } else {
        declarations.push(declaration);
      }
    }
  }
  return (
    [...byEvent.entries()]
      .map(([event, declarations]): HookInventoryEntryDto => ({
        event,
        declarations: declarations.toSorted(memberComparator(sourceOrder)),
      }))
      // Named rows in event order, and the one no-event row after them all —
      // nulls-last is the comparator's own rule ({@link compareStrings}).
      .sort((left, right) => compareStrings(left.event, right.event))
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
 * The union of one hook carrier's parsed readings, one entry per declared
 * event in the readings' publish order
 * ({@link InspectionSession.hookCarrierDetail}) — the hook counterpart of
 * {@link unionOfServerReadings}.
 *
 * A shared event is one declaration read twice: two products reading the same
 * text resolve the same groups, so the first occurrence carries what any later
 * one would. Two readings that differ do so because one of them rejected the
 * text, and a rejected reading contributes nothing here.
 */
function unionOfHookReadings(
  readings: readonly {
    readonly parseStatus: RecognitionParseStatus;
    readonly details: Extract<ToolRecognition['details'], { readonly kind: 'hook' }>;
  }[],
): readonly HookEventDeclarationDto[] {
  const byEvent = new Map<string, HookEventDeclarationDto>();
  for (const reading of readings) {
    if (reading.parseStatus !== 'parsed') {
      continue;
    }
    for (const event of reading.details.events) {
      if (!byEvent.has(event.event)) {
        byEvent.set(event.event, event);
      }
    }
  }
  return [...byEvent.values()];
}

/**
 * A recognition narrowed to the skill kind, so {@link projectSkillInventory}
 * reads `details.invocationName` where its guard has already proved the skill
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
  collisionGates: ReadonlyMap<
    SupportedTool,
    (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean
  >,
): SameNameSkillResolutionDto[] {
  return [...new Set(definitions.map((definition) => definition.tool))]
    .sort((left, right) => SUPPORTED_TOOL_ORDER.indexOf(left) - SUPPORTED_TOOL_ORDER.indexOf(right))
    .flatMap((tool) => {
      // Which collision a tool's quoted rule answers is that tool's own
      // naming policy, asked through the shared per-view machinery
      // (skill-collision.ts): Codex's and Copilot's is the row-internal count,
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

  /**
   * The active Global consent and its controls, or null while Global
   * inspection is disabled — which is every new session (FR-013).
   */
  public globalConsent: GlobalConsentRecord | null = null;

  /**
   * The registered enable operation's authority-free projection, or null. It
   * is what makes a duplicate enable a conflict, and it exposes no tool
   * outcome, root, Source, or job (data-model.md § GlobalEnableOperation).
   */
  public globalEnableInProgress: GlobalEnableInProgressDto | null = null;

  /**
   * The non-complete disable barrier's public projection, or null. Its
   * presence is the all-inspection-data fence (FR-042; contracts/http-api.md
   * § disable-global): while non-null, the session function serves only
   * {@link GlobalFenceRecoverySnapshot} and every other inspection-data
   * function returns the `global-disable-pending` conflict. Written only by
   * {@link SessionCoordinator}'s barrier acceptance, failure retention, and
   * terminal commit.
   */
  public globalDisableInProgress: GlobalDisableInProgressDto | null = null;

  /**
   * The server-owned Global content epoch (FR-042). Incremented exactly once
   * per disable barrier at first acceptance — a retry inherits it — so a
   * client that observes a greater value purges before rendering anything;
   * it distinguishes Global eras across a disable and a later re-enable.
   */
  public globalContentEpoch = 0;

  /**
   * Each Global Source's member and boundary, keyed by Source ID. Separate from
   * {@link sourceStates}, which holds the operational overlay every Source has:
   * this map holds what only a Global Source has, so the Repository Source is
   * not carrying two null fields to describe something it is not (AGENTS.md
   * § Class and interface policy).
   */
  public readonly globalSources = new Map<string, GlobalSourceIdentity>();

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
   * Hands one committed file to an application on the reader's machine
   * (contracts/http-api.md § open-file), answering whether there was a file
   * to hand over. `false` means the current committed generations hold
   * nothing at that path — the same staleness every detail function answers
   * with, from the same causes: never scanned, or removed by the commit that
   * replaced the snapshot the page was rendered from.
   *
   * The identity is resolved against the committed generations rather than
   * trusted, so the only absolute path a launch can ever receive is one this
   * session published (FR-022). Both halves are needed: the repository and a
   * consented home can hold one Source-relative Path and each has its own
   * root, so a path alone would hand the reader a file from the wrong root —
   * the other Source's file under the address they clicked (FR-030).
   */
  public async openCommittedFile(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
    target: FileOpenTarget,
  ): Promise<boolean> {
    const root = this.#committedSourceRoot(sourceRelativePath, source);
    if (root === null) {
      return false;
    }
    // The Source-relative Path is the file's identity and is always spelled
    // with `/`. Built by the scan's own append rather than by `join`
    // ({@link pathUnderRoot}): `join` collapses `..` lexically while the
    // operating system resolves it after following the previous component, so
    // for a root holding `link/..` a joined path names a different file than
    // the one the scan read — and the launch would hand the reader that other
    // file.
    await this.#fileOpener.openFile(pathUnderRoot(root, sourceRelativePath.split('/')), target);
    return true;
  }

  /**
   * The absolute root the named Source's committed file sits below, or null
   * when no committed generation of that Source holds the path.
   *
   * The root comes from where that Source's read authority lives, never from a
   * DTO: the Repository's is the selected root, and a Global Source's is the
   * exact admitted root its consent control retained, which the published
   * boundary only carries as a one-way escaped presentation
   * (data-model.md § SourceBoundary).
   */
  #committedSourceRoot(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
  ): string | null {
    const sourceId = this.#sourceIdOf(source);
    const generation =
      sourceId === this.repositorySourceId
        ? this.committedRepositoryGeneration
        : this.committedGlobalGeneration;
    const holdsPath =
      generation?.files.some(
        (candidate) =>
          candidate.sourceRelativePath === sourceRelativePath && candidate.sourceId === sourceId,
      ) === true;
    if (!holdsPath) {
      return null;
    }
    if (sourceId === this.repositorySourceId) {
      return this.selectedRepositoryRoot;
    }
    const identity = this.globalSources.get(sourceId);
    // A committed Global file whose consent control is gone. Unreachable while
    // the only disposal of a control is the disable barrier, which discards the
    // Global generation in the same step — so the file above would not have
    // resolved. Answered as staleness rather than trusted, because the
    // alternative is opening a path no retained authority backs.
    return identity === undefined
      ? null
      : (this.globalConsent?.controls.get(identity.member)?.root ?? null);
  }

  /**
   * Resolves one committed file's complete detail, including the authored
   * source the snapshot deliberately withholds (FR-027).
   *
   * It answers for the rows whose subject is the file itself, so a path
   * carrying only declaration-subject rows — an MCP carrier's servers, a
   * declared permission policy — resolves to null and is served by that
   * row's own function instead (FR-007).
   *
   * The file's identity is the Source and its Source-relative Path (FR-030),
   * resolved against the current committed generations only, so a request
   * made after a commit answers with what the new generation holds at that
   * identity — or null when it holds nothing — never with a previous
   * generation's record. Every lookup below carries both halves: the Global
   * generation holds all four members' recognitions together, so two members
   * can hold one path — a Copilot home and the shared agent home each holding
   * `skills/<name>/SKILL.md` — and a path-only match would answer with
   * whichever member the batch listed first.
   */
  public fileDetail(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
  ): FileDetailDto | null {
    // Resolved by both halves of the identity. Searching by path alone answered
    // with whichever generation held it first, so a repository file shadowed a
    // consented home's file at the same Source-relative Path — one file's
    // contents under the other's row (FR-030).
    const sourceId = this.#sourceIdOf(source);
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      const file = generation.files.find(
        (candidate) =>
          candidate.sourceRelativePath === sourceRelativePath && candidate.sourceId === sourceId,
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
      // This function answers for the rows whose subject is the file itself,
      // so every variant below carries the complete file and the two
      // declaration-subject kinds are checked last, after none of them
      // claimed the path (contracts/http-api.md § get-file-detail).
      //
      // The parse the detail shows is the file's, not a recognizing tool's:
      // every recognition of the file's kind shares the one extraction
      // (candidate.ts), so any one of them carries it. The file-subject
      // variants are tried in a fixed order — the three Markdown kinds, then
      // the custom-agent kind, then the rule kind, then the settings kind —
      // and a file no recognition owns is the plain one: a census companion,
      // or a diagnostic-only candidate.
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
          recognition.sourceId === sourceId &&
          recognition.sourceRelativePath === sourceRelativePath &&
          isSkillRecognition(recognition),
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
      const instruction = generation.recognitions.find(
        (recognition): recognition is InstructionRecognition =>
          recognition.sourceId === sourceId &&
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
          recognition.sourceId !== sourceId ||
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
      // A recognized output style: the file plus the same one parse, because
      // an output style is frontmatter and the instructions below it. Decided
      // after the command variant for the same reason that one comes after
      // instructions — the order settles an overlap without changing what a
      // reader sees, since every Markdown variant renders the same document
      // and the same declarations.
      //
      // A loop rather than `find`, for the reason the branch above states.
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
          recognition.sourceRelativePath !== sourceRelativePath ||
          recognition.details.kind !== 'output style'
        ) {
          continue;
        }
        return {
          kind: 'output style',
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
      // the file as unparsed (`pages/agents/[source]/[...path].vue` § presentation).
      // Reordering would only move the problem: the instruction route would
      // then receive an agent variant it has no mapping for.
      //
      // A loop rather than `find`: the callback's narrowing would not reach
      // here without a hand-authored predicate, which asserts the kind instead
      // of proving it, while `continue` narrows `details` by the compiler's own
      // control flow.
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
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
            recognition.sourceId === sourceId &&
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
      // A recognized settings or configuration file: the file, and nothing
      // read out of it. The kind's row unit is the file itself
      // (data-model.md § Inventory unit), so the document its author wrote is
      // the whole answer — a Codex `.codex/config.toml` reaches the page as
      // the TOML it is, comments and section order intact. Its
      // `[mcp_servers.*]` tables are the MCP rows' subject and are served
      // declaration-first by `mcpCarrierDetail`; that they are visible here
      // too is the one document seen under its own row rather than a second
      // publication of one fact (FR-007).
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceId === sourceId &&
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'settings/config',
        )
      ) {
        return {
          kind: 'settings/config',
          file,
          diagnostics,
        };
      }
      // Past here the path carries no row whose subject is the file, so a
      // declaration-subject recognition is all it has and this function holds
      // no detail for it. Null is the same stale-resource answer as a path
      // the generations hold nothing at (contracts/http-api.md
      // § get-file-detail).
      //
      // A standalone MCP carrier: its detail is `mcpCarrierDetail`'s own
      // result, because every variant this function serves carries the full
      // file while an MCP row's subject is one declaration inside it
      // (FR-007). A carrier that also holds a file-subject row — a
      // `.mcp.json` a Codex `project_doc_fallback_filenames` entry names is
      // an instruction file besides — was already answered above under that
      // row, which is what "the row's subject decides" means.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceId === sourceId &&
            recognition.sourceRelativePath === sourceRelativePath &&
            isMcpRecognition(recognition),
        )
      ) {
        return null;
      }
      // A hook carrier, on the same terms: a hook row's subject is one
      // declared event inside the file, so its detail is
      // `hookCarrierDetail`'s own result — the shape with no `sourceText`
      // field at all (FR-007). Answering here would hand back the bytes that
      // response deliberately does not carry. A carrier that also holds a
      // file-subject row was already answered above under it: a
      // `.codex/config.toml` is its settings document besides, which is why
      // the settings branch runs first and this one is reached only by a file
      // whose whole purpose is hooks.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceId === sourceId &&
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'hook',
        )
      ) {
        return null;
      }
      // A plugin catalog, on the same terms: a plugin row's subject is one
      // declared plugin inside the file, so its detail is
      // `pluginCarrierDetail`'s own result — declarations without the
      // document's bytes (FR-007) — and the files below a declared root are
      // `pluginFileDetail`'s. Answering here would hand out the whole
      // catalog's sourceText beside the declaration-shaped response that
      // deliberately does not carry it.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceId === sourceId &&
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'plugin',
        )
      ) {
        return null;
      }
      // A declared permission policy, on the same terms: what a permissions
      // row names is a policy rather than a file (data-model.md § Inventory
      // unit), so it is `permissionPolicyDetail`'s resource, and answering
      // here would publish it as "no recognition owns this" for a path whose
      // own inventory row says one does.
      if (
        generation.recognitions.some(
          (recognition) =>
            recognition.sourceId === sourceId &&
            recognition.sourceRelativePath === sourceRelativePath &&
            recognition.details.kind === 'permissions',
        )
      ) {
        return null;
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
   * answer takes one of the kind's two published forms — the whole document
   * for a file that is a policy, and the content-free declared block for a
   * policy one key of a settings carrier declares
   * (`api-types.ts` § PermissionPolicyDetailDto).
   *
   * Null when the current committed generations hold no permissions
   * recognition at the path, which the handler answers as the
   * `stale-resource` rejection.
   */
  public permissionPolicyDetail(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
  ): PermissionPolicyDetailDto | null {
    const sourceId = this.#sourceIdOf(source);
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
      let policyDiagnosticIds: readonly string[] = [];
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
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
          policyDiagnosticIds = recognition.diagnosticIds;
          break;
        }
      }
      if (!declared) {
        continue;
      }
      const file = generation.files.find(
        (candidate) =>
          candidate.sourceId === sourceId && candidate.sourceRelativePath === sourceRelativePath,
      );
      if (file === undefined) {
        // A recognition exists only for a committed file, so the pair cannot
        // separate within one generation; failing loudly beats serving a
        // policy whose file facts this commit does not hold.
        throw new Error('a permissions recognition names a file its generation does not hold');
      }
      // Whole-document: the file is the policy, so its own diagnostic
      // references travel exactly as `fileDetail`'s do. Declared-block: only
      // the permissions recognition's own — the carrier's other keys, a hook
      // block's failed parse among them, are another recognition's content
      // and reach no permissions response (contracts/http-api.md
      // § get-permission-policy-detail).
      const diagnosticIds = policy === undefined ? file.diagnosticIds : policyDiagnosticIds;
      const diagnostics = generation.diagnostics.filter((diagnostic) =>
        diagnosticIds.includes(diagnostic.diagnosticId),
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
   * One plugin carrier's detail for one plugin row (contracts/http-api.md
   * § get-plugin-carrier-detail), or null when the committed generations hold
   * no plugin recognition at the path.
   *
   * The shape follows the carrier the admitting rule decided this file is: a
   * manifest serves its complete authored source and nothing read out of it,
   * because the file is itself the customization, while a catalog serves the
   * requested entry's declarations without its own bytes, because a page about
   * one plugin must not put every other plugin the catalog lists on the screen
   * (FR-007).
   *
   * A catalog offering also serves the plugin root manifests it reached, with
   * their complete source. The inventory row lists the offering rather than its
   * content, so no row publishes a path for that manifest and no other page
   * would show it; the offering's own detail is where the plugin's definition
   * is read. Only the requested row's manifests travel, which is why the plugin
   * name is a parameter rather than something the page filters after the fact.
   *
   * One file can carry a plugin recognition per product — the catalog at
   * `.claude-plugin/marketplace.json` is Codex's legacy-compatible location,
   * where Claude documents a repository's own catalog, and the fourth form
   * Copilot checks — and the page they all reach is one, because the plugin
   * and the file are its identity and every product reads the same bytes
   * (FR-030). The declarations are therefore the same for each of them except
   * in one respect: which file inside a plugin root a client reads as that
   * plugin's own declaration is each vendor's contract, so the manifest forms
   * are taken across every recognition at the path rather than from whichever
   * one this loop reached first. Without that union a root shipping only
   * another product's form would be published as a plugin whose manifest this
   * scan holds none of, while the plugin's own files list it.
   */
  public pluginCarrierDetail(params: PluginCarrierDetailParams): PluginCarrierDetailDto | null {
    const sourceId = this.#sourceIdOf(params.source);
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      // A loop rather than `find`: the callback's narrowing would not reach
      // here without a hand-authored predicate, which asserts the kind instead
      // of proving it, while `continue` narrows `details` by the compiler's own
      // control flow.
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
          recognition.sourceRelativePath !== params.sourceRelativePath ||
          recognition.tool !== params.tool ||
          recognition.details.kind !== 'plugin'
        ) {
          continue;
        }
        const file = generation.files.find(
          (candidate) =>
            candidate.sourceId === sourceId &&
            candidate.sourceRelativePath === params.sourceRelativePath,
        );
        if (file === undefined) {
          // A recognition exists only for a committed file, so the pair cannot
          // separate within one generation; failing loudly beats serving a
          // detail whose file facts this commit does not hold.
          throw new Error('a plugin recognition names a file its generation does not hold');
        }
        const diagnostics = generation.diagnostics.filter((diagnostic) =>
          file.diagnosticIds.includes(diagnostic.diagnosticId),
        );
        return recognition.details.carrier === 'manifest'
          ? {
              carrier: 'manifest',
              file,
              // The one declaration a manifest makes carries the root the
              // rule resolved from the manifest's own placement — the folder
              // holding it — which stands whether or not the extraction
              // parsed, so a failed manifest still answers with the root its
              // path establishes and only its declared fields are absent
              // (FR-028; `plugins/claude.ts` § claudePluginPlacementOf).
              pluginRoot: recognition.details.plugins[0]?.pluginRoot ?? '',
              diagnostics,
            }
          : {
              carrier: 'catalog',
              file: summarizeFile(file),
              catalogFields: recognition.details.catalogFields,
              // Null exactly for a failed extraction: nothing was parsed, so
              // the entries are unknown rather than absent (FR-028).
              plugins:
                recognition.parseStatus === 'parsed'
                  ? recognition.details.plugins
                      .filter((plugin) => plugin.name === params.pluginName)
                      .map((plugin) => ({
                        ...plugin,
                        manifestPaths: pluginManifestPathsAt(
                          generation.recognitions,
                          params.sourceRelativePath,
                          plugin,
                        ),
                      }))
                  : null,
              diagnostics,
            };
      }
    }
    return null;
  }

  /**
   * Resolves one file a plugin ships — its complete authored source and its own
   * diagnostics (contracts/http-api.md § get-plugin-file-detail).
   *
   * Its own resolver rather than a `fileDetail` branch, because the subject is
   * the file *as this plugin's*. `fileDetail` answers for the row whose subject
   * a file is, and a path whose only rows name declarations inside it — an MCP
   * carrier, a declared permission policy — has no such row, so it answers
   * there with the same null it answers for a path no generation holds. Below a
   * plugin root that file is still one of the plugin's own files, and the
   * plugin's page is where a reader opens it: refusing there would list a file
   * in the tree and then report it as gone.
   *
   * Membership is what makes the path readable here: the file must sit below a
   * directory this carrier's offering of this row's name reached, which is the
   * census's own answer (contracts/inspection-path-allowlist.md § Bounded
   * companion census). A path outside every such directory resolves nowhere,
   * so this function cannot be used to read an arbitrary file through a
   * plugin's name.
   */
  public pluginFileDetail(params: PluginFileDetailParams): PluginFileDetailDto | null {
    const sourceId = this.#sourceIdOf(params.source);
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
          recognition.sourceRelativePath !== params.sourceRelativePath ||
          recognition.tool !== params.tool ||
          recognition.details.kind !== 'plugin'
        ) {
          continue;
        }
        // The roots this carrier's offering of the requested name reached, in
        // the reading that product published: a declaration of another name at
        // the same carrier reaches its own directory, and a file below that one
        // is that row's rather than this one's.
        const escapedRoots = new Set(
          generation.censusEscapedDirectories.map((entry) =>
            fileIdentityKey(entry.sourceId, entry.directory),
          ),
        );
        const roots = recognition.details.plugins
          .filter((plugin) => plugin.name === params.pluginName)
          .map((plugin) => plugin.pluginRoot)
          .filter((root): root is string => root !== null)
          // The census's verdict gates the detail exactly as it gates the
          // row's file list ({@link pluginRootFilesOf}): a root whose real
          // path escaped the Source authorizes nothing below its spelling.
          .filter((root) => !escapedRoots.has(fileIdentityKey(recognition.sourceId, root)));
        // The type is checked before the prefix test rather than trusted: a
        // declared parameter carrying a value of another type resolves nowhere
        // and takes the same `stale-resource` rejection any unheld resource
        // takes (contracts/http-api.md § Resource parameters). Every sibling
        // resolver compares for equality and so refuses a wrong type by
        // failing to match; this one calls a string method, so it says no
        // itself. Reached from the RPC boundary, which types its parameters
        // without validating them (`devframe-app.ts`).
        if (
          typeof params.filePath !== 'string' ||
          !roots.some((root) => params.filePath.startsWith(root))
        ) {
          return null;
        }
        const file = generation.files.find(
          (candidate) =>
            candidate.sourceId === sourceId && candidate.sourceRelativePath === params.filePath,
        );
        if (file === undefined) {
          // The census enumerated the directory in an earlier commit and this
          // one no longer holds the file: the same stale answer a path the
          // generations hold nothing at gets.
          return null;
        }
        return {
          file,
          diagnostics: generation.diagnostics.filter((diagnostic) =>
            file.diagnosticIds.includes(diagnostic.diagnosticId),
          ),
        };
      }
    }
    return null;
  }

  /**
   * Resolves one hook carrier's declarations — the lifecycle events it
   * declares and its own content-free file facts, never its source text
   * (FR-007; contracts/http-api.md § get-hook-carrier-detail). Only an
   * admitted hook carrier holds a hook recognition: a file of any other kind
   * that spells hook-looking configuration never resolves here — its
   * configuration is that kind's own detail content. Null when the current
   * committed generations hold no hook recognition at the path, which the
   * handler answers as the `stale-resource` rejection.
   *
   * Every hook recognition at the path answers, not the first: a settings
   * document is read by each product that documents reading it, and since the
   * formats can differ — Copilot's editor host takes `.claude/settings.json`
   * through a JSONC reading while Claude Code reads it strictly — their
   * readings can differ too. The file-unit response is therefore the union of
   * the parsed readings, exactly as the MCP carrier's is
   * ({@link InspectionSession.mcpCarrierDetail}), with `events` null only when
   * no reading parsed; which product read a given event stays the inventory's
   * per-declaration fact.
   */
  public hookCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
  ): HookCarrierDetailDto | null {
    const sourceId = this.#sourceIdOf(source);
    const generations = [
      this.committedRepositoryGeneration,
      ...(this.committedGlobalGeneration === null ? [] : [this.committedGlobalGeneration]),
    ];
    for (const generation of generations) {
      // Every reading of the path, narrowed by the control flow rather than by
      // a predicate: the loop is what proves the kind, and each reading keeps
      // the two facts this response needs beside its declarations.
      const readings: {
        readonly parseStatus: RecognitionParseStatus;
        readonly details: Extract<ToolRecognition['details'], { readonly kind: 'hook' }>;
        readonly diagnosticIds: readonly string[];
      }[] = [];
      for (const recognition of generation.recognitions) {
        if (
          recognition.sourceId !== sourceId ||
          recognition.sourceId !== sourceId ||
          recognition.sourceRelativePath !== sourceRelativePath ||
          recognition.details.kind !== 'hook'
        ) {
          continue;
        }
        readings.push({
          parseStatus: recognition.parseStatus,
          details: recognition.details,
          diagnosticIds: recognition.diagnosticIds,
        });
      }
      const [firstReading] = readings;
      if (firstReading === undefined) {
        continue;
      }
      {
        const file = generation.files.find(
          (candidate) =>
            candidate.sourceId === sourceId && candidate.sourceRelativePath === sourceRelativePath,
        );
        if (file === undefined) {
          // A recognition exists only for a committed file, so the pair cannot
          // separate within one generation; failing loudly beats serving a
          // detail whose file facts this commit does not hold.
          throw new Error('a hook recognition names a file its generation does not hold');
        }
        // The answering readings' own diagnostic references, in the commit's
        // deterministic order — not the file's whole list, which can also hold
        // another kind's failure of the same file, and another product's
        // failure of this kind when only that product's reading rejected the
        // text (FR-028).
        const diagnostics = generation.diagnostics.filter((diagnostic) =>
          readings.some((reading) => reading.diagnosticIds.includes(diagnostic.diagnosticId)),
        );
        // Null exactly when no reading parsed: nothing was read, the rows are
        // unknown rather than absent, and the diagnostics above are those
        // failures' records (FR-028). Otherwise the union of the parsed
        // readings, one entry per declared event in their own publish order —
        // the union rather than the first parsed reading, so the answer states
        // the rule instead of trusting the order a commit happens to list the
        // readings in.
        const events = readings.every((reading) => reading.parseStatus !== 'parsed')
          ? null
          : unionOfHookReadings(readings);
        // The carrier's form is the file's, so the first reading answers for
        // it: a file is one form whichever product read it.
        return firstReading.details.carrier === 'standalone'
          ? {
              carrier: 'standalone',
              // The content-free summary: the carrier's facts without its
              // source text, absent from the shape rather than withheld at
              // render time (FR-007).
              file: summarizeFile(file),
              events,
              // The keys beside the hook map, which only this response
              // publishes: such a file has no other row (FR-007). Every
              // shipped standalone rule is one product's own location —
              // Codex's `.codex/hooks.json` and Copilot's `.github/hooks/`
              // files — so there is one reading here to take them from.
              carrierFields:
                firstReading.parseStatus === 'parsed' ? firstReading.details.carrierFields : [],
              diagnostics,
            }
          : {
              carrier: 'contained',
              file: summarizeFile(file),
              events,
              diagnostics,
            };
      }
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
  public mcpCarrierDetail(
    sourceRelativePath: string,
    source: SourceSelector | undefined,
  ): McpCarrierDetailDto | null {
    const sourceId = this.#sourceIdOf(source);
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
          recognition.sourceId === sourceId &&
          recognition.sourceRelativePath === sourceRelativePath &&
          isMcpRecognition(recognition),
      );
      const [mcp] = mcpRecognitions;
      if (mcp === undefined) {
        continue;
      }
      const file = generation.files.find(
        (candidate) =>
          candidate.sourceId === sourceId && candidate.sourceRelativePath === sourceRelativePath,
      );
      if (file === undefined) {
        // A recognition exists only for a committed file, so the pair cannot
        // separate within one generation; failing loudly beats serving a
        // detail whose file facts this commit does not hold.
        throw new Error('an MCP recognition names a file its generation does not hold');
      }
      // The answering readings' own diagnostic references, in the commit's
      // deterministic order — not the file's whole list, which can also hold
      // another kind's failure of the same file, and this kind's failure by a
      // product whose reading alone rejected the text (FR-028).
      const diagnostics = generation.diagnostics.filter((diagnostic) =>
        mcpRecognitions.some((recognition) =>
          recognition.diagnosticIds.includes(diagnostic.diagnosticId),
        ),
      );
      return {
        // The content-free summary: the carrier's facts without its source
        // text, absent from the shape rather than withheld at render time
        // (FR-007).
        file: summarizeFile(file),
        // Null exactly when no reading parsed: a text one product's reading
        // rejects is not one every product's rejects — a root `.mcp.json` is
        // JSONC to Copilot's editor host and strict JSON to Claude Code — so
        // the union stands while any reading parsed, and null means nothing
        // was read, the rows being unknown rather than absent (FR-028).
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
   * and must not pay for the full snapshot projection to get them.
   */
  public dataEnvelope(): Omit<InspectionDataResult<never>, 'data'> {
    return {
      globalContentEpoch: this.globalContentEpoch,
      repositoryGeneration: this.committedRepositoryGeneration.generation,
      globalGeneration: this.committedGlobalGeneration?.generation ?? null,
    };
  }

  /**
   * The Source ID one request's selector names, or the empty string when no
   * such Source exists — a `global-claude` selector before Claude's home has
   * been consented to, for instance. No file carries an empty Source ID, so
   * that resolves nothing, which is the same answer a path the generation does
   * not hold gets (contracts/http-api.md § get-file-detail).
   */
  #sourceIdOf(source: SourceSelector | undefined): string {
    // The wire can omit or misspell the selector; both resolve to no Source
    // and take the same stale-resource rejection an unknown path does —
    // resolution, not a shape guard, and never a silent repository default
    // that could answer with another Source's resource
    // (contracts/http-api.md § get-file-detail).
    if (source === 'repository') {
      return this.repositorySourceId;
    }
    for (const [sourceId, identity] of this.globalSources) {
      if (`global-${identity.member}` === source) {
        return sourceId;
      }
    }
    return '';
  }

  /**
   * Every committed Global Source, in the fixed member order. A Global Source
   * exists only once its batch has committed: an admitted member whose scan has
   * not published yet is a control, not a Source, which is what "no
   * provisional Source before the one batch commit" means for a reader
   * refreshing mid-scan (data-model.md § GlobalEnableOperation).
   */
  #globalSourceDtos(): SourceDto[] {
    const generation = this.committedGlobalGeneration;
    if (generation === null) {
      return [];
    }
    const dtos: SourceDto[] = [];
    for (const member of GLOBAL_MEMBER_ORDER) {
      for (const [sourceId, identity] of this.globalSources) {
        if (identity.member !== member) {
          continue;
        }
        const overlay = this.sourceStates.get(sourceId);
        if (overlay === undefined) {
          continue;
        }
        dtos.push({
          sourceId,
          kind: 'global',
          member,
          enabled: true,
          status: overlay.status,
          boundary: identity.boundary,
          generation: generation.generation,
          scanRequestId: overlay.scanRequestId,
          progress: overlay.progress,
          diagnosticIds: [...overlay.diagnosticIds],
        });
      }
    }
    return dtos;
  }

  /**
   * The inventory's Source ordering key: the Repository Source first, then each
   * Global Source in the fixed member order. It is what puts a reader's own
   * repository above their personal setup in one list rather than interleaving
   * two boundaries by path.
   */
  #inventorySourceOrder(): Map<string, number> {
    const order = new Map<string, number>([[this.repositorySourceId, 0]]);
    let rank = 1;
    for (const member of GLOBAL_MEMBER_ORDER) {
      for (const [sourceId, identity] of this.globalSources) {
        if (identity.member === member) {
          order.set(sourceId, rank);
          rank += 1;
        }
      }
    }
    return order;
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
    // Computed once for the whole snapshot: the file inventory and the
    // instruction rows both order by it, and two rankings could disagree.
    const inventorySourceOrder = this.#inventorySourceOrder();
    return {
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      fileOpenTargets: this.#fileOpener.targets,
      sources: [
        {
          sourceId: this.repositorySourceId,
          kind: 'repository',
          member: null,
          enabled: true,
          status: repository.status,
          boundary: this.boundary,
          generation: this.committedRepositoryGeneration.generation,
          scanRequestId: repository.scanRequestId,
          progress: repository.progress,
          diagnosticIds: [...repository.diagnosticIds],
        },
        ...this.#globalSourceDtos(),
      ],
      files: sortInventory(
        committedFiles.map((file) => summarizeFile(file)),
        inventorySourceOrder,
      ),
      instructions: projectInstructionInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        // The same ranking the file inventory is sorted by, so a row and the
        // files under it agree about which Source comes first.
        inventorySourceOrder,
      ),
      skills: projectSkillInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        committedFiles,
        inventorySourceOrder,
        [
          ...this.committedRepositoryGeneration.censusEscapedDirectories,
          ...(this.committedGlobalGeneration?.censusEscapedDirectories ?? []),
        ],
      ),
      mcp: projectMcpInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      agents: projectAgentInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      prompts: projectPromptInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      rules: projectRuleInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      permissions: projectPermissionsInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      hooks: projectHookInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      plugins: projectPluginInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        committedFiles,
        inventorySourceOrder,
        [
          ...this.committedRepositoryGeneration.censusEscapedDirectories,
          ...(this.committedGlobalGeneration?.censusEscapedDirectories ?? []),
        ],
      ),
      outputStyles: projectOutputStyleInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      settings: projectSettingsInventory(
        [
          ...this.committedRepositoryGeneration.recognitions,
          ...(this.committedGlobalGeneration?.recognitions ?? []),
        ],
        inventorySourceOrder,
      ),
      // Semantic emission order (data-model.md § Diagnostic): session-owned
      // lifecycle records precede the generations' candidate-owned records,
      // and within them the owner rank — Repository, then the fixed member
      // order — decides, never the failures' arrival order or an opaque
      // Source ID ({@link #lifecycleDiagnosticRank}).
      diagnostics: [
        ...[...this.sessionDiagnostics.values()].toSorted(
          (left, right) =>
            this.#lifecycleDiagnosticRank(left) - this.#lifecycleDiagnosticRank(right),
        ),
        ...this.committedRepositoryGeneration.diagnostics,
        ...(this.committedGlobalGeneration?.diagnostics ?? []),
      ],
      ...this.dataEnvelope(),
      snapshotState: deriveSnapshotState(this.staleFailures),
      staleFailures: this.staleFailures,
      globalControl: this.globalConsent?.toDto() ?? null,
      globalEnableInProgress: this.globalEnableInProgress,
      globalDisableInProgress: this.globalDisableInProgress,
      sessionDiagnosticIds: [...this.sessionDiagnostics.keys()],
      repositoryFailureDiagnosticId: this.repositoryFailureDiagnosticId,
    };
  }

  /**
   * The semantic owner rank of one lifecycle Diagnostic (data-model.md
   * § Diagnostic): the Repository first, then the fixed member order — for a
   * published member Source or an unpublished control's abandoned Source ID
   * alike — then anything neither resolves, which keeps whatever relative
   * order it arrived in. An opaque Source ID never supplies the order.
   */
  #lifecycleDiagnosticRank(diagnostic: SerializedDiagnostic): number {
    if (diagnostic.sourceId === this.repositorySourceId) {
      return 0;
    }
    const published = this.globalSources.get(diagnostic.sourceId)?.member;
    if (published !== undefined) {
      return 1 + GLOBAL_MEMBER_ORDER.indexOf(published);
    }
    for (const [member, control] of this.globalConsent?.controls ?? []) {
      if (control.sourceId === diagnostic.sourceId) {
        return 1 + GLOBAL_MEMBER_ORDER.indexOf(member);
      }
    }
    return 1 + GLOBAL_MEMBER_ORDER.length;
  }

  /**
   * The exact control-only session response served while the disable fence is
   * non-null (contracts/http-api.md § get-session `GlobalFenceRecoverySnapshot`).
   * It carries no generation, Source, file, path, authored value, or
   * Diagnostic field: the fence exists so no inspection data is public until
   * terminal success or process restart (FR-042). Throws when no fence is
   * installed, because serving a recovery snapshot beside a full one would be
   * two session answers at once — the session handler picks by the fence.
   */
  public fenceRecoverySnapshot(): GlobalFenceRecoverySnapshot {
    if (this.globalDisableInProgress === null) {
      throw new Error('the fence recovery snapshot exists only while the disable fence is closed');
    }
    return {
      sessionId: this.sessionId,
      globalContentEpoch: this.globalContentEpoch,
      globalControl: this.globalConsent?.toDto() ?? null,
      globalEnableInProgress: this.globalEnableInProgress,
      globalDisableInProgress: this.globalDisableInProgress,
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
 * One accepted priority disable barrier (data-model.md
 * § GlobalDisableOperation). Constructed at first acceptance and mutated only
 * by the drain/commit/failure transitions; a retry replaces the instance but
 * inherits every acceptance-time field, so the disposition can never be
 * recomputed from the partially cleaned public projection.
 */
class GlobalDisableOperation {
  /** The barrier's opaque command ID; joined requests share it and its result. */
  public readonly operationId: string;

  /** The content epoch captured at acceptance; every continuation must match it. */
  public readonly commandEpoch: number;

  /** The disposition fixed at first acceptance and retained by every retry. */
  public readonly commitKind: GlobalDisableCommitKind;

  /**
   * The exact per-sequence committed generations at acceptance. The barrier
   * commits no generation, so a mismatch at terminal revalidation is an
   * internal invariant failure, never a rebase.
   */
  public readonly baseGenerations: {
    readonly repository: number;
    readonly global: number | null;
  };

  /** Where the barrier stands; `complete` projects as a null fence. */
  public status: 'draining' | 'committing' | 'failed' | 'complete' = 'draining';

  /** The failed request's retained error message; null outside `failed`. */
  public retainedMessage: string | null = null;

  /** Fixes the acceptance-time fields; see the class doc. */
  public constructor(
    operationId: string,
    commandEpoch: number,
    commitKind: GlobalDisableCommitKind,
    baseGenerations: { readonly repository: number; readonly global: number | null },
  ) {
    this.operationId = operationId;
    this.commandEpoch = commandEpoch;
    this.commitKind = commitKind;
    this.baseGenerations = baseGenerations;
  }
}

/**
 * One Repository command the disable barrier held: the exact identity the
 * requeue restores — same request ID, trigger owner, and Source — plus the
 * job the sequence chain re-runs after terminal success (contracts/http-api.md
 * § disable-global "held for one requeue").
 */
interface HeldRepositoryCommand {
  /** The held command's Source. */
  readonly sourceId: string;
  /** The admitted request ID the requeue preserves; no new admission is made. */
  readonly scanRequestId: string;
  /** Who initiated the held command; preserved across the requeue. */
  readonly triggerOwner: TriggerOwner;
  /** Whether the held command was an explicit rescan; preserved across the requeue. */
  readonly explicit: boolean;
  /** The execution the sequence chain re-runs once, after terminal success. */
  readonly job: () => Promise<void>;
}

/**
 * Serializes scan admission and commit for one session, in both sequences:
 * the Repository's scans and the Global sequence's enable batch, member
 * rescans, and priority disable barrier. At most one scan per source is
 * running or queued and every transaction runs in one FIFO; a commit
 * atomically replaces its own sequence's committed generation with exactly
 * N+1 and clears stale state only for the sources it refreshed.
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

  /**
   * The one execution chain: the settlement of the last transaction the
   * coordinator started, whichever sequence owns it. Every scan command and
   * the enable batch run one at a time in acceptance order — "Source scans
   * never execute concurrently" (data-model.md § ScanAttempt;
   * contracts/http-api.md § Concurrency and lifecycle: a command queues FIFO
   * while another transaction is active, Repository or Global alike). Only
   * generation bookkeeping is per-sequence.
   */
  #executionChain: Promise<void> = Promise.resolve();

  /**
   * The pending execution of each admitted command, keyed by request ID, from
   * admission until its job settles. What the disable barrier reads to hold a
   * Repository command with its own job — a held command is re-run by the
   * requeue, and the closure is the only re-runnable form of it.
   */
  readonly #pendingJobs = new Map<string, () => Promise<void>>();

  /**
   * Every in-flight execution the coordinator started — sequence-chain jobs
   * and the Global enable batch — so the disable barrier's drain can wait for
   * exactly the work its revocation affected (data-model.md
   * § GlobalDisableOperation). Entries remove themselves on settlement.
   */
  readonly #inFlightWork = new Set<Promise<unknown>>();

  /**
   * The current disable barrier, or null. Held across `failed` so a retry
   * inherits the acceptance-time disposition; replaced by the retry's own
   * instance and cleared by nothing — `complete` simply stops being current
   * when the next barrier is accepted.
   */
  #disableOperation: GlobalDisableOperation | null = null;

  /**
   * The running barrier's completion, shared verbatim with every joined
   * request (contracts/http-api.md § disable-global): a second disable while
   * the barrier is draining or committing awaits this same promise and
   * receives the same terminal result. Null while no cleanup is running.
   */
  #disableCompletion: Promise<GlobalDisableResultDto> | null = null;

  /**
   * The Repository commands the barrier held, in their queue order, for the
   * one requeue terminal success performs. A failed attempt releases nothing:
   * the entries stay held until success requeues them or the process ends.
   */
  #heldRepository: HeldRepositoryCommand[] = [];

  /**
   * Whether the shutdown revocation has run. The Global enable batch is not
   * an entry of {@link SessionCoordinator.#attempts} — it is accepted by
   * `settleGlobalEnable` and committed by `completeGlobalBatch` — so the
   * per-attempt revocation cannot reach it; this flag is what makes "a result
   * arriving after shutdown commits nothing" hold for the batch too
   * (data-model.md § ScanAttempt).
   */
  #allPublicationRevoked = false;

  /** Binds the coordinator to the one session whose state it serializes. */
  public constructor(session: InspectionSession) {
    this.#session = session;
  }

  /**
   * Admits one scan command for a Source and issues its opaque
   * `scanRequestId` (FR-030). While a scan for the same Source is running
   * or queued, returns the fixed `conflict` instead of stacking attempts.
   * A command admitted while another attempt holds its sequence is admitted
   * as queued — `waiting`, a `queuedAt`, no `startedAt` — and
   * {@link SessionCoordinator.runInSequence} dequeues it in acceptance order
   * (contracts/http-api.md § rescan-repository, § rescan-global).
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
    // Whether an earlier admitted attempt still holds this Source's sequence:
    // commands serialize within a sequence, so this one starts as queued and
    // its work begins at dequeue (contracts/http-api.md § rescan-global "same
    // FIFO ... applied within the Global sequence").
    // One chain for every transaction (see #executionChain): a command
    // admitted while anything runs or waits — either sequence's command, or
    // the enable batch — is queued behind it and starts as the contract's
    // waiting presentation.
    const queued = this.#globalTransactionsPending > 0 || this.#attempts.size > 0;
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
    sourceState.progress = queued
      ? {
          scanRequestId,
          // Queued behind the sequence's running command: the contract's
          // waiting presentation, replaced at dequeue (§ rescan-repository).
          phase: 'waiting',
          queuedAt: new Date().toISOString(),
          startedAt: null,
          visitedEntries: 0,
          candidateFiles: 0,
          readBytes: 0,
          diagnosticCount: 0,
        }
      : {
          scanRequestId,
          // An admitted attempt begins with its configuration read, not with
          // the walk: `runSourceScan` runs each vendor's reader before
          // enumerating anything, so seeding `enumerating` would name a stage
          // that has not started, and the walk's own first report moves the
          // phase on.
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
   * The generation sequence a Source commits into: the bootstrap Repository
   * Source is the Repository sequence's, and every other Source is a member
   * Global Source (FR-030).
   */
  #sequenceOf(sourceId: string): 'repository' | 'global' {
    return sourceId === this.#session.repositorySourceId ? 'repository' : 'global';
  }

  /**
   * Runs one admitted command's execution in its sequence's acceptance order
   * (contracts/http-api.md § rescan-repository "queued FIFO", § rescan-global
   * "same FIFO ... applied within the Global sequence"): admission answers
   * immediately, and the work itself starts only after every earlier admitted
   * command of the same sequence settled — so two members' commands publish
   * in acceptance order, while the two sequences stay independent of each
   * other. The returned promise settles with `job`'s own settlement, so the
   * trigger-owning boundary still receives an unexpected failure unchanged
   * (FR-029); the chain itself absorbs it, so one command's failure never
   * refuses the next.
   *
   * Dequeue is where a queued command's clock starts: its `waiting` overlay
   * becomes the running presentation, and the job reads the committed
   * generation as of this moment — the dequeue-time base the contract fixes.
   * An attempt revoked or settled while it waited runs nothing: its work was
   * cleanup-only the moment authority left it (data-model.md § ScanAttempt).
   */
  public runInSequence(
    sourceId: string,
    scanRequestId: string,
    job: () => Promise<void>,
  ): Promise<void> {
    this.#pendingJobs.set(scanRequestId, job);
    const previous = this.#executionChain;
    const run = previous.then(async () => {
      const attempt = this.#attempts.get(scanRequestId);
      if (
        attempt === undefined ||
        attempt.publicationAuthority === 'revoked' ||
        this.#allPublicationRevoked
      ) {
        // The shutdown revocation covers a job that was queued when the CLI's
        // close handler ran: revoking the flag alone would let this dequeue
        // start reading after shutdown ({@link revokeAllPublicationAuthority}
        // "a result arriving afterwards must commit nothing" — and no new
        // reading starts either, data-model.md § ScanAttempt).
        this.#pendingJobs.delete(scanRequestId);
        return;
      }
      if (this.#session.globalDisableInProgress !== null) {
        // The disable barrier is a generation fence: no generation-mutating
        // command may dequeue while it is non-complete (data-model.md
        // § GlobalDisableOperation). A queued Repository command stays held
        // in its waiting overlay for the one requeue terminal success
        // performs; a queued Global command was already swept at acceptance,
        // so reaching here is the sweep's own race window and runs nothing.
        this.#pendingJobs.delete(scanRequestId);
        return;
      }
      try {
        this.#markDequeued(attempt);
        await job();
      } finally {
        this.#pendingJobs.delete(scanRequestId);
      }
    });
    this.#trackInFlight(run);
    this.#executionChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Runs one Global-sequence job that owns no scan attempt — the enable
   * admission and the enable batch — in the same FIFO the sequence's commands
   * use
   * (contracts/http-api.md § rescan-global "same FIFO ... applied within the
   * Global sequence"), tracked for the disable barrier's drain
   * (§ disable-global): the barrier must wait out a batch already reading,
   * and a retry batch must never run beside an explicit member rescan. The
   * fence check at dequeue is the barrier's queued-work cancellation for
   * this shape — work that has not started when the barrier accepts runs
   * nothing, which is expected cancellation with nothing retained, reported
   * to the caller as `undefined`.
   *
   * The enable admission runs here too: plan.md § Concurrency has one
   * coordinator serialize a `GlobalEnableOperation`'s admission along with its
   * batch, the Repository scans, and the Global rescans, so the admission's
   * own reads never run beside a scan.
   */
  public runGlobalTransaction<T>(job: () => Promise<T>): Promise<T | undefined> {
    const previous = this.#executionChain;
    this.#globalTransactionsPending += 1;
    const run = previous.then(async () => {
      if (this.#session.globalDisableInProgress !== null || this.#allPublicationRevoked) {
        // The disable fence and the shutdown revocation both cancel a queued
        // batch at dequeue: starting its reads after either would be new
        // I/O the revocation stops (data-model.md § ScanAttempt). The caller
        // sees `undefined`, which is the cancellation it already answers for:
        // the barrier cleared the operation it would have settled.
        return undefined;
      }
      return await job();
    });
    void run.then(
      () => (this.#globalTransactionsPending -= 1),
      () => (this.#globalTransactionsPending -= 1),
    );
    this.#trackInFlight(run);
    this.#executionChain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * Global-sequence transactions — the enable batch — currently queued or
   * running through {@link runGlobalTransaction}. They own no attempt entry,
   * so {@link admitScan}'s occupied-sequence test counts them here: a
   * command admitted behind one is queued in the same FIFO and starts at
   * the contract's waiting presentation rather than claiming to run
   * (contracts/http-api.md § rescan-global).
   */
  #globalTransactionsPending = 0;

  /**
   * Registers one in-flight execution for the disable barrier's drain
   * (data-model.md § GlobalDisableOperation): the barrier waits for exactly
   * the work its revocation affected, and an entry removes itself on
   * settlement. Public because the Global enable batch runs outside the
   * sequence chains, at the host boundary that starts it.
   */
  public trackInFlight(work: Promise<unknown>): void {
    this.#trackInFlight(work);
  }

  /** {@link SessionCoordinator.trackInFlight}, shared with the sequence chains. */
  #trackInFlight(work: Promise<unknown>): void {
    this.#inFlightWork.add(work);
    void work.then(
      () => this.#inFlightWork.delete(work),
      () => this.#inFlightWork.delete(work),
    );
  }

  /**
   * Replaces a dequeued command's `waiting` overlay with the running
   * presentation: the phase its work opens with, and a `startedAt` stamped
   * now — dequeue time, which is also when the job reads its base generation
   * (contracts/http-api.md § rescan-repository). A command admitted straight
   * into a free sequence was never `waiting` and keeps its admission overlay.
   */
  #markDequeued(attempt: AttemptState): void {
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    if (
      sourceState === undefined ||
      sourceState.progress === null ||
      sourceState.progress.scanRequestId !== attempt.scanRequestId ||
      sourceState.progress.phase !== 'waiting'
    ) {
      return;
    }
    sourceState.progress = {
      ...sourceState.progress,
      phase: 'deriving',
      // Cleared as work begins (data-model.md § ScanProgress): an active
      // phase requires null `queuedAt`.
      queuedAt: null,
      startedAt: new Date().toISOString(),
    };
  }

  /**
   * Registers one Global enable operation against the frozen preview, or
   * returns the fixed conflict (contracts/http-api.md § enable-global).
   *
   * At most one may be running: a duplicate is `global-enable-in-progress`
   * rather than a second transaction, because two operations over one consent
   * would each prepare a batch and only one could commit. The projection it
   * installs carries no tool outcome, root, Source, or job — only that an
   * operation exists.
   */
  public registerGlobalEnable(
    previewId: string,
    kind: 'initial-enable' | 'retry',
  ): { readonly kind: 'admitted'; readonly operationId: string } | { readonly kind: 'conflict' } {
    if (this.#session.globalEnableInProgress !== null) {
      return { kind: 'conflict' };
    }
    const operationId = createOpaqueId();
    this.#session.globalEnableInProgress = { kind, operationId, previewId };
    return { kind: 'admitted', operationId };
  }

  /**
   * Unregisters a Global enable operation that ended before its disposition.
   *
   * Reached by the enable function's own failure path: a throw during
   * admission is not confined to one tool, so the transaction aborts, the
   * request reports its real error, and no terminal operation history is kept
   * (data-model.md § GlobalEnableOperation).
   */
  public abandonGlobalEnable(operationId: string): void {
    if (this.#session.globalEnableInProgress?.operationId === operationId) {
      this.#session.globalEnableInProgress = null;
    }
  }

  /**
   * The atomic disposition of one Global enable operation: activate the
   * consent and its controls, partition the evaluated tools, and either queue
   * exactly one batch for the admitted subset or commit `active-no-job`
   * (contracts/http-api.md § enable-global).
   *
   * Every admitted tool's Source ID is allocated here and published only by
   * the batch's own commit, so no Source exists for a scan that has not
   * finished. A tool with no bound port is not evaluated: it is absent from
   * both partitions and receives no control, because this build has nothing to
   * say about it (`GlobalEnableMember.port`).
   */
  public settleGlobalEnable(
    operationId: string,
    previewId: string,
    resolved: readonly {
      readonly member: GlobalEnableMember;
      readonly outcome: GlobalResolvedOutcome;
    }[],
  ): GlobalEnableResultDto {
    if (this.#session.globalEnableInProgress?.operationId !== operationId) {
      // The operation was drained or replaced while its admissions ran. It has
      // no authority to activate anything, and the caller reports the conflict
      // its own re-check produces.
      throw new Error('the global enable operation is no longer registered');
    }
    if (this.#session.globalEnableInProgress.kind === 'retry') {
      return this.#settleGlobalRetry(previewId, resolved);
    }
    const controls: GlobalToolControl[] = [];
    const accepted: GlobalMemberId[] = [];
    const rejected: GlobalMemberId[] = [];
    for (const { member, outcome } of resolved) {
      if (outcome.kind === 'admitted') {
        const sourceId = createOpaqueId();
        controls.push(
          GlobalToolControl.admittedControl(member.member, outcome.root, sourceId, member.origin),
        );
        accepted.push(member.member);
        continue;
      }
      controls.push(GlobalToolControl.rejectedControl(member.member, outcome.failureCode));
      rejected.push(member.member);
    }

    const consent = new GlobalConsentRecord(previewId, new Date().toISOString(), controls);
    this.#session.globalConsent = consent;
    this.#session.globalEnableInProgress = null;

    if (accepted.length === 0) {
      // Deterministically all-rejected: consent stays active so the reader can
      // retry or disable, and no job, Source, or generation is created.
      return {
        state: 'active-no-job',
        scanRequestId: null,
        acceptedTools: inMemberOrder(accepted),
        rejectedTools: inMemberOrder(rejected),
      };
    }

    // One request ID for the whole admitted subset: the batch, its
    // `batchStatus`, and the one generation it commits all carry it, which is
    // what keeps an accepted batch correlated even if the response is lost.
    const scanRequestId = createOpaqueId();
    const pendingTools = inMemberOrder(accepted);
    consent.pendingTools = pendingTools;
    consent.batchStatus = {
      scanRequestId,
      tools: pendingTools,
      phase: 'waiting',
      failureRef: null,
    };
    for (const tool of pendingTools) {
      const control = consent.controls.get(tool)!;
      const sourceState = new MutableSourceState(control.sourceId!);
      sourceState.status = 'scanning';
      sourceState.scanRequestId = scanRequestId;
      // The batch runs behind the acceptance as one Global-sequence
      // transaction, so every member starts at the contract's waiting
      // presentation; the batch's own first report moves the phase on
      // (data-model.md § ScanProgress: scanning is never a null progress).
      sourceState.progress = {
        scanRequestId,
        phase: 'waiting',
        queuedAt: new Date().toISOString(),
        startedAt: null,
        visitedEntries: 0,
        candidateFiles: 0,
        readBytes: 0,
        diagnosticCount: 0,
      };
      this.#session.sourceStates.set(control.sourceId!, sourceState);
    }
    return {
      state: 'queued',
      scanRequestId,
      acceptedTools: pendingTools,
      rejectedTools: inMemberOrder(rejected),
    };
  }

  /**
   * The retry disposition over the active consent (contracts/http-api.md
   * § enable-global): each re-resolved member's control is replaced in
   * place — a fresh admission with a new Source ID, or a fresh rejection —
   * while every other control, every published Source, and the consent record
   * itself stay exactly as they were. Zero admitted is `active-no-job` with
   * no new job, Source, or generation; a nonempty admitted subset queues one
   * batch whose commit publishes beside the existing Sources at the
   * sequence's next generation ({@link completeGlobalBatch}).
   */
  #settleGlobalRetry(
    previewId: string,
    resolved: readonly {
      readonly member: GlobalEnableMember;
      readonly outcome: GlobalResolvedOutcome;
    }[],
  ): GlobalEnableResultDto {
    const consent = this.#session.globalConsent;
    if (consent === null || consent.previewId !== previewId) {
      // Reached by no caller: `runGlobalEnable` registers a retry only while
      // this consent is active, and the preview is frozen for as long as it
      // is, so the two IDs cannot diverge. The throw keeps the invariant loud
      // rather than settling a retry against nothing.
      throw new Error('the global retry has no active consent to settle against');
    }
    const accepted: GlobalMemberId[] = [];
    const rejected: GlobalMemberId[] = [];
    for (const { member, outcome } of resolved) {
      const previous = consent.controls.get(member.member);
      if (previous?.sourceId != null && previous.state === 'admitted') {
        // A superseded unpublished admission: its Source ID was never
        // published, so the state allocated for a failed batch goes with it
        // and the fresh admission allocates its own.
        this.#session.sourceStates.delete(previous.sourceId);
      }
      if (outcome.kind === 'admitted') {
        const sourceId = createOpaqueId();
        consent.controls.set(
          member.member,
          GlobalToolControl.admittedControl(member.member, outcome.root, sourceId, member.origin),
        );
        accepted.push(member.member);
        continue;
      }
      consent.controls.set(
        member.member,
        GlobalToolControl.rejectedControl(member.member, outcome.failureCode),
      );
      rejected.push(member.member);
    }
    this.#session.globalEnableInProgress = null;

    if (accepted.length === 0) {
      // Deterministically all-rejected again: the consent and its published
      // Sources stay as they were, and the reader can retry or disable. The
      // previous batch's failed status goes, because an `active-no-job`
      // disposition has null `batchStatus` — the fresh rejections on the
      // controls are the current answer, and a cleared record is what lets
      // the retained error stop describing a batch a retry has superseded
      // (contracts/http-api.md § enable-global).
      consent.batchStatus = null;
      return {
        state: 'active-no-job',
        scanRequestId: null,
        acceptedTools: [],
        rejectedTools: inMemberOrder(rejected),
      };
    }

    const scanRequestId = createOpaqueId();
    const pendingTools = inMemberOrder(accepted);
    consent.pendingTools = pendingTools;
    consent.batchStatus = {
      scanRequestId,
      tools: pendingTools,
      phase: 'waiting',
      failureRef: null,
    };
    for (const tool of pendingTools) {
      const control = consent.controls.get(tool)!;
      const sourceState = new MutableSourceState(control.sourceId!);
      sourceState.status = 'scanning';
      sourceState.scanRequestId = scanRequestId;
      // The batch runs behind the acceptance as one Global-sequence
      // transaction, so every member starts at the contract's waiting
      // presentation; the batch's own first report moves the phase on
      // (data-model.md § ScanProgress: scanning is never a null progress).
      sourceState.progress = {
        scanRequestId,
        phase: 'waiting',
        queuedAt: new Date().toISOString(),
        startedAt: null,
        visitedEntries: 0,
        candidateFiles: 0,
        readBytes: 0,
        diagnosticCount: 0,
      };
      this.#session.sourceStates.set(control.sourceId!, sourceState);
    }
    return {
      state: 'queued',
      scanRequestId,
      acceptedTools: pendingTools,
      rejectedTools: inMemberOrder(rejected),
    };
  }

  /**
   * Re-forms one Global commit's carried-plus-scanned diagnostics into the
   * fixed published member order, keeping each Source's own internal order
   * (stable sort). The carry-forward otherwise appends the rescanned
   * Source's records after every sibling's, so the reading order would come
   * to depend on rescan history — and an opaque Source ID must never supply
   * a visible order (shared/diagnostics.ts § sortDiagnostics). Diagnostics
   * alone, deliberately: the generation's files and recognitions are
   * re-sorted by every surface that renders them, while the diagnostics
   * list is served as committed.
   */
  #diagnosticsInMemberOrder(
    diagnostics: readonly SerializedDiagnostic[],
  ): readonly SerializedDiagnostic[] {
    const rank = new Map<string, number>();
    for (const [sourceId, identity] of this.#session.globalSources) {
      rank.set(sourceId, GLOBAL_MEMBER_ORDER.indexOf(identity.member));
    }
    return diagnostics.toSorted(
      (left, right) => (rank.get(left.sourceId) ?? 0) - (rank.get(right.sourceId) ?? 0),
    );
  }

  /**
   * The published Global data a commit that scanned only `excluded`'s
   * complement carries forward: every other published Source's files,
   * recognitions, and diagnostics, and whether any of those carried Sources
   * remains `partial` (T1012/T1013). One derivation for the enable/retry
   * batch and the explicit single-Source rescan, because both commit the
   * sequence's one next generation and a Source outside the scan must keep
   * its published graph and IDs exactly (FR-014, FR-030).
   */
  #carriedGlobalData(excluded: ReadonlySet<string>): {
    readonly files: readonly CustomizationFileDto[];
    readonly recognitions: readonly ToolRecognition[];
    readonly diagnostics: readonly SerializedDiagnostic[];
    readonly censusEscapedDirectories: readonly { sourceId: string; directory: string }[];
    readonly partial: boolean;
  } {
    const previous = this.#session.committedGlobalGeneration;
    if (previous === null) {
      return {
        files: [],
        recognitions: [],
        diagnostics: [],
        censusEscapedDirectories: [],
        partial: false,
      };
    }
    let partial = false;
    for (const sourceId of this.#session.globalSources.keys()) {
      if (
        !excluded.has(sourceId) &&
        previous.files.some((file) => file.sourceId === sourceId && file.diagnosticIds.length > 0)
      ) {
        // Read from what the carried generation itself committed, never from
        // the mutable overlay: a Source whose rescan failed reads `failed`
        // and one that is rescanning reads `scanning`, so asking the overlay
        // would drop the partial outcome its carried files still carry and
        // commit a `complete` generation holding their diagnostics (FR-028).
        partial = true;
      }
    }
    return {
      files: previous.files.filter((file) => !excluded.has(file.sourceId)),
      recognitions: previous.recognitions.filter(
        (recognition) => !excluded.has(recognition.sourceId),
      ),
      diagnostics: previous.diagnostics.filter((diagnostic) => !excluded.has(diagnostic.sourceId)),
      censusEscapedDirectories: previous.censusEscapedDirectories.filter(
        (entry) => !excluded.has(entry.sourceId),
      ),
      partial,
    };
  }

  /**
   * Commits one Global batch: every admitted member's result published
   * together in exactly one generation (FR-014).
   *
   * One commit rather than one per member, so no poll can observe a partial
   * Global inventory. The generation is 1 when the enable created the sequence
   * and the exact N+1 when a retry commits beside existing Sources.
   */
  public completeGlobalBatch(
    scanRequestId: string,
    results: readonly {
      readonly member: GlobalMemberId;
      readonly files: readonly CustomizationFileDto[];
      readonly recognitions: readonly ToolRecognition[];
      readonly diagnostics: readonly SerializedDiagnostic[];
      readonly outcome: GenerationOutcome;
      /**
       * The member scan's own walk counters, committed as that Source's final
       * `complete` progress exactly as a single-Source commit's are
       * (data-model.md § ScanProgress: a committed ready/partial Source
       * retains its final progress).
       */
      readonly visitedEntries: number;
      readonly candidateFiles: number;
      readonly readBytes: number;
      /** The member scan's escaped census roots (scan.ts § ScanPublication). */
      readonly censusEscapedDirectories: readonly string[];
    }[],
    failures: readonly {
      readonly member: GlobalMemberId;
      readonly failureCode: 'root-unreadable' | 'scan-failed';
    }[] = [],
  ): void {
    // The shutdown revocation covers the batch too: the CLI's close handler
    // (`cli.ts` § requestClose) revokes every publication before closing the
    // host, and a batch still reading at that point must commit nothing, the
    // same rule every revoked attempt follows (data-model.md § ScanAttempt).
    if (this.#allPublicationRevoked || this.#session.globalDisableInProgress !== null) {
      // The disable fence joins the shutdown revocation here: a batch still
      // reading when the barrier was accepted must commit nothing
      // (data-model.md § GlobalDisableOperation).
      return;
    }
    const consent = this.#session.globalConsent;
    if (consent === null || consent.batchStatus?.scanRequestId !== scanRequestId) {
      // The batch was superseded or its consent was removed while it ran; a
      // late result commits nothing (FR-029).
      return;
    }
    const now = new Date().toISOString();

    // A member whose admitted root could not be read after all, or whose own
    // scan failed deterministically. Admission tests readability, so this is
    // not the mode case it once was: what reaches here is a root that changed
    // between admission and the scan — removed, or made unreadable — which is
    // this member's own failure and leaves the others free to commit
    // (FR-014).
    for (const failure of failures) {
      const control = consent.controls.get(failure.member);
      if (control === undefined) {
        continue;
      }
      const rejected = GlobalToolControl.rejectedControl(failure.member, failure.failureCode);
      consent.controls.set(failure.member, rejected);
      const abandoned = control.sourceId;
      if (abandoned !== null) {
        // The Source ID was allocated at admission and never published, so it
        // names nothing: dropping the overlay is what keeps a failed member
        // from leaving a Source behind (data-model.md § GlobalToolControl).
        this.#session.sourceStates.delete(abandoned);
      }
    }

    if (results.length === 0) {
      // Every admitted member failed deterministically: no generation commits,
      // and the batch's terminal status names the members rather than repeating
      // their reasons, each of which is on its own control.
      consent.batchStatus = {
        ...consent.batchStatus,
        phase: 'failed',
        failureRef: {
          kind: 'tool-failures',
          failedTools: inMemberOrder(failures.map((failure) => failure.member)),
        },
      };
      consent.pendingTools = [];
      return;
    }

    const scannedSourceIds: string[] = [];
    // The Source each member committed under, for tagging its per-member
    // publication facts — the escaped census roots — with the ID the
    // generation records them by.
    const memberSourceIds = new Map<GlobalMemberId, string>();
    for (const result of results) {
      const control = consent.controls.get(result.member);
      if (control?.sourceId === undefined || control.sourceId === null) {
        continue;
      }
      scannedSourceIds.push(control.sourceId);
      memberSourceIds.set(result.member, control.sourceId);
      // The batch is this Source's first commit: a later session-API rescan
      // of it is an explicit rescan whose terminal failure leaves the stale
      // overlay ({@link SessionCoordinator.admitScan}).
      this.#hasCommittedBefore.add(control.sourceId);
      control.markPublished();
      this.#session.globalSources.set(control.sourceId, {
        member: result.member,
        boundary: createSourceBoundaryDto(control.root!, control.origin!),
      });
      const overlay = this.#session.sourceStates.get(control.sourceId);
      if (overlay !== undefined) {
        overlay.status = result.outcome === 'partial' ? 'partial' : 'ready';
        // Only the source-scoped records: a file-scoped Diagnostic is listed
        // by its file, and the Source lists what has no file to carry it
        // (data-model.md § Source `diagnosticIds`).
        overlay.diagnosticIds = result.diagnostics
          .filter((diagnostic) => diagnostic.sourceRelativePath === null)
          .map((diagnostic) => diagnostic.diagnosticId);
        // The member's completed counters, exactly as `completeScan` commits
        // them: leaving the admission's zeros would report no work beside a
        // published inventory (contracts/http-api.md § get-session
        // `progress`).
        overlay.progress = {
          scanRequestId,
          // Null through complete (data-model.md § ScanProgress), exactly as
          // the single-Source commit writes it.
          queuedAt: null,
          startedAt: overlay.progress?.startedAt ?? now,
          phase: 'complete',
          visitedEntries: result.visitedEntries,
          candidateFiles: result.candidateFiles,
          readBytes: result.readBytes,
          diagnosticCount: result.diagnostics.length,
        };
      }
    }
    // A retry's batch covers only the retried subset, and a Global commit
    // replaces the sequence's one committed generation — so the members this
    // batch did not scan carry their published files, recognitions, and
    // diagnostics forward into it. Without the carry, a one-member retry
    // would publish a generation holding only that member and turn every
    // other published Source's inventory and details stale (FR-014, FR-030:
    // a commit invalidates views, never another Source's published data).
    const previous = this.#session.committedGlobalGeneration;
    const batchSourceIds = new Set(scannedSourceIds);
    const carried = this.#carriedGlobalData(batchSourceIds);
    const commit = {
      scannedSourceIds,
      scanRequestId,
      startedAt: now,
      finishedAt: now,
      // The batch is partial exactly when any member of the generation is: one
      // generation, one status, and a file-confined outcome anywhere in it —
      // scanned now or carried forward — makes the whole commit partial
      // (FR-028).
      outcome:
        carried.partial || results.some((result) => result.outcome === 'partial')
          ? ('partial' as GenerationOutcome)
          : ('complete' as GenerationOutcome),
      files: [...carried.files, ...results.flatMap((result) => result.files)],
      recognitions: [...carried.recognitions, ...results.flatMap((result) => result.recognitions)],
      diagnostics: this.#diagnosticsInMemberOrder([
        ...carried.diagnostics,
        ...results.flatMap((result) => result.diagnostics),
      ]),
      censusEscapedDirectories: [
        ...carried.censusEscapedDirectories,
        ...results.flatMap((result) =>
          result.censusEscapedDirectories.map((directory) => ({
            sourceId: memberSourceIds.get(result.member) ?? '',
            directory,
          })),
        ),
      ],
    };
    this.#session.committedGlobalGeneration =
      previous === null
        ? createGlobalEnableGeneration(commit)
        : prepareNextGlobalGeneration(previous, commit);
    // The status is removed by the same commit that publishes the Sources: a
    // batch that finished is not a batch anyone is waiting for.
    consent.pendingTools = [];
    consent.batchStatus = null;
  }

  /**
   * Records the terminal failure of one accepted Global batch: the failed
   * request's own error, retained once for the whole consent under the shared
   * request ID (data-model.md § GlobalControlView).
   *
   * No per-tool failure and no `StaleSourceFailure`: the throw was not confined
   * to one tool's files, so attributing it to one would be inventing a cause.
   */
  public failGlobalBatch(scanRequestId: string, message: string): void {
    const consent = this.#session.globalConsent;
    if (consent === null || consent.batchStatus?.scanRequestId !== scanRequestId) {
      return;
    }
    for (const tool of consent.pendingTools) {
      const sourceId = consent.controls.get(tool)?.sourceId;
      if (sourceId !== undefined && sourceId !== null) {
        this.#session.sourceStates.delete(sourceId);
      }
    }
    consent.batchStatus = {
      ...consent.batchStatus,
      phase: 'failed',
      failureRef: { kind: 'error', message },
    };
    consent.pendingTools = [];
  }

  /**
   * The one priority disable barrier entry point (contracts/http-api.md
   * § disable-global; data-model.md § GlobalDisableOperation). Request
   * validation and barrier registration linearize here — the method is
   * synchronous up to starting the cleanup — and the outcome is one of:
   *
   *  - `no-op`: the complete predicate held — no member Global Source or
   *    graph, no active consent or retained admitted root context, no
   *    running or queued Global scan/enable work, and no retained disable
   *    failure — so nothing was mutated: no operation, no epoch increment,
   *    no fence. Unrelated Repository work does not prevent it.
   *  - `pending` with a joined completion: a barrier already draining or
   *    committing shares its operation and terminal result; a retained
   *    `failed` barrier is resumed by a new operation inheriting the exact
   *    `commitKind`, base generations, and already-incremented epoch; and a
   *    first acceptance atomically fixes the disposition, increments the
   *    content epoch, installs the fence, revokes Global authority, cancels
   *    the enable operation and queued Global work, and holds running
   *    Repository work for the one requeue after terminal success.
   *
   * `releaseFrozenPreview` runs inside the terminal success commit's own
   * synchronous block, so the frozen preview and the session state clear as
   * one observable step (data-model.md § GlobalDisableOperation).
   */
  public disposeGlobalDisable(releaseFrozenPreview: () => void):
    | { readonly kind: 'no-op'; readonly result: GlobalDisableResultDto }
    | {
        readonly kind: 'pending';
        readonly operationId: string;
        readonly completion: Promise<GlobalDisableResultDto>;
      } {
    const running = this.#disableOperation;
    if (
      running !== null &&
      (running.status === 'draining' || running.status === 'committing') &&
      this.#disableCompletion !== null
    ) {
      // A join: the same operation, the same terminal result; disconnecting
      // any transport does not cancel the barrier.
      return {
        kind: 'pending',
        operationId: running.operationId,
        completion: this.#disableCompletion,
      };
    }
    if (running !== null && running.status === 'failed') {
      // A retry resumes idempotent cleanup under a new operation that
      // inherits the failed one's exact disposition and the already
      // incremented epoch; the content epoch is not incremented again.
      const retry = new GlobalDisableOperation(
        createOpaqueId(),
        running.commandEpoch,
        running.commitKind,
        running.baseGenerations,
      );
      // The retained error stays the sole one until this retry's own
      // terminal outcome supersedes or clears it; the fence projection
      // returns to `draining`, whose state carries no message.
      this.#disableOperation = retry;
      this.#session.globalDisableInProgress = {
        operationId: retry.operationId,
        state: 'draining',
      };
      const completion = this.#runDisableCleanup(retry, releaseFrozenPreview);
      this.#disableCompletion = completion;
      return { kind: 'pending', operationId: retry.operationId, completion };
    }
    if (this.#isDisableNoOp()) {
      // The ordinary single-stage response gate: nothing existed, nothing is
      // mutated, and the already-purged client may immediately recover a
      // full snapshot because the fence stays null.
      return {
        kind: 'no-op',
        result: {
          state: 'no-op',
          operationId: null,
          commitKind: null,
          repositoryGeneration: this.#session.committedRepositoryGeneration.generation,
        },
      };
    }
    const operation = this.#acceptGlobalDisable();
    const completion = this.#runDisableCleanup(operation, releaseFrozenPreview);
    this.#disableCompletion = completion;
    return { kind: 'pending', operationId: operation.operationId, completion };
  }

  /**
   * Whether a disable request is a true no-op (data-model.md
   * § GlobalDisableOperation): every condition below must be absent, and
   * unrelated Repository work is deliberately not one of them.
   */
  #isDisableNoOp(): boolean {
    if (
      this.#session.globalConsent !== null ||
      this.#session.globalSources.size > 0 ||
      this.#session.committedGlobalGeneration !== null ||
      this.#session.globalEnableInProgress !== null
    ) {
      return false;
    }
    for (const attempt of this.#attempts.values()) {
      if (this.#sequenceOf(attempt.sourceId) === 'global') {
        return false;
      }
    }
    // A retained disable failure keeps the fence closed, so it is never a
    // no-op; a completed barrier no longer holds anything to clean.
    return this.#disableOperation === null || this.#disableOperation.status === 'complete';
  }

  /**
   * The atomic first acceptance (data-model.md § GlobalDisableOperation):
   * fixes the disposition, increments the content epoch, installs the fence,
   * marks the control `disabling` with its batch cleared, cancels the enable
   * operation, revokes Global publication authority, sweeps queued Global
   * commands, and holds Repository commands for the post-success requeue.
   * Synchronous end to end, so no continuation can observe a half-accepted
   * barrier.
   */
  #acceptGlobalDisable(): GlobalDisableOperation {
    const session = this.#session;
    // `remove-active-state` exactly when public Global consent/control/Source
    // state exists; `cleanup-only` only cancels an operation-local initial
    // enable that published none of it.
    const commitKind: GlobalDisableCommitKind =
      session.globalConsent !== null || session.globalSources.size > 0
        ? 'remove-active-state'
        : 'cleanup-only';
    session.globalContentEpoch += 1;
    const operation = new GlobalDisableOperation(
      createOpaqueId(),
      session.globalContentEpoch,
      commitKind,
      {
        repository: session.committedRepositoryGeneration.generation,
        global: session.committedGlobalGeneration?.generation ?? null,
      },
    );
    this.#disableOperation = operation;
    session.globalDisableInProgress = {
      operationId: operation.operationId,
      state: 'draining',
    };
    const consent = session.globalConsent;
    if (consent !== null) {
      consent.disabling = true;
      consent.pendingTools = [];
      consent.batchStatus = null;
    }
    // The registered enable operation is cancelled outright: its projection
    // disappears, and a continuation that later reaches `settleGlobalEnable`
    // finds its operation unregistered and stops (expected cancellation, no
    // Diagnostic, no retained error).
    session.globalEnableInProgress = null;
    for (const attempt of this.#attempts.values()) {
      if (this.#sequenceOf(attempt.sourceId) === 'global') {
        if (this.#pendingJobs.has(attempt.scanRequestId)) {
          // Queued and never dequeued: the final queued-Global-work
          // cancellation sweep removes it now — expected cancellation, so
          // its overlay reverts and nothing is retained.
          this.#pendingJobs.delete(attempt.scanRequestId);
          this.#attempts.delete(attempt.scanRequestId);
          const sourceState = session.sourceStates.get(attempt.sourceId);
          if (sourceState !== undefined) {
            sourceState.status = attempt.priorOverlay.status;
            sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
            sourceState.progress = attempt.priorOverlay.progress;
          }
        } else {
          // Already running: authority is revoked and the drain waits for
          // its settlement, whose late result the commit gates discard.
          attempt.publicationAuthority = 'revoked';
        }
      } else {
        // A Repository command is not cancelled — it is held for exactly one
        // requeue after terminal success, preserving its admitted identity.
        const job = this.#pendingJobs.get(attempt.scanRequestId);
        if (job !== undefined) {
          this.#heldRepository.push({
            sourceId: attempt.sourceId,
            scanRequestId: attempt.scanRequestId,
            triggerOwner: attempt.triggerOwner,
            explicit: attempt.explicit,
            job,
          });
          if (!this.#isWaiting(attempt)) {
            // Running: revoke so its terminal outcome discards; the discard
            // then restores the waiting overlay through
            // {@link #restoreHeldWaiting}. A queued command keeps its
            // waiting overlay and its attempt as they stand — the fence in
            // {@link runInSequence} refuses its dequeue.
            attempt.publicationAuthority = 'revoked';
          }
        }
      }
    }
    return operation;
  }

  /** Whether an attempt is still queued — its overlay shows the waiting phase. */
  #isWaiting(attempt: AttemptState): boolean {
    const sourceState = this.#session.sourceStates.get(attempt.sourceId);
    return (
      sourceState?.progress?.scanRequestId === attempt.scanRequestId &&
      sourceState.progress.phase === 'waiting'
    );
  }

  /**
   * Returns one held Repository command to its waiting overlay after its
   * running execution's late result was discarded, so the fence shows the
   * held command as queued — which it is — rather than as the pre-admission
   * state the discard restored (contracts/http-api.md § disable-global
   * "returning the existing command to waiting"). Recreates the attempt
   * entry under the same request ID: the identity is preserved and no new
   * admission is allocated.
   */
  #restoreHeldWaiting(scanRequestId: string): void {
    if (this.#allPublicationRevoked) {
      // The shutdown revocation ({@link revokeAllPublicationAuthority}) ends
      // every future: recreating an active attempt here would hand the
      // requeue a command that commits after "a result arriving afterwards
      // must commit nothing". The overlay stays at the revoked reversion.
      return;
    }
    const held = this.#heldRepository.find((entry) => entry.scanRequestId === scanRequestId);
    if (held === undefined) {
      return;
    }
    const sourceState = this.#session.sourceStates.get(held.sourceId);
    if (sourceState === undefined) {
      return;
    }
    this.#attempts.set(
      scanRequestId,
      new AttemptState(scanRequestId, held.sourceId, held.triggerOwner, held.explicit, sourceState),
    );
    sourceState.status = 'scanning';
    sourceState.scanRequestId = scanRequestId;
    sourceState.progress = {
      scanRequestId,
      phase: 'waiting',
      queuedAt: new Date().toISOString(),
      startedAt: null,
      visitedEntries: 0,
      candidateFiles: 0,
      readBytes: 0,
      diagnosticCount: 0,
    };
  }

  /**
   * Drains the affected in-flight work and performs the one atomic terminal
   * commit (data-model.md § GlobalDisableOperation). The drain performs no
   * filesystem I/O of its own — it waits for the already-running work whose
   * authority the acceptance revoked, discarding each late result through
   * the commit gates — and the commit is a synchronous block, so the frozen
   * preview, the session state, and the fence clear as one observable step.
   * An unexpected failure retains the operation as `failed` with the
   * request's real error, keeps the fence closed, and propagates to the
   * request-owning boundary; nothing it cleaned is re-exposed.
   */
  async #runDisableCleanup(
    operation: GlobalDisableOperation,
    releaseFrozenPreview: () => void,
  ): Promise<GlobalDisableResultDto> {
    const session = this.#session;
    try {
      // Wait for exactly the work the acceptance affected; the fence keeps
      // new work out, so the set only shrinks. Settlement order is the
      // environment's; results were already condemned by the commit gates.
      // The settled rejections are deliberately not re-raised here: the
      // barrier "waits for the affected in-flight work to settle while
      // discarding its late results" (data-model.md § GlobalDisableOperation)
      // — settle, not succeed — and each rejection is a drained job's own
      // failure, already owned and reported by its own boundary: a rescan's
      // failScan overlay, a batch's failed batchStatus, an enable request's
      // ordinary error. Raising one again would fail the barrier over a
      // failure the barrier did not have (contracts/http-api.md
      // § disable-global: expected cancellation retains no error). What the
      // contract's "drain failure" names is this block's own throw — the
      // revalidation and commit steps below — which the catch retains as
      // `failed`.
      await Promise.allSettled([...this.#inFlightWork]);
      operation.status = 'committing';
      session.globalDisableInProgress = {
        operationId: operation.operationId,
        state: 'committing',
      };
      // Revalidation: the barrier commits no generation, so the bases cannot
      // have moved; a mismatch is an internal invariant failure.
      if (
        operation.commandEpoch !== session.globalContentEpoch ||
        operation.baseGenerations.repository !== session.committedRepositoryGeneration.generation ||
        operation.baseGenerations.global !== (session.committedGlobalGeneration?.generation ?? null)
      ) {
        throw new Error('the disable barrier found its acceptance-time state replaced');
      }
      // The one fallible step runs first: everything after it is synchronous
      // map and field clearing that cannot throw, which is what makes the
      // terminal commit atomic — a failure here leaves the whole graph
      // fenced and untouched for the retry, never half-removed.
      releaseFrozenPreview();
      if (operation.commitKind === 'remove-active-state') {
        // The one atomic discard of the whole Global sequence: Sources,
        // consent, controls, stale failures, and the tools' lifecycle
        // diagnostics — while the Repository sequence, its generation, and
        // its IDs stay untouched (FR-042).
        const globalSourceIds = [...session.globalSources.keys()];
        for (const sourceId of globalSourceIds) {
          session.sourceStates.delete(sourceId);
          this.#hasCommittedBefore.delete(sourceId);
          this.#dropLifecycleDiagnosticsFor(sourceId);
        }
        // The accepted batch's unpublished member states go with the graph:
        // queued acceptance allocated one per pending control
        // (`#settleGlobalEnable`), no commit published them — so the
        // published-Source sweep above cannot reach them — and the drain
        // discarded their late completion. Left behind they would hold a
        // ghost `scanning` overlay in the state map for the process's life.
        for (const control of session.globalConsent?.controls.values() ?? []) {
          if (control.sourceId !== null && !session.globalSources.has(control.sourceId)) {
            session.sourceStates.delete(control.sourceId);
          }
        }
        session.staleFailures = clearStaleFailures(session.staleFailures, globalSourceIds);
        session.globalSources.clear();
        session.committedGlobalGeneration = null;
        session.globalConsent = null;
      }
      session.globalDisableInProgress = null;
      operation.status = 'complete';
      this.#disableCompletion = null;
      const result: GlobalDisableResultDto = {
        state: 'disabled',
        operationId: operation.operationId,
        commitKind: operation.commitKind,
        repositoryGeneration: session.committedRepositoryGeneration.generation,
      };
      this.#requeueHeldRepository();
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      operation.status = 'failed';
      operation.retainedMessage = message;
      session.globalDisableInProgress = {
        operationId: operation.operationId,
        state: 'failed',
        message,
      };
      this.#disableCompletion = null;
      throw error;
    }
  }

  /**
   * The one requeue terminal success performs: every held Repository command
   * returns to its sequence chain in its original queue order, under its own
   * request ID and trigger owner, with no new admission and no interim
   * success (contracts/http-api.md § disable-global). The waiting overlay is
   * already in place — the hold kept it, or the discard restored it.
   */
  #requeueHeldRepository(): void {
    const held = this.#heldRepository;
    this.#heldRepository = [];
    if (this.#allPublicationRevoked) {
      // Reached when the CLI's close handler revoked everything while the
      // barrier drained: the process is closing, so there is no session left
      // for the held command to commit into, and running it would start
      // filesystem reads after shutdown.
      return;
    }
    for (const command of held) {
      // The same terminalization the command's original dispatch attached
      // (devframe-app.ts rescan-repository, and the automatic startup scan):
      // the held entry carries only the job, so a requeued run that rejects
      // must be failed here, or the Source would stay `scanning` and refuse
      // every later rescan of its sequence.
      void this.runInSequence(command.sourceId, command.scanRequestId, command.job).catch(
        (error: unknown) => {
          this.failScan(command.scanRequestId, {
            kind: 'error',
            message: error instanceof Error ? error.message : String(error),
          });
        },
      );
    }
  }

  /**
   * Whether the attempt may still publish — what a walk asks before starting
   * another filesystem operation: disable or shutdown "stops new scheduling"
   * (data-model.md § ScanAttempt) without interrupting the one read already
   * in flight (contracts/http-api.md § Concurrency and lifecycle).
   */
  public publicationAuthorityHolds(scanRequestId: string): boolean {
    return (
      !this.#allPublicationRevoked &&
      this.#attempts.get(scanRequestId)?.publicationAuthority === 'active'
    );
  }

  /**
   * The batch counterpart of {@link publicationAuthorityHolds}: the enable
   * batch owns no attempt entry, so its walks ask the accepted batch status
   * and the same shutdown and disable revocations instead.
   */
  public batchAuthorityHolds(scanRequestId: string): boolean {
    return (
      !this.#allPublicationRevoked &&
      this.#session.globalDisableInProgress === null &&
      this.#session.globalConsent?.batchStatus?.scanRequestId === scanRequestId
    );
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
    // The Global enable batch holds no attempt entry, so it is revoked by
    // flag; `completeGlobalBatch` consults it before committing.
    this.#allPublicationRevoked = true;
    // A registered enable operation is cancelled the way the disable barrier
    // cancels one: its admission's stillAuthorized predicate reads this
    // registration (devframe-app.ts § runGlobalEnable), so clearing it stops
    // the next member's probe, and the settle gate then refuses the late
    // resolution — no probe starts and no disposition commits after shutdown
    // ({@link revokeAllPublicationAuthority} "a result arriving afterwards
    // must commit nothing").
    this.#session.globalEnableInProgress = null;
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
   * Records one batch member's in-flight walk counters on that member's own
   * Source overlay (contracts/http-api.md § get-session `progress`). The
   * batch owns no attempt, so this is the batch counterpart of
   * {@link reportProgress}: it verifies the batch is still the accepted one
   * and the overlay still belongs to it, and the first report stamps
   * `startedAt` — the batch dequeues from the Global FIFO, so its start is
   * the first report rather than the admission.
   */
  public reportBatchMemberProgress(
    scanRequestId: string,
    sourceId: string,
    update: {
      readonly phase: ScanProgressPhase;
      readonly visitedEntries: number;
      readonly candidateFiles: number;
      readonly readBytes: number;
      readonly diagnosticCount: number;
    },
  ): void {
    if (this.#session.globalConsent?.batchStatus?.scanRequestId !== scanRequestId) {
      // A superseded or disabled batch reports nothing: the overlay either
      // belongs to a newer batch or is gone (FR-029).
      return;
    }
    const sourceState = this.#session.sourceStates.get(sourceId);
    if (sourceState?.progress?.scanRequestId !== scanRequestId) {
      return;
    }
    sourceState.progress = {
      ...sourceState.progress,
      // The first report is where a queued batch member's work begins, so
      // `queuedAt` clears here (data-model.md § ScanProgress).
      queuedAt: null,
      startedAt: sourceState.progress.startedAt ?? new Date().toISOString(),
      phase: update.phase,
      visitedEntries: update.visitedEntries,
      candidateFiles: update.candidateFiles,
      readBytes: update.readBytes,
      diagnosticCount: update.diagnosticCount,
    };
    // The batch phase follows the running member's report through the shared
    // pipeline stages (data-model.md § GlobalControlView): the members run in
    // sequence, so what the one running member is doing is what the batch is
    // doing. The member-only phases — a queued `waiting`, a barrier's
    // `cancelling`, a commit's `complete` — leave the batch phase where its
    // own lifecycle put it.
    const consent = this.#session.globalConsent;
    if (
      consent?.batchStatus !== null &&
      consent !== null &&
      (update.phase === 'deriving' ||
        update.phase === 'enumerating' ||
        update.phase === 'reading' ||
        update.phase === 'recognizing')
    ) {
      consent.batchStatus = { ...consent.batchStatus, phase: update.phase };
    }
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
      /** The attempt's diagnostics, already serialized for the DTO. */
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
      /** The attempt's escaped census roots (scan.ts § ScanPublication). */
      readonly censusEscapedDirectories: readonly string[];
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
    if (
      attempt.publicationAuthority === 'revoked' ||
      this.#session.globalDisableInProgress !== null
    ) {
      // Cleanup-only: the late result is discarded, public generation state
      // is untouched, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}). That
      // includes `scanRequestId`, which becomes null again when the revoked
      // attempt was the Source's first: a Source whose every admission was
      // revoked states no request rather than one whose result was thrown
      // away (data-model.md § Source `scanRequestId`). The disable fence
      // takes the same path — no scan may commit while the barrier is
      // non-complete — and a held Repository command then returns to its
      // waiting overlay (§ disable-global "held for one requeue").
      this.#attempts.delete(scanRequestId);
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      this.#restoreHeldWaiting(scanRequestId);
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
    if (this.#session.globalSources.has(attempt.sourceId)) {
      // A published member Global Source: the commit is the Global sequence's
      // exact next generation, built at commit time from the then-current one
      // — the dequeue-time base — so a scan that ran behind another Source's
      // commit carries that commit's data rather than the state it was
      // admitted against (contracts/http-api.md § rescan-global). Every other
      // published Source's graph and IDs ride forward untouched, and the
      // Repository sequence is not read or written (FR-014, FR-030).
      const previous = this.#session.committedGlobalGeneration;
      if (previous === null) {
        // Reached by no caller: a Source is in `globalSources` exactly from
        // the batch commit that created the sequence, and disable discards
        // both together after revoking every attempt's authority — a revoked
        // attempt returned above. The throw keeps the invariant loud rather
        // than inventing a first generation for a rescan.
        throw new Error('a published Global Source has no committed Global generation');
      }
      const carried = this.#carriedGlobalData(new Set([attempt.sourceId]));
      this.#session.committedGlobalGeneration = prepareNextGlobalGeneration(previous, {
        scannedSourceIds: [attempt.sourceId],
        scanRequestId,
        startedAt: sourceState.progress?.startedAt ?? now,
        finishedAt: now,
        // One generation, one status: a file-confined outcome anywhere in it —
        // rescanned now or carried forward — makes the whole commit partial
        // (FR-028).
        outcome: carried.partial || result.outcome === 'partial' ? 'partial' : 'complete',
        files: [...carried.files, ...result.files],
        recognitions: [...carried.recognitions, ...result.recognitions],
        diagnostics: this.#diagnosticsInMemberOrder([
          ...carried.diagnostics,
          ...result.diagnostics,
        ]),
        censusEscapedDirectories: [
          ...carried.censusEscapedDirectories,
          ...result.censusEscapedDirectories.map((directory) => ({
            sourceId: attempt.sourceId,
            directory,
          })),
        ],
      });
    } else {
      this.#session.committedRepositoryGeneration = prepareNextRepositoryGeneration(
        this.#session.committedRepositoryGeneration,
        {
          scannedSourceIds: [attempt.sourceId],
          scanRequestId,
          startedAt: sourceState.progress?.startedAt ?? now,
          finishedAt: now,
          outcome: result.outcome,
          files: result.files,
          recognitions: result.recognitions,
          diagnostics: result.diagnostics,
          censusEscapedDirectories: result.censusEscapedDirectories.map((directory) => ({
            sourceId: attempt.sourceId,
            directory,
          })),
        },
      );
    }
    // Atomic replacement: the generation above committed, so the overlays
    // update now. The stale entry — and any lifecycle Diagnostic it
    // references — is cleared only for the Source this commit refreshed;
    // failures for other Sources are carried forward untouched
    // (data-model.md § StaleSourceFailure).
    this.#dropLifecycleDiagnosticsFor(attempt.sourceId);
    this.#session.staleFailures = clearStaleFailures(this.#session.staleFailures, [
      attempt.sourceId,
    ]);
    sourceState.status = result.outcome === 'partial' ? 'partial' : 'ready';
    // The commit replaces the Source's own diagnostic list with this
    // generation's source-scoped records — never accumulated across commits,
    // and never a file-scoped record, which its file lists (data-model.md
    // § Source `diagnosticIds`).
    sourceState.diagnosticIds = result.diagnostics
      .filter((diagnostic) => diagnostic.sourceRelativePath === null)
      .map((diagnostic) => diagnostic.diagnosticId);
    // The completed counters are what the attempt actually did. Leaving them at
    // the zero an admission starts them with would report "0 files" beside a
    // published inventory (contracts/http-api.md § get-session `progress`).
    sourceState.progress = {
      scanRequestId,
      // Null through complete (data-model.md § ScanProgress): the committed
      // final progress keeps the cleared-at-dequeue value.
      queuedAt: null,
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
    if (
      attempt.publicationAuthority === 'revoked' ||
      this.#session.globalDisableInProgress !== null
    ) {
      // Late-result discard: a failure that lands after revocation — or
      // behind the disable fence, which no terminal outcome may cross —
      // publishes nothing, and the Source overlay reverts to the exact
      // pre-admission state (see {@link AttemptState.priorOverlay}); a held
      // Repository command then returns to its waiting overlay.
      sourceState.status = attempt.priorOverlay.status;
      sourceState.scanRequestId = attempt.priorOverlay.scanRequestId;
      sourceState.progress = attempt.priorOverlay.progress;
      this.#restoreHeldWaiting(scanRequestId);
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
        // The retained snapshot the entry explains as stale is the failing
        // Source's own sequence's: the Global generation for a member Global
        // Source, the Repository generation otherwise (FR-030,
        // contracts/http-api.md § rescan-global).
        baseGeneration: this.#session.globalSources.has(attempt.sourceId)
          ? (this.#session.committedGlobalGeneration?.generation ?? 0)
          : this.#session.committedRepositoryGeneration.generation,
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
