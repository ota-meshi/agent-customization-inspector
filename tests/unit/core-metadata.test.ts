import { describe, expect, it } from 'vitest';

import { normalizePublicMetadata } from '../../src/core/metadata.js';

describe('normalizePublicMetadata', () => {
  it('creates a deeply frozen, JSON-compatible copy without invoking accessors', () => {
    let getterCalls = 0;
    const withGetter = Object.defineProperty({}, 'secret', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return '/Users/private/secret';
      },
    });

    const rejected = normalizePublicMetadata(withGetter);
    expect(rejected.status).toBe('unavailable');
    expect(getterCalls).toBe(0);

    const normalized = normalizePublicMetadata({
      enabled: true,
      nested: { list: ['first', 2, null] },
    });
    expect(normalized).toMatchObject({ status: 'complete' });
    expect(normalized.value).toEqual({
      enabled: true,
      nested: { list: ['first', 2, null] },
    });
    expect(Object.isFrozen(normalized.value)).toBe(true);
    expect(Object.isFrozen(normalized.value.nested)).toBe(true);
    expect(() => JSON.stringify(normalized.value)).not.toThrow();
  });

  it('returns unavailable for non-record roots and unsafe scalar values', () => {
    for (const value of [null, [], 'text', 1, new Date(), { value: Number.NaN }]) {
      const result = normalizePublicMetadata(value);
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      ) {
        expect(result.status).toBe('partial');
      } else {
        expect(result.status).toBe('unavailable');
      }
    }
  });

  it('rejects invalid limits and hostile object shapes without throwing during traversal', () => {
    expect(() =>
      normalizePublicMetadata(
        {},
        {
          maxNodes: 0,
          maxDepth: 1,
          maxScalarBytes: 1,
          maxSerializedBytes: 2,
        },
      ),
    ).toThrow(/positive safe integer/u);

    const revoked = Proxy.revocable({}, {});
    revoked.revoke();
    expect(normalizePublicMetadata(revoked.proxy).status).toBe('unavailable');

    const childRevoked = Proxy.revocable({}, {});
    childRevoked.revoke();
    expect(normalizePublicMetadata({ child: childRevoked.proxy })).toMatchObject({
      status: 'partial',
      value: {},
    });

    const nestedAccessor = Object.defineProperty({}, 'unsafe', {
      enumerable: true,
      get: () => 'must not execute',
    });
    expect(normalizePublicMetadata({ nestedAccessor })).toMatchObject({
      status: 'partial',
      value: {},
    });
  });

  it('bounds cycles, depth, nodes, scalars, and serialized bytes', () => {
    const cyclic: Record<string, unknown> = { safe: true };
    cyclic.self = cyclic;
    expect(normalizePublicMetadata(cyclic)).toMatchObject({
      status: 'partial',
      diagnosticCode: 'METADATA_LIMIT_REACHED',
      value: { safe: true },
    });

    const deep = { level: { value: 'kept', deeper: { omitted: true } } };
    expect(
      normalizePublicMetadata(deep, {
        maxNodes: 10,
        maxDepth: 1,
        maxScalarBytes: 8,
        maxSerializedBytes: 100,
      }),
    ).toMatchObject({ status: 'partial', value: { level: { value: 'kept' } } });

    const nodeBounded = normalizePublicMetadata(
      { a: 1, b: 2, c: 3 },
      { maxNodes: 3, maxDepth: 4, maxScalarBytes: 8, maxSerializedBytes: 100 },
    );
    expect(nodeBounded.status).toBe('partial');
    expect(Object.keys(nodeBounded.value)).toHaveLength(2);

    const scalarBounded = normalizePublicMetadata(
      { value: '日本語-and-more' },
      { maxNodes: 10, maxDepth: 4, maxScalarBytes: 7, maxSerializedBytes: 100 },
    );
    expect(scalarBounded).toMatchObject({ status: 'partial', value: { value: '日本' } });

    const byteBounded = normalizePublicMetadata(
      { a: '123456789', b: '123456789' },
      { maxNodes: 10, maxDepth: 4, maxScalarBytes: 20, maxSerializedBytes: 20 },
    );
    expect(byteBounded.status).toBe('partial');
    expect(Buffer.byteLength(JSON.stringify(byteBounded.value), 'utf8')).toBeLessThanOrEqual(20);
  });

  it('compacts arrays when an element is omitted so sparse nulls cannot bypass bytes', () => {
    const normalized = normalizePublicMetadata(
      { v: ['this value is too large', 'ok'] },
      { maxNodes: 10, maxDepth: 4, maxScalarBytes: 20, maxSerializedBytes: 14 },
    );

    expect(normalized.status).toBe('partial');
    expect(normalized.value).toEqual({ v: ['ok'] });
    expect(Buffer.byteLength(JSON.stringify(normalized.value), 'utf8')).toBeLessThanOrEqual(14);
  });

  it('returns an unavailable bounded result when even an empty object cannot fit', () => {
    expect(
      normalizePublicMetadata(
        {},
        { maxNodes: 1, maxDepth: 1, maxScalarBytes: 1, maxSerializedBytes: 1 },
      ),
    ).toEqual({
      value: {},
      status: 'unavailable',
      diagnosticCode: 'METADATA_LIMIT_REACHED',
    });
  });

  it('bounds root width, nested width, empty keys, and container bytes explicitly', () => {
    expect(
      normalizePublicMetadata(
        { a: 1, b: 2 },
        { maxNodes: 1, maxDepth: 2, maxScalarBytes: 8, maxSerializedBytes: 100 },
      ).status,
    ).toBe('unavailable');

    expect(
      normalizePublicMetadata(
        { nested: [1, 2, 3] },
        { maxNodes: 3, maxDepth: 2, maxScalarBytes: 8, maxSerializedBytes: 100 },
      ),
    ).toMatchObject({ status: 'partial', value: {} });

    expect(normalizePublicMetadata({ '': true, valid: false })).toMatchObject({
      status: 'partial',
      value: { valid: false },
    });

    expect(
      normalizePublicMetadata(
        { nested: { value: true } },
        { maxNodes: 10, maxDepth: 2, maxScalarBytes: 20, maxSerializedBytes: 10 },
      ),
    ).toMatchObject({ status: 'partial', value: {} });
  });
});
