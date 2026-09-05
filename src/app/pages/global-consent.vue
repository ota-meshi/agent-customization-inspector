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
import { runningGlobalBatch } from '../session/view-state';
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
 * Whether an accepted read is still running. While it is, the panel's summary
 * says a read is in progress and the rows below say what the last refresh
 * returned — two statements about one moment, unless the rows are dated. The predicate is the session module's, because the inventory's rail
 * answers for the same read (`view-state.ts` § runningGlobalBatch).
 */
const runningBatch = computed(() => runningGlobalBatch(sessionViewState.snapshot.value));

/**
 * The Global sequence's committed generation, or null before the sequence
 * exists. Read from the snapshot rather than counted here: one sequence has
 * one number, and the session publishes it (FR-030).
 */
const globalGeneration = computed(() => sessionViewState.snapshot.value?.globalGeneration ?? null);

/**
 * Whether this page's own confirmation was answered and its outcome never
 * landed: the response was an acceptance, or a delivery failure that can hide
 * one, and the refetch that would have brought the committed state settled
 * without adopting a snapshot ({@link SessionViewState.globalEnableState}).
 *
 * That state is the whole of it. Whether the snapshot reports an operation
 * running says nothing about it: when one is running and this page holds a
 * confirmation, the operation *is* this page's, and describing it as a read
 * this page has not taken in would read as someone else's. Nor does how many
 * controls are on screen — what this states is the page's own state, and
 * whether the panel below is drawn is the panel's business.
 */
const ownConfirmationOutcomeUnfetched = computed(
  () => sessionViewState.globalEnableState.value === 'unfetched',
);

/**
 * What every sentence about a read still running ends with, so the reader is
 * told the same thing about where the files appear in each of those states.
 * Where they appear is why anyone waits, and the subject of each sentence is
 * the reading, so `it` is what the read is called back.
 *
 * A read that is over does not carry it: the batch commits before the host
 * answers, so the files are on the inventory already and naming where they
 * will appear would ask the reader to wait for something that has happened.
 */
const READ_DESTINATION = 'The files appear on the inventory when it finishes.';

/**
 * What consent currently amounts to, in one sentence.
 *
 * Derived from the controls, the batch, and this page's own request state
 * rather than from the acceptance response, because that response is a
 * statement about one moment: it says a batch was queued, and repeating it
 * after the batch committed would tell a reader a read is in progress when the
 * reading is over. The controls are the current answer and survive a reload.
 */
const consentSummary = computed(() => {
  if (sessionViewState.globalEnableState.value === 'submitting' && runningBatch.value === null) {
    // Two states, not one: a first consent reads every directory the reader
    // ticked, and a retry reads exactly the subset the same preview can retry
    // (contracts/http-api.md § enable-global `retryableTools`) — so `these
    // directories`, standing over all four rows, would overclaim on a retry.
    //
    // Split on `controls.length` rather than on the count, because that is
    // what the confirm control's own label switches on: split on anything else
    // and a press that says `Try the failed members again` could be answered
    // by a sentence that says `these directories`. The count comes from the
    // retryable subset, which the snapshot already carries and which cannot
    // move while the confirmation is out — no refetch happens until it
    // answers.
    return controls.value.length === 0
      ? `Reading these directories is in progress. ${READ_DESTINATION}`
      : `Reading ${retryableTools.value.length} of these directories is in progress. ${READ_DESTINATION}`;
  }
  if (sessionViewState.globalEnableState.value === 'answered') {
    // The reading this confirmation started is over: the host answers once
    // every admitted member's scan is terminal, with the batch committed
    // (contracts/http-api.md § enable-global), so what is still out is this
    // page's own refetch of the committed state. Saying `in progress` of it
    // would state a read that has finished, and this region is announced.
    //
    // No count: nothing was read on this side, and the number the branch above
    // states is the number of directories being read. The snapshot on screen
    // is still the one from before the confirmation, which is exactly what the
    // refetch replaces, so this branch does not consult it at all.
    return 'Reading finished. The result is loading.';
  }
  if (ownConfirmationOutcomeUnfetched.value) {
    // Before the batch branch, not after it: the refetch failed, so the
    // adopted snapshot is the one from before this confirmation and can still
    // carry an earlier batch. Read in that order, the batch sentence below
    // would count that earlier batch while nothing said this page's own
    // outcome never arrived — and with rows on screen the settled count below would
    // state them as final while a read this page started is unaccounted for,
    // which is the one thing this panel must not do.
    // Which of the two the outcome decides: whether this side is holding an
    // acceptance, or a delivery failure that may still have reached the host.
    // Each carries its own `Refresh status` instruction, because the note the
    // panel draws is about a read that started elsewhere and this one is this
    // page's own.
    return sessionViewState.globalEnableResult.value !== null
      ? 'Your confirmation was accepted, but fetching the result failed. Use “Refresh status” to load the current state.'
      : 'Your confirmation was sent, but its outcome could not be fetched. The host may already be reading; use “Refresh status” to load the current state.';
  }
  const running = runningBatch.value;
  if (running !== null) {
    // `in progress` rather than `being read now`, for the reason the
    // Repository's own `Rescan in progress.` carries: a batch's phase includes
    // `waiting` — queued and not yet started — and the phase itself is from
    // the last refresh, so this side can say neither that the read is running
    // nor that it is queued, and must not claim the distinction.
    return `Reading ${running.tools.length} of these directories is in progress. ${READ_DESTINATION}`;
  }
  if (enableInProgress.value !== null) {
    // An accepted enable this page has not taken in — another tab's, or this
    // one's across a reload — whose batch is not in the adopted snapshot yet.
    // Without this the sentence below would report the rows as settled while
    // a read was running, which is the one thing this panel must not do: the
    // rows are from before that read started, and `Refresh status` above is
    // how a reader holding no command follows it (contracts/http-api.md
    // § enable-global).
    return 'A read this page has not taken in is in progress. Use “Refresh status” to follow it.';
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
 * What this page says while it is fetching its own proposal, written once
 * because the live region announces the same sentence the page renders.
 */
const LOADING_STATUS = "Loading this page's status…";

/**
 * What the block below says when the operation running is not this page's own,
 * written once because the live region announces the same sentence the block
 * renders.
 */
const OTHER_TAB_ENABLING =
  'Personal inspection is already being enabled — possibly from another tab. Use “Refresh status” to follow it.';

/**
 * Whether the rows below the summary are older than what the summary says.
 *
 * The rows are the adopted snapshot's and nothing here updates by itself,
 * which is what keeps WCAG 2.2.2 not applicable — so whenever a read exists
 * that this page has not taken in, the summary and the rows describe two
 * moments and one sentence has to say which is which. Three facts reach that
 * state and the note is owed in each: a batch the snapshot itself carries, an
 * operation the server holds that this page has not adopted — another tab's,
 * or this one's across a reload — and this page's own confirmation before its
 * refetch lands, which covers the confirmation being out, its answer being
 * fetched, and its outcome never arriving. Deriving it from the running batch
 * alone showed the note in the first of the three and hid it in the two the
 * reader is most likely to be looking at.
 *
 * All three are false again exactly when the refetch adopts, which is when
 * the rows became the summary's own moment.
 */
const statusesAreStale = computed(
  () =>
    runningBatch.value !== null ||
    enableInProgress.value !== null ||
    sessionViewState.globalEnableState.value !== 'idle',
);

/**
 * Whether the scan-status panel is on screen: this page holds a confirmation,
 * or the snapshot carries controls a batch published or rejected.
 */
const scanStatusShown = computed(
  () => controls.value.length > 0 || sessionViewState.globalEnableState.value !== 'idle',
);

/**
 * Whether the page is showing an operation it does not own — another tab's
 * enable, or this one's across a reload — which has no controls yet.
 */
const otherTabEnabling = computed(
  () =>
    enableInProgress.value !== null &&
    controls.value.length === 0 &&
    sessionViewState.globalEnableState.value === 'idle',
);

/**
 * Whatever this page's status is at the moment, for the region to announce.
 *
 * The same string reaching two nodes is the shape rather than a duplicate: the
 * region says a state changed, the visible sentence is the state itself, and a
 * reader meets each in its own way — the region when it changes, the paragraph
 * when they navigate to it. The shell does the same with its error
 * (`App.vue` § errorAnnouncement, whose string the visible `.aci-error`
 * paragraph repeats).
 *
 * It is stated here because each visible sentence lives inside a block that
 * appears with the state it describes, so an `aria-live` on one of those is
 * created with its text already in it and announces nothing (W3C ARIA22).
 * This region is mounted empty from the first render, outside every `v-if`,
 * which is what lets it speak at all.
 *
 * One sentence at a time, because the three states are exclusive:
 * {@link otherTabEnabling} requires an idle enable and no controls, which is
 * exactly what {@link scanStatusShown} is false for.
 */
const statusAnnouncement = computed(() =>
  previewState.value === 'loading'
    ? LOADING_STATUS
    : scanStatusShown.value
      ? consentSummary.value
      : otherTabEnabling.value
        ? OTHER_TAB_ENABLING
        : '',
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

/**
 * Whether a confirmation can be made at all, which is what both halves of the
 * control — the checkbox and the button it enables — are shown on.
 *
 * Offered before consent is active, and again while the active consent has
 * members the same preview can retry: an unpublished admitted member, or one
 * rejected for a reason a retry can answer (contracts/http-api.md
 * § enable-global). With consent active and nothing retryable, a confirmation
 * would be refused, so neither half offers it. One value rather than the
 * condition written twice, because the two are one control: a checkbox that
 * outlived its button is a tick with nowhere to go, and left standing after a
 * confirmation it read as an ungranted consent above a panel reporting the
 * directories as read.
 */
const confirmationOffered = computed(
  () =>
    enableInProgress.value === null &&
    (controls.value.length === 0 ||
      (retryableTools.value.length > 0 && pendingTools.value.length === 0)),
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

/**
 * Takes a fresh preview unless a confirmation is out — the click guard behind
 * the recapture control's `aria-disabled`, which keeps the control focusable
 * while keeping the recapture out (`main.css` § button[aria-disabled]).
 */
function recapturePreview(): void {
  if (sessionViewState.globalEnableState.value === 'idle') {
    runAndRefocus(() => sessionViewState.captureConsentPreview());
  }
}

/**
 * Confirms the preview unless a confirmation is already out. The guard is
 * here rather than only inside the command, because a press this page starts
 * nothing for must move nothing either: {@link runAndRefocus} sends focus to
 * the heading, and doing that for a press that dispatched no request would
 * take the reader off the control they pressed for no reason.
 */
function confirmConsent(): void {
  if (sessionViewState.globalEnableState.value === 'idle') {
    runAndRefocus(() => sessionViewState.confirmGlobalConsent());
  }
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

    <!-- Mounted from the first render with nothing in it, because a live region
         added together with its text is not announced (`index.vue` states the
         same rule for the consented homes' arrival, W3C ARIA22). What changes
         is the region's text; the visible sentence below is the state itself,
         and carries no region of its own so the two are not two announcements. -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ statusAnnouncement }}
    </p>

    <!-- Names what is loading, which is this page's own state: the proposal
         is fetched, and no directory is read for it (`view-state.ts`
         § consentPreviewState). -->
    <p v-if="previewState === 'loading'">{{ LOADING_STATUS }}</p>

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
          sessionViewState.globalEnableState.value !== 'idle'
        "
      />

      <!-- The confirmation comes after the preview in document order, so a
           keyboard reader reaches it having passed everything it is about.
           Both halves appear on the one condition that says a confirmation is
           possible ({@link confirmationOffered}). -->
      <p v-if="confirmationOffered">
        <label>
          <input v-model="confirmed" type="checkbox" />
          I have read what would be inspected and I want the inspector to read these files
        </label>
      </p>
      <!-- Inert through `aria-disabled` while the confirmation is out, as
           every momentarily inert control here is (`main.css`
           § button[aria-disabled]): the button keeps its place in the tab
           order and the product's one inert look, and the duplicate press is
           kept out by the command's own guard. -->
      <p v-if="confirmationOffered && confirmed">
        <button
          type="button"
          :aria-disabled="sessionViewState.globalEnableState.value !== 'idle' || undefined"
          @click="confirmConsent"
        >
          {{ controls.length === 0 ? 'Inspect these directories' : 'Try the failed members again' }}
        </button>
      </p>

      <!-- A refused confirmation, stated where the reader is: the preview stays
           on screen, so the refusal has to be rendered beside it rather than in
           the failed-preview branch above, which this state never reaches. -->
      <p v-if="enableFailureText" class="aci-error">{{ enableFailureText }}</p>

      <!-- What consent currently is, taken from the snapshot rather than from
           the confirmation's answer: the controls and the batch status are the
           current state and survive a reload, which is what a reader coming
           back needs to see. While the confirmation is still out, the panel
           says a read is running from this page's own in-flight state,
           because the answer — and the snapshot's batch with it — arrives
           only once the read finished. -->
      <!-- The state of what was consented, in a panel of its own — the same
           treatment the Repository page gives its scan status
           (`ScanProgress.vue`): both are a Source family's current state
           rather than the page's explanation of itself, and a reader coming
           back for it should find the same box on either surface. -->
      <section v-if="scanStatusShown" class="aci-panel">
        <h3>Scan status</h3>
        <!-- The Global sequence's committed generation, which FR-030 puts on
             this Source family's own surface beside its roots, statuses, and
             rescans. Once for the family rather than once per member: the four
             homes commit as one batch into one sequence, so a number per row
             would be one fact written four times. Absent until that sequence
             exists, because there is no committed generation to state before
             the first batch commits. The Repository panel's own idiom
             (`ScanProgress.vue`), so a reader coming from it finds the same
             pair on this surface. -->
        <dl v-if="globalGeneration !== null" class="aci-definition-grid">
          <dt>Committed generation</dt>
          <dd>{{ globalGeneration }}</dd>
        </dl>
        <p>{{ consentSummary }}</p>
        <!-- This surface commands its own reads, as the Repository's does: the
             bar's scan commands stop at the inventory, which is the one surface
             with no panel of its own to carry them (`App.vue`). The note is
             what the button is for — a batch that fails after the acceptance's
             own refresh would otherwise leave a read stated as in progress on
             screen with no error and no retry, because the retry offer is derived from the
             snapshot too and cannot appear until the reader asks for the
             current state. -->
        <!-- Who the refresh is for, in the Repository panel's exact form
             (`ScanProgress.vue`): not the reader who confirmed, whose
             confirmation answers with the read finished, but a reader holding
             no command — a read that began before this page opened, or in
             another tab — whose only way to the result is to ask
             (contracts/http-api.md § get-session, § enable-global). -->
        <!-- Not under the one summary that says a read started here did not
             report its own result: the second sentence would then contradict
             the line above it, and a reader comparing the two doubts the one
             that is true. Every other summary leaves the note true, so this is
             the single case it stands out of (AGENTS.md § Implementation
             simplicity policy — a deviation exists only together with its
             reason). -->
        <p v-if="!ownConfirmationOutcomeUnfetched" class="aci-note">
          Nothing on this page updates by itself. A read you start here reports its own result. Use
          “Refresh status” for a read that started elsewhere — in another tab, or before this page
          opened.
        </p>
        <p>
          <button type="button" @click="sessionViewState.refresh()">Refresh status</button>
        </p>
        <!-- Right after a confirmation the summary above says the directories
             are being read while these rows still say what the last refresh
             returned. The rows are dated rather than re-fetched — nothing
             here updates by itself, which is what keeps WCAG 2.2.2 not
             applicable — so for as long as a read this page has not yet taken
             in exists, one sentence says whose moment the rows are
             ({@link statusesAreStale}). -->
        <p v-if="statusesAreStale" class="aci-note">Statuses below are from the last refresh.</p>
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

      <!-- A live enable operation another tab (or a reload) is following:
           confirming or recapturing would only collect the fixed conflict,
           so the page states the operation and keeps disable available even
           though no control exists yet (data-model.md
           § GlobalEnableOperation).
           `idle` is what says the operation is not this page's own: a page
           holding its own confirmation states that outcome in the panel above,
           and both drawn at once would put two `Refresh status` buttons on
           screen under two sentences about one operation. -->
      <template v-if="otherTabEnabling">
        <p>{{ OTHER_TAB_ENABLING }}</p>
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
        <!-- Inert while a confirmation is out, like the confirm control
             above and through the same `aria-disabled` convention: replacing
             the preview mid-enable would drop the very preview the acceptance
             is binding, and the conflict the request would take reads as a
             failure of an accepted operation. The guard is
             {@link recapturePreview}'s, because the capture itself has none. -->
        <button
          type="button"
          :aria-disabled="sessionViewState.globalEnableState.value !== 'idle' || undefined"
          @click="recapturePreview"
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
