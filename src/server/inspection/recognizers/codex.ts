// Codex recognition (T066, extended by T094). What is Codex's own here is its
// tool literal and its presentation allowlist; the recognition engine — merge,
// census, ordering, failure confinement — is the shared one in `candidate.ts`,
// consumed through a {@link VendorRecognitionProfile} so no vendor can vary
// those contract rules.
//
// Which values may be published is fixed by the Codex presentation allowlist
// and not by what a file happens to contain: the `skill` row names exactly
// `codex.skill.name` and `codex.skill.description` as frontmatter scalars
// (contracts/vendors/openai-codex.md § Normative initial-release presentation
// allowlist). Any other authored key stays visible only in the complete
// `sourceText`; nothing here infers an equivalent field from its shape or name,
// and nothing resolves an environment reference, masks a value, or offers a
// reveal step.
import {
  frontmatterScalarExtractor,
  recognizeCandidateForVendor,
  type CandidateRecognition,
  type RecognitionInput,
  type VendorRecognitionProfile,
} from './candidate';
import type { CodexMetadataFieldId } from '../../../shared/registries/identifier-types';

/**
 * The Codex `skill` presentation allowlist, as the extractor consumes it: the
 * authored frontmatter key that produces each closed field ID
 * (contracts/vendors/openai-codex.md § Normative initial-release presentation
 * allowlist).
 */
const CODEX_SKILL_FRONTMATTER_FIELDS: ReadonlyMap<string, CodexMetadataFieldId> = new Map([
  ['name', 'codex.skill.name'],
  ['description', 'codex.skill.description'],
]);

/** The one Codex extractor: the allowlist's `skill` row as scalar reads. */
const readCodexSkillFields = frontmatterScalarExtractor(CODEX_SKILL_FRONTMATTER_FIELDS);

/**
 * Codex's contribution to the shared engine: its tool literal, the one
 * allowlisted extractor (`skill`), and the field whose value is a skill's
 * declared name (FR-007).
 */
const CODEX_RECOGNITION_PROFILE: VendorRecognitionProfile = {
  tool: 'codex',
  extractorFor: (kind) => (kind === 'skill' ? readCodexSkillFields : null),
  declaredNameFieldId: 'codex.skill.name',
};

/**
 * Produces the Codex recognitions of one admitted candidate; see
 * {@link recognizeCandidateForVendor} for the contract behavior the shared
 * engine implements.
 */
export function recognizeCodexCandidate(input: RecognitionInput): Promise<CandidateRecognition> {
  return recognizeCandidateForVendor(input, CODEX_RECOGNITION_PROFILE);
}
