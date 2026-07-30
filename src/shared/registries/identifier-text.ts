// The words each closed registry identifier stands for on screen
// (AGENTS.md User-visible copy policy).
//
// An identifier in `identifier-types.ts` is a contract token: it keys a
// registry record, survives a vendor moving a page, and is what a
// cross-reference is checked against. None of that makes it readable. Someone
// reading the detail surface is looking at their own file and asking what this
// product recognized in it, and `codex.skill.name` answers a question nobody
// asked. So no rendered surface shows an identifier: it shows the statement the
// identifier names.
//
// The tables live beside the union rather than in the component that renders
// them, because `Readonly<Record<Union, string>>` cannot compile while a member
// is missing its text — which is what stops a newly catalogued identifier from
// reaching a screen as itself. They are a module of their own rather than lines
// in `identifier-types.ts`, which ships zero runtime code by contract.
//
// These strings ship in the packaged CLI. They are product copy, not the
// maintenance evidence `SHIPS_MAINTENANCE_DATA` compiles out.
import type { BehaviorId, MetadataFieldId, RuleId, StrategyId } from './identifier-types';

/**
 * The caption shown for one allowlisted declared-metadata field
 * (data-model.md § DeclaredMetadataEntry).
 *
 * It names what the value is rather than the authored key it was read from.
 * The key itself is already on the same page — in the source the viewer shows
 * whole — and two products can spell one concept differently, so the caption
 * belongs to the field the allowlist fixed rather than to any file's spelling.
 */
export const METADATA_FIELD_TEXT: Readonly<Record<MetadataFieldId, string>> = {
  /** Caption for the name a Codex skill declares. */
  'codex.skill.name': 'Skill name',
  /** Caption for the description a Codex skill declares. */
  'codex.skill.description': 'Skill description',
};

/**
 * The statement one behavior, rule, or strategy record makes — what a
 * provenance `ruleId` and an `EvidenceAssessment.subjectId` are rendered as
 * (data-model.md § EvidenceAssessment).
 *
 * One table rather than three, because a rule is rendered in both places: as
 * why a file was inspected, and as a subject whose documentation is graded.
 * Two tables would be two sentences for one record, free to drift apart.
 *
 * Each entry is a standalone sentence, so it reads under either heading, and
 * each says whose statement it is. A behavior is what the vendor documents; a
 * rule is what this product does about it. Without that, the behavior and the
 * rule covering one location would render as the same sentence twice.
 */
export const REGISTRY_SUBJECT_TEXT: Readonly<Record<BehaviorId | RuleId | StrategyId, string>> = {
  /** What OpenAI documents about repository skills. */
  'codex.behavior.repo.skills':
    'OpenAI Codex loads a repository skill from .agents/skills/<name>/SKILL.md',
  /** What OpenAI documents about skills in the user's home directory. */
  'codex.behavior.user.skills':
    'OpenAI Codex also loads skills from .agents/skills/<name>/SKILL.md in your home directory',
  /** What this product does about repository skills. */
  'codex.repo.skill': 'This tool reads repository skill files at .agents/skills/<name>/SKILL.md',
  /** What OpenAI documents about skills that share a name. */
  'codex.skills.discovery':
    'OpenAI Codex keeps every skill that shares a name and documents no order among them',
};
