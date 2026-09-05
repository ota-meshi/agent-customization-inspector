// Per-tool same-name skill collisions, composed (FR-007, data-model.md
// § Inventory unit, § Skill presentation): each vendor's policy lives in its
// own `registries/<vendor>/skill-collision.ts` — the abstract base they share
// in `registries/skill-collision.ts` — and this module only assembles
// the closed per-tool table, so the server projection and the client's
// filtered view apply one rule without branching on tool literals, and a new
// tool cannot compile without declaring its policy.
//
// What a skill is named is the admitting rule's answer instead, resolved once
// at recognition time (`server/inspection/rules/skills/compiled-rule.ts`
// § CompiledStaticSkillRule) and published on the recognition, so no surface
// re-derives it.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.
import { CLAUDE_SKILL_COLLISION_POLICY } from './registries/claude/skill-collision';
import { CODEX_SKILL_COLLISION_POLICY } from './registries/codex/skill-collision';
import { COPILOT_SKILL_COLLISION_POLICY } from './registries/copilot/skill-collision';
import type {
  SameNameCollisionDefinition,
  SkillCollisionPolicy,
} from './registries/skill-collision';
import type { SupportedTool } from './entities';

export type { SameNameCollisionDefinition } from './registries/skill-collision';

/**
 * The same-name collision policy of each supported tool, exhaustively — a new
 * member of {@link SupportedTool} cannot compile without an entry here.
 */
export const SKILL_COLLISION_POLICY: Readonly<Record<SupportedTool, SkillCollisionPolicy>> = {
  /** Copilot's clash is one row's own; see `registries/copilot/skill-collision.ts`. */
  copilot: COPILOT_SKILL_COLLISION_POLICY,
  /** Claude Code's clash spans rows; see `registries/claude/skill-collision.ts`. */
  claude: CLAUDE_SKILL_COLLISION_POLICY,
  /** Codex's clash is one row's own; see `registries/codex/skill-collision.ts`. */
  codex: CODEX_SKILL_COLLISION_POLICY,
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
): ReadonlyMap<SupportedTool, (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean> {
  const byTool = Map.groupBy(definitions, (definition) => definition.tool);
  return new Map(
    [...byTool].map(([tool, group]) => [tool, SKILL_COLLISION_POLICY[tool].collisionGate(group)]),
  );
}

/**
 * Whether one tool faces, on one row's definitions, the collision its quoted
 * rule answers (FR-007) — the row half of {@link skillCollisionGates}, shared
 * so the server's statements and the client's filtered restatement apply one
 * rule. Which definitions are evidence is the tool's own policy
 * (`collisionEvidencePaths`): a tool invoking the authored name excludes
 * failed extractions, whose name it never resolved (FR-028), while Claude
 * Code's path-derived clash stands either way. The gate exists for every tool
 * a definition names, because the caller built one per recognizing tool of the
 * same view; `Map.get` is merely typed for absence.
 */
export function facesSameNameCollision(
  gates: ReadonlyMap<
    SupportedTool,
    (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean
  >,
  tool: SupportedTool,
  rowDefinitions: readonly SameNameCollisionDefinition[],
): boolean {
  const rowEvidence = SKILL_COLLISION_POLICY[tool].collisionEvidence(
    rowDefinitions.filter((definition) => definition.tool === tool),
  );
  const gate = gates.get(tool);
  return gate !== undefined && gate(rowEvidence);
}
