# Phase 0 Research: Inspect Agent Customizations

[日本語](research.ja.md)

**Researched**: 2026-07-16; last revalidated 2026-07-22
**Scope**: Reference architecture, current compatible toolchain, safe local-host design,
safe parsing and literal display, source/metadata comparison, environment-governed scanning, and the official
customization path surface

## 1. Package architecture

**Decision**: Use one publishable ESM package with all production source under `src/` —
the browser SPA in `src/app/`, the isomorphic serializable contracts in `src/shared/`,
and the Node-only CLI/host/inspection code in `src/server/` — plus `tests/`
and one `dist/` tree. Nuxt owns the client build; tsdown owns the Node CLI
bundle. The pure Node.js `src/server/inspection/` directory owns all inspected-source
enumeration/read and is bundled with the CLI. Only typed inert DTOs cross into the browser.
All project-authored executable application code is JavaScript/TypeScript. Project and
dependency package payloads contain executable code only as JavaScript — except the one
recorded FR-038 closure exception, the `open` package's vendored POSIX-shell `xdg-open`
(§ 3) — while generated HTML/CSS,
JSON manifests, documentation, and the license remain permitted declarative artifacts.
Package-manager-generated `.bin` symlink/`.cmd`/`.ps1` launchers are payload-external
interoperability metadata with a separate closed audit. Third-party development/test tooling is pinned and
audited separately but is not published application code under FR-038.

**Rationale**: The UI and CLI form one product, share one release version, and are both
required by every `npx` launch. A single package keeps installation and release atomic
while the `src/app`-versus-Node-host boundary (with `src/shared` holding only
environment-independent contracts) prevents browser code from gaining filesystem
access. Build orchestration cleans only package-owned output trees, lets Nuxt emit the browser
application directly into `dist/public` (`nitro.output.publicDir`), and lets tsdown emit
the CLI entry and any code-split chunks directly into `dist/`. There is no
staging copy step and no output-manifest step (Implementation simplicity policy): the
build is exactly clean → `nuxt build` → `tsdown`, the devframe host serves the Nuxt-owned
`dist/public` tree directly (§ 8), and the `verify:package` gate asserts only the two
required package entries (§ 2). `package.json.bin` maps directly to the packaged
`dist/cli.mjs`: there is no separate bootstrap wrapper, because artifacts that ship
together must not re-verify each other at user runtime (Constitution Principle I).
Startup work is subject to
the capacity of Node.js, the operating system, and the execution environment; the product
does not impose byte or item-count limits, and no host bind precedes validation.
The `src/server/cli.ts` entry starts with the exact BOM-free, LF-terminated first line
`#!/usr/bin/env node`, which tsdown preserves in the bundle; this is part of the package
contract, not a release-time repair. There is no separate executable shim — `bin` maps
directly to the packaged `dist/cli.mjs` (§ 2).

Cross-platform CI runs the same Node.js filesystem integration cases on
macOS, Linux, and Windows; the published package itself contains no platform-specific
artifact.

**Alternatives considered**:

- A UI/core/CLI monorepo was rejected because the components are released together and
  have no current independent consumer.
- A Nuxt SSR/Nitro application server was rejected because the browser application is
  static and the session API is a small RPC surface on the devframe-hosted local server
  (§ 8).
- Dynamic config loading, automatic watch, static snapshot, remote
  host, build, or MCP modes were rejected because served session data may include the
  user's own secrets and must not be persisted or exposed beyond the local loopback
  session.

## 2. Build and package boundary

**Decision**: Configure Nuxt as `ssr: false` with the static Nitro preset,
`app.baseURL: '/'`, `app.buildAssetsDir: '/_nuxt/'`, an empty CDN URL, and root-absolute
same-origin assets. The full build is exactly three steps — clean → `nuxt build` →
`tsdown`. Begin by removing only the root-resolved package-owned
`.output/` and `dist/` trees. Let `nuxt build` emit the browser application
directly into `dist/public` via `nitro.output.publicDir`, keeping build metadata in
`.output/`. There is no post-Nuxt validation or manifest step: the emitted tree is owned
by Nuxt and is served as-is by the devframe host from `cli.distDir` (§ 8).

Configure tsdown with the single named entry
`{ cli: 'src/server/cli.ts' }`, Node ESM,
`fixedExtension: true`, disabled source maps/declarations, direct `dist/` output with
`clean: false` (the pipeline's own clean step owns `dist/` removal),
and `deps.skipNodeModulesBundle: true`. There is no output manifest on either side:
`dist/` contents are owned by the pipeline's own tools (Nuxt and tsdown over a
pipeline-owned clean), and the `verify:package` gate asserts only the two entries the
package contract depends on — `dist/public/index.html` (the SPA shell the devframe host
serves) and `dist/cli.mjs` (the `package.json.bin` target). The bundled
parsers run in-process on the scan path; inspected data can never select a module
to load.

The `verify:package` check runs in CI and the release gate rather than inside every local build,
because packaged-artifact assertions belong to that layer. Set
`package.json.files` exactly to
`["dist", "docs/images", "README.md", "README.ja.md", "LICENSE"]`; npm's automatic
`package.json` plus those entries are the complete tarball allowlist. Set `package.json.bin`
exactly to `{ "agent-customization-inspector": "dist/cli.mjs" }` — the tsdown bundle
preserves the entry shebang, and the package manager makes the linked bin executable at
install time — and omit `main`, `module`, and
`exports` because the package has no library API. Use no install script, runtime download,
or end-user compilation. Keep runtime packages declared as caret ranges under
`dependencies`. The committed lockfile pins the exact version and integrity this workspace
builds, tests, and audits against. It does not travel with the published package, so a
consumer's `npx` resolves those caret ranges against the registry at install time: the audit
establishes the tree this project ships and verifies, not the tree a later install produces; tsdown bundles project-owned modules and
shared contracts, not arbitrary transitive packages. The direct production dependencies are
exactly the eleven packages `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`,
`strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml` (§ 3).

Assert the approved direct production dependency set — exactly those eleven names and no
others — from `package.json` and the `pnpm-lock.yaml` closure, so any new production
dependency fails until the § 3 decision is explicitly revisited. Payload content scans — `os`/`cpu`/`libc` selectors, bundled/optional native
packages, native/binary/Wasm magic or ELF/Mach-O/PE magic, `binding.gyp`, Rust/C/C++
source, `prebuilds`, non-Node shebangs, shell helpers, executable non-JavaScript
payloads — along with lifecycle-disabled and network-disabled install runs, the
cross-OS shim audit, and per-dependency version and integrity-hash assertions are out
of scope: the committed lockfile already pins every resolved version with its
integrity hash, so a test that restates those values only duplicates the lockfile,
re-scanning hash-fixed content is the redundant re-verification Constitution
Principle I removes, and install-time lifecycle and network enforcement belongs to
the package manager's own configuration.

**Rationale**: Emitting directly into `dist/` removes the copy steps a staging design
needs; the single pipeline-owned clean step guarantees a fresh `dist/`, so every emitted
file is by construction owned by the pipeline's own tools and no manifest closure is
required to reject stale output. Leaving node_modules external avoids silently inlining platform-sensitive or changing
transitive code and makes the package manifest describe what the CLI loads. The
[tsdown dependency documentation](https://tsdown.dev/options/dependencies) distinguishes
external dependencies from explicit `alwaysBundle` behavior, and its
[entry documentation](https://tsdown.dev/options/entry) defines the named multi-entry
form. Two launch checks prove that the web, CLI, and safe-filesystem layer load from their
packaged locations. The package tests run `dist/cli.mjs` from an unrelated working directory
without installing a tarball and separately assert the exact shebang. The
`certify-lower-bounds` CI matrix installs the build job's one tarball into a fresh directory,
resolves its executable with `npx --no-install`, and launches the installed `bin` rather than
merely inspecting its mapping; the package manager owns creating the executable install link.
The committed lockfile — every resolved version with its integrity hash — makes the
production closure stable and its payloads byte-fixed for the first release without
re-scanning content the hashes already fix and without a test that restates the lockfile's
own values.
Root-absolute assets are necessary because the same shell is returned for nested routes
such as `/skills/detail/<source>/<source-relative path>`; a relative `./_nuxt/` URL would resolve beneath that route.
The official [Nuxt 4 configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config#baseurl)
defines `baseURL`, `buildAssetsDir`, and the empty-by-default `cdnURL`. The exact
[Nuxt output-directory documentation](https://nuxt.com/docs/4.x/directory-structure/output)
defines `.output` as the default generated build directory; this project overrides
`nitro.output.publicDir` to `dist/public` so the published tree is generated directly,
while `nitro.output.dir` keeps build metadata in `.output/`. Nuxt's generated `200.html`
and `404.html` static-host fallbacks ship as ordinary members of that Nuxt-owned tree;
the devframe host's SPA mount, not a product router, owns fallback routing.

`verify:package` is deliberately minimal (Implementation simplicity policy): `dist/` is
produced solely by the pipeline the package itself runs, so re-deriving and re-hashing
every emitted file only re-verified sibling build output the same pipeline had just
produced. There is no asset manifest: a build-recorded asset and CSP-inline-hash
manifest would only be validated by the same pipeline that wrote it, and the devframe
host serves the `dist/public` tree directly, and the running package performs no same-tarball
re-verification. Serving capacity is inherited from Node.js, the filesystem, and the
execution environment rather than from product-defined file-size or asset-count
validation.

The packed `package.json` closed bin/package fields are asserted by the package tests.
Node.js compatibility is declared only
through the packed `engines.node` range and enforced by the package manager's engines
mechanism (pnpm and yarn reject a mismatch by default, while classic npm emits an
EBADENGINE warning); the CLI re-checks neither the declared string nor the running
version, because re-implementing that policy in a second place can only drift, and the
packed exact string is asserted by the package tests and release gate.
Package fixtures cover the packed manifest fields, the exact shebang, the two required
`dist/` entries, and `dist/cli.mjs` execution from an unrelated working directory;
they do not define or test product file-size or item-count boundaries.

**Alternatives considered**:

- Bundling all runtime dependencies was rejected for the initial release because it makes
  dependency/license auditing and transitive behavior less visible.
- Separate published UI and CLI package roots were rejected because one pipeline-owned
  `dist/` matches the release boundary; both build tools emit directly into it.
- A hosted snapshot command was rejected because it would persist local customization
  text and could embed secrets in deployable assets.

## 3. Latest compatible stable dependency baseline

**Decision**: Declare caret ranges in `package.json` and let the committed `pnpm-lock.yaml`
pin the exact resolved version and integrity of every package, using pnpm 11.13.0. An exact specifier in `package.json` would duplicate that pin in a second place.
The caret bound excludes an incompatible major — and, for a 0.x package such as
`devframe` or `gunshi`, the next minor — and an upgrade within the range happens only on
an explicit `pnpm update`, never on a plain install.
“Latest” means the newest stable version compatible with the selected Nuxt/Vue toolchain,
not a prerelease or an incompatible major. Re-run the same registry compatibility check
immediately before creating the first lockfile.
Treat that check as a planning gate. If any selected package or version changes, stop before
configuration implementation, review the compatibility decision again, synchronize every
dependency-baseline-bearing English/Japanese research, plan, quickstart, and task artifact,
and rerun `/speckit.plan` followed by `/speckit.tasks`. A local package/lockfile edit may not
create a second dependency baseline.
An update Renovate automerges is outside this gate: which packages this project selects, and
why each was chosen, do not change. Such an update is not confined to the lockfile —
`:preserveSemverRanges` is `rangeStrategy: replace`, which rewrites the accepted range in
`package.json` whenever the new version falls outside it — so what stands behind a bump is
ci.yml, which runs the whole suite against that pull request before it merges. A version
recorded in these artifacts is the one its reason was reviewed against. Two updates never
automerge — a runtime dependency's major, and a minor to a package below 1.0.0, where
SemVer permits a breaking change in any release — so replacing a package, crossing its
major, or moving a pre-1.0 caret range still reaches this gate (AGENTS.md § Release
policy).

| Area                  |                                                                             Selected version | Reason                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js               |                                     Active LTS development/build baseline; engines `^24.11.0 |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | ^26.0.0`=`>=24.11.0 <25.0.0 |     | >=26.0.0 <27.0.0` | Declares runtime compatibility across the Node 24/26 ranges while the release matrix certifies each lower bound and excludes other majors |
| TypeScript            |                                                                                        6.0.3 | Newest compiler supported by the current Vue/Volar and typescript-eslint toolchain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Nuxt / Vue            |                                                                               4.4.8 / 3.5.39 | Current stable releases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Vue Router            |                                                                                        5.2.0 | Current stable release; satisfies Nuxt 4.4.8's declared `^5.1.0` range; no separate router abstraction                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| tsdown                |                                                                                       0.22.8 | Current stable release; supports Node 24.11+                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Vite                  |                                                                                        7.3.6 | Newest version in Nuxt 4.4.8's declared `^7.3.3` builder range                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| pnpm                  |                                                                                      11.13.0 | Current stable package manager                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Local host            |                                                                             `devframe` 0.7.5 | Local-tool host framework behind `@eslint/config-inspector`; serves the packaged SPA from `cli.distDir` and carries the session API as its RPC channel with authentication disabled; owns port/host resolution (§ 8), while its bundled opener stays disabled because the product owns browser opening through `open` (§ 3); pre-1.0, so the committed lockfile pins the reviewed baseline and the manifest's caret range stays within 0.7.x                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CLI                   |                                                                              `gunshi` 0.37.0 | Current zero-runtime-dependency ESM CLI framework; its Node.js `>=22` engine requirement fits the declared range                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Browser opener        |                                                                                `open` 11.0.1 | Current stable cross-platform opener behind the startup opener's fallback (FR-001): passes the bound loopback origin to the OS default handler, best-effort, whenever the macOS Chromium tab reuse does not apply or fails (§ 3), with devframe's bundled opener disabled so only the product's opener runs; its vendored POSIX-shell `xdg-open` — used whenever executable on Linux, the system helper otherwise — is the recorded FR-038 closure exception (§ 3)                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Host HTTP app         |                                                                             `h3` 2.0.1-rc.22 | The host builds the H3 app devframe mounts onto, carrying the detail families' shell fallbacks devframe's extension-guarded SPA fallback cannot serve — one family per shipped kind detail (§ 3), each detail URL ending with the file's own last segment, such as `SKILL.md`, and percent-encoding is no alternative because devframe decodes before its extension test. Declared as a caret range like every other direct dependency, with the lockfile resolving it to devframe's own h3 so both resolve one module instance; the dependency leaves with the host shim once devframe can serve extension-ful client-route misses itself                                                                                                                                                                                                                                                  |
| Parsers               |                                                              `yaml` 2.9.0, `smol-toml` 1.7.0 | Current stable inert data parsers; strict JSON is the platform's `JSON.parse`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| JSONC pre-parse       |                                                                  `strip-json-comments` 5.0.3 | Blanks JSONC comments and trailing commas to whitespace so the remainder goes through the same `JSON.parse` as strict JSON — one resolution for the whole JSON family. A lenient parser that builds its own objects is rejected because it cannot hold an authored `__proto__` key as an own property, which would drop a `.vscode/mcp.json` server of that name with no diagnostic                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Frontmatter           |                                                          `vfile-matter` 5.0.1, `vfile` 6.0.3 | Frontmatter delimiter handling. Deciding where a frontmatter block begins and ends means re-deciding BOM handling, line endings, and the closing-fence forms, so it is a parser rather than a regular expression. This one parses the block with the `yaml` engine already listed here; a package carrying its own `js-yaml` would give one document two meanings, because js-yaml 3 is YAML 1.1 and `yaml` is YAML 1.2                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| File opening          |                                                            `which` 6.0.1, `env-editor` 1.3.0 | The detail surfaces' open control (FR-022). `which` resolves the editor command a launch would run, so what the host offers and what it can start are one fact rather than two that can disagree; `env-editor` supplies where an installation puts that command when it is not on `PATH`, keeping those locations a maintained third-party fact instead of a table this repository would have to follow each editor's packaging with. `which` stays on 6.x because 7.0.0 declares `^24.15.0`, which excludes part of this project's own supported Node range; the launch itself reuses `open`, already listed above. A package that finds installed applications generally (`locate-app`) is rejected: it is CommonJS-only and pulls a prompt-engineering package and `crypto-js` into a production closure this project audits                                                             |
| Icons                 | `unplugin-icons` 23.0.1, `@iconify-json/lucide` 1.2.124, `@iconify-json/simple-icons` 1.2.93 | Build-time icon compilation: each `~icons/<collection>/<name>` import becomes a component carrying that icon's own SVG, so the page fetches nothing and no icon runtime ships — the arrangement FR-022 requires, and the reason Iconify's API-backed runtime (`@nuxt/icon`, `@iconify/vue`) is rejected. Both collections ship their icon data with no license file of their own, so this repository carries each set's upstream text under `licenses/` for the notice document to read (FR-043)                                                                                                                                                                                                                                                                                                                                                                                            |
| Source view/diff      |                         `monaco-editor` 0.55.1, `@ota-meshi/site-kit-monarch-syntaxes` 0.7.3 | Current stable read-only source and diff editor; its own diff engine avoids a duplicate client dependency. Monaco ships no TOML grammar and `.codex/config.toml` is a customization format this product opens, so the `toml` id is registered from the syntaxes package: a Monarch grammar and a language configuration — what a basic language is — with no language service and no worker behind them. That package ships no license file of its own, so this repository carries its upstream text under `licenses/` for the notice document to read (FR-043)                                                                                                                                                                                                                                                                                                                             |
| Colour-scheme control |                                                                     `shine-and-bright` 0.3.0 | The switch the reader chooses the page's colour scheme with, drawn by the stylesheet that package ships: the component renders the markup those class names select and sets the package's own custom properties, so the sliding knob and the sun-to-moon transition are the package's rather than this repository's. A devDependency whose CSS the client bundle carries, like the icon and grammar packages above; it ships its own license file, so the notice document reads that text where those carry theirs under `licenses/` (FR-043). With forced colours active every `box-shadow` is dropped, which takes the sun and the moon with it while the button's and the knob's borders repaint and the knob still slides — measured 2026-08-25, and the control's accessible name is what states its purpose there (WCAG 1.4.11)                                                       |
| Lint                  |                      ESLint 10.7.0, `@nuxt/eslint` 1.16.0, `@stylistic/eslint-plugin` 5.10.0 | Current compatible stable releases; `@stylistic` supplies the stylistic rules (e.g. `quotes`) ESLint 10 dropped from core                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Unit/integration      |                                         Vitest and coverage-v8 4.1.10, Nuxt Test Utils 4.0.3 | Exact matching Vitest/coverage versions; Nuxt-supported test harness                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Components/DOM        |                                                     Vue Test Utils 2.4.11, happy-dom 20.10.6 | Current releases satisfying Nuxt Test Utils peers; the official-source checker uses happy-dom to parse served HTML into an inert fragment and distinguish actual elements and attributes from tag-shaped text without running scripts or loading subresources                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Browser/a11y          |                                             Playwright 1.61.1, `@axe-core/playwright` 4.12.1 | Current stable browser and accessibility tooling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Types                 |                                                       `@types/node` 24.13.3, `vue-tsc` 3.3.7 | Latest compatible types for the Node 24 baseline and Vue                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Release               |                                `@changesets/cli` 3.0.1, `@changesets/changelog-github` 1.0.0 | Changesets owns the version bump, the changelog, and the publish: a pull request carrying a change a user receives adds a `.changeset/` entry, and a push to main either opens or updates the release pull request or publishes what that pull request versioned. devDependencies, because the release runs in CI and the published package imports neither. The GitHub changelog generator is selected so each entry links the pull request it came from, and it is one of the two values `.changeset/config.json` states at all — a copied default is a value that has stopped tracking the default it was copied from. `.github/workflows/Release.yml` drives that action's sub-actions rather than the combined action, which is what lets `id-token: write` — what npm trusted publishing exchanges for a publish token — sit on the publishing job alone (AGENTS.md § Release policy) |

**Rationale**: The selected set is the newest stable combination whose published peer and
builder ranges agree, so the first implementation can be reproduced without forcing
unsupported compiler or bundler overrides.

**Formatting decision**: Code formatting is owned by Prettier (`prettier` ^3.9.6):
`pnpm run format` rewrites and `pnpm run format:check` gates locally and in CI, so
formatting is never fixed by hand. `prettier.config.js` sets only the two conventions the
codebase had already settled (width 100, single quotes); `.prettierignore` excludes what
must not be reformatted — vendored skills, spec-kit scaffolding, and Markdown, whose
vendor-contract tables are frozen by recorded SHA-256 digests. Byte hygiene stays with its
declarative owners: `.gitattributes` (`* text=auto eol=lf`) makes git normalize line
endings, `.editorconfig` declares charset/final-newline/trailing-whitespace conventions to
editors, and ESLint remains the semantic/style lint gate for code. A bespoke checker that validated UTF-8 decodability and byte rules across the whole
tree was removed: its failure modes protected no user, and the digest-frozen contract
tables are protected by their own SHA-256 recomputation gates (T004/T1034–T1037), not by
byte-format checks. Every release-review remediation first returns through the complete
applicable automated gate matrix, every affected candidate/profile/fixture/human or manual
evidence protocol, and complete-diff/tarball review; this loop repeats until review finds no
concern. The bilingual Constitution record and every other repository evidence edit then
precede one final run of all applicable automated gates on the frozen tree and candidate,
ending with `test:docs` → `git diff --check`. Outcomes live
only in an external release/pull-request check log. A later repository edit invalidates every
outcome and returns to remediation, digest/evidence revalidation, applicable gates, and
complete-diff review before the final sequence.

**Migration impact**: The planned impact for this initial-release dependency baseline is
none: there is no prior published Inspector package, public contract, persisted profile, or
user data to migrate. T001 must confirm that determination before package/configuration work;
an affected consumer or prior contract invalidates it and requires replanning. Every later
accepted dependency addition/change or breaking public-contract change must record affected
consumers, contracts, data, and workflows; required migration and compatibility/support
steps; and a rollback/support path, or an explicit reasoned no-impact determination — an
update Renovate automerges being no such change, as the dependency gate above states. Missing
or stale English/Japanese design evidence in this `**Migration impact**` section and the
paired `**移行影響**` section, plus the plan's
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**`
sections, blocks T002. The
release-validation pair records the corresponding decision evidence later; missing bilingual
validation evidence blocks release.

The `open` dependency — the startup opener's fallback helper (§ 3) — has an
explicit reasoned no-impact determination: it touches no public contract, session API
shape, persisted data, or workflow. The CLI's `--open`/`--no-open` surface, the single
launch line, and the printed-URL fallback are independent of which package owns the
helper; the directly declared package owns it, with devframe's bundled opener disabled,
and devframe's own opener remains available through `createDevServer`'s `openBrowser`
option as the fallback path. No affected consumer, migration step, or support window
exists.

The CLI uses only Gunshi's stable root `define`/`cli` API. It declares a negatable `open`
boolean with a true default to provide `--no-open`, calls `cli()` with
`strict: true`, and explicitly rejects all positional/rest arguments before the host binds.
It awaits the asynchronous result and lets a parser-owned validation `AggregateError`
propagate ordinarily to a nonzero exit. No project-owned renderer sits in that path: Gunshi
owns argument validation and its own message for it, and a second renderer would be
duplicated policy that drifts from the parser it describes. Built-in help/version return
without binding.
The production entry does not import `gunshi/agent`, lazy commands, custom plugins, or
experimental parser combinators. Although Gunshi is one npm-graph leaf, its bundled internal
argument/plugin/resource code remains part of the audited payload, integrity, license, and
import-boundary digest. The lockfile-pinned resolved version — bounded by the caret
range to the same 0.x minor, which Renovate does not cross on its own — plus these tests
bound its pre-1.0 API-change risk.

The audited 0.37.0 registry tarball has 34 text-only JavaScript, declaration, JSON,
documentation, and license files (239,298 unpacked bytes), no runtime/optional/peer/bundled
dependency, no install lifecycle hook or platform selector, and no shell, native, binary,
or Wasm payload. This preserves the existing Node-only package gate while making Gunshi's
larger bundled JavaScript payload explicit in the release audit.

devframe 0.7.5 is deliberately not a leaf package: it brings the transitive runtime tree
`h3` 2.0.1-rc.22, `birpc`, `crossws`, `valibot`, `@valibot/to-json-schema`, `destr`,
`mrmime`, `nostics`, `pathe`, and `ufo`. That tree — including the `h3`
release-candidate pin — is owned by devframe's own dependency declarations and the
committed lockfile, and is accepted as part of adopting the maintained host layer rather
than re-decided per member; the lockfile pins every member by name, version, and integrity
hash — identical across OSes — so the payload bytes are fixed at dependency review, and
devframe's own tarball payload is JavaScript/TypeScript text only, so the Node-only package gate holds. devframe is
pre-1.0: 0.x minors may migrate APIs, so the caret range excludes them, the committed
lockfile pins the resolved version, and crossing that minor is a § 3 planning-gate change
rather than an automerged bump.
`tests/package/production-graph.test.ts` asserts exactly the eleven approved direct
dependencies; their versions and integrity stay owned by the lockfile.

### Finite release-certification matrix

**Decision**: Support the complete declared Node.js 24/26 engine range on the three OS
targets. Build one platform-independent tarball on `ubuntu-latest` with the active LTS
Node.js development/build baseline, run a separate build/package smoke check, then install
the identical bytes in the exact six-job lower-bound certification product of Node.js
`24.11.0` and `26.0.0` with `ubuntu-latest`, `macos-latest`, and `windows-latest`. Record
the resolved runner-image identifier and actual Node version for each release job. Run the full primary-workflow and accessibility browser suite against the
exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 on
`ubuntu-latest` with the active LTS Node.js. Those browser revisions are the reproducible
automated certification baseline, not an exhaustive user-browser list. The OS helper passes
the URL to the default handler without selecting or verifying its family/version; helper
success is not compatibility evidence, and the printed URL plus `--no-open` is the fallback
for manually choosing a certified browser.

**Rationale**: A closed certification matrix is reproducible and makes release completion
decidable without misrepresenting the wider semver compatibility contract. The minimum
supported version of each Node major exercises the declared engine floor, while identical
tarball bytes prove that the package does not vary by platform. Pinned Playwright browser
revisions provide a finite automated gate without claiming that the OS default handler
selects one of them.

**Alternatives considered**: An unbounded `>=26.0.0` engine range was rejected because it
silently claims future majors. Leaving a `*-latest` runner's resolved image unrecorded, and an
unspecified modern-browser target, were rejected because the release denominator would then
change without a repository change; the labels themselves stay, with each job recording the
image identifier and Node version it resolved. Chromium-only testing was rejected because the local launcher may open another
browser engine and the product uses standard browser APIs intended to work across the three
Playwright engines.

Primary version evidence is the npm registry for
[Nuxt](https://www.npmjs.com/package/nuxt), [Vue](https://www.npmjs.com/package/vue),
[Vue Router](https://www.npmjs.com/package/vue-router),
[tsdown](https://www.npmjs.com/package/tsdown),
[TypeScript](https://www.npmjs.com/package/typescript),
[Vite](https://www.npmjs.com/package/vite), [pnpm](https://www.npmjs.com/package/pnpm),
[devframe 0.7.5 registry metadata](https://registry.npmjs.org/devframe/0.7.5),
[Gunshi 0.37.0 registry metadata](https://registry.npmjs.org/gunshi/0.37.0),
[Monaco Editor](https://www.npmjs.com/package/monaco-editor),
[Vitest](https://www.npmjs.com/package/vitest), and
[Playwright](https://www.npmjs.com/package/@playwright/test). Node's official
[release status](https://nodejs.org/en/about/previous-releases) establishes which line is the
active LTS the development/build baseline resolves to; the
[Node 26.0.0 archive](https://nodejs.org/en/download/archive/v26.0.0)
establishes the second engine floor. GitHub's official
[runner-image labels](https://github.com/actions/runner-images#available-images) establish the
three OS targets. Monaco's official
[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)
establishes the selected stable editor version.
Gunshi's official [setup requirements](https://gunshi.dev/guide/introduction/setup) and
[declarative/strict CLI guide](https://gunshi.dev/guide/essentials/declarative) establish
the Node/TypeScript compatibility and closed unknown-option behavior used here.
The safe-filesystem layer uses only Node's built-in `node:fs/promises`, `node:fs`, and
`node:path` APIs, so it adds no platform toolchain or runtime package dependency.
The direct production `dependencies` set is exactly the eleven packages `devframe`,
`env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml` (declared as caret ranges,
with the lockfile pinning every resolved version; `h3` resolves to devframe's own h3,
so both resolve one module instance): the CLI and parser packages are
npm-graph leaves, h3 is already in devframe's transitive host tree recorded above,
devframe contributes that tree, and `open` brings the small helper-detection tree
(`default-browser`, `is-wsl`, and their leaves) the lockfile pins with it.
Nuxt/Vue/Vite/tsdown, Monaco, and test tooling are build-
or development-only because their required output is assembled into the closed product
assets. The lockfile and an isolated installed production closure are both audited.

**Alternatives considered**:

`cac` 7.0.0 remains a compatible zero-runtime-dependency ESM parser, but the revised CLI
framework choice adopts Gunshi's declarative typed command definition and strict validation.
Keeping both would duplicate one responsibility, so `cac` is removed from the production
baseline rather than retained as a second parser.

TypeScript 7.0.2 and Vite 8.1.4 were current stable upstream releases on the research date,
but are deliberately not selected: the official
[TypeScript 7 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
requires Vue/Volar workflows to remain on TypeScript 6 for now,
[typescript-eslint's dependency policy](https://typescript-eslint.io/users/dependency-versions/)
does not yet accept 7, and the published
[Nuxt 4.4.8 Vite builder manifest](https://registry.npmjs.org/@nuxt%2Fvite-builder/4.4.8)
declares Vite 7. Forcing either newer major would violate the user's requirement to use a
working current Nuxt stack. A dual TypeScript compiler or pnpm override was rejected as
avoidable initial-release complexity.

Browser launch through the devframe host's bundled opener was rejected even though it
ships inside the already audited devframe payload: devframe bundles its own copy of the
`open` package's logic, so which helper runs — and how it resolves the OS handler —
would be fixed by devframe's bundling choices instead of by a dependency this product
declares, reviews, and upgrades on its own schedule. The direct `open` dependency makes
the helper a named, lockfile-pinned member of the production closure, and the host
disables devframe's bundled opener so only the product's opener runs. `open`'s published
tarball contains one non-JavaScript executable — the vendored POSIX-shell `xdg-open`,
which the package's own selection policy uses on a Linux host whenever it is executable,
falling back to the system `xdg-open` otherwise — which is
the recorded FR-038 closure exception (spec.md FR-038). A failed or unsupported open
still only leaves the already printed loopback URL for manual opening.

On macOS the product first tries to reuse a tab a running Chromium-family browser
already has on the session origin, the way Vite ships it: a fixed `ps cax` probe reads
which fixed-list application (the Chrome variants, Microsoft Edge, Brave, Vivaldi,
Chromium) is running, and a fixed product-authored JXA script — JavaScript, adapted from
create-react-app's MIT-licensed opener and embedded as a source constant so the packaged
CLI stays one bundle — runs through the operating system's `osascript` automation host to
focus and reload the matching tab, retarget an empty new-tab page, or only otherwise open
a new tab in that browser. The attempt deliberately prefers a running Chromium-family
browser over the OS default handler, and macOS gates it behind a one-time automation
consent whose denial fails it silently; every failure — including no fixed-list browser
running — falls back to the `open` helper above, which always opens a new tab. Windows,
Linux, and non-Chromium browsers get no reuse: no platform API addresses "the tab showing
this URL", so the automation-scriptable Chromium family on macOS is the whole reachable
surface. Every spawned process receives only fixed arguments and the bound loopback
origin (FR-022, spec.md § Clarifications Session 2026-07-19).

## 4. Vendor behavior, Inspector matchers, and evidence

**Decision**: Maintain four separately owned, contract-versioned registries instead of one
mixed path matrix:

1. The **vendor behavior registry** records stable `behaviorId` statements describing
   documented lookup bases, locators, traversal, surface, scope, and uncertainty. Its
   normative human contracts are [GitHub Copilot](contracts/vendors/github-copilot.md),
   [Claude Code](contracts/vendors/claude-code.md), and
   [OpenAI Codex](contracts/vendors/openai-codex.md). Each keeps Repository and User
   behavior in separate tables; the Copilot contract additionally separates VS Code, CLI,
   and Cloud tables.
2. The **Inspector matcher registry** records stable `ruleId` values and is governed by
   the common [allowlist grammar](contracts/inspection-path-allowlist.md). Every Repository
   matcher separates Base, ordered Relative selectors, and their one-to-one typed segment
   programs.
   Literal, regex, and non-adjacent recursive-directory tokens can compose in one program;
   a descendant-inventory selector denotes explicit downward Inspector descendant inventory
   only and never asserts vendor traversal. Build validation compiles the same programs into
   immutable versioned `TraversalPlan` data. A consent preview holds the captured roots and
   the two version identifiers that name the shipped allowlist and plan set; it holds no plan
   and no program of its own, and a scan reads them from the static registry those versions
   identify. The only
   content-dependent policy is the closed Codex Global first-non-empty branch: it probes
   the override first, short-circuits on read non-empty content, advances only from
   absent or empty content, and ends the branch with that file's diagnostic and no
   fallback for an unreadable or binary override (FR-035). Selectors are authored directly as typed segment arrays: there is no `./`-rendered
   Base/selector string form, no bare-`**/` rejection, no canonical selector round-trip,
   and no rendering layer. There is no consent digest either — the preview is the
   server-retained record identified by `previewId` and bound through
   `allowlistVersion`/`traversalPlanVersion`. The token vocabulary, composability, and
   the Codex first-non-empty policy stand.
3. The **runtime composition registry** records stable `strategyId` values for selection,
   precedence, layering, fallbacks, and relationship-only rules in
   [runtime composition](contracts/runtime-composition.md). A strategy refers to behavior
   and rule IDs instead of repeating paths.
4. **Official sources** are recorded per page in
   [official sources](contracts/official-sources.md) — canonical official URL, exact
   bounded section anchors, review dates, affected contract IDs, and assertions. A record cites them in its own `evidence` array rather than through a
   parallel registry, so the basis sits beside the claim it supports. Checking those
   records is `pnpm run check:official-sources -- --network`, a maintainer-only command
   outside every default chain: it decides what a script can — a direct `200` from the
   record's own host with no redirect followed, and each cited section resolving as one
   served heading or, when no served heading carries it, as the one fragment every
   table-of-contents link bearing its text points at — and leaves the two readings that are
   not a lookup to the reviewer. What each review
   concluded is recorded in [validation.md](validation.md).

**Evidence-status decision:** documentation completeness and upstream lifecycle are
orthogonal. Every atomic behavior, rule, and strategy owns its own `documentationStatus`
and `lifecycleQualifiers` on the record itself. `documentationStatus` is exactly `documented`,
`partially-documented`, `unknown`, or `conflict`; its duplicate-free
`lifecycleQualifiers` use fixed `preview`, `experimental`, `deprecated` order. An empty
qualifier array asserts no lifecycle state and is never rendered as `stable`. These are
maintenance records: no response and no surface carries one, so a candidate provenance
publishes which rule admitted a file and not how well that rule is documented. We
rejected a single scalar status, a worst/best-status reduction, and a qualifier union
because each loses which official assertion applies to which subject.

The selected Repository root remains the immutable Repository inventory boundary. The CLI
captures `process.cwd()` once and uses that exact string by default. `--root` is accepted
with a repeated option resolving to the parser's last value: an absolute option is kept as given and a relative option is resolved
against the captured invocation directory (FR-001). An explicit empty value fails with a
fixed actionable, source-value-free startup error before session/browser creation; a missing
value is rejected there by Gunshi's typed argument validation, which the product does not
duplicate. The CLI never calls `process.chdir()`, and bootstrap creates the one
non-authorizing Repository Source before any scan I/O. Vendor runtime roots,
walk directions, target files, trust, enablement, selection, installation, and product
surface are independent behavior/strategy facts rather than implications of a matcher or
file existence. A behavior record, source record, strategy, relationship, or excluded rule
never authorizes a read.

Every admitted member root is represented by its own member Global Source: at
most one each for Codex, Claude, Copilot, and the shared agent home, and therefore zero to
four Global Sources in one session. Each Source owns exactly one root and one Source-relative Path namespace.
Files of different customization types below that root remain separate inventory items.
The term repository-relative path is reserved for the Repository Source; inventoried-file
and normalized-target DTO locator fields, filters, file-scoped diagnostics, and cross-source
comparison use Source-relative Path. Enabled-Source and consent-preview `displayRoot` fields
are one-way escaped root presentation labels, not Source-relative locators or read authority;
the preview label originates before any owning Source exists and may represent an absolute
or invalid lexical root.

Bounded derivation remains a typed single-edge provenance graph with closed deterministic target construction, not
arbitrary reference following. It is performed by each vendor's own configuration-read
stage, and the shipped `bounded-derived-candidate` rules it may expand are the three vendor
local-marketplace manifest rules and Codex fallback basename placement. A skill's sibling `agents/openai.yaml` is not among them: it is
published through the owning skill's bounded companion census rather than derived
(contracts/vendors/openai-codex.md § Derived Repository rules). Each pins an
exact seed path or seed
rule/kind, declaration field and syntax, base/placement, and fixed suffix alternatives.
No callback, arbitrary path join, free-form expression, glob, or recursive
derivation is representable. A derived provenance cannot seed another edge, while an
independent static provenance on the same file remains eligible. It admits only
safe Codex fallback basenames and vendor-specific plugin
manifests below validated local marketplace roots. Agent memory, arbitrary role-config
targets, plugin components, imports, other arbitrary component/config paths, skill
resources, scripts, assets, remote sources, and MCP-server-provided instructions remain
relationships or exclusions.

**Rationale**: A targeted re-audit of current official documentation for the frozen
inspection paths exposed several places where the previous combined table made an
Inspector matcher look like vendor lookup behavior:

- **Copilot surfaces differ materially.** VS Code's repository-wide
  `.github/copilot-instructions.md` location is exact at the workspace root; writing it as
  a recursive `**/.github/copilot-instructions.md` falsely suggests nested workspace files.
  Copilot CLI instead has its own documented standard-location traversal from runtime
  context toward its repository boundary, and Cloud/code-review surfaces have another
  support and composition model. These are separate behavior rows. An Inspector matcher carries a leading
  `ANY_DIRECTORIES` segment only for a location the vendor documents at any depth —
  a worked-file or descendant anchor — with applicability left conditional; a location
  documented only on the runtime cwd chain is admitted at the selected root, the
  chain's one shared member, and no VS Code row is reused as a CLI or Cloud traversal rule. VS Code MCP
  has one deliberate versioned exception to the current-guide view: the 1.118 release note
  adds exact workspace-root `.mcp.json` and announces most-specific same-name deduplication,
  while the current MCP guide still presents `.vscode/mcp.json` and User configuration as
  its exhaustive locations. The specific versioned path is admitted, but the evidence
  status is `conflict`; because neither selected section states the root schema or a total
  order across root, `.vscode`, User, agent, and plugin inputs, the VS Code root provenance
  remains path/surface-only and projects no inferred winner. That root file is
  already a CLI candidate, so compatible CLI and VS Code provenances share one Copilot/MCP
  recognition of the same file while CLI extraction remains provenance-specific. Current
  pages still conflict or remain silent about parts of standard-instruction support,
  project-versus-user custom-agent precedence, separate agent-context instruction order,
  and agent-profile skill preload, so those facts remain conflict or unknown rather than a
  universal winner. Hook, settings, plugin, MCP, custom-agent body/tool/model/invocation,
  and IDE handoff locators and composition are likewise surface-qualified; excluded User
  overrides remain condition facts rather than inferred files.
- **Claude project settings are launch-directory exact.** `.claude/settings.json` and
  `.claude/settings.local.json` are read from the exact selected Repository root; they are not inherited
  from parent directories and are not a generic descendant runtime scan. Instructions,
  rules, skills, commands, agents, output styles, and MCP each have distinct bases and
  traversal/activation rules. Recursive legacy-command namespaces, subagent
  skill/MCP/memory fields, settings-selected agents, normal versus forked conversation
  context, parent MCP inheritance/filters, workspace trust, and built-in-agent omissions
  therefore remain separate behavior or strategy facts. Project/local subagent memory,
  full preload versus optional Skill-tool discovery, and strict/bare/managed restrictions
  are not inferred from a preload list.
- **Codex rule recursion is not established.** Current official text documents rule files
  as direct children of the active layer's `.codex/rules/` directory but does not establish
  nested-subdirectory recursion. The Inspector matcher therefore uses a direct-child
  selector at the Repository root's own configuration layer, not `.codex/rules/**/*.rules`. Project
  config, instructions, hooks, MCP, skills, agents, marketplaces, and local-versus-hosted
  surfaces retain their own documented or conditional traversal and trust inputs. Exact
  Repository marketplace roots, layered project config/instruction fallbacks, both local
  marketplace source forms, default-versus-explicit plugin hooks, project and hook-hash
  trust, and the instruction byte budget remain separate facts. A custom-agent file is a
  spawned-session config layer: omitted model/reasoning, sandbox, MCP, and skill fields can
  inherit from the parent while live sandbox/approval overrides are reapplied. Local agent
  files are not hosted configuration; AGENTS.md inheritance remains undocumented; and
  arbitrary model-instruction, compact-prompt, or skill paths remain unread relationships.
- **Plugin roots are activated, not discovered by arbitrary recursive manifest search.**
  Marketplace registration, installation, an explicit plugin directory, or another
  documented mechanism establishes a plugin root. Claude's plugin manifest is optional;
  a matching manifest or catalog at an arbitrary Repository descendant is not by itself a
  vendor auto-discovery event. The Inspector retains a root-exact authored-project
  matcher; below a catalog entry whose validated local source names a plugin root, the
  census enumerates that root's files — the manifest among them — under the catalog's own
  row, and no rule admits a nested manifest or derives one. Presence never proves registration, installation,
  enablement, trust, component loading, or precedence.

The vendor contracts also inventory documented User settings, agents, skills, rules,
hooks, MCP sources, plugins, state, and deprecated surfaces for future maintenance. These
User tables are evidence, not consent. FR-015 through FR-018 and FR-045 authorize exactly
the four members' frozen Global rule catalogs — each member's documented customization
kinds, and the shared agent home's skills and personal plugin marketplace file; every
User surface outside those catalogs remains `excluded` without a specification change,
even when the vendor behavior registry documents it.

Every vendor behavior, Inspector rule, and composition strategy cites its exact official
`sourceId` values. The official-source record maps those IDs back to bounded URL sections
and affected contract IDs, so a changed page produces a finite review set. Checked-in
fixtures and modules validate identifier uniqueness, reciprocal links, English/Japanese
semantic parity, and source anchors. Only the explicit maintainer drift check may access
the network; it never auto-updates a behavior, rule, strategy, or assertion. Product startup and Repository/Global scans never
fetch documentation.

The registry stores no copied page body. The official-HTTPS host and redirect policy,
content-type checks, anchored-section normalization, recoverable transport-failure behavior,
and human update rules remain defined by
[EvidenceCitation](data-model.md#evidencecitation). A URL that is reachable but has
lost, duplicated, or semantically changed its anchored section still fails closed for
human review.

**Alternatives considered**:

- One combined vendor/path/precedence/source table was rejected because one cell could not
  distinguish an upstream locator from an Inspector matcher or a surface-specific
  composition strategy, and citations could not be reviewed independently.
- Treating the current VS Code MCP guide's omission as proof that 1.118 root `.mcp.json`
  is unsupported was rejected because the versioned first-party release note directly adds
  it. Inferring its schema or a total “most-specific” order was also rejected because the
  selected official sections do not state either fact.
- Simulating an effective runtime from inventory alone was rejected because runtime `cwd`,
  target paths, surface, trust, CLI/environment/managed settings, and installed plugin
  state are unavailable or intentionally excluded.
- Reading every manifest/config path, imported file, skill resource, script, or asset was
  rejected because authored references would then select the read set and the fixed
  documented allowlist would no longer bound what the Inspector reads. Fixed Inspector
  matchers and typed derivations preserve useful coverage without a generic file-read
  primitive.
- Expanding Global to every current User customization was rejected because it would
  contradict FR-015 through FR-018 and require specification and consent redesign.
- Combining all admitted tool homes into one multi-root Global Source was rejected because
  a Source is one filesystem trust boundary and one Source-relative Path namespace.
- One `certainty` enum was rejected because documentation maturity, authored versus
  installed state, trust, enablement, selection, and runtime applicability are orthogonal.

## 5. Filesystem and scan safety

**Decision**: The clarification session recorded in `spec.md` (Clarifications
§ Session 2026-07-22) is the governing record for this section: the Inspector runs in a
workspace the user already trusts and simply shows what AI agents will read, so inspected
customization files are not modeled as an adversary. Adversarial-file machinery —
checkpointed identity re-verification between operations, a race-detection taxonomy,
hard-link read-once grouping, read tickets and receipts, and a resource-registry
close-state machine — is rejected in favour of ordinary traversal with per-file
diagnostics.

Traversal is an ordinary recursive directory walk with Node `fs/promises` over the fixed
inspection-path allowlist compiled into the immutable versioned `TraversalPlan` data
(§ 4). The pure Node.js `src/server/inspection/` directory remains the sole
inspected-source I/O backend; it opens files read-only and exposes no mutation-capable
filesystem operation (QR-003). Symbolic links are followed transparently, because the
inspector shows what an agent reading the same path would see: a link whose target is
missing or unreadable yields the ordinary per-file `file-unreadable` diagnostic, and
recursive traversal tracks visited directories by real path so a link cycle cannot
prevent a scan from terminating
(FR-024). Hard links are ordinary files with no physical-identity grouping, primary/alias
selection, or read-once semantics. A public Source-relative Path is the raw entry names
joined with `/`, the same spelling filesystem operations use.

Failures are isolated per file (FR-028): an unreadable file (including a broken
symbolic link), binary content, or a
parser/extractor failure becomes that file's actionable diagnostic from the closed
registry — `file-unreadable`, `file-content-binary`, or `recognition-parse-failed`
(data-model.md § Diagnostic) — and the scan still commits atomically with public status
`partial`. A Source root that is missing or cannot be read as a directory fails that
Source's scan with the source-scoped `root-unreadable` diagnostic (FR-002); for a
consented Global root this records the tool as absent or failed without blocking the
other tools (§ 9). An unexpected failure not confined to one file fails the whole attempt,
and the failed request's error is reported ordinarily; nothing commits and the last
committed snapshot stays visible.

Each admitted file's bytes are decoded exactly once (FR-025): any NUL byte classifies the
item `binary` (diagnostic-only, making an otherwise publishable generation `partial`);
every other byte stream is decoded once with UTF-8 replacement semantics, where an
inserted `U+FFFD` yields encoding state `utf-8-replaced` while the result stays complete,
readable, and comparable; one leading BOM is recorded and removed.

**Rationale**: Ordinary traversal fully satisfies the known requirements — enumerate the
allowlisted paths, read what is there, and report per-file problems — so Constitution
Principle I makes the simpler implementation binding: a defensive mechanism may exist
only for a failure mode that actually protects a user, and no adversary such machinery
would defend against exists in the product model. The retained obligations
live in their own sections: inspected content is never executed (§ 6), the session host
binds to loopback only and is never exposed beyond the initiating machine because served
content may include the user's own secrets (§ 8), and displayed content is rendered inert
(§ 6, § 7).

**Alternatives considered**:

- A TOCTOU checkpoint model — paired pre/post identity checks around every
  enumeration and read, fail-closed race outcomes, and registry-confirmed closes — is
  rejected because it defends against an adversary the product does not model; in a trusted workspace a concurrent edit at worst yields an ordinary per-file
  diagnostic or a stale snapshot refreshed by an explicit rescan.
- Failing the entire scan on one unreadable or binary file was rejected because FR-028
  requires unaffected results to remain usable.

## 6. Safe parsing, literal display, and inert rendering

**Decision**: Treat the source bytes read by the scan as authoritative. Any NUL byte is binary;
an admitted candidate's is diagnostic-only and makes an otherwise publishable generation
`partial`, while a census-listed companion's is the ordinary fact of an asset. Decode every
other byte sequence exactly once as UTF-8 with replacement semantics. Record and remove one
leading BOM; use `utf-8-replaced` when decoding inserts any `U+FFFD`, preserve those
characters in the complete garbled source, and continue parsing, extraction, display, and
comparison. Replacement alone is a complete outcome. Never guess or retry another charset.
Return readable source text and comparison content exactly as authored, which is how every
authored value reaches the reader, and the displayed declared name as the value its parser
resolved — the text a product loading the file has, which for a quoted or escaped literal is
what the syntax means rather than the characters around it. None of them is subject to credential detection, content-based
masking, redaction, or a reveal workflow. Environment-variable references inside inspected content remain literal
text and never cause the Inspector to read, resolve, or substitute the referenced process
value. The documented `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, and `COPILOT_HOME` inputs are used
only by the host to locate member Global Source roots, not by content parsing.
The Inspector applies no file-size or file-count validation. Reading, decoding, parsing, and
retention use the capacity available from Node.js, the parser libraries, the operating
system, and the execution environment. Error handling is ordinary: a failure confined to
one file becomes that file's actionable diagnostic and the scan still commits as `partial`
(FR-028); an unexpected failure not confined to one file contributes no result to the
attempt and propagates ordinarily with its real message — a failed RPC handler's error
crosses the devframe channel as devframe serializes it, with no sanitizer wrapper;
startup-owned failure reaches the process top level. Recovery from process-level OOM or
kernel termination is not promised.

Perform best-effort metadata extraction after decoding. Every declaration the recognized
kind publishes carries one entry holding the value its parser resolved. The public metadata
list is in the order the kind publishes, one entry per declaration, and its cross-file
identity is kind and the declared key: the list is the file's one parse for the recognized
kind, which every recognizing tool shares, so a tool is not a coordinate of a
declaration. A key declared twice resolves to its later declaration,
which is what the product loading the file has.
JSON/YAML/TOML quoting, escapes, block indicators, numeric/date spelling, and collection
punctuation therefore remain visible. That one resolved value is also what drives typed
classification, relationship normalization, and bounded derivation: a second, separately
decoded value would be a copy that can disagree with what is displayed. An authored relationship
displays the exact target slice and normalizes only its semantic string. A registry-defined
documented default has no source slice, uses `authoredTarget: null`, and is labeled as a
documented default rather than source-authored text. No entry carries source coordinates: nothing
points into a document, and a range beside the value taken with it restates that value
rather than checking it. A document an extractor cannot parse discards the recognition's
whole extraction rather than inventing a value.

Which JSON format a carrier is read as belongs to the reader and the file together rather
than to the file alone, and every answer is measured rather than assumed. Copilot's hook
files, the cross-tool `.claude/settings*.json`, the workspace-root `.mcp.json`, and the
editor's `.vscode/mcp.json` are read as JSONC; every other JSON carrier this product reads
is strict, its own repository settings pair included. `.claude/settings.json` fixes the shape across products — Claude Code documents a
`//` comment in a settings file as a syntax error it reports at the next start, while
Copilot's editor parses that same file through a JSONC reader, so one physical file has two
answers and each product's recognition takes its own (FR-004).

Copilot's surfaces can disagree as well, and three of its four JSONC carriers are such a
case: its CLI rejects a comment in the cross-tool pair, in a hook file, and in the
workspace-root `.mcp.json`, each measured against the shipped build, while its editor reads
all three as JSONC. Comments are accepted wherever any one of that product's surfaces accepts
them. A file carrying no comment reads identically either way, so the choice decides only what
a commented file shows: read strictly it has no declarations at all and its row states that
it could not be read, hiding what that surface loads from it, while read as JSONC its
declarations appear on a row that also names the CLI, which loads none of them. Showing the
content with its surfaces is the milder error.

Its own repository settings pair is the case that rule does not reach, and the reason it is
read strictly: no surface of this product reads those two files leniently. The editor's
settings lookup is excluded and its hook-locations table names the Claude-format pair rather
than this one, so the CLI is the only reader, and that CLI's two paths differ from each
other — the one `/settings` displays through accepts a comment, while the load that makes
settings take effect, and that hook loading goes through, rejects it. A path that displays a
file without loading it is not a surface to union, and the milder-error argument above has
nothing to weigh: a commented file here takes effect nowhere, so a lenient reading would put
declarations on a row whose one product loads none of them and hide nothing in exchange. Answering per surface is not expressible today — a recognition
names its surfaces and takes one parse — so the divergence is recorded where the decision is
made rather than published.

The union is Copilot's alone, because its surfaces are built by different providers — an
editor, a CLI, and a hosted agent — and diverge in measurement. The other products' surfaces
are one vendor's and reach one binary, so an editor that scans another vendor's session files
leniently is discovering what that session has rather than loading it, and each of those
products answers with its own client's reading.

What established each answer — a vendor page, a shipped implementation read as source, or a
call made against a named build — is recorded with the revision it was taken from, because an
implementation's behavior is a dated fact rather than a standing one. Every carrier a local
client reads has been measured against that client; what remains unmeasured is the hosted
surface, which no local call reaches.

YAML semantic parsing uses the 1.2 core schema: an alias resolves to the value it points at
and an unresolved tag leaves the scalar it carried, because both are what a product loading
the file reads and this tool describes rather than validates; JSONC blanks its comment
syntax and resolves the remainder through the same strict parse; a decoded value is kept only where the syntax
resolves a scalar — a string, number, or boolean, reported as the text of the parser's own
resolution — while a collection resolves to nothing an entry can name; Markdown/frontmatter
and Claude imports are scanned as text. Parsing runs in-process on the scan path with the bundled
parser libraries and inherits its memory, syntax-tree, and scalar capacity from
Node.js, the parser libraries, and the execution environment; the product does not configure
V8 memory ceilings or parser item/depth/time limits. A parser or extractor failure, or incompatible meaning from two extractors for the
same `(file, tool, kind)`, is confined to that file: it discards that one recognition's
whole extraction result behind the per-file `recognition-parse-failed` diagnostic under a
`partial` commit, without changing the readable source text or another recognition
(FR-028). Exactly one recognition exists per tool/kind
pair and compatible provenances merge there. Rules, scripts, markup, URLs, and control sequences are never
evaluated or rendered. Decoding a literal is mechanical. Across Inventory, Detail, Comparison, Global controls, Diagnostics, Source
Condition Facts, APIs, CLI output, and documentation, the product never interprets or ranks
natural-language meaning, decides validity/correctness/effectiveness/compliance/quality,
advises remediation, or lints, synchronizes, converts, formats, or fixes customization
content. Validation of Inspector-owned manifests, DTOs, registries, and invariants is an
internal safety check, not a customization verdict.

An operational-event vocabulary with log-content prohibitions, and a layered
generic-error doctrine, are both rejected (spec.md § Clarifications Session 2026-07-22;
Constitution § Quality and Safety Standards): the product has no telemetry —
FR-022 forbids outbound traffic — and terminal and UI output are read by the same user who
owns the inspected files, so hiding paths, filenames, or error causes protected nothing and
made failures undebuggable. A session `Diagnostic` carries the Source-relative Path and
metadata needed to act on a file-specific problem, failures keep their real messages, and
fixed CLI help/version, the one launch-URL line, and fixed startup warnings remain ordinary
presentation output.

**Rationale**: Parsing is needed to label declarations and relationships, but success must
not turn the Inspector into a validator. Literal presentation preserves credential and
other authored differences that masking would hide. The bundled interface shows the file with no notice
beside it and asks nothing first: a
confirmation before a `FileDetail` request or a comparison guards nothing — the session is
reachable only through the loopback-bound devframe host (§ 8) and the files are the
viewer's own — while making every file take two interactions to read. What bounds authored
content is that it is reachable only one file or comparison at a time, never through an
inventory or session response, and that the central full-session client-data purge ends
what the client holds; ordinary scoped route, file/Source, and generation cleanup is not
that purge, and Global disable is the explicit full-purge exception.
The loopback-only session API, process/browser-memory-only
lifetime, Vue text bindings, and disabled links keep
that deliberate display local and inert rather than treating masking as a security
boundary.

**Alternatives considered**:

- Dynamic import, `jiti`, TOML/YAML custom constructors, Starlark evaluation, and MCP
  probing were rejected as execution.
- Credential masking plus per-value reveal was rejected because it contradicts literal
  comparison, can hide the differences the product exists to inspect, and creates reveal
  state without guaranteeing detection of every sensitive value.
- Resolving environment-variable references from inspected content was rejected because it
  would replace authored text with ambient process state and could expose values not read
  from an admitted Source.
- Zod was not added: a declared session-API parameter is a reference resolved against
  server-retained state, so resolution is the validation and a schema layer would only
  re-reject what resolution already fails closed; it would not secure filesystem input.

## 7. Source and metadata comparison UI

**Decision**: Client-only lazy-load the ESM build of `monaco-editor` on file/compare routes
for read-only single-file source views and literal source comparison. Import only the editor
worker and every basic-language contribution; let Nuxt/Vite emit same-origin assets
and do not ship any language-service worker. The full basic-language set rather than a
chosen few, because which languages a reader meets is decided by whatever a customization's
own directory contains (contracts/inspection-path-allowlist.md § Bounded companion census),
and each contribution registers a lazy loader whose grammar chunk is fetched only when a
file of that language is opened. A basic language colours text and nothing more; the
language services' worker-backed features — diagnostics above all, plus completion,
hover, formatting, symbols — are excluded, because validating what it is given and
marking an inspected customization as invalid is a verdict this product does not make.
JSON has no basic-language grammar, so one is built in the registration module: the
`json` id registers with the extension claims the JSON service's contribution makes, and
the one feature wired to it is the service's own local tokenizer — a module with no
worker behind it. The contribution itself is never imported, because its lazily loaded
mode carries the service's worker into the emitted bundle, and shipping a
language-service worker is what the package gate forbids. The real `json` colouring
therefore ships with no validation and no worker, and `.jsonc` maps to the same
tokenizer, whose comment support is its own. TOML, which Monaco ships nothing for, takes its grammar from
`@ota-meshi/site-kit-monarch-syntaxes`: a Monarch grammar and a language configuration with no
service behind them, registered onto a `toml` id through the same lazy factory every basic
language uses, so the chunk carrying them is fetched on the first `.toml` file opened. The
package's own `setupTomlLanguage` is not what registers it — its parameter is the whole
`monaco-editor` entry point, whose type includes the language services this bundle excludes,
so calling it would mean asserting a shape this application deliberately does not have. The
`.jsonc` mapping is internal, the model URI
stays opaque, and the text is displayed exactly as authored either way. Models use opaque in-memory URIs, hold
complete authored source text, and are disposed separately from their editor and
subscriptions on route close, selection replacement, source disable, or generation
replacement. A Monaco text model stores one end-of-line sequence per document, so a file
whose lines mix endings is rendered — and copied from the editor — with its majority
ending, with line contents and line count unchanged; the exact `sourceText` is what the
detail response carries and what comparison consumes, and is unaffected. Configure
`readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
`renderMarginRevertIcon: false`; keep `accessibilitySupport: 'auto'`, enable
`accessibilityVerbose`, and give every source side an `ariaLabel`. Turn off
`unicodeHighlight` — `nonBasicASCII`, `invisibleCharacters`, and
`ambiguousCharacters` — because those defaults decorate and hover a warning over
characters of the reader's own file, which is the linting FR-032 forbids this surface
from doing; where a character's spelling does matter the product states it itself, in
path presentation (data-model.md § SourceRelativePath). Monaco announces through one
element the editor composable module owns and every mount shares, rather than the
default under `document.body`,
which outlives every editor, and teardown empties that element's live regions: Monaco's
aria module holds them in module-level variables, so detaching them would leave the last
announced line of authored source reachable (FR-027). Where the editor module cannot
load at all, the same source renders as an inert `pre`, which is focusable so its
scrollable box is reachable without a pointer. With the devframe host
serving the Nuxt output directly (§ 8) there is no product-assembled CSP-hash manifest;
display inertness rests on the read-only editor configuration, Vue text bindings, and
disabled links, and the client still loads no external worker, blob worker, or evaluated
string. Diff
highlighting uses Monaco and browser capacity without a product-defined line or computation-
time cutoff. If Monaco or the browser reports a recoverable failure, retain the complete
read-only side-by-side source and a diagnostic. Tool recognition is compared per tool,
while a file's declared metadata is compared once, because a tool is not a
coordinate of a declaration: each side serializes to one canonical document and the two
documents diff in Monaco. The exception is a side whose carrier _is_ the declaration: a
plugin manifest declares its plugin with its whole content and is strict JSON already, so
that side is the file as written — re-serializing it would put the same document one round
trip further from what the author wrote, which is why no surface parses a manifest for
display (contracts/http-api.md § get-plugin-carrier-detail). How the per-tool statement is drawn is the kind's own: a table of
one row per tool where the two sides are two files one name resolves to, since a product
recognizing one and not the other is the row that says so, and one line per side where both
sides are whole carrier files, since the products that read a file are that file's own facts
and the two lines already carry them. A list too long for its line wraps rather than
widening the page. That parse runs once per `(file, kind)` for the Markdown kinds,
which every shipped vendor reads under the same fixed YAML semantics; the custom-agent
kind is the exception and runs once per `(file, tool)`, because how an agent file splits
is the admitting rule's own reading — a Codex agent is TOML whose
`developer_instructions` string is the prose. The Markdown kinds' frontmatter
serializes to YAML — the block's own language — with each comparison leading with the
keys the vendors document for its kind, in the order the page that publishes them does,
and sorting every other key (frontmatter-yaml.ts, declaration-order.ts). The MCP
comparison serializes instead of tabulating: its unit is one declared server name — the
kind's inventory row unit (data-model.md § Inventory unit) — each side is that name's
declaration in one of the row's carriers, and the surface serializes each declaration's
parsed entries into one pretty-printed JSON document and diffs the two documents in
Monaco. JSON rather than a display-only spelling, because the document is the value a
JSON carrier's entry holds under the server's name, so a reader of such a carrier
pastes it as their own entry's body — a TOML carrier's reader copies values rather
than syntax. The comparison's serialization is canonical in
order and in spelling, so the two sides align line by line and a line difference is a
field difference: the common declaration keys lead in one fixed reading order — the
server's kind, how it launches, where it connects, what environment it gets — every
other key, and every key of a nested mapping, follows sorted, while sequence items keep
their order, which is the declaration's own data; a scalar spells by the parsed kind
the wire publishes beside its resolved text (data-model.md § Field reading) — a number
or boolean rebuilds as its value and spells bare, a number JSON cannot spell (`NaN`, a
64-bit integer past the double range) keeps its exact text as a JSON string, and a
string stays a string under `JSON.stringify`'s own escaping, so an authored `'7'` stays
`"7"` while a numeric `7` stays bare — a newline spells
`\n`, a control character or lone surrogate its escape — identically on both sides. The
document is `JSON.stringify(value, null, 2)`'s own pretty-printed output over a tree the
serializer only reorders, so its property order is the platform's enumeration order — an
integer-like key lists first — accepted as the platform's own spelling, the same trade as
`String(-0)` rendering `0`, and deterministic on both sides alike.
The MCP detail renders each declaration's fields as the same JSON document in the file's
own key order, the order a detail publishes by (FR-007). The two carriers
of one name need not share a syntax — a `.codex/config.toml` declares in TOML, a
`.mcp.json` in JSON — and no carrier shows its bytes (FR-007), so the canonical
serialization is the one spelling both sides can be read in. Preserve Monaco's
accessible diff viewer, ARIA labels, keyboard navigation, and narrow-screen inline mode
for explicit accessibility testing.

**Rationale**: Source files include Markdown and structured configuration where syntax
coloring, line navigation, virtualized rendering, search, synchronized scrolling, and a
well-tested diff surface materially improve inspection. Monaco already computes source
differences and exposes editor- and environment-dependent computation and accessibility behavior, so a
second text-diff package would duplicate responsibility. Recognition facts have domain
semantics — set-like recognitions and their surfaces are compared structurally in typed
rows, while literal spelling differences remain observable in the source diff. A
declaration block has no such structure to lose: it is one authored mapping per side
whose canonical serialization orders the fields identically on both sides, so added,
removed, and changed fields appear as exactly the lines they are. The official
[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)
and [Monaco repository](https://github.com/microsoft/monaco-editor) document those editor,
worker, accessibility, and model-lifecycle capabilities. The lockfile-pinned resolved
version and the packaged browser tests protect the deliberately narrow ESM imports during
upgrades.
No content-based display transform is applied: authored values remain visible with no
warning in front of or beside them, while inert rendering prevents their content from
executing, loading, or navigating.

**Alternatives considered**:

- Adding `diff` beside Monaco was rejected because no current CLI, API, patch export, or
  headless consumer needs a second diff engine.
- Serializing recognition metadata — which tools recognize a side, on which surfaces —
  into Monaco was rejected because property ordering and line changes obscure added,
  removed, or changed domain fields. A declaration serialization — the MCP JSON, the
  frontmatter YAML — is not that case: each side is one authored mapping, and its
  canonical document orders the fields identically on both sides.
- A custom `<pre>` source diff was rejected because it would recreate core navigation,
  large-document rendering, synchronization, accessibility, and diff interaction work.

## 8. Local session transport

**Decision**: Adopt `devframe` 0.7.5 — the local-tool framework behind
`@eslint/config-inspector` — as the session host, with devframe authentication disabled
(`auth: false`; owner decision 2026-07-22, spec.md § Clarifications Session 2026-07-22,
Constitution § Quality and Safety Standards). The CLI starts the host with `createDevServer` from
`devframe/adapters/dev`: devframe binds the loopback `localhost`, serves the built Nuxt SPA directly
from `cli.distDir` (`dist/public`), and carries the session API as devframe RPC functions
declared with `defineRpcFunction` and registered in the definition's `setup`. Port and
host resolution, static serving with the SPA fallback, and the RPC channel are devframe
policy rather than product code, while browser opening is product-owned through the
startup opener — the macOS Chromium tab reuse in front of the `open` package's
helper — with devframe's bundled opener disabled (§ 3), with one closed
product-owned piece
in front of static serving: the `/skills/**`, `/instructions/**`, `/mcp/**`, `/rules/**`, and `/permissions/**`
`GET`/`HEAD`
rewrites to `/`, one route family per shipped kind detail, which let
devframe's own handler serve the shell for detail deep links its extension-guarded
fallback cannot (§ 3 h3 row). The same channel carries devframe's own
built-ins — `devframe:agent:*`, `devframe:rpc:server-state:*`, and
`devframe:streaming:*` — which the framework registers unconditionally; the product
registers no agent tools, shared server state, or streaming channels on them, and the
editor/finder helpers (`devframe:open-in-editor`, `devframe:open-in-finder`) are opt-in
recipes this product does not import. Session protection is the loopback
binding: the product adds no per-session token, no Origin or Host classification of its
own, and no hand-written HTTP router. devframe does apply an origin gate of its own to
the WebSocket upgrade — which is why no product-owned check stands beside it — but that
gate is not what bounds the exposure below and must not be read as if it were. It admits
a request carrying no `Origin` at all (a non-browser client) and any origin whose
hostname its loopback test matches, and that test is a spelling test: a hostname
beginning with `127.` or ending in `.localhost` passes, so a page served from an
attacker-registered `127.<label>.example` is admitted and reaches every session
function. The gate stops an ordinary remote origin, not a page whose author chose the
hostname. Nor can it be narrowed from here: devframe's `allowedOrigins` only widens the
allow-list, and `false` removes the gate altogether. The residual limitation is
documented rather than defended:
while the inspector runs, other local processes and — via DNS rebinding — a malicious web
page can reach the unauthenticated session (QR-003). The session API still exposes only
Source-relative paths and closed commands, never absolute filesystem paths.

At session startup, before editor-launcher discovery, retain one immutable Global root-input
capture: read `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` once each in that order;
treat only `undefined` as absent; and call imported `node:os.homedir()` once unconditionally,
because the shared agent home always derives from it. Use active-platform `node:path.join`
with fixed `.copilot`, `.claude`, and `.codex` suffixes only for absent tool entries, and
derive `.agents` from the same captured home directory. Do not independently select `HOME`
or `USERPROFILE`, and perform no existence check during capture. That same capture supplies
the eligible personal roots excluded from editor-launcher lookup and every consent preview.
A throw while startup captures, classifies, or escapes those inputs fails before a session
or browser exists.

Before Global consent, expose a lexical/no-I/O path preview over the session API as the one
server-retained record identified by its opaque `previewId`, which confirmation names. Each
preview request is operation-local only in constructing that record from the retained
session input; neither it nor `--inspect-personal-setup` recaptures process inputs. Construct
the complete preview object before replacing the current record, so construction failure
leaves the prior preview current. DTO construction or transport serialization can fail after
the new preview becomes current; that is the request's ordinary error, and the created
preview may remain retained. Neither failure creates authority or a job. Retain the exact
raw `lexicalRoot`, the escaped display, and the immutable `TraversalPlan`
schema/selection-policy/canonical programs in that server-retained record, bound to the
shipped plans through the `allowlistVersion`/`traversalPlanVersion` pair. Preview parsing and
transport inherit capacity from Node.js, the browser, and the execution environment; the
product does not impose a byte limit on the proposed root or escaped display. Enable uses
only that stored raw value, never reverses display text and never rereads the environment.
There is no session-keyed consent digest: the preview is the one server-retained record
identified by its opaque `previewId`, and enable names that ID. Define no separate liveness RPC or probe. devframe reports host loss
through its own connection-status signal without being queried. The SPA installs no
visibility, focus, or unload listener, and a page-lifecycle event triggers neither a purge
nor a refetch. Define no polling interval, request timeout, retry timer, or memory lease.
A transport-reported channel loss or unsupported protocol on the current RPC, or a session
mismatch, invokes the shared `clientDataEpoch`-guarded purge before the ended view is
rendered; an ordinary handler, serialization, or delivery failure is that request's error
alone. A Global-disable click invokes the same purge before request dispatch, and
observing a greater Global content epoch or non-null disable fence in an ordinary response
repeats it before rendering and enters client-side `RecoveryViewState`. The purge removes
the DOM/DTO/editor state its state owners and rendered surfaces hold and prevents late
responses from restoring content; a
settlement whose request token is no longer current or whose captured `clientDataEpoch`
predates the purge is a no-op, including a late rejection. The transport signal has no
product-defined delivery deadline, so process loss on a continuously idle visible page has
no product-defined wall-clock detection guarantee.

A non-null fence makes the session route return the exact control-only
`GlobalFenceRecoverySnapshot`; a null fence makes it return a normal full
`SessionSnapshot`, from which the recovering client adopts only the control/error
projection and discards the inspection graph. Recovery adopts the returned `sessionId` as
the new baseline without retaining or comparing the purged ID. Active consent makes disable
available from that view immediately; the preview route returns the exact frozen preview so
retry controls can be reconstructed without browser persistence or an environment reread.
The recovery view offers Resume inspection only when the fence is null and a normal full
snapshot can be fetched; that explicit action re-fetches a matching session and builds a
default fresh inventory summary without restoring old detail, comparison, editor,
selection, filter, or authored source. A later detail/comparison open fetches it again from
the fresh session. This recovery is driven by the Global-disable
purge/epoch/fence path, not by page visibility or navigation.

The session API returns complete authored content only for an explicit
detail request. The bundled SPA shows that content with no notice
about what it may contain and no confirmation step in front of it; there is no
acknowledgement or notice state to hold, send, or reset. Ordinary scoped route, file/Source, and generation cleanup is not
the central purge; Global disable is the explicit full-purge exception.

Every ordinary response is checked against its exact request token, captured
`clientDataEpoch`, adopted `sessionId`, `globalContentEpoch`, and null disable fence before
it can mutate browser state. Every SessionSnapshot/FileDetail request additionally captures
the owning sequence's generation — the session snapshot exposes `repositoryGeneration` and
a nullable `globalGeneration` — and the file's Source-relative Path where applicable. Older snapshots are
ignored; before adopting a newer generation of either sequence the client increments the
epoch and aborts/disposes the detail, comparison, and editor objects owned by that
sequence's replaced generation, while the other sequence's committed views stay valid.
Equal-generation snapshots require their current token. File detail is adopted only if the
epoch and the owning sequence's generation still match and the readable file still exists.
The server captures each envelope's generations and payload together under the coordinator
lock, so delayed network delivery cannot mix them.
Each automatic or explicit scan also receives an opaque `scanRequestId`. Source progress,
the rescan admission response, and a successful source-scan generation carry that same ID;
only the bootstrap generation carries null, and Global disable commits no generation at
all. The client binds current status and rendered
inventory completion to its admitted request ID and rejects an earlier status or generation.

Print the resolved local `http://localhost:<port>/` origin exactly once to the initiating
terminal, from the host's ready callback, before any browser attempt (FR-001). Which port
that is stays devframe's resolution: the CLI's `--port` states a preference it resolves
the same way it resolves its own default — keeping a free port, moving off an occupied
one, selecting a free port for 0 — so the printed origin is the only statement of the
bound port, and a launch that must not take a port someone is holding passes `--port 0`.
Browser
opening is product policy through the startup opener (§ 3): the CLI's negatable `--open`
flag (default true) decides whether the host runs it after the launch line, devframe's
bundled opener stays disabled so only the product's opener runs, on macOS a session tab a
running Chromium-family browser already has is focused before `open`'s helper spawns a
new one, every spawned process receives only fixed arguments and that resolved origin —
never inspection-derived content or paths (FR-022) — and beyond the fixed-list reuse
choice the product neither selects, probes, nor verifies the resolved handler's browser
family or version (FR-001). A disabled, unsupported, or failed automatic open leaves the
server running; the printed origin is the fallback in every case.

**Rationale**: Hosting policy — port and host resolution, static serving with an SPA
fallback, and the RPC transport — is policy the maintained devframe
layer already owns and enforces; re-implementing it over bare `node:http` duplicated that
layer and forced the product to own its own router and authentication machinery
(Constitution Principle I; Implementation simplicity policy). `@eslint/config-inspector`
ships the same shape — a trusted single-user localhost inspector on devframe without an
auth gate — and devframe documents `auth: false` exactly for that class of tool.
With devframe owning that policy, the product has no hand-written API router, no
per-session capability module, and no static-assets manifest generator — nor contract
tests for them. There is no
generic request-owned error boundary either — the product defines no log-content rule and
no sanitized error envelope — so a failed RPC handler's error crosses the devframe channel
as devframe serializes it, with no sanitizer wrapper and no product host code between the
two. The trade-off is explicit and owner-decided
(2026-07-22): devframe's default interactive OTP authentication would gate the session
against other local processes and DNS-rebinding pages, and the owner chose
config-inspector parity over that default, so the residual exposure of the
unauthenticated loopback host is a documented limitation (Constitution § Quality and Safety Standards, QR-003)
bounded by the trusted-workspace model — the session serves only what the launching user
can already read. The server-retained frozen preview named by consent still proves which
lexical roots the user saw before the host touches them. No recoverable Node.js or browser
failure grants authority over an unseen value: incomplete preview construction leaves the
prior preview current, while DTO or transport serialization failure after replacement may
leave the created preview retained.
devframe's connection-status signal and guarded current RPC outcomes expose session loss
without persisting data or defining a product timer. Page lifecycle is not a session-loss
signal and causes no purge or refetch; a discarded document releases its own references,
while a bfcached document retains only the same user's view of their own files on their own
machine under the accepted trusted-workspace model. A continuously idle visible page
intentionally has no product-defined wall-clock process-loss guarantee.
The recovery DTO keeps all-failed Global consent visible even when no Source exists, while
the separate preview avoids repeating a potentially large display payload in every session retrieval.

**Alternatives considered**:

- A hand-written transport — bare `node:http` with a closed hand-written router, a
  per-process 256-bit capability token passed in the URL fragment and required on every
  API request, exact Host/Origin enforcement, `Cache-Control: no-store`, and a CSP
  derived from build-recorded inline hashes — is rejected: it re-implements hosting
  policy devframe owns, and the browser-origin and
  DNS-rebinding exposure it defended against is accepted as the documented residual
  limitation of the unauthenticated loopback host instead.
- devframe's default interactive OTP authentication was rejected for config-inspector
  parity: devframe itself documents `auth: false` for trusted single-user localhost tools
  where the printed one-time-code round-trip only gets in the way.
- General `--host` support and CORS were rejected because remote access is out of scope;
  the host binds the loopback `localhost` only.
- A product-defined push or liveness protocol on top of the RPC channel was rejected
  because devframe already reports host loss and every ordinary response applies the
  request-token, client-epoch, session, Global-epoch, and fence guards. The supported
  single-browser-session use has no requirement for proactive second-tab observation.
- A project-owned browser-launch adapter (a fixed `/usr/bin/open`/`xdg-open` spawn with
  an ambient environment allowlist) is rejected: cross-platform helper resolution is
  policy the maintained `open` package already owns (§ 3). The macOS tab reuse in front
  of that fallback is not such an adapter: it resolves no handler and owns no platform
  map — it drives one running fixed-list application and hands every other case to
  `open` — and every spawned process receives only fixed arguments and the resolved
  local origin.

## 9. Atomic generations, rescan, and environment-dependent capacity

**Decision**: Start the Repository scan automatically, expose progress through the session
snapshot, and perform later Repository or enabled member Global Source scans only on
explicit user action. Create a legal empty zero-I/O bootstrap generation 0 synchronously
before the automatic Repository command, containing exactly one idle, non-authorizing
Repository Source selected from captured `process.cwd()` or the optional single `--root`,
with null source progress until boundary admission and work are queued.
Every automatic or explicit scan receives an opaque `scanRequestId`; its Source progress and
a successful source-scan generation retain that ID, while the bootstrap generation uses
null. Repository and Global inspection keep independent atomic generation sequences
because their lifecycles are independent: the Repository sequence starts at bootstrap
generation 0 and advances only on Repository scans, while a Global sequence exists only
from the enable commit that creates it — as Global generation 1 — until disable discards
it. Disable commits no generation, so there is no disable transaction kind and no
null-ID disable generation; a re-enabled Global sequence restarts at generation 1, and the
incremented `globalContentEpoch` distinguishes eras so a stale pre-disable Global
reference can never satisfy a post-re-enable request.

A single coordinator serializes every `GlobalEnableOperation`, Repository or tool-specific
Global Source scan, and the transaction that disables Global inspection. It does not expose
or enforce product-defined queue, slot, or concurrency capacities. Ordinary scans execute in
FIFO order. Global disable remains a priority security barrier. Before dispatch, the browser
performs the full client-data purge. First acceptance of a non-no-op barrier atomically
increments the command epoch and `globalContentEpoch`, installs non-null
`globalDisableInProgress`, revokes publication authority, and rejects new Global-enable/
Global-rescan commands. Every inspection-data route then returns
`409 global-disable-pending`; the session route returns only
`GlobalFenceRecoverySnapshot`. Every inspection-data success binds its captured epoch and
rechecks an unchanged epoch plus a null fence under the coordinator lock at final
publication. The disabling page learns the fence from its own disable response and
subsequent session fetches; there is no separate liveness response or second-tab
projection. The
barrier sets `globalControl.state: disabling` and empties pending/retry arrays only when
active consent/control exists; an operation-local initial enable has a null control
projection but a visible fence. It aborts/discards active uncommitted work and queued
Global work, and requeues an interrupted Repository command only after terminal success. Success with any
public Global consent, control, or Source state uses `remove-active-state` and discards
the entire Global generation sequence and its Sources while committing nothing; the
Repository sequence, its generation, and its IDs are untouched. Only an unpublished
operation-local initial enable uses `cleanup-only`, which removes the fence while changing
no committed state. Repeated disable joins the same barrier.
A post-acceptance failure keeps the fence, the failed request's error,
and retry/join path while the process stays alive; unrecoverable cleanup requires restart.
A pre-acceptance failure or true no-op leaves the fence null. A final check that the enable
registration still names the same operation ID, followed immediately by its synchronous
settlement, determines whether enable returns `202` or loses to disable with `409`, so late
work cannot restore revoked Global state; no enable-specific epoch or duplicated state check
is involved.

Each scan starts from its owning sequence's current generation — a Repository scan from
the committed `RepositoryScanGeneration`, a Global scan from the committed
`GlobalScanGeneration` — and builds its replacement separately. A complete result, or a
partial result whose only problems are file-confined
diagnostics (FR-028), commits atomically as that sequence's next generation; the commit
makes only that sequence's old
detail/comparison/selection/editor state stale — file identities are Source-relative
Paths and stay stable across it — while the other sequence's
committed state and views remain valid (FR-030). No carry-forward machinery exists — a
Global commit does not preserve the Repository inventory unchanged by copying it, because
it has no reason to touch it. An
explicit rescan's fatal failure discards all uncommitted output. The last successful snapshot
stays visible with a Source-keyed stale-failure entry referencing the actionable
`root-unreadable` diagnostic when the root itself cannot be read, or the failed request's
error message for an unexpected failure (FR-030). A
startup failure has no request owner and reaches the process top level. A fatal member Global rescan
retains that Source's consent, accepted root context, and last committed graph for retry or
disable.

One session-wide consent fixes all four members, with one `GlobalToolControl` per frozen
preview entry and no selector. Post-consent validation records a consented root that is
missing or not a readable directory as that tool's absent or failed outcome without
blocking the other tools (FR-014); an unexpected failure outside one tool's root aborts
the whole transaction through the owning request boundary. If
validation admits no root, `active-no-job` retains control for retry/disable and publishes no
Source/job/generation. If it admits one to four roots, one provisional batch scan publishes
all of their separate Sources together in exactly one Global generation — the enable
commit that creates the Global sequence — with no per-tool commit
observable. Active-consent retry validation/admission is operation-local: only
`globalEnableInProgress` becomes newly visible, while `pendingTools`, `retryableTools`,
`batchStatus`, Diagnostics, controls, Sources, and the prior snapshot retain their exact
pre-operation projection. Atomic queued acceptance alone changes `pendingTools` to the
admitted subset for its queued/running scan; an `active-no-job` disposition commits the
evaluated controls without creating pending work. Initial enable has no control projection
until atomic activation, after which only accepted-batch tools are pending. Thus an
unvalidated active control is never publicly retryable; retry becomes preview-gated after
that work finishes, while disable remains immediate.

The Inspector defines no file-size, file-count, aggregate-record, graph, Diagnostic, parser-
message, response-size, queue-capacity, or scan-time limit. Effective capacity is inherited
from Node.js, parser and editor engines, the browser, the operating system, the filesystem,
and the execution environment. An unexpected failure from those layers
is not assigned a capacity/resource/operational cause by the domain. It propagates to the trigger owner,
returns or commits no attempt result/generation, and retains the prior snapshot when a
request-owning boundary survives. Such a failure never authorizes `partial`. Routes serialize
committed DTOs once and never silently truncate them.
Process-level OOM, kernel termination, and an indefinitely pending uncancellable filesystem
operation cannot be recovered from or bounded by the application contract.

Disable, shutdown, and generation replacement revoke publication authority independently of
elapsed time. Results that settle after revocation are discarded, acquired resources are
released when the underlying operation permits cleanup, and revoked data cannot repopulate
the session. Session RPC work remains scheduled by Node.js and devframe may report channel
loss, but no product probe or timer can survive runtime exhaustion or a blocked/terminated
process, and no such wall-clock guarantee is claimed.

**Rationale**: Serialization plus atomic per-sequence generations prevent lost updates and
mixed old/new results. Repository and Global keep independent sequences because their
lifecycles are independent — the Repository Source always exists, while Global sources
exist only between enable and disable — so a commit never has to carry or
invalidate the other sequence's state, and no carry-forward machinery is needed at
all. Deriving capacity from the actual runtime avoids presenting arbitrary
product numbers as portable safety guarantees. Ordinarily reported errors preserve the
execution lifecycle without inventing a domain cause; failures outside application control
remain explicit platform limitations.

**Alternatives considered**:

- Automatic watch/rescan was rejected because it creates implicit reads and stale-state
  races not required by FR-030.
- Incrementally mutating the active result was rejected because consumers could observe a
  mixture of generations.
- Concurrent per-source commits were rejected because each sequence's single generation
  number and generation-scoped IDs would otherwise require conflict-prone commit-time
  rebasing.
- One session-wide generation sequence shared by Repository and Global inspection was
  rejected on 2026-07-22 because the two lifecycles are independent: it forced every
  Global commit — and disable — to carry the untouched Repository inventory forward,
  invalidating Repository views that no data change justified.
- Product-defined byte, item-count, parser, queue, and deadline caps were rejected
  because effective capacity belongs to Node.js and the surrounding execution environment.

## 10. Verification strategy

**Decision**: Maintain vendor conformance fixtures and negative near-misses, plus
fixtures for symlink-transparent reads, encodings, recoverable environment failures, literal credentials,
environment-variable references, imports, executable declarations, and malformed formats.
Test pure recognizers/parsers and literal-display DTOs, the session API contract, source
boundary integration, `dist/cli.mjs` package-entry launch from an unrelated working directory,
CI installed-tarball launch, the 100k/500 performance
case, and all four Playwright user stories. Evaluate SC-008 against the complete 55-row
WCAG 2.2 Level A/AA applicability matrix and objective pass rule in
[the accessibility acceptance contract](contracts/accessibility-acceptance.md), combining
criterion-specific stable check IDs with the specified automated, keyboard, and manual
evidence. Its closed manual matrix freezes the packed candidate, three
supported OS/browser/assistive-technology cells, responsive/visual profiles, workflow
states, and input profiles; every applicable cell is recorded, and a frozen-value change
reruns all manual checks. An axe severity result alone is
not acceptance evidence and cannot turn a failed Applicable row into a pass.
SC-003, SC-004, SC-005, and SC-007 share a versioned, checked-in release-evidence
fixture manifest whose stable case IDs, required-class membership, objective expected
outcomes, fixture/builder references, and per-fixture digests freeze each release candidate's
exact nonzero denominators. The canonical manifest digest and executed case IDs enter the
evidence record. A contract rejects a missing, duplicate, undeclared, unexecuted, or
digest-mismatched case, an empty required class, a missing fixture, or a denominator below
its declared minimum. Removing or reclassifying a case, changing a required-class
definition, or changing an expected outcome requires a manifest-version increment and
explicit review. Changing only fixture bytes requires the affected fixture digests and the
canonical manifest digest to change. Either kind of change starts a new non-comparable
measurement set, and digest drift alone never authorizes changed denominator semantics.
The automated contract exercises these transition rules with table-driven previous/current
manifest revision pairs and never attempts to infer reviewer state. For the real release
diff, T1062 records initial creation or the prior/current versions, the changed case IDs,
required-class definitions, or expected outcomes, and an explicit reviewer decision or
reference in the bilingual validation record.
This makes a maintained suite evolvable without
allowing a release to shrink its denominator implicitly.
The registry fixture suites validate every behavior/rule/strategy/source ID, reciprocal
evidence links, exact section anchors, English/Japanese parity, and the rule that only the
Inspector matcher registry can authorize a read. Matcher fixtures reject a Repository
selector program that violates the closed token grammar (for example adjacent
recursive-directory segments), distinguish exact/direct-child/explicit
descendant inventory, and prove that a leading `ANY_DIRECTORIES` segment does not satisfy
a vendor traversal fact.
Targeted regression fixtures cover Copilot's separate VS Code/CLI/Cloud lookup tables,
Claude project settings only at the exact selected Repository root, non-recursive Codex rule directories,
plugin activation versus authored manifest inventory, and zero Global reads beyond
FR-015 through FR-018 and FR-045. They also verify zero to four member Global Sources, at
most one per member, exactly one root and Source-relative Path namespace per Source, exact literal
credential display, no reveal controls, and no environment-variable substitution.
Lifecycle fixtures cover concurrent unresolved failures for all four Sources, per-Source
clear/replace/removal, and automatic-first-failure current state. Browser fixtures cover
an ordinary request rejection staying request-local, transport-reported channel loss, port
reuse with a mismatched session, the absence of any page-lifecycle listener, purge, or refetch,
the absence of a wall-clock guarantee for process loss on a continuously idle visible page,
and paused snapshot/detail delivery across scan commits and disable barriers with
request-token, `clientDataEpoch`, session, Global-epoch/fence, owning-sequence generation,
and file-existence rejection of late responses and rejections. Preview fixtures cover
raw/display escape collisions and prove enable uses the stored raw root. Matcher fixtures
also prove Global exact targets never enumerate the root, fixed subtrees touch only their
allowed descendants, and neighboring paths receive zero I/O. Raw-path fixtures read an
NFD-spelled entry through its raw name and publish that raw spelling as its
Source-relative Path.
Run the pure Node.js integration suite on macOS, Linux, and Windows, covering
symlink-transparent reads, a broken link's `file-unreadable` diagnostic, link-cycle scan
termination, unreadable files, binary content, every byte decode outcome,
a missing or unreadable root, per-file failure isolation with a `partial` commit,
and fatal-rescan rollback to the last committed snapshot. In each lower-bound job, separately
install and launch the build job's one tarball.
Instrument tests with local fixture roots and all product socket/HTTP(S)/DNS/SMB/URI/image/
remote-reference/MCP surfaces. Separately classify and validate the two exact FR-022 authorized
internal loopback classes at the issued `localhost` authority—static/SPA
`GET`/`HEAD` for the packaged UI assets and the local session API channel—and fail if inspected content causes
any other direct product-issued outbound request as defined by FR-022, MCP connection, child
process, dynamic evaluation, or product-issued source mutation. Explicit UNC/server-share/device vectors prove
zero filesystem/DNS/SMB calls; lexically indistinguishable mounted/mapped network storage is
recorded separately as the OS-mediated platform/environment limitation. Mutation tests
instrument read-only versus mutation-capable filesystem APIs/flags and compare content,
length, identity/link state, mode, mtime, ctime, and observable xattrs/ACLs; OS-only atime
changes are recorded separately and count as neither failure nor proof. Failure-path
tests confirm that a failed request leaves the session usable and shows its error
ordinarily, while session
Diagnostic DTO tests retain only their allowed fields. Cross-surface negative tests
cover Inventory, Detail, Comparison, Global controls, Diagnostics,
API/CLI output, and documentation to prove that no customization validation, natural-
language interpretation/ranking, verdict, policy/remediation advice, conversion,
synchronization, formatting, or fixing is exposed.
Whole-character fixtures for every supported format place astral and combining sequences
in field values and require them to survive extraction and JSON
transport unaltered, which is what proves every layer works in whole characters rather
than in UTF-16 code units. Multi-provenance fixtures prove exactly one recognition per
tool/kind. Package fixtures distinguish
package payloads from package-manager-generated symlink/`.cmd`/`.ps1` launchers and verify
their exact declared Node targets and argv-only bodies. Package fixtures also cover the
two required `dist/` entries and the packed manifest fields without
asserting byte or item-count boundaries. Coordinator fixtures prove FIFO serialization,
disable priority, `202`/`409` race disposition, cancellation, and late-result rejection
without slot-capacity fixtures. Injected recoverable Node.js, parser, editor, and transport
failures prove safe failure, atomic publication, and no response truncation; fixtures also
confirm that file size and collection cardinality are not product validation rules. Process-
level OOM and kernel termination remain outside in-process recovery tests. Diagnostic fixtures enforce the closed `file | source`
scope union. A file-scoped Diagnostic has its owning `sourceId` and
`sourceRelativePath`; a source-scoped Diagnostic has its owning `sourceId` but no
`sourceRelativePath`. There is no pathless scope, and
a source-scoped Diagnostic never fabricates a path to satisfy a display or ordering field.

The 2026-07-17 measurable-outcome revalidation fixes the following objective protocols:

- **SC-001** uses exactly 20 independent first-use sessions, each driven by an autonomous
  agent given its own copy of the all-kind fixture, the guidance, and the standardized task
  prompt and nothing else, started outside this working tree, and launching the Inspector
  itself from that copy's root. At least 19 must open one discovered customization file within two minutes,
  timed from the prompt to the moment that file's source or details view is open and
  operable. Reaching the Inspector through the printed URL is part of the provided guidance
  and never pauses or restarts the timer. Selecting a root is a product capability the
  automated User Story 1 tests verify rather than a timed action here. Every enrolled session
  stays in the fixed denominator and is never replaced; an environment or product failure
  that prevents or interrupts completion is unsuccessful.

  Agents rather than people because twenty first-use participants are not available to this
  project. That bounds what the criterion establishes — whether the product's own guidance is
  sufficient — and every record of a run says so.
- **The performance suite** reuses one unchanged deterministic 100,000-entry/500-match
  fixture for a single non-gating smoke pass. It asserts no timing threshold: measuring one
  means naming a frozen host and recording its exact processor model, image revision, memory,
  and storage before the run, because the same figures taken elsewhere describe that machine
  rather than this product. What the pass proves is that the harness still expands the
  manifest's declarative rules, walks the built tree, and recomputes every entry and content
  digest, so a builder change or a stray file invalidates it instead of quietly measuring a
  different repository.
- **SC-006** uses the same 20 sessions after SC-001, regardless of their earlier result,
  each beginning from the same designated file. Three fields — source, recognizing tools,
  file type — must be submitted within two minutes and must all match the checked-in ground
  truth, with no partial credit; at least 18 must succeed. All 20 then attempt the comparison
  and personal-setup tasks under the same no-hint policy, which with SC-001's discovery
  observation covers the four primary workflows.

  The safety half is what an automated run measures best: a session observes prohibited
  effects from the requests its own browser issued and from the state of the inspected tree,
  and the automated FR-022 and User Story suites assert the same property under their own
  gates. No separate instrumentation, proxy, or reviewer process exists for it.

**Rationale**: The constitution treats passing tests as evidence rather than proof, so the
suite combines objective automation with full-diff review, documentation parity checks, a
release tarball inspection, and the fixed scoring of an agent-driven first-use run.

**Alternatives considered**:

- Snapshot-only tests were rejected because they do not prove negative security behavior.
- Browser tests without unit/contract coverage were rejected because failures would be
  slow and hard to localize.
- Coverage percentage alone was rejected because it does not demonstrate the named
  boundary and non-execution invariants.

## 11. Source ownership, authored values, and outcome measurement

**Decision**: These rules hold across every design artifact:

1. One admitted member root equals one member Global Source, with at most one
   Source each for Codex, Claude, Copilot, and the shared agent home and zero to four in a
   session.
2. Readable source, displayed declared metadata, and comparison content preserve authored
   literal values. There is no credential masking or reveal workflow. Environment-variable
   references in inspected content remain literal and are not resolved or substituted;
   the three documented tool-home variables are used only to locate Global roots.
3. A fatal explicit rescan discards all uncommitted output, including partial output, and
   leaves the last successfully committed snapshot visible with a per-Source stale-failure
   entry referencing either the deterministic Diagnostic or the failed request's error
   message, reported ordinarily (FR-030). A successful scan clears only its own Source's
   entry and referenced failure; unrelated commits preserve both, and removal clears both
   for the removed Source. A repeated fatal rescan replaces both for only its Source.
4. Generation 0 already contains the non-authorizing Repository Source. A deterministic
   automatic failure publishes no provisional result; a startup throw/rejection reaches the
   process top level with no survival guarantee. Initial Global enable uses fixed all-tools
   consent and a single admitted-subset batch. A deterministic all-rejected outcome returns
   `active-no-job`; an unexpected failure aborts the transaction, fails its request with
   that error reported ordinarily, and commits none of the subset. A purged client recovers
   the active control view and exact frozen preview before selector-free retry.
5. Source-relative Path is the cross-source display/filter/diagnostic term. Repository-
   relative path is used only for the Repository Source rooted at the selected Repository
   root.
6. SC-001 and SC-006 use the objective protocols in Section 10, over twenty independent
   autonomous-agent sessions rather than a participant cohort: what they measure is whether the
   product's own guidance is sufficient, and evidence from them is recorded as an agent-driven
   run rather than as a human-subject study.

**Rationale**: These decisions leave no multi-root Source, masking/reveal, fatal-result,
path-terminology, or outcome-measurement ambiguity, while preserving the product's
read-only, local, non-executing boundary.

**Alternatives considered**:

- A multi-root Global Source was rejected because it weakens Source ownership and path
  meaning.
- Credential masking, reveal state, and environment substitution were rejected because
  they alter authored evidence or introduce ambient values.
- Publishing uncommitted fatal-scan output or silently presenting the old snapshot as
  current was rejected because either mixes generations or misstates freshness.
- Marking a failed initial scan/enable as stale was rejected because no previously
  committed Source was unsuccessfully refreshed; the current snapshot remains the last
  truthful committed state.
- Using repository-relative path for Global files was rejected because a Global Source is
  not rooted at the selected Repository root.
- A published performance threshold was rejected: asserting one requires a frozen measurement
  host nobody has designated, and a figure taken anywhere else measures that machine.

## 12. Child-process boundary, planning gates, and criterion scope

**Decision**: Planning and implementation hold to these rules:

1. Startup browser opening is one of the two permitted product-initiated child-process
   surfaces — the other is the reader's own explicit open-in-editor request: on macOS the
   fixed process-list probe and fixed tab-reuse script through the
   OS `osascript` automation host, otherwise the fixed startup OS browser helper (§ 3).
   Every spawned process receives only fixed arguments and the printed loopback origin —
   no inspection-derived content or path, authored value, or user-supplied command — and
   inherits the launch environment unchanged: the product writes no inspection-derived
   value into any environment variable, and a platform helper honoring the user's own
   configuration, such as `xdg-open` consulting `$BROWSER`, applies user preference
   rather than an inspection-derived input. Lexical equality between an ambient value and a Source root
   changes no provenance and grants no authority. Discovery, reading, parsing, display,
   comparison, and relationship processing initiate no child process, and `--no-open` plus
   unsupported/failure paths leave a usable manual URL.
2. Each supported `(tool, kind)` owns closed relationship kinds and admitted source-form
   applicability. A relationship may be serialized or shown only when its kind belongs to the
   maintained presentation-allowlist row and the exact extractor for the actual admitted
   source form recognizes that authored occurrence. One failing either gate remains visible
   only in complete source text and is never inferred or promoted across source forms. A
   kind's declarations pass no such gate: a skill's are the keys its file wrote, and an
   authored key set is not closed.
3. Dependency revalidation is a planning gate. Any accepted package or version change synchronizes all
   dependency-baseline-bearing English/Japanese design and task artifacts and reruns planning plus task
   generation before implementation proceeds, excepting the updates Renovate automerges, which
   ci.yml gates instead.
4. Origin-file-less hosted/runtime inputs are out of scope. The product reports the
   customization files it found; behavior no file originates belongs to the vendor's own
   documentation, and no surface explains it.
5. The maintainer team owns the initial-release first-use evaluation. Ordinary contributors
   do not carry that obligation.
6. `engines.node` is the complete Node 24/26 runtime compatibility range; the six exact floor
   jobs are lower-bound certification samples and the active LTS Node.js is the
   development/build baseline. The pinned three Playwright revisions are the automated browser-certification
   baseline, while the startup helper delegates to an unverified OS default handler and always
   retains the printed/manual-open fallback.
7. Repository and Global keep independent generation sequences. A successful initial or
   retry Global admitted-subset batch commit creates or advances only the Global sequence,
   invalidates only its own sequence's views, and never touches Repository state.
8. SC-008 uses the maintained bilingual 55-row WCAG 2.2 Level A/AA applicability matrix.
   Stable check IDs bind every expected observation, and the closed manual matrix forbids
   sampling applicable locale/platform/viewport/mode/scenario/input cells. Every Applicable
   row, every Not-applicable rationale recheck, all four keyboard workflows, and every
   required responsive variation must pass; `validation.md` and `validation.ja.md`
   record the nonzero Applicable-row denominator, zero failed Applicable rows, and complete
   evidence. There is no axe-only or severity-based escape.
9. Diagnostic scope is a closed `file | source` union. Only file scope carries
   `sourceRelativePath`; source scope carries `sourceId` without a path, and no pathless
   scope exists. There is no separate outer-boundary error
   entity: an unexpected failure is reported ordinarily and never becomes a Diagnostic.

**Rationale**: These rules make the child-process boundary, presentation scope, performance
denominator, runtime-fact model, participation ownership, compatibility/certification split,
and dependency baseline independently testable without weakening the existing security or
documentation-parity requirements.

**Alternatives considered**: Treating browser launch as part of customization-derived
execution, inferring metadata from arbitrary authored keys, keeping the interaction target
as an untracked plan-only goal, and patching versions only in `package.json` were rejected
because each creates a contradiction or a second undocumented contract.

## 13. Task-generation dependency gates

**Decision**: Implementation tasks follow four explicit dependency gates:

1. Setup owns byte hygiene declaratively: `.gitattributes` normalizes line endings and
   `.editorconfig` declares editor conventions. Code formatting is Prettier's, gated by
   `format:check` locally and in CI.
2. Setup scaffolds the CLI entry and referenced build/manifest scripts
   before package commands, tsdown configuration, CI jobs, or runnable Setup checkpoints
   depend on them.
3. The English/Japanese vendor contracts enumerate the complete closed Presentation
   Allowlist for every supported `(tool, kind)`, including its admitted source forms and
   exact source-form extractor applicability, before any metadata or relationship parser,
   recognizer, API, UI, or acceptance task consumes it. The implementation gate verifies
   that already approved bilingual design and digest only; it does not author or semantically
   edit a row. Tuple membership and source-form extraction are separate required gates. Any
   semantic delta stops dependent work, synchronizes all design artifacts, and reruns plan
   and task generation. Later evidence review reconciles drift; it does not first define the
   normative list.
4. Preserve the original family-vertical order: SKILL (including Skill Metadata) →
   Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents →
   Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooks. Each
   family completes US1 discovery and US2 complete inert detail before its US3 comparison.
   Repository-wide Inventory, Detail, and Comparison Acceptance then close Repository work
   before US4 Global inspection; cross-cutting and release work remains last.

**Rationale**: These gates give each configured command and acceptance test an existing
prerequisite and a normative oracle, preserve the established dependency-safe delivery
increments, and let each comparison validate a complete family before unrelated later
families expand the product.

**Alternatives considered**: A runnable Setup checkpoint that refers to absent entries and
code-first presentation fields documented only near release were rejected because they make
checkpoints unattainable or let implementation define its own contract. Horizontally moving
every comparison behind all family discovery/detail work was also rejected because it
breaks the original task order and delays independently testable family checkpoints; a
comparison still never precedes its own family's discovery and complete inert detail.

## 14. Safety and measurement contracts

**Decision**: The safety and measurement contracts are:

1. There is no operational-event vocabulary and no content prohibition on it: errors are
   reported ordinarily. Session Diagnostics remain the separate actionable surface, and
   fixed CLI help/version, one launch URL, and fixed startup warnings are presentation
   output. The session API carries no per-session capability value and no authentication;
   it is reachable only behind the loopback binding (see § 8).
2. `package.json.bin` targets `dist/cli.mjs` directly, with no bootstrap wrapper and no
   output manifest to validate before import or bind; `verify:package` asserts only the two
   required entries (see § 2, § 8). Build, tarball, and runtime impose no product-defined
   file-size, aggregate-size, asset-count, buffer-size, or handle-count boundary.
3. The coordinator serializes Source scans, Global enable, and disable without exposing a
   product-defined slot or queue capacity. Disable remains a priority security barrier, and
   enable/disable races resolve atomically without late mutation.
4. Every scan receives a `scanRequestId`. The performance smoke pass waits for the automatic
   first Repository scan, exercises one explicit rescan, and accepts only status and the
   committed inventory generation carrying that request ID.
5. Disable, shutdown, or generation replacement revokes publication authority independent of
   elapsed time. Late results are discarded and cleanup follows the underlying Node.js/OS
   operation; no hard kernel-I/O cancellation or OOM recovery is claimed.
6. Allowed interpretation is limited to closed syntax, the value a parser resolves for a
   declaration the recognized kind publishes, frozen-catalog classification, and documented
   structural projection.
   Every product/documentation surface forbids natural-language interpretation/ranking,
   customization verdicts, policy/remediation advice, linting, synchronization, conversion,
   formatting, and fixing.
7. Product-issued mutation means every mutation-capable filesystem request or flag. Tests
   instrument those calls and stable source properties; OS-only atime changes are recorded
   separately as neither failure nor proof.
8. The loopback binding is the API access boundary. The bundled SPA shows authored content
   with no notice about what it may contain, no confirmation step in
   front of a `FileDetail` request or a comparison, and no acknowledgement state anywhere.
   The session API carries no authentication — it is reachable only
   behind the loopback binding, which is the whole boundary.

**Rationale**: These boundaries remove ambiguity from integrity, cleanup, disclosure, and
negative-product-scope tests while preserving literal inspection and making capacity a
property of Node.js and the surrounding execution environment.

**Alternatives considered**: Path-bearing logs, product-defined resource caps, integrity-free
static loading, prior-generation performance completion, timer-based claims of physical I/O
cancellation, broad semantic analysis, literal atime-as-mutation scoring, and both
server-side and client-side acknowledgement state were rejected because they overstate the
platform guarantee, weaken integrity, or confuse presentation with API authorization.

## 15. Closed runtime contract

**Decision**: One closed runtime contract governs startup, consent, failure scope, and
display:

1. Capture `process.cwd()` exactly once. With no `--root`, use that string as the selected
   Repository root. Keep an absolute `--root` as given and resolve a relative one against
   that capture, with zero filesystem/network I/O and never `chdir`. There is no shared
   lexical root parser and no Windows spelling taxonomy: the platform's own path handling
   owns spelling semantics. Gunshi's typed argument validation owns a missing value, only
   an explicit empty value receives the product's fixed startup error, and a repeated
   option resolves to the parser's last value. Generation 0 synchronously contains the
   stable, non-authorizing Repository Source.
2. Global consent is one selector-free all-tools action. Initial processing always evaluates
   all four frozen preview entries; retry derives the complete current server-side
   `retryableTools` set: non-pending unpublished `admitted` controls plus `rejected` controls
   whose `retryDisposition` is `same-preview`, excluding lexical `new-preview-required`. A
   deterministic rejected entry does not block siblings. All admitted roots are scanned as
   one batch and their separate one-root Sources publish in one atomic generation.
3. A failure confined to one file becomes that file's diagnostic and the scan commits as
   `partial` (FR-028). Every other throw or rejection fails the attempt and its error is
   reported ordinarily to the boundary that owns the trigger: an accepted job keeps the
   process and the prior snapshot, and a startup-owned failure reaches the process top
   level.
4. An admitted candidate's NUL is binary/diagnostic-only/`partial`; a companion's is the
   plain binary fact. Every non-NUL byte stream is decoded once with
   UTF-8 replacement semantics. `utf-8-replaced` preserves all `U+FFFD` characters as the
   replacement-decoded garbled text shown, parsed, extracted, and compared, and is complete
   by itself.
5. Raw entry segments alone perform filesystem operations, and joined with `/` they are
   the published classification and display path — a filesystem holds one entry per name,
   so every published path is unambiguous. Hard links are ordinary files with no grouping,
   primary/alias selection, or read-once semantics.
6. Presentation Allowlist rows are already approved design input. The implementation gate
   verifies them and their bilingual digest only. A semantic change stops work and requires
   synchronized design plus regenerated plan/tasks before consumption.

**Rationale**: These rules keep runtime ownership of actual read errors
without making an absent optional path fatal, eliminate user-selectable Global scope, make
bootstrap identity independent of read authority, and keep malformed text inspectable in
the exact form the UTF-8 decoder produced.

**Alternatives considered**: Treating every `lstat` absence as an uncaught runtime failure
would make documented fallback and automatic existing-root selection impossible. Catching
permission, `open`, or `read` errors as domain outcomes would violate runtime ownership.
Per-tool Global commits would expose intermediate subsets and advance generation multiple
times. Charset guessing would make output environment-dependent. Using normalized display
segments for filesystem operations would weaken the boundary. All were rejected.
