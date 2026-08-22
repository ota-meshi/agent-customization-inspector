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
import { computed } from 'vue';
import { SOURCE_STATUS_TEXT } from '../../../shared/entities';
import { SCAN_PROGRESS_PHASE_TEXT } from '../../../shared/api-text';
import type { RejectionCode } from '../../../shared/rejection-codes';
import type { SourceDto, StaleSourceFailure } from '../../../shared/api-types';

const props = defineProps<{
  /** The Source whose scan status is shown. */
  source: SourceDto;
  /**
   * How many of that Source's committed files kept a file-confined diagnostic
   * (FR-028) — what the `partial` status reports. Stated here because this is
   * where a reader meets that status, while the causes themselves are on the
   * rows of the files that carry them.
   */
  diagnosticFileCount: number;
  /** The request ID of the command this page issued; null before any. */
  activeScanRequestId: string | null;
  /** True while the rescan command itself is in flight. */
  requesting: boolean;
  /** The closed rejection code of a refused command; null otherwise. */
  rejection: RejectionCode | null;
  /** This Source's stale overlay from a failed explicit rescan; null if none. */
  staleFailure: StaleSourceFailure | null;
  /** The retained failure text of that overlay, when it is an error message. */
  staleFailureMessage: string | null;
}>();

const emit = defineEmits<{
  /** The user asked to dispatch one explicit rescan. */
  rescan: [];
  /** The user asked to refetch the current status and inventory. */
  refresh: [];
}>();

/**
 * Dispatches the rescan unless one is already in flight. The guard is here
 * rather than in a `disabled` attribute because disabling a focused button
 * drops keyboard focus to the document body (WCAG 2.4.3,
 * contracts/accessibility-acceptance.md § 2.4.3); `aria-disabled` below keeps
 * the button focusable while this guard keeps the duplicate dispatch out.
 */
function requestRescan(): void {
  if (!props.requesting) {
    emit('rescan');
  }
}

// Progress belongs to this page's command only. A progress record for another
// request — an automatic startup scan, or a command from an earlier client
// data epoch — is not shown, because attributing it to the active command
// would report work the user did not request.
const correlatedProgress = computed(() =>
  props.activeScanRequestId !== null &&
  props.source.progress?.scanRequestId === props.activeScanRequestId
    ? props.source.progress
    : null,
);

const rejectionText = computed(() =>
  props.rejection === 'scan-in-progress'
    ? 'A Repository scan is already running or queued. Wait for it to finish, then rescan.'
    : props.rejection === null
      ? null
      : 'The local session refused this rescan. Refresh the status and try again.',
);
</script>

<template>
  <section class="aci-scan-progress aci-panel" aria-labelledby="aci-scan-progress-heading">
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
      <button type="button" @click="emit('refresh')">Refresh status</button>
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
