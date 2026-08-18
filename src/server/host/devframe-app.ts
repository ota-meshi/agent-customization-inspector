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
// the product owns best-effort startup browser opening through the `open`
// package (research.md § 3), adds no asset manifest or
// per-asset re-verification, and its only routes of its own are the
// `/skills/**` and `/instructions/**` shell fallbacks in `createHostApp`,
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
import open from 'open';
// The package manifest is the single source of these values. The bundler
// tree-shakes the JSON module down to the referenced fields, so the
// packaged CLI never reads package.json at runtime.
import packageJson from '../../../package.json' with { type: 'json' };
import type { DevframeDefinition } from 'devframe';
import { createOpaqueId } from '../../shared/entities';
import type { LifecycleOwnerKey } from '../../shared/diagnostics';
import { runSourceScan } from '../inspection/scan';
import type {
  CommandResult,
  DeterministicRejection,
  FileDetailDto,
  InspectionDataResult,
  ScanAdmission,
  SessionSnapshot,
} from '../../shared/api-types';
import type { InspectionSession, SessionCoordinator } from '../session/session';

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
    // A refresh during a long scan shows where the attempt is rather than the
    // zeros it was admitted with. The coordinator ignores a report for a
    // revoked or settled attempt, so a superseded scan cannot speak for the
    // Source (contracts/http-api.md § get-session `progress`).
    onProgress: (update) => {
      context.coordinator.reportProgress(scanRequestId, update);
    },
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      skillCompanionsByPath: publication.skillCompanionsByPath,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
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
export function createInspectorDevframe(context: InspectorHostContext): DevframeDefinition {
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
        // requires is the same turn that binds the payload; the disable
        // fence itself arrives with the Global tasks.
        handler: (): InspectionDataResult<SessionSnapshot> => {
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
          sourceRelativePath: string,
        ): InspectionDataResult<FileDetailDto> | DeterministicRejection => {
          const detail = context.session.fileDetail(sourceRelativePath);
          if (detail === null) {
            // The current committed generations hold no file at this path —
            // never scanned, or removed by the commit that replaced the
            // snapshot the link came from; the two are indistinguishable and
            // answered alike (contracts/http-api.md § get-file-detail).
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
        name: 'agent-customization-inspector:rescan-repository',
        type: 'action',
        handler: async (): Promise<CommandResult<ScanAdmission> | DeterministicRejection> => {
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
          // The invocation resolves with its acceptance; the accepted job's
          // terminal failure is retained as the Source's stale overlay with
          // the failed request's real error message, never re-thrown into a
          // later unrelated invocation (FR-030).
          void executeRepositoryScan(
            context,
            admission.scanRequestId,
            repository.sourceId,
            // An explicit rescan of the published Repository Source: a
            // deterministic root failure belongs to that Source's stale
            // overlay, not the automatic-scan repository owner
            // (data-model.md § Diagnostic).
            `published-source:${repository.sourceId}`,
          ).catch((error: unknown) => {
            context.coordinator.failScan(admission.scanRequestId, {
              kind: 'error',
              message: error instanceof Error ? error.message : String(error),
            });
          });
          const updated = context.session
            .snapshot()
            .sources.find((source) => source.sourceId === repository.sourceId);
          return {
            globalContentEpoch: snapshot.globalContentEpoch,
            data: { scanRequestId: admission.scanRequestId, source: updated ?? repository },
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
   * Automatic browser opening (FR-001): `true` spawns the `open` package's
   * fixed OS helper with the bound loopback origin, best-effort; `false`
   * maps from `--no-open`.
   */
  readonly openBrowser?: boolean;
  /** Called after loopback bind and before the host's `open` browser helper. */
  readonly onReady?: CreateDevServerOptions['onReady'];
}

/**
 * Starts the loopback devframe dev server for the inspector definition.
 * devframe owns port selection, the loopback `localhost` bind, and static
 * serving; the product owns startup browser opening through the `open`
 * package (FR-001, research.md § 3), so devframe's bundled opener stays
 * disabled and exactly one helper can spawn. The caller (the CLI) awaits
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
      // fallback URL is always observable before any helper runs (FR-001,
      // contracts/http-api.md § Host requirements #4).
      await options.onReady?.(info);
      if (options.openBrowser === true) {
        try {
          await open(`${info.origin}/`);
        } catch {
          // Reached when the OS helper cannot spawn — e.g. a Linux host
          // whose PATH lacks xdg-open and whose vendored fallback is not
          // executable. Opening is best-effort by contract (FR-001): the
          // already printed launch line is the fallback, and the contracted
          // terminal output carries no helper outcome report
          // (contracts/http-api.md § Host requirements #5).
        }
      }
    },
  };
  return createDevServer(createInspectorDevframe(options.context), serverOptions);
}

/**
 * The H3 app devframe mounts onto, carrying the route families devframe's
 * own SPA fallback cannot serve: a detail URL ends with the file's own
 * last segment — `/skills/<tool>/<source-relative path>` with `SKILL.md`,
 * `/instructions/<source-relative path>` with `AGENTS.md` —
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
  // One route family per kind detail: each arrives with the phase that ships
  // its detail route, because a rewrite for a route no page serves would turn
  // a real 404 into a silent shell boot.
  app.use('/skills/**', rewriteToShell);
  app.use('/instructions/**', rewriteToShell);
  return app;
}
