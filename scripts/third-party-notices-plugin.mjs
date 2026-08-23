// Build-time third-party notice collection for the browser bundle
// (spec.md FR-043).
//
// The published package inlines third-party code: the client bundle carries
// Monaco, Vue, the Nuxt runtime, and the devframe client as its own bytes
// rather than as installed packages the user receives with their license
// files. Every one of those licenses requires its copyright and permission
// notice to travel with the copies, so the notice has to be in the tarball.
//
// The list is derived from the emitted chunks instead of being maintained by
// hand: a hand-written list agrees with the bundle only until the next
// dependency change, and the failure is silent — the tarball ships code whose
// notice was never added. Rollup already records which modules it rendered into
// each chunk, so that record is the one fact and this file reads it.
//
// Membership is decided by bundling, not by dependency type: a package is here
// when its code is in the emitted output, whichever section of the manifest
// declares it — or whether it declares it at all, since the bundler injects
// helpers of its own. `devframe` is a runtime dependency whose *client* half is
// bundled, so it appears; `gunshi` is loaded from `node_modules` at run time, so
// it does not.
//
// Nothing here degrades quietly. A module this file cannot attribute, a package
// whose manifest cannot be read, and a notice file that cannot be read all stop
// the build, because each of them would otherwise publish third-party code with
// no notice and no sign that one is missing.
import { readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

/**
 * Files that carry a package's own terms. A package may ship more than one —
 * Monaco ships its MIT `LICENSE` plus a `ThirdPartyNotices.txt` for the
 * components it in turn incorporates (the codicon font among them), and both
 * must reach the reader.
 */
const NOTICE_FILE_PATTERN =
  /(?:^|[.\-_])(?:licen[cs]es?|copying|notices?|third[-_]?party[-_]?(?:notices?|licen[cs]es?))(?:$|[.\-_])/iu;

/**
 * Where a package may keep its notice files. The root is where nearly every
 * package puts them; the rest are the conventional places a build output or a
 * generated-notice file ends up, and a package that keeps its terms one
 * directory down would otherwise be listed with no terms at all.
 */
const NOTICE_DIRECTORIES = ['.', 'dist', 'licenses', 'license'];

/**
 * Where this repository keeps the notice text of a bundled package that ships
 * none of its own, named after that package: `licenses/<package name>.txt`.
 *
 * Nothing here is a hand-maintained *list* — which package needs a text is
 * still decided by the bundle, and a package with neither its own notice nor
 * one here still stops the build. What this covers is the case the derivation
 * cannot reach: a package that declares its license in its manifest but
 * publishes no file holding that license's text, so the text can only come
 * from upstream, copied verbatim from that project's own `LICENSE`. The
 * `@iconify-json/*` collections are one — their icon artwork is inlined into
 * the bundle as SVG paths — and `@ota-meshi/site-kit-monarch-syntaxes`, whose
 * TOML grammar the editor's language registration imports, is another.
 */
const VENDORED_NOTICE_DIRECTORY = 'licenses';

/**
 * Module ids the bundler injects, mapped to the package whose code they are.
 *
 * These carry no path to read a package name from: Vite's preload helper and
 * module-preload polyfill and the Vue plugin's SFC export helper are emitted as
 * virtual modules, and they are real rendered code in the output rather than
 * build-time scaffolding. Nuxt's `virtual:nuxt:` ids are the client entry, route
 * table, and plugin list generated from Nuxt's own templates.
 *
 * The table is short and its incompleteness is loud: an id matching no prefix
 * here, no installed package, and not the product's own tree fails the build, so
 * a new injected helper cannot slip past unattributed.
 */
const INJECTED_MODULE_PACKAGES = [
  { prefix: 'vite/', name: 'vite' },
  { prefix: 'plugin-vue:', name: '@vitejs/plugin-vue' },
  { prefix: 'virtual:nuxt:', name: 'nuxt' },
  // unplugin-icons compiles `~icons/<collection>/<name>` into a component
  // carrying that icon's SVG data, which is the icon collection's own artwork
  // rather than the plugin's code. Each prefix names one collection so no
  // collection can be attributed to another's package: an unlisted one reaches
  // the throw below, which is the point of keeping this table exact.
  { prefix: '~icons/lucide/', name: '@iconify-json/lucide' },
  { prefix: '~icons/simple-icons/', name: '@iconify-json/simple-icons' },
];

/**
 * The repository root, which is what tells the product's own sources from
 * everything else. This file lives in `scripts/`.
 */
const PROJECT_ROOT = resolve(import.meta.dirname, '..').replaceAll('\\', '/');

/**
 * A module id reduced to the path or specifier it names: Rollup's virtual-module
 * `\0` prefix and Vite's `?vue&type=…` query removed, and separators normalized.
 * Vite reports resolved ids with `/` on every platform, so the walk below must
 * not look for a platform separator that will not be there.
 *
 * @param {string} moduleId
 * @returns {string}
 */
function normalizeModuleId(moduleId) {
  const withoutQuery = moduleId.split('?')[0] ?? moduleId;
  return withoutQuery.replace(/^\0/u, '').replaceAll('\\', '/');
}

/**
 * Where an installed package is, in the layouts the supported package managers
 * produce: hoisted directly under `node_modules`, or under pnpm's
 * content-addressed `.pnpm` tree. Used only for the injected helpers above,
 * whose ids carry no path; a package with a real module path is located from
 * that path instead.
 *
 * @param {string} name Package name, scope included.
 * @returns {string | null}
 */
function findInstalledPackage(name) {
  const direct = join(PROJECT_ROOT, 'node_modules', ...name.split('/'));
  try {
    statSync(join(direct, 'package.json'));
    // Through the link: a hoisted entry is a symbolic link into the store under
    // pnpm, and the module ids of that same package arrive already resolved. Two
    // spellings of one directory would list the package twice.
    return realpathSync(direct).replaceAll('\\', '/');
  } catch {
    // Not hoisted. pnpm keeps a transitive dependency under `.pnpm` instead.
  }
  const store = join(PROJECT_ROOT, 'node_modules', '.pnpm');
  let entries;
  try {
    entries = readdirSync(store).toSorted();
  } catch {
    return null;
  }
  for (const entry of entries) {
    const candidate = join(store, entry, 'node_modules', ...name.split('/'));
    try {
      statSync(join(candidate, 'package.json'));
      return realpathSync(candidate).replaceAll('\\', '/');
    } catch {
      // This store entry holds a different package.
    }
  }
  return null;
}

/**
 * The package a rendered module belongs to, or null when the module is the
 * product's own source.
 *
 * Throws for anything else: an id this cannot attribute is code in the bundle
 * whose notice would otherwise be missing with nothing to show it.
 *
 * @param {string} moduleId Module id from an emitted chunk.
 * @returns {{ name: string, directory: string } | null}
 */
function owningPackage(moduleId) {
  const id = normalizeModuleId(moduleId);
  const segments = id.split('/');
  const marker = segments.lastIndexOf('node_modules');
  const first = marker === -1 ? undefined : segments[marker + 1];
  // A dot-directory under `node_modules` is a package manager's own space —
  // `.pnpm`, `.cache`, `.bin` — rather than a package. A scoped name takes two
  // segments; every other name takes one.
  if (first !== undefined && !first.startsWith('.')) {
    const depth = first.startsWith('@') ? 2 : 1;
    const nameSegments = segments.slice(marker + 1, marker + 1 + depth);
    if (nameSegments.length === depth) {
      return {
        name: nameSegments.join('/'),
        directory: segments.slice(0, marker + 1 + depth).join('/'),
      };
    }
  }
  const injected = INJECTED_MODULE_PACKAGES.find((entry) => id.startsWith(entry.prefix));
  if (injected !== undefined) {
    const directory = findInstalledPackage(injected.name);
    if (directory === null) {
      throw new Error(
        `the bundle contains code injected by ${injected.name}, which is not installed where its license can be read`,
      );
    }
    return { name: injected.name, directory };
  }
  if (id.startsWith(`${PROJECT_ROOT}/`)) {
    // The product's own source, covered by the package's own LICENSE file.
    return null;
  }
  throw new Error(
    `cannot attribute the bundled module ${moduleId} to a package: add its prefix to the injected-module table`,
  );
}

/**
 * One package's notice section: its name and version, the license identifier it
 * declares, and every notice text it ships.
 *
 * The manifest is required rather than optional. This package's modules are in
 * the emitted output, so a manifest that cannot be read or parsed is a broken
 * installation, not a package to pass over.
 *
 * @param {{ name: string, directory: string }} target
 * @returns {{ name: string, version: string, license: string, texts: string[] }}
 */
function noticeFor(target) {
  /** @type {{ version?: unknown, license?: unknown }} */
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(target.directory, 'package.json'), 'utf8'));
  } catch (cause) {
    throw new Error(`cannot read the manifest of the bundled package ${target.name}`, { cause });
  }
  const texts = [];
  for (const directory of NOTICE_DIRECTORIES) {
    const absolute = join(target.directory, directory);
    let entries;
    try {
      entries = readdirSync(absolute).toSorted();
    } catch {
      // The package does not have this directory. Only `.` is expected of every
      // package; the rest are conventional places, so their absence is normal.
      continue;
    }
    for (const entry of entries) {
      if (!NOTICE_FILE_PATTERN.test(entry)) {
        continue;
      }
      const notice = join(absolute, entry);
      // A matching name that is itself a directory — some packages ship a
      // `licenses/` folder — is covered by walking the list above, not by
      // reading it as a file.
      if (statSync(notice).isDirectory()) {
        continue;
      }
      try {
        texts.push(readFileSync(notice, 'utf8').trimEnd());
      } catch (cause) {
        throw new Error(`cannot read ${entry} of the bundled package ${target.name}`, { cause });
      }
    }
  }
  if (texts.length === 0) {
    // The package ships no notice of its own; this repository may hold the
    // upstream text for it (see {@link VENDORED_NOTICE_DIRECTORY}). A package
    // with neither still reaches the build-stopping check in `generateBundle`.
    const vendored = join(PROJECT_ROOT, VENDORED_NOTICE_DIRECTORY, `${target.name}.txt`);
    try {
      texts.push(readFileSync(vendored, 'utf8').trimEnd());
    } catch {
      // No vendored text for this package either.
    }
  }
  return {
    name: target.name,
    version: typeof manifest.version === 'string' ? manifest.version : '',
    license: typeof manifest.license === 'string' ? manifest.license : '',
    texts,
  };
}

/**
 * Renders the notice document the tarball ships.
 *
 * @param {ReadonlyArray<{ name: string, version: string, license: string, texts: string[] }>} notices
 * @returns {string}
 */
function renderNotices(notices) {
  const header = [
    'THIRD-PARTY NOTICES',
    '',
    'This file lists the third-party packages whose code is included in this',
    "application's browser bundle, together with the license text each package",
    'ships. It is generated from the bundle itself at build time.',
    '',
    'Packages used only as external run-time dependencies are not repeated here:',
    'the package manager installs those for you, with their own license files.',
    '',
  ];
  const sections = notices.map((notice) => {
    const title = `${notice.name}${notice.version === '' ? '' : `@${notice.version}`}`;
    return `${'='.repeat(72)}\n${title}\n${'='.repeat(72)}\n\n${notice.texts.join('\n\n')}\n`;
  });
  return [...header, ...sections].join('\n');
}

/**
 * The Vite plugin that writes the notice document into the published browser
 * output. Client build only: the server build's output never reaches the
 * package, so a notice emitted there would be written where nothing serves it.
 *
 * @param {{ fileName?: string }} [options]
 * @returns {import('vite').Plugin}
 */
export function thirdPartyNoticesPlugin({ fileName = 'THIRD-PARTY-NOTICES.txt' } = {}) {
  let isClientBuild = false;
  let assetsDir = '';
  return {
    name: 'aci-third-party-notices',
    apply: 'build',
    configResolved(config) {
      isClientBuild = config.build.ssr === false;
      // The notice goes into the build-assets directory rather than the client
      // output root: the static Nitro preset publishes that directory into
      // `dist/public`, and a file beside it is left behind in the build cache.
      assetsDir = config.build.assetsDir;
    },
    generateBundle(_options, bundle) {
      if (!isClientBuild) {
        return;
      }
      // The emitted chunks, not the loaded module graph: the graph holds every
      // module Rollup resolved, including ones tree-shaking then dropped, so a
      // discarded copy of a package could stand in for the copy that shipped. A
      // module rendered to nothing contributed no code either. Keyed by
      // directory rather than by name, because two versions of one package can
      // both be installed and only the ones in a chunk belong here.
      const byDirectory = new Map();
      for (const output of Object.values(bundle)) {
        if (output.type !== 'chunk') {
          continue;
        }
        for (const [moduleId, module] of Object.entries(output.modules)) {
          if (module.renderedLength === 0) {
            continue;
          }
          const target = owningPackage(moduleId);
          if (target !== null && !byDirectory.has(target.directory)) {
            byDirectory.set(target.directory, target);
          }
        }
      }
      const notices = [...byDirectory.keys()]
        .toSorted()
        .map((directory) => noticeFor(byDirectory.get(directory)));
      // A bundled package whose notice text could not be found would ship its
      // code with a licence identifier and nothing that satisfies the licence.
      // That is the failure this whole file exists to prevent, so it stops the
      // build here rather than being discovered in a published tarball
      // (FR-043).
      const withoutText = notices.filter((notice) => notice.texts.length === 0);
      if (withoutText.length > 0) {
        this.error(
          `no license text found for bundled package(s): ${withoutText
            .map((notice) => `${notice.name}@${notice.version}`)
            .join(', ')}`,
        );
      }
      this.emitFile({
        type: 'asset',
        fileName: assetsDir === '' ? fileName : posix.join(assetsDir, fileName),
        source: renderNotices(notices),
      });
    },
  };
}
