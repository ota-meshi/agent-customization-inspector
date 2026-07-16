# Phase 0 Research: Inspect Agent Customizations

[日本語](research.ja.md)

**Researched**: 2026-07-15
**Scope**: Reference architecture, current compatible toolchain, safe local-host design,
parsing and masking, source/metadata comparison, bounded scanning, and the official
customization path surface

## 1. Package architecture

**Decision**: Use one publishable ESM package with `app/`, `src/`, `shared/`, `tests/`,
`bin.mjs`, and one `dist/` tree. Nuxt owns the client build; tsdown owns the Node CLI
bundle. A Rust/Node-API addon owns inspected-source enumeration/read, while its prebuilt
`.node` assets remain outside tsdown's JS bundle. Only typed inert DTOs cross into the browser.

**Rationale**: The UI and CLI form one product, share one release version, and are both
required by every `npx` launch. A single package keeps installation and release atomic
while the `app`/`src`/`shared` boundaries prevent browser code from gaining filesystem
access. Build orchestration cleans only package-owned output trees, lets Nuxt write its
standard `.output/public` staging tree, validates and copies accepted assets to
`dist/public`, copies all eight CI-verified native artifacts, and lets tsdown write the
named CLI/Worker entries and any code-split chunks into a separate clean `.build/server`
staging tree. Fixed manifests close all three output classes before they are copied or
packed; a minimal `bin.mjs` imports the CLI without creating independently versioned
packages.
The executable shim starts with the exact BOM-free, LF-terminated first line
`#!/usr/bin/env node`; this is part of the package contract, not a release-time repair.

A contributor may build and race-test only the current native target, but that output is a
matrix input rather than a publishable package. Full build/package acceptance intentionally
requires the eight target jobs; a missing target cannot be hidden by a local-only release.

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

Build/test the closed eight native targets in a CI matrix, copy only verified artifacts to
`dist/native/<targetId>/safe-fs.node`, and write `dist/native/manifest.json`. Configure
tsdown with named entries
`{ cli: 'src/cli.ts', 'parser-worker': 'src/inspection/parsers/worker.ts' }`, Node ESM,
`fixedExtension: true`, disabled source maps/declarations, a clean `.build/server` output,
and `deps.skipNodeModulesBundle: true`. A fixed assembler accepts only safe regular `.mjs`
outputs, requires `cli.mjs` and `parser-worker.mjs`, records every code-split chunk in
`dist/manifests/server-assets.json`, and copies exactly those outputs into `dist/`. The host
constructs the parser Worker only from the fixed package-owned
`new URL('./parser-worker.mjs', import.meta.url)`; inspected data can never select a module
or Worker URL.

Before packing, recursively compare `dist/` with the exact set derived from all three
manifests and reject missing, stale, unexpected, linked, or non-regular paths. Set
`package.json.files` exactly to
`["bin.mjs", "dist", "README.md", "README.ja.md", "LICENSE"]`; npm's automatic
`package.json` plus those entries are the complete tarball allowlist. Set `package.json.bin`
exactly to `{ "agent-customization-inspector": "bin.mjs" }` and omit `main`, `module`, and
`exports` because the package has no library API. Use no install script, runtime download,
or end-user compilation. Keep runtime packages declared under exact `dependencies` so
`npx` installs auditable versions; tsdown bundles project-owned modules and shared
contracts, not arbitrary transitive packages or native binaries.

**Rationale**: Separate clean staging trees avoid relying on cross-tool `clean: false` and
make stale-output rejection mechanical. Leaving node_modules external avoids silently inlining platform-sensitive or changing
transitive code and makes the package manifest describe what the CLI loads. The
[tsdown dependency documentation](https://tsdown.dev/options/dependencies) distinguishes
external dependencies from explicit `alwaysBundle` behavior, and its
[entry documentation](https://tsdown.dev/options/entry) defines the named multi-entry
form. A tarball smoke test is the reliable proof that the web, CLI, parser Worker, and
exact native-target output parts are included and load from their packaged locations.
It installs the tarball into an isolated fixture and actually invokes the executable with
`npx --no-install`, rather than merely inspecting the `bin` mapping; the exact shebang and
executable mode are asserted before launch.
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
The runtime resolves this manifest from `import.meta.url`, strictly validates it, and
verifies every listed asset's size and hash before bind; no unlisted path is served.

`dist/manifests/server-assets.json` is strict JSON of at most 1 MiB with exact keys
`manifestVersion: 1`, `packageVersion`, and an ordered 2..256-record `assets` array. Each
record is exactly `{ file, byteLength, sha256 }`; safe relative `.mjs` paths are sorted and
unique, total listed bytes are at most 64 MiB, each file is at most 16 MiB, and
`cli.mjs`/`parser-worker.mjs` are required. Every code-split tsdown output is listed. A
final recursive verifier derives the only legal `dist/` files from this manifest plus the
static and native manifests, rejecting any stale/unexpected/link/non-regular path before
packing and applying the same proof to the unpacked tarball.

`dist/native/manifest.json` is strict JSON of at most 64 KiB with no extra keys. It has
`manifestVersion: 1`, the exact `packageVersion`, `nativeAbiVersion: 1`,
`nodeApiVersion: 10`, and an ordered eight-entry `targets` array for `darwin-x64`,
`darwin-arm64`, `win32-x64`, `win32-arm64`, `linux-x64-gnu`, `linux-arm64-gnu`,
`linux-x64-musl`, and `linux-arm64-musl`. Each entry is exactly
`{ targetId, file, byteLength, sha256 }`; `file` is `<targetId>/safe-fs.node`, and the size
and hash follow the same closed rules. The loader compares the manifest package version
with the version embedded from `package.json`, requires custom ABI 1 and process Node-API
support of at least 10, selects one exact target, verifies its bytes, loads it, and checks
the addon's reported ABI and self-test. The official
[Node-API version matrix](https://nodejs.org/api/n-api.html#node-api-version-matrix)
documents Node-API 10 support in the selected Node baseline. Linux uses a well-formed
`process.report`: a non-empty `header.glibcVersionRuntime` selects GNU, absence of that
field selects the musl candidate, and an unavailable or malformed report is unsupported.
No alternate target/libc/filename probing or fallback occurs.

**Alternatives considered**:

- Bundling all runtime dependencies was rejected for the initial release because it makes
  dependency/license auditing and native/platform behavior less visible.
- Separate published UI and CLI package roots were rejected because one manifest-closed
  `dist/` matches the release boundary; isolated staging roots are still used for clean assembly.
- A hosted snapshot command was rejected because it would persist local customization
  text and could embed secrets in deployable assets.

## 3. Latest compatible stable dependency baseline

**Decision**: Pin exact versions in `package.json` and `pnpm-lock.yaml`, using pnpm 11.13.0.
“Latest” means the newest stable version compatible with the selected Nuxt/Vue toolchain,
not a prerelease or an incompatible major. Re-run the same registry compatibility check
immediately before creating the first lockfile.

| Area | Selected version | Reason |
|---|---:|---|
| Node.js | 24.18.0 Active LTS baseline | Nuxt recommends an active LTS for production; package engines also accept supported Node 26+ |
| TypeScript | 6.0.3 | Newest compiler supported by the current Vue/Volar and typescript-eslint toolchain |
| Nuxt / Vue | 4.4.8 / 3.5.39 | Current stable releases |
| Vue Router | 5.2.0 | Current stable release; satisfies Nuxt 4.4.8's declared `^5.1.0` range; no separate router abstraction |
| tsdown | 0.22.8 | Current stable release; supports Node 24.11+ |
| Vite | 7.3.6 | Newest version in Nuxt 4.4.8's declared `^7.3.3` builder range |
| pnpm | 11.13.0 | Current stable package manager |
| CLI/browser open | `cac` 7.0.0 / `open` 11.0.0 | Small, current, ESM-compatible dependencies |
| Parsers | `yaml` 2.9.0, `jsonc-parser` 3.3.1, `smol-toml` 1.7.0 | Current stable inert data parsers |
| Source view/diff | `monaco-editor` 0.55.1 | Current stable read-only source and diff editor; its own diff engine avoids a duplicate client dependency |
| Lint | ESLint 10.7.0, `@nuxt/eslint` 1.16.0 | Current compatible stable releases |
| Unit/integration | Vitest and coverage-v8 4.1.10, Nuxt Test Utils 4.0.3 | Exact matching Vitest/coverage versions; Nuxt-supported test harness |
| Components/DOM | Vue Test Utils 2.4.11, happy-dom 20.10.6 | Current releases satisfying Nuxt Test Utils peers |
| Browser/a11y | Playwright 1.61.1, `@axe-core/playwright` 4.12.1 | Current stable browser and accessibility tooling |
| Types | `@types/node` 24.13.3, `vue-tsc` 3.3.7 | Latest compatible types for the Node 24 baseline and Vue |
| Native toolchain | Rust 1.97.0, `@napi-rs/cli` 3.7.3 | Current stable compiler and Node-API build CLI; development/release only |
| Native crates | `napi` 3.10.5, `napi-derive` 3.5.9, `napi-build` 2.3.2 | Current stable Node-API bindings/build support |
| Capability I/O | `cap-std` 4.0.2, `cap-fs-ext` 4.0.2, `rustix` 1.1.4, `windows-sys` 0.61.2 | Current stable root-handle/no-follow and OS primitive support |

Primary version evidence is the npm registry for
[Nuxt](https://www.npmjs.com/package/nuxt), [Vue](https://www.npmjs.com/package/vue),
[Vue Router](https://www.npmjs.com/package/vue-router),
[tsdown](https://www.npmjs.com/package/tsdown),
[TypeScript](https://www.npmjs.com/package/typescript),
[Vite](https://www.npmjs.com/package/vite), [pnpm](https://www.npmjs.com/package/pnpm),
[Monaco Editor](https://www.npmjs.com/package/monaco-editor),
[Vitest](https://www.npmjs.com/package/vitest), and
[Playwright](https://www.npmjs.com/package/@playwright/test). Node's official
[release status](https://nodejs.org/en/about/previous-releases) and
[Node 24 archive](https://nodejs.org/en/download/archive/v24) establish the LTS baseline
and exact release. Monaco's official
[v0.55.1 release](https://github.com/microsoft/monaco-editor/releases/tag/v0.55.1)
establishes the selected stable editor version.
Rust's official [1.97.0 release](https://blog.rust-lang.org/releases/latest/), the
[`@napi-rs/cli` registry](https://www.npmjs.com/package/@napi-rs/cli), and current
[`napi`](https://docs.rs/crate/napi/latest),
[`cap-std`](https://docs.rs/crate/cap-std/latest), and
[`cap-fs-ext`](https://docs.rs/crate/cap-fs-ext/latest) records establish the native
baseline. `rust-toolchain.toml`, `Cargo.lock`, `package.json`, and `pnpm-lock.yaml` pin it.

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
   matcher separates Base, Relative selector, and Expansion, is rendered from the exact
   launch root with `./`, and rejects a bare `**/`. `./**/` denotes explicit downward
   Inspector descendant inventory only; it never asserts vendor traversal.
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

Bounded derivation remains a typed single-edge provenance graph with fan-out limits, not
arbitrary reference following. A derived provenance cannot seed another edge, while an
independent static provenance on the same physical file remains eligible. It admits only
safe Codex fallback basenames, Codex skill UI metadata, and vendor-specific plugin
manifests below validated local marketplace roots. Agent memory, arbitrary role-config
targets, plugin components, imports, other arbitrary component/config paths, skill
resources, scripts, assets, remote sources, and MCP-server-provided instructions remain
relationships or exclusions.

**Rationale**: Re-auditing current official documentation exposed several places where the
previous combined table made an Inspector matcher look like vendor lookup behavior:

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
- One `certainty` enum was rejected because documentation maturity, authored versus
  installed state, trust, enablement, selection, and runtime applicability are orthogonal.

## 5. Filesystem and scan safety

**Decision**: Make `native/safe-fs` the sole inspected-source I/O backend. It opens the
Repository's process `.` once as a non-serializable root capability before server bind;
after digest-bound consent it opens each eligible Global root from its filesystem/volume
root by a no-follow component walk. Bounded native enumeration counts every entry, skips
VCS internals, symlinks, mount crossings, and Windows reparse points, and returns internal
`EntryTicket` objects rather than ambient paths. The rule engine classifies normalized
ticket paths. A candidate read accepts only a ticket, resolves again from the retained root,
requires enumeration/final-handle identity agreement and a regular file, enforces size,
checks pre/post metadata, and reads bytes through that same final handle. Canonical strings
are diagnostic data, never authority.

Linux requires `openat2` with `RESOLVE_BENEATH`, `RESOLVE_NO_SYMLINKS`,
`RESOLVE_NO_MAGICLINKS`, and `RESOLVE_NO_XDEV`. macOS keeps ancestor handles open during
component-by-component no-follow resolution and rejects mount-identity changes. Windows
uses retained directory handles, rejects every `FILE_ATTRIBUTE_REPARSE_POINT` tag, and
does not permit parent replacement while the chain is open. `cap-std` supplies capability
types, but every intermediate/final component uses the no-follow operations from
`cap-fs-ext`; `rustix` and `windows-sys` expose the required OS checks. A missing,
unsupported, corrupt, or failed-self-test addon has no pure-Node fallback and stops before
server bind. A Global-root-only failure disables that boundary without losing Repository
results.

**Rationale**: Merely matching a glob, checking `realpath`, or comparing `FileHandle.stat`
is not proof that the opened handle remains below a root after a parent swap. Node 24's
[filesystem API](https://nodejs.org/docs/latest-v24.x/api/fs.html#file-system-flags) exposes
neither directory-handle-relative open nor `openat2`; POSIX `O_NOFOLLOW` covers only the
final component, and Windows has no corresponding Node flag. Node also warns against
separate access checks followed by open. Its
[Permission Model](https://nodejs.org/docs/latest-v24.x/api/permissions.html#limitations-and-known-issues)
may follow an allowlisted symlink outside the permitted path, and
[WASI](https://nodejs.org/docs/latest-v24.x/api/wasi.html#security) is not a filesystem
security boundary. The native design instead follows the capability/no-follow primitives
documented by [cap-std](https://github.com/bytecodealliance/cap-std),
[cap-fs-ext](https://docs.rs/cap-fs-ext/latest/cap_fs_ext/trait.DirExt.html), Linux
[`openat2`](https://man7.org/linux/man-pages/man2/openat2.2.html), and Windows
[handle attribute APIs](https://learn.microsoft.com/en-us/windows/win32/api/winbase/ns-winbase-file_attribute_tag_info).
One bounded walker also provides entry/depth/deadline accounting and progress.

**Alternatives considered**:

- Pure `node:fs`, `realpath`/`lstat` before open, Permission Model, WASI, and Linux
  `/proc/self/fd` techniques were rejected because none proves the same cross-platform
  opened-handle containment; precheck-then-open is TOCTOU.
- `tinyglobby` alone was rejected because path traversal cannot provide the root-handle
  object capability or complete accounting needed for the scan contract.
- Following symlinks that currently resolve inside the source was rejected because parent
  swaps and aliases complicate the boundary and physical-file identity.
- Install-time compilation/download was rejected because `npx` must not execute an
  unreviewed installer or fetch a platform binary; release-tested prebuilds fail closed.
- Failing the entire scan on one unsafe or changed file was rejected because FR-028
  requires unaffected results to remain usable.

## 6. Parsing, masking, and inert display

**Decision**: Treat source bytes as authoritative. Decode supported text strictly, mask
credential patterns and values under known secret-bearing keys before emitting DTOs, then
perform best-effort metadata extraction. YAML uses core schema with no custom tags and
disabled aliases; JSONC extracts known paths from a syntax tree; TOML values are normalized
to JSON-safe data; Markdown/frontmatter and Claude imports are scanned as text. Fixed
linear mask detectors allow at most 4,096 matches and 2 MiB masked UTF-8 output per file;
overflow withholds the entire source and metadata rather than returning a possibly exposed
suffix. At most two V8-limited parser workers enforce a 2,000 ms per-recognition timeout,
depth 64, 50,000 nodes, 64 KiB scalars, and 512 metadata entries. A parser limit discards
that recognition's whole extraction result. Rules, scripts, markup, URLs, and control
sequences are never evaluated or rendered.

**Rationale**: Parsing is needed to label declarations and relationships, but success must
not turn the inspector into a validator and failure must not hide safe raw text. Keeping raw
values on the Node side means masking is not merely cosmetic in browser developer tools.
Monaco receives masked model text rather than rendered markup, metadata uses Vue text
bindings, and links are disabled. Together with a restrictive content security policy,
inspected markup cannot load or navigate.

**Alternatives considered**:

- Dynamic import, `jiti`, TOML/YAML custom constructors, Starlark evaluation, and MCP
  probing were rejected as execution.
- Sending raw source and masking only in Vue was rejected because all secrets would remain
  exposed in API payloads and browser memory.
- Zod was not added: request commands are small closed shapes and strict manual guards are
  simpler; it would not secure filesystem input.

## 7. Source and metadata comparison UI

**Decision**: Client-only lazy-load the ESM build of `monaco-editor` on file/compare routes
for read-only single-file source views and masked source comparison. Import only the editor
worker and required basic-language contributions; let Nuxt/Vite emit same-origin assets
and do not ship unused language-service workers. Models use opaque in-memory URIs, hold
masked source only, and are disposed separately from their editor and subscriptions on
route close, selection replacement, source disable, or generation replacement. Configure
`readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
`renderMarginRevertIcon: false`; keep `accessibilitySupport: 'auto'`, enable
`accessibilityVerbose`, and give every source side an `ariaLabel`. The CSP permits
Monaco's generated inline layout/theme styles and only Nuxt executable inline scripts
whose exact hashes are in the trusted build manifest; it permits no executable attribute,
evaluation, nonce, unrecorded inline script, external worker, or blob worker. Attempt diff
highlighting only when each side has at most 20,000 lines, with an explicit 5,000 ms
computation timeout; retain complete read-only side-by-side source with a diagnostic when
either limit is reached. Recognition metadata is compared by typed field identity and
rendered as Vue rows/badges, not converted to JSON text for Monaco. Preserve Monaco's
accessible diff viewer, ARIA labels, keyboard navigation, and narrow-screen inline mode
for explicit accessibility testing.

**Rationale**: Source files include Markdown and structured configuration where syntax
coloring, line navigation, virtualized rendering, search, synchronized scrolling, and a
well-tested diff surface materially improve inspection. Monaco already computes source
differences and exposes file-size, computation-time, and accessibility controls, so a
second text-diff package would duplicate responsibility. Metadata has domain semantics:
set-like recognitions, ordered precedence, and fields with stable identities must be
compared structurally rather than as serialized lines. The official
[diff editor options](https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IDiffEditorOptions.html)
and [Monaco repository](https://github.com/microsoft/monaco-editor) document those editor,
worker, accessibility, and model-lifecycle capabilities. Exact version pinning and the
packaged browser tests protect the deliberately narrow ESM imports during upgrades.

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
oversized input or any post-consent canonical alias difference before enumeration.

**Rationale**: Loopback binding alone does not address browser-origin requests or DNS
rebinding. A fragment is not sent in the initial HTTP request; JavaScript can transfer it
to a custom authorization header and remove it from visible history. Refusing browser
storage makes refresh behavior explicit without creating ambient credentials. Digest-
bound preview consent proves which lexical roots and patterns the user saw before the host
touches them. Oversized input becomes a fixed `oversized`/null-display state before
normalization, so hostile environment size cannot cause an unbounded consent DTO or
authorize a hidden value. `node:http` avoids a server framework for a small fixed route set; the current H3 v2 tag is a release candidate while
stable H3 v1 is a larger legacy dependency.

**Alternatives considered**:

- Unauthenticated RPC was rejected because customization files can contain secrets.
- A cookie-only or query-string token was rejected because ambient cookies invite CSRF and
  query values appear in request logs/history.
- General `--host` support and CORS were rejected because remote access is out of scope.

## 9. Atomic generations, rescan, and resource limits

**Decision**: Start the Repository scan automatically, expose progress through the session
snapshot, and perform later Repository or enabled-Global scans only on explicit user action.
Create a legal empty zero-I/O bootstrap generation 0 synchronously before the automatic
Repository command, with null source progress until work is queued. A single coordinator
serializes every Repository/Global scan and Global-disable transaction. Ordinary scans are
FIFO. Global disable is a priority security barrier: it aborts and discards any active
uncommitted transaction, cancels queued Global work, performs the zero-I/O removal next,
and requeues an interrupted Repository command once behind that removal. Repeated disable
joins an already queued/active barrier; with no Global enabled flag, consent, nonempty
graph, open capability, or scan/enable command it is a no-op regardless of Repository
work. Each scan job starts
from the current session-wide generation, carries the unscanned source under the remaining
shared file/byte/diagnostic budgets, and builds a replacement separately. Atomically commit
only a complete or bounded-partial result as the next generation, rekeying every source
graph and invalidating all file IDs, comparisons, and reveals. Enforce the limits recorded
in the plan and shared contract.

**Rationale**: Global serialization plus atomic session generations prevent lost updates
and mixed old/new results and make reveal cleanup observable. A fatal attempt leaves the
prior generation—including bootstrap 0—untouched and uses the capped out-of-generation session diagnostic
channel. A fatal Global enable/rescan retains its exact consent, accepted boundaries, open
capabilities, and prior graph so explicit retry/disable stays possible. A 30-second hard deadline prevents hangs while the performance acceptance
target remains 10 seconds. One MiB per file and 32 MiB total permit 500 normal
customization files without retaining unbounded content. Per-file mask-output caps fail
closed instead of risking a partially scanned suffix, while killable V8-limited workers
bound synchronous parser time and tree amplification. Source comparison is separately
bounded by 20,000 lines per file and a 5,000 ms Monaco computation timeout; a capped or
timed-out comparison still receives full masked side-by-side views and a diagnostic rather
than becoming non-comparable.

**Alternatives considered**:

- Automatic watch/rescan was rejected because it creates implicit reads and reveal-state
  races not required by FR-030.
- Incrementally mutating the active result was rejected because consumers could observe a
  mixture of generations.
- Concurrent per-source commits were rejected because a single generation number and
  generation-scoped IDs would otherwise require conflict-prone commit-time rebasing.
- Unlimited scan, parse, relationship, and comparison work was rejected as unsafe for
  untrusted repositories.

## 10. Verification strategy

**Decision**: Maintain vendor conformance fixtures and negative near-misses, plus
adversarial fixtures for links, races, encodings, limits, secrets, imports, executable
declarations, and malformed formats. Test pure recognizers/parsers/maskers, the HTTP
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
FR-015 through FR-018.
Run native integration/race tests on every advertised OS/architecture/libc target, including
parent replacement, final-component replacement, root rename, mount/reparse rejection,
identity mismatch, addon corruption/absence, and post-pack load. Test-only race barriers
must not be exported by the production addon.
Instrument tests to fail if inspected content causes an outbound request, MCP connection,
child process, dynamic evaluation, or source mutation.

**Rationale**: The constitution treats passing tests as evidence rather than proof, so the
suite combines objective automation with full-diff review, manual accessibility checks,
documentation parity checks, and a release tarball inspection.

**Alternatives considered**:

- Snapshot-only tests were rejected because they do not prove negative security behavior.
- Browser tests without unit/contract coverage were rejected because failures would be
  slow and hard to localize.
- Coverage percentage alone was rejected because it does not demonstrate the named
  boundary and non-execution invariants.
