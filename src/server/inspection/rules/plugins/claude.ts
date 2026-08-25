// Claude's two plugin carriers: the repository catalog whose entries resolve
// plugin names to their sources, and the skills-directory manifest whose
// presence makes the folder holding it a plugin
// (contracts/vendors/claude-code.md § Repository vendor behavior). Both the
// units that admit one and the readings they answer with are here.
//
// Which keys a catalog writes, which source spellings name a directory this
// repository carries, and how a name follows from an entry are this vendor's
// contract, so they are read here rather than shared: the forms Claude
// documents are not the forms another product documents, and a spelling one of
// them defines is not a spelling the others do.
//
// The base these units extend is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type {
  CompiledStaticPluginCatalogRule,
  CompiledStaticPluginManifestRule,
  PluginCarrierReading,
} from './compiled-rule';
import {
  type DeclaredPluginSource,
  declaredValueUnder,
  localPluginRootSegments,
  UNRECOGNIZED_PLUGIN_SOURCE,
} from './plugin-source';
import { ParsedStrictJsonDocument } from '../../parsers/json';
import type { InspectionRule } from '../../../../shared/registries/rule-types';
import type {
  DeclaredEntryDto,
  PluginDeclarationDto,
  PluginSourceForm,
} from '../../../../shared/api-types';

/**
 * The key a Claude plugin catalog lists its entries under
 * (contracts/vendors/claude-code.md § Repository vendor behavior): the page
 * defines a marketplace as a `plugins` array of one object per plugin. A
 * literal here rather than anything a caller passes, because it is this
 * vendor's own format.
 */
const CLAUDE_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a catalog and a plugin declaration each write their name under. */
const CLAUDE_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const CLAUDE_PLUGIN_SOURCE_KEY = 'source';

/**
 * The catalog key whose object carries the directory bare plugin names resolve
 * under (`anthropic.claude-code.marketplaces.catalog-sources` § Optional
 * fields).
 */
const CLAUDE_CATALOG_METADATA_KEY = 'metadata';

/** The `metadata` key naming that directory. */
const CLAUDE_METADATA_PLUGIN_ROOT_KEY = 'pluginRoot';

/**
 * What each documented `source.source` value names
 * (`anthropic.claude-code.marketplaces.catalog-sources` § Plugin sources).
 *
 * The page's own table, mapped to the kinds every vendor's forms share
 * (`api-types.ts` § PluginSourceForm). It is exhaustive over the object forms
 * that page lists, and a discriminant absent from it is a form this vendor
 * does not document — `local` among them, which is Codex's spelling rather
 * than Claude's, and which Claude's own table answers with a plain `./` string
 * instead.
 */
const CLAUDE_PLUGIN_SOURCE_FORMS = new Map<string, PluginSourceForm>([
  /** `{ repo, ref?, sha? }` — a GitHub repository. */
  ['github', 'github-repository'],
  /** `{ url, ref?, sha? }` — a Git repository named by URL. */
  ['url', 'git-repository'],
  /** `{ url, path, ref?, sha? }` — a directory inside a Git repository. */
  ['git-subdir', 'git-subdirectory'],
  /** `{ package, version?, registry? }` — an npm package. */
  ['npm', 'npm-package'],
  /** `{ url, sha256? }` — a zip archive fetched over HTTPS. */
  ['archive', 'zip-archive'],
  /** `{ command, timeout?, mode? }` — a directory a local command prints. */
  ['command', 'command-output'],
]);

/**
 * Where a Claude plugin root keeps the plugin's own manifest, relative to that
 * root (`claude.behavior.repo.plugin`): the file locations reference puts it at
 * `.claude-plugin/plugin.json` and marks it optional.
 *
 * It names the file rather than admitting it below a catalog's root: no rule
 * reaches a manifest there, and the file is published as one of the plugin's
 * own. What this answers is which of those files the plugin's detail opens on.
 */
const CLAUDE_PLUGIN_MANIFEST_PATH = '.claude-plugin/plugin.json';

/**
 * The marketplace a skills-directory plugin is addressed under
 * (`anthropic.claude-code.plugins.components-scopes` § Skills-directory
 * plugins): the page names such a plugin `<folder>@skills-dir`, so the
 * qualifier is the vendor's own word rather than a catalog name.
 */
const CLAUDE_SKILLS_DIRECTORY_MARKETPLACE = 'skills-dir';

/**
 * The name one declaration resolves: the `name` scalar exactly as written, or
 * null when it writes none or writes it as anything but a scalar — naming a
 * plugin after the first item of a list it wrote would be an identity the file
 * never declared (FR-007).
 */
function claudePluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === CLAUDE_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * The name Claude addresses one plugin by: the plugin's own name qualified by
 * the marketplace it came from, `<plugin-name>@<marketplace-name>` — the key
 * `enabledPlugins` uses and `/plugin` takes — or null when either half is
 * missing, because a plugin Claude could not address is no name at all.
 *
 * It lives here because it is Claude's rule. Another product's plugin phase
 * resolves its own names in its own module, exactly as each vendor resolves its
 * own skill and command names (FR-007).
 */
function claudeQualifiedPluginNameOf(
  pluginName: string | null,
  marketplaceName: string | null,
): string | null {
  return pluginName === null || marketplaceName === null
    ? null
    : `${pluginName}@${marketplaceName}`;
}

/**
 * The directory a bare plugin source name resolves under, `./`-anchored, or
 * null when this catalog declares none it could resolve under.
 *
 * `metadata.pluginRoot` is what makes a bare name a path at all: the page
 * documents `"pluginRoot": "./plugins"` turning `"source": "formatter"` into
 * `./plugins/formatter`, and says the value must itself be a relative path
 * inside the marketplace. A value written without the `./` prefix is that same
 * relative path, so it is anchored here rather than refused; an absolute path
 * and a `~` home path are not relative and resolve nothing.
 *
 * A trailing slash is dropped so joining a name onto it cannot produce the
 * empty segment {@link localPluginRootSegments} refuses.
 */
function claudeBarePluginRootBaseOf(catalogFields: readonly DeclaredEntryDto[]): string | null {
  const metadata = declaredValueUnder(catalogFields, CLAUDE_CATALOG_METADATA_KEY);
  if (metadata === null || metadata.kind !== 'mapping') {
    return null;
  }
  const declared = declaredValueUnder(metadata.entries, CLAUDE_METADATA_PLUGIN_ROOT_KEY);
  // A declared string and nothing else: the page documents this value as a
  // relative path, and a number's or a boolean's rendering is not a path an
  // author wrote — deriving a directory from one would invent a plugin root
  // out of a declaration the vendor's own schema refuses.
  if (declared === null || declared.kind !== 'scalar' || declared.scalarKind !== 'string') {
    return null;
  }
  const trimmed = declared.text.endsWith('/') ? declared.text.slice(0, -1) : declared.text;
  if (trimmed === '' || trimmed.startsWith('/') || trimmed.startsWith('~')) {
    return null;
  }
  // `./` names the marketplace root itself, where a name joined onto the
  // anchored spelling would read as the `.` segment
  // {@link localPluginRootSegments} refuses.
  if (trimmed === '.') {
    return '.';
  }
  return trimmed.startsWith('./') ? trimmed : `./${trimmed}`;
}

/**
 * What one catalog entry's `source` names, in the kinds every vendor's forms
 * share, with the Source-relative segments of its directory when it names one
 * (`registry.ts` § DeclaredPluginSource).
 *
 * The documented forms and nothing else
 * (`anthropic.claude-code.marketplaces.catalog-sources` § Plugin sources):
 * a string is a relative path when it starts with `./`, and otherwise a bare
 * name, which is a path only under this catalog's own `metadata.pluginRoot`
 * and only when it carries no `/` — the page says a source containing one
 * still needs the prefix. An object names its form in its own `source` key;
 * the remaining fields belong to whichever form that is, so the discriminant
 * is read rather than the presence of a `path`. Everything else is a form this
 * vendor does not document, and stays unrecognized rather than being guessed
 * at (FR-004, FR-024).
 *
 * The discriminant alone decides the form, and an object writing nothing else
 * is that form written incompletely rather than another form: which kind of
 * place a source is, is what the discriminant says, and which place it is, is
 * what the remaining fields say — a `url` object with no `url` names a Git
 * repository this scan cannot name, exactly as a local object with no `path`
 * names a directory it cannot name. Whether the entry carries enough for its
 * own product to resolve it is that product's answer, and checking it here
 * would be validating the file (FR-032).
 */
function claudePluginSourceOf(
  entryFields: readonly DeclaredEntryDto[],
  catalogFields: readonly DeclaredEntryDto[],
): DeclaredPluginSource {
  const declared = declaredValueUnder(entryFields, CLAUDE_PLUGIN_SOURCE_KEY);
  if (declared === null) {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.kind === 'mapping') {
    const discriminant = declaredValueUnder(declared.entries, CLAUDE_PLUGIN_SOURCE_KEY);
    const form =
      discriminant !== null && discriminant.kind === 'scalar'
        ? CLAUDE_PLUGIN_SOURCE_FORMS.get(discriminant.text)
        : undefined;
    return form === undefined ? UNRECOGNIZED_PLUGIN_SOURCE : { form, rootSegments: null };
  }
  // A declared string and nothing else, for the reason
  // {@link claudeBarePluginRootBaseOf} gives: the page documents both source
  // spellings as strings, and a number or a boolean is neither a `./` path nor
  // a bare directory name.
  if (declared.kind !== 'scalar' || declared.scalarKind !== 'string') {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.text.startsWith('./')) {
    return {
      form: 'repository-directory',
      rootSegments: localPluginRootSegments(declared.text),
    };
  }
  const base = claudeBarePluginRootBaseOf(catalogFields);
  if (base === null || declared.text === '' || declared.text.includes('/')) {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  return {
    form: 'repository-directory',
    rootSegments: localPluginRootSegments(`${base}/${declared.text}`),
  };
}

/**
 * What one admitted catalog declares: its own keys except `plugins`, and one
 * declaration per entry of that array in the parser's resolved order, each
 * carrying the directory that entry's plugin occupies here and the manifest
 * inside it.
 *
 * Entry classification is structural and total, exactly as the MCP carrier
 * reading's is: only an object inside `plugins` is an entry, and a scalar or
 * an array there is omitted whole rather than published partially, as is a
 * `plugins` value that is not an array at all. Strict JSON because that is
 * what the catalog is.
 *
 * A plugin *is* its root: the optional `.claude-plugin/plugin.json` inside it
 * is one of the files it ships rather than a customization of its own, so an
 * entry answers the directory and names the manifest without admitting it.
 */
export function claudePluginCatalogReadingOf(sourceText: string): PluginCarrierReading {
  const entries = new ParsedStrictJsonDocument(sourceText).entries;
  const declared = entries.find(
    (entry) => entry.keyKind === 'string' && entry.key === CLAUDE_CATALOG_PLUGINS_KEY,
  );
  const catalogFields = entries.filter((entry) => entry !== declared);
  if (declared === undefined || declared.value.kind !== 'sequence') {
    return { catalogFields, plugins: [] };
  }
  // Each entry is published under the name Claude addresses that plugin by,
  // qualified by this catalog's own name; the entry's raw `name` stays one of
  // the `fields` below, where the detail publishes it as written (FR-007).
  const marketplaceName = claudePluginNameOf(catalogFields);
  return {
    catalogFields,
    plugins: declared.value.items.flatMap((item) => {
      if (item.kind !== 'mapping') {
        return [];
      }
      const source = claudePluginSourceOf(item.entries, catalogFields);
      // A form that names no directory here — every remote one, and a
      // relative path that leaves the Source — leaves the offering standing
      // with nothing of its own in this repository: no root, and no manifest
      // to open either.
      const pluginRoot = source.rootSegments === null ? null : `${source.rootSegments.join('/')}/`;
      return [
        {
          name: claudeQualifiedPluginNameOf(claudePluginNameOf(item.entries), marketplaceName),
          fields: item.entries,
          sourceForm: source.form,
          pluginRoot,
          manifestPaths: pluginRoot === null ? [] : [`${pluginRoot}${CLAUDE_PLUGIN_MANIFEST_PATH}`],
        },
      ];
    }),
  };
}

/**
 * The one plugin a skills-directory manifest declares: every key the file
 * wrote, the folder holding `.claude-plugin/` as the plugin root, and this
 * file's own path as that plugin's manifest.
 *
 * Strict JSON, and a manifest that declares nothing at all still declares its
 * plugin: the page makes every field optional but the folder is the plugin
 * either way.
 */
export function claudePluginManifestReadingOf(
  sourceText: string,
  sourceRelativePath: string,
): PluginCarrierReading {
  const fields = new ParsedStrictJsonDocument(sourceText).entries;
  return {
    // A manifest declares one plugin and nothing about a catalog, so it
    // publishes no catalog fields: its own keys are that plugin's.
    catalogFields: [],
    // The placement is what establishes the plugin; the parse adds the keys
    // the file wrote to it.
    plugins: [{ ...claudePluginPlacementOf(sourceRelativePath), fields }],
  };
}

/**
 * The plugin a manifest's placement establishes, with no fields read out of it
 * (`plugin-source.ts` § CompiledStaticPluginManifestRule).
 *
 * The name is the folder's, qualified by `skills-dir`: the cited page names
 * such a plugin `<folder>@skills-dir`, and what makes the folder a plugin is
 * this file being in it rather than anything the file says. The manifest's own
 * `name` key stays one of the fields the detail publishes.
 */
export function claudePluginPlacementOf(sourceRelativePath: string): PluginDeclarationDto {
  // `<root>/.claude-plugin/plugin.json`: the two trailing segments are the
  // rule's own literals, so what remains is the plugin root, and its last
  // segment is the folder Claude names the plugin after.
  const rootSegments = sourceRelativePath.split('/').slice(0, -2);
  return {
    name: claudeQualifiedPluginNameOf(
      rootSegments.at(-1) ?? null,
      CLAUDE_SKILLS_DIRECTORY_MARKETPLACE,
    ),
    fields: [],
    // The folder holding this manifest is the plugin, so its files come from a
    // directory of this repository and nothing offers it from elsewhere
    // (`api-types.ts` § PluginDeclarationDto.sourceForm).
    sourceForm: 'repository-directory',
    pluginRoot: `${rootSegments.join('/')}/`,
    manifestPaths: [sourceRelativePath],
  };
}

/**
 * The Claude plugin catalog rule compiled for execution: everything a Claude
 * rule is, plus the one question only a catalog answers — which plugins its
 * entries resolve, and where each of them sits inside this Source.
 *
 * The reading is `plugins/claude.ts`, beside the other vendors' plugin
 * readings; the unit stays here, where the base it extends is.
 */
export class ClaudeCompiledPluginCatalogRule
  extends ClaudeCompiledRule
  implements CompiledStaticPluginCatalogRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is a catalog listing plugins. */
  public readonly pluginCarrier: 'catalog';

  /**
   * What this catalog declares — its own keys, and one declaration per entry
   * (`plugins/claude.ts` § claudePluginCatalogReadingOf).
   */
  public pluginCarrierReadingOf(sourceText: string): PluginCarrierReading {
    return claudePluginCatalogReadingOf(sourceText);
  }

  /** Compiles one Claude plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude plugin rule`);
    }
    this.pluginCarrier = 'catalog';
  }
}

/**
 * The Claude skills-directory plugin rule compiled for execution: everything a
 * Claude rule is, plus the one question only a manifest carrier answers —
 * which plugin this file declares, and which directory that plugin is.
 *
 * The reading is `plugins/claude.ts`, for the reason the catalog unit gives.
 */
export class ClaudeCompiledPluginManifestRule
  extends ClaudeCompiledRule
  implements CompiledStaticPluginManifestRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is one plugin's own manifest. */
  public readonly pluginCarrier: 'manifest';

  /**
   * The one plugin this manifest declares, with the keys the file wrote
   * (`plugins/claude.ts` § claudePluginManifestReadingOf).
   */
  public pluginCarrierReadingOf(
    sourceText: string,
    sourceRelativePath: string,
  ): PluginCarrierReading {
    return claudePluginManifestReadingOf(sourceText, sourceRelativePath);
  }

  /**
   * The plugin this manifest's placement establishes, with no fields read out
   * of it (`plugins/claude.ts` § claudePluginPlacementOf).
   */
  public pluginEstablishedByPath(sourceRelativePath: string): PluginDeclarationDto {
    return claudePluginPlacementOf(sourceRelativePath);
  }

  /** Compiles one Claude skills-directory plugin record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude plugin rule`);
    }
    this.pluginCarrier = 'manifest';
  }
}
