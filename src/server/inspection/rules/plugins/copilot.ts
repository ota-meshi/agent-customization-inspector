// Copilot's plugin carrier: the repository catalog — at whichever of the four
// documented locations a repository uses — whose entries resolve plugin names
// to the directories their plugins occupy
// (contracts/vendors/github-copilot.md § Repository vendor behavior). Both the
// unit that admits one and the reading it answers with are here.
//
// Which keys a catalog writes, which source forms name a directory this
// repository carries, and how a name follows from an entry are this vendor's
// contract, so they are read here rather than shared: this vendor documents a
// relative path and two object forms, and nothing else names anything here.
//
// The base this unit extends is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type { CompiledStaticPluginCatalogRule, PluginCarrierReading } from './compiled-rule';
import {
  type DeclaredPluginSource,
  declaredValueUnder,
  localPluginRootSegments,
  UNRECOGNIZED_PLUGIN_SOURCE,
} from './plugin-source';
import { ParsedStrictJsonDocument } from '../../parsers/json';
import type { DeclaredEntryDto, PluginSourceForm } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key a Copilot plugin catalog lists its entries under
 * (contracts/vendors/github-copilot.md § Repository vendor behavior): the CLI
 * reference defines a marketplace as a `plugins` array of one object per
 * plugin. A literal here rather than anything a caller passes, because it is
 * this vendor's own format.
 */
const COPILOT_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a catalog and a plugin declaration each write their name under. */
const COPILOT_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const COPILOT_PLUGIN_SOURCE_KEY = 'source';

/**
 * What each documented `source.source` value names
 * (`github.copilot.cli.plugin-reference` § Plugin source types).
 *
 * The page's own set, mapped to the kinds every vendor's forms share
 * (`api-types.ts` § PluginSourceForm): it documents an object describing a
 * GitHub repository or a Git URL, and a relative path string for a plugin the
 * catalog's own repository carries. A `local` object is Codex's spelling
 * rather than this vendor's, so it is not here and does not name a directory.
 */
const COPILOT_PLUGIN_SOURCE_FORMS = new Map<string, PluginSourceForm>([
  /** `{ repo, ref?, sha?, path? }` — a GitHub repository. */
  ['github', 'github-repository'],
  /** `{ url, ref?, sha?, path? }` — a Git repository named by URL. */
  ['url', 'git-repository'],
]);

/**
 * Where a Copilot plugin root may keep the plugin's own manifest, relative to
 * that root, in the order the CLI checks them
 * (`github.copilot.cli.plugins` § File locations).
 *
 * Four forms rather than one because this vendor reads four: a root
 * `plugin.json` is the Copilot and Agent Plugins form, `.claude-plugin/` is the
 * Claude form it also accepts, and `.plugin/` is the legacy OpenPlugin one.
 * They name files rather than admitting them: no rule reaches a manifest below
 * a catalog's root, and each is published as one of the plugin's own files.
 */
const COPILOT_PLUGIN_MANIFEST_PATHS: readonly string[] = [
  '.plugin/plugin.json',
  'plugin.json',
  '.github/plugin/plugin.json',
  '.claude-plugin/plugin.json',
];

/**
 * The name one declaration resolves: the `name` scalar exactly as written, or
 * null when it writes none or writes it as anything but a scalar — naming a
 * plugin after the first item of a list it wrote would be an identity the file
 * never declared (FR-007).
 */
function copilotPluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === COPILOT_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * The name Copilot addresses one plugin by: the plugin's own name qualified by
 * the marketplace it came from, `<plugin-name>@<marketplace-name>` — the key
 * `enabledPlugins` uses and `copilot plugins install` takes — or null when
 * either half is missing, because a plugin Copilot could not address is no name
 * at all.
 */
function copilotQualifiedPluginNameOf(
  pluginName: string | null,
  marketplaceName: string | null,
): string | null {
  return pluginName === null || marketplaceName === null
    ? null
    : `${pluginName}@${marketplaceName}`;
}

/**
 * The catalog key whose object carries the directory entry paths resolve under,
 * the same spelling the other product reading this catalog documents.
 */
const COPILOT_CATALOG_METADATA_KEY = 'metadata';

/** The `metadata` key naming that directory. */
const COPILOT_METADATA_PLUGIN_ROOT_KEY = 'pluginRoot';

/**
 * One string entry source as the `./`-anchored path this vendor resolves it to,
 * for {@link localPluginRootSegments} to tokenize.
 *
 * A string source is a path relative to the marketplace directory rather than a
 * repository shorthand: `plugins/formatter` and `./plugins/formatter` are one
 * directory, the prefix being optional, and a declared `metadata.pluginRoot` is
 * joined in front of either spelling. The page documents only "a relative path
 * string", so the rest is this client's own resolution, which strips one
 * leading `./`, joins the declared root, and refuses a path leaving the
 * marketplace directory (`copilot` 0.0.420); matching the client where its
 * documentation stops is the standing decision for this kind.
 *
 * The `owner/repo` shorthand belongs to the other end of the chain: the CLI
 * takes it when a marketplace is added, where the source names the catalog
 * rather than a plugin inside one, and normalizes it to a GitHub source there.
 */
function copilotEntryPathOf(
  declaredSource: string,
  catalogFields: readonly DeclaredEntryDto[],
): string {
  const relative = declaredSource.startsWith('./')
    ? declaredSource.slice('./'.length)
    : declaredSource;
  const metadata = declaredValueUnder(catalogFields, COPILOT_CATALOG_METADATA_KEY);
  const declaredRoot =
    metadata !== null && metadata.kind === 'mapping'
      ? declaredValueUnder(metadata.entries, COPILOT_METADATA_PLUGIN_ROOT_KEY)
      : null;
  if (
    declaredRoot === null ||
    declaredRoot.kind !== 'scalar' ||
    declaredRoot.scalarKind !== 'string'
  ) {
    return `./${relative}`;
  }
  // The client strips one leading `./` from the declared root as it does from
  // the source, and joins with one separator: a root written `./` or with a
  // trailing slash is the same directory, and joining it verbatim would spell
  // the empty segment the path contract refuses — losing the plugin root of a
  // catalog that is spelled exactly as its own page shows.
  const anchored = declaredRoot.text.startsWith('./')
    ? declaredRoot.text.slice('./'.length)
    : declaredRoot.text;
  const root = anchored.endsWith('/') ? anchored.slice(0, -1) : anchored;
  return root === '' ? `./${relative}` : `./${root}/${relative}`;
}

/**
 * What one catalog entry's `source` names, in the kinds every vendor's forms
 * share, with the Source-relative segments of its directory when it names one
 * (`registry.ts` § DeclaredPluginSource).
 *
 * The documented forms and nothing else
 * (`github.copilot.cli.plugin-reference` § Plugin source types): the `source`
 * field takes a relative path string — the page's own catalog example writes
 * `./plugins/<name>` — or an object naming a GitHub repository or a Git URL in
 * its own `source` key, and a path string resolves through
 * {@link copilotEntryPathOf} whether or not it carries the prefix. A
 * non-string scalar is neither spelling, because the page documents a path as
 * a string, and an object whose discriminant this vendor does not define is a
 * form it does not document; both stay unrecognized rather than being guessed
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
 *
 * The `owner/repo` shorthand belongs to the other end of the chain: the CLI
 * takes it when a marketplace is added, where the source names the catalog
 * rather than a plugin inside one.
 */
function copilotPluginSourceOf(
  entryFields: readonly DeclaredEntryDto[],
  catalogFields: readonly DeclaredEntryDto[],
): DeclaredPluginSource {
  const declared = declaredValueUnder(entryFields, COPILOT_PLUGIN_SOURCE_KEY);
  if (declared === null) {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.kind === 'scalar') {
    return declared.scalarKind === 'string'
      ? {
          form: 'repository-directory',
          rootSegments: localPluginRootSegments(copilotEntryPathOf(declared.text, catalogFields)),
        }
      : UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.kind !== 'mapping') {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  const discriminant = declaredValueUnder(declared.entries, COPILOT_PLUGIN_SOURCE_KEY);
  const form =
    discriminant !== null && discriminant.kind === 'scalar'
      ? COPILOT_PLUGIN_SOURCE_FORMS.get(discriminant.text)
      : undefined;
  return form === undefined ? UNRECOGNIZED_PLUGIN_SOURCE : { form, rootSegments: null };
}

/**
 * What one admitted catalog declares: its own keys except `plugins`, and one
 * declaration per entry of that array in the parser's resolved order, each
 * carrying the directory that entry's plugin occupies here and the manifest
 * forms this vendor's client looks for inside it.
 *
 * Entry classification is structural and total, exactly as the MCP carrier
 * reading's is: only an object inside `plugins` is an entry, and a scalar or
 * an array there is omitted whole rather than published partially, as is a
 * `plugins` value that is not an array at all. Strict JSON because that is
 * what the catalog is.
 */
export function copilotPluginCatalogReadingOf(sourceText: string): PluginCarrierReading {
  const entries = new ParsedStrictJsonDocument(sourceText).entries;
  const declared = entries.find(
    (entry) => entry.keyKind === 'string' && entry.key === COPILOT_CATALOG_PLUGINS_KEY,
  );
  const catalogFields = entries.filter((entry) => entry !== declared);
  if (declared === undefined || declared.value.kind !== 'sequence') {
    return { catalogFields, plugins: [] };
  }
  const marketplaceName = copilotPluginNameOf(catalogFields);
  return {
    catalogFields,
    plugins: declared.value.items.flatMap((item) => {
      if (item.kind !== 'mapping') {
        return [];
      }
      const source = copilotPluginSourceOf(item.entries, catalogFields);
      // A GitHub, Git, or unrecognized source names no directory this Source
      // holds, and neither does a relative path that leaves it: the offering
      // stands and occupies nothing here, with no manifest of its own to
      // open either.
      const pluginRoot = source.rootSegments === null ? null : `${source.rootSegments.join('/')}/`;
      return [
        {
          name: copilotQualifiedPluginNameOf(copilotPluginNameOf(item.entries), marketplaceName),
          fields: item.entries,
          sourceForm: source.form,
          pluginRoot,
          manifestPaths:
            pluginRoot === null
              ? []
              : COPILOT_PLUGIN_MANIFEST_PATHS.map((form) => `${pluginRoot}${form}`),
        },
      ];
    }),
  };
}

/**
 * The Copilot plugin catalog rule compiled for execution: everything a Copilot
 * rule is, plus the one question only a catalog answers — which plugins its
 * entries resolve, and where each of them sits inside this Source.
 *
 * The reading is `plugins/copilot.ts`, beside the other vendors' plugin
 * readings; the unit stays here, where the base it extends is.
 */
export class CopilotCompiledPluginCatalogRule
  extends CopilotCompiledRule
  implements CompiledStaticPluginCatalogRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is a catalog listing plugins. */
  public readonly pluginCarrier: 'catalog';

  /**
   * What this catalog declares — its own keys, and one declaration per entry
   * (`plugins/copilot.ts` § copilotPluginCatalogReadingOf).
   */
  public pluginCarrierReadingOf(sourceText: string): PluginCarrierReading {
    return copilotPluginCatalogReadingOf(sourceText);
  }

  /** Compiles one Copilot plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot plugin rule`);
    }
    this.pluginCarrier = 'catalog';
  }
}
