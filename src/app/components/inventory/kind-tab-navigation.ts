// The WAI-ARIA tabs key mapping for the customization-kind strip
// (QR-004, contracts/accessibility-acceptance.md § Keyboard operation).
//
// It sits beside the component rather than inside it because it is a decision,
// not a rendering step: given a key and where focus is, which tab becomes
// current. The component keeps what only a component can do — emitting the
// selection and moving DOM focus. The split is what makes the mapping
// reachable at all: the unit project compiles no single-file components, and
// only one kind ships an inventory today, so a rendered strip has one tab and
// no arrow key can be exercised end to end.
import type { CustomizationKind } from '../../../shared/entities';

/**
 * The kind that a key press moves to, or `null` when the key is not one this
 * pattern handles and the event must be left alone.
 *
 * Arrows step and wrap in both directions; `Home` and `End` jump to the ends.
 * Wrapping is the pattern's default for a tablist and is what lets a keyboard
 * user reach the last tab from the first without counting stops.
 *
 * `index` is the position of the tab the event fired on, which is the focused
 * one — not the selected one. They differ for the duration of a key press,
 * and stepping from the selected tab would skip a tab whenever focus had
 * already moved. It comes from the component's own `v-for`, so it is always a
 * position in `kinds`.
 */
export function nextKindForKey(
  key: string,
  kinds: readonly CustomizationKind[],
  index: number,
): CustomizationKind | null {
  const step =
    key === 'ArrowRight'
      ? 1
      : key === 'ArrowLeft'
        ? -1
        : key === 'Home'
          ? -index
          : key === 'End'
            ? kinds.length - 1 - index
            : null;
  if (step === null) {
    return null;
  }
  return kinds[(index + step + kinds.length) % kinds.length] ?? null;
}
