// T078/T293: the Codex skill's declared-name reading and the Codex MCP
// carrier's declaration reading (data-model.md § Field reading, FR-007,
// FR-028).
//
// The name is the one authored value recognition uses as identity: the key of
// a grouped inventory row and the heading a detail page shows. These cases pin
// its resolution semantics — the value a product loading the file has — while
// the detail-specific case proves every authored frontmatter entry,
// credential-shaped keys included, reaches the recognition in authored order.
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import {
  CODEX_DERIVED_FALLBACK_RULE,
  CODEX_REPOSITORY_RULES,
} from '../../../src/server/inspection/rules/codex';
import {
  CONTENT_FIXTURE_SECRET,
  MALFORMED_SKILL_CONTENT_CASES,
  SKILL_CONTENT_CASES,
} from '../../fixtures/content/build-fixtures';
import type { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';

// Selected by identity: the shipped Codex catalog holds the instruction rule
// too, and these cases are about the skill recognition alone.
const codexSkillRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.skill',
);

/**
 * An empty skill directory these cases enumerate. The recognizer runs the
 * census itself and propagates an enumeration failure rather than reporting an
 * empty directory, so the path has to exist — as it does in a real scan, where
 * the traversal found it. Nothing is written into it: what these cases are
 * about is the authored text, which is passed in directly.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-codex-metadata-'));
  mkdirSync(join(root, '.agents/skills/greet'), { recursive: true });
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Recognizes one authored `SKILL.md` at the fixture path. */
async function recognize(sourceText: string): Promise<ToolRecognition> {
  const matchedPath = '.agents/skills/greet/SKILL.md';
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: codexSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['codex'],
  );
  const [recognition] = recognitions;
  if (recognition === undefined) {
    throw new Error('expected one Codex recognition');
  }
  return recognition;
}

describe('Codex skill declared name', () => {
  it.each(SKILL_CONTENT_CASES.map((testCase) => [testCase.id, testCase] as const))(
    'publishes the name the parser resolved: %s',
    async (_id, testCase) => {
      const recognition = await recognize(testCase.sourceText);
      expect(recognition.parseStatus).toBe('parsed');
      const declaredName =
        recognition.details.kind === 'skill' ? (recognition.details.declaredName ?? null) : null;
      expect(declaredName).toBe(testCase.name);
    },
  );

  it('publishes the declarations and the instructions apart', async () => {
    // The detail surface is built from this: the keys the file declares, in
    // authored order, and the body with its frontmatter block removed. The
    // split is the parser's, so the two never overlap and nothing is invented.
    const recognition = await recognize(
      `---\nname: greet\ndescription: says hello\napi_key: ${CONTENT_FIXTURE_SECRET}\n---\n\n# Greet\n`,
    );
    if (recognition.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition.details.frontmatter).toEqual([
      {
        key: 'name',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'greet' },
      },
      {
        key: 'description',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'says hello' },
      },
      {
        key: 'api_key',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: CONTENT_FIXTURE_SECRET },
      },
    ]);
    expect(recognition.details.bodyText).toBe('\n# Greet\n');
    // Nothing the file did not write: the recognition carries no copy of the
    // complete source, which the detail response serves once as `sourceText`.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
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

  it('records the admitting rule and the path it matched on every provenance', async () => {
    const recognition = await recognize('---\nname: greet\n---\n');
    // Field by field rather than a deep equality: a provenance derives its
    // rule identifiers from the compiled rule it holds, and an equality
    // matcher's clone has no class behind those getters.
    expect(recognition.provenances).toHaveLength(1);
    const [provenance] = recognition.provenances;
    expect(provenance!.ruleId).toBe('codex.repo.skill');
    expect(provenance!.discoveryClass).toBe('static-candidate');
    expect(provenance!.matchedPath).toBe('.agents/skills/greet/SKILL.md');
  });

  it('resolves no environment reference the declared name contains', async () => {
    // The literal is published as written; nothing looks up `HOME` or `TOKEN`,
    // so no process value can reach a response (FR-026).
    const recognition = await recognize('---\nname: "$HOME/${TOKEN}"\n---\n');
    expect(recognition.details.kind === 'skill' && recognition.details.declaredName).toBe(
      '$HOME/${TOKEN}',
    );
    expect(JSON.stringify(recognition)).not.toContain(process.env['HOME'] ?? '\0unset');
  });
});

// Selected by identity for the carrier cases below.
const codexConfigRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.config',
);

/** Recognizes one authored carrier at its one admitted root path. */
async function recognizeCarrier(sourceText: string): Promise<readonly ToolRecognition[]> {
  const matchedPath = '.codex/config.toml';
  mkdirSync(join(root, '.codex'), { recursive: true });
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: codexConfigRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['codex'],
  );
  return recognitions;
}

describe('Codex MCP carrier reading (T293)', () => {
  it('reads the active root layer alone, under the carrier admission it came from', async () => {
    // Active project-config precedence, as the Inspector honestly has it: the
    // selected root's layer is the one in scope (FR-001), so the declarations
    // this recognition carries are that layer's own — deeper layers are near
    // misses the matcher never admits, and no cross-layer merge is projected
    // because its inputs are runtime this tool never observes (FR-009).
    const recognitions = await recognizeCarrier('[mcp_servers.rooted]\ncommand = "npx"\n');
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'codex.repo.config',
      discoveryClass: 'static-candidate',
      matchedPath: '.codex/config.toml',
    });
    expect(
      recognitions[0]!.details.kind === 'MCP' &&
        recognitions[0]!.details.servers.map((server) => server.name),
    ).toEqual(['rooted']);
  });

  it('fails the whole recognition for duplicate server names, publishing nothing', async () => {
    // TOML itself rejects a table declared twice, so a duplicate name inside
    // the one readable layer is a document that cannot be parsed: the
    // recognition fails all-or-nothing rather than picking a winner the file
    // does not establish (FR-028).
    const recognitions = await recognizeCarrier(
      '[mcp_servers.dup]\ncommand = "a"\n\n[mcp_servers.dup]\ncommand = "b"\n',
    );
    expect(recognitions[0]!.parseStatus).toBe('failed');
    expect(recognitions[0]!.details).toEqual({ kind: 'MCP', servers: [] });
  });

  it('presents no general configuration: the carrier admission yields MCP alone', async () => {
    // The carrier declares plenty beside its servers — the fallback list, a
    // trust-shaped flag — and none of it is published: the file-unit
    // `settings/config` recognition is a later phase's, so the one
    // recognition here is the MCP kind and its declarations are the servers
    // alone.
    const recognitions = await recognizeCarrier(
      [
        'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
        'trust_level = "trusted"',
        '',
        '[mcp_servers.only]',
        'command = "npx"',
        '',
      ].join('\n'),
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.details.kind).toBe('MCP');
    const serialized = JSON.stringify(recognitions);
    expect(serialized).not.toContain('project_doc_fallback_filenames');
    expect(serialized).not.toContain('trust_level');
  });

  it('keeps the activated fallback provenance derived, beside the carrier admission', async () => {
    // The same physical file both seeds the fallback derivation and carries
    // the MCP declarations; the two stay two provenances of two records — a
    // derived instructions admission on the fallback file, a static MCP
    // admission on the carrier — and neither rewrites the other.
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: 'TEAM_GUIDE.md',
        absolutePath: join(root, 'TEAM_GUIDE.md'),
        sourceRoot: root,
        sourceText: '# configured fallback\n',
        admissions: [
          { compiled: CODEX_DERIVED_FALLBACK_RULE, origin: { planIndex: 3, selectorIndex: 0 } },
        ],
      },
      ['codex'],
    );
    expect(recognitions[0]!.details.kind).toBe('instructions');
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'codex.derived.fallback-basename',
      discoveryClass: 'bounded-derived-candidate',
    });
  });
});
