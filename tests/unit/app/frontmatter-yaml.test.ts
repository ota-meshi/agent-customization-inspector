// T102, T216: the frontmatter YAML serialization the Markdown-kind details
// render (FR-007, FR-025, FR-026) — every declared key as one YAML document
// in the file's own order, values literal, key identities kept apart by
// their parsed kinds, and the yaml package's own spelling for everything a
// plain scalar cannot carry.
import { describe, expect, it } from 'vitest';

import { frontmatterYamlText } from '../../../src/app/components/inspection/frontmatter-yaml';
import type { DeclaredEntryDto } from '../../../src/shared/api-types';

/** One entry with an explicit key kind; the shape the parse publishes. */
function entry(
  key: string,
  value: DeclaredEntryDto['value'],
  keyKind: DeclaredEntryDto['keyKind'] = 'string',
): DeclaredEntryDto {
  return { key, keyKind, value };
}

describe('frontmatter YAML serialization (T102)', () => {
  it('keeps the authored order whole and serializes values literally (FR-007, FR-026)', () => {
    // No key leads and nothing sorts: the document is the file's own order,
    // nested mappings and sequence items included, with a literal
    // environment reference kept as its characters.
    expect(
      frontmatterYamlText([
        entry('description', { kind: 'scalar', scalarKind: 'string', text: 'Deploys the service' }),
        entry('metadata', {
          kind: 'mapping',
          entries: [
            entry('zeta', { kind: 'scalar', scalarKind: 'string', text: 'later' }),
            entry('alpha', { kind: 'scalar', scalarKind: 'string', text: '${HOME}' }),
          ],
        }),
        entry('name', { kind: 'scalar', scalarKind: 'string', text: 'deploy' }),
        entry('tags', {
          kind: 'sequence',
          items: [
            { kind: 'scalar', scalarKind: 'string', text: 'b' },
            { kind: 'scalar', scalarKind: 'string', text: 'a' },
          ],
        }),
      ]),
    ).toBe(
      [
        'description: Deploys the service',
        'metadata:',
        '  zeta: later',
        '  alpha: ${HOME}',
        'name: deploy',
        'tags:',
        '  - b',
        '  - a',
        '',
      ].join('\n'),
    );
  });

  it('keeps the two keys one spelling can stand for apart by their parsed kinds', () => {
    // YAML's numeric `1` and string `"1"` render identically as text; the
    // wire keeps the parsed kind beside the spelling (`DeclaredKeyKind`),
    // and the document spells each back as what it was.
    expect(
      frontmatterYamlText([
        entry('1', { kind: 'scalar', scalarKind: 'string', text: 'numeric key' }, 'number'),
        entry('1', { kind: 'scalar', scalarKind: 'string', text: 'string key' }, 'string'),
        entry('true', { kind: 'scalar', scalarKind: 'string', text: 'boolean key' }, 'boolean'),
        entry('', { kind: 'scalar', scalarKind: 'string', text: 'null key' }, 'null'),
      ]),
    ).toBe(
      ['1: numeric key', '"1": string key', 'true: boolean key', 'null: null key', ''].join('\n'),
    );
  });

  it('spells each scalar by the parsed kind the wire publishes beside it', () => {
    // The kind directs the spelling, never a re-parse of the rendering: a
    // number and a boolean spell bare, while a string keeps the package's
    // quoting — the authored string `'7'` stays `"7"` instead of being
    // misspelled as the number it renders like, and a `null`-spelling
    // string never reads as the authored null the absent variant
    // serializes. A multiline string is a block literal, and a number the
    // double type cannot hold — a TOML 64-bit integer's digits, a YAML
    // `.nan` — spells through YAML's own vocabulary.
    expect(
      frontmatterYamlText([
        entry('port', { kind: 'scalar', scalarKind: 'number', text: '7' }),
        entry('enabled', { kind: 'scalar', scalarKind: 'boolean', text: 'true' }),
        entry('padded', { kind: 'scalar', scalarKind: 'string', text: '007' }),
        entry('quoted', { kind: 'scalar', scalarKind: 'string', text: '7' }),
        entry('empty', { kind: 'scalar', scalarKind: 'string', text: '' }),
        entry('nullish', { kind: 'scalar', scalarKind: 'string', text: 'null' }),
        entry('unset', { kind: 'absent' }),
        entry('big', {
          kind: 'scalar',
          scalarKind: 'number',
          text: '123456789012345678901234567890',
        }),
        entry('notanumber', { kind: 'scalar', scalarKind: 'number', text: 'NaN' }),
        entry('notes', { kind: 'scalar', scalarKind: 'string', text: 'line1\nline2' }),
      ]),
    ).toBe(
      [
        'port: 7',
        'enabled: true',
        'padded: "007"',
        'quoted: "7"',
        'empty: ""',
        'nullish: "null"',
        'unset: null',
        'big: 123456789012345678901234567890',
        'notanumber: .nan',
        'notes: |-',
        '  line1',
        '  line2',
        '',
      ].join('\n'),
    );
  });

  it('serializes an authored empty block as the empty mapping', () => {
    expect(frontmatterYamlText([])).toBe('{}\n');
  });
});
