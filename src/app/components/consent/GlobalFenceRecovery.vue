<script setup lang="ts">
// The control-only recovery view the fenced session renders (T1026, T1027;
// FR-042; contracts/http-api.md § get-session `GlobalFenceRecoverySnapshot`).
// From disable-barrier acceptance through terminal success this is the whole
// page below the shell heading: everything else was purged before the
// request or on observing the fence, and nothing here can reconstruct it —
// recovery is a refetch, never a restoration of purged content.
//
// The session is joined here rather than threaded down as props: the
// recovery projection and both commands this view offers are the session's
// (the reasoning `useSessionSources` records).
//
// "Check status" is the contract's Resume inspection
// (data-model.md § RecoveryViewState): an explicit reader action that
// fetches the session again — the identity requirement is fetchSession's
// own sessionId guard, and the fresh inventory view is constructed from the
// purged state, so its filters are the defaults. One button serves both
// states because nothing here updates by itself: whether the fence is still
// up is only learnable by fetching, and the same fetch adopts the fenced
// projection while it is and the fresh full snapshot once it is not.
import { computed } from 'vue';
import { GLOBAL_DISABLE_STATE_TEXT } from '../../../shared/api-text';
import { useSessionViewState } from '../../composables/session-view-state';

const sessionViewState = useSessionViewState();

/** The adopted recovery projection; the view is not rendered without one. */
const recovery = computed(() => sessionViewState.fenceRecovery.value);

/** The retained failed request's error, present exactly while `failed`. */
const failureMessage = computed(() => recovery.value?.globalDisableInProgress.message ?? null);

/** True while this page's own disable command is in flight. */
const submitting = computed(() => sessionViewState.globalDisableState.value === 'submitting');

/**
 * Retries the disable unless one is in flight. The guard is the same one
 * every command control here uses (`ScanProgress.vue` states why it is not
 * a `disabled` attribute).
 */
function retryDisable(): void {
  if (!submitting.value) {
    void sessionViewState.requestGlobalDisable();
  }
}
</script>

<template>
  <section v-if="recovery" class="aci-route" aria-labelledby="aci-fence-recovery-heading">
    <h2 id="aci-fence-recovery-heading" tabindex="-1">Disabling personal inspection</h2>
    <p aria-live="polite">
      {{ GLOBAL_DISABLE_STATE_TEXT[recovery.globalDisableInProgress.state] }}
    </p>
    <p class="aci-note">
      All inspection data was removed from this page when disabling started. It stays unavailable
      until disabling finishes; nothing that was removed comes back on its own.
    </p>
    <p v-if="failureMessage" class="aci-error">{{ failureMessage }}</p>
    <p v-if="recovery.globalDisableInProgress.state === 'failed'" class="aci-note">
      You can try again below. If disabling keeps failing, restart the inspector: a restart
      completes the same removal.
    </p>
    <p class="aci-global-fence-recovery__actions">
      <button
        v-if="recovery.globalDisableInProgress.state === 'failed'"
        type="button"
        :aria-disabled="submitting || undefined"
        @click="retryDisable"
      >
        Retry disabling
      </button>
      <button type="button" @click="sessionViewState.refresh()">Check status</button>
    </p>
    <p class="aci-note">
      Nothing on this page updates by itself. Use “Check status” to see whether disabling has
      finished; the inventory returns when it has.
    </p>
  </section>
</template>

<style scoped>
/* The controls wrap rather than scrolling sideways, the shared rule every
   control row follows (WCAG 1.4.10). */
.aci-global-fence-recovery__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0.25rem;
}
</style>
