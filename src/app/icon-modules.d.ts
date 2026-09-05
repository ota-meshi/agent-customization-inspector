// Ambient types for the `~icons/<collection>/<name>` imports unplugin-icons
// compiles.
//
// The plugin resolves such an import at build time and emits a Vue component
// whose template is the icon's own SVG, so nothing is fetched at run time and
// no icon runtime ships (FR-022: the product issues no outbound request). The
// package publishes this declaration as `unplugin-icons/types/vue`; it is
// referenced rather than restated so the declared shape stays the plugin's.
/// <reference types="unplugin-icons/types/vue" />
