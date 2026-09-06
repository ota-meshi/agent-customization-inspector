// The tab strip a detail page shows one half of its subject through (QR-004,
// contracts/accessibility-acceptance.md § WCAG 2.2 Level A/AA applicability
// matrix): which tab is current, the `id`s that tie each tab to the panel it
// controls, and the two moves the WAI-ARIA tabs pattern asks for — arrow keys
// stepping the strip, and a selection the page makes on the reader's behalf
// carrying focus with it.
//
// Both panels stay in the document and the unselected one is hidden, which is
// what makes that second move necessary: a switch the reader did not click can
// hide the subtree their focus is in, and focus on a hidden element restarts
// the next Tab from the top of the document.
//
// The two `id`s are derived from one prefix rather than passed as a pair, so a
// page cannot spell the tab's and the panel's differently and leave
// `aria-controls` pointing at nothing.
import { nextTick, ref, type Ref, type ShallowRef } from 'vue';
import { nextTabForKey } from '../components/tab-navigation';

/** What one detail page hands its tab strip; see the module header. */
export interface DetailTabsOptions<Tab extends string> {
  /**
   * The page's own outermost element, inside which {@link DetailTabs.select}
   * looks for the panel it is about to hide.
   */
  readonly pageRoot: Readonly<ShallowRef<HTMLElement | null>>;
  /** The kind's own tabs, in the order the strip draws them. */
  readonly tabs: readonly Tab[];
  /** The tab in view before the page selects one, which every kind fixes. */
  readonly initialTab: Tab;
  /**
   * What the kind's `id`s are built from: `skill` gives `aci-skill-tab-…` and
   * `aci-skill-panel-…`. One page's strip is on screen at a time, so the
   * prefix only has to distinguish the kinds from each other in a saved link
   * or a test.
   */
  readonly idPrefix: string;
}

/** One detail page's tab strip; see the module header. */
export class DetailTabs<Tab extends string> {
  /** The kind's own tabs, in the order the strip draws them. */
  public readonly tabs: readonly Tab[];
  /** Which tab is current. Read by the strip and by each panel's guard. */
  readonly #activeTab: Ref<Tab>;
  /** The page root {@link select} searches; see {@link DetailTabsOptions}. */
  readonly #pageRoot: Readonly<ShallowRef<HTMLElement | null>>;
  /** The word both `id`s are built from; see {@link DetailTabsOptions}. */
  readonly #idPrefix: string;

  /** Holds the kind's tabs and opens on the one it fixes as its first. */
  public constructor(options: DetailTabsOptions<Tab>) {
    this.tabs = options.tabs;
    this.#activeTab = ref(options.initialTab) as Ref<Tab>;
    this.#pageRoot = options.pageRoot;
    this.#idPrefix = options.idPrefix;
  }

  /** The tab in view. */
  public get activeTab(): Tab {
    return this.#activeTab.value;
  }

  /**
   * Puts a tab in view without touching focus, which is what a click and a
   * page's own decision both want: the reader is already where they meant to
   * be. {@link select} is for the switch a reader did not ask for.
   */
  public set activeTab(tab: Tab) {
    this.#activeTab.value = tab;
  }

  /** The `id` of the tab that controls {@link panelId}'s panel. */
  public tabId(tab: Tab): string {
    return `aci-${this.#idPrefix}-tab-${tab}`;
  }

  /** The `id` of the panel a tab controls (WCAG 4.1.2). */
  public panelId(tab: Tab): string {
    return `aci-${this.#idPrefix}-panel-${tab}`;
  }

  /**
   * Arrow keys move the selection, matching the WAI-ARIA tabs pattern.
   * Selection follows focus because switching panels issues no request and
   * loses no work: both halves are already in hand, so the extra Enter that
   * manual activation asks for would be friction with nothing behind it.
   *
   * `index` is where the event fired, which is the focused tab rather than the
   * selected one; the strip's own `v-for` supplies it.
   */
  public onKeydown(event: KeyboardEvent, index: number): void {
    const next = nextTabForKey(event.key, this.tabs, index);
    if (next === null) {
      // A key the pattern does not handle keeps its default behavior;
      // swallowing it here would break Tab out of the strip.
      return;
    }
    event.preventDefault();
    this.#activeTab.value = next;
    document.getElementById(this.tabId(next))?.focus();
  }

  /**
   * Selects a tab, keeping focus reachable where the reader did not ask for
   * the switch — a history step to another of the subject's files while they
   * were reading the other panel. Focus inside the panel this hides would drop
   * to the document body, so it moves to the tab that now owns what is in
   * view. A click on the strip runs the same call and never takes that branch:
   * focus is on the button it fired from, which is not in the panel.
   */
  public select(tab: Tab): void {
    if (this.#activeTab.value === tab) {
      return;
    }
    const hidden = this.#pageRoot.value?.querySelector(`#${this.panelId(this.#activeTab.value)}`);
    const focusWasInside = hidden?.contains(document.activeElement) === true;
    this.#activeTab.value = tab;
    if (focusWasInside) {
      void nextTick(() => document.getElementById(this.tabId(tab))?.focus());
    }
  }
}

/** Holds one detail page's tab strip; see {@link DetailTabs}. */
export function useDetailTabs<Tab extends string>(
  options: DetailTabsOptions<Tab>,
): DetailTabs<Tab> {
  return new DetailTabs(options);
}
