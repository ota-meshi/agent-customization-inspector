// T489: browser acceptance for the Copilot prompt inventory (Phase 46).
// Launches the packaged CLI against a fixture holding VS Code prompt files
// beside command files, opens the printed loopback URL, and verifies that the
// prompts join the inventory the command phases already shipped rather than a
// list of their own — one row per name a reader types after the `/`.
//
// A prompt names itself, which is the difference from a command file: the
// frontmatter `name` is what a reader types, and the file name stands in when
// the file declares none. A prompt whose name matches a command's therefore
// lands on that command's row, the way two files of one skill name do.
//
// The excluded locations are the claim's other half: the page gives one
// default folder for the workspace scope and puts every further location
// behind a setting this tool never reads, so a nested or non-root prompts
// directory reaches no row at all.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

import { launchHost, stopHost, type LaunchedHost } from './launch-host';

test.describe('Copilot prompt files in the prompts-and-commands inventory', () => {
  let fixture: string;
  let host: LaunchedHost;

  test.beforeEach(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-prompts-'));
    await mkdir(join(fixture, '.github/prompts'), { recursive: true });
    // Declares its own name, which is what a reader types after the `/`.
    await writeFile(
      join(fixture, '.github/prompts/scaffold.prompt.md'),
      '---\nname: scaffold-component\ndescription: Scaffold a React component\n---\n\n# Scaffold\n',
      'utf8',
    );
    // Declares none, so the file name stands in.
    await writeFile(join(fixture, '.github/prompts/review.prompt.md'), '# Review\n', 'utf8');
    // Declares a name a command in this tree also resolves to, so the two
    // files share one row.
    await writeFile(
      join(fixture, '.github/prompts/deploy.prompt.md'),
      '---\nname: deploy\n---\n\n# Deploy from the editor\n',
      'utf8',
    );
    await mkdir(join(fixture, '.claude/commands'), { recursive: true });
    await writeFile(join(fixture, '.claude/commands/deploy.md'), '# Deploy\n', 'utf8');
    // Excluded: a plain `.md`, a nested prompts directory, and a non-root one.
    await writeFile(join(fixture, '.github/prompts/notes.md'), 'not a prompt file\n', 'utf8');
    await mkdir(join(fixture, '.github/prompts/team'), { recursive: true });
    await writeFile(join(fixture, '.github/prompts/team/deploy.prompt.md'), '# Nested\n', 'utf8');
    await mkdir(join(fixture, 'packages/api/.github/prompts'), { recursive: true });
    await writeFile(
      join(fixture, 'packages/api/.github/prompts/deploy.prompt.md'),
      '# Non-root\n',
      'utf8',
    );

    host = await launchHost(fixture);
  });

  test.afterEach(async () => {
    await stopHost(host);
    await rm(fixture, { recursive: true, force: true });
  });

  test('lists prompts and commands in one inventory, each under the name it is invoked by', async ({
    page,
  }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // One row per name: the declared one, the file-name fallback, and the name
    // a prompt and a command both resolve to.
    await expect(items.locator('.aci-prompt-row__name')).toHaveText([
      'deploy',
      'review',
      'scaffold-component',
    ]);

    // The shared name lists every file that resolves it: the command file,
    // which two products read, and the prompt file the editor reads. One
    // name, one row, two files — the command file's two recognitions are two
    // products beside one path rather than two items.
    const shared = items.filter({ hasText: 'deploy' });
    await expect(shared.locator('.aci-path')).toHaveText([
      '.claude/commands/deploy.md',
      '.github/prompts/deploy.prompt.md',
    ]);
    await expect(shared.locator('.aci-prompt-row__definitions > li')).toHaveCount(2);
    await expect(shared.locator('.aci-prompt-row__tool')).toHaveCount(3);
    await expect(shared.locator('.aci-prompt-row__definitions')).toContainText('Claude Code');
    await expect(shared.locator('.aci-prompt-row__definitions')).toContainText('GitHub Copilot');

    const text = await page.locator('main').innerText();
    expect(text).not.toContain('.github/prompts/notes.md');
    expect(text).not.toContain('.github/prompts/team/deploy.prompt.md');
    expect(text).not.toContain('packages/api/.github/prompts/deploy.prompt.md');
  });

  test('names a prompt by its file name only when it declares none', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // The declared name heads its row and the file it came from sits inside
    // it, so the two are never confused for each other.
    const declared = items.filter({ hasText: 'scaffold-component' });
    await expect(declared.locator('.aci-path')).toHaveText(['.github/prompts/scaffold.prompt.md']);
    // The fallback row is named by the file, minus the whole `.prompt.md`.
    const fallback = items.filter({ hasText: 'review' });
    await expect(fallback.locator('.aci-path')).toHaveText(['.github/prompts/review.prompt.md']);
    await expect(fallback.locator('.aci-prompt-row__definitions')).toContainText('VS Code');
  });

  test('narrows to Copilot without dropping the row a command shares', async ({ page }) => {
    await page.goto(host.origin);
    await page.getByRole('tab', { name: /Prompt \/ Command/u }).click();
    const items = page.getByRole('tabpanel').locator('.aci-item');

    // Claude reads the command file and no prompt file, so only the name the
    // command resolves survives.
    await page.getByLabel('Tool').selectOption('claude');
    await expect(items.locator('.aci-prompt-row__name')).toHaveText(['deploy']);
    await expect(items.locator('.aci-path')).toHaveText(['.claude/commands/deploy.md']);

    // Copilot reads both locations, so every row returns — and the shared row
    // keeps Copilot's two definitions while dropping Claude's.
    await page.getByLabel('Tool').selectOption('copilot');
    await expect(items.locator('.aci-prompt-row__name')).toHaveText([
      'deploy',
      'review',
      'scaffold-component',
    ]);
    const shared = items.filter({ hasText: 'deploy' });
    await expect(shared.locator('.aci-path')).toHaveText([
      '.claude/commands/deploy.md',
      '.github/prompts/deploy.prompt.md',
    ]);
    await expect(shared.locator('.aci-prompt-row__definitions')).not.toContainText('Claude Code');
  });
});
