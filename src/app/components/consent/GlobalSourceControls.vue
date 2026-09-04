<script setup lang="ts">
// The published Global Sources with each member's own explicit-rescan control
// (T1015; contracts/http-api.md § rescan-global). The invariant is
// `ScanProgress.vue`'s, applied per member: a scan's progress is shown only
// while it carries the exact `scanRequestId` the active command was admitted
// under (FR-030), and nothing here updates on its own — status advances only
// when the reader asks for it, which is why the closing note points at the
// page's one "Refresh status" control instead of duplicating it here.
//
// The boundary labels stay what the summary panel always stated: escaped
// presentations of the consented directories, never paths anything can open
// (FR-002).
//
// The session is joined here rather than threaded down as props: every value
// these rows show is a fact about the session's Global sequence — the member
// Sources, the command state, the stale overlays — and passing them through
// the page made it carry eight values it never read (the reasoning
// `useSessionSources` records). Renders nothing until a snapshot publishes a
// member Global Source, which is the page's own condition for the panel.
import { computed } from 'vue';
import { GLOBAL_MEMBER_TEXT, SCAN_PROGRESS_PHASE_TEXT } from '../../../shared/api-text';
import { SOURCE_STATUS_TEXT, SOURCE_BOUNDARY_ORIGIN_TEXT } from '../../../shared/entities';
import { useSessionViewState } from '../../composables/session-view-state';

const sessionViewState = useSessionViewState();

/** The published member Global Sources, in the snapshot's member order. */
const sources = computed(
  () => sessionViewState.snapshot.value?.sources.filter((source) => source.kind === 'global') ?? [],
);

/** True while the Global rescan command itself is in flight. */
const requesting = computed(() => sessionViewState.globalRescanState.value === 'requesting');

/**
 * How many of each Source's committed files kept a file-confined diagnostic
 * (FR-028), by Source ID — what a member's `Partial` status reports, stated
 * where that status is read.
 */
const diagnosticFileCounts = computed(() => {
  const counts = new Map<string, number>();
  for (const source of sources.value) {
    counts.set(source.sourceId, 0);
  }
  for (const file of sessionViewState.snapshot.value?.files ?? []) {
    const count = counts.get(file.sourceId);
    if (count !== undefined && file.diagnosticIds.length > 0) {
      counts.set(file.sourceId, count + 1);
    }
  }
  return counts;
});

/**
 * Dispatches one member's rescan unless a command is already in flight. The
 * guard is here rather than in a `disabled` attribute for the reason
 * `ScanProgress.vue` states: disabling a focused button drops keyboard focus
 * to the document body (WCAG 2.4.3), so `aria-disabled` keeps the button
 * focusable while this guard keeps the duplicate dispatch out.
 */
function requestRescan(sourceId: string): void {
  if (!requesting.value) {
    void sessionViewState.rescanGlobalSource(sourceId);
  }
}

/**
 * Each member row's own view of the shared command state: its stale overlay,
 * its correlated progress — matched against its own entry of the per-Source
 * admitted map, so neither a refused press nor another member's acceptance
 * moves it (FR-030) — and the rejection
 * exactly when this member's row was the one pressed: a refusal must not
 * appear under every member at once (FR-030).
 */
const rows = computed(() => {
  const activeScans = sessionViewState.activeGlobalScans.value;
  const requestedSourceId = sessionViewState.globalRescanSourceId.value;
  const rejection = sessionViewState.globalRescanRejection.value;
  const staleFailures = sessionViewState.snapshot.value?.staleFailures ?? [];
  return sources.value.map((source) => {
    const staleFailure = staleFailures.find((entry) => entry.sourceId === source.sourceId) ?? null;
    return {
      source,
      memberText: source.member === null ? 'Unknown member' : GLOBAL_MEMBER_TEXT[source.member],
      diagnosticFileCount: diagnosticFileCounts.value.get(source.sourceId) ?? 0,
      staleFailure,
      // A stale overlay explains itself with either the failed request's real
      // error message or a retained Diagnostic; only the message variant has
      // text of its own, and the Diagnostic variant is already rendered by
      // the diagnostic list.
      staleFailureMessage:
        staleFailure?.failureRef.kind === 'error' ? staleFailure.failureRef.message : null,
      progress:
        source.progress !== null &&
        activeScans.get(source.sourceId) === source.progress.scanRequestId
          ? source.progress
          : null,
      rejectionText:
        requestedSourceId !== source.sourceId || rejection === null
          ? null
          : rejection === 'scan-in-progress'
            ? 'A scan for this directory is already running or queued. Wait for it to finish, then rescan.'
            : 'The local session refused this rescan. Refresh the status and try again.',
    };
  });
});
</script>

<template>
  <template v-if="sources.length > 0">
    <dl class="aci-definition-grid">
      <template v-for="row in rows" :key="row.source.sourceId">
        <dt>{{ row.memberText }}</dt>
        <dd class="aci-global-source-controls__member">
          <!-- The origin beside the root, the same statement the repository
               summary makes (`pages/index.vue`): two members can show one
               directory, and whether it came from the tool's environment
               variable or its documented default is what tells the reader
               which value produced it (T1003, FR-002). -->
          <span class="aci-global-source-controls__root">
            {{ row.source.boundary.displayRoot }} ({{
              SOURCE_BOUNDARY_ORIGIN_TEXT[row.source.boundary.origin]
            }}, {{ SOURCE_STATUS_TEXT[row.source.status] }})
          </span>
          <!-- One announcement region per member, so a status that changed on
               "Refresh status" is heard as that member's rather than as a
               re-reading of the whole list (WCAG 4.1.3). It never empties:
               with no correlated progress to show it states the member and
               the status word the row shows, so a rescan that completed is
               heard as "Copilot home ready." rather than as silence. The
               member is named because four rows offer the same control and a
               bare status word says which of them changed to nobody; the root
               is not read, because it did not change and is stated once in
               the labelled field above (FR-002). The same rule as the
               Repository region in `InventoryRail.vue`: the Source's name and
               the status the screen shows, and nothing that stayed the same. -->
          <span aria-live="polite" aria-atomic="true">
            <span v-if="row.progress" class="aci-note">
              {{ SCAN_PROGRESS_PHASE_TEXT[row.progress.phase] }} —
              {{ row.progress.candidateFiles }}
              {{ row.progress.candidateFiles === 1 ? 'candidate file' : 'candidate files' }},
              {{ row.progress.diagnosticCount }}
              {{ row.progress.diagnosticCount === 1 ? 'diagnostic' : 'diagnostics' }}
            </span>
            <span v-else class="aci-note">
              {{ row.memberText }} {{ SOURCE_STATUS_TEXT[row.source.status].toLowerCase() }}.
            </span>
            <span v-if="row.diagnosticFileCount > 0" class="aci-note">
              {{ row.diagnosticFileCount }}
              {{ row.diagnosticFileCount === 1 ? 'file' : 'files' }} kept a diagnostic of
              {{ row.diagnosticFileCount === 1 ? 'its' : 'their' }} own; each is stated where that
              file is listed.
            </span>
            <span v-if="row.staleFailure" class="aci-error">
              The last rescan failed, so the previous scan result is still shown and may be out of
              date.
              <template v-if="row.staleFailureMessage">{{ row.staleFailureMessage }}</template>
            </span>
            <span v-if="row.rejectionText" class="aci-error">{{ row.rejectionText }}</span>
          </span>
          <!-- The accessible name carries the member, because every row offers
               the same visible phrase and a links-and-buttons walk would
               otherwise hear one control four times (WCAG 2.4.6; label-in-name
               keeps the visible phrase as the prefix). -->
          <button
            type="button"
            :aria-disabled="requesting || undefined"
            :aria-label="`${row.staleFailure ? 'Retry scan' : 'Rescan'}: ${row.memberText}`"
            @click="requestRescan(row.source.sourceId)"
          >
            {{ row.staleFailure ? 'Retry scan' : 'Rescan' }}
          </button>
        </dd>
      </template>
    </dl>
    <p class="aci-note">
      These labels are escaped presentations of the consented directories. They are not paths you
      can open and grant no read access.
    </p>
    <!-- The way out is the page's, not this component's. These rows are the
         published members' own facts and their own per-member rescans; the
         one command that ends personal inspection belongs to the surface that
         asked for it and offers it in every state, including the ones where no
         member is published (`pages/global-consent.vue`, FR-042). Rendered
         here as well it would be one command on one screen twice. -->
  </template>
</template>

<style scoped>
/* The member's line keeps the definition grid's row while stacking its own
   facts — root, announcements, control — so a long escaped root never pushes
   the button off the row. */
.aci-global-source-controls__member {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
}

.aci-global-source-controls__root {
  overflow-wrap: anywhere;
}
</style>
