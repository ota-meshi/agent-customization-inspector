// Repository scan orchestration and the closed file-confined publication
// matrix for one Source scan attempt (T067; spec.md § Closed Scan Publication
// Outcomes, FR-002/FR-028/FR-030). This module submits the shipped compiled
// allowlist to the traversal module, consumes its typed per-file results,
// resolves each candidate's admitting rules from the selector origins the
// traversal reported, hands them to the owning vendor recognizer, and turns
// the whole thing into the exact publication input of a generation commit.
//
// It performs no filesystem I/O of its own: directory enumeration and the one
// read per file stay in `traversal.ts` (FR-019, QR-003), and this module never
// re-matches a public path against a selector — the admissions come from the
// walk that actually admitted the file. It does drive one further read per
// companion file, through that same read path: a directory-shaped
// customization is its entry point plus the files beside it
// (contracts/inspection-path-allowlist.md § Bounded companion census), and a
// companion is published as an ordinary file that no rule admitted and no
// recognizer classified — readable when its bytes decode, the plain binary
// fact when they are an asset's, and diagnostic-only when the read fails.
//
// The publication matrix is closed and total: a file-confined outcome stays
// confined to its file as a diagnostic-only item and makes an otherwise
// publishable generation `partial`; an unreadable root fails the Source
// attempt with the source-scoped Diagnostic and publishes no partial
// inventory; and a failure that is not confined to one file is never
// converted into a Diagnostic — it propagates ordinarily from the traversal
// call, aborts the attempt without a commit, and is reported as the failed
// request's real error (FR-030 retains the last committed snapshot).
import { SUPPORTED_TOOL_ORDER, type CustomizationKind } from '../../shared/entities';
import {
  DiagnosticRecord,
  sortDiagnostics,
  type LifecycleOwnerKey,
} from '../../shared/diagnostics';
import type { CustomizationFileDto, SerializedDiagnostic } from '../../shared/api-types';
import type { GenerationOutcome } from '../session/scan-generation';
import { CLAUDE_REPOSITORY_RULES } from './rules/claude';
import { COPILOT_REPOSITORY_RULES } from './rules/copilot';
import {
  resolveAdmittingRules,
  type CompiledCandidateRule,
  type CompiledStaticCandidateRule,
  type ConfiguredDerivedPlan,
} from './rules/registry';
import {
  recognizeCandidateForVendors,
  type CandidateRecognition,
  type RecognitionInput,
  type ToolRecognition,
} from './recognizers/candidate';
import { join } from 'node:path';
import { CODEX_REPOSITORY_RULES, readCodexConfiguredFallbackPlans } from './rules/codex';
import { readCandidate, runTraversalScan, type TraversalScanResult } from './traversal';

/**
 * The shipped Repository rule catalog a Repository scan executes (FR-003),
 * in the closed tool order (`SUPPORTED_TOOL_ORDER`). Each inventory phase
 * contributes its vendor module here; a repository that holds none of what
 * the shipped rules match legitimately publishes an empty inventory rather
 * than an error.
 *
 * The Copilot and Codex/Claude skill matchers overlap on purpose — `.agents`
 * and `.claude` are shared spellings — and the traversal walks every plan in
 * one pass, so a shared physical file is one candidate with one read whose
 * admissions name each vendor's plan (data-model.md § ToolRecognition).
 */
export const REPOSITORY_INSPECTION_RULES: readonly CompiledStaticCandidateRule[] = [
  ...COPILOT_REPOSITORY_RULES,
  ...CLAUDE_REPOSITORY_RULES,
  ...CODEX_REPOSITORY_RULES,
];

/**
 * The shipped configuration readers, composed from the vendor modules
 * exactly like the static catalog above (FR-003, T1090). Each runs before a
 * scan and expands whatever its vendor's configuration declares into plans
 * of the same walk; a vendor with no configuration-driven discovery simply
 * contributes nothing.
 */
export const REPOSITORY_CONFIGURATION_READERS: readonly ((
  root: string,
) => Promise<readonly ConfiguredDerivedPlan[]>)[] = [readCodexConfiguredFallbackPlans];

/**
 * The assembled publication of one completed traversal
 * (spec.md § Closed Scan Publication Outcomes):
 *  - 'publishable'    traversal completed; the commit input carries every
 *                     file (complete or diagnostic-only) plus the attempt's
 *                     recognitions and diagnostics, with `outcome` `partial`
 *                     exactly when a file-confined outcome exists (FR-028)
 *  - 'source-failed'  the root was missing or unreadable: the attempt fails
 *                     with the source-scoped `root-unreadable` Diagnostic
 *                     and no generation (FR-002)
 */
export type ScanPublication =
  /** A complete traversal that may commit one atomic generation. */
  | {
      /** Traversal completed and one atomic generation may commit. */
      readonly kind: 'publishable';
      /** `partial` exactly when any file-confined outcome exists (FR-028). */
      readonly outcome: GenerationOutcome;
      /** Every published file, complete and diagnostic-only alike. */
      readonly files: readonly CustomizationFileDto[];
      /** Every recognition attached to a published readable file. */
      readonly recognitions: readonly ToolRecognition[];
      /**
       * Each recognized skill entry point's census, keyed by its public path.
       * Kept beside the recognitions rather than on one: the list's one
       * publication is the inventory's `SkillDefinitionDto.companionFiles`
       * (contracts/inspection-path-allowlist.md § Bounded companion census).
       */
      readonly skillCompanionsByPath: ReadonlyMap<string, readonly string[]>;
      /** The attempt's serialized diagnostics. */
      readonly diagnostics: readonly SerializedDiagnostic[];
      /**
       * How many directory entries the walk looked at. The committed progress
       * reports it, so a finished scan states what it did rather than the zero
       * its counters were admitted with (contracts/http-api.md § get-session
       * `progress`).
       */
      readonly visitedEntries: number;
      /** Allowlisted candidate files the traversal discovered (data-model.md § ScanProgress). */
      readonly candidateFiles: number;
      /** Bytes the attempt accepted, as counted while reading. */
      readonly readBytes: number;
    }
  /** An unreadable Source root that fails without a generation commit. */
  | {
      /** The Source attempt failed; nothing commits (FR-002). */
      readonly kind: 'source-failed';
      /** The source-scoped `root-unreadable` lifecycle Diagnostic. */
      readonly diagnostic: SerializedDiagnostic;
    };

/**
 * One progress observation of a running attempt, as the session adopts it
 * mid-scan (data-model.md § ScanProgress). The counters are cumulative for the
 * attempt; `phase` is where the attempt is when the observation is made.
 */
export interface ScanProgressUpdate {
  /** The pipeline phase the attempt is reporting from. */
  readonly phase: 'deriving' | 'enumerating' | 'reading' | 'recognizing';
  /** Directory entries whose names the traversal has observed so far. */
  readonly visitedEntries: number;
  /** Allowlisted candidate files discovered so far. */
  readonly candidateFiles: number;
  /**
   * Bytes returned by completed reads so far, census-listed companions
   * included (data-model.md § ScanProgress `readBytes`).
   */
  readonly readBytes: number;
  /** Attempt-local deterministic diagnostics accumulated so far. */
  readonly diagnosticCount: number;
}

/** Input of {@link assembleScanPublication}: one Source's completed traversal. */
export interface ScanPublicationInput {
  /** The scanned Source every published record belongs to. */
  readonly sourceId: string;
  /**
   * The retained raw selected root the traversal ran from. A candidate's raw
   * segments are relative to it, so it is what turns them back into the
   * filesystem operand a recognizer is given; see
   * {@link RecognitionInput.absolutePath}.
   */
  readonly root: string;
  /**
   * The lifecycle owner a `root-unreadable` failure attaches to: the
   * automatic first Repository scan uses `repository`, an explicit rescan of
   * a published Source uses `published-source:<sourceId>`, and an
   * unpublished Global tool uses `global:<tool>` (data-model.md
   * § Diagnostic). The trigger-owning caller knows which lifecycle applies;
   * this module never guesses it.
   */
  readonly rootFailureOwner: LifecycleOwnerKey;
  /**
   * The exact rule list whose plans produced `result`. Candidate admissions
   * are plan indexes into this list, so passing a different list would
   * misattribute provenance.
   */
  readonly rules: readonly CompiledCandidateRule[];
  /** The traversal module's typed result for this attempt. */
  readonly result: TraversalScanResult;
  /**
   * How one readable candidate's admissions become recognitions. Defaults to
   * {@link recognizeCandidate}, the shipped vendor dispatch. It is a
   * parameter for the same reason `rules` is: the publication matrix owns the
   * closed per-file outcome table and must stay independent of which vendors
   * happen to ship, so the recognizer set is data it is given rather than a
   * dependency it hard-codes.
   */
  readonly recognize?: (input: RecognitionInput) => Promise<CandidateRecognition>;
  /**
   * Called as each companion read advances the attempt's figures. Assembly is
   * where census-listed files are read, so without this the bytes of a
   * companion-heavy skill would reach progress only with the commit, and a
   * mid-scan refresh would show stalled figures through that stretch
   * (data-model.md § ScanProgress `readBytes`: bytes of completed reads so
   * far). The attempt ignores what it returns.
   */
  readonly onProgress?: (update: ScanProgressUpdate) => void;
}

// Dispatches one readable candidate's admissions to the shared engine, for
// every tool with a shipped rule catalog at once. An admission whose tool is
// not listed yet simply produces no recognition, which is what "the rule is
// not shipped for this milestone" must look like — never a fabricated
// recognition of an unknown kind. Tools run in the closed tool order so a
// candidate several products recognize publishes its recognitions
// deterministically, and the one call is what keeps a shared candidate's
// census a single enumeration: `.agents/skills/` is both a Codex and a
// Copilot location, so a per-vendor dispatch would list the same directory
// once per recognizing product.
async function recognizeCandidate(input: RecognitionInput): Promise<CandidateRecognition> {
  return recognizeCandidateForVendors(input, SUPPORTED_TOOL_ORDER);
}

/**
 * Assembles the closed publication matrix from one traversal result
 * (FR-002/FR-024/FR-025/FR-028). Every mapping is per-file and total:
 *  - a readable file publishes its complete decoded text (a replacement
 *    decode is complete, not partial) plus the recognitions its admissions
 *    produced;
 *  - a NUL-containing file publishes a textless `binary` item with its
 *    coherent `sourceId`/`sourceRelativePath` pair and is never
 *    recognized, because recognition would need content it has none of. An
 *    admitted candidate's is diagnostic-only; a census-listed companion's is
 *    the ordinary fact of an asset, with no Diagnostic (FR-025);
 *  - an unreadable or disappeared file publishes a diagnostic-only
 *    `unknown` item the same way;
 *  - a `failed` recognition on a readable file publishes its
 *    `recognition-parse-failed` diagnostic on that file while the complete
 *    source stays displayed and comparison-eligible.
 * Diagnostic construction happens here so a caller cannot fabricate a
 * Source or path the traversal never admitted.
 *
 * The one filesystem operation here is the companion read: a census answers
 * what sits beside an admitted candidate, and the files it listed are read on
 * this side because they are published as ordinary files of the generation and
 * must go through the same single read and the same closed per-file outcome as
 * every other file (contracts/inspection-path-allowlist.md § Bounded companion
 * census). Which candidates have a census is not asked here — the recognizer
 * decides that from the kind it recognized, and no rule declares it — so this
 * module still owns nothing but the per-file outcome table.
 */
export async function assembleScanPublication(
  input: ScanPublicationInput,
): Promise<ScanPublication> {
  if (input.result.kind === 'root-unreadable') {
    // Source-scoped with sourceId only: the failed attempt publishes no
    // partial inventory (FR-002). The lifecycle owner is the published
    // Source that owns this attempt.
    return {
      kind: 'source-failed',
      diagnostic: new DiagnosticRecord({
        code: 'root-unreadable',
        lifecycleOwnerKey: input.rootFailureOwner,
        sourceId: input.sourceId,
      }).serialize(),
    };
  }

  const files: CustomizationFileDto[] = [];
  const recognitions: ToolRecognition[] = [];
  const diagnostics: DiagnosticRecord[] = [];
  let hasFileConfinedOutcome = false;
  // Companion files of every recognized candidate, keyed by display path — the
  // identity the scan publishes them under, and what the read loop below
  // iterates.
  const companions = new Map<string, string>();
  // Each recognized skill entry point's census, keyed by the entry point's
  // public path. The inventory's `SkillDefinitionDto.companionFiles` is the
  // list's one publication (§ Bounded companion census); the recognition
  // carries none.
  const skillCompanionsByPath = new Map<string, readonly string[]>();

  for (const candidate of input.result.files) {
    switch (candidate.outcome.kind) {
      case 'readable': {
        const admissions = resolveAdmittingRules(input.rules, candidate.admissions).map(
          (compiled, index) => ({ compiled, origin: candidate.admissions[index]! }),
        );
        const recognized = await (input.recognize ?? recognizeCandidate)({
          matchedPath: candidate.publicPath,
          absolutePath: join(input.root, ...candidate.rawSegments),
          sourceRoot: input.root,
          admissions,
          sourceText: candidate.outcome.sourceText,
        });
        const fileRecognitions = recognized.recognitions;
        // A census-listed path a rule independently admits keeps its own
        // recognitions and rows (FR-007): the walk admitted it, so it is a
        // customization of its own rather than one of the files that ship with
        // the skill beside it. A `CLAUDE.md` inside a skill directory is the
        // case — an ordinary instruction file that happens to sit there — and
        // listing it as a companion would put its diagnostics on the skill's
        // row, offer it as one of the skill's files to compare, and let a
        // binary one disappear from the files in no kind, all while its own
        // kind already has it.
        const independentlyAdmitted = new Set(
          input.result.files.map((discovered) => discovered.publicPath),
        );
        const censusOnly = recognized.companions.filter(
          (companion) => !independentlyAdmitted.has(companion.sourceRelativePath),
        );
        for (const companion of censusOnly) {
          companions.set(companion.sourceRelativePath, companion.absolutePath);
        }
        if (fileRecognitions.some((recognition) => recognition.details.kind === 'skill')) {
          skillCompanionsByPath.set(
            candidate.publicPath,
            censusOnly.map((companion) => companion.sourceRelativePath),
          );
        }
        const fileDiagnosticIds: string[] = [];
        // A failed extraction keeps the complete readable source displayed and
        // comparison-eligible; only the derived metadata/relationships are
        // omitted, and the diagnostic makes the generation partial (FR-028).
        //
        // One extraction per kind means one failure is one record
        // (candidate.ts): however many tools recognize the kind, the parse
        // ran once, so minting a record per recognition would publish one
        // observation as several a reader cannot tell apart. The file
        // references it because the outcome is file-confined, and every
        // failed recognition of the kind shares the same reference, which is
        // what each inventory definition republishes. A recognizer never sees
        // the diagnostic ID it will be given, so the ID is attached here
        // rather than inside it.
        const byKind = new Map<CustomizationKind, ToolRecognition[]>();
        for (const recognition of fileRecognitions) {
          const group = byKind.get(recognition.details.kind) ?? [];
          group.push(recognition);
          byKind.set(recognition.details.kind, group);
        }
        for (const group of byKind.values()) {
          // The production recognizer's groups are uniformly parsed or
          // failed — the extraction is shared — so the per-recognition check
          // below only keeps an injected test recognizer honest: the
          // traversal suite drives mixed statuses through the `recognize`
          // seam, and a parsed recognition must not reference a failure.
          if (!group.some((recognition) => recognition.parseStatus === 'failed')) {
            recognitions.push(...group);
            continue;
          }
          hasFileConfinedOutcome = true;
          const diagnostic = new DiagnosticRecord({
            code: 'recognition-parse-failed',
            lifecycleOwnerKey: null,
            sourceId: input.sourceId,
            sourceRelativePath: candidate.publicPath,
          });
          diagnostics.push(diagnostic);
          fileDiagnosticIds.push(diagnostic.diagnosticId);
          recognitions.push(
            ...group.map((recognition) =>
              recognition.parseStatus === 'failed'
                ? recognition.withDiagnostic(diagnostic.diagnosticId)
                : recognition,
            ),
          );
        }
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: candidate.outcome.encoding,
          hadLeadingBom: candidate.outcome.hadLeadingBom,
          sourceText: candidate.outcome.sourceText,
          sizeBytes: candidate.outcome.sizeBytes,
          diagnosticIds: fileDiagnosticIds,
        });
        break;
      }
      case 'binary': {
        hasFileConfinedOutcome = true;
        const diagnostic = new DiagnosticRecord({
          code: 'file-content-binary',
          lifecycleOwnerKey: null,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
        });
        diagnostics.push(diagnostic);
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: 'binary',
          sizeBytes: candidate.outcome.sizeBytes,
          diagnosticIds: [diagnostic.diagnosticId],
        });
        break;
      }
      case 'unreadable': {
        hasFileConfinedOutcome = true;
        const diagnostic = new DiagnosticRecord({
          code: 'file-unreadable',
          lifecycleOwnerKey: null,
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
        });
        diagnostics.push(diagnostic);
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: candidate.publicPath,
          encoding: 'unknown',
          diagnosticIds: [diagnostic.diagnosticId],
        });
        break;
      }
    }
    // The outcome just handled is part of the attempt's cumulative figures,
    // and the next candidate's recognition — its census included — can be
    // slow. Without a report here a mid-scan refresh would show zero
    // diagnostics long after the attempt accumulated them (data-model.md
    // § ScanProgress).
    input.onProgress?.({
      phase: 'recognizing',
      visitedEntries: input.result.visitedEntries,
      candidateFiles: input.result.candidateFiles,
      readBytes: input.result.readBytes,
      diagnosticCount: diagnostics.length,
    });
  }

  // An admitted candidate is never read and published a second time as a
  // companion. Each census already excludes its own seed, but two candidates in
  // one directory list each other, and the second copy would put one file in the
  // inventory twice under two identities — with its bytes read and counted
  // twice. The shipped Codex matcher admits one `SKILL.md` per skill directory,
  // so no shipped rule reaches this today; it is enforced rather than assumed
  // because the next rule that admits two files in one directory would
  // otherwise duplicate them with nothing to show it.
  for (const candidate of input.result.files) {
    companions.delete(candidate.publicPath);
  }

  // A companion is read after its candidate, because which files accompany a
  // candidate is only known once that candidate has been recognized. It is
  // published as an ordinary file with no recognitions: it belongs to the
  // customization, but no rule admitted it and nothing classified it, so it has
  // no kind and appears in no kind's inventory.
  //
  // The map is keyed by display path, so two candidates listing one file read it
  // once.
  //
  // The traversal counted the bytes it read; a companion is read here, by the
  // same path, so its bytes belong to the same figure. Reporting only the
  // traversal's would understate what the scan actually read.
  let companionReadBytes = 0;
  for (const [publicPath, absolutePath] of companions) {
    const outcome = await readCandidate(absolutePath);
    if (outcome.kind === 'readable' || outcome.kind === 'binary') {
      companionReadBytes += outcome.sizeBytes;
    }
    switch (outcome.kind) {
      case 'readable':
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: publicPath,
          encoding: outcome.encoding,
          hadLeadingBom: outcome.hadLeadingBom,
          sourceText: outcome.sourceText,
          sizeBytes: outcome.sizeBytes,
          diagnosticIds: [],
        });
        break;
      case 'binary':
        // An image or a compiled asset is part of what a skill ships, so
        // binary bytes here are the file's ordinary published fact — no
        // Diagnostic, and the generation stays complete. An admitted
        // candidate is different: a rule admitted it as a text customization,
        // so NUL bytes there are a finding about the customization. Nothing
        // expected a companion to be text.
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: publicPath,
          encoding: 'binary',
          sizeBytes: outcome.sizeBytes,
          diagnosticIds: [],
        });
        break;
      case 'unreadable': {
        // A file the skill ships that cannot be read is a real failure of
        // this scan's publication — the census listed it, so the skill has
        // it, and the reader cannot see it — and it makes the generation
        // partial exactly as an admitted candidate's failed read does
        // (FR-028).
        hasFileConfinedOutcome = true;
        const diagnostic = new DiagnosticRecord({
          code: 'file-unreadable',
          lifecycleOwnerKey: null,
          sourceId: input.sourceId,
          sourceRelativePath: publicPath,
        });
        diagnostics.push(diagnostic);
        files.push({
          sourceId: input.sourceId,
          sourceRelativePath: publicPath,
          encoding: 'unknown',
          diagnosticIds: [diagnostic.diagnosticId],
        });
        break;
      }
    }
    // The read that just completed is part of the attempt's cumulative
    // figures, and the phase stays 'recognizing': recognizing is what listed
    // these files, and a phase that stepped back to 'reading' would report
    // the pipeline running in reverse.
    input.onProgress?.({
      phase: 'recognizing',
      visitedEntries: input.result.visitedEntries,
      candidateFiles: input.result.candidateFiles,
      readBytes: input.result.readBytes + companionReadBytes,
      diagnosticCount: diagnostics.length,
    });
  }

  return {
    kind: 'publishable',
    outcome: hasFileConfinedOutcome ? 'partial' : 'complete',
    files,
    recognitions,
    skillCompanionsByPath,
    visitedEntries: input.result.visitedEntries,
    candidateFiles: input.result.candidateFiles,
    readBytes: input.result.readBytes + companionReadBytes,
    // The attempt publishes its records in the contracted deterministic
    // order — owner rank, scope, path, code (data-model.md § Diagnostic).
    diagnostics: sortDiagnostics(diagnostics).map((record) => record.serialize()),
  };
}

/** Input of {@link runSourceScan}: one Source attempt over the shipped catalog. */
export interface SourceScanInput {
  /** The scanned Source every published record belongs to. */
  readonly sourceId: string;
  /**
   * The retained raw selected root, never the escaped display boundary
   * (FR-001/FR-002). The boundary grants no read authority and cannot be
   * decoded back into a path.
   */
  readonly root: string;
  /** The lifecycle owner of a `root-unreadable` failure; see {@link ScanPublicationInput}. */
  readonly rootFailureOwner: LifecycleOwnerKey;
  /** The compiled rule catalog to execute; defaults to the shipped Repository set. */
  readonly rules?: readonly CompiledStaticCandidateRule[];
  /** The vendor recognizer dispatch; see {@link ScanPublicationInput.recognize}. */
  readonly recognize?: (input: RecognitionInput) => Promise<CandidateRecognition>;
  /**
   * Called as the attempt moves through its phases, so a refresh mid-scan shows
   * where it is. The attempt ignores what it returns.
   */
  readonly onProgress?: (update: ScanProgressUpdate) => void;
}

/**
 * Runs one Source scan attempt end to end: traverse the compiled allowlist
 * from the retained raw root, then assemble the closed publication matrix.
 * A failure that is not confined to one file propagates unchanged to the
 * trigger-owning boundary — the accepted-job catch for a session-API rescan
 * (FR-030) or the process top level for the ownerless startup scan — because
 * converting it here would fabricate a partial result out of an attempt that
 * never completed.
 */
export async function runSourceScan(input: SourceScanInput): Promise<ScanPublication> {
  const staticRules = input.rules ?? REPOSITORY_INSPECTION_RULES;
  // Stage one: the configuration read (T1090). Configuration decides part of
  // what the scan targets, so each vendor's reader runs before the scan and
  // turns the values it validates into plans of the same walk. A vendor reads
  // its own configuration here because only that vendor knows which file
  // carries it and what a declaration means; what the reader may produce is
  // bounded by `ConfiguredDerivedPlan` — one shipped derived rule's identity
  // and a plan of literal segments — so a reader widens the walk's allowlist
  // by exactly the entries its vendor's configuration named, and by nothing
  // else.
  const configured: ConfiguredDerivedPlan[] = [];
  for (const read of REPOSITORY_CONFIGURATION_READERS) {
    configured.push(...(await read(input.root)));
  }
  const rules: readonly CompiledCandidateRule[] = [
    ...staticRules,
    ...configured.map((entry) => entry.rule),
  ];
  // Stage one is over. The walk reports `enumerating` itself, but only once a
  // directory has been listed, so a slow root would leave the configuration
  // read on screen as the running stage long after it finished.
  input.onProgress?.({
    phase: 'enumerating',
    visitedEntries: 0,
    candidateFiles: 0,
    readBytes: 0,
    diagnosticCount: 0,
  });
  const result = await runTraversalScan({
    root: input.root,
    plans: [...staticRules.map((rule) => rule.plan), ...configured.map((entry) => entry.plan)],
    ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
  });
  if (result.kind === 'scanned') {
    // Reading is done; what follows is recognizing what was read, which is the
    // phase a mid-scan refresh should now see.
    input.onProgress?.({
      phase: 'recognizing',
      visitedEntries: result.visitedEntries,
      candidateFiles: result.candidateFiles,
      readBytes: result.readBytes,
      // Zero at this point: the per-file outcomes assembly turns into
      // diagnostics are decided after this report, and stating the terminal
      // total here would state a number the attempt has not reached
      // (data-model.md § ScanProgress).
      diagnosticCount: 0,
    });
  }
  return assembleScanPublication({
    sourceId: input.sourceId,
    root: input.root,
    rootFailureOwner: input.rootFailureOwner,
    rules,
    result,
    ...(input.recognize === undefined ? {} : { recognize: input.recognize }),
    ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
  });
}
