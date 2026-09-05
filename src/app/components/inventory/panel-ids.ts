// The DOM ids tying each rail entry to the list it controls (T1077, extended
// by T1152; WCAG 4.1.2).
//
// One function rather than the same template string in two components: a tab's
// `aria-controls` and the panel's own `id` must agree exactly, and a rule
// written twice is a rule that can drift.
import type { InventorySelection } from './rail-selection';

/** The `id` of the list panel a rail entry controls. */
export function inventoryPanelId(selection: InventorySelection): string {
  return `aci-kind-panel-${selection.replace(/[^a-z]+/giu, '-')}`;
}

/** The `id` of the tab that controls {@link inventoryPanelId}'s panel. */
export function inventoryTabId(selection: InventorySelection): string {
  return `aci-kind-tab-${selection.replace(/[^a-z]+/giu, '-')}`;
}
