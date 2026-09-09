# agent-customization-inspector

## 0.3.0

### Minor Changes

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Every customization detail page is now drawn inside one frame that holds the page's own outermost element, the header above its content, the region a screen reader hears its state through, and where keyboard focus lands on arrival. Nothing looks, sounds, or answers the keyboard differently from the previous release.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A plugin detail page no longer announces "Plugin ready." when it finishes loading. Every kind is silent on arrival, as the other ten already were: focus is already on the page's heading, which has named the subject, and the session has already been announced as ready — a second "ready" says only that something changed, not what it changed into.
  
  A skill detail page reached by a link whose file its directory no longer holds now announces that, rather than announcing that nothing sits at the link's path. The screen has drawn those as two different states all along; a reader who cannot see it was told the skill itself was gone.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Every sentence this product shows now spells its apostrophe the same way, wherever the sentence is written. A page's own words and the words its live region speaks were the same sentence in two spellings, so the same statement reached a reader who could see the page and a reader who could not as two different strings.

- [#9](https://github.com/ota-meshi/agent-customization-inspector/pull/9) [`2ae92aa`](https://github.com/ota-meshi/agent-customization-inspector/commit/2ae92aa44ef258f0aba4d7a4ac1d3bdeee1073e2) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A detail page's trail ends at the kind whenever it has nothing to name after it — a link this scan holds no file at, a skill whose directory it holds no row for — instead of closing on a separator with nothing behind it. Every kind reads that way; only skills did before, and the page itself already says the link is not in this scan.

## 0.2.1

### Patch Changes

- [#7](https://github.com/ota-meshi/agent-customization-inspector/pull/7) [`e78faff`](https://github.com/ota-meshi/agent-customization-inspector/commit/e78faff3b19da2064f152ac9a44d7b88da4775af) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Remove images from publish files

## 0.2.0

### Minor Changes

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - A plugin detail page opened at a link with no path drew an empty heading. It now names the kind, the way every other detail page does when its link names no path.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The outcomes a permission policy reports about declared permissions it could not read, and the ones a plugin's carrier reports, are now marked by severity the way every other page marks them: an error takes the leading edge a failure gets, anything else the weight of a note.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The detail pages for all eleven customization kinds now share their common headings, breadcrumbs, file facts, source-root notes, diagnostics, focus handling, and loading and failure announcements. Pages with parsed and source views also share their tab behavior, so the same navigation and status patterns stay consistent across customization kinds.

- [#6](https://github.com/ota-meshi/agent-customization-inspector/pull/6) [`1e44168`](https://github.com/ota-meshi/agent-customization-inspector/commit/1e44168bb0ee553fb8447fea2ae01e39238b2158) Thanks [@ota-meshi](https://github.com/ota-meshi)! - The tab strip on a plugin comparison now uses the same shared presentation and behavior as detail pages with parsed and source views. Nothing looks, sounds, or answers the keyboard differently from the previous release.

- [#5](https://github.com/ota-meshi/agent-customization-inspector/pull/5) [`6275375`](https://github.com/ota-meshi/agent-customization-inspector/commit/62753757c1636025a35a723941ce95be83760a6b) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Spacing is now the same across the pages that share a shape. The space above and below a heading, and between a heading and the link beside it, no longer differs from one customization kind to the next. And where two sections meet, each section's own spacing applies rather than the larger of the two winning, so a few gaps on the Repository page and in the disable interlude are slightly wider.

- [#3](https://github.com/ota-meshi/agent-customization-inspector/pull/3) [`7496f35`](https://github.com/ota-meshi/agent-customization-inspector/commit/7496f35ac855186453a0eab7bffcb69464490c6e) Thanks [@ota-meshi](https://github.com/ota-meshi)! - Read-only source diffs for skills, instructions, prompts and commands, custom agents, and plugins now render through one shared component. Comparison behavior is unchanged.

## 0.1.0

### Minor Changes

- [#1](https://github.com/ota-meshi/agent-customization-inspector/pull/1) [`636d5ad`](https://github.com/ota-meshi/agent-customization-inspector/commit/636d5adf2fa8c6d9b31bdf6113a438c92acc90a4) Thanks [@ota-meshi](https://github.com/ota-meshi)! - feat: implement agent-customization-inspector
