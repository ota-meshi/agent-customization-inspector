// T981: one Source-relative Path held by two consented members at once
// (FR-030, FR-045).
//
// The Copilot home and the shared agent home both admit
// `skills/<name>/SKILL.md`, so `skills/common/SKILL.md` can exist in both.
// Everything the skill detail page states must then be the addressed
// member's own: the invocation names, the recognizing products, and the
// authored document. A path-only lookup answered with whichever member the
// batch listed first — the Copilot home's page showing the shared home's
// name and a Codex recognition for a file Codex never reads there.
import { rm } from 'node:fs/promises';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

/** The repository the session is launched against. */
let repository: string;

/** The base holding the four member homes and the HOME the fourth derives from. */
let base: string;

let host: LaunchedHost;

test.beforeAll(async () => {
  repository = mkdtempSync(join(tmpdir(), 'aci-same-path-repo-'));
  writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');
  base = mkdtempSync(join(tmpdir(), 'aci-same-path-homes-'));
  const copilotHome = join(base, 'copilot-home');
  const home = join(base, 'home');
  const agentsHome = join(home, '.agents');
  for (const [root, name] of [
    [copilotHome, 'copilot-side'],
    [agentsHome, 'agents-side'],
  ] as const) {
    mkdirSync(join(root, 'skills', 'common'), { recursive: true });
    writeFileSync(
      join(root, 'skills', 'common', 'SKILL.md'),
      `---\nname: ${name}\n---\n\nThe ${name} copy.\n`,
      'utf8',
    );
  }
  // The other two members admit readable empty homes, so all four commit.
  mkdirSync(join(base, 'claude-home'), { recursive: true });
  mkdirSync(join(base, 'codex-home'), { recursive: true });
  host = await launchHost(
    repository,
    {
      COPILOT_HOME: copilotHome,
      CLAUDE_CONFIG_DIR: join(base, 'claude-home'),
      CODEX_HOME: join(base, 'codex-home'),
      HOME: home,
    },
    ['--inspect-personal-setup'],
  );
});

test.afterAll(async () => {
  await stopHost(host);
  await rm(repository, { recursive: true, force: true });
  await rm(base, { recursive: true, force: true });
});

test("shows only the addressed member's names, products, and document", async ({ page }) => {
  // The Copilot home's copy: Copilot's own invocation name and no trace of
  // the shared home's — no `agents-side`, and no Codex line, because Codex
  // documents no read of `COPILOT_HOME` (FR-030).
  await page.goto(
    new URL('/skills/detail/global-copilot/skills/common/SKILL.md', host.origin).href,
  );
  const main = page.locator('main');
  await expect(main).toContainText('copilot-side');
  await expect(main).toContainText('The copilot-side copy.');
  await expect(main).not.toContainText('agents-side');
  await expect(main).not.toContainText('OpenAI Codex');

  // The shared agent home's copy: both vendors that document the location,
  // under its own authored name, with no trace of the Copilot home's.
  await page.goto(new URL('/skills/detail/global-agents/skills/common/SKILL.md', host.origin).href);
  await expect(main).toContainText('agents-side');
  await expect(main).toContainText('The agents-side copy.');
  await expect(main).toContainText('OpenAI Codex');
  await expect(main).toContainText('GitHub Copilot');
  await expect(main).not.toContainText('copilot-side');
});
