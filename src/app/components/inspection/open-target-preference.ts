// The application the reader last chose to open files in, remembered across
// visits (FR-022).
//
// A split button opens with one application on a plain click, so it has to
// know which one the reader meant. Asking again on every file would make the
// menu the interaction rather than the escape hatch, and a choice that
// survives only the current page would be forgotten by the next detail route.
//
// The stored value is a preference about the reader's own machine — which
// editor they use — and carries nothing that was inspected: no path, no
// authored content, no session identity, so FR-027's rule that inspected
// content is never persisted is unaffected by it. The reader's colour scheme
// (`composables/color-scheme.ts`) is the only other value stored, on the same
// terms.
//
// One module-level ref rather than one per component instance: every open
// control on the page is the same reader's choice, so choosing in one updates
// the rest instead of leaving two controls disagreeing about what a click
// would do.
import { shallowRef } from 'vue';
import type { FileOpenTarget } from '../../../shared/api-types';

/**
 * Where the choice is kept. Namespaced by the product so a reader with other
 * local tools on `localhost` keeps one key per tool.
 */
const STORAGE_KEY = 'agent-customization-inspector.file-open-target';

/**
 * Reads the stored choice, or null when there is none to read.
 *
 * The value stays an unvalidated string on purpose: what it is compared
 * against is the list of applications the host published for this machine, so
 * a value that is no longer offered — an editor that was uninstalled, a
 * member this product no longer has — simply matches nothing and the caller
 * falls back to the first offered application. Parsing it into the wire union
 * here would be a second opinion about what a valid target is.
 *
 * Storage access itself can throw: a browser configured to deny site data
 * rejects the property access rather than returning null. Such a reader keeps
 * the default application and loses only the memory of their choice.
 */
function storedTarget(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Reached when the reader's browser denies site data to this origin.
    return null;
  }
}

/**
 * The application the reader last chose, as they spelled it, or null when
 * they have never chosen. Read by every open control on the page; written
 * only by {@link rememberOpenTarget}.
 */
export const rememberedOpenTarget = shallowRef<string | null>(storedTarget());

/**
 * Records the reader's choice so the next plain click — on this page and on
 * every later one — opens the same way.
 */
export function rememberOpenTarget(target: string): void {
  rememberedOpenTarget.value = target;
  try {
    window.localStorage.setItem(STORAGE_KEY, target);
  } catch {
    // Same denial as above, and the same outcome: the choice holds for this
    // page load and is forgotten by the next one.
  }
}

/**
 * The application a plain click opens with: the remembered choice while the
 * host still offers it, and otherwise the first application published — the
 * editor on a machine that has one, and that machine's own handler for the
 * file type otherwise. Null only when the host published none, which is the
 * state before a snapshot is adopted.
 *
 * The remembered value is compared against the published list rather than
 * parsed into the wire union, so an editor that has since been uninstalled —
 * or a spelling this product no longer has — matches nothing and falls back,
 * instead of selecting a target the host could not launch (FR-022).
 */
export function selectedOpenTarget(
  targets: readonly FileOpenTarget[],
  remembered: string | null,
): FileOpenTarget | null {
  for (const target of targets) {
    if (target === remembered) {
      return target;
    }
  }
  return targets[0] ?? null;
}
