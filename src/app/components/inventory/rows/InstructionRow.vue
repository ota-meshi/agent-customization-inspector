<script setup lang="ts">
// An instructions row (T214, linked to its detail by T224). The row's unit is
// the file itself (data-model.md § Inventory unit): no authored declaration
// names an instructions file, so the Source-relative Path is the row's
// identity and the recognizing products are its one recognition fact.
//
// A row shows what was found and how it was classified — never what it says.
// The snapshot carries no `sourceText`, and complete authored content is
// served only by the detail route, one file at a time (FR-027).
//
// A row also never asserts that a product would load the file: Codex selects
// at most one non-empty instruction file per directory at runtime, and which
// file a session selects depends on inputs this tool never observes, so both
// admitted files list side by side with no winner (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary).
import { NuxtLink } from '#components';
import { instructionDetailRoute } from '../../instruction-detail-route';
import { SUPPORTED_TOOL_TEXT, escapeControlCharacters } from '../../../../shared/entities';
import type { InstructionInventoryEntryDto } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed instructions entry to render: one recognized file. */
  entry: InstructionInventoryEntryDto;
}>();

/**
 * The path in its presentation form (data-model.md § SourceRelativePath), so
 * a path spanning lines cannot read as two files.
 */
const pathText = escapeControlCharacters(props.entry.sourceRelativePath);

/**
 * The file's own detail route. One route however many products recognize the
 * file, because the kind's unit is the file: unlike a skill definition, no
 * per-tool fact distinguishes what the page would show, so every recognizing
 * product's link addresses the same detail (T224).
 */
const detailRoute = instructionDetailRoute(props.entry.sourceRelativePath);
</script>

<template>
  <li class="aci-item">
    <!-- The file's path is the row's identity, rendered exactly as published
         and never as a locator anything can open (FR-024). -->
    <p class="aci-path aci-authored-text">{{ pathText }}</p>

    <!-- Every product that recognized the file, in the closed tool order,
         each linking to the file's own detail route: selecting an
         instruction is how its complete inert detail opens (T224). -->
    <ul class="aci-instruction-row__tools" role="list">
      <li v-for="tool in entry.tools" :key="tool">
        <NuxtLink :to="detailRoute">{{ SUPPORTED_TOOL_TEXT[tool] }}</NuxtLink>
      </li>
    </ul>
  </li>
</template>

<style scoped>
.aci-instruction-row__tools {
  list-style: none;
  margin: 0.2rem 0 0;
  /* The recognitions of the file, set under the path by an indent and a rule,
     matching how a skill row groups its definitions. */
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}
</style>
