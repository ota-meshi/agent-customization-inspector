// The WAI-ARIA tabs key mapping, shared by every tab strip in the app
// (QR-004, contracts/accessibility-acceptance.md § WCAG 2.2 Level A/AA
// applicability matrix).
//
// It sits beside the components rather than inside one because it is a
// decision, not a rendering step: given a key and where focus is, which tab
// becomes current. A component keeps what only a component can do — emitting
// the selection and moving DOM focus. The split is also what makes the mapping
// reachable at all: the unit project compiles no single-file components, so a
// rendered strip cannot be driven from a unit test.
//
// Generic over what a tab is, because the strips that use it identify their
// tabs differently — the inventory by customization kind, the skill detail by
// which half of the skill is in view — and the mapping is the same decision
// either way. Orientation is a parameter for the same reason: the inventory's
// list of kinds runs down a rail while every detail strip runs across, and
// which arrow pair steps is all that separates them.

/**
 * Which axis a strip's arrow keys step along, matching the `aria-orientation`
 * its tablist declares.
 */
export type TabOrientation =
  /** A strip laid out in a row: `ArrowLeft` and `ArrowRight` step it. */
  | 'horizontal'
  /** A strip laid out in a column: `ArrowUp` and `ArrowDown` step it. */
  | 'vertical';

/**
 * The tab a key press moves to, or `null` when the key is not one this pattern
 * handles and the event must be left alone.
 *
 * Arrows step and wrap in both directions; `Home` and `End` jump to the ends.
 * Wrapping is the pattern's default for a tablist and is what lets a keyboard
 * user reach the last tab from the first without counting stops.
 *
 * Only the orientation's own arrow pair steps: the pattern gives the other
 * pair no meaning in a tablist, and answering it here would swallow a key the
 * page or the browser can still act on.
 *
 * `index` is the position of the tab the event fired on, which is the focused
 * one — not the selected one. They differ for the duration of a key press, and
 * stepping from the selected tab would skip a tab whenever focus had already
 * moved. It comes from the component's own `v-for`, so it is always a position
 * in `tabs`.
 */
export function nextTabForKey<Tab>(
  key: string,
  tabs: readonly Tab[],
  index: number,
  orientation: TabOrientation = 'horizontal',
): Tab | null {
  const [forward, backward] =
    orientation === 'vertical' ? ['ArrowDown', 'ArrowUp'] : ['ArrowRight', 'ArrowLeft'];
  const step =
    key === forward
      ? 1
      : key === backward
        ? -1
        : key === 'Home'
          ? -index
          : key === 'End'
            ? tabs.length - 1 - index
            : null;
  if (step === null) {
    return null;
  }
  return tabs[(index + step + tabs.length) % tabs.length] ?? null;
}
