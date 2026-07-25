// Closed Diagnostic registry and deterministic aggregation for the
// trusted-workspace inspection model (spec.md FR-024/FR-028,
// data-model.md § Diagnostic). The registry fixes everything about a code
// except its per-instance attachment values, so a record and its DTO carry
// only `code` plus those values: scope, severity, and the actionable message
// text are all derived from `code` through this one registry.
// `lifecycleOwnerKey` is internal routing state and never serializes.
import { createOpaqueId, type SupportedTool } from './entities';

/**
 * The closed set of diagnostic codes (data-model.md § Diagnostic). An
 * unknown code is unrepresentable: adding one means extending this union
 * and its registry row together.
 */
export type DiagnosticCode =
  /** The selected Source root does not exist or cannot be read (FR-002). */
  | 'root-unreadable'
  /** An admitted candidate file disappeared or could not be read (FR-024). */
  | 'file-unreadable'
  /** The file contains a NUL byte and is diagnostic-only (FR-025). */
  | 'file-content-binary'
  /** A parser/extractor failed while complete source text remains available (FR-028). */
  | 'recognition-parse-failed'
  /** Distinct raw paths normalize to one ambiguous NFC display path. */
  | 'path-normalization-collision';

/**
 * How the UI ranks a diagnostic without asserting vendor validity.
 */
export type DiagnosticSeverity =
  /** Advisory information that does not degrade the result. */
  | 'info'
  /** A degraded but still usable outcome, such as binary content. */
  | 'warning'
  /** An item or Source could not be read or represented. */
  | 'error';

/**
 * Where a diagnostic attaches (spec.md § Key Entities · Diagnostic): 'file'
 * requires the coherent sourceId/fileId/path tuple, 'source' carries only
 * sourceId, 'session' carries no location field at all. createDiagnostic
 * enforces the shapes.
 */
export type DiagnosticScope =
  /** Attached to one coherent source/file/path tuple. */
  | 'file'
  /** Attached to one Source and no file/path. */
  | 'source'
  /** Attached to the session with no location fields. */
  | 'session';

/**
 * `lifecycle` diagnostics live outside a committed generation and are routed
 * to exactly one lifecycle owner (the Repository Source, a Global tool, or a
 * published Source). `candidate-file` diagnostics are generation-owned scan
 * outcomes: per-file candidate outcomes plus the generation-wide pathless
 * normalization-collision rejection, which belongs to the generation whose
 * traversal observed the colliding raw entries.
 */
export type DiagnosticOwnerKind =
  /** Retained outside a generation and routed through one lifecycle owner. */
  | 'lifecycle'
  /** Owned by the generation whose candidate traversal emitted it. */
  | 'candidate-file';

/**
 * What the closed registry fixes about one code besides the code itself:
 * everything except the per-instance attachment values.
 */
export interface DiagnosticRegistryEntry {
  /** Routing: lifecycle-owned or generation-owned; see {@link DiagnosticOwnerKind}. */
  readonly ownerKind: DiagnosticOwnerKind;
  /** Required attachment shape; see {@link DiagnosticScope}. */
  readonly scope: DiagnosticScope;
  /** Fixed UI ranking for this code; see {@link DiagnosticSeverity}. */
  readonly severity: DiagnosticSeverity;
  /**
   * The actionable sentence shown for this code, stating what happened and
   * what the user can do about it (FR-028). The wire DTO carries only the
   * code, so the text is derived here rather than sent per instance: it is
   * fixed by the code exactly like `scope` and `severity`, and keeping it in
   * this one `Record` means a new code cannot compile without its text
   * (amended 2026-07-24 — it previously lived in a separate client message
   * catalog, which was a second map over the same closed union).
   */
  readonly message: string;
}

/**
 * The closed registry from data-model.md § Diagnostic, keyed by code: the
 * `Record` type makes an unknown or duplicate code unrepresentable and each
 * entry decides the required attachment shape. Ordinary traversal produces
 * only file-confined outcomes (FR-024/FR-028), the source-scoped
 * unreadable-root failure (FR-002), and the pathless session-scoped
 * normalization-collision rejection; an unexpected failure surfaces as an
 * ordinary error, never as a Diagnostic.
 * Symbolic links are followed transparently, so a broken link surfaces as
 * `file-unreadable` rather than a link-specific code.
 */
export const DIAGNOSTIC_REGISTRY: Readonly<Record<DiagnosticCode, DiagnosticRegistryEntry>> =
  {
    /**
     * A published Source root is unreadable. An unpublished Global tool has
     * no Source to attach to, so later Global tasks construct its equivalent
     * as a pathless session-scoped lifecycle record (data-model.md).
     */
    'root-unreadable': {
      ownerKind: 'lifecycle',
      scope: 'source',
      severity: 'error',
      message:
        'The selected root does not exist or cannot be read as a directory. Check the path and run the inspector again from a readable directory.',
    },
    /** One admitted candidate file disappeared or could not be read. */
    'file-unreadable': {
      ownerKind: 'candidate-file',
      scope: 'file',
      severity: 'error',
      message:
        'This file could not be read. It may have been removed or its permissions may deny reading; other files were unaffected. Check that the file exists and is readable, then rescan.',
    },
    /** One candidate contains NUL bytes and therefore has no source text. */
    'file-content-binary': {
      ownerKind: 'candidate-file',
      scope: 'file',
      severity: 'warning',
      message:
        'This file contains NUL bytes, so it is recorded without source text and nothing was parsed from it. Use a binary-capable viewer if you need to inspect its contents.',
    },
    /** One recognition parser failed while the authored source remains available. */
    'recognition-parse-failed': {
      ownerKind: 'candidate-file',
      scope: 'file',
      severity: 'warning',
      message:
        'One recognition could not be parsed, so its derived metadata and relationships are omitted. Review the complete source text that remains available, then rescan after correcting the file if you need the derived metadata.',
    },
    /**
     * A colliding path group has no unambiguous public location, so this code
     * is session-scoped and rejects every location field (T028).
     */
    'path-normalization-collision': {
      ownerKind: 'candidate-file',
      scope: 'session',
      severity: 'error',
      message:
        'Two entries normalize to the same display path, so they could not be listed unambiguously and were rejected. Rename one entry so the normalized paths differ, then rescan.',
    },
  };

/**
 * Closed grammar naming the lifecycle owner of an out-of-generation
 * diagnostic (data-model.md § Diagnostic):
 *  - 'repository'              the Repository Source's root failure, routed
 *                              through `repositoryFailureDiagnosticId`
 *  - `global:<tool>`           an unpublished Global tool's root failure,
 *                              routed through `GlobalControlView.toolFailures`
 *  - `published-source:<id>`   a published Source's fatal explicit rescan,
 *                              routed through its `StaleSourceFailure`
 * The session keeps at most one current actionable failure per owner.
 * Generation-owned candidates instead belong to their generation and carry
 * no owner. The union makes an unknown owner unrepresentable, and the key
 * never serializes — it is routing state, not API data.
 */
export type LifecycleOwnerKey =
  /** The automatic Repository Source root-failure owner. */
  | 'repository'
  /** One unpublished Global tool's root-failure owner. */
  | `global:${SupportedTool}`
  /** One published Source's explicit-rescan failure owner. */
  | `published-source:${string}`;

/**
 * One constructed diagnostic instance: `code`, its per-instance attachment
 * values, and the internal lifecycle owner key. Scope, severity, ownership,
 * and message text are registry-derived from `code`, never stored.
 */
export interface DiagnosticRecord {
  /** Opaque per-instance identity. */
  readonly diagnosticId: string;
  /** The registry code this record instantiates. */
  readonly code: DiagnosticCode;
  /** Owning Source; required for file/source scope, null for session scope. */
  readonly sourceId: string | null;
  /** Affected file; set exactly for file scope. */
  readonly fileId: string | null;
  /** The file's Source-relative Path; set exactly for file scope. */
  readonly sourceRelativePath: string | null;
  /** Internal lifecycle instance key; never serialized. */
  readonly lifecycleOwnerKey: LifecycleOwnerKey | null;
}

/**
 * Arguments to {@link createDiagnostic}; which fields are required is
 * decided by the code's registry row.
 */
export interface DiagnosticInput {
  /** The registry code to instantiate; see {@link DiagnosticCode}. */
  readonly code: DiagnosticCode;
  /** Required valid owner for lifecycle codes; must be null for candidates. */
  readonly lifecycleOwnerKey: LifecycleOwnerKey | null;
  /** Owning Source; required for file/source scope, forbidden for session. */
  readonly sourceId?: string | null;
  /** Affected file; required exactly for file scope. */
  readonly fileId?: string | null;
  /** The file's Source-relative Path; required exactly for file scope. */
  readonly sourceRelativePath?: string | null;
}

/**
 * Constructs one validated Diagnostic. The three legal attachment shapes are
 * exactly: `file` with the coherent sourceId/fileId/path tuple, `source`
 * with only sourceId, and `session` with all three location fields null —
 * any other combination could fabricate a Source or path the API never
 * admitted.
 */
export function createDiagnostic(input: DiagnosticInput): DiagnosticRecord {
  const registryEntry = DIAGNOSTIC_REGISTRY[input.code];
  const sourceId = input.sourceId ?? null;
  const fileId = input.fileId ?? null;
  const sourceRelativePath = input.sourceRelativePath ?? null;
  switch (registryEntry.scope) {
    case 'file':
      if (sourceId === null || fileId === null || sourceRelativePath === null) {
        throw new TypeError('a file-scoped diagnostic requires sourceId, fileId, and sourceRelativePath');
      }
      break;
    case 'source':
      if (sourceId === null || fileId !== null || sourceRelativePath !== null) {
        throw new TypeError('a source-scoped diagnostic requires only sourceId');
      }
      break;
    case 'session':
      if (sourceId !== null || fileId !== null || sourceRelativePath !== null) {
        throw new TypeError('a session-scoped diagnostic forbids location fields');
      }
      break;
  }
  if (registryEntry.ownerKind === 'candidate-file') {
    if (input.lifecycleOwnerKey !== null) {
      throw new TypeError('a generation-owned candidate diagnostic forbids a lifecycle owner');
    }
  } else {
    if (input.lifecycleOwnerKey === null) {
      throw new TypeError('an out-of-generation lifecycle diagnostic requires an owner key');
    }
  }
  return {
    diagnosticId: createOpaqueId(),
    code: input.code,
    sourceId,
    fileId,
    sourceRelativePath,
    lifecycleOwnerKey: input.lifecycleOwnerKey,
  };
}

/**
 * Public projection of {@link DiagnosticRecord} without the internal
 * lifecycle owner key. Clients derive scope, severity, and the actionable
 * message text from `code` through {@link DIAGNOSTIC_REGISTRY}; none of them
 * is sent per instance.
 */
export interface SerializedDiagnostic {
  /** Opaque per-instance identity. */
  readonly diagnosticId: string;
  /** The registry code; every fixed attribute is derived from it. */
  readonly code: DiagnosticCode;
  /** Owning Source; null for session scope. */
  readonly sourceId: string | null;
  /** Affected file; set exactly for file scope. */
  readonly fileId: string | null;
  /** The file's Source-relative Path; set exactly for file scope. */
  readonly sourceRelativePath: string | null;
}

/** Serializes the public DTO, dropping the internal lifecycle owner key. */
export function serializeDiagnostic(record: DiagnosticRecord): SerializedDiagnostic {
  return {
    diagnosticId: record.diagnosticId,
    code: record.code,
    sourceId: record.sourceId,
    fileId: record.fileId,
    sourceRelativePath: record.sourceRelativePath,
  };
}

// Emission order is semantic — Repository, fixed Global tool order, then
// published Sources, then generation-owned candidates — because an opaque
// Source ID must never supply the sort order (IDs are regenerated every
// generation and would make output nondeterministic).
function lifecycleOwnerRank(key: LifecycleOwnerKey | null): number {
  if (key === 'repository') {
    return 0;
  }
  if (key === 'global:copilot') {
    return 1;
  }
  if (key === 'global:claude') {
    return 2;
  }
  if (key === 'global:codex') {
    return 3;
  }
  if (key !== null && key.startsWith('published-source:')) {
    return 4;
  }
  // Generation-owned candidates sort after lifecycle owners.
  return 5;
}

/** Within one owner rank, wider scopes emit first: session, source, then per-file. */
const SCOPE_RANK: Readonly<Record<DiagnosticScope, number>> = {
  session: 0,
  source: 1,
  file: 2,
};

/**
 * Emits candidates in the deterministic order: lifecycle-owner semantic
 * order, scope, Source-relative Path, code, then emitter-occurrence order.
 * Opaque IDs never supply the sort order. There is deliberately no
 * dedupe pass: every emitter creates each observation exactly once —
 * legitimately repeated records exist (one per failed recognition, one per
 * rejected collision group) and a double emission would be an ordinary
 * implementation bug owned by tests and review, not a runtime filter.
 */
export function sortDiagnostics(candidates: readonly DiagnosticRecord[]): DiagnosticRecord[] {
  const entries = candidates.map((record, occurrence) => ({ record, occurrence }));
  entries.sort((left, right) => {
    const ownerDelta =
      lifecycleOwnerRank(left.record.lifecycleOwnerKey) -
      lifecycleOwnerRank(right.record.lifecycleOwnerKey);
    if (ownerDelta !== 0) {
      return ownerDelta;
    }
    const scopeDelta =
      SCOPE_RANK[DIAGNOSTIC_REGISTRY[left.record.code].scope] -
      SCOPE_RANK[DIAGNOSTIC_REGISTRY[right.record.code].scope];
    if (scopeDelta !== 0) {
      return scopeDelta;
    }
    const leftPath = left.record.sourceRelativePath ?? '';
    const rightPath = right.record.sourceRelativePath ?? '';
    if (leftPath !== rightPath) {
      return leftPath < rightPath ? -1 : 1;
    }
    if (left.record.code !== right.record.code) {
      return left.record.code < right.record.code ? -1 : 1;
    }
    return left.occurrence - right.occurrence;
  });
  return entries.map((item) => item.record);
}
