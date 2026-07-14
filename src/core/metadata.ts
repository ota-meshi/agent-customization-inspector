import { Buffer } from 'node:buffer';

import type { JsonValue } from './model.js';

export interface PublicMetadataLimits {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxScalarBytes: number;
  readonly maxSerializedBytes: number;
}

export const DEFAULT_PUBLIC_METADATA_LIMITS: PublicMetadataLimits = Object.freeze({
  maxNodes: 5_000,
  maxDepth: 32,
  maxScalarBytes: 8 * 1024,
  maxSerializedBytes: 256 * 1024,
});

export interface NormalizedMetadata {
  readonly value: Record<string, JsonValue>;
  readonly status: 'complete' | 'partial' | 'unavailable';
  readonly diagnosticCode?: 'METADATA_LIMIT_REACHED' | 'METADATA_UNAVAILABLE';
}

interface ObjectFrame {
  readonly input: object;
  readonly output: Record<string, JsonValue> | JsonValue[];
  readonly depth: number;
  readonly entries: readonly (readonly [string, unknown])[];
  index: number;
  childCount: number;
}

interface Budget {
  nodes: number;
  bytes: number;
  partial: boolean;
}

function containerKind(value: unknown): 'array' | 'record' | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  try {
    if (Array.isArray(value)) {
      return 'array';
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null ? 'record' : undefined;
  } catch {
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  containerKind(value) === 'record';

const jsonBytes = (value: string): number => Buffer.byteLength(JSON.stringify(value), 'utf8');

function validateLimits(limits: PublicMetadataLimits): PublicMetadataLimits {
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`The ${name} metadata limit must be a positive safe integer.`);
    }
  }
  return limits;
}

function truncateUtf8(value: string, maximumBytes: number): { value: string; partial: boolean } {
  let result = '';
  let bytes = 0;
  let partial = false;
  for (const character of value) {
    const characterBytes = Buffer.byteLength(character, 'utf8');
    if (bytes + characterBytes > maximumBytes) {
      partial = true;
      break;
    }
    result += character;
    bytes += characterBytes;
  }
  return { value: result, partial };
}

function ownDataEntries(
  value: object,
  maximumEntries: number,
): readonly (readonly [string, unknown])[] | undefined {
  try {
    const entries: Array<readonly [string, unknown]> = [];
    const isArray = Array.isArray(value);
    if (isArray && value.length > maximumEntries) {
      return undefined;
    }
    const keys: string[] = [];
    if (isArray) {
      for (let index = 0; index < value.length; index += 1) {
        keys.push(String(index));
      }
    } else {
      for (const key in value) {
        if (!Object.prototype.hasOwnProperty.call(value, key)) {
          continue;
        }
        keys.push(key);
        if (keys.length > maximumEntries) {
          return undefined;
        }
      }
      keys.sort();
    }
    for (const key of keys) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !('value' in descriptor)) {
        return undefined;
      }
      entries.push([key, descriptor.value]);
    }
    return entries;
  } catch {
    return undefined;
  }
}

function scalarValue(
  input: unknown,
  limits: PublicMetadataLimits,
): { value: JsonValue; bytes: number; partial: boolean } | undefined {
  if (input === null || typeof input === 'boolean') {
    const serialized = JSON.stringify(input);
    return { value: input, bytes: Buffer.byteLength(serialized, 'utf8'), partial: false };
  }
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      return undefined;
    }
    const serialized = JSON.stringify(input);
    return { value: input, bytes: Buffer.byteLength(serialized, 'utf8'), partial: false };
  }
  if (typeof input === 'string') {
    const truncated = truncateUtf8(input, limits.maxScalarBytes);
    return {
      value: truncated.value,
      bytes: Buffer.byteLength(JSON.stringify(truncated.value), 'utf8'),
      partial: truncated.partial,
    };
  }
  return undefined;
}

function freezeTree(root: object): void {
  const pending = [root];
  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }
    visited.add(current);
    for (const value of Object.values(current)) {
      if (typeof value === 'object' && value !== null) {
        pending.push(value);
      }
    }
    Object.freeze(current);
  }
}

function assignOutputValue(
  output: Record<string, JsonValue> | JsonValue[],
  key: string,
  value: JsonValue,
): void {
  if (Array.isArray(output)) {
    output.push(value);
    return;
  }
  output[key] = value;
}

/**
 * Converts an untrusted parse tree into bounded public JSON without recursive traversal.
 * The complete redacted Raw document remains the fallback when this result is partial.
 */
export function normalizePublicMetadata(
  input: unknown,
  limits: PublicMetadataLimits = DEFAULT_PUBLIC_METADATA_LIMITS,
): NormalizedMetadata {
  validateLimits(limits);
  if (limits.maxSerializedBytes < 2) {
    return Object.freeze({
      value: Object.freeze({}),
      status: 'unavailable',
      diagnosticCode: 'METADATA_LIMIT_REACHED',
    });
  }
  if (!isRecord(input)) {
    return Object.freeze({
      value: Object.freeze({}),
      status: 'unavailable',
      diagnosticCode: 'METADATA_UNAVAILABLE',
    });
  }

  const rootEntries = ownDataEntries(input, limits.maxNodes);
  if (rootEntries === undefined) {
    return Object.freeze({
      value: Object.freeze({}),
      status: 'unavailable',
      diagnosticCode: 'METADATA_UNAVAILABLE',
    });
  }

  const output: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>;
  const budget: Budget = { nodes: 1, bytes: 2, partial: false };
  const seen = new WeakSet<object>([input]);
  const stack: ObjectFrame[] = [
    { input, output, depth: 0, entries: rootEntries, index: 0, childCount: 0 },
  ];

  while (stack.length > 0) {
    const frame = stack.at(-1);
    if (frame === undefined) {
      break;
    }
    if (frame.index >= frame.entries.length) {
      stack.pop();
      continue;
    }

    const [rawKey, rawValue] = frame.entries[frame.index] ?? [];
    frame.index += 1;
    if (rawKey === undefined) {
      budget.partial = true;
      continue;
    }

    const key = truncateUtf8(rawKey, limits.maxScalarBytes);
    if (key.partial || key.value.length === 0 || key.value in frame.output) {
      budget.partial = true;
      continue;
    }

    const prefixBytes =
      (frame.childCount === 0 ? 0 : 1) +
      (Array.isArray(frame.output) ? 0 : jsonBytes(key.value) + 1);
    if (budget.nodes >= limits.maxNodes) {
      budget.partial = true;
      continue;
    }

    const scalar = scalarValue(rawValue, limits);
    if (scalar !== undefined) {
      if (budget.bytes + prefixBytes + scalar.bytes > limits.maxSerializedBytes) {
        budget.partial = true;
        continue;
      }
      assignOutputValue(frame.output, key.value, scalar.value);
      frame.childCount += 1;
      budget.nodes += 1;
      budget.bytes += prefixBytes + scalar.bytes;
      budget.partial ||= scalar.partial;
      continue;
    }

    if (typeof rawValue !== 'object' || rawValue === null || frame.depth >= limits.maxDepth) {
      budget.partial = true;
      continue;
    }
    const childKind = containerKind(rawValue);
    if (childKind === undefined) {
      budget.partial = true;
      continue;
    }
    if (seen.has(rawValue)) {
      budget.partial = true;
      continue;
    }

    const entries = ownDataEntries(rawValue, limits.maxNodes - budget.nodes);
    if (entries === undefined || budget.bytes + prefixBytes + 2 > limits.maxSerializedBytes) {
      budget.partial = true;
      continue;
    }

    const child: Record<string, JsonValue> | JsonValue[] =
      childKind === 'array' ? [] : (Object.create(null) as Record<string, JsonValue>);
    assignOutputValue(frame.output, key.value, child);
    frame.childCount += 1;
    budget.nodes += 1;
    budget.bytes += prefixBytes + 2;
    seen.add(rawValue);
    stack.push({
      input: rawValue,
      output: child,
      depth: frame.depth + 1,
      entries,
      index: 0,
      childCount: 0,
    });
  }

  freezeTree(output);
  return Object.freeze(
    budget.partial
      ? { value: output, status: 'partial', diagnosticCode: 'METADATA_LIMIT_REACHED' }
      : { value: output, status: 'complete' },
  );
}
