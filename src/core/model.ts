import type { Diagnostic } from './diagnostics.js';

export const ARTIFACT_SCHEMA_VERSION = 1 as const;

export type SourceLayer = 'repository' | 'global';

/** Public source identity. Filesystem roots and environment values never belong here. */
export interface SourceDescriptor {
  readonly layer: SourceLayer;
  readonly id: string;
  readonly label: string;
  readonly virtualBase: string;
}

export type ArtifactSource = SourceDescriptor;

export interface ArtifactPath {
  readonly relative: string;
  readonly basename: string;
  readonly virtual: string;
}

export interface ArtifactFormat {
  readonly id: string;
  readonly mediaType: string;
  readonly encoding: 'utf-8';
}

export type ArtifactSupport = 'supported' | 'partial' | 'raw-only';

export interface ToolDescriptor {
  readonly id: string;
  readonly label: string;
}

export interface ArtifactInterpretationSummary {
  readonly tool: ToolDescriptor;
  readonly kinds: string[];
  readonly support: ArtifactSupport;
}

export type DiagnosticSeverity = 'info' | 'warning' | 'error';

export type DiagnosticCounts = Record<DiagnosticSeverity, number>;

export interface ArtifactSummary {
  readonly schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  readonly source: SourceDescriptor;
  readonly id: string;
  readonly path: ArtifactPath;
  readonly format: ArtifactFormat;
  readonly interpretationSummaries: ArtifactInterpretationSummary[];
  readonly diagnosticCounts: DiagnosticCounts;
  readonly diagnosticCodes: string[];
  readonly redactionApplied: boolean;
  readonly securityFlags: string[];
}

export type JsonPrimitive = null | boolean | number | string;

export type JsonValue = JsonPrimitive | { readonly [key: string]: JsonValue } | JsonValue[];

export interface InterpretationScope {
  readonly origin: 'repository' | 'directory' | 'user' | 'managed' | 'unknown';
  readonly base?: string;
  readonly activation: 'startup' | 'conditional' | 'on-demand' | 'unknown';
  readonly appliesTo?: string[];
  readonly precedenceHint?: string;
  readonly resolutionConfidence: 'documented' | 'partial' | 'unknown';
}

export interface InterpretationDocumentation {
  readonly status: 'documented' | 'assumption' | 'undocumented' | 'unsupported' | 'deferred';
  readonly reviewedAt: string;
  readonly sources: string[];
}

export interface ArtifactInterpretation {
  readonly adapterId: string;
  readonly tool: ToolDescriptor;
  readonly kind: string;
  readonly facets: string[];
  readonly variant: string;
  readonly support: ArtifactSupport;
  readonly scope: InterpretationScope;
  readonly metadata: Record<string, JsonValue>;
  readonly metadataStatus: 'complete' | 'partial' | 'unavailable';
  readonly documentation: InterpretationDocumentation;
  readonly diagnostics: Diagnostic[];
}

/** Aggregate redaction information intentionally contains no original value or path. */
export interface Redaction {
  readonly kind: string;
  readonly count: number;
}

export interface ArtifactContent {
  readonly displayText: string;
  readonly byteLength: number;
  readonly newline: 'lf' | 'crlf' | 'mixed' | 'none';
  readonly redactions: Redaction[];
}

export interface ArtifactDocument extends ArtifactSummary {
  readonly content: ArtifactContent;
  readonly interpretations: ArtifactInterpretation[];
  readonly diagnostics: Diagnostic[];
}

export interface CatalogSnapshot {
  readonly id: string;
  readonly revision: number;
  readonly source: SourceLayer;
  readonly artifacts: ArtifactSummary[];
  readonly diagnostics: Diagnostic[];
}

export type GlobalSnapshotState =
  | { readonly enabled: false; readonly status: 'disabled' }
  | { readonly enabled: true; readonly status: 'scanning' }
  | {
      readonly enabled: true;
      readonly status: 'ready';
      readonly catalog: CatalogSnapshot;
    }
  | {
      readonly enabled: true;
      readonly status: 'partial';
      readonly catalog: CatalogSnapshot;
    }
  | {
      readonly enabled: true;
      readonly status: 'error';
      readonly diagnostics: readonly Diagnostic[];
    };

export interface SessionSnapshot {
  readonly schemaVersion: typeof ARTIFACT_SCHEMA_VERSION;
  readonly revision: number;
  readonly repository: CatalogSnapshot;
  readonly global: GlobalSnapshotState;
}
