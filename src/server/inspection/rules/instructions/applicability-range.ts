// How an applicability range is spelled: one literal path segment as a glob
// that denotes exactly it (data-model.md § Inventory unit).
//
// A range is the instructions inventory's row unit, grouped by exact spelling,
// so the products that derive one from a path have to escape alike — two
// spellings of one directory would be two rows. What each product answers is
// its own module beside this one; what a spelling means is here, because it is
// the same for all of them.

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
