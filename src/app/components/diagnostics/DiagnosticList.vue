<script setup lang="ts">
// Actionable diagnostics for the current session (T072).
//
// Every diagnostic's text, severity, and scope come from
// `DIAGNOSTIC_REGISTRY`, keyed by the code the wire DTO carries. Nothing is
// composed here: a message states what happened and what the user can do
// about it, and those sentences are fixed beside the closed code union so a
// new code cannot ship without one.
//
// A diagnostic is an Inspector-side outcome, never a verdict about the
// inspected file. "Could not be read" is a fact about this scan; it is not a
// claim that the file is invalid, unsupported, or wrong for its vendor.
//
// File-scoped records are rendered on their own row by each kind's row
// component, so what reaches this list is the source-scoped records that have
// no row to attach to — otherwise the same record would appear twice. Which
// records those are is the page's answer rather than this component's, because
// the rail states how many there are before the list is opened and one
// selection must not be made twice (`pages/index.vue`
// § sourceScopedDiagnostics). Source is the widest scope there is: every
// diagnostic belongs to a Source, however long it lives (data-model.md
// § Diagnostic).
//
// Every row therefore names its Source before its message. The only
// source-scoped code that ships is `root-unreadable`, so the message is the
// same sentence on every row and the Source is the one thing that tells two
// rows apart — with the personal setup consented, two unreadable homes would
// otherwise stand as one sentence written twice. `SerializedDiagnostic`
// carries `sourceId` under both scope shapes, so nothing is requested for
// this (api-types.ts § SerializedDiagnostic).
//
// No row states its severity, as a word or as a colour. The row disclosures
// that carry a file's own diagnostic already settled this — their badge does
// not draw the registry's severity, because the sentence they disclose is what
// says which it is (`RowDiagnostics.vue`) — and one registry cannot be read two
// ways by two surfaces. So the leading edge is one colour: it marks where a row
// begins, and the message carries the outcome as fact ("does not exist or
// cannot be read"), which is what WCAG 1.4.1 asks.
import { computed } from 'vue';
import ToolMark from '../ToolMark.vue';
import { DIAGNOSTIC_REGISTRY } from '../../../shared/diagnostics';
import { GLOBAL_MEMBER_TEXT, SOURCE_KIND_TEXT } from '../../../shared/api-text';
import type { GlobalMemberId, SerializedDiagnostic, SourceDto } from '../../../shared/api-types';
import type { SupportedTool } from '../../../shared/entities';

const props = defineProps<{
  /** The source-scoped diagnostics of the committed generation. */
  diagnostics: readonly SerializedDiagnostic[];
  /**
   * The committed generation's Sources, which is where a row's `sourceId`
   * resolves to the name and root it states.
   */
  sources: readonly SourceDto[];
}>();

/**
 * Which product's mark stands for each Global member. Three of the four
 * members are one product's own home and are found by that product's mark;
 * `~/.agents` is read by more than one product (FR-045), so it is named and
 * not drawn. `Readonly<Record<GlobalMemberId, …>>` so a new member cannot
 * compile without an answer (AGENTS.md § User-visible copy policy).
 */
const GLOBAL_MEMBER_MARK: Readonly<Record<GlobalMemberId, SupportedTool | null>> = {
  /** `~/.config/github-copilot` and its siblings: Copilot's own directory. */
  copilot: 'copilot',
  /** `~/.claude`: Claude Code's own directory. */
  claude: 'claude',
  /** `~/.codex`: Codex's own directory. */
  codex: 'codex',
  /** `~/.agents`: read by more than one product, so no one mark stands for it. */
  agents: null,
};

/** What a row calls a Source the committed generation no longer carries. */
const UNKNOWN_SOURCE_TEXT = 'Unknown source';

/** One row: the Source it belongs to, and the registry's sentence for its code. */
interface DiagnosticRow {
  /** The record's own opaque identity, which keys the row. */
  readonly diagnosticId: string;
  /** The registry's message for this code; nothing is composed here. */
  readonly message: string;
  /** The mark for the Source's member, or null where no one product owns it. */
  readonly mark: SupportedTool | null;
  /** What this Source is called, in the words every other surface calls it. */
  readonly sourceText: string;
  /**
   * The escaped presentation of the directory the Source was admitted at —
   * never a path anything can open (FR-002) — or null when the Source is not
   * in the committed generation.
   */
  readonly root: string | null;
}

/**
 * The rows, each resolved against the committed Sources. A diagnostic whose
 * Source is not in the generation still states its message: the record is what
 * the reader came for, and an unresolved Source is stated as no name rather
 * than as a row that vanishes.
 */
const rows = computed<readonly DiagnosticRow[]>(() =>
  props.diagnostics.map((diagnostic) => {
    const source = props.sources.find((candidate) => candidate.sourceId === diagnostic.sourceId);
    const entry = DIAGNOSTIC_REGISTRY[diagnostic.code];
    return {
      diagnosticId: diagnostic.diagnosticId,
      message: entry.message,
      mark:
        source?.member === undefined || source.member === null
          ? null
          : GLOBAL_MEMBER_MARK[source.member],
      sourceText:
        source === undefined
          ? UNKNOWN_SOURCE_TEXT
          : source.member === null
            ? SOURCE_KIND_TEXT[source.kind]
            : GLOBAL_MEMBER_TEXT[source.member],
      root: source?.boundary.displayRoot ?? null,
    };
  }),
);
</script>

<template>
  <!-- Scoped to what this list owns. File-scoped records are shown on their
       own rows, so "no diagnostics" would deny records visible on the same
       screen. -->
  <div v-if="rows.length === 0" class="aci-empty-result">
    <p class="aci-empty-result__statement">No source-level diagnostics.</p>
  </div>
  <ul v-else class="aci-notices" role="list">
    <li v-for="row in rows" :key="row.diagnosticId" class="aci-diagnostic-list__row">
      <span class="aci-diagnostic-list__edge" aria-hidden="true" />
      <div class="aci-diagnostic-list__body">
        <!-- Where, before what happened: this list's rows carry one sentence
             between them, so the Source is what a reader reads them apart
             by. -->
        <p class="aci-diagnostic-list__where">
          <ToolMark v-if="row.mark !== null" decorative :tool="row.mark" />
          {{ row.sourceText }}
          <span v-if="row.root !== null" class="aci-path aci-muted">{{ row.root }}</span>
        </p>
        <p class="aci-diagnostic-list__message">{{ row.message }}</p>
      </div>
    </li>
  </ul>
</template>

<style scoped>
.aci-diagnostic-list__row {
  border-block-end: 1px solid var(--aci-hairline);
  display: flex;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
}

.aci-diagnostic-list__row:last-child {
  border-block-end: 0;
}

/* The leading edge, drawn as its own element rather than as the row's border:
   it stands inside the box's rounded corners, where a row border would meet
   them. One colour, not the registry's severity: the row disclosures that
   carry a file's own diagnostic draw none either, and one registry read two
   ways by two surfaces is two answers to one question
   (`RowDiagnostics.vue`). It marks where a row begins; the message states the
   outcome in words (WCAG 1.4.1). */
.aci-diagnostic-list__edge {
  background: var(--aci-danger);
  border-radius: 0.125rem;
  flex: 0 0 3px;
}

/* `min-inline-size` because an escaped root has no break opportunities of its
   own, and a flex item takes every pixel such a value asks for. */
.aci-diagnostic-list__body {
  min-inline-size: 0;
}

.aci-diagnostic-list__where {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  font-size: 0.6875rem;
  gap: 0.4375rem;
  margin: 0;
}

.aci-diagnostic-list__message {
  font-size: 0.71875rem;
  margin: 0.1875rem 0 0;
  max-inline-size: var(--aci-measure);
}
</style>
