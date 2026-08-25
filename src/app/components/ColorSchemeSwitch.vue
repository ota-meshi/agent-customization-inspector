<script setup lang="ts">
// The control that chooses the colour scheme the page is drawn in.
//
// The drawing is `shine-and-bright`'s: this component renders the markup that
// stylesheet selects — a switch button holding one icon element — and the
// library slides the knob and turns the sun into a moon from the `dark` class
// the document root already carries, which is where the scheme's one expression
// lives (`composables/color-scheme.ts`). Nothing here draws a sun or a moon, so
// the page needs no icon of its own for the state it is already in.
//
// That stylesheet is imported here rather than from the shell so the vendor CSS
// travels with the one component whose markup needs it. It is global by nature —
// its class names are the vendor's, and `scoped` would stamp this component's
// attribute onto selectors the vendor wrote — which is why this component styles
// only its own block and sets the vendor's own custom properties (AGENTS.md
// § Stylesheet scope policy).
//
// The button carries the accessible name and the state itself: `role="switch"`
// with `aria-checked` is what a screen reader announces, and the name stays
// fixed because the state is the checkedness rather than the wording
// (WCAG 4.1.2). Visually the state is the knob's position, which survives where
// the vendor's drawing does not: measured 2026-08-25 with forced colours
// active, the sun and the moon are gone — every `box-shadow` is forced to
// `none` — while the button's and the knob's own borders are repainted in the
// reader's palette and the knob still slides between the two ends
// (WCAG 1.4.11).
//
// What that measurement leaves unstated is the control's *purpose*: with the
// sun and the moon gone, a track and a knob say what state the switch is in
// and not what it switches, and an accessible name is not visible. That is an
// accepted limitation of this control rather than an oversight. No success
// criterion asks for visible label text here — 1.4.11 governs the contrast of
// the information that identifies the component, which the repainted borders
// and the knob keep — and the masthead is the product name and this switch, a
// place where a glyph of this repository's own or a word beside the vendor's
// drawing would be the only text in the row. A `title` is not that statement
// either: a tooltip appears on hover alone, so a keyboard or touch reader
// never sees one.
//
// Recorded so the next reader does not re-propose the glyph or the label
// without knowing the trade was made, and so the measurement above is
// re-taken with it: both are dated claims about three pinned engines rather
// than standing ones (AGENTS.md § Platform baseline policy).
import { chooseColorScheme, colorScheme } from '../composables/color-scheme';
import 'shine-and-bright/index.css';
</script>

<template>
  <button
    class="snb-shine-and-bright-switch aci-color-scheme-switch"
    type="button"
    role="switch"
    :aria-checked="colorScheme === 'dark'"
    aria-label="Dark theme"
    @click="chooseColorScheme(colorScheme === 'dark' ? 'light' : 'dark')"
  >
    <span class="snb-shine-and-bright" />
  </button>
</template>

<style scoped>
/* The two things the page has an opinion about in the vendor's drawing: the
   boundary that identifies the control, which takes the same token every other
   boundary in the shell does so it keeps its 3:1 against the surface
   (WCAG 1.4.11), and the track it slides in, which is the shell's sunken
   surface rather than the vendor's own — its default background names a custom
   property the package does not define. `flex: none` keeps the fixed-size
   control from being squeezed by the heading beside it in a narrow masthead. */
.aci-color-scheme-switch {
  --snb-switch-border-color: var(--aci-border);
  background-color: var(--aci-surface-sunken);
  flex: none;
}

/* The knob's slide is the only motion this application has, so honouring the
   platform preference is one declaration rather than a policy: the switch still
   moves, it simply arrives at once. */
@media (prefers-reduced-motion: reduce) {
  .aci-color-scheme-switch {
    --snb-animation-duration: 0ms;
  }
}
</style>
