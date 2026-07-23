// devframe application definition and host startup for the local session
// transport (contracts/http-api.md). The host binds a devframe-selected
// local port on the loopback interface only — via the fixed host name
// `localhost` (spec.md Clarifications § Session 2026-07-23) — and runs
// unauthenticated (`auth: false`): loopback binding is the complete
// host-side protection (QR-003, Constitution v3.0.0). Threat-model boundary and residual limitation:
// other local processes and, via DNS rebinding, a malicious web page can
// reach the session while the inspector runs, and served content may
// include the user's own secrets — so the host is never exposed beyond the
// initiating machine and no configuration can bind another interface.
// devframe owns static SPA serving from `cli.distDir`, port selection, and
// best-effort browser opening; the product adds no router, asset manifest,
// or per-asset re-verification (Constitution Principle I). An unexpected
// thrown/rejected RPC handler error is serialized as-is by devframe/birpc
// and the client shows the real error (contracts/http-api.md § Common
// results and errors); deterministic conflicts are returned as their fixed
// closed rejection variants, which are declared functional outcomes, not
// sanitization.
import { fileURLToPath } from 'node:url';
import { createDevServer, type CreateDevServerOptions } from 'devframe/adapters/dev';
// The package manifest is the single source of these values. The bundler
// tree-shakes the JSON module down to the referenced fields, so the
// packaged CLI never reads package.json at runtime.
import packageJson from '../../../package.json' with { type: 'json' };
import type { DevframeDefinition } from 'devframe';
import { createOpaqueId } from '../../shared/entities';
import { REPOSITORY_TRAVERSAL_PLANS } from '../inspection/rules/registry';
import { runTraversalScan } from '../inspection/traversal';
import { assembleScanPublication } from '../inspection/scan';
import type {
  DeterministicRejection,
  LivenessProjection,
  ScanAdmission,
  SessionSnapshot,
} from '../../shared/api-types';
import type { InspectionSessionState, SessionCoordinator } from '../session/session';

/** The one session and its coordinator the RPC functions operate on. */
export interface InspectorHostContext {
  /** The process's single inspection session. */
  readonly session: InspectionSessionState;
  /** The serialized scan coordinator owning admission and commits. */
  readonly coordinator: SessionCoordinator;
}

/**
 * The inspection-data success envelope (contracts/http-api.md § Common
 * results and errors): every normal inspection-data success carries the
 * epoch and both sequence generations beside its payload.
 */
export interface InspectionDataResult<Data> {
  /** Current Global content epoch at final publication. */
  readonly globalContentEpoch: number;
  /** The Repository sequence's committed generation. */
  readonly repositoryGeneration: number;
  /** The Global sequence's committed generation; null while disabled. */
  readonly globalGeneration: number | null;
  /** The complete immutable payload bound under the coordinator lock. */
  readonly data: Data;
}

/**
 * A command success that returns no inspection graph
 * (contracts/http-api.md): `{ globalContentEpoch, data }` without the
 * result-level generation fields.
 */
export interface CommandResult<Data> {
  /** Current Global content epoch at final publication. */
  readonly globalContentEpoch: number;
  /** The command's documented result payload. */
  readonly data: Data;
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
 * top level for the ownerless automatic startup scan. Exported for the CLI,
 * which runs the automatic first scan through the same job.
 */
export async function executeRepositoryScan(
  context: InspectorHostContext,
  scanRequestId: string,
  sourceId: string,
): Promise<void> {
  const result = await runTraversalScan({
    root: context.session.internal.selectedRepositoryRoot,
    plans: REPOSITORY_TRAVERSAL_PLANS,
  });
  const publication = assembleScanPublication({
    sourceId,
    rootFailureOwner: 'repository',
    result,
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(scanRequestId, {
      files: publication.files,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
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
 * function catalog). Only the catalog functions exist; there is no masking,
 * redaction, environment-resolution, or MCP route.
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
      // host-side protection (QR-003, Constitution v3.0.0).
      auth: false,
    },
    setup(ctx) {
      ctx.rpc.register({
        name: 'agent-customization-inspector:get-session',
        type: 'query',
        jsonSerializable: true,
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
        name: 'agent-customization-inspector:get-liveness',
        type: 'query',
        jsonSerializable: true,
        // Exactly the control-only projection from one current snapshot —
        // no generation and no inspection graph (contracts/http-api.md
        // § get-liveness).
        handler: (): LivenessProjection => {
          const snapshot = context.session.snapshot();
          return {
            sessionId: snapshot.sessionId,
            globalContentEpoch: snapshot.globalContentEpoch,
            globalDisableInProgress: snapshot.globalDisableInProgress,
          };
        },
      });
      ctx.rpc.register({
        name: 'agent-customization-inspector:rescan-repository',
        type: 'action',
        jsonSerializable: true,
        handler: async (): Promise<
          CommandResult<ScanAdmission> | DeterministicRejection
        > => {
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
          void executeRepositoryScan(context, admission.scanRequestId, repository.sourceId).catch(
            (error: unknown) => {
              context.coordinator.failScan(admission.scanRequestId, {
                kind: 'error',
                message: error instanceof Error ? error.message : String(error),
              });
            },
          );
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
   * Automatic browser opening (FR-001): devframe owns the fixed OS helper
   * and best-effort semantics; `false` maps from `--no-open`.
   */
  readonly openBrowser?: boolean;
  /** Called once the loopback server is bound; the CLI prints the URL here. */
  readonly onReady?: CreateDevServerOptions['onReady'];
}

/**
 * Starts the loopback devframe dev server for the inspector definition.
 * devframe owns port selection, the loopback `localhost` bind, static serving, and
 * browser opening; the caller (the CLI) awaits the handle for graceful
 * shutdown. An ownerless startup throw/rejection propagates to the process
 * top level ordinarily (contracts/http-api.md § Common results and errors).
 */
export async function startInspectorHost(
  options: StartInspectorHostOptions,
): Promise<Awaited<ReturnType<typeof createDevServer>>> {
  const serverOptions: CreateDevServerOptions = {};
  if (options.openBrowser !== undefined) {
    serverOptions.openBrowser = options.openBrowser;
  }
  if (options.onReady !== undefined) {
    serverOptions.onReady = options.onReady;
  }
  return createDevServer(createInspectorDevframe(options.context), serverOptions);
}
