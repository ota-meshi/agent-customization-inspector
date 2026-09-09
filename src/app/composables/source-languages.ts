// Which grammar colours a file, decided from its path alone (T1206;
// research.md § 7, FR-033).
//
// The path decides, never the content: guessing from what a file looks like
// inside is interpretation, and a mis-guess would colour authored text as
// something it is not. A path nothing claims is plain text, which is the
// honest answer and still shows every character.
//
// The names a path is matched against are shiki's own — every bundled
// language's id and aliases, the table a fenced code block's ```md is resolved
// by — so no extension table is authored or maintained here. An extension is
// looked up as one of those names: `.md` finds `markdown` through its `md`
// alias, `.yml` finds `yaml`, and `.toml` is an id itself. What the table does
// not spell — `.h`, `.svg`, `Gemfile` — is plain text, which is the answer a
// suffix no grammar claimed has always got. Only the extension is looked up,
// never the whole file name: a name is not written as a language's name the
// way an extension is, so `Dockerfile` is plain text rather than a claim, and
// a file that merely happens to be called `go` or `c` is not coloured as that
// language.
import type { BundledLanguageInfo } from 'shiki/core';
import { bundledLanguagesInfo } from 'shiki/langs';

/**
 * The language a file with no claim gets: shown exactly as authored,
 * uncoloured. One of shiki's special languages, so it needs no grammar and
 * tokenizes to one uncoloured run per line.
 */
export const PLAIN_TEXT = 'plaintext';

/**
 * Every bundled language under each name it answers to — its id and its
 * aliases — built once from shiki's own registration table. The names are
 * registered lower-case, and an extension is lower-cased before it is looked
 * up, so `README.MD` finds Markdown as `README.md` does.
 */
const LANGUAGE_BY_NAME: ReadonlyMap<string, BundledLanguageInfo> = new Map(
  bundledLanguagesInfo.flatMap((language) =>
    [language.id, ...(language.aliases ?? [])].map((name) => [name, language] as const),
  ),
);

/**
 * The bundled language registered under `name` — an id or an alias — with the
 * loader that fetches its grammar chunk; undefined for a name shiki bundles no
 * grammar for, {@link PLAIN_TEXT} included, which needs none.
 */
export function bundledLanguage(name: string): BundledLanguageInfo | undefined {
  return LANGUAGE_BY_NAME.get(name);
}

/**
 * Chooses the language for one Source-relative Path: the bundled language
 * whose id or alias its extension spells, or {@link PLAIN_TEXT} (see the
 * module comment). The result is a language id, never an alias, so a surface
 * that asks whether a grammar is loaded asks by the name shiki reports.
 */
export function resolveSourceLanguage(sourceRelativePath: string): string {
  const name = sourceRelativePath.slice(sourceRelativePath.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  // A dot at position 0 is a leading dot — `.gitignore` is a name, not an
  // extension — so it names no suffix to look up.
  if (dot <= 0) {
    return PLAIN_TEXT;
  }
  return LANGUAGE_BY_NAME.get(name.slice(dot + 1).toLowerCase())?.id ?? PLAIN_TEXT;
}
