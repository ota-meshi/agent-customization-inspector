<script setup lang="ts">
// T942: the Global consent route (FR-013 through FR-018,
// contracts/http-api.md § get-global-consent-preview,
// § create-global-consent-preview).
//
// This page is where a reader decides whether to let the inspector read their
// personal setup. It shows what would be read, asks for an explicit
// confirmation, and sends exactly that: the preview's own two identities and no
// tool list, because the reader confirmed the whole preview and a client-side
// subset would be a narrower consent than the one on screen (T960).
//
// The confirmation control appears only once a preview is on screen and the
// checkbox is ticked, so there is no moment at which it could be pressed for a
// preview nobody read. It is absent rather than disabled while unticked: a
// disabled control invites the reader to look for what would enable it, and
// the answer is the checkbox directly above it.
//
// Three things it owns beyond rendering:
//
//  - Loading. It reads the current preview on mount, because a reader arriving
//    from a fresh launch has none and a reader coming back from elsewhere may
//    have one already frozen. The read never captures, so arriving on this
//    page is not itself an act with consequences.
//  - Recovery. A preview that the host no longer holds — a restarted session,
//    a purge — is not something this page can repair by re-reading, so it
//    offers to take a fresh one. That is the only capture on this page, and it
//    happens because the reader asked.
//  - Focus. The shell moves focus to its own heading on navigation; what this
//    page adds is that the confirmation checkbox is reachable by keyboard in
//    document order after the preview it is about, so nobody can confirm
//    before the roots are in front of them.
import { computed, inject, onMounted, ref, watch } from 'vue';
import { NuxtLink } from '#components';
import GlobalConsentPreview from '../components/consent/GlobalConsentPreview.vue';
import { SESSION_VIEW_STATE } from '../session/view-state';
import {
  GLOBAL_MEMBER_TEXT,
  GLOBAL_TOOL_FAILURE_TEXT,
  GLOBAL_TOOL_STATE_TEXT,
} from '../../shared/api-text';

const sessionViewState = inject(SESSION_VIEW_STATE);
if (sessionViewState === undefined) {
  // The shell always provides it before rendering a route; its absence is a
  // wiring bug, and failing loudly beats a consent page with no session
  // behind it.
  throw new Error('the session view state was not provided by the shell');
}

const preview = sessionViewState.consentPreview;
const previewState = sessionViewState.consentPreviewState;

/**
 * Whether the reader has ticked the confirmation. Local page state: it is not
 * sent anywhere, and leaving the page clears it — a confirmation that survived
 * navigation would be a decision the reader could not see they had made.
 */
const confirmed = ref(false);

/**
 * The sentence a refused call is stated as. Written here because this is where
 * it is rendered, as the scan status's own refusal copy is; the codes it names
 * are the conflicts the pair can take once the enable and disable operations
 * exist (contracts/http-api.md § Common results and errors).
 */
const rejectionText = computed(() => {
  switch (sessionViewState.consentPreviewRejection.value) {
    case 'consent-preview-frozen':
      return 'Personal inspection is already enabled, so this preview cannot be replaced. Disable it first.';
    case 'global-enable-in-progress':
      return 'Personal inspection is being enabled right now. Wait for that to finish.';
    case 'global-disable-pending':
      return 'Personal inspection is being disabled right now. Wait for that to finish.';
    case null:
      return null;
    default:
      return 'The local session refused this request. Reload this page and try again.';
  }
});

/**
 * What consent currently amounts to, in one sentence.
 *
 * Derived from the controls and the batch rather than from the acceptance
 * response, because that response is a statement about one moment: it says a
 * batch was queued, and repeating it after the batch committed would tell a
 * reader their files are "being read now" when the reading is over. The
 * controls are the current answer and survive a reload.
 */
const consentSummary = computed(() => {
  const running = batchStatus.value !== null && batchStatus.value.phase !== 'failed';
  if (running) {
    const count = batchStatus.value!.tools.length;
    return `${count} of these directories ${
      count === 1 ? 'is' : 'are'
    } being read now. The files appear on the inventory when the read finishes.`;
  }
  const published = controls.value.filter((control) => control.state === 'published').length;
  if (batchStatus.value?.phase === 'failed') {
    // A batch that failed may have read some of what it was reading, so
    // "nothing was read" would be a claim this page cannot make. What went
    // wrong is stated below in its own line, and the per-tool statuses say
    // which tools it was about.
    return 'Reading stopped before it finished. Your confirmation is still in effect: what went wrong is below, and you can try again.';
  }
  if (published === 0) {
    return 'Nothing could be inspected, so nothing was read. Your confirmation is still in effect: fix what the statuses below name and try again.';
  }
  return `${published} of these directories ${
    published === 1 ? 'was' : 'were'
  } read. Their files are on the inventory.`;
});

/**
 * The sentence a refused or failed confirmation is stated as, or null.
 *
 * Rendered beside the preview rather than in the page's failed-preview branch:
 * a refused confirmation leaves the preview on screen, so that branch is never
 * reached and a message put only there would never be seen.
 */
const enableFailureText = computed(
  () => rejectionText.value ?? sessionViewState.consentPreviewError.value,
);

// A fresh preview is a different set of proposed directories, so a
// confirmation given for the previous one cannot carry over: the reader
// confirms what is currently on screen or nothing.
watch(preview, () => {
  confirmed.value = false;
});

/** The per-tool controls the snapshot published, in the fixed tool order. */
const controls = computed(() => sessionViewState.snapshot.value?.globalControl?.controls ?? []);

/**
 * The server-derived same-preview retry subset while consent is active
 * (contracts/http-api.md § enable-global `retryableTools`): unpublished
 * non-pending admitted members and same-preview rejected members. Nonempty is
 * what keeps the confirmation offered — the same confirmation retries exactly
 * this subset — and empty is the state a re-confirmation would be refused in.
 */
const retryableTools = computed(
  () => sessionViewState.snapshot.value?.globalControl?.retryableTools ?? [],
);

/**
 * The admitted subset an accepted batch is still running for. Nonempty
 * withdraws the retry offer: during a non-failed active batch the retryable
 * tools are informational only, and a confirmation would take the
 * `global-enable-in-progress` conflict (contracts/http-api.md
 * § enable-global).
 */
const pendingTools = computed(
  () => sessionViewState.snapshot.value?.globalControl?.pendingTools ?? [],
);

/** The accepted batch's status while one is running or has failed. */
const batchStatus = computed(
  () => sessionViewState.snapshot.value?.globalControl?.batchStatus ?? null,
);

onMounted(() => {
  // A read, never a capture: arriving here must not change what the host
  // holds, so the page shows whatever preview exists and offers to take one
  // when none does.
  void sessionViewState.loadConsentPreview();
});
</script>

<template>
  <div class="aci-global-consent-page">
    <h2>Inspect your personal setup</h2>

    <p v-if="previewState === 'loading'" aria-live="polite">Reading the proposed directories…</p>

    <template v-else-if="previewState === 'missing'">
      <p>
        This session has not worked out which directories your personal setup lives in. Nothing has
        been read, and working it out reads nothing either — it looks only at the tools' own
        environment variables.
      </p>
      <button type="button" @click="sessionViewState.captureConsentPreview()">
        Work out the directories
      </button>
    </template>

    <template v-else-if="previewState === 'failed'">
      <p class="aci-error">{{ rejectionText ?? sessionViewState.consentPreviewError.value }}</p>
      <button type="button" @click="sessionViewState.loadConsentPreview()">Try again</button>
    </template>

    <template v-else-if="preview">
      <GlobalConsentPreview :preview="preview" :consent-given="controls.length > 0" />

      <!-- The confirmation comes after the preview in document order, so a
           keyboard reader reaches it having passed everything it is about. -->
      <p>
        <label>
          <input v-model="confirmed" type="checkbox" />
          I have read what would be inspected and I want the inspector to read these files
        </label>
      </p>
      <!-- Offered before consent is active, and again while the active
           consent has members the same preview can retry — an unpublished
           admitted member, or one rejected for a reason a retry can answer
           (contracts/http-api.md § enable-global). With consent active and
           nothing retryable, a confirmation would be refused, so no control
           offers it. -->
      <p
        v-if="
          confirmed &&
          (controls.length === 0 || (retryableTools.length > 0 && pendingTools.length === 0))
        "
      >
        <button
          type="button"
          :disabled="sessionViewState.globalEnableState.value === 'submitting'"
          @click="sessionViewState.confirmGlobalConsent()"
        >
          {{ controls.length === 0 ? 'Inspect these directories' : 'Try the failed members again' }}
        </button>
      </p>

      <!-- A refused confirmation, stated where the reader is: the preview stays
           on screen, so the refusal has to be rendered beside it rather than in
           the failed-preview branch above, which this state never reaches. -->
      <p v-if="enableFailureText" class="aci-error">{{ enableFailureText }}</p>

      <!-- What consent currently is, taken from the snapshot rather than from
           the acceptance response. The response describes one moment — the one
           the batch was queued in — and stops being true as soon as it
           commits, while the controls and the batch status are the current
           state and survive a reload, which is what a reader coming back needs
           to see. -->
      <template v-if="controls.length > 0">
        <h3>What is inspected</h3>
        <p aria-live="polite">{{ consentSummary }}</p>
        <ul class="aci-global-consent-page__outcomes">
          <li v-for="control in controls" :key="control.member">
            {{ GLOBAL_MEMBER_TEXT[control.member] }} — {{ GLOBAL_TOOL_STATE_TEXT[control.state] }}
            <template v-if="control.failureCode">
              · {{ GLOBAL_TOOL_FAILURE_TEXT[control.failureCode] }}
            </template>
          </li>
        </ul>
        <p v-if="batchStatus?.failureRef?.kind === 'error'" class="aci-error">
          Reading failed: {{ batchStatus.failureRef.message }}
        </p>
      </template>

      <p v-if="controls.length === 0">
        <button type="button" @click="sessionViewState.captureConsentPreview()">
          Work the directories out again
        </button>
      </p>
    </template>

    <p>
      <NuxtLink to="/">Go to the inventory</NuxtLink>
    </p>
  </div>
</template>

<style scoped>
.aci-global-consent-page {
  /* A consent decision is prose to read, so the column is measured for
     reading rather than stretched to the shell's width. */
  max-width: 70ch;
}

.aci-global-consent-page__outcomes {
  margin: 0 0 1rem;
  padding-inline-start: 1.25rem;
}
</style>
