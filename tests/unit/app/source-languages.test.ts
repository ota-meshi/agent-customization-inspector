// T1206: which grammar a path is coloured by (research.md § 7, FR-033).
//
// The real registration table is consulted rather than a sample of it: what is
// under test is that the formats this product's own kinds are written in
// resolve through shiki's own names, and that is a fact about that table.
import { describe, expect, it } from 'vitest';
import {
  PLAIN_TEXT,
  bundledLanguage,
  resolveSourceLanguage,
} from '../../../src/app/composables/source-languages';

describe('resolveSourceLanguage', () => {
  it("chooses by extension through shiki's own names, never by content", () => {
    expect(resolveSourceLanguage('.agents/skills/greet/SKILL.md')).toBe('markdown');
    expect(resolveSourceLanguage('.agents/skills/g/agents/openai.yaml')).toBe('yaml');
    expect(resolveSourceLanguage('.github/workflows/ci.yml')).toBe('yaml');
    expect(resolveSourceLanguage('.codex/config.toml')).toBe('toml');
    expect(resolveSourceLanguage('.codex/hooks.json')).toBe('json');
    expect(resolveSourceLanguage('.vscode/mcp.jsonc')).toBe('jsonc');
    // The files a skill ships beside its entry point are the reason the whole
    // table is consulted rather than a chosen few.
    expect(resolveSourceLanguage('.agents/skills/g/scripts/run.sh')).toBe('shellscript');
    expect(resolveSourceLanguage('.agents/skills/g/scripts/build.py')).toBe('python');
    expect(resolveSourceLanguage('.agents/skills/g/scripts/build.mjs')).toBe('javascript');
  });

  it('answers with an id, never an alias, and matches the extension case-insensitively', () => {
    // `.yml` is an alias of `yaml`; what a surface asks the highlighter for is
    // the id, which is the name a loaded grammar is listed under.
    expect(resolveSourceLanguage('a.YML')).toBe('yaml');
    expect(resolveSourceLanguage('README.MD')).toBe('markdown');
  });

  it('falls back to plain text for a path nothing claims', () => {
    // Guessing from content is interpretation, and a wrong guess would colour
    // authored text as something it is not. Plain text still shows every byte.
    expect(resolveSourceLanguage('skills/g/assets/logo.bin')).toBe(PLAIN_TEXT);
    expect(resolveSourceLanguage('skills/g/LICENSE')).toBe(PLAIN_TEXT);
    // A leading dot is a name, not an extension: `.gitignore` has no suffix to
    // match, and treating `gitignore` as one would match by accident.
    expect(resolveSourceLanguage('skills/g/.gitignore')).toBe(PLAIN_TEXT);
    // A trailing dot names an empty suffix.
    expect(resolveSourceLanguage('skills/g/notes.')).toBe(PLAIN_TEXT);
    // A suffix several unrelated tools use is not a language's name, so it
    // borrows no grammar. Where a syntax is known the surface names it — the
    // rule detail passes Starlark's grammar for a file Codex recognizes —
    // which is why resolution by path alone answers plain text here.
    expect(resolveSourceLanguage('.codex/rules/default.rules')).toBe(PLAIN_TEXT);
  });

  it('looks up the extension only, never the whole file name', () => {
    // `Dockerfile` is a name rather than a suffix written as a language's
    // name, and a file that happens to be called `go` is not a Go file.
    expect(resolveSourceLanguage('skills/g/Dockerfile')).toBe(PLAIN_TEXT);
    expect(resolveSourceLanguage('skills/g/go')).toBe(PLAIN_TEXT);
  });
});

describe('bundledLanguage', () => {
  it('answers an id and each of its aliases with the one registration', () => {
    expect(bundledLanguage('python')?.id).toBe('python');
    expect(bundledLanguage('py')).toBe(bundledLanguage('python'));
  });

  it('answers nothing for plain text, which needs no grammar', () => {
    expect(bundledLanguage(PLAIN_TEXT)).toBeUndefined();
  });
});
