// The declared-entry serialization (T400; FR-011, research.md § 7): a block of
// declared entries as one pretty-printed JSON document — an MCP declaration's
// fields, or the policy block a Claude settings carrier declares — the
// value a JSON carrier's entry holds under the server's name, so a reader
// of such a carrier can paste it as their own entry's body, while a TOML
// carrier's reader copies values rather than syntax. Two surfaces
// consume it: the comparison serializes both sides into this one spelling
// and diffs the serializations in Monaco — the two carriers of one name
// need not share a syntax, a `.codex/config.toml` declares in TOML while a
// `.mcp.json` declares in JSON, and no carrier shows its bytes (FR-007) —
// and the MCP detail renders each declaration's fields as the same
// document, in the file's own key order (FR-007).
//
// The comparison's serialization is canonical so the two sides align line
// by line: the keys the vendors' carrier schemas commonly declare come
// first in one fixed reading order — what the server is, how it launches,
// where it connects, what environment it gets — and every other key, and
// every key of a nested mapping, is sorted, so one field's line faces the
// same field's line on the other side and a line difference is a field
// difference. Sequence items keep their order: an argument list's order is
// the declaration's own data. The detail's serialization instead keeps the
// authored order, because a detail publishes the declaration by the keys
// the file wrote, in the file's own order (FR-007).
//
// The document is `JSON.stringify(value, null, 2)`'s own output over a tree
// this module only reorders, so its property order is the platform's
// enumeration order: an integer-like key — `"7"` — lists before the rest
// whatever order it was inserted in. That corner is accepted as the
// platform's own spelling, the same trade as `String(-0)` rendering `0`;
// it is deterministic and identical on both comparison sides, so it never
// manufactures a difference.
//
// The values are the declaration's parsed entries — the same
// `DeclaredEntryDto` tree every detail surface renders — with nothing
// masked, shortened, or substituted (FR-025, FR-026): a literal credential
// and an environment reference are serialized as the characters the carrier
// wrote. A scalar carries its parsed kind beside its resolved text
// (api-types.ts § DeclaredScalarKind), so the document spells it as what it
// was: a number or boolean rebuilds as its value and spells bare, a number
// JSON cannot spell — `NaN`, a 64-bit integer past the double range — keeps
// its exact text as a JSON string, and a string stays a string under
// `JSON.stringify`'s own escaping: an authored `'7'` stays `"7"`, a
// multiline note spells its `\n`, a control character or lone surrogate
// becomes its escape, identically on both comparison sides, so no spelling
// manufactures a difference, and a `null`-spelling string never reads as
// the authored null the absent variant serializes.
import { LEADING_MCP_DECLARATION_KEYS } from './inspection/declaration-order';
import type {
  DeclaredEntryDto,
  DeclaredScalarKind,
  DeclaredValueDto,
} from '../../shared/api-types';

/** Deterministic key order for everything the fixed reading order does not place. */
function compareKeyText(a: DeclaredEntryDto, b: DeclaredEntryDto): number {
  return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
}

/**
 * One resolved scalar as the value `JSON.stringify` spells it from, decoded
 * by the parsed kind the wire publishes beside the text (api-types.ts
 * § DeclaredScalarKind) — a reversible decode, not a guess. A boolean and a
 * finite double-representable number rebuild as their values and spell
 * bare; a number JSON cannot spell — `NaN`, `Infinity`, a TOML 64-bit
 * integer past the double range — keeps its exact text as a JSON string,
 * because `JSON.stringify` has no bare spelling for it; a string stays a
 * string, so an authored `'7'` keeps its quotes instead of being misspelled
 * as the number it renders like.
 */
function scalarValue(value: {
  readonly scalarKind: DeclaredScalarKind;
  readonly text: string;
}): unknown {
  switch (value.scalarKind) {
    case 'number': {
      const decoded = Number(value.text);
      return Number.isFinite(decoded) && String(decoded) === value.text ? decoded : value.text;
    }
    case 'boolean':
      return value.text === 'true';
    case 'string':
      return value.text;
  }
}

/**
 * One declared value as the plain value `JSON.stringify` serializes; the
 * recursion over the parsed tree. `sortNested` is the canonical
 * serialization's rule — a nested mapping, an `env` block or a `headers`
 * map, sorts every key so the same variable faces itself on the other
 * side — and stays off for the detail's authored order.
 */
function jsonValue(value: DeclaredValueDto, sortNested: boolean): unknown {
  switch (value.kind) {
    case 'scalar':
      return scalarValue(value);
    case 'absent':
      // An authored null: the key is declared, and declares no value, which
      // JSON spells `null` — the same reading the detail's value text gives
      // it.
      return null;
    case 'sequence':
      return value.items.map((item) => jsonValue(item, sortNested));
    case 'mapping':
      return objectOf(
        sortNested ? value.entries.toSorted(compareKeyText) : value.entries,
        sortNested,
      );
  }
}

/** One ordered entry list as the object `JSON.stringify` serializes. */
function objectOf(entries: readonly DeclaredEntryDto[], sortNested: boolean): object {
  return Object.fromEntries(
    entries.map((entry) => [entry.key, jsonValue(entry.value, sortNested)]),
  );
}

/**
 * Serializes one server declaration's fields to the JSON document the MCP
 * detail renders: the keys the file wrote, in the file's own order, every
 * value as resolved (FR-007). A declaration with no fields serializes as
 * the empty object `{}`, an authored fact shown rather than an empty panel.
 */
export function declaredEntriesJsonText(fields: readonly DeclaredEntryDto[]): string {
  return JSON.stringify(objectOf(fields, false), null, 2);
}

/**
 * Serializes one server declaration's fields to the JSON document the
 * comparison mounts as one Monaco side (FR-011): the common declaration
 * keys first in the fixed reading order, every other key — and every nested
 * mapping's keys — sorted, so both sides align line by line.
 */
export function canonicalDeclaredEntriesJsonText(fields: readonly DeclaredEntryDto[]): string {
  const rank = (key: string): number => {
    const index = LEADING_MCP_DECLARATION_KEYS.indexOf(key);
    return index === -1 ? LEADING_MCP_DECLARATION_KEYS.length : index;
  };
  const ordered = fields.toSorted((a, b) => rank(a.key) - rank(b.key) || compareKeyText(a, b));
  return JSON.stringify(objectOf(ordered, true), null, 2);
}
