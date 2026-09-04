// T101: the user-visible copy of the closed vocabularies
// (AGENTS.md User-visible copy policy).
//
// The compiler already keeps each table complete: `Readonly<Record<Union,
// string>>` will not build while a member is missing its text. What it cannot
// see is what the text says, and there is one easy way to satisfy it —
// restating the wire token. That is the exact defect these tables exist to
// remove, so it is what this suite asserts against.
//
// Only tokens are rejected, never ordinary words that happen to be keys:
// `environment` is captioned "environment variable" and `MCP` is captioned
// "MCP", and both are the right copy. A token is a key with a dot or a hyphen
// in it — a shape chosen for a contract rather than for a reader.
//
// The rendering itself is asserted against the real page in
// `tests/e2e/codex-skills-detail.spec.ts`; this suite is about the strings.
import { describe, expect, it } from 'vitest';

import { SCAN_PROGRESS_PHASE_TEXT } from '../../../src/shared/api-text';
import { DIAGNOSTIC_REGISTRY } from '../../../src/shared/diagnostics';
import {
  CUSTOMIZATION_KIND_TEXT,
  FILE_ENCODING_TEXT,
  SAME_NAME_SKILL_RESOLUTION_TEXT,
  SOURCE_BOUNDARY_ORIGIN_TEXT,
  SOURCE_STATUS_STANDALONE_TEXT,
  SUPPORTED_TOOL_TEXT,
} from '../../../src/shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../src/shared/registries/behavior-text';

/** Every table whose values reach a screen, named as its module names it. */
const TABLES: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  CUSTOMIZATION_KIND_TEXT,
  // The diagnostic registry keys richer records; its rendered part is the
  // message, so that is what joins the tables here.
  DIAGNOSTIC_REGISTRY: Object.fromEntries(
    Object.entries(DIAGNOSTIC_REGISTRY).map(([code, entry]) => [code, entry.message]),
  ),
  FILE_ENCODING_TEXT,
  SAME_NAME_SKILL_RESOLUTION_TEXT,
  SCAN_PROGRESS_PHASE_TEXT,
  SOURCE_BOUNDARY_ORIGIN_TEXT,
  // One record per status: the word every surface states, and the note a
  // surface with nothing more exact puts under it. Both reach a screen, so
  // both are checked.
  SOURCE_STATUS_STANDALONE_WORD: Object.fromEntries(
    Object.entries(SOURCE_STATUS_STANDALONE_TEXT).map(([status, entry]) => [status, entry.word]),
  ),
  SOURCE_STATUS_STANDALONE_NOTE: Object.fromEntries(
    Object.entries(SOURCE_STATUS_STANDALONE_TEXT)
      .filter(([, entry]) => entry.note !== null)
      .map(([status, entry]) => [status, entry.note!]),
  ),
  SUPPORTED_TOOL_TEXT,
  VENDOR_SURFACE_TEXT,
};

/**
 * Every wire token any of these vocabularies uses. Collected across all the
 * tables rather than per table, because one table quoting another's token is
 * the same defect: a diagnostic code reads no better inside a status label.
 */
const WIRE_TOKENS = [
  ...new Set(Object.values(TABLES).flatMap((table) => Object.keys(table))),
].filter((key) => key.includes('.') || key.includes('-'));

describe('the user-visible copy of the closed vocabularies', () => {
  it('collects the tokens it is checking for', () => {
    // A typo in the collection above would make every case below vacuous, so
    // the set is checked to hold the identifiers this exists to keep off screen.
    expect(WIRE_TOKENS).toContain('recognition-parse-failed');
    expect(WIRE_TOKENS).toContain('utf-8-replaced');
    expect(WIRE_TOKENS).toContain('all-remain');
    expect(WIRE_TOKENS).toContain('copilot-vscode');
  });

  it.each(Object.entries(TABLES))('renders no wire token as itself: %s', (_name, table) => {
    for (const [key, text] of Object.entries(table)) {
      expect(text.trim(), `${key} has no text`).not.toBe('');
      for (const token of WIRE_TOKENS) {
        expect(text, `${key} renders the wire token ${token}`).not.toContain(token);
      }
    }
  });

  it.each(Object.entries(TABLES))('names no product identifier at all: %s', (_name, table) => {
    for (const [key, text] of Object.entries(table)) {
      // The general shape, so an identifier no table happens to key is caught
      // too. A sentence may quote a path, and a path segment carries a slash
      // rather than a vendor prefix.
      expect(text, `${key} renders a product identifier`).not.toMatch(
        /(?:codex|claude|copilot)\.[a-z]/u,
      );
    }
  });
});
