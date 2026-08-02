// Vendor-neutral candidate recognition (T066, generalized by T136). A
// recognizer answers two questions about an already-admitted candidate: what
// is this file, as far as the shipped contract records, and which authored
// values does that contract's presentation allowlist let it publish? The
// answers' shapes — and the one engine that assembles them — are shared by
// every vendor, so they live here; what varies per vendor is its tool literal
// and its allowlisted extractors, which each vendor module supplies as a
// {@link VendorRecognitionProfile}. One engine rather than one copy per
// vendor, because the merge, census, ordering, and failure rules it encodes
// are contract behavior (data-model.md § ToolRecognition) that must not drift
// between products.
//
// The engine opens no file. Every authored value it lifts comes out of source
// the scan already read and handed it. It does enumerate one directory — the
// census the recognized kind calls for (companion-census.ts) — because being a
// directory is part of what a skill *is*, and a per-kind detail belongs to the
// phase that builds per-kind details. The census reads nothing either: it
// reports which files accompany the candidate and where they are, and the scan
// reads them through the one read path every published file goes through.
//
// Recognition is deliberately not a claim about the vendor's runtime. An
// admission proves only that an authored file exists at an allowlisted
// location inside the enabled boundary
// (contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary). Whether the product would install, enable, trust, select, or
// load it stays conditional on the strategy's condition keys, which the
// admission's `applicability` records; nothing here may upgrade `present` to
// `effective`.
import {
  assembleRuleEvidenceAssessments,
  type CompiledInspectionRule,
  type SelectorOrigin,
} from '../rules/registry';
import { assessAdmissionApplicability } from '../applicability/context';
import { RecognitionExtraction } from '../parsers/extraction';
import { parseFrontmatter } from '../parsers/markdown';
import { listCompanionFiles, type CompanionFile } from '../companion-census';
import {
  createOpaqueId,
  type CustomizationKind,
  type SupportedTool,
} from '../../../shared/entities';
import type { MetadataFieldId } from '../../../shared/registries/identifier-types';
import type {
  CandidateProvenanceDto,
  DeclaredMetadataEntryDto,
  RecognitionDetails,
  ToolRecognitionDto,
} from '../../../shared/api-types';

/**
 * What recognizing one candidate produced: its recognitions, and the files its
 * census found beside it.
 *
 * The companions travel back to the scan rather than being read here, because
 * the scan owns the closed per-file publication matrix — one read, one decode,
 * one closed outcome per file — and a recognizer that read them would be a
 * second place deciding what a read failure means.
 */
export interface CandidateRecognition {
  /** The recognitions attached to the candidate; possibly empty. */
  readonly recognitions: readonly ToolRecognitionDto[];
  /** The accompanying files the candidate's census listed, for the scan to read and publish. */
  readonly companions: readonly CompanionSourceFile[];
}

/**
 * One accompanying file, addressed the way the scan publishes it.
 *
 * Distinct from a census result rather than the same record with a rewritten
 * field: a census names a path relative to the directory it walked, and this
 * names one relative to the Source. The class holds the census entry and the
 * candidate's own directory and derives the public address from them, so where
 * each half of an address came from is readable here rather than at whatever
 * call site assembled a copy.
 */
export class CompanionSourceFile {
  /**
   * The admitted candidate's own directory within the Source, with its
   * trailing slash — the census walked it, so every census-relative path is
   * relative to it.
   */
  readonly #candidateDirectory: string;

  /** The census entry itself. */
  readonly #listed: CompanionFile;

  /** Binds one census entry to the directory its paths are relative to. */
  public constructor(candidateDirectory: string, listed: CompanionFile) {
    this.#candidateDirectory = candidateDirectory;
    this.#listed = listed;
  }

  /**
   * The Source-relative Path; the public identity. Both halves are spelled
   * with the exact raw entry names, so concatenating them yields exactly the
   * public path the traversal would have derived (FR-024).
   */
  public get sourceRelativePath(): string {
    return `${this.#candidateDirectory}${this.#listed.censusRelativePath}`;
  }

  /** The census entry's own raw absolute path the scan reads from; never published. */
  public get absolutePath(): string {
    return this.#listed.absolutePath;
  }
}

/** One admitted candidate a recognizer is asked to classify. */
export interface RecognitionInput {
  /** The committed file identity the recognitions attach to. */
  readonly fileId: string;
  /** The admitted Source-relative Path, spelled with the exact entry names. */
  readonly matchedPath: string;
  /**
   * Where the candidate actually is on disk. It is the filesystem operand a
   * census enumerates from, kept separate from `matchedPath` because a
   * display path is never decoded back into a filesystem operand (FR-024).
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
   * The file's complete decoded text. Always present: only a readable candidate
   * is recognized, so a binary or unreadable file reaches no recognizer. What
   * the recognition publishes out of this text is what the frontmatter parser
   * resolved, never a substring this module cuts for itself.
   */
  readonly sourceText: string;
}

/** One rule admission of a candidate, resolved from the traversal's origins. */
export interface RecognitionAdmission {
  /** The compiled rule whose plan admitted the candidate. */
  readonly compiled: CompiledInspectionRule;
  /** Which authored selector of that rule matched. */
  readonly origin: SelectorOrigin;
}

/**
 * What one vendor contributes to the shared recognition engine: its tool
 * literal and its presentation-allowlist extraction. The engine consumes it as
 * data, so a vendor cannot vary the merge, census, or ordering rules — only
 * which admissions it owns and which authored values its contract lets it
 * publish.
 */
export interface VendorRecognitionProfile {
  /** The recognizing product; admissions owned by any other tool are ignored. */
  readonly tool: SupportedTool;
  /**
   * The extractor that applies to one recognized kind, or null when the
   * vendor's presentation allowlist defines none for it. Returning null is
   * what `not-attempted` means: no allowlisted extractor applies, which is
   * honest about a kind whose recognizer phase has not shipped and is never a
   * claim that parsing succeeded.
   */
  readonly extractorFor: (
    kind: CustomizationKind,
  ) => ((sourceText: string) => DeclaredMetadataEntryDto[]) | null;
  /**
   * The field ID whose extracted value is a skill's own declared name
   * (FR-007), or null while the vendor ships no extractor that lifts one. Read
   * from the one extraction rather than by parsing again, so the name a row
   * groups by and the value a detail view shows always come from the same
   * parse.
   */
  readonly declaredNameFieldId: MetadataFieldId | null;
}

/**
 * Builds a frontmatter-scalar extractor from one vendor's allowlist row: the
 * authored frontmatter key that produces each closed field ID. Both shipped
 * skill rows take this exact form, so the scalar rule lives once here rather
 * than once per vendor.
 *
 * The map is the whole rule: a key that is not in it produces no entry, and no
 * shape or name heuristic can add one. One entry per field — a key declared
 * twice resolves to one value for a product loading the file, and that
 * resolution is what is reported. A key outside the allowlist contributes
 * nothing however meaningful it looks; its authored text stays visible in the
 * complete `sourceText` the detail route serves.
 *
 * The returned extractor throws for a present-but-unparseable frontmatter
 * block. The engine wraps it in {@link RecognitionExtraction.run}, which turns
 * the throw into the recognition's `failed` state while the complete readable
 * source stays displayed (FR-028).
 */
export function frontmatterScalarExtractor(
  fields: ReadonlyMap<string, MetadataFieldId>,
): (sourceText: string) => DeclaredMetadataEntryDto[] {
  return (sourceText) => {
    // Read as a mapping without checking that it is one: a frontmatter block
    // that resolved to a sequence, a scalar, or nothing at all simply has none
    // of these keys, and every one of those is an ordinary file that declares
    // no fields rather than a case to handle.
    const frontmatter = parseFrontmatter(sourceText) as Record<string, unknown> | null | undefined;
    const entries: DeclaredMetadataEntryDto[] = [];
    for (const [key, fieldId] of fields) {
      const value: unknown = frontmatter?.[key];
      // The allowlist rows name frontmatter *scalars*, so this is where that
      // word is enforced: a sequence or a mapping resolves to nothing a row
      // can name, and a text form of a structure would be a value the file
      // does not contain. `String` renders the parser's own resolution and
      // invents nothing — the number `7` a `007` resolved to reads as `7`. A
      // null scalar (`name:`, `name: ~`, `name: null`) declares the absence of
      // a value, which the entry's absence already records, so it produces no
      // entry (data-model.md § DeclaredMetadataEntry).
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        entries.push({ fieldId, value: String(value) });
      }
    }
    return entries;
  };
}

// Builds one admission's provenance. The scope is `matching-path` because a
// static candidate's admitted scope is exactly the path its selector matched:
// the immutable selector index is retained so a reader can tell which
// alternative of a multi-selector rule applied without re-reading the matcher.
function buildProvenance(
  admission: RecognitionAdmission,
  matchedPath: string,
): CandidateProvenanceDto {
  // No lookup: the compiled rule carries the shipped record and its edges.
  const { rule } = admission.compiled;
  return {
    ruleId: rule.ruleId,
    discoveryClass: rule.discoveryClass,
    matchedPath,
    scope: {
      kind: 'matching-path',
      path: matchedPath,
      selectorIndex: admission.origin.selectorIndex,
    },
    evidenceAssessments: assembleRuleEvidenceAssessments(admission.compiled),
    applicability: assessAdmissionApplicability(admission.compiled),
  };
}

/**
 * Builds a recognition's per-kind payload. Only `skill` has one so far: the
 * name it declares in its own file, and the files that accompany it in its own
 * directory. Every other kind carries just its kind until its recognizer phase
 * gives it an identity of its own.
 */
function buildDetails(
  kind: CustomizationKind,
  companionPaths: readonly string[],
  declaredName: string | undefined,
): RecognitionDetails {
  if (kind !== 'skill') {
    return { kind };
  }
  return {
    kind,
    // Absent rather than empty when nothing was authored, so "no name" and
    // "an authored empty name" stay distinguishable.
    ...(declaredName === undefined ? {} : { declaredName }),
    companionFiles: companionPaths,
  };
}

/**
 * Produces one vendor's recognitions of one admitted candidate. Exactly one
 * record exists per `(fileId, tool, kind)`: admissions that agree on the tool
 * and kind merge their provenances into that single record rather than
 * splitting into competing recognitions (data-model.md § ToolRecognition).
 *
 * Extraction is all-or-nothing per recognition. A `failed` recognition
 * publishes no metadata at all — not the part that parsed — while the file's
 * complete readable source stays displayed and comparison-eligible, and the
 * caller attaches its `recognition-parse-failed` Diagnostic (FR-028).
 */
export async function recognizeCandidateForVendor(
  input: RecognitionInput,
  vendor: VendorRecognitionProfile,
): Promise<CandidateRecognition> {
  const byKind = new Map<CustomizationKind, RecognitionAdmission[]>();
  for (const admission of input.admissions) {
    if (admission.compiled.tool !== vendor.tool) {
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
  // The census belongs to the candidate's directory, not to a kind: one
  // directory has one set of accompanying files however many kinds recognize
  // its entry point, so it is enumerated exactly once — and only when a
  // recognized kind is directory-shaped, which today is `skill` alone
  // (contracts/inspection-path-allowlist.md § Bounded companion census). The
  // files it lists are read and published by the scan as ordinary files that
  // no rule admitted.
  const census = byKind.has('skill')
    ? await listCompanionFiles(input.sourceRoot, input.absolutePath)
    : [];
  const candidateDirectory = input.matchedPath.slice(0, input.matchedPath.lastIndexOf('/') + 1);
  const companions = census.map((listed) => new CompanionSourceFile(candidateDirectory, listed));
  const companionPaths = companions.map((companion) => companion.sourceRelativePath);
  const recognitions = [...byKind.entries()].map(([kind, group]): ToolRecognitionDto => {
    const extractor = vendor.extractorFor(kind);
    const extraction = RecognitionExtraction.run(
      input.sourceText,
      extractor === null ? () => null : extractor,
    );
    const declaredName =
      vendor.declaredNameFieldId === null
        ? undefined
        : extraction.declaredMetadata.find((entry) => entry.fieldId === vendor.declaredNameFieldId)
            ?.value;
    return {
      recognitionId: createOpaqueId(),
      fileId: input.fileId,
      tool: vendor.tool,
      details: buildDetails(kind, companionPaths, declaredName),
      parseStatus: extraction.status,
      declaredMetadata: extraction.declaredMetadata,
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
  });
  return { recognitions, companions };
}
