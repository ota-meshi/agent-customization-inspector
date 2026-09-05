// @vitest-environment happy-dom
// T083: the read-only source surface's configuration and disposal
// (research.md § 7, FR-027).
//
// The assertions run against the composable rather than a mounted component:
// the unit project has no single-file-component compiler, and adding one
// changes the approved dependency baseline that T001 gates (the same reason
// T058 gives). What genuinely needs a rendered page — that the editor shows the
// complete authored text and that no control offers to reveal anything — is
// asserted against the real app in `tests/e2e/codex-skills-detail.spec.ts`.
//
// Monaco itself is replaced here. Loading the real editor would test Monaco;
// what is under test is the configuration this product gives it, which is the
// part that decides whether the surface is inert.
//
// Environment note: this suite mounts into a DOM element, so it names
// happy-dom explicitly — the `coverage` project runs the same files under the
// Node environment its contract and integration members need.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

/** The options the fake editor was constructed with, captured per test. */
let constructedOptions: Record<string, unknown> | null = null;
/** How many models were created and disposed, so leaks are visible. */
let createdModels = 0;
let disposedModels = 0;
let disposedEditors = 0;
/** The model the fake editor currently holds, or null. */
let attachedModel: { value: string; language: string; uri: string; dispose: () => void } | null =
  null;
/** The options passed to `updateOptions`, so the surface's name is observable. */
let updatedOptions: Record<string, unknown> | null = null;
/** Every theme name Monaco was set to, so following the display is observable. */
const themesSet: string[] = [];
/** Set to make the next `createModel` throw, for the mid-swap failure case. */
let failNextCreateModel = false;

vi.mock('monaco-editor/esm/vs/editor/editor.api.js', () => ({
  languages: { getLanguages: () => [] },
  editor: {
    create(_container: unknown, options: Record<string, unknown>) {
      constructedOptions = options;
      return {
        getModel: () => attachedModel,
        setModel: (model: typeof attachedModel) => {
          attachedModel = model;
        },
        updateOptions: (options: Record<string, unknown>) => {
          updatedOptions = { ...updatedOptions, ...options };
        },
        // The viewer sizes its container to the shown text, so the handle
        // subscribes to the editor's own content-size changes and reads its
        // height (`monaco.ts` § SourceViewerHandle.mount).
        getContentHeight: () => 0,
        onDidContentSizeChange: () => ({ dispose: () => undefined }),
        dispose: () => {
          disposedEditors += 1;
        },
      };
    },
    createModel(value: string, language: string, uri: string) {
      if (failNextCreateModel) {
        failNextCreateModel = false;
        throw new Error('environment cannot construct a model');
      }
      createdModels += 1;
      return {
        value,
        language,
        uri,
        dispose: () => {
          disposedModels += 1;
        },
      };
    },
    setTheme: (theme: string) => {
      themesSet.push(theme);
    },
  },
  Uri: { parse: (value: string) => value },
}));
// The registration table is 81 side-effect imports of Monaco internals; what it
// registers is Monaco's business, and these cases supply the resulting registry
// as data instead.
vi.mock('../../../src/app/composables/monaco-languages', () => ({}));

const { SourceViewerHandle, resolveSourceLanguage } =
  await import('../../../src/app/composables/monaco');
// The same module instance the composable reads its scheme from, so choosing
// here is the reader choosing on the page.
const { chooseColorScheme } = await import('../../../src/app/composables/color-scheme');

/** The registry entries these cases choose between, shaped as Monaco reports them. */
const REGISTERED = [
  { id: 'markdown', extensions: ['.md', '.markdown'] },
  { id: 'yaml', extensions: ['.yaml', '.yml'] },
  { id: 'shell', extensions: ['.sh', '.bash'] },
  { id: 'python', extensions: ['.py'] },
  { id: 'ini', extensions: ['.ini', '.properties'], filenames: ['.editorconfig'] },
  { id: 'javascript', extensions: ['.js', '.mjs'] },
  // The JSON service's contribution registers the `json` language itself
  // (tokens-only; monaco-languages.ts), so at runtime it is a registered
  // language like any basic one.
  { id: 'json', extensions: ['.json'] },
  // `toml` is registered from the Monarch grammar package the pinned
  // `monaco-editor` gives no equivalent for (monaco-languages.ts), so at
  // runtime it too is a registered language like any basic one.
  { id: 'toml', extensions: ['.toml'] },
  { id: 'dockerfile', extensions: ['.dockerfile'], filenames: ['Dockerfile'] },
];

beforeEach(() => {
  constructedOptions = null;
  createdModels = 0;
  disposedModels = 0;
  disposedEditors = 0;
  attachedModel = null;
  updatedOptions = null;
  failNextCreateModel = false;
  themesSet.length = 0;
});

describe('source language selection', () => {
  it('chooses by extension, never by content', () => {
    expect(resolveSourceLanguage(REGISTERED, '.agents/skills/greet/SKILL.md')).toBe('markdown');
    expect(resolveSourceLanguage(REGISTERED, '.agents/skills/g/agents/openai.yaml')).toBe('yaml');
    // The files a skill ships beside its entry point are the reason the whole
    // registry is loaded rather than a chosen few.
    expect(resolveSourceLanguage(REGISTERED, '.agents/skills/g/scripts/run.sh')).toBe('shell');
    expect(resolveSourceLanguage(REGISTERED, '.agents/skills/g/scripts/build.py')).toBe('python');
    // Codex's own configuration file, answered by the registry like any
    // other: the `toml` id claims `.toml` (monaco-languages.ts).
    expect(resolveSourceLanguage(REGISTERED, '.codex/config.toml')).toBe('toml');
  });

  it('prefers an exact file name over any extension it happens to have', () => {
    // `Dockerfile` is more specific than a suffix, and a file named for its
    // language is named that way on purpose.
    expect(resolveSourceLanguage(REGISTERED, 'skills/g/Dockerfile')).toBe('dockerfile');
    expect(resolveSourceLanguage(REGISTERED, 'skills/g/.editorconfig')).toBe('ini');
  });

  it('maps the spellings the registered languages do not claim', () => {
    // `.json` is the `json` language's own registered extension; `.jsonc`
    // takes the same tokenizer, and its comment support is the tokenizer's
    // own (monaco.ts § BORROWED_GRAMMARS).
    expect(resolveSourceLanguage(REGISTERED, '.codex/hooks.json')).toBe('json');
    expect(resolveSourceLanguage(REGISTERED, '.vscode/mcp.jsonc')).toBe('json');
  });

  it('falls back to plain text for a path nothing claims', () => {
    // Guessing from content is interpretation, and a wrong guess would colour
    // authored text as something it is not. Plain text still shows every byte.
    expect(resolveSourceLanguage(REGISTERED, 'skills/g/assets/logo.bin')).toBe('plaintext');
    expect(resolveSourceLanguage(REGISTERED, 'skills/g/LICENSE')).toBe('plaintext');
    // A leading dot is a name, not an extension: `.gitignore` has no suffix to
    // match, and treating `gitignore` as one would match by accident.
    expect(resolveSourceLanguage(REGISTERED, 'skills/g/.gitignore')).toBe('plaintext');
    // A suffix several unrelated tools use is not evidence of a syntax, so it
    // borrows no grammar: `.rules` is a spelling other products give files of
    // their own. Where a syntax is known the surface names it instead — the
    // rule detail passes Starlark's grammar for a file Codex recognizes —
    // which is why resolution by path alone answers plain text here
    // (monaco.ts § BORROWED_GRAMMARS).
    expect(resolveSourceLanguage(REGISTERED, '.codex/rules/default.rules')).toBe('plaintext');
  });
});

describe('the mounted read-only surface', () => {
  it('configures the editor as inert in both the model and the DOM', async () => {
    await SourceViewerHandle.mount(document.createElement('div'));
    expect(constructedOptions).toMatchObject({
      readOnly: true,
      domReadOnly: true,
      // An authored URL must not become something clickable, and the context
      // menu acts on a document this view does not own.
      links: false,
      contextmenu: false,
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
      // Monaco's own guidance is to leave detection alone rather than force it.
      accessibilitySupport: 'auto',
      // A wrapped line would show a break the file does not contain.
      wordWrap: 'off',
    });
    // Not named at construction: a label fixed at mount would keep naming the
    // first file after the reader moved to another one.
    expect(constructedOptions).not.toHaveProperty('ariaLabel');
  });

  it('gives every model an opaque in-memory URI', async () => {
    const viewer = await SourceViewerHandle.mount(document.createElement('div'));
    viewer.showSource('name: greet', 'skills/g/SKILL.md');
    expect(attachedModel?.value).toBe('name: greet');
    expect(createdModels).toBe(1);
    // A Source-relative Path in a model URI would put an inspected file's
    // location into a surface that has no need for it, so the URI is asserted
    // rather than assumed: opaque body, and no part of the path in it.
    expect(attachedModel?.uri).toMatch(/^inmemory:\/\/source\/[A-Za-z0-9_-]{22}$/u);
    expect(attachedModel?.uri).not.toContain('skills');
    expect(attachedModel?.uri).not.toContain('SKILL');
  });

  it('rolls a failed model swap back, previous file included (FR-027)', async () => {
    // The environment-determined failure research.md § 7 names, mid-swap:
    // the previous file's model must not survive it holding authored text —
    // the owning component disposes the editor and shows the failure
    // rendering next, and the editor disposes only the model it currently
    // holds.
    const viewer = await SourceViewerHandle.mount(document.createElement('div'));
    viewer.showSource('first', 'skills/g/SKILL.md');
    expect(disposedModels).toBe(0);
    failNextCreateModel = true;
    expect(() => viewer.showSource('second', 'skills/g/scripts/run.sh')).toThrow(
      'environment cannot construct a model',
    );
    // The previous model is disposed with the throw; nothing new was made.
    expect(createdModels).toBe(1);
    expect(disposedModels).toBe(1);
  });

  it('names the surface after the file it is showing, not the one it mounted with', async () => {
    const viewer = await SourceViewerHandle.mount(document.createElement('div'));
    viewer.showSource('first', 'skills/g/SKILL.md');
    expect(updatedOptions?.['ariaLabel']).toBe('Source of skills/g/SKILL.md, read-only');
    viewer.showSource('second', 'skills/g/scripts/run.sh');
    // Assistive technology announces the file in front of the reader; a label
    // left at the first one would announce the file they navigated away from.
    expect(updatedOptions?.['ariaLabel']).toBe('Source of skills/g/scripts/run.sh, read-only');
  });

  it('disposes the previous model when the shown file changes', async () => {
    const viewer = await SourceViewerHandle.mount(document.createElement('div'));
    viewer.showSource('first', 'skills/g/SKILL.md');
    viewer.showSource('second', 'skills/g/agents/openai.yaml');
    // A model holds the whole text; keeping the last file's alive would leave
    // authored content in memory after the view moved on.
    expect(createdModels).toBe(2);
    expect(disposedModels).toBe(1);
  });

  it('disposes the editor and its model together on teardown', async () => {
    const viewer = await SourceViewerHandle.mount(document.createElement('div'));
    viewer.showSource('name: greet', 'skills/g/SKILL.md');
    viewer.dispose();
    // Monaco does not dispose a model with its editor, so an editor-only
    // teardown would retain the authored text.
    expect(disposedEditors).toBe(1);
    expect(disposedModels).toBe(1);
  });

  it('follows the page display and unbinds those subscriptions', async () => {
    // The page draws itself in CSS system colours resolved against the scheme
    // the reader chose, and Monaco picks a theme by name, so the two are kept in
    // step. Forced colours are watched with the scheme, because the theme is one
    // value derived from the pair (WCAG 1.4.11) and Monaco's ordinary themes do
    // not meet contrast in that mode. Both are real subscriptions: left bound,
    // either would hold the disposed editor for the life of the document.
    const original = globalThis.matchMedia;
    const queries: string[] = [];
    // A real event target rather than an add/remove stub that records its calls:
    // the composable binds the forced-colours listener under an `AbortSignal`,
    // which only a platform event target honours, so a stub would report a
    // subscription still bound where a browser has none. Only the members the
    // composable touches; the cast goes through `unknown` because a stub of the
    // whole `MediaQueryList` surface would be unused members of noise around the
    // subscription under test.
    const displays: EventTarget[] = [];
    globalThis.matchMedia = ((query: string) => {
      queries.push(query);
      const display = Object.assign(new EventTarget(), { matches: true });
      displays.push(display);
      return display;
    }) as unknown as typeof globalThis.matchMedia;
    chooseColorScheme('dark');
    try {
      const viewer = await SourceViewerHandle.mount(document.createElement('div'));
      // The scheme is the page's own value rather than a media query, so a mount
      // opens exactly one display query: the forced-colours one.
      expect(queries).toEqual(['(forced-colors: active)']);
      // Forced colours match in this stub and the reader has chosen dark, so the
      // theme is the dark high-contrast one. Monaco's own detection is off,
      // because an explicit `theme` wins over it and would otherwise leave a
      // low-contrast theme in forced colours.
      expect(constructedOptions?.['theme']).toBe('hc-black');
      expect(constructedOptions?.['autoDetectHighContrast']).toBe(false);
      // Every handle mounted earlier in this suite is still following the same
      // page scheme — Monaco's theme is global, so a change reaches all of them —
      // and each of those reports the plain pair, because only this case's
      // stubbed display has forced colours. Reading the high-contrast themes is
      // therefore reading exactly what the handle under test set.
      const highContrast = (): string[] => themesSet.filter((theme) => theme.startsWith('hc-'));
      // A change on either half re-sets the theme while the handle is alive.
      themesSet.length = 0;
      chooseColorScheme('light');
      await nextTick();
      for (const display of displays) {
        display.dispatchEvent(new Event('change'));
      }
      expect(highContrast()).toEqual(['hc-light', 'hc-light']);
      // After disposal neither reaches Monaco at all.
      viewer.dispose();
      themesSet.length = 0;
      chooseColorScheme('dark');
      await nextTick();
      for (const display of displays) {
        display.dispatchEvent(new Event('change'));
      }
      expect(highContrast()).toEqual([]);
    } finally {
      globalThis.matchMedia = original;
    }
  });
});
