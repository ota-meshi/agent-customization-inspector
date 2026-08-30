// The one way a surface joins the session the shell provides (FR-027).
// `App.vue` creates the single `SessionViewState` and provides it under
// {@link SESSION_VIEW_STATE} before any route renders, so for every page and
// control below the shell its absence is a wiring bug, never a state to
// handle. This composable owns that contract — the inject and the loud
// failure — because two dozen call sites each spelling the same guard is the
// same rule written two dozen times (AGENTS.md § Implementation simplicity
// policy).
import { inject } from 'vue';
import { SESSION_VIEW_STATE, type SessionViewState } from '../session/view-state';

/**
 * The session view state the shell provides. The shell always provides it
 * before rendering a route, so its absence is a wiring bug: failing loudly
 * here beats rendering a session-shaped surface with no session behind it.
 */
export function useSessionViewState(): SessionViewState {
  const sessionViewState = inject(SESSION_VIEW_STATE);
  if (sessionViewState === undefined) {
    throw new Error('the session view state was not provided by the shell');
  }
  return sessionViewState;
}
