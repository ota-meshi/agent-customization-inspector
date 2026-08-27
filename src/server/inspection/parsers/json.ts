// The JSON-family parsing seam of the inspection module (T321, T371), the
// JSON counterpart of `toml.ts` and `markdown.ts`: it turns one
// already-decoded string into the parsed document and hands it back, deciding
// nothing about the format itself and extracting nothing from the result.
// What a caller reads out of the document — the Claude carrier's `mcpServers`
// map — is that caller's own contract, and vendor-specific readings live
// beside the rules that own them, never here.
//
// One document, whose constructor decides the format from the `(tool, path)`
// it is built for, and deliberately never a leniency flag a caller passes:
// strict JSON goes straight through `JSON.parse`, so a comment or a trailing
// comma fails the document exactly as a strict reader would, while a carrier
// whose reader accepts comments has that syntax blanked
// (`strip-json-comments`) and the remainder handed to the same `JSON.parse`.
// Which of the two a reading gets is therefore not the reading's decision:
// this module holds the whole answer and the evidence for it, per
// `(tool, path)` — the root `.mcp.json` is read leniently by Copilot, whose
// editor host takes it through `parseJSONC`, and strictly by Claude Code,
// which reports a comment in it as a parse failure (see the tables below).
//
// The document publishes its declarations rendered once into the shared
// declaration-entry shape the detail surfaces draw (`DeclaredEntryDto`), in
// the parser's resolved order — the platform's own enumeration of the parsed
// object, in which integer-like keys come first in numeric order whatever
// the file's spelling ordered. That is a JavaScript property of every plain
// parsed object, and it is accepted rather than worked around: recovering
// the authored order would mean parsing the text a second time through a
// syntax tree, complexity no consumer has asked for
// (contracts/http-api.md § get-mcp-carrier-detail spells the
// order as the parser's). How a JSON value spells itself
// is the format's own fact, exactly as the TOML rendering in `toml.ts` and
// the YAML rendering in `markdown.ts` are their formats', so every vendor
// reading declarations out of JSON
// publishes them identically, and the rendering never leaves this module.
// Unlike `ParsedTomlDocument`, no typed raw view is exposed: the one shipped
// value-consuming reading — the configuration read that needs the parser's
// type system — has no JSON member, and the view arrives with the phase that
// needs it.
//
// The parse reads one string and touches nothing else: no I/O, no execution,
// no path resolution; memory and time capacity are the environment's, with no
// Inspector numeric cap (FR-029).
import stripJsonComments from 'strip-json-comments';
import type { DeclaredEntryDto, DeclaredValueDto } from '../../../shared/api-types';
import type { SupportedTool } from '../../../shared/entities';

/**
 * What `JSON.parse` can resolve a document node to. Declared here because the
 * platform types the parse result as `any`; this closed union is the honest
 * shape the rendering below narrows over.
 */
type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * Which reading a document is built for: the tool whose recognition is reading
 * it, and the Source-relative Path it was admitted at
 * (`recognizers/candidate.ts` § RecognitionInput), spelled with `/` and the
 * exact entry names.
 *
 * Both, because a format is a fact about the reader and the file together
 * rather than about the file: `.claude/settings.json` is read strictly by
 * Claude Code and as JSONC by Copilot's VS Code surface, and a product's
 * recognition of a shared file is its own (FR-004).
 */
export interface JsonDocumentContext {
  /** The tool whose recognition is reading the file. */
  readonly tool: SupportedTool;
  /** The Source-relative Path the file was admitted at. */
  readonly sourceRelativePath: string;
}

/**
 * One JSON-family document as the parser resolved it, in the format the
 * reading it was built for takes. The class mirrors `ParsedTomlDocument` and
 * `ParsedMarkdownDocument`: the constructor is the parse, and the field is the
 * document's one rendering — never an extraction, which stays the caller's
 * contract.
 *
 * A carrier whose reader accepts comments has that syntax and a trailing comma
 * blanked to whitespace before the same `JSON.parse` runs, so one resolution
 * serves the whole family and the two formats cannot drift in duplicate-key
 * semantics, `__proto__` handling (an ordinary own property under
 * `JSON.parse`), or the accepted enumeration order. Comments are the format's
 * own syntax rather than declarations, so nothing of them reaches an entry, and
 * blanking repairs nothing else: any syntax error in the remainder fails the
 * document whole (FR-028).
 *
 * Deliberately not `jsonc-parser`: its `parse()` builds objects that cannot
 * hold an authored `__proto__` key, so a `.vscode/mcp.json` server of that name
 * would vanish with no diagnostic, and reading its syntax tree instead would
 * mean re-implementing this module's rendering over a second node shape — a
 * hand-built detour around one package's behavior.
 */
export class ParsedJsonDocument {
  /**
   * The root object's entries rendered once into the shared declaration-entry
   * shape the detail surfaces draw (data-model.md § Field reading), in the
   * parser's resolved order (see the module header for the accepted
   * integer-like key enumeration), `keyKind` always `'string'` because JSON
   * keys are strings. Empty when the root is not an object — a root array,
   * scalar, or `null` declares no key — which is a rendering fact, not a parse
   * failure. Rendered here with the parse, so the parse and its presentation
   * succeed or fail as one.
   */
  public readonly entries: readonly DeclaredEntryDto[];

  /**
   * Parses one document as the format its `(tool, path)` fixes. Throws when
   * the text cannot be parsed; the caller is `extraction.ts`, which confines
   * the throw to the recognition of a file whose source handling its kind
   * already fixes (FR-028). Empty content is such an error.
   */
  public constructor(sourceText: string, context: JsonDocumentContext) {
    const root = JSON.parse(
      acceptsComments(context)
        ? stripJsonComments(sourceText, { trailingCommas: true })
        : sourceText,
    ) as JsonValue;
    // Deliberately the entries and not a rendered root `DeclaredValueDto`:
    // every consumer this seam has asks what keys the root object declares, so
    // publishing the root value would make each of them repeat this same
    // narrowing, and no surface distinguishes a non-object root from an empty
    // object (an MCP carrier "declares none" either way). The fuller root value
    // arrives with the first surface that must tell those apart, with `entries`
    // becoming its derived view.
    this.entries = isJsonObject(root) ? renderJsonEntries(root) : [];
  }
}

/** The Copilot paths whose reader accepts JSON with comments. */
const COPILOT_JSONC_DOCUMENT_PATHS: ReadonlySet<string> = new Set([
  // `.claude/settings.json`, `.claude/settings.local.json` — the cross-tool
  // pair as *this* vendor reads it, and the first entry where its CLI
  // disagrees with its editor.
  //
  // The editor's hook-locations table names this pair for the workspace scope,
  // and every file it loads from that table is parsed with `parse as
  // parseJSONC`, in `parseAllHookFiles` of
  // https://github.com/microsoft/vscode/blob/44dda2c61e5a/src/vs/workbench/contrib/chat/browser/promptSyntax/hookUtils.ts
  // (read 2026-08-26). The CLI's load path rejects a comment in them, measured
  // the same way as the pair above. This entry is
  // Copilot's answer alone: Claude Code reads these two files strictly, and
  // the editor's separate scan of a Claude session's customizations
  // (https://github.com/microsoft/vscode/blob/bd2db631aa92/src/vs/platform/agentHost/node/claude/customizations/scan/claudeHookScan.ts,
  // also `readJsonFile`) is that editor discovering what Claude has, not
  // Claude loading it.
  '.claude/settings.json',
  '.claude/settings.local.json',
  // `.mcp.json` — the workspace-root carrier, and the second entry where this
  // vendor's CLI disagrees with its editor: the editor host reads it as
  // JSONC. Its `RootMcpDiscovery` takes `<root>/.mcp.json` through
  // `readJsonFile` — `parse as parseJSONC` in
  // https://github.com/microsoft/vscode/blob/d483f8059e96/src/vs/platform/agentPlugins/common/pluginParsers.ts
  // — and accepts the wrapper or the bare map:
  // https://github.com/microsoft/vscode/blob/d483f8059e96/src/vs/platform/agentHost/node/shared/sessionMcpDiscovery.ts
  // constructed by
  // https://github.com/microsoft/vscode/blob/0a4795df2c04/src/vs/platform/agentHost/node/copilot/copilotAgent.ts
  // (both read 2026-08-26). CLI 1.0.80 rejects a comment in the same file
  // (`copilot mcp list`). `.github/mcp.json` is absent here: no surface is
  // established to read that one leniently.
  '.mcp.json',
  // `.vscode/mcp.json` — the editor's own MCP carrier. The CLI reads this one
  // file through jsonc-parser while parsing its `.mcp.json` carriers with
  // `JSON.parse` (bundle of @github/copilot-darwin-arm64 0.0.420, read
  // 2026-08-26), and the editor that owns the format registers every
  // `mcp.json` under its `jsonc` language (microsoft/vscode
  // `extensions/configuration-editing/package.json`, 1.134.0).
  '.vscode/mcp.json',
]);

/**
 * The Copilot hook directory, a prefix because its files' final segment is any
 * `*.json` name — depth is the admitting rule's, whose matcher reaches that
 * directory's own files and no subtree.
 *
 * The third entry where this vendor's CLI disagrees with its editor
 * (see `acceptsComments`). The editor parses every hook file it loads with `parse as parseJSONC`
 * (`parseAllHookFiles` of
 * https://github.com/microsoft/vscode/blob/44dda2c61e5a/src/vs/workbench/contrib/chat/browser/promptSyntax/hookUtils.ts,
 * read 2026-08-26) and registers this directory
 * specifically under its `jsonc` language (`extensions/json/package.json`,
 * 1.134.0). The CLI rejects all three leniencies: a line comment, a block
 * comment, and a trailing comma each take `hookSessionLoadRepo`'s `hookCount`
 * from 1 to 0 with `Invalid hook configuration in <path>` (called directly on
 * CLI 1.0.80's `runtime.node`, 2026-08-26).
 */
const COPILOT_JSONC_HOOK_DIRECTORY = '.github/hooks/';

/**
 * Whether the reading a document is built for accepts JSON with comments. One
 * branch per tool, each carrying what measured its answer.
 *
 * Copilot answers with comments accepted wherever any one of its surfaces
 * accepts them, which today is its editor: three of its entries are JSONC for
 * that reason, with its CLI measured strict for all three. A file carrying no
 * comment reads identically either way, so the choice decides only what a
 * commented file shows — read strictly it has no declarations at all and its
 * row states that it could not be read, hiding what that surface loads from
 * it, while read as JSONC its declarations appear on a row that also names the
 * CLI, which loads none of them. Showing the content with its surfaces is the
 * milder error.
 *
 * That union is Copilot's alone. Its surfaces are built by different providers
 * — an editor, a CLI, and a hosted agent — so they diverge, and the divergence
 * here is measured rather than supposed. Claude's are one vendor's and reach
 * one binary, so no such union is taken for it: an editor that scans a Claude
 * session's files leniently is discovering what that session has, not loading
 * it, and Claude Code's own reading is what its rows answer with.
 *
 * Answering per surface is not expressible through this `(tool, path)`: a
 * recognition names its surfaces and takes one parse (research.md § 6).
 */
function acceptsComments({ tool, sourceRelativePath }: JsonDocumentContext): boolean {
  switch (tool) {
    case 'copilot':
      // Its comment-accepting carriers, each recorded at its own literal in
      // the two tables above.
      if (
        COPILOT_JSONC_DOCUMENT_PATHS.has(sourceRelativePath) ||
        sourceRelativePath.startsWith(COPILOT_JSONC_HOOK_DIRECTORY)
      ) {
        return true;
      }
      // Its remaining carriers:
      //
      // `.github/copilot/settings.json`,
      // `.github/copilot/settings.local.json` — strict, measured. This
      //   vendor's own settings pair is read by its CLI alone: the editor's
      //   settings lookup is excluded (`copilot.excluded.vscode.settings`)
      //   and the editor's hook-locations table names the Claude-format pair
      //   rather than this one, so no surface of this vendor reads these two
      //   leniently and the union below has nothing to union. The CLI's own
      //   two paths differ from each other, which is why the measurement is
      //   recorded rather than the command:
      //   `userSettingsReadRepoSettingsFileRaw`, which `/settings` displays
      //   and edits through, returns a commented file with `invalid: false`,
      //   while `userSettingsLoadRepoSettingsAuto` — the load that makes
      //   settings take effect, and the load hook loading goes through —
      //   rejects the same bytes with `Invalid JSON: expected value at line 1
      //   column 1`, and a trailing comma with `Invalid JSON: trailing comma`
      //   (both called directly on CLI 1.0.80's `runtime.node`, 2026-08-26).
      //   A path that displays a file without loading it is not a surface, and
      //   reading these leniently would put declarations on a row whose one
      //   product loads none of them — with nothing hidden in exchange, since
      //   a commented file takes effect nowhere here. The configuration
      //   reference's "supports JSON with comments (JSONC)" is written of
      //   `<COPILOT_HOME>/settings.json` and does not describe this pair's
      //   load path.
      // `.github/mcp.json` — strict, measured. CLI 1.0.80 skips one holding a
      //   `//` comment with `malformed: Invalid JSON: expected value at line 1
      //   column 1` (`copilot mcp list`, 2026-08-26), and no editor reading of
      //   this path is established — the root `.mcp.json` beside it is read by
      //   the editor host, which is why only that one is in the table above.
      // `marketplace.json` — strict, measured. Registering a local catalog
      //   through CLI 1.0.80's `pluginOperationsAddMarketplace` succeeds on a
      //   comment-free file and fails on the same file with a `//` comment
      //   (`Invalid marketplace.json: Invalid JSON syntax: Unexpected token
      //   '/'`) or a trailing comma (`Expected double-quoted property name`)
      //   — called directly on that build's `runtime.node`, 2026-08-26.
      return false;
    case 'claude':
      // Every carrier strict, one line each:
      //
      // `.mcp.json` — measured. Claude Code 2.1.186 reports one holding a `//`
      //   comment as `[Failed to parse] Project config (shared via .mcp.json)`
      //   and lists no server from it (`claude mcp list`, 2026-08-26).
      // `.claude/settings.json`, `.claude/settings.local.json` — documented.
      //   The settings page states that a settings file is strict JSON and
      //   that a `//` comment or a trailing comma there is a syntax error
      //   reported as a Settings Error at the next start
      //   (code.claude.com/docs/en/settings § Edit a settings file, read
      //   2026-08-26). Copilot reads these same two files as JSONC above,
      //   which is the disagreement the tool key exists for.
      // `plugin.json` — measured. Claude Code 2.1.186 rejects one holding a
      //   `//` comment with `JSON Parse error: Unrecognized token '/'`
      //   (`claude plugin tag --dry-run`, 2026-08-26).
      // `marketplace.json` — measured. That same build and command report the
      //   entry's
      //   version disagreement with the plugin's manifest when the file has no
      //   comments, and proceeds as if no entry existed when it has them
      //   (2026-08-26).
      return false;
    case 'codex':
      // Every carrier strict, from the vendor's own source, one line each
      // (all read 2026-08-26):
      //
      // `.codex/hooks.json` — `serde_json::from_str` in `load_hooks_json` of
      //   https://github.com/openai/codex/blob/cbfd999db78c/codex-rs/hooks/src/engine/discovery.rs
      // `marketplace.json` — the same call in
      //   https://github.com/openai/codex/blob/1c4af963946e/codex-rs/core-plugins/src/marketplace.rs
      // `plugin.json` — the same call in
      //   https://github.com/openai/codex/blob/56b82e676cc5/codex-rs/core-plugins/src/manifest.rs
      return false;
  }
}

/**
 * Whether one JSON resolution is an object — an authored `{ ... }` — rather
 * than a primitive, `null`, or an array. The rendering's one structural
 * question, answered beside it; a vendor reading navigates the rendered
 * `entries`, whose `mapping` kind is this same answer.
 */
function isJsonObject(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Renders one JSON-resolved value the way the detail surfaces show a
 * declaration (data-model.md § Field reading): the value the parser resolved,
 * in the shape the file wrote it — an object stays a mapping and an array a
 * sequence, nothing summarized away — normalized once into the internal
 * semantic the shared entry shape carries. An authored `null` is the declared
 * empty value, the same internal semantic YAML's `null` renders to.
 */
function renderJsonValue(value: JsonValue): DeclaredValueDto {
  // The parsed kind rides beside the rendered text, because the rendering
  // alone cannot say whether `7` was a number or a quoted string
  // (api-types.ts § DeclaredScalarKind); one branch per kind, because
  // TypeScript types a `typeof` expression as the full tag union whatever
  // its operand's type is.
  if (typeof value === 'string') {
    return { kind: 'scalar', scalarKind: 'string', text: value };
  }
  if (typeof value === 'number') {
    // `String` over the parsed number is the whole rendering: what it shows
    // is the platform's own resolution — `String(-0)` is `"0"` — accepted
    // as is.
    return { kind: 'scalar', scalarKind: 'number', text: String(value) };
  }
  if (typeof value === 'boolean') {
    return { kind: 'scalar', scalarKind: 'boolean', text: String(value) };
  }
  if (value === null) {
    return { kind: 'absent' };
  }
  if (isJsonObject(value)) {
    return { kind: 'mapping', entries: renderJsonEntries(value) };
  }
  return { kind: 'sequence', items: value.map((item) => renderJsonValue(item)) };
}

/**
 * Renders one JSON object's entries in the parser's resolved order, in the
 * shared declaration-entry shape the detail surfaces draw. JSON keys are
 * always strings, so every entry's `keyKind` is `'string'`; the key text is
 * the parser's resolution, quoting and escapes resolved once, exactly as the
 * value on the other side of the `:` is.
 *
 * `Object.entries` walks own enumerable string keys, so an authored
 * `__proto__` — an ordinary own property under `JSON.parse` — is an entry
 * like any other.
 */
function renderJsonEntries(object: { readonly [key: string]: JsonValue }): DeclaredEntryDto[] {
  return Object.entries(object).map(([key, value]) => ({
    key,
    keyKind: 'string',
    value: renderJsonValue(value),
  }));
}
