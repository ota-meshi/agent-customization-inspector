// The YAML frontmatter of a Markdown document, read under this product's fixed
// semantics (T087; data-model.md § Field reading).
//
// Nothing here renders links, fetches, or executes, and nothing here decides
// anything about either format. `vfile-matter` finds the frontmatter block and
// parses it; this module chooses the semantics it is parsed under and hands the
// result back. Deciding where a block begins and ends would mean re-deciding
// line endings, the closing-fence forms, and what counts as a fence at all —
// the same "looks like the format but isn't" trap the selector grammar refuses
// — and a second opinion about a format is a second opinion that can disagree.
//
// What comes back is the parser's resolution under those semantics — the
// Inspector's one documented reading, not a reconstruction of any vendor's:
// `007` is `7`, a key declared twice is its later declaration, an alias is the
// value it points at, and a tag the core schema does not resolve leaves the
// scalar it carried. None of those is rejected and none is converted, and no
// per-field coercion a vendor documents is applied (data-model.md § Field
// reading). This product is not a validator either, and the complete decoded
// source is on the same screen in the source viewer for anyone who needs the
// spelling.
//
// The document publishes that resolution rendered once into the shared
// declaration-entry shape the detail surfaces draw (`DeclaredEntryDto`),
// exactly as `toml.ts` and `json.ts` publish theirs: how a YAML value spells
// itself is the format's own fact, and the rendering never leaves this
// module. Nothing is extracted here: which entries a recognition then reads
// belongs to `recognizers/candidate.ts` and the vendor readings beside the
// rules.
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import type { DocumentOptions, ParseOptions, SchemaOptions, ToJSOptions } from 'yaml';
import type {
  DeclaredEntryDto,
  DeclaredKeyKind,
  DeclaredValueDto,
} from '../../../shared/api-types';

/**
 * The YAML semantics a frontmatter block is read under.
 *
 * Stated rather than left to the parser's defaults, because these are the
 * product's commitments and not incidental: YAML 1.1 would resolve `yes` to a
 * boolean and `12:30` to a sexagesimal number. YAML 1.2 core is the one
 * documented reading every published value is stated under — the Inspector's
 * own, not a reconstruction of any vendor's: a vendor may coerce further per
 * field, the way Claude Code reads `yes` as true for its boolean frontmatter
 * fields (data-model.md § Field reading).
 */
const YAML_PARSE_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions = {
  /** YAML 1.2, whose core schema also leaves merge keys out. */
  version: '1.2',
  /**
   * Mappings come back as `Map`s, not plain objects, because a plain object
   * does not keep the order the keys were written in: JavaScript lists
   * integer-like keys first, in ascending numeric order, before the rest. A
   * file declaring `10:` then `2:` would be shown `2` first — an order its
   * author never wrote — and the detail surface publishes declarations in
   * authored order (data-model.md § Skill presentation).
   *
   * A `Map` also keeps a key's parsed type, so a numeric key stays distinct
   * from the string that spells it — the distinction `keyKind` publishes.
   */
  mapAsMap: true,
  /**
   * The core schema alone: no YAML 1.1 timestamps, sexagesimals, or
   * language-specific types.
   */
  schema: 'core',
  /**
   * A repeated key is not a reason to refuse a document. The later declaration
   * is what a parser resolves the key to, so it is what gets reported.
   */
  uniqueKeys: false,
  /**
   * Warnings off, errors kept. The parser reports an unresolved tag through
   * `process.emitWarning` with the offending source line in the message, which
   * is noise on the user's terminal about a file the product is only reading.
   * `silent` would stop that, but it also discards parse *errors*: a document
   * nothing can read then comes back as a best-effort value — `name:
   * [unterminated` as a one-item list — instead of failing its recognition
   * (FR-028). `error` is the level that does one without the other.
   */
  logLevel: 'error',
};

/**
 * One Markdown document read as its two authored parts.
 *
 * The split is the parser's, not this module's: `vfile-matter` removes the
 * block it recognized, so the body is what it left behind. Measuring the
 * fences here to cut the same seam would be a second opinion about the format,
 * free to disagree with the one that actually parsed the values.
 */
export class ParsedMarkdownDocument {
  /**
   * Every key the frontmatter block declares, in authored order, rendered
   * once into the shared declaration-entry shape the detail surfaces draw
   * (data-model.md § Field reading). Only a mapping declares keys: a block
   * written as a list or a bare scalar is not a mapping and declares nothing
   * — the index positions a list would be read by are not keys the file
   * wrote (data-model.md § Skill presentation) — and a document with no block declares
   * nothing either; none of those is a failure. Rendered in the constructor,
   * so a block whose values have no authored rendering fails with the parse
   * it belongs to.
   */
  public readonly frontmatterEntries: readonly DeclaredEntryDto[];

  /**
   * The document with its frontmatter block removed — the instructions a
   * product reads after the declarations. Equal to the complete source for a
   * document that declares no frontmatter.
   */
  public readonly body: string;

  /**
   * Reads a Markdown document's frontmatter and body under this product's
   * fixed YAML semantics.
   *
   * Throws when a block is present but its YAML cannot be parsed — and when
   * the parsed values have no authored rendering (a value that contains
   * itself, a tag-built host object; see {@link renderYamlValue}). The caller
   * is `extraction.ts`, which confines the throw to the recognition that asked
   * for it and leaves the file's complete readable source displayed (FR-028).
   */
  public constructor(sourceText: string) {
    const file = new VFile({ value: sourceText });
    // `strip` is what makes the body the parser's own answer: it removes
    // exactly the block `vfile-matter` recognized, fences and all.
    matter(file, { yaml: YAML_PARSE_OPTIONS, strip: true });
    const resolved: unknown = file.data.matter;
    // Deliberately the entries and not a rendered block `DeclaredValueDto`:
    // only a mapping declares keys, and a non-mapping block declares nothing
    // (data-model.md § Skill presentation), so a sequence or scalar rendering
    // of the block would be a value no shipped surface draws — and the
    // parser's no-block answer is a sentinel plain object, which has no
    // authored rendering at all. The complete source stays in the source
    // viewer for anyone who needs the block's own spelling.
    this.frontmatterEntries = resolved instanceof Map ? renderYamlEntries(resolved) : [];
    this.body = String(file.value);
  }
}

/**
 * Resolves one declared key to the text a product resolves it to and the
 * parsed type that text came from (data-model.md § Field reading): a quoted
 * `"01"` stays `01`, and an unquoted `01` is the integer the core schema
 * resolves it to, exactly as the value on the other side of the colon would
 * be. The type is published with the text because the parser keeps a numeric
 * key apart from the string that spells it while both render identically,
 * and the comparison surface matches declarations by the parser's identity
 * rather than by the spelling alone (FR-011).
 *
 * A YAML key need not be a scalar — `? [a, b]` declares a list as a key — and
 * a list has no rendering as the name of a row. Such a block fails its
 * recognition all-or-nothing through `RecognitionExtraction.run`, the same
 * outcome as a value that contains itself, rather than being titled with a
 * spelling this product invented for it (FR-025, FR-028).
 */
function resolveYamlKey(key: unknown): { text: string; kind: DeclaredKeyKind } {
  if (typeof key === 'string') {
    return { text: key, kind: 'string' };
  }
  if (typeof key === 'number') {
    return { text: String(key), kind: 'number' };
  }
  if (typeof key === 'boolean') {
    return { text: String(key), kind: 'boolean' };
  }
  if (key === null || key === undefined) {
    // `~:` and an empty key both resolve to null under the core schema;
    // `null` is that key written out, not a stand-in for a key this surface
    // could not read.
    return { text: 'null', kind: 'null' };
  }
  throw new TypeError('frontmatter declares a key that is not a scalar');
}

/**
 * Renders one declared value the way the detail surface shows it: the value
 * the parser resolved under YAML 1.2's core schema, in the shape the file
 * wrote it (data-model.md § Field reading).
 *
 * A mapping stays a mapping and a list stays a list, because a reader looking
 * at their own frontmatter is looking for what they wrote. Nothing is
 * flattened into a spelling the file does not contain, and nothing is
 * summarized away.
 *
 * `ancestors` are the container nodes on the path to this one. A YAML anchor
 * can refer to a node that contains it, which is a value with no rendering and
 * no JSON form; the throw reaches `RecognitionExtraction.run`, which makes it
 * that recognition's `failed` state while the complete readable source stays
 * displayed (FR-028).
 */
function renderYamlValue(value: unknown, ancestors: readonly object[]): DeclaredValueDto {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    // `String` over the parsed value is the whole rendering: what it shows is
    // the platform's own resolution — `String(-0)` is `"0"` — accepted as is,
    // the same rule the JSON and TOML renderings apply.
    return { kind: 'scalar', text: String(value) };
  }
  if (value === null || value === undefined) {
    return { kind: 'absent' };
  }
  if (typeof value !== 'object') {
    // A symbol or function cannot come out of a YAML parse; treating it as a
    // declared-nothing keeps the mapping total without inventing text.
    return { kind: 'absent' };
  }
  if (!Array.isArray(value) && !(value instanceof Map)) {
    // An explicit YAML 1.1 tag resolves to a host object the parser built:
    // `!!timestamp` to a `Date`, `!!binary` to a `Buffer`, `!!set` to a `Set`.
    // Each has a value but no spelling this surface can show — `String()`
    // would print a locale-dependent date or `[object Set]`, neither of which
    // is in the file — and reporting it as declared-nothing would hide a
    // declaration the file made. It is the same case as a value that contains
    // itself: the recognition fails all-or-nothing and the complete authored
    // source stays readable (FR-025, FR-028).
    throw new TypeError('frontmatter declares a value with no authored rendering');
  }
  if (ancestors.includes(value)) {
    throw new TypeError('frontmatter declares a value that contains itself');
  }
  const path = [...ancestors, value];
  if (Array.isArray(value)) {
    return { kind: 'sequence', items: value.map((item) => renderYamlValue(item, path)) };
  }
  return { kind: 'mapping', entries: renderYamlEntries(value, path) };
}

/**
 * Renders one parsed mapping's entries in the authored order the parser kept,
 * in the shared declaration-entry shape the detail surfaces draw. Unlike TOML
 * and JSON, a YAML key carries its parsed type, which `keyKind` publishes;
 * the key text is the parser's resolution, quoting and escapes resolved once,
 * exactly as the value on the other side of the colon is.
 */
function renderYamlEntries(
  declared: ReadonlyMap<unknown, unknown>,
  ancestors: readonly object[] = [],
): DeclaredEntryDto[] {
  return [...declared].map(([key, value]) => {
    const resolved = resolveYamlKey(key);
    return {
      key: resolved.text,
      keyKind: resolved.kind,
      value: renderYamlValue(value, ancestors),
    };
  });
}
