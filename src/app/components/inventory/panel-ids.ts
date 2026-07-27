// The DOM ids tying each kind tab to the list it controls (T1077, WCAG 4.1.2).
//
// One function rather than the same template string in two components: a tab's
// `aria-controls` and the panel's own `id` must agree exactly, and a rule
// written twice is a rule that can drift.
import type { CustomizationKind } from '../../../shared/entities';

/** The `id` of the list panel a kind tab controls. */
export function inventoryPanelId(kind: CustomizationKind): string {
  return `aci-kind-panel-${kind.replace(/[^a-z]+/giu, '-')}`;
}

/** The `id` of the tab that controls {@link inventoryPanelId}'s panel. */
export function inventoryTabId(kind: CustomizationKind): string {
  return `aci-kind-tab-${kind.replace(/[^a-z]+/giu, '-')}`;
}
