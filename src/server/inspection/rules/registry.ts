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
import {
  buildEvidenceAssessments,
  type CustomizationKind,
  type DocumentationStatus,
  type EvidenceAssessment,
  type LifecycleQualifier,
  type SupportedTool,
} from '../../../shared/entities';
import type { InspectionRule } from '../../../shared/registries/rule-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';

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
 * `VendorBehaviorStatement`, and what stays unknowable at inspection time is a
 * `ConditionFactKey`; neither grants or removes read authority here
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
   * Today only the traversal suites author plans this way: the shipped
   * catalogs author `StructuredInspectorMatcher` records that compile through
   * `CompiledInspectionRule`, so this entry point is test-facing until a
   * catalog adopts it.
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
 * One shipped rule compiled into the unit a scan submits to the traversal
 * module: the record itself, its graph edges, and the traversal plan its
 * matcher compiles to. The pairing is what lets a discovered candidate carry
 * its admitting rule identity: the traversal reports the plan index that
 * admitted each file, and the caller resolves it here rather than re-matching
 * the public path (FR-019).
 *
 * Abstract on purpose: what every vendor shares is the compilation — the
 * guards below and the plan — while the recognizing product and the vendor's
 * relations catalog belong to a per-vendor subclass such as
 * `CodexCompiledRule`, which fixes `tool` to its own literal and resolves
 * `relations` from its own vendor table. A scan therefore works over this
 * base, and a vendor's recognizer over its own subclass.
 *
 * The constructor is the read-authorizing gate: read authority is assigned by
 * discovery class, and only a candidate class carries it
 * (contracts/inspection-path-allowlist.md § Read authorization and
 * applicability, "Only a `static-candidate` or `bounded-derived-candidate` …
 * may request a read"). A relationship-only or excluded record may still carry
 * a matcher — `InspectionRule` keeps the two fields independent — so without
 * this gate a registry could widen the read allowlist by adding a row that the
 * contract says authorizes nothing. `static-candidate` and not the derived
 * class as well: a derived candidate is seeded from an already-read file
 * rather than walked, so it has no place in a traversal plan. Each guard
 * throws at module load, because a silently absent plan would read as "this
 * repository has no customizations of this rule's kind".
 */
export abstract class CompiledInspectionRule {
  /**
   * The shipped rule record itself, so a consumer never looks one up by ID:
   * everything a recognition needs about the admitting rule — its identity,
   * its documentation state — is reachable from here.
   */
  public readonly rule: InspectionRule;

  /**
   * The rule's graph edges, resolved by the vendor subclass from its own
   * catalog — never supplied by a caller, so no rule can be compiled with
   * another rule's edges.
   */
  public abstract readonly relations: RuleRelations;

  /**
   * The recognizing product. Each vendor subclass declares its own narrower
   * literal, so a mixed list of compiled rules discriminates on this field
   * and a subclass cannot exist for a `shared` record.
   */
  public abstract readonly tool: SupportedTool;

  /**
   * The recognized kind — the rule's own `kind`, assigned below where the
   * guard has already narrowed it; re-deriving the narrow type at every
   * consumer would re-prove what one constructor proved.
   */
  public readonly kind: CustomizationKind;

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
    if (rule.kind === null) {
      throw new TypeError(`rule ${rule.ruleId} admits candidates but names no recognition kind`);
    }
    this.rule = rule;
    // Assigned after the guard, where the control flow has narrowed it.
    this.kind = rule.kind;
    this.plan = new TraversalPlan(rule.matcher);
  }
}

/**
 * Resolves the rules that admitted one discovered candidate from the selector
 * origins the traversal reported. `rules` is the exact list whose plans the
 * scan submitted, so `planIndex` is a direct lookup — no public path is
 * re-matched and no selector text is reinterpreted (FR-019).
 */
export function resolveAdmittingRules(
  rules: readonly CompiledInspectionRule[],
  admissions: readonly SelectorOrigin[],
): CompiledInspectionRule[] {
  return admissions.map((admission) => {
    const rule = rules[admission.planIndex];
    if (rule === undefined) {
      throw new TypeError(`traversal reported an unknown plan index: ${admission.planIndex}`);
    }
    return rule;
  });
}

/**
 * The evidence-bearing fields shared by every registry subject a provenance
 * can cite. Declared structurally so this module — which owns the grammar and
 * the assembler — needs no runtime import of the registry data modules, which
 * author their matchers against the tokens declared above (importing them back
 * would be a module cycle).
 */
export interface EvidenceBearingSubject {
  /** How completely official sources establish this subject's assertion. */
  readonly documentationStatus: DocumentationStatus;
  /** The subject's upstream lifecycle claims; empty never means `stable`. */
  readonly lifecycleQualifiers: readonly LifecycleQualifier[];
}

/**
 * A rule record travelling with its own resolved relations — the pairing a
 * {@link CompiledInspectionRule} carries, named so a consumer that needs only
 * the pairing does not demand a compiled plan it never reads.
 *
 * Deliberately not the rule beside separately supplied subject arrays: the
 * pairing leaves the caller nothing to get wrong — no ID paired with another
 * rule's evidence state, and no array that is empty, extra, or from a
 * different rule than the one being consumed.
 */
export type RuleWithRelations = Pick<CompiledInspectionRule, 'rule' | 'relations'>;

/** Input of {@link assembleRuleEvidenceAssessments}; see {@link RuleWithRelations}. */
export type RuleEvidenceAssemblyInput = RuleWithRelations;

/**
 * The sole `EvidenceAssessment[]` assembler (QR-005, T060/T061): resolves the
 * owning rule plus every referenced behavior and strategy and copies each
 * subject's exact record once.
 *
 * There is nothing to resolve: the caller hands over the subject records
 * themselves, because a relation holds the record rather than its identifier.
 * A reference that points at nothing is therefore unrepresentable, which is
 * why no lookup here tests for `undefined`.
 *
 * The result is deliberately never reduced to a scalar, a worst status, or a
 * qualifier union: a reduction would hide which specific behavior, rule, or
 * strategy carries the weaker documentation state, which is the one thing
 * QR-005 exists to keep visible. Duplicate rejection, the fixed qualifier
 * order, and the fixed subject sort all come from
 * {@link buildEvidenceAssessments}, so there is exactly one implementation of
 * those rules.
 */
export function assembleRuleEvidenceAssessments(
  input: RuleEvidenceAssemblyInput,
): EvidenceAssessment[] {
  const assessments: EvidenceAssessment[] = [
    {
      subjectKind: 'rule',
      subjectId: input.rule.ruleId,
      documentationStatus: input.rule.documentationStatus,
      lifecycleQualifiers: input.rule.lifecycleQualifiers,
    },
  ];
  for (const behavior of input.relations.basedOnBehaviors) {
    assessments.push({
      subjectKind: 'behavior',
      subjectId: behavior.behaviorId,
      documentationStatus: behavior.documentationStatus,
      lifecycleQualifiers: behavior.lifecycleQualifiers,
    });
  }
  for (const strategy of input.relations.explainedByStrategies) {
    assessments.push({
      subjectKind: 'strategy',
      subjectId: strategy.strategyId,
      documentationStatus: strategy.documentationStatus,
      lifecycleQualifiers: strategy.lifecycleQualifiers,
    });
  }
  return buildEvidenceAssessments(assessments);
}
