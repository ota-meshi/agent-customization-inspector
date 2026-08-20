// Declared-key comparison semantics shared by the kind-specific comparison
// surfaces (FR-011, FR-012, FR-025). What lives here is the meaning of a
// parsed declaration — the key's identity, structural equality of resolved
// values, the union match of two parsed declaration sets, and the shared
// rules for drawing a matched row — which is a property of
// `DeclaredValueDto` itself, not of any one kind's comparison model or of
// any one producing format: a skill's or instruction file's frontmatter and
// an MCP declaration's fields resolve into the same shape.
// Each kind's surface stays its own (spec.md § Clarifications Session
// 2026-08-14): what a group is, which sides pair up, and what a side state
// means are decided in the kind's own module; this module only answers how
// two resolved declarations compare and read, so those answers cannot drift
// between the surfaces that render them.
import { inlinePresentationLabel, rendersNothingVisible } from '../../../shared/entities';
import { DECLARED_KEY_KIND_TEXT } from '../../../shared/api-text';
import type {
  DeclaredEntryDto,
  DeclaredKeyKind,
  DeclaredValueDto,
} from '../../../shared/api-types';

/**
 * One declared key matched across a compared pair by the parser's own
 * identity — the key's parsed type together with its rendered spelling
 * (FR-011). `left`/`right` hold the resolved value the parser produced, or
 * null when that side has no declaration here. Which sides may contribute
 * declarations at all is the calling surface's decision; rows exist only
 * where it offered a parsed declaration set to match.
 *
 * The type is part of the identity because one spelling can stand for two
 * keys: the parser keeps a numeric `1` apart from the string `"1"` while
 * both publish the rendered key `1` (api-types.ts § DeclaredKeyKind), so
 * matching by spelling alone would compare values of two different keys as
 * one. Within one parse each identity is unique — a key declared twice is
 * its later declaration — so every identity is exactly one row (FR-025).
 * What keeps two same-spelled rows distinguishable is the surfaces' shared
 * rendering rule: a key whose parsed type is not the string default is
 * captioned with that type wherever it is drawn.
 *
 * A class rather than an interface because production constructs a row in
 * exactly one place — {@link matchDeclarations} (AGENTS.md § Class and
 * interface policy).
 */
export class DeclarationComparisonRow {
  /** The declared key as the parser resolved it (data-model.md § Field reading). */
  public readonly key: string;

  /** The parsed type completing the key's identity (api-types.ts § DeclaredKeyKind). */
  public readonly keyKind: DeclaredKeyKind;

  /** The first side's resolved value, or null when it declares no such key. */
  public readonly left: DeclaredValueDto | null;

  /** The second side's resolved value, or null when it declares no such key. */
  public readonly right: DeclaredValueDto | null;

  /** Pairs one declared key's two resolved values, either side possibly none. */
  public constructor(
    key: string,
    keyKind: DeclaredKeyKind,
    left: DeclaredValueDto | null,
    right: DeclaredValueDto | null,
  ) {
    this.key = key;
    this.keyKind = keyKind;
    this.left = left;
    this.right = right;
  }

  /**
   * Whether the two resolved values are structurally equal
   * ({@link declaredValuesEqual}); false whenever either side declares no
   * such key. Derived where it is read rather than stored beside the values
   * it derives from — two states can disagree and one cannot (AGENTS.md
   * § Implementation simplicity policy). Descriptive only: equality of
   * resolved values, never a claim about which declaration a product would
   * use (FR-012).
   */
  public get equal(): boolean {
    return this.left !== null && this.right !== null && declaredValuesEqual(this.left, this.right);
  }
}

/**
 * Structural equality of two resolved declared values (FR-011). The
 * comparison is of what the parser resolved — an authored `007` already
 * arrived as `7` — while the literal spelling difference stays visible in
 * the source diff beside the rows. Order is part of a resolved structure:
 * entries and items are compared in authored order, because deciding that a
 * reordered mapping "means the same thing" would be interpretation (FR-012).
 */
export function declaredValuesEqual(left: DeclaredValueDto, right: DeclaredValueDto): boolean {
  switch (left.kind) {
    case 'scalar':
      return right.kind === 'scalar' && left.text === right.text;
    case 'absent':
      return right.kind === 'absent';
    case 'sequence':
      return (
        right.kind === 'sequence' &&
        left.items.length === right.items.length &&
        left.items.every((item, index) => declaredValuesEqual(item, right.items[index]!))
      );
    case 'mapping':
      return (
        right.kind === 'mapping' &&
        left.entries.length === right.entries.length &&
        left.entries.every(
          (entry, index) =>
            // Both halves of the key's identity: a mapping keyed by a
            // numeric `1` is not the mapping keyed by the string `"1"`
            // (api-types.ts § DeclaredKeyKind).
            entry.key === right.entries[index]!.key &&
            entry.keyKind === right.entries[index]!.keyKind &&
            declaredValuesEqual(entry.value, right.entries[index]!.value),
        )
      );
  }
}

/**
 * Matches two parsed declaration sets by the parser's key identity — parsed
 * type plus rendered spelling: the first file's keys in authored order,
 * then keys only the second file declares, in its order — a union with no
 * ranking, so no declaration of either file is dropped (FR-011). Each
 * identity is unique within one parse, so the match is one row per
 * identity (FR-025).
 */
export function matchDeclarations(
  leftEntries: readonly DeclaredEntryDto[],
  rightEntries: readonly DeclaredEntryDto[],
): readonly DeclarationComparisonRow[] {
  /** One matched identity while the union is being built. */
  interface MatchedKey {
    readonly key: string;
    readonly keyKind: DeclaredKeyKind;
    left: DeclaredValueDto | null;
    right: DeclaredValueDto | null;
  }
  // The kind tokens are a closed set containing no NUL, so the first NUL
  // always ends the kind and the join cannot collide, whatever characters
  // the authored key holds. The map's insertion order is exactly the
  // documented row order.
  const identityOf = (entry: DeclaredEntryDto): string => `${entry.keyKind}\u0000${entry.key}`;
  const matched = new Map<string, MatchedKey>();
  for (const entry of leftEntries) {
    matched.set(identityOf(entry), {
      key: entry.key,
      keyKind: entry.keyKind,
      left: entry.value,
      right: null,
    });
  }
  for (const entry of rightEntries) {
    const existing = matched.get(identityOf(entry));
    if (existing === undefined) {
      matched.set(identityOf(entry), {
        key: entry.key,
        keyKind: entry.keyKind,
        left: null,
        right: entry.value,
      });
    } else {
      existing.right = entry.value;
    }
  }
  return [...matched.values()].map(
    (row) => new DeclarationComparisonRow(row.key, row.keyKind, row.left, row.right),
  );
}

/**
 * A matched row header's accessible name: the spelled-out key plus the notes
 * the visible cell shows. The visible cell keeps the parser's resolved
 * spelling under `pre-wrap`, but the accessible-name computation collapses
 * whitespace, so two keys differing only in it would read as one header
 * without this (FR-025); the spelled-out form keeps each row's values
 * attributable to their own key. An authored key that happens to spell one
 * of the notes stays as authored — matching this product's own copy against
 * authored text would turn display wording into load-bearing syntax, and
 * the source comparison beside the rows keeps the exact spelling.
 */
export function declarationRowHeaderLabel(row: DeclarationComparisonRow): string {
  const parts = [inlinePresentationLabel(row.key)];
  if (row.key === '') {
    parts.push('(empty key)');
  } else if (rendersNothingVisible(row.key)) {
    parts.push('(key with no visible characters)');
  }
  if (row.keyKind !== 'string') {
    parts.push(`(${DECLARED_KEY_KIND_TEXT[row.keyKind]})`);
  }
  return parts.join(' ');
}

/**
 * Whether a resolved value renders inline or opens a nested block of its
 * own — the split every surface drawing a declaration cell applies, so a
 * non-empty sequence or mapping opens `DeclarationBlock` and everything else
 * stays a text line.
 */
export function valueOpensBlock(value: DeclaredValueDto): boolean {
  return (
    (value.kind === 'sequence' && value.items.length > 0) ||
    (value.kind === 'mapping' && value.entries.length > 0)
  );
}
