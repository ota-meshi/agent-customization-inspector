// T170/T218: the typed detail identity of a shared file's recognitions and of
// an instruction row (FR-007, FR-030, data-model.md § Inventory unit,
// § Skill presentation).
//
// One physical file two products admit is one definition per recognizing
// tool, and the client keeps those definitions separate all the way to the
// detail route: each keeps its own tool, its own documented invocation name,
// and its own `/skills/<tool>/<source-relative path>` URL, and the tool
// filter narrows a shared row to exactly the addressed tool's definition.
// Nothing merges the recognitions into one product-neutral record, and a
// single shared file is one skill per tool — never a same-name collision.
//
// These suites drive the filter view and the route builder rather than
// mounting the page component: the unit project has no single-file-component
// compiler (see `inventory.test.ts`), and the rendered per-tool captioning is
// asserted against the real page in `tests/e2e/copilot-skills-detail.spec.ts`.
import { describe, expect, it } from 'vitest';
import { ref, shallowRef, type Ref } from 'vue';

import { detailRoute } from '../../../src/app/components/detail-route';
import { skillDetailRoute } from '../../../src/app/components/skill-detail-route';
import { useInventoryFilters } from '../../../src/app/composables/filters';
import { pathPresentationLabel } from '../../../src/shared/entities';
import type {
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  SessionSnapshot,
  SkillDefinitionDto,
  SkillInventoryEntryDto,
  SourceDto,
} from '../../../src/shared/api-types';
import type { CustomizationKind, SupportedTool } from '../../../src/shared/entities';

const REPOSITORY_SOURCE: SourceDto = {
  sourceId: 'src-repo',
  kind: 'repository',
  tool: null,
  enabled: true,
  status: 'ready',
  boundary: { displayRoot: '/tmp/repo', origin: 'process-cwd' },
  generation: 1,
  scanRequestId: null,
  progress: null,
  diagnosticIds: [],
};

/** The shared physical file both suites revolve around. */
const SHARED_PATH = '.claude/skills/lander/SKILL.md';

/** A published file: its own facts only, as the snapshot carries them. */
function file(path: string): CustomizationFileSummaryDto {
  return {
    sourceId: 'src-repo',
    sourceRelativePath: path,
    diagnosticIds: [],
    encoding: 'utf-8',
    hadLeadingBom: false,
    sizeBytes: 12,
  };
}

/** One definition — one `(file, tool)` recognition — with its own invocation name. */
function definition(tool: SupportedTool, path: string, invocationName: string): SkillDefinitionDto {
  return {
    sourceRelativePath: path,
    tool,
    surfaces: [],
    parseStatus: 'parsed',
    invocationName,
    diagnosticIds: [],
    companionFiles: [],
  };
}

/**
 * The shared-file row: the authored `voyage` in `.claude/skills/lander/`,
 * admitted by Copilot and Claude. Both tools resolve the authored row name,
 * while their documented invocation names differ — Copilot invokes the
 * authored identity and Claude Code its directory-derived command — which is
 * exactly what must survive to the detail route unmerged. Definitions in the
 * closed tool order, as the server publishes them.
 */
function sharedRow(): SkillInventoryEntryDto {
  return {
    name: 'voyage',
    definitions: [
      definition('copilot', SHARED_PATH, 'voyage'),
      definition('claude', SHARED_PATH, 'lander'),
    ],
    sameNameResolutions: [],
  };
}

function snapshotWith(
  files: readonly CustomizationFileSummaryDto[],
  skills: readonly SkillInventoryEntryDto[],
  instructions: readonly InstructionInventoryEntryDto[] = [],
): SessionSnapshot {
  return {
    sessionId: 'session-1',
    createdAt: '2026-07-25T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [REPOSITORY_SOURCE],
    files,
    instructions,
    rules: [],
    permissions: [],
    skills,
    mcp: [],
    diagnostics: [],
    repositoryGeneration: 1,
    globalGeneration: null,
    snapshotState: 'current',
    staleFailures: [],
    globalControl: null,
    globalEnableInProgress: null,
    globalDisableInProgress: null,
    globalContentEpoch: 0,
    sessionDiagnosticIds: [],
    repositoryFailureDiagnosticId: null,
  };
}

// The selection belongs to the caller, so each case declares it the way a page
// does and passes it in; the composable returns only what it derives.
function withSelection(snapshot: Ref<SessionSnapshot | null>) {
  const selection = {
    sourceId: ref<string | null>(null),
    tool: ref<SupportedTool | null>(null),
    kind: ref<CustomizationKind | null>(null),
    pathQuery: ref(''),
  };
  return { ...selection, view: useInventoryFilters(snapshot, selection) };
}

describe('a shared file’s recognitions stay separate definitions', () => {
  it('keeps one definition per recognizing tool, each with its own invocation name', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file(SHARED_PATH)], [sharedRow()]),
    );
    const { view } = withSelection(snapshot);
    expect(view.availableTools.value).toEqual(['copilot', 'claude']);
    const [row] = view.skillRows.value;
    expect(row?.definitions.map(({ tool }) => tool)).toEqual(['copilot', 'claude']);
    // One file, two documented invocation names: the authored identity for
    // Copilot, the directory-derived command for Claude Code. The view passes
    // each through unchanged — a merged or product-neutral value would state a
    // name one of the vendors does not document (FR-007).
    expect(row?.definitions.map(({ invocationName }) => invocationName)).toEqual([
      'voyage',
      'lander',
    ]);
  });

  it('routes each definition to its own tool’s detail URL', () => {
    // The URL is the definition's identity — the recognizing tool and the
    // file's path (FR-030) — so the one shared path yields one route per
    // recognition, and neither resolves to the other's definition.
    const routes = sharedRow().definitions.map(({ tool, sourceRelativePath }) =>
      skillDetailRoute(tool, sourceRelativePath),
    );
    expect(routes).toEqual([
      '/skills/copilot/.claude/skills/lander/SKILL.md',
      '/skills/claude/.claude/skills/lander/SKILL.md',
    ]);
    expect(new Set(routes).size).toBe(2);
  });

  it('narrows a shared row to exactly the addressed tool’s definition', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file(SHARED_PATH)], [sharedRow()]),
    );
    const { tool, view } = withSelection(snapshot);
    tool.value = 'copilot';
    expect(view.skillRows.value).toHaveLength(1);
    expect(view.skillRows.value[0]?.definitions.map((one) => one.tool)).toEqual(['copilot']);
    tool.value = 'claude';
    expect(view.skillRows.value[0]?.definitions.map((one) => one.tool)).toEqual(['claude']);
  });

  it('reads no same-name collision out of one shared file', () => {
    // Two recognitions of one physical file are one skill per tool, not two
    // skills contending for a name. A statement authored onto such a row
    // describes a collision no tool faces, so the view restates none of it —
    // the same gate that drops a statement when a filter hides one side of a
    // real clash (FR-007).
    const row: SkillInventoryEntryDto = {
      ...sharedRow(),
      sameNameResolutions: [{ tool: 'copilot', resolution: 'surface-dependent' }],
    };
    const snapshot = shallowRef<SessionSnapshot | null>(snapshotWith([file(SHARED_PATH)], [row]));
    const { view } = withSelection(snapshot);
    expect(view.skillRows.value[0]?.sameNameResolutions).toEqual([]);
  });

  it('keeps the surface-dependent statement when two Copilot files share the name', () => {
    // The positive control: a second Copilot definition of the same resolved
    // name is the collision Copilot's rule answers, and the row restates the
    // derived surface-dependent rule — never the CLI's first-found winner as
    // a product-wide claim (`skill-resolution.ts`, FR-007).
    const shipPath = '.github/skills/ship/SKILL.md';
    const row: SkillInventoryEntryDto = {
      name: 'voyage',
      definitions: [...sharedRow().definitions, definition('copilot', shipPath, 'voyage')],
      sameNameResolutions: [{ tool: 'copilot', resolution: 'surface-dependent' }],
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file(SHARED_PATH), file(shipPath)], [row]),
    );
    const { view } = withSelection(snapshot);
    expect(view.skillRows.value[0]?.sameNameResolutions).toEqual([
      { tool: 'copilot', resolution: 'surface-dependent' },
    ]);
  });
});

describe('an instruction row addresses the file’s own detail route (T218)', () => {
  it('builds one route from the path alone, segments encoded and separators kept', () => {
    // The kind's unit is the file (data-model.md § Inventory unit), so the
    // route carries no tool segment: however many products recognize the
    // file, they name one page, and the path is the whole identity (FR-030).
    expect(detailRoute('instructions', 'AGENTS.md')).toBe('/instructions/AGENTS.md');
    // Each segment is percent-encoded so an authored entry name cannot
    // smuggle a separator or a query into the URL, while `/` separators stay
    // separators for the catch-all route to split on.
    expect(detailRoute('instructions', 'docs/team guide.md')).toBe(
      '/instructions/docs/team%20guide.md',
    );
    expect(detailRoute('instructions', 'a?b/c#d.md')).toBe('/instructions/a%3Fb/c%23d.md');
  });

  it('narrows a row’s recognizing tools without changing the row’s identity', () => {
    // A tool filter keeps the recognizing tools it matches; what it never
    // does is re-key the row, because the path is the identity the detail
    // route resolves — a filtered view still links to the same page.
    const entry: InstructionInventoryEntryDto = {
      applicabilityRange: '**',
      files: [
        {
          sourceRelativePath: 'AGENTS.md',
          recognitions: [
            { tool: 'copilot', surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'] },
            { tool: 'codex', surfaces: ['codex-local-clients'] },
          ],
        },
      ],
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file('AGENTS.md')], [], [entry]),
    );
    const { tool, view } = withSelection(snapshot);
    tool.value = 'codex';
    expect(view.instructionRows.value).toEqual([
      {
        applicabilityRange: '**',
        files: [
          {
            sourceRelativePath: 'AGENTS.md',
            recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
          },
        ],
      },
    ]);
    expect(
      detailRoute('instructions', view.instructionRows.value[0]!.files[0]!.sourceRelativePath),
    ).toBe('/instructions/AGENTS.md');
  });

  it('resolves a stale link’s path to no row', () => {
    // A path the committed inventory does not list resolves to no owner: the
    // detail route reports the dead link instead of guessing at a nearby
    // file, the same answer the host's `stale-resource` rejection gives a
    // fetched detail (T218).
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('AGENTS.md')],
        [],
        [
          {
            applicabilityRange: '**',
            files: [
              {
                sourceRelativePath: 'AGENTS.md',
                recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
              },
            ],
          },
        ],
      ),
    );
    const { view } = withSelection(snapshot);
    expect(
      view.instructionRows.value
        .flatMap((row) => row.files)
        .find((file) => file.sourceRelativePath === 'REMOVED_GUIDE.md'),
    ).toBeUndefined();
  });
});

describe('the path filter matches the spelling the rows render (T1096)', () => {
  it('matches a name built only from invisible code points by its spelled-out form', () => {
    // A configured fallback basename can be a single space: the row spells it
    // out, because an escaped space still draws nothing and a row identified
    // by nothing identifies nothing. The filter has to compare the same
    // spelling, or the text on the screen matches no row while the raw
    // character matches every row through an empty query.
    const invisible = ' ';
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file(invisible), file('AGENTS.md')],
        [],
        [
          {
            applicabilityRange: '**',
            files: [
              {
                sourceRelativePath: invisible,
                recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
              },
              {
                sourceRelativePath: 'AGENTS.md',
                recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
              },
            ],
          },
        ],
      ),
    );
    const { pathQuery, view } = withSelection(snapshot);

    pathQuery.value = pathPresentationLabel(invisible);
    expect(view.instructionRows.value.flatMap((row) => row.files)).toEqual([
      {
        sourceRelativePath: invisible,
        recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
      },
    ]);
  });
});
