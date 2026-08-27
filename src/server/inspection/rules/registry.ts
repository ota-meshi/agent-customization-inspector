// Closed matcher and traversal-plan vocabulary for the inspection module
// (data-model.md § StructuredInspectorMatcher, § TraversalPlan,
// contracts/inspection-path-allowlist.md). Selectors are authored directly
// in the immutable typed segment form — a plain string is an exact literal
// segment, a JavaScript RegExp is the dynamic single-name step with its
// standard semantics, and ANY_DIRECTORIES is the structural any-depth
// step — and the contract tables show these authored programs; no selector
// text is ever parsed. The compiler is a pure structure transform into the
// closed TraversalPlan that `traversal.ts` interprets as data; the only
// pattern evaluation at runtime is each regex step's own regular
// expression applied to one enumerated entry name (FR-019). Grammar,
// literal-alphabet, and selection-policy obligations are owned by the
// registry contract gate (the build/contract validator and its tests) and
// are deliberately not re-checked at runtime (AGENTS.md Implementation
// simplicity policy). Per-vendor rule catalogs arrive with their inventory
// phases; this module owns only the shared closed grammar and compilation.
import type {
  CompiledDerivedInstructionRule,
  CompiledStaticInstructionRule,
} from './instructions/compiled-rule';
import type { CompiledStaticPluginRule } from './plugins/compiled-rule';
import type { CompiledStaticMcpRule } from './mcp/compiled-rule';
import type { CompiledStaticHookRule } from './hooks/compiled-rule';
import type { CompiledStaticAgentRule } from './agents/compiled-rule';
import type { CompiledStaticOutputStyleRule } from './output-styles/compiled-rule';
import type { CompiledStaticSkillRule } from './skills/compiled-rule';
import type { CompiledStaticPermissionsRule } from './permissions/compiled-rule';
import type { CompiledStaticPromptRule } from './prompts-and-commands/compiled-rule';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import { VENDOR_SURFACE_ORDER } from '../../../shared/registries/behavior-text';
import type { VendorSurface } from '../../../shared/registries/behavior-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';

// Each kind whose rule answers a question of its own declares that contract in
// its own directory, beside the vendor readings that implement it, and this
// module publishes them: `rules/` is where a recognizer, a session, or a test
// outside it reaches for what a compiled rule is, so nothing outside imports
// `rules/instructions/` or `rules/plugins/` directly.
export type {
  CompiledDerivedInstructionRule,
  CompiledStaticInstructionRule,
} from './instructions/compiled-rule';
export type {
  CompiledStaticPluginCatalogRule,
  CompiledStaticPluginManifestRule,
  CompiledStaticPluginRule,
  PluginCarrierReading,
} from './plugins/compiled-rule';
export type {
  CompiledStaticMcpProvenanceRule,
  CompiledStaticMcpReadingRule,
  CompiledStaticMcpRule,
} from './mcp/compiled-rule';
export type { CompiledStaticHookRule, HookCarrierReading } from './hooks/compiled-rule';
export type {
  CompiledStaticPermissionsCarrierRule,
  CompiledStaticPermissionsDocumentRule,
  CompiledStaticPermissionsRule,
} from './permissions/compiled-rule';
export type { CompiledStaticPromptRule } from './prompts-and-commands/compiled-rule';
export type { CompiledStaticAgentRule } from './agents/compiled-rule';
export type { CompiledStaticOutputStyleRule } from './output-styles/compiled-rule';
export type { CompiledStaticSkillRule } from './skills/compiled-rule';

/**
 * One typed segment of a selector program
 * (data-model.md § StructuredInspectorMatcher):
 *  - 'literal'               matches one case-sensitive exact ASCII segment
 *  - 'regex'                 matches exactly one entry name, decided by a
 *                            JavaScript regular expression with its standard
 *                            `RegExp.prototype.test` semantics on the raw
 *                            name (anchoring and escaping are the pattern
 *                            author's explicit choices; the shipped rule
 *                            fixtures own their correctness); a directory
 *                            step when non-terminal and a regular-file step
 *                            when terminal
 *  - 'recursive-directories' the `**` step; matches zero or more
 *                            directories, never terminal, never adjacent to
 *                            another recursive token
 */
export type MatcherSegment =
  /** One case-sensitive exact literal path segment. */
  | {
      /** One case-sensitive exact ASCII segment. */
      readonly kind: 'literal';
      /** The closed non-empty ASCII literal (no separators or glob chars). */
      readonly value: string;
    }
  /** One raw entry name selected by a JavaScript regular expression. */
  | {
      /** Exactly one entry name, decided by the pattern. */
      readonly kind: 'regex';
      /** Standard JS regular expression tested against the raw entry name. */
      readonly pattern: RegExp;
    }
  /** The recursive `**` step over zero or more directories. */
  | {
      /** The `**` step: zero or more directories. */
      readonly kind: 'recursive-directories';
    };

/**
 * The grammar's matching semantics, colocated with the union so definition
 * and behavior read together: decides whether one enumerated raw entry name
 * satisfies one segment. A literal compares case-sensitively, a regex step
 * applies its pattern with standard `RegExp.prototype.test` semantics
 * (anchoring is the pattern's own spelling, exactly as authored in the rule
 * catalog), and `recursive-directories` never matches a name itself — the
 * walk consumes directories for it through {@link ProgramLevel}.
 */
function segmentMatchesName(segment: MatcherSegment, name: string): boolean {
  switch (segment.kind) {
    case 'literal':
      return name === segment.value;
    case 'regex':
      return segment.pattern.test(name);
    case 'recursive-directories':
      return false;
  }
}

/**
 * Which authored selector admitted a candidate — the provenance the walk
 * threads through every matching position so a discovered file arrives with
 * the identity of the rule that admitted it. Without it, a vendor module
 * would have to re-derive the admitting rule by matching the public path
 * again, which is exactly the selector reinterpretation the contract forbids
 * (contracts/inspection-path-allowlist.md § "Vendor locators are not
 * Inspector matchers"; FR-019).
 */
export interface SelectorOrigin {
  /** Index of the admitting plan within the scan's compiled plan list. */
  readonly planIndex: number;
  /** Index of the admitting selector program within that plan. */
  readonly selectorIndex: number;
}

/** True when two origins name the same authored selector. */
function sameOrigin(left: SelectorOrigin, right: SelectorOrigin): boolean {
  return left.planIndex === right.planIndex && left.selectorIndex === right.selectorIndex;
}

/**
 * Deduplicates and orders origins so a candidate's admissions are stable
 * regardless of enumeration order — two selectors of one plan, or two plans,
 * can legitimately admit the same physical file
 * (contracts/inspection-path-allowlist.md § Rule classes).
 */
export function normalizeSelectorOrigins(origins: readonly SelectorOrigin[]): SelectorOrigin[] {
  const unique: SelectorOrigin[] = [];
  for (const origin of origins) {
    if (!unique.some((existing) => sameOrigin(existing, origin))) {
      unique.push(origin);
    }
  }
  unique.sort((left, right) =>
    left.planIndex !== right.planIndex
      ? left.planIndex - right.planIndex
      : left.selectorIndex - right.selectorIndex,
  );
  return unique;
}

/**
 * One in-flight matching position inside one selector program: the program,
 * the next segment index to consume, and which authored selector it came
 * from. Plain data the walk threads through directory levels.
 */
export interface ProgramState {
  /** The complete closed segment program being matched. */
  readonly program: readonly MatcherSegment[];
  /** The next segment index to consume. */
  readonly position: number;
  /** Which authored selector this position belongs to. */
  readonly origin: SelectorOrigin;
}

/**
 * The grammar queries one directory level answers — the grammar's stepping
 * semantics, owned here beside the segment union so the walk in
 * `traversal.ts` needs no knowledge of segment kinds at all. The walk
 * constructs one per directory and asks the two closed questions per entry.
 */
export class ProgramLevel {
  /** The active states at this level, closed over `**` recursion. */
  readonly #active: readonly ProgramState[];

  /** Closes the incoming states over recursion once, for both queries below. */
  public constructor(states: readonly ProgramState[]) {
    this.#active = ProgramLevel.#closeOverRecursion(states);
  }

  /**
   * `**` matches zero or more directories, so a state whose next token is
   * recursive also activates the state after it at the same level.
   *
   * The identity of a state includes the selector it came from. Two selectors
   * can share one program — a rule spread over another, or two rules authored
   * from one exported matcher — and each is a separate admission the candidate
   * retains, so collapsing them by program and position alone would silently
   * drop one provenance (data-model.md § ToolRecognition).
   */
  static #closeOverRecursion(states: readonly ProgramState[]): ProgramState[] {
    const closed: ProgramState[] = [];
    const queue = [...states];
    while (queue.length > 0) {
      const state = queue.pop()!;
      if (
        closed.some(
          (existing) =>
            existing.program === state.program &&
            existing.position === state.position &&
            existing.origin.planIndex === state.origin.planIndex &&
            existing.origin.selectorIndex === state.origin.selectorIndex,
        )
      ) {
        continue;
      }
      closed.push(state);
      if (state.program[state.position]?.kind === 'recursive-directories') {
        queue.push({ program: state.program, position: state.position + 1, origin: state.origin });
      }
    }
    return closed;
  }

  /**
   * The authored selectors that accept `name` as their terminal regular file,
   * deduplicated and ordered. Empty means no program admits the entry. The
   * walk needs the origins rather than a boolean because each admission is a
   * separate rule provenance the candidate retains.
   */
  public admissionsForFile(name: string): SelectorOrigin[] {
    return normalizeSelectorOrigins(
      this.#active
        .filter((state) => {
          const segment = state.program[state.position];
          return (
            segment !== undefined &&
            state.position === state.program.length - 1 &&
            segmentMatchesName(segment, name)
          );
        })
        .map((state) => state.origin),
    );
  }

  /**
   * The program states that continue matching below directory `name`: the
   * `**` step consumes the directory and keeps matching, and a non-terminal
   * literal or regex step that matches the name advances one position. An
   * empty result means the walk has no reason to enter the directory.
   */
  public statesForDirectory(name: string): ProgramState[] {
    const next: ProgramState[] = [];
    for (const state of this.#active) {
      const segment = state.program[state.position];
      if (segment === undefined) {
        continue;
      }
      if (segment.kind === 'recursive-directories') {
        // The recursive step consumes this directory and keeps matching.
        next.push(state);
      } else if (state.position < state.program.length - 1 && segmentMatchesName(segment, name)) {
        next.push({ program: state.program, position: state.position + 1, origin: state.origin });
      }
    }
    return next;
  }
}

/**
 * The exact Source boundary a matcher is relative to
 * (contracts/inspection-path-allowlist.md § Source boundaries): the one
 * Repository boundary or one named consented tool-specific Global boundary.
 * Never inferred from a selector.
 */
export type MatcherBase =
  /** The one selected Repository boundary. */
  | {
      /** Selects the Repository boundary. */
      readonly kind: 'repository';
    }
  /** One consented tool-specific Global boundary. */
  | {
      /** Selects a Global boundary. */
      readonly kind: 'global';
      /** The supported tool whose Global root owns the matcher. */
      readonly tool: SupportedTool;
    };

/**
 * One static rule's structured matcher: the exact base boundary plus its
 * non-empty ordered selector programs
 * (data-model.md § StructuredInspectorMatcher).
 *
 * These two fields are the complete statement of what the Inspector walks —
 * no other record narrows or widens it. There is deliberately no upward axis.
 * A vendor lookup that walks from a runtime working directory up to the
 * repository root terminates at the selected root, because the selected root
 * *is* that repository root (FR-001); the chain therefore has exactly one
 * in-scope layer and needs no notation. `ANY_DIRECTORIES` remains the one
 * downward axis.
 *
 * What the *vendor* documents about its own lookup lives on its
 * `VendorBehaviorStatement`, and what stays unknowable at inspection time is
 * simply not published; neither grants or removes read authority here
 * (contracts/inspection-path-allowlist.md § "Vendor locators are not
 * Inspector matchers").
 */
export interface StructuredInspectorMatcher {
  /** The one boundary every selector is relative to. */
  readonly base: MatcherBase;
  /** Non-empty ordered unique selector programs, each anchored at {@link base}. */
  readonly selectors: readonly (readonly MatcherSegment[])[];
}

/**
 * Closed scheduler policy (data-model.md § TraversalPlan):
 *  - 'all-matches'                   every selector match is a candidate
 *  - 'codex-global-first-non-empty'  the one content-dependent branch —
 *    valid only for `codex.global.instructions` with the exact ordered
 *    literal targets `AGENTS.override.md`, `AGENTS.md` (FR-035); that
 *    validity is a registry contract-gate obligation
 */
export type SelectionPolicy =
  /** Every selector match is an admitted candidate. */
  | 'all-matches'
  /** The exact Codex Global override/fallback pair selects its first non-empty file. */
  | 'codex-global-first-non-empty';

/**
 * Closed traversal operation class (data-model.md § TraversalPlan):
 *  - 'repository-program'    the complete selector program below the
 *                            Repository root
 *  - 'global-exact'          one exact target file below the admitted tool
 *                            home; the root is never enumerated
 *  - 'global-fixed-subtree'  a fixed literal directory chain plus the
 *                            dynamic program strictly below it
 * There is deliberately no generic ambient-root walker.
 */
export type TraversalSelectorMode =
  /** Execute the complete selector program below the Repository root. */
  | 'repository-program'
  /** Read one exact target below an admitted Global root. */
  | 'global-exact'
  /** Enter a fixed Global subtree before executing the remaining program. */
  | 'global-fixed-subtree';

/**
 * One compiled selector of a TraversalPlan: the closed lossless mapping of
 * one selector program (data-model.md § TraversalPlan).
 */
export class TraversalSelectorPlan {
  /** The closed operation class; see {@link TraversalSelectorMode}. */
  public readonly mode: TraversalSelectorMode;

  /**
   * Exact literal segment array: empty for Repository; for Global the complete
   * path through the exact target or fixed-subtree root, including that
   * terminal target/subtree segment.
   */
  public readonly fixedPrefix: readonly string[];

  /**
   * Repository's complete selector program, empty for a Global exact target,
   * or the complete dynamic program strictly below a Global fixed-subtree
   * root.
   */
  public readonly remainder: readonly MatcherSegment[];

  /**
   * Compiles one selector program into its closed lossless plan
   * (data-model.md § TraversalPlan): the Repository program keeps its
   * complete segments; an all-literal Global program becomes an exact
   * target; otherwise the maximal leading literal directory chain becomes
   * the fixed prefix and the dynamic program below it stays as the
   * remainder.
   */
  public constructor(base: MatcherBase, segments: readonly MatcherSegment[]) {
    if (base.kind === 'repository') {
      this.mode = 'repository-program';
      this.fixedPrefix = [];
      this.remainder = segments;
      return;
    }
    // One pass finds the boundary and collects the prefix: every segment
    // before the first dynamic one is literal by that very definition, so a
    // separate validating map over the slice would guard a case no caller
    // can produce.
    const fixedPrefix: string[] = [];
    let firstDynamic = -1;
    for (const [index, segment] of segments.entries()) {
      if (segment.kind !== 'literal') {
        firstDynamic = index;
        break;
      }
      fixedPrefix.push(segment.value);
    }
    if (firstDynamic === -1) {
      this.mode = 'global-exact';
      this.fixedPrefix = fixedPrefix;
      this.remainder = [];
      return;
    }
    if (firstDynamic === 0) {
      throw new TypeError('a Global selector must fix its subtree root with leading literals');
    }
    this.mode = 'global-fixed-subtree';
    this.fixedPrefix = fixedPrefix;
    this.remainder = segments.slice(firstDynamic);
  }
}

/** The one schema version the runtime loader accepts (data-model.md § TraversalPlan). */
export const TRAVERSAL_PLAN_SCHEMA_VERSION = 1;

/**
 * Immutable shipped traversal data compiled from a matcher: the fixed
 * per-tool inspection-path allowlist the inspection module traverses
 * (FR-003, FR-015 through FR-017).
 */
export class TraversalPlan {
  /** Literal schema version; an unknown version fails registry loading. */
  public readonly schemaVersion: typeof TRAVERSAL_PLAN_SCHEMA_VERSION =
    TRAVERSAL_PLAN_SCHEMA_VERSION;

  /** Copied from the matcher and never inferred from request/display text. */
  public readonly boundary: MatcherBase;

  /** One-to-one canonical compilation of the matcher selectors; non-empty. */
  public readonly selectors: readonly TraversalSelectorPlan[];

  /** The closed scheduler policy; see {@link SelectionPolicy}. */
  public readonly selectionPolicy: SelectionPolicy;

  /**
   * Compiles a matcher into the immutable versioned plan the traversal module
   * interprets (data-model.md § TraversalPlan). This is a pure structure
   * transform: grammar, alphabet, uniqueness, and selection-policy validity
   * are registry contract-gate obligations and are not re-checked here.
   */
  public constructor(
    matcher: StructuredInspectorMatcher,
    selectionPolicy: SelectionPolicy = 'all-matches',
  ) {
    this.boundary = matcher.base;
    this.selectors = matcher.selectors.map(
      (segments) => new TraversalSelectorPlan(matcher.base, segments),
    );
    this.selectionPolicy = selectionPolicy;
  }

  /**
   * Maps one authored segment onto the closed union; grammar and alphabet
   * conformance of the shipped catalogs is owned by the registry contract
   * gate, not re-checked here.
   */
  static #toSegment(input: SelectorSegmentInput): MatcherSegment {
    if (typeof input === 'string') {
      return { kind: 'literal', value: input };
    }
    if (input instanceof RegExp) {
      return { kind: 'regex', pattern: input };
    }
    return input;
  }

  /**
   * Compiles authored typed programs — for example
   * `TraversalPlan.fromPrograms(base, [['.claude', 'skills', ANY_NAME, 'SKILL.md']])`.
   * The shipped catalogs author `StructuredInspectorMatcher` records that
   * compile through `CompiledInspectionRule`; this entry point serves the
   * traversal suites and {@link CompiledDerivedRule.planFor}, whose programs
   * exist only per scan attempt.
   */
  public static fromPrograms(
    base: MatcherBase,
    programs: readonly (readonly SelectorSegmentInput[])[],
    selectionPolicy: SelectionPolicy = 'all-matches',
  ): TraversalPlan {
    return new TraversalPlan(
      { base, selectors: programs.map((program) => program.map(TraversalPlan.#toSegment)) },
      selectionPolicy,
    );
  }
}

/**
 * Authoring token: matches every entry name (the empty pattern `/(?:)/u`
 * matches any string). Reads better than a bare always-true regex in a
 * selector array. Unlike a glob `*`, it also matches names with a leading
 * dot.
 */
export const ANY_NAME: MatcherSegment = { kind: 'regex', pattern: /(?:)/u };

/**
 * Authoring token: matches zero or more directories of any spelling
 * (`recursive-directories`, the `**` step). Never terminal and never
 * adjacent to another ANY_DIRECTORIES.
 */
export const ANY_DIRECTORIES: MatcherSegment = { kind: 'recursive-directories' };

/**
 * Authoring input for one selector segment: a plain string is an exact
 * literal entry name, a RegExp is a dynamic single-name step with standard
 * JS semantics, and ANY_DIRECTORIES is the any-depth step. There is no
 * string syntax to parse — a selector is authored as this array, e.g.
 * `['.claude', 'skills', ANY_NAME, 'SKILL.md']` or `['docs', /\.md$/u]`.
 */
export type SelectorSegmentInput =
  /** A case-sensitive exact literal entry name. */
  | string
  /** A dynamic single-name step with standard JavaScript semantics. */
  | RegExp
  /** A precompiled matcher segment such as {@link ANY_DIRECTORIES}. */
  | MatcherSegment;

/**
 * Runtime loader gate mandated by data-model.md § TraversalPlan: the
 * traversal module interprets only plans of the one known schema version —
 * an unknown version fails loading instead of being partially interpreted.
 */
export function assertLoadableTraversalPlan(plan: TraversalPlan): void {
  if (plan.schemaVersion !== TRAVERSAL_PLAN_SCHEMA_VERSION) {
    throw new TypeError(`unknown traversal-plan schema version: ${String(plan.schemaVersion)}`);
  }
}
/**
 * What every compiled rule shares, whichever candidate class it belongs to:
 * the shipped record itself, the recognizing product, and the recognized
 * kind — the identity a candidate's provenance carries and the recognizer
 * dispatches on. The two candidate classes extend it with what is theirs
 * alone: a static rule's traversal plan and graph edges, a derived rule's
 * per-scan plan construction.
 *
 * The constructor is the shared half of each subclass's authorization gate
 * (contracts/inspection-path-allowlist.md § "Read authorization and
 * applicability"): a candidate class demands a recognition kind, so a record
 * without one fails the build that ships it.
 */
export abstract class CompiledRule {
  /**
   * The shipped rule record itself, so a consumer never looks one up by ID:
   * everything a recognition needs about the admitting rule — its identity,
   * its documentation state — is reachable from here.
   */
  public readonly rule: InspectionRule;

  /**
   * The recognizing product. Each subclass narrows it — a vendor's static
   * subclass to its own literal — so a mixed list of compiled rules
   * discriminates on this field and no unit exists for a `shared` record.
   */
  public abstract readonly tool: SupportedTool;

  /**
   * The recognized kind — the rule's own `kind`, assigned below where the
   * guard has already narrowed it; re-deriving the narrow type at every
   * consumer would re-prove what one constructor proved.
   */
  public readonly kind: CustomizationKind;

  /**
   * The rule's graph edges, resolved by the vendor subclass from its own
   * catalog — never supplied by a caller, so no rule can be compiled with
   * another rule's edges.
   *
   * Declared on the class every candidate compiles to rather than on the
   * static one alone: which documented behavior a policy rests on is a fact
   * about every rule, and a derived rule's edges are keyed in the same
   * registry as a static one's.
   */
  public abstract readonly relations: RuleRelations;

  /**
   * The product surfaces whose documented behavior this rule rests on, in the
   * closed surface order — what a recognition means when it names a surface
   * (contracts/vendors/github-copilot.md § Surface boundary).
   *
   * Derived rather than stored, and derived from the rule's own edges rather
   * than from a field beside them: a behavior statement already names the
   * surfaces it is scoped to, so a second list here could disagree with it.
   * Which surfaces a Copilot instruction rule reaches is therefore decided by
   * which behaviors it is based on — which is why that vendor splits one
   * documented filename into a root-exact and a CLI-context rule instead of
   * tagging one rule with three surfaces it does not uniformly have.
   *
   * Never a claim that a surface loaded the file: an admission is not an
   * activation (FR-009).
   */
  public get recognizingSurfaces(): readonly VendorSurface[] {
    const named = new Set(this.relations.basedOnBehaviors.flatMap((behavior) => behavior.surfaces));
    return VENDOR_SURFACE_ORDER.filter((surface) => named.has(surface));
  }

  /** Holds the record and proves the kind every candidate class demands. */
  protected constructor(rule: InspectionRule) {
    if (rule.kind === null) {
      throw new TypeError(`rule ${rule.ruleId} admits candidates but names no recognition kind`);
    }
    this.rule = rule;
    // Assigned after the guard, where the control flow has narrowed it.
    this.kind = rule.kind;
  }
}

/**
 * One shipped static rule compiled into the unit a scan submits to the
 * traversal module: the record itself, its graph edges, and the traversal
 * plan its matcher compiles to. The pairing is what lets a discovered
 * candidate carry its admitting rule identity: the traversal reports the plan
 * index that admitted each file, and the caller resolves it here rather than
 * re-matching the public path (FR-019).
 *
 * Abstract on purpose: what every vendor shares is the compilation — the
 * guards below and the plan — while the recognizing product and the vendor's
 * relations catalog belong to a per-vendor subclass such as
 * `CodexCompiledRule`, which fixes `tool` to its own literal and resolves
 * `relations` from its own vendor table. A scan therefore works over
 * {@link CompiledRule}, and a vendor's recognizer over its own subclass.
 *
 * The constructor is the read-authorizing gate: read authority is assigned by
 * discovery class, and only a candidate class carries it
 * (contracts/inspection-path-allowlist.md § Read authorization and
 * applicability, "Only a `static-candidate` or `bounded-derived-candidate` …
 * may request a read"). A relationship-only or excluded record may still carry
 * a matcher — `InspectionRule` keeps the two fields independent — so without
 * this gate a registry could widen the read allowlist by adding a row that the
 * contract says authorizes nothing. `static-candidate` and not the derived
 * class as well: this class compiles a shipped matcher into the one plan every
 * scan executes, while a derived rule has no matcher and reaches the same walk
 * through a plan its vendor's configuration reader builds per scan
 * ({@link CompiledDerivedRule}). Each guard throws at module load, because a
 * silently absent plan would read as "this repository has no customizations of
 * this rule's kind".
 */
export abstract class CompiledInspectionRule extends CompiledRule {
  /** The immutable plan compiled from the rule's structured matcher. */
  public readonly plan: TraversalPlan;

  /** Compiles one shipped record, rejecting any that cannot authorize a traversal. */
  protected constructor(rule: InspectionRule) {
    if (rule.discoveryClass !== 'static-candidate') {
      throw new TypeError(
        `rule ${rule.ruleId} is not a static candidate and authorizes no traversal`,
      );
    }
    if (rule.matcher === null) {
      throw new TypeError(`rule ${rule.ruleId} admits candidates but carries no matcher`);
    }
    super(rule);
    this.plan = new TraversalPlan(rule.matcher);
  }
}

/**
 * One shipped `bounded-derived-candidate` rule compiled into the executable
 * unit whose identity a configured plan carries. The {@link CompiledRule}
 * sibling of {@link CompiledInspectionRule} — deliberately a separate
 * subclass, because a derived rule has no matcher of its own and a scan must
 * not be able to submit one to the static walk. How its targets are
 * discovered is ordinary code beside the rule — the vendor's
 * configuration-read logic — composed by the scan exactly like the static
 * catalogs (T1090).
 */
export abstract class CompiledDerivedRule extends CompiledRule {
  /**
   * Compiles one shipped derived record, rejecting any that cannot derive.
   * What the derivation targets, and which product recognizes it, are the
   * subclasses': a derivation's plan is a fact about the kind it derives — one
   * Repository-root selector per configured basename, one manifest below each
   * local plugin root — and a class spanning both would answer for a kind it
   * knows nothing about. The vendor half is a subclass's for the reason a
   * static rule's is: a shared class resolving relations would have to reach
   * the aggregate registry, and that import runs back into this module.
   */
  protected constructor(rule: InspectionRule) {
    if (rule.discoveryClass !== 'bounded-derived-candidate') {
      throw new TypeError(`rule ${rule.ruleId} is not a bounded-derived candidate`);
    }
    super(rule);
  }
}

/**
 * A compiled static rule of every other kind — neither an instruction rule,
 * whose files govern a range, nor a command, skill, or output-style rule,
 * whose files are invoked or selected by a name, nor an MCP or hook carrier
 * rule, whose files declare servers or lifecycle events, nor
 * a custom-agent rule, whose files declare an agent. It answers no per-kind
 * question, which is the whole point: a rule-file rule has no such answer to
 * give — a rule file is published as the one Markdown or Starlark document its
 * author wrote, so nothing is read out of it for a caller to ask about — and
 * neither does a settings or configuration rule, whose file is served whole.
 */
export interface CompiledStaticOtherKindRule extends CompiledInspectionRule {
  /**
   * Every recognized kind but `instructions`, `skill`, `MCP`, `agent`,
   * `prompt/command`, `permissions`, `hook`, `plugin`, and `output style`.
   */
  readonly kind: Exclude<
    CustomizationKind,
    | 'instructions'
    | 'skill'
    | 'MCP'
    | 'agent'
    | 'prompt/command'
    | 'permissions'
    | 'hook'
    | 'plugin'
    | 'output style'
  >;
}

/**
 * What a scan submits to the traversal: a static rule seen through the closed
 * union its `kind` discriminates. Every member carries the plan the walk
 * executes, so a catalog needs no second type beside this one.
 */
export type CompiledStaticCandidateRule =
  | CompiledStaticInstructionRule
  | CompiledStaticSkillRule
  | CompiledStaticMcpRule
  | CompiledStaticAgentRule
  | CompiledStaticPromptRule
  | CompiledStaticPermissionsRule
  | CompiledStaticHookRule
  | CompiledStaticPluginRule
  | CompiledStaticOutputStyleRule
  | CompiledStaticOtherKindRule;

/**
 * What a recognizer receives: any rule that can admit a candidate — a static
 * one or a vendor's derivation — seen through the closed union its `kind`
 * discriminates.
 *
 * A union rather than the {@link CompiledRule} class, so narrowing to the unit
 * that can answer an applicability range is the compiler's own work on
 * `kind` — a type predicate over the class would assert the capability instead
 * of proving it, which is a cast wearing a guard's clothes. Each concrete unit
 * proves its half in its constructor and declares the narrow `kind` its class
 * body promises, so the discriminant cannot disagree with the record.
 */
/**
 * What a scan submits to the traversal from a derivation: the closed union of
 * the shipped derived units, discriminated by `kind` exactly as the static
 * union is.
 */
export type CompiledDerivedCandidateRule = CompiledDerivedInstructionRule;

export type CompiledCandidateRule = CompiledStaticCandidateRule | CompiledDerivedCandidateRule;

/**
 * One derived rule a vendor's configuration-read logic activated for the
 * coming scan (T1090): the compiled identity its candidates carry, and the
 * plan expanding the declarations for the same walk. The shape
 * every vendor's reader returns and the scan composes.
 */
export interface ConfiguredDerivedPlan {
  /** The compiled derived rule the activated plan belongs to. */
  readonly rule: CompiledDerivedCandidateRule;
  /** The plan expanding the declarations, for the same walk. */
  readonly plan: TraversalPlan;
}

/**
 * Resolves the rules that admitted one discovered candidate from the selector
 * origins the traversal reported. `rules` is the exact list whose plans the
 * scan submitted, so `planIndex` is a direct lookup — no public path is
 * re-matched and no selector text is reinterpreted (FR-019).
 */
export function resolveAdmittingRules(
  rules: readonly CompiledCandidateRule[],
  admissions: readonly SelectorOrigin[],
): CompiledCandidateRule[] {
  return admissions.map((admission) => {
    const rule = rules[admission.planIndex];
    if (rule === undefined) {
      throw new TypeError(`traversal reported an unknown plan index: ${admission.planIndex}`);
    }
    return rule;
  });
}
