// What a plugin rule is to the scan: the contract a compiled unit of this kind
// answers, and the reading it answers with — one per carrier, because the two
// carriers differ in what their file is to the plugin.
//
// The kind's own contract rather than a member of every compiled rule: which
// plugins a file declares, and where each of them sits, is a fact about a
// plugin carrier alone (AGENTS.md § Class and interface policy). Each vendor's
// answer is its own module beside this one.
import type { DeclaredEntryDto, PluginDeclarationDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * What one plugin carrier's complete decoded text declares: the plugins it
 * resolves, and the carrier's own fields when the carrier is a catalog.
 *
 * One reading rather than a method per field, because it comes from one parse:
 * two methods over one text would parse it twice and could disagree about what
 * it said. Where each plugin sits is part of it for the same reason — the
 * directory follows from the `source` the same entry wrote, so answering it
 * separately would pair two lists by position and leave nothing to keep the
 * pairing true.
 */
export interface PluginCarrierReading {
  /**
   * The catalog's own declarations — the `name` and `interface` a catalog
   * writes about itself, never its `plugins` array, whose entries are the
   * declarations below. Empty for a manifest, whose own fields are its one
   * declaration's.
   */
  readonly catalogFields: readonly DeclaredEntryDto[];
  /**
   * Every plugin the carrier declares, in the parser's resolved order — the
   * names the inventory rows are named by, the fields the detail publishes by
   * the keys the file wrote, and the directory each one's files occupy
   * (FR-007). Empty when the carrier declares none.
   *
   * The wire declaration shape directly ({@link PluginDeclarationDto}), for the
   * reason the MCP reading gives: what the one scan-time parse resolved is what
   * the carrier's detail publishes, so a second internal shape would be a state
   * able to disagree with it.
   */
  readonly plugins: readonly PluginDeclarationDto[];
}

/**
 * A compiled rule that admits a plugin catalog: the file whose entries resolve
 * plugin names to the sources those plugins come from.
 *
 * What it answers here is what every caller of this kind needs — the plugins
 * the carrier declares, each with the directory its files occupy and the
 * manifest inside it. How a catalog names itself, which of its entries reach a
 * plugin root inside this repository, where that root keeps the plugin's own
 * declaration, and how a name is composed from the parts are that vendor's own
 * questions, answered inside that vendor's own reading.
 */
export interface CompiledStaticPluginCatalogRule extends CompiledInspectionRule {
  /** The recognized kind; a plugin unit compiles plugin records alone. */
  readonly kind: 'plugin';
  /** Discriminant: the admitted file is a catalog listing plugins. */
  readonly pluginCarrier: 'catalog';
  /**
   * What one admitted catalog declares, each entry carrying the Source-relative
   * directory its plugin's files occupy and the manifest this vendor's client
   * reads inside it — trailing slash kept on the directory, both null when the
   * entry's source names no directory here.
   *
   * Paths and nothing else, because that is the part only the admitting vendor
   * knows: which source forms name a directory here, where a plugin root sits
   * relative to the catalog, and which file inside it is the plugin's own
   * declaration are its contract, while enumerating a directory and reading
   * what is in it are the same operations every directory-shaped customization
   * uses. Neither path is probed: a directory this repository does not hold is
   * named all the same — the entry declared it, and the files under it are
   * simply none. Throws on unparsable text, exactly as the manifest unit does
   * (FR-028).
   *
   * The carrier's own path is a parameter the catalog does not read: one call
   * site asks either unit, and a catalog resolves its entries against the
   * marketplace root the rule already fixes.
   */
  pluginCarrierReadingOf(sourceText: string, sourceRelativePath: string): PluginCarrierReading;
}

/**
 * A compiled rule that admits a plugin's own manifest at a path the vendor's
 * client reads it from, where the file's presence is what makes the directory
 * holding it a plugin.
 *
 * Its own unit rather than a mode of the catalog above, because the two answer
 * from different material: a catalog resolves many names out of its `plugins`
 * array, while a manifest declares the one plugin it belongs to and takes its
 * name and its root from where it sits. A unit that cannot answer for many
 * plugins must not carry the member that promises to, so the `pluginCarrier`
 * discriminant is what lets the recognizer prove which one it has.
 *
 * The shipped member is `claude.repo.skills-directory-plugin`: a folder under
 * `.claude/skills/` carrying `.claude-plugin/plugin.json` loads as
 * `<folder>@skills-dir` with no marketplace and no install step
 * (contracts/vendors/claude-code.md § Repository vendor behavior). Codex has no
 * such rule: a Codex plugin root is activated through a catalog or an install,
 * so its manifest is one of the files that plugin ships.
 */
export interface CompiledStaticPluginManifestRule extends CompiledInspectionRule {
  /** The recognized kind; a plugin unit compiles plugin records alone. */
  readonly kind: 'plugin';
  /** Discriminant: the admitted file is one plugin's own manifest. */
  readonly pluginCarrier: 'manifest';
  /**
   * What one admitted manifest declares: the single plugin it belongs to, under
   * the name its vendor resolves that plugin by, with the root it sits in and
   * its own path as that plugin's manifest.
   *
   * The path is a parameter because a manifest names neither: which directory
   * is the plugin root, and how a name follows from it, are the admitting
   * vendor's contract, and the file's own `name` key is one of the fields the
   * detail publishes rather than the row's identity. Throws on unparsable text,
   * exactly as the catalog unit does (FR-028).
   */
  pluginCarrierReadingOf(sourceText: string, sourceRelativePath: string): PluginCarrierReading;
  /**
   * The plugin this file's placement establishes, with nothing read out of the
   * text: the name its vendor resolves the folder by, the root that folder is,
   * and this file as that plugin's own manifest, with no declared fields.
   *
   * What makes the folder a plugin is this file being in it, so none of those
   * three depends on the text parsing. It is what a recognition publishes when
   * the parse failed, the way a skill keeps the name its path resolves when its
   * frontmatter could not be read: the row stays the plugin's, carrying the
   * diagnostic that says its declarations are unknown, where publishing nothing
   * would move the plugin to the row for carriers that resolve no name and take
   * the files below its root off the page with it (FR-028).
   *
   * The catalog unit has no counterpart: every plugin a catalog resolves is one
   * its text declares, so its path establishes none and a failed parse there
   * leaves nothing to keep.
   */
  pluginEstablishedByPath(sourceRelativePath: string): PluginDeclarationDto;
}

/**
 * A compiled rule that admits a plugin carrier by path: the catalog whose
 * entries resolve plugin names to their sources, or the manifest whose presence
 * makes the directory holding it a plugin. The recognizer dispatches on
 * `pluginCarrier`, which is what lets each unit be asked only what it can
 * answer.
 */
export type CompiledStaticPluginRule =
  CompiledStaticPluginCatalogRule | CompiledStaticPluginManifestRule;
