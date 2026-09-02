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
//    before the roots are in front of them. The capture and try-again
//    buttons unmount with their own branch when the answer arrives, which
//    would drop keyboard focus on the body, so their handlers return focus
//    to the page heading — the same landing every navigation uses.
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import GlobalConsentPreview from '../components/consent/GlobalConsentPreview.vue';
import GlobalSourceControls from '../components/consent/GlobalSourceControls.vue';
import DetailNavigation from '../components/inspection/DetailNavigation.vue';
import { useSessionViewState } from '../composables/session-view-state';
import {
  GLOBAL_MEMBER_TEXT,
  GLOBAL_TOOL_FAILURE_TEXT,
  GLOBAL_TOOL_STATE_TEXT,
} from '../../shared/api-text';

const sessionViewState = useSessionViewState();

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

/**
 * What the page's own live region announces when a preview or enable request
 * fails or is refused. The failure branches replace the node that was on
 * screen, and focus has already returned to the heading, so only a region
 * that outlives every branch reaches a screen reader (WCAG 4.1.3; the
 * shell's `aci-live-region` pattern) — the visible rendering stays with its
 * branch, and this announces the same sentence.
 */
const failureAnnouncement = computed(
  () => rejectionText.value ?? sessionViewState.consentPreviewError.value ?? '',
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
 * The authority-free projection of a live enable operation — this tab's own,
 * or another tab's, which a reload or a second tab sees through the snapshot
 * alone. While one runs, offering to confirm or capture again would only
 * collect the fixed `global-enable-in-progress` conflict, and disabling must
 * stay available even though no control exists yet (data-model.md
 * § GlobalEnableOperation).
 */
const enableInProgress = computed(
  () => sessionViewState.snapshot.value?.globalEnableInProgress ?? null,
);

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

/** The page heading, the focus landing for a button that unmounts itself. */
const heading = ref<HTMLHeadingElement | null>(null);

// And the landing on arrival: following a link in an SPA moves no focus by
// itself, so every routed surface puts it on its own heading — the same move
// the detail pages make. Without it focus stayed on the shell's `h1`, which
// names the application rather than the page a reader just opened (WCAG 2.4.3).
onMounted(() => {
  heading.value?.focus();
});

/**
 * Runs one capture or reload and moves focus to the heading: the pressed
 * button unmounts with its branch when the state changes, and an unmounted
 * focus target silently becomes the body — the reader's place on the page
 * would be lost exactly when its content changed (WCAG 2.4.3).
 */
function runAndRefocus(action: () => Promise<void>): void {
  void action();
  void nextTick(() => heading.value?.focus());
}

// A refresh can unmount the very element that held keyboard focus — another
// tab's commit replaces the live-operation branch with the Source controls, and
// another tab's disable replaces the whole page — and focus then falls to the
// document body (WCAG 2.4.3). Watched rather than tied to a control's own
// handler, because the refresh is the bar's now and applies on every route: the
// recovery belongs to the change rather than to whoever asked for it. A refresh
// that changed nothing keeps the reader's place, which is what the body check
// is for — this must not yank focus to the heading on every poll.
watch(
  () => sessionViewState.snapshot.value,
  async () => {
    await nextTick();
    if (document.activeElement === document.body) {
      heading.value?.focus();
    }
  },
);
</script>

<template>
  <div class="aci-global-consent-page aci-route">
    <!-- The way back, drawn in the bar with every other route's moves
         (`DetailNavigation.vue`): a reader looks for it in one place whatever
         surface they are on. A Source page has no neighbouring row to step to,
         so it offers neither move. -->
    <DetailNavigation list-route="/" list-text="the inventory" :previous="null" :next="null" />

    <h2 ref="heading" tabindex="-1">Inspect your personal setup</h2>
    <p class="aci-live-region" role="alert" aria-live="assertive" aria-atomic="true">
      {{ failureAnnouncement }}
    </p>

    <p v-if="previewState === 'loading'" aria-live="polite">Reading the proposed directories…</p>

    <!-- The two states before a preview exist in a panel of their own, as the
         state of what was consented does below and as the Repository page's
         scan status does (`ScanProgress.vue`): the two Source pages state a
         Source's current state, and a reader should find the same box on
         either. -->
    <section v-else-if="previewState === 'missing'" class="aci-panel">
      <p>
        This session has not worked out which directories your personal setup lives in. Nothing has
        been read, and working it out reads nothing either — it looks only at the tools' own
        environment variables.
      </p>
      <button type="button" @click="runAndRefocus(() => sessionViewState.captureConsentPreview())">
        Work out the directories
      </button>
    </section>

    <section v-else-if="previewState === 'failed'" class="aci-panel">
      <p class="aci-error">{{ rejectionText ?? sessionViewState.consentPreviewError.value }}</p>
      <button type="button" @click="runAndRefocus(() => sessionViewState.loadConsentPreview())">
        Try again
      </button>
    </section>

    <template v-else-if="preview">
      <!-- Consent is given at the reader's confirmation, not at the commit
           it leads to: while the enable request is in flight — this tab's own
           (`submitting`) or another tab's, which the snapshot reports as
           `enableInProgress` — the server may already be reading the
           directories, so "nothing has been read yet" must not outlive the
           press wherever it was pressed (FR-013). -->
      <GlobalConsentPreview
        :preview="preview"
        :consent-given="
          controls.length > 0 ||
          enableInProgress !== null ||
          sessionViewState.globalEnableState.value === 'submitting'
        "
      />

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
          enableInProgress === null &&
          (controls.length === 0 || (retryableTools.length > 0 && pendingTools.length === 0))
        "
      >
        <button
          type="button"
          :disabled="sessionViewState.globalEnableState.value === 'submitting'"
          @click="runAndRefocus(() => sessionViewState.confirmGlobalConsent())"
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
      <!-- The state of what was consented, in a panel of its own — the same
           treatment the Repository page gives its scan status
           (`ScanProgress.vue`): both are a Source family's current state
           rather than the page's explanation of itself, and a reader coming
           back for it should find the same box on either surface. -->
      <section v-if="controls.length > 0" class="aci-panel">
        <h3>What is inspected</h3>
        <p aria-live="polite">{{ consentSummary }}</p>
        <!-- This surface commands its own reads, as the Repository's does: the
             bar's scan commands stop at the inventory, which is the one surface
             with no panel of its own to carry them (`App.vue`). The note is
             what the button is for — a batch that fails after the acceptance's
             own refresh would otherwise leave "being read now" on screen with
             no error and no retry, because the retry offer is derived from the
             snapshot too and cannot appear until the reader asks for the
             current state. -->
        <p class="aci-note">
          Nothing on this page updates by itself. Use “Refresh status” to see the result of a read
          that is still running.
        </p>
        <p>
          <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
        </p>
        <ul class="aci-global-consent-page__outcomes">
          <li v-for="control in controls" :key="control.member">
            {{ GLOBAL_MEMBER_TEXT[control.member] }} — {{ GLOBAL_TOOL_STATE_TEXT[control.state] }}
            <template v-if="control.failureCode">
              · {{ GLOBAL_TOOL_FAILURE_TEXT[control.failureCode] }}
            </template>
          </li>
        </ul>
        <!-- Each published home's own root, status, and rescan (T1153). They
             are here rather than over the inventory for the reason every
             Source's state is: they are facts about a Source rather than an
             inventory of files, and this is that family's own surface — the
             one that already explains and manages what is inspected outside
             the repository (FR-013, FR-030). Over the inventory they also said
             a second time what this page had already said. -->
        <GlobalSourceControls />
        <p v-if="batchStatus?.failureRef?.kind === 'error'" class="aci-error">
          Reading failed: {{ batchStatus.failureRef.message }}
        </p>
        <!-- The same way out the inventory's summary offers, stated where
             consent itself is decided (FR-042). -->
        <p>
          <button
            type="button"
            :aria-disabled="sessionViewState.globalDisableState.value === 'submitting' || undefined"
            @click="sessionViewState.requestGlobalDisable()"
          >
            Disable personal inspection
          </button>
        </p>
        <p class="aci-note">
          Disabling removes every personal-setup result from this session. Your repository results
          are untouched, and enabling again later asks for consent again.
        </p>
      </section>

      <!-- A confirmation whose outcome has not landed: the response was an
           acceptance, or a delivery failure that can hide one, and the
           refetch failed — so the stale preview is on screen with no
           controls. The hold in `SessionViewState.confirmGlobalConsent`
           keeps confirm and recapture out; Refresh is the way forward, and
           Disable stays offered because the host may already be reading
           (contracts/http-api.md § disable-global: disable is available in
           every state). -->
      <template
        v-if="
          sessionViewState.globalEnableState.value === 'submitting' &&
          controls.length === 0 &&
          enableInProgress === null
        "
      >
        <p aria-live="polite">
          {{
            sessionViewState.globalEnableResult.value !== null
              ? 'Your confirmation was accepted, but fetching the result failed. Use “Refresh status” to load the current state.'
              : 'Your confirmation was sent, but its outcome could not be fetched. The host may already be reading; use “Refresh status” to load the current state.'
          }}
        </p>
        <p>
          <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
          <button
            type="button"
            :aria-disabled="sessionViewState.globalDisableState.value === 'submitting' || undefined"
            @click="sessionViewState.requestGlobalDisable()"
          >
            Disable personal inspection
          </button>
        </p>
      </template>

      <!-- A live enable operation another tab (or a reload) is following:
           confirming or recapturing would only collect the fixed conflict,
           so the page states the operation and keeps disable available even
           though no control exists yet (data-model.md
           § GlobalEnableOperation). -->
      <template v-if="enableInProgress !== null && controls.length === 0">
        <p aria-live="polite">
          Personal inspection is already being enabled — possibly from another tab. Use “Refresh
          status” to follow it.
        </p>
        <p>
          <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
          <button
            type="button"
            :aria-disabled="sessionViewState.globalDisableState.value === 'submitting' || undefined"
            @click="sessionViewState.requestGlobalDisable()"
          >
            Disable personal inspection
          </button>
        </p>
      </template>

      <p v-if="enableInProgress === null && controls.length === 0">
        <!-- Disabled while a confirmation is in flight, like the confirm
             control above: replacing the preview mid-enable would drop the
             very preview the acceptance is binding, and the conflict the
             request would take reads as a failure of an accepted operation. -->
        <button
          type="button"
          :disabled="sessionViewState.globalEnableState.value === 'submitting'"
          @click="runAndRefocus(() => sessionViewState.captureConsentPreview())"
        >
          Work the directories out again
        </button>
      </p>
    </template>
  </div>
</template>

<style scoped>
/* The page's own prose takes the shared measure (`main.css` § --aci-measure),
   which is every explanatory paragraph's in this product. */
.aci-global-consent-page :where(p, li) {
  max-inline-size: var(--aci-measure);
}

.aci-global-consent-page__outcomes {
  margin: 0 0 1rem;
  padding-inline-start: 1.25rem;
}
</style>
