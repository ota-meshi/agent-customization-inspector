<script setup lang="ts">
// Request-correlated Repository scan status and the explicit rescan control
// (T071). The one invariant this component exists to keep: it displays a
// scan's status only while that status carries the exact `scanRequestId` the
// active command was admitted under (FR-030). Older status or inventory can
// therefore never satisfy a newer command — a stale "Scanning…" from a
// previous request would otherwise read as progress on the one the user just
// pressed.
//
// Nothing here updates on its own. The product defines no timer, filesystem
// watcher, or server-initiated push of inspection data
// (contracts/http-api.md § get-session), so status advances only when the
// user asks for it. That is why there is a "Refresh status" control and no
// pause/resume control: WCAG 2.2.2 applies to automatically updating content,
// and there is none to pause (contracts/accessibility-acceptance.md
// § 2.2.2).
//
// The session is joined here rather than threaded down as props: everything
// this panel shows is a fact about the session's Repository sequence — its
// Source, the command state, the stale overlay — and passing those through
// the page made it carry seven values it never read (the reasoning
// `useSessionSources` records). Renders nothing until a snapshot with the
// Repository Source is adopted, which is the page's own condition too.
import { computed } from 'vue';
import { SOURCE_STATUS_TEXT } from '../../../shared/entities';
import { SCAN_PROGRESS_PHASE_TEXT } from '../../../shared/api-text';
import { useSessionViewState } from '../../composables/session-view-state';

const sessionViewState = useSessionViewState();

/** The Repository Source whose scan status this panel shows; null before bootstrap adopts one. */
const source = computed(
  () =>
    sessionViewState.snapshot.value?.sources.find((candidate) => candidate.kind === 'repository') ??
    null,
);

/** True while the rescan command itself is in flight. */
const requesting = computed(() => sessionViewState.rescanState.value === 'requesting');

/**
 * How many of this Source's committed files kept a file-confined diagnostic —
 * which is what a `partial` status reports (FR-028). Stated here because this
 * is where a reader asks what "Partial" means, while the causes themselves are
 * spread across the rows of the files that carry them.
 *
 * Counted from the published files rather than from `snapshot.diagnostics`: a
 * diagnostic is referenced by the file it belongs to, and one file may hold
 * several, so counting records would report a number no list on this page has.
 */
const diagnosticFileCount = computed(() => {
  const sourceId = source.value?.sourceId;
  let count = 0;
  for (const file of sessionViewState.snapshot.value?.files ?? []) {
    if (file.sourceId === sourceId && file.diagnosticIds.length > 0) {
      count += 1;
    }
  }
  return count;
});

/** The Repository Source's stale overlay from a failed explicit rescan; null if none. */
const staleFailure = computed(() => {
  const sourceId = source.value?.sourceId;
  return (
    sessionViewState.snapshot.value?.staleFailures.find((entry) => entry.sourceId === sourceId) ??
    null
  );
});

// A stale overlay explains itself with either the failed request's real error
// message or a retained Diagnostic; only the message variant has text of its
// own, and the Diagnostic variant is already rendered by the diagnostic list.
const staleFailureMessage = computed(() =>
  staleFailure.value?.failureRef.kind === 'error' ? staleFailure.value.failureRef.message : null,
);

/**
 * Dispatches the rescan unless one is already in flight. The guard is here
 * rather than in a `disabled` attribute because disabling a focused button
 * drops keyboard focus to the document body (WCAG 2.4.3,
 * contracts/accessibility-acceptance.md § 2.4.3); `aria-disabled` below keeps
 * the button focusable while this guard keeps the duplicate dispatch out.
 */
function requestRescan(): void {
  if (!requesting.value) {
    void sessionViewState.requestRescan();
  }
}

// Progress belongs to this page's command only. A progress record for another
// request — an automatic startup scan, or a command from an earlier client
// data epoch — is not shown, because attributing it to the active command
// would report work the user did not request.
const correlatedProgress = computed(() => {
  const activeScanRequestId = sessionViewState.activeScanRequestId.value;
  return activeScanRequestId !== null &&
    source.value?.progress?.scanRequestId === activeScanRequestId
    ? source.value.progress
    : null;
});

const rejectionText = computed(() =>
  sessionViewState.rescanRejection.value === 'scan-in-progress'
    ? 'A Repository scan is already running or queued. Wait for it to finish, then rescan.'
    : sessionViewState.rescanRejection.value === null
      ? null
      : 'The local session refused this rescan. Refresh the status and try again.',
);
</script>

<template>
  <section
    v-if="source"
    class="aci-scan-progress aci-panel"
    aria-labelledby="aci-scan-progress-heading"
  >
    <h3 id="aci-scan-progress-heading">Scan status</h3>
    <!-- Status changes are announced, not just repainted (WCAG 4.1.3). It is
         polite rather than assertive: a scan result is not an alert, and every
         change here follows an action the user just took, so interrupting them
         would say nothing they are not already expecting. `aria-atomic` makes
         the whole block one announcement — "Ready, generation 2" is the state;
         the two halves separately are not. -->
    <div aria-live="polite" aria-atomic="true">
      <dl class="aci-definition-grid">
        <dt>Source status</dt>
        <dd>{{ SOURCE_STATUS_TEXT[source.status] }}</dd>
        <dt>Committed generation</dt>
        <dd>{{ source.generation }}</dd>
        <template v-if="correlatedProgress">
          <dt>This scan</dt>
          <dd>
            {{ SCAN_PROGRESS_PHASE_TEXT[correlatedProgress.phase] }} —
            {{ correlatedProgress.candidateFiles }} candidate file(s),
            {{ correlatedProgress.diagnosticCount }} diagnostic(s)
          </dd>
        </template>
      </dl>

      <!-- What a "Partial" status is about, stated where the status is read.
           It is inside the live region because it is part of the state being
           announced: a status of "Partial" with no count leaves the listener
           with the same question a sighted reader has. Rendered from the count
           rather than from the status value, so it makes one claim — how many
           files kept a diagnostic — and never has to be kept in step with what
           the status word means. -->
      <p v-if="diagnosticFileCount > 0" class="aci-note">
        {{ diagnosticFileCount }} file(s) kept a diagnostic of their own. Each states it where that
        file is listed — on its row under its kind's tab, inside the row of the customization whose
        directory holds it, or under “Files in no kind” when no kind lists it.
      </p>

      <p v-if="staleFailure" class="aci-error">
        The last rescan failed, so the previous scan result is still shown and may be out of date.
        <span v-if="staleFailureMessage">{{ staleFailureMessage }}</span>
      </p>
      <p v-if="rejectionText" class="aci-error">{{ rejectionText }}</p>
    </div>

    <p class="aci-scan-progress__actions">
      <button type="button" :aria-disabled="requesting || undefined" @click="requestRescan">
        {{ staleFailure ? 'Retry scan' : 'Rescan repository' }}
      </button>
      <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
    </p>
    <p class="aci-note">
      Nothing on this page updates by itself. Use “Refresh status” to see the result of a scan that
      is still running.
    </p>
  </section>
</template>

<style scoped>
/* The controls wrap rather than scrolling sideways, so a narrow viewport or a
   large text size never hides one (WCAG 1.4.10). */
.aci-scan-progress__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0.25rem;
}
</style>
