// The YAML frontmatter of a Markdown document, read under this product's fixed
// semantics (T087; data-model.md § DeclaredMetadataEntry).
//
// Nothing here renders, links, fetches, or executes, and nothing here decides
// anything about either format. `vfile-matter` finds the frontmatter block and
// parses it; this module chooses the semantics it is parsed under and hands the
// result back. Deciding where a block begins and ends would mean re-deciding
// line endings, the closing-fence forms, and what counts as a fence at all —
// the same "looks like the format but isn't" trap the selector grammar refuses
// — and a second opinion about a format is a second opinion that can disagree.
//
// What comes back is what a parser resolves, which is what the agent reading
// the file gets: `007` is `7`, a key declared twice is its later declaration,
// an alias is the value it points at, and a tag the core schema does not
// resolve leaves the scalar it carried. None of those is rejected and none is
// converted. This product says what a product would read out of a
// customization; it is not a validator standing between the two, and the
// complete authored bytes are on the same screen in the source viewer for
// anyone who needs the spelling.
//
// Authored import and reference targets are not extracted here. An extractor
// may publish only fields the recognition's presentation-allowlist row names,
// and the Codex `skill` row names two frontmatter scalars and no reference
// field at all (contracts/vendors/openai-codex.md § Normative initial-release
// presentation allowlist). Import extraction therefore arrives with the first
// phase whose row has such a field.
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import type { DocumentOptions, ParseOptions, SchemaOptions } from 'yaml';

/**
 * The YAML semantics a frontmatter block is read under.
 *
 * Stated rather than left to the parser's defaults, because these are the
 * product's commitments and not incidental: YAML 1.1 would resolve `yes` to a
 * boolean and `12:30` to a sexagesimal number, and a customization's fields
 * would mean something other than what its author's tools read.
 */
const YAML_PARSE_OPTIONS: ParseOptions & DocumentOptions & SchemaOptions = {
  /** YAML 1.2, whose core schema also leaves merge keys out. */
  version: '1.2',
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
 * The value a Markdown document's YAML frontmatter resolves to.
 *
 * A document with no frontmatter block and one with an empty block both resolve
 * to an empty object: neither declares a field, and neither is a failure.
 *
 * Throws when a block is present but its YAML cannot be parsed. The caller is
 * `extraction.ts`, which confines the throw to the recognition that asked for
 * it and leaves the file's complete readable source displayed (FR-028).
 */
export function parseFrontmatter(sourceText: string): unknown {
  const file = new VFile({ value: sourceText });
  matter(file, { yaml: YAML_PARSE_OPTIONS });
  return file.data.matter;
}
