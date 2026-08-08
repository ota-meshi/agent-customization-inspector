// The YAML frontmatter of a Markdown document, read under this product's fixed
// semantics (T087; data-model.md § Field reading).
//
// Nothing here renders, links, fetches, or executes, and nothing here decides
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
// Nothing is extracted here either: this module resolves the block and hands
// back what it resolved to. Which values a recognition then reads, and how the
// detail surface draws them, belongs to `recognizers/candidate.ts`.
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import type { DocumentOptions, ParseOptions, SchemaOptions, ToJSOptions } from 'yaml';

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
   * from the string that spells it.
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
   * What the frontmatter block resolved to. A mapping is a `Map` in authored
   * key order; a block written as a list or a bare scalar is that array or
   * scalar. A document with no block, and a block with nothing in it, both
   * resolve to an empty plain object — the parser's own answer for "no
   * mapping was read", which is why a caller tests for `Map` rather than for
   * emptiness. None of them is a failure.
   */
  public readonly frontmatter: unknown;

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
   * Throws when a block is present but its YAML cannot be parsed. The caller
   * is `extraction.ts`, which confines the throw to the recognition that asked
   * for it and leaves the file's complete readable source displayed (FR-028).
   */
  public constructor(sourceText: string) {
    const file = new VFile({ value: sourceText });
    // `strip` is what makes the body the parser's own answer: it removes
    // exactly the block `vfile-matter` recognized, fences and all.
    matter(file, { yaml: YAML_PARSE_OPTIONS, strip: true });
    this.frontmatter = file.data.matter;
    this.body = String(file.value);
  }
}
