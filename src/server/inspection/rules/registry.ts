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
  AgentPresentationDto,
  DeclaredEntryDto,
  McpServerDeclarationDto,
  PluginDeclarationDto,
} from '../../../shared/api-types';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import { VENDOR_SURFACE_ORDER } from '../../../shared/registries/behavior-text';
import type { VendorSurface } from '../../../shared/registries/behavior-types';
import { skillDirectoryOf } from '../../../shared/registries/skill-directory';
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
 * The characters a derived applicability range escapes, because a glob reads
 * them as syntax: the wildcards `*` and `?`, the class and brace delimiters,
 * the extended-group parentheses, the leading negation `!`, and the escape
 * character itself (data-model.md § Inventory unit).
 *
 * A directory name is a literal, and a range built by joining literals is a
 * pattern that has to denote exactly those directories: a repository with a
 * `packages/[api]` directory would otherwise publish `packages/[api]/**`,
 * which reads as a character class over `a`, `p`, and `i`. Escaping is not
 * parsing — nothing here interprets a pattern, it only spells one of its own
 * so that the spelling means what the path says.
 */
const GLOB_SYNTAX_CHARACTERS = /[\\*?[\]{}()!]/gu;

/**
 * One literal path segment as a glob that denotes exactly it
 * (data-model.md § Inventory unit). Shared so every product's derived range
 * escapes alike: a range is grouped by exact spelling, so two products
 * spelling one directory differently would be two rows.
 */
export function escapeGlobLiteral(segment: string): string {
  return segment.replace(GLOB_SYNTAX_CHARACTERS, (character) => `\\${character}`);
}

/**
 * A compiled rule that admits *instruction* files, and can therefore answer
 * the glob one of its admitted files governs, relative to the Repository root
 * (data-model.md § Inventory unit) — the identity the instructions inventory
 * groups its rows by.
 *
 * Deliberately not a member of {@link CompiledRule}. That class is what every
 * kind compiles to, and an applicability range is a fact about an instruction
 * file alone: declaring it there would make a skill rule answer a question it
 * has no answer to (AGENTS.md § Class and interface policy). A product whose
 * catalog holds an instruction record compiles that record into a unit
 * implementing this — each shipped product has one.
 *
 * What the answer is belongs to the product: a root-anchored lookup answers
 * the root's `**`, because that is where the Inspector's boundary is (FR-001)
 * and a file admitted there governs the repository entirely, while a product
 * documenting per-directory discovery derives the range from the path.
 *
 * `sourceRelativePath` is raw entry names joined with `/` on every platform
 * ({@link toPublicPath}), so an implementation that reads it splits on `/`
 * rather than on the host separator.
 *
 * `declared` is what the file's frontmatter declares, because some products
 * let a file name its own range — Copilot's `applyTo` — and a declared range
 * is what that file governs however its path reads (spec.md § Clarifications).
 * It is empty for a file that declares nothing and for one whose extraction
 * failed (FR-028).
 *
 * The answer is null exactly when the product reads the filename's range from
 * its declaration alone and the declarations supply none — Copilot's
 * `.instructions.md` without a usable `applyTo`, which its surfaces document
 * as not applied automatically. Deriving a range from such a file's path
 * would state the widest governance for a file the vendor gives none, so the
 * honest answer is that no range is known, and the inventory lists the file
 * under the row that says so (data-model.md § Inventory unit).
 *
 * Never a claim that a product loaded the file: an admission is not an
 * activation (FR-009).
 */
export interface CompiledStaticInstructionRule extends CompiledInspectionRule {
  /** The recognized kind; an instruction unit compiles instruction records alone. */
  readonly kind: 'instructions';
  /** The glob one admitted file governs, or null when it has none; see above. */
  applicabilityRangeOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null;
}

/**
 * A compiled rule that admits a prompt or command file, and can therefore
 * answer the one question only this kind's rule answers — the name a reader
 * invokes it by, which is the kind's inventory unit (data-model.md § Inventory
 * unit).
 *
 * The command sibling of {@link CompiledStaticInstructionRule}, and its own
 * unit for the same reason: how a name follows from a path and a declaration
 * is the admitting vendor's own contract, so a skill or rule-file rule must
 * not be asked for it. The two locations of this kind answer differently — a
 * command file declares no name, because both products that read one ignore a
 * `name` key in it, while a VS Code prompt file declares the name a reader
 * types — which is what makes the derivation the rule's rather than the
 * parser's.
 */
export interface CompiledStaticPromptRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `prompt/command` records alone. */
  readonly kind: 'prompt/command';
  /**
   * The name one admitted file is invoked by, as the admitting product builds
   * it. Empty exactly where that product's own derivation is — a file named
   * `.md` in a command directory has nothing before its extension — because
   * reporting anything else would report a command the product does not have
   * (api-types.ts § PromptInventoryEntryDto).
   *
   * Both inputs, because the products differ on which one answers: Claude Code
   * and the Copilot CLI derive a command's name from the path and read no
   * `name` key at all, while a VS Code prompt file declares its own `name` and
   * uses its file name only when it declares none. A unit that took one input
   * would leave the other vendor's answer unreachable.
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands a prompt on its file name,
   * the same string the vendor's fallback produces for a file that declares
   * none, reached for a different reason. What distinguishes the two is the
   * extraction Diagnostic the recognition carries, which every surface showing
   * the definition shows beside it (FR-028).
   *
   * Never a claim that the file is reachable: a same-name skill outranks a
   * command, a prompt is invoked by hand, and which locations a session
   * searches is runtime this tool never observes (FR-009).
   */
  invocationNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}

/**
 * A compiled rule that admits a `SKILL.md`, and can therefore answer the one
 * question only this kind's rule answers — the name the admitting product
 * invokes the skill by, which is the kind's inventory unit (data-model.md
 * § Inventory unit).
 *
 * The skill sibling of {@link CompiledStaticPromptRule}, and its own unit for
 * the same reason: how a name follows from a path and a declaration is the
 * admitting vendor's own contract, so an instruction or rule-file rule must
 * not be asked for it. The products answer differently — Codex and Copilot
 * invoke the `name` the file declares, while Claude Code derives its command
 * from the skill directory and treats the declared name as a display label —
 * which is what makes the derivation the rule's rather than the parser's.
 */
export interface CompiledStaticSkillRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `skill` records alone. */
  readonly kind: 'skill';
  /**
   * The name one admitted `SKILL.md` is invoked by, as the admitting product
   * builds it. Never empty: a product invoking a file that declares no usable
   * name falls back to the skill directory, and being a named directory is
   * what a skill is (FR-007).
   *
   * Both inputs, because the products differ on which one answers: Codex and
   * Copilot read the declared `name`, while Claude Code reads none at all and
   * derives its command from the path. A unit that took one input would leave
   * the other vendor's answer unreachable.
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands a declared-name product's
   * skill on its skill directory, the same string that product's own fallback
   * produces for a file declaring none, reached for a different reason. What
   * distinguishes the two is the extraction Diagnostic the recognition
   * carries, which every surface showing the definition shows beside it, and
   * which is why such a row is provisional grouping rather than evidence of a
   * same-name collision (FR-028, shared/skill-collision.ts).
   *
   * Never a claim that the skill is reachable: which locations a session
   * searches, and which of two same-name skills it would load, is runtime this
   * tool never observes (FR-009).
   */
  invocationNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}

/**
 * The declared-`name` answer to {@link CompiledStaticSkillRule.invocationNameOf},
 * shared by the two products that document the field as the skill's identity —
 * Codex and Copilot — because their answer is one rule rather than two that
 * happen to agree. Read by the string key and the scalar kind: a sequence
 * under that key has a rendering too, and taking its text would name a skill
 * after the first item of a list the file did not write as a name.
 *
 * Falls back to the skill directory when nothing usable was declared — an
 * absent `name`, an authored empty one, or a failed extraction's empty
 * `declared` — because a directory can name a row where an absent or empty
 * scalar cannot, and a product still invokes such a skill by something
 * (FR-007). Which of those three it was is not collapsed away: the authored
 * declarations are published in full beside the name, and a failed extraction
 * carries its own Diagnostic (FR-028).
 */
export function authoredSkillNameOf(
  sourceRelativePath: string,
  declared: readonly DeclaredEntryDto[],
): string {
  for (const entry of declared) {
    if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
      if (entry.value.text !== '') {
        return entry.value.text;
      }
      break;
    }
  }
  return skillDirectoryOf(sourceRelativePath);
}

/**
 * A compiled rule that admits an output-style file, and can therefore answer
 * the one question only this kind's rule answers — the style name a reader
 * selects it by, which is the kind's inventory unit (data-model.md
 * § Inventory unit).
 *
 * The output-style sibling of {@link CompiledStaticPromptRule}, and its own
 * unit for the same reason: how a name follows from a path and a declaration
 * is the admitting vendor's own contract. Claude Code's is documented as the
 * file name unless the frontmatter sets `name`, which is one product's rule
 * rather than a shape every kind shares.
 */
export interface CompiledStaticOutputStyleRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `output style` records alone. */
  readonly kind: 'output style';
  /**
   * The style name one admitted file is selected by, as the admitting product
   * builds it. Never empty: a file whose frontmatter declares no usable name
   * falls back to its own file name, and being a named Markdown file is what
   * an output style is (FR-007).
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands the style on its file
   * name, the same string the vendor's own fallback produces for a file that
   * declares none, reached for a different reason. What distinguishes the two
   * is the extraction Diagnostic the recognition carries, which every surface
   * showing the definition shows beside it (FR-028).
   *
   * Never a claim that the style is applied: which style a session uses turns
   * on settings, session state, and plugin overrides this tool never observes
   * (FR-009).
   */
  styleNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}

/**
 * A compiled rule that admits an MCP declaration carrier, and can therefore
 * answer which servers one of its admitted files declares — the rows the MCP
 * inventory publishes, one per declaration (data-model.md § Inventory unit).
 *
 * The MCP sibling of {@link CompiledStaticInstructionRule}, and deliberately
 * not a member of {@link CompiledRule}, for the same reason: how declarations
 * are read out of a carrier is the admitting vendor's own contract — Codex's
 * TOML `[mcp_servers.*]` tables, Claude's strict-JSON `mcpServers` map, the
 * Copilot CLI's two strict-JSON schemas, and VS Code's JSONC `servers` map —
 * so a skill or instruction rule must not be asked for it.
 *
 * The extraction produces the wire declaration shape directly
 * ({@link McpServerDeclarationDto}): what the one scan-time parse resolved is
 * what the carrier's detail publishes, so a second internal shape would be a
 * state able to disagree with it (FR-007).
 */
export interface CompiledStaticMcpReadingRule extends CompiledInspectionRule {
  /** The recognized kind; an MCP carrier unit compiles MCP records alone. */
  readonly kind: 'MCP';
  /**
   * Discriminant: this unit owns its vendor's documented reading of an
   * admitted carrier. The recognizer dispatches a group's extraction to the
   * admission that declares this, never to a provenance-only sibling.
   */
  readonly mcpReading: 'own';
  /**
   * The server declarations one admitted carrier's complete decoded text
   * makes, in the parser's resolved order — empty when it declares none, with
   * a declaration that is not a table omitted whole rather than published
   * partially. Throws on text the carrier's format cannot parse; the
   * recognizer's extraction boundary turns the throw into the recognition's
   * `failed` state (FR-028).
   */
  serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[];
}

/**
 * A compiled MCP rule whose admission is path/surface provenance only: the
 * vendor documents the location but not the file's schema, so the rule can
 * put its surfaces on the carrier's recognition while the declarations stay a
 * co-admitting reading rule's own extraction. The shipped member is
 * `copilot.repo.mcp.vscode-root`, whose one exact selector coincides with a
 * `copilot.repo.mcp` selector by construction — a provenance-only admission
 * therefore never stands alone on a candidate
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 *
 * Its own unit rather than an optional reading on the family: a rule that
 * cannot answer which servers a carrier declares must not carry the member
 * that promises to, and the `mcpReading` discriminant is what lets the
 * recognizer prove which admission can answer without a cast.
 */
export interface CompiledStaticMcpProvenanceRule extends CompiledInspectionRule {
  /** The recognized kind; an MCP carrier unit compiles MCP records alone. */
  readonly kind: 'MCP';
  /** Discriminant: no reading — the admission carries provenance alone. */
  readonly mcpReading: 'none';
}

/**
 * A compiled rule that admits an MCP declaration carrier: the closed union of
 * the unit that owns its vendor's reading and the unit whose admission is
 * provenance alone, discriminated by `mcpReading`.
 */
export type CompiledStaticMcpRule = CompiledStaticMcpReadingRule | CompiledStaticMcpProvenanceRule;

/**
 * What one plugin carrier's complete decoded text declares: the plugins it
 * resolves, and the carrier's own fields when the carrier is a catalog.
 *
 * One reading rather than a method per field, because it comes from one parse:
 * two methods over one text would parse it twice and could disagree about what
 * it said. Where each plugin sits is part of it for the same reason — the
 * directory follows from the `source` the same entry wrote, so answering it
 * separately would pair two lists by position and leave nothing to keep the
 * pairing true.
 */
export interface PluginCarrierReading {
  /**
   * The catalog's own declarations — the `name` and `interface` a catalog
   * writes about itself, never its `plugins` array, whose entries are the
   * declarations below. Empty for a manifest, whose own fields are its one
   * declaration's.
   */
  readonly catalogFields: readonly DeclaredEntryDto[];
  /**
   * Every plugin the carrier declares, in the parser's resolved order — the
   * names the inventory rows are named by, the fields the detail publishes by
   * the keys the file wrote, and the directory each one's files occupy
   * (FR-007). Empty when the carrier declares none.
   *
   * The wire declaration shape directly ({@link PluginDeclarationDto}), for the
   * reason the MCP reading gives: what the one scan-time parse resolved is what
   * the carrier's detail publishes, so a second internal shape would be a state
   * able to disagree with it.
   */
  readonly plugins: readonly PluginDeclarationDto[];
}

/**
 * A compiled rule that admits a plugin catalog: the file whose entries resolve
 * plugin names to the sources those plugins come from.
 *
 * What it answers here is what every caller of this kind needs — the plugins
 * the carrier declares, each with the directory its files occupy and the
 * manifest inside it. How a catalog names itself, which of its entries reach a
 * plugin root inside this repository, where that root keeps the plugin's own
 * declaration, and how a name is composed from the parts are that vendor's own
 * questions, answered inside that vendor's own reading.
 */
export interface CompiledStaticPluginCatalogRule extends CompiledInspectionRule {
  /** The recognized kind; a plugin unit compiles plugin records alone. */
  readonly kind: 'plugin';
  /** Discriminant: the admitted file is a catalog listing plugins. */
  readonly pluginCarrier: 'catalog';
  /**
   * What one admitted catalog declares, each entry carrying the Source-relative
   * directory its plugin's files occupy and the manifest this vendor's client
   * reads inside it — trailing slash kept on the directory, both null when the
   * entry's source names no directory here.
   *
   * Paths and nothing else, because that is the part only the admitting vendor
   * knows: which source forms name a directory here, where a plugin root sits
   * relative to the catalog, and which file inside it is the plugin's own
   * declaration are its contract, while enumerating a directory and reading
   * what is in it are the same operations every directory-shaped customization
   * uses. Neither path is probed: a directory this repository does not hold is
   * named all the same — the entry declared it, and the files under it are
   * simply none. Throws on unparsable text, exactly as the manifest unit does
   * (FR-028).
   *
   * The carrier's own path is a parameter the catalog does not read: one call
   * site asks either unit, and a catalog resolves its entries against the
   * marketplace root the rule already fixes.
   */
  pluginCarrierReadingOf(sourceText: string, sourceRelativePath: string): PluginCarrierReading;
}

/**
 * A compiled rule that admits a plugin's own manifest at a path the vendor's
 * client reads it from, where the file's presence is what makes the directory
 * holding it a plugin.
 *
 * Its own unit rather than a mode of the catalog above, because the two answer
 * from different material: a catalog resolves many names out of its `plugins`
 * array, while a manifest declares the one plugin it belongs to and takes its
 * name and its root from where it sits. A unit that cannot answer for many
 * plugins must not carry the member that promises to, so the `pluginCarrier`
 * discriminant is what lets the recognizer prove which one it has.
 *
 * The shipped member is `claude.repo.skills-directory-plugin`: a folder under
 * `.claude/skills/` carrying `.claude-plugin/plugin.json` loads as
 * `<folder>@skills-dir` with no marketplace and no install step
 * (contracts/vendors/claude-code.md § Repository vendor behavior). Codex has no
 * such rule: a Codex plugin root is activated through a catalog or an install,
 * so its manifest is one of the files that plugin ships.
 */
export interface CompiledStaticPluginManifestRule extends CompiledInspectionRule {
  /** The recognized kind; a plugin unit compiles plugin records alone. */
  readonly kind: 'plugin';
  /** Discriminant: the admitted file is one plugin's own manifest. */
  readonly pluginCarrier: 'manifest';
  /**
   * What one admitted manifest declares: the single plugin it belongs to, under
   * the name its vendor resolves that plugin by, with the root it sits in and
   * its own path as that plugin's manifest.
   *
   * The path is a parameter because a manifest names neither: which directory
   * is the plugin root, and how a name follows from it, are the admitting
   * vendor's contract, and the file's own `name` key is one of the fields the
   * detail publishes rather than the row's identity. Throws on unparsable text,
   * exactly as the catalog unit does (FR-028).
   */
  pluginCarrierReadingOf(sourceText: string, sourceRelativePath: string): PluginCarrierReading;
  /**
   * The plugin this file's placement establishes, with nothing read out of the
   * text: the name its vendor resolves the folder by, the root that folder is,
   * and this file as that plugin's own manifest, with no declared fields.
   *
   * What makes the folder a plugin is this file being in it, so none of those
   * three depends on the text parsing. It is what a recognition publishes when
   * the parse failed, the way a skill keeps the name its path resolves when its
   * frontmatter could not be read: the row stays the plugin's, carrying the
   * diagnostic that says its declarations are unknown, where publishing nothing
   * would move the plugin to the row for carriers that resolve no name and take
   * the files below its root off the page with it (FR-028).
   *
   * The catalog unit has no counterpart: every plugin a catalog resolves is one
   * its text declares, so its path establishes none and a failed parse there
   * leaves nothing to keep.
   */
  pluginEstablishedByPath(sourceRelativePath: string): PluginDeclarationDto;
}

/**
 * The Source-relative segments a documented local plugin source names, or null
 * when it names no directory this Source could hold.
 *
 * Shared by every vendor's plugin rule because all three document the same
 * form — a `./`-anchored relative path, resolved against the Source root — and
 * what a directory here can be called is the platform's answer rather than any
 * vendor's. What stays in each vendor's own module is the vendor's part: which
 * key holds the source, which discriminant marks it local, and which other
 * source forms exist.
 *
 * Rejected whole: a path not anchored at `./`; an empty segment, a `.`, or a
 * `..`, none of which is a name the walk could have enumerated and the last of
 * which would leave the root; and a segment carrying a NUL, which no
 * filesystem entry can be named. The NUL is rejected here rather than left to
 * the probe because the platform raises on such a path instead of answering
 * that nothing is there, and one catalog's declaration would then fail the
 * whole scan attempt rather than standing as an offering that occupies nothing
 * (FR-028, FR-029).
 *
 * A trailing slash is an ordinary spelling of a directory, so a trailing empty
 * segment is dropped rather than rejected.
 */
export function localPluginRootSegments(declaredPath: string | null): readonly string[] | null {
  if (declaredPath === null || !declaredPath.startsWith('./')) {
    return null;
  }
  const segments = declaredPath.slice('./'.length).split('/');
  const named = segments.at(-1) === '' ? segments.slice(0, -1) : segments;
  if (
    named.length === 0 ||
    named.some(
      (segment) =>
        segment === '' || segment === '.' || segment === '..' || segment.includes('\u0000'),
    )
  ) {
    return null;
  }
  return named;
}

/**
 * A compiled rule that admits a plugin carrier by path: the catalog whose
 * entries resolve plugin names to their sources, or the manifest whose presence
 * makes the directory holding it a plugin. The recognizer dispatches on
 * `pluginCarrier`, which is what lets each unit be asked only what it can
 * answer.
 */
export type CompiledStaticPluginRule =
  CompiledStaticPluginCatalogRule | CompiledStaticPluginManifestRule;

/**
 * A compiled rule that admits a file declaring a permission policy inside a
 * larger document, and reads the block out of it. Which key holds the policy,
 * and which format the document is, is the admitting vendor's own contract —
 * Claude's strict-JSON `permissions` object — so a rule of another kind must
 * not be asked for it.
 *
 * Its own unit rather than an optional member on the permissions family: a
 * vendor whose whole file is the policy has no block to read, and a unit that
 * cannot answer must not carry the member that promises to. The
 * `permissionsReading` discriminant is what lets the recognizer prove which
 * admission can answer without a cast.
 */
export interface CompiledStaticPermissionsCarrierRule extends CompiledInspectionRule {
  /** The recognized kind; a carrier unit compiles permission-policy records alone. */
  readonly kind: 'permissions';
  /** Discriminant: this unit reads a block out of the document it admits. */
  readonly permissionsReading: 'declared-block';
  /**
   * The entries of the policy block one admitted carrier's complete decoded
   * text declares, in the parser's resolved order, or null when the document
   * declares no such block — which is not an empty policy but no policy at
   * all, and the recognizer publishes no recognition for it. Throws on text
   * the carrier's format cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state (FR-028).
   */
  declaredPolicyOf(sourceText: string): readonly DeclaredEntryDto[] | null;
}

/**
 * A compiled rule whose admitted file is itself the whole permission policy,
 * so nothing is read out of it: a Codex `.codex/rules/*.rules` file is the
 * policy its author wrote, and its detail serves that document.
 */
export interface CompiledStaticPermissionsDocumentRule extends CompiledInspectionRule {
  /** The recognized kind; a permissions unit compiles permission-policy records alone. */
  readonly kind: 'permissions';
  /** Discriminant: no reading — the admitted document is the policy. */
  readonly permissionsReading: 'whole-document';
}

/**
 * A compiled rule that admits a permission policy: the closed union of the
 * unit that reads a declared block and the unit whose file is the policy,
 * discriminated by `permissionsReading`.
 */
export type CompiledStaticPermissionsRule =
  CompiledStaticPermissionsCarrierRule | CompiledStaticPermissionsDocumentRule;

/**
 * A compiled rule that admits a custom-agent definition, and can therefore
 * split one of its admitted files into the two halves the kind's detail shows:
 * the declarations a product reads as configuration, and the instructions it
 * gives the agent (contracts/http-api.md § get-file-detail).
 *
 * The agent sibling of {@link CompiledStaticMcpReadingRule}, and its own unit
 * for the same reason: where that split falls is the admitting vendor's own
 * contract, and the vendors do not agree. A Codex agent is a TOML document
 * whose `developer_instructions` string is the prose and whose remaining
 * top-level keys are the configuration; the products that write an agent as
 * Markdown split at the frontmatter fence, the block being the configuration
 * and the body the prose. One shape for both, because the detail renders them
 * identically — the metadata as YAML, the instructions as Markdown — so a rule
 * of another kind must not be asked for it and neither vendor needs a surface
 * of its own.
 *
 * The agent's own name is a member here, because the vendors answer it
 * differently: Codex and Claude Code document the declared `name` as the
 * agent's identity and a matching filename as convention rather than lookup,
 * while GitHub documents Copilot's `name` as an optional display name and
 * deduplicates agents by the configuration file's own name minus `.md` or
 * `.agent.md`. A recognizer that read the `name` entry for every vendor would
 * name a Copilot agent after a field that product does not identify it by.
 *
 * The reading stops at what the file wrote. Which agent a spawn selects, what
 * a spawned session inherits from its parent, and what an `mcp_servers` key
 * inside the file would mean at runtime are the vendor's documented
 * composition (`codex.agents.inheritance`), recorded in the strategy registry
 * and projected by no surface (FR-009). In particular a declared
 * `mcp_servers` block is this file's own content and makes it no carrier: an
 * MCP declaration's home is an explicit carrier and nothing else
 * (data-model.md § Inventory unit).
 */
export interface CompiledStaticAgentRule extends CompiledInspectionRule {
  /** The recognized kind; an agent unit compiles custom-agent records alone. */
  readonly kind: 'agent';
  /**
   * One admitted agent file's complete decoded text, split into the metadata
   * and the instructions its detail publishes — both in the parser's resolved
   * order and resolution (FR-007), and both empty when the file declares
   * neither. Throws on text the file's format cannot parse; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the file stays an admitted candidate whose complete source is still
   * displayed (FR-028).
   */
  agentPresentationOf(sourceText: string): AgentPresentationDto;
  /**
   * The name the admitting product identifies one admitted agent by — the
   * identity its inventory row is grouped under (data-model.md § Inventory
   * unit) — or `null` when the product identifies agents by a declaration
   * this file does not make.
   *
   * Both inputs, because the products differ on which one answers: Codex and
   * Claude Code identify an agent by its declared `name`, so a file declaring
   * none has no name at all and joins the row that says so; the Copilot
   * surfaces identify one by its configuration file's own name, so the path
   * always answers and `null` never arises there.
   *
   * `declared` is the metadata {@link agentPresentationOf} resolved, empty for
   * a failed extraction — which leaves a declared-name product's row name
   * unknown rather than absent, while a file-name product's row keeps the
   * identity a failed parse cannot take away (FR-028).
   *
   * Never a claim that the agent is reachable: which locations a session
   * searches, whether a profile targets the running surface, and which of two
   * same-name agents a spawn selects are runtime this tool never observes
   * (FR-009).
   */
  agentNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string | null;
}

/**
 * The declared-`name` answer to {@link CompiledStaticAgentRule.agentNameOf},
 * shared by the two products that document the field as the agent's identity —
 * Codex and Claude Code — because their answer is one rule rather than two
 * that happen to agree. Read by the string key and the scalar kind: a sequence
 * under that key has a rendering too, and taking its text would name an agent
 * after the first item of a list the file did not write as a name.
 *
 * `null` rather than the empty string when nothing was declared, so no name at
 * all and an authored empty name stay distinguishable (FR-007).
 */
export function declaredAgentNameOf(declared: readonly DeclaredEntryDto[]): string | null {
  for (const entry of declared) {
    if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
      return entry.value.text;
    }
  }
  return null;
}

/**
 * A compiled static rule of every other kind — neither an instruction rule,
 * whose files govern a range, nor a command, skill, or output-style rule,
 * whose files are invoked or selected by a name, nor an MCP carrier rule, whose files declare servers, nor
 * a custom-agent rule, whose files declare an agent. It answers no per-kind
 * question, which is the whole point: a rule-file rule has no such answer to
 * give — a rule file is published as the one Markdown or Starlark document its
 * author wrote, so nothing is read out of it for a caller to ask about — and
 * neither does a settings or configuration rule, whose file is served whole.
 */
export interface CompiledStaticOtherKindRule extends CompiledInspectionRule {
  /**
   * Every recognized kind but `instructions`, `skill`, `MCP`, `agent`,
   * `prompt/command`, `permissions`, `plugin`, and `output style`.
   */
  readonly kind: Exclude<
    CustomizationKind,
    | 'instructions'
    | 'skill'
    | 'MCP'
    | 'agent'
    | 'prompt/command'
    | 'permissions'
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
 * A compiled derivation whose candidates are instruction files: the
 * configured-basename derivation, whose plan is one exact Repository-root
 * selector per declared name.
 *
 * The derived counterpart of {@link CompiledStaticInstructionRule}, and its
 * own type for the same reason the static kinds are: a derivation of another
 * kind cannot answer what range its files govern, and a union member that
 * could be either would make every caller assert.
 */
export interface CompiledDerivedInstructionRule extends CompiledDerivedRule {
  /** The derived kind; this unit derives instruction candidates alone. */
  readonly kind: 'instructions';
  /** The range each derived file governs, exactly as a static instruction unit answers it. */
  applicabilityRangeOf(): string;
  /** Builds the per-attempt plan from the configuration values the reader validated. */
  planFor(declaredBasenames: readonly string[]): TraversalPlan;
}

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
