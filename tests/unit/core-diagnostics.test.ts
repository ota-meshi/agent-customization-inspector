import { describe, expect, it } from 'vitest';

import {
  DIAGNOSTIC_LIMIT_REACHED,
  DiagnosticCollector,
  normalizeDiagnosticCode,
  sanitizeDiagnosticMessage,
} from '../../src/core/diagnostics.js';
import type { SourceDescriptor } from '../../src/core/model.js';

const repositorySource: SourceDescriptor = {
  layer: 'repository',
  id: 'repository-source',
  label: 'Repository',
  virtualBase: 'repository://workspace',
};

describe('DiagnosticCollector', () => {
  it('sanitizes public fields without retaining an absolute path or source snippet', () => {
    const secret = 'private-user-secret';
    const collector = new DiagnosticCollector(repositorySource, 4);

    collector.add({
      code: 'adapter failed!',
      severity: 'warning',
      message: `Could not read /Users/${secret}/.config/file: source text`,
      artifactId: '/Users/private/artifact',
      virtualPath: `/Users/${secret}/file`,
    });

    const [diagnostic] = collector.toArray();
    expect(diagnostic).toEqual({
      code: 'ADAPTER_FAILED',
      severity: 'warning',
      message: 'Could not read [absolute path]',
      source: repositorySource,
    });
    expect(JSON.stringify(collector.snapshot())).not.toContain(secret);
    expect(JSON.stringify(collector.snapshot())).not.toContain('/Users/');
  });

  it('keeps valid opaque ids and source-qualified virtual paths', () => {
    const collector = new DiagnosticCollector(repositorySource, 2);
    collector.add({
      code: 'PARSE_FAILED',
      severity: 'error',
      message: 'The document could not be parsed.',
      artifactId: 'artifact-1',
      virtualPath: 'repository://another-root/AGENTS.md',
    });

    expect(collector.toArray()[0]).toMatchObject({
      artifactId: 'artifact-1',
      virtualPath: 'repository://another-root/AGENTS.md',
    });
  });

  it('retains bounded detail plus one summary and only aggregate overflow totals', () => {
    const collector = new DiagnosticCollector(repositorySource, 3);
    collector.add({ code: 'ONE', severity: 'info', message: 'one' });
    collector.add({ code: 'TWO', severity: 'warning', message: 'two' });
    collector.add({ code: 'THREE', severity: 'error', message: 'three' });
    collector.add({
      code: 'FOUR',
      severity: 'error',
      message: 'attacker-controlled-overflow-message',
    });
    collector.add({
      code: 'FIVE',
      severity: 'info',
      message: 'another-attacker-controlled-overflow-message',
    });

    const diagnostics = collector.toArray();
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics.map(({ code }) => code)).toEqual(['ONE', 'TWO', DIAGNOSTIC_LIMIT_REACHED]);
    expect(JSON.stringify(diagnostics)).not.toContain('attacker-controlled');
    expect(collector.getCounts()).toEqual({ info: 2, warning: 1, error: 2 });
    expect(collector.getOverflowCounts()).toEqual({ info: 1, warning: 0, error: 2 });
    expect(diagnostics.at(-1)?.message).toContain('info: 1, warning: 0, error: 2');
  });

  it('uses one summary even when the configured detail limit is one', () => {
    const collector = new DiagnosticCollector(repositorySource, 1);
    collector.add({ code: 'FIRST', severity: 'warning', message: 'first' });
    collector.add({ code: 'SECOND', severity: 'error', message: 'second' });

    expect(collector.toArray()).toHaveLength(1);
    expect(collector.toArray()[0]?.code).toBe(DIAGNOSTIC_LIMIT_REACHED);
    expect(collector.getOverflowCounts()).toEqual({ info: 0, warning: 1, error: 1 });
  });

  it('does not access attacker-controlled detail after the cap is full', () => {
    const collector = new DiagnosticCollector(repositorySource, 1);
    collector.add({ code: 'FIRST', severity: 'warning', message: 'first' });
    const overflow = { severity: 'error' } as Record<string, unknown>;
    Object.defineProperties(overflow, {
      code: {
        get() {
          throw new Error('overflow code was accessed');
        },
      },
      message: {
        get() {
          throw new Error('overflow message was accessed');
        },
      },
    });

    expect(() => collector.add(overflow as never)).not.toThrow();
    expect(collector.getOverflowCounts()).toEqual({ info: 0, warning: 1, error: 1 });
  });

  it('bounds and visibly escapes diagnostic text', () => {
    expect(sanitizeDiagnosticMessage('line\nnext\u202Ehidden')).toBe(
      'line\\u{000a}next\\u{202e}hidden',
    );
    expect(sanitizeDiagnosticMessage('x'.repeat(600))).toHaveLength(512);
    expect(sanitizeDiagnosticMessage('\u202E'.repeat(600)).length).toBeLessThanOrEqual(512);
    expect(normalizeDiagnosticCode('123 bad/code')).toBe('DIAGNOSTIC_123_BAD_CODE');
    expect(sanitizeDiagnosticMessage('failed\n/Users/secret/path')).not.toContain('secret');
  });

  it('does not attach a virtual path from another source layer', () => {
    const collector = new DiagnosticCollector(repositorySource, 2);
    collector.add({
      code: 'WRONG_SOURCE',
      severity: 'warning',
      message: 'A safe generic message.',
      virtualPath: 'global://another-root/AGENTS.md',
    });

    expect(collector.toArray()[0]).not.toHaveProperty('virtualPath');
  });

  it('normalizes invalid runtime diagnostic values to safe generic fields', () => {
    const collector = new DiagnosticCollector(repositorySource, 2);
    collector.add({
      code: '',
      severity: 'fatal' as never,
      message: undefined as never,
      virtualPath: 'repository://workspace/../private',
    });

    expect(collector.source).toEqual(repositorySource);
    expect(collector.size).toBe(1);
    expect(collector.overflowed).toBe(false);
    expect(collector.toArray()[0]).toEqual({
      code: 'UNKNOWN_DIAGNOSTIC',
      severity: 'error',
      message: 'A recoverable inspection issue occurred.',
      source: repositorySource,
    });
  });

  it.each([
    'failed C:\\Users\\private-user\\file',
    'failed \\\\server\\private-share\\file',
    'failed file:///Users/private-user/file',
    'failed [/Users/private-user/file',
    'failed,/Users/private-user/file',
    'failed //Users/private-user/file',
    'failed \\Users\\private-user\\file',
    'failed \\ユーザー\\private-user\\file',
    'failed \\\\サーバー\\private-share\\file',
    'failed path:/Users/private-user/file',
    'failed path:\\Users\\private-user\\file',
  ])('removes cross-platform absolute path text: %s', (message) => {
    expect(sanitizeDiagnosticMessage(message)).not.toContain('private');
  });

  it('does not mistake an ordinary HTTPS URL for an absolute filesystem path', () => {
    expect(sanitizeDiagnosticMessage('See https://example.test/private/path')).toBe(
      'See https://example.test/private/path',
    );
  });

  it('rejects unsafe source identities and invalid limits', () => {
    expect(
      () =>
        new DiagnosticCollector(
          { ...repositorySource, virtualBase: 'repository:///Users/private' },
          2,
        ),
    ).toThrow(/virtual base/u);
    expect(
      () => new DiagnosticCollector({ ...repositorySource, layer: 'external' as never }, 2),
    ).toThrow(/source layer/u);
    expect(
      () => new DiagnosticCollector({ ...repositorySource, id: '/Users/private/source' }, 2),
    ).toThrow(/source id/u);
    expect(() => new DiagnosticCollector(repositorySource, 0)).toThrow(/positive/u);
  });
});
