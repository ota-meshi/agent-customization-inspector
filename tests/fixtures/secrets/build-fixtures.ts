// T074: the maintained secret-bearing fixture repository (FR-027).
//
// This tree exists to prove one thing that is otherwise hard to test: the
// product shows an authored credential exactly as written through the
// detail route, and shows it nowhere else. Both halves
// need a real value, so the fixtures declare credential-shaped literals in
// several authored positions and the suites assert where each one may and may
// not appear.
//
// Nothing here is a real credential. Each literal has the shape of a token from
// a well-known provider and a fixed `FIXTURE` body, so a scanner that flags the
// shape finds a value that authenticates nothing.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/**
 * The credential-shaped literals the tree declares, one per authored position
 * the Codex `skill` allowlist can reach.
 */
export const SECRET_LITERALS = {
  /** Declared in an allowlisted `description`, so it is published as metadata. */
  inAllowlistedField: 'ghp_FIXTURE000000000000000000000000000000',
  /** Declared in a frontmatter key the allowlist does not name. */
  inUnlistedField: 'sk-FIXTURE0000000000000000000000000000000000000000',
  /** Declared in the Markdown body, which no field ID covers. */
  inBody: 'AKIAFIXTURE000000000',
} as const;

/** One built secret-bearing fixture repository. */
export interface SecretFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The Source-relative Path of the skill declaring every literal above. */
  readonly skillPath: string;
  /** The complete authored text of that file, as the detail route must return it. */
  readonly sourceText: string;
  /**
   * The Source-relative Path of a second skill whose frontmatter cannot be
   * parsed, so the tree carries a diagnostic. A suite asserting what a
   * diagnostic may not contain proves nothing over a tree that produces none.
   */
  readonly unparseableSkillPath: string;
}

// Writes one fixture file, creating parents. Every write happens here, before
// the product runs: the product must not mutate this tree (FR-023).
function write(root: string, relative: string, content: string): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

/**
 * Builds a repository whose one Codex skill declares a credential-shaped
 * literal in an allowlisted field, in an unlisted field, and in its body.
 *
 * The three positions are the point: the first must appear unmasked as that
 * field's recognized value, the second must appear only inside the complete
 * `sourceText`, and all three must stay out of the session snapshot, which
 * carries no source text at all.
 */
export function buildSecretFixture(prefix = 'inspector-secrets'): SecretFixture {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const skillPath = '.agents/skills/secretive/SKILL.md';
  const sourceText = [
    '---',
    'name: secretive',
    `description: "deploy token ${SECRET_LITERALS.inAllowlistedField}"`,
    `api_key: ${SECRET_LITERALS.inUnlistedField}`,
    '---',
    '',
    `Run it with ${SECRET_LITERALS.inBody}.`,
    '',
  ].join('\n');
  write(root, skillPath, sourceText);
  const unparseableSkillPath = '.agents/skills/unparseable/SKILL.md';
  write(root, unparseableSkillPath, '---\nname: [unterminated\n---\n\n# Body\n');
  return { root, skillPath, sourceText, unparseableSkillPath };
}
