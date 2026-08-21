// @vitest-environment happy-dom
// T193: the read-only source-comparison surface's configuration and disposal
// (research.md § 7, FR-011, FR-027).
//
// The assertions run against the composable rather than a mounted component:
// the unit project has no single-file-component compiler (the same reason
// T083 gives). What genuinely needs a rendered page — the complete diff on
// screen, the side-by-side fallback, keyboard access — is asserted against
// the real app in `tests/e2e/skills-comparison.spec.ts`.
//
// Monaco itself is replaced here. Loading the real editor would test Monaco;
// what is under test is the configuration this product gives its diff editor,
// which is the part that decides whether the comparison surface is inert:
// read-only on both sides, no link, no revert affordance, and models that are
// created and disposed deterministically.
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** The options the fake diff editor was constructed with, captured per test. */
let constructedOptions: Record<string, unknown> | null = null;
/** How many models were created and disposed, so leaks are visible. */
let createdModels = 0;
let disposedModels = 0;
let disposedEditors = 0;
/** One fake text model. */
interface FakeModel {
  value: string;
  language: string;
  uri: string;
  dispose: () => void;
}
/** The model pair the fake diff editor currently holds, or null. */
let attachedModel: { original: FakeModel; modified: FakeModel } | null = null;
/** Set to make the next `createDiffEditor` throw, for the failure case. */
let failNextCreate = false;
/** Makes `createModel` throw once this many models were created; null = never. */
let failCreateModelAfter: number | null = null;
/** The options applied to each inner editor after construction. */
let originalEditorOptions: Record<string, unknown> | null = null;
let modifiedEditorOptions: Record<string, unknown> | null = null;
/** A configuration listener as the handle registers it on an inner editor. */
type ConfigurationListener = (event: { hasChanged: (id: number) => boolean }) => void;
/** The registered listeners per inner editor, so a label wipe can be simulated. */
const originalConfigurationListeners: ConfigurationListener[] = [];
const modifiedConfigurationListeners: ConfigurationListener[] = [];

/** One fake inner editor: captured options plus configuration listeners. */
function fakeInnerEditor(
  apply: (updated: Record<string, unknown>) => void,
  listeners: ConfigurationListener[],
): {
  updateOptions: (updated: Record<string, unknown>) => void;
  onDidChangeConfiguration: (listener: ConfigurationListener) => { dispose: () => void };
} {
  return {
    updateOptions: apply,
    onDidChangeConfiguration: (listener: ConfigurationListener) => {
      listeners.push(listener);
      return {
        dispose: () => {
          listeners.splice(listeners.indexOf(listener), 1);
        },
      };
    },
  };
}

vi.mock('monaco-editor/esm/vs/editor/editor.api.js', () => ({
  languages: {
    getLanguages: () => [
      { id: 'markdown', extensions: ['.md'] },
      { id: 'shell', extensions: ['.sh'] },
    ],
  },
  editor: {
    // The one option identifier the handle's relabelling consults; an
    // arbitrary stable number, as in Monaco's own enum.
    EditorOption: { ariaLabel: 4 },
    create() {
      throw new Error('the comparison surface must not create a single-file editor');
    },
    createDiffEditor(_container: unknown, options: Record<string, unknown>) {
      if (failNextCreate) {
        failNextCreate = false;
        throw new Error('environment cannot construct a diff editor');
      }
      constructedOptions = options;
      const originalEditor = fakeInnerEditor((updated) => {
        originalEditorOptions = { ...originalEditorOptions, ...updated };
      }, originalConfigurationListeners);
      const modifiedEditor = fakeInnerEditor((updated) => {
        modifiedEditorOptions = { ...modifiedEditorOptions, ...updated };
      }, modifiedConfigurationListeners);
      return {
        getModel: () => attachedModel,
        setModel: (model: typeof attachedModel) => {
          attachedModel = model;
        },
        getOriginalEditor: () => originalEditor,
        getModifiedEditor: () => modifiedEditor,
        dispose: () => {
          disposedEditors += 1;
        },
      };
    },
    createModel(value: string, language: string, uri: string) {
      if (failCreateModelAfter !== null && createdModels >= failCreateModelAfter) {
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
    setTheme: () => undefined,
  },
  Uri: { parse: (value: string) => value },
}));
// The registration table is 81 side-effect imports of Monaco internals; what it
// registers is Monaco's business, and these cases supply the resulting registry
// as data instead.
vi.mock('../../../src/app/composables/monaco-languages', () => ({}));

const { SourceDiffHandle } = await import('../../../src/app/composables/monaco');

/** The comparison every case mounts unless it says otherwise. */
const COMPARISON = {
  originalText: '# alpha\ntoken: ghp_LEFT\n',
  originalPath: '.agents/skills/alpha/SKILL.md',
  modifiedText: '# beta\ntoken: ghp_RIGHT\n',
  modifiedPath: '.agents/skills/beta/SKILL.md',
} as const;

beforeEach(() => {
  constructedOptions = null;
  createdModels = 0;
  disposedModels = 0;
  disposedEditors = 0;
  attachedModel = null;
  failNextCreate = false;
  failCreateModelAfter = null;
  originalEditorOptions = null;
  modifiedEditorOptions = null;
  originalConfigurationListeners.length = 0;
  modifiedConfigurationListeners.length = 0;
});

describe('the mounted read-only comparison surface', () => {
  it('configures both sides as read-only with no link and no revert affordance', async () => {
    await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    expect(constructedOptions).toMatchObject({
      readOnly: true,
      domReadOnly: true,
      // The original side must not be editable either: `readOnly` governs the
      // modified editor, and `originalEditable` is the switch for the other.
      originalEditable: false,
      // An authored URL must not become something clickable, the context menu
      // acts on documents this view does not own, and the margin's revert
      // arrow is an edit affordance on a surface that must propose no change
      // (FR-012).
      links: false,
      contextmenu: false,
      renderMarginRevertIcon: false,
      // The comparison is literal: Monaco's default ignores leading and
      // trailing whitespace, which would render two lines differing only in
      // that whitespace as unchanged (FR-011, FR-025).
      ignoreTrimWhitespace: false,
      // And uncapped: the default is a five-second cutoff that silently
      // settles for a partial diff, a product-defined ceiling research.md
      // § 7 rules out.
      maxComputationTime: 0,
      // Monaco's own guidance is to leave detection alone rather than force
      // it; the verbose diff messages are the accessible-comparison surface.
      accessibilitySupport: 'auto',
      accessibilityVerbose: true,
      quickSuggestions: false,
      wordBasedSuggestions: 'off',
      // A wrapped line would show a break neither file contains.
      wordWrap: 'off',
      autoDetectHighContrast: false,
    });
    // The Unicode highlighter is a linter, and FR-032 forbids this surface
    // from acting as one.
    expect(constructedOptions?.['unicodeHighlight']).toMatchObject({
      nonBasicASCII: false,
      invisibleCharacters: false,
      ambiguousCharacters: false,
    });
    // ARIA messages go into the composable's own emptied element, not
    // Monaco's default under `document.body`, which outlives every editor
    // (FR-027).
    expect(constructedOptions?.['ariaContainerElement']).toBeInstanceOf(HTMLElement);
  });

  it('names each side after its file on the inner editors, after construction', async () => {
    await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    // Applied post-construction, not through the construction options:
    // Monaco's initial option synchronization discards construction-time
    // side labels (verified against the packaged editor), and an unnamed
    // side would announce only the default accessibility-help hint.
    expect(originalEditorOptions?.['ariaLabel']).toBe(
      'First compared file .agents/skills/alpha/SKILL.md, read-only',
    );
    expect(modifiedEditorOptions?.['ariaLabel']).toBe(
      'Second compared file .agents/skills/beta/SKILL.md, read-only',
    );
  });

  it('names a serialized slice as what it shows, never as the whole file', async () => {
    // A comparison of serialized declarations — the frontmatter YAML diff,
    // the MCP declaration JSON diff — passes a content label, because a
    // surface that announced the slice as the compared file would misreport
    // it (FR-025): the same slice-naming contract as the single-file
    // viewer's `contentLabel`.
    await SourceDiffHandle.mount(document.createElement('div'), {
      ...COMPARISON,
      contentLabel: 'frontmatter of',
    });
    expect(originalEditorOptions?.['ariaLabel']).toBe(
      'First compared frontmatter of .agents/skills/alpha/SKILL.md, read-only',
    );
    expect(modifiedEditorOptions?.['ariaLabel']).toBe(
      'Second compared frontmatter of .agents/skills/beta/SKILL.md, read-only',
    );
  });

  it('names an absent side as the stated absence, not as a file', async () => {
    // A one-sided comparison passes empty text for the missing counterpart:
    // the empty model is diff arithmetic, and the label must not present it
    // as a file the copy does not ship (FR-025).
    await SourceDiffHandle.mount(document.createElement('div'), {
      ...COMPARISON,
      modifiedText: '',
      modifiedAbsent: true,
    });
    expect(originalEditorOptions?.['ariaLabel']).toBe(
      'First compared file .agents/skills/alpha/SKILL.md, read-only',
    );
    expect(modifiedEditorOptions?.['ariaLabel']).toBe(
      'Second side: no file at .agents/skills/beta/SKILL.md',
    );
  });

  it('rolls the whole construction back when a model fails mid-mount (FR-027)', async () => {
    // The environment-determined failure research.md § 7 names, landing
    // between the two model creations: the already-created model holds one
    // side's authored text, and nothing would ever dispose it past the
    // throw the caller's fallback handles — so the mount disposes the
    // model, the editor, and every listener before rethrowing.
    failCreateModelAfter = 1;
    await expect(SourceDiffHandle.mount(document.createElement('div'), COMPARISON)).rejects.toThrow(
      'environment cannot construct a model',
    );
    expect(createdModels).toBe(1);
    expect(disposedModels).toBe(1);
    expect(disposedEditors).toBe(1);
    expect(originalConfigurationListeners).toHaveLength(0);
    expect(modifiedConfigurationListeners).toHaveLength(0);
  });

  it('creates two complete literal models with opaque in-memory URIs', async () => {
    await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    expect(createdModels).toBe(2);
    // Complete literal source on both sides: the exact `sourceText` values,
    // credentials included, with nothing masked or shortened (FR-011).
    expect(attachedModel?.original.value).toBe(COMPARISON.originalText);
    expect(attachedModel?.modified.value).toBe(COMPARISON.modifiedText);
    // The language comes from each side's own path.
    expect(attachedModel?.original.language).toBe('markdown');
    expect(attachedModel?.modified.language).toBe('markdown');
    // A Source-relative Path in a model URI would put an inspected file's
    // location into a surface that has no need for it.
    for (const uri of [attachedModel?.original.uri, attachedModel?.modified.uri]) {
      expect(uri).toMatch(/^inmemory:\/\/source\/[A-Za-z0-9_-]{22}$/u);
      expect(uri).not.toContain('skills');
      expect(uri).not.toContain('SKILL');
    }
    expect(attachedModel?.original.uri).not.toBe(attachedModel?.modified.uri);
  });

  it('registers the same-origin worker factory and no other worker source', async () => {
    await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    // The diff is computed in Monaco's editor worker. The factory is the one
    // `loadMonaco` registers — a Vite `?worker` import emitted beside the
    // bundle — so the comparison reaches the same origin and nothing else:
    // no `getWorkerUrl` string, no blob, no CDN.
    expect(typeof self.MonacoEnvironment?.getWorker).toBe('function');
    expect(self.MonacoEnvironment).not.toHaveProperty('getWorkerUrl');
  });

  it('restores the side labels when a later option sync wipes them, until disposal', async () => {
    const viewer = await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    // The responsive switch between side-by-side and inline layout reapplies
    // the diff options to the inner editors and wipes both labels (verified
    // against the packaged editor by resizing across the breakpoint), so the
    // handle restores them on any configuration change touching `ariaLabel`.
    originalEditorOptions = { ...originalEditorOptions, ariaLabel: undefined };
    modifiedEditorOptions = { ...modifiedEditorOptions, ariaLabel: undefined };
    for (const listener of [...originalConfigurationListeners, ...modifiedConfigurationListeners]) {
      listener({ hasChanged: (id) => id === 4 });
    }
    expect(originalEditorOptions?.['ariaLabel']).toBe(
      'First compared file .agents/skills/alpha/SKILL.md, read-only',
    );
    expect(modifiedEditorOptions?.['ariaLabel']).toBe(
      'Second compared file .agents/skills/beta/SKILL.md, read-only',
    );
    // Disposal unbinds the restorers with the editor they would revive.
    viewer.dispose();
    expect(originalConfigurationListeners).toEqual([]);
    expect(modifiedConfigurationListeners).toEqual([]);
  });

  it('disposes the editor and both models together on teardown', async () => {
    const viewer = await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
    viewer.dispose();
    // Monaco does not dispose models with their editor, so an editor-only
    // teardown would retain both files' authored text (FR-027).
    expect(disposedEditors).toBe(1);
    expect(disposedModels).toBe(2);
  });

  it('propagates a construction failure so the caller can fall back', async () => {
    // The fallback itself is the component's: the complete side-by-side
    // source stays available as inert text. What the composable owes it is an
    // environment failure that surfaces instead of half-mounting.
    failNextCreate = true;
    await expect(SourceDiffHandle.mount(document.createElement('div'), COMPARISON)).rejects.toThrow(
      'environment cannot construct a diff editor',
    );
    expect(createdModels).toBe(0);
  });

  it('follows the page display and unbinds those subscriptions', async () => {
    // The page uses CSS system colours and Monaco picks a theme by name, so
    // the two are kept in step; forced colours are watched with the scheme
    // because the theme is one value derived from the pair (WCAG 1.4.11).
    // Left bound, either listener would hold the disposed editor for the life
    // of the document.
    const bound: string[] = [];
    const original = globalThis.matchMedia;
    const queries: string[] = [];
    globalThis.matchMedia = ((query: string) => {
      queries.push(query);
      return {
        matches: true,
        addEventListener: (type: string) => {
          bound.push(type);
        },
        removeEventListener: (type: string) => {
          bound.splice(bound.indexOf(type), 1);
        },
      };
    }) as unknown as typeof globalThis.matchMedia;
    try {
      const viewer = await SourceDiffHandle.mount(document.createElement('div'), COMPARISON);
      expect(queries).toEqual(['(prefers-color-scheme: dark)', '(forced-colors: active)']);
      expect(bound).toEqual(['change', 'change']);
      expect(constructedOptions?.['theme']).toBe('hc-black');
      viewer.dispose();
      expect(bound).toEqual([]);
    } finally {
      globalThis.matchMedia = original;
    }
  });
});
