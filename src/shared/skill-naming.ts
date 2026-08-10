// Per-tool skill naming, composed (FR-007, data-model.md § Inventory unit,
// § Skill presentation): each vendor's naming lives in its own
// `registries/<vendor>/skill-naming.ts` — the shared authored-name base in
// `registries/skill-naming.ts` — and this module only assembles the closed
// per-tool table, so the server projection, the client's filtered view, and
// the skill detail all reach one policy without branching on tool literals,
// and a new tool cannot compile without declaring its naming.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.
import { CLAUDE_SKILL_NAMING } from './registries/claude/skill-naming';
import { CODEX_SKILL_NAMING } from './registries/codex/skill-naming';
import { COPILOT_SKILL_NAMING } from './registries/copilot/skill-naming';
import type { SameNameCollisionDefinition, SkillNaming } from './registries/skill-naming';
import type { SupportedTool } from './entities';

export type { SameNameCollisionDefinition } from './registries/skill-naming';

/**
 * The naming of each supported tool, exhaustively — a new member of
 * {@link SupportedTool} cannot compile without a naming entry here.
 */
export const SKILL_NAMING: Readonly<Record<SupportedTool, SkillNaming>> = {
  /** Copilot invokes the authored identity. */
  copilot: COPILOT_SKILL_NAMING,
  /** Claude Code derives commands from the path; see `registries/claude/skill-naming.ts`. */
  claude: CLAUDE_SKILL_NAMING,
  /** Codex invokes the authored identity. */
  codex: CODEX_SKILL_NAMING,
};

/**
 * Builds one view's per-tool collision gates (FR-007): every definition the
 * view holds, grouped by recognizing tool, handed to that tool's own
 * `collisionGate`. The population is the caller's whole view — the committed
 * generation for the server projection, the filtered definitions for the
 * client — because a gate can span rows (Claude's clashes on skill
 * directories), so it cannot be built from any one row. Shared by both
 * surfaces so the assembly cannot drift between them.
 */
export function skillCollisionGates(
  definitions: readonly SameNameCollisionDefinition[],
): ReadonlyMap<SupportedTool, (rowPaths: readonly string[]) => boolean> {
  const pathsByTool = new Map<SupportedTool, string[]>();
  for (const definition of definitions) {
    const toolPaths = pathsByTool.get(definition.tool) ?? [];
    toolPaths.push(definition.sourceRelativePath);
    pathsByTool.set(definition.tool, toolPaths);
  }
  return new Map(
    [...pathsByTool].map(([tool, paths]) => [tool, SKILL_NAMING[tool].collisionGate(paths)]),
  );
}

/**
 * Whether one tool faces, on one row's definitions, the collision its quoted
 * rule answers (FR-007) — the row half of {@link skillCollisionGates}, shared
 * so the server's statements and the client's filtered restatement apply one
 * rule. Which definitions are evidence is the tool's own naming policy
 * (`collisionEvidencePaths`): an authored-name tool excludes failed
 * extractions, whose name it never resolved (FR-028), while Claude Code's
 * path-derived clash stands either way. The gate exists for every tool a
 * definition names, because the caller built one per recognizing tool of the
 * same view; `Map.get` is merely typed for absence.
 */
export function facesSameNameCollision(
  gates: ReadonlyMap<SupportedTool, (rowPaths: readonly string[]) => boolean>,
  tool: SupportedTool,
  rowDefinitions: readonly SameNameCollisionDefinition[],
): boolean {
  const rowPaths = SKILL_NAMING[tool].collisionEvidencePaths(
    rowDefinitions.filter((definition) => definition.tool === tool),
  );
  const gate = gates.get(tool);
  return gate !== undefined && gate(rowPaths);
}
