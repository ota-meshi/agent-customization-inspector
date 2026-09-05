// For tests: this module exists primarily as the instrumentation seam the
// conformance suites replace (vi.mock) to observe production filesystem
// calls — one content read per published file, zero mutation-capable APIs
// or flags (contracts/inspection-path-allowlist.md § Common conformance
// requirements #12). Node builtins cannot be intercepted from dependency
// modules, so the inspection module routes every call through this file.
// It also fixes the closed read-only surface (FR-023): only the
// `node:fs/promises` operations re-exported below are importable here, and
// the ESLint
// inspection-io-boundary rule keeps `node:fs` imports out of every
// production module outside `src/server/inspection/`, so no
// mutation-capable filesystem API is reachable against inspected sources.
export { access, lstat, readFile, readdir, realpath, stat } from 'node:fs/promises';
export { constants as fsConstants } from 'node:fs';
