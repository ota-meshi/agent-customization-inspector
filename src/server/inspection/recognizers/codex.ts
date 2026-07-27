// Path-derived Codex recognition (T066). A recognizer answers one question
// about an already-admitted candidate: what is this file, as far as the
// shipped contract records? The admitting rule's path is the whole basis, and
// at this milestone nothing here parses the typed extraction that
// `parseStatus` describes.
//
// It opens no file: the one authored value it lifts is the declared name, out
// of source the scan already read and handed it. It does enumerate one
// directory — the census the recognized kind calls for (companion-census.ts) —
// because being a directory is part of what a skill *is*, and a per-kind detail
// belongs to the phase that builds per-kind details. No rule declares the
// census; the kind decides it. Enumeration admits nothing and reads no byte.
//
// Recognition is deliberately not a claim about the vendor's runtime. A
// `codex.repo.skill` admission proves only that an authored `SKILL.md` exists
// at an allowlisted location inside the enabled boundary
// (contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary). Whether Codex would install, enable, trust, select, or load it
// stays conditional on the strategy's condition keys, which the applicability
// phase records; nothing here may upgrade `present` to `effective`.
import {
  assembleRuleEvidenceAssessments,
  type CompiledInspectionRule,
  type SelectorOrigin,
} from '../rules/registry';
import { VFile } from 'vfile';
import { matter } from 'vfile-matter';
import { listCompanionFiles } from '../companion-census';
import { createOpaqueId, type CustomizationKind } from '../../../shared/entities';
import type {
  CandidateProvenanceDto,
  RecognitionDetails,
  ToolRecognitionDto,
} from '../../../shared/api-types';

/** One admitted candidate a recognizer is asked to classify. */
export interface RecognitionInput {
  /** The committed file identity the recognitions attach to. */
  readonly fileId: string;
  /** The admitted Source-relative Path, as displayed (NFC). */
  readonly matchedPath: string;
  /**
   * Where the candidate actually is on disk. It is the filesystem operand a
   * census enumerates from, kept separate from `matchedPath` because the
   * display path is NFC-normalized and a normalized name need not open.
   */
  readonly absolutePath: string;
  /**
   * The Source's own root on disk. A census is contained within it: a skill
   * directory may itself be a link out of the tree, and the Source is the
   * boundary of what was authorized for inspection
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   */
  readonly sourceRoot: string;
  /** The rules that admitted the candidate, paired with their selector origins. */
  readonly admissions: readonly RecognitionAdmission[];
  /**
   * The file's complete decoded text, or null when its bytes were never
   * accepted. Only the declared name is read from it here; every other
   * authored value is extracted by the metadata phase and served behind the
   * FR-027 gate.
   */
  readonly sourceText: string | null;
}

/** One rule admission of a candidate, resolved from the traversal's origins. */
export interface RecognitionAdmission {
  /** The compiled rule whose plan admitted the candidate. */
  readonly compiled: CompiledInspectionRule;
  /** Which authored selector of that rule matched. */
  readonly origin: SelectorOrigin;
}

// Builds one admission's provenance. The scope is `matching-path` because a
// static candidate's admitted scope is exactly the path its selector matched:
// the immutable selector index is retained so a reader can tell which
// alternative of a multi-selector rule applied without re-reading the matcher.
function buildProvenance(admission: RecognitionAdmission, matchedPath: string): CandidateProvenanceDto {
  // No lookup: the compiled rule carries the shipped record and its edges.
  const { rule } = admission.compiled;
  return {
    ruleId: rule.ruleId,
    matchedPath,
    scope: {
      kind: 'matching-path',
      path: matchedPath,
      selectorIndex: admission.origin.selectorIndex,
    },
    evidenceAssessments: assembleRuleEvidenceAssessments(admission.compiled),
  };
}

/**
 * Reads the `name` scalar from a `SKILL.md` YAML frontmatter block
 * (`codex.skill.name`, contracts/vendors/openai-codex.md § Presentation
 * allowlist). Returns the authored string exactly, or undefined when the file
 * has no frontmatter, no `name`, or a `name` that is not a string.
 *
 * Delimiter handling belongs to `vfile-matter` rather than to a regular
 * expression here: deciding where a frontmatter block starts and ends means
 * re-deciding BOM handling, line endings, and the closing-fence forms, which is
 * the same "looks like the format but isn't" trap the selector grammar refuses.
 * That package parses the block with the `yaml` package the registry already
 * depends on, so the repository keeps one YAML engine and one set of YAML 1.2
 * semantics; a frontmatter package carrying its own `js-yaml` would give the
 * same document two meanings.
 *
 * No value is coerced: a non-string scalar is left to the typed extraction
 * phase rather than stringified for display. A malformed document yields
 * undefined instead of throwing — a file that cannot be parsed is still an
 * admitted, readable candidate whose complete source the user can open, and
 * failing the scan over a display name would be a worse answer than showing the
 * row without one.
 */
function readFrontmatterName(sourceText: string | null): string | undefined {
  if (sourceText === null) {
    return undefined;
  }
  const file = new VFile({ value: sourceText });
  try {
    matter(file);
  } catch {
    return undefined;
  }
  const parsed: unknown = file.data.matter;
  if (typeof parsed !== 'object' || parsed === null) {
    return undefined;
  }
  const value = (parsed as Record<string, unknown>)['name'];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Prefixes a census result with the directory holding the candidate, turning
 * the census root-relative paths into the Source-relative Paths a row and a
 * detail view display. Both parts are already NFC, so concatenating them
 * yields exactly the public path the traversal would have derived.
 */
function toSourceRelative(
  matchedPath: string,
  companionFiles: readonly string[],
): readonly string[] {
  const seedDirectory = matchedPath.slice(0, matchedPath.lastIndexOf('/') + 1);
  return companionFiles.map((companion) => `${seedDirectory}${companion}`);
}

/**
 * Builds a recognition's per-kind payload. Only `skill` has one so far: the
 * name it declares in its own file, and the files that accompany it in its own
 * directory. Every other kind carries just its kind until its recognizer phase
 * gives it an identity of its own.
 *
 * The census (contracts/inspection-path-allowlist.md § Bounded companion
 * census) runs from the candidate's own path rather than being handed in,
 * because it is a per-kind detail like the declared name: a caller that
 * precomputed it would have to know which kinds want one, which is exactly the
 * knowledge this function exists to hold. Being a directory is what `skill`
 * *is* — the `SKILL.md` plus the scripts and references beside it — so the kind
 * decides, and no rule declares it separately. The files stay relationship
 * targets: listed, never admitted and never read.
 */
async function buildDetails(
  kind: CustomizationKind,
  input: RecognitionInput,
): Promise<RecognitionDetails> {
  if (kind !== 'skill') {
    return { kind };
  }
  const declaredName = readFrontmatterName(input.sourceText);
  const companionFiles = toSourceRelative(
    input.matchedPath,
    await listCompanionFiles(input.sourceRoot, input.absolutePath),
  );
  return {
    kind,
    // Absent rather than empty when nothing was authored, so "no name" and "an
    // authored empty name" stay distinguishable.
    ...(declaredName === undefined ? {} : { declaredName }),
    companionFiles,
  };
}

/**
 * Produces the Codex recognitions of one admitted candidate. Exactly one
 * record exists per `(fileId, tool, kind)`: admissions that agree on the tool
 * and kind merge their provenances into that single record rather than
 * splitting into competing recognitions (data-model.md § ToolRecognition).
 *
 * `parseStatus` is `not-attempted` for every recognition here, which is the
 * honest value while no allowlisted extractor applies — it is not a claim
 * that parsing succeeded, and it keeps the file's `parseSummary` at
 * `not-applicable`. Reading the declared name does not change that: it is one
 * scalar lifted for presentation identity (FR-007), not the typed extraction
 * that `parseStatus` describes.
 */
export async function recognizeCodexCandidate(
  input: RecognitionInput,
): Promise<ToolRecognitionDto[]> {
  const byKind = new Map<string, RecognitionAdmission[]>();
  for (const admission of input.admissions) {
    if (admission.compiled.tool !== 'codex') {
      continue;
    }
    const key = admission.compiled.kind;
    const group = byKind.get(key);
    if (group === undefined) {
      byKind.set(key, [admission]);
    } else {
      group.push(admission);
    }
  }
  // Each group's census is independent, so the kinds of one candidate are
  // built together rather than one after another.
  return Promise.all([...byKind.values()].map(async (group): Promise<ToolRecognitionDto> => {
    const first = group[0]!;
    return {
      recognitionId: createOpaqueId(),
      fileId: input.fileId,
      tool: 'codex',
      details: await buildDetails(first.compiled.kind, input),
      parseStatus: 'not-attempted',
      provenances: group
        .map((admission) => buildProvenance(admission, input.matchedPath))
        // Provenances of one recognition are ordered by their admitting rule
        // so two scans of the same tree publish the same record; the selector
        // index breaks the tie for a rule with several alternatives.
        .sort((left, right) =>
          left.ruleId !== right.ruleId
            ? left.ruleId < right.ruleId
              ? -1
              : 1
            : left.scope.kind === 'matching-path' && right.scope.kind === 'matching-path'
              ? left.scope.selectorIndex - right.scope.selectorIndex
              : 0,
        ),
      diagnosticIds: [],
    };
  }));
}
