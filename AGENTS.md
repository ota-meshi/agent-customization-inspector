# Repository Instructions

[日本語](AGENTS.ja.md)

## Documentation language policy

- Create and maintain both English and Japanese versions of every human-authored repository document.
- Add or update both language versions in the same change. A documentation task is not complete while either version is missing or outdated.
- Use the canonical `*.md` filename for English and the matching `*.ja.md` filename for Japanese. For names required by tools or community conventions, keep the required filename (for example, `AGENTS.md`) and add the Japanese companion beside it (for example, `AGENTS.ja.md`).
- Keep both versions semantically equivalent. They do not need to be word-for-word translations, but requirements, warnings, examples, links, and status information must agree.
- Preserve code, commands, paths, package names, API names, identifiers, and URLs unless localization is necessary for the example itself.
- When practical, link each language version to its counterpart near the top of the document.
- Before completing a documentation change, compare both versions for omissions, stale statements, and inconsistent technical details.
- This policy applies to new documents and to existing documents whenever they are modified. Generated files and vendored third-party documentation are excluded.

## Pull request writing style

- Write pull request titles and descriptions in concise, natural language for human reviewers.
- Write the entire pull request description in English. Do not include a Japanese translation or duplicate the description in multiple languages.
- Do not use `Summary` as a generic heading in a pull request description.
- For a short pull request, avoid stacking template-like sections such as `Scope`, `Key decisions`, and `Verification`. Prefer a few direct paragraphs, and use headings or lists only when the content genuinely needs them.
- Focus on what the pull request proposes and why it matters. Do not narrate implementation history, restoration steps, or the commit sequence unless that context is necessary for review.
- Remove boilerplate, redundant framing, and self-referential process notes before publishing or updating a pull request.
