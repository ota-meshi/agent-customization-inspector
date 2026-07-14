import { SourceRoot } from './tool-homes.js';

export interface GlobalSourceRootOptions {
  readonly locatorId: string;
  readonly label: string;
  readonly rootPath: string;
}

/** Trusted resolver helper. Browser and inspected-repository data must never reach it. */
export function createGlobalSourceRoot(options: GlobalSourceRootOptions): SourceRoot {
  return new SourceRoot({
    layer: 'global',
    locatorId: options.locatorId,
    label: options.label,
    // Global overrides are security-sensitive. Validate the caller-provided value
    // as-is instead of silently turning a relative value into an absolute path.
    rootPath: options.rootPath,
  });
}
