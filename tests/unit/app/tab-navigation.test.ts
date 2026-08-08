// T071: the customization-kind tab strip's keyboard mapping (QR-004,
// contracts/accessibility-acceptance.md § Keyboard operation).
//
// The browser acceptance suite proves the strip is one stop in the page tab
// order and that the selected tab is the tabbable one. It cannot prove the
// arrow behavior: only one kind ships an inventory, so a rendered strip has a
// single tab and every arrow press is a no-op there. These cases drive the
// mapping directly with the multi-kind strip a later inventory phase produces.
import { describe, expect, it } from 'vitest';

import { nextTabForKey } from '../../../src/app/components/tab-navigation';
import type { CustomizationKind } from '../../../src/shared/entities';

/** A strip of the shape a later phase renders, in the closed kind order. */
const KINDS = ['instructions', 'rule', 'skill'] as const satisfies readonly CustomizationKind[];

describe('nextTabForKey', () => {
  it('steps in both directions and wraps at each end', () => {
    expect(nextTabForKey('ArrowRight', KINDS, 0)).toBe('rule');
    expect(nextTabForKey('ArrowLeft', KINDS, 1)).toBe('instructions');
    // Wrapping is what lets a keyboard user reach the far end without
    // counting stops, and it is the tablist default.
    expect(nextTabForKey('ArrowRight', KINDS, 2)).toBe('instructions');
    expect(nextTabForKey('ArrowLeft', KINDS, 0)).toBe('skill');
  });

  it('jumps to each end from anywhere, including from that end', () => {
    for (let index = 0; index < KINDS.length; index += 1) {
      expect(nextTabForKey('Home', KINDS, index)).toBe('instructions');
      expect(nextTabForKey('End', KINDS, index)).toBe('skill');
    }
  });

  it('leaves every other key alone', () => {
    // The component only calls `preventDefault` when this returns a kind, so
    // answering here for `Tab` would trap focus inside the strip.
    for (const key of ['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'a', 'Escape']) {
      expect(nextTabForKey(key, KINDS, 1), key).toBeNull();
    }
  });

  it('answers nothing for a strip with no tabs', () => {
    // The strip renders nothing when no kind is recognized, so no key event can
    // fire — but the empty modulus must not produce a tab out of `NaN`.
    expect(nextTabForKey('ArrowRight', [], 0)).toBeNull();
    expect(nextTabForKey('Home', [], 0)).toBeNull();
  });

  it('is a no-op on a single-tab strip, which is what ships today', () => {
    const single = ['skill'] as const satisfies readonly CustomizationKind[];
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(nextTabForKey(key, single, 0), key).toBe('skill');
    }
  });
});
