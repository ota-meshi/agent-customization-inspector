<script setup lang="ts">
// The mark that names one product beside a recognition (T1146, FR-009).
//
// An inventory states its recognizing products more often than it states
// anything else — every file row carries one to three of them — so the product
// name is drawn rather than spelled: three glyphs down a column read at a
// glance where three repeated names do not, and the width they give back is
// what the documented surfaces beside them take.
//
// The product's name rides with the mark as text that is not drawn. The glyph
// is what identifies the product on a row — the row spells no name beside it —
// so it is non-text content carrying information rather than decoration, and
// it owes an equivalent accessible name
// (contracts/accessibility-acceptance.md § 1.1.1). A caller whose own text
// already names the product hides the whole mark instead, which is the legend
// (`ToolLegend.vue`): there the glyph is decorative, because the name it stands
// for is the words next to it.
//
// The colour is this repository's one exception to inheriting `currentColor`,
// and both the reason and its limits are the Icon policy's (AGENTS.md § Icon
// policy): a reader scanning for one product follows a colour faster than they
// tell three 15px silhouettes apart, nothing rests on the colour alone, and
// forced colours return every mark to `CanvasText` — which loses the scanning
// aid and no information.
import type { Component } from 'vue';
import ClaudeIcon from '~icons/simple-icons/claude';
import CopilotIcon from '~icons/simple-icons/githubcopilot';
import CodexIcon from '~icons/simple-icons/openai';
import { SUPPORTED_TOOL_TEXT, type SupportedTool } from '../../shared/entities';

const props = defineProps<{
  /** The product this mark names, which decides both the glyph and its colour. */
  tool: SupportedTool;
  /**
   * Draws the glyph alone, with no name of its own and hidden from assistive
   * technology. Set by a caller whose own words already name the product — the
   * legend, and a detail's attribute line — where the mark stands beside the
   * name it means and a name of its own would be the same word twice.
   */
  decorative?: boolean;
}>();

/**
 * The glyph each product is drawn by: the product's own single-colour brand
 * mark from `simple-icons`, so the shape is the one a reader already knows from
 * that product rather than a category symbol this repository invented.
 *
 * `Readonly<Record<SupportedTool, Component>>` so a product nobody has drawn a
 * mark for cannot compile (AGENTS.md § User-visible copy policy). The array
 * form of the same catalog is not exhaustiveness-checked, which is why
 * `SUPPORTED_TOOL_ORDER` has a gate of its own (T1142).
 */
const TOOL_GLYPH: Readonly<Record<SupportedTool, Component>> = {
  /** GitHub Copilot's own mark. */
  copilot: CopilotIcon,
  /** Claude Code is drawn by Anthropic's mark, which is the one Claude Code ships under. */
  claude: ClaudeIcon,
  /** OpenAI Codex is drawn by OpenAI's mark, for the same reason. */
  codex: CodexIcon,
};
</script>

<template>
  <span
    :class="['aci-tool-mark', `aci-tool-mark--${props.tool}`]"
    :aria-hidden="props.decorative ? 'true' : undefined"
  >
    <component :is="TOOL_GLYPH[props.tool]" class="aci-tool-mark__glyph" aria-hidden="true" />
    <span v-if="!props.decorative" class="aci-visually-hidden">{{
      SUPPORTED_TOOL_TEXT[props.tool]
    }}</span>
  </span>
</template>

<style scoped>
/* `flex: none` because the mark rides at the head of a row that may be
   squeezed: a path with no break opportunities takes every pixel it is
   offered, and a shrunk mark stops being the shape a reader is scanning for. */
.aci-tool-mark {
  align-items: center;
  display: inline-flex;
  flex: none;
}

/* The one size the design draws a mark at, in `rem` so it follows the reader's
   own base size rather than the row's: a mark is a shape to recognize, and at
   the row's 13px an `em` size would shrink it inside the smaller runs it also
   appears in — the legend, a detail's attribute line. */
.aci-tool-mark__glyph {
  block-size: 0.9375rem;
  inline-size: 0.9375rem;
}

/* One rule per product, each naming that product's own token. Written out
   rather than composed from the prop, because a token spelled by
   interpolation is a token no search finds and no build can prove exists. */
.aci-tool-mark--copilot {
  color: var(--aci-brand-copilot);
}

.aci-tool-mark--claude {
  color: var(--aci-brand-claude);
}

.aci-tool-mark--codex {
  color: var(--aci-brand-codex);
}
</style>
