// How Gemini CLI's context files are read: what one admitted context file
// governs, and which filenames the repository's own settings make the kind's
// (contracts/vendors/gemini-cli.md § Derived Repository rules).
//
// The context file has no static Repository rule. Gemini CLI documents
// `context.fileName` as the name of the context file or files to load, so a
// configured name stands in for `GEMINI.md` rather than beside it — and a
// static `GEMINI.md` rule next to a derivation that adds names would need a
// second mechanism to withdraw the static plan whenever names are configured.
// One derivation that always yields the plan, default or configured, needs
// neither (specs/002-gemini-cli-support/research.md § 2). The Global context
// file is the exception: the user tier's own `context.fileName` is not
// established to rename it, so `gemini.global.instructions` stays a static
// rule admitting the default name (spec.md § Clarifications).
//
// The bases these units extend are `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// them, and a base declared in either would have to be imported back by the
// other.
import { GeminiCompiledDerivedRule, GeminiCompiledRule } from '../vendor/gemini';
import { ANY_DIRECTORIES, TraversalPlan } from '../registry';
import type {
  CompiledDerivedInstructionRule,
  CompiledStaticInstructionRule,
} from './compiled-rule';
import { escapeGlobLiteral } from './applicability-range';
import { readConfigurationSeed } from './configuration-seed';
import type { ConfigurationReadResult } from '../../traversal';
import { ParsedJsonDocument } from '../../parsers/json';
import { RecognitionExtraction } from '../../parsers/extraction';
import { GEMINI_DERIVED_CONTEXT_FILENAME_RULE } from '../../../../shared/registries/gemini/rules';
import type { DeclaredEntryDto, DeclaredValueDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The default context filename, admitted whenever the repository's settings
 * configure no other (`gemini.behavior.repo.context`). Written here, where the
 * derivation reads it, and nowhere else.
 */
const DEFAULT_CONTEXT_FILENAME = 'GEMINI.md';

/** The seed the derivation reads: the project settings file at the selected root. */
const CONTEXT_FILENAME_SEED_SEGMENTS: readonly string[] = ['.gemini', 'settings.json'];

/**
 * The glob a context file governs, relative to the Repository root, derived
 * from its own path: the root's file governs `**`, and `packages/api/GEMINI.md`
 * governs `packages/api/**` (data-model.md § Inventory unit). No directory is
 * stripped from the tail, because Gemini CLI documents no `.gemini/GEMINI.md`
 * alternative to a file beside it: a context file inside `.gemini/` governs
 * `.gemini/**` like any other directory's would (spec.md FR-005).
 */
function contextRangeOf(sourceRelativePath: string): string {
  const directory = sourceRelativePath.split('/').slice(0, -1);
  return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
}

/**
 * The Gemini CLI static instruction unit: the Global `GEMINI.md` below the
 * consented boundary. Its range is derived from the path exactly as the
 * derived unit derives it — the boundary's own file governs `**`.
 */
export class GeminiCompiledInstructionRule
  extends GeminiCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /** The path-derived range; see {@link contextRangeOf}. */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    return contextRangeOf(sourceRelativePath);
  }

  /** Compiles one Gemini CLI instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI instruction rule`);
    }
  }
}

/**
 * The Gemini CLI context-filename derivation compiled for execution: the
 * vendor half, plus what an instruction derivation targets — one any-depth
 * selector per context filename, and the range each admitted file governs.
 */
export class GeminiCompiledDerivedInstructionRule
  extends GeminiCompiledDerivedRule
  implements CompiledDerivedInstructionRule
{
  /** Narrowed to the one kind this unit derives; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Builds the traversal plan for one configuration-read result: one
   * `[ANY_DIRECTORIES, <name>]` program per context filename, in authored
   * order — the documented just-in-time reach, at the root and at every depth
   * below it — each name as the configuration wrote it, compared to what the
   * walk enumerated (data-model.md § StructuredInspectorMatcher). The plan is
   * per scan attempt, because the names are the attempt's stage-one
   * configuration, and the walk that executes it merges a name that collides
   * with another vendor's static target — a root `GEMINI.md` Copilot also
   * admits, an `AGENTS.md` Codex and Copilot admit — into one candidate with
   * each vendor's provenance, exactly like any two plans admitting one file.
   */
  public planFor(declaredBasenames: readonly string[]): TraversalPlan {
    return TraversalPlan.fromPrograms(
      { kind: 'repository' },
      declaredBasenames.map((basename) => [ANY_DIRECTORIES, basename]),
    );
  }

  /** The path-derived range; see {@link contextRangeOf}. */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    return contextRangeOf(sourceRelativePath);
  }

  /** Compiles the shipped Gemini CLI context derivation, rejecting any other. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} derives a kind this unit cannot answer for`);
    }
  }
}

/**
 * The compiled `gemini.derived.context-filename` unit the configuration-read
 * stage expands: the seed is the repository's own `.gemini/settings.json` read
 * as configuration, and the derived targets are `instructions` candidates at
 * every depth, one plan per context filename, scanned by the same walk as
 * every static candidate.
 */
export const GEMINI_DERIVED_CONTEXT_RULE = new GeminiCompiledDerivedInstructionRule(
  GEMINI_DERIVED_CONTEXT_FILENAME_RULE,
);

/**
 * The non-empty string a declared value is, or null: the grammar
 * `context.fileName` accepts is a non-empty string or a non-empty array of
 * non-empty strings, and only a JSON string qualifies — a number rendered as
 * text is not a filename the vendor documents reading (spec.md FR-004).
 */
function contextFilenameOf(value: DeclaredValueDto): string | null {
  return value.kind === 'scalar' && value.scalarKind === 'string' && value.text !== ''
    ? value.text
    : null;
}

/**
 * The context filenames one settings document configures, in authored order —
 * or null when it configures none: the `context` object is absent or is not a
 * mapping, its `fileName` is absent, or the value is not a non-empty string
 * nor a non-empty array whose every item is one. Every unusable shape is one
 * answer, "configures nothing", so the default stands; none is a parse
 * failure, so none carries a diagnostic (spec.md FR-004; research.md § 2).
 *
 * Throws on a document the format cannot parse; the caller's extraction
 * boundary owns that throw as "configures nothing", because the stage-one read
 * is configuration input only — the same document reaches the carrier's own
 * settings recognition through the seeded walk, and that recognition's
 * extraction is where a parse failure gets its diagnostic (FR-028).
 *
 * Read as the vendor reads it — JSON with comments — through the same
 * `(tool, path)` the carrier's recognitions use, so the configuration and the
 * published document cannot resolve one file two ways.
 */
export function configuredContextFilenamesOf(sourceText: string): readonly string[] | null {
  const { entries } = new ParsedJsonDocument(sourceText, {
    tool: 'gemini',
    sourceRelativePath: CONTEXT_FILENAME_SEED_SEGMENTS.join('/'),
  });
  const context = entries.find((entry) => entry.key === 'context');
  if (context === undefined || context.value.kind !== 'mapping') {
    return null;
  }
  const declared = declaredFileNameIn(context.value.entries);
  if (declared === undefined) {
    return null;
  }
  if (declared.kind === 'scalar') {
    const name = contextFilenameOf(declared);
    return name === null ? null : [name];
  }
  if (declared.kind !== 'sequence' || declared.items.length === 0) {
    return null;
  }
  const names = declared.items.map(contextFilenameOf);
  return names.every((name) => name !== null) ? names : null;
}

/** The `fileName` value of a `context` mapping, or undefined when it declares none. */
function declaredFileNameIn(entries: readonly DeclaredEntryDto[]): DeclaredValueDto | undefined {
  return entries.find((entry) => entry.key === 'fileName')?.value;
}

/**
 * Gemini CLI's configuration-read contribution: reads the root
 * `.gemini/settings.json` — configuration deciding what counts as a context
 * file, before any candidate is scanned — and yields the one plan the walk
 * executes under {@link GEMINI_DERIVED_CONTEXT_RULE}'s identity: the
 * configured names when the carrier declares usable ones, and the default
 * `GEMINI.md` otherwise. Always one plan, because the derivation owns the
 * default: an absent, unreadable, malformed, or invalidly-declaring carrier
 * configures nothing, and configuring nothing is what the default is for.
 *
 * The carrier's own candidacy is `gemini.repo.settings`'s, which is why the
 * read this function performed is returned as a seeded read — the walk
 * classifies the candidate from this same read instead of opening the file a
 * second time, so the context plan and the published carrier can never
 * disagree about one generation's bytes (T282).
 */
export async function readGeminiConfiguredContextPlans(
  root: string,
  continueScan: () => boolean = () => true,
): Promise<ConfigurationReadResult> {
  const seed = await readConfigurationSeed(root, CONTEXT_FILENAME_SEED_SEGMENTS, continueScan);
  const seededReads = seed.seededRead === null ? [] : [seed.seededRead];
  // The extraction boundary is the one sanctioned soft-failure seam: a parse
  // throw becomes the `failed` status here instead of a bare catch, and a
  // failed extraction configures nothing.
  const configured =
    seed.sourceText === null
      ? null
      : (RecognitionExtraction.run(seed.sourceText, configuredContextFilenamesOf).extracted ??
        null);
  return {
    plans: [
      {
        rule: GEMINI_DERIVED_CONTEXT_RULE,
        plan: GEMINI_DERIVED_CONTEXT_RULE.planFor(configured ?? [DEFAULT_CONTEXT_FILENAME]),
      },
    ],
    seededReads,
  };
}
