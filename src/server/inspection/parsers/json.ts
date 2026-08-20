// The JSON-family parsing seam of the inspection module (T321, T371), the
// JSON counterpart of `toml.ts` and `markdown.ts`: it turns one
// already-decoded string into the parsed document and hands it back, deciding
// nothing about the format itself and extracting nothing from the result.
// What a caller reads out of the document — the Claude carrier's `mcpServers`
// map — is that caller's own contract, and vendor-specific readings live
// beside the rules that own them, never here.
//
// Two documents, one per format, and deliberately never a leniency flag:
// `ParsedStrictJsonDocument` is strict JSON through `JSON.parse`, so a comment or a
// trailing comma fails the document exactly as the vendor's own strict reader
// would, and `ParsedJsoncDocument` is JSONC — JSON with JavaScript-style
// comments — read by blanking the comment syntax (`strip-json-comments`) and
// handing the remainder to the same `JSON.parse`. Which format a file is
// read as is the owning rule's contract, fixed by which class it names: the
// root `.mcp.json` is strict and must never be read leniently
// (tasks.md T371), and an identifier cannot be flipped the way an option
// value can.
//
// Each document publishes its declarations rendered once into the shared
// declaration-entry shape the detail surfaces draw (`DeclaredEntryDto`), in
// the parser's resolved order — the platform's own enumeration of the parsed
// object, in which integer-like keys come first in numeric order whatever
// the file's spelling ordered. That is a JavaScript property of every plain
// parsed object, and it is accepted rather than worked around: recovering
// the authored order would mean parsing the text a second time through a
// syntax tree, complexity no consumer has asked for (user decision,
// 2026-08-20; contracts/http-api.md § get-mcp-carrier-detail spells the
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

/**
 * What `JSON.parse` can resolve a document node to. Declared here because the
 * platform types the parse result as `any`; this closed union is the honest
 * shape the rendering below narrows over.
 */
type JsonValue =
  string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/**
 * One strict-JSON document as the parser resolved it: the parse is
 * `JSON.parse`, so a comment or a trailing comma fails the document exactly
 * as the vendor's own strict reader would. The class mirrors
 * `ParsedTomlDocument` and `ParsedMarkdownDocument`: the constructor is the
 * parse, and the field is the document's one rendering — never an
 * extraction, which stays the caller's contract.
 */
export class ParsedStrictJsonDocument {
  /**
   * The root object's entries rendered once into the shared
   * declaration-entry shape the detail surfaces draw (data-model.md § Field
   * reading), in the parser's resolved order (see the module header for the
   * accepted integer-like key enumeration), `keyKind` always `'string'`
   * because JSON keys are strings. Empty when the root is not an object — a
   * root array, scalar, or `null` declares no key — which is a rendering
   * fact, not a parse failure. Rendered here with the parse, so the parse
   * and its presentation succeed or fail as one.
   */
  public readonly entries: readonly DeclaredEntryDto[];

  /**
   * Parses one strict-JSON document. Throws when the text cannot be parsed;
   * the caller is `extraction.ts`, which confines the throw to the
   * recognition of a file whose source handling its kind already fixes
   * (FR-028). Empty content is such an error.
   */
  public constructor(sourceText: string) {
    const root = JSON.parse(sourceText) as JsonValue;
    // Deliberately the entries and not a rendered root `DeclaredValueDto`:
    // every consumer this seam has — the Claude and Copilot carrier
    // readings — asks what keys the root object declares, so publishing the
    // root value would make each of them repeat this same narrowing, and no
    // surface distinguishes a non-object root from an empty object (an MCP
    // carrier "declares none" either way). The fuller root value arrives
    // with the first surface that must tell those apart, with `entries`
    // becoming its derived view.
    this.entries = isJsonObject(root) ? renderJsonEntries(root) : [];
  }
}

/**
 * One JSONC document as the parser resolved it: the format's leniencies —
 * comments, and a trailing comma — blanked to whitespace by
 * `strip-json-comments`, and the remainder parsed as the strict document it
 * then is, which is why this class extends the strict one instead of
 * duplicating it or hiding the difference behind an option flag: which
 * format a file is read as stays the owning rule's contract, fixed by the
 * class it names (tasks.md T371). One `JSON.parse` resolution for the whole
 * family means the two formats cannot drift in duplicate-key semantics,
 * `__proto__` handling (an ordinary own property under `JSON.parse`), or
 * the accepted enumeration order. Comments are the format's own syntax, not
 * declarations, so nothing of them reaches an entry, and blanking repairs
 * nothing else: any syntax error in the remainder fails the document whole
 * (FR-028).
 *
 * Deliberately not `jsonc-parser`: its `parse()` builds objects that cannot
 * hold an authored `__proto__` key, so a `.vscode/mcp.json` server of that
 * name would vanish with no diagnostic, and reading its syntax tree instead
 * would mean re-implementing this module's rendering over a second node
 * shape — a hand-built detour around one package's behavior (user decision,
 * 2026-08-20).
 *
 * Its shipped caller is the Copilot VS Code `.vscode/mcp.json` reading
 * (`CopilotCompiledVscodeMcpCarrierRule`, T371) — the editor configuration
 * format is JSONC — and the Claude settings phase (T617) adds the next one.
 */
export class ParsedJsoncDocument extends ParsedStrictJsonDocument {
  /** Parses one JSONC document: the comment syntax blanked, then the strict parse. */
  public constructor(sourceText: string) {
    super(stripJsonComments(sourceText, { trailingCommas: true }));
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
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    // `String` over the parsed value is the whole rendering: what it shows is
    // the platform's own resolution — `String(-0)` is `"0"` — accepted as is.
    return { kind: 'scalar', text: String(value) };
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
