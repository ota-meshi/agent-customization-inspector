// Custom-agent recognition-metadata comparison (T575; FR-011, FR-012,
// research.md § 7): the comparison separates its facts by what each is a
// fact about. Which tools recognize each compared file — on which surfaces,
// and under which name each identifies the agent — is a recognition fact,
// compared per tool so each recognition stays distinguishable from the
// physical file (US3 scenario 2). The declared metadata is the file's one
// scan-time parse for the kind (FR-028), so it is compared once — a tool is
// not a coordinate of a declaration, and rendering the same file-level fact
// under each recognizing tool would publish one fact as many: each side's
// metadata serializes to one canonical YAML document, the documented agent
// keys leading and every other key sorted, and the two documents are what
// Monaco diffs (research.md § 7, frontmatter-yaml.ts, declaration-order.ts).
// This module is the data half, kept out of the component so the decisions
// are testable without a single-file-component compiler.
//
// The declarations are one of two halves the comparison aligns, and the
// instructions are the other. Both are split out, and no *diff* of the files'
// bytes is mounted, because this kind's locations are written in two formats:
// a Codex agent is TOML and the Markdown products' agents are frontmatter
// documents, so aligning two files byte for byte aligns quoting and
// delimiters instead of the values and the prose.
//
// Each file's complete authored source is still on the page, as its own
// read-only viewer beside the other's, which the route mounts below these two
// halves: a comparison surface must display a readable file exactly as
// written, and an agent file is itself the customization rather than a
// carrier, so it shows its complete source wherever it is shown at all
// (FR-027, FR-007). Those viewers are also the only content when a side's
// extraction failed, which is when the bytes matter most (FR-028).
//
// The agent name is what this kind adds to the skill and instruction models,
// and it is per `(file, tool)` rather than per file: the admitting rule
// answers it, and this kind's products answer differently — Codex and Claude
// Code take the declared `name` while the Copilot surfaces take the
// configuration file's own name (data-model.md § Inventory unit). Two files
// reach one comparison by resolving one name, so a cell restating that name
// is not the row's identity repeated: it is this tool's reading of this file,
// which is the fact a reader opened the pair to see — and the cells are where
// a reader sees one file carrying two products' different answers.
//
// Both sides serialize with the documented agent keys leading, the way the
// skill comparison leads with the documented skill keys: a reader who read
// either file's detail meets the same order here, and a key both files
// declare stays on the same line whichever order the files wrote it in. That
// is the opposite of the prompt comparison's choice, and for the opposite
// reason: a command file's `name` key is ignored by both products that read
// one, while every product that reads an agent file documents its `name`.
//
// A side cell is the definition itself or null. Nothing derived from that
// presence is stored beside it — no recognized flag, no separately held
// surface list — because two states can disagree and one cannot
// (AGENTS.md § Implementation simplicity policy): what a cell holds is one
// tool's definition of one file, and its absence is the whole of "this tool
// does not read this file".
//
// The comparison is literal and descriptive by construction (FR-012): it
// states which recognitions exist, what each rests on, what each names the
// agent, and what each side's metadata serializes to. Its closed shape
// carries no rank, no winner, and no fabricated rows — a declared
// `mcp_servers`, `mcpServers`, or `mcp-servers` block above all, which is an
// ordinary declared entry of the document being diffed and owns no MCP row
// anywhere (data-model.md § Inventory unit). Codex's documented carrier
// inheritance stays where every runtime composition stays: in the strategy
// registry, projected by no surface (FR-009).
import { canonicalFrontmatterYamlText } from '../inspection/frontmatter-yaml';
import { LEADING_AGENT_METADATA_KEYS } from '../inspection/declaration-order';
import { SUPPORTED_TOOL_ORDER, type SupportedTool } from '../../../shared/entities';
import type {
  AgentDefinitionDto,
  AgentPresentationDto,
  FileDetailDto,
} from '../../../shared/api-types';

/**
 * One definition of a compared file, together with the name of the inventory
 * row it sits under. The pair is what the snapshot holds apart — a row is one
 * name and a definition is one `(file, tool)` — so the page carries them
 * together rather than either alone (api-types.ts § AgentInventoryEntryDto).
 *
 * The name is `null` for the row that closes the list: under a product that
 * identifies an agent by its declared `name`, a file declaring none publishes
 * no name at all, and the cell says that rather than borrowing the path.
 */
export interface CustomAgentSideDefinition {
  /** The name this definition's tool identifies the agent by, or null. */
  readonly agentName: string | null;
  /** The inventory definition itself: the file, its tool, and its surfaces. */
  readonly definition: AgentDefinitionDto;
}

/**
 * One side of the comparison: the file's detail and every definition the
 * committed custom-agent inventory attaches to that file, each with its own
 * row's name. The definitions come from the snapshot the page already holds,
 * because which tools recognize a file — and what each names the agent — is
 * the inventory's fact, not the detail's (api-types.ts § AgentFileDetailDto).
 *
 * Gathered across rows rather than taken from the owning one, because a file
 * two products name differently is a definition on each of those names'
 * rows — which is the ordinary case for a `.claude/agents/*.md` direct child:
 * the pair's own row says why the two files are comparable, and this list
 * says what each tool actually reads the file as.
 */
export interface CustomAgentComparisonSideInput {
  /** The compared file's detail, exactly as adopted. */
  readonly detail: FileDetailDto;
  /** Every definition of this side's file, one per recognizing tool. */
  readonly definitions: readonly CustomAgentSideDefinition[];
}

/**
 * What one side's declared metadata is: the file's one parse for the `agent`
 * kind, or the stated reason no parsed declarations exist to compare. No
 * absent or foreign-kind state exists: the compare route accepts only
 * committed files of this kind.
 */
export type CustomAgentDeclarationSideState =
  /** A detail with a parsed presentation: its declarations serialize into the diff. */
  | 'parsed'
  /**
   * A detail without a parsed presentation: the all-or-nothing extraction
   * failed, so the declarations are unknown, not absent (FR-028), and this
   * side serializes nothing. A Copilot row's name survives it, because that
   * product reads the name from the path rather than from the parse
   * (rules/agents/compiled-rule.ts § CompiledStaticAgentRule.agentNameOf).
   */
  | 'extraction-failed';

/**
 * What a side's declaration state reads as after its "First file"/"Second
 * file" label, beside its union so a new member cannot compile without its
 * sentence (AGENTS.md § User-visible copy policy). 'parsed' yields no
 * sentence: the serialized diff is a parsed side's statement.
 */
export const CUSTOM_AGENT_DECLARATION_SIDE_STATE_TEXT: Readonly<
  Record<CustomAgentDeclarationSideState, string>
> = {
  /** The serialized diff is this side's statement; no sentence stands in for it. */
  parsed: '',
  /** The declarations are unknown, not absent (FR-028). */
  'extraction-failed':
    'is recognized, but its declarations could not be parsed, so they are unknown.',
};

/**
 * One tool's recognition compared across the two files: a row of the tool
 * recognition table, in the contracted tool order, so each recognition
 * remains distinguishable from the physical file (US3 scenario 2).
 *
 * A class whose constructor derives both side cells (AGENTS.md § Class and
 * interface policy): the constructor is the one place that says how the row's
 * data came to be.
 */
export class CustomAgentToolRecognitionRow {
  /** The tool whose recognition this row compares. */
  public readonly tool: SupportedTool;

  /** The recognized kind; every recognition this surface compares is this kind's. */
  public readonly kind: 'agent';

  /**
   * This tool's definition of the first file, or null when the tool attaches
   * none. The definition carries both typed facts the cell states — the
   * surfaces the admissions rest on, and the name this tool identifies the
   * agent by — and its absence is the whole of "not recognized", so no state
   * flag stands beside it. Naming a surface is never a claim that the surface
   * loaded the file, and stating a name is never a claim that a spawn would
   * select it (FR-009).
   */
  public readonly left: CustomAgentSideDefinition | null;

  /** This tool's definition of the second file; see {@link left}. */
  public readonly right: CustomAgentSideDefinition | null;

  /** Derives one tool's two side cells from the compared sides. */
  public constructor(
    tool: SupportedTool,
    left: CustomAgentComparisonSideInput,
    right: CustomAgentComparisonSideInput,
  ) {
    this.tool = tool;
    this.kind = 'agent';
    this.left = definitionOf(left, tool);
    this.right = definitionOf(right, tool);
  }
}

/**
 * The recognition-metadata comparison of one custom-agent pair (FR-011): the
 * per-tool recognition rows, each side's declaration state, and the canonical
 * serialized document each side's parse becomes — built once for the pair,
 * because the declarations are the files' rather than any recognition's.
 *
 * A class whose constructor derives the whole comparison from the two sides
 * (AGENTS.md § Class and interface policy).
 */
export class CustomAgentRecognitionComparison {
  /**
   * One row per tool recognizing either side, in the contracted tool order
   * rather than any preference (US3 scenario 2). Empty exactly when no
   * compared file carries a definition — then there is no recognition
   * metadata to compare, and none is fabricated.
   */
  public readonly tools: readonly CustomAgentToolRecognitionRow[];

  /** What the first file's declared metadata is; see {@link CustomAgentDeclarationSideState}. */
  public readonly leftDeclarations: CustomAgentDeclarationSideState;

  /** What the second file's declared metadata is; see {@link CustomAgentDeclarationSideState}. */
  public readonly rightDeclarations: CustomAgentDeclarationSideState;

  /**
   * The two canonical YAML documents the metadata diff mounts — the
   * documented agent keys leading, every other key sorted — or null unless
   * both sides are 'parsed': an unparsed side's declarations are unknown, and
   * nothing may be diffed against them (FR-028).
   *
   * YAML on both sides whichever format the file was written in, because the
   * diff compares the values a product resolved rather than two syntaxes: a
   * Codex agent's TOML and a Claude subagent's frontmatter resolve to the
   * same shape, and each file's own spelling stays in the source comparison
   * beside it (FR-007).
   */
  public readonly metadataDiff: {
    /** The first side's canonical document (frontmatter-yaml.ts). */
    readonly originalText: string;
    /** The second side's canonical document. */
    readonly modifiedText: string;
  } | null;

  /**
   * The two instruction texts the instructions diff mounts, exactly as each
   * file's own rule split them out (FR-007) — or null unless both sides are
   * 'parsed', for the reason {@link metadataDiff} is.
   *
   * Its own diff beside the metadata, and the one the page leads with, because
   * this kind's two locations are written in two formats:
   * a Codex agent's instructions are a TOML triple-quoted string and a
   * Markdown agent's are the body under a frontmatter fence, so diffing the
   * two files' bytes would align quoting and delimiters rather than prose, and
   * this surface mounts no such diff — each file whole is a viewer of its own
   * below instead (FR-027). Split out, both sides are the
   * instructions themselves, which is the comparison a reader opened the pair
   * for — and it is the same split the detail shows, so the comparison and the
   * detail read alike (`pages/agents/[...path].vue`).
   */
  public readonly instructionsDiff: {
    /** The first side's instructions, as its rule resolved them. */
    readonly originalText: string;
    /** The second side's instructions. */
    readonly modifiedText: string;
  } | null;

  /** Derives the pair's recognition rows, declaration states, and diff documents. */
  public constructor(left: CustomAgentComparisonSideInput, right: CustomAgentComparisonSideInput) {
    const tools: CustomAgentToolRecognitionRow[] = [];
    for (const tool of SUPPORTED_TOOL_ORDER) {
      const row = new CustomAgentToolRecognitionRow(tool, left, right);
      // A row exists only where a recognition exists: a tool recognizing
      // neither file builds none.
      if (row.left !== null || row.right !== null) {
        tools.push(row);
      }
    }
    this.tools = tools;
    // Read once per side, so the stated state and the diffed document cannot
    // disagree about whether the file parsed.
    const leftPresentation = presentationOf(left);
    const rightPresentation = presentationOf(right);
    this.leftDeclarations = leftPresentation === null ? 'extraction-failed' : 'parsed';
    this.rightDeclarations = rightPresentation === null ? 'extraction-failed' : 'parsed';
    this.metadataDiff =
      leftPresentation !== null && rightPresentation !== null
        ? {
            originalText: canonicalFrontmatterYamlText(
              leftPresentation.metadata,
              LEADING_AGENT_METADATA_KEYS,
            ),
            modifiedText: canonicalFrontmatterYamlText(
              rightPresentation.metadata,
              LEADING_AGENT_METADATA_KEYS,
            ),
          }
        : null;
    this.instructionsDiff =
      leftPresentation !== null && rightPresentation !== null
        ? {
            originalText: leftPresentation.instructionsText,
            modifiedText: rightPresentation.instructionsText,
          }
        : null;
  }
}

/**
 * One side's agent parse, or null when there is none. The parse is the
 * file's, one per kind (FR-028).
 *
 * Every Markdown-parse variant is accepted beside the agent one and mapped
 * onto the same two halves, exactly as the agent detail route maps them: one
 * file can hold two kinds — a `.claude/agents/CLAUDE.md` is a subagent by its
 * directory and an instruction file by its name, and a `SKILL.md` under a
 * nested `.claude` inside an agents subtree is a subagent and a skill — while
 * `get-file-detail` is addressed by the path alone and answers with the first
 * variant its fixed order reaches, the skill one first (session.ts
 * § fileDetail). A surface that required its own kind would report those
 * parsed files as unparsed. The excluded variants carry no such split: a rule
 * file is published whole, and an unrecognized file has nothing read out of
 * it.
 */
function presentationOf(side: CustomAgentComparisonSideInput): AgentPresentationDto | null {
  const detail = side.detail;
  if (detail.kind === 'rule' || detail.kind === 'settings/config' || detail.kind === 'file') {
    return null;
  }
  if (detail.kind === 'agent') {
    return detail.presentation;
  }
  const presentation = detail.presentation;
  return presentation === null
    ? null
    : { metadata: presentation.frontmatter, instructionsText: presentation.bodyText };
}

/**
 * One tool's definition of a side's file, or null when it attaches none. A
 * loop rather than `find`, so the returned value is narrowed by the
 * comparison the control flow already made rather than by a callback whose
 * narrowing does not reach here (AGENTS.md § Class and interface policy).
 */
function definitionOf(
  side: CustomAgentComparisonSideInput,
  tool: SupportedTool,
): CustomAgentSideDefinition | null {
  for (const entry of side.definitions) {
    if (entry.definition.tool === tool) {
      return entry;
    }
  }
  return null;
}
