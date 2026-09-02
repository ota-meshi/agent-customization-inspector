// The formats a surface tells the viewer the text is in — what each is called
// where the viewer names it, and which registered grammar colours it (T1186).
//
// A closed union rather than a string, because the panel band says which format
// the text is in: with a `string` the label table could be missing a member and
// still compile, and a band naming nothing is worse than no band. Every value a
// caller passes is a format this product decided on, never one read out of a
// file, so the set is closable.
//
// The name and the grammar are two facts, not one. A format is not always
// tokenized by a grammar of its own name — Starlark has no registration of its
// own here and borrows Python's, which its vendor's own page uses for the same
// examples — so folding the two together made the band call a `.rules` policy
// Python, which is not what the file is.
//
// The union lives here rather than in `SourceViewer.vue` because a
// `<script setup>` block exports nothing, so the callers that build its props
// have no other place to import it from.

/**
 * A format the viewer is told the text is in, overriding what the file's path
 * claims (`monaco.ts` § showSource). Only the formats this product's own
 * surfaces name are members: a caller showing a file whole passes none and the
 * path decides.
 */
export type SourceViewerLanguage =
  /** A frontmatter block, or a declaration set serialized as one document. */
  | 'yaml'
  /** A file's instructions, or any Markdown body shown apart from its frontmatter. */
  | 'markdown'
  /** A declaration set serialized as JSON — a hook event, an MCP server, a plugin. */
  | 'json'
  /** The language a Codex `.rules` permission policy is written in. */
  | 'starlark';

/**
 * What the viewer's panel band calls each format, beside the union so a new
 * member cannot compile without its name (AGENTS.md § User-visible copy
 * policy). These are the formats' own names rather than a tokenizer's
 * identifier: a band saying `yaml` would be showing a token where a reader
 * expects a word, and one saying `Python` over a Starlark policy would be
 * naming the wrong language.
 */
export const SOURCE_VIEWER_LANGUAGE_TEXT: Readonly<Record<SourceViewerLanguage, string>> = {
  /** The format's own name, capitalized as its specification writes it. */
  yaml: 'YAML',
  /** As above. */
  markdown: 'Markdown',
  /** As above. */
  json: 'JSON',
  /** As above. */
  starlark: 'Starlark',
};

/**
 * The registered Monaco language each format is coloured by. Its own table
 * because a format and the grammar that tokenizes it are not the same fact:
 * the editor ships no Starlark grammar, and Starlark's syntax is Python's for
 * everything a policy writes — which is what the vendor's own page presents
 * its examples in. Colouring is tokenizing rather than validating, so a
 * borrowed grammar marks nothing invalid (FR-033).
 */
export const SOURCE_VIEWER_LANGUAGE_GRAMMAR: Readonly<Record<SourceViewerLanguage, string>> = {
  /** Registered under its own name. */
  yaml: 'yaml',
  /** As above. */
  markdown: 'markdown',
  /** As above. */
  json: 'json',
  /** Borrowed: the editor registers no Starlark, and Starlark is Python-shaped. */
  starlark: 'python',
};
