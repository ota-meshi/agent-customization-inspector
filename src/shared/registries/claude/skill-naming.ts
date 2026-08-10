// Anthropic Claude Code skill naming (FR-007, spec.md § Clarifications
// Session 2026-08-08): rows keep the authored identity with the
// root-relative nested prefix, invocation names are the vendor's documented
// commands derived from the path (skills page § How a skill gets its command
// name), and the collision its same-name rule answers is the clash of
// unqualified commands. `src/shared/skill-naming.ts` composes this into the
// closed per-tool table.
import { SkillNaming, skillDirectoryOf, type SameNameCollisionDefinition } from '../skill-naming';

/**
 * Applies Claude Code's nested qualification to a name's last segment: the
 * root-relative `/`-joined path of the directory holding the skill's
 * `.claude`, a `:`, then the segment — empty at the root, so a root-level
 * skill keeps the bare name. Defined for paths admitted by the Claude skill
 * rule, whose shape is `<prefix...>/.claude/skills/<skill-directory>/SKILL.md`.
 */
function withNestedPrefix(path: string, lastSegment: string): string {
  const prefix = path.split('/').slice(0, -4);
  return prefix.length === 0 ? lastSegment : `${prefix.join('/')}:${lastSegment}`;
}

/**
 * The skill directory names two or more of these `SKILL.md` paths share — the
 * clash of unqualified commands, which is the collision Claude Code's
 * documented same-name rule answers (FR-007).
 */
function clashingSkillDirectories(paths: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const clashing = new Set<string>();
  for (const path of paths) {
    const directory = skillDirectoryOf(path);
    if (seen.has(directory)) {
      clashing.add(directory);
    }
    seen.add(directory);
  }
  return clashing;
}

/**
 * Claude Code's naming: the row keeps the authored identity but a nested
 * skill's is qualified with the root-relative prefix, the documented
 * invocation name is the vendor's path-derived command whatever the
 * frontmatter declares, and the collision its same-name rule answers spans
 * rows, because nested prefixing separates same-name rows.
 */
class ClaudeSkillNaming extends SkillNaming {
  /**
   * The authored name — with the shared directory fallback — qualified
   * root-relative for a nested skill, so
   * `apps/web/.claude/skills/deploy/SKILL.md` declaring `name: deploy` is
   * `apps/web:deploy`. Always qualified, deliberately diverging from the
   * vendor's clash-conditional, session-cwd-relative prefix: the inspector
   * observes no session and never reads the layers that decide whether an
   * unqualified name is free, so the root-relative spelling is the one stable
   * name a static inventory can stand behind.
   */
  public override rowName(path: string, declaredName: string | undefined): string {
    return withNestedPrefix(path, super.rowName(path, declaredName));
  }

  /**
   * The vendor's documented command name: the skill directory, qualified
   * root-relative when nested — `apps/web:deploy` whatever the frontmatter
   * declares. The declared name is deliberately not consulted: the vendor
   * treats it as only a display label.
   */
  public override invocationName(path: string, _declaredName: string | undefined): string {
    return withNestedPrefix(path, skillDirectoryOf(path));
  }

  /**
   * The command name stands whether or not the frontmatter parsed: it is
   * derived from the path alone, so a failed extraction removes nothing it
   * rests on (FR-028).
   */
  public override invocationNameForFailedExtraction(path: string): string | null {
    return this.invocationName(path, undefined);
  }

  /**
   * Claude's clash is the unqualified command — the skill directory name —
   * shared with any other Claude-recognized skill of the view, so the gate is
   * built from every Claude path at once and a row is involved when one of
   * its definitions sits in a clashing directory. A row-internal count cannot
   * see this clash: nested prefixing puts its sides on different rows.
   */
  public override collisionGate(
    viewPaths: readonly string[],
  ): (rowPaths: readonly string[]) => boolean {
    const clashing = clashingSkillDirectories(viewPaths);
    return (rowPaths) => rowPaths.some((path) => clashing.has(skillDirectoryOf(path)));
  }

  /**
   * Every definition's path evidences Claude's clash, failed extraction or
   * not: the unqualified command is the skill directory — the path's own
   * fact — so the parse state changes nothing about the collision the
   * documented rule answers (FR-007; contracts/http-api.md § get-session
   * `skills[]` — "Claude Code's path-derived command name stands either
   * way").
   */
  public override collisionEvidencePaths(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly string[] {
    return rowDefinitions.map((definition) => definition.sourceRelativePath);
  }
}

/** Claude's contribution to the per-tool naming table. */
export const CLAUDE_SKILL_NAMING: SkillNaming = new ClaudeSkillNaming();
