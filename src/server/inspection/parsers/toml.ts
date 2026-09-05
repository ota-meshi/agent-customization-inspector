// The one TOML parsing seam of the inspection module (T1090), the TOML
// counterpart of `markdown.ts`: it turns one already-decoded string into the
// parsed document and hands it back, deciding nothing about the format itself
// and extracting nothing from the result. What a caller reads out of the
// document — the Codex carrier's pinned fallback declaration, the MCP phase's
// `[mcp_servers.*]` tables — is that caller's own contract, and
// vendor-specific readings live beside the rules that own them, never here.
//
// The document publishes two views: the
// parser's own typed resolution, for readings that need the parser's type
// system (the configuration read rejecting a non-string basename), and the
// same resolution rendered once into the shared declaration-entry shape the
// detail surfaces draw (`DeclaredEntryDto`) — how a TOML value spells itself
// is the format's own fact, so every vendor reading declarations out of TOML
// publishes them identically, and the rendering never leaves this module.
//
// The parse reads one string and touches nothing else: no I/O, no execution,
// no path resolution; memory and time capacity are the environment's, with no
// Inspector numeric cap (FR-029).
import { TomlDate, parse } from 'smol-toml';
import type { TomlTable, TomlValue } from 'smol-toml';
import type { DeclaredEntryDto, DeclaredValueDto } from '../../../shared/api-types';

/**
 * One TOML document as the parser resolved it. The class mirrors
 * `ParsedMarkdownDocument` and `ParsedJsonDocument`: the constructor is the
 * parse, and the fields are the parser's own answer plus its one rendering —
 * never an extraction, which stays the caller's contract.
 */
export class ParsedTomlDocument {
  /**
   * The document's top-level table exactly as the parser resolved it, as a
   * plain object — so integer-like keys enumerate in the platform's numeric
   * order whatever the file's spelling ordered, an accepted JavaScript
   * property of every parsed object rather than something worked around
   * (see `json.ts`'s module header); the rendered `entries` beside it share
   * that order. Values are the parser's plain resolutions. An empty
   * document resolves to an empty table, which is not a failure. This is the
   * typed view a value-consuming reading needs: the rendered `entries` beside
   * it deliberately collapse the parser's types into presentation text, so a
   * reading that must tell `"42"` from `42` — the configuration read that
   * accepts only string basenames — reads here.
   */
  public readonly table: TomlTable;

  /**
   * The same table rendered once into the shared declaration-entry shape the
   * detail surfaces draw (data-model.md § Field reading): the view a
   * declaration-publishing reading navigates, `keyKind` always `'string'`
   * because TOML keys are strings. Rendered in the constructor — the
   * rendering is total, so the parse and its presentation succeed or fail as
   * one.
   */
  public readonly entries: readonly DeclaredEntryDto[];

  /**
   * Parses one TOML document. Throws when the document cannot be parsed; the
   * caller is `extraction.ts`, which confines the throw to whatever asked for
   * it — the recognition of a file whose source stays displayed, or a
   * configuration read that then configures nothing (FR-028).
   */
  public constructor(sourceText: string) {
    // `integersAsBigInt: 'asNeeded'` because the default rejects an integer
    // the document is entitled to hold: TOML integers are 64-bit, and a value
    // past `Number.MAX_SAFE_INTEGER` fails the whole parse rather than the one
    // key. A vendor's own file would then lose every declaration it makes
    // because of a number no reader here looks at.
    this.table = parse(sourceText, { integersAsBigInt: 'asNeeded' });
    this.entries = renderTomlEntries(this.table);
  }
}

/**
 * Renders one TOML-resolved value the way the detail surfaces show a
 * declaration (data-model.md § Field reading): the value the parser resolved,
 * in the shape the file wrote it — a table stays a mapping and an array a
 * sequence, nothing summarized away — normalized once into the internal
 * semantic the shared entry shape carries. A 64-bit integer past
 * `Number.MAX_SAFE_INTEGER` arrives as a bigint and renders its exact decimal
 * digits, and a datetime renders through `TomlDate`'s own ISO spelling, which
 * preserves the authored variant (offset, local, date-only, time-only).
 */
function renderTomlValue(value: TomlValue): DeclaredValueDto {
  // The parsed kind rides beside the rendered text, because the rendering
  // alone cannot say whether `7` was a number or a quoted string
  // (api-types.ts § DeclaredScalarKind); one branch per kind, because
  // TypeScript types a `typeof` expression as the full tag union whatever
  // its operand's type is.
  if (typeof value === 'string') {
    return { kind: 'scalar', scalarKind: 'string', text: value };
  }
  if (typeof value === 'number') {
    // `String` over the parsed number is the whole rendering: what it shows
    // is the platform's own resolution — `String(-0)` is `"0"` — accepted
    // as is.
    return { kind: 'scalar', scalarKind: 'number', text: String(value) };
  }
  if (typeof value === 'boolean') {
    return { kind: 'scalar', scalarKind: 'boolean', text: String(value) };
  }
  if (typeof value === 'bigint') {
    // A 64-bit integer is a number whose exact digits the double type cannot
    // hold; the kind says number and the text keeps every digit.
    return { kind: 'scalar', scalarKind: 'number', text: value.toString() };
  }
  if (value instanceof TomlDate) {
    // A datetime has no primitive type of its own: its ISO rendering is its
    // spelling (api-types.ts § DeclaredScalarKind).
    return { kind: 'scalar', scalarKind: 'string', text: value.toISOString() };
  }
  if (Array.isArray(value)) {
    return { kind: 'sequence', items: value.map((item) => renderTomlValue(item)) };
  }
  return { kind: 'mapping', entries: renderTomlEntries(value) };
}

/**
 * Renders one TOML table's entries in the parser's resolved order, in the
 * shared declaration-entry shape the detail surfaces draw. TOML keys are
 * always strings, so every entry's `keyKind` is `'string'`; the key text is
 * the parser's resolution, quoting and escapes resolved once, exactly as the
 * value on the other side of the `=` is.
 */
function renderTomlEntries(table: TomlTable): DeclaredEntryDto[] {
  return Object.entries(table).map(([key, value]) => ({
    key,
    keyKind: 'string',
    value: renderTomlValue(value),
  }));
}
