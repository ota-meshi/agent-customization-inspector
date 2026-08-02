// Claude recognition (T136). What is Claude's own here is its tool literal
// and the slice of its presentation allowlist the list milestone needs; the
// recognition engine — merge, census, ordering, failure confinement — is the
// shared one in `candidate.ts`, consumed through a
// {@link VendorRecognitionProfile} so no vendor can vary those contract rules.
//
// An admission by `claude.repo.skill` is what makes a file a Claude `skill`;
// nothing is recognized from a filename alone outside that rule. Of the
// allowlist's `skill` row (contracts/vendors/claude-code.md § Normative
// initial-release presentation allowlist), only `claude.skill.name` is
// extracted here: it is the value the grouped inventory row is keyed by
// (FR-007, data-model.md § Inventory unit), so it ships with the list. The
// row's remaining fields, contained declarations, and relationships belong to
// the detail phase (T148). Any other authored key stays visible only in the
// complete `sourceText` the detail route serves.
import {
  frontmatterScalarExtractor,
  recognizeCandidateForVendor,
  type CandidateRecognition,
  type RecognitionInput,
  type VendorRecognitionProfile,
} from './candidate';
import type { ClaudeMetadataFieldId } from '../../../shared/registries/identifier-types';

/**
 * The list-phase slice of the Claude `skill` allowlist row: the one authored
 * frontmatter key whose value the grouped inventory row is keyed by. The
 * detail phase (T148) widens this map; membership stays the whole rule.
 */
const CLAUDE_SKILL_FRONTMATTER_FIELDS: ReadonlyMap<string, ClaudeMetadataFieldId> = new Map([
  ['name', 'claude.skill.name'],
]);

/** The one Claude extractor: the list-phase slice of the `skill` row. */
const readClaudeSkillFields = frontmatterScalarExtractor(CLAUDE_SKILL_FRONTMATTER_FIELDS);

/**
 * Claude's contribution to the shared engine: its tool literal, the `skill`
 * extractor, and the field whose value is a skill's declared name (FR-007).
 */
const CLAUDE_RECOGNITION_PROFILE: VendorRecognitionProfile = {
  tool: 'claude',
  extractorFor: (kind) => (kind === 'skill' ? readClaudeSkillFields : null),
  declaredNameFieldId: 'claude.skill.name',
};

/**
 * Produces the Claude recognitions of one admitted candidate; see
 * {@link recognizeCandidateForVendor} for the contract behavior the shared
 * engine implements.
 */
export function recognizeClaudeCandidate(input: RecognitionInput): Promise<CandidateRecognition> {
  return recognizeCandidateForVendor(input, CLAUDE_RECOGNITION_PROFILE);
}
