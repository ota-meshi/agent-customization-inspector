<script setup lang="ts">
// Recognition-metadata comparison rows (T198; FR-011, FR-012). The data
// decisions — which recognitions pair up, which declared keys match, what
// "equal" means — live in `recognition-comparison.ts`; this component only
// draws the groups it is given.
//
// Every value is rendered through the same value components the skill detail
// uses, so a resolved value looks the same wherever it is shown, and through
// Vue text bindings only: nothing here is markup, a link, or a URI, and no
// value is masked, shortened, or reflowed (FR-025, FR-033). The rows state
// literal facts — declared, not declared, same resolved value, different
// resolved values — and no row ranks, orders, or prefers either file
// (FR-012).
import FrontmatterBlock from '../inspection/FrontmatterBlock.vue';
import FrontmatterValueText from '../inspection/FrontmatterValueText.vue';
import {
  CUSTOMIZATION_KIND_TEXT,
  SUPPORTED_TOOL_TEXT,
  encodeRootPresentation,
  inlinePresentationLabel,
  rendersNothingVisible,
} from '../../../shared/entities';
import { FRONTMATTER_KEY_KIND_TEXT } from '../../../shared/api-text';
import {
  RECOGNITION_SIDE_STATE_TEXT,
  type DeclarationComparisonRow,
  type RecognitionComparisonGroup,
} from './recognition-comparison';
import type { FrontmatterValueDto } from '../../../shared/api-types';

defineProps<{
  /** The built groups, one per recognizing tool; see the data module. */
  groups: readonly RecognitionComparisonGroup[];
}>();

/**
 * The row header's accessible name: the spelled-out key plus the notes the
 * cell shows. The visible cell keeps the parser's resolved spelling under
 * `pre-wrap`, but the accessible-name computation collapses whitespace, so
 * two keys differing only in it would read as one header without this
 * (FR-025); the spelled-out form keeps each row's values attributable to
 * their own key. An authored key that happens to spell one of the notes
 * stays as authored — matching this product's own copy against authored
 * text would turn display wording into load-bearing syntax, and the source
 * comparison beside these rows keeps the exact spelling.
 */
function rowHeaderLabel(row: DeclarationComparisonRow): string {
  const parts = [inlinePresentationLabel(row.key)];
  if (row.key === '') {
    parts.push('(empty key)');
  } else if (rendersNothingVisible(row.key)) {
    parts.push('(key with no visible characters)');
  }
  if (row.keyKind !== 'string') {
    parts.push(`(${FRONTMATTER_KEY_KIND_TEXT[row.keyKind]})`);
  }
  return parts.join(' ');
}

/** Whether a value renders inline or opens a nested block of its own. */
function opensBlock(value: FrontmatterValueDto): boolean {
  return (
    (value.kind === 'sequence' && value.items.length > 0) ||
    (value.kind === 'mapping' && value.entries.length > 0)
  );
}
</script>

<template>
  <div class="aci-recognition-comparison">
    <!-- Count-neutral, because a one-sided pair reaches this note too: one
         present file no recognition owns, beside its stated absence
         (FR-011). -->
    <p v-if="groups.length === 0" class="aci-note">
      No compared file here carries a recognition, so there is no recognition metadata to compare.
      The source comparison above is the whole comparison.
    </p>
    <!-- One group per (tool, kind) pair, in the contracted tool order: each
         recognition stays distinguishable from the physical file
         (US3 scenario 2), captioned in words (AGENTS.md § User-visible copy
         policy). -->
    <section v-for="group in groups" :key="group.tool">
      <h4>{{ SUPPORTED_TOOL_TEXT[group.tool] }} · {{ CUSTOMIZATION_KIND_TEXT[group.kind] }}</h4>
      <p v-if="group.left !== 'recognized'" class="aci-note">
        First file: {{ SUPPORTED_TOOL_TEXT[group.tool] }}
        {{ RECOGNITION_SIDE_STATE_TEXT[group.left] }}
      </p>
      <p v-if="group.right !== 'recognized'" class="aci-note">
        Second file: {{ SUPPORTED_TOOL_TEXT[group.tool] }}
        {{ RECOGNITION_SIDE_STATE_TEXT[group.right] }}
      </p>
      <!-- Two recognized sides with nothing declared would otherwise leave
           the section as a bare heading: the states above speak only for
           unrecognized or failed sides, and the table below only for matched
           keys, so this case states itself. -->
      <p
        v-if="
          group.left === 'recognized' &&
          group.right === 'recognized' &&
          group.declarations.length === 0
        "
        class="aci-note"
      >
        Both files are recognized as this kind; neither declares a key to compare.
      </p>
      <!-- The matched declared keys, one row each, with both resolved values
           in full (FR-011). A table rather than a grid of divs: the
           relationship a screen reader needs — this key, this file's value,
           that file's value — is exactly what table headers state.
           `tabindex` because the table is its own horizontal scroll
           container on a wide viewport (WCAG 2.1.1); see the source
           fallback's scrollable boxes. -->
      <table
        v-if="group.declarations.length > 0"
        class="aci-recognition-comparison__table"
        tabindex="0"
      >
        <thead>
          <tr>
            <th scope="col">Declared key</th>
            <th scope="col">First file</th>
            <th scope="col">Second file</th>
            <th scope="col">Resolved values</th>
          </tr>
        </thead>
        <tbody>
          <!-- Keyed by the parser's key identity — parsed type plus
               spelling — because two rows can share one spelling
               (see DeclarationComparisonRow). -->
          <tr v-for="row in group.declarations" :key="`${row.keyKind}:${row.key}`">
            <!-- The key is the parser's resolved spelling — an authored
                 `007` is `7`, with the authored form kept by the source
                 comparison beside these rows — shown exactly as the detail
                 route's declaration list shows it, so one metadata fact
                 reads the same on every surface; the whitespace-safe
                 spelling lives in the accessible name ({@link
                 rowHeaderLabel}). An invisible key gets the note the detail
                 route shows (FR-025). -->
            <th scope="row" :aria-label="rowHeaderLabel(row)">
              <span class="aci-authored-text aci-authored-atomic">{{ row.key }}</span>
              <!-- The invisible note carries the spelled-out form: a flat
                   reading collapses whitespace, and two keys made of
                   different runs of it must not read as one (FR-025). -->
              <span v-if="row.key === '' || rendersNothingVisible(row.key)" class="aci-muted">
                {{
                  row.key === ''
                    ? '(empty key)'
                    : `(key with no visible characters: ${encodeRootPresentation(row.key)})`
                }}
              </span>
              <!-- A key whose parsed type is not the string default is
                   captioned with that type — the shared rendering rule that
                   keeps a numeric `1` apart from the string `"1"` it
                   renders like, here and in every frontmatter block
                   (FR-025). -->
              <span v-if="row.keyKind !== 'string'" class="aci-muted">
                ({{ FRONTMATTER_KEY_KIND_TEXT[row.keyKind] }})
              </span>
            </th>
            <td
              v-for="(value, side) in [row.left, row.right]"
              :key="side"
              :data-label="side === 0 ? 'First file' : 'Second file'"
            >
              <!-- An absent-file side is not a file that declares nothing,
                   so its cells say which it is (FR-025). An authored scalar
                   that spells either state reads like it in a flat channel;
                   the muted styling tells them apart visibly, and the
                   source comparison beside these rows carries the exact
                   truth. Matching this product's own copy against authored
                   text would turn display wording into load-bearing
                   syntax, and prefixing every cell with a state phrase
                   would tax every ordinary row for this corner. -->
              <span v-if="value === null" class="aci-muted">{{
                (side === 0 ? group.left : group.right) === 'file-absent'
                  ? 'no file'
                  : 'not declared'
              }}</span>
              <FrontmatterBlock v-else-if="opensBlock(value)" :value="value" />
              <FrontmatterValueText v-else :value="value" />
            </td>
            <!-- Equality of resolved values, stated as the literal fact it
                 is: no row says which value a product would use (FR-012). -->
            <td data-label="Resolved values">{{ row.equal ? 'Same' : 'Differs' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.aci-recognition-comparison > section > h4 {
  font-size: 0.95rem;
  margin: 0.75rem 0 0.35rem;
}

/* The table scrolls inside itself when a resolved value is wide, so the page
   never scrolls sideways (WCAG 1.4.10). */
.aci-recognition-comparison__table {
  border-collapse: collapse;
  display: block;
  max-inline-size: 100%;
  overflow-x: auto;
}

.aci-recognition-comparison__table th,
.aci-recognition-comparison__table td {
  border: 1px solid var(--aci-border);
  padding: 0.3rem 0.5rem;
  text-align: start;
  vertical-align: top;
}

/* Authored values keep their spelling but wrap rather than widening the row
   past the viewport; a value with no break opportunities still scrolls
   inside the table's own box. */
.aci-recognition-comparison__table td {
  overflow-wrap: anywhere;
}

/* On a narrow viewport the four columns reflow into one stacked block per
   declaration instead of scrolling in two dimensions: the contract allows
   two-dimensional scrolling only for essential source-code regions
   (accessibility-acceptance.md § WCAG 1.4.10), and these rows are data, not
   source. Each cell repeats its column caption from `data-label`, so the
   association the hidden header row carried stays visible in reading
   order. */
@media (width < 52rem) {
  .aci-recognition-comparison__table thead {
    display: none;
  }

  .aci-recognition-comparison__table tbody,
  .aci-recognition-comparison__table tr,
  .aci-recognition-comparison__table th[scope='row'],
  .aci-recognition-comparison__table td {
    display: block;
  }

  .aci-recognition-comparison__table tr {
    border: 1px solid var(--aci-border);
    border-radius: 4px;
    margin-block-end: 0.5rem;
  }

  .aci-recognition-comparison__table th,
  .aci-recognition-comparison__table td {
    border: 0;
    border-block-start: 1px solid var(--aci-border);
  }

  .aci-recognition-comparison__table tr > :first-child {
    border-block-start: 0;
  }

  .aci-recognition-comparison__table td::before {
    content: attr(data-label);
    display: block;
    font-weight: 600;
  }
}
</style>
