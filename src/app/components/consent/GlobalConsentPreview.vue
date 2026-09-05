<script setup lang="ts">
// T941: the consent preview presentation (FR-013 through FR-018,
// contracts/http-api.md § create-global-consent-preview).
//
// What this component renders is what a reader is being asked to authorize:
// four proposed directories, how each one was arrived at, and — for the ones
// nothing can be inspected under — why. It renders no per-pattern path list,
// because none exists: what is read below an admitted root is fixed by the
// shipped traversal plan the version pair identifies, so the read scope is
// explained in plain language and the exclusions are named by the rules that
// exclude them.
//
// Every root is shown through `displayRoot`, the one-way escaping. It is not a
// path the reader can open and it grants no read access — the note under the
// table says so, for the same reason the inventory's own root label does
// (FR-002). No control here confirms anything: submitting consent is the
// enable operation's, and this component has no way to reach it.
//
// Neither version this preview binds is rendered. The confirmation submits
// both, and the host refuses one that no longer matches its own — but a reader
// can do nothing with either string: they cannot look it up, and the refusal it
// guards cannot happen while they are looking at the page, because the values
// are build constants and a new build has no preview to confirm. What answers
// "what was read" is the inventory the confirmation produces and the exclusions
// stated below (AGENTS.md § Implementation simplicity policy).
//
// The exclusions are stated twice, and deliberately: the paragraph names the
// categories, which is what a reader decides from, and the list below names
// the tool each shipped exclusion is about, which is what they can check
// against their own home. The list is derived from `excludedRuleIds`, so it
// holds exactly the Global-scoped exclusions the shipped catalog carries.
//
// The sentence beside each tool is fixed rather than per rule: an exclusion's
// `kind` is null by construction — it spans kinds — so the only renderable
// field a rule record holds is its tool, and a Global exclusion is by
// construction the rest of that tool's home. A per-rule sentence would be
// prose the registry does not have.
import { computed } from 'vue';
import {
  GLOBAL_MEMBER_TEXT,
  GLOBAL_ROOT_INPUT_STATE_TEXT,
  GLOBAL_ROOT_ORIGIN_TEXT,
} from '../../../shared/api-text';
import { SUPPORTED_TOOL_TEXT } from '../../../shared/entities';
import { INSPECTION_RULES } from '../../../shared/registries/inspection-rules';
import type { GlobalConsentPreviewDto } from '../../../shared/api-types';

/** What the consent page hands this component. */
interface Props {
  /** The frozen preview to review; the page owns loading and recovery. */
  readonly preview: GlobalConsentPreviewDto;
  /**
   * Whether the reader has confirmed this preview — an in-flight enable
   * request included, because the server may already be reading the
   * directories before its commit is adopted. It decides one sentence: what
   * "nothing has been read yet" describes is the act of working the
   * directories out, which stops being the whole truth at the confirmation.
   */
  readonly consentGiven: boolean;
}

const props = defineProps<Props>();

/**
 * One row per shipped Global exclusion, named by the tool whose directory it
 * is about. The rule ID itself is never rendered: it is a token a contract gate
 * is checked against, and to someone reading their own files it stands where an
 * answer should be (AGENTS.md § User-visible copy policy).
 *
 * The lookup needs no miss branch — the DTO types the IDs as the closed
 * `RuleId` union and the registry is complete over it — and a `shared`
 * cross-vendor exclusion is named as applying to every tool rather than looked
 * up in a table that does not cover it.
 */
const exclusions = computed(() =>
  props.preview.excludedRuleIds.map((ruleId) => {
    const tool = INSPECTION_RULES[ruleId].tool;
    return { ruleId, tool: tool === 'shared' ? 'Every tool' : SUPPORTED_TOOL_TEXT[tool] };
  }),
);
</script>

<template>
  <div class="aci-global-consent-preview">
    <!-- Future tense before a confirmation, past after it, on the same value
         the paragraph below branches on: a reader returning to this page has
         already made the decision, and a heading still proposing it says the
         decision is outstanding. -->
    <h3>{{ consentGiven ? 'What your confirmation covers' : 'What would be inspected' }}</h3>
    <p>
      Inspecting your personal setup means reading the customization files each tool documents in
      its own configuration directory — instructions, and the skills, agents, prompts and commands,
      rules, permission policies, hooks, settings, output styles, and server declarations the tool
      reads from there — plus the shared agent directory that Codex and Copilot both read skills
      from, where Codex also reads the personal plugin marketplace file. Nothing else in those
      directories is read: not credentials, not saved sessions, and not anything the tools generate
      for themselves. Installed plugin copies are not read either — a marketplace file says where
      each plugin comes from and is read as that list, while the plugin folders it points at stay
      unread.
    </p>
    <!-- Two sentences for two states, because the same page shows this preview
         before a confirmation and after one: "nothing has been read" is true of
         working the directories out, and false once a confirmation's batch has
         read them. -->
    <p v-if="consentGiven">
      These four directories are the ones your confirmation covers. They are what the tools' own
      environment variables and documented defaults point at, worked out from those values alone.
    </p>
    <p v-else>
      Nothing below has been read yet. These four directories are what the tools' own environment
      variables and documented defaults point at, worked out from those values alone.
    </p>

    <!-- `tabindex` because the table is its own horizontal scroll container: a
         long proposed root pushes the origin and status columns past its right
         edge, and WebKit does not make a scrollable overflow container
         keyboard focusable on its own — so a reader with no pointer could hear
         those columns and never bring them into view (WCAG 2.1.1). The caption
         below names what focus has landed on. -->
    <table class="aci-global-consent-preview__roots" tabindex="0">
      <caption class="aci-global-consent-preview__caption">
        {{
          consentGiven ? 'The four directories' : 'The four proposed directories'
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">Directory of</th>
          <th scope="col">Proposed directory</th>
          <th scope="col">Where it came from</th>
          <th scope="col">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in preview.entries" :key="entry.member">
          <th scope="row">{{ GLOBAL_MEMBER_TEXT[entry.member] }}</th>
          <td class="aci-path">
            <span v-if="entry.displayRoot === ''" class="aci-muted">(empty)</span>
            <template v-else>{{ entry.displayRoot }}</template>
          </td>
          <td>{{ GLOBAL_ROOT_ORIGIN_TEXT[entry.origin] }}</td>
          <td>{{ GLOBAL_ROOT_INPUT_STATE_TEXT[entry.inputState] }}</td>
        </tr>
      </tbody>
    </table>
    <!-- The table's own note, so it takes the table's width rather than the
         page's reading measure: it qualifies the column above it, and stopping
         two-thirds of the way across read as a line that failed to reach its
         own column. -->
    <p class="aci-note aci-global-consent-preview__roots-note">
      Each directory is shown as an escaped presentation of the value it came from. It is not a path
      you can open and grants no read access.
    </p>

    <template v-if="exclusions.length > 0">
      <h3>What stays excluded</h3>
      <p>Nothing else in these directories is read, whatever you confirm here.</p>
      <!-- The sentence once, then who it is recorded for. Every member's
           exclusion says the same thing — the registry holds one categorical
           rule per product, not prose about each — so stating it per product
           printed one thirty-word sentence four times with only the leading
           name different. Said once as the lead and listed under it, both
           facts the record carries survive: what is excluded, and which
           products carry a shipped exclusion.

           The examples name only what every member's exclusion covers:
           "settings" is not among them, because Copilot's own settings
           document is one of the files the confirmation admits (FR-015),
           while "everything else" still covers the settings a member's rules
           do not admit. -->
      <p>
        For each product below, everything the read scope above does not name: credentials, saved
        sessions, caches, installed plugin copies, state the tool keeps outside these directories,
        and anything it generates for itself.
      </p>
      <ul class="aci-global-consent-preview__exclusions">
        <li v-for="exclusion in exclusions" :key="exclusion.ruleId">{{ exclusion.tool }}</li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
/* Prose takes the shared measure (`main.css` § --aci-measure); the table of
   frozen roots below does not, because an absolute path held to a reading
   measure wraps to four lines and the roots are what the decision rests on
   (FR-013). At the shell's full width these paragraphs ran to about 150
   characters a line. */
.aci-global-consent-preview :where(p, li) {
  max-inline-size: var(--aci-measure);
}

/* The note under the table is the table's, not the page's prose: held to the
   reading measure it ended two-thirds of the way across a full-width table,
   which reads as a line that failed to reach its own column. */
.aci-global-consent-preview__roots-note {
  max-inline-size: none;
}

.aci-global-consent-preview__roots {
  width: 100%;
  border-collapse: collapse;
  /* A proposed root can be long, and an escaped one longer: the table scrolls
     inside itself rather than widening the page. */
  display: block;
  overflow-x: auto;
}

.aci-global-consent-preview__exclusions {
  margin: 0 0 1rem;
  padding-inline-start: 1.25rem;
}

.aci-global-consent-preview__caption {
  text-align: start;
  padding-block-end: 0.25rem;
  color: var(--aci-muted);
}

.aci-global-consent-preview__roots :is(th, td) {
  text-align: start;
  padding: 0.35rem 0.75rem 0.35rem 0;
  border-block-end: 1px solid var(--aci-line);
  vertical-align: top;
}
</style>
