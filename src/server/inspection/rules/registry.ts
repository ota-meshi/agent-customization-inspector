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
import type { SupportedTool } from '../../../shared/entities';

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
  | {
      /** One case-sensitive exact ASCII segment. */
      readonly kind: 'literal';
      /** The closed non-empty ASCII literal (no separators or glob chars). */
      readonly value: string;
    }
  | {
      /** Exactly one entry name, decided by the pattern. */
      readonly kind: 'regex';
      /** Standard JS regular expression tested against the raw entry name. */
      readonly pattern: RegExp;
    }
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
 * walk consumes directories for it through {@link createProgramLevel}.
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
 * One in-flight matching position inside one selector program: the program
 * plus the next segment index to consume. Plain data the walk threads
 * through directory levels.
 */
export interface ProgramState {
  /** The complete closed segment program being matched. */
  readonly program: readonly MatcherSegment[];
  /** The next segment index to consume. */
  readonly position: number;
}

// `**` matches zero or more directories, so a state whose next token is
// recursive also activates the state after it at the same level.
function closeOverRecursion(states: readonly ProgramState[]): ProgramState[] {
  const closed: ProgramState[] = [];
  const queue = [...states];
  while (queue.length > 0) {
    const state = queue.pop()!;
    if (
      closed.some(
        (existing) => existing.program === state.program && existing.position === state.position,
      )
    ) {
      continue;
    }
    closed.push(state);
    if (state.program[state.position]?.kind === 'recursive-directories') {
      queue.push({ program: state.program, position: state.position + 1 });
    }
  }
  return closed;
}

/** The grammar queries one directory level answers; see {@link createProgramLevel}. */
export interface ProgramLevel {
  /** True when any active program accepts `name` as its terminal regular file. */
  matchesFile(name: string): boolean;
  /**
   * The program states that continue matching below directory `name`: the
   * `**` step consumes the directory and keeps matching, and a non-terminal
   * literal or regex step that matches the name advances one position. An
   * empty result means the walk has no reason to enter the directory.
   */
  statesForDirectory(name: string): ProgramState[];
}

/**
 * Interprets the active selector programs at one directory level — the
 * grammar's stepping semantics, owned here beside the union so the walk in
 * `traversal.ts` needs no knowledge of segment kinds at all. The walk calls
 * this once per directory and asks the two closed questions per entry.
 */
export function createProgramLevel(states: readonly ProgramState[]): ProgramLevel {
  const active = closeOverRecursion(states);
  return {
    matchesFile(name) {
      return active.some((state) => {
        const segment = state.program[state.position];
        return (
          segment !== undefined &&
          state.position === state.program.length - 1 &&
          segmentMatchesName(segment, name)
        );
      });
    },
    statesForDirectory(name) {
      const next: ProgramState[] = [];
      for (const state of active) {
        const segment = state.program[state.position];
        if (segment === undefined) {
          continue;
        }
        if (segment.kind === 'recursive-directories') {
          // The recursive step consumes this directory and keeps matching.
          next.push(state);
        } else if (
          state.position < state.program.length - 1 &&
          segmentMatchesName(segment, name)
        ) {
          next.push({ program: state.program, position: state.position + 1 });
        }
      }
      return next;
    },
  };
}

/**
 * The exact Source boundary a matcher is relative to
 * (contracts/inspection-path-allowlist.md § Source boundaries): the one
 * Repository boundary or one named consented tool-specific Global boundary.
 * Never inferred from a selector.
 */
export type MatcherBase =
  | { readonly kind: 'repository' }
  | { readonly kind: 'global'; readonly tool: SupportedTool };

/**
 * One static rule's structured matcher: the exact base boundary plus its
 * non-empty ordered selector programs
 * (data-model.md § StructuredInspectorMatcher).
 */
export interface StructuredInspectorMatcher {
  /** The one boundary every selector is relative to. */
  readonly base: MatcherBase;
  /** Non-empty ordered unique selector programs. */
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
export type SelectionPolicy = 'all-matches' | 'codex-global-first-non-empty';

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
export type TraversalSelectorMode = 'repository-program' | 'global-exact' | 'global-fixed-subtree';

/**
 * One compiled selector of a TraversalPlan: the closed lossless mapping of
 * one selector program (data-model.md § TraversalPlan).
 */
export interface TraversalSelectorPlan {
  /** The closed operation class; see {@link TraversalSelectorMode}. */
  readonly mode: TraversalSelectorMode;
  /**
   * NFC literal segment array: empty for Repository; for Global the complete
   * path through the exact target or fixed-subtree root, including that
   * terminal target/subtree segment.
   */
  readonly fixedPrefix: readonly string[];
  /**
   * Repository's complete selector program, empty for a Global exact target,
   * or the complete dynamic program strictly below a Global fixed-subtree
   * root.
   */
  readonly remainder: readonly MatcherSegment[];
}

/** The one schema version the runtime loader accepts (data-model.md § TraversalPlan). */
export const TRAVERSAL_PLAN_SCHEMA_VERSION = 1;

/**
 * Immutable shipped traversal data compiled from a matcher: the fixed
 * per-tool inspection-path allowlist the inspection module traverses
 * (FR-003, FR-015 through FR-017).
 */
export interface TraversalPlan {
  /** Literal schema version; an unknown version fails registry loading. */
  readonly schemaVersion: typeof TRAVERSAL_PLAN_SCHEMA_VERSION;
  /** Copied from the matcher and never inferred from request/display text. */
  readonly boundary: MatcherBase;
  /** One-to-one canonical compilation of the matcher selectors; non-empty. */
  readonly selectors: readonly TraversalSelectorPlan[];
  /** The closed scheduler policy; see {@link SelectionPolicy}. */
  readonly selectionPolicy: SelectionPolicy;
}

/**
 * Authoring token: matches every entry name (the empty pattern `/(?:)/u`
 * matches any string). Reads better than a bare always-true regex in a
 * selector array. Unlike a glob `*`, it also matches names with a leading
 * dot.
 */
export const ANY_NAME: MatcherSegment = Object.freeze({ kind: 'regex', pattern: /(?:)/u });

/**
 * Authoring token: matches zero or more directories of any spelling
 * (`recursive-directories`, the `**` step). Never terminal and never
 * adjacent to another ANY_DIRECTORIES.
 */
export const ANY_DIRECTORIES: MatcherSegment = Object.freeze({ kind: 'recursive-directories' });

/**
 * Authoring input for one selector segment: a plain string is an exact
 * literal entry name, a RegExp is a dynamic single-name step with standard
 * JS semantics, and ANY_DIRECTORIES is the any-depth step. There is no
 * string syntax to parse — a selector is authored as this array, e.g.
 * `['.claude', 'skills', ANY_NAME, 'SKILL.md']` or `['docs', /\.md$/u]`.
 */
export type SelectorSegmentInput = string | RegExp | MatcherSegment;

// Maps one authored segment onto the closed union; grammar and alphabet
// conformance of the shipped catalogs is owned by the registry contract
// gate, not re-checked here.
function toSegment(input: SelectorSegmentInput): MatcherSegment {
  if (typeof input === 'string') {
    return { kind: 'literal', value: input };
  }
  if (input instanceof RegExp) {
    return { kind: 'regex', pattern: input };
  }
  return input;
}

// Compiles one selector program into its closed lossless plan
// (data-model.md § TraversalPlan): the Repository program keeps its
// complete segments; an all-literal Global program becomes an exact
// target; otherwise the maximal leading literal directory chain becomes
// the fixed prefix and the dynamic program below it stays as the
// remainder.
function compileSelector(
  base: MatcherBase,
  segments: readonly MatcherSegment[],
): TraversalSelectorPlan {
  if (base.kind === 'repository') {
    return { mode: 'repository-program', fixedPrefix: [], remainder: segments };
  }
  const firstDynamic = segments.findIndex((segment) => segment.kind !== 'literal');
  const literalValues = (prefix: readonly MatcherSegment[]): string[] =>
    prefix.map((segment) => {
      if (segment.kind !== 'literal') {
        throw new TypeError('a fixed prefix accepts literal segments only');
      }
      return segment.value;
    });
  if (firstDynamic === -1) {
    return { mode: 'global-exact', fixedPrefix: literalValues(segments), remainder: [] };
  }
  if (firstDynamic === 0) {
    throw new TypeError('a Global selector must fix its subtree root with leading literals');
  }
  return {
    mode: 'global-fixed-subtree',
    fixedPrefix: literalValues(segments.slice(0, firstDynamic)),
    remainder: segments.slice(firstDynamic),
  };
}

/**
 * Compiles a matcher into the immutable versioned TraversalPlan the
 * traversal module interprets (data-model.md § TraversalPlan). This is a
 * pure structure transform: grammar, alphabet, uniqueness, and
 * selection-policy validity are registry contract-gate obligations and are
 * not re-checked here.
 */
export function compileTraversalPlan(
  matcher: StructuredInspectorMatcher,
  selectionPolicy: SelectionPolicy = 'all-matches',
): TraversalPlan {
  return {
    schemaVersion: TRAVERSAL_PLAN_SCHEMA_VERSION,
    boundary: matcher.base,
    selectors: matcher.selectors.map((segments) => compileSelector(matcher.base, segments)),
    selectionPolicy,
  };
}

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
 * Convenience compiler from authored typed programs, the form the
 * per-vendor rule catalogs use. Example:
 * `compileSelectorPrograms(base, [['.claude', 'skills', ANY_NAME, 'SKILL.md']])`.
 */
export function compileSelectorPrograms(
  base: MatcherBase,
  programs: readonly (readonly SelectorSegmentInput[])[],
  selectionPolicy: SelectionPolicy = 'all-matches',
): TraversalPlan {
  return compileTraversalPlan(
    { base, selectors: programs.map((program) => program.map(toSegment)) },
    selectionPolicy,
  );
}

/**
 * The shipped Repository traversal-plan catalog a Repository scan executes
 * (FR-003). The per-vendor inventory phases contribute their compiled rule
 * plans here; until the first vendor rule ships, the allowlist is genuinely
 * empty and a Repository scan legitimately publishes an empty inventory.
 */
export const REPOSITORY_TRAVERSAL_PLANS: readonly TraversalPlan[] = [];
