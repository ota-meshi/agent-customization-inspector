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
 * The credential-shaped literals the tree declares, one per authored position a
 * skill has.
 */
export const SECRET_LITERALS = {
  /** Declared in `description`, the key a reader looks for after the name. */
  inDescription: 'ghp_FIXTURE000000000000000000000000000000',
  /** Declared in a key of the file's own choosing, published like any other. */
  inOtherKey: 'sk-FIXTURE0000000000000000000000000000000000000000',
  /** Declared in the Markdown body, which carries no declarations at all. */
  inBody: 'AKIAFIXTURE000000000',
} as const;

/**
 * An environment reference authored into the instruction file, which must
 * render everywhere exactly as these characters and resolve nowhere: no
 * process-environment sentinel may replace it (FR-025, tasks.md T218).
 */

export const ENVIRONMENT_REFERENCE = '${ACI_FIXTURE_ENDPOINT}';

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
  /**
   * The Source-relative Path of the static Codex instruction file, declaring
   * frontmatter keys out of alphabetical order — with a credential and the
   * environment reference among the values — and a body of its own, so the
   * instruction detail's authored-order and exactness claims have something
   * to bite on (tasks.md T218).
   */
  readonly instructionPath: string;
  /** The complete authored text of that instruction file. */
  readonly instructionSourceText: string;
  /**
   * The Source-relative Path of the configured fallback instruction file the
   * tree's own `.codex/config.toml` declares, activated by the
   * configuration-read stage rather than by a static rule (tasks.md T218).
   */
  readonly fallbackInstructionPath: string;
  /**
   * The Source-relative Path of an instruction file whose frontmatter cannot
   * be parsed, so the instruction detail's failure branch — null
   * presentation beside the complete source — is reachable (FR-028).
   */
  readonly unparseableInstructionPath: string;
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
 * literal in two frontmatter keys and in its body.
 *
 * The three positions are the point: both keys must appear unmasked as the
 * values they resolve to — a skill publishes the keys its file wrote, so
 * neither is more or less published than the other — the body's must appear in
 * the complete `sourceText`, and all three must stay out of the session
 * snapshot, which carries no source text at all.
 */
export function buildSecretFixture(prefix = 'inspector-secrets'): SecretFixture {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const skillPath = '.agents/skills/secretive/SKILL.md';
  const sourceText = [
    '---',
    'name: secretive',
    `description: "deploy token ${SECRET_LITERALS.inDescription}"`,
    `api_key: ${SECRET_LITERALS.inOtherKey}`,
    '---',
    '',
    `Run it with ${SECRET_LITERALS.inBody}.`,
    '',
  ].join('\n');
  write(root, skillPath, sourceText);
  const unparseableSkillPath = '.agents/skills/unparseable/SKILL.md';
  write(root, unparseableSkillPath, '---\nname: [unterminated\n---\n\n# Body\n');
  // The static Codex instruction file. Its keys are deliberately not in
  // alphabetical order — the detail publishes declarations in authored order,
  // and a fixture whose authored order happens to be sorted proves nothing —
  // and its values carry a credential and the environment reference, which
  // every surface must show exactly as written and resolve nowhere.
  const instructionPath = 'AGENTS.md';
  const instructionSourceText = [
    '---',
    'scope: repository',
    `endpoint: ${ENVIRONMENT_REFERENCE}`,
    `api_key: ${SECRET_LITERALS.inOtherKey}`,
    '---',
    '',
    '# House rules',
    '',
    `Deploy with ${SECRET_LITERALS.inBody} and read @docs/target.md first.`,
    '',
  ].join('\n');
  write(root, instructionPath, instructionSourceText);
  // The configured fallback: the carrier declares the name, the
  // configuration-read stage turns it into a scan target, and the carrier
  // itself is never published.
  write(root, '.codex/config.toml', 'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]\n');
  const fallbackInstructionPath = 'TEAM_GUIDE.md';
  write(root, fallbackInstructionPath, '# Configured fallback instructions\n');
  const unparseableInstructionPath = 'AGENTS.override.md';
  write(root, unparseableInstructionPath, '---\nscope: [unterminated\n---\n\n# Override\n');
  return {
    root,
    skillPath,
    sourceText,
    unparseableSkillPath,
    instructionPath,
    instructionSourceText,
    fallbackInstructionPath,
    unparseableInstructionPath,
  };
}
