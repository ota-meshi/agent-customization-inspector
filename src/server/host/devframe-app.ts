// devframe application definition and host startup for the local session
// transport (contracts/http-api.md). The host binds a devframe-selected
// local port on the loopback interface only — via the fixed host name
// `localhost` (spec.md Clarifications § Session 2026-07-23) — and runs
// unauthenticated (`auth: false`): loopback binding is the complete
// host-side protection (QR-003, Constitution § Quality and Safety Standards). devframe applies an origin
// gate of its own to the WebSocket upgrade, which is why no product-owned
// check stands beside it — but it is not part of that boundary: its loopback
// test passes any hostname beginning with `127.` or ending in `.localhost`,
// so a page whose author chose such a hostname is admitted (research.md
// § 8). Threat-model boundary and residual limitation:
// other local processes and, via DNS rebinding, a malicious web page can
// reach the session while the inspector runs, and served content may
// include the user's own secrets — so the host is never exposed beyond the
// initiating machine and no configuration can bind another interface.
// devframe owns static SPA serving from `cli.distDir` and port selection;
// the product owns best-effort startup browser opening through its startup
// opener (`./browser-opener`, research.md § 3), adds no asset manifest or
// per-asset re-verification, and its only routes of its own are the shell
// fallbacks in `createHostApp` — one per kind with a client route:
// `/skills/**`, `/instructions/**`, `/mcp/**`, `/hooks/**`, `/rules/**`,
// `/prompts-and-commands/**`, `/permissions/**`, `/agents/**`,
// `/plugins/**`, `/output-styles/**`, and `/settings-and-configuration/**` —
// which devframe's static handler cannot serve (Constitution Principle I). An unexpected
// thrown/rejected RPC handler error is serialized as-is by devframe/birpc
// and the client shows the real error (contracts/http-api.md § Common
// results and errors); deterministic conflicts are returned as their fixed
// closed rejection variants, which are declared functional outcomes, not
// sanitization.
import { fileURLToPath } from 'node:url';
// The `/node` subpath, not bare `h3`: Nuxt's generated tsconfig aliases the
// bare specifier to its own bundled h3 v1 for the app project's benefit, so
// the bare import would typecheck against the wrong major. Both spellings
// resolve to the same installed h3 2 module instance devframe itself loads.
import { H3, defineHandler } from 'h3/node';
import { createDevServer, type CreateDevServerOptions } from 'devframe/adapters/dev';
import { openStartupBrowser } from './browser-opener';
import {
  GlobalConsentDomain,
  PRODUCTION_GLOBAL_MEMBER_PORTS,
  resolveGlobalMembers,
  type GlobalConsentPreview,
} from './global-consent';
// The package manifest is the single source of these values. The bundler
// tree-shakes the JSON module down to the referenced fields, so the
// packaged CLI never reads package.json at runtime.
import packageJson from '../../../package.json' with { type: 'json' };
import type { DevframeDefinition } from 'devframe';
import { createOpaqueId } from '../../shared/entities';
import type { LifecycleOwnerKey, SerializedDiagnostic } from '../../shared/diagnostics';
import { runSourceScan } from '../inspection/scan';
import { CLAUDE_GLOBAL_RULES } from '../inspection/rules/claude';
import { CODEX_AGENTS_HOME_RULES, CODEX_GLOBAL_RULES } from '../inspection/rules/codex';
import { COPILOT_AGENTS_HOME_RULES, COPILOT_GLOBAL_RULES } from '../inspection/rules/copilot';
import type { CompiledStaticCandidateRule } from '../inspection/rules/registry';
import type { ToolRecognition } from '../inspection/recognizers/candidate';

import type {
  GlobalMemberId,
  CommandResult,
  CustomizationFileDto,
  DeterministicRejection,
  FileDetailDto,
  FileDetailParams,
  GlobalConsentPreviewDto,
  GlobalDisableResultDto,
  GlobalEnableResultDto,
  GlobalFenceRecoverySnapshot,
  FileOpenParams,
  InspectionDataResult,
  HookCarrierDetailDto,
  McpCarrierDetailDto,
  PluginCarrierDetailDto,
  PluginCarrierDetailParams,
  PluginFileDetailDto,
  PluginFileDetailParams,
  PermissionPolicyDetailDto,
  GlobalRescanParams,
  ScanAdmission,
  SessionSnapshot,
} from '../../shared/api-types';
import type { InspectionSession, SessionCoordinator } from '../session/session';

/**
 * Which compiled rules a consented Global scan executes for each member. A
 * member's catalog is authored here — beside the ports that admit the roots —
 * because which rules run below which consented boundary is the host's
 * binding, not a fact a record's own fields carry
 * (contracts/inspection-path-allowlist.md § Global selector requirements). The
 * shared agent home's catalog is every vendor's rules over that boundary, so
 * one admitted file there carries each documenting vendor's recognition
 * (FR-045).
 */
const GLOBAL_RULES_BY_MEMBER: Readonly<
  Record<GlobalMemberId, readonly CompiledStaticCandidateRule[]>
> = {
  copilot: COPILOT_GLOBAL_RULES,
  claude: CLAUDE_GLOBAL_RULES,
  codex: CODEX_GLOBAL_RULES,
  agents: [...CODEX_AGENTS_HOME_RULES, ...COPILOT_AGENTS_HOME_RULES],
};

/** The one session and its coordinator the RPC functions operate on. */
export interface InspectorHostContext {
  /** The process's single inspection session. */
  readonly session: InspectionSession;
  /** The serialized scan coordinator owning admission and commits. */
  readonly coordinator: SessionCoordinator;
}

// The packaged SPA shell directory. The server bundle is emitted to the
// dist root (dist/cli.mjs), so the built Nuxt output is its `public`
// sibling; resolving from import.meta.url keeps the path correct wherever
// the package is installed, because devframe resolves a relative distDir
// against the invocation cwd (which is the inspected repository, not the
// package). Browser-emulating test environments rewrite module URLs to a
// non-file scheme; the relative spelling is only reachable there, where no
// server is started.
function packagedPublicDir(): string {
  const url = new URL('public', import.meta.url);
  return url.protocol === 'file:' ? fileURLToPath(url) : 'dist/public';
}

/**
 * Executes one accepted Repository scan job: traverse the shipped compiled
 * allowlist from the retained selected root, assemble the closed
 * publication matrix, and commit or fail through the coordinator. A
 * publishable result commits atomically (partial exactly when a
 * file-confined outcome exists, FR-028); a root failure fails the attempt
 * with its retained `root-unreadable` lifecycle Diagnostic and no partial
 * inventory (FR-002); any other throw propagates to the caller's boundary —
 * the accepted-job catch for a session-API rescan (FR-030), or the process
 * top level for the ownerless automatic startup scan. The trigger-owning
 * caller supplies the root-failure lifecycle owner (data-model.md
 * § Diagnostic): `repository` for the automatic first scan,
 * `published-source:<sourceId>` for an explicit rescan of the published
 * Source. Exported for the CLI, which runs the automatic first scan
 * through the same job.
 */
export async function executeRepositoryScan(
  context: InspectorHostContext,
  scanRequestId: string,
  sourceId: string,
  rootFailureOwner: LifecycleOwnerKey,
): Promise<void> {
  const publication = await runSourceScan({
    sourceId,
    // The retained raw selected root, never the escaped display boundary: the
    // boundary is a one-way presentation label and grants no read authority
    // (FR-001/FR-002).
    root: context.session.selectedRepositoryRoot,
    rootFailureOwner,
    // Repository scope whatever the diagnostic owner is: an explicit rescan's
    // owner is `published-source:<sourceId>`, and the scope is what decides
    // the ancestor entry-name verification (scan.ts § ScanPublicationInput).
    scope: 'repository',
    // A refresh during a long scan shows where the attempt is rather than the
    // zeros it was admitted with. The coordinator ignores a report for a
    // revoked or settled attempt, so a superseded scan cannot speak for the
    // Source (contracts/http-api.md § get-session `progress`).
    onProgress: (update) => {
      context.coordinator.reportProgress(scanRequestId, update);
    },
    // Asked before each new filesystem operation (data-model.md
    // § ScanAttempt "stops new scheduling"): a disable or shutdown that
    // revoked this attempt stops the walk at its next operation.
    authorityHolds: () => context.coordinator.publicationAuthorityHolds(scanRequestId),
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });
    return;
  }
  // Deterministic returned root failure: retain the actionable Diagnostic
  // where the data model defines it (repository owner reference or the
  // explicit rescan's stale entry) instead of discarding it (FR-002).
  context.coordinator.failScan(scanRequestId, {
    kind: 'diagnostic',
    diagnostic: publication.diagnostic,
  });
}

/**
 * Executes one accepted explicit rescan of a published member Global Source
 * (T1014; contracts/http-api.md § rescan-global): one Source scan of that
 * member's retained consented root with that member's own Global rule
 * catalog, settled through the same coordinator paths a Repository rescan
 * takes — `completeScan` commits the Global sequence's next generation with
 * every sibling Source carried, and a deterministic root failure is retained
 * as the explicit rescan's stale entry rather than discarded (FR-002,
 * FR-030).
 */
export async function executeGlobalMemberRescan(
  context: InspectorHostContext,
  scanRequestId: string,
  sourceId: string,
  member: GlobalMemberId,
  root: string,
): Promise<void> {
  const publication = await runSourceScan({
    sourceId,
    // The exact admitted raw root the control retained, never a display
    // label: the escaped presentation grants no read authority and is never
    // decoded back into a path (FR-002).
    root,
    // An explicit rescan of a published Source: a deterministic root failure
    // belongs to that Source's stale overlay (data-model.md § Diagnostic).
    rootFailureOwner: `published-source:${sourceId}`,
    scope: 'global',
    rules: GLOBAL_RULES_BY_MEMBER[member],
    // No configuration reader, stated rather than inherited, exactly as the
    // batch states it (FR-016 through FR-018).
    configurationReaders: [],
    onProgress: (update) => {
      context.coordinator.reportProgress(scanRequestId, update);
    },
    // Asked before each new filesystem operation (data-model.md
    // § ScanAttempt "stops new scheduling"): a disable or shutdown that
    // revoked this attempt stops the walk at its next operation.
    authorityHolds: () => context.coordinator.publicationAuthorityHolds(scanRequestId),
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });
    return;
  }
  // Deterministic returned root failure: retain the actionable Diagnostic on
  // the explicit rescan's stale entry instead of discarding it (FR-002).
  context.coordinator.failScan(scanRequestId, {
    kind: 'diagnostic',
    diagnostic: publication.diagnostic,
  });
}

/**
 * Executes one accepted Global batch: scan every admitted member's consented
 * root and commit all of their results together in the batch's one atomic
 * generation (T957, FR-014).
 *
 * One commit for the whole subset, so no refresh can observe a per-member
 * publication. Each member runs its own Source scan against its own admitted
 * root with that member's Global rule catalog — the roots never merge, and a
 * member's own root failure is that member's `scan-failed` control rather than
 * the batch's — while a failure not confined to one member's files aborts the
 * batch and is retained once as the failed request's error.
 */
export async function executeGlobalBatch(
  context: InspectorHostContext,
  scanRequestId: string,
  members: readonly {
    readonly member: GlobalMemberId;
    readonly sourceId: string;
    readonly root: string;
  }[],
): Promise<void> {
  const results: {
    member: GlobalMemberId;
    files: readonly CustomizationFileDto[];
    recognitions: readonly ToolRecognition[];
    diagnostics: readonly SerializedDiagnostic[];
    outcome: 'complete' | 'partial';
    visitedEntries: number;
    candidateFiles: number;
    readBytes: number;
    censusEscapedDirectories: readonly string[];
  }[] = [];
  const failures: { member: GlobalMemberId; failureCode: 'root-unreadable' }[] = [];
  try {
    for (const member of members) {
      const publication = await runSourceScan({
        sourceId: member.sourceId,
        // The exact admitted raw root the control retained, never a display
        // label: the escaped presentation grants no read authority and is
        // never decoded back into a path (FR-002).
        root: member.root,
        rootFailureOwner: `global:${member.member}`,
        scope: 'global',
        rules: GLOBAL_RULES_BY_MEMBER[member.member],
        // No configuration reader, stated rather than inherited: naming a
        // catalog already closes the default, and saying so here is what makes
        // the boundary visible at the call that depends on it (FR-016 through
        // FR-018).
        configurationReaders: [],
        // Live per-member counters on the member's own Source, exactly as the
        // rescans report theirs (contracts/http-api.md § get-session
        // `progress`).
        onProgress: (update) => {
          context.coordinator.reportBatchMemberProgress(scanRequestId, member.sourceId, update);
        },
        // Asked before each new filesystem operation (data-model.md
        // § ScanAttempt): a disable accepted mid-batch stops the member
        // walks at their next operation while the drain waits out the one
        // read in flight.
        authorityHolds: () => context.coordinator.batchAuthorityHolds(scanRequestId),
      });
      if (publication.kind !== 'publishable') {
        // The admitted root cannot be read: it was removed between admission
        // and the scan, or `stat` admitted a directory whose entries this
        // process may not list. Either way it is this member's own failure and
        // leaves the other members free to commit (FR-014).
        failures.push({ member: member.member, failureCode: 'root-unreadable' });
        continue;
      }
      results.push({
        member: member.member,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
        visitedEntries: publication.visitedEntries,
        candidateFiles: publication.candidateFiles,
        readBytes: publication.readBytes,
        censusEscapedDirectories: publication.censusEscapedDirectories,
      });
    }
  } catch (cause: unknown) {
    // Not confined to one member's files: the whole batch ends, the error is
    // retained once on the failed status, and no subset commits
    // (contracts/http-api.md § enable-global).
    context.coordinator.failGlobalBatch(
      scanRequestId,
      cause instanceof Error ? cause.message : String(cause),
    );
    throw cause;
  }
  context.coordinator.completeGlobalBatch(scanRequestId, results, failures);
}

/**
 * Turns one confirmed preview into read authority and runs the batch it
 * accepts: registers the operation, admits every member the production ports
 * resolve, settles the disposition, and — when a batch was queued — scans each
 * admitted root, commits the Global generation, and returns only once every
 * admitted member's scan has settled (contracts/http-api.md § enable-global).
 *
 * One function for the two confirmations this product accepts, and both wait
 * for the batch. `enable-global` answers the reader who confirmed with the
 * generation already committed, so the refetch that follows the answer shows
 * what the confirmation read and no second press is asked for; a lost
 * response still loses no batch, because the batch is retained on
 * `batchStatus` and a fresh poll recovers it. The CLI's
 * `--inspect-personal-setup` awaits it for the same reason the automatic
 * Repository scan completes before the host starts: its launch line prints
 * with the Global generation already committed.
 *
 * They differ in what an accepted batch's terminal failure does, which
 * {@link GlobalEnableOptions.onBatchFailure} decides.
 *
 * A conflicting registration is the caller's to report; every other outcome is
 * the settled disposition, `active-no-job` included — a confirmation nothing
 * could be admitted for is accepted, and what went wrong is each control's own
 * `failureCode`.
 */
export interface GlobalEnableOptions {
  /**
   * What an accepted batch's terminal failure does to this call.
   *
   * `retain` answers with the acceptance and leaves the failure on the
   * session's failed `batchStatus`, which is what the reader's own consent
   * surface then states (contracts/http-api.md § enable-global). `propagate`
   * throws it instead, for a caller with no such surface: the CLI's
   * `--inspect-personal-setup` runs before any host exists, so a swallowed
   * failure would print a launch line for a personal setup that was never
   * read — the automatic Repository scan above it ends the launch the same
   * way (spec.md SC-007 "a startup failure ends the launch with an actionable
   * message").
   */
  readonly onBatchFailure: 'retain' | 'propagate';
}

export async function runGlobalEnable(
  context: InspectorHostContext,
  preview: GlobalConsentPreview,
  options: GlobalEnableOptions,
): Promise<GlobalEnableResultDto | DeterministicRejection> {
  // A confirmation over an active consent is the same-preview retry
  // (contracts/http-api.md § enable-global): the server derives the exact
  // retryable subset — unpublished non-pending admitted controls and
  // same-preview rejected controls — and an empty subset is the declared
  // conflict, so a consent with nothing to retry is never silently replaced.
  const activeConsent = context.session.globalConsent;
  if (activeConsent !== null && activeConsent.pendingTools.length > 0) {
    // A batch is still in flight: retry is offered only while `pendingTools`
    // is empty, and during a non-failed active batch the retryable tools are
    // informational only (contracts/http-api.md § enable-global) — settling a
    // second batch here would replace the running one's `batchStatus` and
    // discard its commit as a late result.
    return { error: { code: 'global-enable-in-progress' } };
  }
  const retryableTools = activeConsent?.retryableTools() ?? null;
  if (retryableTools !== null && retryableTools.length === 0) {
    return { error: { code: 'no-retryable-global-tool' } };
  }
  const registered = context.coordinator.registerGlobalEnable(
    preview.previewId,
    retryableTools === null ? 'initial-enable' : 'retry',
  );
  if (registered.kind === 'conflict') {
    return { error: { code: 'global-enable-in-progress' } };
  }
  let resolved;
  try {
    // Every admission runs before any disposition, so a throw here has
    // activated no consent, no control, and no job — and a retry's throw has
    // replaced none of the existing controls. The admission is registered in
    // the disable barrier's drain: the barrier must cancel and drain an
    // operation-local initial enable (contracts/http-api.md
    // § disable-global), so a disable accepted mid-admission waits these
    // reads out instead of committing beside them.
    // Through the same FIFO the batch and every scan use: plan.md
    // § Concurrency has one coordinator serialize this admission with them,
    // so its `stat`/`access` reads never run beside a Repository scan or a
    // member rescan. A disable accepted while it waits cancels it at dequeue,
    // which the operation check below already answers.
    const admission = context.coordinator.runGlobalTransaction(() =>
      resolveGlobalMembers(
        preview,
        PRODUCTION_GLOBAL_MEMBER_PORTS,
        retryableTools ?? undefined,
        // Checked before each member's probe: the barrier cancels this
        // operation on acceptance, and the next member's read must not start
        // after that (contracts/http-api.md § disable-global).
        () => context.session.globalEnableInProgress?.operationId === registered.operationId,
      ),
    );
    resolved = await admission;
  } catch (cause: unknown) {
    context.coordinator.abandonGlobalEnable(registered.operationId);
    throw cause;
  }
  if (
    resolved === undefined ||
    context.session.globalEnableInProgress?.operationId !== registered.operationId
  ) {
    // `undefined` is the coordinator's dequeue cancellation: the barrier
    // accepted while this admission was queued, so it read nothing at all.
    // The barrier cancelled this operation while its admissions ran
    // (expected cancellation — nothing was activated). The settle below
    // would throw that cancellation as an ordinary error; the contract's
    // answer for an enable the barrier cut down is the same fixed conflict
    // every fenced command takes (contracts/http-api.md § enable-global
    // Outcomes), which sends the client through its purge-and-refetch
    // recovery rather than an error report.
    return { error: { code: 'global-disable-pending' } };
  }
  const result = context.coordinator.settleGlobalEnable(
    registered.operationId,
    preview.previewId,
    resolved,
  );
  if (result.state !== 'queued' || result.scanRequestId === null) {
    return result;
  }
  const members = result.acceptedTools.map((member) => {
    const control = context.session.globalConsent!.controls.get(member)!;
    return { member, sourceId: control.sourceId!, root: control.root! };
  });
  // Through the Global sequence's own FIFO and the disable barrier's drain
  // set: the batch is one transaction of that sequence, so it never runs
  // beside an explicit member rescan, and a disable accepted mid-batch waits
  // out its reads before committing (contracts/http-api.md § disable-global).
  const scanRequestId = result.scanRequestId;
  try {
    await context.coordinator.runGlobalTransaction(() =>
      executeGlobalBatch(context, scanRequestId, members),
    );
  } catch (cause: unknown) {
    if (options.onBatchFailure === 'propagate') {
      throw cause;
    }
    // Retained rather than thrown: the failure is already on the failed
    // `batchStatus` that `executeGlobalBatch` wrote, which is what the
    // contract makes of a throw after queued acceptance (contracts/http-api.md
    // § enable-global), and the consent surface states it from there. The
    // confirmation itself was accepted, so it answers with its acceptance.
  }
  return result;
}

/**
 * Builds the devframe application definition: product identity, the
 * unauthenticated loopback CLI host serving the packaged SPA, and the
 * session RPC functions registered under the
 * `agent-customization-inspector:` prefix (contracts/http-api.md § RPC
 * function catalog).
 *
 * Only the catalog functions exist. There is deliberately no reveal, masking,
 * redaction, or environment-resolution function, and adding one is the only
 * way an invocation of it could ever succeed: devframe resolves a call by
 * exact registered name, so an unregistered operation fails with its strict
 * unknown-function rejection and retains no client or server state (T098).
 * Their absence is the product's position, not an oversight — an authored
 * value is published exactly as written or not at all, and a process
 * environment is never read on an inspected file's behalf.
 */
export function createInspectorDevframe(
  context: InspectorHostContext,
  preferredPort?: number,
  consent: GlobalConsentDomain = new GlobalConsentDomain(),
): DevframeDefinition {
  // devframe 0.7.5 declares `defineDevframe` in its types but does not
  // export it at runtime; the helper is an identity function, so the typed
  // literal below is the same definition value it would return.
  return {
    // The id is the contract-fixed product identity that also prefixes
    // every RPC function name (contracts/http-api.md § RPC namespace); it
    // stays a literal rather than following a package rename.
    id: 'agent-customization-inspector',
    name: 'Agent Customization Inspector',
    version: packageJson.version,
    packageName: packageJson.name,
    homepage: packageJson.homepage,
    description: packageJson.description,
    // This cli block deliberately has no `host` key: devframe 0.7.5 binds
    // its default 'localhost' (loopback) for both the HTTP listener and the
    // WS transport with no environment fallback, so the printed and opened
    // URL reads http://localhost:<port>/ (contracts/http-api.md § Host
    // requirements). The exact devframe pin and the startup contract tests
    // own that guarantee; re-declaring the framework default here would be
    // the duplicated policy AGENTS.md forbids.
    cli: {
      distDir: packagedPublicDir(),
      // Unauthenticated by decision: loopback binding is the complete
      // host-side protection (QR-003, Constitution § Quality and Safety Standards).
      auth: false,
      // A preference, never the bound port (FR-001): devframe hands this to
      // `get-port-please`, which keeps the value when the port is free, moves
      // to another port when it is taken, and reads 0 as the request to have
      // a free port selected automatically. The key is omitted when the CLI
      // was given no `--port`, so an unstated preference stays devframe's own
      // default rather than a value this product repeats.
      ...(preferredPort === undefined ? {} : { port: preferredPort }),
    },
    setup(ctx) {
      // None of these declare devframe's `jsonSerializable: true`, although
      // every DTO is JSON-plain by design (src/shared/api-types.ts). In
      // devframe 0.7.5 the flag changes nothing on this adapter's wire: the
      // dev adapter passes no definitions to the WS transport and publishes
      // no `jsonSerializableMethods` in `__connection.json`, so both
      // directions use structured-clone frames regardless, and the flag's
      // strict-JSON dev validation never runs. A flag with no observable
      // effect is not declared.
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-session',
        type: 'query',
        // The snapshot is rebuilt synchronously under the single-threaded
        // coordinator turn, so the epoch/fence revalidation the contract
        // requires is the same turn that binds the payload.
        handler: ():
          InspectionDataResult<SessionSnapshot> | CommandResult<GlobalFenceRecoverySnapshot> => {
          if (context.session.globalDisableInProgress !== null) {
            // The one fenced success: the exact control-only recovery
            // projection, with no generation or inspection graph — what a
            // fenced tab renders and retries from (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`).
            return {
              globalContentEpoch: context.session.globalContentEpoch,
              data: context.session.fenceRecoverySnapshot(),
            };
          }
          const snapshot = context.session.snapshot();
          return {
            globalContentEpoch: snapshot.globalContentEpoch,
            repositoryGeneration: snapshot.repositoryGeneration,
            globalGeneration: snapshot.globalGeneration,
            data: snapshot,
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-file-detail',
        type: 'query',
        // The one function that returns authored content. It carries no
        // acknowledgement parameter and enforces no gate, because FR-027 admits
        // neither: over a loopback-bound session showing a viewer their own
        // files, a gate guards nothing. What the host does own is that the
        // snapshot never carries source text, so content is reachable only by
        // asking for one file at
        // a time.
        //
        // The parameter validates by resolution, with no shape guard in front
        // of it (contracts/http-api.md § Host requirements 6): the value is
        // only ever compared against committed paths, never used as a
        // filesystem operand, so any value they do not hold — a value of
        // another type included — resolves nowhere and takes the same
        // `stale-resource` rejection below.
        handler: (
          request: FileDetailParams,
        ): InspectionDataResult<FileDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const detail = context.session.fileDetail(request?.sourceRelativePath, request?.source);
          if (detail === null) {
            // The current committed generations hold no detail of this
            // function's at the path — never scanned, removed by the commit
            // that replaced the snapshot the link came from, or an admitted
            // MCP carrier's, which only the carrier function serves; all are
            // indistinguishable and answered alike (contracts/http-api.md
            // § get-file-detail).
            return { error: { code: 'stale-resource' } };
          }
          // Bound in the same synchronous turn as the payload, so the client's
          // epoch and generation guards compare against the state the detail
          // was actually read from — through the O(1) envelope rather than a
          // full snapshot projection built for three scalars.
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-mcp-carrier-detail',
        type: 'query',
        // The MCP carrier's own detail function (contracts/http-api.md
        // § get-mcp-carrier-detail): the declarations the carrier makes and
        // its content-free file facts, with no `sourceText` field at all — a
        // file admitted so its declarations can be published shows those
        // declarations and never its own bytes (FR-007), which is why its
        // detail is not a `get-file-detail` variant. The parameter is the
        // file's whole identity — the Source-and-path pair `get-file-detail`
        // takes, because a Global member publishes MCP carriers too — and it
        // validates by resolution exactly as that function's does.
        handler: (
          request: FileDetailParams,
        ): InspectionDataResult<McpCarrierDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const detail = context.session.mcpCarrierDetail(
            request?.sourceRelativePath,
            request?.source,
          );
          if (detail === null) {
            // No MCP recognition at the path — never scanned, or removed by
            // a later commit. A parsed carrier declaring no server is not
            // this case: it holds a recognition and answers with empty
            // servers (contracts/http-api.md § get-mcp-carrier-detail).
            return { error: { code: 'stale-resource' } };
          }
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-hook-carrier-detail',
        type: 'query',
        // The hook carrier's own detail function (contracts/http-api.md
        // § get-hook-carrier-detail): the lifecycle events the carrier
        // declares and its content-free file facts, with no `sourceText` field
        // at all — a file admitted so its declarations can be published shows
        // those declarations and never its own bytes (FR-007), which is why
        // its detail is not a `get-file-detail` variant. Publishing a
        // declaration is not running it: no declared command, handler, or
        // referenced script is executed, opened, or resolved (FR-020). The
        // parameter is the file's whole identity — the Source-and-path pair
        // `get-file-detail` takes — and it validates by resolution exactly as
        // that function's does.
        handler: (
          request: FileDetailParams,
        ): InspectionDataResult<HookCarrierDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const detail = context.session.hookCarrierDetail(
            request?.sourceRelativePath,
            request?.source,
          );
          if (detail === null) {
            // No hook recognition at the path — never scanned, or removed by a
            // later commit. A parsed carrier declaring no event is not this
            // case: it holds a recognition and answers with empty events
            // (contracts/http-api.md § get-hook-carrier-detail).
            return { error: { code: 'stale-resource' } };
          }
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-plugin-carrier-detail',
        type: 'query',
        // The plugin carrier's own detail function (contracts/http-api.md
        // § get-plugin-carrier-detail). Not a `get-file-detail` variant
        // because a plugin row names a declared plugin rather than a file
        // (data-model.md § Inventory unit), and the two carriers of that row
        // answer differently: a manifest is itself the customization and
        // serves its complete source, while a catalog resolves many plugin
        // names and serves its declarations without its bytes. The parameter
        // names the row as well as the file, because a catalog offering also
        // serves the plugin root it reached; both halves validate by
        // resolution exactly as `get-file-detail`'s one does.
        handler: (
          params?: PluginCarrierDetailParams | null,
        ): InspectionDataResult<PluginCarrierDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          // The caller is the wire, which carries whatever was sent: this is
          // the one function whose parameter is an object, so a `null` or an
          // omitted argument would throw on the field read the others survive
          // by returning `undefined`. It resolves nowhere instead, which is
          // what the contract makes a value of another type answer
          // (contracts/http-api.md § RPC boundary) — resolution, not a shape
          // guard with a rejection vocabulary of its own.
          const detail =
            params === null || params === undefined
              ? null
              : context.session.pluginCarrierDetail(params);
          if (detail === null) {
            // No plugin recognition at the path — never scanned, or removed by
            // a later commit. A parsed carrier declaring no plugin is not this
            // case: it holds a recognition and answers with an empty list.
            return { error: { code: 'stale-resource' } };
          }
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-plugin-file-detail',
        type: 'query',
        // One file a plugin ships, read as that plugin's
        // (contracts/http-api.md § get-plugin-file-detail). Its own function
        // rather than a `get-file-detail` variant because that one answers for
        // the row whose subject a file is, and a file below a plugin root has
        // no such row of its own unless a rule independently admitted it — in
        // which case that row answers for its own kind while this one answers
        // for the plugin's page. Membership validates by resolution, exactly as
        // every other detail parameter does.
        handler: (
          params?: PluginFileDetailParams | null,
        ): InspectionDataResult<PluginFileDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const detail =
            params === null || params === undefined
              ? null
              : context.session.pluginFileDetail(params);
          if (detail === null) {
            // No plugin recognition at the path for that product, a file the
            // offering never reached, or a commit that no longer holds it.
            return { error: { code: 'stale-resource' } };
          }
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-permission-policy-detail',
        type: 'query',
        // The permission policy's own detail function (contracts/http-api.md
        // § get-permission-policy-detail). Not a `get-file-detail` variant
        // because a permissions row names a policy rather than a file
        // (data-model.md § Inventory unit): one vendor writes the policy as a
        // document of its own, and another declares it inside a settings file
        // whose remaining keys are a different recognition's content, so one
        // file-shaped result would have to answer for a file it is not about.
        // The parameter is the declaring file's whole identity — the
        // Source-and-path pair `get-file-detail` takes — and it validates by
        // resolution exactly as that function's does.
        handler: (
          request: FileDetailParams,
        ): InspectionDataResult<PermissionPolicyDetailDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const detail = context.session.permissionPolicyDetail(
            request?.sourceRelativePath,
            request?.source,
          );
          if (detail === null) {
            // No permissions recognition at the path — never scanned, or
            // removed by a later commit (contracts/http-api.md
            // § get-permission-policy-detail).
            return { error: { code: 'stale-resource' } };
          }
          return { ...context.session.dataEnvelope(), data: detail };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:rescan-repository',
        type: 'action',
        handler: async (): Promise<CommandResult<ScanAdmission> | DeterministicRejection> => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const snapshot = context.session.snapshot();
          const repository = snapshot.sources.find((source) => source.kind === 'repository');
          if (repository === undefined) {
            // Bootstrap always creates the Repository Source; its absence is
            // an unexpected state and propagates as an ordinary error.
            throw new Error('the repository source is missing from the session');
          }
          const admission = context.coordinator.admitScan(repository.sourceId, {
            kind: 'request',
            operationId: createOpaqueId(),
          });
          if (admission.kind === 'conflict') {
            // The documented duplicate-command conflict, a declared closed
            // functional outcome (contracts/http-api.md § rescan-repository).
            return { error: { code: 'scan-in-progress' } };
          }
          // Resolves once the admitted scan reached its terminal state — the
          // commit of its complete or partial generation, or its failure —
          // rather than at admission (contracts/http-api.md
          // § rescan-repository): the answer then carries the result the
          // reader pressed for, and the client's one refetch after it shows
          // that result without a second press. The accepted job's terminal
          // failure is retained as the Source's stale overlay with the failed
          // request's real error message, never thrown into this invocation
          // (FR-030). The work runs through the sequence's FIFO chain, so it
          // starts only once every earlier accepted command of its sequence
          // settled.
          try {
            await context.coordinator.runInSequence(
              repository.sourceId,
              admission.scanRequestId,
              () =>
                executeRepositoryScan(
                  context,
                  admission.scanRequestId,
                  repository.sourceId,
                  // An explicit rescan of the published Repository Source: a
                  // deterministic root failure belongs to that Source's stale
                  // overlay, not the automatic-scan repository owner
                  // (data-model.md § Diagnostic).
                  `published-source:${repository.sourceId}`,
                ),
            );
          } catch (error: unknown) {
            context.coordinator.failScan(admission.scanRequestId, {
              kind: 'error',
              message: error instanceof Error ? error.message : String(error),
            });
          }
          if (
            context.session.globalDisableInProgress !== null ||
            context.session.globalContentEpoch !== snapshot.globalContentEpoch
          ) {
            // The disable barrier caught the command while it ran or waited:
            // whatever it produced belongs to a world the client purges
            // before rendering, so this answers with the same fixed conflict
            // every fenced command takes (contracts/http-api.md
            // § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const updated = context.session
            .snapshot()
            .sources.find((source) => source.sourceId === repository.sourceId);
          return {
            globalContentEpoch: snapshot.globalContentEpoch,
            data: { scanRequestId: admission.scanRequestId, source: updated ?? repository },
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:rescan-global',
        type: 'action',
        // One scan command for one enabled member Global Source
        // (contracts/http-api.md § rescan-global). The parameter validates by
        // resolution against the published Global Sources — an opaque ID and
        // never a path — so an unknown or removed ID takes the stale-resource
        // rejection and no value is ever a filesystem operand (Host
        // requirements 6).
        handler: async (
          request: GlobalRescanParams,
        ): Promise<CommandResult<ScanAdmission> | DeterministicRejection> => {
          const snapshot = context.session.snapshot();
          if (snapshot.globalDisableInProgress !== null) {
            // The disable barrier outranks every Global command: a scan
            // accepted behind it could commit into a sequence the barrier is
            // discarding (contracts/http-api.md § rescan-global).
            return { error: { code: 'global-disable-pending' } };
          }
          // The wire carries whatever was sent: a `null` or omitted argument
          // reaches the field read below, so the optional access resolves it
          // to no published Source — the same stale-resource rejection a
          // value of another type takes (contracts/http-api.md § Host
          // requirements 6) — rather than throwing on the read.
          const published = snapshot.sources.find(
            (source) => source.kind === 'global' && source.sourceId === request?.sourceId,
          );
          const consent = context.session.globalConsent;
          const control =
            published?.member == null ? undefined : consent?.controls.get(published.member);
          if (
            published?.member == null ||
            control === undefined ||
            control.sourceId !== published.sourceId ||
            control.root === null
          ) {
            // Not a currently published member Global Source: an unknown ID, a
            // Source a disable removed, or a control a retry superseded. The
            // same declared outcome a detail request gives a removed path.
            return { error: { code: 'stale-resource' } };
          }
          // Bound where the guard above has narrowed them: the deferred job
          // closes over these, and control flow cannot narrow a property
          // across a closure boundary.
          const member = published.member;
          const root = control.root;
          const admission = context.coordinator.admitScan(published.sourceId, {
            kind: 'request',
            operationId: createOpaqueId(),
          });
          if (admission.kind === 'conflict') {
            // At most one scan command per Source is running or queued
            // (contracts/http-api.md § rescan-global).
            return { error: { code: 'scan-in-progress' } };
          }
          // Resolves once the admitted scan reached its terminal state rather
          // than at admission, exactly as the Repository command does
          // (contracts/http-api.md § rescan-global): the accepted job's
          // terminal failure is retained as the Source's stale overlay with
          // the failed request's real error message (FR-030). The work runs
          // through the Global sequence's FIFO chain, so two members'
          // accepted commands run and publish in acceptance order.
          try {
            await context.coordinator.runInSequence(
              published.sourceId,
              admission.scanRequestId,
              () =>
                executeGlobalMemberRescan(
                  context,
                  admission.scanRequestId,
                  published.sourceId,
                  member,
                  root,
                ),
            );
          } catch (error: unknown) {
            context.coordinator.failScan(admission.scanRequestId, {
              kind: 'error',
              message: error instanceof Error ? error.message : String(error),
            });
          }
          if (
            context.session.globalDisableInProgress !== null ||
            context.session.globalContentEpoch !== snapshot.globalContentEpoch
          ) {
            // The barrier caught the command while it ran or waited; the same
            // fixed conflict every fenced command takes
            // (contracts/http-api.md § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const updated = context.session
            .snapshot()
            .sources.find((source) => source.sourceId === published.sourceId);
          if (updated === undefined) {
            // Reached by no caller: the Source was resolved above and nothing
            // between the admission and this read removes it.
            throw new Error('the admitted global source is missing from the session');
          }
          return {
            globalContentEpoch: snapshot.globalContentEpoch,
            data: { scanRequestId: admission.scanRequestId, source: updated },
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-global-consent-preview',
        type: 'query',
        // The non-mutating half of the strict pair
        // (contracts/http-api.md § get-global-consent-preview): it returns
        // only the already-current process-memory preview and never creates,
        // replaces, or invalidates one. That is
        // what lets a fresh client redisplay the exact consent a previous
        // client was shown — recapturing here would hand the reader a
        // different preview than the one a later enable is bound to.
        //
        // It needs no freeze check of its own: creation is the only operation
        // that replaces the record, so while consent is active this returns
        // the exact preview that consent was given for.
        handler: (): CommandResult<GlobalConsentPreviewDto> | DeterministicRejection => {
          const preview = consent.current();
          if (preview === null) {
            // Neither a current unconsented preview nor a frozen one: the
            // fixed rejection, which is a declared functional outcome rather
            // than an error.
            return { error: { code: 'consent-preview-missing' } };
          }
          return {
            globalContentEpoch: context.session.snapshot().globalContentEpoch,
            data: preview.toDto(),
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:create-global-consent-preview',
        type: 'command',
        // The state-changing half: the only operation that creates or replaces
        // a preview from the immutable session-start root inputs
        // (contracts/http-api.md § create-global-consent-preview).
        //
        // It takes no parameters, so there is no selector a client could use
        // to narrow the four members or to propose a root of its own: the roots
        // come from the session-start capture, and all four are always
        // evaluated.
        //
        // A throw during preview construction or serialization is deliberately
        // not caught here: it reaches this pre-acceptance RPC boundary and
        // devframe serializes it as-is. Neither creates a job,
        // `scanRequestId`, or read authority. They differ in what is left
        // behind, and the contract says so
        // (contracts/http-api.md § create-global-consent-preview):
        // construction throws before {@link GlobalConsentDomain.createPreview}
        // binds anything, so the prior current preview is unchanged, while a
        // DTO or transport serialization failure happens after that binding —
        // the newly created preview may remain current although no result was
        // delivered.
        handler: (): CommandResult<GlobalConsentPreviewDto> | DeterministicRejection => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence blocks capture and replacement: preview
            // retrieval still answers with the frozen preview, but a new
            // capture would replace what a failed cleanup must retain
            // (data-model.md § GlobalDisableOperation).
            return { error: { code: 'global-disable-pending' } };
          }
          // The two states that freeze the preview. Replacing it under either
          // would strand what depends on it: an active consent names its
          // preview by ID, and the recovery path for a fresh client is to
          // retrieve that exact record — a replacement makes it unretrievable
          // and the reader can no longer see what they authorized. A
          // registered enable is bound to the object it froze, so replacing it
          // mid-operation would leave the enable committing authority for a
          // preview nobody can reach (contracts/http-api.md
          // § create-global-consent-preview).
          if (context.session.globalEnableInProgress !== null) {
            return { error: { code: 'global-enable-in-progress' } };
          }
          if (context.session.globalConsent !== null) {
            return { error: { code: 'consent-preview-frozen' } };
          }
          const preview = consent.createPreview();
          return {
            globalContentEpoch: context.session.snapshot().globalContentEpoch,
            data: preview.toDto(),
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:enable-global',
        type: 'command',
        // The function that turns a reviewed preview into read authority for a
        // reader confirming on the consent surface
        // (contracts/http-api.md § enable-global). The other confirmation this
        // product accepts is the launch command's own
        // `--inspect-personal-setup`, which runs the same sequence through
        // {@link runGlobalEnable} before this host exists (FR-013).
        //
        // Its parameters carry no tool selector, and that absence is the
        // position: consent is for all three tools, so a client that could
        // name a subset could consent to something other than what it showed
        // the reader. The server derives the set from the frozen preview and
        // evaluates every slot it has a port for.
        //
        // Validation is by resolution against the stored record, exactly as
        // the detail functions validate a path: the submitted `previewId` and
        // `allowlistVersion` are compared with what the host holds, and an
        // extra key is ignored rather than rejected — a body this product did
        // not ship cannot name anything the server acts on. `confirmed` must
        // be exactly `true`, because a confirmation is the one field a reader's
        // own action produces.
        handler: async (
          request: unknown,
        ): Promise<CommandResult<GlobalEnableResultDto> | DeterministicRejection> => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          const body = (request ?? {}) as {
            confirmed?: unknown;
            allowlistVersion?: unknown;
            previewId?: unknown;
          };
          const preview = consent.current();
          if (preview === null) {
            return { error: { code: 'consent-preview-missing' } };
          }
          if (body.confirmed !== true) {
            // Not a confirmation. The reader has to have confirmed the exact
            // preview they were shown, and `false` is the same as absent.
            return { error: { code: 'consent-required' } };
          }
          if (body.allowlistVersion !== preview.allowlistVersion) {
            // The read scope moved under the reader: what they reviewed is not
            // what would now be read, so the confirmation is refused and a
            // fresh preview is taken.
            return { error: { code: 'allowlist-version-mismatch' } };
          }
          if (body.previewId !== preview.previewId) {
            // A stale, replayed, or cross-session preview ID. Only the one
            // record this host holds may be confirmed.
            return { error: { code: 'consent-preview-mismatch' } };
          }
          // Answered once every admitted member's scan settled, so the reader
          // who confirmed sees the result of that confirmation on the refetch
          // that follows the answer, without a second press; a lost response
          // still loses no batch, because the batch is retained on
          // `batchStatus` and a fresh poll recovers it (data-model.md
          // § GlobalEnableOperation).
          const result = await runGlobalEnable(context, preview, { onBatchFailure: 'retain' });
          if ('error' in result) {
            return result;
          }
          if (context.session.globalDisableInProgress !== null) {
            // The barrier caught the batch while it ran: the same fixed
            // conflict every fenced command takes (contracts/http-api.md
            // § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          return {
            globalContentEpoch: context.session.snapshot().globalContentEpoch,
            data: result,
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:disable-global',
        type: 'action',
        // The priority security barrier for all inspection data
        // (contracts/http-api.md § disable-global). Argument-free and strict:
        // whatever body arrives is ignored rather than read. A true no-op
        // answers through the ordinary single-stage gate; everything else
        // accepts or joins the barrier and awaits its terminal result — a
        // post-acceptance failure rejects this invocation with the real
        // error, which devframe serializes, while the fence stays closed and
        // the retained projection carries the same message for every fenced
        // tab. Disable itself never returns `global-disable-pending`.
        handler: async (): Promise<CommandResult<GlobalDisableResultDto>> => {
          const disposition = context.coordinator.disposeGlobalDisable(() => {
            // Inside the terminal success commit's own synchronous block, so
            // the frozen preview and the session state clear as one step
            // (data-model.md § GlobalDisableOperation).
            consent.release();
          });
          if (disposition.kind === 'no-op') {
            return {
              globalContentEpoch: context.session.globalContentEpoch,
              data: disposition.result,
            };
          }
          const result = await disposition.completion;
          return {
            globalContentEpoch: context.session.globalContentEpoch,
            data: result,
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:open-file',
        type: 'action',
        // The reader's own request to open the file a detail page is showing,
        // in one of the applications the snapshot published
        // (contracts/http-api.md § open-file). The host performs it because
        // the absolute path is the host's, and the page never holds one.
        //
        // Every parameter validates by resolution, with no shape guard in front
        // of it (contracts/http-api.md § Host requirements 6): the Source and
        // path are compared against committed identities and never used as a
        // filesystem operand, so values they do not hold take the
        // `stale-resource` rejection below, and the target is compared against
        // the launchers the host resolved for this machine, so a value outside
        // the closed set reaches none and throws there. A guard here would be
        // the same closed set written twice, free to fall behind the set it
        // copies.
        handler: async (
          request: FileOpenParams,
        ): Promise<CommandResult<null> | DeterministicRejection> => {
          if (context.session.globalDisableInProgress !== null) {
            // The disable fence outranks every inspection-data answer: the
            // check precedes resource resolution, so the conflict wins
            // without leaking retained graph state (contracts/http-api.md
            // § get-session `GlobalFenceRecoverySnapshot`, § disable-global).
            return { error: { code: 'global-disable-pending' } };
          }
          // Captured before the launch, revalidated after it: this is the one
          // handler whose payload work spans an await, so the contract's
          // capture-construct-revalidate order has to be written out rather
          // than inherited from a synchronous coordinator turn
          // (contracts/http-api.md § Result shapes).
          const capturedEpoch = context.session.globalContentEpoch;
          const opened = await context.session.openCommittedFile(
            request?.sourceRelativePath,
            request?.source,
            request?.target,
          );
          if (
            context.session.globalDisableInProgress !== null ||
            context.session.globalContentEpoch !== capturedEpoch
          ) {
            // A disable accepted while the launcher ran: the result is
            // discarded rather than bound under the epoch that replaced the
            // one it was authorized under. The launch itself already happened
            // — it is the reader's own machine opening their own file — and
            // what the fence governs is the answer this session publishes.
            return { error: { code: 'global-disable-pending' } };
          }
          if (!opened) {
            // No committed generation of the named Source holds the path —
            // never scanned, removed by the commit that replaced the snapshot
            // the page was rendered from, or a Source this session does not
            // carry, which are indistinguishable and answered alike
            // (contracts/http-api.md § open-file).
            return { error: { code: 'stale-resource' } };
          }
          // The launch carries no payload: what a machine does with a file it
          // was handed is that machine's business, so the result reports that
          // the request was made and nothing about what answered it. The epoch
          // comes from the O(1) envelope rather than a full snapshot
          // projection built for one scalar.
          return {
            globalContentEpoch: capturedEpoch,
            data: null,
          };
        },
      });
    },
  };
}

/** Options for {@link startInspectorHost}; the CLI owns their values (FR-001). */
export interface StartInspectorHostOptions {
  /** The session/coordinator pair the RPC functions serve. */
  readonly context: InspectorHostContext;
  /**
   * Automatic browser opening (FR-001): `true` runs the product's startup
   * opener with the bound loopback origin, best-effort — the macOS
   * Chromium tab reuse in front of the `open` package's fixed OS helper
   * (`./browser-opener`); `false` maps from `--no-open`.
   */
  readonly openBrowser?: boolean;
  /**
   * The preferred local port from `--port` (FR-001), or `undefined` when the
   * option was omitted and devframe's own default stands. devframe resolves
   * it: a taken port moves to another, and 0 asks for a free one.
   */
  readonly preferredPort?: number | undefined;
  /** Called after loopback bind and before the host's startup opener. */
  readonly onReady?: CreateDevServerOptions['onReady'];
  /**
   * Asked before each of the startup opener's launch steps: false once a
   * shutdown signal arrived, so the opener neither keeps waiting on the
   * reuse attempt's account nor opens a fallback browser for a host that is
   * already closing (`./browser-opener` § openStartupBrowser).
   */
  readonly openerShouldProceed?: () => boolean;
  /**
   * Aborts the startup opener's own child processes on shutdown: the
   * predicate above stops the next step, while this signal interrupts a
   * probe or reuse script already waiting (browser-opener.ts § reuse).
   */
  readonly openerAbortSignal?: AbortSignal;
  /**
   * The consent state the Global functions serve, when the caller holds one
   * already. The CLI's `--inspect-personal-setup` creates and confirms a
   * preview from the session-start inputs before the host exists, and the consent page must show that
   * confirmation rather than a second, unconsented capture — so the domain the
   * flag used is the domain the handlers get. Omitted, the definition creates
   * a domain holding its own startup inputs but no current preview, which is
   * what a session with no such flag has (FR-013).
   */
  readonly consent?: GlobalConsentDomain;
}

/**
 * Starts the loopback devframe dev server for the inspector definition.
 * devframe owns port selection — `--port` reaches it as the preference it
 * resolves, never as the bound port — the loopback `localhost` bind, and static
 * serving; the product owns startup browser opening through its startup
 * opener (FR-001, research.md § 3), so devframe's bundled opener stays
 * disabled and only the product's opener runs. The caller (the CLI) awaits
 * the handle for graceful shutdown. An ownerless startup throw/rejection
 * propagates to the process top level ordinarily (contracts/http-api.md
 * § Common results and errors).
 */
export async function startInspectorHost(
  options: StartInspectorHostOptions,
): Promise<Awaited<ReturnType<typeof createDevServer>>> {
  const serverOptions: CreateDevServerOptions = {
    app: createHostApp(),
    // Always explicit, never inherited: the product's helper below is the
    // one opener, so devframe's bundled copy must not spawn a second one.
    openBrowser: false,
    onReady: async (info) => {
      // The caller's onReady prints the launch line first, so the manual
      // fallback URL is always observable before any opener runs (FR-001,
      // contracts/http-api.md § Host requirements #4).
      await options.onReady?.(info);
      if (options.openBrowser === true) {
        try {
          await openStartupBrowser(
            `${info.origin}/`,
            options.openerShouldProceed,
            options.openerAbortSignal,
          );
        } catch {
          // Reached when the opener's `open` fallback cannot spawn the OS
          // helper — e.g. a Linux host whose PATH lacks xdg-open and whose
          // vendored fallback is not executable. Opening is best-effort by
          // contract (FR-001): the already printed launch line is the
          // fallback, and the contracted terminal output carries no opener
          // outcome report (contracts/http-api.md § Host requirements #5).
        }
      }
    },
  };
  return createDevServer(
    createInspectorDevframe(options.context, options.preferredPort, options.consent),
    serverOptions,
  );
}

/**
 * The H3 app devframe mounts onto, carrying the route families devframe's
 * own SPA fallback cannot serve: a detail URL is
 * `/<kind>/detail/<source>/<source-relative path>` and so ends with the
 * file's own last segment — `/skills/detail/repository/<path>` with
 * `SKILL.md`, `/instructions/detail/…` with `AGENTS.md`, `/mcp/detail/…`
 * with `config.toml`, `/hooks/detail/…` with `hooks.json`,
 * `/rules/detail/…` with `style.md`, `/prompts-and-commands/detail/…` with
 * `deploy.md`, `/output-styles/detail/…` with `diagrams.md`,
 * `/permissions/detail/…` with `default.rules`, `/agents/detail/…` with
 * `reviewer.toml`, `/settings-and-configuration/detail/…` with
 * `config.toml`, and each kind's `/<kind>/compare/<family>` beside them —
 * and devframe's static handler deliberately skips the `index.html` fallback
 * for a miss that looks like a file (it has an extension). This middleware
 * only rewrites such a request to the root and falls through, so devframe's
 * later-mounted static handler serves the packaged shell itself and every
 * detail-family GET boots the same shell as the other client routes
 * (contracts/http-api.md § Required contract tests, item 5) —
 * without this module touching the filesystem, which QR-003 reserves to the
 * inspection module. No packaged asset lives under either family, so nothing
 * real is shadowed, and other methods fall through unrewritten, keeping
 * devframe's own 405 semantics.
 *
 * Percent-encoding the path into the URL is not an alternative: devframe's
 * resolver runs `decodeURIComponent` before its extension test (verified
 * against devframe 0.7.5), so an encoded `/` or `.` is already decoded when
 * judged and the request still misses the fallback. Only double-encoding
 * slips through, which would make the URL unreadable and bind the client to
 * devframe decoding exactly once. This rewrite — and the direct `h3`
 * dependency it needs — leaves when devframe itself can be told to serve
 * extension-ful client-route misses, e.g. by passing `ServeStaticOptions`
 * through `createDevServer`.
 */
function createHostApp(): H3 {
  const app = new H3();
  const rewriteToShell = defineHandler((event) => {
    const method = event.req.method;
    if (method === 'GET' || method === 'HEAD') {
      event.url.pathname = '/';
    }
    return undefined;
  });
  // One route family per kind with a client route: the list is closed against
  // the pages this shell serves, because a rewrite for a route no page serves
  // would turn a real 404 into a silent shell boot.
  app.use('/skills/**', rewriteToShell);
  app.use('/instructions/**', rewriteToShell);
  app.use('/mcp/**', rewriteToShell);
  app.use('/hooks/**', rewriteToShell);
  app.use('/rules/**', rewriteToShell);
  app.use('/prompts-and-commands/**', rewriteToShell);
  app.use('/permissions/**', rewriteToShell);
  app.use('/agents/**', rewriteToShell);
  app.use('/plugins/**', rewriteToShell);
  app.use('/output-styles/**', rewriteToShell);
  app.use('/settings-and-configuration/**', rewriteToShell);
  return app;
}
