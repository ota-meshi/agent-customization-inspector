// How Codex's instruction files are read: what one admitted instruction file
// governs, and which files a repository's own configuration adds to the kind
// (contracts/vendors/openai-codex.md § Documented Repository behavior).
//
// Codex builds its instruction chain from the project root down to the runtime
// working directory, which this product never selects, so the one instruction
// a Repository scan holds sits at the selected root and governs it entirely.
// Beside that static answer is the one derivation this product performs: the
// root `.codex/config.toml` names further instruction basenames, and each
// declared name becomes an exact Repository-root target of the same walk.
//
// The bases these units extend are `../vendor/codex.ts` rather than
// `../codex.ts`, which holds this vendor's other kinds: both modules extend
// them, and a base declared in either would have to be imported back by the
// other.
import { CodexCompiledDerivedRule, CodexCompiledRule } from '../vendor/codex';
import { TraversalPlan } from '../registry';
import type {
  CompiledDerivedInstructionRule,
  CompiledStaticInstructionRule,
} from './compiled-rule';
import {
  PATH_CONDITION_FAILURE_CODES,
  isVcsInternalPath,
  pathUnderRoot,
  readCandidate,
  rethrowIfResourceExhaustion,
  statThroughLink,
  type ConfigurationReadResult,
  type SeededCandidateRead,
} from '../../traversal';
import { realpath } from '../../fs-io';
import { ParsedTomlDocument } from '../../parsers/toml';
import { RecognitionExtraction } from '../../parsers/extraction';
import { CODEX_DERIVED_FALLBACK_BASENAME_RULE } from '../../../../shared/registries/codex/rules';
import type { InspectionRule } from '../../../../shared/registries/rule-types';
import type { SelectionPolicy } from '../registry';

/**
 * A Codex instruction rule compiled for execution: everything a Codex rule is,
 * plus the one question only an instruction rule answers.
 *
 * Codex builds its instruction chain from the project root down to the runtime
 * working directory and stops there, so a nested `AGENTS.md` belongs to a
 * context this product does not select and is never a candidate: every Codex
 * instruction this inventory holds sits at the selected root and governs the
 * repository entirely (data-model.md § Inventory unit).
 */
export class CodexCompiledInstructionRule
  extends CodexCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /** The Repository root's `**`; every Codex instruction candidate sits there. */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles one Codex instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule, selectionPolicy?: SelectionPolicy) {
    super(rule, selectionPolicy);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex instruction rule`);
    }
  }
}

/**
 * The consented Codex Global instruction rule, compiled with the one
 * content-dependent selection policy this product has
 * (contracts/inspection-path-allowlist.md § Global selector requirements).
 *
 * A separate unit rather than a branch inside its Repository sibling, because
 * the policy is a fact about this rule alone: at the Repository scope both
 * named files are admitted and no winner is projected, while here the vendor's
 * own rule is decided by the bytes of the two files the scan reads anyway, so
 * the plan carries `codex-global-first-non-empty` and at most one file is
 * published.
 *
 * The constructor proves what the policy is only valid for: the exact ordered
 * literal pair below a Global Codex boundary. A record that is not that pair
 * would make the traversal's two-target branch read a target the rule never
 * named, so it fails at module load rather than at scan time.
 */
export class CodexCompiledGlobalInstructionRule extends CodexCompiledInstructionRule {
  /** Compiles the Global pair, rejecting any other record. */
  public constructor(rule: InspectionRule) {
    super(rule, 'codex-global-first-non-empty');
    if (rule.matcher?.base.kind !== 'global') {
      throw new TypeError(`rule ${rule.ruleId} is not anchored at a Global boundary`);
    }
    const targets = rule.matcher.selectors.map((selector) =>
      selector.length === 1 && selector[0]?.kind === 'literal' ? selector[0].value : null,
    );
    if (targets.length !== 2 || targets[0] !== 'AGENTS.override.md' || targets[1] !== 'AGENTS.md') {
      throw new TypeError(
        `rule ${rule.ruleId} does not name the ordered AGENTS.override.md, AGENTS.md pair`,
      );
    }
  }
}

/**
 * The Codex instruction derivation compiled for execution: the vendor half,
 * plus what an instruction derivation targets — one exact Repository-root
 * selector per configured basename, and the applicability range every file it
 * admits governs.
 */
export class CodexCompiledDerivedInstructionRule
  extends CodexCompiledDerivedRule
  implements CompiledDerivedInstructionRule
{
  /** Narrowed to the one kind this unit derives; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Builds the traversal plan for one configuration-read result: one exact
   * Repository-root selector per declared basename, in authored order, each
   * segment the name as the configuration wrote it — a name is compared to
   * what the walk enumerated, so the shipped matchers' ASCII grammar is not
   * this plan's (data-model.md § StructuredInspectorMatcher). The plan is per
   * scan attempt, because the declared names are the attempt's stage-one
   * configuration, and the walk that executes it merges a name that collides
   * with a static target into one candidate with both provenances, exactly
   * like any two plans admitting one file.
   */
  public planFor(declaredBasenames: readonly string[]): TraversalPlan {
    return TraversalPlan.fromPrograms(
      { kind: 'repository' },
      declaredBasenames.map((basename) => [basename]),
    );
  }

  /**
   * The Repository root's `**`: a derived plan is one exact Repository-root
   * selector per declared basename ({@link planFor}), so every candidate it
   * admits sits at the root and governs the repository entirely.
   *
   * Declared here rather than inherited, because a derived rule has no
   * matcher and so cannot be a static instruction unit: this class is the
   * derived half of the instruction unit.
   */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles the shipped Codex instruction derivation, rejecting any other. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} derives a kind this unit cannot answer for`);
    }
  }
}

/**
 * The compiled `codex.derived.fallback-basename` unit the configuration-read
 * stage expands (T1089): the seed is the repository's own `.codex/config.toml`
 * read as configuration, and the derived targets are `instructions` candidates
 * at the Repository root, one per declared basename, scanned by the same walk
 * as every static candidate.
 */
export const CODEX_DERIVED_FALLBACK_RULE = new CodexCompiledDerivedInstructionRule(
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
);

/**
 * Reads one configuration seed for a vendor's configuration-read logic
 * (T1090): probes the exact pinned path, and returns the decoded text of a
 * present, readable seed — through the same single read path as every
 * published file — beside the read it performed, so the scan can seed the
 * walk's classification cache with it and the seed's own candidacy
 * (`codex.repo.config`, T282) reuses this read instead of opening the file
 * again.
 *
 * A seed this reader cannot decode configures nothing, whichever way it fails:
 * absent, unreadable, binary, or a non-regular entry at the pinned path. That
 * is not a claim withheld from the reader, because the seed is a candidate of
 * its own — `.codex/config.toml` is what `codex.repo.config` admits — so the
 * walk probes the same path and publishes whatever it classifies there, and an
 * unreadable one carries `file-unreadable` in a partial generation (FR-028).
 * A read that did happen is seeded, so the walk classifies from this reader's
 * bytes rather than opening the file again.
 */
async function readConfigurationSeed(
  root: string,
  seedSegments: readonly string[],
  continueScan: () => boolean,
): Promise<{
  readonly sourceText: string | null;
  readonly seededRead: SeededCandidateRead | null;
}> {
  // Appended without normalizing (`pathUnderRoot`), like every walk probe and
  // the committed-file launch: `join` would collapse a root's `link/..`
  // lexically while the walk's reads resolve it through the link, so the seed
  // would configure the scan from a different directory's file than the one
  // the walk publishes as `codex.repo.config`.
  const absolutePath = pathUnderRoot(root, seedSegments);
  let target;
  try {
    // Through the link, like every other read (FR-024): a seed reached by a
    // symbolic link is the file it resolves to.
    target = await statThroughLink(absolutePath);
  } catch (error) {
    // Reached by every repository that ships no seed at the path, by one whose
    // seed is a dangling link, and by one whose seed this process may not
    // stat. All three configure nothing, and none of them is a statement this
    // function has to make about the file: the walk admits the same path as a
    // candidate and publishes what it finds there, so a seed that could not be
    // read is reported as that file's own outcome (`codex.repo.config`).
    //
    // Only a failure stating the seed's own condition configures nothing;
    // an environmental `EIO`/`ESTALE` propagates as the attempt's ordinary
    // error (traversal.ts § PATH_CONDITION_FAILURE_CODES), because
    // reporting the machine's moment as "this repository declares nothing"
    // would commit a complete generation missing every configured target —
    // exactly what the resource-exhaustion rethrow already prevents.
    rethrowIfResourceExhaustion(error);
    const code = (error as { code?: string }).code;
    if (code === undefined || !PATH_CONDITION_FAILURE_CODES.has(code)) {
      throw error;
    }
    return { sourceText: null, seededRead: null };
  }
  if (!continueScan()) {
    // Authority left while the stat settled (disable or shutdown): the VCS
    // realpaths and the read below are each their own filesystem promise,
    // and revocation stops every new one (data-model.md § ScanAttempt). A
    // seed that configures nothing is a late result the commit gates
    // discard.
    return { sourceText: null, seededRead: null };
  }
  if (!target.isFile) {
    // A directory, FIFO, socket, or device at the pinned path configures
    // nothing. The type is decided before the read because the one flag-free
    // `readFile` below would block indefinitely on a FIFO — the same gate
    // `probeExactTarget` applies to an exact target, and the walk gets from
    // its directory-entry types.
    return { sourceText: null, seededRead: null };
  }
  try {
    // The walk decides descent on resolved real paths, so a `.codex` entry
    // that is a symbolic link into `.git` never becomes a candidate
    // (`isVcsInternalPath`). Configuration must refuse the same spelling:
    // without this gate, the read that configures the scan would come from
    // the VCS store the walk itself excludes, and the derived plans would
    // rest on bytes no candidate can ever publish.
    //
    // The judged path is the seed's parent directory, exactly the walk's own
    // granularity: descent is what the walk resolves, while a *file* entry
    // that is itself a link is inventoried on its authored location's terms
    // (FR-024, traversal.ts § walkDirectory) — so a `config.toml` that is a
    // link into `.git` is still a candidate the walk publishes, and refusing
    // to read it here would derive nothing from a carrier whose declaration
    // the inventory shows.
    const rootReal = await realpath(root);
    if (!continueScan()) {
      // See the post-stat check above: the parent realpath is its own
      // filesystem promise.
      return { sourceText: null, seededRead: null };
    }
    if (
      isVcsInternalPath(rootReal, await realpath(pathUnderRoot(root, seedSegments.slice(0, -1))))
    ) {
      return { sourceText: null, seededRead: null };
    }
  } catch (error) {
    // The same closed judgement as the stat above: a seed removed between
    // the probe and the resolution configures nothing, while an
    // environmental failure propagates.
    rethrowIfResourceExhaustion(error);
    const code = (error as { code?: string }).code;
    if (code === undefined || !PATH_CONDITION_FAILURE_CODES.has(code)) {
      throw error;
    }
    return { sourceText: null, seededRead: null };
  }
  if (!continueScan()) {
    // See the post-stat check above: the candidate read is its own
    // filesystem promise.
    return { sourceText: null, seededRead: null };
  }
  const outcome = await readCandidate(absolutePath);
  return {
    sourceText: outcome.kind === 'readable' ? outcome.sourceText : null,
    seededRead: { rawSegments: seedSegments, outcome },
  };
}

/**
 * The configured fallback basenames one carrier document declares, in
 * authored order — or null when the field is absent or is not a string array,
 * which both mean the carrier configures nothing. Throws on a document TOML
 * cannot parse; the caller's extraction boundary owns that throw as
 * "configures nothing", because the stage-one read is configuration input
 * only — the same document reaches the carrier's own MCP recognition through
 * the seeded walk, and that recognition's extraction is where a parse
 * failure gets its diagnostic (FR-028).
 *
 * Retention is complete: every declaration is kept, duplicates included, and
 * no Inspector cap or character grammar edits the list
 * (contracts/inspection-path-allowlist.md § Common conformance
 * requirements). A declared value is a name, not a path: the walk compares it
 * to the entry names it enumerated and opens the entry, so a value holding a
 * separator, a dot segment, or a home marker matches nothing rather than
 * reaching anything — there is no escape for a grammar to prevent, and
 * rejecting the declaration would only lose the ordinary names beside it.
 */
export function configuredFallbackBasenamesOf(sourceText: string): readonly string[] | null {
  const declared = new ParsedTomlDocument(sourceText).table['project_doc_fallback_filenames'];
  return Array.isArray(declared) &&
    declared.every((value): value is string => typeof value === 'string')
    ? declared
    : null;
}

/**
 * Codex's configuration-read contribution (T1090): reads the root
 * `.codex/config.toml` — configuration deciding what counts as an
 * instruction file, before any candidate is scanned — and expands the
 * declared fallback basenames into the plan the same walk executes under
 * {@link CODEX_DERIVED_FALLBACK_RULE}'s identity. An absent, unreadable,
 * malformed, or invalidly-declaring carrier configures nothing here; the
 * carrier's own candidacy is `codex.repo.config`'s, which is why the read
 * this function performed is returned as a seeded read — the walk classifies
 * the candidate from this same read instead of opening the file a second
 * time, so the fallback plan and the published carrier can never disagree
 * about one generation's bytes (T282).
 */
export async function readCodexConfiguredFallbackPlans(
  root: string,
  continueScan: () => boolean = () => true,
): Promise<ConfigurationReadResult> {
  const seed = await readConfigurationSeed(root, ['.codex', 'config.toml'], continueScan);
  const seededReads = seed.seededRead === null ? [] : [seed.seededRead];
  if (seed.sourceText === null) {
    return { plans: [], seededReads };
  }
  // The extraction boundary is the one sanctioned soft-failure seam: a parse
  // throw becomes the `failed` status here instead of a bare catch.
  const extraction = RecognitionExtraction.run(seed.sourceText, configuredFallbackBasenamesOf);
  const basenames = extraction.extracted ?? null;
  return {
    plans:
      basenames !== null && basenames.length > 0
        ? [
            {
              rule: CODEX_DERIVED_FALLBACK_RULE,
              plan: CODEX_DERIVED_FALLBACK_RULE.planFor(basenames),
            },
          ]
        : [],
    seededReads,
  };
}
