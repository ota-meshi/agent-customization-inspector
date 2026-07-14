export { ARTIFACT_SCHEMA_VERSION } from './core/model.js';
export type {
  ArtifactDocument,
  ArtifactFormat,
  ArtifactInterpretation,
  ArtifactInterpretationSummary,
  ArtifactPath,
  ArtifactSource,
  ArtifactSummary,
  ArtifactSupport,
  CatalogSnapshot,
  DiagnosticCounts,
  GlobalSnapshotState,
  InterpretationDocumentation,
  InterpretationScope,
  JsonPrimitive,
  JsonValue,
  SessionSnapshot,
  SourceDescriptor,
  SourceLayer,
  ToolDescriptor,
} from './core/model.js';
export type { Diagnostic, DiagnosticSeverity } from './core/diagnostics.js';
export {
  DEFAULT_SCAN_LIMITS,
  createScanLimits,
  resolveSourceScanLimits,
  validateScanLimits,
} from './core/limits.js';
export type {
  ResolvedSourceScanLimits,
  ScanLimitOverrides,
  ScanLimits,
  SourceScanLimitOverrides,
  SourceScanLimits,
} from './core/limits.js';
export { AdapterRegistry, AdapterRegistryContractError } from './core/registry.js';
export type {
  AdapterInspection,
  AdapterManifest,
  AdapterMatch,
  ArtifactAdapter,
  BoundedDirectoryCandidateSpec,
  CandidateSpec,
  DiscoveryEntry,
  ExactFileCandidateSpec,
  RegisteredCandidate,
} from './core/registry.js';
