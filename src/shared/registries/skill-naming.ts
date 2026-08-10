// The skill-naming contract each vendor implements (FR-007, data-model.md
// § Inventory unit, § Skill presentation): what names an inventory row, what
// a vendor's own documentation invokes, and which collision that vendor's
// same-name rule answers. This module holds the base every vendor shares —
// the authored-name behavior, which is Codex's and Copilot's whole naming —
// while a vendor whose naming differs subclasses it in its own
// `registries/<vendor>/skill-naming.ts`, and `src/shared/skill-naming.ts`
// composes the closed per-tool table.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.
import type { SkillDefinitionDto } from '../api-types';

/**
 * The skill-directory segment of a `SKILL.md` entry-point path —
 * `<...>/<skill-directory>/SKILL.md` — which is where Claude Code's own
 * command names come from, and the fallback that names a row whose file
 * declares no name (FR-007). Exported for the vendor naming modules; no
 * surface renders it directly.
 */
export function skillDirectoryOf(path: string): string {
  return path.split('/').at(-2) ?? '';
}

/**
 * The name every tool's row naming is built from (FR-007): the authored
 * frontmatter `name`, or the skill directory name when the file declares none
 * or declares it empty — a directory can name a row where an absent or empty
 * scalar cannot, and being a named directory is what a skill is.
 */
function resolvedSkillName(path: string, declaredName: string | undefined): string {
  return declaredName === undefined || declaredName === '' ? skillDirectoryOf(path) : declaredName;
}

/**
 * The naming every tool shares, and the whole naming of Codex and Copilot:
 * the authored frontmatter `name` — with the skill directory fallback — is
 * both the row identity and the documented invocation name, and the collision
 * their same-name rules answer is the row's own. The closed table in
 * `src/shared/skill-naming.ts` is the one way a caller reaches an instance.
 */
export class SkillNaming {
  /**
   * The inventory row name this tool resolves for the `SKILL.md` at `path`
   * (FR-007, data-model.md § Inventory unit): the authored name, or the
   * skill directory name when the file declares none or declares it empty.
   */
  public rowName(path: string, declaredName: string | undefined): string {
    return resolvedSkillName(path, declaredName);
  }

  /**
   * The invocation name this tool's own documentation gives the file
   * (`SkillDefinitionDto.invocationName`): for the base, the authored
   * identity the row is keyed by, so the two spellings coincide.
   */
  public invocationName(path: string, declaredName: string | undefined): string {
    return resolvedSkillName(path, declaredName);
  }

  /**
   * The invocation name publishable when the file's extraction failed, or
   * null when the tool has none to claim (FR-028). The base invokes the
   * authored name, and a failed parse leaves that name unknown rather than
   * absent — publishing the directory fallback would read a value out of the
   * failed parse — so the base claims nothing. Claude Code overrides this:
   * its command name is the path's own fact, parsed or not.
   */
  public invocationNameForFailedExtraction(_path: string): string | null {
    return null;
  }

  /**
   * A per-view gate for the collision this tool's documented same-name rule
   * answers, built once from every `SKILL.md` path the tool defines in the
   * view and then asked with one row's paths at a time (FR-007). The base
   * collision is the row's own — a tool resolving one name for two or more
   * files has two definitions to choose between — so the view-wide paths go
   * unused here; Claude's override is what consumes them.
   */
  public collisionGate(_viewPaths: readonly string[]): (rowPaths: readonly string[]) => boolean {
    return (rowPaths) => rowPaths.length >= 2;
  }

  /**
   * The paths of one row's definitions that evidence this tool's same-name
   * collision (FR-007). The base invokes the authored name, and a failed
   * extraction leaves that name unknown (FR-028) — counting it toward a
   * collision would let this product's provisional directory grouping stand
   * in for a name the tool never resolved — so the base excludes failed
   * definitions. Claude Code overrides this: its clash is between
   * path-derived commands, which a failed parse does not change
   * (contracts/http-api.md § get-session `skills[]`).
   */
  public collisionEvidencePaths(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly string[] {
    return rowDefinitions
      .filter((definition) => definition.parseStatus !== 'failed')
      .map((definition) => definition.sourceRelativePath);
  }
}

/**
 * The definition facts the same-name collision machinery reads (FR-007): the
 * tool whose rule is being asked, the path that names the file, and the parse
 * state that decides whether the definition is evidence for an authored-name
 * tool at all.
 */
export type SameNameCollisionDefinition = Pick<
  SkillDefinitionDto,
  'tool' | 'sourceRelativePath' | 'parseStatus'
>;
