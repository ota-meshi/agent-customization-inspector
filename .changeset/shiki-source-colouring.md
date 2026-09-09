---
'agent-customization-inspector': minor
---

Source is now coloured by shiki and shown as the browser's own text instead of inside a Monaco editor. A detail page renders each file — and a comparison page each of its two sides — as plain text with line numbers that are not copied, so the browser's own find, selection, and copy reach every character, and a detail route loads about 215 KB of colouring, as the local host serves it, where it loaded about 3.1 MB of editor before. A comparison keeps its two sides opposite each other at every width, marks each added or removed line with `+` or `-` beside its number as well as with colour, and highlights the words a changed line differs in. The package ships no editor worker, icon font, or WebAssembly.
