// The frontmatter serialization the Markdown-kind surfaces render
// (FR-007, FR-011): every key the file's frontmatter declares, as one YAML
// document — the details show it read-only in the Monaco viewer beside the
// instructions the block was removed from, and the comparison surfaces diff
// two sides' canonical documents in Monaco. YAML because the frontmatter is
// YAML: the document is the parse's resolved reading spelled back in the
// block's own language, so a reader compares it against their file without
// translating, and pastes from it without converting.
//
// The serialization is the parsed entries — the same `DeclaredEntryDto`
// tree the wire publishes — with nothing masked, shortened, or substituted
// (FR-025, FR-026): a literal credential and an environment reference are
// serialized as the characters the carrier wrote. The order is each
// surface's own fact, so the module ships one serializer per surface: the
// detail serializer imposes no order of its own — entries, nested mappings,
// and sequence items serialize as given, because the order is the detail's
// FR-007 fact (the skill detail leads with `name` and `description` and
// keeps the file's order past them, the instruction detail is the file's
// order whole) — while the comparison serializer is canonical, like the MCP
// comparison's (declared-entries-json.ts): the caller's leading keys first,
// every other key and every nested mapping's keys sorted, sequence items as
// given, so the two sides align line by line.
//
// The `yaml` package does the spelling, directed by the parsed kinds the
// wire publishes. A key carries its kind (`DeclaredKeyKind`), so a
// non-string key is serialized as the value it resolved to — YAML's numeric
// `1` stays a bare `1` while the string `"1"` stays quoted. A scalar value
// carries its kind too (api-types.ts § DeclaredScalarKind), so a number or
// boolean is rebuilt as its value and spells bare while a string keeps the
// package's own quoting: an authored `'7'` stays `"7"`, an authored `007`
// resolved to the number `7` spells `7`, and a `null`-spelling string
// quotes, so it never reads as the authored null the absent variant
// serializes. A multiline string is a block literal.
import { Document, Pair, Scalar, YAMLMap, YAMLSeq } from 'yaml';
import type {
  DeclaredEntryDto,
  DeclaredScalarKind,
  DeclaredValueDto,
} from '../../../shared/api-types';

/**
 * The parsed value a number-kind scalar's text encodes, decoded exactly:
 * the text is `String(value)` — or a bigint's own digits — so an integer
 * spelling past the double range decodes through `BigInt` and every other
 * spelling round-trips through `Number`, `NaN` and `Infinity` included.
 * A reversible decode of the wire's JSON-safe encoding, not a guess: the
 * kind rode the wire beside the text (api-types.ts § DeclaredScalarKind).
 */
function numericValue(text: string): number | bigint {
  if (/^-?\d+$/u.test(text)) {
    const decoded = Number(text);
    return Number.isSafeInteger(decoded) ? decoded : BigInt(text);
  }
  return Number(text);
}

/**
 * One resolved scalar as its YAML node, spelled by the parsed kind the wire
 * publishes beside the text (api-types.ts § DeclaredScalarKind): a number
 * or boolean is rebuilt as its value, so the package spells it bare — a
 * past-double integer via its exact digits, a non-finite number as `.nan`
 * or `.inf`, YAML's own spellings — while a string stays a string, so an
 * authored `'7'` keeps its quotes instead of being misspelled as the
 * number it renders like. A multiline string is a block literal (the
 * package falls back to quoting where a block cannot carry the
 * characters); every other string is plain, with the package's own quoting.
 */
function scalarNode(value: {
  readonly scalarKind: DeclaredScalarKind;
  readonly text: string;
}): Scalar {
  switch (value.scalarKind) {
    case 'number': {
      const node = new Scalar(numericValue(value.text));
      node.type = Scalar.PLAIN;
      return node;
    }
    case 'boolean': {
      const node = new Scalar(value.text === 'true');
      node.type = Scalar.PLAIN;
      return node;
    }
    case 'string': {
      const node = new Scalar(value.text);
      node.type = value.text.includes('\n') ? Scalar.BLOCK_LITERAL : Scalar.PLAIN;
      return node;
    }
  }
}

/**
 * One declared key as its YAML node, by the parsed kind the wire keeps
 * beside the spelling (`DeclaredKeyKind`): a non-string key serializes as
 * the value it resolved to, so YAML's numeric `1` and string `"1"` — one
 * rendering, two keys — stay apart in the document exactly as the parse
 * kept them apart.
 */
function keyNode(entry: DeclaredEntryDto): Scalar {
  switch (entry.keyKind) {
    case 'string': {
      const node = new Scalar(entry.key);
      node.type = Scalar.PLAIN;
      return node;
    }
    case 'number': {
      const node = new Scalar(Number(entry.key));
      node.type = Scalar.PLAIN;
      return node;
    }
    case 'boolean': {
      const node = new Scalar(entry.key === 'true');
      node.type = Scalar.PLAIN;
      return node;
    }
    case 'null':
      return new Scalar(null);
  }
}

/**
 * Deterministic key order for a canonical serialization: the resolved key
 * text, with the parsed kind as the tiebreak so YAML's numeric `1` and
 * string `"1"` — one rendering, two keys — order deterministically too.
 */
function compareKeys(a: DeclaredEntryDto, b: DeclaredEntryDto): number {
  if (a.key !== b.key) {
    return a.key < b.key ? -1 : 1;
  }
  return a.keyKind < b.keyKind ? -1 : a.keyKind > b.keyKind ? 1 : 0;
}

/**
 * One declared value as its YAML node; the recursion over the parsed tree.
 * `sortNested` is the canonical serialization's rule — every nested
 * mapping's keys sort, so the same key faces itself on the other comparison
 * side — and stays off for the details' authored order.
 */
function valueNode(value: DeclaredValueDto, sortNested: boolean): Scalar | YAMLMap | YAMLSeq {
  switch (value.kind) {
    case 'scalar':
      return scalarNode(value);
    case 'absent':
      // An authored null: the key is declared, and declares no value, which
      // YAML spells `null` — the same reading the detail's value text gives
      // it.
      return new Scalar(null);
    case 'sequence': {
      const node = new YAMLSeq();
      for (const item of value.items) {
        node.items.push(valueNode(item, sortNested));
      }
      return node;
    }
    case 'mapping':
      return mappingNode(
        sortNested ? value.entries.toSorted(compareKeys) : value.entries,
        sortNested,
      );
  }
}

/** One entry list as a YAML mapping; the callers decide the order. */
function mappingNode(entries: readonly DeclaredEntryDto[], sortNested: boolean): YAMLMap {
  const node = new YAMLMap();
  for (const entry of entries) {
    node.items.push(new Pair(keyNode(entry), valueNode(entry.value, sortNested)));
  }
  return node;
}

/**
 * Serializes one frontmatter block's declared entries to the YAML document
 * the Markdown-kind details render (FR-007): the keys the file wrote, in
 * the order the caller settled, every value as resolved. A file declaring
 * an empty frontmatter block serializes as the empty mapping `{}`, an
 * authored fact shown rather than an empty panel.
 */
export function frontmatterYamlText(entries: readonly DeclaredEntryDto[]): string {
  return new Document(mappingNode(entries, false)).toString();
}

/**
 * Serializes one frontmatter block to the canonical YAML document a
 * comparison mounts as one Monaco side (FR-011): the caller's leading keys
 * first — each kind's comparison leads with the keys the vendors document for
 * it (declaration-order.ts) — then every other key, and every nested mapping's
 * keys, sorted, so both sides align line by line and a line difference is a
 * key difference. Sequence items keep their order: a list's order is the
 * declaration's own data.
 */
export function canonicalFrontmatterYamlText(
  entries: readonly DeclaredEntryDto[],
  leadingKeys: readonly string[],
): string {
  const rank = (entry: DeclaredEntryDto): number => {
    // Only a string key can be one of the leading identity keys: a numeric
    // key spelling `name` is a different key.
    const index = entry.keyKind === 'string' ? leadingKeys.indexOf(entry.key) : -1;
    return index === -1 ? leadingKeys.length : index;
  };
  const ordered = entries.toSorted((a, b) => rank(a) - rank(b) || compareKeys(a, b));
  return new Document(mappingNode(ordered, true)).toString();
}
