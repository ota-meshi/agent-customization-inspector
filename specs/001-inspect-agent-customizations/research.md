# Phase 0 Research: Inspect Agent Customizations

[日本語](research.ja.md)

**Researched**: 2026-07-16; revalidated 2026-07-18; CLI dependency selection revalidated 2026-07-19
**Scope**: Reference architecture, current compatible toolchain, safe local-host design,
safe parsing and literal display, source/metadata comparison, bounded scanning, and the official
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
built-ins to validate the packed package version, both manifests, and every listed static/
server hash before dynamically importing the validated CLI, without creating independently
versioned packages.
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

`dist/manifests/static-assets.json` is strict JSON of at most 2 MiB with no extra keys:
`manifestVersion: 1`, the exact `packageVersion`, `shellPath: "/index.html"`, up to 4,096
ordered `assets` records, and up to 32 ordered `inlineScriptSha256` values. Each asset is
`{ requestPath, file, byteLength, sha256, mediaType }`: `requestPath` is a unique
root-absolute URL path of at most 512 UTF-8 bytes, `file` is the exact corresponding
`public/...` regular-file location, `byteLength` is non-negative, `sha256` is 64 lowercase
hex characters, and `mediaType` comes from the closed host table. Inline values are the
44-character base64 SHA-256 digests of the exact executable script bytes in the shell.
The `bin.mjs` bootstrap resolves this manifest from its fixed package-relative URL,
strictly validates it, and verifies every listed asset's size and hash before CLI import;
no unlisted path is served.

`dist/manifests/server-assets.json` is strict JSON of at most 1 MiB with exact keys
`manifestVersion: 1`, `packageVersion`, and an ordered 2..256-record `assets` array. Each
record is exactly `{ file, byteLength, sha256 }`; safe relative `.mjs` paths are sorted and
unique, total listed bytes are at most 64 MiB, each file is at most 16 MiB, and
`cli.mjs`/`parser-worker.mjs` are required. Every code-split tsdown output is listed. A
final recursive verifier derives the only legal `dist/` files from this manifest plus the
static manifest, rejecting any stale/unexpected/link/non-regular path before packing and
applying the same proof to the unpacked tarball. At runtime `bin.mjs` also validates this
server manifest and every listed server hash before it imports `cli.mjs`, so both manifest
classes are checked before server bind.

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
and rerun `/speckit-plan` followed by `/speckit-tasks`. A local package/lockfile edit may not
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

The CLI uses only Gunshi's stable root `define`/`cli` API. It declares a negatable `open`
boolean with a true default to provide `--no-open`, calls `cli()` with
`strict: true`, and explicitly rejects all positional/rest arguments before the host binds.
It awaits the asynchronous result and maps validation failures through a project-owned,
fixed, bounded renderer and explicit `AggregateError` handling to a nonzero exit; built-in
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
   programs, is rendered from the exact launch root with `./`, and rejects a bare `**/`.
   Literal, one-segment, and bounded recursive-directory tokens can compose in one program;
   `./**/` denotes explicit downward Inspector descendant inventory only and never asserts
   vendor traversal. Build validation compiles the same programs into immutable versioned
   `TraversalPlan` data; Global preview patterns render from those plans and consent binds
   their schema, closed selection policy, and canonical programs. The only
   content-dependent policy is the closed Codex Global first-non-empty branch: it probes
   the override first, short-circuits on safely read non-empty content, advances only from
   absent or safely empty content, and fails closed without fallback for an unsafe or
   unreadable present candidate.
3. The **runtime composition registry** records stable `strategyId` values for selection,
   precedence, layering, fallbacks, condition projection, and relationship-only rules in
   [runtime composition](contracts/runtime-composition.md). A strategy refers to behavior
   and rule IDs instead of repeating paths.
4. The **official source registry** records stable `sourceId` values, canonical official
   URLs, exact bounded section anchors, review dates, affected contract IDs, assertions,
   and semantic fingerprints in [official sources](contracts/official-sources.md).

The launch `cwd` remains the immutable Repository inventory boundary. Vendor runtime roots,
walk directions, target files, trust, enablement, selection, installation, and product
surface are independent behavior/strategy facts rather than implications of a matcher or
file existence. A behavior record, source record, strategy, relationship, or excluded rule
never authorizes a read.

Every admitted tool-home root is represented by its own tool-specific Global Source: at
most one each for Codex, Claude, and Copilot, and therefore zero to three Global Sources in
one session. Each Source owns exactly one root and one Source-relative Path namespace.
Files of different customization types below that root remain separate inventory items.
The term repository-relative path is reserved for the Repository Source; DTOs, filters,
diagnostics, and cross-source comparison use Source-relative Path.

Bounded derivation remains a typed single-edge provenance graph with fan-out limits, not
arbitrary reference following. The closed `DerivationProgram` union has exactly five
initial mappings: the three vendor local-marketplace manifest rules, Codex fallback
basename placement, and Codex skill metadata. Each pins an exact static seed provenance/
rule/kind, declaration field and syntax, base/placement, fixed suffix alternatives, and
fan-out. No callback, arbitrary path join, free-form expression, glob, or recursive
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
  left conditional; no VS Code row is reused as a CLI or Cloud traversal rule. Current
  pages still conflict or remain silent about parts of standard-instruction support,
  project-versus-user custom-agent precedence, separate agent-context instruction order,
  and agent-profile skill preload, so those facts remain conflict or unknown rather than a
  universal winner. Hook, settings, plugin, MCP, custom-agent body/tool/model/invocation,
  and IDE handoff locators and composition are likewise surface-qualified; excluded User
  overrides remain condition facts rather than inferred files.
- **Claude project settings are launch-directory exact.** `.claude/settings.json` and
  `.claude/settings.local.json` are read from the exact launch `cwd`; they are not inherited
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

The registry stores no copied page body. The exact record bounds, official-HTTPS host and
redirect policy, timeout/decompressed-size/content-type limits, anchored-section
normalization, and human update rules remain defined by
[OfficialSourceRecord](data-model.md#officialsourcerecord). A URL that is reachable but has
lost, duplicated, or semantically changed its anchored section still fails closed for
human review.

**Alternatives considered**:

- One combined vendor/path/precedence/source table was rejected because one cell could not
  distinguish an upstream locator from an Inspector matcher or a surface-specific
  composition strategy, and citations could not be reviewed independently.
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

For each opened directory the service completes a bounded sibling buffer before descent.
It preserves exact `Dirent.name` raw segments solely for path reconstruction/verification,
and derives NFC classification segments solely for matching, ordering, and DTO paths. If
distinct raw siblings normalize to one NFC classification key, every member of that group
fails closed without descent/open/read and receives
`safe-fs-path-normalization-collision`; one non-colliding NFD-only spelling remains readable
through its raw path and displays as NFC. The service counts every entry against shared
limits and uses bigint `lstat` plus canonical containment checks to reject VCS internals,
links, non-directory traversal objects, and detectable device changes. Only that service can issue a private, generation-bound `ScanEntryTicket`;
HTTP values and parsed content cannot create or reconstruct one.

A candidate read reconstructs its path only from the owning root context and ticket. Before
open it compares the root and every ancestor `lstat` `dev`/`ino`/`mode` with ticket
snapshots. It first checks candidate path `lstat`, rejects a link or non-regular object,
and compares `dev`/`ino`/`mode`/`size`/`mtimeNs`/`ctimeNs` with enumeration metadata. It
then resolves the candidate with `realpath`, uses `path.relative` to require canonical
containment, and immediately repeats the candidate path `lstat` comparison. It opens the
file only when both path-stat snapshots agree with each other and the enumeration
metadata. If `O_NOFOLLOW` exists and is
effective on that platform, its use is mandatory final-component defense in depth; absent
or ineffective support is not a cross-platform guarantee. Before reading any bytes, the
implementation repeats that ordered root/ancestor/candidate-`lstat`/canonical/
candidate-`lstat` sequence and compares the same fields with
`FileHandle.stat({ bigint: true })`. Bytes are read in bounded
chunks from that same `FileHandle`, never by a later path-based `readFile`. While the handle
remains open and before acceptance, post-read validation repeats the complete ordered
sequence and the same `FileHandle.stat` comparisons over the same fields. A mismatch at
any stage closes the handle, discards every collected byte, marks the ticket stale or
rejected, commits no readable content or receipt, and emits only a fixed source-value-free
diagnostic; a bounded diagnostic-only inventory record may remain for a safely inventoried
path. Root identity failure aborts that source attempt and preserves its previously
committed graph; an entry-local change leaves unaffected results usable as a bounded
partial result.

If Node reports required identity/metadata or canonicalization as unavailable, ambiguous,
malformed, or otherwise unusable, `safe-fs-boundary-unverifiable` rejects the boundary or
candidate instead of guessing. A root-level failure aborts the source attempt; an item-level
failure can retain only the bounded diagnostic-only inventory record.

**Rationale**: The repeated checks materially reduce risk from ordinary concurrent edits,
ensure detected changes cannot be committed, and preserve the exact resource accounting
required by the scan contract. They do not create kernel-enforced containment. Node 24's
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
repeat the security review. One bounded service still centralizes entry/depth/deadline/byte
accounting and progress. Every emitted file path is a collision-free NFC classification
path relative to the owning Source's one root; filesystem operations retain the raw spelling.

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

**Decision**: Treat source bytes as authoritative and decode supported text strictly.
Return readable source text, displayed declared metadata values, and comparison content
exactly as authored, without credential detection, content-based masking, redaction, or a
reveal workflow. Environment-variable references inside inspected content remain literal
text and never cause the Inspector to read, resolve, or substitute the referenced process
value. The documented `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, and `COPILOT_HOME` inputs are used
only by the host to locate tool-specific Global Source roots, not by content parsing.

Perform best-effort metadata extraction after decoding, but never use a decoded/normalized
value as the displayed value. Every accepted allowlisted field occurrence carries an exact
`authoredLiteral` source slice plus a separate internal typed semantic value. The public
metadata list stays in source-occurrence order and preserves accepted duplicate occurrences;
its cross-file identity is tool, kind, closed field ID, and that field's zero-based
occurrence. JSONC
syntax-tree ranges, YAML CST/source-token ranges, a bounded TOML lexical-span scanner paired
with semantic parsing, and bounded Markdown/frontmatter/import spans produce the exact slice.
JSON/YAML/TOML quoting, escapes, block indicators, numeric/date spelling, and collection
punctuation therefore remain visible. Only the separate semantic value may drive typed
classification, relationship normalization, or bounded derivation. An authored relationship
displays the exact target slice and normalizes only its semantic string. A registry-defined
documented default has no source slice, uses `authoredTarget: null`, and is labeled as a
documented default rather than source-authored text. Ranges use ECMAScript UTF-16 code-unit
offsets and must reproduce the literal with `String.prototype.slice`; the UTF-8 byte bound
is separate. Metadata, relationship, and derivation may reference the same exact source
occurrence/range. Only partial, nested, crossing, or identical overlap between distinct
origin occurrences is invalid. A missing, illegally overlapping, ambiguous, or non-round-tripping range discards the recognition's whole
extraction rather than inventing a literal.

YAML semantic parsing uses core schema with no custom tags and disabled aliases; JSONC
extracts known paths from a syntax tree; semantic values are normalized to a bounded,
JSON-safe discriminated internal union whose integer, float, and date/time payloads use
typed canonical strings without JavaScript precision loss; Markdown/frontmatter and Claude
imports are scanned as text. At
most two V8-limited parser workers enforce a 2,000 ms per-recognition timeout, 2 MiB
accepted message bound, depth 64, 50,000 nodes, 64 KiB scalars, and 512 metadata entries.
Generation-wide parser messages are at most 32 MiB. The 64 KiB scalar limit applies
independently to the exact UTF-8 source slice and the typed semantic value.
A parser limit or incompatible meaning from two extractors for the same `(fileId, tool,
kind)` discards that one recognition's whole extraction result without changing the
readable source text or another recognition. Exactly one recognition exists per tool/kind
pair and compatible provenances merge there. Rules, scripts, markup, URLs, and control sequences are never
evaluated or rendered. Operational diagnostics and logs identify stable codes, the owning
Source, and Source-relative Path without copying customization source values.

**Rationale**: Parsing is needed to label declarations and relationships, but success must
not turn the Inspector into a validator. Literal presentation preserves credential and
other authored differences that masking would hide. Before a source or comparison view
opens, the interface warns that the complete authored content may contain sensitive values.
The authenticated loopback API, `Cache-Control: no-store`, process/browser-memory-only
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
evaluation, nonce, unrecorded inline script, external worker, or blob worker. Attempt diff
highlighting only when each side has at most 20,000 lines, with an explicit 5,000 ms
computation timeout; retain complete read-only side-by-side source with a diagnostic when
either limit is reached. Recognition metadata is matched by tool, kind, closed field ID, and occurrence,
then compares and renders the exact `authoredLiteral` in Vue rows/badges; the internal typed
semantic value is never substituted into the UI or converted to JSON text for Monaco. Preserve Monaco's
accessible diff viewer, ARIA labels, keyboard navigation, and narrow-screen inline mode
for explicit accessibility testing.

**Rationale**: Source files include Markdown and structured configuration where syntax
coloring, line navigation, virtualized rendering, search, synchronized scrolling, and a
well-tested diff surface materially improve inspection. Monaco already computes source
differences and exposes file-size, computation-time, and accessibility controls, so a
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
Origin, omit CORS, reject non-JSON/oversized bodies, set `Cache-Control: no-store`, and send
a restrictive CSP. Use file IDs and closed commands, never client paths. Keep the
capability in memory only: after fragment removal a reload makes no API call and tells the
user to reopen the process-lifetime printed URL. Serve the inert SPA shell only for a
closed client-route grammar and build-manifest assets. The CSP is derived from the exact
build-recorded inline hashes rather than `unsafe-inline`. Before Global consent, expose a
capability-protected lexical/no-I/O path preview; bound a proposed root at 32 KiB UTF-8 and
its escaped display at 192 KiB, bind confirmation to its session-keyed digest, and reject
oversized input or any post-consent canonical alias difference before enumeration. While
in limit, retain the exact raw `lexicalRoot` internally and bind it, the escaped display,
and the immutable `TraversalPlan` schema/selection-policy/canonical programs in the digest. Enable uses only
that stored raw value, never reverses display text and never rereads the environment. While
the authorized page is visible, renew a two-second monotonic browser-memory lease through
one capability-protected liveness route every second with a 750 ms request timeout. Use a
single `clientDataEpoch`-guarded purge for failed/mismatched liveness, lease expiry, hidden/page
lifecycle events, and process loss; it removes all DOM/DTO/editor/warning state and prevents
late responses from restoring content. Retain only the memory capability across a hidden-page
purge. On visibility return, the retained capability authenticates a fresh session. The SPA
adopts its returned `sessionId` as the new liveness baseline without retaining or comparing
the purged ID and keeps only its bounded, control-only `globalControl` view. Active consent
makes disable available from that view immediately; the preview route returns the exact
frozen preview so retry controls can be reconstructed without browser persistence or an
environment reread. The recovery view always offers Resume inspection; that explicit action
re-fetches a matching session and builds a default fresh inventory summary without restoring
old detail, comparison, editor, selection, filter, authored source, or acknowledgement. A
later detail/comparison open requires a new acknowledgement.

Every SessionSnapshot/FileDetail request captures the client epoch, generation, exact
request token, and file ID where applicable. Older snapshots are ignored; before adopting
a newer generation the client increments the epoch and aborts/disposes every detail,
comparison, and editor object. Equal-generation snapshots require their current token.
File detail is adopted only if epoch/generation still match and the readable file still
exists. The server captures each envelope's generation and payload together under the
coordinator lock, so delayed network delivery cannot mix them.

Print the closed-grammar launch URL exactly once to the initiating terminal before any
browser attempt. A project-owned `src/launch-browser.ts` revalidates
`http://127.0.0.1:<port>/#cap=<43-character-base64url>` and, unless `--no-open` is set, uses
`node:child_process.spawn` with `shell: false`, ignored stdio, fixed arguments, and `unref()`:
`/usr/bin/open` on macOS or the OS-provided `/usr/bin/xdg-open` on Linux. Windows and every
other platform skip automatic opening and emit the fixed manual-URL warning because the
portable Node API supplies no independent trusted boundary for selecting a system browser
helper. The exact child environment allowlist is macOS `HOME`, `TMPDIR`, `LANG`, `LC_ALL`;
or Linux `HOME`, `DISPLAY`, `WAYLAND_DISPLAY`, `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`,
`DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, `LC_ALL`. `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`, all
other environment values, inspected values, and additional argv are omitted. OS helpers
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
touches them. Oversized input becomes a fixed `oversized`/null-display state before
normalization, so hostile environment size cannot cause an unbounded consent DTO or
authorize a hidden value. `node:http` avoids a server framework for a small fixed route set; the current H3 v2 tag is a release candidate while
stable H3 v1 is a larger legacy dependency. A bounded client lease makes process loss
observable without persisting data or relying on a server push after the server has gone;
immediate hidden-page purge avoids background timer throttling.
The recovery DTO keeps all-failed Global consent visible even when no Source exists, while
the separate preview avoids repeating a potentially large display payload in every poll.

**Alternatives considered**:

- Unauthenticated RPC was rejected because customization files can contain secrets.
- A cookie-only or query-string token was rejected because ambient cookies invite CSRF and
  query values appear in request logs/history.
- General `--host` support and CORS were rejected because remote access is out of scope.
- SSE/WebSocket session push was rejected because one authenticated liveness response and
  local lease give the required teardown signal without a long-lived transport.
- A `BROWSER` override, package-owned/user-supplied shell helper, shell command string, or bundled platform helper was rejected because
  launch needs no user-configurable execution path and the product package must remain
  JavaScript-only. The fixed OS-provided `xdg-open` may itself be a system shell helper,
  but it is outside the package payload and is invoked as a fixed executable with
  `shell: false`.

## 9. Atomic generations, rescan, and resource limits

**Decision**: Start the Repository scan automatically, expose progress through the session
snapshot, and perform later Repository or enabled tool-specific Global Source scans only on
explicit user action.
Create a legal empty zero-I/O bootstrap generation 0 synchronously before the automatic
Repository command, with null source progress until work is queued. A single coordinator
serializes every `GlobalEnableOperation`, Repository or tool-specific Global Source scan,
and the transaction that disables Global inspection. Initial enable and retry reserve their
whole tool-set capacity before state mutation, transfer accepted shares to queued scans, and
release every share on rejection, completion, failure, or cancellation; reservation failure
changes no state. A final coordinator-locked operation-ID/epoch/state check atomically
chooses the enable response disposition: operation first commits `202`, closes its lease,
and unregisters immediately, while disable-barrier first commits `409`, drains, and only
then closes/unregisters after releasing operation-local resources and untransferred capacity,
without late mutation or leakage. Ordinary scans are FIFO. Global disable is a priority security barrier:
at acceptance it sets `globalControl.state: disabling`, empties pending/retry arrays,
increments the command epoch, and rejects new Global-enable/Global-rescan commands. It aborts
and discards any active uncommitted transaction, aborts and drains enable validation/admission,
performs a final queued-Global-work cancellation sweep, removes all active Global Sources without I/O next, and requeues an interrupted
Repository command once behind that removal. Repeated disable joins an already
queued/active barrier; with no tool-specific Global Source or graph, active consent record,
retained admitted Global root context, open Global inspection `FileHandle`, or running/queued
Global scan/enable command it is a no-op regardless of
Repository work. Each scan job starts
from the current session-wide generation, carries the unscanned source under the remaining
shared file/byte/diagnostic budgets, and builds a replacement separately. Atomically commit
only a complete or bounded-partial result as the next generation, rekeying every source
graph and invalidating all file IDs and comparisons. Keep unresolved explicit-rescan
failures as session-owned entries keyed by Source rather than fields on the immutable
committed generation. Model each confirmed tool with a session-owned `GlobalToolControl`
outside scan working sets; it owns any admitted root context and unpublished Source/boundary
IDs until commit. A successful Source commit clears that control's reserved tool failure
diagnostic. Post-consent validation may accept zero roots: an all-rejected request returns
`active-no-job`, retains consent/control for exact retry or disable, and publishes no new
Source or job. Initial activation therefore has zero Global Sources; a retry preserves any
existing Sources. In a mixed request, `pendingTools` covers validation/admission in the
running enable/retry operation and its queued/running initial scans, so an `unvalidated`
tool is never retryable. Retryable tools remain informational until all such work finishes;
retry is then preview-gated, while disable remains immediate.
Enforce the limits recorded
in the plan and shared contract: aggregate caps include 50,000 aliases, 8,000 recognitions,
100,000 metadata entries, 100,000 provenances, and 100,000 relationships per generation,
plus 64 MiB retained graph data, 8 MiB encoded SessionSnapshot, and 4 MiB encoded
FileDetail. The SessionSnapshot budget is an exact 5-MiB neutral-overlay base plus a
3-MiB session-owned overlay: at most 2 MiB for lifecycle Diagnostic/ID insertions and a
disjoint 1 MiB for stale state, Global control, and Source lifecycle/progress projections.
Every paired lifecycle insertion is at most 2 KiB, and 16 KiB of its sub-budget is reserved
before ordinary admission for the four keyed failure slots and sentinel. An oversized keyed
failure uses the fixed compact per-key form; an oversized ordinary detail is suppressed into
the sentinel. Replacement credits the old charge before atomic admission. Build tests prove
the worst-case closed control projection fits its 1-MiB sub-budget. Before allocation/retention, deterministic record-byte accounting admits only
whole records. The first excess record makes the generation partial with a bounded
diagnostic; routes never truncate a committed DTO and fail safely if an impossible
post-commit size invariant is detected. Canonical accounting is performed by the production
JSON encoder, which materializes the one UTF-8 entity-body buffer later passed unchanged to
the HTTP layer; a second serializer cannot introduce byte drift.

**Rationale**: Global serialization plus atomic session generations prevent lost updates
and mixed old/new results. If an explicit rescan fails fatally, every uncommitted result
from that attempt—including a partial result—is discarded. The last successfully committed
snapshot remains visible, is marked stale because the rescan failed, and receives an
actionable capped out-of-generation session diagnostic. Failures for different Sources
coexist; another Source's successful commit carries them, and only a successful complete/
bounded-partial scan of the affected Source or removal of that Source clears its entry and
reserved diagnostic. A
fatal first Repository scan leaves legal empty bootstrap generation 0 current
rather than inventing a previous inventory. A fatal tool-specific Global Source rescan retains that
Source's consent, one accepted root context, and last committed graph so explicit
retry/disable stays possible. Four fixed failure slots—Repository plus one per Global tool—plus the
session sentinel leave 1,019 ordinary session-lifecycle details within the 1,024 cap. A
separate post-commit byte overlay means those records and the other session controls cannot
invalidate the committed 5-MiB base or overflow the 8-MiB response. A 30-second hard deadline prevents hangs while the performance acceptance
target remains 10 seconds. One MiB per file and 32 MiB total permit 500 normal
customization files without retaining unbounded content. Aggregate count, worker-message,
graph, and response budgets prevent the product of otherwise legal per-record maxima from
exhausting the host heap. Killable V8-limited workers bound
synchronous parser time and tree amplification. Source comparison is separately bounded by
20,000 lines per file and a 5,000 ms Monaco computation timeout; a capped or timed-out
comparison still receives full literal side-by-side views and a diagnostic rather
than becoming non-comparable.

**Alternatives considered**:

- Automatic watch/rescan was rejected because it creates implicit reads and stale-state
  races not required by FR-030.
- Incrementally mutating the active result was rejected because consumers could observe a
  mixture of generations.
- Concurrent per-source commits were rejected because a single generation number and
  generation-scoped IDs would otherwise require conflict-prone commit-time rebasing.
- Unlimited scan, parse, relationship, and comparison work was rejected as unsafe for
  untrusted repositories.

## 10. Verification strategy

**Decision**: Maintain vendor conformance fixtures and negative near-misses, plus
adversarial fixtures for links, races, encodings, limits, literal credentials,
environment-variable references, imports, executable declarations, and malformed formats.
Test pure recognizers/parsers and literal-display DTOs, the HTTP
contract, source boundary integration, packed `npx` behavior, the 100k/500 performance
case, all four Playwright user stories, and WCAG 2.2 AA with axe plus keyboard/manual checks.
Four registry fixture suites validate every behavior/rule/strategy/source ID, reciprocal
evidence links, exact section anchors, English/Japanese parity, and the rule that only the
Inspector matcher registry can authorize a read. Matcher fixtures reject a Repository
selector without `./` or with bare `**/`, distinguish exact/direct-child/explicit
descendant inventory, and prove that `./**/` does not satisfy a vendor traversal fact.
Targeted regression fixtures cover Copilot's separate VS Code/CLI/Cloud lookup tables,
Claude project settings only at exact launch `cwd`, non-recursive Codex rule directories,
plugin activation versus authored manifest inventory, and zero Global reads beyond
FR-015 through FR-018. They also verify zero to three tool-specific Global Sources, at most
one per tool, exactly one root and Source-relative Path namespace per Source, exact literal
credential display, no reveal controls, and no environment-variable substitution.
Lifecycle fixtures cover concurrent unresolved failures for all four Sources, per-Source
clear/replace/removal, and automatic-first-failure current state. Browser fixtures cover
the liveness lease, visible process loss, hidden/page purge, port reuse with a mismatched
session, and paused snapshot/detail delivery across scan/disable commits with epoch,
generation, token, and file-existence rejection of late responses. Preview fixtures cover
raw/display escape collisions and prove enable uses the stored raw root. Matcher fixtures
also prove Global exact targets never enumerate the root, fixed subtrees touch only their
allowed descendants, and neighboring paths receive zero I/O. Raw-path fixtures read one
non-colliding NFD-only entry through its exact spelling and fail an NFC/NFD sibling collision
group without descent/read.
Run the pure Node.js integration/race suite on macOS, Linux, and Windows, including parent
replacement, final-component replacement, root rename, symlink/junction rejection,
detectable device changes, identity/metadata mismatch, bounded same-handle reads, byte
discard, no-readable-content commit, and post-pack execution. Where effective
`O_NOFOLLOW` exists, tests require its use. Controlled barriers exercise changes detected
by the post-read root identity, every ancestor `lstat`, candidate path `lstat` before and
after canonicalization, canonical containment, and same-handle stat comparisons. Test-only filesystem barriers remain
inside the test harness and are not exported by production modules. These tests establish
the specified detected-race behavior and must not be described as proof against the active
adversarial mutator excluded by the threat model or against same-device bind mounts and
reparse information that Node never exposes.
Instrument tests to fail if inspected content causes an outbound request, MCP connection,
child process, dynamic evaluation, or source mutation.
Literal-span fixtures for every supported format place astral, isolated-surrogate, and
combining sequences around fields, require UTF-16 `String.prototype.slice` round trips,
allow one origin occurrence to drive metadata/relationship/derivation, and reject overlap
between distinct origins. Multi-provenance fixtures prove exactly one recognition per
tool/kind and keep hard-link alias seed provenances distinct. Package fixtures distinguish
package payloads from package-manager-generated symlink/`.cmd`/`.ps1` launchers and verify
their exact declared Node targets and argv-only bodies. Exact-limit and one-record-over
fixtures cover every aggregate count, worker-message, graph, snapshot, and detail budget
without response truncation.

The 2026-07-17 measurable-outcome revalidation fixes the following objective protocols:

- **SC-001** uses exactly 20 participants who use Git and a command-line interface in their
  normal development work but have never used or contributed to the Inspector. At least 19
  must succeed within 2 minutes using only the provided product guidance. The timer starts with the
  standardized task prompt and ends when one discovered file's source/details view is
  visibly open and operable, including repository navigation and launch time. SC-001 runs
  before SC-006 with the same cohort. Moderators may only repeat the prompt verbatim. Every
  enrolled-participant equipment, environment, or product failure counts as unsuccessful,
  including before timer start; no participant is excluded or replaced.
- **SC-002** reuses one unchanged deterministic 100,000-entry/500-match fixture for exactly
  10 measured runs on one versioned, published reference-environment profile. The checked-in
  profile records the exact OS image/version, processor architecture/model and logical count,
  memory, storage/filesystem, application runtime, benchmark command/configuration, and
  fixture manifest/digest; the result records actual values while omitting only personal
  identifiers and absolute user paths. A profile change starts a non-comparable set.
  Fixture construction, setup, `npx` download/installation, and process start are outside
  the timers. Both timers start when the browser submits the scan request. Within 1 second,
  the current request must visibly and accessibly say queued, name an active scan phase, or
  report complete/partial/failed; a failure includes a practical next step. A generic spinner,
  loading label, unchanged control, acknowledgement without scan state, or prior-request
  status does not qualify. The complete operable inventory must render within 10 seconds.
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
  objective workflow outcomes and predefined safety events. Every unintended execution,
  inspected-source mutation, MCP/network connection, or disclosure of inspected content to
  another machine is automatically critical. Only a suspected product-caused workflow
  blocker that is not such a safety event receives two independent fixed-rubric
  classifications; disagreement counts as critical without a third adjudicator. The
  acceptable automatic or reviewer-confirmed critical count is zero.

The 20-person study is initial-release evidence because automation and project-familiar
contributors cannot establish first-use discoverability or interpretation without project
context; its fixed denominator is not a population-level statistical claim. The maintainer
team publishes a bilingual plan naming the accountable study owner, recruitment and
compensation-funding owner, moderation/review staff, schedule/support contact, consent/privacy
and anonymized-retention process, supplied repository/equipment/session support, and
accessibility accommodations. Ordinary contributors do not recruit, fund, moderate, or
review participants. Missing study resources block the release claim, not review of an
otherwise conforming contribution; material workflow/guidance/fixture/rubric changes trigger
the next study.

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
   entry and reserved actionable diagnostic. A successful scan clears only its own Source's
   entry and diagnostic; unrelated commits preserve both, and removal clears both for the
   removed Source. A repeated fatal rescan replaces both for only its Source.
4. A fatal automatic first Repository scan also publishes no provisional result and keeps
   bootstrap generation 0 current. A fatal initial tool-enable job publishes no provisional
   result, adds no `StaleSourceFailure` entry for the missing tool, creates/replaces that
   tool's keyed reserved failure diagnostic, and
   preserves every pre-existing entry and the derived snapshot state. Initial Global enable retains
   only the exact active consent and per-tool `GlobalToolControl` state needed to retry confirmed
   tools that still lack a Source or to disable Global inspection; successful tool Sources
   in a mixed outcome remain unchanged. Post-consent validation may accept zero tools and
   returns recoverable `active-no-job`; a purged client recovers the active control view and
   exact frozen preview before retry.
5. Source-relative Path is the cross-source display/filter/diagnostic term. Repository-
   relative path is used only for the Repository Source rooted at launch `cwd`.
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
  not rooted at the Repository `cwd`.
- A mutable unpublished reference environment was rejected because it prevents another
  maintainer from reproducing the protocol or interpreting a changed baseline. SC-002 remains
  profile-specific rather than a portable performance guarantee.

## 12. Specification revalidation decisions (2026-07-19)

**Decision**: Carry the final analysis remediations into planning and implementation:

1. The fixed startup OS browser helper is the only permitted product-initiated child
   process. It receives no inspected content, inspected path, authored value, user-supplied
   command, or environment-selected handler. Discovery, reading, parsing, display,
   comparison, and relationship processing initiate no child process, and `--no-open` plus
   unsupported/failure paths leave a usable manual URL.
2. Each supported tool/kind owns closed declared-metadata field IDs and relationship kinds.
   Only entries present in the maintained presentation allowlist may be serialized or shown;
   an unknown authored field remains visible only in complete source text and is not inferred
   as metadata or a relationship.
3. SC-002 includes the standardized filter and item-selection measurements defined in
   Section 10; the 9-of-10 gate applies to both interactions as well as both scan thresholds.
4. Dependency revalidation is a planning gate. Any accepted package or version change synchronizes all
   dependency-baseline-bearing English/Japanese design and task artifacts and reruns planning plus task
   generation before implementation proceeds.
5. The SC-002 environment is a checked-in versioned published profile with an objective
   current-request status stop condition; private local-machine identity is not part of the
   contract.
6. Origin-file-less hosted/runtime inputs are bounded, evidence-linked Source Condition Facts
   attached to the relevant Source. They create no file/path/source text/comparison target,
   grant no read authority, perform no local or hosted I/O, and retain unobserved current state
   as conditional or unavailable.
7. The maintainer team owns the initial-release participant study, funding, support, privacy,
   accessibility, and bounded review protocol. Ordinary contributors do not carry those
   obligations.
8. `engines.node` is the complete Node 24/26 runtime compatibility range; the six exact floor
   jobs are lower-bound certification samples and Node 24.18.0 is the development/build
   baseline. The pinned three Playwright revisions are the automated browser-certification
   baseline, while the startup helper delegates to an unverified OS default handler and always
   retains the printed/manual-open fallback.

**Rationale**: These rules make the child-process boundary, presentation scope, performance
denominator, runtime-fact model, participation ownership, compatibility/certification split,
and dependency baseline independently testable without weakening the existing security or
documentation-parity requirements.

**Alternatives considered**: Treating browser launch as part of customization-derived
execution, inferring metadata from arbitrary authored keys, keeping the interaction target
as an untracked plan-only goal, and patching versions only in `package.json` were rejected
because each creates a contradiction or a second undocumented contract.
