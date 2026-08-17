// The one TOML parsing seam of the inspection module (T1090), the TOML
// counterpart of `markdown.ts`: it turns one already-decoded string into the
// parser's resolution and hands it back, deciding nothing about the format
// itself and extracting nothing from the result. What a caller reads out of
// the document — the Codex carrier's pinned fallback declaration today, the
// MCP phase's `[mcp_servers.*]` tables later — is that caller's own contract,
// and vendor-specific readings live beside the rules that own them, never
// here.
//
// The parse reads one string and touches nothing else: no I/O, no execution,
// no path resolution; memory and time capacity are the environment's, with no
// Inspector numeric cap (FR-029).
import { parse } from 'smol-toml';

/**
 * One TOML document as the parser resolved it. The class mirrors
 * `ParsedMarkdownDocument`: the constructor is the parse, and the fields are
 * the parser's own answer rather than an extraction.
 */
export class ParsedTomlDocument {
  /**
   * The document's top-level table exactly as the parser resolved it. Keys
   * keep authored order; values are the parser's plain resolutions. An empty
   * document resolves to an empty table, which is not a failure.
   */
  public readonly table: Record<string, unknown>;

  /**
   * Parses one TOML document. Throws when the document cannot be parsed; the
   * caller is `extraction.ts`, which confines the throw to whatever asked for
   * it — the recognition of a file whose source stays displayed, or a
   * configuration read that then configures nothing (FR-028).
   */
  public constructor(sourceText: string) {
    // `integersAsBigInt: 'asNeeded'` because the default rejects an integer
    // the document is entitled to hold: TOML integers are 64-bit, and a value
    // past `Number.MAX_SAFE_INTEGER` fails the whole parse rather than the one
    // key. A vendor's own file would then lose every declaration it makes
    // because of a number no reader here looks at.
    this.table = parse(sourceText, { integersAsBigInt: 'asNeeded' });
  }
}
