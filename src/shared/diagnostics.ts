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
  | 'recognition-parse-failed';

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
 * requires the coherent sourceId/sourceRelativePath pair, 'source' carries
 * only sourceId. The {@link DiagnosticRecord} constructor enforces the shapes.
 */
export type DiagnosticScope =
  /** Attached to one coherent source/path pair. */
  | 'file'
  /** Attached to one Source and no path. */
  | 'source';

/**
 * `lifecycle` diagnostics live outside a committed generation and are routed
 * to exactly one lifecycle owner (the Repository Source, a Global tool, or a
 * published Source). `candidate-file` diagnostics are generation-owned scan
 * outcomes: a published file's failed outcome — an admitted candidate's, or a
 * census-listed companion's failed read; a companion is never a candidate but
 * is read the same way.
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
   * (a separate client message catalog would be a second map over the same
   * closed union).
   */
  readonly message: string;
}

/**
 * The closed registry from data-model.md § Diagnostic, keyed by code: the
 * `Record` type makes an unknown or duplicate code unrepresentable and each
 * entry decides the required attachment shape. Ordinary traversal produces
 * only file-confined outcomes (FR-024/FR-028) and the source-scoped
 * unreadable-root failure (FR-002); an unexpected failure surfaces as an
 * ordinary error, never as a Diagnostic.
 * Symbolic links are followed transparently, so a broken link surfaces as
 * `file-unreadable` rather than a link-specific code.
 */
export const DIAGNOSTIC_REGISTRY: Readonly<Record<DiagnosticCode, DiagnosticRegistryEntry>> = {
  /**
   * A published Source root is unreadable. An unpublished Global tool has
   * no Source to attach to; the shape its equivalent record takes arrives
   * with the Global tasks that construct it (data-model.md).
   */
  'root-unreadable': {
    ownerKind: 'lifecycle',
    scope: 'source',
    severity: 'error',
    message:
      'The selected root does not exist or cannot be read as a directory. Check the path and run the inspector again from a readable directory.',
  },
  /** One published file disappeared or could not be read; {@link DiagnosticOwnerKind} says which files those are. */
  'file-unreadable': {
    ownerKind: 'candidate-file',
    scope: 'file',
    severity: 'error',
    message:
      'This file could not be read. It may have been removed or its permissions may deny reading; other files were unaffected. Check that the file exists and is readable, then rescan.',
  },
  /**
   * One admitted candidate contains NUL bytes and therefore has no source
   * text. Only a candidate: a rule admitted it as a text customization, so
   * binary content is a finding about it, where a census-listed companion's
   * binary bytes are the ordinary fact of an asset and carry no Diagnostic.
   */
  'file-content-binary': {
    ownerKind: 'candidate-file',
    scope: 'file',
    severity: 'warning',
    message:
      'This file contains NUL bytes, so it is recorded without source text and nothing was parsed from it. Use a binary-capable viewer if you need to inspect its contents.',
  },
  /**
   * One (file, kind) extraction failed while the authored source remains
   * available — one record however many tools recognize the kind, because
   * the parse ran once. Extraction is all-or-nothing (FR-028), so the
   * message names the whole of what is missing rather than one field of it:
   * nothing the parser would have read out — the declared name and
   * description, the declarations, and the instructions the block was
   * removed from — reaches the screen, and the detail surface omits both of
   * its sections. Count-independent wording, because the one sentence covers
   * every recognizing tool's definition.
   */
  'recognition-parse-failed': {
    ownerKind: 'candidate-file',
    scope: 'file',
    severity: 'warning',
    message:
      'This file could not be parsed, so none of its declarations or instructions could be read out of it. The complete source text remains available to read; a rescan reports the current state of the file.',
  },
};

/**
 * Closed grammar naming the lifecycle owner of an out-of-generation
 * diagnostic (data-model.md § Diagnostic):
 *  - 'repository'              the Repository Source's root failure, routed
 *                              through `repositoryFailureDiagnosticId`
 *  - `global:<tool>`           an admitted-but-unpublished Global tool's fatal
 *                              initial scan, which has that tool's preallocated
 *                              Source ID to be source-scoped by. A tool whose
 *                              root was never admitted has no Source at all, so
 *                              its failure is its control's `failureCode` and
 *                              never a Diagnostic (data-model.md
 *                              § GlobalToolControl)
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
export class DiagnosticRecord {
  /** Opaque per-instance identity. */
  public readonly diagnosticId: string;

  /** The registry code this record instantiates. */
  public readonly code: DiagnosticCode;

  /**
   * Owning Source. Both scope shapes require it, and the constructor throws
   * without it, so the field is never null.
   */
  public readonly sourceId: string;

  /**
   * The affected file's Source-relative Path — the file's identity within its
   * Source (FR-030); set exactly for file scope.
   */
  public readonly sourceRelativePath: string | null;

  /** Internal lifecycle instance key; never serialized. */
  public readonly lifecycleOwnerKey: LifecycleOwnerKey | null;

  /**
   * Instantiates one registry code, enforcing the location shape the code's
   * scope requires and the lifecycle-owner rule its owner kind requires
   * (data-model.md § Diagnostic). The guards are what keep a record from
   * claiming a scope its fields cannot support — a file diagnostic with no
   * file, or a lifecycle record claiming another Source's owner.
   */
  public constructor(input: DiagnosticInput) {
    const registryEntry = DIAGNOSTIC_REGISTRY[input.code];
    const sourceId = input.sourceId ?? null;
    const sourceRelativePath = input.sourceRelativePath ?? null;
    // Both scope shapes carry the owning Source, so the guard is scope-free
    // and is what proves the non-null field type below.
    if (sourceId === null) {
      throw new TypeError('a diagnostic requires its owning sourceId');
    }
    switch (registryEntry.scope) {
      case 'file':
        if (sourceRelativePath === null) {
          throw new TypeError('a file-scoped diagnostic requires its sourceRelativePath');
        }
        break;
      case 'source':
        if (sourceRelativePath !== null) {
          throw new TypeError('a source-scoped diagnostic requires only sourceId');
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
      // A `published-source:<id>` owner names the Source the record is attached
      // to, so the two must be the same Source. Left unchecked, a record could
      // claim one Source's lifecycle while pointing at another
      // (data-model.md § Diagnostic lifecycle owners).
      const published = /^published-source:(.+)$/u.exec(input.lifecycleOwnerKey);
      if (published !== null && published[1] !== sourceId) {
        throw new TypeError(
          "a published-source lifecycle owner must name the diagnostic's own sourceId",
        );
      }
    }
    this.diagnosticId = createOpaqueId();
    this.code = input.code;
    this.sourceId = sourceId;
    this.sourceRelativePath = sourceRelativePath;
    this.lifecycleOwnerKey = input.lifecycleOwnerKey;
  }

  /**
   * The public wire projection: every field but the internal lifecycle owner
   * key, which never serializes (data-model.md § Diagnostic).
   */
  public serialize(): SerializedDiagnostic {
    return {
      diagnosticId: this.diagnosticId,
      code: this.code,
      sourceId: this.sourceId,
      sourceRelativePath: this.sourceRelativePath,
    };
  }
}

/**
 * Arguments to the {@link DiagnosticRecord} constructor; which fields are required is
 * decided by the code's registry row.
 */
export interface DiagnosticInput {
  /** The registry code to instantiate; see {@link DiagnosticCode}. */
  readonly code: DiagnosticCode;
  /** Required valid owner for lifecycle codes; must be null for candidates. */
  readonly lifecycleOwnerKey: LifecycleOwnerKey | null;
  /** Owning Source; required by both scopes' shapes. */
  readonly sourceId?: string | null;
  /** The affected file's Source-relative Path; required exactly for file scope. */
  readonly sourceRelativePath?: string | null;
}

/**
 * Public projection of {@link DiagnosticRecord} without the internal
 * lifecycle owner key. Clients derive scope, severity, and the actionable
 * message text from `code` through {@link DIAGNOSTIC_REGISTRY}; none of them
 * is sent per instance. A wire DTO stays an interface: strict JSON carries no
 * prototypes, so a serialized shape must be a plain object.
 */
export interface SerializedDiagnostic {
  /** Opaque per-instance identity. */
  readonly diagnosticId: string;
  /** The registry code; every fixed attribute is derived from it. */
  readonly code: DiagnosticCode;
  /** Owning Source; both scope shapes require it, so it is never null. */
  readonly sourceId: string;
  /** The affected file's Source-relative Path; set exactly for file scope. */
  readonly sourceRelativePath: string | null;
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

/** Within one owner rank, wider scopes emit first: source, then per-file. */
const SCOPE_RANK: Readonly<Record<DiagnosticScope, number>> = {
  source: 0,
  file: 1,
};

/**
 * Emits candidates in the deterministic order: lifecycle-owner semantic
 * order, scope, Source-relative Path, code, then emitter-occurrence order.
 * Opaque IDs never supply the sort order. There is deliberately no
 * dedupe pass: every emitter creates each observation exactly once —
 * legitimately repeated records exist, because an extraction failure is one
 * record per `(file, kind)` (FR-028) and one file's two kinds can each fail,
 * sharing every public field — and a double emission would be an ordinary
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
