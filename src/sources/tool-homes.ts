import { randomUUID } from 'node:crypto';
import path from 'node:path';

import type { SourceDescriptor, SourceLayer } from '../core/model.js';

const LOCATOR_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const MAX_LOCATOR_ID_LENGTH = 128;
const MAX_SOURCE_LABEL_LENGTH = 256;

export const MAX_GLOBAL_SOURCE_ROOTS = 3;

function containsLabelControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

function containsPrivatePathLabel(label: string): boolean {
  return label.includes('/') || label.includes('\\');
}

export interface SourceRootOptions {
  readonly layer: SourceLayer;
  readonly locatorId: string;
  readonly label: string;
  readonly rootPath: string;
}

/**
 * Private filesystem authority for one independently bounded source root.
 * Absolute paths are held in private fields and disappear from JSON output.
 */
export class SourceRoot {
  readonly #rootPath: string;
  readonly #locatorId: string;
  readonly descriptor: SourceDescriptor;

  constructor(options: SourceRootOptions) {
    if (options.layer !== 'repository' && options.layer !== 'global') {
      throw new TypeError('A source root must use a supported source layer.');
    }
    if (
      typeof options.locatorId !== 'string' ||
      options.locatorId.length > MAX_LOCATOR_ID_LENGTH ||
      !LOCATOR_ID_PATTERN.test(options.locatorId)
    ) {
      throw new TypeError('A source locator id must be a lowercase kebab-case identifier.');
    }
    if (
      typeof options.label !== 'string' ||
      options.label.length === 0 ||
      options.label.length > MAX_SOURCE_LABEL_LENGTH ||
      containsLabelControl(options.label) ||
      containsPrivatePathLabel(options.label)
    ) {
      throw new TypeError(
        'A source label must be bounded, non-empty, and contain no control or path characters.',
      );
    }
    if (
      typeof options.rootPath !== 'string' ||
      options.rootPath.includes('\0') ||
      !path.isAbsolute(options.rootPath)
    ) {
      throw new TypeError('A source root must be an absolute, NUL-free path.');
    }

    this.#rootPath = path.normalize(options.rootPath);
    this.#locatorId = options.locatorId;
    this.descriptor = Object.freeze({
      layer: options.layer,
      id: randomUUID(),
      label: options.label,
      virtualBase: `${options.layer}://${options.locatorId}`,
    });
    Object.freeze(this);
  }

  /** Internal use only. Never place this value in a diagnostic or public model. */
  get rootPath(): string {
    return this.#rootPath;
  }

  /** Trusted built-in locator identity, never an environment value or filesystem path. */
  get locatorId(): string {
    return this.#locatorId;
  }

  toJSON(): undefined {
    return undefined;
  }
}

export interface ToolHomeResolver {
  resolve(signal: AbortSignal): Promise<readonly SourceRoot[]>;
}

export function assertGlobalRoots(roots: readonly SourceRoot[]): readonly SourceRoot[] {
  if (!Array.isArray(roots)) {
    throw new TypeError('A Global resolver must return a source-root array.');
  }
  if (roots.length > MAX_GLOBAL_SOURCE_ROOTS) {
    throw new TypeError('A Global resolver returned too many source roots.');
  }
  if (roots.some((root) => !(root instanceof SourceRoot) || root.descriptor.layer !== 'global')) {
    throw new TypeError('A Global resolver returned a non-Global source root.');
  }

  const locatorIds = new Set<string>();
  for (const root of roots) {
    if (locatorIds.has(root.locatorId)) {
      throw new TypeError('A Global resolver returned duplicate locator ids.');
    }
    locatorIds.add(root.locatorId);
  }

  return Object.freeze([...roots]);
}
