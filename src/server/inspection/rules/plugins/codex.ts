// Codex's plugin carrier: the repository catalog whose entries resolve plugin
// names to the directories their plugins occupy
// (contracts/vendors/openai-codex.md § Documented Repository behavior). Both
// the unit that admits one and the reading it answers with are here.
//
// Which keys a catalog writes, which source forms name a directory this
// repository carries, and how a name follows from an entry are this vendor's
// contract, so they are read here rather than shared: a form one product
// documents is not a form the others do, and Codex resolves an offering as
// `plugin@marketplace` by its own rule.
//
// The base this unit extends is `../vendor/codex.ts` rather than
// `../codex.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticPluginCatalogRule, PluginCarrierReading } from './compiled-rule';
import {
  type DeclaredPluginSource,
  declaredValueUnder,
  localPluginRootSegments,
  UNRECOGNIZED_PLUGIN_SOURCE,
} from './plugin-source';
import { ParsedJsonDocument } from '../../parsers/json';
import { toPublicPath } from '../../traversal';
import type { DeclaredEntryDto, PluginSourceForm } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key a Codex plugin catalog lists its entries under
 * (contracts/vendors/openai-codex.md § Documented Repository behavior): the
 * page defines a catalog as a `plugins` array of one object per plugin. It is
 * a literal here rather than anything a caller passes, because it is this
 * vendor's own format.
 */
const CODEX_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a plugin declaration writes its name under, in both carrier shapes. */
const CODEX_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const CODEX_PLUGIN_SOURCE_KEY = 'source';

/**
 * The key a local source object writes its path under; a local entry may also
 * spell the whole source as that path string
 * (`openai.codex.plugins` § Marketplace metadata).
 */
const CODEX_PLUGIN_SOURCE_PATH_KEY = 'path';

/** The value `source.source` carries for the one form that names a local directory. */
const CODEX_LOCAL_SOURCE_VALUE = 'local';

/**
 * What each other documented `source.source` value names
 * (`openai.codex.plugins` § Marketplace metadata).
 *
 * The page's own set, mapped to the kinds every vendor's forms share
 * (`api-types.ts` § PluginSourceForm). `local` is absent because it is the one
 * form that answers a directory rather than a place outside this Source, so
 * the reading below handles it with the path it carries.
 */
const CODEX_PLUGIN_SOURCE_FORMS = new Map<string, PluginSourceForm>([
  /** A plugin at the root of a Git repository named by URL. */
  ['url', 'git-repository'],
  /** `{ url, path, ref? }` — a directory inside a Git repository. */
  ['git-subdir', 'git-subdirectory'],
  /** `{ package, version?, registry? }` — an npm package. */
  ['npm', 'npm-package'],
]);

/**
 * Where a Codex plugin root keeps the plugin's own manifest, relative to that
 * root (`codex.behavior.plugin.manifest`): the required entry point a
 * plugin-capable client reads the plugin's declaration of itself from
 * (contracts/vendors/openai-codex.md § Documented Repository behavior).
 *
 * It names the file rather than admitting it: no rule reaches a manifest, and
 * the file is published as one of the plugin's own. What this answers is which
 * of those files the plugin's detail opens on.
 */
const CODEX_PLUGIN_MANIFEST_PATH = '.codex-plugin/plugin.json';

/**
 * The name one plugin declaration resolves: the `name` scalar exactly as it
 * was written, or null when the declaration writes none or writes it as
 * anything but a scalar — naming a plugin after the first item of a list it
 * wrote would be an identity the file never declared (FR-007).
 */
function codexPluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === CODEX_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * What one catalog entry's `source` names, in the kinds every vendor's forms
 * share, with the Source-relative segments of its directory when it names one
 * (`registry.ts` § DeclaredPluginSource).
 *
 * The documented forms and nothing else (`openai.codex.plugins` § Marketplace
 * metadata): the local form is the object with `source: 'local'` and a `path`,
 * or the plain string path a local entry may use instead, which the page
 * requires to start with `./` and stay inside the marketplace root. A `url`,
 * `git-subdir`, or `npm` entry also writes a `path` or a `package`, so the
 * discriminant is read rather than the presence of a path. Everything else is
 * a form this vendor does not document, and stays unrecognized rather than
 * being guessed at (FR-004, FR-024).
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
 * `./` is relative to the marketplace root, which for a repository catalog is
 * the Source root itself — the personal pattern the same page documents,
 * `./.codex/plugins/<name>` beside a catalog at `~/.agents/plugins/`, resolves
 * against the home directory rather than against the catalog's own directory,
 * and the repository half of that rule is the root
 * (contracts/vendors/openai-codex.md § Derived Repository rules).
 */
/**
 * Whose census a Codex catalog's `./` local sources feed: the repository
 * catalog's resolve against the Repository root and their directories are
 * enumerated, while the personal catalog at `~/.agents/plugins/marketplace.json`
 * publishes its declarations alone — no plugin directory below the shared
 * agent home is admitted, however the source spells it (FR-018, FR-045;
 * contracts/http-api.md § get-plugin-carrier-detail;
 * contracts/vendors/openai-codex.md § Inspector Global rule: "the plugins it
 * names … stay excluded exactly as Repository plugin bodies are").
 */
type CodexCatalogScope = 'repository' | 'agents-home';

/**
 * The Source-relative segments a validated local source occupies inside this
 * Source, or null when it occupies nothing here.
 *
 * For a repository catalog the validated segments are the plugin root the
 * census then enumerates. For the personal catalog the answer is always
 * null: the contracted read below the shared agent home is the catalog file
 * itself, so a declared source — whatever directory it names — reaches no
 * enumeration and no read ({@link CodexCatalogScope}). Returning null is
 * what `pluginRoot: null` already means on every out-of-Source declaration:
 * the offering stands, and it occupies nothing here.
 */
function codexLocalRootInSource(
  scope: CodexCatalogScope,
  declaredPath: string | null,
): readonly string[] | null {
  return scope === 'repository' ? localPluginRootSegments(declaredPath) : null;
}

function codexPluginSourceOf(
  scope: CodexCatalogScope,
  entryFields: readonly DeclaredEntryDto[],
): DeclaredPluginSource {
  const declared = declaredValueUnder(entryFields, CODEX_PLUGIN_SOURCE_KEY);
  if (declared === null) {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.kind === 'scalar') {
    // A declared string and nothing else: the page documents the plain
    // spelling as a path string, and a number's rendering is not one.
    return declared.scalarKind === 'string' && declared.text.startsWith('./')
      ? { form: 'repository-directory', rootSegments: codexLocalRootInSource(scope, declared.text) }
      : UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (declared.kind !== 'mapping') {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  const discriminant = declaredValueUnder(declared.entries, CODEX_PLUGIN_SOURCE_KEY);
  if (discriminant === null || discriminant.kind !== 'scalar') {
    return UNRECOGNIZED_PLUGIN_SOURCE;
  }
  if (discriminant.text === CODEX_LOCAL_SOURCE_VALUE) {
    const path = declaredValueUnder(declared.entries, CODEX_PLUGIN_SOURCE_PATH_KEY);
    return {
      form: 'repository-directory',
      rootSegments:
        path !== null && path.kind === 'scalar' && path.scalarKind === 'string'
          ? codexLocalRootInSource(scope, path.text)
          : null,
    };
  }
  const form = CODEX_PLUGIN_SOURCE_FORMS.get(discriminant.text);
  return form === undefined ? UNRECOGNIZED_PLUGIN_SOURCE : { form, rootSegments: null };
}

/**
 * The name Codex resolves one catalog offering by: the entry's own name
 * qualified by the catalog's, `plugin@marketplace`, or null when either half is
 * missing — an offering Codex could not address is no name at all.
 *
 * The spelling is the tool's own. `codex plugin add` and `codex plugin remove`
 * take a `PLUGIN[@MARKETPLACE]` selector, `codex plugin list` prints the
 * qualified form in its `PLUGIN` column, and the per-plugin state in
 * `~/.codex/config.toml` is keyed by it (observed against codex-cli 0.144.6).
 * The cited page does not spell the pair out; what it establishes is that the
 * pair is the identity — an installed plugin lives under
 * `<cache>/<marketplace>/<plugin>/<version>`
 * (contracts/vendors/openai-codex.md § Known uncertainties, item 7).
 *
 * It lives here because it is Codex's rule. Another product's plugin phase
 * resolves its own names in its own module, exactly as each vendor resolves its
 * own skill and command names (FR-007).
 */
function codexOfferedPluginNameOf(
  entryName: string | null,
  catalogName: string | null,
): string | null {
  return entryName === null || catalogName === null ? null : `${entryName}@${catalogName}`;
}

/**
 * What one admitted catalog declares: its own keys except `plugins`, and one
 * declaration per entry of that array in the parser's resolved order, each
 * carrying the directory that entry's plugin occupies here.
 *
 * Entry classification is structural and total, exactly as the MCP carrier
 * reading's is: only an object inside `plugins` is an entry, and a scalar or
 * an array there is omitted whole rather than published partially, as is a
 * `plugins` value that is not an array at all. Strict JSON for the reason the
 * manifest reading gives (FR-028).
 *
 * A plugin *is* its root: the `.codex-plugin/plugin.json` inside it is one of
 * the files it ships rather than a customization of its own, so an entry
 * answers the directory and never a file below it.
 */
export function codexPluginCatalogReadingOf(
  sourceText: string,
  sourceRelativePath: string,
  scope: CodexCatalogScope,
): PluginCarrierReading {
  const entries = new ParsedJsonDocument(sourceText, { tool: 'codex', sourceRelativePath }).entries;
  const declared = entries.find(
    (entry) => entry.keyKind === 'string' && entry.key === CODEX_CATALOG_PLUGINS_KEY,
  );
  const catalogFields = entries.filter((entry) => entry !== declared);
  if (declared === undefined || declared.value.kind !== 'sequence') {
    return { catalogFields, plugins: [] };
  }
  // Each entry is published under the name Codex addresses that offering by,
  // qualified by this catalog's own name; the entry's raw `name` stays one of
  // the `fields` below, where the detail publishes it as written (FR-007).
  const catalogName = codexPluginNameOf(catalogFields);
  return {
    catalogFields,
    plugins: declared.value.items.flatMap((item) => {
      if (item.kind !== 'mapping') {
        return [];
      }
      const source = codexPluginSourceOf(scope, item.entries);
      // A Git, npm, absolute, home, or root-escaping source names no
      // directory this Source holds: the offering stands and occupies
      // nothing here, and there is no manifest of its own to open either.
      const pluginRoot =
        source.rootSegments === null ? null : `${toPublicPath(source.rootSegments)}/`;
      return [
        {
          name: codexOfferedPluginNameOf(codexPluginNameOf(item.entries), catalogName),
          fields: item.entries,
          sourceForm: source.form,
          pluginRoot,
          manifestPaths: pluginRoot === null ? [] : [`${pluginRoot}${CODEX_PLUGIN_MANIFEST_PATH}`],
        },
      ];
    }),
  };
}

/**
 * The Codex plugin catalog rule compiled for execution: everything a Codex rule
 * is, plus the one question only a catalog answers — which plugins its entries
 * resolve, and where each of them sits inside this Source.
 *
 * The reading is `plugins/codex.ts`, beside the other vendors' plugin
 * readings; the unit stays here, where the base it extends is.
 */
export class CodexCompiledPluginCatalogRule
  extends CodexCompiledRule
  implements CompiledStaticPluginCatalogRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is a catalog listing plugins. */
  public readonly pluginCarrier: 'catalog';

  /**
   * Which boundary this catalog's `./` sources resolve against, derived from
   * the record's own matcher base: the one Codex catalog rule with a global
   * base is the personal `~/.agents` marketplace, whose documented base is
   * the home directory ({@link CodexCatalogScope}).
   */
  readonly #catalogScope: CodexCatalogScope;

  /**
   * What this catalog declares — its own keys, and one declaration per entry
   * (`plugins/codex.ts` § codexPluginCatalogReadingOf).
   */
  public pluginCarrierReadingOf(
    sourceText: string,
    sourceRelativePath: string,
  ): PluginCarrierReading {
    return codexPluginCatalogReadingOf(sourceText, sourceRelativePath, this.#catalogScope);
  }

  /** Compiles one Codex plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex plugin rule`);
    }
    this.pluginCarrier = 'catalog';
    this.#catalogScope = rule.matcher?.base.kind === 'global' ? 'agents-home' : 'repository';
  }
}
