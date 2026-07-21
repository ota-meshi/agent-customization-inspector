# Phase 0 Research: Inspect Agent Customizations

[日本語](research.ja.md)

**Researched**: 2026-07-16; revalidated 2026-07-18; CLI dependency selection revalidated 2026-07-19; product-boundary decisions revalidated 2026-07-20
**Scope**: Reference architecture, current compatible toolchain, safe local-host design,
safe parsing and literal display, source/metadata comparison, environment-governed scanning, and the official
customization path surface

## 1. Package architecture

**Decision**: Use one publishable ESM package with `app/`, `src/`, `shared/`, `tests/`,
`bin.mjs`, and one `dist/` tree. Nuxt owns the client build; tsdown owns the Node CLI
bundle. The pure Node.js `src/inspection/safe-fs.ts` module owns all inspected-source
enumeration/read and is bundled with the CLI. Only typed inert DTOs cross into the browser.
All project-authored executable application code is JavaScript/TypeScript. Project and
dependency package payloads contain executable code only as JavaScript; generated HTML/CSS,
JSON manifests, documentation, and the license remain permitted declarative artifacts.
Package-manager-generated `.bin` symlink/`.cmd`/`.ps1` launchers are payload-external
interoperability metadata with a separate closed audit. Third-party development/test tooling is pinned and
audited separately but is not published application code under FR-038.

**Rationale**: The UI and CLI form one product, share one release version, and are both
required by every `npx` launch. A single package keeps installation and release atomic
while the `app`/`src`/`shared` boundaries prevent browser code from gaining filesystem
access. Build orchestration cleans only package-owned output trees, lets Nuxt write its
standard `.output/public` staging tree, validates and copies accepted assets to
`dist/public`, and lets tsdown write the named CLI/Worker entries and any code-split chunks
into a separate clean `.build/server` staging tree. Fixed manifests close both output
classes before they are copied or packed. A small project-owned `bin.mjs` uses Node.js
built-ins to parse the packed `package.json`, validate both manifests and every listed
static/server declared length and hash, and dynamically import the validated CLI only
afterward, without creating independently versioned packages. Bootstrap work is subject to
the capacity of Node.js, the operating system, and the execution environment; the product
does not impose byte or item-count limits, and no host bind precedes validation.
The executable shim starts with the exact BOM-free, LF-terminated first line
`#!/usr/bin/env node`; this is part of the package contract, not a release-time repair.

Cross-platform CI runs the same Node.js filesystem integration and race-detection cases on
macOS, Linux, and Windows; the published package itself contains no platform-specific
artifact.

**Alternatives considered**:

- A UI/core/CLI monorepo was rejected because the components are released together and
  have no current independent consumer.
- A Nuxt SSR/Nitro application server was rejected because the browser application is
  static and the security-sensitive API is smaller and clearer in an explicit Node host.
- Dynamic config loading, unauthenticated RPC, automatic watch, static snapshot, remote
  host, build, or MCP modes were rejected because inspected files are untrusted and
  session data must not be persisted or exposed.

## 2. Build and package boundary

**Decision**: Configure Nuxt as `ssr: false` with the static Nitro preset,
`app.baseURL: '/'`, `app.buildAssetsDir: '/_nuxt/'`, an empty CDN URL, and root-absolute
same-origin assets. Begin every full build by removing only the root-resolved package-owned
`.output/`, `.build/`, and `dist/` trees. Let `nuxt build` use its standard
`.output/public` staging output. A fixed post-Nuxt step rejects malformed HTML,
relative/external executable assets, executable attributes, `<base>`, symlinks, and
unexpected output; it requires but omits Nuxt's generated `200.html` and `404.html`
static-host fallbacks, rejects every other HTML file except `index.html`, copies the exact
accepted tree to a newly created `dist/public`, and records it plus executable inline-script
hashes in `dist/manifests/static-assets.json`.

Configure tsdown with named entries
`{ cli: 'src/cli.ts', 'parser-worker': 'src/inspection/parsers/worker.ts' }`, Node ESM,
`fixedExtension: true`, disabled source maps/declarations, a clean `.build/server` output,
and `deps.skipNodeModulesBundle: true`. A fixed assembler accepts only safe regular `.mjs`
outputs, requires `cli.mjs` and `parser-worker.mjs`, records every code-split chunk in
`dist/manifests/server-assets.json`, and copies exactly those outputs into `dist/`. The host
constructs the parser Worker only from the fixed package-owned
`new URL('./parser-worker.mjs', import.meta.url)`; inspected data can never select a module
or Worker URL.

Before packing, recursively compare `dist/` with the exact set derived from both manifests
and reject missing, stale, unexpected, linked, or non-regular paths. Set
`package.json.files` exactly to
`["bin.mjs", "dist", "README.md", "README.ja.md", "LICENSE"]`; npm's automatic
`package.json` plus those entries are the complete tarball allowlist. Set `package.json.bin`
exactly to `{ "agent-customization-inspector": "bin.mjs" }` and omit `main`, `module`, and
`exports` because the package has no library API. Use no install script, runtime download,
or end-user compilation. Keep runtime packages declared under exact `dependencies` so
`npx` installs auditable versions; tsdown bundles project-owned modules and shared
contracts, not arbitrary transitive packages. The production set is exactly the four leaf
packages `gunshi`, `yaml`, `jsonc-parser`, and `smol-toml`; `open` is absent from every
dependency section and the production lock closure.

Audit every project/dependency tarball payload and the installed production graph. First install the packed
artifact with lifecycle scripts disabled and development dependencies omitted, require the
exact lockfile/manifest graph, and recursively reject lifecycle/build requirements,
`os`/`cpu`/`libc` selectors, bundled or optional native packages, native/binary/Wasm
extensions or ELF/Mach-O/PE magic, `binding.gyp`, Rust/C/C++ source, `prebuilds`, and any
package-owned non-Node shebang, shell helper, or executable non-JavaScript payload. Then
perform a normal-lifecycle production install with network access disabled from the same
verified cache. Package-manager-generated `node_modules/.bin` symlinks and Windows
`.cmd`/`.ps1` shims are the sole payload-external exception: their exact names must come
from an audited `package.json.bin`; the symlink target or generated body may only dispatch
to the declared audited Node JavaScript target and forward argv; extra logic, environment/
configuration input, and unexpected shims fail. The cross-OS production-graph digest covers
package name/version/integrity and package-payload digests, excludes generated `.bin`
artifacts, and is paired with the OS-specific shim audit. Any new production dependency or
artifact fails until explicitly reviewed.

**Rationale**: Separate clean staging trees avoid relying on cross-tool `clean: false` and
make stale-output rejection mechanical. Leaving node_modules external avoids silently inlining platform-sensitive or changing
transitive code and makes the package manifest describe what the CLI loads. The
[tsdown dependency documentation](https://tsdown.dev/options/dependencies) distinguishes
external dependencies from explicit `alwaysBundle` behavior, and its
[entry documentation](https://tsdown.dev/options/entry) defines the named multi-entry
form. A tarball smoke test is the reliable proof that the web, CLI, parser Worker, and
safe-filesystem layer are included and load from their packaged locations.
It installs the tarball into an isolated fixture and actually invokes the executable with
`npx --no-install`, rather than merely inspecting the `bin` mapping; the exact shebang and
executable mode are asserted before launch.
Auditing an installed closure closes the gap left by inspecting only the root tarball, while
the second network-disabled install proves that the normal lifecycle path does not fetch,
compile, or substitute a platform artifact. Exact leaf dependencies make that closure and
its cross-OS digest stable for the first release.
Root-absolute assets are necessary because the same shell is returned for nested routes
such as `/files/<fileId>`; a relative `./_nuxt/` URL would resolve beneath that route.
The official [Nuxt 4 configuration reference](https://nuxt.com/docs/4.x/api/nuxt-config#baseurl)
defines `baseURL`, `buildAssetsDir`, and the empty-by-default `cdnURL`. The exact
[Nuxt output-directory documentation](https://nuxt.com/docs/4.x/directory-structure/output)
defines `.output` as the generated production build directory, so the assembler consumes
`.output/public` explicitly instead of claiming a direct `dist/public` Nuxt output. The exact
[Nuxt 4.4.8 payload renderer](https://github.com/nuxt/nuxt/blob/v4.4.8/packages/nitro-server/src/runtime/utils/renderer/payload.ts#L28-L49)
also emits runtime configuration as executable inline JavaScript, so `script-src 'self'`
alone cannot boot the stock output; build-recorded CSP hashes reconcile that generated
script with a no-`unsafe-inline` policy.
The reproducible 4.4.8 minimal-SPA build also emits `index.html`, `200.html`, and
`404.html`. The explicit Node host, not a generic static host, owns status/fallback routing,
so retaining only `index.html` prevents those redundant aliases from bypassing the closed
client-route grammar.

`dist/manifests/static-assets.json` is strict JSON with no extra keys:
`manifestVersion: 1`, the exact `packageVersion`, `shellPath: "/index.html"`, ordered
`assets` records, and ordered `inlineScriptSha256` values. Each asset is
`{ requestPath, file, byteLength, sha256, mediaType }`: `requestPath` is a unique
root-absolute URL path, `file` is the exact corresponding
`public/...` regular-file location, `byteLength` is non-negative, `sha256` is 64 lowercase
hex characters, and `mediaType` comes from the closed host table. Inline values are the
44-character base64 SHA-256 digests of the exact executable script bytes in the shell.
The `bin.mjs` bootstrap resolves this manifest from its fixed package-relative URL,
strictly validates it, rejects declared/actual length mismatches before import or bind, and
verifies every listed hash; no unlisted path is served. Build normalization, unpacked-
tarball verification, and runtime bootstrap apply the same structural and integrity rules.
Their effective capacity is inherited from Node.js, the filesystem, and the execution
environment rather than from product-defined file-size or asset-count validation.

`dist/manifests/server-assets.json` is strict JSON with exact keys
`manifestVersion: 1`, `packageVersion`, and an ordered `assets` array. Each
record is exactly `{ file, byteLength, sha256 }`; safe relative `.mjs` paths are sorted and
unique, `cli.mjs`/`parser-worker.mjs` are required, and every code-split tsdown output is
listed. A
final recursive verifier derives the only legal `dist/` files from this manifest plus the
static manifest, rejecting any stale/unexpected/link/non-regular path before packing and
applying the same proof to the unpacked tarball. At runtime `bin.mjs` also validates this
server manifest and every listed server hash before it imports `cli.mjs`, so both manifest
classes are checked before server bind.

The packed `package.json` is a separate strict bootstrap input. `bin.mjs` parses it under
Node.js and validates its closed engine/bin/package fields. Fixtures cover malformed inputs,
declared/actual length mismatches, incomplete or unexpected asset sets, and hash failures;
they do not define or test product file-size or item-count boundaries.

**Alternatives considered**:

- Bundling all runtime dependencies was rejected for the initial release because it makes
  dependency/license auditing and transitive behavior less visible.
- Separate published UI and CLI package roots were rejected because one manifest-closed
  `dist/` matches the release boundary; isolated staging roots are still used for clean assembly.
- A hosted snapshot command was rejected because it would persist local customization
  text and could embed secrets in deployable assets.

## 3. Latest compatible stable dependency baseline

**Decision**: Pin exact versions in `package.json` and `pnpm-lock.yaml`, using pnpm 11.13.0.
“Latest” means the newest stable version compatible with the selected Nuxt/Vue toolchain,
not a prerelease or an incompatible major. Re-run the same registry compatibility check
immediately before creating the first lockfile.
Treat that check as a planning gate. If any selected package or version changes, stop before
configuration implementation, review the compatibility decision again, synchronize every
dependency-baseline-bearing English/Japanese research, plan, quickstart, and task artifact,
and rerun `/speckit.plan` followed by `/speckit.tasks`. A local package/lockfile edit may not
create a second dependency baseline.

| Area | Selected version | Reason |
|---|---:|---|
| Node.js | 24.18.0 LTS development/build baseline; engines `^24.11.0 || ^26.0.0` = `>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0` | Declares runtime compatibility across the Node 24/26 ranges while the release matrix certifies each lower bound and excludes other majors |
| TypeScript | 6.0.3 | Newest compiler supported by the current Vue/Volar and typescript-eslint toolchain |
| Nuxt / Vue | 4.4.8 / 3.5.39 | Current stable releases |
| Vue Router | 5.2.0 | Current stable release; satisfies Nuxt 4.4.8's declared `^5.1.0` range; no separate router abstraction |
| tsdown | 0.22.8 | Current stable release; supports Node 24.11+ |
| Vite | 7.3.6 | Newest version in Nuxt 4.4.8's declared `^7.3.3` builder range |
| pnpm | 11.13.0 | Current stable package manager |
| CLI | `gunshi` 0.37.0 | Current zero-runtime-dependency ESM CLI framework; its Node.js `>=22` engine requirement fits the declared range; browser launch is project-owned TypeScript over `node:child_process` and adds no package |
| Parsers | `yaml` 2.9.0, `jsonc-parser` 3.3.1, `smol-toml` 1.7.0 | Current stable inert data parsers |
| Source view/diff | `monaco-editor` 0.55.1 | Current stable read-only source and diff editor; its own diff engine avoids a duplicate client dependency |
| Lint | ESLint 10.7.0, `@nuxt/eslint` 1.16.0 | Current compatible stable releases |
| Unit/integration | Vitest and coverage-v8 4.1.10, Nuxt Test Utils 4.0.3 | Exact matching Vitest/coverage versions; Nuxt-supported test harness |
| Components/DOM | Vue Test Utils 2.4.11, happy-dom 20.10.6 | Current releases satisfying Nuxt Test Utils peers |
| Browser/a11y | Playwright 1.61.1, `@axe-core/playwright` 4.12.1 | Current stable browser and accessibility tooling |
| Types | `@types/node` 24.13.3, `vue-tsc` 3.3.7 | Latest compatible types for the Node 24 baseline and Vue |

**Rationale**: The selected set is the newest stable combination whose published peer and
builder ranges agree, so the first implementation can be reproduced without forcing
unsupported compiler or bundler overrides.

**Formatting-gate decision**: Add no formatter dependency. A project-owned Node.js script at
`scripts/check-format.mjs` supplies the exact non-mutating `pnpm run format:check` gate. The
closed maintained-directory set is exactly `app/`, `src/`, `shared/`, `scripts/`, `tests/`,
`.github/`, `specs/`, `.specify/`, `.agents/`, `.claude/`, `.codex/`, and `.vscode/`. Every
existing regular file below those roots is checked, regardless of extension. The exact
repository-root file set is `./.gitignore`, `./AGENTS.md`, `./AGENTS.ja.md`, `./LICENSE`, `./README.md`,
`./README.ja.md`, `./bin.mjs`, `./package.json`, `./pnpm-lock.yaml`, `./nuxt.config.ts`,
`./tsconfig.json`, `./eslint.config.js`, `./tsdown.config.ts`, `./playwright.config.ts`, and
`./vitest.config.ts`; a listed path that has not been created yet is skipped, while any
existing selected path that is not a regular non-symlink file fails closed. At any depth the
checker prunes exactly `.git/`, `node_modules/`, `.nuxt/`, `.output/`, `.build/`, `dist/`,
`coverage/`, `playwright-report/`, and `test-results/`. Checked files must be decodable UTF-8
without a BOM, use LF only, contain no trailing ASCII space or tab, and end in exactly one LF.
The checker never rewrites a file and never inspects customization content at product runtime.
A deliberately malformed-byte, digest-bound, or intentional-binary fixture may be excluded
only by one `/`-normalized exact repository-relative file path, one closed `malformed-byte`,
`digest-bound`, or `intentional-binary` kind, and a nonempty rationale inside the checker.
Directory, glob, duplicate, out-of-scope, or rationale-free exceptions fail closed. A
dependency-free `node:test` bootstrap suite imports the checker against temporary fixture
trees before implementation and remains runnable as `pnpm run test:format`; it verifies the
exact scope constants, inclusion/exclusion and symlink behavior, every byte rule, valid and
invalid exception declarations, and byte-for-byte non-mutation. It requires all failures to be
aggregated in repository-relative-path order with a stable `FORMAT_INVALID_UTF8`, `FORMAT_BOM`,
`FORMAT_CR`, `FORMAT_TRAILING_WHITESPACE`, `FORMAT_FINAL_LF`, `FORMAT_SCOPE`,
`FORMAT_EXCEPTION`, or `FORMAT_IO` code, the relative path and applicable line number, no file
content, and exit status 1; a clean tree exits 0. `test:unit`, CI, and release verification
include that suite. Every release-review remediation first returns through the complete
applicable automated gate matrix, every affected candidate/profile/fixture/human or manual
evidence protocol, and complete-diff/tarball review; this loop repeats until review finds no
concern. The bilingual Constitution record and every other repository evidence edit then
precede one final run of all applicable automated gates on the frozen tree and candidate,
ending with `test:docs` → `test:format` → `format:check` → `git diff --check`. Outcomes live
only in an external release/pull-request check log. A later repository edit invalidates every
outcome and returns to remediation, digest/evidence revalidation, applicable gates, and
complete-diff review before the final sequence. If the first
repository run finds drift, implementation stops before normalization and regenerates the
bilingual task set with every affected file named exactly. ESLint remains the separate
semantic/style lint gate.

**Migration impact**: The planned impact for this initial-release dependency baseline is
none: there is no prior published Inspector package, public contract, persisted profile, or
user data to migrate. T001 must confirm that determination before package/configuration work;
an affected consumer or prior contract invalidates it and requires replanning. Every later
accepted dependency addition/change or breaking public-contract change must record affected
consumers, contracts, data, and workflows; required migration and compatibility/support
steps; and a rollback/support path, or an explicit reasoned no-impact determination. Missing
or stale English/Japanese design evidence in this `**Migration impact**` section and the
paired `**移行影響**` section, plus the plan's
`**Dependency and breaking-change migration gate**`/`**Dependencyおよび破壊的変更の移行gate**`
sections, blocks T002. The
release-validation pair records the corresponding decision evidence later; missing bilingual
validation evidence blocks release.

The CLI uses only Gunshi's stable root `define`/`cli` API. It declares a negatable `open`
boolean with a true default to provide `--no-open`, calls `cli()` with
`strict: true`, and explicitly rejects all positional/rest arguments before the host binds.
It awaits the asynchronous result and maps validation failures through a project-owned,
fixed, safe renderer and explicit `AggregateError` handling to a nonzero exit; built-in
help/version return without binding.
The production entry does not import `gunshi/agent`, lazy commands, custom plugins, or
experimental parser combinators. Although Gunshi is one npm-graph leaf, its bundled internal
argument/plugin/resource code remains part of the audited payload, integrity, license, and
import-boundary digest. Exact pinning and these tests bound its pre-1.0 API-change risk.

The audited 0.37.0 registry tarball has 34 text-only JavaScript, declaration, JSON,
documentation, and license files (239,298 unpacked bytes), no runtime/optional/peer/bundled
dependency, no install lifecycle hook or platform selector, and no shell, native, binary,
or Wasm payload. This preserves the existing Node-only package gate while making Gunshi's
larger bundled JavaScript payload explicit in the release audit.

### Finite release-certification matrix

**Decision**: Support the complete declared Node.js 24/26 engine range on the three fixed
OS/architecture targets. Build one platform-independent tarball on `ubuntu-24.04` x64 with
the Node.js 24.18.0 development/build baseline, run a separate build/package smoke check,
then install the identical bytes in the exact six-job lower-bound certification product of
Node.js `24.11.0` and `26.0.0` with `ubuntu-24.04` x64, `macos-15` arm64, and
`windows-2025` x64. Record the resolved runner-image identifier and actual Node version for
each release job. Run the full primary-workflow and accessibility browser suite against the
exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 on
`ubuntu-24.04` x64 with Node.js 24.18.0. Those browser revisions are the reproducible
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
silently claims future majors. Mutable `*-latest` runner labels and an unspecified modern-
browser target were rejected because their release denominator changes without a repository
change. Chromium-only testing was rejected because the local launcher may open another
browser engine and the product uses standard browser APIs intended to work across the three
Playwright engines.

Primary version evidence is the npm registry for
[Nuxt](https://www.npmjs.com/package/nuxt), [Vue](https://www.npmjs.com/package/vue),
[Vue Router](https://www.npmjs.com/package/vue-router),
[tsdown](https://www.npmjs.com/package/tsdown),
[TypeScript](https://www.npmjs.com/package/typescript),
[Vite](https://www.npmjs.com/package/vite), [pnpm](https://www.npmjs.com/package/pnpm),
[Gunshi 0.37.0 registry metadata](https://registry.npmjs.org/gunshi/0.37.0),
[Monaco Editor](https://www.npmjs.com/package/monaco-editor),
[Vitest](https://www.npmjs.com/package/vitest), and
[Playwright](https://www.npmjs.com/package/@playwright/test). Node's official
[release status](https://nodejs.org/en/about/previous-releases) and
[Node 24.18.0 release](https://nodejs.org/en/blog/release/v24.18.0) establish the LTS baseline
and exact build release; the [Node 26.0.0 archive](https://nodejs.org/en/download/archive/v26.0.0)
establishes the second engine floor. GitHub's official
[runner-image labels](https://github.com/actions/runner-images#available-images) establish the
three fixed OS/architecture jobs. Monaco's official
[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)
establishes the selected stable editor version.
Gunshi's official [setup requirements](https://gunshi.dev/guide/introduction/setup) and
[declarative/strict CLI guide](https://gunshi.dev/guide/essentials/declarative) establish
the Node/TypeScript compatibility and closed unknown-option behavior used here.
The safe-filesystem layer uses only Node's built-in `node:fs/promises`, `node:fs`, and
`node:path` APIs, so it adds no platform toolchain or runtime package dependency.
The production `dependencies` set is exactly the pinned leaf packages `gunshi`, `yaml`,
`jsonc-parser`, and `smol-toml`. Nuxt/Vue/Vite/tsdown, Monaco, and test tooling are build-
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

`open` 11.0.0 was rejected even though its JavaScript API is convenient: its published
tarball contains an executable POSIX-shell `xdg-open` helper. That would make the installed
product closure contradict FR-038 and evade a root-tarball-only allowlist. Browser launch
therefore remains a small project-owned TypeScript adapter over fixed OS helper commands;
failure only leaves the already printed loopback URL for manual opening.

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
   programs, is rendered from the exact selected Repository root with `./`, and rejects a bare `**/`.
   Literal, one-segment, and non-adjacent recursive-directory tokens can compose in one program;
   `./**/` denotes explicit downward Inspector descendant inventory only and never asserts
   vendor traversal. Build validation compiles the same programs into immutable versioned
   `TraversalPlan` data; Global preview patterns render from those plans and consent binds
   their schema, closed selection policy, and canonical programs. The only
   content-dependent policy is the closed Codex Global first-non-empty branch: it probes
   the override first, short-circuits on safely read non-empty content, advances only from
   absent or safely empty content, ends with a safe returned Diagnostic for a deterministic
   unsafe or binary candidate, treats the event-confirmed-close observation only as already-confirmed successful close lifecycle, and propagates every non-carveout throw/rejection without fallback.
3. The **runtime composition registry** records stable `strategyId` values for selection,
   precedence, layering, fallbacks, condition projection, and relationship-only rules in
   [runtime composition](contracts/runtime-composition.md). A strategy refers to behavior
   and rule IDs instead of repeating paths.
4. The **official source registry** records stable `sourceId` values, canonical official
   URLs, exact bounded section anchors, review dates, affected contract IDs, assertions,
   and semantic fingerprints in [official sources](contracts/official-sources.md).

**Evidence-status decision:** documentation completeness and upstream lifecycle are
orthogonal. Every atomic behavior, rule, and strategy owns one `EvidenceAssessment` keyed
by `(subjectKind, subjectId)`. Its `documentationStatus` is exactly `documented`,
`partially-documented`, `unknown`, or `conflict`; its duplicate-free
`lifecycleQualifiers` use fixed `preview`, `experimental`, `deprecated` order. An empty
qualifier array asserts no lifecycle state and is never rendered as `stable`.
`documentation-conflict` remains only the `ConditionFact.status` produced when a conflict
affects runtime projection. Candidate provenance and relationships retain the sorted,
deduplicated assessment for every directly referenced behavior/rule/strategy record. We
rejected a single scalar status, a worst/best-status reduction, and a qualifier union
because each loses which official assertion applies to which subject.

The selected Repository root remains the immutable Repository inventory boundary. The CLI
captures `process.cwd()` once and uses that exact string by default. On Windows it rejects
UNC/server-share/device, current-drive/root-relative, and `C:`/`C:foo` drive-relative forms
before `resolve`, resolves only a plain relative option against the anchored capture, and
retains an absolute drive option; POSIX retains an absolute option or resolves a relative
option against the capture. Every selected absolute result passes the shared pure
`LexicalAbsoluteRootParts` parser with zero filesystem/network I/O and without
`process.chdir()` or per-drive working-directory semantics. Invalid option shapes fail before
session/browser creation, and bootstrap creates the one
non-authorizing Repository Source before central boundary admission. Vendor runtime roots,
walk directions, target files, trust, enablement, selection, installation, and product
surface are independent behavior/strategy facts rather than implications of a matcher or
file existence. A behavior record, source record, strategy, relationship, or excluded rule
never authorizes a read.

Every admitted tool-home root is represented by its own tool-specific Global Source: at
most one each for Codex, Claude, and Copilot, and therefore zero to three Global Sources in
one session. Each Source owns exactly one root and one Source-relative Path namespace.
Files of different customization types below that root remain separate inventory items.
The term repository-relative path is reserved for the Repository Source; inventoried-file
and normalized-target DTO locator fields, filters, file-scoped diagnostics, and cross-source
comparison use Source-relative Path. Enabled-Source and consent-preview `displayRoot` fields
are one-way escaped root presentation labels, not Source-relative locators or read authority;
the preview label originates before any owning Source exists and may represent an absolute
or invalid lexical root.

Bounded derivation remains a typed single-edge provenance graph with closed deterministic target construction, not
arbitrary reference following. The closed `DerivationProgram` union has exactly five
initial mappings: the three vendor local-marketplace manifest rules, Codex fallback
basename placement, and Codex skill metadata. Each pins an exact static seed provenance/
rule/kind, declaration field and syntax, base/placement, and fixed suffix alternatives.
No callback, arbitrary path join, free-form expression, glob, or recursive
derivation is representable. A derived provenance cannot seed another edge, while an
independent static provenance on the same physical file remains eligible. It admits only
safe Codex fallback basenames, Codex skill UI metadata, and vendor-specific plugin
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
  support and composition model. These are separate behavior rows. Inspector matchers may
  inventory possible descendant contexts only through explicit `./**/`, with applicability
  left conditional; no VS Code row is reused as a CLI or Cloud traversal rule. VS Code MCP
  has one deliberate versioned exception to the current-guide view: the 1.118 release note
  adds exact workspace-root `.mcp.json` and announces most-specific same-name deduplication,
  while the current MCP guide still presents `.vscode/mcp.json` and User configuration as
  its exhaustive locations. The specific versioned path is admitted, but the evidence
  status is `conflict`; because neither selected section states the root schema or a total
  order across root, `.vscode`, User, agent, and plugin inputs, the VS Code root provenance
  remains path/surface-only and projects no inferred winner. Its physical root file is
  already a CLI candidate, so compatible CLI and VS Code provenances share one Copilot/MCP
  recognition and one read while CLI extraction remains provenance-specific. Current
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
  selector at each inventoried possible layer, not `.codex/rules/**/*.rules`. Project
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
  vendor auto-discovery event. The Inspector may retain a root-exact authored-project
  matcher; a nested local manifest is admitted only through bounded derivation from an
  independently accepted catalog. Presence never proves registration, installation,
  enablement, trust, component loading, or precedence.

The vendor contracts also inventory documented User settings, agents, skills, rules,
hooks, MCP sources, plugins, state, and deprecated surfaces for future maintenance. These
User tables are evidence, not consent. FR-015 through FR-018 continue to authorize only the
three exact Global instruction sets; every neighboring User surface remains `excluded`
without a specification change, even when the vendor behavior registry documents it.

Every vendor behavior, Inspector rule, and composition strategy cites its exact official
`sourceId` values. The official-source record maps those IDs back to bounded URL sections
and affected contract IDs, so a changed page produces a finite review set. Checked-in
fixtures and modules validate identifier uniqueness, reciprocal links, English/Japanese
semantic parity, source anchors, and offline semantic fingerprints. Only the explicit
maintainer drift check may access the network; it never auto-updates a behavior, rule,
strategy, assertion, or fingerprint. Product startup and Repository/Global scans never
fetch documentation.

The registry stores no copied page body. The official-HTTPS host and redirect policy,
content-type checks, anchored-section normalization, recoverable transport-failure behavior,
and human update rules remain defined by
[OfficialSourceRecord](data-model.md#officialsourcerecord). A URL that is reachable but has
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
  rejected because untrusted content would control the read boundary. Fixed Inspector
  matchers and typed derivations preserve useful coverage without a generic file-read
  primitive.
- Expanding Global to every current User customization was rejected because it would
  contradict FR-015 through FR-018 and require specification and consent redesign.
- Combining all admitted tool homes into one multi-root Global Source was rejected because
  a Source is one filesystem trust boundary and one Source-relative Path namespace.
- One `certainty` enum was rejected because documentation maturity, authored versus
  installed state, trust, enablement, selection, and runtime applicability are orthogonal.

## 5. Filesystem and scan safety

**Decision**: Make the pure Node.js `src/inspection/safe-fs.ts` module the sole
inspected-source I/O backend. Repository startup and each consented tool-specific Global
Source create an internal `InspectionRootContext` after checking every exposed lexical
root component with `lstat` and rejecting links. The context contains the accepted lexical
root, its `realpath`, a bigint directory identity/metadata snapshot, its owning source ID,
and lifecycle state. The context is private application state, not an OS capability. The
service interprets only immutable versioned `TraversalPlan` data compiled from typed
matchers. Repository plans may express bounded descendant traversal. Global plans never
enumerate the tool-home root: exact targets touch only their fixed ancestor/target chain,
and only the fixed Copilot instructions subtree may be opened and enumerated beneath its
prefix. Neighboring Global paths receive no I/O.

For each directory, the service preallocates the process-wide resource-registry reservation,
completes checkpoint rows 21–24 immediately before `opendir`, drives the registered
`fs.Dir` with explicit `Dir.read()` calls until null, and completes rows 25–28 while it
remains open. Those paired checks bind and compare root, available-ancestor, and target-
directory identity/type plus `mtimeNs`/`ctimeNs`. The directory must reach registry
`close-confirmed` before the complete sibling set may be classified, used for descent, or
used to issue a ticket. A detectable create/remove/rename, unverifiable check, or unconfirmed
close discards the enumeration. The service preserves exact `Dirent.name` raw segments solely for enumerated-path reconstruction/
verification. A targeted fixed path that forbids parent enumeration instead retains and
uses only the exact immutable registry target-spelling segments. Neither form substitutes
NFC spelling into I/O; NFC classification segments exist only for matching, ordering, and DTO paths. If
distinct raw siblings normalize to one NFC classification key, every member of that group
fails closed without descent/open/read and receives
`safe-fs-path-normalization-collision`; one non-colliding NFD-only spelling remains readable
through its raw path and displays as NFC. A collision is one pathless session-scoped record
because no unambiguous public file path exists. Within one Source scan attempt, static
discovery, admission, collision rejection, and physical grouping complete before a group
read, except for the content-dependent Codex ordered fallback. A grouping identity is usable
only when exact bigint `dev`/`ino`/`nlink` are present, `ino !== 0n`, `nlink` is stable and
positive, and the admitted group count is no greater than `nlink`; otherwise the group is
boundary-unverifiable with zero accepted bytes. Hard-link admissions for one usable verified
physical file are read exactly once, choose the unsigned UTF-8-bytewise lowest NFC path as
primary, sort remaining unique paths as aliases, retain every raw provenance, match
filters/detail/selection across all paths, and use only the primary for a file Diagnostic.
Sources, later attempts, and later generations independently verify and read the object.
The Codex ordered fallback and a distinct derived path discovered after group consumption
are not merged or reopened; each uses its specified zero-read rejection. The service uses bigint `lstat` plus canonical
containment checks to reject VCS internals,
links, non-directory traversal objects, and detectable device changes. Only that service can issue a private, generation-bound `ScanEntryTicket`;
HTTP values and parsed content cannot create or reconstruct one.

A candidate read reconstructs its path only from the owning root context and ticket. Before
open it compares the root and every ancestor `lstat` `dev`/`ino`/`mode` with ticket
snapshots. It first checks candidate path `lstat`, rejects a link or non-regular object,
and compares `dev`/`ino`/`nlink`/`mode`/`size`/`mtimeNs`/`ctimeNs` with enumeration metadata. It
then resolves the candidate with `realpath`, uses `path.relative` to require canonical
containment, and immediately repeats the candidate path `lstat` comparison. It opens the
file only when both path-stat snapshots agree with each other and the enumeration
metadata. If `O_NOFOLLOW` exists and is
effective on that platform, its use is mandatory final-component defense in depth; absent
or ineffective support is not a cross-platform guarantee. Before reading any bytes, the
implementation repeats that ordered root/ancestor/candidate-`lstat`/canonical/
candidate-`lstat` sequence and compares the same fields with
`FileHandle.stat({ bigint: true })`. Bytes are read from that same `FileHandle` using
Node.js-managed streaming/chunking, never by a later path-based `readFile`. While the handle
remains open and before acceptance, post-read validation repeats the complete ordered
sequence and the same `FileHandle.stat` comparisons over the same fields. The registry
closer is invoked or joined in `finally`, and no result is accepted before
`close-confirmed`. A mismatch at any stage discards every collected byte, marks the ticket stale or
rejected, commits no readable content or receipt, and emits only a fixed source-value-free
authenticated Diagnostic; its Source-relative Path is never projected into the
fixed-code/opaque-ID operational event. Only after complete traversal and registry-confirmed
closure of every acquired resource may a deterministic candidate-local mismatch retain a
diagnostic-only inventory record for a safely inventoried path and leave unaffected results
usable through a contracted-partial commit. A root/shared-ancestor or directory-enumeration
guard outcome, or any unconfirmed FileHandle or `fs.Dir` close, aborts the affected Source
attempt, preserves its previously committed graph, and commits no candidate record, partial
generation, or success receipt.

The only two caught or observed filesystem-rejection cases here are FR-041's narrow
carve-outs. Node's exact `ENOENT` from an `lstat` call at a contract-declared structural
existence checkpoint means `absent` before observation or `entry-disappeared` afterward.
The handler checks only the code, never the message, and never applies that conversion to
`open`, `read`, or another error. Separately, after a FileHandle `close` event has confirmed
closure, the resource registry may observe a later rejection of that handle's retained
close promise and retain only the already-confirmed successful close lifecycle. Every
non-carveout throw or rejection propagates unchanged through filesystem, parser,
recognition, and scan domain layers.

All inspected-source filesystem calls run through one process-wide sequential executor.
One process-wide `ClosableResourceRegistry` is the sole owner and close-state machine for
every inspection `FileHandle` and `fs.Dir`. It inserts an `opening` reservation before
`open`/`opendir`, publishes the strong resource reference before it can escape, invokes
`close()` at most once, and lets every waiter join one retained promise. Fulfillment or a
FileHandle `close` event confirms closure. When that event confirms first, a later raw
promise rejection is observed but treated as successful; without confirmation, rejection
becomes `close-unknown`, propagates through the owning boundary, and poisons new inspection
scheduling. A later FileHandle event may clear the poison, while an unknown directory close
requires restart. Each file is validated and read through the same handle. This ordering is a race-safety
invariant. Opens are read-only. The production boundary exposes
no write/append/create/truncate open, write, truncate, create, rename, delete, link,
chmod/chown, utimes, xattr, ACL, or equivalent mutation operation and never requests an
access-time update. Tests instrument those calls and compare content, length, identity/link
state, mode, mtime, ctime, and observable xattrs/ACLs. An atime change caused solely by OS
read semantics is recorded separately and is neither a mutation failure nor proof of safety.

Filesystem-operation completion and effective capacity are governed by Node.js, the
operating system, the filesystem, and the execution environment. Disable, shutdown, or
another authority-revoking lifecycle event
invalidates the attempt and its tickets; any result that arrives afterward is discarded and
cannot publish a graph, Diagnostic, DTO, or operational event. Cleanup invokes or joins the
same registry closer when the underlying operation settles, but retains a strong reference
for `close-unknown` and never guesses or double-closes. Disable cannot complete until every
resource in its lineage is `close-confirmed`; an unknown close leaves its data fence and
retryable Operation Error in place, with restart as the fallback. Node.js exposes no portable hard
cancellation guarantee for a stalled kernel operation, so timely physical drain and recovery
from process-level OOM or kernel termination are outside the product guarantee.

If successfully returned identity/metadata or canonicalization is structurally unavailable,
ambiguous, malformed, or otherwise unusable, `safe-fs-boundary-unverifiable` rejects the
boundary or candidate instead of guessing. Only a candidate-local returned outcome after
complete traversal and registry-confirmed closure of every acquired resource may retain the
diagnostic-only inventory record. A root/shared-ancestor or directory-enumeration guard
outcome, or any unconfirmed close, aborts the affected Source attempt with no candidate
record, contracted-partial generation, or success receipt. A throw or rejection while
obtaining the data instead follows the propagation rule above.

**Rationale**: The repeated checks materially reduce risk from ordinary concurrent edits,
ensure detected changes cannot be committed, and preserve the scan contract. They do not
create kernel-enforced containment. Node 24's
[filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags) exposes
neither directory-handle-relative open nor an atomic beneath/no-follow resolver; POSIX
`O_NOFOLLOW` covers only the final component, and Windows has no corresponding portable
Node flag. Node cannot portably expose every Windows reparse tag or distinguish every mount
transition. Same-device bind mounts and reparse metadata that Node does not expose remain
explicit platform limitations outside automated-test proof. Its
[Permission Model](https://nodejs.org/docs/latest-v24.x/api/permissions.html#limitations-and-known-issues)
and [WASI](https://nodejs.org/docs/latest-v24.x/api/wasi.html#security) are not substitutes
for that missing filesystem primitive.

The release therefore treats ordinary concurrent changes, every implementation-detectable
race, and effective-`O_NOFOLLOW` final-component defense as in scope and fails closed for
every detected case. It excludes active source-root/ancestor replacement and, only where
effective `O_NOFOLLOW` is unavailable, active final-entry replacement between path checks.
Tests are evidence for the specified detection behavior, not proof against those excluded
cases. The concrete resolution path before
expanding the threat model is to adopt a future Node directory-relative API with atomic
beneath/no-follow semantics, or to scan an OS-enforced read-only snapshot/sandbox and
repeat the security review. One service still centralizes traversal safety and progress
without applying product-defined file-size, item-count, depth, or time validation. Every emitted file path is a collision-free NFC classification
path relative to the owning Source's one root; filesystem operations retain the raw spelling.

Node's ordinary filesystem promises also provide no portable hard wall-clock cancellation
guarantee for a stalled kernel operation. Serialized execution and revoked tickets prevent
late publication, but do not prove physical I/O termination. Removing that residual requires a future
public cancellable filesystem primitive or an OS-enforced read-only worker/sandbox that can
be terminated and drained, followed by renewed leak and disable-race verification.

**Alternatives considered**:

- A direct `readFile(path)` or glob-only implementation was rejected because it has no
  generation-bound ticket, enumeration/open identity agreement, post-read validation, or
  complete scan accounting.
- Treating the Node Permission Model or WASI as a containment proof was rejected because
  their documented limitations do not provide atomic child-open semantics.
- Claiming that pre/post path checks defeat an active root/ancestor replacement attacker, or
  a final-entry replacement attacker where effective `O_NOFOLLOW` is unavailable, was
  rejected because validation and open remain separate operations.
- Following symlinks that currently resolve inside the source was rejected because parent
  swaps and aliases complicate the boundary and physical-file identity.
- An install-time compiler or downloaded platform helper was rejected because the package
  must run as shipped with Node.js alone.
- Failing the entire scan on one unsafe or changed file was rejected because FR-028
  requires unaffected results to remain usable.

## 6. Safe parsing, literal display, and inert rendering

**Decision**: Treat verified source bytes as authoritative. Any NUL byte is binary and
diagnostic-only, making an otherwise publishable generation contracted-partial. Decode every
other byte sequence exactly once as UTF-8 with replacement semantics. Record and remove one
leading BOM; use `utf-8-replaced` when decoding inserts any `U+FFFD`, preserve those
characters in the complete garbled source, and continue parsing, extraction, display, and
comparison. Replacement alone is a complete outcome. Never guess or retry another charset.
Return readable source text, displayed declared metadata values, and comparison content
exactly as authored, without credential detection, content-based masking, redaction, or a
reveal workflow. Environment-variable references inside inspected content remain literal
text and never cause the Inspector to read, resolve, or substitute the referenced process
value. The documented `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, and `COPILOT_HOME` inputs are used
only by the host to locate tool-specific Global Source roots, not by content parsing.
The Inspector applies no file-size or file-count validation. Reading, decoding, parsing, and
retention use the capacity available from Node.js, the parser libraries, the operating
system, and the execution environment. After complete traversal, only an FR-028-eligible
deterministic non-throwing entry outcome may use contracted-partial. The
event-confirmed-close observation retains only already-confirmed successful close lifecycle.
Any non-carveout throw or rejection propagates without domain classification/retry/recovery, contributes no result to
the attempt, and becomes only a generic Operation Error at a REST-owning boundary; startup-
owned failure reaches the process top level. Recovery from process-level OOM or kernel
termination is not promised.

Perform best-effort metadata extraction after decoding, but never use a decoded/normalized
value as the displayed value. Every accepted allowlisted field occurrence carries an exact
`authoredLiteral` source slice plus a separate internal typed semantic value. The public
metadata list stays in source-occurrence order and preserves accepted duplicate occurrences;
its cross-file identity is tool, kind, closed field ID, and that field's zero-based
occurrence. JSONC syntax-tree ranges, YAML CST/source-token ranges, a TOML lexical-span
scanner paired with semantic parsing, and Markdown/frontmatter/import spans produce the exact slice.
JSON/YAML/TOML quoting, escapes, block indicators, numeric/date spelling, and collection
punctuation therefore remain visible. Only the separate semantic value may drive typed
classification, relationship normalization, or bounded derivation. An authored relationship
displays the exact target slice and normalizes only its semantic string. A registry-defined
documented default has no source slice, uses `authoredTarget: null`, and is labeled as a
documented default rather than source-authored text. Ranges use ECMAScript UTF-16 code-unit
offsets and must reproduce the literal with `String.prototype.slice`. Metadata,
relationship, and derivation may reference the same exact source
occurrence/range. Only partial, nested, crossing, or identical overlap between distinct
origin occurrences is invalid. A missing, illegally overlapping, ambiguous, or non-round-tripping range discards the recognition's whole
extraction rather than inventing a literal.

YAML semantic parsing uses core schema with no custom tags and disabled aliases; JSONC
extracts known paths from a syntax tree; semantic values are normalized to a
JSON-safe discriminated internal union whose integer, float, and date/time payloads use
typed canonical strings without JavaScript precision loss; Markdown/frontmatter and Claude
imports are scanned as text. Parser workers are constructed only from the fixed package-owned
entry and inherit their memory, message, syntax-tree, scalar, and scheduling capacity from
Node.js, the parser libraries, and the execution environment; the product does not configure
V8 memory ceilings or parser item/depth/time limits. After complete traversal, an
FR-028-eligible deterministic non-throwing parser/extraction outcome or incompatible meaning from two extractors
for the same `(fileId, tool, kind)` may discard that one recognition's whole extraction result
under a contracted-partial outcome without changing the readable source text or another
recognition. A parser/Worker throw or rejection propagates without a domain catch,
classification, retry, Diagnostic, or partial result and follows the same owning-boundary
rule. Exactly one recognition exists per tool/kind
pair and compatible provenances merge there. Rules, scripts, markup, URLs, and control sequences are never
evaluated or rendered. The internal `semanticValue` name means only mechanical typed
decoding. Across Inventory, Detail, Comparison, Global controls, Diagnostics, Source
Condition Facts, APIs, CLI output, and documentation, the product never interprets or ranks
natural-language meaning, decides validity/correctness/effectiveness/compliance/quality,
advises remediation, or lints, synchronizes, converts, formats, or fixes customization
content. Validation of Inspector-owned manifests, DTOs, registries, and invariants is an
internal safety check, not a customization verdict.

Operational event records contain only fixed stable codes and opaque session/source/file/
scan/operation IDs. They contain no Source-relative/absolute/canonical path, root, filename,
inspected content or metadata, authored value, capability, body, raw parser/system error, or
exception string. An authenticated session `Diagnostic` may retain the minimum
Source-relative Path and metadata needed to act on a file-specific problem, but that surface
is never projected into a log. Fixed CLI help/version, the one launch-URL line, and fixed
startup warnings are presentation output rather than operational events and still contain
no inspected content, inspected path, or authored value.

**Rationale**: Parsing is needed to label declarations and relationships, but success must
not turn the Inspector into a validator. Literal presentation preserves credential and
other authored differences that masking would hide. Before any `FileDetail` request or
comparison construction, the bundled interface requires an in-memory acknowledgement that
gates complete source text, declared authored metadata, authored relationship targets, and
either comparison side. It resets on document reload or the central full-session client-data
purge; ordinary scoped route, file/Source, and generation cleanup may retain it for the
loaded document, while Global disable is the explicit full-purge exception. Capability authentication is the API access boundary; the API does not receive or
persist acknowledgement. The authenticated loopback API, `Cache-Control: no-store`, process/browser-memory-only
lifetime, Vue text bindings, disabled links, and restrictive content security policy keep
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
- Zod was not added: request commands are small closed shapes and strict manual guards are
  simpler; it would not secure filesystem input.

## 7. Source and metadata comparison UI

**Decision**: Client-only lazy-load the ESM build of `monaco-editor` on file/compare routes
for read-only single-file source views and literal source comparison. Import only the editor
worker and required basic-language contributions; let Nuxt/Vite emit same-origin assets
and do not ship unused language-service workers. Models use opaque in-memory URIs, hold
complete authored source text, and are disposed separately from their editor and
subscriptions on route close, selection replacement, source disable, or generation
replacement. Configure
`readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
`renderMarginRevertIcon: false`; keep `accessibilitySupport: 'auto'`, enable
`accessibilityVerbose`, and give every source side an `ariaLabel`. The CSP permits
Monaco's generated inline layout/theme styles and only Nuxt executable inline scripts
whose exact hashes are in the trusted build manifest; it permits no executable attribute,
evaluation, nonce, unrecorded inline script, external worker, or blob worker. Diff
highlighting uses Monaco and browser capacity without a product-defined line or computation-
time cutoff. If Monaco or the browser reports a recoverable failure, retain the complete
read-only side-by-side source and a diagnostic. Recognition metadata is matched by tool, kind, closed field ID, and occurrence,
then compares and renders the exact `authoredLiteral` in Vue rows/badges; the internal typed
semantic value is never substituted into the UI or converted to JSON text for Monaco. Preserve Monaco's
accessible diff viewer, ARIA labels, keyboard navigation, and narrow-screen inline mode
for explicit accessibility testing.

**Rationale**: Source files include Markdown and structured configuration where syntax
coloring, line navigation, virtualized rendering, search, synchronized scrolling, and a
well-tested diff surface materially improve inspection. Monaco already computes source
differences and exposes editor- and environment-dependent computation and accessibility behavior, so a
second text-diff package would duplicate responsibility. Metadata has domain semantics:
set-like recognitions, ordered precedence, and fields with stable identities must be
compared structurally rather than as serialized lines, while literal spelling differences
remain observable. The official
[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)
and [Monaco repository](https://github.com/microsoft/monaco-editor) document those editor,
worker, accessibility, and model-lifecycle capabilities. Exact version pinning and the
packaged browser tests protect the deliberately narrow ESM imports during upgrades.
No content-based display transform is applied: sensitive authored values remain visible
after the required warning, while inert rendering prevents their content from executing,
loading, or navigating.

**Alternatives considered**:

- Adding `diff` beside Monaco was rejected because no current CLI, API, patch export, or
  headless consumer needs a second diff engine.
- Serializing recognition metadata into Monaco was rejected because property ordering and
  line changes obscure added, removed, or changed domain fields.
- A custom `<pre>` source diff was rejected because it would recreate core navigation,
  large-document rendering, synchronization, accessibility, and diff interaction work.

## 8. Local session transport

**Decision**: Use `node:http` for a small versioned JSON API and static-file service. Bind
an ephemeral port on `127.0.0.1`, generate a 256-bit capability per process, pass it to the
SPA in the URL fragment, and require it on every API request. Enforce the exact Host and
Origin, omit CORS, reject malformed or unsupported bodies, set `Cache-Control: no-store`, and send
a restrictive CSP. Use file IDs and closed commands, never client paths. Keep the
capability in memory only: after fragment removal a reload makes no API call and tells the
user to reopen the process-lifetime printed URL. Serve the inert SPA shell only for a
closed client-route grammar and build-manifest assets. The CSP is derived from the exact
build-recorded inline hashes rather than `unsafe-inline`. Before Global consent, expose a
capability-protected lexical/no-I/O path preview, bind confirmation to its session-keyed
digest, and reject any post-consent canonical alias difference before enumeration. Retain
one operation-local input capture per new unconsented preview: read `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, and `CODEX_HOME` once each in that order; treat only `undefined` as
absent; when any is absent call imported `node:os.homedir()` once and use active-platform
`node:path.join` with fixed `.copilot`, `.claude`, and `.codex` suffixes. Do not independently
select `HOME` or `USERPROFILE`, and perform no existence check during capture. Retain
the exact raw `lexicalRoot` internally and bind it, the escaped display, and the immutable
`TraversalPlan` schema/selection-policy/canonical programs in the digest. Preview parsing
and transport inherit capacity from Node.js, the browser, and the execution environment;
the product does not impose a byte limit on the proposed root or escaped display. Enable uses only
that stored raw value, never reverses display text and never rereads the environment. Invoke
the capability-protected liveness route only on observable lifecycle transitions: initial
authorization, return to visible/focused state, explicit Resume, and adoption of a fresh
session. Allow at most one check in flight and let the browser/network/runtime own request
settlement. This single-flight rule serializes state adoption so stale responses cannot win;
it is a functional coordination invariant, not a resource-admission or validation ceiling.
Define no polling interval, request timeout, retry timer, or memory lease. Use a
shared `clientDataEpoch`-guarded purge for network/runtime rejection, `401`/`403`, session
mismatch, hidden/page lifecycle events, a Global-disable click before request dispatch, and
observation of a greater Global content epoch or non-null disable fence; it removes all
DOM/DTO/editor/warning state and prevents late responses from restoring content. Process loss
on a continuously visible idle page has no product-defined wall-clock detection guarantee and
is handled by the next lifecycle signal or authorized request outcome. Retain only the memory
capability across a hidden-page purge. On visibility return, the retained capability
authenticates a fresh session. The SPA adopts its returned `sessionId` as the new liveness
baseline without retaining or comparing the purged ID. A successful liveness body is exactly
`{ sessionId, globalContentEpoch, globalDisableInProgress }`: an older epoch is rejected,
equal epoch plus a null fence confirms the baseline, and a greater epoch or non-null fence
purges before render and enters client-side `RecoveryViewState`. A non-null fence makes the session
route return the exact control-only `GlobalFenceRecoverySnapshot`; a null fence makes it
return a normal full `InspectionSession`, from which the recovering client adopts only the
control/error projection and discards the inspection graph. Active consent
makes disable available from that view immediately; the preview route returns the exact
frozen preview so retry controls can be reconstructed without browser persistence or an
environment reread. The recovery view offers Resume inspection only when the fence is null
and a normal full snapshot can be fetched; that explicit action re-fetches a matching
session and builds a default fresh inventory summary without restoring
old detail, comparison, editor, selection, filter, authored source, or acknowledgement. A
later detail/comparison open requires a new acknowledgement.

The capability-authenticated API returns complete authored content only for an explicit
detail request. Sensitive-content acknowledgement is a mandatory bundled-SPA presentation
invariant, not an authorization credential: it stays in client memory, is never sent to the
API, resets on document reload and the central full-session purge, and gates every
`FileDetail` request plus comparison construction in the bundled client. Ordinary scoped
route, file/Source, and generation cleanup is not that purge and may retain acknowledgement
for the loaded document; Global disable is the explicit full-purge exception.

Every SessionSnapshot/FileDetail request captures the client epoch, generation, exact
request token, and file ID where applicable. Older snapshots are ignored; before adopting
a newer generation the client increments the epoch and aborts/disposes every detail,
comparison, and editor object. Equal-generation snapshots require their current token.
File detail is adopted only if epoch/generation still match and the readable file still
exists. The server captures each envelope's generation and payload together under the
coordinator lock, so delayed network delivery cannot mix them.
Each automatic or explicit scan also receives an opaque `scanRequestId`. Source progress,
the rescan admission response, and a successful source-scan generation carry that same ID;
bootstrap and disable generations carry null. The client binds current status and rendered
inventory completion to its admitted request ID and rejects an earlier status or generation.

Print the closed-grammar launch URL exactly once to the initiating terminal before any
browser attempt. A project-owned `src/launch-browser.ts` revalidates
`http://127.0.0.1:<port>/#cap=<43-character-base64url>` and, unless `--no-open` is set, uses
`node:child_process.spawn` with `shell: false`, ignored stdio, fixed arguments, and `unref()`:
`/usr/bin/open` on macOS or the OS-provided `/usr/bin/xdg-open` on Linux. Windows and every
other platform skip automatic opening and emit the fixed manual-URL warning because the
portable Node API supplies no independent trusted boundary for selecting a system browser
helper. The exact child environment allowlist is macOS `HOME`, `TMPDIR`, `LANG`, `LC_ALL`;
or Linux `HOME`, `DISPLAY`, `WAYLAND_DISPLAY`, `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`,
`DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, `LC_ALL`. These keys are copied
directly from the launch environment as ambient platform provenance only; no
Source/preview/candidate/file path or authored value is copied from inspection state, and
lexical equality changes no provenance or authority. `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`,
every non-allowlisted environment key, all inspection-derived content, paths, and authored
values, and additional argv are omitted. OS helpers
may consume the listed desktop/session values, but the Inspector never selects a handler
from them. A missing helper, spawn error, nonzero exit, or
unsupported platform emits only a fixed warning and leaves the server running; the printed
URL is the fallback. The launch line is the sole intentional capability display and is not
copied into operational logs.

**Rationale**: Loopback binding alone does not address browser-origin requests or DNS
rebinding. A fragment is not sent in the initial HTTP request; JavaScript can transfer it
to a custom authorization header and remove it from visible history. Refusing browser
storage makes refresh behavior explicit without creating ambient credentials. Digest-
bound preview consent proves which lexical roots and patterns the user saw before the host
touches them. Recoverable Node.js or browser failures during preview construction fail
without authorizing an unseen value. `node:http` avoids a server framework for a small fixed route set; the current H3 v2 tag is a release candidate while
stable H3 v1 is a larger legacy dependency. Lifecycle-triggered authenticated checks and
authorized request outcomes expose session loss at observable boundaries without persisting
data or relying on server push; immediate hidden-page purge avoids background timer
retention. A continuously visible idle page intentionally has no product-defined wall-clock
process-loss guarantee and detects loss only on the next lifecycle signal or request outcome.
The recovery DTO keeps all-failed Global consent visible even when no Source exists, while
the separate preview avoids repeating a potentially large display payload in every session retrieval.

**Alternatives considered**:

- Unauthenticated RPC was rejected because customization files can contain secrets.
- A cookie-only or query-string token was rejected because ambient cookies invite CSRF and
  query values appear in request logs/history.
- General `--host` support and CORS were rejected because remote access is out of scope.
- SSE/WebSocket session push was rejected because lifecycle-triggered authenticated checks,
  ordinary authorized request outcomes, and immediate hidden/page purge provide the required
  observable teardown signals without a long-lived transport or product timer.
- A `BROWSER` override, package-owned/user-supplied shell helper, shell command string, or bundled platform helper was rejected because
  launch needs no user-configurable execution path and the product package must remain
  JavaScript-only. The fixed OS-provided `xdg-open` may itself be a system shell helper,
  but it is outside the package payload and is invoked as a fixed executable with
  `shell: false`.

## 9. Atomic generations, rescan, and environment-dependent capacity

**Decision**: Start the Repository scan automatically, expose progress through the session
snapshot, and perform later Repository or enabled tool-specific Global Source scans only on
explicit user action. Create a legal empty zero-I/O bootstrap generation 0 synchronously
before the automatic Repository command, containing exactly one idle, non-authorizing
Repository Source selected from captured `process.cwd()` or the optional single `--cwd`,
with null source progress until boundary admission and work are queued.
Every automatic or explicit scan receives an opaque `scanRequestId`; its Source progress and
a successful source-scan generation retain that ID, while bootstrap and disable generations
use null.

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
publication. Every liveness success instead binds exact `{ sessionId, globalContentEpoch,
globalDisableInProgress }` values from one current coordinator-lock snapshot at publication
and returns a current non-null fence. The
barrier sets `globalControl.state: disabling` and empties pending/retry arrays only when
active consent/control exists; an operation-local initial enable has a null control
projection but a visible fence. It aborts/discards active uncommitted work, drains enable
validation/admission and queued Global work through the shared resource registry, and
requeues an interrupted Repository command only after terminal success. Success with any
public Global consent, control, or Source state uses `remove-active-state` and publishes
Repository-only N+1; only an unpublished operation-local initial enable uses `cleanup-only`
and preserves N plus every generation-owned ID. Repeated disable joins the same barrier.
A post-acceptance or unconfirmed-close failure keeps the fence, generic Operation Error,
and retry/join path while the process stays alive; unrecoverable cleanup requires restart.
A pre-acceptance failure or true no-op leaves the fence null. A final coordinator-locked
operation-ID/epoch/state check determines whether enable returns `202` or loses to disable
with `409`, so late work cannot restore revoked Global state.

Each scan starts from the current session-wide generation and builds its replacement
separately. A complete result, or a contracted partial result produced only after complete
traversal and an FR-028-eligible deterministic non-throwing entry outcome, commits atomically as the next generation; every carried graph and generation-owned
ID is rekeyed, and old file/detail/comparison/selection/editor references become stale. An
explicit rescan's fatal failure discards all uncommitted output. The last successful snapshot
stays visible with a Source-keyed stale-failure entry referencing an actionable Diagnostic
for a deterministic returned failure or only Operation Error for a throw/rejection. A
startup throw/rejection has no REST owner and reaches the process top level. A fatal tool-specific Global rescan
retains that Source's consent, accepted root context, and last committed graph for retry or
disable.

One session-wide consent fixes all three tools, with one `GlobalToolControl` per frozen
preview entry and no selector. Post-consent validation catches exact structural-`lstat`
`ENOENT` only as absence; lexical/link/type/boundary outcomes may reject a sibling, the
event-confirmed-close observation retains only already-confirmed successful close lifecycle,
and every non-carveout throw/rejection aborts the whole transaction through the owning REST boundary. If
validation admits no root, `active-no-job` retains control for retry/disable and publishes no
Source/job/generation. If it admits one to three roots, one provisional batch scan publishes
all of their separate Sources together in exactly one generation; no per-tool commit is
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
and the execution environment. The event-confirmed-close observation retains only already-
confirmed successful close lifecycle. A non-carveout throw or rejection from those layers
is not assigned a capacity/resource/operational cause by the domain. It propagates to the trigger owner,
returns or commits no attempt result/generation, and retains the prior snapshot when a REST
boundary survives. Such a failure never authorizes contracted-partial. Routes serialize
committed DTOs once and never silently truncate them.
Process-level OOM, kernel termination, and an indefinitely pending uncancellable filesystem
operation cannot be recovered from or bounded by the application contract.

Disable, shutdown, and generation replacement revoke publication authority independently of
elapsed time. Results that settle after revocation are discarded, acquired resources are
released when the underlying operation permits cleanup, and revoked data cannot repopulate
the session. The liveness path remains independently scheduled by Node.js, but no claim is
made that it can survive runtime exhaustion or a blocked/terminated process.

**Rationale**: Serialization plus atomic session generations prevent lost updates and mixed
old/new results. Deriving capacity from the actual runtime avoids presenting arbitrary
product numbers as portable safety guarantees. Generic outer-boundary errors preserve the
execution lifecycle without inventing a domain cause; failures outside application control
remain explicit platform limitations.

**Alternatives considered**:

- Automatic watch/rescan was rejected because it creates implicit reads and stale-state
  races not required by FR-030.
- Incrementally mutating the active result was rejected because consumers could observe a
  mixture of generations.
- Concurrent per-source commits were rejected because a single generation number and
  generation-scoped IDs would otherwise require conflict-prone commit-time rebasing.
- Product-defined byte, item-count, parser, queue, worker, and deadline caps were rejected
  because effective capacity belongs to Node.js and the surrounding execution environment.

## 10. Verification strategy

**Decision**: Maintain vendor conformance fixtures and negative near-misses, plus
adversarial fixtures for links, races, encodings, recoverable environment failures, literal credentials,
environment-variable references, imports, executable declarations, and malformed formats.
Before any consumer relies on the formatting gate, the dependency-free checker suite builds
temporary repositories that exercise every recursive root and exact root file, an absent
future-listed path, excluded generated roots, a selected symlink, invalid UTF-8, BOM, CRLF and
bare CR, trailing space and tab separately, missing and multiple final LFs, an empty file,
extensionless maintained text, every valid exception class, and invalid absolute, `..`, glob,
directory, duplicate, out-of-scope, and blank-rationale exceptions. It compares bytes, mode,
and modification time before and after passing and failing runs, and verifies stable sorted
path/rule-coded diagnostics, content-free output, and exact exit status 0 or 1.
Test pure recognizers/parsers and literal-display DTOs, the HTTP
contract, source boundary integration, packed `npx` behavior, the 100k/500 performance
case, and all four Playwright user stories. Evaluate SC-008 against the complete 55-row
WCAG 2.2 Level A/AA applicability matrix and objective pass rule in
[the accessibility acceptance contract](contracts/accessibility-acceptance.md), combining
criterion-specific stable check IDs with the specified automated, keyboard, and manual
evidence. Its closed manual matrix freezes the packed candidate, both locales, three
supported OS/browser/assistive-technology cells, responsive/visual profiles, workflow
states, and input profiles; every applicable cell is recorded, and a frozen-value change
reruns all manual checks. An axe severity result alone is
not acceptance evidence and cannot turn a failed Applicable row into a pass.
SC-003, SC-004, SC-005, SC-007, and SC-009 share a versioned, checked-in release-evidence
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
Four registry fixture suites validate every behavior/rule/strategy/source ID, reciprocal
evidence links, exact section anchors, English/Japanese parity, and the rule that only the
Inspector matcher registry can authorize a read. Matcher fixtures reject a Repository
selector without `./` or with bare `**/`, distinguish exact/direct-child/explicit
descendant inventory, and prove that `./**/` does not satisfy a vendor traversal fact.
Targeted regression fixtures cover Copilot's separate VS Code/CLI/Cloud lookup tables,
Claude project settings only at the exact selected Repository root, non-recursive Codex rule directories,
plugin activation versus authored manifest inventory, and zero Global reads beyond
FR-015 through FR-018. They also verify zero to three tool-specific Global Sources, at most
one per tool, exactly one root and Source-relative Path namespace per Source, exact literal
credential display, no reveal controls, and no environment-variable substitution.
Lifecycle fixtures cover concurrent unresolved failures for all four Sources, per-Source
clear/replace/removal, and automatic-first-failure current state. Browser fixtures cover
lifecycle-triggered checks, browser/network/runtime rejection, hidden/page purge, port reuse
with a mismatched session, the absence of a wall-clock guarantee for process loss on a
continuously visible idle page, and paused snapshot/detail delivery across scan/disable commits with epoch,
generation, token, and file-existence rejection of late responses. Preview fixtures cover
raw/display escape collisions and prove enable uses the stored raw root. Matcher fixtures
also prove Global exact targets never enumerate the root, fixed subtrees touch only their
allowed descendants, and neighboring paths receive zero I/O. Raw-path fixtures read one
non-colliding NFD-only entry through its exact spelling and fail an NFC/NFD sibling collision
group without descent/read.
Run the pure Node.js integration/race suite on macOS, Linux, and Windows, including parent
replacement, final-component replacement, root rename, symlink/junction rejection,
detectable device changes, identity/metadata mismatch, same-handle reads, byte
discard, no-readable-content commit, and post-pack execution. Where effective
`O_NOFOLLOW` exists, tests require its use. Controlled barriers exercise changes detected
by the post-read root identity, every ancestor `lstat`, candidate path `lstat` before and
after canonicalization, canonical containment, and same-handle stat comparisons. Test-only filesystem barriers remain
inside the test harness and are not exported by production modules. These tests establish
the specified detected-race behavior and must not be described as proof against the active
adversarial mutator excluded by the threat model or against same-device bind mounts and
reparse information that Node never exposes.
Instrument tests with local fixture roots and all product socket/HTTP(S)/DNS/SMB/URI/image/
remote-reference/MCP surfaces. Separately classify and validate the two exact FR-022 authorized
internal loopback classes at the issued `127.0.0.1` authority—closed unauthenticated static/SPA
`GET`/`HEAD` and capability-authenticated declared API requests—and fail if inspected content causes
any other direct product-issued outbound request as defined by FR-022, MCP connection, child
process, dynamic evaluation, or product-issued source mutation. Explicit UNC/server-share/device vectors prove
zero filesystem/DNS/SMB calls; lexically indistinguishable mounted/mapped network storage is
recorded separately as the OS-mediated platform/environment limitation. Mutation tests
instrument read-only versus mutation-capable filesystem APIs/flags and compare content,
length, identity/link state, mode, mtime, ctime, and observable xattrs/ACLs; OS-only atime
changes are recorded separately and count as neither failure nor proof. Operational-log
tests capture every event and reject paths, roots, filenames, content/metadata/authored
values, capabilities, bodies, raw errors, and exception strings while authenticated
Diagnostic DTO tests retain only their allowed fields. Cross-surface negative tests
cover Inventory, Detail, Comparison, Global controls, Diagnostics, Source Condition Facts,
API/CLI output, and documentation to prove that no customization validation, natural-
language interpretation/ranking, verdict, policy/remediation advice, conversion,
synchronization, formatting, or fixing is exposed.
Literal-span fixtures for every supported format place astral, isolated-surrogate, and
combining sequences around fields, require UTF-16 `String.prototype.slice` round trips,
allow one origin occurrence to drive metadata/relationship/derivation, and reject overlap
between distinct origins. Multi-provenance fixtures prove exactly one recognition per
tool/kind and keep hard-link alias seed provenances distinct. Package fixtures distinguish
package payloads from package-manager-generated symlink/`.cmd`/`.ps1` launchers and verify
their exact declared Node targets and argv-only bodies. Package/bootstrap fixtures cover
malformed inputs, manifest closure, declared/actual length mismatch, and hash failure without
asserting byte or item-count boundaries. Coordinator fixtures prove FIFO serialization,
disable priority, `202`/`409` race disposition, cancellation, and late-result rejection
without slot-capacity fixtures. Injected recoverable Node.js, parser, editor, and transport
failures prove safe failure, atomic publication, and no response truncation; fixtures also
confirm that file size and collection cardinality are not product validation rules. Process-
level OOM and kernel termination remain outside in-process recovery tests. Diagnostic fixtures enforce the closed `file | source | session`
scope union. A file-scoped Diagnostic has its owning `sourceId`, `fileId`, and
`sourceRelativePath`; a source-scoped Diagnostic has its owning `sourceId` but no `fileId`
or `sourceRelativePath`; and a session-scoped Diagnostic has none of those three fields.
Source- and session-scoped Diagnostics never fabricate a path to satisfy a display or
ordering field.

The 2026-07-17 measurable-outcome revalidation fixes the following objective protocols:

- **SC-001** uses exactly 20 participants who use Git and a command-line interface in their
  normal development work but have never used or contributed to the Inspector. At least 19
  must succeed within 2 minutes using only the provided product guidance. The timer starts with the
  standardized task prompt and ends when one discovered file's source/details view is
  visibly open and operable. Before the prompt, the equipment prepares the intended Repository
  root as the verified distribution `repository/` working directory. The timed participant
  actions begin by entering the fixed fd6 line
  `npx --no-install agent-customization-inspector --no-open` and include launch plus the
  deliberate printed-URL fallback in the pinned certified browser. Changing directory or
  supplying `--cwd` is not a participant action in this study and remains a product capability
  verified by the automated User Story 1 tests. SC-001 runs before SC-006 with the same cohort.
  Moderators may only repeat the prompt verbatim. Every
  enrolled participant remains in the fixed denominator and is never replaced. An equipment,
  environment, or product failure counts as unsuccessful, including before timer start, when
  it prevents or interrupts criterion completion. The sole scoring carveout is a handled
  automatic-browser-opening condition: record it, require the printed-URL fallback in a pinned
  certified browser, keep the original two-minute timer running without pause or reset, and
  count a no-hints completion inside that original interval as successful rather than
  unsuccessful. Prevention or interruption of that fallback remains unsuccessful.
- **SC-002** reuses one unchanged deterministic 100,000-entry/500-match fixture for exactly
  10 measured runs on one versioned, published reference-environment profile. The checked-in
  profile records the exact OS image/version, processor architecture/model and logical count,
  memory, storage/filesystem, application runtime, benchmark command/configuration, and
  fixture manifest/digest; the result records actual values while omitting only personal
  identifiers and absolute user paths. A profile change starts a non-comparable set.
  Fixture construction, setup, `npx` download/installation, process start, and the automatic
  initial Repository scan are outside the timers. Each fresh process waits for that automatic
  scan to reach a terminal state, then the browser dispatches exactly one explicit Repository
  rescan and both timers start. Its admission response supplies the opaque `scanRequestId`.
  Within 1 second, a status carrying that same ID must visibly and accessibly say queued, name an active scan phase, or
  report complete/`partial` (contracted-partial only)/failed; a failure includes a practical next step. A generic spinner,
  loading label, unchanged control, acknowledgement without scan state, or prior-request
  status does not qualify. The complete operable inventory from the generation committed by
  that same request must render within 10 seconds; an earlier status, snapshot, or automatic-
  scan generation never qualifies. The result records the request ID and committed generation.
  After the inventory becomes operable in each run, perform one
  standardized filter action and one standardized item-selection action, timing each from
  browser input dispatch until the corresponding filtered results or selected-state feedback
  is visibly rendered and operable. At least 9 runs must individually meet both scan
  thresholds and keep both interactions below 100 milliseconds. Each run uses a new Inspector
  process without application-memory or prior-snapshot reuse. The operating
  system filesystem cache follows its natural evolving state and is not deliberately
  cleared. The result is specific to its published profile rather than a portable guarantee.
- **SC-006** uses the same 20 participants after SC-001, regardless of their earlier result,
  starting from the same prepared Inspector state with the same designated file open. Its
  timer starts when that state is ready and the standardized prompt is presented. A
  standardized response form requires source, recognizing tools, file type, and
  certain-versus-conditional effective behavior; success requires all four fields within
  2 minutes and an exact match to predefined ground truth. At least 18 must succeed using
  only the provided product guidance under the SC-001 moderator policy. Moderators record
  objective workflow outcomes and predefined safety events. Study equipment runs the SC-004
  product network/URL/MCP instrumentation, an exact-authority Inspector-server request ledger,
  and study-browser request capture continuously from Inspector launch before SC-001 through
  all four workflow observations. The prepared state selects fixed profile
  `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`: Playwright 1.61.1 Chromium on
  Ubuntu 24.04 x64/Node.js 24.18.0, headed, with a fresh nonpersistent context, no
  extensions, a browser-context-only proxy, and `single-407-basic`. Proxy and server project
  Chromium-controlled Fetch Metadata plus exact Origin/Referer independently and discard raw
  inputs. Metadata is consistency only; participant additionally requires an armed supervisor-
  owned navigation grant and exact authorized-static target. Exact authorized participant/bundled-SPA
  requests alone forward. Extension, missing-secret other-host, and invalid-secret unknown
  rows are unrelated with N/A IDs; a remaining valid-secret unknown row instead receives the
  open binding IDs and is product-attributable/prohibited. Observable OS-mediated mounted/
  mapped-source traffic is separately recorded as the FR-022 limitation. Every unintended execution,
  inspected-source mutation, prohibited direct product-issued outbound request or MCP
  connection as defined by FR-022, request outside its two exact authorized internal loopback
  classes, or disclosure of inspected content to another machine is automatically critical.
  Those closed classes are neither outbound nor MCP and are not this event.
  Recorded OS-mediated traffic for a pre-mounted/mapped source remains the FR-022 limitation,
  not this automatic connection event. An ACKed correlation is only an eligible failure link:
  success stays all N/A while its automatic issue is counted separately; candidate-bearing
  failure requires the exact same-context `automatic-critical` link without review; and only
  candidate-free failure receives two isolated hidden one-use classifications. Two `product-caused-blocker` votes produce
  `reviewer-confirmed-critical`, two `not-product-caused-blocker` votes produce
  `reviewer-cleared`, and one of each produces `reviewer-disagreement-critical`. The published
  governance plan names the reviewer roster and a separate access-controlled administrative
  record audits one unique human pair per case until consent-policy destruction; identity,
  assignment, notes, communication, human/process/case-assignment reuse, and a third reviewer remain forbidden from
  runtime collectors, repository inputs, capture, and evidence. Only
  `reviewer-confirmed-critical` or `reviewer-disagreement-critical` uses `workflow-blocker`.
  The acceptable tagged, de-duplicated union of `automatic:<correlationId>` and
  `reviewer:<subjectId>:<workflowClass>` is empty, and an automatic-linked workflow row is never
  counted again.
  At capture start the supervisor therefore creates exactly twenty fresh, unique, cryptographically random, run-local
  unlinkable participant tokens, each made from exactly 32 random bytes (256 bits) and encoded
  as exactly 43 unpadded base64url characters. `subjectId` is the sole allowed pseudonymous
  human evidence and has no identity, distribution, response, or retained external mapping. The
  supervisor keeps their order only for the run and sends only the next token in an attempt
  binding; the scheduling harness neither creates nor selects tokens.
  Participant observations use one token and other observations use literal `not-applicable`.
  The study-browser stream alone records one
  terminal success/failure for each token crossed with discovery, inspection, comparison, and
  Global consent—exactly 80 outcomes—so the 19/20 and 18/20 equations and the same-cohort rule
  are mechanically checkable. Arbitrary nonterminal/request messages remain allowed. Exact-80
  cardinality/canonicality is independent of the success thresholds: 80 valid terminal records
  permit verification, stop, finalize, witness, and seal even if discovery or inspection misses
  its target. A miss blocks the release criterion but neither invalidates evidence nor becomes
  automatic critical; protocol, cardinality, authentication, or privacy violations fail closed
  separately.
  Capture start is run-level only: the existing materialization-created supervisor launches the
  harness, moderator, and three adapters; each adapter launches its watchdog, yielding exactly
  eight internal long-lived descendants/processes with watchdogs as adapter children. Participants 1–19 sequentially complete all four workflows
  and close; participant 20 completes discovery before checkpoint and, unless terminalized,
  remains the sole open attempt for the remaining three workflows in continuation. If already
  terminalized, a post-anchor heartbeat supplies continuation progress. All attempt-local
  profile/marker/bootstrap work happens after streams are live and immediately before that
  attempt's `npx` and first capturable request.
  The study harness owns attempt scheduling and the scoring moderator owns call-local raw
  response/rubric input. The runtime-only `StudyCurrentSubjectScoringContext` adds
  `automaticIssueCorrelationId` and `terminalizationClass`. No context exists during launch/
  bootstrap/buffering. Process binding and ordered release precede both open-binding ACKs;
  discovery-context ACK then precedes readiness, grant/navigation, and task. Buffered events use
  workflow/process/link N/A and cannot link later. Only N/A→the first exact same-context
  candidate after supervisor validation and current-workflow tagging before canonical safe-payload
  serialization, followed by applicable downstream adapter/watchdog ACKs make it accepted, and
  none→mapped cause, are permitted one-way updates. The supervisor owns the safe current-workflow
  mirror, serializes a source that cannot self-assert workflow exactly once with the tag, waits for
  those ACKs, counts it accepted, then sends an ACKed updated `scoring-context` to the moderator
  before release/outcome. Accepted retained observations are immutable: later workflow-tag mutation
  or backfill is forbidden, and pre-ready/context-free N/A stays permanent. That value is an eligible failure-link candidate,
  not an outcome decision; accepted automatic issues remain separately counted. Destroy each
  accepted outcome's context and ACK the next before its prompt/timer/task. The exact-once
  `StudyWorkflowOutcomeSubmission` adds `automaticIssueCorrelationId` before the review
  fields. Success stays all N/A even with a candidate. Failure with a candidate requires the
  exact ACKed same-context `automatic-critical` link and no review; only candidate-free failure
  is reviewed. Before each attempt, distinct human pairs are assigned per
  subject/workflow from the published reviewer roster; a separate governed access-controlled
  administrative record outside repository/work-root/candidate/runtime/capture/evidence state
  audits each unique pair and is destroyed under the consent policy without affecting scoring.
  They directly observe the same live attempt, including terminal events, without
  recording/IPC or reuse of a human, collector process/component-run identity, or case assignment.
  Literal reviewer slots and sanitized terminal surfaces may be drained, reset, and freshly
  remapped for a later case. After failure only, the moderator sends byte-identical
  `StudySafetyReviewCase` payloads to two fresh isolated one-use vote collectors. Only after each
  case is fully displayed are its slot-isolated inputs enabled; each collector reads exactly one
  LF-terminated ASCII `product-caused-blocker | not-product-caused-blocker` enum with no echo,
  history, recording, logging, or cross-slot output, wipes it call-locally, and the first vote stays
  hidden from reviewer two. Two non-
  product votes yield `reviewer-cleared`, two product votes
  `reviewer-confirmed-critical`, and a split `reviewer-disagreement-critical`. Both collectors
  exit before acceptance. Moderator→supervisor→browser-adapter→watchdog is the sole outcome path.
  On the supervisor→browser-adapter edge, `safe-payload` is nonworkflow-browser-only and cannot
  carry/bypass an outcome. The supervisor alone tags/constructs it; the adapter validates the
  stored candidate and returns semantic ACK only after watchdog ACK. Browser-only release waits for that ACK, and joined-pair
  release waits for both browser/server safe ACKs.
  Raw scoring or reviewer material never crosses IPC or enters retention, hashing, logs, or
  output. The authorized materialize caller supplies four pairwise-distinct bidirectional
  nonrecording/no-echo/no-history external terminal-equipment handles—fd6 participant, fd7
  moderator, fd8 reviewer one, fd9 reviewer two—and the materializer verifies their stable identity,
  distinctness, and properties before supervisor launch. They are not internal evidence IPC. The
  supervisor retains fd6, passes fd7–9 to the moderator, and closes its copies. For each normally
  completed open context, fd7 carries exactly one compact canonical UTF-8 `StudyModeratorInput`
  JSON frame plus exactly one LF, root order `schemaVersion`, `studyRunId`, `subjectId`,
  `inspectorProcessId`, `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`; timing is a
  canonical nonnegative decimal string and the other three raw values are canonical JSON strings.
  EOF, parse/extra/trailing input, replay, or cross-context routing fails; input is enabled only for
  that context and wiped after use/abort. Terminalization-synthesized remaining workflows accept
  zero records and reject late input without fabricated empty response/timing. Negative tests vary every field, review branch, both process-ID branches, and exact-
  once submission.
  During the exact readiness transition for each successfully launched participant Inspector
  process, before returning the response, the supervisor assigns one fresh opaque
  `inspectorProcessId` made from exactly 32 cryptographically
  random bytes (256 bits) and encoded as exactly 43 unpadded base64url
  characters, distinct from OS PIDs, subject IDs, and watchdog/capture identifiers. It is
  non-human launch correlation only, never pseudonymous human evidence. The same ID propagates across the
  request, effect, and workflow records for that launch and is never reused for another launch;
  a failure before launch/readiness uses literal `not-applicable` for the process ID.
  Terminalization preserves accepted rows and creates mapped-class contexts, one terminal
  failure, and required reviews only for missing workflows in fixed order. This safely binds
  all twenty attempts to their observed product processes without retaining a real process ID.

The 20-person study is initial-release evidence because automation and project-familiar
contributors cannot establish first-use discoverability or interpretation without project
context; its fixed denominator is not a population-level statistical claim. The maintainer
  team publishes a bilingual plan naming the accountable study owner, recruitment and
  compensation-funding owner, moderation staff and required reviewer roster, schedule/support contact, consent/privacy
and anonymized-retention process, supplied repository/equipment/session support, and
  accessibility accommodations. A separately governed access-controlled assignment record outside
  the repository bundle, work root, candidate, runtime IPC, capture, and evidence audits one
  unique human pair per case and is destroyed under that consent-retention process; it cannot
  affect scoring bytes. Ordinary contributors do not recruit, fund, moderate, or
review participants. Missing study resources block the release claim, not review of an
otherwise conforming contribution; material workflow/guidance/fixture/rubric changes trigger
the next study. During kit authoring, maintainers materialize and contract-test the exact
repository-owned member set under `tests/usability/sc001-sc006-study-inputs/`, its candidate-
independent versioned manifest, and companion. The manifest adds exact `bundleRoot` between
`manifestVersion` and `inputs`; entries retain fixed `inputId`/`role`/`path`/`sha256` order,
raw-UTF-16 input-ID sorting, all-role nonzero coverage, unique paths below the root, separate
bilingual IDs, raw-byte digests, and the exact Node.js pretty-JSON serializer. The recursive
regular-file set must equal both the contract member set and manifest path set. Links, aliases,
non-regular or identity-unverifiable objects, path escape, distribution drift, and any extra
local/remote/printed/ad hoc input fail. Only the repository-owned builder may create a
distribution, and the independent verifier must accept it. Immediately before SC-001, the
verifier re-enumerates the source bundle and all twenty actual distributions without rewriting
them, reading candidate authority or bytes, calling `stat` on the candidate, hashing it, or
freezing it; a successful inputs phase freezes
only the verified canonical study-input-manifest digest and exact-set state. After the candidate
exists, `capture -- start` is the first phase that reads its authority, reopens/stats/hashes it,
freezes its identity and SHA-256 before capture, and binds them to that manifest digest. Any candidate byte or bundle-member
change invalidates both criteria and requires the complete paired protocol unless the final
candidate/manifest pair exactly matches valid evidence.

The paired evaluation-fixture JSON files are deterministic virtual file-tree descriptors that
fix every derived repository path, encoding, exact byte representation, and digest. A separate
repository-owned builder materializes exactly twenty fresh repositories; the independent
verifier recomputes every derived set/byte. Both descriptors bind the builder, verifier, and
capture-controller script paths and digests, while the focused contract, integration, and
security suite results are release evidence, so generated fixture bytes do not create an
unmanifested-input escape. Each distribution root is closed to exact direct-child directories
`study-inputs/` and `repository/`: the first holds byte-identical copies of the sixteen source
members, the second holds the complete descriptor output tree, and no other top-level member,
sidecar, collision, alias/reused identity, or escape is accepted. Candidate and
equipment/runtime bindings remain outside that root.

The three public builder, capture, and verifier harnesses are each one self-contained source
file whose source may contain only literal static imports of `node:` built-ins. Local/package
imports or helpers, dynamic `import()`, `require`, `createRequire`, `eval`, `Function`, `vm`,
`process.dlopen`, another loader hook, and alternate worker/child entries are forbidden, so each descriptor digest covers the complete executable
implementation. The builder may execute only the digest-verified capture file in materialize's
internal supervisor mode; that file may re-execute only itself in exact `supervisor`,
`study-harness`, `scoring-moderator`, `reviewer-one`, `reviewer-two`, three named adapter,
and three named watchdog modes. The product probe is a distinct import mode. Every child is
gated by authenticated inherited parent IPC and a fresh one-use bootstrap nonce.

**Inherited-capture IPC decision**: Each parent/child edge uses two unidirectional anonymous
inherited pipes, parent-to-child and child-to-parent, not environment, argv, or files. After
child verification, the parent-to-child pipe starts with an exact 96-byte bootstrap prefix
containing a fresh seed, nonce, and `channelId`, then remains open and carries LF-framed parent-
to-child messages on that same pipe; no bootstrap EOF is sent. EOF before byte 96 fails, and all
post-prefix bytes enter canonical frame parsing. The child-to-parent pipe first sends the
authenticated one-use `ready` frame at sequence 0. A verified child derives direction-separated
keys with domain-separated HMAC. Each LF-terminated canonical frame has exact root order
`schemaVersion`, `channelId`, `sequence`, `direction`, `senderRole`, `receiverRole`,
`messageType`, `authenticationTag`, `payload`. Authentication reconstructs compact
canonical JSON with a null tag and no LF; only the populated transmitted frame appends LF. It
compares in constant time. Both directions start at sequence 0 and
increment by one; the role/message matrix and one-use ready transition are closed. Every parse,
authentication, sequence, role, pipe, child, abort, crash, or exit failure wipes material and
fails closed without a new control command. This was selected because it binds the verified
child and direction before accepting payloads without exposing bootstrap authority through
ambient process configuration. Environment/argv/file bootstrap was rejected because it creates
observable and inheritable residue; a shared bidirectional pipe was rejected because it weakens
direction and close-state reasoning.

The materializer edge adds exactly one post-ready authenticated `runtime-bootstrap` carrying
`StudySupervisorRuntimeBootstrap` root `schemaVersion`, `workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`. The supervisor
validates root, binds endpoint, loads token, ACKs, and wipes the frame before any root mutation;
then authenticated lifecycle close/ACK detaches the materializer edge while the supervisor stays
live. Failure aborts it. Those authorities never use child env/argv and exist only in that frame,
supervisor memory, and later authenticated control.

Process provenance uses exact `process-lifecycle-attestation`/
`StudyProcessLifecycleAttestation` root `schemaVersion`, `processRole`, `streamRole`,
`componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`, with event
`registered | exited`. Adapter self-registration is not exit observation. Direct parents OS-observe
before forwarding/creating reports: adapters forward matching watchdog registration and report its
directly observed clean exit, moderator reports ready reviewer registration and directly observed
clean exit, and supervisor directly observes adapters/harness/moderator. Reverse ACK is only for the immediately
preceding attestation on the applicable supervisor/moderator, supervisor/adapter, and adapter/
watchdog edges. Supervisor ACK of adapter registration precedes writer-binding relay; watchdog
registration receives adapter and supervisor ACK before start, reviewer-exit ACK
precedes outcome, watchdog-exit ACK precedes adapter exit. Start waits for six registrations;
stop combines three watchdog attestations with direct adapter/orchestrator exits; reviewer count
uses moderator-observed attested distinct clean exits. Nonclean `lifecycle: child-exit` invalidates
and contributes no witness fact.

Stream phase transport uses exact `StudyStreamControl` root `schemaVersion`, `controlSessionId`,
`studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`, with
immutable bindings repeated and command `start | checkpoint | anchor-handoff | stop`; exact
`StudyStreamControlResult` root is `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`,
`command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`. Byte-identical
`stream-control` goes supervisor→adapter→watchdog and the semantic result returns as
`stream-control-result` in reverse; all three
results gate each phase. Start result follows capture-start plus first heartbeat and uses N/A
`checkpointRequestId`. The supervisor creates/validates each stream and passes one dedicated
append-only handle only through exact spawn inheritance as fd5. A path-free runtime-only
`StudyStreamWriterRuntimeBinding` binds expected adapter component/instance/process identities to
fd5 stable handle identity, `nlink`, and append mode. After supervisor ACK of adapter registration,
the adapter relays binding/handle and gets binding ACK; the watchdog independently validates,
registers, and gets adapter plus supervisor ACK. All three writer barriers/all six registrations
precede proxy-binding ACK, which precedes stream start. The handle occupies the contract-fixed
child-visible writer slot beside the two fixed IPC slots. The slot is absent for nonstream roles and
is not a third pipe. Adapter only transfers/closes after watchdog registration; supervisor closes
after complete downstream ACK; extra/duplicate copies are forbidden and watchdog becomes sole
holder/writer. Stop is result→handle close→exit, and every failure closes all copies and invalidates.

The executable protocol uses a phase matrix. `INSPECTOR_STUDY_WORK_ROOT`, external
`INSPECTOR_STUDY_CONTROL_ENDPOINT`, and a fresh per-run `INSPECTOR_STUDY_CONTROL_TOKEN` made from
exactly 32 cryptographically random bytes (256 bits) and encoded as exactly 43 unpadded
base64url characters are required from materialize through finalize. Materialize and
input verification ignore and do not require `INSPECTOR_STUDY_CANDIDATE_TARBALL`; start first
requires it and every later client resends it through finalize. The candidate may preexist—the
materializer creates distributions, not that file. At materialization, authorized setup fixes an
identity-pinned `npx` on sanitized equipment PATH plus one reserved initially empty candidate-
launch store-bin slot outside work root/distributions; materializer/inputs does not read it. After
successful input verification and before start, setup alone provisions that same known slot from
the candidate tarball plus frozen production graph into a fresh network-disabled/scripts-disabled
store and digest-binds it. Start revalidates the inherited slot and resolves only its sole audited
bin through pinned `npx --no-install`; raw tarball path never enters child env/argv, and no new
environment/control field exists. Distribution mutation and cache/network/install/alternate-PATH/
global/fallback resolution are forbidden. Abort/stop/finalize destroy this runtime/evidence-external
store and gate completion on verified absence. The work root is one stable absolute empty
ordinary-local workspace supplied by study setup, explicit platform network spellings fail
before I/O, and indistinguishable pre-mounted/mapped filesystems remain the FR-022 limitation.

A fourth runtime-only input, `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY`, is required only from
start through stop and has exact `127.0.0.1:<port>` form. Materialize, input verification, and
finalize do not read it; pre-stop checkpoint and continuation require it. Study setup configures it as the
fresh browser context's proxy only, never a browser-wide or system proxy, and the study-browser
adapter binds the exact listener. Participant candidates use their supervisor-owned grant
correlation; only other browser traffic receives a proxy-generated fresh opaque correlation.
Another local client remains unrelated and is
not product-attributed without actor/process correlation. Authority and proxy configuration do
not enter evidence, hashing, logs, diagnostics, or output. The exact raw route is authorized
start-through-stop caller transient input → authenticated runtime-control `StudyLiveBinding` →
supervisor dedicated memory → one-use `browser-proxy-binding` → adapter dedicated memory →
attempt-local DevTools control request/browser context. Caller/control/frame/request buffers wipe
after ACK. Only after all six registrations and writer-binding barriers are supervisor-ACKed does
the already-ready/registered adapter receive exact
`StudyBrowserProxyRuntimeBinding` root `schemaVersion`, `studyRunId`, `browserProxyAuthority`,
validates/binds/ACKs; before that ACK, `stream-control:start`, capture-start, and start completion are
forbidden. Supervisor/adapter dedicated memory and the live context are the only post-ACK holders
through stop/failure cleanup; checkpoint/continuation require equality and stop closes/wipes it. No
child env/argv or evidence carries it.

The endpoint is transient and outside the work root and distributions. On POSIX it is an
absolute Unix-domain-socket pathname. On Windows it is exactly
`\\.\pipe\agent-customization-inspector-study-` followed by 32 lowercase hexadecimal
characters. TCP, UDP, DNS, every network transport, remote/network named-pipe spelling, and
work-root sidecars are rejected. The
materializer starts the sole digest-verified capture file as an internal supervisor, completes the
post-ready one-use runtime bootstrap before root mutation, then detaches its edge while the
supervisor remains live. At start that existing supervisor spawns the long-lived harness,
moderator, and adapters; adapters spawn watchdogs, while the moderator alone
spawns two ephemeral reviewer collectors after each reviewed failure. A token-authenticated
hello/challenge protocol keeps it alive to finalize. Only authenticated
runtime-control messages whose authentication tag covers the exact canonical payload are
accepted. A transient non-retained HMAC of runtime-control path values is allowed only for
channel integrity; evidence commitments/hashes remain path-free. Initial work-root authority uses
only exact runtime bootstrap; later authenticated runtime-control IPC and supervisor memory carry work-root/candidate lexical and canonical
authority values, allowing every later client to resend the values and independently stat/hash
the candidate. Apart from the exact transient control-message HMAC, capture-evidence IPC, raw
commitment input, retained artifacts, logs, and output never carry a path, the HMAC key, or the
token. The supervisor remembers initial work-root
identity, start candidate identity/digest, checkpoint positions, the original handoff anchor,
three direct adapter exits, three adapter-observed authenticated watchdog exit attestations, two
direct orchestrator exits, and moderator-observed attested distinct-clean reviewer exit count. Path-free HMAC commitments plus one
`controlSessionId` bind start, handoff, continuity witness, and seal; all authority values and
secrets are destroyed during finalize.

Canonical control requests/responses retain `requestId` and closed response `errorCode`, never
the raw token. The materialized supervisor generates one fresh run-scoped `controlSessionId` and
keeps it stable through finalize. Hello starts with null session/challenge/tag/payload, returns
that stable session ID, and creates only a fresh one-use HMAC-authenticated `challengeId`; later
direction-separated HMACs cover complete canonical messages with a null tag and use each
challenge/request ID once. The closed commands are `hello |
verify-inputs | start | checkpoint | read-checkpoint | anchor-handoff |
verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`. Finalize-prepare performs
the supervisor's internal current-binding, continuity, and exit checks, prepares complete witness
material while the endpoint remains live, and returns literal `null`; the continuity key never
leaves supervisor memory. A separately authenticated finalize-commit connection then causes the
supervisor to begin listener teardown and return the exact `StudyContinuityWitness` over that
already-open connection before key destruction and exit. The verifier requires the complete
response followed by EOF and reconnection failure, then writes and re-reads the witness pair
followed by the seal pair.

The workspace closes retained state to twenty named distributions, three alternating
envelope/safe-payload ledgers, the verifier-only canonical handoff/digest pair, and, after
successful finalize, exact `capture/study-continuity-witness.json`/`.sha256` and
`capture/study-capture-seal.json`/`.sha256` pairs. No other sidecar is retained. Each writer
atomically snapshots an immutable checkpoint prefix then immediately resumes heartbeat/event
appends. After the verifier writes that handoff, it sends the run/request/digest through the
supervisor and each watchdog appends exactly one matching `handoff-anchor` record after its
checkpoint and before stop while normal append/heartbeat scheduling continues without pause.
An ordinary post-prefix pair already queued at checkpoint may precede the anchor. Continuation
validates every intervening pair, the sole matching anchor, and at least one later ordinary heartbeat or
payload on that uninterrupted chain. Stops and
seal bind the same digest and literal-one counts, so replacing both handoff files with another
internally valid prefix fails even when later links are recomputed.

The evidence design uses exactly three roles, each with a distinct capture adapter and a
distinct watchdog that is the sole envelope writer. An adapter inspects raw traffic only in
memory, derives a closed safe event, discards all raw values before IPC, and never hashes or
retains raw header names, framing, wire or encoded representations, or any noncanonical derivative,
bodies, content/metadata, participant responses, paths, URLs/authority values, capabilities,
environment values, or raw errors. The sole header-derived exception is the strictly validated
decoded canonical safe ID retained as `correlationId` in the canonical payload and its digest
chain; captured wire/browser/Inspector bytes are not hash preimages. One IPC message carries exactly one safe
payload, but one primary-workflow observation may produce any number of counted/chained event
messages. Only fixed codes, protocol-owner-generated opaque
IDs, booleans/enums, safe integers, and evidence digests enter canonical safe-payload bytes.
Each request additionally uses the exact privacy-safe route/target classifier `targetClass`:
`static-manifested-asset | static-spa-shell | static-client-route-fallback | api-get-session |
api-get-session-liveness | api-get-file | api-post-repository-rescan |
api-get-global-consent-preview | api-post-global-consent-preview | api-post-global-enable |
api-post-global-rescan | api-post-global-disable | other-loopback | remote | mcp |
unclassifiable | not-applicable`. A closed truth table allows only the authorized-static and declared-API combinations across authority,
target, route, method, capability, origin, same-host, attribution, request class, and prohibited
status. Every row has `eventCode: observation`, not-applicable workflow class, observed outcome class,
correlation-context subject/process IDs, and fresh event/correlation IDs. The exact authorized
static/API table rows alone use effect `none` and prohibited false. A product-attributable
exact-issued request outside the tables uses a request observation, participant/bundled-SPA/
Inspector actor as applicable,
exact-issued authority, prohibited request class, observed closed target/method/capability/origin,
unauthorized-request, and true same-host/attribution/prohibited. Other-loopback uses
other-loopback authority/target, prohibited request class, observed closed method,
not-applicable capability/origin, unauthorized-request, and the same three true booleans. Remote
uses remote authority/target, prohibited request class, observed closed method, not-applicable
capability/origin, prohibited-outbound-request, false same-host, and true
attribution/prohibited. A fully unclassifiable product-correlated request uses unknown actor and
unclassifiable authority/request/target/method/capability/origin, unauthorized-request, false
same-host, and true attribution/prohibited. MCP uses an MCP observation, Inspector actor, target
`mcp`, not-applicable authority/request/method/capability/origin, mcp-connection, false same-host,
and true attribution/prohibited. For browser traffic, proxy and server independently project
exact Chromium-controlled `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, and
`Sec-Fetch-User` plus Origin/Referer, discard the raw signals, and require the same projection.
Fetch Metadata is not human attestation. After product readiness and immediately before initial
navigation, the supervisor creates an armed runtime-only `StudyParticipantNavigationGrant`
with run, attempt, fresh correlation, and state:

| Secret/projection | Actor/binding | Decision |
|---|---|---|
| Valid; navigate/document/`?1`; missing Origin; site none/same-origin; exact authorized-static; current armed grant | `participant`; open binding | Adapter reserves without state change; supervisor validates/stores pending while canonical grant stays armed; sole one-use `candidate-forward` accepts and atomically consumes canonical grant; adapter validates it before copy consume/forward. |
| Valid; not participant; missing user; exact-issued Origin or missing Origin plus exact-issued Referer | `bundled-spa`; open binding | Forward only exact authorized static/API; all other requests are product-attributable/prohibited and blocked. |
| Valid; extension Origin | `browser-extension`; N/A IDs | Always unrelated and blocked. |
| Remaining valid projection | `unknown`; open binding | Product-attributable/prohibited; blocked. |
| Missing after bootstrap | `other-host-process`; N/A IDs | Unrelated; blocked. |
| Invalid, duplicate, malformed, noncanonical, unknown, stale, or mismatched | `unknown`; N/A IDs | Unrelated; blocked. |

A fresh participant-shaped HTTP request without the exact armed grant, including nonexact target,
post-consumption request, or user-activated page-script navigation, is open-binding `unknown` with
a fresh proxy correlation, product-attributable/prohibited and blocked without consuming or
invalidating the grant. The browser cannot see the grant before proxy injection. The adapter
reserves without state change; the supervisor validates grant/correlation/attempt/candidate and
stores pending while the canonical grant remains armed, then sends sole exact one-use
`browser-broker-decision: candidate-forward`. No separate candidate ACK exists. That decision
alone accepts the candidate and atomically consumes the canonical grant; only after validating the
matching decision may the adapter consume its copy and forward. Duplicate/replayed/stale
authenticated candidate/grant IPC, simultaneous second consumption, or skipped/mismatched
decision/ACK forwards nothing and invalidates the run; close destroys the grant.

Only forwarded exact authorized participant/bundled-SPA traffic produces a browser/server join
and claim. Every blocked row is browser-only; no extension/other-host/unknown N/A-claim branch
exists. Direct Inspector exact-issued requests use product+server; nonexact Inspector requests,
OS/effects, and MCP use product only; workflow outcomes use browser only. Field-by-field tests
reject every changed projection, binding, role, or boolean. Study-browser capture is
the capture script's Node-built-in-only deny-by-default local HTTP/CONNECT proxy rather than
Playwright/unbound instrumentation. It forwards only an exact authorized loopback request. It
classifies `other-loopback`, `remote`, and `unclassifiable` targets and every CONNECT request as
prohibited, blocks them before DNS lookup, socket connection, request-body forwarding, or
response-content exposure, and never establishes a CONNECT tunnel. A participant candidate uses
its supervisor-owned grant's fresh correlation; only other browser events receive a fresh
32-byte/43-character unpadded-base64url `X-Inspector-Study-Correlation` from the adapter/proxy. The browser proxy removes/replaces an existing value and the
Inspector probe assigns it. The non-capability is never auth/routing input. Server
instrumentation rejects duplicate/invalid grammar and sends only the same safe ID to its
ledger; adapters discard the header/raw fields before IPC. The raw header name, framing, wire,
encoded value, and noncanonical derivative are never retained, hashed, or logged; after strict grammar/canonical validation,
only the decoded canonical safe-ID value may be retained as `correlationId`. Other local clients
stay unrelated without actor/process correlation. Required roles agree on
safe classifications, `subjectId`, and `inspectorProcessId`; missing, duplicate, malformed,
reused, or mismatched propagation fails the gate.

The evidence contract/data model own exact schemas for `StudyBrowserAttemptBinding`,
`StudyBrowserRequestCandidate`, `StudyServerCorrelationClaim`,
`StudyParticipantNavigationGrant`, and `StudyBrowserBrokerDecision`. The supervisor/broker
creates each attempt/binding, sends byte-identical prepared/open/closed snapshots to harness and
browser adapter, and requires both ACKs. Open ACKs precede readiness/grants/candidates;
ordered pre-readiness release and discovery-context ACK also precede readiness;
terminalization-decision moves both copies to terminalizing. The adapter destroys browser/grant/
marker/reservation/candidate/pending state but retains its terminalizing binding through closed
ACK; the harness retains its terminalizing binding and fixed remaining schedule through synthesis.
Closed dual ACK then precedes canonical destruction/next attempt. The exact state is
`prepared | open | terminalizing | closed`.

The supervisor is the sole participant-launch controller/direct OS child observer and sole
product-exit source, including pre-bootstrap exit; the harness only schedules and binds. On probe
close, serialized child state yields product-exit when already exited, premature-probe-close while
live, and no terminalization after normal four-outcome/zero-pending close. The browser adapter is
the sole attempt-bound equipment observer: browser exit means actual browser process/context exit,
while equipment failure means an external browser/OS/environment bootstrap failure with healthy
controller/proxy/auth. Adapter/proxy/controller/CDP/auth/marker/IPC/implementation/child-management
fault invalidates rather than synthesizes. First
valid cause wins and later causes are rejected; premature probe close maps to scoring
`equipment-failure`. Terminalization freezes accepted rows/joins; the supervisor opens/mirrors/
routes only missing contexts and the moderator constructs their failures/reviews/outcomes in fixed
order, while the harness retains schedule/orchestration only. Evidence-role failure invalidates the
run and synthesizes nothing. Byte-identical terminalization decisions go to harness and adapter;
the adapter clears the listed browser-local state, retains its terminalizing binding until closed
ACK, and stays alive; the harness retains binding/schedule until closed dual ACK. Browser broker decisions go only
supervisor→adapter, with exact decision enum
`candidate-forward | browser-only-released | joined-pair-released`. Attempt IDs remain only in
supervisor/broker/harness/adapter memory, frames, grants, and candidates—not the actual browser,
requests, application, evidence, or logs.
Valid-marker bound browser-only decisions use the open attempt ID; only missing/invalid-marker
unrelated branches use N/A. A pre-readiness terminal submission, review case, and both votes repeat
the same N/A process ID.

**Browser-profile and marker decision**: Actual capture uses the prepared-state-selected fixed
profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`: Playwright 1.61.1
`chromium` revision `1228`, browserVersion `149.0.7827.55`, title `Chrome for Testing`, Ubuntu
24.04 x64, Node.js 24.18.0, headed, a fresh nonpersistent context, no extensions, a
browser-context-only proxy, and `single-407-basic`. The browser adapter directly spawns and
OS-observes the digest/identity-verified pinned Chromium through a fixed anonymous
`--remote-debugging-pipe`, browser-equipment control outside internal evidence IPC. Pinned DevTools
uses `Target.createBrowserContext` with exact proxy, `disposeOnDetach: true`, empty bypass;
`Fetch.enable(handleAuthRequests: true)`; exactly one `Fetch.continueWithAuth` ProvideCredentials
for the `study`/marker challenge; and exact 407→retry→204 verification. The supervisor creates a separate fresh
`browserProxyMarkerSecret` and sends install directly to the adapter. It remains prepared until
the actual-browser bootstrap succeeds and ACKs, then both sides activate atomically; failure
destroys it without activation. After run streams start and immediately before that attempt's
`npx`/first capturable request, the context requests exact proxy-local URI
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`, receives one bodyless 407 whose
only headers are `Proxy-Authenticate: Basic realm="inspector-study"` and
`Connection: close`, performs one canonical Basic retry, and receives bodyless 204 with sole
`Connection: close` header. The
exchange performs no DNS/connect, application, correlation, candidate, forwarding, or evidence
effect. During capture every study request has exactly one canonical Basic marker.

The marker authenticates only transport. Its validity never determines actor, product
attribution, or forwarding. Raw secrets exist only in adapter attempt-local control/auth request
buffers, never browser environment/argv/profile/history/log/evidence. The secret, raw Basic, encoded/noncanonical derivative, and proxy
configuration never enter hashes/evidence, logs/output, files, environment, argv, persistent
profile/history/cache/keychain or other credential stores, or application requests; the sole
preimage exception is transient marker-install frame authentication. Marker-install and DevTools
request buffers wipe after ACK; normal completion, abort, crash, terminalization, controller
failure, and child exit dispose context/process and wipe all marker material. Adapter crash or
DevTools EOF must leave no orphan: after adapter exit, the supervisor blocks next attempt/finalize
until every browser-equipment descendant/context terminates and fresh profile cleanup is verified;
the pinned build's pipe-disconnect contract invokes `CloseBrowserSoon` and integration verifies
that path. Any additional platform containment belongs to study equipment/setup, not a synthetic
internal Node.js-built-in-only capture role;
runtime OS observer data is not evidence. Actual-browser tests inspect isolated HOME/XDG, profile/history/
cache, and credential stores after each path and require zero marker, encoded Basic, or
`browserAttemptId` residue.

This fixed profile was selected because it makes browser-controlled Fetch Metadata and proxy
challenge behavior reproducible while keeping the context disposable and extension-free.
Marker-only actor attribution was rejected because any process using the marked context could
present the same transport credential. A system-wide or browser-wide proxy was rejected because
it would capture unrelated host traffic and persist configuration outside the study context.
Using `browserAttemptId` as the password was rejected because it would expose the binding ID to
browser state and collapse two independently scoped authorities.

For an exact authorized participant/bundled-SPA request, the adapter reserves without state change;
the supervisor validates/stores one complete candidate pending while the canonical grant remains
armed, then sole authenticated `browser-broker-decision: candidate-forward` accepts/atomically
consumes canonical grant. The adapter validates it before copy consume/forward; no separate
candidate ACK exists. The probe strips correlation,
constructs the only permitted claim, and receives broker acknowledgement before application
handling. The `submit-product-event` outer root is only `inspectorProcessId`, `destinationRole`,
`payload`, and its process equals the registered probe. Claim payload subject/process IDs must
equal the open binding and that outer process. The broker validates one candidate plus one claim, obtains both browser/server safe-
payload ACKs, releases the two records through `joined-pair-released`, and only then acknowledges
completion; mismatch emits zero records. There is no claim for any blocked or
unrelated row.

**Join decision**: The broker is lifecycle-bound and timer-free. It fails only when the HTTP
transaction/request ends, aborts, errors, or closes; relevant inherited IPC, probe, attempt, or
binding closes; capture stops; or the verified child exits. Duplicate, replay, mismatch,
unexpected role/order, second join, residue, or late input also fails closed, wipes pending
state, emits no partial record, and rejects later input. Lifecycle-order/race tests cover these
interleavings without deadlines. A claim timeout was rejected because scheduler latency is not
evidence of a protocol failure and a time threshold creates a nondeterministic partial-pair race;
transaction and process lifecycle already provide exhaustive terminal conditions.

For each subject, the supervisor enables fd6 for exactly one LF-terminated ASCII
`npx --no-install agent-customization-inspector --no-open` line, rejects/wipes other or extra input,
uses no shell, and directly spawns/OS-observes the sanitized-PATH sole audited candidate-bound bin
in that verified distribution's `repository/` cwd. Child environment is limited to the bound
`NODE_OPTIONS` probe, control endpoint/token, and minimum safe run/subject IDs; candidate/proxy
authority never enters terminal/env/argv. This fresh participant process/context is external
ephemeral equipment outside the eight internal long-lived descendants. After each attempt the
supervisor closes it and drains/resets/clears fd6 so no prior input/output/history crosses attempts.
For product instrumentation, study setup injects only the digest/identity-bound capture script
itself as exact `NODE_OPTIONS=--import=<bound-capture-script-file-url>` into each participant's
`npx` Inspector process from
start to stop. The exact 32-byte/43-character `inspectorProcessId` distinct from OS
PID/subject/capture IDs binds that launch's request/effect/workflow records. A pre-readiness
failure instead uses `not-applicable`; terminalization preserves accepted rows and creates
mapped-class outcomes/reviews only for missing workflows. The candidate has only a dormant optional readiness hook.
At bootstrap, block body execution and send exact `StudyPreReadinessBootstrapProof`
`schemaVersion,productId,bootstrapEventId` through `register-pre-readiness-probe`
(`studyRunId,subjectId,bootstrapProof`) to get `preReadinessProbeId`. Maintain exact
`StudyPreReadinessProductBuffer` `schemaVersion,studyRunId,subjectId,preReadinessProbeId,state`
with `open | readiness-bound | terminalization-bound | destroyed`. Canonical N/A observations
use `buffer-pre-readiness-product-event` (`preReadinessProbeId,destinationRole,payload`);
supervisor ACK precedes product effect and raw discard is immediate.
`register-product-probe` takes `studyRunId,preReadinessProbeId,readinessProof,
requestedDestinationRoles`; process binding plus ordered-release ACK precedes both open-binding
ACKs and discovery-context ACK, and only then may readiness return.
Exit before bootstrap is ordinary terminalization; after bootstrap it binds/releases N/A first.
Helpers emit/register nothing; identity/register/ACK failure invalidates the run. Because it
cannot inherit the supervisor descriptor, the probe uses endpoint/token environment only for
`register-pre-readiness-probe`, `buffer-pre-readiness-product-event`, `register-product-probe`,
`submit-product-event`, and `close-product-probe`. The supervisor routes each safe event/process ID to the distinct
product or server adapter/watchdog. Only `submit-product-event` with `destinationRole: inspector-server-ledger`
carries the exact `StudyServerCorrelationClaim` payload variant. Its outer root is only
`inspectorProcessId`, `destinationRole`, `payload`; the outer process authenticates the registered
probe and payload subject/process IDs equal the participant/bundled-SPA claim and binding IDs.
The probe assigns the closed correlation header
before raw discard, and the browser helper strips probe/control environment.
Missing/tampered/alternate/duplicate probes, raw IPC, retained probe configuration, or unsafe
process-ID propagation are critical.
This gate was selected because candidate effects can occur after bootstrap but before readiness;
safe buffering plus effect-before-ACK ordering closes that attribution interval without inventing
a process ID. Discarding all pre-readiness observations was rejected because it can hide an
automatic safety event, while assigning the final process ID before readiness was rejected
because it makes a failed launch appear ready.
The envelope adds `schemaVersion`, stream role, and pairwise-distinct watchdog/capture instance
and process-run IDs before sequence, kind, monotonic time, prior digest, and safe-payload digest.
The closed start/heartbeat/handoff-anchor/stop payloads bind both study digests, observed process/IPC health,
the prior envelope, final sequence, and kind counts. A nominal 1,000-ms scheduler setting and
the sole 1,500,000,000-ns ceiling for start/heartbeat, consecutive-heartbeat,
heartbeat/checkpoint, and heartbeat/stop gaps are separate assertions; payloads cannot mask a
missed heartbeat. The
repository-owned controller and independent verifier execute through the exact package
commands, with deterministic schema/privacy/fake-clock tests plus real child-process/IPC
failure tests. Start returns six stream processes plus two separately ordered orchestrators.
Stop requires zero live reviewer, terminates all eight long-lived internal descendants, and leaves the supervisor alive.
Finalize independently checks every safe payload/envelope, commitment, original anchor,
terminal-outcome equation, role matrix, three direct adapter exits, three adapter-observed
authenticated watchdog exit attestations, two direct orchestrator exits, and the moderator-
observed attested equation `ephemeralReviewerProcessExitCount == reviewVoteCount`, then completes
finalize-prepare while the endpoint remains live. A separately authenticated finalize-commit
connection receives the exact witness after listener teardown begins but before supervisor key
destruction and exit. The verifier requires the complete response, EOF, and failed reconnection
to prove endpoint removal, then writes and re-reads the witness pair followed by the seal pair. The witness
binds control session, both commitments, original handoff, eight long-lived exits, and reviewer
exit count. The seal binds its digest,
the handoff digest, exactly three final roots/counts, both study digests, and exact aggregate
summary `automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`.
The verifier derives exact `automatic:<correlationId>` IDs and recomputes
`reviewVoteCount = 2 × suspectedWorkflowBlockerCount`, where suspected includes every reviewed
nonautomatic failure; reviewer-critical IDs are exact
`reviewer:<subjectId>:<workflowClass>` for confirmed/disagreement rows; total critical is the
cardinality of the tagged, de-duplicated union of `automatic:<correlationId>` and
`reviewer:<subjectId>:<workflowClass>`. Automatic-critical workflow rows add no second issue.
Zero gate requires both an empty union and the complete exact 20-by-4 terminal set; the success
thresholds remain independent. Contract tests own
phase/env/token rules, workflow cardinality, request truth table, role matrix, and privacy;
source-structure tests own the single-file/no-import boundary; OS-specific integration/security
tests own authenticated endpoint lifecycle, safe-ID/process-ID propagation, the initially empty
candidate-launch slot, post-input digest-bound provisioning, sole audited-bin resolution,
network/scripts/cache/global/fallback rejection and teardown absence, secret/path
non-retention, commitments/exits, crash-after-0-through-4 terminalization, and alternate-valid-prefix rewrite. A prohibited value or
combination, process/watchdog/supervisor discontinuity, excessive gap, identity/chain/count/
digest/commitment/anchor mismatch, truncation, early stop, failed teardown/verifier, missing
role/witness/seal, or stitch is automatic critical.

**Rationale**: The constitution treats passing tests as evidence rather than proof, so the
suite combines objective automation with full-diff review, manual accessibility checks,
documentation parity checks, a release tarball inspection, fixed participant scoring, and
repeatable versioned-profile-specific performance measurement.

**Alternatives considered**:

- Snapshot-only tests were rejected because they do not prove negative security behavior.
- Browser tests without unit/contract coverage were rejected because failures would be
  slow and hard to localize.
- Coverage percentage alone was rejected because it does not demonstrate the named
  boundary and non-execution invariants.

## 11. Specification revalidation decisions (2026-07-17)

**Decision**: Revalidate the Phase 0 design against the 2026-07-17 clarifications and carry
the following rules into every later design artifact:

1. One admitted tool-home root equals one tool-specific Global Source, with at most one
   Source each for Codex, Claude, and Copilot and zero to three in a session.
2. Readable source, displayed declared metadata, and comparison content preserve authored
   literal values. There is no credential masking or reveal workflow. Environment-variable
   references in inspected content remain literal and are not resolved or substituted;
   the three documented tool-home variables are used only to locate Global roots.
3. A fatal explicit rescan discards all uncommitted output, including partial output, and
   leaves the last successfully committed snapshot visible with a per-Source stale-failure
   entry and either a deterministic Diagnostic or thrown/rejected job Operation Error. A
   successful scan clears only its own Source's entry and referenced failure; unrelated
   commits preserve both, and removal clears both for the
   removed Source. A repeated fatal rescan replaces both for only its Source.
4. Generation 0 already contains the non-authorizing Repository Source. A deterministic
   automatic failure publishes no provisional result; a startup throw/rejection reaches the
   process top level with no survival guarantee. Initial Global enable uses fixed all-tools
   consent and a single admitted-subset batch. A deterministic all-rejected outcome returns
   `active-no-job`; a non-carveout throw/rejection creates only the REST Operation Error and commits
   none of the subset. A purged client recovers the active control view and exact frozen
   preview before selector-free retry.
5. Source-relative Path is the cross-source display/filter/diagnostic term. Repository-
   relative path is used only for the Repository Source rooted at the selected Repository
   root.
6. SC-001, SC-002, and SC-006 use the objective protocols in Section 10. SC-002 uses one
   checked-in versioned reference profile and publishes the profile ID, fixture digest, and
   actual non-personal environment fields with each result; results from changed profile IDs
   are not directly comparable.

**Rationale**: These decisions remove the former multi-root Source, masking/reveal,
fatal-result, path-terminology, and outcome-measurement ambiguities while preserving the
product's read-only, local, non-executing boundary.

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
- A mutable unpublished reference environment was rejected because it prevents another
  maintainer from reproducing the protocol or interpreting a changed baseline. SC-002 remains
  profile-specific rather than a portable performance guarantee.

## 12. Specification revalidation decisions (2026-07-19)

**Decision**: Carry the final analysis remediations into planning and implementation:

1. The fixed startup OS browser helper is the only permitted product-initiated child
   process. It receives no inspection-derived content or path, authored value, user-supplied
   command, or environment-selected handler. It may copy only the closed ambient platform-key
   set directly from the launch environment; lexical equality with a Source root changes no
   provenance and grants no authority. Discovery, reading, parsing, display,
   comparison, and relationship processing initiate no child process, and `--no-open` plus
   unsupported/failure paths leave a usable manual URL.
2. Each supported `(tool, kind)` owns closed declared-metadata field IDs, relationship kinds,
   and admitted source-form applicability. An entry may be serialized or shown only when it
   belongs to the maintained presentation-allowlist row and the exact extractor for the
   actual admitted source form recognizes that authored occurrence. An entry failing either
   gate remains visible only in complete source text and is never inferred or promoted across
   source forms as metadata or a relationship.
3. SC-002 includes the standardized filter and item-selection measurements defined in
   Section 10; the same at least 9 individual runs must each pass both scan thresholds and
   both interaction thresholds.
4. Dependency revalidation is a planning gate. Any accepted package or version change synchronizes all
   dependency-baseline-bearing English/Japanese design and task artifacts and reruns planning plus task
   generation before implementation proceeds.
5. The SC-002 environment is a checked-in versioned published profile with an objective
   current-request status stop condition; private local-machine identity is not part of the
   contract.
6. Origin-file-less hosted/runtime inputs are evidence-linked Source Condition Facts
   attached to the relevant Source. They create no file/path/source text/comparison target,
   grant no read authority, perform no local or hosted I/O, and retain unobserved current state
   as conditional or unavailable.
7. The maintainer team owns the initial-release participant study, funding, support, privacy,
   accessibility, and defined review protocol. Ordinary contributors do not carry those
   obligations.
8. `engines.node` is the complete Node 24/26 runtime compatibility range; the six exact floor
   jobs are lower-bound certification samples and Node 24.18.0 is the development/build
   baseline. The pinned three Playwright revisions are the automated browser-certification
   baseline, while the startup helper delegates to an unverified OS default handler and always
   retains the printed/manual-open fallback.
9. A successful initial or retry Global admitted-subset batch commit preserves an existing
   Repository result only semantically. It advances the generation exactly once, rekeys every carried graph and generation-owned
   ID, and makes every old file/detail/comparison/selection/editor reference stale.
10. SC-008 uses the maintained bilingual 55-row WCAG 2.2 Level A/AA applicability matrix.
    Stable check IDs bind every expected observation, and the closed manual matrix forbids
    sampling applicable locale/platform/viewport/mode/scenario/input cells. Every Applicable
    row, every Not-applicable rationale recheck, all four keyboard workflows, and every
    required responsive variation must pass; `validation.md` and `validation.ja.md`
    record the nonzero Applicable-row denominator, zero failed Applicable rows, and complete
    evidence. There is no axe-only or severity-based escape.
11. Diagnostic scope is a closed `file | source | session` union. Only file scope carries
    `sourceRelativePath`; source scope carries `sourceId` without a path, and session scope
    carries neither source nor path identity. Operation Error is a separate closed,
    path/content/raw-error-free outer-boundary entity and never becomes a Diagnostic.

**Rationale**: These rules make the child-process boundary, presentation scope, performance
denominator, runtime-fact model, participation ownership, compatibility/certification split,
and dependency baseline independently testable without weakening the existing security or
documentation-parity requirements.

**Alternatives considered**: Treating browser launch as part of customization-derived
execution, inferring metadata from arbitrary authored keys, keeping the interaction target
as an untracked plan-only goal, and patching versions only in `package.json` were rejected
because each creates a contradiction or a second undocumented contract.

## 13. Pre-analysis ordering decisions (2026-07-19)

**Decision**: Regenerate implementation tasks from four explicit dependency gates:

1. Setup first authors and runs the dependency-free failing formatting-policy matrix, then
   implements the checker and passes `test:format` plus `format:check`; no package command,
   CI job, or later task may rely on an untested formatting gate.
2. Setup scaffolds the CLI entry, parser-worker entry, and referenced build/manifest scripts
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

## 14. Cross-artifact remediation decisions (2026-07-19)

**Decision**: Freeze the remaining safety and measurement contracts before regenerating
tasks:

1. Operational events use only fixed codes and opaque IDs. Paths, roots, filenames,
   inspected content/metadata, authored values, capabilities, bodies, raw errors, and
   exception strings are prohibited; authenticated session Diagnostics remain a separate
   actionable surface. Fixed CLI help/version, one launch URL, and fixed startup
   warnings are presentation output.
2. Package bootstrap validates closed manifest structure, declared/actual lengths, and every
   listed hash before import or bind. Build, tarball, and runtime share those integrity rules
   but impose no product-defined file-size, aggregate-size, asset-count, buffer-size, or
   handle-count boundary.
3. The coordinator serializes Source scans, Global enable, and disable without exposing a
   product-defined slot or queue capacity. Disable remains a priority security barrier, and
   enable/disable races resolve atomically without late mutation.
4. Every scan receives a `scanRequestId`. SC-002 waits for the automatic first Repository
   scan, times one explicit rescan, and accepts only status and the committed inventory
   generation carrying that request ID.
5. Disable, shutdown, or generation replacement revokes publication authority independent of
   elapsed time. Late results are discarded and cleanup follows the underlying Node.js/OS
   operation; no hard kernel-I/O cancellation or OOM recovery is claimed.
6. Allowed interpretation is limited to closed syntax, exact literal extraction, mechanical
   typed decoding, frozen-catalog classification, and documented structural projection.
   Every product/documentation surface forbids natural-language interpretation/ranking,
   customization verdicts, policy/remediation advice, linting, synchronization, conversion,
   formatting, and fixing.
7. Product-issued mutation means every mutation-capable filesystem request or flag. Tests
   instrument those calls and stable source properties; OS-only atime changes are recorded
   separately as neither failure nor proof.
8. Capability authentication is the API access boundary. Sensitive-content acknowledgement
   is a resettable client-memory presentation gate that the bundled SPA applies before every
   `FileDetail` request or comparison construction; it is never sent to the API. Document
   reload and the central full-session purge reset it; ordinary scoped cleanup may retain it,
   while Global disable is the explicit full-purge exception.

**Rationale**: These boundaries remove ambiguity from integrity, cleanup, disclosure, and
negative-product-scope tests while preserving literal inspection and making capacity a
property of Node.js and the surrounding execution environment.

**Alternatives considered**: Path-bearing logs, product-defined resource caps, integrity-free
static loading, prior-generation performance completion, timer-based claims of physical I/O
cancellation, broad semantic analysis, literal atime-as-mutation scoring, and server-side
acknowledgement state were rejected because they overstate the platform guarantee, weaken
integrity, or confuse presentation with API authorization.

## 15. Final clarification decisions (2026-07-20)

**Decision**: Apply the final user choices as one closed runtime contract:

1. Capture `process.cwd()` exactly once. With no `--cwd`, use that string as the selected
   Repository root. On Windows reject explicit UNC/server-share/device, current-drive/root-
   relative, and `C:`/`C:foo` drive-relative forms before `resolve`; preserve an absolute
   drive option and resolve only a plain relative option against the anchored capture. On
   POSIX preserve an absolute option or resolve a relative option against the capture. Pass
   every selected absolute result through the one shared pure `LexicalAbsoluteRootParts`
   parser with zero filesystem/network I/O, never `chdir` or use per-drive resolution, and
   reject invalid input before session/browser creation. Generation 0
   synchronously contains the stable, non-authorizing Repository Source; admission is later.
2. Global consent is one selector-free all-tools action. Initial processing always evaluates
   all three frozen preview entries; retry derives the complete current server-side
   `retryableTools` set: non-pending unpublished `admitted` controls plus `rejected` controls
   whose `retryDisposition` is `same-preview`, excluding lexical `new-preview-required`. A
   deterministic rejected entry does not block siblings. All admitted roots are scanned as
   one batch and their separate one-root Sources publish in one atomic generation.
3. The only two caught or observed filesystem-rejection cases inside the domain are
   FR-041's narrow carve-outs: exact `ENOENT` from a contract-declared structural `lstat`
   supplies the closed fact required for root absence, exact-target fallback, and
   observed-entry disappearance, while the event-confirmed-close observation retains only
   already-confirmed successful close lifecycle. Every non-carveout throw/rejection,
   including `ENOENT` from `open`/`read`, propagates unchanged. A pre-acceptance REST owner
   returns fixed HTTP 500 Operation Error with no `scanRequestId`; an accepted job exposes
   the same generic terminal entity with its ID and keeps the process/prior snapshot;
   startup-owned failure reaches the process top level. No raw error enters product API,
   logs, or telemetry, while runtime-owned local uncaught output remains a limitation.
4. NUL is binary/diagnostic-only/contracted-partial. Every non-NUL byte stream is decoded
   once with UTF-8 replacement semantics. `utf-8-replaced` preserves all `U+FFFD` characters
   as the replacement-decoded garbled text shown, parsed, extracted, and compared, and is complete by itself.
5. Raw entry segments alone perform filesystem operations. Collision-free NFC values own
   public classification/display. Normalization collisions produce no ambiguous file; hard-
   linked admissions deterministically choose the unsigned UTF-8-bytewise lowest NFC path as
   primary and sort the rest as aliases while preserving every raw provenance.
6. Presentation Allowlist rows are already approved design input. The implementation gate
   verifies them and their bilingual digest only. A semantic change stops work and requires
   synchronized design plus regenerated plan/tasks before consumption.

**Rationale**: These choices preserve the requested runtime ownership of actual read errors
without making an absent optional path fatal, eliminate user-selectable Global scope, make
bootstrap identity independent of read authority, and keep malformed text inspectable in
the exact form the UTF-8 decoder produced.

**Alternatives considered**: Treating every `lstat` absence as an uncaught runtime failure
would make documented fallback and automatic existing-root selection impossible. Catching
permission, `open`, or `read` errors as domain outcomes would violate runtime ownership.
Per-tool Global commits would expose intermediate subsets and advance generation multiple
times. Charset guessing would make output environment-dependent. Using normalized display
segments for filesystem operations would weaken the boundary. All were rejected.
