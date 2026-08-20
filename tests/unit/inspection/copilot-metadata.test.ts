// T168, T344, T364: the Copilot skill's declared-name reading and its
// recognition-level facts, the Copilot CLI MCP carrier's whole-entry field
// reading over both documented schemas, and the VS Code MCP carrier's JSONC
// `servers` reading beside the reading-less 1.118+ root provenance
// (data-model.md § Field reading, FR-003, FR-007, FR-009, FR-026, FR-028).
//
// Copilot reads a skill through the one shared extractor, so these cases pin
// what is Copilot's own: recognitions for exactly the three fixed directory
// spellings, the complete parse published at once — Copilot documents
// metadata-first progressive content loading at runtime, and the recognition
// publishes every declared key and the whole body with no field claiming a
// loading, selection, or surface state — independent same-name recognitions
// with no winner mark (the product-level statement is the registry's derived
// `surface-dependent` rule, `skill-resolution.ts`), no recognition for a
// context Copilot's own rule did not admit, environment-reference
// non-resolution, and the exact admitting evidence on every provenance.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import {
  COPILOT_CLI_MCP_SELECTION_STRATEGY,
  COPILOT_VSCODE_MCP_SELECTION_STRATEGY,
} from '../../../src/shared/registries/copilot/strategies';
import { COPILOT_VSCODE_MCP_BEHAVIOR } from '../../../src/shared/registries/copilot/behaviors';
import {
  CONTENT_FIXTURE_SECRET,
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

const copilotSkillRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.skill',
)!;
const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;

/**
 * Which authored selector of `copilot.repo.skill` a fixture path matches: the
 * rule ships one program per fixed directory spelling, in registry order.
 */
function copilotSelectorIndexOf(matchedPath: string): number {
  return ['.github/', '.agents/', '.claude/'].findIndex((prefix) => matchedPath.startsWith(prefix));
}

/**
 * Where the skill rule sits in the catalog these cases submit. A plan index
 * names a position in that list rather than a rule, so it is read from the
 * list instead of written as a constant that a new Copilot rule would silently
 * invalidate.
 */
const copilotSkillPlanIndex = COPILOT_REPOSITORY_RULES.indexOf(copilotSkillRule);

/**
 * Empty skill directories these cases enumerate. The recognizer runs the
 * census itself and propagates an enumeration failure rather than reporting an
 * empty directory, so the paths have to exist — as they do in a real scan,
 * where the traversal found them. Nothing is written into them: what these
 * cases are about is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-copilot-metadata-'));
  mkdirSync(join(root, '.github/skills/greet'), { recursive: true });
  mkdirSync(join(root, '.github/skills/ship'), { recursive: true });
  mkdirSync(join(root, '.agents/skills/orbit'), { recursive: true });
  mkdirSync(join(root, '.claude/skills/lander'), { recursive: true });
  mkdirSync(join(root, 'packages/api/.claude/skills/deploy'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored `SKILL.md` at the given Copilot-admitted path. */
async function recognize(
  sourceText: string,
  matchedPath = '.github/skills/greet/SKILL.md',
): Promise<ToolRecognition> {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [
        {
          compiled: copilotSkillRule!,
          origin: {
            planIndex: copilotSkillPlanIndex,
            selectorIndex: copilotSelectorIndexOf(matchedPath),
          },
        },
      ],
      sourceText,
    },
    ['copilot'],
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Copilot recognition');
  }
  return recognition;
}

describe('Copilot skill declared name', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes the name the parser resolved: %s',
    async (_id, testCase) => {
      // The shared authored-content cases pin resolution semantics — quoting,
      // escapes, repeats, aliases, tags, astral characters — and Copilot reads
      // them exactly as Codex and Claude do, through the one shared extractor.
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes the complete parse at once, with no loading or selection field', async () => {
    // Copilot's surfaces discover metadata first and load a relevant skill's
    // content progressively — a runtime fact of the vendor's, recorded in its
    // maintained behavior statements (FR-009). The recognition is not that
    // runtime: it publishes every declared key and the complete instructions
    // in one record, and the exact key sets — the whole record's and its
    // details' — prove no field claims a loading, selection, or surface state
    // on the vendor's behalf (data-model.md § ToolRecognition).
    const recognition = await recognize(
      `---\nname: greet\ndescription: says hello\napi_key: ${CONTENT_FIXTURE_SECRET}\n---\n\n# Greet\n\nSay hello.\n`,
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    // Sorted before comparing: the record is internal and never serialized,
    // so what is closed is the field set, not a property enumeration order.
    expect(Object.keys(recognition).toSorted()).toEqual([
      'details',
      'diagnosticIds',
      'parseStatus',
      'provenances',
      'sourceRelativePath',
      'tool',
    ]);
    expect(Object.keys(recognition.details).toSorted()).toEqual([
      'bodyText',
      'declaredName',
      'frontmatter',
      'kind',
    ]);
    expect(recognition.details.frontmatter).toEqual([
      { key: 'name', keyKind: 'string', value: { kind: 'scalar', text: 'greet' } },
      { key: 'description', keyKind: 'string', value: { kind: 'scalar', text: 'says hello' } },
      {
        key: 'api_key',
        keyKind: 'string',
        value: { kind: 'scalar', text: CONTENT_FIXTURE_SECRET },
      },
    ]);
    expect(recognition.details.bodyText).toBe('\n# Greet\n\nSay hello.\n');
    // Nothing the file did not write: the recognition carries no copy of the
    // complete source, which the detail response serves once as `sourceText`.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
  });

  it('recognizes two same-name files independently, with no winner mark', async () => {
    // `.github/skills/ship` and `.claude/skills/lander` both declare `voyage`.
    // Which one a Copilot surface would select depends on runtime this tool
    // never observes, and the CLI's documented first-found winner is not the
    // product's statement — the grouped row derives `surface-dependent` from
    // the three shipped selection strategies (`skill-resolution.ts`, FR-007).
    // Each recognition therefore publishes only its own file's facts.
    const [ship, lander] = await Promise.all([
      recognize('---\nname: voyage\n---\n\nGitHub ship.\n', '.github/skills/ship/SKILL.md'),
      recognize('---\nname: voyage\n---\n\nClaude lander.\n', '.claude/skills/lander/SKILL.md'),
    ]);
    for (const recognition of [ship, lander]) {
      expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
        'voyage',
      );
      // The closed record and details key sets, sorted before comparing —
      // enumeration order is not a contract of an internal record: a winner
      // or order mark on either level would widen one of them (data-model.md
      // § ToolRecognition).
      expect(Object.keys(recognition).toSorted()).toEqual([
        'details',
        'diagnosticIds',
        'parseStatus',
        'provenances',
        'sourceRelativePath',
        'tool',
      ]);
      expect(Object.keys(recognition.details).toSorted()).toEqual([
        'bodyText',
        'declaredName',
        'frontmatter',
        'kind',
      ]);
    }
    expect(ship.provenances.map((provenance) => provenance.matchedPath)).toEqual([
      '.github/skills/ship/SKILL.md',
    ]);
    expect(lander.provenances.map((provenance) => provenance.matchedPath)).toEqual([
      '.claude/skills/lander/SKILL.md',
    ]);
    // Each recognition carries its own file's instructions: a shared name is
    // not a shared identity, and reusing another file's details by name would
    // keep every assertion above passing.
    expect(ship.details.kind === 'skill' && ship.details.bodyText).toBe('\nGitHub ship.\n');
    expect(lander.details.kind === 'skill' && lander.details.bodyText).toBe('\nClaude lander.\n');
  });

  it('shares one parse across the tools recognizing one physical file', async () => {
    // A root `.claude` skill is one candidate two products admit. What the
    // file declares does not depend on which product reads it, so both
    // recognitions publish the one extraction — the same declarations and the
    // same instructions — rather than two parses that could disagree
    // (data-model.md § ToolRecognition).
    const matchedPath = '.claude/skills/lander/SKILL.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [
          {
            compiled: copilotSkillRule!,
            origin: {
              planIndex: copilotSkillPlanIndex,
              selectorIndex: copilotSelectorIndexOf(matchedPath),
            },
          },
          { compiled: claudeSkillRule!, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
        sourceText: '---\nname: lander-skill\ndescription: shared\n---\n\n# Lander\n',
      },
      ['copilot', 'claude'],
    );
    expect(recognitions.map((recognition) => recognition.tool)).toEqual(['copilot', 'claude']);
    const [copilot, claude] = recognitions;
    expect(copilot!.details).toEqual(claude!.details);
    if (copilot!.details.kind !== 'skill' || claude!.details.kind !== 'skill') {
      throw new Error('expected skill recognitions');
    }
    // Identity, not equality: two parses of the same text would produce equal
    // but distinct values, so the shared array is what proves the extraction
    // ran once and both recognitions publish it.
    expect(copilot!.details.frontmatter).toBe(claude!.details.frontmatter);
    expect(copilot!.details.declaredName).toBe('lander-skill');
  });

  it('recognizes nothing for a context Copilot’s own rule did not admit', async () => {
    // A nested `.claude` skill is Claude's alone: Claude documents lazy
    // descendant discovery and Copilot documents no downward lookup from a
    // root context, so the candidate arrives with Claude's admission only
    // (FR-003). Asked for Copilot, the engine invents no recognition — the
    // same silence a configured or environment-supplied skills root gets by
    // never being admitted at all.
    const matchedPath = 'packages/api/.claude/skills/deploy/SKILL.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeSkillRule!, origin: { planIndex: 1, selectorIndex: 0 } }],
        sourceText: '---\nname: nested\n---\n',
      },
      ['copilot'],
    );
    expect(recognitions).toEqual([]);
  });

  it.each(MALFORMED_SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'fails the whole recognition without guessing a name: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('failed');
      // The file itself is unaffected: it stays an admitted, readable
      // candidate whose complete source the detail route serves (FR-028).
      if (recognition.details.kind !== 'skill') {
        throw new Error('expected a skill recognition');
      }
      expect('declaredName' in recognition.details).toBe(false);
      // All-or-nothing: a failed extraction publishes no partial declarations
      // and no instructions either — not just no name (FR-028).
      expect(recognition.details.frontmatter).toEqual([]);
      expect(recognition.details.bodyText).toBe('');
    },
  );

  it('resolves no environment reference the declared name contains', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response (FR-026).
    const recognition = await recognize('---\nname: "$HOME/${TOKEN}"\n---\n');
    expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
      '$HOME/${TOKEN}',
    );
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('records the admitting rule and matched path on each fixed spelling’s provenance', async () => {
    // One admission per fixed directory spelling, each read-authorized by the
    // one `copilot.repo.skill` record (contracts/inspection-path-allowlist.md
    // § Read authorization). Field by field rather than a deep equality: a
    // provenance derives its rule identifiers from the compiled rule it
    // holds, and an equality matcher's clone has no class behind those
    // getters.
    for (const matchedPath of [
      '.github/skills/greet/SKILL.md',
      '.agents/skills/orbit/SKILL.md',
      '.claude/skills/lander/SKILL.md',
    ]) {
      const recognition = await recognize('---\nname: placed\n---\n', matchedPath);
      expect(recognition.provenances).toHaveLength(1);
      const [provenance] = recognition.provenances;
      expect(provenance!.ruleId).toBe('copilot.repo.skill');
      expect(provenance!.discoveryClass).toBe('static-candidate');
      expect(provenance!.matchedPath).toBe(matchedPath);
    }
  });
});

describe('Copilot instruction declarations (T261)', () => {
  /** Recognizes one authored Copilot instruction file at the given admitted path. */
  async function recognizeInstruction(
    sourceText: string,
    matchedPath: string,
    ruleId: string,
  ): Promise<ToolRecognition> {
    const compiled = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === ruleId,
    )!;
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['copilot'],
    );
    expect(recognitions).toHaveLength(1);
    return recognitions[0]!;
  }

  it('publishes every declared key by the name the file wrote, in the file’s order', async () => {
    // No closed field catalog exists for an instruction file: what it declares
    // is the author's, so the detail leads with the keys they wrote, in their
    // order, and a key this product has no opinion about is published exactly
    // like one it does (FR-007). `applyTo` is one of those keys — it also
    // keys the row, which is a fact about the range and changes nothing about
    // how the declaration itself is shown.
    const recognition = await recognizeInstruction(
      [
        '---',
        "applyTo: 'src/frontend/**'",
        'excludeAgent: copilot-swe-agent',
        'description: Frontend conventions',
        'unknownToThisProduct: 7',
        '---',
        '',
        '# Frontend',
        '',
      ].join('\n'),
      '.github/instructions/frontend.instructions.md',
      'copilot.repo.instructions.path',
    );
    if (recognition.details.kind !== 'instructions') {
      throw new Error('expected an instructions recognition');
    }
    expect(recognition.details.frontmatter.map((entry) => entry.key)).toEqual([
      'applyTo',
      'excludeAgent',
      'description',
      'unknownToThisProduct',
    ]);
    // Values are what the parser resolved under the product's fixed YAML
    // semantics — an unquoted `7` is the number it resolves to — never a
    // slice of the authored line (data-model.md § Field reading).
    expect(recognition.details.frontmatter.map((entry) => entry.value)).toEqual([
      { kind: 'scalar', text: 'src/frontend/**' },
      { kind: 'scalar', text: 'copilot-swe-agent' },
      { kind: 'scalar', text: 'Frontend conventions' },
      { kind: 'scalar', text: '7' },
    ]);
    // The body is the file with its declarations removed, which is the other
    // half of the one parse the detail shows.
    expect(recognition.details.bodyText).toContain('# Frontend');
    expect(recognition.details.bodyText).not.toContain('applyTo');
  });

  it('publishes a literal credential unmasked and resolves no environment reference', async () => {
    // The two rules every authored value follows: what the file wrote is what
    // the reader sees, with no masking, reveal state, or substitution
    // (FR-025, FR-026). A credential is readable only through the detail
    // route, which is a decision about where, never about whether.
    process.env['ACI_T261_METADATA'] = 'resolved-from-environment';
    try {
      const recognition = await recognizeInstruction(
        `---\ntoken: ${CONTENT_FIXTURE_SECRET}\nendpoint: \${ACI_T261_METADATA}/v1\n---\n\n# Repository\n`,
        '.github/copilot-instructions.md',
        'copilot.repo.instructions.repository',
      );
      const serialized = JSON.stringify(recognition);
      expect(serialized).toContain(CONTENT_FIXTURE_SECRET);
      expect(serialized).toContain('${ACI_T261_METADATA}');
      expect(serialized).not.toContain('resolved-from-environment');
    } finally {
      delete process.env['ACI_T261_METADATA'];
    }
  });

  it('states no surface condition, enablement, or winner on the recognition', async () => {
    // What a session would do with the file turns on runtime this product does
    // not observe: which surface is running, whether a location setting
    // enables it, which of several applicable files a layer picks. Copilot's
    // three surfaces document incompatible composition, so a single answer
    // would be an invention (FR-009). The recognition therefore carries the
    // file's own declarations and what it governs, and nothing else.
    const recognition = await recognizeInstruction(
      "---\napplyTo: '**'\n---\n\n# Everything\n",
      '.github/instructions/all.instructions.md',
      'copilot.repo.instructions.path',
    );
    const serialized = JSON.stringify(recognition).toLowerCase();
    for (const claim of [
      'enabled',
      'disabled',
      'selected',
      'winner',
      'precedence',
      'active',
      'loaded',
      'applies',
    ]) {
      expect(serialized, claim).not.toContain(claim);
    }
  });

  it('carries the admitting rule and the surfaces it rests on, on every provenance', async () => {
    // Field by field rather than a deep equality: a provenance derives its
    // identifiers and its surfaces from the compiled rule it holds, and an
    // equality matcher's clone has no class behind those getters.
    const recognition = await recognizeInstruction(
      '# API context\n',
      'packages/api/.github/copilot-instructions.md',
      'copilot.repo.instructions.repository-cli-context',
    );
    expect(recognition.provenances).toHaveLength(1);
    const [provenance] = recognition.provenances;
    expect(provenance!.ruleId).toBe('copilot.repo.instructions.repository-cli-context');
    expect(provenance!.discoveryClass).toBe('static-candidate');
    expect(provenance!.matchedPath).toBe('packages/api/.github/copilot-instructions.md');
    expect(provenance!.recognizingSurfaces).toEqual(['copilot-cli']);
  });
});

const copilotMcpRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp',
)!;
if (copilotMcpRule.kind !== 'MCP' || copilotMcpRule.mcpReading !== 'own') {
  throw new Error('expected the compiled Copilot MCP carrier rule');
}

describe('the Copilot CLI MCP carrier reading (T344)', () => {
  it('reads the wrapper schema by the keys the file wrote, values literal', () => {
    // The `mcpServers` object form: one declaration per named map entry, the
    // fields exactly as resolved — the credential whole, the environment
    // reference as its own characters, a relative command joined to no base
    // (FR-026; `claude-metadata.test.ts` proves the same for Claude's
    // reading of the shared root file).
    const servers = copilotMcpRule.serverDeclarationsOf(
      JSON.stringify({
        mcpServers: {
          tavily: {
            command: './scripts/run.sh',
            env: { API_KEY: 'tvly-SECRET', ENDPOINT: '${TAVILY_ENDPOINT}' },
          },
          odd: { command: 42 },
          broken: 'not a mapping',
        },
      }),
    );
    expect(servers.map((server) => server.name)).toEqual(['tavily', 'odd']);
    const serialized = JSON.stringify(servers);
    expect(serialized).toContain('tvly-SECRET');
    expect(serialized).toContain('${TAVILY_ENDPOINT}');
    expect(serialized).toContain('./scripts/run.sh');
    // The malformed-command declaration is still a named declaration this
    // release lists — no field schema — while a non-mapping entry declares no
    // server and is omitted whole.
    expect(servers[1]).toEqual({
      name: 'odd',
      fields: [{ key: 'command', keyKind: 'string', value: { kind: 'scalar', text: '42' } }],
    });
  });

  it('reads the bare top-level schema the CLI alone documents', () => {
    // The second documented project-level form: each top-level key is a
    // server name (github.copilot.cli.mcp § Adding per-repository MCP
    // servers), with the same structural classification — a non-mapping
    // top-level entry declares no server and is omitted whole.
    const servers = copilotMcpRule.serverDeclarationsOf(
      JSON.stringify({
        playwright: { type: 'local', command: 'npx', args: ['@playwright/mcp@latest'] },
        note: 'not a mapping',
      }),
    );
    expect(servers.map((server) => server.name)).toEqual(['playwright']);
    expect(JSON.stringify(servers)).toContain('@playwright/mcp@latest');
  });

  it('lets a declared mcpServers key select the wrapper form, never a bare server', () => {
    // The vendor documents `mcpServers` as the wrapper, so a file declaring
    // that key is the wrapper form: a non-mapping wrapper declares none, and
    // the key itself is never read as a bare server of that name.
    expect(
      copilotMcpRule.serverDeclarationsOf(
        JSON.stringify({ mcpServers: 'not a mapping', other: { command: 'x' } }),
      ),
    ).toEqual([]);
    expect(copilotMcpRule.serverDeclarationsOf('{}')).toEqual([]);
    expect(copilotMcpRule.serverDeclarationsOf('[1, 2]')).toEqual([]);
  });

  it('throws on text strict JSON cannot parse, for the extraction boundary to confine', () => {
    // The CLI carriers are strict JSON: a comment or trailing comma fails the
    // document exactly as the vendor's own reader would, and the recognizer's
    // extraction boundary turns the throw into that recognition's `failed`
    // state while the carrier stays an admitted candidate (FR-028).
    expect(() => copilotMcpRule.serverDeclarationsOf('{ "mcpServers": {')).toThrow();
    expect(() => copilotMcpRule.serverDeclarationsOf('// comment\n{}')).toThrow();
    expect(() => copilotMcpRule.serverDeclarationsOf('')).toThrow();
  });

  it('records the documented source order as the strategy, not as a projection', () => {
    // Session-additional → plugin → workspace → User selection of whole
    // entries, with the workspace files' own duplicate order documented too —
    // closer-to-`cwd` wins, `.mcp.json` over `.github/mcp.json` in one
    // directory — is `copilot.cli.mcp.selection`'s statement. It lives in the
    // maintained registry record, gated reciprocally against the bilingual
    // contract row, and no recognition field projects a winner (FR-009).
    expect(COPILOT_CLI_MCP_SELECTION_STRATEGY.operations).toEqual(['select-first', 'replace']);
    expect(COPILOT_CLI_MCP_SELECTION_STRATEGY.tool).toBe('copilot');
    expect(COPILOT_CLI_MCP_SELECTION_STRATEGY.documentationStatus).toBe('documented');
  });
});

const copilotVscodeMcpRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp.vscode',
)!;
if (copilotVscodeMcpRule.kind !== 'MCP' || copilotVscodeMcpRule.mcpReading !== 'own') {
  throw new Error('expected the compiled VS Code MCP carrier rule');
}

describe('the Copilot VS Code MCP carrier reading (T364)', () => {
  it('reads the documented servers schema as JSONC, by the keys the file wrote', () => {
    // The editor configuration format: comments and a trailing comma are the
    // format's own syntax, the non-mapping entry declares no server and is
    // omitted whole, and the `inputs` and `sandbox` sections beside
    // `servers` declare nothing. The values are the carrier's own literals -
    // the credential whole, the input reference as its own characters,
    // resolved against nothing (FR-007, FR-026).
    const servers = copilotVscodeMcpRule.serverDeclarationsOf(`{
  // Workspace servers.
  "servers": {
    "gh": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ghp-SECRET" }
    },
    "local": { "command": "./run.sh", "env": { "KEY": "\${input:api-key}" } },
    "broken": "not an object",
  },
  "inputs": [{ "id": "api-key" }],
  "sandbox": { "network": {} }
}`);
    expect(servers.map((server) => server.name)).toEqual(['gh', 'local']);
    const serialized = JSON.stringify(servers);
    expect(serialized).toContain('ghp-SECRET');
    expect(serialized).toContain('${input:api-key}');
  });

  it('reads no bare form: the guide documents the wrapper alone', () => {
    // Top-level mapping keys are not server names here - unlike the CLI's
    // second schema - so a document without `servers` declares none, as does
    // a non-mapping `servers`.
    expect(
      copilotVscodeMcpRule.serverDeclarationsOf(JSON.stringify({ playwright: { command: 'x' } })),
    ).toEqual([]);
    expect(
      copilotVscodeMcpRule.serverDeclarationsOf(JSON.stringify({ servers: 'not a mapping' })),
    ).toEqual([]);
  });

  it('throws on text JSONC cannot parse, for the extraction boundary to confine', () => {
    expect(() => copilotVscodeMcpRule.serverDeclarationsOf('{ "servers": {')).toThrow();
    expect(() => copilotVscodeMcpRule.serverDeclarationsOf('')).toThrow();
  });

  it('owns no reading for the 1.118+ root provenance, whose conflict stays recorded', () => {
    // The root `.mcp.json` admission is path/surface provenance only: its
    // compiled unit declares no reading, so the root carrier's declarations
    // can only ever be the co-admitting CLI rule's own extraction. The
    // location conflict between the current guide and the 1.118 release note
    // - and the unknown root schema and total same-name order - are the
    // behavior's and strategy's recorded facts, never a projection (FR-009).
    const rootProvenance = COPILOT_REPOSITORY_RULES.find(
      (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp.vscode-root',
    )!;
    if (rootProvenance.kind !== 'MCP') {
      throw new Error('expected the compiled VS Code root MCP provenance rule');
    }
    expect(rootProvenance.mcpReading).toBe('none');
    expect(rootProvenance.rule.documentationStatus).toBe('conflict');
    expect(COPILOT_VSCODE_MCP_BEHAVIOR.documentationStatus).toBe('conflict');
    expect(COPILOT_VSCODE_MCP_SELECTION_STRATEGY.operations).toEqual([
      'merge-map',
      'replace',
      'unknown-order',
    ]);
    expect(COPILOT_VSCODE_MCP_SELECTION_STRATEGY.documentationStatus).toBe('conflict');
  });
});
