// T021/T022/T036/T037/T040/T051: what each Antigravity CLI compiled unit
// answers about a file its rule admitted — the name a skill is invoked by in
// each of the two admitted shapes, the declarations an MCP carrier and the two
// hook carriers publish, the policy the settings document declares, the name a
// custom agent declares, and the rows a workspace rules file and the home's
// carriers reach (FR-007, FR-009, FR-020, FR-026, FR-028).
//
// The units are exercised directly rather than through a scan, because what is
// under test is the reading: which value a product loading the file would
// have. Which paths reach these units at all is the traversal's question and
// is asserted in `rules.test.ts` against the same fixtures.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import {
  ANTIGRAVITY_GLOBAL_RULES,
  ANTIGRAVITY_REPOSITORY_RULES,
  AntigravityCompiledOtherKindRule,
} from '../../../src/server/inspection/rules/antigravity';
import { AntigravityCompiledInstructionRule } from '../../../src/server/inspection/rules/instructions/antigravity';
import { AntigravityCompiledAgentRule } from '../../../src/server/inspection/rules/agents/antigravity';
import {
  AntigravityCompiledFileSkillRule,
  AntigravityCompiledSkillRule,
} from '../../../src/server/inspection/rules/skills/antigravity';
import {
  AntigravityCompiledInlineHookRule,
  AntigravityCompiledStandaloneHookRule,
} from '../../../src/server/inspection/rules/hooks/antigravity';
import { AntigravityCompiledMcpCarrierRule } from '../../../src/server/inspection/rules/mcp/antigravity';
import { AntigravityCompiledPermissionsCarrierRule } from '../../../src/server/inspection/rules/permissions/antigravity';
import { ANTIGRAVITY_INSPECTION_RULES } from '../../../src/shared/registries/antigravity/rules';
import type { CompiledStaticCandidateRule } from '../../../src/server/inspection/rules/registry';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

/**
 * A directory these cases recognize skills at. The recognizer runs the
 * companion census itself for a directory-shaped skill, so the folder has to
 * exist as it does in a real scan; nothing is written into it, because what is
 * under test is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-antigravity-metadata-'));
  mkdirSync(join(root, '.agents/skills/release-notes'), { recursive: true });
  mkdirSync(join(root, '.agents/agents'), { recursive: true });
  mkdirSync(join(root, 'antigravity-cli/skills/release-notes'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** The one shipped Repository unit with this identity. */
function repositoryRule(ruleId: string): CompiledStaticCandidateRule {
  const compiled = ANTIGRAVITY_REPOSITORY_RULES.find(
    (candidate) => candidate.rule.ruleId === ruleId,
  );
  if (compiled === undefined) {
    throw new Error(`no shipped Antigravity CLI Repository rule ${ruleId}`);
  }
  return compiled;
}

/** The one shipped Global unit with this identity. */
function globalRule(ruleId: string): CompiledStaticCandidateRule {
  const compiled = ANTIGRAVITY_GLOBAL_RULES.find((candidate) => candidate.rule.ruleId === ruleId);
  if (compiled === undefined) {
    throw new Error(`no shipped Antigravity CLI Global rule ${ruleId}`);
  }
  return compiled;
}

/** Recognizes one authored file at `matchedPath` through the unit that admits it. */
async function recognize(
  compiled: CompiledStaticCandidateRule,
  matchedPath: string,
  sourceText: string,
): Promise<ToolRecognition> {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['antigravity'],
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error(`expected one Antigravity CLI recognition for ${matchedPath}`);
  }
  return recognition;
}

describe('the two skill shapes one location admits (T022)', () => {
  it('names a skill folder by its declared name', async () => {
    const recognition = await recognize(
      repositoryRule('antigravity.repo.skill.directory'),
      '.agents/skills/release-notes/SKILL.md',
      '---\nname: notes\ndescription: Assemble the notes.\n---\n\nGroup by area.\n',
    );
    expect(recognition.parseStatus).toBe('parsed');
    expect(recognition.details.kind === 'skill' && recognition.details.invocationName).toBe(
      'notes',
    );
  });

  it('falls a skill folder declaring no name back to its folder, not to `SKILL`', async () => {
    // The fallback every product resolving this file uses, which is what keeps
    // one `SKILL.md` one row with three readers. A static reading of the
    // published binary fills the name from the file instead, which would name
    // this row `SKILL`; that reading is not followed, because the same
    // binary's `GetSkillsCreatePath` treats the folder as carrying the name
    // (contracts/vendors/antigravity-cli.md § Known uncertainties item 7).
    const recognition = await recognize(
      repositoryRule('antigravity.repo.skill.directory'),
      '.agents/skills/release-notes/SKILL.md',
      '---\ndescription: Assemble the notes.\n---\n\nGroup by area.\n',
    );
    expect(recognition.details.kind === 'skill' && recognition.details.invocationName).toBe(
      'release-notes',
    );
    expect(recognition.details.kind === 'skill' && recognition.details.rowUnit).toBe('directory');
  });

  it('falls a flat skill declaring no name back to its own file name', async () => {
    // The counterpart fallback: this shape has no folder to take one from, so
    // the file's own name without the extension is the only answer it has.
    const recognition = await recognize(
      repositoryRule('antigravity.repo.skill.file'),
      '.agents/skills/x.md',
      '---\ndescription: Expand the selected expression.\n---\n\nOne step at a time.\n',
    );
    expect(recognition.details.kind === 'skill' && recognition.details.invocationName).toBe('x');
  });

  it('gives the two shapes different row units, and censuses only the folder', async () => {
    // The discriminant the recognizer publishes rather than a shape re-derived
    // from the path, and what follows from it: a flat skill occupies no
    // directory, so nothing is enumerated for it — its siblings are other
    // skills rather than its own companions (spec.md § FR-004).
    const flat = await recognizeCandidateForVendors(
      {
        matchedPath: '.agents/skills/deploy.md',
        absolutePath: join(root, '.agents/skills/deploy.md'),
        sourceRoot: root,
        admissions: [
          {
            compiled: repositoryRule('antigravity.repo.skill.file'),
            origin: { planIndex: 0, selectorIndex: 0 },
          },
        ],
        sourceText: '---\nname: deploy\n---\n\nDeploy the branch.\n',
      },
      ['antigravity'],
    );
    expect(
      flat.recognitions[0]?.details.kind === 'skill' && flat.recognitions[0].details.rowUnit,
    ).toBe('file');
    expect(flat.directories).toEqual([]);

    const folder = await recognizeCandidateForVendors(
      {
        matchedPath: '.agents/skills/release-notes/SKILL.md',
        absolutePath: join(root, '.agents/skills/release-notes/SKILL.md'),
        sourceRoot: root,
        admissions: [
          {
            compiled: repositoryRule('antigravity.repo.skill.directory'),
            origin: { planIndex: 0, selectorIndex: 0 },
          },
        ],
        sourceText: '---\nname: notes\n---\n\nGroup by area.\n',
      },
      ['antigravity'],
    );
    expect(folder.directories).toEqual(['.agents/skills/release-notes/']);
  });
});

describe('the workspace rules file the catalog answers for (T037)', () => {
  it('publishes the file whole, reading no activation out of it', async () => {
    // `rule` asks no per-kind question, so the catalog's own entry compiles it
    // and nothing is extracted: the row is the document its author wrote, the
    // frontmatter block included, so the declared activation reaches the page
    // as the file's own text rather than as an answer any unit computed
    // (FR-016, `session.ts` § the `rule` detail variant).
    const compiled = repositoryRule('antigravity.repo.rule');
    expect(compiled.kind).toBe('rule');
    const recognition = await recognize(
      compiled,
      '.agents/rules/typescript.md',
      '---\nactivation: glob\nglob: "src/**/*.ts"\n---\n\nNo `any`.\n',
    );
    expect(recognition.details.kind).toBe('rule');
    expect(recognition.parseStatus).toBe('not-attempted');
    expect(recognition.tool).toBe('antigravity');
  });
});

describe('the standalone hook carrier and the settings document’s inline block (T036, T051)', () => {
  /** The workspace carrier, whose top level is the map of named hooks itself. */
  const standalone = new AntigravityCompiledStandaloneHookRule(
    ANTIGRAVITY_INSPECTION_RULES['antigravity.repo.hooks'],
  );

  /** The home settings document's `hooks` object, read as the same shape. */
  const inline = new AntigravityCompiledInlineHookRule(
    ANTIGRAVITY_INSPECTION_RULES['antigravity.global.hooks.inline'],
  );

  it('tells two declarations of one event apart by the name their carrier wrote', () => {
    // One carrier, one event, two names: without the name the two rows would
    // sit at one path with nothing to distinguish them
    // (contracts/vendors/antigravity-cli.md § Known uncertainties item 9).
    const reading = standalone.hookCarrierReadingOf(
      JSON.stringify({
        'lint-on-write': {
          PostToolUse: [{ matcher: 'write_file', hooks: [{ command: './scripts/lint.sh' }] }],
        },
        'audit-writes': {
          PostToolUse: [{ matcher: 'run_command', hooks: [{ command: './scripts/audit.sh' }] }],
        },
      }),
      '.agents/hooks.json',
    );
    expect(reading.events.map((declaration) => declaration.event)).toEqual([
      'PostToolUse',
      'PostToolUse',
    ]);
    expect(reading.events.map((declaration) => declaration.namedHook?.name)).toEqual([
      'lint-on-write',
      'audit-writes',
    ]);
  });

  it('publishes a named hook’s own `enabled` key beside it, uninterpreted', () => {
    // The file's own key, shown as written: whether a hook runs is runtime
    // this product does not observe, so no row says "disabled" (FR-020).
    const reading = standalone.hookCarrierReadingOf(
      JSON.stringify({
        'safety-gate': {
          enabled: false,
          PreToolUse: [{ matcher: 'run_command', hooks: [{ command: './scripts/safety.sh' }] }],
        },
      }),
      '.agents/hooks.json',
    );
    const [declaration] = reading.events;
    expect(declaration?.namedHook?.fields.map((field) => field.key)).toEqual(['enabled']);
    expect(declaration?.namedHook?.fields[0]?.value).toEqual({
      kind: 'scalar',
      scalarKind: 'boolean',
      text: 'false',
    });
  });

  it('declares no top-level keys of its own, because there are none beside the map', () => {
    // This format's top level *is* the hook map, so `carrierFields` is empty
    // rather than "every key beside it" (`compiled-rule.ts` § HookCarrierReading).
    const reading = standalone.hookCarrierReadingOf('{}', '.agents/hooks.json');
    expect(reading).toEqual({ carrierForm: 'standalone', events: [], carrierFields: [] });
  });

  it('reads the settings document’s block as the same shape, and nothing else in it', () => {
    const reading = inline.hookCarrierReadingOf(
      JSON.stringify({
        colorScheme: 'dark',
        hooks: {
          'format-on-save': {
            Stop: [{ matcher: '*', hooks: [{ command: './scripts/format.sh' }] }],
          },
        },
      }),
      'antigravity-cli/settings.json',
    );
    expect(reading.carrierForm).toBe('contained');
    expect(reading.events.map((declaration) => declaration.event)).toEqual(['Stop']);
    expect(reading.events[0]?.namedHook?.name).toBe('format-on-save');
  });

  it('is two carriers rather than one, and the standalone one serves both roots', () => {
    // The home's `config/hooks.json` reaches the same unit the workspace's
    // `.agents/hooks.json` does — one documented file shape at two roots —
    // while the settings document's block is the other carrier.
    const standaloneHome = globalRule('antigravity.global.hooks');
    const inlineHome = globalRule('antigravity.global.hooks.inline');
    expect(standaloneHome).toBeInstanceOf(AntigravityCompiledStandaloneHookRule);
    expect(inlineHome).toBeInstanceOf(AntigravityCompiledInlineHookRule);
    expect(repositoryRule('antigravity.repo.hooks')).toBeInstanceOf(
      AntigravityCompiledStandaloneHookRule,
    );
  });
});

describe('the MCP carrier reading (T021)', () => {
  /** The standalone profile, at either root. */
  const carrier = new AntigravityCompiledMcpCarrierRule(
    ANTIGRAVITY_INSPECTION_RULES['antigravity.repo.mcp'],
  );

  it('publishes every declared server as written, the legacy key included', () => {
    // Whether the vendor still accepts `httpUrl` is runtime this product does
    // not observe, so the field is shown as the file wrote it (FR-005).
    const declarations = carrier.serverDeclarationsOf(
      JSON.stringify({
        mcpServers: {
          tickets: { command: 'npx' },
          'internal-docs': { serverUrl: 'https://mcp.internal.example.com/sse' },
          'legacy-indexer': { httpUrl: 'http://localhost:8080/mcp' },
        },
      }),
      '.agents/mcp_config.json',
    );
    expect(declarations.map((declaration) => declaration.name)).toEqual([
      'tickets',
      'internal-docs',
      'legacy-indexer',
    ]);
    expect(declarations[1]?.fields[0]?.key).toBe('serverUrl');
    expect(declarations[2]?.fields[0]?.key).toBe('httpUrl');
  });

  it('reads nothing from an absent or non-mapping container', () => {
    expect(carrier.serverDeclarationsOf('{}', '.agents/mcp_config.json')).toEqual([]);
    expect(carrier.serverDeclarationsOf('{ "mcpServers": [] }', '.agents/mcp_config.json')).toEqual(
      [],
    );
  });
});

describe('the custom agent and the settings document’s policy (T021, T040)', () => {
  /** Both admitted agent shapes are this one unit; only the selectors differ. */
  const agent = new AntigravityCompiledAgentRule(
    ANTIGRAVITY_INSPECTION_RULES['antigravity.repo.agent.file'],
  );

  /** The home settings document's `permissions` object. */
  const permissions = new AntigravityCompiledPermissionsCarrierRule(
    ANTIGRAVITY_INSPECTION_RULES['antigravity.global.permissions'],
  );

  it('names an agent by the `name` its frontmatter declares', () => {
    const presentation = agent.agentPresentationOf(
      '---\nname: reviewer\nsubagent: true\n---\n\nReview the change.\n',
    );
    expect(agent.agentNameOf('.agents/agents/reviewer.md', presentation.metadata)).toBe('reviewer');
    expect(presentation.instructionsText).toContain('Review the change.');
  });

  it('answers null for an agent declaring no usable name', () => {
    // `null` rather than the empty string, so no name at all and an authored
    // empty name stay distinguishable (FR-007).
    const presentation = agent.agentPresentationOf(
      '---\ndescription: no name here\n---\n\nBody.\n',
    );
    expect(agent.agentNameOf('.agents/agents/reviewer.md', presentation.metadata)).toBeNull();
  });

  it('publishes the whole `permissions` object, each entry as written', () => {
    // Nothing is matched against a command, a path, or a URL, and the
    // documented deny-then-ask-then-allow precedence is not performed here
    // (FR-025).
    const declared = permissions.declaredPolicyOf(
      JSON.stringify({
        colorScheme: 'dark',
        permissions: {
          allow: ['command(*)'],
          ask: ['read_file(/var/log/app)'],
          deny: ['command(rm -rf)'],
        },
      }),
      'antigravity-cli/settings.json',
    );
    expect(declared?.map((entry) => entry.key)).toEqual(['allow', 'ask', 'deny']);
  });

  it('answers null where the document declares no policy at all', () => {
    // No policy rather than an empty one: the file then reaches no
    // permissions row.
    expect(
      permissions.declaredPolicyOf('{ "colorScheme": "dark" }', 'antigravity-cli/settings.json'),
    ).toBeNull();
  });
});

describe('the Global units the consented home scan executes (T040)', () => {
  it('compiles the home’s two skill shapes to the two units their rows are', async () => {
    // Two rules at the consented home for the reason the workspace has two:
    // the row units differ, and the unit is the rule's own declared fact. A
    // single rule carrying all three selectors gave the flat file the folder's
    // unit, so `antigravity-cli/skills/refactor.md` and `triage.md` resolved to
    // one row named after the directory they share and the census published
    // every other file in it — a `notes.txt` beside them included — as one
    // skill's companions (spec.md § FR-004).
    const directory = globalRule('antigravity.global.skill.directory');
    expect(directory).toBeInstanceOf(AntigravityCompiledSkillRule);
    expect(directory.kind).toBe('skill');
    // The terminal's own root and the shared configuration directory's, both
    // folder-shaped.
    expect(directory.plan.selectors).toHaveLength(2);

    const file = globalRule('antigravity.global.skill.file');
    expect(file).toBeInstanceOf(AntigravityCompiledFileSkillRule);
    expect(file.kind).toBe('skill');
    expect(file.plan.selectors).toHaveLength(1);

    const flat = await recognizeCandidateForVendors(
      {
        matchedPath: 'antigravity-cli/skills/refactor.md',
        absolutePath: join(root, 'antigravity-cli/skills/refactor.md'),
        sourceRoot: root,
        admissions: [{ compiled: file, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText: '---\nname: refactor\n---\n\nExtract the function.\n',
      },
      ['antigravity'],
    );
    expect(
      flat.recognitions[0]?.details.kind === 'skill' && flat.recognitions[0].details.rowUnit,
    ).toBe('file');
    // Nothing is enumerated for it, so the files beside it stay other rows.
    expect(flat.directories).toEqual([]);

    const folder = await recognizeCandidateForVendors(
      {
        matchedPath: 'antigravity-cli/skills/release-notes/SKILL.md',
        absolutePath: join(root, 'antigravity-cli/skills/release-notes/SKILL.md'),
        sourceRoot: root,
        admissions: [{ compiled: directory, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText: '---\nname: notes\n---\n\nGroup by area.\n',
      },
      ['antigravity'],
    );
    expect(
      folder.recognitions[0]?.details.kind === 'skill' && folder.recognitions[0].details.rowUnit,
    ).toBe('directory');
    expect(folder.directories).toEqual(['antigravity-cli/skills/release-notes/']);
  });

  it('compiles one unit per Global carrier, each answering its own kind', () => {
    // Which class a rule compiles to is what decides the question its
    // admitted file is asked. The home's carriers are the same units the
    // workspace's are, with only the boundary differing — which is why a home
    // `config/hooks.json` and a workspace `.agents/hooks.json` publish the
    // same declarations.
    expect(globalRule('antigravity.global.mcp')).toBeInstanceOf(AntigravityCompiledMcpCarrierRule);
    // Both custom-agent shapes, which the vendor's subagents page gives for
    // the user tier as it gives them for the workspace: one file below
    // `config/agents/`, and an `agent.md` inside its own directory there.
    // Admitting only the first left a reader's folder-shaped global agent off
    // every list while its workspace twin was listed.
    expect(globalRule('antigravity.global.agent.file')).toBeInstanceOf(
      AntigravityCompiledAgentRule,
    );
    expect(globalRule('antigravity.global.agent.directory')).toBeInstanceOf(
      AntigravityCompiledAgentRule,
    );
    expect(globalRule('antigravity.global.permissions')).toBeInstanceOf(
      AntigravityCompiledPermissionsCarrierRule,
    );
    expect(globalRule('antigravity.global.context')).toBeInstanceOf(
      AntigravityCompiledInstructionRule,
    );
    expect(globalRule('antigravity.global.settings')).toBeInstanceOf(
      AntigravityCompiledOtherKindRule,
    );
  });

  it('admits the home settings document under three separate recognitions', () => {
    // One file, three rows: the document it is, the policy it declares, and
    // the hooks it can also carry — which detail answers follows from the row
    // a reader arrived through, never from the file (FR-007).
    const kinds = new Map(
      ANTIGRAVITY_GLOBAL_RULES.filter((compiled) =>
        [
          'antigravity.global.settings',
          'antigravity.global.permissions',
          'antigravity.global.hooks.inline',
        ].includes(compiled.rule.ruleId),
      ).map((compiled) => [compiled.rule.ruleId, compiled.kind]),
    );
    expect(kinds.get('antigravity.global.settings')).toBe('settings/config');
    expect(kinds.get('antigravity.global.permissions')).toBe('permissions');
    expect(kinds.get('antigravity.global.hooks.inline')).toBe('hook');
  });
});
