// T1156: which drawn label carries the authored-text styling (FR-025).
//
// `.aci-authored-text` renders a run's own whitespace and isolates its own
// bidi context (`main.css`). Escaping removes the directional controls but
// keeps the spaces, so an escaped spelling still needs it — while this
// product's spelled-out substitute, which no file wrote, must not have it.
//
// A name and an applicability range answer the same question through their own
// escaping, and the two answers are asserted together because they are one
// rule: a range's backslash is glob syntax and stays as written, which is why
// each class compares against its own escaper rather than sharing one.
import { describe, expect, it } from 'vitest';

import { AuthoredName } from '../../../src/app/components/authored-name';
import { ApplicabilityRange } from '../../../src/app/components/applicability-range';

describe('the authored-text styling follows the drawn label', () => {
  it('keeps it on an escaped spelling, whose spaces are still the file’s', () => {
    // The case the escaping exists for: a default-ignorable code point makes
    // two otherwise identical values two rows, and escaping is what shows it.
    // The drawn label is no longer the raw value, and it is still built from
    // the file's characters — so the styling stays.
    const range = new ApplicabilityRange('src/​**');
    expect(range.text).not.toBe('src/​**');
    expect(range.isDeclared).toBe(true);

    const name = new AuthoredName('a​b');
    expect(name.text).not.toBe('a​b');
    expect(name.isAuthored).toBe(true);
  });

  it('takes it off the spelled-out substitute, which no file wrote', () => {
    // Spaces are not escaped, so a value made only of them draws nothing and
    // the label becomes this product's own statement about the value.
    expect(new ApplicabilityRange('   ').isDeclared).toBe(false);
    expect(new AuthoredName('   ').isAuthored).toBe(false);
  });

  it('keeps it on a value neither rule changes', () => {
    expect(new ApplicabilityRange('src/**').isDeclared).toBe(true);
    expect(new AuthoredName('SKILL.md').isAuthored).toBe(true);
  });
});
