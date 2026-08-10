// OpenAI Codex skill naming (FR-007): Codex's identity for a skill is the
// name authored in its own file (contracts/vendors/openai-codex.md
// § Normative initial-release presentation allowlist), which is exactly the
// shared authored-name base — the row name, the invocation name, and the
// row-internal collision all come from it unchanged.
// `src/shared/skill-naming.ts` composes this into the closed per-tool table.
import { SkillNaming } from '../skill-naming';

/** Codex's contribution to the per-tool naming table: the authored base. */
export const CODEX_SKILL_NAMING: SkillNaming = new SkillNaming();
