// Dev fixture launcher: rebuilds one deterministic fixture repository under
// the git-ignored .tmp/fixtures/ tree and serves it with the packaged CLI, so
// `pnpm run start:fixture [name] [cli flags...]` is the whole
// manual-verification loop (`pnpm run build` must have produced dist/ first).
//
// The chosen fixture's previous tree is removed before rebuilding, so edits
// made while browsing never leak into the next launch. Nothing removes the
// tree afterwards: unlike the suites' OS-temp roots, it stays on disk for
// inspection until the next launch of the same fixture replaces it.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import {
  buildAllCustomizationKindFixture,
  buildAllToolSkillFixture,
  buildAllVendorInstructionFixture,
  buildClaudeInstructionFixture,
  buildClaudeMcpFixture,
  buildClaudeOutputStyleFixture,
  buildClaudePluginFixture,
  buildCodexPluginFixture,
  buildClaudeRuleFixture,
  buildClaudeAgentFixture,
  buildClaudeSkillFixture,
  buildCodexAgentFixture,
  buildCommandFixture,
  buildCodexInstructionFixture,
  buildCodexMcpFixture,
  buildCodexRuleFixture,
  buildCodexSkillFixture,
  buildCopilotAgentFixture,
  buildCopilotPluginFixture,
  buildCopilotCliMcpFixture,
  buildCopilotInstructionFixture,
  buildCopilotSkillFixture,
  buildCopilotVscodeMcpFixture,
  buildPriorityMcpFixture,
  buildPluginComparisonFixture,
  buildUnifiedPluginFixture,
} from '../tests/fixtures/repositories/build-fixtures.ts';

/** The repository root, one directory above this script. */
const repositoryRoot = join(import.meta.dirname, '..');

/**
 * Where launched fixture trees live. The directory is listed in .gitignore,
 * .prettierignore, and the ESLint ignores, so nothing else touches it.
 */
const fixtureBase = join(repositoryRoot, '.tmp', 'fixtures');

/** The packaged CLI entry `package.json.bin` points at. */
const cliEntry = join(repositoryRoot, 'dist', 'cli.mjs');

/**
 * Every fixture name the launcher accepts, mapped to the builder that writes
 * its tree. Only the written tree matters here, so the value type keeps none
 * of the builders' individual result shapes.
 */
const fixtureBuilders: Readonly<Record<string, (prefix?: string, root?: string) => unknown>> = {
  'codex-skills': buildCodexSkillFixture,
  'claude-skills': buildClaudeSkillFixture,
  'copilot-skills': buildCopilotSkillFixture,
  'all-skills': buildAllToolSkillFixture,
  'codex-instructions': buildCodexInstructionFixture,
  'codex-permissions': buildCodexRuleFixture,
  'codex-agents': buildCodexAgentFixture,
  'claude-agents': buildClaudeAgentFixture,
  'copilot-agents': buildCopilotAgentFixture,
  'claude-rules': buildClaudeRuleFixture,
  'claude-output-styles': buildClaudeOutputStyleFixture,
  'codex-plugins': buildCodexPluginFixture,
  'claude-plugins': buildClaudePluginFixture,
  'copilot-plugins': buildCopilotPluginFixture,
  // Every product's plugin path in one tree, the shared catalog included.
  'all-plugins': buildUnifiedPluginFixture,
  // One marketplace kept in two catalogs, drifted: what the plugin
  // comparison surface is for.
  'plugin-comparison': buildPluginComparisonFixture,
  commands: buildCommandFixture,
  'codex-mcp': buildCodexMcpFixture,
  'claude-mcp': buildClaudeMcpFixture,
  'copilot-cli-mcp': buildCopilotCliMcpFixture,
  'copilot-vscode-mcp': buildCopilotVscodeMcpFixture,
  'all-mcp': buildPriorityMcpFixture,
  'claude-instructions': buildClaudeInstructionFixture,
  'copilot-instructions': buildCopilotInstructionFixture,
  'all-instructions': buildAllVendorInstructionFixture,
  // Every `all-*` tree plus the rule tree in one root, so one launch shows
  // every inventory this release publishes.
  all: buildAllCustomizationKindFixture,
};

const requestedName = process.argv[2] ?? 'all';
// Everything after the fixture name goes to the CLI verbatim (e.g. --no-open).
const cliArguments = process.argv.slice(3);

const builder = fixtureBuilders[requestedName];
if (builder === undefined) {
  console.error(
    `Unknown fixture "${requestedName}". Available: ${Object.keys(fixtureBuilders).join(', ')}`,
  );
  process.exit(1);
}
if (!existsSync(cliEntry)) {
  console.error('dist/cli.mjs is missing; run `pnpm run build` first.');
  process.exit(1);
}

const fixtureRoot = join(fixtureBase, requestedName);
// A fresh tree per launch: a hand-edited or stale previous tree must never
// masquerade as the builder's output. The builder expects its root to exist.
rmSync(fixtureRoot, { recursive: true, force: true });
mkdirSync(fixtureRoot, { recursive: true });
builder(undefined, fixtureRoot);

console.log(`fixture: ${fixtureRoot}`);
// The CLI owns the terminal from here: it prints its launch line and serves
// until interrupted. Ctrl+C reaches both processes in the foreground group.
const served = spawnSync(process.execPath, [cliEntry, '--root', fixtureRoot, ...cliArguments], {
  stdio: 'inherit',
});
process.exitCode = served.status ?? 1;
