// Ambient types for the Monaco JSON service's local tokenizer module.
//
// The module ships no declaration file of its own — the service's types are
// published only through the bundled `monaco.d.ts` namespace, which the
// deliberately narrow `esm/vs/editor/editor.api.js` import path does not
// carry. The runtime module genuinely exports `createTokenizationSupport`,
// so this declaration covers exactly the one export `monaco-languages.ts`
// wires to the `json` id, and nothing more — the module is imported instead
// of the service contribution precisely so no worker-backed feature can
// ship (tests/package/monaco-assets.test.ts, research.md § 7).
declare module 'monaco-editor/esm/vs/language/json/tokenization.js' {
  import type { languages } from 'monaco-editor/esm/vs/editor/editor.api.js';

  /**
   * Builds the JSON tokens provider the service registers for its `tokens`
   * feature: local scanning code with no worker behind it. `supportComments`
   * decides whether line and block comments scan as comment tokens — on
   * here, because `.jsonc` borrows the same tokenizer (monaco.ts §
   * BORROWED_GRAMMARS).
   */
  export function createTokenizationSupport(supportComments: boolean): languages.TokensProvider;
}
