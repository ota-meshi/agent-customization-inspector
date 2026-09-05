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
// (contracts/http-api.md § get-session), so status advances only on the
// reader's own actions: the rescan they command answers once its scan settled
// and is followed by one refetch (contracts/http-api.md § rescan-repository),
// and "Refresh status" is for a scan that was already running when this page
// opened. That is why there is no pause/resume control: WCAG 2.2.2 applies
// to automatically updating content, and there is none to pause
// (contracts/accessibility-acceptance.md § 2.2.2).
//
// The session is joined here rather than threaded down as props: everything
// this panel shows is a fact about the session's Repository sequence — its
// Source, the command state, the stale overlay — and passing those through
// the page made it carry seven values it never read (the reasoning
// `useSessionSources` records). Renders nothing until a snapshot with the
// Repository Source is adopted, which is the page's own condition too.
import { computed } from 'vue';
import { SOURCE_STATUS_STANDALONE_TEXT } from '../../../shared/entities';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
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
 * spread across the rows of the files that carry them
 * ({@link SessionViewState.diagnosticFileCounts}).
 */
const diagnosticFileCount = computed(() => {
  const sourceId = source.value?.sourceId;
  return sourceId === undefined
    ? 0
    : (sessionViewState.diagnosticFileCounts.value.get(sourceId) ?? 0);
});

/** The Repository Source's stale overlay from a failed explicit rescan; null if none. */
const staleFailure = computed(() => {
  const sourceId = source.value?.sourceId;
  return (
    sessionViewState.snapshot.value?.staleFailures.find((entry) => entry.sourceId === sourceId) ??
    null
  );
});

/**
 * What the stale overlay says beyond "the last rescan failed": the failed
 * request's own error message, or the sentence the retained Diagnostic's code
 * carries. Both variants are stated here, because this is the Source's own
 * surface and a Source's own diagnostic belongs on it — the Diagnostic variant
 * used to be left to a list in the inventory rail, which put the failure and
 * its reason on two different screens.
 */
const staleFailureMessage = computed(() => {
  const failureRef = staleFailure.value?.failureRef;
  if (failureRef === undefined) {
    return null;
  }
  if (failureRef.kind === 'error') {
    return failureRef.message;
  }
  const retained = (sessionViewState.snapshot.value?.diagnostics ?? []).find(
    (diagnostic) => diagnostic.diagnosticId === failureRef.diagnosticId,
  );
  return retained === undefined ? null : DIAGNOSTIC_REGISTRY[retained.code].message;
});

/**
 * This Source's own diagnostics: the records that belong to the Source rather
 * than to one of its files, less the one the stale overlay above already
 * states. A file's own record is stated on that file's row, which is where a
 * reader meets the file it is about (FR-028).
 *
 * They are here because a Source's own state is stated on that Source's own
 * surface. The inventory rail listed them instead, beside the kinds, where the
 * only shipped Source-scoped code — `root-unreadable`, which fails the scan
 * and commits no inventory — meant the entry read `0` on every screen that had
 * an inventory to show, next to a Repository entry saying some files kept a
 * diagnostic (validation.md § SC-001 and SC-006 first-use sessions).
 */
const sourceDiagnosticMessages = computed<readonly string[]>(() => {
  const sourceId = source.value?.sourceId;
  const stated = staleFailure.value?.failureRef;
  return (sessionViewState.snapshot.value?.diagnostics ?? [])
    .filter(
      (diagnostic) =>
        diagnostic.sourceRelativePath === null &&
        diagnostic.sourceId === sourceId &&
        !(stated?.kind === 'diagnostic' && stated.diagnosticId === diagnostic.diagnosticId),
    )
    .map((diagnostic) => DIAGNOSTIC_REGISTRY[diagnostic.code].message);
});

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
        <dd>{{ SOURCE_STATUS_STANDALONE_TEXT[source.status].word }}</dd>
        <dt>Committed generation</dt>
        <dd>{{ source.generation }}</dd>
        <template v-if="correlatedProgress">
          <dt>This scan</dt>
          <dd>
            {{ SCAN_PROGRESS_PHASE_TEXT[correlatedProgress.phase] }} —
            {{ correlatedProgress.candidateFiles }}
            {{ correlatedProgress.candidateFiles === 1 ? 'candidate file' : 'candidate files' }},
            {{ correlatedProgress.diagnosticCount }}
            {{ correlatedProgress.diagnosticCount === 1 ? 'diagnostic' : 'diagnostics' }}
          </dd>
        </template>
      </dl>
      <!-- While the command is out, this panel says so from the command's own
           state: the rescan answers once its scan settled, and until then the
           status above is the snapshot's — by definition the value this scan
           is replacing — so a page that stated only the snapshot would call a
           running scan finished for as long as it runs. It says the command is
           in progress rather than that a scan is running, because this side
           cannot tell the two apart: an admitted rescan may be queued behind
           the sequence's running command, and nothing here polls to find out
           (contracts/http-api.md § rescan-repository). Inside the live region
           so the change is heard with the state it changes; no spinner and no
           progress bar, which earlier reviews took out. -->
      <p v-if="requesting" class="aci-note">
        Rescan in progress. The result appears here when it finishes.
      </p>

      <!-- What a "Partial" status is about, stated where the status is read.
           It is inside the live region because it is part of the state being
           announced: a status of "Partial" with no count leaves the listener
           with the same question a sighted reader has. Rendered from the count
           rather than from the status value, so it makes one claim — how many
           files kept a diagnostic — and never has to be kept in step with what
           the status word means. -->
      <p v-if="diagnosticFileCount > 0" class="aci-note">
        {{ diagnosticFileCount }} {{ diagnosticFileCount === 1 ? 'file' : 'files' }} kept a
        diagnostic of {{ diagnosticFileCount === 1 ? 'its' : 'their' }} own. Each is stated where
        that file is listed — on its row under its kind's tab, inside the row of the customization
        whose directory holds it, or under “Files in no kind” when no kind lists it.
      </p>

      <p v-if="staleFailure" class="aci-error">
        The last rescan failed, so the previous scan result is still shown and may be out of date.
        <span v-if="staleFailureMessage">{{ staleFailureMessage }}</span>
      </p>
      <!-- What this Source's own diagnostics say, on this Source's own
           surface. Inside the live region because they are part of the state
           being announced: a scan that failed on the root commits no
           inventory, so this sentence is the whole of what happened. -->
      <p v-for="message in sourceDiagnosticMessages" :key="message" class="aci-error">
        {{ message }}
      </p>
      <p v-if="rejectionText" class="aci-error">{{ rejectionText }}</p>
    </div>

    <!-- The command names its Source only where the surface does not. This one
         is the Repository page's, whose heading is the Source, so `Rescan` is
         the whole label — the same reason each consented home's row says
         `Rescan` rather than repeating the member's name
         (`GlobalSourceControls.vue`). The bar's command over the inventory is
         the other case and keeps `Rescan repository`: that list can span five
         Sources and only this one is rescanned (`App.vue`). -->
    <p class="aci-scan-progress__actions">
      <button type="button" :aria-disabled="requesting || undefined" @click="requestRescan">
        {{ staleFailure ? 'Retry scan' : 'Rescan' }}
      </button>
      <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
    </p>
    <!-- Who the refresh is for: not the reader who pressed Rescan, whose
         command answers with its own result, but a reader holding no command
         — a scan that began before this page opened, or in another tab —
         whose only way to the result is to ask (contracts/http-api.md
         § get-session, § rescan-repository). -->
    <p class="aci-note">
      Nothing on this page updates by itself. A scan you start here reports its own result. Use
      “Refresh status” for a scan that started elsewhere — in another tab, or before this page
      opened.
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
