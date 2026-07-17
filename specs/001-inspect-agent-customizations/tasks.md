# Tasks: Inspect Agent Customizations

[日本語](tasks.ja.md)

**Input**: Design documents from `/specs/001-inspect-agent-customizations/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Every behavioral change requires risk-appropriate automated tests before implementation. Tests cover unit, contract, integration, package, security, performance, browser, boundary, accessibility, and regression behavior.

**Organization**: Tasks follow visible delivery increments and three explicit Repository priority waves rather than completing one whole user story horizontally. After the bootable shell, the order is Skills → Instructions → MCP; then Rules → Commands → Prompts → Custom Agents; then Settings/Configuration → Output Styles → Marketplaces → Plugin Manifests → Hooks. Story labels retain canonical traceability: `[US1]` discovery, `[US2]` safe detail, `[US3]` comparison, and `[US4]` Global inspection. Owner-dependent MCP integrations are implemented as dormant, owner-agnostic contracts in the MCP wave and become visible when the corresponding later owner family is admitted; every phase still has one independently testable checkpoint.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel after stated prerequisites because it uses different files and has no dependency on another incomplete task.
- **[Story]**: Required for Phases 3–101; omitted only in Setup, Minimal Secure Foundation, and Phases 102–104.
- Every checklist item has one primary outcome and at least one exact file path.

---

## Phase 1: Setup

**Purpose**: Establish the reproducible Node.js-only package and development entry points.

**Independent Test**: Install the frozen dependency graph and confirm that every configured local command and CI entry point resolves without requiring Rust, a native compiler, an install-time build, or an artifact download.

**Visible Checkpoint**: Contributors can install the project and run the empty build/test toolchain.

- [ ] T001 Revalidate and pin the supported Node.js engine, `pnpm@11.13.0`, runtime dependencies, development dependencies, and frozen lockfile in `package.json` and `pnpm-lock.yaml`
- [ ] T002 Define `bin` as only `agent-customization-inspector: bin.mjs`, `files` as only `bin.mjs`, `dist`, `README.md`, `README.ja.md`, and `LICENSE`, omit `main`/`module`/`exports`, and prohibit lifecycle build/download hooks in `package.json`
- [ ] T003 Add formatting, linting, type-checking, unit, contract, integration, security, package, performance, coverage, documentation, and browser commands in `package.json`
- [ ] T004 Synchronize the verified dependency baseline and runnable commands in `specs/001-inspect-agent-customizations/research.md`, `specs/001-inspect-agent-customizations/research.ja.md`, `specs/001-inspect-agent-customizations/plan.md`, `specs/001-inspect-agent-customizations/plan.ja.md`, `specs/001-inspect-agent-customizations/quickstart.md`, and `specs/001-inspect-agent-customizations/quickstart.ja.md`
- [ ] T005 [P] Configure the Nuxt SPA, static Nitro preset, root-absolute assets, disabled CDN, and explicit imports and components in `nuxt.config.ts`
- [ ] T006 [P] Configure strict application, shared, source, script, and test type checking in `tsconfig.json`
- [ ] T007 [P] Configure TypeScript, Vue, Node.js, and test linting while excluding generated output in `eslint.config.js`
- [ ] T008 [P] Configure unit, contract, integration, security, package, performance, and coverage projects in `vitest.config.ts`
- [ ] T009 [P] Configure deterministic browser and accessibility projects in `playwright.config.ts`
- [ ] T010 [P] Configure named Node ESM `cli` and `parser-worker` entries with fixed `.mjs` output, bundled project modules, external declared dependencies, disabled maps/declarations, and clean `.build/server` staging in `tsdown.config.ts`
- [ ] T011 [P] Create the BOM-free executable Node.js shim with the exact shebang and one `dist/cli.mjs` import in `bin.mjs`
- [ ] T012 [P] Ignore only dependency and generated Nuxt, server, distribution, coverage, Playwright, and Node.js build outputs in `.gitignore`
- [ ] T013 Add independent formatting, linting, type-checking, unit, contract, integration, security, package, performance, documentation, coverage, and browser jobs in `.github/workflows/ci.yml`
- [ ] T014 Add supported Node.js engine and Linux/macOS/Windows placeholders that will consume one platform-independent artifact in `.github/workflows/ci.yml`

---

## Phase 2: Minimal Secure Foundation

**Purpose**: Implement only the contracts and security boundaries that must exist before any browser session or Repository read.

**Independent Test**: Verify bounded DTOs and diagnostics, exact package manifests, capability classification, the central Node.js filesystem authority, and generation-zero state without launching a product workflow.

**Visible Checkpoint**: Security and package foundations pass independently, while no vendor matcher or inspected-source read exists outside the central authority.

### Tests and fixtures

- [ ] T015 [P] Add failing exact-limit, at-limit, one-over, and bounded-counter tests in `tests/unit/shared/limits.test.ts`
- [ ] T016 [P] Add failing tests for the closed diagnostic registry, deterministic aggregation, four overflow sentinels, and secret-safe arguments in `tests/unit/shared/diagnostics.test.ts`
- [ ] T017 [P] Add failing tests for public entity shapes, opaque generation-scoped IDs, versioned API envelopes, strict request guards, and rejection of internal authority records in `tests/unit/shared/entities.test.ts` and `tests/unit/shared/api.test.ts`
- [ ] T018 Create deterministic cross-platform fixtures for links, junctions, non-regular entries, deep trees, VCS internals, injected replacement checkpoints, effective `O_NOFOLLOW`, unverifiable checks, and `platform-unobservable` outcomes in `tests/fixtures/adversarial/build-filesystem-fixtures.ts`
- [ ] T019 Add failing root-context and enumeration tests for lexical rejection before I/O, component `lstat`, canonical containment, bigint identity, bounded `opendir`, segment validation, VCS exclusion, and detectable device changes in `tests/unit/inspection/node-safe-fs.test.ts`
- [ ] T020 Add failing ticket/read tests for private generation binding, one-time use, client-path rejection, and root plus every available ancestor followed by candidate `lstat` → `realpath` containment → repeated unchanged `lstat` at enumeration, pre-open, post-open/pre-read, and post-read in `tests/unit/inspection/node-safe-fs.test.ts`
- [ ] T021 Add failing boundary tests for same-handle identity, replacement at every checkpoint, byte disposal, effective `O_NOFOLLOW`, source-attempt rejection for shared-boundary unverifiability, item rejection for candidate unverifiability, and non-proving platform records in `tests/integration/boundaries/node-safe-fs.test.ts`
- [ ] T022 Add a failing architectural contract that rejects every inspected-source filesystem read outside the central authority in `tests/contract/inspection-io-boundary.test.ts`
- [ ] T023 [P] Add failing capability tests for 256-bit authentication, constant-time comparison, Host/Origin/fetch-metadata checks, no CORS, strict methods and media, 64-KiB bodies, no-store responses, and secret-safe errors in `tests/contract/host-security.test.ts`
- [ ] T024 [P] Add failing cleanup and static-manifest tests for root confinement, exact schema/order/limits/hashes, required-but-removed `200.html`/`404.html`, `index.html` as the only accepted HTML, and rejection of `<base>`, nonces, executable attributes, external/relative executable URLs, unrecorded inline scripts, and stale assets in `tests/package/build-cleanup.test.ts` and `tests/package/static-manifest.test.ts`
- [ ] T025 [P] Add failing server-manifest and package-policy tests for exact `.mjs` records, required CLI/Worker entries, the recursively exact two-manifest set, and rejection of Rust/Cargo/Node-API/native payloads, prebuilds, and lifecycle/runtime downloads in `tests/package/server-manifest.test.ts` and `tests/package/node-only-policy.test.ts`
- [ ] T026 [P] Add failing generation and session tests for bootstrap generation 0, deterministic IDs, graph invariants, atomic N+1 replacement, fatal retention, ID rekeying, and bounded lifecycle diagnostics in `tests/unit/session/scan-generation.test.ts` and `tests/unit/session/session.test.ts`

### Implementation

- [ ] T027 Implement exact resource constants, bounded counters, the closed diagnostic registry, deterministic aggregation, overflow sentinels, and safe arguments in `shared/limits.ts`, `shared/diagnostics.ts`, and `src/inspection/limits.ts`
- [ ] T028 Implement public DTOs, internal-type exclusion, opaque ID guards, versioned envelopes, and strict manual request guards in `shared/entities.ts` and `shared/api.ts`
- [ ] T029 Implement private `InspectionRootContext` creation with lexical component validation, canonical root capture, bigint identity, and close-state enforcement in `src/inspection/safe-fs.ts`
- [ ] T030 Implement bounded deterministic `opendir` traversal, VCS exclusion, root and every-ancestor checks, ordered candidate validation, and generation-bound `ScanEntryTicket` snapshots in `src/inspection/safe-fs.ts`
- [ ] T031 Implement one-time ticket reads with complete ordered verification at pre-open, post-open/pre-read, and post-read, same-handle identity, effective `O_NOFOLLOW`, byte disposal, no publication, and `node-realpath-fstat-best-effort` receipts in `src/inspection/safe-fs.ts`
- [ ] T032 Implement `safe-fs-boundary-unverifiable` handling that rejects a root/shared ancestor at source scope and a candidate at item scope without guessing in `src/inspection/safe-fs.ts`
- [ ] T033 Document the active-mutator and platform-unobservable residual risk plus the future public Node.js API or OS-enforced boundary resolution path in `src/inspection/safe-fs.ts`
- [ ] T034 Implement capability generation, constant-time authentication, and capability-safe request classification in `src/host/capability.ts`
- [ ] T035 Implement root-confined static normalization that enforces the accepted HTML/URL cases, removes only required fallbacks, validates assets, and records deterministic CSP hashes in `scripts/clean-build-output.mjs` and `scripts/build-static-manifest.mjs`
- [ ] T036 Implement deterministic server-manifest generation and recursive exact-set verification with Node.js-only policy enforcement in `scripts/assemble-server-manifest.mjs` and `scripts/verify-package-files.mjs`
- [ ] T037 Implement deterministic generation construction, atomic replacement, generation 0, fatal retention, and bounded lifecycle diagnostics in `src/session/scan-generation.ts` and `src/session/session.ts`
- [ ] T038 Implement the strict router skeleton with method, media, body, request-key, no-store, and safe-error handling in `src/host/api-router.ts`
- [ ] T039 Add CI execution of the central filesystem authority and Node.js-only package-policy suites without claiming proof for `platform-unobservable` cases in `.github/workflows/ci.yml`

---

## Phase 3: Bootable Authorized Empty Screen

**Purpose**: Deliver the first user-visible product increment without reading the Repository.

**Independent Test**: Install the package, launch from a fixture `cwd`, open the printed loopback URL, authenticate from the one-time fragment, and verify generation 0, an accessible empty shell, and zero inspected-source filesystem reads.

**Visible Checkpoint**: The authorized browser screen starts and displays almost no product content.

### Tests first

- [ ] T040 [P] [US1] Add failing static-route and startup tests for fixed manifest assets, closed SPA fallbacks, exact CSP, supported Node engines, both manifest checks before bind, loopback-only ephemeral binding, and fixed startup failures in `tests/contract/static-routes.test.ts` and `tests/contract/host-startup.test.ts`
- [ ] T041 [P] [US1] Add failing client tests for one-time fragment capture, memory-only Bearer use, authorization-lost reload behavior, zero durable persistence, and zero unauthorized API calls in `tests/unit/app/api-capability.test.ts`
- [ ] T042 [P] [US1] Add failing browser-state tests for authorized polling, generation-zero display, authorization loss, and timer teardown in `tests/unit/app/session-shell.test.ts`
- [ ] T043 [P] [US1] Add failing packaged launch tests for exact shebang/mode/package fields, isolated installation, loopback URL, browser-open fallback, direct shell boot, clean shutdown, rejected extra modes, and zero inspected-source reads in `tests/package/npx-launch.test.ts`
- [ ] T044 [US1] Add failing browser acceptance for the authorized empty shell, authorization-lost shell, keyboard focus, and no Repository picker or ancestor discovery in `tests/e2e/boot.spec.ts`

### Implementation

- [ ] T045 [US1] Implement fixed-manifest asset serving, closed SPA fallbacks, exact MIME validation, and exact CSP serialization in `src/host/static-files.ts`
- [ ] T046 [US1] Implement supported-engine and manifest verification, loopback-only ephemeral binding, and secret-safe server lifecycle in `src/host/server.ts`
- [ ] T047 [US1] Implement capability URL output, automatic browser opening with printed fallback, `--no-open`, extra-mode rejection, launch-`cwd` capture, and graceful shutdown in `src/cli.ts`
- [ ] T048 [US1] Implement one-time capability-fragment capture, memory-only authorization, guarded API requests, and authorization-loss cleanup in `app/composables/api.ts`
- [ ] T049 [US1] Implement authorized generation-zero polling, timer teardown, the accessible empty shell, and semantically equivalent English/Japanese messages in `app/composables/session.ts`, `app/app.vue`, `app/locales/en.ts`, `app/locales/ja.ts`, and `app/styles/main.css`

---

## Phase 4: Codex Skill List

**Purpose**: Deliver the first safe Repository inventory slice for Codex skills.

**Independent Test**: Launch from a fixture containing root and nested `.agents/skills/*/SKILL.md`, near misses, links, malformed names, hard-link aliases, and unrelated files; verify only allowlisted Codex skill rows appear with path, source, kind, and tool.

**Visible Checkpoint**: Users can see a Codex SKILL list, but cannot open file detail yet.

### Fixtures and tests first

- [ ] T050 [US1] Create Codex SKILL fixtures for positive, nested, near-miss, hard-link, malformed-name, linked, oversized, empty, secret-bearing, and performance cases in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T051 [US1] Materialize Codex skill behavior, rule, strategy, and evidence conformance rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T052 [P] [US1] Add failing registry contracts for stable reciprocal IDs, matcher authority separation, evidence grammar, semantic fingerprints, Repository `./` anchoring, and `codex.repo.skill` direct-child semantics in `tests/contract/vendor-behaviors.test.ts` and `tests/contract/inspection-rules.test.ts`
- [ ] T053 [P] [US1] Add failing Codex SKILL matcher tests for `./**/.agents/skills/*/SKILL.md`, descendant inventory, near misses, VCS exclusion, and conditional runtime-chain facts in `tests/unit/inspection/rules.test.ts`
- [ ] T054 [P] [US1] Add failing Codex recognition tests for tool, `skill` kind, path provenance, and absence of unrelated recognitions in `tests/unit/inspection/recognizers.test.ts`
- [ ] T055 [P] [US1] Add failing scan tests for launch-`cwd` admission, ticket-only reads, deterministic order, hard-link aliases, bounded work, isolated item failures, and no relationship-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T056 [P] [US1] Add zero-activation tests proving Codex SKILL discovery causes no child process, dynamic evaluation/import, MCP connection, outbound request, URI load, or inspected-source mutation in `tests/integration/security/zero-activation.test.ts`
- [ ] T057 [P] [US1] Add failing contracts for exactly one launch-`cwd` Repository source, `GET /api/v1/session`, and `POST /api/v1/repository/rescan` with progress, duplicate conflicts, fatal retention, stale IDs, and whole-generation publication in `tests/contract/http-api-session.test.ts`
- [ ] T058 [P] [US1] Add failing inventory tests for Codex rows, source/path/kind labels, progress, empty state, rescan, retry, and diagnostics in `tests/unit/app/inventory.test.ts`
- [ ] T059 [US1] Add failing browser acceptance for launching a Codex-only fixture and seeing the exact SKILL list without source content in `tests/e2e/codex-skills-list.spec.ts`
- [ ] T060 [US1] Add failing Codex skill registry-graph coverage for reciprocal behavior, rule, evidence, and affected-contract references in `tests/contract/vendor-behaviors.test.ts` and `tests/contract/inspection-rules.test.ts`

### Implementation

- [ ] T061 [US1] Implement registry types, closed matcher grammar, reciprocal validation, derivation acyclicity, `./` Repository enforcement, and runtime loading in `src/inspection/rules/types.ts` and `src/inspection/rules/registry.ts`
- [ ] T062 [US1] Add non-authorizing `codex.behavior.repo.skills` and `codex.behavior.user.skills` lookup statements before the skill-discovery strategy references them in `shared/registries/vendor-behaviors.ts`
- [ ] T063 [US1] Add the read-authorizing `codex.repo.skill` record in `shared/registries/inspection-rules.ts`
- [ ] T064 [US1] Add Codex skill evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T065 [US1] Implement `codex.repo.skill` matching in `src/inspection/rules/codex.ts`
- [ ] T066 [US1] Implement path-derived Codex skill recognition without parsing or source exposure in `src/inspection/recognizers/codex.ts`
- [ ] T067 [US1] Implement bounded Repository enumeration, ticket-only verification, deterministic candidate order, hard-link alias aggregation, and diagnostic-only failures in `src/inspection/scan.ts`
- [ ] T068 [US1] Implement automatic first scan, FIFO explicit rescan, dequeue-time generation selection, duplicate rejection, atomic publication, fatal retention, and ID invalidation in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T069 [US1] Implement deterministic Codex skill summaries and Repository rescan responses with opaque IDs, progress, conflicts, stale-resource handling, and safe diagnostics in `src/host/api-router.ts`
- [ ] T070 [US1] Implement generation-aware source/tool/kind/path filters and rescan state in `app/composables/filters.ts` and `app/composables/session.ts`
- [ ] T071 [US1] Implement the accessible Repository header, progress, rescan/retry controls, filters, Codex SKILL list, and item summaries in `app/pages/index.vue`, `app/components/inventory/InventoryFilters.vue`, `app/components/inventory/InventoryList.vue`, and `app/components/inventory/InventoryItem.vue`
- [ ] T072 [US1] Implement actionable diagnostics and a Codex-scope empty state in `app/components/diagnostics/DiagnosticList.vue`
- [ ] T073 [US1] Add semantically equivalent English/Japanese Codex inventory, progress, empty-state, retry, and boundary messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 5: Codex Skill Detail

**Purpose**: Make Codex `SKILL.md` files safely inspectable as masked inert source and bounded typed metadata without yet admitting the separate `agents/openai.yaml` physical candidate.

**Independent Test**: Open hostile, malformed, secret-bearing, changing, and metadata-bearing Codex `SKILL.md` files; verify masked source, bounded frontmatter, one-value reveal, no activation, no relationship expansion, and cleanup on close or rescan.

**Visible Checkpoint**: Selecting a Codex SKILL opens a complete safe detail screen.

### Fixtures and tests first

- [ ] T074 [US2] Extend generated hostile and maintained-secret fixtures for Codex SKILL frontmatter, references, scripts, commands, embedded markup, and credentials in `tests/fixtures/adversarial/build-fixtures.ts` and `tests/fixtures/secrets/build-fixtures.ts`
- [ ] T075 [P] [US2] Add failing strict UTF-8/BOM, inert Markdown/frontmatter, YAML core-schema, no-alias, no-custom-tag, depth-64, 50,000-node, 64-KiB-scalar, and 512-entry tests in `tests/unit/inspection/parsers.test.ts`
- [ ] T076 [P] [US2] Add failing Worker-pool tests for at most two workers, fixed package URL, 64/16/4-MiB V8 limits, two-second timeout, and timeout/crash/resource-exit replacement in `tests/unit/inspection/seed-parsers.test.ts`
- [ ] T077 [P] [US2] Add failing masking tests for maintained credential shapes, secret-bearing keys, deterministic overlaps, 4,096-match and 2-MiB output limits, fail-closed overflow, recursive metadata masking, and safe logs in `tests/unit/inspection/masking.test.ts`
- [ ] T078 [P] [US2] Add failing Codex metadata tests for bounded frontmatter, provenance, conditional discovery, skill resources, and evidence in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T079 [P] [US2] Add failing applicability tests for authored, available, selected, omitted, shadowed, disabled, conditional, and unknown projections without an inferred effective aggregate in `tests/unit/inspection/applicability.test.ts`
- [ ] T080 [P] [US2] Add failing Codex skill-composition tests for runtime-chain conditions, same-name handling, and unknown selection facts in `tests/unit/inspection/codex-composition.test.ts`
- [ ] T081 [P] [US2] Add failing file-detail contracts for masked inert DTOs, strict/stale IDs, no-store behavior, `masking-overflow`, safe diagnostics, and bounded metadata in `tests/contract/http-api-files.test.ts`
- [ ] T082 [P] [US2] Add failing reveal contracts for one-mask responses, ownership, unknown masks, stale IDs, no-store behavior, and zero retained client error state in `tests/contract/http-api-reveals.test.ts`
- [ ] T083 [P] [US2] Add failing direct-detail tests for same-origin Monaco, masked read-only models, exact read-only options, accessibility, and disposal in `tests/package/monaco-assets.test.ts` and `tests/unit/app/source-viewer.test.ts`
- [ ] T084 [P] [US2] Add failing FR-027 app-shell tests for a non-dismissible always-visible warning that masking is non-exhaustive across inventory, detail, comparison, errors, and empty state in `tests/unit/app/masking-warning.test.ts`
- [ ] T085 [US2] Extend zero-activation tests across parsing, metadata extraction, relationships, detail loading, and reveal handling in `tests/integration/security/zero-activation.test.ts`
- [ ] T086 [US2] Add failing browser acceptance for masked Codex detail, metadata, diagnostics, one-value reveal, keyboard use, route cleanup, and rescan cleanup in `tests/e2e/codex-skills-detail.spec.ts`

### Implementation

- [ ] T087 [P] [US2] Implement bounded inert Markdown/frontmatter extraction in `src/inspection/parsers/markdown.ts`
- [ ] T088 [P] [US2] Implement bounded YAML core-schema extraction with aliases and custom tags disabled in `src/inspection/parsers/yaml.ts`
- [ ] T089 [US2] Implement the at-most-two parser Worker pool with fixed package URL, 64/16/4-MiB limits, two-second kill/replace, and fixed secret-safe failures in `src/inspection/parsers/pool.ts` and `src/inspection/parsers/worker.ts`
- [ ] T090 [US2] Implement bounded linear secret detectors, deterministic placeholders, recursive metadata masking, raw isolation, and whole-file `masking-overflow` in `src/inspection/masking/detectors.ts` and `src/inspection/masking/mask.ts`
- [ ] T091 [US2] Implement the closed condition registry, bounded source and assessment facts, and deterministic precedence projection in `src/inspection/applicability/conditions.ts`, `src/inspection/applicability/context.ts`, and `src/inspection/applicability/precedence.ts`
- [ ] T092 [US2] Add Codex skill discovery and selection strategies in `shared/registries/runtime-composition.ts`
- [ ] T093 [US2] Implement relationship-only skill-resource policy without promoting referenced scripts, assets, or arbitrary paths in `src/inspection/rules/codex.ts`
- [ ] T094 [US2] Extend Codex recognition with bounded metadata, provenance-scoped relationships, conditional applicability, and exact evidence in `src/inspection/recognizers/codex.ts`
- [ ] T095 [US2] Integrate verified read, strict decode, complete-file masking, atomic per-recognition parsing, one-edge derivation, and immediate raw-byte disposal in `src/inspection/scan.ts`
- [ ] T096 [US2] Implement generation-owned raw mask values, strict ownership, one-value reveal lookup, zero persistence/logging, and cleanup on file or generation removal in `src/session/session.ts`
- [ ] T097 [US2] Implement `GET /api/v1/files/{fileId}` with strict opaque IDs, masked DTOs, bounded metadata, no-store behavior, diagnostics, and stale responses in `src/host/api-router.ts`
- [ ] T098 [US2] Implement `POST /api/v1/files/{fileId}/reveals` with strict ownership, one-value responses, no-store behavior, and secret-safe errors in `src/host/api-router.ts`
- [ ] T099 [P] [US2] Implement lazy same-origin Monaco, opaque read-only models, exact accessibility options, and complete editor/model/subscription disposal in `app/composables/monaco.ts` and `app/components/inspection/SourceViewer.vue`
- [ ] T100 [US2] Implement the FR-027 non-dismissible non-exhaustive-masking warning as an app-shell component visible on every authorized route in `app/components/diagnostics/MaskingWarning.vue` and `app/app.vue`
- [ ] T101 [P] [US2] Implement typed recognition, provenance, applicability, relationship, and diagnostic presentation in `app/components/inspection/RecognitionDetails.vue` and `app/components/inspection/RelationshipList.vue`
- [ ] T102 [US2] Implement the generation-aware file-detail route, one-value reveal controls, focus handling, and cleanup in `app/pages/files/[id].vue` and `app/components/inspection/MaskRevealControl.vue`
- [ ] T103 [US2] Add semantically equivalent English/Japanese Codex detail, reveal, parser, uncertainty, and always-visible non-exhaustive-masking warning messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 6: Codex Skill Metadata List

**Purpose**: Admit the sibling `agents/openai.yaml` as a separate bounded-derived physical candidate with the `skill metadata` kind.

**Independent Test**: Scan skills with present, absent, orphaned, linked, escaping, duplicated, and misplaced `agents/openai.yaml` siblings; verify each independently admitted `SKILL.md` seed has exactly one fixed sibling target, derived seeds are prohibited, absent targets create no candidate, and every admitted physical candidate is read once.

**Visible Checkpoint**: Users can see independently identified Codex skill-metadata files without confusing them with their seed `SKILL.md` files.

### Fixtures and tests first

- [ ] T104 [US1] Add positive, absent, orphan, linked, escaping, duplicate, hard-link, misplaced, and derived-seed Codex skill-metadata fixtures for the one fixed sibling target in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T105 [US1] Materialize the `codex.derived.skill-metadata` rule, provenance, evidence, and `skill metadata` recognition rows in `tests/fixtures/conformance/inspection-rules.json` and `tests/fixtures/conformance/official-sources.json`
- [ ] T106 [P] [US1] Add failing registry tests for a single bounded-derived edge from an independently admitted Codex `SKILL.md`, literal sibling `agents/openai.yaml`, and prohibition on derived seeds in `tests/contract/inspection-rules.test.ts`
- [ ] T107 [US1] Add failing bounded-derivation tests for exactly one fixed sibling `agents/openai.yaml` target per independently admitted seed, one-edge depth, absent-target no-candidate behavior, orphan and derived-seed rejection, and no misplaced, escaping, or linked candidate reads in `tests/integration/repository-scan.test.ts`
- [ ] T108 [P] [US1] Add failing recognition and inventory tests for separate physical IDs, `skill metadata` kind filtering, seed provenance, deterministic order, hard-link aliases, and read-once publication in `tests/unit/inspection/recognizers.test.ts` and `tests/unit/app/inventory.test.ts`
- [ ] T109 [US1] Add browser acceptance for Codex skill-metadata rows, seed provenance, orphan absence, diagnostics, and unchanged SKILL rows in `tests/e2e/codex-skill-metadata-list.spec.ts`

### Implementation

- [ ] T110 [US1] Add the bounded-derived `codex.derived.skill-metadata` registry record and reciprocal evidence references in `shared/registries/inspection-rules.ts` and `shared/registries/official-sources.ts`
- [ ] T111 [US1] Implement `codex.derived.skill-metadata` as exactly one fixed sibling target per independently admitted seed with one-edge depth, absence as no candidate, containment checks, and orphan, derived-seed, misplaced, escaping, and linked-target rejection in `src/inspection/rules/codex.ts`
- [ ] T112 [US1] Implement path-derived Codex `skill metadata` recognition with seed provenance and no inherited SKILL identity in `src/inspection/recognizers/codex.ts`
- [ ] T113 [US1] Integrate deterministic one-edge admission, one verified read per metadata file, alias aggregation, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T114 [US1] Extend inventory kind filters, rows, and seed summaries for Codex skill metadata in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T115 [US1] Add semantically equivalent English/Japanese Codex skill-metadata inventory and derivation messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 7: Codex Skill Metadata Detail

**Purpose**: Add masked source and bounded typed detail for each admitted `agents/openai.yaml` candidate.

**Independent Test**: Open valid, malformed, secret-bearing, changing, and oversized metadata candidates; verify bounded YAML extraction, seed provenance, recursive masking, stale handling, one-value reveal, zero activation, and cleanup on file or generation removal.

**Visible Checkpoint**: Selecting `agents/openai.yaml` opens a safe detail screen distinct from the owning SKILL detail.

### Tests first

- [ ] T116 [P] [US2] Add failing Codex skill-metadata tests for allowlisted UI fields, seed provenance, unknown fields, malformed YAML, resource limits, and exact evidence in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T117 [P] [US2] Add failing file-detail, reveal, masking-overflow, stale-ID, and zero-retention contracts for the `skill metadata` kind in `tests/contract/http-api-files.test.ts` and `tests/contract/http-api-reveals.test.ts`
- [ ] T118 [P] [US2] Add failing zero-activation and non-following relationship tests for metadata commands, assets, resources, scripts, URIs, and arbitrary paths in `tests/integration/security/zero-activation.test.ts`
- [ ] T119 [US2] Add browser acceptance for masked skill-metadata detail, seed provenance, diagnostics, reveal cleanup, keyboard use, and rescan cleanup in `tests/e2e/codex-skill-metadata-detail.spec.ts`

### Implementation

- [ ] T120 [US2] Extend Codex recognition with bounded `agents/openai.yaml` fields, recursive masking, seed applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/codex.ts`
- [ ] T121 [US2] Integrate atomic YAML extraction, relationship-only targets, raw-byte disposal, and generation-owned mask cleanup for skill metadata in `src/inspection/scan.ts` and `src/session/session.ts`
- [ ] T122 [US2] Extend typed detail presentation for skill-metadata fields and seed provenance in `app/components/inspection/RecognitionDetails.vue` and `app/components/inspection/RelationshipList.vue`
- [ ] T123 [US2] Add semantically equivalent English/Japanese skill-metadata detail, masking, relationship, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 8: Claude Skill List

**Purpose**: Add Claude skills without regressing the completed Codex list and detail.

**Independent Test**: Launch a fixture containing `.claude/skills/*/SKILL.md`, near misses, links, duplicate names, and Codex skills; verify the expected Claude rows, unchanged Codex behavior, and exact `shared.excluded.symlink-target` handling for linked candidates.

**Visible Checkpoint**: Claude and Codex SKILL lists coexist in the same inventory.

### Fixtures and tests first

- [ ] T124 [US1] Extend Repository fixtures with root/nested Claude skills, near misses, duplicate names, Codex-preservation cases, and linked candidates that resolve to the exact `shared.excluded.symlink-target` outcome in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T125 [US1] Materialize base `claude.behavior.repo.skills`, its rule, strategy, evidence, and the single exact `shared.excluded.symlink-target` row with affected-behavior references only to `codex.behavior.repo.skills` and `claude.behavior.repo.skills`, without adding the later skills-directory fact, in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T126 [P] [US1] Add failing contracts and matcher tests for `claude.repo.skill`, one direct skill-name child, descendant inventory, ancestor/lazy uncertainty, linked-candidate rejection through `shared.excluded.symlink-target`, and exact affected-behavior references to `codex.behavior.repo.skills` plus `claude.behavior.repo.skills` in `tests/contract/inspection-rules.test.ts` and `tests/unit/inspection/rules.test.ts`
- [ ] T127 [P] [US1] Add failing Claude recognition tests for tool, kind, path provenance, and no filename-only recognition outside the rule in `tests/unit/inspection/recognizers.test.ts`
- [ ] T128 [P] [US1] Add failing scan tests proving Claude skills are added without changing existing Codex results or weakening the safe-filesystem boundary in `tests/integration/repository-scan.test.ts`
- [ ] T129 [US1] Add failing browser acceptance for an incremental session containing Codex and Claude SKILL lists in `tests/e2e/claude-skills-list.spec.ts`
- [ ] T130 [US1] Add failing Claude skill registry-graph coverage for reciprocal behavior, rule, evidence, and affected-contract references in `tests/contract/vendor-behaviors.test.ts` and `tests/contract/inspection-rules.test.ts`

### Implementation

- [ ] T131 [US1] Add non-authorizing `claude.behavior.repo.skills` and `claude.behavior.user.skills` lookup statements before the skill-selection strategy references them in `shared/registries/vendor-behaviors.ts`
- [ ] T132 [US1] Add the read-authorizing `claude.repo.skill` record in `shared/registries/inspection-rules.ts`
- [ ] T133 [US1] Add the single non-read `shared.excluded.symlink-target` rule with affected-behavior references only to `codex.behavior.repo.skills` and `claude.behavior.repo.skills` in `shared/registries/inspection-rules.ts`
- [ ] T134 [US1] Add Claude skill evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T135 [US1] Implement `claude.repo.skill` matching in `src/inspection/rules/claude.ts`
- [ ] T136 [US1] Implement path-derived Claude skill recognition in `src/inspection/recognizers/claude.ts`
- [ ] T137 [US1] Integrate Claude skill classification while preserving deterministic Codex results in `src/inspection/scan.ts`
- [ ] T138 [US1] Extend filters, badges, and semantically equivalent English/Japanese list messages for Claude in `app/composables/filters.ts`, `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 9: Claude Skill Detail

**Purpose**: Add complete safe Claude skill detail using the generic detail foundation.

**Independent Test**: Open Claude skills with metadata, contained declarations, references, supported-vendor symlinks, malformed frontmatter, and secrets; verify bounded masked detail, the exact-launch skills-directory-plugin applicability fact, explicit `shared.excluded.symlink-target` diagnostics, no manifest read authority, no target reads, and unchanged Codex detail.

**Visible Checkpoint**: Claude SKILL detail is complete and consistent with Codex detail.

### Tests first

- [ ] T139 [US2] Materialize `claude.behavior.repo.skills-directory-plugin` as an exact-launch non-authorizing applicability/activation fact with its strategy and evidence conformance rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T140 [P] [US2] Add failing Claude metadata tests for frontmatter, ancestor/lazy discovery uncertainty, contained declarations, relationships, exact evidence, and `claude.behavior.repo.skills-directory-plugin` as an exact-launch applicability/activation fact on an accepted SKILL candidate rather than manifest authority in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T141 [P] [US2] Add failing relationship tests for provenance-relative targets, boundary status, one-level depth, 1,000-edge retention, and zero relationship read authority in `tests/unit/inspection/relationships.test.ts`
- [ ] T142 [P] [US2] Add failing regression tests proving vendor-supported Claude skill symlinks remain rejected by Inspector policy with an explicit `shared.excluded.symlink-target` parity diagnostic in `tests/integration/inspection-safety.test.ts`
- [ ] T143 [P] [US2] Add failing runtime-composition tests for Claude skill selection, exact-launch skills-directory-plugin applicability, workspace-trust conditions, and condition reasons without claiming manifest loading or unknown runtime selection in `tests/unit/inspection/claude-composition.test.ts`
- [ ] T144 [US2] Add failing browser acceptance for masked Claude detail, uncertainty, relationships, diagnostics, reveal cleanup, and continued Codex behavior in `tests/e2e/claude-skills-detail.spec.ts`

### Implementation

- [ ] T145 [US2] Add `claude.behavior.repo.skills-directory-plugin` as a non-authorizing behavior fact attached only to accepted exact-launch SKILL candidates in `shared/registries/vendor-behaviors.ts`
- [ ] T146 [US2] Add Claude skill composition strategies and condition mappings, including exact-launch skills-directory-plugin applicability and workspace-trust facts without manifest read authority, in `shared/registries/runtime-composition.ts`
- [ ] T147 [US2] Add reciprocal backlinks for the skills-directory behavior and strategy to existing Claude official-source records without creating a new source ID in `shared/registries/official-sources.ts`
- [ ] T148 [US2] Extend Claude recognition with bounded metadata, conditional applicability, exact-launch skills-directory-plugin facts, relationships, `shared.excluded.symlink-target` parity diagnostics, and evidence without creating a manifest candidate in `src/inspection/recognizers/claude.ts`
- [ ] T149 [US2] Integrate atomic Claude extraction and provenance-scoped relationships without expanding their targets in `src/inspection/scan.ts`
- [ ] T150 [US2] Extend typed detail presentation for Claude-specific fields without vendor-specific source rendering in `app/components/inspection/RecognitionDetails.vue`
- [ ] T151 [US2] Add semantically equivalent English/Japanese Claude detail, uncertainty, relationship, and parity messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 10: Copilot Skill List

**Purpose**: Add every supported Copilot Repository skill path and establish read-once multi-tool recognition.

**Independent Test**: Exercise root and nested contexts for all three exact selectors and their negative matrix; verify `.github` is Copilot-only, `.agents` is Codex+Copilot-only, `.claude` is Claude+Copilot-only, and every admitted physical file is one item with one verified read.

**Visible Checkpoint**: Copilot skill rows show the exact three recognition combinations, while extra depth, configured roots, and extra tool recognitions remain absent.

### Fixtures and tests first

- [ ] T152 [US1] Add root/nested positive and negative fixtures for all three Copilot selectors, one-direct-child depth, configured-root exclusions, and exact Copilot-only/Codex+Copilot/Claude+Copilot combinations in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T153 [US1] Materialize Copilot VS Code/CLI/Cloud skill behavior, including the exact origin-file-less `copilot.behavior.cloud.remote-skills` fact, plus Inspector rule, strategy, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T154 [P] [US1] Add failing root/nested matcher tests for the three exact selectors, direct-child depth, near misses, configured-root rejection, and no selector broadening in `tests/contract/inspection-rules.test.ts` and `tests/unit/inspection/rules.test.ts`
- [ ] T155 [P] [US1] Add failing recognition-matrix tests for Copilot-only `.github`, Codex+Copilot-only `.agents`, Claude+Copilot-only `.claude`, and zero extra recognitions in `tests/unit/inspection/recognizers.test.ts`
- [ ] T156 [P] [US1] Add failing scan tests for one physical item and one verified read per matrix row, deterministic provenance, root/nested parity, extra-depth rejection, and configured-root rejection in `tests/integration/repository-scan.test.ts`
- [ ] T157 [US1] Add browser acceptance for the exact root/nested recognition matrix, one row per physical file, and absence of extra-depth/configured-root/extra-recognition rows in `tests/e2e/copilot-skills-list.spec.ts`
- [ ] T158 [US1] Add failing Copilot skill registry-graph coverage for reciprocal behavior, rule, evidence, affected-contract references, and exact non-authorizing ownership of `copilot.behavior.cloud.remote-skills` in `tests/contract/vendor-behaviors.test.ts` and `tests/contract/inspection-rules.test.ts`

### Implementation

- [ ] T159 [US1] Add surface-specific Copilot skill lookup statements plus non-authorizing `copilot.behavior.vscode.user.skills`, `copilot.behavior.cli.user.skills`, and origin-file-less `copilot.behavior.cloud.remote-skills` before the selection and managed/remote-exclusion strategies reference them in `shared/registries/vendor-behaviors.ts`
- [ ] T160 [US1] Add the read-authorizing `copilot.repo.skill` record for the three fixed directories in `shared/registries/inspection-rules.ts`
- [ ] T161 [US1] Add Copilot skill evidence records and reciprocal affected-contract references, including existing-source backlinks for `copilot.behavior.cloud.remote-skills`, in `shared/registries/official-sources.ts`
- [ ] T162 [US1] Implement root/nested matching for the exact `.github`, `.agents`, and `.claude` skill selectors with direct-child depth and configured-root rejection in `src/inspection/rules/copilot.ts`
- [ ] T163 [US1] Implement the exact Copilot-only/Codex+Copilot/Claude+Copilot recognition matrix without extra recognitions in `src/inspection/recognizers/copilot.ts`
- [ ] T164 [US1] Assemble each admitted matrix file as one physical item with one verified read and deterministic multi-tool provenance in `src/inspection/scan.ts`
- [ ] T165 [US1] Extend tool filtering and multi-recognition badges for Copilot in `app/composables/filters.ts` and `app/components/inventory/InventoryItem.vue`
- [ ] T166 [US1] Add accessible multi-recognition summaries in `app/components/inventory/InventoryList.vue`
- [ ] T167 [US1] Add semantically equivalent English/Japanese Copilot list and conditional-surface messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 11: Copilot Skill Detail

**Purpose**: Add complete safe Copilot skill detail while preserving incompatible surface facts.

**Independent Test**: Open Copilot skills from all three directories and shared physical files; verify bounded metadata, separate surface applicability, progressive-loading uncertainty, no winner claims, masked source, and unchanged Codex/Claude details.

**Visible Checkpoint**: Copilot SKILL detail exposes distinct VS Code, CLI, and Cloud interpretations.

### Tests first

- [ ] T168 [P] [US2] Add failing Copilot metadata tests for frontmatter, progressive loading, duplicate-name uncertainty, excluded custom directories, and exact evidence in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T169 [P] [US2] Add failing composition tests for VS Code, CLI, and Cloud selection facts without collapsing incompatible behavior in `tests/unit/inspection/copilot-composition.test.ts`
- [ ] T170 [P] [US2] Add failing typed-detail tests proving surface-specific recognitions and condition facts remain separate in `tests/unit/app/recognition-details.test.ts`
- [ ] T171 [US2] Add failing browser acceptance for Copilot-only and shared-recognition detail while retaining Codex and Claude behavior in `tests/e2e/copilot-skills-detail.spec.ts`

### Implementation

- [ ] T172 [US2] Add surface-qualified Copilot skill strategies and condition mappings in `shared/registries/runtime-composition.ts`
- [ ] T173 [US2] Extend Copilot recognition with bounded metadata, selection uncertainty, relationships, and exact evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T174 [US2] Extend applicability projection to preserve Copilot surface differences and documentation conflicts in `src/inspection/applicability/precedence.ts`
- [ ] T175 [US2] Integrate atomic Copilot extraction and read-once shared-file detail assembly in `src/inspection/scan.ts`
- [ ] T176 [US2] Extend typed recognition presentation for separate Copilot surfaces in `app/components/inspection/RecognitionDetails.vue`
- [ ] T177 [US2] Add semantically equivalent English/Japanese Copilot detail and surface-uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 12: Unified Skill Inventory

**Purpose**: Turn the three vendor demonstrations into one coherent skill inventory.

**Independent Test**: Use an all-tool fixture with unique skills, duplicate names, shared physical files, hard-link aliases, item failures, secrets, and limits; verify deterministic rows, multi-recognition, filters, partial continuity, rescan replacement, and responsive interaction performance.

**Visible Checkpoint**: Users can filter and understand the complete skill-first inventory.

### Fixtures and tests first

- [ ] T178 [US1] Create the all-tool SKILL fixture with every supported selector, shared files, hard-link aliases, duplicate names, near misses, failures, secrets, and exact-limit cases in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T179 [P] [US1] Add failing conformance tests for every SKILL selector and multi-tool recognition combination in `tests/contract/inspection-rules.test.ts`
- [ ] T180 [P] [US1] Add failing integration tests for deterministic physical-file and recognition order, read-once merging, alias caps, partial continuity, progress, and no extra reads after limits in `tests/integration/repository-scan.test.ts`
- [ ] T181 [P] [US1] Add failing client tests for source, tool, kind, and path filters over unified SKILL rows in `tests/unit/app/inventory.test.ts`
- [ ] T182 [P] [US1] Add failing rescan tests for whole-generation replacement, stale detail IDs, reveal clearing, filter retention, selection cleanup, and zero profile/cache/repository persistence in `tests/unit/session/session.test.ts` and `tests/unit/app/session-shell.test.ts`
- [ ] T183 [P] [US1] Add recorded-reference performance tests for one-second status, ten-second 100,000-entry/500-file scanning, and sub-100-ms filtering and selection in `tests/performance/repository-scan.test.ts` and `tests/performance/inventory-interactions.test.ts`
- [ ] T184 [US1] Add browser regression for unified filters, multi-recognition, provenance, keyboard use, and continued visibility of the existing non-exhaustive-masking warning in `tests/e2e/skills-inventory.spec.ts`

### Implementation

- [ ] T185 [US1] Complete deterministic physical-file, alias, recognition, and provenance aggregation for skills in `src/inspection/scan.ts`
- [ ] T186 [US1] Complete generation-aware skill filtering, selection, rescan replacement, and stale cleanup in `app/composables/filters.ts` and `app/composables/session.ts`
- [ ] T187 [US1] Complete accessible source/tool/kind/path filters in `app/components/inventory/InventoryFilters.vue`
- [ ] T188 [US1] Complete unified skill rows, recognition badges, provenance summaries, empty states, and progress controls in `app/components/inventory/InventoryList.vue`, `app/components/inventory/InventoryItem.vue`, and `app/pages/index.vue`
- [ ] T189 [US1] Preserve bounded diagnostics and keep the existing app-shell masking warning mounted through unified inventory loading, empty, retry, and replacement states in `app/components/diagnostics/DiagnosticList.vue` and `app/components/diagnostics/MaskingWarning.vue`
- [ ] T190 [US1] Add semantically equivalent English/Japanese unified-inventory and multi-recognition messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 13: Skill Comparison

**Purpose**: Deliver the generic masked comparison path using skills before other customization families.

**Independent Test**: Select exactly two readable current-generation skills and verify literal masked diff, typed recognition rows, no raw secret exposure, 20,000-line/five-second fallback, stale cleanup, same-origin Worker use, and keyboard/screen-reader access.

**Visible Checkpoint**: Any two readable SKILL files can be compared safely.

### Tests first

- [ ] T191 [P] [US3] Add failing tests for exactly-two selection, readable/current-generation guards, detail loading, stale rejection, and cleanup after replacement or removal in `tests/unit/app/comparison.test.ts`
- [ ] T192 [P] [US3] Add failing tests for field-aware recognition, provenance, applicability, relationship, and order comparison without ranking or winner claims in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T193 [P] [US3] Add failing direct-comparison-route tests for two masked models, `readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, `renderMarginRevertIcon: false`, same-origin Worker use, 20,000-line/five-second fallback, and disposal in `tests/unit/app/source-diff.test.ts` and `tests/package/monaco-assets.test.ts`
- [ ] T194 [US3] Add failing browser acceptance for masked literal skill diff, typed recognition differences, secret absence, responsive layout, keyboard access, fallback diagnostics, and cleanup in `tests/e2e/skills-comparison.spec.ts`

### Implementation

- [ ] T195 [US3] Implement exactly-two generation-scoped selection, readable-file guards, two existing detail loads without a compare API, and teardown after replacement or removal in `app/composables/comparison.ts`
- [ ] T196 [US3] Implement deterministic creation and disposal of two masked Monaco models, opaque URIs, the same-origin Worker, and subscriptions in `app/composables/monaco.ts`
- [ ] T197 [US3] Implement exact labelled read-only/no-link/no-revert diff options, verbose accessibility, and complete side-by-side fallback in `app/components/comparison/SourceDiff.vue`
- [ ] T198 [US3] Implement field-identity-aware recognition, provenance, applicability, relationship, and order rows without inferred winners in `app/components/comparison/RecognitionComparison.vue`
- [ ] T199 [US3] Add accessible generation-scoped comparison-selection controls without edit, merge, lint, validation, or fix actions in `app/components/inventory/InventoryItem.vue`
- [ ] T200 [US3] Implement direct-route loading, stale recovery, responsive layout, accessible navigation, and semantically equivalent English/Japanese messages in `app/pages/compare.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 14: Skill Metadata Comparison

**Purpose**: Extend the generic masked comparison path to the separate Codex `skill metadata` kind.

**Independent Test**: Compare exactly two current-generation readable `agents/openai.yaml` files and verify masked literal source, aligned metadata fields, seed provenance, relationships, fallback behavior, stale invalidation, and complete model/subscription cleanup.

**Visible Checkpoint**: Users can compare two Codex skill-metadata files without exposing secrets or conflating their seed skills.

### Tests first

- [ ] T201 [P] [US3] Add failing typed-comparison regressions for skill-metadata fields, seed provenance, applicability, relationships, and missing values in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T202 [US3] Add browser acceptance for literal skill-metadata diff, typed provenance differences, masking, accessibility, fallback, and cleanup in `tests/e2e/skill-metadata-comparison.spec.ts`

### Implementation

- [ ] T203 [US3] Extend field-identity-aware comparison rows for the `skill metadata` kind without inferring a preferred seed or value in `app/components/comparison/RecognitionComparison.vue`
- [ ] T204 [US3] Add semantically equivalent English/Japanese skill-metadata comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 15: Codex Instructions Inventory

**Purpose**: Add static Codex instruction files first and define a pure configured-fallback declaration/derivation interface without registering a bounded-derived rule, admitting a config seed, or reading project configuration before the MCP wave.

**Independent Test**: Inventory `AGENTS.override.md` and `AGENTS.md`, then exercise `codex.derived.fallback-basename` against an in-memory accepted-carrier fixture; verify at-most-16 retention, ancestry comparability, no orphan/configured-target escape, deterministic provenance, and zero `.codex/config.toml` reads or configured fallback rows before the carrier is admitted in Phase 23.

**Visible Checkpoint**: Users can filter static Codex instructions and see that configured fallback discovery is pending the later minimum config carrier rather than silently omitted.

### Fixtures and tests first

- [ ] T205 [US1] Create Codex instruction fixtures for overrides, regular files, configured fallbacks, empty files, 16/17 fallback names, ancestry-comparable and incomparable paths, imports, secrets, malformed content, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T206 [US1] Materialize Codex instruction behavior, the non-authorizing `codex.behavior.repo.config` and `codex.behavior.user.config` carrier facts, static matcher, pure fallback declaration/derivation fixture contract, composition, relationship, path-negative boundary, and reciprocal evidence rows without a `codex.derived.fallback-basename` registry row in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T207 [P] [US1] Add failing matcher and recognition tests for `codex.repo.instructions`, override/regular selectors, empty-file behavior, path-negative higher scopes, deterministic provenance, and the absence of both a config candidate and `codex.derived.fallback-basename` registry record before Phase 23 in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T208 [US1] Add failing scan tests for static Codex instructions and separate pure-function tests that feed validated in-memory fallback declarations into the derivation interface, proving at-most-16 retention, ancestry comparability, orphan/config escape rejection, and zero carrier or target access before rule registration in `tests/integration/repository-scan.test.ts`
- [ ] T209 [US1] Add browser acceptance for static Codex instruction rows, filters, diagnostics, order, exclusions, and an explicit configured-fallback-pending state with zero config rows in `tests/e2e/codex-instructions-inventory.spec.ts`

### Implementation

- [ ] T210 [US1] Add Codex instruction lookup statements plus non-authorizing `codex.behavior.user.instructions`, `codex.behavior.repo.config`, and `codex.behavior.user.config` before instruction layering or the dormant fallback derivation references them in `shared/registries/vendor-behaviors.ts`
- [ ] T211 [US1] Add only the Codex static instruction records; leave both `codex.repo.config` and `codex.derived.fallback-basename` unregistered until their atomic Phase 23 admission, and add no adjacent exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T212 [US1] Add Codex instruction evidence plus reciprocal backlinks for the non-authorizing Repository/User config carrier facts owned in this phase in `shared/registries/official-sources.ts`
- [ ] T213 [US1] Implement static Codex instruction matching plus a pure fallback declaration validator and one-edge derivation helper that cannot emit a scan candidate until Phase 23 registers both its seed and derived rule in `src/inspection/rules/codex.ts` and `src/inspection/recognizers/codex.ts`
- [ ] T214 [US1] Extend inventory filters and rows for Codex instructions, fallback provenance when activated, and the pre-carrier pending state in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T215 [US1] Add semantically equivalent English/Japanese Codex instruction inventory, fallback, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 16: Codex Instructions Detail

**Purpose**: Add masked Codex instruction source and typed layering while keeping configured-fallback projection conditional on the minimum config carrier introduced in Phase 23.

**Independent Test**: Open static Codex instruction fixtures and verify override-first selection, broad-to-narrow conditional order, unknown runtime `cwd`, instruction-byte budget, imports as relationships only, stale-ID behavior, diagnostics, and reveal cleanup; separately verify fallback detail projection from an in-memory carrier without reading any config path.

**Visible Checkpoint**: Selecting a static Codex instruction opens safe detail with explicit order, byte budget, conditions, and an honest pre-carrier fallback status.

### Tests first

- [ ] T216 [P] [US2] Add failing Codex tests for override-first selection, broad-to-narrow conditional order, unknown runtime `cwd`, instruction-byte budget, and 16 fallback basenames in `tests/unit/inspection/codex-composition.test.ts`
- [ ] T217 [P] [US2] Add failing import/reference tests for masked targets, lexical normalization, cycles, boundary status, one-level relationships, and zero target read authority in `tests/unit/inspection/relationships.test.ts` and `tests/integration/inspection-safety.test.ts`
- [ ] T218 [P] [US2] Add failing detail/API tests for typed Codex instruction metadata, conditions, fallbacks, relationships, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts` and `tests/unit/app/recognition-details.test.ts`
- [ ] T219 [US2] Add failing Codex instruction runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T220 [US2] Add browser acceptance for masked static Codex instruction detail, byte budget, conditions, pre-carrier fallback status, relationships, diagnostics, and reveal cleanup in `tests/e2e/codex-instructions-detail.spec.ts`

### Implementation

- [ ] T221 [US2] Add Codex instruction layering plus the carrier-only `codex.config.precedence` strategy needed by the future fallback seed, along with fallback, byte-budget, applicability, and relationship strategies, in `shared/registries/runtime-composition.ts`
- [ ] T222 [US2] Implement Codex instruction composition, fallback projection, byte-budget facts, and provenance-relative relationship extraction in `src/inspection/applicability/precedence.ts` and `src/inspection/parsers/markdown.ts`
- [ ] T223 [US2] Integrate Codex instruction masking, atomic parsing, relationship-only references, raw disposal, and projection of fallback provenance only when a later admitted carrier has already produced a bounded candidate in `src/inspection/scan.ts`
- [ ] T224 [US2] Extend typed detail presentation for Codex instruction scope, order, fallbacks, byte budget, conditions, and inert relationships in `app/components/inspection/RecognitionDetails.vue` and `app/components/inspection/RelationshipList.vue`
- [ ] T225 [US2] Add semantically equivalent English/Japanese Codex instruction detail, fallback, byte-budget, relationship, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 17: Claude Instructions Inventory

**Purpose**: Add Claude launch, ancestor, and conditional descendant instruction files without recognizing `AGENTS.md` by filename.

**Independent Test**: Inventory supported `CLAUDE.md`, `CLAUDE.local.md`, and every nested `.claude/CLAUDE.md` matched by `claude.repo.instructions`; verify that only the exact launch-`cwd` `.claude/CLAUDE.md` has definite launch applicability while other nested candidates remain conditional/unknown, with deterministic provenance and unchanged Codex instructions.

**Visible Checkpoint**: Users can filter Claude instruction files with explicit launch/ancestor/descendant uncertainty.

### Fixtures and tests first

- [ ] T226 [US1] Create Claude instruction fixtures for launch, ancestor, descendant, local ordering, exact launch and other nested `.claude/CLAUDE.md` candidates, filename-only `AGENTS.md`, imports, secrets, malformed content, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T227 [US1] Materialize Claude instruction behavior, candidate matchers, composition, path-negative cases, relationships, and evidence rows without defining exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T228 [P] [US1] Add failing matcher and recognition tests proving nested `.claude/CLAUDE.md` files are `claude.repo.instructions` candidates, only the exact launch-`cwd` form is definitely applicable, other nested forms remain conditional/unknown, filename-only `AGENTS.md` is not Claude-recognized, and provenance is deterministic in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T229 [US1] Add failing scan tests for Claude instruction discovery, one verified read, deterministic order, isolated failures, and zero import-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T230 [US1] Add browser acceptance for Claude instruction rows, layer provenance, filters, exclusions, diagnostics, and retained Codex instructions in `tests/e2e/claude-instructions-inventory.spec.ts`

### Implementation

- [ ] T231 [US1] Add Claude instruction lookup statements plus non-authorizing `claude.behavior.user.instructions` before instruction layering and import relationships reference it in `shared/registries/vendor-behaviors.ts`
- [ ] T232 [US1] Add only the Claude instruction candidate records and keep unsupported locations path-negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T233 [US1] Add Claude instruction evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T234 [US1] Implement Claude instruction matching and recognition with explicit launch/ancestor/descendant uncertainty in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T235 [US1] Integrate Claude instruction classification without reading imports or changing Codex results in `src/inspection/scan.ts`
- [ ] T236 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude instruction, layer, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 18: Claude Instructions Detail

**Purpose**: Add masked Claude instruction detail with exact layer ordering and inert import relationships.

**Independent Test**: Open hostile and malformed Claude instructions and verify launch/ancestor/descendant distinctions, regular-before-local order, conditional descendant loading, masking, imports as one-level relationships, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Claude instruction shows safe layered detail without importing referenced files.

### Tests first

- [ ] T237 [P] [US2] Add failing Claude tests for launch/ancestor/descendant distinctions, regular-before-local order, exact-launch versus conditional/unknown nested `.claude/CLAUDE.md` applicability, and conditional descendant loading in `tests/unit/inspection/claude-composition.test.ts`
- [ ] T238 [P] [US2] Add failing Claude import tests for masked targets, lexical normalization, cycles, boundary status, one-level depth, and zero target read authority in `tests/unit/inspection/relationships.test.ts`
- [ ] T239 [US2] Add failing Claude instruction runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T240 [US2] Add browser acceptance for masked Claude instruction detail, layer order, conditions, imports, diagnostics, and reveal cleanup in `tests/e2e/claude-instructions-detail.spec.ts`

### Implementation

- [ ] T241 [US2] Add Claude instruction layering, local-order, applicability, and import-relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T242 [US2] Extend Claude instruction recognition with bounded metadata, layer conditions, relationships, diagnostics, and evidence in `src/inspection/recognizers/claude.ts`
- [ ] T243 [US2] Integrate Claude instruction parsing, recursive masking, relationship-only imports, and raw disposal in `src/inspection/scan.ts`
- [ ] T244 [US2] Extend typed detail and semantically equivalent English/Japanese Claude instruction order, relationship, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 19: Copilot Instructions Inventory

**Purpose**: Add the seven exact Copilot instruction candidates: `copilot.repo.instructions.repository`, `copilot.repo.instructions.repository-cli-context`, `copilot.repo.instructions.path`, `copilot.repo.instructions.path-cli-context`, `copilot.repo.instructions.agents`, `copilot.repo.instructions.claude-root`, and `copilot.repo.instructions.gemini-root`.

**Independent Test**: Inventory all seven exact IDs with their distinct root/CLI and surface provenance; verify root and CLI repository forms, root and CLI path forms, `AGENTS.md`, root `CLAUDE.md`, and root `GEMINI.md`, while exact `copilot.excluded.additional-standard-locations` and `copilot.excluded.extra-directories` reject additional standard locations and configured roots without admitting hosted inputs or near misses.

**Visible Checkpoint**: Users can filter Copilot instruction candidates with surface-qualified provenance and explicit exclusions.

### Fixtures and tests first

- [ ] T245 [US1] Create Copilot instruction fixtures for the seven exact candidate IDs, root/CLI repository and path forms, `applyTo`, `AGENTS.md`, root `CLAUDE.md`/`GEMINI.md`, shared files, additional-standard locations, extra directories, hosted inputs, secrets, malformed content, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T246 [US1] Materialize all seven exact Copilot instruction candidate rows; the exact origin-file-less `copilot.behavior.cloud.organization-instructions` fact; `copilot.excluded.additional-standard-locations` with only `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.instructions.claude`, `copilot.behavior.cli.instructions.claude`, and `copilot.behavior.cli.instructions.gemini`; and `copilot.excluded.extra-directories` with only `copilot.behavior.vscode.instructions.path`, `copilot.behavior.vscode.skills`, `copilot.behavior.cli.instructions.path`, and `copilot.behavior.cli.skills`, plus their composition, relationship, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T247 [P] [US1] Add failing matcher/recognition tests for all seven exact candidate IDs, root-versus-CLI provenance, root alternatives, exact additional-standard-location and extra-directory exclusions, and no hosted candidate in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T248 [US1] Add failing scan tests for deterministic Copilot instruction candidates, one verified read, isolated failures, and zero rejected-target access in `tests/integration/repository-scan.test.ts`
- [ ] T249 [US1] Add browser acceptance for Copilot instruction rows, surface badges, filters, exclusions, diagnostics, and retained Codex/Claude rows in `tests/e2e/copilot-instructions-inventory.spec.ts`

### Implementation

- [ ] T250 [US1] Add surface-qualified Copilot instruction lookup statements plus non-authorizing `copilot.behavior.vscode.user.instructions`, `copilot.behavior.vscode.user.claude`, `copilot.behavior.cli.user.instructions.root`, `copilot.behavior.cli.user.instructions.path`, and origin-file-less `copilot.behavior.cloud.organization-instructions` before local/Cloud layering and managed/remote exclusion references them in `shared/registries/vendor-behaviors.ts`
- [ ] T251 [US1] Add the seven exact Copilot instruction candidate records and own only `copilot.excluded.additional-standard-locations` plus `copilot.excluded.extra-directories` in `shared/registries/inspection-rules.ts`
- [ ] T252 [US1] Add Copilot instruction evidence records and reciprocal affected-contract references, including existing-source backlinks for `copilot.behavior.cloud.organization-instructions`, in `shared/registries/official-sources.ts`
- [ ] T253 [US1] Implement `copilot.repo.instructions.repository` and `copilot.repo.instructions.repository-cli-context` matching in `src/inspection/rules/copilot.ts`
- [ ] T254 [US1] Implement `copilot.repo.instructions.path` and `copilot.repo.instructions.path-cli-context` matching in `src/inspection/rules/copilot.ts`
- [ ] T255 [US1] Implement `copilot.repo.instructions.agents` matching and exact additional-standard-location/extra-directory rejection in `src/inspection/rules/copilot.ts`
- [ ] T256 [US1] Implement `copilot.repo.instructions.claude-root` and `copilot.repo.instructions.gemini-root` matching in `src/inspection/rules/copilot.ts`
- [ ] T257 [US1] Implement surface-qualified recognition for all seven exact Copilot instruction IDs without hosted or excluded-location promotion in `src/inspection/recognizers/copilot.ts`
- [ ] T258 [US1] Integrate Copilot instruction classification without configured-root or hosted I/O in `src/inspection/scan.ts`
- [ ] T259 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot instruction, surface, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 20: Copilot Instructions Detail

**Purpose**: Add masked Copilot instruction detail while preserving incompatible VS Code, CLI, and Cloud composition facts and keeping settings-dependent enablement explicitly unknown until the later Settings wave.

**Independent Test**: Open supported Copilot instructions and verify `applyTo`, an explicit pending/unknown settings-dependent enablement state with zero settings-file I/O, parent discovery, Cloud exclusions, no invented general winner, masking, relationships, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Copilot instruction shows separate surface interpretations and uncertainty.

### Tests first

- [ ] T260 [P] [US2] Add failing Copilot tests for VS Code/CLI/Cloud facts, `applyTo`, pending/unknown settings-dependent enablement with no settings owner, parent discovery, and no invented general winner in `tests/unit/inspection/copilot-composition.test.ts`
- [ ] T261 [P] [US2] Add failing metadata and relationship tests for Copilot instruction scopes, disablement, alternatives, references, and hosted/organization runtime-only facts in `tests/unit/inspection/copilot-metadata.test.ts` and `tests/unit/inspection/relationships.test.ts`
- [ ] T262 [US2] Add failing Copilot instruction runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T263 [US2] Add browser acceptance for masked Copilot instruction detail, surface conditions, applicability, relationships, diagnostics, and reveal cleanup in `tests/e2e/copilot-instructions-detail.spec.ts`

### Implementation

- [ ] T264 [US2] Add separate Copilot VS Code, CLI, and Cloud instruction layering, applicability, and relationship strategies with a closed unavailable-settings condition and no settings behavior reference in `shared/registries/runtime-composition.ts`
- [ ] T265 [US2] Extend Copilot recognition with bounded instruction metadata, surface conditions, pending settings applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T266 [US2] Integrate Copilot instruction parsing, recursive masking, inert relationships, raw disposal, and zero settings-file I/O in `src/inspection/scan.ts`
- [ ] T267 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot instruction surface, pending settings applicability, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 21: Unified Instructions Inventory

**Purpose**: Consolidate the priority-wave instruction baseline with the explicit pre-carrier shared-file matrix: `AGENTS.md` is Codex+Copilot, root `CLAUDE.md` is Claude+Copilot, nested `CLAUDE.md` is Claude-only until an independently admitted config carrier activates an exact fallback match in Phase 23, and `CLAUDE.local.md` is Claude-only.

**Independent Test**: Use an all-vendor instruction fixture and verify the exact pre-carrier shared-file matrix, one physical item/read per admitted file, separate recognitions/provenances, no filename-based Codex promotion of nested `CLAUDE.md`, an explicit dormant fallback state, deterministic order, filters, partial continuity, and rescan cleanup.

**Visible Checkpoint**: Users can understand the complete static instruction inventory, every shared-file interpretation, and the one bounded fallback integration that will activate when MCP admits its minimum carrier.

### Tests first

- [ ] T268 [US1] Finalize the pre-carrier all-vendor instruction fixture with `AGENTS.md` Codex+Copilot, root `CLAUDE.md` Claude+Copilot, nested `CLAUDE.md` Claude-only plus a dormant configured-fallback variant, Claude-only `CLAUDE.local.md`, every other selector, failures, secrets, exclusions, aliases, and exact limits in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T269 [P] [US1] Add complete pre-carrier conformance tests for every registered static instruction selector and exclusion, the pure fallback interface with no registry entry, and the exact `AGENTS.md`/root `CLAUDE.md`/nested `CLAUDE.md`/`CLAUDE.local.md` recognition matrix in `tests/contract/inspection-rules.test.ts`
- [ ] T270 [P] [US1] Add failing integration tests for one-read shared-file assembly, the exact pre-carrier recognition matrix, zero Codex recognition on a dormant nested fallback, deterministic provenance order, alias caps, partial continuity, and no config or rejected-target access in `tests/integration/repository-scan.test.ts`
- [ ] T271 [P] [US1] Add failing client tests for source/tool/kind/path filters, shared recognition badges, dormant fallback status, and rescan cleanup in `tests/unit/app/inventory.test.ts`
- [ ] T272 [US1] Add browser acceptance for the pre-carrier unified instruction inventory, filters, shared recognitions, dormant fallback status, order, exclusions, diagnostics, and keyboard use in `tests/e2e/instructions-inventory.spec.ts`

### Implementation

- [ ] T273 [US1] Complete deterministic physical-file assembly for the exact pre-carrier shared-file matrix and accept independent configured-fallback Codex provenance only after Phase 23 supplies a validated derivation, never by filename inference, in `src/inspection/scan.ts`
- [ ] T274 [US1] Complete inventory filters and rows for instruction kinds, shared recognitions, dormant fallback status, and later activated fallback provenance in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T275 [US1] Add semantically equivalent English/Japanese unified instruction inventory, shared-recognition, fallback, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 22: Instructions Comparison

**Purpose**: Extend the generic comparison view with literal and typed instruction differences.

**Independent Test**: Compare two instructions and verify masked literal source plus field-aligned layering, fallback, applicability, relationship, and provenance differences without correctness claims.

**Visible Checkpoint**: Users can compare two instruction files and understand their structural differences.

### Tests first

- [ ] T276 [US3] Add failing comparison regressions for literal instruction source and typed layering/fallback differences without semantic correctness claims in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T277 [US3] Add browser acceptance for literal instruction diff and typed layering/fallback differences in `tests/e2e/instructions-comparison.spec.ts`

### Implementation

- [ ] T278 [US3] Extend typed instruction comparison rows in `app/components/comparison/RecognitionComparison.vue`
- [ ] T279 [US3] Add semantically equivalent English/Japanese instruction comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 23: Codex MCP Carrier and Contained Declarations

**Purpose**: Atomically admit `.codex/config.toml` as the minimum physical carrier required by Codex MCP, register `codex.derived.fallback-basename` with that static seed, activate the already implemented instruction fallback interface, and attach MCP recognition without yet exposing the separate `settings/config` recognition.

**Independent Test**: Inspect config layers with validated fallback basenames, named servers, duplicates, absent fields, malformed tables, hostile commands, secrets, and standalone MCP near misses; verify atomic seed/derived-rule admission, bounded fallback rows, owner-file identity, no synthetic MCP file, no standalone MCP candidate, no config-detail badge, one verified read, and zero connection.

**Visible Checkpoint**: Users can filter Codex contained MCP declarations on their minimum carrier, and the configured instruction fallbacks from Phase 15 become visible; full configuration inventory/detail remains deferred to Phases 57–58.

### Fixtures and tests first

- [ ] T280 [US1] Create minimum Codex config-carrier fixtures for project layers, fallback names, named MCP servers, duplicates, malformed tables, hostile commands, secrets, agent inheritance references, standalone near misses, plugin relationships, and User/managed path negatives in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T281 [US1] Materialize `codex.repo.config`, `codex.derived.fallback-basename`, `codex.behavior.repo.mcp`, the non-authorizing `codex.behavior.repo.hooks` carrier fact, contained recognition, selection, relationships, and reciprocal evidence rows plus path-negative standalone/plugin/User/managed cases without `codex.excluded.plugin-files` or an MCP exclusion ID in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T282 [P] [US1] Add failing matcher tests for atomic `codex.repo.config` plus `codex.derived.fallback-basename` registration, exact config-carrier admission, bounded derived instructions, no standalone Codex MCP candidate, and no promotion of plugin, agent-reference, User, managed, or arbitrary config paths in `tests/unit/inspection/rules.test.ts`
- [ ] T283 [P] [US1] Add failing recognition tests proving Codex MCP attaches to the newly admitted config carrier, configured instruction fallbacks activate with independent provenance, no `settings/config` recognition or synthetic file appears yet, and absent/malformed declarations are omitted atomically in `tests/unit/inspection/recognizers.test.ts`
- [ ] T284 [US1] Add browser acceptance for Codex contained MCP rows, owner-carrier navigation, newly activated configured instruction fallbacks, no config kind/detail badge, filters, path-negative standalone/plugin cases, diagnostics, and no connection controls in `tests/e2e/codex-mcp-inventory.spec.ts`

### Implementation

- [ ] T285 [US1] Add `codex.behavior.repo.mcp`, the non-authorizing config-contained `codex.behavior.repo.hooks` fact required by the exact config carrier rule, and Codex MCP lookup statements, reusing the config carrier behaviors owned in Phase 15 without Hook candidate, standalone MCP, or connection authority, in `shared/registries/vendor-behaviors.ts`
- [ ] T286 [US1] Atomically add `codex.repo.config` and its one-edge `codex.derived.fallback-basename` rule, add no Codex MCP candidate, keep standalone/plugin/User/managed paths negative without prematurely owning `codex.excluded.plugin-files`, and add only relationship records for contained declarations in `shared/registries/inspection-rules.ts`
- [ ] T287 [US1] Add Codex config-carrier, derived-fallback, MCP, and non-authorizing contained-Hook fact evidence with reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T288 [US1] Implement config-carrier matching, atomic activation of the existing bounded fallback helper, standalone MCP rejection, and contained-declaration classification in `src/inspection/rules/codex.ts`
- [ ] T289 [US1] Implement the minimum bounded TOML carrier extraction needed for fallback basenames and `[mcp_servers.*]`, attach MCP recognition and derived instructions to one verified config file with deterministic provenance, omit `settings/config` recognition, and create no synthetic candidates in `src/inspection/parsers/toml.ts`, `src/inspection/recognizers/codex.ts`, and `src/inspection/scan.ts`
- [ ] T290 [US1] Extend MCP inventory filters and contained-owner summaries in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T291 [US1] Add semantically equivalent English/Japanese Codex contained-MCP, owner, schema, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 24: Codex MCP Detail

**Purpose**: Extend the minimum Codex carrier with masked MCP detail, active-config precedence, trust, inheritance, duplicate, and zero-connection behavior while leaving general configuration presentation to Phase 58.

**Independent Test**: Open contained Codex declarations and verify active project-config precedence, trust conditions, duplicate names, parent/agent inheritance facts, masking, diagnostics, and zero DNS, socket, HTTP, auth, probing, command, expansion, or referenced reads.

**Visible Checkpoint**: Selecting a Codex MCP recognition shows exact configuration semantics while every server remains inactive.

### Tests first

- [ ] T292 [P] [US2] Add failing MCP schema tests for named, inline, ancestor, plugin, and runtime-only references plus a pure dormant agent-inheritance adapter that has no unresolved behavior backlink, connection, or target promotion before Phase 50 in `tests/unit/inspection/relationships.test.ts`
- [ ] T293 [P] [US2] Add failing Codex carrier/MCP tests for active project-config precedence, trust conditions, duplicate names, activated fallback provenance, and absence of general config presentation in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T294 [P] [US2] Add zero-connection tests proving Codex MCP inspection causes no DNS, socket, HTTP, authentication, probing, command execution, expansion, plugin load, or referenced-file read in `tests/integration/security/zero-activation.test.ts`
- [ ] T295 [P] [US2] Add failing Codex MCP-detail API tests for masked commands, URLs, headers, environment fields, owner provenance, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T296 [US2] Add failing Codex carrier, instruction-fallback, and MCP runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T297 [US2] Add browser acceptance for masked Codex MCP detail, config precedence, trust, diagnostics, owner navigation, and zero connection behavior in `tests/e2e/codex-mcp-detail.spec.ts`

### Implementation

- [ ] T298 [US2] Add Codex MCP active-config selection, trust, duplicate, provenance, and relationship strategies plus a closed dormant agent-inheritance adapter with no `codex.behavior.repo.agents` reference before Phase 50 in `shared/registries/runtime-composition.ts`
- [ ] T299 [US2] Implement Codex active-config MCP precedence, trust, duplicate, provenance metadata, and owner-gated dormant agent inheritance in `src/inspection/recognizers/codex.ts`
- [ ] T300 [US2] Extend the minimum TOML carrier extraction with the closed Codex MCP detail fields, schema distinctions, and secret-safe origins in `src/inspection/parsers/toml.ts`
- [ ] T301 [US2] Integrate Codex MCP recursive masking, selection projection, conditions, diagnostics, and non-following relationships in `src/inspection/scan.ts`
- [ ] T302 [US2] Extend typed Codex MCP detail for servers, transports, owner scope, trust, ordering, and activation uncertainty in `app/components/inspection/RecognitionDetails.vue`
- [ ] T303 [US2] Add semantically equivalent English/Japanese Codex MCP selection, safety, owner, schema, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 25: Claude MCP Files Inventory

**Purpose**: Add the exact root Claude `.mcp.json` standalone physical candidate.

**Independent Test**: Inventory only root `.mcp.json`, reject descendants as Claude candidates, User state, connectors, managed configuration, links, aliases, near misses, and contained declarations as standalone files while preserving future Copilot sharing.

**Visible Checkpoint**: Users can filter the Claude project MCP file with exact-root provenance.

### Fixtures and tests first

- [ ] T304 [US1] Create Claude MCP-file fixtures for root, descendants, malformed JSON, hostile commands, secrets, links, aliases, User/plugin/connector/managed state, contained declarations, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T305 [US1] Materialize Claude MCP-file behavior, the non-authorizing `claude.behavior.user.mcp-state`, `claude.behavior.repo.agents`, `claude.behavior.repo.plugin`, and `claude.behavior.user.plugins` facts, exact candidate, selection, relationships, path-negative plugin/User/connector/managed cases without `claude.excluded.plugin-files`, and reciprocal evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T306 [P] [US1] Add failing matcher/recognition tests for exact root `claude.repo.mcp`, descendant/User/plugin/connector/managed rejection, and standalone schema provenance in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T307 [US1] Add browser acceptance for Claude MCP file rows, exact-root provenance, filters, exclusions, diagnostics, and no connection controls in `tests/e2e/claude-mcp-files-inventory.spec.ts`

### Implementation

- [ ] T308 [US1] Add Claude MCP-file lookup statements and own the non-authorizing MCP-dependent `claude.behavior.user.mcp-state`, `claude.behavior.repo.agents`, `claude.behavior.repo.plugin`, and `claude.behavior.user.plugins` facts before MCP replacement/owner strategies reference them, without candidate or connection authority, in `shared/registries/vendor-behaviors.ts`
- [ ] T309 [US1] Add the exact Claude MCP candidate and keep plugin/User/connector/managed locations path-negative without prematurely owning `claude.excluded.plugin-files` or defining new MCP exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T310 [US1] Add Claude MCP-file evidence plus reciprocal backlinks for all four non-authorizing MCP-dependent behavior facts owned in this phase in `shared/registries/official-sources.ts`
- [ ] T311 [US1] Implement Claude root-exact `.mcp.json` matching and path-derived recognition in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T312 [US1] Integrate Claude MCP-file classification and preserve physical identity for later shared recognition in `src/inspection/scan.ts`
- [ ] T313 [US1] Extend MCP inventory rows and semantically equivalent English/Japanese Claude file, schema, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 26: Claude MCP File Detail

**Purpose**: Add masked detail for standalone Claude `.mcp.json` with whole-entry replacement and launch-`cwd` relative bases.

**Independent Test**: Open hostile and malformed root files and verify local→project→User→plugin→connector whole-entry replacement facts, launch-`cwd` command/argument bases, duplicate uncertainty, masking, diagnostics, and zero connection.

**Visible Checkpoint**: Selecting Claude `.mcp.json` shows exact file semantics and inactive server declarations.

### Tests first

- [ ] T314 [P] [US2] Add failing Claude MCP tests for local→project→User→plugin→connector whole-entry replacement and launch-`cwd` relative command/argument bases in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T315 [P] [US2] Add zero-connection tests for Claude file servers, commands, URLs, headers, environment, DNS, sockets, auth, expansion, connector state, and referenced files in `tests/integration/security/zero-activation.test.ts`
- [ ] T316 [P] [US2] Add failing Claude MCP-file detail API tests for masked fields, file schema, base paths, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T317 [US2] Add failing Claude MCP-file runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T318 [US2] Add browser acceptance for masked Claude MCP-file detail, replacement order, base paths, diagnostics, and zero connection behavior in `tests/e2e/claude-mcp-files-detail.spec.ts`

### Implementation

- [ ] T319 [US2] Add Claude MCP whole-entry replacement, launch-base, duplicate, scope, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T320 [US2] Implement Claude MCP-file metadata with whole-entry replacement and launch-`cwd` relative bases in `src/inspection/recognizers/claude.ts`
- [ ] T321 [US2] Implement the bounded inert strict-JSON core with closed Claude MCP-file fields, schema distinctions, limits, atomic failure, and secret-safe origins in `src/inspection/parsers/json.ts`
- [ ] T322 [US2] Integrate Claude MCP-file masking, selection projection, conditions, diagnostics, and non-following relationships in `src/inspection/scan.ts`
- [ ] T323 [US2] Extend typed detail and semantically equivalent English/Japanese Claude MCP replacement, base, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 27: Claude Contained MCP Core

**Purpose**: Attach Claude MCP metadata to already admitted skill owners and implement a closed owner-adapter contract for later settings, agent, plugin, and marketplace owners without registering references to those not-yet-owned behaviors or creating standalone candidates.

**Independent Test**: Inspect accepted skill owners and exercise pure adapter fixtures for future owner kinds with inline/named server references, parent inheritance, plugin component paths, runtime-only connectors, malformed fields, and absent declarations; verify only admitted owners can receive recognition, future adapters grant no read authority, no synthetic file appears, targets remain relationships, and every path has masking and zero connection.

**Visible Checkpoint**: Claude skill-contained MCP facts appear on their existing owners and remain distinguishable from root `.mcp.json`; later owner families can activate their pretested adapter without changing MCP matching or connection safety.

### Tests first

- [ ] T324 [P] [US2] Add failing Claude contained-MCP tests for admitted skills plus pure, non-authorizing settings/agent/plugin/marketplace adapter fixtures, named/inline servers, parent inheritance, plugin paths, connectors, owner provenance, and exact currently owned evidence in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T325 [P] [US2] Add recognition tests proving contained MCP attaches only to an already admitted skill owner at this checkpoint, future owner adapters cannot create candidates or recognitions without an admitted owner, plugin targets are not read, and malformed/absent declarations are omitted atomically in `tests/unit/inspection/recognizers.test.ts`
- [ ] T326 [P] [US2] Add zero-connection tests for every Claude contained owner, relationship, connector, command, URL, header, environment, and referenced path in `tests/integration/security/zero-activation.test.ts`
- [ ] T327 [US2] Add failing Claude contained-MCP relationship/composition graph coverage using only currently owned skill/MCP behaviors, while proving future owner adapters have no unresolved registry references or read authority, in `tests/contract/runtime-composition.test.ts`
- [ ] T328 [US2] Add browser acceptance for Claude skill-contained MCP detail, owner navigation, inheritance, relationships, diagnostics, no rows for unadmitted owner families, and zero connection behavior in `tests/e2e/claude-contained-mcp.spec.ts`

### Implementation

- [ ] T329 [US2] Extend Claude MCP strategies for the currently admitted skill owner and define a closed non-authorizing adapter interface for later owner, parent-inheritance, plugin/runtime-reference, and contained-declaration conditions in `shared/registries/runtime-composition.ts`
- [ ] T330 [US2] Implement Claude skill-contained MCP metadata plus owner-gated adapter dispatch, owner provenance, relationship-only targets, and runtime-only facts in `src/inspection/recognizers/claude.ts`
- [ ] T331 [US2] Extend the existing YAML and Markdown extraction for currently admitted skill-contained MCP fields, and define only a pure future JSON/JSONC owner-adapter schema without parsing an unadmitted settings/plugin owner, in `src/inspection/parsers/json.ts`, `src/inspection/parsers/yaml.ts`, and `src/inspection/parsers/markdown.ts`
- [ ] T332 [US2] Integrate read-once recognition for currently admitted owners, recursive masking, conditions, diagnostics, non-following relationships, and a hard requirement that future adapter dispatch receives an independently admitted owner ID in `src/inspection/scan.ts`
- [ ] T333 [US2] Extend typed detail and semantically equivalent English/Japanese Claude contained-MCP owner, inheritance, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 28: Copilot CLI MCP Files Inventory

**Purpose**: Add Copilot CLI `.mcp.json` and `.github/mcp.json` descendant-inventory candidates.

**Independent Test**: Inventory root and nested CLI-context files, reject extra schemas, User config, session additions, plugin targets, hosted state, links, aliases, and near misses, and preserve exact runtime-chain/trust uncertainty.

**Visible Checkpoint**: Users can filter Copilot CLI MCP files with context and schema provenance.

### Fixtures and tests first

- [ ] T334 [US1] Create Copilot CLI MCP fixtures for root/nested `.mcp.json`, `.github/mcp.json`, duplicates, malformed JSON, hostile commands, secrets, links, aliases, User/session/plugin/hosted state, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T335 [US1] Materialize Copilot CLI MCP behavior, `copilot.repo.mcp`, selection, path-negative User/session/hosted/configured cases without an exclusion ID, relationship-only plugin paths, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T336 [P] [US1] Add failing matcher/recognition tests for both CLI selectors, descendant inventory, runtime-chain/trust conditions, schema provenance, and no User/session/plugin/hosted candidate in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T337 [US1] Add browser acceptance for Copilot CLI MCP rows, context/schema badges, filters, exclusions, diagnostics, and no connection controls in `tests/e2e/copilot-cli-mcp-inventory.spec.ts`

### Implementation

- [ ] T338 [US1] Add Copilot CLI MCP lookup statements plus non-authorizing `copilot.behavior.cli.user.mcp` before CLI MCP selection references it in `shared/registries/vendor-behaviors.ts`
- [ ] T339 [US1] Add only the two selectors of `copilot.repo.mcp`, keep User/session/hosted/configured locations path-negative without an exclusion ID, and retain plugin paths as relationships in `shared/registries/inspection-rules.ts`
- [ ] T340 [US1] Add Copilot CLI MCP evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T341 [US1] Implement Copilot descendant CLI MCP matching and schema-qualified recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T342 [US1] Integrate Copilot CLI MCP classification and preserve shared root physical identity in `src/inspection/scan.ts`
- [ ] T343 [US1] Extend MCP inventory rows and semantically equivalent English/Japanese Copilot CLI context, schema, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 29: Copilot CLI MCP Detail

**Purpose**: Add masked Copilot CLI MCP detail with source order, trust, ancestor-duplicate uncertainty, and zero connection.

**Independent Test**: Open hostile and malformed CLI files and verify session-additional→plugin→workspace→User ordering facts, unknown ancestor duplicates, runtime-chain/trust conditions, masking, diagnostics, and zero connection or target promotion.

**Visible Checkpoint**: Selecting a Copilot CLI MCP file shows exact local ordering and uncertainty.

### Tests first

- [ ] T344 [P] [US2] Add failing Copilot CLI MCP tests for session-additional→plugin→workspace→User order, unknown ancestor duplicates, runtime-chain/trust conditions, schemas, and provenance in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T345 [P] [US2] Add zero-connection tests for Copilot CLI servers, commands, URLs, headers, environment, DNS, sockets, auth, expansion, session/plugin state, and referenced files in `tests/integration/security/zero-activation.test.ts`
- [ ] T346 [P] [US2] Add failing Copilot CLI MCP-detail API tests for masked fields, schemas, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T347 [US2] Add failing Copilot CLI MCP runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T348 [US2] Add browser acceptance for masked Copilot CLI MCP detail, order, duplicates, trust, diagnostics, and zero connection behavior in `tests/e2e/copilot-cli-mcp-detail.spec.ts`

### Implementation

- [ ] T349 [US2] Add Copilot CLI MCP source-order, ancestor-duplicate, trust, context, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T350 [US2] Implement Copilot CLI MCP ordering, duplicate uncertainty, trust, schemas, and provenance metadata in `src/inspection/recognizers/copilot.ts`
- [ ] T351 [US2] Extend JSON extraction with closed Copilot CLI MCP fields, schema distinctions, and secret-safe origins in `src/inspection/parsers/json.ts`
- [ ] T352 [US2] Integrate Copilot CLI MCP masking, selection projection, conditions, diagnostics, and non-following relationships in `src/inspection/scan.ts`
- [ ] T353 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot CLI MCP order, trust, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 30: Copilot VS Code MCP File Inventory

**Purpose**: Add only root `.vscode/mcp.json` as the dedicated Copilot VS Code MCP schema.

**Independent Test**: Inventory the exact root file, reject descendants, general `.vscode/settings.json`, User/profile MCP, CLI schema conflation, links, aliases, and near misses.

**Visible Checkpoint**: Users can identify the VS Code `servers` schema separately from Copilot CLI MCP files.

### Fixtures and tests first

- [ ] T354 [US1] Create Copilot VS Code MCP fixtures for exact root, descendant near misses, malformed `servers` schema, hostile commands, secrets, links, aliases, general settings, User/profile state, and CLI-schema confusion in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T355 [US1] Materialize Copilot VS Code MCP behavior, non-authorizing `copilot.behavior.vscode.user.mcp` and `copilot.behavior.vscode.agents` facts, exact candidate, selection, path-negative general-settings/descendant/User/profile cases without `copilot.excluded.vscode-settings`, relationships, and reciprocal evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T356 [P] [US1] Add failing matcher/recognition tests for exact `copilot.repo.mcp.vscode`, dedicated `servers` schema, descendant/general-settings/User/profile rejection, and no CLI-schema collapse in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T357 [US1] Add browser acceptance for Copilot VS Code MCP row, schema badge, filters, exclusions, diagnostics, and no connection controls in `tests/e2e/copilot-vscode-mcp-inventory.spec.ts`

### Implementation

- [ ] T358 [US1] Add Copilot VS Code MCP lookup statements plus non-authorizing `copilot.behavior.vscode.user.mcp` and `copilot.behavior.vscode.agents` facts before VS Code MCP selection and the dormant owner adapter reference them, without admitting Custom Agent files, in `shared/registries/vendor-behaviors.ts`
- [ ] T359 [US1] Add only the exact VS Code MCP candidate and keep general settings, descendant, User, and profile locations path-negative without prematurely owning `copilot.excluded.vscode-settings` or defining new MCP exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T360 [US1] Add Copilot VS Code MCP evidence plus reciprocal backlinks for both non-authorizing VS Code MCP/agent facts owned in this phase in `shared/registries/official-sources.ts`
- [ ] T361 [US1] Implement root-exact Copilot VS Code MCP matching and dedicated-schema recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T362 [US1] Integrate Copilot VS Code MCP classification without changing CLI candidates in `src/inspection/scan.ts`
- [ ] T363 [US1] Extend MCP inventory rows and semantically equivalent English/Japanese Copilot VS Code schema and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 31: Copilot VS Code MCP Detail

**Purpose**: Add masked VS Code MCP detail with workspace/User duplicate uncertainty and trust conditions.

**Independent Test**: Open hostile and malformed `.vscode/mcp.json` and verify dedicated schema fields, unknown workspace/User same-name resolution, trust, masking, diagnostics, and zero connection.

**Visible Checkpoint**: Selecting the VS Code MCP file shows schema-specific safe detail and uncertainty.

### Tests first

- [ ] T364 [P] [US2] Add failing Copilot VS Code MCP tests for `servers` schema, workspace scope, unknown workspace/User duplicates, trust, provenance, and exact evidence in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T365 [P] [US2] Add zero-connection tests for VS Code MCP commands, URLs, headers, environment, DNS, sockets, authentication, trust prompts, and User/profile state in `tests/integration/security/zero-activation.test.ts`
- [ ] T366 [P] [US2] Add failing VS Code MCP-detail API tests for masked fields, dedicated schema, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T367 [US2] Add failing VS Code MCP runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T368 [US2] Add browser acceptance for masked VS Code MCP detail, schema, duplicate uncertainty, trust, diagnostics, and zero connection behavior in `tests/e2e/copilot-vscode-mcp-detail.spec.ts`

### Implementation

- [ ] T369 [US2] Add Copilot VS Code MCP workspace/User duplicate, trust, schema, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T370 [US2] Implement Copilot VS Code MCP schema, duplicate uncertainty, trust, and provenance metadata in `src/inspection/recognizers/copilot.ts`
- [ ] T371 [US2] Add bounded inert JSONC mode to the existing strict-JSON core, with closed VS Code MCP fields, schema distinctions, comments support, limits, atomic failure, and secret-safe origins in `src/inspection/parsers/json.ts`
- [ ] T372 [US2] Integrate VS Code MCP masking, conditions, diagnostics, and non-following relationships in `src/inspection/scan.ts`
- [ ] T373 [US2] Extend typed detail and semantically equivalent English/Japanese VS Code MCP schema, trust, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 32: Copilot Agent-Contained MCP Contract and Cloud Runtime Facts

**Purpose**: Implement a dormant, owner-gated Copilot custom-agent MCP adapter before Custom Agents are admitted, while exposing Cloud out-of-box, custom-agent, and Repository-settings MCP data only as origin-file-less runtime/source facts; plugin paths remain non-authorizing relationships and settings are not MCP owners.

**Independent Test**: Exercise the pure adapter with an in-memory agent-owner fixture, plugin relationship paths, settings near misses, and Cloud facts; verify the adapter emits no session recognition without an independently admitted agent ID, out-of-box→custom-agent→Repository-settings later-wins facts remain origin-file-less, plugin/settings create no MCP recognition, no synthetic local file appears, and hosted/remote I/O and connections remain zero.

**Visible Checkpoint**: Origin-file-less Cloud MCP facts and their unavailable state are visible; no local agent-contained row appears until the Custom Agents wave admits its owner and activates the pretested adapter.

### Tests first

- [ ] T374 [P] [US2] Add failing pure-adapter/Cloud MCP tests for out-of-box→custom-agent→Repository-settings later-wins, synthetic agent-owner provenance, relationship-only plugin paths, settings non-ownership, origin-file-less Cloud facts for exactly those three sources, and no local-candidate inference in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T375 [P] [US2] Add recognition tests proving the dormant adapter cannot attach MCP without an independently admitted custom-agent ID, plugin paths and settings create no MCP recognition or synthetic file, and Cloud out-of-box/custom-agent/Repository-settings facts have no file ID in `tests/unit/inspection/recognizers.test.ts`
- [ ] T376 [P] [US2] Add zero-connection/network tests for contained servers, hosted repositories and settings, plugins, commands, URLs, auth, and referenced targets in `tests/integration/security/zero-activation.test.ts`
- [ ] T377 [US2] Materialize the exact non-authorizing `copilot.behavior.cloud.mcp` fact with origin-file-less out-of-box/custom-agent/Repository-settings conditions and existing-source evidence backlinks in `tests/fixtures/conformance/vendor-behaviors.json` and `tests/fixtures/conformance/official-sources.json`
- [ ] T378 [US2] Add failing exact ownership and reciprocal-backlink coverage for `copilot.behavior.cloud.mcp` before `shared.excluded.managed-remote-state` references it in `tests/contract/vendor-behaviors.test.ts` and `tests/contract/official-sources.test.ts`
- [ ] T379 [US2] Add failing Copilot Cloud runtime MCP graph coverage plus a pure owner-adapter contract with no unresolved Custom Agent behavior references or candidate-rule additions in `tests/contract/runtime-composition.test.ts`
- [ ] T380 [US2] Add browser acceptance for origin-file-less Cloud runtime facts, unavailable-state labels, diagnostics, zero local hosted rows, and no custom-agent-contained row before owner admission in `tests/e2e/copilot-contained-cloud-mcp.spec.ts`

### Implementation

- [ ] T381 [US2] Add the exact non-authorizing `copilot.behavior.cloud.mcp` origin-file-less runtime/source fact before managed/remote exclusion references it in `shared/registries/vendor-behaviors.ts`
- [ ] T382 [US2] Add reciprocal backlinks for `copilot.behavior.cloud.mcp` to existing official-source records without creating source IDs in `shared/registries/official-sources.ts`
- [ ] T383 [US2] Add exact Copilot Cloud out-of-box→custom-agent→Repository-settings order, origin-file-less facts for those three sources, hosted-unavailable conditions, and a closed non-authorizing custom-agent owner-adapter interface with relationship-only plugin paths in `shared/registries/runtime-composition.ts`
- [ ] T384 [US2] Implement dormant custom-agent-only contained MCP dispatch that requires an admitted owner ID, reject settings/plugin-path ownership, and project origin-file-less Cloud out-of-box/custom-agent/Repository-settings runtime facts with duplicate uncertainty in `src/inspection/recognizers/copilot.ts`
- [ ] T385 [US2] Extend Markdown extraction with closed Copilot agent-contained MCP fields and secret-safe owner origins in `src/inspection/parsers/markdown.ts`
- [ ] T386 [US2] Integrate origin-file-less runtime conditions, plugin-path relationships without recognition, diagnostics, non-following relationships, and an owner-ID gate that keeps local agent-contained recognition dormant until its explicit Phase 54 activation in `src/inspection/scan.ts`
- [ ] T387 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot contained/Cloud owner, unavailable-state, order, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 33: Priority MCP Inventory

**Purpose**: Consolidate every MCP surface available in the first priority wave—Codex config-carrier containment, Claude root and skill containment, Copilot CLI/VS Code files, and Cloud facts—while retaining the later-owner adapters only as internal non-publishing contracts.

**Independent Test**: Verify one physical item/read with separate Claude/Copilot recognitions for root `.mcp.json`, Copilot-only nested/VS Code files, the Codex carrier, Claude skill owners, origin-file-less Cloud facts, no custom-agent/settings/plugin/marketplace owner rows before those families are admitted, no hosted synthetic files, deterministic schema/provenance order, filters, path negatives, aliases, limits, and rescan cleanup.

**Visible Checkpoint**: Users can use the priority MCP inventory, distinguish readable physical files/owners from origin-file-less runtime facts, and see no premature row for an owner family that has not been admitted.

### Tests first

- [ ] T388 [US1] Finalize priority MCP fixtures for root/shared/nested CLI files, VS Code file, the Codex carrier, Claude skill containment, dormant future-owner adapters, plugin-path relationships, settings non-owners, origin-file-less Cloud facts, hostile fields, secrets, aliases, path negatives, and exact limits in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T389 [US1] Finalize priority MCP behavior, file matchers, currently admitted owner/runtime selection, dormant adapter contracts, relationships, path-negative cases, and evidence rows while proving no not-yet-owned plugin/settings exclusion ID and zero contained/runtime candidate rules in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T390 [P] [US1] Add complete matcher tests for Claude root, Copilot CLI/VS Code files, no Codex standalone, path-negative User/hosted/configured inputs, relationship-only plugin paths, and zero candidate rules from contained/runtime MCP facts in `tests/unit/inspection/rules.test.ts`
- [ ] T391 [P] [US1] Add priority recognition-matrix tests for shared root Claude/Copilot, Copilot-only nested/VS Code, the Codex carrier, Claude skill owners, dormant custom-agent/other-Claude-owner adapters, origin-file-less Cloud facts, no synthetic files, schema distinctions, and deterministic provenance in `tests/unit/inspection/recognizers.test.ts`
- [ ] T392 [P] [US1] Add failing integration tests for read-once shared MCP, deterministic recognition/provenance order, currently admitted owner attachment, dormant-owner nonpublication, aliases, limits, partial continuity, and zero connection/target reads in `tests/integration/repository-scan.test.ts`
- [ ] T393 [US1] Add browser acceptance for the priority MCP inventory, shared attribution, currently contained owners, origin-file-less runtime facts, absence of dormant-owner rows, path negatives, schema labels, diagnostics, and keyboard use in `tests/e2e/mcp-inventory.spec.ts`

### Implementation

- [ ] T394 [US1] Complete priority read-once MCP file/owner assembly, deterministic recognition/provenance/schema order, owner-gated dormant adapters, no synthetic files, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T395 [US1] Complete MCP filters, shared recognitions, admitted contained-owner, runtime-fact, and schema summaries without rendering dormant adapters in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T396 [US1] Add semantically equivalent English/Japanese priority MCP inventory, schema, admitted-owner, shared-recognition, runtime-fact, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 34: MCP Comparison

**Purpose**: Extend comparison with literal and typed MCP differences while allowing selection only by real readable physical file IDs; contained MCP is selected through its owner and runtime facts alone are not selectable.

**Independent Test**: Select exactly two current-generation readable physical file IDs from the priority wave, including a contained declaration through an admitted owner and a Codex carrier versus root `.mcp.json` identity-preservation case; verify masked source plus aligned server, transport, schema, base, provenance, trust, selection, replacement, and uncertainty, and reject runtime-fact-only or dormant-owner selection.

**Visible Checkpoint**: Users can compare MCP declarations without connecting to them.

### Tests first

- [ ] T397 [US3] Add failing selection and typed comparison regressions for real readable priority-wave IDs, contained MCP through an admitted owner ID, runtime-fact/dormant-owner rejection, Codex carrier versus `.mcp.json` identity preservation, and server/transport/schema/provenance/trust/selection differences in `tests/unit/app/comparison.test.ts` and `tests/unit/app/recognition-comparison.test.ts`
- [ ] T398 [US3] Add browser acceptance for admitted-owner contained MCP, literal Codex-carrier versus `.mcp.json` diff, typed server/provenance differences, and rejection of runtime-fact-only or dormant-owner selection in `tests/e2e/mcp-comparison.spec.ts`

### Implementation

- [ ] T399 [US3] Enforce MCP comparison selection by real readable physical owner/file IDs and preserve Codex-config versus `.mcp.json` file identity in `app/composables/comparison.ts`
- [ ] T400 [US3] Extend typed MCP comparison rows without exposing origin-file-less runtime facts as selectable files in `app/components/comparison/RecognitionComparison.vue`
- [ ] T401 [US3] Add semantically equivalent English/Japanese MCP comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 35: Codex Rules Inventory

**Purpose**: Add direct-child Codex rule files from possible active project configuration layers.

**Independent Test**: Inventory `./**/.codex/rules/*.rules`, reject nested rule directories, links, near misses, untrusted/runtime-inactive certainty claims, User/managed rules, and unrelated Copilot/Claude files.

**Visible Checkpoint**: Users can filter Codex rules with trust, layer, experimental-status, and direct-child provenance.

### Fixtures and tests first

- [ ] T402 [US1] Create Codex rule fixtures for possible project layers, direct children, nested exclusions, malformed metadata, secrets, references, links, aliases, trust states, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T403 [US1] Materialize Codex rule behavior, candidate, composition, path-negative cases, and evidence rows without defining exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T404 [US1] Add failing matcher/recognition tests for direct-child Codex rules, nested exclusions, project-layer provenance, experimental status, trust uncertainty, and no other-tool recognition in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T405 [US1] Add browser acceptance for Codex rule inventory, filters, provenance, experimental status, exclusions, and diagnostics in `tests/e2e/codex-rules-inventory.spec.ts`

### Implementation

- [ ] T406 [US1] Add Codex rule lookup statements plus non-authorizing `codex.behavior.user.rules` before rule resolution references it in `shared/registries/vendor-behaviors.ts`
- [ ] T407 [US1] Add only the `codex.repo.rules` candidate record and keep adjacent or nested non-matches path-negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T408 [US1] Add Codex rule evidence records and affected-contract references in `shared/registries/official-sources.ts`
- [ ] T409 [US1] Implement Codex direct-child rule matching and path-derived recognition in `src/inspection/rules/codex.ts` and `src/inspection/recognizers/codex.ts`
- [ ] T410 [US1] Extend inventory rows and semantically equivalent English/Japanese Codex rule labels in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 36: Codex Rules Detail

**Purpose**: Add safe Codex rule source, typed trust, active-layer uncertainty, experimental status, and inert relationship detail.

**Independent Test**: Open hostile Codex rules and verify masking, project-layer/trust conditions, active-layer uncertainty, experimental status, inert commands/links, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Codex rule opens safe detail without executing or enforcing it.

### Tests first

- [ ] T411 [P] [US2] Add failing Codex metadata/applicability tests for project layers, trust, active-layer uncertainty, direct-child provenance, and experimental status in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T412 [P] [US2] Add failing tests proving Codex rule text, links, commands, and restrictive results remain inert and never authorize target reads in `tests/integration/security/zero-activation.test.ts`
- [ ] T413 [US2] Add failing Codex rule runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T414 [US2] Add browser acceptance for masked Codex rule detail, trust, applicability, diagnostics, and inert references in `tests/e2e/codex-rules-detail.spec.ts`

### Implementation

- [ ] T415 [US2] Add Codex rule trust, layer, applicability, experimental-status, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T416 [US2] Extend inert rule extraction and scan integration for Codex metadata, applicability, relationships, and masking in `src/inspection/parsers/markdown.ts` and `src/inspection/scan.ts`
- [ ] T417 [US2] Extend typed Codex rule detail fields in `app/components/inspection/RecognitionDetails.vue`
- [ ] T418 [US2] Add semantically equivalent English/Japanese Codex rule detail, trust, applicability, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 37: Claude Rules Inventory

**Purpose**: Add recursive Claude rule files while regressing the already-owned `copilot.excluded.additional-standard-locations` behavior for `.claude/rules`.

**Independent Test**: Inventory `./**/.claude/rules/**/*.md`, preserve possible layer uncertainty, reject unrelated paths and links, and prove that matching Claude rule files do not acquire Copilot recognitions in the initial release.

**Visible Checkpoint**: Users can filter Claude rules with path applicability provenance and no unsupported Copilot badge.

### Fixtures and tests first

- [ ] T419 [US1] Create Claude rule fixtures for recursive paths, possible layers, `paths` frontmatter, nested files, malformed metadata, secrets, references, links, aliases, Copilot-compatible cases, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T420 [US1] Materialize Claude rule behavior, candidate, composition, evidence, and regression references to existing `copilot.excluded.additional-standard-locations` rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T421 [P] [US1] Add failing matcher/recognition tests for recursive Claude rules, layer uncertainty, direct and nested files, and zero Copilot recognition through the existing `copilot.excluded.additional-standard-locations` rule in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T422 [US1] Add browser acceptance for Claude rule inventory, filters, provenance, Copilot-exclusion evidence, diagnostics, and retained Codex rules in `tests/e2e/claude-rules-inventory.spec.ts`

### Implementation

- [ ] T423 [US1] Add Claude rule lookup statements, non-authorizing `claude.behavior.user.rules`, and Copilot-compatibility evidence before rule layering references them in `shared/registries/vendor-behaviors.ts`
- [ ] T424 [US1] Add only the `claude.repo.rules` candidate while preserving and referencing the existing `copilot.excluded.additional-standard-locations` record without defining another exclusion in `shared/registries/inspection-rules.ts`
- [ ] T425 [US1] Add Claude rule evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T426 [US1] Implement Claude recursive rule matching and recognition without Copilot promotion in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T427 [US1] Integrate Claude rule classification and preserve Codex rule results in `src/inspection/scan.ts`
- [ ] T428 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude rule and Copilot-exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 38: Claude Rules Detail

**Purpose**: Add safe Claude rule source, typed `paths` applicability, layer conditions, and inert relationships.

**Independent Test**: Open hostile Claude rules and verify `paths`, unknown glob bases, conditional layers, masking, inert links/commands, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Claude rule shows safe applicability detail without evaluating a glob against arbitrary filesystem paths.

### Tests first

- [ ] T429 [P] [US2] Add failing Claude metadata/applicability tests for `paths`, omitted paths, unknown glob bases, conditional layers, and documentation uncertainty in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T430 [P] [US2] Add failing tests proving Claude rule text, links, commands, globs, and restrictive results remain inert and never authorize target reads in `tests/integration/security/zero-activation.test.ts`
- [ ] T431 [US2] Add failing Claude rule runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T432 [US2] Add browser acceptance for masked Claude rule detail, path applicability, layer conditions, diagnostics, and inert references in `tests/e2e/claude-rules-detail.spec.ts`

### Implementation

- [ ] T433 [US2] Add Claude rule layering, path-applicability, unknown-base, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T434 [US2] Extend inert Markdown extraction and scan integration for Claude rule metadata, applicability, relationships, and masking in `src/inspection/parsers/markdown.ts` and `src/inspection/scan.ts`
- [ ] T435 [US2] Extend typed Claude rule detail fields and semantically equivalent English/Japanese applicability and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 39: Rules Comparison

**Purpose**: Extend comparison with literal and typed rule differences.

**Independent Test**: Compare two rules and verify masked source plus aligned paths, layers, trust, provenance, applicability, and documentation status.

**Visible Checkpoint**: Users can compare rule files without evaluating which rule is correct or stronger.

### Tests first

- [ ] T436 [US3] Add failing typed comparison regressions for rule paths, layers, trust, provenance, and documentation status in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T437 [US3] Add browser acceptance for literal rule diff and typed metadata differences in `tests/e2e/rules-comparison.spec.ts`

### Implementation

- [ ] T438 [US3] Extend typed rule comparison rows in `app/components/comparison/RecognitionComparison.vue`
- [ ] T439 [US3] Add semantically equivalent English/Japanese rule comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 40: Claude Commands Inventory

**Purpose**: Add recursive Claude legacy-command files and namespace provenance.

**Independent Test**: Inventory `./**/.claude/commands/**/*.md`, recursive namespace paths, duplicate names, possible layer uncertainty, links, near misses, and unsupported standalone `.claude/prompts`.

**Visible Checkpoint**: Users can filter Claude commands with recursive namespace and layer provenance.

### Fixtures and tests first

- [ ] T440 [US1] Create Claude command fixtures for recursive namespaces, possible layers, duplicate names, malformed metadata, secrets, references, links, aliases, unsupported `.claude/prompts`, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T441 [US1] Materialize Claude command behavior, candidates, composition, relationships, path-negative cases, and evidence rows without defining exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T442 [US1] Add failing matcher/recognition tests for recursive Claude commands, namespace construction, possible layer uncertainty, and excluded standalone `.claude/prompts` in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T443 [US1] Add browser acceptance for Claude command inventory, namespaces, filters, exclusions, and diagnostics in `tests/e2e/claude-commands-inventory.spec.ts`

### Implementation

- [ ] T444 [US1] Add Claude command lookup statements plus non-authorizing `claude.behavior.user.commands` before command selection references it in `shared/registries/vendor-behaviors.ts`
- [ ] T445 [US1] Add only the `claude.repo.command` candidate and keep prompt, User, and configured-location paths negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T446 [US1] Add Claude command evidence records and affected-contract references in `shared/registries/official-sources.ts`
- [ ] T447 [US1] Implement Claude recursive command matching and namespace recognition in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T448 [US1] Extend command inventory rows and semantically equivalent English/Japanese Claude namespace messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 41: Claude Commands Detail

**Purpose**: Add masked Claude command source, namespace, invocation, same-name skill precedence, applicability, and inert relationship detail.

**Independent Test**: Open hostile Claude commands and verify recursive namespaces, same-name skill precedence, unknown traversal, masking, inert agent/skill references, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Claude command opens safe detail without executing, importing, or reading referenced targets.

### Tests first

- [ ] T449 [P] [US2] Add failing Claude metadata/applicability tests for namespaces, invocation, agent/skill references, same-name skill priority, and unknown ancestor traversal in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T450 [P] [US2] Add failing tests proving Claude command bodies and references do not execute, navigate, import, or read targets in `tests/integration/security/zero-activation.test.ts`
- [ ] T451 [US2] Add failing Claude command runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T452 [US2] Add browser acceptance for masked Claude command detail, namespaces, references, conditions, and diagnostics in `tests/e2e/claude-commands-detail.spec.ts`

### Implementation

- [ ] T453 [US2] Add Claude command selection, namespace, skill precedence, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T454 [US2] Extend Markdown extraction and scan integration for Claude command metadata, references, applicability, and masking in `src/inspection/parsers/markdown.ts` and `src/inspection/scan.ts`
- [ ] T455 [US2] Extend typed Claude command detail fields in `app/components/inspection/RecognitionDetails.vue`
- [ ] T456 [US2] Add semantically equivalent English/Japanese Claude command detail, precedence, reference, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 42: Copilot Commands Inventory

**Purpose**: Add conservative Copilot CLI command recognition for root direct-child `.claude/commands/*.md` only.

**Independent Test**: Inventory root direct-child commands, reject nested commands and unsupported User/configured locations, preserve same physical Claude files, and avoid inventing a broader Copilot command traversal.

**Visible Checkpoint**: Users can identify the Copilot CLI interpretation of supported root command files.

### Fixtures and tests first

- [ ] T457 [US1] Create Copilot command fixtures for root direct children, nested exclusions, duplicate names, shared Claude files, malformed metadata, secrets, references, User/configured paths, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T458 [US1] Materialize Copilot CLI command behavior, conservative candidate, path-negative configured/User cases, composition, and evidence rows without attaching an unrelated exclusion ID in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T459 [P] [US1] Add failing matcher/recognition tests for root direct-child Copilot commands, nested rejection, shared Claude files, and no invented ancestor/User matcher in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T460 [US1] Add browser acceptance for Copilot command rows, CLI provenance, nested exclusions, diagnostics, and retained Claude commands in `tests/e2e/copilot-commands-inventory.spec.ts`

### Implementation

- [ ] T461 [US1] Add Copilot CLI command lookup statements without read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T462 [US1] Add only the conservative `copilot.repo.command` candidate and keep configured/User locations path-negative without defining or referencing an unrelated exclusion ID in `shared/registries/inspection-rules.ts`
- [ ] T463 [US1] Add Copilot command evidence records and affected-contract references in `shared/registries/official-sources.ts`
- [ ] T464 [US1] Implement Copilot root direct-child command matching and recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T465 [US1] Integrate Copilot command classification and read-once shared-file assembly in `src/inspection/scan.ts`
- [ ] T466 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot CLI command messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 43: Copilot Commands Detail

**Purpose**: Add masked Copilot CLI command detail with conservative applicability and same-name skill precedence.

**Independent Test**: Open hostile root command files and verify invocation, skill priority, unknown project ancestry, inert references, masking, diagnostics, and reveal cleanup without importing Claude runtime assumptions.

**Visible Checkpoint**: Selecting a Copilot command shows safe CLI-qualified detail and uncertainty.

### Tests first

- [ ] T467 [P] [US2] Add failing Copilot command metadata tests for invocation, same-name skill priority, direct-child provenance, unknown ancestry, references, and exact evidence in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T468 [P] [US2] Add failing zero-activation tests for Copilot command bodies, references, navigation, imports, and target reads in `tests/integration/security/zero-activation.test.ts`
- [ ] T469 [US2] Add failing Copilot command runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T470 [US2] Add browser acceptance for masked Copilot command detail, invocation, references, conditions, and diagnostics in `tests/e2e/copilot-commands-detail.spec.ts`

### Implementation

- [ ] T471 [US2] Add Copilot command invocation, conservative applicability, skill precedence, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T472 [US2] Extend Copilot command recognition with bounded metadata, conditions, relationships, diagnostics, and evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T473 [US2] Integrate Copilot command parsing, masking, inert references, and raw disposal in `src/inspection/scan.ts`
- [ ] T474 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot command precedence, reference, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 44: Unified Commands Inventory

**Purpose**: Consolidate Claude and Copilot command candidates with correct root-shared and nested-Claude-only recognition.

**Independent Test**: Verify one physical item/read and two recognitions for root direct-child `.claude/commands/*.md`, Claude-only recognition for nested commands, deterministic namespaces/provenance, filters, exclusions, aliases, limits, and rescan cleanup.

**Visible Checkpoint**: Users can distinguish shared root commands from nested Claude-only commands.

### Tests first

- [ ] T475 [US1] Finalize command fixtures for recursive Claude namespaces, root Copilot-compatible commands, nested Claude-only files, duplicate names, secrets, references, aliases, limits, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T476 [US1] Finalize command conformance rows for both vendors, shared recognition, path-negative configured/User cases without an exclusion ID, composition, relationships, and evidence in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T477 [US1] Add complete matcher/recognition-matrix tests for root shared direct children, nested Claude-only commands, namespace construction, and excluded `.claude/prompts` in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T478 [P] [US1] Add failing integration tests for read-once root commands, deterministic recognition/provenance order, aliases, limits, partial continuity, and no referenced-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T479 [US1] Add browser acceptance for unified command inventory, namespaces, shared recognitions, nested Claude-only rows, filters, and diagnostics in `tests/e2e/commands-inventory.spec.ts`

### Implementation

- [ ] T480 [US1] Complete read-once root command assembly, nested Claude-only recognition, deterministic provenance, and exclusions in `src/inspection/scan.ts`
- [ ] T481 [US1] Extend command inventory rows and semantically equivalent English/Japanese namespace, shared-tool, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 45: Commands Comparison

**Purpose**: Extend comparison with literal and typed command differences.

**Independent Test**: Compare two commands and verify masked source plus aligned namespaces, invocation, recognition, precedence, provenance, and references.

**Visible Checkpoint**: Users can compare command files without executing them.

### Tests first

- [ ] T482 [US3] Add failing typed comparison regressions for namespaces, invocation, tool recognition, precedence, and references in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T483 [US3] Add browser acceptance for literal command diff and typed metadata differences in `tests/e2e/commands-comparison.spec.ts`

### Implementation

- [ ] T484 [US3] Extend typed command comparison rows in `app/components/comparison/RecognitionComparison.vue`
- [ ] T485 [US3] Add semantically equivalent English/Japanese command comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 46: Copilot Prompts Inventory

**Purpose**: Add supported Copilot prompt files to the inventory.

**Independent Test**: Inventory direct `.github/prompts/*.prompt.md` files while excluding nested and configured-location candidates.

**Visible Checkpoint**: Users can filter supported Copilot prompts with exact default-location provenance.

### Fixtures and tests first

- [ ] T486 [US1] Create Copilot prompt fixtures for direct children, nested near misses, malformed metadata, secrets, links, `#file` references, images, and URIs in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T487 [US1] Materialize prompt rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T488 [US1] Add failing matcher/recognition tests for exact default prompt location, nested exclusions, and configured-location uncertainty in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T489 [US1] Add browser acceptance for Copilot prompt inventory and exclusions in `tests/e2e/prompts-inventory.spec.ts`

### Implementation

- [ ] T490 [US1] Add Copilot prompt lookup statements plus non-authorizing `copilot.behavior.vscode.user.prompts` before prompt detail and the later User-runtime exclusion reference it in `shared/registries/vendor-behaviors.ts`
- [ ] T491 [US1] Add only the `copilot.repo.prompt` candidate and keep configured/User/non-default locations path-negative without defining or referencing an unrelated exclusion ID in `shared/registries/inspection-rules.ts`
- [ ] T492 [US1] Add prompt evidence records and affected-contract references in `shared/registries/official-sources.ts`
- [ ] T493 [US1] Implement Copilot prompt matching and recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T494 [US1] Extend prompt inventory rows and semantically equivalent location/exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 47: Copilot Prompts Detail

**Purpose**: Add masked prompt source, invocation, scope, applicability, and inert-reference detail.

**Independent Test**: Open hostile prompts and verify masking, explicit invocation, references, no URI/image/navigation behavior, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Copilot prompt opens safe detail without navigating to or reading referenced targets.

### Tests first

- [ ] T495 [P] [US2] Add failing prompt metadata tests for invocation, scope, references, applicability, and evidence in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T496 [P] [US2] Add failing tests proving prompt links, images, URIs, and `#file` targets neither navigate nor authorize reads in `tests/integration/security/zero-activation.test.ts`
- [ ] T497 [US2] Add failing prompt runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T498 [US2] Add browser acceptance for masked prompt detail and inert references in `tests/e2e/prompts-detail.spec.ts`

### Implementation

- [ ] T499 [US2] Add prompt invocation, applicability, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T500 [US2] Extend Markdown extraction and scan integration for prompt metadata, inert references, applicability, and masking in `src/inspection/parsers/markdown.ts` and `src/inspection/scan.ts`
- [ ] T501 [US2] Extend typed prompt detail fields in `app/components/inspection/RecognitionDetails.vue`
- [ ] T502 [US2] Add semantically equivalent English/Japanese prompt detail, invocation, reference, and safety messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 48: Copilot Prompts Comparison

**Purpose**: Extend comparison with literal and typed Copilot prompt differences.

**Independent Test**: Compare two prompts and verify masked source plus aligned invocation, scope, provenance, applicability, and references.

**Visible Checkpoint**: Users can compare Copilot prompts without navigating or executing content.

### Tests first

- [ ] T503 [US3] Add failing typed comparison regressions for prompt invocation, scope, provenance, and references in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T504 [US3] Add browser acceptance for literal prompt diff and typed metadata differences in `tests/e2e/prompts-comparison.spec.ts`

### Implementation

- [ ] T505 [US3] Extend typed prompt comparison rows in `app/components/comparison/RecognitionComparison.vue`
- [ ] T506 [US3] Add semantically equivalent English/Japanese prompt comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 49: Codex Custom Agents Inventory

**Purpose**: Add supported Codex `.codex/agents/*.toml` custom-agent candidates.

**Independent Test**: Inventory direct-child TOML agents at possible project layers, duplicate names, near misses, nested exclusions, links, aliases, arbitrary config-path references, hosted-state exclusions, and traversal uncertainty.

**Visible Checkpoint**: Users can filter Codex custom-agent files with exact project-layer provenance.

### Fixtures and tests first

- [ ] T507 [US1] Create Codex custom-agent fixtures for root/descendant project layers, direct children, nested near misses, duplicate names, malformed TOML, secrets, config-path references, links, aliases, and hosted/User exclusions in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T508 [US1] Materialize Codex custom-agent behavior, matcher, composition, relationships, path-negative cases, and evidence rows without defining exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T509 [US1] Add failing matcher and recognition tests for `codex.repo.agent`, direct-child TOML, nested exclusions, project-layer uncertainty, and no arbitrary config-path promotion in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T510 [US1] Add browser acceptance for Codex custom-agent inventory, filters, provenance, exclusions, diagnostics, and no agent-owned MCP recognition; the existing carrier inheritance remains a detail-time relationship only in `tests/e2e/codex-custom-agents-inventory.spec.ts`

### Implementation

- [ ] T511 [US1] Add Codex custom-agent lookup statements plus non-authorizing `codex.behavior.user.agents` before inheritance references it in `shared/registries/vendor-behaviors.ts`
- [ ] T512 [US1] Add only the Codex custom-agent candidate record and keep nested, configured, User, and managed locations path-negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T513 [US1] Add Codex custom-agent evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T514 [US1] Implement Codex agent matching and bounded recognition in `src/inspection/rules/codex.ts` and `src/inspection/recognizers/codex.ts`
- [ ] T515 [US1] Extend inventory rows for Codex custom-agent kind and project-layer provenance in `app/components/inventory/InventoryItem.vue`
- [ ] T516 [US1] Add semantically equivalent English/Japanese Codex custom-agent inventory and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 50: Codex Custom Agents Detail

**Purpose**: Add safe Codex custom-agent source, spawned-session configuration, inheritance, relationship, and condition detail while reusing the completed Codex MCP carrier as a relationship source rather than making the agent an MCP owner.

**Independent Test**: Open hostile and malformed Codex agents and verify bounded TOML parsing, model/reasoning/sandbox/skills, parent inheritance, reapplied live sandbox/approval facts, MCP carrier inheritance/origin relationships, no agent-owned MCP recognition, config-path relationships, masking, diagnostics, reveal cleanup, and zero connection.

**Visible Checkpoint**: Selecting a Codex custom agent shows safe spawned-session detail and carrier-inheritance relationships without an agent-owned MCP recognition, connection, or configured-path read.

### Tests first

- [ ] T517 [P] [US2] Add failing inert TOML parsing tests for Codex agent fields, strict limits, malformed input, and atomic extraction in `tests/unit/inspection/parsers.test.ts`
- [ ] T518 [P] [US2] Add failing Codex agent tests for model, reasoning, sandbox, skills, closed MCP carrier-origin relationships without an agent-owned MCP recognition, config-path relationships, parent inheritance, and live sandbox/approval reapplication in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T519 [P] [US2] Add failing zero-activation tests proving Codex agent declarations do not execute tools, spawn processes, connect to MCP, or read referenced config paths in `tests/integration/security/zero-activation.test.ts`
- [ ] T520 [US2] Add failing Codex custom-agent runtime-composition graph coverage for carrier inheritance as a relationship only, no agent-owned MCP recognition, and reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T521 [US2] Add browser acceptance for masked Codex custom-agent detail, carrier-linked MCP inheritance relationships without an agent-owned MCP row, diagnostics, and reveal cleanup in `tests/e2e/codex-custom-agents-detail.spec.ts`

### Implementation

- [ ] T522 [US2] Extend the existing bounded inert TOML carrier parser with Codex agent normalization and extraction in `src/inspection/parsers/toml.ts`
- [ ] T523 [US2] Extend the existing Codex config/MCP strategies with relationship-only agent inheritance, spawned-session context, selection, sandbox/approval, and an explicit prohibition on agent-owned MCP recognition in `shared/registries/runtime-composition.ts`
- [ ] T524 [US2] Integrate Codex agent metadata, applicability, masked carrier-linked MCP inheritance/origin relationships, zero agent-owned MCP recognition, zero connection, and raw disposal in `src/inspection/scan.ts`
- [ ] T525 [US2] Extend typed Codex custom-agent detail and uncertainty in `app/components/inspection/RecognitionDetails.vue`
- [ ] T526 [US2] Add semantically equivalent English/Japanese Codex custom-agent detail, inheritance, relationship, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 51: Claude Custom Agents Inventory

**Purpose**: Add recursive Claude subagent files at possible project layers without admitting agent-memory directories as candidates.

**Independent Test**: Inventory supported `.claude/agents/**/*.md` files, duplicate names, layer uncertainty, nested paths, links, malformed content, `--add-dir` runtime facts, and excluded agent-memory/User locations.

**Visible Checkpoint**: Users can filter Claude custom agents with layer provenance and duplicate-name uncertainty.

### Fixtures and tests first

- [ ] T527 [US1] Create Claude subagent fixtures for recursive paths, layers, duplicate names, malformed metadata, secrets, references, memory declarations, links, aliases, `--add-dir` facts, and excluded memory/User locations in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T528 [US1] Reuse the Phase 25-owned Claude Repository agent behavior and materialize the remaining agent/User-memory behaviors, matchers, path-negative cases, composition, relationships, and evidence rows without duplicate behavior or exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T529 [P] [US1] Add failing matcher/recognition tests for recursive Claude agent directories, possible layer roots, duplicate names, and no agent-memory or arbitrary `--add-dir` candidate in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T530 [US1] Add browser acceptance for Claude custom-agent rows, filters, layers, exclusions, diagnostics, and retained Codex agents in `tests/e2e/claude-custom-agents-inventory.spec.ts`

### Implementation

- [ ] T531 [US1] Reuse the Phase 25-owned `claude.behavior.repo.agents` and `claude.behavior.user.mcp-state`, then add only `claude.behavior.user.agents`, `claude.behavior.user.agent-memory`, and `claude.behavior.user.auto-memory` before agent context and relationship strategies reference them in `shared/registries/vendor-behaviors.ts`
- [ ] T532 [US1] Add only the `claude.repo.agent` candidate record and keep memory, User, and additional-directory locations path-negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T533 [US1] Add Claude custom-agent evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T534 [US1] Implement Claude agent matching and bounded recognition in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T535 [US1] Integrate Claude agent classification without reading memory or arbitrary additional directories in `src/inspection/scan.ts`
- [ ] T536 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude agent, layer, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 52: Claude Custom Agents Detail

**Purpose**: Add safe Claude subagent context detail, activate the owner-gated MCP adapter completed in Phase 27, and keep memory and Hook targets inert.

**Independent Test**: Open hostile and malformed Claude agents and verify fresh/fork context, tools, skills, memory-scope facts, nested-spawn limits, duplicate-name uncertainty, agent references, owner-attached MCP metadata, masking, zero activation/connection, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Claude custom agent shows safe context and relationship detail without reading memory or connecting to MCP.

### Tests first

- [ ] T537 [P] [US2] Add failing Claude agent tests for context mode, tools, skills, closed MCP/hook origins, memory scopes, nested spawning, duplicate-name uncertainty, built-in omissions, and agent references in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T538 [P] [US2] Add failing relationship tests for independently admitted skills/agents, excluded memory roots, runtime-only inputs, and zero target promotion in `tests/unit/inspection/relationships.test.ts`
- [ ] T539 [P] [US2] Add failing zero-activation tests for tools, skills, hooks, MCP, memory, commands, links, and agent references in `tests/integration/security/zero-activation.test.ts`
- [ ] T540 [US2] Add failing Claude agent context-composition and Phase 27 MCP owner-adapter activation coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T541 [US2] Add browser acceptance for masked Claude custom-agent detail, context, tools, owner-attached MCP, relationships, diagnostics, zero connection, and reveal cleanup in `tests/e2e/claude-custom-agents-detail.spec.ts`

### Implementation

- [ ] T542 [US2] Add Claude agent selection, fresh/fork context, tools, skill-preload, memory-fact, nested-spawn, and relationship strategies while binding the existing MCP adapter to the now-owned agent behavior in `shared/registries/runtime-composition.ts`
- [ ] T543 [US2] Extend Claude recognition with bounded agent metadata, owner-gated contained MCP, inert Hook origins, applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/claude.ts`
- [ ] T544 [US2] Integrate Claude agent metadata, masking, owner-attached MCP with no synthetic file or connection, relationship-only memory/Hook targets, and raw disposal in `src/inspection/scan.ts`
- [ ] T545 [US2] Extend typed detail and semantically equivalent English/Japanese Claude agent context, memory, relationship, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 53: Copilot Custom Agents Inventory

**Purpose**: Add supported Copilot `.github/agents/*.md` and `.claude/agents/*.md` candidates with separate VS Code, CLI, and Cloud provenance.

**Independent Test**: Inventory direct-child agents at possible contexts, filename variants, duplicate names, shared Claude files, near misses, hosted organization agents as runtime-only facts, and configured/User locations as exclusions.

**Visible Checkpoint**: Users can filter Copilot custom agents with surface-qualified provenance.

### Fixtures and tests first

- [ ] T546 [US1] Create Copilot agent fixtures for both directories, direct-child boundaries, Cloud filename variants, duplicate names, shared Claude files, malformed metadata, secrets, handoffs, configured/User paths, and hosted organization facts in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T547 [US1] Reuse the Phase 30-owned Copilot VS Code agent behavior and materialize the remaining CLI/Cloud agent behaviors, including exact origin-file-less `copilot.behavior.cloud.organization-agents`, matchers, path-negative configured/User/hosted cases, composition, relationships, and evidence rows without duplicate behavior or unrelated exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T548 [P] [US1] Add failing matcher/recognition tests for both Copilot agent directories, direct-child depth, surface provenance, hosted/runtime-only facts, configured-root rejection, and shared Claude files in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T549 [US1] Add browser acceptance for Copilot custom-agent rows, surface badges, filters, exclusions, diagnostics, and retained Codex/Claude agents in `tests/e2e/copilot-custom-agents-inventory.spec.ts`

### Implementation

- [ ] T550 [US1] Reuse the Phase 30-owned `copilot.behavior.vscode.agents`, then add the remaining surface-qualified local-agent facts, `copilot.behavior.vscode.user.agents`, `copilot.behavior.cli.user.agents`, and origin-file-less `copilot.behavior.cloud.organization-agents` before local/Cloud selection and managed/remote exclusion references them in `shared/registries/vendor-behaviors.ts`
- [ ] T551 [US1] Add only the `copilot.repo.agent` candidate and keep configured/User/hosted locations path-negative without defining or referencing an unrelated exclusion ID in `shared/registries/inspection-rules.ts`
- [ ] T552 [US1] Add Copilot custom-agent evidence records and reciprocal affected-contract references, including existing-source backlinks for `copilot.behavior.cloud.organization-agents`, in `shared/registries/official-sources.ts`
- [ ] T553 [US1] Implement Copilot agent matching and surface-qualified recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T554 [US1] Integrate Copilot agent classification and read-once shared physical-file assembly in `src/inspection/scan.ts`
- [ ] T555 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot agent, surface, shared-file, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 54: Copilot Custom Agents Detail

**Purpose**: Add safe Copilot agent detail, activate the Phase 32 owner-gated MCP adapter, preserve VS Code/CLI/Cloud context differences, and defer only Hook-family semantics.

**Independent Test**: Open hostile and malformed Copilot agents and verify body, tools, model, invocation, handoffs, instructions, skills, closed Hook origins, owner-attached MCP, surface selection, masking, zero activation/connection, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting a Copilot custom agent shows separate surface-aware context without executing handoffs, hooks, tools, or MCP.

### Tests first

- [ ] T556 [P] [US2] Add failing Copilot agent tests for VS Code/CLI/Cloud bodies, tools, model, handoffs, instructions, skills, closed Hook origins, Phase 32 MCP adapter activation, and surface selection in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T557 [P] [US2] Add failing relationship tests for handoffs, links, skill preload, instructions, runtime-only organization agents, and zero target promotion in `tests/unit/inspection/relationships.test.ts`
- [ ] T558 [P] [US2] Add failing zero-activation tests proving Copilot agent declarations do not invoke tools, handoffs, hooks, MCP, links, or referenced files in `tests/integration/security/zero-activation.test.ts`
- [ ] T559 [US2] Add failing Copilot agent context-composition and owner-gated MCP activation graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T560 [US2] Add browser acceptance for masked Copilot custom-agent detail, surface context, owner-attached MCP, relationships, diagnostics, zero connection, and reveal cleanup in `tests/e2e/copilot-custom-agents-detail.spec.ts`

### Implementation

- [ ] T561 [US2] Add separate Copilot VS Code, CLI, and Cloud agent selection, context, handoff, tool, and relationship strategies while binding the Phase 32 MCP adapter to admitted agent owners in `shared/registries/runtime-composition.ts`
- [ ] T562 [US2] Extend Copilot recognition with bounded agent metadata, owner-gated MCP, inert Hook origins, applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T563 [US2] Integrate Copilot agent metadata, masking, owner-attached MCP with no synthetic file or connection, relationship-only Hook targets, and raw disposal in `src/inspection/scan.ts`
- [ ] T564 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot agent context, handoff, surface, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 55: Unified Custom Agents Inventory

**Purpose**: Consolidate all custom-agent candidates, read shared Claude/Copilot files once, regress the owner-attached MCP adapters activated in Phases 52 and 54, and preserve Codex carrier inheritance as a relationship only.

**Independent Test**: Use an all-vendor agent fixture and verify one physical row/read for shared `.claude/agents/*.md`, separate Claude/Copilot agent and MCP recognitions on the same owner ID, Codex carrier inheritance relationships with no Codex agent-owned MCP recognition, deterministic provenance, no synthetic MCP file or connection, filters, duplicate-name uncertainty, exclusions, limits, and rescan cleanup.

**Visible Checkpoint**: Users can understand the complete custom-agent inventory, shared Claude/Copilot interpretations and owner-attached MCP facts, and Codex carrier-inheritance relationships without duplicate files or incorrect MCP ownership.

### Tests first

- [ ] T565 [US1] Finalize all-vendor custom-agent fixtures for every supported path, layer, duplicate name, shared Claude/Copilot file, Claude/Copilot owner-attached MCP declaration, Codex carrier-inheritance relationship, malformed metadata, secret field, reference, exclusion, alias, and limit in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T566 [US1] Finalize custom-agent behavior, matchers, Claude/Copilot owner-gated MCP composition, Codex relationship-only carrier inheritance, path-negative configured/User/hosted cases without an exclusion ID, and evidence conformance rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T567 [US1] Add complete matcher/recognition-matrix tests for Codex TOML with no agent-owned MCP recognition, Claude recursive Markdown, Copilot directories, shared Claude/Copilot files with agent plus MCP recognitions on one owner ID, traversal uncertainty, and exclusions in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T568 [P] [US1] Add failing integration tests for read-once shared agents, deterministic Claude/Copilot agent/MCP recognition and provenance order, Codex relationship-only carrier inheritance, aliases, limits, isolated failures, zero synthetic files/connections, and zero relationship-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T569 [US1] Add browser acceptance for unified custom-agent inventory, filters, shared Claude/Copilot owner-attached MCP recognitions, Codex carrier-inheritance relationships without an agent-owned MCP row, duplicate uncertainty, exclusions, diagnostics, and keyboard use in `tests/e2e/custom-agents-inventory.spec.ts`

### Implementation

- [ ] T570 [US1] Complete deterministic physical-file assembly, Claude/Copilot agent/MCP recognition, Codex relationship-only carrier inheritance, provenance, exclusions, and no-synthetic-file behavior for custom agents in `src/inspection/scan.ts`
- [ ] T571 [US1] Extend inventory rows for all custom-agent kinds, shared recognitions, provenance, and duplicate-name uncertainty in `app/components/inventory/InventoryItem.vue`
- [ ] T572 [US1] Add semantically equivalent English/Japanese unified custom-agent inventory and shared-recognition messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 56: Custom Agents Comparison

**Purpose**: Extend comparison with literal and typed custom-agent differences.

**Independent Test**: Compare two custom agents and verify masked source plus aligned context, tools, Claude/Copilot owner-attached MCP or Codex carrier-inheritance relationships as applicable, provenance, relationship, and condition differences.

**Visible Checkpoint**: Users can compare custom-agent definitions without executing or ranking them.

### Tests first

- [ ] T573 [US3] Add failing comparison regressions for typed agent context, tools, Claude/Copilot owner-attached MCP, Codex carrier-inheritance relationships without agent-owned MCP, provenance, and condition differences in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T574 [US3] Add browser acceptance for literal custom-agent diff, typed context/tool differences, and vendor-correct MCP ownership/relationship presentation in `tests/e2e/custom-agents-comparison.spec.ts`

### Implementation

- [ ] T575 [US3] Extend typed custom-agent comparison rows with Claude/Copilot owner-attached MCP and Codex relationship-only carrier inheritance kept distinct in `app/components/comparison/RecognitionComparison.vue`
- [ ] T576 [US3] Add semantically equivalent English/Japanese custom-agent comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 57: Codex Configuration Recognition

**Purpose**: Add the `settings/config` recognition and inventory presentation to the `.codex/config.toml` carrier already admitted in Phase 23, without adding a second candidate, behavior record, evidence record, or file read.

**Independent Test**: Reuse root and descendant carriers with direct and near-miss paths, links, malformed filenames, and trust-conditional provenance; verify the same physical ID/read now has both existing MCP and new `settings/config` recognition, configured instruction fallbacks remain unchanged, and higher-scope paths remain negative without new Repository exclusion IDs.

**Visible Checkpoint**: Users can filter Codex project configuration on the same physical carrier already used for MCP and fallback derivation, while no configured path gains read authority.

### Fixtures and tests first

- [ ] T577 [US1] Extend the existing Codex carrier fixtures with general configuration fields, layer variants, near misses, links, aliases, malformed files, secrets, inline declarations, and path-negative higher-scope cases in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T578 [US1] Materialize the new `settings/config` recognition and trust-condition rows while reusing the already owned `codex.repo.config` candidate, config behaviors, and exact evidence records in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T579 [P] [US1] Add failing registry and matcher regressions proving Phase 23 remains the single owner of `codex.repo.config` and `./**/.codex/config.toml`, no duplicate candidate is added, and higher-scope locations remain path-negative without invented exclusions in `tests/contract/inspection-rules.test.ts` and `tests/unit/inspection/rules.test.ts`
- [ ] T580 [P] [US1] Add failing Codex configuration recognition tests for the new `settings/config` kind, layer provenance, trust uncertainty, coexistence with existing MCP recognition/fallback provenance, and absence of premature Hook recognition in `tests/unit/inspection/recognizers.test.ts`
- [ ] T581 [US1] Add failing scan tests for deterministic recognition augmentation on the existing Codex carrier, one verified read, preserved MCP/fallback identities, isolated failures, hard-link aliases, and zero configured-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T582 [US1] Add browser acceptance for Codex configuration rows, filters, layer provenance, existing MCP/fallback badges, exclusions, diagnostics, and one physical carrier row in `tests/e2e/codex-config-inventory.spec.ts`

### Implementation

- [ ] T583 [US1] Reuse the Phase 15-owned Codex project/User configuration behavior statements and add no duplicate behavior ID in `shared/registries/vendor-behaviors.ts`
- [ ] T584 [US1] Reuse the Phase 23-owned `codex.repo.config` candidate, add no rule ID, and keep `codex.excluded.user-runtime` deferred to the consent-gated Global phase in `shared/registries/inspection-rules.ts`
- [ ] T585 [US1] Reuse and extend reciprocal presentation coverage for the existing Codex configuration evidence records without creating source IDs in `shared/registries/official-sources.ts`
- [ ] T586 [US1] Add path-derived `settings/config` recognition to the existing carrier matcher without parsing configured targets or altering MCP/fallback recognitions in `src/inspection/recognizers/codex.ts`
- [ ] T587 [US1] Integrate deterministic recognition augmentation on the read-once Codex carrier while preserving prior skill, instruction, and MCP results in `src/inspection/scan.ts`
- [ ] T588 [US1] Extend inventory filters, rows, and semantically equivalent English/Japanese Codex configuration messages in `app/components/inventory/InventoryFilters.vue`, `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 58: Codex Configuration Detail

**Purpose**: Extend the minimum bounded TOML carrier from Phases 23–24 with the remaining inert Codex configuration fields and their `settings/config` detail; configured instruction fallbacks and MCP detail are already active.

**Independent Test**: Open malformed and secret-bearing project config layers and verify extension of the existing atomic TOML parse, root-to-`cwd` precedence, closest-value behavior, trust, relative bases, already active fallback/MCP fields, remaining inert declarations, masking, diagnostics, and reveal cleanup without a second read or derivation.

**Visible Checkpoint**: Selecting `.codex/config.toml` shows safe typed configuration and fallback declarations without reading any declared target.

### Tests first

- [ ] T589 [US2] Add failing bounded TOML tests for arrays/tables, strict UTF-8, malformed values, depth/nodes/scalars/metadata limits, relative-path bases, and atomic extraction in `tests/unit/inspection/parsers.test.ts`
- [ ] T590 [P] [US2] Add failing Codex config tests for root-to-`cwd` layers, closest-value behavior, trust, at most 16 literal fallback basenames of at most 128 UTF-8 bytes, declarations, and excluded higher scopes in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T591 [P] [US2] Add failing relationship and safety tests proving fallback names, agent config paths, model-instruction paths, compact-prompt paths, skill paths, hook fields, and MCP fields authorize zero target reads or activation in `tests/unit/inspection/relationships.test.ts` and `tests/integration/security/zero-activation.test.ts`
- [ ] T592 [P] [US2] Add failing Codex configuration strategy and registry-graph coverage for extension of existing precedence, trust, relative bases, active instruction/MCP projection, and still-deferred Hook projection in `tests/contract/runtime-composition.test.ts`
- [ ] T593 [P] [US2] Add failing file-detail/reveal contracts for masked TOML values, strict/stale IDs, no-store behavior, diagnostics, and bounded metadata in `tests/contract/http-api-files.test.ts` and `tests/contract/http-api-reveals.test.ts`
- [ ] T594 [US2] Add browser acceptance for masked Codex configuration detail, precedence, trust, fallback declarations, inert relationships, diagnostics, and reveal cleanup in `tests/e2e/codex-config-detail.spec.ts`

### Implementation

- [ ] T595 [US2] Extend the existing bounded inert TOML carrier extraction with remaining Codex project-configuration fields and relative-base metadata while preserving closed fallback/MCP extraction in `src/inspection/parsers/toml.ts`
- [ ] T596 [US2] Extend the existing `codex.config.precedence` strategy with general configuration values, trust, closest-value, relative-base, and still-inert Hook declarations in `shared/registries/runtime-composition.ts`
- [ ] T597 [US2] Extend Codex recognition with bounded config fields, fallback-name metadata, relationships, applicability, diagnostics, and exact evidence in `src/inspection/recognizers/codex.ts`
- [ ] T598 [US2] Integrate the extended atomic TOML parse, recursive masking, relationship-only targets, and immediate raw disposal while preserving already derived fallback files and existing MCP recognition without rederivation or a second read in `src/inspection/scan.ts`
- [ ] T599 [US2] Extend typed configuration detail for layers, trust, fallback declarations, conditions, and inert relationships in `app/components/inspection/RecognitionDetails.vue` and `app/components/inspection/RelationshipList.vue`
- [ ] T600 [US2] Add semantically equivalent English/Japanese Codex configuration detail, trust, fallback, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 59: Claude Settings Inventory

**Purpose**: Add the two exact-launch Claude settings files without inheriting parent or descendant candidates.

**Independent Test**: Inventory only root `.claude/settings.json` and `.claude/settings.local.json`, reject nested/parent-like near misses and standalone hook/workflow files, and preserve Codex configuration results.

**Visible Checkpoint**: Users can identify exact-launch Claude settings files and their project/local layers.

### Fixtures and tests first

- [ ] T601 [US1] Create Claude settings fixtures for both exact files, parent/descendant near misses, links, aliases, malformed JSONC, secrets, contained declarations, workflows, and path-negative User/managed state in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T602 [US1] Materialize only the `claude.repo.settings` Repository candidate with its behavior, evidence, and exact-launch rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T603 [P] [US1] Add failing matcher tests for exact root `.claude/settings.json` and `.claude/settings.local.json`, no ancestor/descendant matching, and no standalone Claude hook, prompt, workflow, or agent-memory candidate in `tests/unit/inspection/rules.test.ts`
- [ ] T604 [P] [US1] Add failing Claude settings recognition tests for tool, `settings/config` kind, project/local layer, exact provenance, and a still-dormant Phase 27 MCP adapter until bounded settings parsing is added in Phase 60, with Hook recognition still absent, in `tests/unit/inspection/recognizers.test.ts`
- [ ] T605 [US1] Add browser acceptance for Claude settings rows, exact layers, exclusions, filters, diagnostics, and retained Codex configuration in `tests/e2e/claude-settings-inventory.spec.ts`

### Implementation

- [ ] T606 [US1] Add Claude exact-launch settings lookup statements plus non-authorizing `claude.behavior.user.settings` before settings and later composition strategies reference it in `shared/registries/vendor-behaviors.ts`
- [ ] T607 [US1] Add only the Repository candidate `claude.repo.settings`; cover unsupported standalone files with path-negative tests and defer `claude.excluded.user-runtime` to the consent-gated Global phase in `shared/registries/inspection-rules.ts`
- [ ] T608 [US1] Add Claude settings evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T609 [US1] Implement exact-launch Claude settings matching and path-derived recognition in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T610 [US1] Integrate Claude settings classification without broadening the Repository boundary or changing Codex results in `src/inspection/scan.ts`
- [ ] T611 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude settings, layer, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 60: Claude Settings Detail

**Purpose**: Add bounded JSONC detail for Claude settings, activate the Phase 27 owner-gated MCP adapter on these admitted files, and continue deferring Hook-family semantics.

**Independent Test**: Open malformed and secret-bearing settings and verify atomic JSONC parsing, exact project/local precedence, selected-component declarations, owner-attached MCP metadata, surface conditions, recursive masking, inert relationships, zero connection, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting Claude settings shows safe layer-aware detail and owner-attached MCP without activating components, connecting to servers, or creating a standalone contained-family file.

### Tests first

- [ ] T612 [US2] Add failing inert JSONC tests for comments, known fields, strict UTF-8, malformed structures, depth/nodes/scalars/metadata limits, and atomic extraction in `tests/unit/inspection/parsers.test.ts`
- [ ] T613 [P] [US2] Add failing Claude settings tests for exact launch-root scope, no parent/descendant matching, project/local precedence, selected components, closed declaration origins, and surface availability in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T614 [P] [US2] Add failing zero-activation tests proving settings-selected agents, plugins, hooks, MCP, commands, paths, workflows, and references remain inert and non-following in `tests/integration/security/zero-activation.test.ts`
- [ ] T615 [US2] Add failing Claude settings runtime-composition graph coverage with reciprocal contract references, Phase 27 MCP adapter activation, and only Hook semantics deferred in `tests/contract/runtime-composition.test.ts`
- [ ] T616 [US2] Add browser acceptance for masked Claude settings detail, layer precedence, selected-component declarations, owner-attached MCP, zero connection, diagnostics, and reveal cleanup in `tests/e2e/claude-settings-detail.spec.ts`

### Implementation

- [ ] T617 [US2] Extend the existing bounded inert JSONC mode with allowlisted Claude settings fields and closed declaration origins in `src/inspection/parsers/json.ts`
- [ ] T618 [US2] Add Claude settings precedence, selection, surface, and relationship strategies, bind the existing MCP adapter to the now-owned settings behavior, and leave Hook composition deferred in `shared/registries/runtime-composition.ts`
- [ ] T619 [US2] Extend Claude recognition with bounded settings metadata, owner-gated contained MCP, applicability, relationship-only targets, diagnostics, and evidence in `src/inspection/recognizers/claude.ts`
- [ ] T620 [US2] Integrate Claude JSONC parsing, recursive masking, owner-attached MCP with no synthetic file or connection, inert Hook declarations, and raw disposal in `src/inspection/scan.ts`
- [ ] T621 [US2] Extend typed settings detail and semantically equivalent English/Japanese Claude precedence, selection, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 61: Copilot Settings Inventory

**Purpose**: Add the supported Copilot settings files while preserving the explicit exclusion of general `.vscode/settings.json` and configured roots.

**Independent Test**: Inventory root `.github/copilot/settings.json`, `.github/copilot/settings.local.json`, and the supported Claude-compatible settings files; reject general `.vscode/settings.json`, nested/configured paths, User state, CLI LSP, and unrelated files, while deferring CLI extension exclusion ownership to Phase 80.

**Visible Checkpoint**: Users can identify supported Copilot settings candidates and surface provenance without seeing excluded VS Code or CLI state.

### Fixtures and tests first

- [ ] T622 [US1] Create Copilot settings fixtures for supported GitHub and Claude-compatible files, shared physical files, malformed JSONC, secrets, plugin recommendations, contained hooks, configured-root attempts, `.vscode/settings.json`, `.github/lsp.json`, and path-negative User state in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T623 [US1] Materialize `copilot.repo.settings`, non-authorizing `copilot.behavior.vscode.settings` and `copilot.behavior.cli.lsp`, `copilot.excluded.vscode-settings`, and `copilot.excluded.cli-lsp` with their exact affected-behavior references, evidence, and surface rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T624 [P] [US1] Add failing matcher and registry tests for exact supported Copilot settings selectors, `copilot.excluded.vscode-settings` → `copilot.behavior.vscode.settings`, `copilot.excluded.cli-lsp` → `copilot.behavior.cli.lsp`, path-negative nested/User/hosted locations, and no CLI-extension policy before Phase 80 in `tests/unit/inspection/rules.test.ts` and `tests/contract/inspection-rules.test.ts`
- [ ] T625 [P] [US1] Add failing recognition tests for Copilot `settings/config` kind, surface provenance, shared Claude-compatible files, and no premature Hook/Plugin/MCP recognitions in `tests/unit/inspection/recognizers.test.ts`
- [ ] T626 [US1] Add browser acceptance for Copilot settings rows, filters, shared-file badges, exclusions, diagnostics, and retained Codex/Claude rows in `tests/e2e/copilot-settings-inventory.spec.ts`

### Implementation

- [ ] T627 [US1] Add surface-qualified Copilot settings lookup plus non-authorizing `copilot.behavior.vscode.settings`, `copilot.behavior.cli.lsp`, `copilot.behavior.vscode.user.settings`, `copilot.behavior.cli.user.settings`, and `copilot.behavior.cli.user.lsp` so settings strategies and exact exclusion references resolve without read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T628 [US1] Add `copilot.repo.settings` and own exactly `copilot.excluded.vscode-settings` plus `copilot.excluded.cli-lsp`; keep settings configured roots path-negative, reuse the Phase 19-owned instruction/skill `copilot.excluded.extra-directories` rule, defer CLI extensions to Phase 80, and defer `copilot.excluded.user-runtime` to Phase 98 in `shared/registries/inspection-rules.ts`
- [ ] T629 [US1] Add Copilot settings evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T630 [US1] Implement Copilot settings matching and path-derived surface recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T631 [US1] Integrate Copilot settings classification and read-once physical-file assembly in `src/inspection/scan.ts`
- [ ] T632 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot settings, surface, shared-file, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 62: Copilot Settings Detail

**Purpose**: Add bounded Copilot settings detail with surface-specific precedence and inert declaration metadata.

**Independent Test**: Open malformed and secret-bearing settings and verify VS Code/CLI layers, enablement, recommendations, compatible Claude settings, no configured-root reads, recursive masking, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting Copilot settings shows safe surface-qualified detail without enabling plugins or composing contained hooks.

### Tests first

- [ ] T633 [P] [US2] Add failing Copilot settings tests for VS Code/CLI layers, enablement, re-projection of the Phase 20 pending instruction applicability, plugin recommendations, closed contained-hook origins, compatible Claude settings, and no configured-root reads in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T634 [P] [US2] Add failing masking and relationship tests for credentials, environment values, commands, paths, recommendations, references, and zero relationship read authority in `tests/unit/inspection/masking.test.ts` and `tests/unit/inspection/relationships.test.ts`
- [ ] T635 [P] [US2] Add failing zero-activation tests proving settings content cannot enable a plugin, invoke a hook, connect to MCP, load a URI, or expand a configured root in `tests/integration/security/zero-activation.test.ts`
- [ ] T636 [US2] Add failing Copilot settings runtime-composition graph coverage for VS Code/CLI/Cloud distinctions, Phase 20 instruction re-projection, deferred Plugin/Hook semantics, and the permanent rule that settings are not MCP owners in `tests/contract/runtime-composition.test.ts`
- [ ] T637 [US2] Add browser acceptance for masked Copilot settings detail, surface precedence, updated instruction applicability, recommendations, inert declarations, no settings-owned MCP row, diagnostics, and reveal cleanup in `tests/e2e/copilot-settings-detail.spec.ts`

### Implementation

- [ ] T638 [US2] Extend bounded JSONC extraction with allowlisted Copilot settings fields, recommendation identifiers, and closed declaration origins in `src/inspection/parsers/json.ts`
- [ ] T639 [US2] Add surface-qualified Copilot settings precedence, enablement, recommendation, and relationship strategies, re-project previously pending instruction applicability, and keep later Plugin/Hook families inert in `shared/registries/runtime-composition.ts`
- [ ] T640 [US2] Extend Copilot recognition with bounded settings metadata, applicability, instruction re-projection facts, relationship-only targets, permanent MCP non-ownership, diagnostics, and exact evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T641 [US2] Integrate Copilot settings parsing, recursive masking, instruction re-projection, inert declarations, permanent MCP non-ownership, and raw disposal in `src/inspection/scan.ts`
- [ ] T642 [US2] Extend typed settings detail and semantically equivalent English/Japanese Copilot precedence, recommendation, surface, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 63: Unified Settings and Configuration Inventory

**Purpose**: Consolidate Codex configuration, Claude settings, and Copilot settings with read-once shared-file recognition and the exact MCP ownership matrix.

**Independent Test**: Use an all-vendor settings fixture and verify one physical row/read for shared `.claude/settings*.json`, separate Claude/Copilot settings recognitions, Claude-only owner-attached MCP on the shared owner ID, permanent Copilot MCP non-ownership, preserved Codex carrier MCP/fallback, deterministic provenance, filters, exclusions, partial continuity, and rescan cleanup.

**Visible Checkpoint**: Users can filter the complete settings/configuration inventory and distinguish Claude settings-owned MCP, Copilot non-ownership, and the existing Codex carrier.

### Tests first

- [ ] T643 [US1] Finalize all-vendor settings/config fixtures for Codex project layers, Claude exact-launch settings with owner-attached MCP, Copilot variants with MCP non-ownership, shared files, malformed structures, secrets, inert declarations, and excluded configured roots in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T644 [US1] Finalize settings/config behavior, three candidate matchers, existing `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp`, path-negative cases, composition, relationships, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T645 [US1] Add complete matcher and recognition-matrix tests for Codex layers with existing MCP/fallback, exact Claude settings with MCP ownership, supported Copilot settings with MCP non-ownership, shared files, and explicit exclusions in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T646 [P] [US1] Add failing integration tests for read-once shared settings, deterministic settings/MCP recognition and provenance order, hard-link aliases, limits, isolated failures, no synthetic MCP file or connection, and no configured-target access in `tests/integration/repository-scan.test.ts`
- [ ] T647 [P] [US1] Add failing client tests for source/tool/kind/path filters, shared recognition badges, and rescan cleanup across settings/configuration rows in `tests/unit/app/inventory.test.ts`
- [ ] T648 [US1] Add browser acceptance for unified settings/config inventory, filters, shared-file recognitions, exact MCP ownership/non-ownership badges, preserved Codex carrier facts, exclusions, diagnostics, and keyboard use in `tests/e2e/settings-config-inventory.spec.ts`

### Implementation

- [ ] T649 [US1] Finalize settings/config lookup statements for all three tools without read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T650 [US1] Finalize the three settings/config candidate records and existing `copilot.excluded.vscode-settings`/`copilot.excluded.cli-lsp` references without configured-path promotion or new exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T651 [US1] Finalize settings/config evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T652 [US1] Complete read-once shared-file assembly, deterministic settings/MCP recognition order, exact ownership/non-ownership, preserved Codex carrier facts, and bounded partial continuity for settings/configuration in `src/inspection/scan.ts`
- [ ] T653 [US1] Extend unified settings/config inventory filters, rows, shared badges, and semantically equivalent layer/exclusion messages in `app/components/inventory/InventoryFilters.vue`, `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 64: Settings and Configuration Comparison

**Purpose**: Extend comparison with literal and typed settings/configuration differences.

**Independent Test**: Compare two readable current-generation settings/config files and verify masked source plus aligned values, layers, precedence, trust, enablement, MCP ownership, provenance, conditions, fallback declarations, recommendations, and stale cleanup.

**Visible Checkpoint**: Users can compare settings/configuration without applying values or promoting declarations.

### Tests first

- [ ] T654 [US3] Add failing comparison regressions for typed settings values, layer provenance, precedence, trust, fallback declarations, recommendations, conditions, and owner-attached MCP differences through the real settings/carrier owner ID while preserving Copilot non-ownership in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T655 [US3] Add browser acceptance for literal settings/config diff, typed layer/value and owner-attached MCP differences, masking, accessibility, fallback, Copilot non-ownership, and cleanup in `tests/e2e/settings-config-comparison.spec.ts`

### Implementation

- [ ] T656 [US3] Extend typed settings/configuration comparison rows with owner-attached MCP projected through the existing physical owner ID, without evaluating values, promoting declarations, or inventing Copilot MCP ownership in `app/components/comparison/RecognitionComparison.vue`
- [ ] T657 [US3] Add semantically equivalent English/Japanese settings/configuration comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 65: Claude Output Styles Inventory

**Purpose**: Add supported Claude output-style files to the inventory.

**Independent Test**: Inventory direct output-style children at documented layers while excluding nested near misses.

**Visible Checkpoint**: Users can filter supported Claude output styles with layer provenance.

### Fixtures and tests first

- [ ] T658 [US1] Create Claude output-style fixtures for direct children, nested near misses, duplicate names, malformed metadata, secrets, and selection variants in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T659 [US1] Materialize output-style rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T660 [US1] Add failing matcher/recognition tests for direct-child output styles, nested exclusions, and documented layer boundaries in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T661 [US1] Add browser acceptance for Claude output-style inventory and exclusions in `tests/e2e/output-styles-inventory.spec.ts`

### Implementation

- [ ] T662 [US1] Add Claude output-style lookup statements plus non-authorizing `claude.behavior.user.output-style` before output-style selection references it in `shared/registries/vendor-behaviors.ts`
- [ ] T663 [US1] Add only the `claude.repo.output-style` candidate and keep nested/User/configured locations path-negative without defining exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T664 [US1] Add output-style evidence records and affected-contract references in `shared/registries/official-sources.ts`
- [ ] T665 [US1] Implement Claude output-style matching and recognition in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T666 [US1] Extend output-style inventory rows and semantically equivalent layer/exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 66: Claude Output Styles Detail

**Purpose**: Add masked output-style source, layer, selection, surface availability, and applicability detail.

**Independent Test**: Open hostile styles and verify masking, closest-layer and selection conditions, surface uncertainty, inert references, diagnostics, and reveal cleanup.

**Visible Checkpoint**: Selecting an output style opens safe detail without applying the style.

### Tests first

- [ ] T667 [P] [US2] Add failing metadata/applicability tests for closest-layer behavior, explicit selection, surface availability, uncertainty, and evidence in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T668 [P] [US2] Add failing tests proving output-style Markdown and references remain inert and non-navigating in `tests/integration/security/zero-activation.test.ts`
- [ ] T669 [US2] Add failing output-style runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T670 [US2] Add browser acceptance for masked output-style detail and selection conditions in `tests/e2e/output-styles-detail.spec.ts`

### Implementation

- [ ] T671 [US2] Add output-style layer, selection, and applicability strategies in `shared/registries/runtime-composition.ts`
- [ ] T672 [US2] Extend Markdown extraction and scan integration for output-style metadata, applicability, and masking in `src/inspection/parsers/markdown.ts` and `src/inspection/scan.ts`
- [ ] T673 [US2] Extend typed output-style detail fields in `app/components/inspection/RecognitionDetails.vue`
- [ ] T674 [US2] Add semantically equivalent English/Japanese output-style detail, selection, surface, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 67: Claude Output Styles Comparison

**Purpose**: Extend comparison with literal and typed output-style differences.

**Independent Test**: Compare two styles and verify masked source plus aligned layer, selection, surface availability, provenance, and metadata.

**Visible Checkpoint**: Users can compare Claude output styles without applying either style.

### Tests first

- [ ] T675 [US3] Add failing typed comparison regressions for layer, selection, surface availability, provenance, and metadata in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T676 [US3] Add browser acceptance for literal output-style diff and typed metadata differences in `tests/e2e/output-styles-comparison.spec.ts`

### Implementation

- [ ] T677 [US3] Extend typed output-style comparison rows in `app/components/comparison/RecognitionComparison.vue`
- [ ] T678 [US3] Add semantically equivalent English/Japanese output-style comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 68: Codex Marketplaces Inventory

**Purpose**: Add authored Codex marketplace catalogs at the two exact Repository-root locations.

**Independent Test**: Inventory `.agents/plugins/marketplace.json` and legacy-compatible `.claude-plugin/marketplace.json`, reject descendants, installed/cache paths, remote state, links, aliases, and near misses, and do not yet derive plugin manifests.

**Visible Checkpoint**: Users can filter authored Codex marketplace catalogs without implying registration, installation, or enablement.

### Fixtures and tests first

- [ ] T679 [US1] Create Codex marketplace fixtures for both exact roots, local/remote sources, malformed catalogs, secrets, missing plugins, descendants, links, aliases, installed/cache paths, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T680 [US1] Materialize Codex marketplace behavior, candidates, path-negative runtime-state cases, activation conditions, relationships, and evidence rows without defining marketplace exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T681 [P] [US1] Add failing matcher/recognition tests for both exact Codex marketplace selectors, descendant rejection, authored-state provenance, and installed/cache/User exclusions in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T682 [US1] Add browser acceptance for Codex marketplace rows, filters, authored-state labels, exclusions, diagnostics, and no derived plugin rows yet in `tests/e2e/codex-marketplaces-inventory.spec.ts`

### Implementation

- [ ] T683 [US1] Add Codex marketplace lookup statements plus non-authorizing `codex.behavior.user.plugins` before plugin activation and `codex.excluded.plugin-files` reference it in `shared/registries/vendor-behaviors.ts`
- [ ] T684 [US1] Add only the `codex.repo.marketplace` candidate and keep installed, cache, User, and remote locations path-negative without defining marketplace exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T685 [US1] Add Codex marketplace evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T686 [US1] Implement exact-root Codex marketplace matching and path-derived recognition without catalog parsing in `src/inspection/rules/codex.ts` and `src/inspection/recognizers/codex.ts`
- [ ] T687 [US1] Integrate Codex marketplace classification without deriving or reading plugin manifests in `src/inspection/scan.ts`
- [ ] T688 [US1] Extend inventory rows and semantically equivalent English/Japanese Codex marketplace authored-state and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 69: Codex Marketplaces Detail

**Purpose**: Add masked Codex catalog detail and safely extract local plugin-source declarations for the next phase.

**Independent Test**: Open malformed and secret-bearing catalogs and verify bounded JSON parsing, local source forms, remote/absolute/home/traversal rejection, first-128 declaration retention, relationship-only components, masking, diagnostics, and zero plugin-target reads.

**Visible Checkpoint**: Selecting a Codex marketplace shows authored entries and safe local-source relationships without opening plugin manifests.

### Tests first

- [ ] T689 [P] [US2] Add failing Codex marketplace metadata tests for authored entries, local source forms, remote source types, missing fields, malformed values, registration/installation uncertainty, and exact evidence in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T690 [P] [US2] Add failing local-source validation tests for `./` forms, catalog-relative containment, one-edge preparation, first-128 retention, no 129th-target access, and Git/HTTP/npm/absolute/home/traversal rejection in `tests/integration/repository-scan.test.ts`
- [ ] T691 [P] [US2] Add zero-activation tests proving catalog inspection performs no plugin read, install, import, script, hook, MCP, asset, remote fetch, or cache inspection in `tests/integration/security/zero-activation.test.ts`
- [ ] T692 [US2] Add failing Codex marketplace activation/relationship graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T693 [US2] Add browser acceptance for masked Codex marketplace detail, local/remote source relationships, authored state, diagnostics, and reveal cleanup in `tests/e2e/codex-marketplaces-detail.spec.ts`

### Implementation

- [ ] T694 [US2] Extend bounded JSON extraction with closed Codex catalog fields and secret-safe source origins in `src/inspection/parsers/json.ts`
- [ ] T695 [US2] Add Codex marketplace authored, registration, installation, activation, local-source, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T696 [US2] Extend Codex recognition with bounded catalog metadata, validated local-source declarations, applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/codex.ts`
- [ ] T697 [US2] Integrate atomic catalog parsing, recursive masking, first-128 local-source retention, relationship-only components, and no derived reads yet in `src/inspection/scan.ts`
- [ ] T698 [US2] Extend typed detail and semantically equivalent English/Japanese Codex marketplace source, authored-state, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 70: Claude Marketplaces Inventory

**Purpose**: Add authored Claude `.claude-plugin/marketplace.json` catalogs at an intentionally treated marketplace root.

**Independent Test**: Inventory only the exact root catalog, reject arbitrary descendants, User/cache/registered-state paths, links, aliases, and near misses, and preserve Codex recognition on the shared physical file.

**Visible Checkpoint**: Users can identify authored Claude marketplace catalogs without mistaking presence for registration.

### Fixtures and tests first

- [ ] T699 [US1] Create Claude marketplace fixtures for exact root, shared Codex file, local/remote sources, malformed catalogs, secrets, descendants, links, aliases, User/cache state, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T700 [US1] Materialize Claude marketplace behavior, candidate, path-negative runtime-state cases, activation conditions, relationships, and evidence rows without defining marketplace exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T701 [P] [US1] Add failing matcher/recognition tests for exact Claude marketplace root, descendant rejection, explicit-registration uncertainty, and no User/cache candidate in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T702 [US1] Add browser acceptance for Claude marketplace rows, filters, registration uncertainty, exclusions, diagnostics, and retained Codex recognition in `tests/e2e/claude-marketplaces-inventory.spec.ts`

### Implementation

- [ ] T703 [US1] Add Claude marketplace lookup statements while reusing the Phase 25-owned `claude.behavior.user.plugins` before marketplace/plugin activation references it in `shared/registries/vendor-behaviors.ts`
- [ ] T704 [US1] Add only the `claude.repo.marketplace` candidate and keep User, cache, and registration-state locations path-negative without defining marketplace exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T705 [US1] Add Claude marketplace evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T706 [US1] Implement exact-root Claude marketplace matching and path-derived recognition without catalog parsing in `src/inspection/rules/claude.ts` and `src/inspection/recognizers/claude.ts`
- [ ] T707 [US1] Integrate Claude marketplace classification and preserve shared physical-file identity in `src/inspection/scan.ts`
- [ ] T708 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude marketplace registration and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 71: Claude Marketplaces Detail

**Purpose**: Add masked Claude catalog detail, validate local plugin-source declarations without deriving candidates yet, and activate the Phase 27 MCP owner adapter for accepted marketplace files.

**Independent Test**: Open malformed and secret-bearing catalogs and verify optional/local source forms, catalog-relative containment, remote relationship retention, first-128 bounds, owner-attached MCP declarations, registration/activation uncertainty, masking, diagnostics, zero connection, and zero plugin-target reads.

**Visible Checkpoint**: Selecting a Claude marketplace shows safe authored metadata, source relationships, and owner-attached MCP without registration, activation, or connection claims.

### Tests first

- [ ] T709 [P] [US2] Add failing Claude marketplace metadata tests for authored entries, optional manifests, local/remote sources, Phase 27 MCP adapter activation, registration/activation uncertainty, malformed values, and exact evidence in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T710 [P] [US2] Add failing Claude local-source validation tests for leading `./`, catalog-relative containment, first-128 retention, no 129th-target access, and forbidden Git/HTTP/npm/absolute/home/traversal sources in `tests/integration/repository-scan.test.ts`
- [ ] T711 [P] [US2] Add zero-activation tests proving Claude catalog inspection performs no registration, plugin read, import, script, hook, MCP, asset, remote fetch, or cache inspection in `tests/integration/security/zero-activation.test.ts`
- [ ] T712 [US2] Add failing Claude marketplace activation/relationship graph coverage plus Phase 27 MCP owner-adapter binding with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T713 [US2] Add browser acceptance for masked Claude marketplace detail, source relationships, owner-attached MCP, authored state, zero connection, diagnostics, and reveal cleanup in `tests/e2e/claude-marketplaces-detail.spec.ts`

### Implementation

- [ ] T714 [US2] Extend bounded JSON extraction with closed Claude catalog fields and secret-safe source origins in `src/inspection/parsers/json.ts`
- [ ] T715 [US2] Add Claude marketplace registration, activation, optional-manifest, local-source, and relationship strategies while binding the existing MCP adapter to the admitted marketplace behavior in `shared/registries/runtime-composition.ts`
- [ ] T716 [US2] Extend Claude recognition with bounded catalog metadata, validated local-source declarations, owner-gated MCP, applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/claude.ts`
- [ ] T717 [US2] Integrate Claude catalog parsing, recursive masking, first-128 local-source retention, owner-attached MCP with no synthetic file or connection, and relationship-only components without derived reads in `src/inspection/scan.ts`
- [ ] T718 [US2] Extend typed detail and semantically equivalent English/Japanese Claude marketplace source, registration, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 72: Copilot Marketplaces Inventory

**Purpose**: Add authored Copilot marketplace catalogs at the four exact root forms in documented recognition order, with local marketplace provenance only for VS Code and CLI while Cloud remains a hosted/runtime-unavailable condition.

**Independent Test**: Inventory `marketplace.json`, `.plugin/marketplace.json`, `.github/plugin/marketplace.json`, and `.claude-plugin/marketplace.json`; expose local badges and lookup only for VS Code/CLI, represent Cloud only as hosted/runtime-unavailable, reject descendants and runtime-state paths, and preserve shared Codex/Claude recognition.

**Visible Checkpoint**: Users can filter Copilot marketplace catalogs with exact root-form and surface provenance.

### Fixtures and tests first

- [ ] T719 [US1] Create Copilot marketplace fixtures for all four root forms, ordering, shared files, local/remote sources, malformed catalogs, secrets, descendants, installed/hosted state, links, aliases, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T720 [US1] Materialize the four Copilot marketplace candidates with VS Code/CLI local behavior, the exact origin-file-less `copilot.behavior.cloud.plugins` hosted/runtime-unavailable fact, path-negative runtime-state cases, relationships, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T721 [P] [US1] Add failing matcher/recognition tests for all four exact Copilot marketplace forms, recognition order, descendant/runtime-state rejection, shared `.claude-plugin` provenance, VS Code/CLI local provenance, and no Cloud local recognition in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T722 [US1] Add browser acceptance for Copilot marketplace rows, form order, VS Code/CLI local badges, Cloud hosted/runtime-unavailable labels, diagnostics, and retained Codex/Claude recognitions in `tests/e2e/copilot-marketplaces-inventory.spec.ts`

### Implementation

- [ ] T723 [US1] Add VS Code/CLI-qualified Copilot local marketplace lookup statements plus non-authorizing `copilot.behavior.vscode.user.plugins`, `copilot.behavior.cli.user.plugins`, and origin-file-less `copilot.behavior.cloud.plugins` before local/Cloud activation and managed/remote exclusion references them in `shared/registries/vendor-behaviors.ts`
- [ ] T724 [US1] Add only the four selectors of the single `copilot.repo.marketplace` candidate; keep hosted, installed, User, and cache locations path-negative without inventing marketplace exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T725 [US1] Add Copilot marketplace evidence records and reciprocal affected-contract references, including existing-source backlinks for `copilot.behavior.cloud.plugins`, in `shared/registries/official-sources.ts`
- [ ] T726 [US1] Implement exact-root Copilot marketplace matching and ordered recognition without catalog parsing in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T727 [US1] Integrate Copilot marketplace classification and shared physical-file identity in `src/inspection/scan.ts`
- [ ] T728 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot marketplace form, surface, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 73: Copilot Marketplaces Detail

**Purpose**: Add masked Copilot catalog detail and validate bounded local plugin sources for the next plugin phase.

**Independent Test**: Open malformed and secret-bearing catalogs and verify `plugins/foo` and `./plugins/foo`, four-target future derivation order, one-edge/128 bounds, remote relationship retention, VS Code/CLI local-source plans, Cloud hosted/runtime-unavailable state without a local plan, masking, diagnostics, and zero target reads.

**Visible Checkpoint**: Selecting a Copilot marketplace shows safe authored entries and bounded local-source plans without reading plugin manifests.

### Tests first

- [ ] T729 [P] [US2] Add failing Copilot marketplace metadata tests for authored entries, recommendations, known marketplaces, local/remote source forms, VS Code/CLI local provenance, Cloud hosted/runtime-unavailable state, installation/enablement uncertainty, and exact evidence in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T730 [P] [US2] Add failing source-validation tests for `plugins/foo` and `./plugins/foo`, catalog containment, documented four-target order, one edge, first-128 retention, no 129th-target access, and forbidden source types in `tests/integration/repository-scan.test.ts`
- [ ] T731 [P] [US2] Add zero-activation tests proving Copilot catalog inspection performs no install, plugin read, component load, hook execution, MCP connection, asset load, remote fetch, or hosted-state query in `tests/integration/security/zero-activation.test.ts`
- [ ] T732 [US2] Add failing Copilot marketplace activation/relationship graph coverage proving local-source plans exist only for VS Code/CLI and Cloud remains hosted/runtime-unavailable, with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T733 [US2] Add browser acceptance for masked Copilot marketplace detail, VS Code/CLI source plans, Cloud unavailable conditions, diagnostics, and reveal cleanup in `tests/e2e/copilot-marketplaces-detail.spec.ts`

### Implementation

- [ ] T734 [US2] Extend bounded JSON extraction with closed Copilot catalog fields and secret-safe source origins in `src/inspection/parsers/json.ts`
- [ ] T735 [US2] Add Copilot VS Code/CLI marketplace registration, recommendation, installation, enablement, local-source, and relationship strategies plus a Cloud hosted/runtime-unavailable strategy that never produces local provenance or lookup in `shared/registries/runtime-composition.ts`
- [ ] T736 [US2] Extend Copilot recognition with bounded catalog metadata, VS Code/CLI-only validated local-source plans, Cloud runtime-unavailable conditions, applicability, relationships, diagnostics, and evidence in `src/inspection/recognizers/copilot.ts`
- [ ] T737 [US2] Integrate Copilot catalog parsing, recursive masking, first-128 source retention, and relationship-only components without derived reads in `src/inspection/scan.ts`
- [ ] T738 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot marketplace source, VS Code/CLI local provenance, Cloud unavailable state, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 74: Unified Marketplaces Inventory

**Purpose**: Consolidate marketplace catalogs, read the shared `.claude-plugin/marketplace.json` once with Codex/Claude/Copilot recognitions, and retain Claude owner-attached MCP on that same physical file.

**Independent Test**: Verify one physical item/read with three marketplace recognitions plus Claude owner-attached MCP for the shared catalog, deterministic provenance and root-form ordering, no synthetic MCP file or connection, local-source plans, filters, exclusions, limits, diagnostics, and rescan cleanup.

**Visible Checkpoint**: Users can understand all marketplace interpretations and Claude owner-attached MCP on one shared authored catalog.

### Tests first

- [ ] T739 [US1] Finalize marketplace fixtures for every root form, local/remote source, shared triple-recognition file with Claude owner-attached MCP, malformed/secret catalog, alias, exclusion, and exact-limit case in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T740 [US1] Finalize marketplace behavior, matchers, derivation plans, composition, relationships, path-negative runtime-state cases, and evidence conformance rows without defining marketplace exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T741 [P] [US1] Add complete matcher/recognition-matrix tests for all marketplace roots, triple marketplace recognition, Claude owner-attached MCP on the same ID, deterministic form order, authored-state separation, and exclusions in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T742 [P] [US1] Add failing integration tests for read-once shared catalogs, deterministic marketplace/MCP recognition and provenance order, aliases, source-plan limits, partial continuity, zero synthetic MCP file/connection, and zero plugin-target reads in `tests/integration/repository-scan.test.ts`
- [ ] T743 [US1] Add browser acceptance for unified marketplace inventory, filters, triple recognition, Claude owner-attached MCP, root-form order, exclusions, diagnostics, and keyboard use in `tests/e2e/marketplaces-inventory.spec.ts`

### Implementation

- [ ] T744 [US1] Complete read-once marketplace physical-file assembly, deterministic multi-tool plus owner-attached MCP provenance, source-plan retention, no synthetic file, and exclusions in `src/inspection/scan.ts`
- [ ] T745 [US1] Extend marketplace inventory filters, shared-recognition summaries, and authored-state labels in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T746 [US1] Add semantically equivalent English/Japanese unified marketplace, triple-recognition, authored-state, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 75: Marketplaces Comparison

**Purpose**: Extend comparison with literal and typed marketplace-catalog differences.

**Independent Test**: Compare two readable catalogs and verify masked source plus aligned entries, source types, local-source plans, owner-attached MCP, provenance, registration, installation, enablement, conditions, and uncertainty without deriving or activating plugins.

**Visible Checkpoint**: Users can compare marketplace catalogs without fetching, installing, or activating anything.

### Tests first

- [ ] T747 [US3] Add failing marketplace comparison regressions for authored metadata, provenance, source type, registration, installation, enablement, owner-attached MCP differences through the real catalog owner ID, and uncertainty in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T748 [US3] Add browser acceptance for literal marketplace diff, typed source/activation-state and owner-attached MCP differences, masking, accessibility, fallback, and cleanup in `tests/e2e/marketplaces-comparison.spec.ts`

### Implementation

- [ ] T749 [US3] Extend comparison rows for marketplace entries, source plans, authored state, provenance, owner-attached MCP through the existing physical owner ID, and uncertainty in `app/components/comparison/RecognitionComparison.vue`
- [ ] T750 [US3] Add semantically equivalent English/Japanese marketplace comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 76: Codex Plugin Manifests Inventory

**Purpose**: Add exact-root and safely derived Codex `.codex-plugin/plugin.json` manifest candidates.

**Independent Test**: Inventory the authored root manifest and one `.codex-plugin/plugin.json` below each validated `./` local Codex marketplace source; verify one-edge containment, first-128 retention, missing target as no candidate, no orphan/remote/escaping/linked candidate, no recursive derivation, and one verified read per physical file.

**Visible Checkpoint**: Users can filter authored Codex plugin manifests with static or marketplace-derived provenance.

### Fixtures and tests first

- [ ] T751 [US1] Create Codex plugin-manifest fixtures for exact root, valid `./` local catalog sources, exact `.codex-plugin/plugin.json` targets, missing targets, 128/129 sources, remote/absolute/home/traversal sources, links, aliases, component declarations, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T752 [US1] Materialize Codex plugin-manifest behavior, static/bounded-derived candidates, path-negative component cases, activation conditions, relationships, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T753 [P] [US1] Add failing registry and matcher tests for exact `codex.repo.plugin-manifest`, `codex.derived.local-plugin-manifest`, one edge, `./` source admission, exact `.codex-plugin/plugin.json` target, no derived seed, and no component-file candidate in `tests/contract/inspection-rules.test.ts` and `tests/unit/inspection/rules.test.ts`
- [ ] T754 [US1] Add failing scan tests for static/derived Codex manifests, first-128 retention, no 129th access, missing-derived-target/no-candidate handling, containment, links, aliases, read-once assembly, and no component reads in `tests/integration/repository-scan.test.ts`
- [ ] T755 [US1] Add browser acceptance for Codex plugin-manifest rows, static/derived provenance, missing manifests, exclusions, diagnostics, and unchanged marketplace rows in `tests/e2e/codex-plugin-manifests-inventory.spec.ts`

### Implementation

- [ ] T756 [US1] Add Codex plugin-manifest behavior and lookup statements without activation authority in `shared/registries/vendor-behaviors.ts`
- [ ] T757 [US1] Add only the Codex static and bounded-derived plugin-manifest records, leaving component-path exclusion ownership to Phase 77, in `shared/registries/inspection-rules.ts`
- [ ] T758 [US1] Add Codex plugin-manifest evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T759 [US1] Implement exact-root matching and bounded Codex manifest derivation only from validated `./` local marketplace sources to the exact `.codex-plugin/plugin.json` target in `src/inspection/rules/codex.ts`
- [ ] T760 [US1] Implement Codex plugin-manifest recognition with static/seed provenance and no component promotion in `src/inspection/recognizers/codex.ts`
- [ ] T761 [US1] Integrate deterministic one-edge Codex manifest admission, one verified read, alias aggregation, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T762 [US1] Extend inventory rows and semantically equivalent English/Japanese Codex plugin static/derived and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 77: Codex Plugin Manifests Detail

**Purpose**: Add masked Codex manifest detail with authored-state and relationship-only component declarations, and own the single exact non-read exclusion `codex.excluded.plugin-files`.

**Independent Test**: Open malformed and secret-bearing manifests and verify required entry metadata, marketplace provenance, installation/enablement/trust separation, Hook/MCP/app/skill/script/asset component relationships, exact `codex.excluded.plugin-files` handling, upgrade of the Phase 23 plugin path-negative context without adding an MCP candidate, masking, diagnostics, and zero component reads or activation.

**Visible Checkpoint**: Selecting a Codex plugin manifest shows safe authored metadata without loading any component.

### Tests first

- [ ] T763 [US2] Materialize and add failing registry coverage for the single exact `codex.excluded.plugin-files` record with final affected behaviors `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, and the already-owned `codex.behavior.user.plugins`; prove plugin component paths never become candidates and the earlier MCP path-negative case can now cite this exclusion without changing its affected-behavior set in `tests/fixtures/conformance/inspection-rules.json` and `tests/contract/inspection-rules.test.ts`
- [ ] T764 [P] [US2] Add failing Codex plugin tests for authored metadata, local marketplace entries, installation/enablement/trust separation, static/derived provenance, and relationship-only components in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T765 [P] [US2] Add zero-activation tests proving no plugin component import, skill read, app load, hook execution, MCP connection, script/asset read, install, cache inspection, or remote fetch in `tests/integration/security/zero-activation.test.ts`
- [ ] T766 [US2] Add failing Codex plugin activation/relationship graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T767 [US2] Add browser acceptance for masked Codex plugin detail, authored state, relationships, provenance, diagnostics, and reveal cleanup in `tests/e2e/codex-plugin-manifests-detail.spec.ts`

### Implementation

- [ ] T768 [US2] Add the single non-read `codex.excluded.plugin-files` record with final affected references to `codex.behavior.plugin.manifest`, `codex.behavior.repo.marketplace`, and already-owned `codex.behavior.user.plugins`; let the Phase 23 MCP plugin-path diagnostic cite it without an MCP candidate or extra affected behavior, and add no install, cache, or runtime-state exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T769 [US2] Extend bounded JSON extraction with closed Codex plugin-manifest fields and secret-safe component origins in `src/inspection/parsers/json.ts`
- [ ] T770 [US2] Add Codex plugin authored, installed, enabled, trusted, local, activation, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T771 [US2] Implement bounded Codex plugin-manifest metadata and relationship-only components in `src/inspection/recognizers/codex.ts`
- [ ] T772 [US2] Integrate atomic manifest parsing, recursive masking, relationship-only components, exact `codex.excluded.plugin-files` diagnostics, and raw disposal in `src/inspection/scan.ts`
- [ ] T773 [US2] Extend typed detail and semantically equivalent English/Japanese Codex plugin authored-state, relationship, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 78: Claude Plugin Manifests Inventory

**Purpose**: Add only exact-root `claude.repo.plugin-manifest` and marketplace-derived `claude.derived.local-plugin-manifest` candidates while preserving optional-manifest behavior.

**Independent Test**: Inventory the authored root and validated local marketplace targets; verify optional absence, trust conditions, one edge/128 bounds, no recursive derivation, and no component reads.

**Visible Checkpoint**: Users can filter Claude plugin manifests with explicit root or marketplace-derived provenance.

### Fixtures and tests first

- [ ] T774 [US1] Create Claude plugin-manifest fixtures for exact root, valid local catalog sources, optional absence, 128/129 sources, ancestor near misses, links, aliases, components, and forbidden sources in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T775 [US1] Reuse the Phase 25-owned Claude plugin behavior and materialize exact static/derived candidates, path-negative component cases, activation conditions, relationships, and evidence rows without a duplicate behavior ID in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T776 [P] [US1] Add failing registry/matcher tests for exact `claude.repo.plugin-manifest`, `claude.derived.local-plugin-manifest`, optional absence, one edge, no ancestor scan, and no component candidate in `tests/contract/inspection-rules.test.ts` and `tests/unit/inspection/rules.test.ts`
- [ ] T777 [US1] Add failing scan tests for static/derived Claude manifests, first-128 retention, no 129th access, containment, links, aliases, read-once assembly, and no component reads in `tests/integration/repository-scan.test.ts`
- [ ] T778 [US1] Add browser acceptance for Claude plugin-manifest rows, provenance types, optional absence, trust uncertainty, exclusions, diagnostics, and retained marketplace rows in `tests/e2e/claude-plugin-manifests-inventory.spec.ts`

### Implementation

- [ ] T779 [US1] Reuse the Phase 25-owned `claude.behavior.repo.plugin` and `claude.behavior.user.plugins` while adding no duplicate behavior ID for root and local-marketplace plugin lookup in `shared/registries/vendor-behaviors.ts`
- [ ] T780 [US1] Add only `claude.repo.plugin-manifest` and `claude.derived.local-plugin-manifest`, leaving component-path exclusion ownership to Phase 79, in `shared/registries/inspection-rules.ts`
- [ ] T781 [US1] Add Claude plugin-manifest evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T782 [US1] Implement exact-root and bounded local-marketplace Claude manifest derivation in `src/inspection/rules/claude.ts`
- [ ] T783 [US1] Implement Claude plugin-manifest recognition with provenance, optional-manifest, trust, and no component promotion in `src/inspection/recognizers/claude.ts`
- [ ] T784 [US1] Integrate deterministic Claude manifest admission, one verified read, aliases, optional absence, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T785 [US1] Extend inventory rows and semantically equivalent English/Japanese Claude plugin provenance, trust, optional-manifest, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 79: Claude Plugin Manifests Detail

**Purpose**: Add masked Claude manifest detail with optional authored metadata and relationship-only components, activate the Phase 27 MCP owner adapter, and own the single exact non-read exclusion `claude.excluded.plugin-files`.

**Independent Test**: Open malformed and secret-bearing root or marketplace-derived manifests and verify optional fields, default-versus-explicit component locations, registration/activation uncertainty, owner-attached MCP versus relationship-only MCP component paths, Hook/skill/command/agent/style/script/asset relationships, exact `claude.excluded.plugin-files` handling that upgrades the Phase 25/27 path-negative diagnostic without adding an MCP candidate or affected behavior, masking, diagnostics, zero connection, and zero component reads.

**Visible Checkpoint**: Selecting a Claude plugin manifest shows safe authored metadata and component relationships without activation.

### Tests first

- [ ] T786 [US2] Materialize and add failing registry coverage for the single exact `claude.excluded.plugin-files` record with only `claude.behavior.repo.plugin` and `claude.behavior.repo.marketplace` affected references; prove it upgrades the Phase 25/27 MCP plugin-path diagnostic without adding an MCP candidate or affected behavior, and plugin component paths never become candidates, in `tests/fixtures/conformance/inspection-rules.json` and `tests/contract/inspection-rules.test.ts`
- [ ] T787 [P] [US2] Add failing Claude plugin tests for authored metadata, optional manifest, Phase 27 MCP adapter activation, registration/activation uncertainty, and default/explicit components in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T788 [P] [US2] Add zero-activation tests proving no Claude component import, skill/command/agent/style read, hook execution, MCP connection, script/asset load, registration, install, cache inspection, or remote fetch in `tests/integration/security/zero-activation.test.ts`
- [ ] T789 [US2] Add failing Claude plugin activation/relationship graph coverage plus Phase 27 MCP owner-adapter binding with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T790 [US2] Add browser acceptance for masked Claude plugin detail, authored/optional state, owner-attached MCP versus relationship-only component paths, zero connection, diagnostics, and reveal cleanup in `tests/e2e/claude-plugin-manifests-detail.spec.ts`

### Implementation

- [ ] T791 [US2] Add the single non-read `claude.excluded.plugin-files` record with only `claude.behavior.repo.plugin` and `claude.behavior.repo.marketplace` affected references, let the Phase 25/27 MCP plugin-path diagnostic cite it without an MCP candidate or extra affected behavior, and add no User, cache, install, or runtime-state exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T792 [US2] Extend bounded JSON extraction with closed Claude plugin-manifest fields, default/explicit origins, and secret-safe components in `src/inspection/parsers/json.ts`
- [ ] T793 [US2] Add Claude plugin registration, activation, optional-manifest, component-resolution, and relationship strategies while binding the existing MCP adapter to the admitted plugin behavior in `shared/registries/runtime-composition.ts`
- [ ] T794 [US2] Implement bounded Claude plugin-manifest metadata, owner-gated MCP, and relationship-only components in `src/inspection/recognizers/claude.ts`
- [ ] T795 [US2] Integrate Claude manifest parsing, recursive masking, owner-attached MCP with no synthetic file or connection, relationship-only components, the upgraded plugin-path exclusion diagnostic with unchanged MCP candidates, and raw disposal in `src/inspection/scan.ts`
- [ ] T796 [US2] Extend typed detail and semantically equivalent English/Japanese Claude plugin optional-state, component, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 80: Copilot Plugin Manifests Inventory

**Purpose**: Add the four exact Copilot plugin-manifest forms and their bounded local-marketplace derivations, while owning exactly `copilot.excluded.cli-extensions` so CLI extensions never become plugin candidates.

**Independent Test**: Inventory `.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, and `.claude-plugin/plugin.json` in documented order at explicit roots and derived local sources; verify one edge/128 bounds, containment, exact `copilot.excluded.cli-extensions`, no arbitrary descendants or runtime-state candidates, and no component reads.

**Visible Checkpoint**: Users can filter Copilot plugin manifests with exact form, static/derived provenance, and surface conditions.

### Fixtures and tests first

- [ ] T797 [US1] Create Copilot plugin-manifest fixtures for all four root/derived forms, order, 128/129 sources, shared Claude manifests, missing forms, links, aliases, components, CLI extensions, installed/hosted state, and forbidden sources in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T798 [US1] Materialize Copilot plugin behavior, non-authorizing `copilot.behavior.cli.extensions`, static/derived candidates, exact `copilot.excluded.cli-extensions` with its affected-behavior reference, path-negative runtime/component cases, activation conditions, relationships, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T799 [US1] Add failing plugin matcher/derivation and registry tests for four root forms, `plugins/foo`/`./plugins/foo`, documented four-target order, one edge/128 targets, forbidden source forms, shared recognition, `copilot.excluded.cli-extensions` → `copilot.behavior.cli.extensions`, and no extension-as-plugin candidate in `tests/unit/inspection/rules.test.ts`, `tests/integration/repository-scan.test.ts`, and `tests/contract/inspection-rules.test.ts`
- [ ] T800 [P] [US1] Add failing Copilot recognition tests for manifest-form order, static/derived provenance, surface facts, shared Claude manifest, and no installed/hosted/component candidate in `tests/unit/inspection/recognizers.test.ts`
- [ ] T801 [US1] Add browser acceptance for Copilot plugin-manifest rows, form order, provenance, surface badges, exclusions, diagnostics, and retained marketplace rows in `tests/e2e/copilot-plugin-manifests-inventory.spec.ts`

### Implementation

- [ ] T802 [US1] Add surface-qualified Copilot plugin lookup statements plus non-authorizing `copilot.behavior.cli.extensions` and `copilot.behavior.cli.user.extensions` so plugin strategies and exact extension exclusions resolve without activation or read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T803 [US1] Add the static `copilot.repo.plugin-manifest` and bounded-derived `copilot.derived.local-plugin-manifest` records and own only the exact non-read `copilot.excluded.cli-extensions`; keep installed, hosted, and component paths path-negative in `shared/registries/inspection-rules.ts`
- [ ] T804 [US1] Add Copilot plugin-manifest evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T805 [US1] Implement `copilot.derived.local-plugin-manifest` for documented local forms, four-target order, one-edge/128 bounds, containment, and forbidden-source rejection in `src/inspection/rules/copilot.ts`
- [ ] T806 [US1] Implement exact-root Copilot manifest matching and ordered static/derived recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T807 [US1] Integrate deterministic Copilot manifest admission, one verified read, aliases, limits, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T808 [US1] Extend inventory rows and semantically equivalent English/Japanese Copilot plugin form, provenance, surface, and exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 81: Copilot Plugin Manifests Detail

**Purpose**: Add masked Copilot manifest detail with separate authored, recommended, installed, enabled, trusted, and hosted conditions.

**Independent Test**: Open malformed and secret-bearing manifests and verify VS Code/CLI/Cloud state separation, cross-tool metadata, relationship-only agents/skills/hooks/MCP/LSP/scripts/assets, regression of existing `copilot.excluded.cli-extensions` with no extension candidate, masking, diagnostics, and zero component activation.

**Visible Checkpoint**: Selecting a Copilot plugin manifest shows authored metadata and conditional runtime state without loading components.

### Tests first

- [ ] T809 [P] [US2] Add failing Copilot plugin tests for VS Code/CLI/Cloud registration, recommendation, installation, enablement, trust, cross-tool metadata, relationship-only components, and regression that `copilot.excluded.cli-extensions` never produces a plugin candidate in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T810 [P] [US2] Add zero-activation tests proving no script import, agent/skill/component read, hook execution, MCP connection, LSP start, asset load, remote fetch, or installed/cache inspection in `tests/integration/security/zero-activation.test.ts`
- [ ] T811 [US2] Add failing Copilot plugin activation/relationship graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T812 [US2] Add browser acceptance for masked Copilot plugin detail, authored/runtime state, relationships, diagnostics, and reveal cleanup in `tests/e2e/copilot-plugin-manifests-detail.spec.ts`

### Implementation

- [ ] T813 [US2] Extend bounded JSON extraction with closed Copilot plugin-manifest fields and secret-safe component origins in `src/inspection/parsers/json.ts`
- [ ] T814 [US2] Add separate Copilot VS Code/CLI/Cloud registration, recommendation, installation, enablement, trust, and relationship strategies in `shared/registries/runtime-composition.ts`
- [ ] T815 [US2] Implement bounded Copilot plugin-manifest metadata and relationship-only components in `src/inspection/recognizers/copilot.ts`
- [ ] T816 [US2] Integrate Copilot manifest parsing, recursive masking, relationship-only components, exclusions, and raw disposal in `src/inspection/scan.ts`
- [ ] T817 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot plugin state, component, surface, and activation-uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 82: Unified Plugin Manifests Inventory

**Purpose**: Consolidate plugin manifests, read the shared `.claude-plugin/plugin.json` once with Claude/Copilot recognitions, and retain Claude owner-attached MCP separately from relationship-only component paths.

**Independent Test**: Verify one physical item/read with two plugin recognitions plus Claude owner-attached MCP for the shared manifest, relationship-only component paths, deterministic form/seed provenance, Codex separation, static/derived origins, no synthetic MCP file or connection, aliases, limits, exclusions, diagnostics, and rescan cleanup.

**Visible Checkpoint**: Users can understand every authored plugin interpretation and distinguish Claude owner-attached MCP from non-readable component paths.

### Tests first

- [ ] T818 [US1] Finalize plugin-manifest fixtures for every root/derived form, shared Claude/Copilot file with Claude owner-attached MCP, missing optional manifest, aliases, relationship-only components, exclusions, secrets, malformed content, and exact limits in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T819 [US1] Finalize plugin-manifest behavior, matchers, derivations, composition, relationships, exact `codex.excluded.plugin-files`/`claude.excluded.plugin-files`/`copilot.excluded.cli-extensions`, path-negative runtime cases, and evidence conformance rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T820 [P] [US1] Add complete matcher/recognition-matrix tests for Codex, Claude, and Copilot static/derived manifests, shared dual plugin recognition, Claude owner-attached MCP, relationship-only components, deterministic form order, and exclusions in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T821 [P] [US1] Add local-manifest integration regressions for masked derived metadata availability, catalog-relative provenance, first-128 retention, no 129th access, read-once shared files, Claude owner-attached MCP, zero synthetic file/connection, and no component expansion in `tests/integration/repository-scan.test.ts`
- [ ] T822 [US1] Add browser acceptance for unified plugin-manifest inventory, filters, bounded derivation, shared recognition, Claude owner-attached MCP versus component paths, exclusions, diagnostics, and keyboard use in `tests/e2e/plugin-manifests-inventory.spec.ts`

### Implementation

- [ ] T823 [US1] Finalize plugin-manifest lookup statements for all three tools without read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T824 [US1] Finalize plugin-manifest static/bounded-derived candidates and only the existing exact `codex.excluded.plugin-files`, `claude.excluded.plugin-files`, and `copilot.excluded.cli-extensions` records in `shared/registries/inspection-rules.ts`
- [ ] T825 [US1] Finalize plugin-manifest evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T826 [US1] Integrate bounded local derivation, one verified read, deterministic cross-tool plus owner-attached MCP assembly, exclusions, zero synthetic files/connections, and no component expansion in `src/inspection/scan.ts`
- [ ] T827 [US1] Extend inventory kind filters and summaries for plugin manifests in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T828 [US1] Add semantically equivalent English/Japanese unified plugin-manifest, derivation, shared-recognition, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 83: Plugin Manifests Comparison

**Purpose**: Extend comparison with literal and typed plugin-manifest differences.

**Independent Test**: Compare two readable manifests and verify masked source plus aligned authored metadata, form/seed provenance, registration, installation, enablement, trust, owner-attached MCP, component relationships, and uncertainty without activation or connection.

**Visible Checkpoint**: Users can compare plugin manifests without loading or executing components.

### Tests first

- [ ] T829 [US3] Add failing plugin-manifest comparison regressions for authored metadata, provenance, form, registration, installation, enablement, trust, owner-attached MCP differences through the real manifest owner ID, relationships, and uncertainty in `tests/unit/app/recognition-comparison.test.ts`
- [ ] T830 [US3] Add browser acceptance for literal plugin-manifest diff, typed state/component and owner-attached MCP differences, masking, accessibility, fallback, and cleanup in `tests/e2e/plugin-manifests-comparison.spec.ts`

### Implementation

- [ ] T831 [US3] Extend comparison rows for plugin-manifest authored/runtime state, provenance, owner-attached MCP through the existing physical owner ID, component relationships, and uncertainty in `app/components/comparison/RecognitionComparison.vue`
- [ ] T832 [US3] Add semantically equivalent English/Japanese plugin-manifest comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 84: Codex Standalone Hook Files Inventory

**Purpose**: Add only standalone Codex `./**/.codex/hooks.json` physical candidates.

**Independent Test**: Inventory descendant `.codex/hooks.json` files at possible project layers, reject near misses, links, nested alternate names, User/managed hooks, plugin component targets, and inline config declarations as separate files.

**Visible Checkpoint**: Users can filter standalone Codex hook files without any command execution.

### Fixtures and tests first

- [ ] T833 [US1] Create Codex standalone-hook fixtures for project layers, valid `.codex/hooks.json`, near misses, links, aliases, inline config declarations, plugin targets, hostile commands, secrets, and User/managed exclusions in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T834 [US1] Materialize Codex standalone-hook behavior, matcher, existing `codex.excluded.plugin-files` reference, path-negative User/managed cases, composition, relationships, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T835 [P] [US1] Add failing matcher tests for Codex `./**/.codex/hooks.json`, possible layer provenance, exact filename, near misses, and no inline/plugin/User target candidate in `tests/unit/inspection/rules.test.ts`
- [ ] T836 [P] [US1] Add failing recognition tests for standalone Codex Hook kind, provenance, trust uncertainty, and no contained-config duplication in `tests/unit/inspection/recognizers.test.ts`
- [ ] T837 [US1] Add browser acceptance for standalone Codex hook rows, filters, provenance, exclusions, diagnostics, and no executable controls in `tests/e2e/codex-hooks-inventory.spec.ts`

### Implementation

- [ ] T838 [US1] Reuse the Phase 23-owned `codex.behavior.repo.hooks`, then add `codex.behavior.user.hooks` before additive hook composition references it in `shared/registries/vendor-behaviors.ts`
- [ ] T839 [US1] Add only the descendant standalone-hook candidate `codex.repo.hooks`, reference existing `codex.excluded.plugin-files`, and keep User/managed locations path-negative without defining new exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T840 [US1] Add Codex hook evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T841 [US1] Implement Codex descendant `.codex/hooks.json` matching and path-derived recognition in `src/inspection/rules/codex.ts` and `src/inspection/recognizers/codex.ts`
- [ ] T842 [US1] Extend hook inventory filters and standalone Codex summaries in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T843 [US1] Add semantically equivalent English/Japanese Codex standalone-hook inventory and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 85: Codex Hook Detail

**Purpose**: Add masked Codex hook detail, attach inline `[hooks]` recognition to existing `.codex/config.toml` files, and retain same-layer file plus inline declarations with the required warning.

**Independent Test**: Open standalone and inline Codex hooks and verify additive matching, same-layer file-plus-inline retention, warning metadata, trust and event conditions, masking, diagnostics, and zero command, handler, process, URI, or referenced-target execution.

**Visible Checkpoint**: Selecting a Codex Hook recognition shows exact additive semantics and warnings without running it.

### Tests first

- [ ] T844 [P] [US2] Add failing Codex hook tests for retaining same-layer file and inline declarations together plus the required warning in `tests/unit/inspection/codex-metadata.test.ts`
- [ ] T845 [US1] Add failing recognition tests proving inline Codex hooks attach to the existing `.codex/config.toml` physical file, create no synthetic file, and retain separate provenance from standalone hooks in `tests/unit/inspection/recognizers.test.ts`
- [ ] T846 [P] [US2] Add zero-activation tests proving Codex hook inspection causes no command, process, import, evaluation, mutation, URI load, referenced-hook read, or handler invocation in `tests/integration/security/zero-activation.test.ts`
- [ ] T847 [P] [US2] Add failing Codex hook-detail API tests for masked commands, typed events, additive composition, warnings, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T848 [US2] Add failing Codex hook runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T849 [US2] Add browser acceptance for standalone and inline Codex hook detail, warnings, diagnostics, shared config navigation, and zero executable rendering in `tests/e2e/codex-hooks-detail.spec.ts`

### Implementation

- [ ] T850 [US2] Add Codex additive matching, trust/event conditions, and same-layer file-plus-inline warning strategies in `shared/registries/runtime-composition.ts`
- [ ] T851 [US2] Implement Codex inline recognition, same-layer file-plus-inline retention, provenance, and warning metadata in `src/inspection/recognizers/codex.ts`
- [ ] T852 [US2] Extend JSON extraction for standalone Codex hook fields and secret-safe origins in `src/inspection/parsers/json.ts`
- [ ] T853 [US2] Extend TOML extraction for inline Codex hook fields and secret-safe origins in `src/inspection/parsers/toml.ts`
- [ ] T854 [US2] Integrate Codex hook masking, additive composition, conditions, warnings, and non-following references in `src/inspection/scan.ts`
- [ ] T855 [US2] Extend typed Codex hook detail for events, commands, scopes, provenance, order, warnings, and activation uncertainty in `app/components/inspection/RecognitionDetails.vue`
- [ ] T856 [US2] Add semantically equivalent English/Japanese Codex hook composition, warning, safety, and uncertainty messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 86: Claude Contained Hook Declarations

**Purpose**: Attach Claude Hook recognitions only to already admitted settings, skill, agent, plugin-manifest, or marketplace physical files containing supported declarations.

**Independent Test**: Inspect accepted settings, skill, agent, plugin-manifest, and marketplace owners with and without hook fields, plugin hook-path relationships, unreferenced `.claude/hooks/**` scripts, and fabricated `.claude/hooks.json`; verify no standalone Claude candidate or synthetic file, read-once attachment, exact owner provenance, and path-negative unsupported files.

**Visible Checkpoint**: Users can filter Claude contained Hook recognitions on their owning files without seeing invented hook files.

### Fixtures and tests first

- [ ] T857 [US1] Create Claude contained-hook fixtures in accepted settings, skills, agents, plugin manifests, and marketplaces plus absent fields, unreferenced scripts, fabricated standalone files, plugin hook paths, malformed declarations, secrets, and near misses in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T858 [US1] Materialize Claude contained-hook behavior, relationships, existing `claude.excluded.plugin-files` references, path-negative standalone/script/User cases, evidence, and no-standalone rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T859 [P] [US1] Add failing recognition tests for contained-only Claude hooks on settings/skill/agent/plugin/marketplace owner physical IDs, declaration provenance, no synthetic files, and no `.claude/hooks/**` or standalone inference in `tests/unit/inspection/recognizers.test.ts`
- [ ] T860 [P] [US1] Add failing scan tests for read-once owner files, deterministic Hook recognition attachment, relationship-only plugin hook paths, isolated malformed declarations, and zero referenced-hook reads in `tests/integration/repository-scan.test.ts`
- [ ] T861 [US1] Add browser acceptance for contained Claude Hook rows, owner-file navigation, filters, exclusions, diagnostics, and no standalone rows in `tests/e2e/claude-hooks-inventory.spec.ts`

### Implementation

- [ ] T862 [US1] Add Claude contained-hook lookup statements without standalone read authority in `shared/registries/vendor-behaviors.ts`
- [ ] T863 [US1] Add relationship-only plugin hook-path records, reference existing `claude.excluded.plugin-files`, and keep standalone/script/User locations path-negative without defining new exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T864 [US1] Add Claude hook evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T865 [US1] Implement Claude standalone-hook rejection and contained-declaration classification in `src/inspection/rules/claude.ts`
- [ ] T866 [US1] Attach Claude Hook recognitions to existing settings/skill/agent/plugin/marketplace physical files without creating candidates in `src/inspection/recognizers/claude.ts` and `src/inspection/scan.ts`
- [ ] T867 [US1] Extend Hook inventory rows and semantically equivalent English/Japanese Claude contained/owner/exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 87: Claude Hook Detail

**Purpose**: Add masked Claude Hook detail with same-command deduplication, complete additional context, and restrictive-decision ordering.

**Independent Test**: Open hostile contained declarations across all owner kinds and verify event fields, same-command deduplication, retention of every additional context, restrictive ordering, masking, conditions, diagnostics, and zero execution or referenced reads.

**Visible Checkpoint**: Selecting a Claude Hook recognition shows exact composition semantics without running it.

### Tests first

- [ ] T868 [P] [US2] Add failing Claude hook tests for same-command deduplication, retention of every additional context, restrictive-decision ordering, owner kinds, and activation conditions in `tests/unit/inspection/claude-metadata.test.ts`
- [ ] T869 [P] [US2] Add zero-activation tests proving Claude hook inspection causes no command, process, import, evaluation, mutation, URI load, plugin hook read, or handler invocation in `tests/integration/security/zero-activation.test.ts`
- [ ] T870 [P] [US2] Add failing Claude hook-detail API tests for masked commands, events, owner provenance, composition, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T871 [US2] Add failing Claude hook runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T872 [US2] Add browser acceptance for masked Claude Hook detail, owner provenance, dedup/context/order, diagnostics, and zero executable rendering in `tests/e2e/claude-hooks-detail.spec.ts`

### Implementation

- [ ] T873 [US2] Add Claude hook deduplication, additional-context, restrictive-order, event, and activation strategies in `shared/registries/runtime-composition.ts`
- [ ] T874 [US2] Implement Claude contained-hook metadata with same-command deduplication, all additional contexts, restrictive-decision order, and owner provenance in `src/inspection/recognizers/claude.ts`
- [ ] T875 [US2] Extend JSONC, YAML, and Markdown extraction with closed Claude hook fields and secret-safe owner origins in `src/inspection/parsers/json.ts`, `src/inspection/parsers/yaml.ts`, and `src/inspection/parsers/markdown.ts`
- [ ] T876 [US2] Integrate Claude hook masking, composition, conditions, diagnostics, and non-following references in `src/inspection/scan.ts`
- [ ] T877 [US2] Extend typed detail and semantically equivalent English/Japanese Claude hook composition, owner, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 88: Copilot Standalone Hook Files Inventory

**Purpose**: Add only root-direct-child Copilot `.github/hooks/*.json` physical candidates.

**Independent Test**: Inventory root hook files, reject nested files, User hooks, settings/agent/plugin declarations as separate files, hosted state, links, aliases, executable scripts, and near misses.

**Visible Checkpoint**: Users can filter standalone Copilot hook files with VS Code, CLI, and Cloud provenance.

### Fixtures and tests first

- [ ] T878 [US1] Create Copilot standalone-hook fixtures for root direct children, nested near misses, malformed JSON, hostile commands, secrets, links, aliases, User hooks, hosted state, settings/agent/plugin declarations, and scripts in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T879 [US1] Materialize Copilot standalone-hook behavior, candidate, path-negative User/hosted/script cases, relationship-only plugin paths, composition, and evidence rows without defining Hook-specific exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T880 [P] [US1] Add failing matcher/recognition tests for root `.github/hooks/*.json`, direct-child depth, surface provenance, nested/User/hosted/script rejection, and no contained-declaration duplication in `tests/unit/inspection/rules.test.ts` and `tests/unit/inspection/recognizers.test.ts`
- [ ] T881 [US1] Add browser acceptance for standalone Copilot hook rows, surface badges, filters, exclusions, diagnostics, and no executable controls in `tests/e2e/copilot-hooks-inventory.spec.ts`

### Implementation

- [ ] T882 [US1] Add surface-qualified Copilot hook lookup statements plus non-authorizing `copilot.behavior.vscode.user.hooks` and `copilot.behavior.cli.user.hooks` before hook composition references them in `shared/registries/vendor-behaviors.ts`
- [ ] T883 [US1] Add only the root direct-child `copilot.repo.hooks` candidate, keep User/hosted/script paths negative, and retain plugin component paths as relationships without defining new exclusion IDs in `shared/registries/inspection-rules.ts`
- [ ] T884 [US1] Add Copilot hook evidence records and reciprocal affected-contract references in `shared/registries/official-sources.ts`
- [ ] T885 [US1] Implement Copilot root `.github/hooks/*.json` direct-child matching and recognition in `src/inspection/rules/copilot.ts` and `src/inspection/recognizers/copilot.ts`
- [ ] T886 [US1] Integrate Copilot standalone-hook classification and preserve prior Hook results in `src/inspection/scan.ts`
- [ ] T887 [US1] Extend Hook inventory rows and semantically equivalent English/Japanese Copilot standalone/surface/exclusion messages in `app/components/inventory/InventoryItem.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 89: Copilot Hook Detail

**Purpose**: Add masked Copilot Hook detail and attach contained recognitions only to settings and custom-agent owners; plugin hook component paths remain relationships and never create recognition by path.

**Independent Test**: Open standalone and settings/agent-contained Copilot hooks and verify VS Code workspace same-event priority with agent additions, CLI append order, Cloud Repository-only behavior, owner provenance, plugin hook paths as relationships only, no plugin-path recognition, masking, conditions, diagnostics, and zero execution.

**Visible Checkpoint**: Selecting a Copilot Hook recognition shows exact surface composition without running it.

### Tests first

- [ ] T888 [P] [US2] Add failing Copilot hook tests for VS Code workspace same-event priority with agent additions, CLI source append order, Cloud Repository-only behavior, settings/agent owner provenance, and relationship-only plugin hook paths in `tests/unit/inspection/copilot-metadata.test.ts`
- [ ] T889 [US1] Add failing recognition tests proving only settings/agent hooks attach to existing physical files, plugin component paths create no Hook recognition or synthetic candidate, and contained provenance remains separate from standalone provenance in `tests/unit/inspection/recognizers.test.ts`
- [ ] T890 [P] [US2] Add zero-activation tests proving Copilot hook inspection causes no command, process, import, mutation, URI load, referenced-hook read, plugin activation, or handler invocation in `tests/integration/security/zero-activation.test.ts`
- [ ] T891 [P] [US2] Add failing Copilot hook-detail API tests for masked commands, events, surfaces, owner provenance, composition, conditions, diagnostics, and stale IDs in `tests/contract/http-api-files.test.ts`
- [ ] T892 [US2] Add failing Copilot hook runtime-composition graph coverage with reciprocal contract references in `tests/contract/runtime-composition.test.ts`
- [ ] T893 [US2] Add browser acceptance for standalone/contained Copilot Hook detail, surface order, owner navigation, diagnostics, and zero executable rendering in `tests/e2e/copilot-hooks-detail.spec.ts`

### Implementation

- [ ] T894 [US2] Add separate Copilot VS Code settings/agent priority/additions, CLI append-order, Cloud Repository-only, relationship-only plugin path, event, and activation strategies in `shared/registries/runtime-composition.ts`
- [ ] T895 [US2] Implement Copilot surface composition with contained recognition only on settings/agent owners, relationship-only plugin hook paths, provenance, and condition metadata in `src/inspection/recognizers/copilot.ts`
- [ ] T896 [US2] Extend JSONC and Markdown extraction with closed Copilot hook fields and secret-safe owner origins in `src/inspection/parsers/json.ts` and `src/inspection/parsers/markdown.ts`
- [ ] T897 [US2] Integrate Copilot hook masking, settings/agent owner composition, plugin-path relationship retention without recognition, conditions, diagnostics, and non-following references in `src/inspection/scan.ts`
- [ ] T898 [US2] Extend typed detail and semantically equivalent English/Japanese Copilot hook surface, owner, safety, and uncertainty messages in `app/components/inspection/RecognitionDetails.vue`, `app/locales/en.ts`, and `app/locales/ja.ts`

---

## Phase 90: Unified Hook Inventory

**Purpose**: Consolidate standalone and contained Hook recognitions, including read-once shared `.claude/settings*.json` owners.

**Independent Test**: Verify one physical read and separate Claude/Copilot Hook recognitions on shared settings, standalone Codex/Copilot files, contained owner provenance, deterministic order, no synthetic files, exclusions, filters, aliases, limits, diagnostics, and rescan cleanup.

**Visible Checkpoint**: Users can distinguish every supported standalone and contained Hook interpretation.

### Tests first

- [ ] T899 [US1] Finalize Hook fixtures for standalone Codex/Copilot files, Claude settings/skill/agent/plugin/marketplace owners, Copilot settings/agent owners, shared settings, relationship-only plugin paths, unreferenced scripts, secrets, aliases, exclusions, and exact limits in `tests/fixtures/repositories/build-fixtures.ts`
- [ ] T900 [US1] Finalize Hook behavior, standalone matchers, contained-owner composition, relationships, existing exact plugin-file exclusions, path-negative cases, and evidence conformance rows without adding Hook-specific exclusion IDs in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T901 [P] [US1] Add complete matcher tests for Codex/Copilot standalone files, no Claude standalone candidate, and every script/User/hosted/component exclusion in `tests/unit/inspection/rules.test.ts`
- [ ] T902 [P] [US1] Add complete recognition-matrix tests for standalone/contained origins, all accepted Claude owners, Copilot settings/agent owners only, shared settings, relationship-only plugin paths, no synthetic files, deterministic provenance, and zero extra recognitions in `tests/unit/inspection/recognizers.test.ts`
- [ ] T903 [P] [US1] Add failing integration tests for read-once shared owners, deterministic Hook recognition order, aliases, limits, partial continuity, and zero referenced-hook reads in `tests/integration/repository-scan.test.ts`
- [ ] T904 [US1] Add browser acceptance for unified Hook inventory, filters, shared recognitions, standalone/contained attribution, exclusions, diagnostics, and keyboard use in `tests/e2e/hooks-inventory.spec.ts`

### Implementation

- [ ] T905 [US1] Complete read-once owner/file assembly, deterministic Hook recognition/provenance order, no synthetic files, and bounded diagnostics in `src/inspection/scan.ts`
- [ ] T906 [US1] Complete Hook filters and standalone/contained/owner summaries in `app/components/inventory/InventoryFilters.vue` and `app/components/inventory/InventoryItem.vue`
- [ ] T907 [US1] Add semantically equivalent English/Japanese unified Hook inventory, shared-recognition, owner, and exclusion messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 91: Hook Comparison

**Purpose**: Extend comparison with literal and typed Hook differences while allowing selection only by a real readable physical file ID; contained Hook recognitions are selected through their owner file and runtime facts alone are not selectable.

**Independent Test**: Select exactly two current-generation readable physical owner/file IDs, including contained Hook declarations through their owners, and verify masked source plus aligned events, source order, deduplication, priority, composition, provenance, warnings, and uncertainty; reject synthetic IDs and runtime-fact-only rows.

**Visible Checkpoint**: Users can compare hook declarations without executing them.

### Tests first

- [ ] T908 [US3] Add failing selection and typed comparison regressions for real readable physical file IDs, contained Hooks through owner IDs, runtime-fact rejection, events, order, composition, provenance, warnings, and activation uncertainty in `tests/unit/app/comparison.test.ts` and `tests/unit/app/recognition-comparison.test.ts`
- [ ] T909 [US3] Add browser acceptance for owner-selected contained Hooks, literal Hook diff, typed event/composition differences, and rejection of runtime-fact-only selection in `tests/e2e/hooks-comparison.spec.ts`

### Implementation

- [ ] T910 [US3] Enforce comparison selection by real readable physical owner/file IDs and resolve contained Hook recognitions through their owners in `app/composables/comparison.ts`
- [ ] T911 [US3] Extend typed Hook comparison rows without exposing runtime facts as selectable files in `app/components/comparison/RecognitionComparison.vue`
- [ ] T912 [US3] Add semantically equivalent English/Japanese hook comparison messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 92: Repository Inventory Acceptance

**Purpose**: Verify that all preceding Repository inventory increments satisfy US1 without catch-all implementation.

**Independent Test**: Install the package against the all-supported fixture and verify every allowlisted file, filter, recognition, limit, rescan path, package path, and performance target, including every late owner activation from the priority MCP adapters on one existing owner/read with zero synthetic files or connections; the currently owned Repository registry gate is exactly 48 IDs—35 static candidates, five bounded-derived candidates, seven vendor exclusions, and `shared.excluded.symlink-target`—contained Hook/MCP work adds zero candidate rules, and the three `*.excluded.user-runtime` plus `shared.excluded.managed-remote-state` remain intentionally undefined until Phases 96–98.

**Visible Checkpoint**: US1 discovery is complete for every initial-release Repository customization family.

### Acceptance tests

- [ ] T913 [US1] Add the exact currently owned 48-ID Repository registry gate—35 static, five bounded-derived, seven vendor-excluded, and one shared-symlink exclusion—prove all early and late-owner contained Hook/MCP recognitions add zero candidate rules, one existing owner ID/read is retained, no synthetic file is created, and the four deferred Global-era non-read exclusions are not yet defined in `tests/contract/inspection-rules.test.ts`
- [ ] T914 [US1] Finalize all-supported, near-miss, empty, multi-tool, hard-link, derived, hostile, secret, and performance fixtures with guidance in `tests/fixtures/repositories/build-fixtures.ts`, `tests/fixtures/repositories/README.md`, and `tests/fixtures/repositories/README.ja.md`
- [ ] T915 [US1] Add exact-limit/one-over tests for 1-MiB files, 32-MiB bytes, 200,000 entries, 2,000 files, 64 segments, 1,024 aliases, and 30 seconds in `tests/integration/limits.test.ts`
- [ ] T916 [P] [US1] Add complete session/rescan API contracts for every Repository kind, strict envelopes, progress, conflicts, stale IDs, atomic publication, and safe failures in `tests/contract/http-api-session.test.ts`
- [ ] T917 [P] [US1] Add complete packaged CLI tests for isolated install, fixed assets/Worker, same tarball, launch `cwd`, fallback URL, shutdown, and rejected modes in `tests/package/npx-launch.test.ts`
- [ ] T918 [P] [US1] Complete one-second status, ten-second inventory, and sub-100-ms filtering/selection performance tests in `tests/performance/repository-scan.test.ts` and `tests/performance/inventory-interactions.test.ts`
- [ ] T919 [US1] Add Repository-complete browser acceptance for inventory, filters, multi-recognition, diagnostics, empty state, rescan, retry, keyboard use, and atomic replacement in `tests/e2e/repository-complete-inventory.spec.ts`

---

## Phase 93: Repository Detail Acceptance

**Purpose**: Verify that all preceding Repository detail increments satisfy US2 without catch-all implementation.

**Independent Test**: Verify the complete currently owned 48-ID Repository rule registry—35 static, five bounded-derived, seven vendor-excluded, and one shared-symlink exclusion—plus explicit absence of the four deferred Global-era exclusions, the parser matrix, exact detail limits, safe filesystem boundary, every late owner-bound MCP activation, zero activation/connection, file/reveal APIs, masking, relationships, diagnostics, stale cleanup, and zero candidate-rule additions or duplicate owner reads from contained Hook/MCP facts.

**Visible Checkpoint**: US2 safe detail is complete for every initial-release Repository customization family.

### Acceptance tests

- [ ] T920 [P] [US2] Add Repository-subgraph contracts for the exact currently owned 48-ID split of 35 static, five bounded-derived, seven vendor-excluded, and one shared-symlink exclusion, absence of the four deferred exclusions, zero contained Hook/MCP candidate rules, the full early-contract-to-late-owner activation matrix, one owner ID/read, zero synthetic files/connections, every currently owned behavior/strategy/relationship/evidence backlink, reciprocal fingerprints, and offline separation in `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T921 [P] [US2] Add four-parser matrix tests for JSONC, YAML, TOML, Markdown/frontmatter, strict encodings, atomic extraction, Worker replacement, and exact bounds in `tests/unit/inspection/parsers.test.ts` and `tests/unit/inspection/seed-parsers.test.ts`
- [ ] T922 [US2] Add exact-limit/one-over tests for relationships, provenances, derivations, fallbacks, masks, masked text, and parser bounds in `tests/integration/limits.test.ts`
- [ ] T923 [US2] Add exact-limit/one-over tests for source/assessment facts, diagnostic caps, sentinels, and bounded partial continuity in `tests/integration/limits.test.ts`
- [ ] T924 [P] [US2] Add full safety tests for malformed files, links, traversal, cycles, mutations, post-read verification, byte disposal, `O_NOFOLLOW`, and OS residuals in `tests/integration/inspection-safety.test.ts`
- [ ] T925 [P] [US2] Extend zero-activation regression across every Repository family for processes, evaluation/import, MCP, network, URI/image, writes, and referenced reads in `tests/integration/security/zero-activation.test.ts`
- [ ] T926 [P] [US2] Add complete file-detail/reveal API contracts for every kind, strict envelopes, stale IDs, no-store, masking overflow, and safe failures in `tests/contract/http-api-files.test.ts` and `tests/contract/http-api-reveals.test.ts`
- [ ] T927 [US2] Add Repository-complete browser acceptance for masked detail, metadata, relationships, reveals, diagnostics, stale routes, and zero executable rendering in `tests/e2e/repository-complete-detail.spec.ts`

---

## Phase 94: Repository Comparison Acceptance

**Purpose**: Verify that all preceding Repository comparison increments satisfy US3 without catch-all implementation.

**Independent Test**: Compare representative files from every family, including MCP through every late-admitted real owner ID, and verify literal/typed differences, rejection of runtime-only/dormant selections, fallback, accessibility, stale invalidation, and complete client resource cleanup.

**Visible Checkpoint**: US3 comparison is complete for every initial-release Repository customization family.

### Acceptance tests

- [ ] T928 [US3] Add lifecycle regressions for rescan invalidation of selections, reveals, Monaco models, subscriptions, raw records, late-owner MCP projections, and stale IDs across every Repository kind in `tests/integration/session-lifecycle.test.ts`
- [ ] T929 [US3] Add Repository-complete browser acceptance for literal comparison, typed differences, late-owner MCP selection through real owner IDs, runtime-only/dormant rejection, fallback behavior, accessibility, and lifecycle cleanup in `tests/e2e/repository-complete-comparison.spec.ts`

---

## Phase 95: Global Consent Preview

**Purpose**: Show an exact bounded no-I/O preview before any User-Global path is authorized and complete the remaining pure User-only behavior facts needed by the consent exclusions.

**Independent Test**: Use isolated environment inputs and fake homes to verify zero proposed-path I/O, exact three-tool preview entries, 32-KiB input and 192-KiB escaped-display limits, invalid overrides, versioned digest binding, stale/replayed rejection, accessible bilingual review, and one-time non-authorizing ownership of `codex.behavior.user.memories`, `codex.behavior.user.prompts`, and `claude.behavior.user.workflows`.

**Visible Checkpoint**: Users can review the exact Global roots, patterns, exclusions, limits, and contract version before enabling inspection.

### Fixtures and tests first

- [ ] T930 [US4] Create isolated Global-home fixtures for exact candidates, exclusions, fallback, invalid overrides, links, aliases, secrets, and unreadable roots with bilingual usage guidance in `tests/fixtures/global-homes/build-fixtures.ts`, `tests/fixtures/global-homes/README.md`, and `tests/fixtures/global-homes/README.ja.md`
- [ ] T931 [US4] Materialize and add failing registry/backlink coverage for the remaining pure User-only facts `codex.behavior.user.memories`, `codex.behavior.user.prompts`, and `claude.behavior.user.workflows` in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/official-sources.json`, `tests/contract/vendor-behaviors.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T932 [P] [US4] Add failing preview tests for zero filesystem I/O, absent versus invalid overrides, exact lexical roots, 32-KiB input, 192-KiB escaped output, and fixed null oversized state in `tests/unit/host/global-consent.test.ts`
- [ ] T933 [US4] Extend preview tests for ordered session-keyed digest binding, fixed-format verification inputs, stale/replayed invalidation, and exact enable-eligible tool state in `tests/unit/host/global-consent.test.ts`
- [ ] T934 [P] [US4] Add failing `GET /api/v1/global/consent-preview` contracts for exact response shape, statuses, limits, no client path authority, no-store behavior, and zero proposed-root I/O in `tests/contract/http-api-global.test.ts`
- [ ] T935 [US4] Add failing browser acceptance for bilingual roots, patterns, states, exclusions, limits, errors, keyboard review, and zero pre-consent source results or enable requests in `tests/e2e/global-consent-preview.spec.ts`

### Implementation

- [ ] T936 [US4] Add only the previously unowned non-authorizing facts `codex.behavior.user.memories`, `codex.behavior.user.prompts`, and `claude.behavior.user.workflows` before Global exclusion records reference them in `shared/registries/vendor-behaviors.ts`
- [ ] T937 [US4] Add reciprocal backlinks for those three pure User-only behavior facts to existing official-source records without creating source IDs in `shared/registries/official-sources.ts`
- [ ] T938 [US4] Implement bounded environment/default-home preview construction and streaming escaping without filesystem access, normalization, or root creation in `src/host/global-consent.ts`
- [ ] T939 [US4] Implement memory-only preview records, ordered session-keyed digest construction, fixed-format verification material, stale invalidation, and enable-request binding in `src/host/global-consent.ts`
- [ ] T940 [US4] Implement only the strict `GET /api/v1/global/consent-preview` handler with exact response, statuses, limits, no-store behavior, and no client path authority in `src/host/api-router.ts`
- [ ] T941 [US4] Implement accessible preview presentation for exact roots, patterns, states, exclusions, version, and limits in `app/components/consent/GlobalConsentPreview.vue`
- [ ] T942 [US4] Implement preview loading, local explicit-confirmation state, stale recovery, authorization-loss handling, and focus management without submitting enable in `app/pages/global-consent.vue`
- [ ] T943 [US4] Add semantically equivalent English/Japanese Global preview, limit, override, digest, and consent messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 96: Codex Global Boundary Admission and Enable Foundation

**Purpose**: Validate the exact stored preview through the enable endpoint, publish one logical enabled Global Source in `scanning` state with zero file rows/graph, and admit the Codex boundary into that Source.

**Independent Test**: Submit the exact preview-bound enable body, reject false/stale/mismatched requests without a separate confirmation endpoint, and verify an accepted request immediately publishes exactly one enabled `scanning` Global Source with zero Global file rows/graph; admit only the Codex boundary and selector, retain the Source, consent, accepted boundaries, and prior Repository graph on fatal failure, and own exactly `codex.excluded.user-runtime`.

**Visible Checkpoint**: The inventory shows one enabled Global Source in `scanning` with Codex admission progress and no Global file rows yet.

### Tests first

- [ ] T944 [P] [US4] Add failing Codex post-consent boundary-admission tests for canonical roots, links, junctions, case/Unicode/short-name aliases, invalid overrides, non-empty override fallback, and safe diagnostics in `tests/unit/host/global-consent.test.ts`
- [ ] T945 [P] [US4] Add failing `POST /api/v1/global/enable` contracts for `confirmed: true`, exact version/preview/digest binding, false/stale/mismatch rejection, alias diagnostics, conflicts, immediate one-Source `scanning` publication, waiting progress, and no confirmation endpoint in `tests/contract/http-api-global.test.ts`
- [ ] T946 [P] [US4] Add failing initial-enable coordinator tests for FIFO admission, dequeue-time generations, duplicate conflicts, one enabled `scanning` Source with zero graph, process-lifetime-stable `Source.sourceId`, progress transitions, fatal Source/consent/boundary/prior-graph retention, and generation-owned ID handling in `tests/unit/session/coordinator.test.ts`
- [ ] T947 [P] [US4] Add boundary tests for only the Codex Global instruction set, zero reads of Codex Global skills/agents/config/hooks/MCP/plugins/rules/state/credentials/logs/caches, a published `scanning` Source with zero Global files/graph, and Repository preservation in `tests/integration/global-boundaries.test.ts`
- [ ] T948 [US4] Materialize the reference-only Codex User behavior set, `codex.global.instructions`, exact `codex.excluded.user-runtime`, composition, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T949 [US4] Add failing Codex Global registry contracts proving all Codex User behaviors were already owned before enablement, `codex.global.instructions` is the only new Codex read-authorizing rule, and `codex.excluded.user-runtime` is the only newly owned Codex exclusion in `tests/contract/vendor-behaviors.test.ts`, `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T950 [US4] Add browser acceptance for exact-preview submission, one enabled `scanning` Global Source, Codex waiting/admission progress, safe boundary diagnostics, zero Global file rows, and retained Repository results in `tests/e2e/global-codex-admission.spec.ts`

### Implementation

- [ ] T951 [US4] Implement post-consent Codex boundary admission that rejects links and exposed alias differences and retains accepted consent/boundary state for the enabled Source in `src/host/global-consent.ts`
- [ ] T952 [US4] Update the already-owned `codex.behavior.user.instructions`, `codex.behavior.user.agents`, `codex.behavior.user.config`, `codex.behavior.user.hooks`, `codex.behavior.user.memories`, `codex.behavior.user.plugins`, `codex.behavior.user.prompts`, `codex.behavior.user.rules`, and `codex.behavior.user.skills` with reciprocal Global rule/exclusion references without adding or redefining any behavior ID in `shared/registries/vendor-behaviors.ts`
- [ ] T953 [US4] Add only `codex.global.instructions` as a consent-gated read-authorizing rule and own exactly the new non-read `codex.excluded.user-runtime` without changing any existing exclusion record in `shared/registries/inspection-rules.ts`
- [ ] T954 [US4] Extend the existing Codex instruction strategy with Global selection, fallback, applicability, and source-separation inputs without creating a new strategy ID in `shared/registries/runtime-composition.ts`
- [ ] T955 [US4] Update backlinks on existing official-source records for Codex Global coverage without creating new source IDs in `shared/registries/official-sources.ts`
- [ ] T956 [US4] Implement Codex non-empty `AGENTS.override.md` otherwise `AGENTS.md` below the consented boundary plus exact `codex.excluded.user-runtime` enforcement in `src/inspection/rules/codex.ts`
- [ ] T957 [US4] Implement isolated Codex boundary scanning, fallback, bounded diagnostics, and withholding of Global file-graph commits while the already published Source remains `scanning` in `src/inspection/scan.ts`
- [ ] T958 [US4] Implement initial enable validation, immediate publication of exactly one logical enabled Global Source in `scanning` with zero files/graph, FIFO admission, dequeue-time snapshots, duplicate rejection, progress, and fatal retention of the Source, consent, accepted boundaries, and prior graph in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T959 [US4] Implement only `POST /api/v1/global/enable` with exact stored-preview validation, constant-time digest comparison, boundary diagnostics, progress, conflicts, and no client path authority in `src/host/api-router.ts`
- [ ] T960 [US4] Wire the explicit confirmation control directly to the enable endpoint with stale-preview recovery and accessible focus handling in `app/pages/global-consent.vue`
- [ ] T961 [US4] Implement Global enable/progress controls in `app/components/consent/GlobalSourceControls.vue`
- [ ] T962 [US4] Add semantically equivalent English/Japanese Codex Global admission, enabled-scanning Source, zero-file pending state, boundary, fallback, and progress messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 97: Claude Global Boundary Admission

**Purpose**: Extend the same enabled `scanning` Global Source with Claude boundary admission and exact `CLAUDE.md` progress while keeping its file graph empty.

**Independent Test**: Admit valid and invalid Claude boundaries independently of Codex, keep exactly the same logical Global Source in `scanning`, read only the consented `CLAUDE.md`, own exactly `claude.excluded.user-runtime`, retain Source/consent/accepted-boundary/prior-graph state and sibling diagnostics on failure, and keep Global file rows/graph at zero.

**Visible Checkpoint**: The existing `scanning` Global Source reports Claude admission beside Codex and still has no Global file rows.

### Tests first

- [ ] T963 [P] [US4] Add failing Claude post-consent boundary tests for canonical roots, links, aliases, invalid overrides, missing/unreadable files, sibling independence, and safe diagnostics in `tests/unit/host/global-consent.test.ts`
- [ ] T964 [P] [US4] Add boundary tests for only Claude Global `CLAUDE.md`, zero reads of every neighboring User/runtime surface, the same `scanning` Source with zero Global files/graph, fatal state retention, and Repository preservation in `tests/integration/global-boundaries.test.ts`
- [ ] T965 [US4] Materialize the reference-only Claude User behavior set, `claude.global.instructions`, exact `claude.excluded.user-runtime`, composition, and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T966 [US4] Add failing Claude Global registry contracts proving all Claude User behaviors were already owned before enablement, `claude.global.instructions` is the only new Claude read-authorizing rule, and `claude.excluded.user-runtime` is the only newly owned Claude exclusion in `tests/contract/vendor-behaviors.test.ts`, `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T967 [US4] Add browser acceptance for the same enabled `scanning` Source, Claude waiting/admission progress, sibling diagnostics, zero Global file rows, and retained Repository results in `tests/e2e/global-claude-admission.spec.ts`

### Implementation

- [ ] T968 [US4] Implement post-consent Claude boundary admission that rejects links and exposed alias differences and extends the accepted boundary state of the existing enabled Source in `src/host/global-consent.ts`
- [ ] T969 [US4] Update the already-owned `claude.behavior.user.instructions`, `claude.behavior.user.rules`, `claude.behavior.user.skills`, `claude.behavior.user.commands`, `claude.behavior.user.agents`, `claude.behavior.user.settings`, `claude.behavior.user.output-style`, `claude.behavior.user.mcp-state`, `claude.behavior.user.plugins`, `claude.behavior.user.agent-memory`, `claude.behavior.user.auto-memory`, and `claude.behavior.user.workflows` with reciprocal Global rule/exclusion references without adding or redefining any behavior ID in `shared/registries/vendor-behaviors.ts`
- [ ] T970 [US4] Add only `claude.global.instructions` as a consent-gated read-authorizing rule and own exactly the non-read `claude.excluded.user-runtime` record in `shared/registries/inspection-rules.ts`
- [ ] T971 [US4] Extend the existing Claude instruction strategy with Global selection, applicability, and source-separation inputs without a new strategy ID in `shared/registries/runtime-composition.ts`
- [ ] T972 [US4] Update existing official-source backlinks for Claude Global coverage without creating source IDs in `shared/registries/official-sources.ts`
- [ ] T973 [US4] Implement only Claude `CLAUDE.md` below the consented boundary plus exact `claude.excluded.user-runtime` enforcement in `src/inspection/rules/claude.ts`
- [ ] T974 [US4] Implement isolated Claude boundary scanning, sibling-safe diagnostics, and withholding of Global file-graph commits while the existing Source stays `scanning` in `src/inspection/scan.ts`
- [ ] T975 [US4] Extend the same enabled `scanning` Source with independent Claude admission and progress while retaining zero Global files/graph and fatal Source/consent/boundary/prior-graph state in `src/session/session.ts`
- [ ] T976 [US4] Add semantically equivalent English/Japanese Claude Global admission, exact exclusion, sibling, same-Source progress, and zero-file pending messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 98: Copilot Global Boundary Admission

**Purpose**: Extend the same enabled `scanning` Global Source with the Copilot boundary and two exact instruction selectors, while owning `copilot.excluded.user-runtime` and the single shared `shared.excluded.managed-remote-state`.

**Independent Test**: Admit valid and invalid `COPILOT_HOME` boundaries, keep the same logical Source in `scanning`, read only `copilot-instructions.md` and `instructions/**/*.instructions.md`, reject invalid overrides without fallback, map the three admitted instruction behaviors only to their corresponding Global static rules, map the remaining 16 Copilot User behaviors only to `copilot.excluded.user-runtime`, map only the contracted Claude/Codex User and five Cloud behaviors to `shared.excluded.managed-remote-state`, retain Source/consent/accepted-boundary/prior-graph state and sibling diagnostics on failure, and keep Global file rows/graph at zero.

**Visible Checkpoint**: The existing `scanning` Global Source reports all three vendor admissions while still showing zero Global file rows.

### Tests first

- [ ] T977 [P] [US4] Add failing Copilot post-consent boundary tests for absent/default versus invalid overrides, canonical roots, links, aliases, missing/unreadable files, sibling independence, and safe diagnostics in `tests/unit/host/global-consent.test.ts`
- [ ] T978 [P] [US4] Add boundary tests for the two exact Copilot Global instruction sets, zero reads of every neighboring User/runtime/managed-remote surface, the same `scanning` Source with zero Global files/graph, fatal state retention, and Repository preservation in `tests/integration/global-boundaries.test.ts`
- [ ] T979 [US4] Materialize the reference-only Copilot behavior partition: `copilot.behavior.cli.user.instructions.root` only to `copilot.global.instructions.root`; `copilot.behavior.cli.user.instructions.path` plus `copilot.behavior.vscode.user.instructions` only to `copilot.global.instructions.path`; the remaining 16 Copilot User behaviors only to `copilot.excluded.user-runtime`; and only the contracted Claude/Codex User plus five Cloud behaviors to `shared.excluded.managed-remote-state`, with composition and evidence rows in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T980 [US4] Add failing Copilot Global registry contracts proving the exact three admitted behavior-to-Global-rule backlinks, the exact remaining-16-to-`copilot.excluded.user-runtime` backlinks, the contracted-only shared-managed affected set, no cross-partition backlink, only `copilot.global.instructions.root` and `copilot.global.instructions.path` newly authorizing reads, one newly owned vendor exclusion, and one shared exclusion in `tests/contract/vendor-behaviors.test.ts`, `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T981 [US4] Add browser acceptance for the same enabled `scanning` Source, Copilot waiting/admission progress, invalid-override diagnostics, zero Global file rows, and retained Repository results in `tests/e2e/global-copilot-admission.spec.ts`

### Implementation

- [ ] T982 [US4] Implement post-consent Copilot boundary admission that distinguishes absent/default from invalid overrides, rejects links/aliases, and extends the accepted boundary state of the existing enabled Source in `src/host/global-consent.ts`
- [ ] T983 [US4] Update already-owned behaviors with three disjoint reciprocal backlink sets: `copilot.behavior.cli.user.instructions.root` only to `copilot.global.instructions.root`; `copilot.behavior.cli.user.instructions.path` and `copilot.behavior.vscode.user.instructions` only to `copilot.global.instructions.path`; the remaining 16 Copilot User behaviors—`copilot.behavior.vscode.user.claude`, `copilot.behavior.vscode.user.skills`, `copilot.behavior.vscode.user.agents`, `copilot.behavior.vscode.user.prompts`, `copilot.behavior.vscode.user.hooks`, `copilot.behavior.vscode.user.mcp`, `copilot.behavior.vscode.user.settings`, `copilot.behavior.vscode.user.plugins`, `copilot.behavior.cli.user.skills`, `copilot.behavior.cli.user.agents`, `copilot.behavior.cli.user.hooks`, `copilot.behavior.cli.user.mcp`, `copilot.behavior.cli.user.settings`, `copilot.behavior.cli.user.plugins`, `copilot.behavior.cli.user.lsp`, and `copilot.behavior.cli.user.extensions`—only to `copilot.excluded.user-runtime`; and the contracted shared-managed set—`claude.behavior.user.mcp-state`, `claude.behavior.user.plugins`, `claude.behavior.user.settings`, `codex.behavior.user.config`, `codex.behavior.user.plugins`, `copilot.behavior.cloud.mcp`, `copilot.behavior.cloud.organization-agents`, `copilot.behavior.cloud.organization-instructions`, `copilot.behavior.cloud.plugins`, and `copilot.behavior.cloud.remote-skills`—only to `shared.excluded.managed-remote-state`, without adding or redefining any behavior ID in `shared/registries/vendor-behaviors.ts`
- [ ] T984 [US4] Add only `copilot.global.instructions.root` and `copilot.global.instructions.path` with their exact three admitted behavior refs, own exactly `copilot.excluded.user-runtime` with only the remaining 16 User behavior refs, and add the single shared non-read `shared.excluded.managed-remote-state` with only its contracted Claude/Codex User plus five Cloud refs in `shared/registries/inspection-rules.ts`
- [ ] T985 [US4] Extend existing Copilot CLI/VS Code instruction strategies with Global applicability and source separation without new strategy IDs in `shared/registries/runtime-composition.ts`
- [ ] T986 [US4] Update existing official-source backlinks for the exact admitted-three Global-rule, remaining-16 User-runtime, and contracted shared-managed partitions without creating source IDs in `shared/registries/official-sources.ts`
- [ ] T987 [US4] Implement only Copilot `copilot-instructions.md` and `instructions/**/*.instructions.md` below the consented boundary plus exact `copilot.excluded.user-runtime` and `shared.excluded.managed-remote-state` enforcement in `src/inspection/rules/copilot.ts`
- [ ] T988 [US4] Implement isolated Copilot boundary scanning, bounded subtree work, sibling-safe diagnostics, and withholding of Global file-graph commits while the existing Source stays `scanning` in `src/inspection/scan.ts`
- [ ] T989 [US4] Extend the same enabled `scanning` Source with independent Copilot admission and progress while retaining zero Global files/graph and fatal Source/consent/boundary/prior-graph state in `src/session/session.ts`
- [ ] T990 [US4] Add semantically equivalent English/Japanese Copilot Global override, admission, exact exclusions, sibling, same-Source progress, and zero-file pending messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 99: One-Source Global Result Integration

**Purpose**: Perform the first atomic ready/partial file-graph commit into the one logical enabled Global Source already published in Phase 96.

**Independent Test**: Complete zero to three eligible boundaries and verify the existing process-lifetime-stable `Source.sourceId` transitions from `scanning` to `ready` or `partial` with the first atomic graph commit while only generation-owned file, recognition, provenance, relationship, mask, and related graph IDs rekey; also verify independent boundary failures, the exact 56-rule total made from the 48-ID pre-Global gate plus four deferred non-read exclusions and four Global static rules, sibling continuation, Repository preservation, source separation, detail/comparison reuse, and no reads of excluded Global surfaces; a fatal attempt retains the enabled Source, consent, accepted boundaries, and prior graph.

**Visible Checkpoint**: The already visible Global Source gains its first ready/partial file rows atomically and can reuse detail/comparison workflows.

### Tests first

- [ ] T991 [P] [US4] Add integrated boundary tests for the exact three vendor instruction sets, maximum three boundaries, the already published logical Source, first atomic ready/partial graph commit, zero reads of every exact excluded Global surface, sibling continuation, and Repository preservation in `tests/integration/global-boundaries.test.ts`
- [ ] T992 [US4] Add final Global registry contracts proving exactly 56 rule IDs—the 48-ID pre-Global gate plus three vendor `*.excluded.user-runtime` records, `shared.excluded.managed-remote-state`, and four Global static read-authorizing rules—exact exclusion ownership, reciprocity, zero contained Hook/MCP candidate additions, and existing-source evidence backlinks in `tests/contract/vendor-behaviors.test.ts`, `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, and `tests/contract/official-sources.test.ts`
- [ ] T993 [P] [US4] Add coordinator tests for first atomic graph commit into the existing Source, stable `Source.sourceId`, `scanning`→`ready`/`partial` transitions, up-to-three boundary outcomes, generation-owned graph rekeying, sibling failure, bounded partial commits, fatal Source/consent/boundary/prior-graph retention, progress, and duplicate conflicts in `tests/unit/session/coordinator.test.ts`
- [ ] T994 [P] [US4] Add lifecycle tests proving Repository and Global `Source.sourceId` values remain process-lifetime stable while file, recognition, provenance, relationship, mask, and related generation-owned IDs rekey, with stale detail/reveal/comparison cleanup and no pending-admission leakage in `tests/integration/session-lifecycle.test.ts`
- [ ] T995 [US4] Add browser acceptance for exact-preview enablement, the existing Source transition from `scanning` to `ready`/`partial`, first atomic rows, one-source filters, sibling diagnostics, Global detail/comparison reuse, fatal retention, and Repository preservation in `tests/e2e/global-enable.spec.ts`

### Implementation

- [ ] T996 [US4] Finalize post-consent per-tool admission as the boundary set of the already enabled Source with maximum three entries and independent eligible-sibling retention in `src/host/global-consent.ts`
- [ ] T997 [US4] Finalize all Global behavior, exactly four Global static candidate rules, the existing exact exclusions, strategy references, 47 source backlinks, and the exact 56-rule total in `shared/registries/vendor-behaviors.ts`, `shared/registries/inspection-rules.ts`, `shared/registries/runtime-composition.ts`, and `shared/registries/official-sources.ts`
- [ ] T998 [US4] Implement integrated per-tool Global scanning, sibling continuation, Codex fallback, and the first bounded ready/partial file-graph result for the already published Source while preserving Repository results in `src/inspection/scan.ts`
- [ ] T999 [US4] Atomically commit the first ready/partial Global file graph into the already published Source after all admissions finish, preserve Repository and Global `Source.sourceId`, rekey only file, recognition, provenance, relationship, mask, and related generation-owned graph IDs, clear transient admission work, and on fatal retain the enabled Source, consent, accepted boundaries, and prior graph in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T1000 [US4] Complete `POST /api/v1/global/enable` responses for one-source outcomes, sibling diagnostics, bounded partial success, conflicts, progress, and stale resources in `src/host/api-router.ts`
- [ ] T1001 [US4] Implement Repository/Global source separation, filters, and shared detail/comparison navigation in `app/composables/filters.ts`, `app/composables/session.ts`, and `app/pages/index.vue`
- [ ] T1002 [US4] Complete Global enable/progress controls, focus recovery, and one-source outcome presentation in `app/pages/global-consent.vue` and `app/components/consent/GlobalSourceControls.vue`
- [ ] T1003 [US4] Add semantically equivalent English/Japanese one-source result-integration, `scanning`→`ready`/`partial`, boundary, sibling-failure, fatal-retention, source-filter, detail/comparison, and progress messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 100: Global Rescan and Recovery

**Purpose**: Add explicit Global rescan, FIFO serialization, bounded carried-source accounting, and recovery after fatal attempts.

**Independent Test**: Queue Repository and Global work, trigger partial and fatal Global attempts, and verify dequeue-time generations, process-lifetime-stable Repository and Global `Source.sourceId` values, rekeying only of generation-owned graph IDs, exact budgets, duplicate conflicts, retained consent/boundaries/prior graph, and successful explicit retry.

**Visible Checkpoint**: Users can rescan Global results and recover from a failed attempt without re-consenting.

### Tests first

- [ ] T1004 [US4] Add failing coordinator tests for cross-source FIFO, dequeue-time generations, duplicate scan conflicts, progress transitions, fatal retention, and per-job counters in `tests/unit/session/coordinator.test.ts`
- [ ] T1005 [US4] Extend coordinator tests for carried-source file/byte/diagnostic reservation and exact-limit/one-over visited-entry/deadline resets per active job in `tests/unit/session/coordinator.test.ts`
- [ ] T1006 [P] [US4] Add failing `POST /api/v1/global/rescan` contracts for empty bodies, source-disabled and duplicate conflicts, bounded-capacity failure, waiting progress, fatal retry, and stale IDs in `tests/contract/http-api-global.test.ts`
- [ ] T1007 [P] [US4] Add concurrency tests for enable completion, queued Repository/Global scans, partial publication, fatal retention, explicit retry, and unchanged consent/boundaries in `tests/integration/global-concurrency.test.ts`
- [ ] T1008 [P] [US4] Add lifecycle tests proving every successful/partial Global commit preserves Repository and Global `Source.sourceId`, rekeys unscanned Repository plus replaced Global file, recognition, provenance, relationship, mask, and related generation-owned IDs only, then invalidates old reveals and comparisons in `tests/integration/session-lifecycle.test.ts`
- [ ] T1009 [US4] Add browser acceptance for Global rescan, waiting/active progress, duplicate prevention, partial diagnostics, fatal retry, and retained prior results in `tests/e2e/global-rescan.spec.ts`

### Implementation

- [ ] T1010 [US4] Implement FIFO Global rescan and successful/partial commits that preserve Repository and Global `Source.sourceId`, regenerate only file, recognition, provenance, relationship, mask, and related generation-owned IDs, and invalidate old reveals/comparisons in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T1011 [US4] Implement carried-source budget reservation and per-active-job visited-entry/deadline reset in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T1012 [US4] Implement strict `POST /api/v1/global/rescan` handling with empty-body validation, conflicts, bounded-capacity errors, progress, fatal retry, and stale-resource responses in `src/host/api-router.ts`
- [ ] T1013 [US4] Implement Global rescan loading, duplicate suppression, stale recovery, fatal retry, and progress refresh in `app/components/consent/GlobalSourceControls.vue` and `app/composables/session.ts`
- [ ] T1014 [US4] Add semantically equivalent English/Japanese Global rescan, queue, partial-result, failure-retention, and retry messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 101: Global Disable Barrier and Teardown

**Purpose**: Add the priority zero-I/O disable barrier and remove every Global-owned artifact without disturbing retained Repository data.

**Independent Test**: Disable during Repository and Global work, repeat and join disable requests, and verify cancellation/requeue rules, one atomic generation, idempotent no-op behavior, closed handles, and removal of Global files, diagnostics, raw values, masks, reveals, selections, editors, consent, and boundaries.

**Visible Checkpoint**: Disabling Global inspection completely tears down its session state and leaves Repository inspection usable.

### Tests first

- [ ] T1015 [US4] Add failing coordinator tests for priority cancellation, zero cancellation diagnostics, Repository requeue-once, N+1 retained-Repository graph rekeying with stable Repository `Source.sourceId`, stale generation-owned IDs, joined barriers, no-op disable, and timestamps in `tests/unit/session/coordinator.test.ts`
- [ ] T1016 [P] [US4] Add failing `POST /api/v1/global/disable` contracts for empty bodies, cancelling progress, joined completion, idempotent no-op, one removal commit, and `200` responses in `tests/contract/http-api-global.test.ts`
- [ ] T1017 [P] [US4] Add concurrency tests for interrupted Repository work, interrupted Global work, queued Global cancellation, joined disable, requeue-once, and empty no-op behavior in `tests/integration/global-concurrency.test.ts`
- [ ] T1018 [P] [US4] Add boundary instrumentation proving Global disable performs zero filesystem enumeration or reads and emits zero barrier-cancellation diagnostics in `tests/integration/global-boundaries.test.ts`
- [ ] T1019 [P] [US4] Add lifecycle tests for removal of Global files, IDs, source and lifecycle diagnostics, raw values, masks, reveals, comparison selections, Monaco models, consent, boundaries, and handles in `tests/integration/session-lifecycle.test.ts`
- [ ] T1020 [US4] Add browser acceptance for disable progress, joined/no-op requests, focus restoration, Global route/editor teardown, diagnostic/mask removal, and retained Repository results in `tests/e2e/global-disable.spec.ts`

### Implementation

- [ ] T1021 [US4] Implement the priority zero-I/O barrier, active-work cancellation without diagnostics, queued-Global discard, Repository requeue-once, joined barriers, and no-op detection in `src/session/session.ts`
- [ ] T1022 [US4] Implement the N+1 zero-I/O commit that closes handles, removes the Global Source and its consent/boundaries/graph/diagnostics/raw values/masks/reveals/comparisons, preserves the retained Repository `Source.sourceId`, rekeys only its generation-owned graph IDs, and stales prior generation-owned IDs in `src/session/session.ts` and `src/session/scan-generation.ts`
- [ ] T1023 [US4] Implement strict `POST /api/v1/global/disable` handling with empty-body validation, cancelling progress, joined completion, no-op behavior, and one removal commit in `src/host/api-router.ts`
- [ ] T1024 [US4] Implement disable loading, joined/no-op handling, focus restoration, and Global route/editor/model cleanup in `app/pages/global-consent.vue`, `app/components/consent/GlobalSourceControls.vue`, and `app/composables/session.ts`
- [ ] T1025 [US4] Remove Global filters, selections, reveals, diagnostics, masks, and cached detail/comparison state after the committed barrier in `app/composables/filters.ts`, `app/composables/comparison.ts`, and `app/composables/monaco.ts`
- [ ] T1026 [US4] Add semantically equivalent English/Japanese Global barrier, cancellation, disable, no-op, removal, and Repository-preservation messages in `app/locales/en.ts` and `app/locales/ja.ts`

---

## Phase 102: Cross-Cutting Verification

**Purpose**: Add the final cross-cutting documentation, package, accessibility, lifecycle, and Node.js-only regression suites.

**Independent Test**: Run the cross-cutting suites and verify bilingual contracts, closed package contents, Node.js-only policy, accessibility behavior, and lifecycle cleanup.

**Visible Checkpoint**: The complete product passes its cross-cutting automated regression layer.

### Cross-cutting tests first

- [ ] T1027 Add documentation tests for reciprocal English/Japanese links, semantic parity, runnable commands, stable IDs, Node.js-only boundaries, `O_NOFOLLOW`, `safe-fs-boundary-unverifiable`, `platform-unobservable`, residual-risk wording, official backlinks, and absence of stale native claims in `tests/contract/documentation.test.ts`
- [ ] T1028 [P] Materialize exactly 47 source records and add final full-registry tests for exactly 56 inspection-rule IDs—35 Repository static, five bounded-derived, ten vendor-excluded, two shared-excluded, and four Global static—plus 39 strategies, 14 relationship-only rules, zero contained Hook/MCP candidate additions, complete reciprocity, official-source identity/network bounds, non-mutating failures, and runtime-import exclusion in `tests/fixtures/conformance/official-sources.json`, `tests/contract/inspection-rules.test.ts`, `tests/contract/runtime-composition.test.ts`, `tests/contract/official-sources.test.ts`, and `tests/contract/official-source-drift.test.ts`
- [ ] T1029 [P] Add exact packed-tarball closed-set tests for npm metadata, `bin.mjs`, both README files, `LICENSE`, two manifests, and every listed `dist/**` file in `tests/package/package-contents.test.ts`
- [ ] T1030 [P] Extend Node.js-only package tests to identical OS input and rejection of Rust/Cargo/Node-API/native dependencies or payloads, prebuilds, lifecycle build/download hooks, and unlisted data in `tests/package/node-only-policy.test.ts`
- [ ] T1031 [P] Add cross-story axe, keyboard, forced-colors, zoom/reflow, reduced-motion, focus-retention, and safe-error regressions in `tests/e2e/accessibility.spec.ts`
- [ ] T1032 [P] Add cross-source lifecycle regressions for rescan and Global-disable removal of selections, reveals, models, raw records, diagnostics, handles, and stale IDs in `tests/integration/session-lifecycle.test.ts`

---

## Phase 103: Documentation, Evidence, and Dependency Review

**Purpose**: Finalize bilingual operating guidance, official-source evidence, conformance data, and reviewed dependency decisions.

**Independent Test**: Run the bounded official-source workflow, review every drift/dependency decision, and verify synchronized English/Japanese guidance and conformance records.

**Visible Checkpoint**: Maintainers have reviewable guidance, evidence provenance, and dependency rationale for the release candidate.

### Documentation

- [ ] T1033 Draft semantically equivalent operational guidance with verified launch commands, Repository/Global scope, consent workflow, conditional interpretations, exclusions, and maintenance commands in `README.md` and `README.ja.md`
- [ ] T1034 Draft masking limitations, exact limits, diagnostics, Node.js filesystem defenses and residual risks, privacy, accessibility, and out-of-scope guidance in `README.md` and `README.ja.md`

### Official evidence and dependency review

- [ ] T1035 Implement the explicit networked official-source checker with exact-host, redirect, bounded-content, size, timeout, and non-mutating drift reporting in `scripts/check-official-sources.ts`
- [ ] T1036 Run `pnpm run check:official-sources` and record the reviewed source set and classified drift without automatic behavior changes in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1037 Resolve accepted source or section drift in `specs/001-inspect-agent-customizations/contracts/official-sources.md`, `specs/001-inspect-agent-customizations/contracts/official-sources.ja.md`, `specs/001-inspect-agent-customizations/contracts/runtime-composition.md`, and `specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md`
- [ ] T1038 [P] Resolve accepted Copilot evidence drift without automatic scope expansion in `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.md` and `specs/001-inspect-agent-customizations/contracts/vendors/github-copilot.ja.md`
- [ ] T1039 [P] Resolve accepted Claude evidence drift without automatic scope expansion in `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.md` and `specs/001-inspect-agent-customizations/contracts/vendors/claude-code.ja.md`
- [ ] T1040 [P] Resolve accepted Codex evidence drift without automatic scope expansion in `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.md` and `specs/001-inspect-agent-customizations/contracts/vendors/openai-codex.ja.md`
- [ ] T1041 Apply only explicitly reviewed evidence changes to `shared/registries/vendor-behaviors.ts`, `shared/registries/inspection-rules.ts`, `shared/registries/runtime-composition.ts`, and `shared/registries/official-sources.ts`
- [ ] T1042 Regenerate only affected conformance records in `tests/fixtures/conformance/vendor-behaviors.json`, `tests/fixtures/conformance/inspection-rules.json`, `tests/fixtures/conformance/runtime-composition.json`, and `tests/fixtures/conformance/official-sources.json`
- [ ] T1043 Synchronize reviewed evidence conclusions, rerun the checker, and record the final result in `specs/001-inspect-agent-customizations/research.md`, `specs/001-inspect-agent-customizations/research.ja.md`, `specs/001-inspect-agent-customizations/validation.md`, and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1044 Review `pnpm outdated`, licenses, notices, compatible-version rationale, and public-contract effects and record every accept/reject decision in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1045 Apply accepted dependency changes while preserving the frozen Node.js-only package contract in `package.json` and `pnpm-lock.yaml`
- [ ] T1046 Synchronize every accepted evidence and dependency effect in `README.md`, `README.ja.md`, and the affected English/Japanese research, plan, quickstart, inspection-path allowlist, runtime-composition, and vendor-contract pairs under `specs/001-inspect-agent-customizations/`

---

## Phase 104: Release and Outcome Evidence

**Purpose**: Assemble the release matrix and record pass/fail evidence for every measurable success criterion and final gate.

**Independent Test**: Build one closed-set platform-independent tarball, install identical bytes on every supported Node/OS job, and verify every SC-001–SC-008 denominator and threshold.

**Visible Checkpoint**: The initial release is publication-ready with explicit automated, participant, accessibility, performance, safety, and residual-risk evidence.

### Release workflow

- [ ] T1047 Add release jobs that consume one verified platform-independent tarball and install the same bytes across supported Node engines on Linux, macOS, and Windows in `.github/workflows/release.yml`
- [ ] T1048 Extend release jobs with safe-filesystem, two-manifest, production-export, `npx`, Node.js-only, package-content, browser, and accessibility gates before publication in `.github/workflows/release.yml`

### Outcome evidence and final gates

- [ ] T1049 Run frozen install, Chromium install, build, formatting, lint, typecheck, unit, contract, and security gates and record every result in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1050 Run integration, package, performance, browser, coverage, and documentation gates and record every result in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1051 Run the supported Node-engine/OS matrix against identical tarball bytes and record detectable unsafe-state rejection, `safe-fs-boundary-unverifiable`, effective `O_NOFOLLOW`, and non-proving `platform-unobservable` outcomes in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1052 Record SC-002 pass/fail from the final gates for the 1/1 reference 100,000-entry/500-file fixture: status within 1 second and complete inventory within 10 seconds in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1053 Record SC-003 pass/fail from the final gates and denominators for every supported, rejected, and shared-file conformance row: 100% recognition, zero outside interpretation, and 100% correct attribution in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1054 Record SC-004 pass/fail from the final gates and safety-suite denominators with zero activation, child process, MCP, network, mutation, rejected-selector reads, and changed-file byte publication in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1055 Record SC-005 pass/fail from the final gates and denominators for all secret values across every default view/comparison/diagnostic/log plus 100% reveal cleanup on file/source/session close in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1056 Execute and record the SC-001 participant protocol, participant denominator, pass/fail, and at-least-95% launch/open-within-two-minutes result in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1057 Execute and record the SC-006 participant protocol, participant denominator, pass/fail, and at-least-90% identification-within-two-minutes result with zero critical usability issues in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1058 Record SC-007 pass/fail from the final gates and denominators for all unreadable, malformed, oversized, cyclic, stale, and boundary-crossing fixtures with 100% unaffected usability and actionable diagnostics in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1059 Execute and record the SC-008 keyboard and manual accessibility protocol with denominators for every primary workflow, all applicable WCAG 2.2 AA automated/manual checks, pass/fail, and zero critical defects in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1060 Inspect the complete diff and packed tarball for correctness, untested branches, secret/boundary failures, stale claims, bilingual mismatches, and unrelated changes; repeat every affected evaluation in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`
- [ ] T1061 Finalize residual issues and concrete resolution paths, rerun `pnpm run test:docs`, and run `git diff --check` with results recorded in `specs/001-inspect-agent-customizations/validation.md` and `specs/001-inspect-agent-customizations/validation.ja.md`

---

## Story Coverage Matrix

| Phase | Primary story coverage | Cumulative checkpoint |
|---:|---|---|
| 1 Setup | shared prerequisite | Contributors can install the project and run the empty build/test toolchain. |
| 2 Minimal Secure Foundation | shared prerequisite | Security and package foundations pass independently, while no vendor matcher or inspected-source read exists outside the central authority. |
| 3 Bootable Authorized Empty Screen | US1 | The authorized browser screen starts and displays almost no product content. |
| 4 Codex Skill List | US1 | Users can see a Codex SKILL list, but cannot open file detail yet. |
| 5 Codex Skill Detail | US2 | Selecting a Codex SKILL opens a complete safe detail screen. |
| 6 Codex Skill Metadata List | US1 | Users can see independently identified Codex skill-metadata files without confusing them with their seed `SKILL.md` files. |
| 7 Codex Skill Metadata Detail | US2 | Selecting `agents/openai.yaml` opens a safe detail screen distinct from the owning SKILL detail. |
| 8 Claude Skill List | US1 | Claude and Codex SKILL lists coexist in the same inventory. |
| 9 Claude Skill Detail | US2 | Claude SKILL detail is complete and consistent with Codex detail. |
| 10 Copilot Skill List | US1 | Copilot skill rows show the exact three recognition combinations, while extra depth, configured roots, and extra tool recognitions remain absent. |
| 11 Copilot Skill Detail | US2 | Copilot SKILL detail exposes distinct VS Code, CLI, and Cloud interpretations. |
| 12 Unified Skill Inventory | US1 | Users can filter and understand the complete skill-first inventory. |
| 13 Skill Comparison | US3 | Any two readable SKILL files can be compared safely. |
| 14 Skill Metadata Comparison | US3 | Users can compare two Codex skill-metadata files without exposing secrets or conflating their seed skills. |
| 15 Codex Instructions Inventory | US1 | Users can filter static Codex instructions and see that configured fallback discovery is pending the later minimum config carrier rather than silently omitted. |
| 16 Codex Instructions Detail | US2 | Selecting a static Codex instruction opens safe detail with explicit order, byte budget, conditions, and an honest pre-carrier fallback status. |
| 17 Claude Instructions Inventory | US1 | Users can filter Claude instruction files with explicit launch/ancestor/descendant uncertainty. |
| 18 Claude Instructions Detail | US2 | Selecting a Claude instruction shows safe layered detail without importing referenced files. |
| 19 Copilot Instructions Inventory | US1 | Users can filter Copilot instruction candidates with surface-qualified provenance and explicit exclusions. |
| 20 Copilot Instructions Detail | US2 | Selecting a Copilot instruction shows separate surface interpretations and uncertainty. |
| 21 Unified Instructions Inventory | US1 | Users can understand the complete static instruction inventory, every shared-file interpretation, and the one bounded fallback integration that will activate when MCP admits its minimum carrier. |
| 22 Instructions Comparison | US3 | Users can compare two instruction files and understand their structural differences. |
| 23 Codex MCP Carrier and Contained Declarations | US1 | Users can filter Codex contained MCP declarations on their minimum carrier, and the configured instruction fallbacks from Phase 15 become visible; full configuration inventory/detail remains deferred to Phases 57–58. |
| 24 Codex MCP Detail | US2 | Selecting a Codex MCP recognition shows exact configuration semantics while every server remains inactive. |
| 25 Claude MCP Files Inventory | US1 | Users can filter the Claude project MCP file with exact-root provenance. |
| 26 Claude MCP File Detail | US2 | Selecting Claude `.mcp.json` shows exact file semantics and inactive server declarations. |
| 27 Claude Contained MCP Core | US2 | Claude skill-contained MCP facts appear on their existing owners and remain distinguishable from root `.mcp.json`; later owner families can activate their pretested adapter without changing MCP matching or connection safety. |
| 28 Copilot CLI MCP Files Inventory | US1 | Users can filter Copilot CLI MCP files with context and schema provenance. |
| 29 Copilot CLI MCP Detail | US2 | Selecting a Copilot CLI MCP file shows exact local ordering and uncertainty. |
| 30 Copilot VS Code MCP File Inventory | US1 | Users can identify the VS Code `servers` schema separately from Copilot CLI MCP files. |
| 31 Copilot VS Code MCP Detail | US2 | Selecting the VS Code MCP file shows schema-specific safe detail and uncertainty. |
| 32 Copilot Agent-Contained MCP Contract and Cloud Runtime Facts | US2 | Origin-file-less Cloud MCP facts and their unavailable state are visible; no local agent-contained row appears until the Custom Agents wave admits its owner and activates the pretested adapter. |
| 33 Priority MCP Inventory | US1 | Users can use the priority MCP inventory, distinguish readable physical files/owners from origin-file-less runtime facts, and see no premature row for an owner family that has not been admitted. |
| 34 MCP Comparison | US3 | Users can compare MCP declarations without connecting to them. |
| 35 Codex Rules Inventory | US1 | Users can filter Codex rules with trust, layer, experimental-status, and direct-child provenance. |
| 36 Codex Rules Detail | US2 | Selecting a Codex rule opens safe detail without executing or enforcing it. |
| 37 Claude Rules Inventory | US1 | Users can filter Claude rules with path applicability provenance and no unsupported Copilot badge. |
| 38 Claude Rules Detail | US2 | Selecting a Claude rule shows safe applicability detail without evaluating a glob against arbitrary filesystem paths. |
| 39 Rules Comparison | US3 | Users can compare rule files without evaluating which rule is correct or stronger. |
| 40 Claude Commands Inventory | US1 | Users can filter Claude commands with recursive namespace and layer provenance. |
| 41 Claude Commands Detail | US2 | Selecting a Claude command opens safe detail without executing, importing, or reading referenced targets. |
| 42 Copilot Commands Inventory | US1 | Users can identify the Copilot CLI interpretation of supported root command files. |
| 43 Copilot Commands Detail | US2 | Selecting a Copilot command shows safe CLI-qualified detail and uncertainty. |
| 44 Unified Commands Inventory | US1 | Users can distinguish shared root commands from nested Claude-only commands. |
| 45 Commands Comparison | US3 | Users can compare command files without executing them. |
| 46 Copilot Prompts Inventory | US1 | Users can filter supported Copilot prompts with exact default-location provenance. |
| 47 Copilot Prompts Detail | US2 | Selecting a Copilot prompt opens safe detail without navigating to or reading referenced targets. |
| 48 Copilot Prompts Comparison | US3 | Users can compare Copilot prompts without navigating or executing content. |
| 49 Codex Custom Agents Inventory | US1 | Users can filter Codex custom-agent files with exact project-layer provenance. |
| 50 Codex Custom Agents Detail | US2 | Selecting a Codex custom agent shows safe spawned-session detail and carrier-inheritance relationships without an agent-owned MCP recognition, connection, or configured-path read. |
| 51 Claude Custom Agents Inventory | US1 | Users can filter Claude custom agents with layer provenance and duplicate-name uncertainty. |
| 52 Claude Custom Agents Detail | US2 | Selecting a Claude custom agent shows safe context and relationship detail without reading memory or connecting to MCP. |
| 53 Copilot Custom Agents Inventory | US1 | Users can filter Copilot custom agents with surface-qualified provenance. |
| 54 Copilot Custom Agents Detail | US2 | Selecting a Copilot custom agent shows separate surface-aware context without executing handoffs, hooks, tools, or MCP. |
| 55 Unified Custom Agents Inventory | US1 | Users can understand the complete custom-agent inventory, shared Claude/Copilot interpretations and owner-attached MCP facts, and Codex carrier-inheritance relationships without duplicate files or incorrect MCP ownership. |
| 56 Custom Agents Comparison | US3 | Users can compare custom-agent definitions without executing or ranking them. |
| 57 Codex Configuration Recognition | US1 | Users can filter Codex project configuration on the same physical carrier already used for MCP and fallback derivation, while no configured path gains read authority. |
| 58 Codex Configuration Detail | US2 | Selecting `.codex/config.toml` shows safe typed configuration and fallback declarations without reading any declared target. |
| 59 Claude Settings Inventory | US1 | Users can identify exact-launch Claude settings files and their project/local layers. |
| 60 Claude Settings Detail | US2 | Selecting Claude settings shows safe layer-aware detail and owner-attached MCP without activating components, connecting to servers, or creating a standalone contained-family file. |
| 61 Copilot Settings Inventory | US1 | Users can identify supported Copilot settings candidates and surface provenance without seeing excluded VS Code or CLI state. |
| 62 Copilot Settings Detail | US2 | Selecting Copilot settings shows safe surface-qualified detail without enabling plugins or composing contained hooks. |
| 63 Unified Settings and Configuration Inventory | US1 | Users can filter the complete settings/configuration inventory and distinguish Claude settings-owned MCP, Copilot non-ownership, and the existing Codex carrier. |
| 64 Settings and Configuration Comparison | US3 | Users can compare settings/configuration without applying values or promoting declarations. |
| 65 Claude Output Styles Inventory | US1 | Users can filter supported Claude output styles with layer provenance. |
| 66 Claude Output Styles Detail | US2 | Selecting an output style opens safe detail without applying the style. |
| 67 Claude Output Styles Comparison | US3 | Users can compare Claude output styles without applying either style. |
| 68 Codex Marketplaces Inventory | US1 | Users can filter authored Codex marketplace catalogs without implying registration, installation, or enablement. |
| 69 Codex Marketplaces Detail | US2 | Selecting a Codex marketplace shows authored entries and safe local-source relationships without opening plugin manifests. |
| 70 Claude Marketplaces Inventory | US1 | Users can identify authored Claude marketplace catalogs without mistaking presence for registration. |
| 71 Claude Marketplaces Detail | US2 | Selecting a Claude marketplace shows safe authored metadata, source relationships, and owner-attached MCP without registration, activation, or connection claims. |
| 72 Copilot Marketplaces Inventory | US1 | Users can filter Copilot marketplace catalogs with exact root-form and surface provenance. |
| 73 Copilot Marketplaces Detail | US2 | Selecting a Copilot marketplace shows safe authored entries and bounded local-source plans without reading plugin manifests. |
| 74 Unified Marketplaces Inventory | US1 | Users can understand all marketplace interpretations and Claude owner-attached MCP on one shared authored catalog. |
| 75 Marketplaces Comparison | US3 | Users can compare marketplace catalogs without fetching, installing, or activating anything. |
| 76 Codex Plugin Manifests Inventory | US1 | Users can filter authored Codex plugin manifests with static or marketplace-derived provenance. |
| 77 Codex Plugin Manifests Detail | US2 | Selecting a Codex plugin manifest shows safe authored metadata without loading any component. |
| 78 Claude Plugin Manifests Inventory | US1 | Users can filter Claude plugin manifests with explicit root or marketplace-derived provenance. |
| 79 Claude Plugin Manifests Detail | US2 | Selecting a Claude plugin manifest shows safe authored metadata and component relationships without activation. |
| 80 Copilot Plugin Manifests Inventory | US1 | Users can filter Copilot plugin manifests with exact form, static/derived provenance, and surface conditions. |
| 81 Copilot Plugin Manifests Detail | US2 | Selecting a Copilot plugin manifest shows authored metadata and conditional runtime state without loading components. |
| 82 Unified Plugin Manifests Inventory | US1 | Users can understand every authored plugin interpretation and distinguish Claude owner-attached MCP from non-readable component paths. |
| 83 Plugin Manifests Comparison | US3 | Users can compare plugin manifests without loading or executing components. |
| 84 Codex Standalone Hook Files Inventory | US1 | Users can filter standalone Codex hook files without any command execution. |
| 85 Codex Hook Detail | US1 + US2 | Selecting a Codex Hook recognition shows exact additive semantics and warnings without running it. |
| 86 Claude Contained Hook Declarations | US1 | Users can filter Claude contained Hook recognitions on their owning files without seeing invented hook files. |
| 87 Claude Hook Detail | US2 | Selecting a Claude Hook recognition shows exact composition semantics without running it. |
| 88 Copilot Standalone Hook Files Inventory | US1 | Users can filter standalone Copilot hook files with VS Code, CLI, and Cloud provenance. |
| 89 Copilot Hook Detail | US1 + US2 | Selecting a Copilot Hook recognition shows exact surface composition without running it. |
| 90 Unified Hook Inventory | US1 | Users can distinguish every supported standalone and contained Hook interpretation. |
| 91 Hook Comparison | US3 | Users can compare hook declarations without executing them. |
| 92 Repository Inventory Acceptance | US1 | US1 discovery is complete for every initial-release Repository customization family. |
| 93 Repository Detail Acceptance | US2 | US2 safe detail is complete for every initial-release Repository customization family. |
| 94 Repository Comparison Acceptance | US3 | US3 comparison is complete for every initial-release Repository customization family. |
| 95 Global Consent Preview | US4 | Users can review the exact Global roots, patterns, exclusions, limits, and contract version before enabling inspection. |
| 96 Codex Global Boundary Admission and Enable Foundation | US4 | The inventory shows one enabled Global Source in `scanning` with Codex admission progress and no Global file rows yet. |
| 97 Claude Global Boundary Admission | US4 | The existing `scanning` Global Source reports Claude admission beside Codex and still has no Global file rows. |
| 98 Copilot Global Boundary Admission | US4 | The existing `scanning` Global Source reports all three vendor admissions while still showing zero Global file rows. |
| 99 One-Source Global Result Integration | US4 | The already visible Global Source gains its first ready/partial file rows atomically and can reuse detail/comparison workflows. |
| 100 Global Rescan and Recovery | US4 | Users can rescan Global results and recover from a failed attempt without re-consenting. |
| 101 Global Disable Barrier and Teardown | US4 | Disabling Global inspection completely tears down its session state and leaves Repository inspection usable. |
| 102 Cross-Cutting Verification | regression | The complete product passes its cross-cutting automated regression layer. |
| 103 Documentation, Evidence, and Dependency Review | release evidence | Maintainers have reviewable guidance, evidence provenance, and dependency rationale for the release candidate. |
| 104 Release and Outcome Evidence | measured outcomes | The initial release is publication-ready with explicit automated, participant, accessibility, performance, safety, and residual-risk evidence. |

## Dependencies and Execution Order

### Phase dependencies

```text
Setup
  → Minimal Secure Foundation
  → Bootable Authorized Empty Screen
  → Codex Skill List → Codex Skill Detail
  → Codex Skill Metadata List → Codex Skill Metadata Detail
  → Claude Skill List → Claude Skill Detail
  → Copilot Skill List → Copilot Skill Detail
  → Unified Skill Inventory → Skill Comparison → Skill Metadata Comparison
  → Codex Instructions Inventory → Codex Instructions Detail
  → Claude Instructions Inventory → Claude Instructions Detail
  → Copilot Instructions Inventory → Copilot Instructions Detail
  → Unified Instructions Inventory → Instructions Comparison
  → Codex MCP Carrier and Contained Declarations → Codex MCP Detail
  → Claude MCP Files Inventory → Claude MCP File Detail → Claude Contained MCP Core
  → Copilot CLI MCP Files Inventory → Copilot CLI MCP Detail
  → Copilot VS Code MCP File Inventory → Copilot VS Code MCP Detail
  → Copilot Agent-Contained MCP Contract and Cloud Runtime Facts
  → Priority MCP Inventory → MCP Comparison
  → Codex Rules Inventory → Codex Rules Detail
  → Claude Rules Inventory → Claude Rules Detail → Rules Comparison
  → Claude Commands Inventory → Claude Commands Detail
  → Copilot Commands Inventory → Copilot Commands Detail
  → Unified Commands Inventory → Commands Comparison
  → Copilot Prompts Inventory → Copilot Prompts Detail → Copilot Prompts Comparison
  → Codex Custom Agents Inventory → Codex Custom Agents Detail
  → Claude Custom Agents Inventory → Claude Custom Agents Detail
  → Copilot Custom Agents Inventory → Copilot Custom Agents Detail
  → Unified Custom Agents Inventory → Custom Agents Comparison
  → Codex Configuration Recognition → Codex Configuration Detail
  → Claude Settings Inventory → Claude Settings Detail
  → Copilot Settings Inventory → Copilot Settings Detail
  → Unified Settings and Configuration Inventory → Settings and Configuration Comparison
  → Claude Output Styles Inventory → Claude Output Styles Detail → Claude Output Styles Comparison
  → Codex Marketplaces Inventory → Codex Marketplaces Detail
  → Claude Marketplaces Inventory → Claude Marketplaces Detail
  → Copilot Marketplaces Inventory → Copilot Marketplaces Detail
  → Unified Marketplaces Inventory → Marketplaces Comparison
  → Codex Plugin Manifests Inventory → Codex Plugin Manifests Detail
  → Claude Plugin Manifests Inventory → Claude Plugin Manifests Detail
  → Copilot Plugin Manifests Inventory → Copilot Plugin Manifests Detail
  → Unified Plugin Manifests Inventory → Plugin Manifests Comparison
  → Codex Standalone Hook Files Inventory → Codex Hook Detail
  → Claude Contained Hook Declarations → Claude Hook Detail
  → Copilot Standalone Hook Files Inventory → Copilot Hook Detail
  → Unified Hook Inventory → Hook Comparison
  → Repository Inventory Acceptance → Repository Detail Acceptance → Repository Comparison Acceptance
  → Global Consent Preview
  → Codex Global Boundary Admission and Enable Foundation
  → Claude Global Boundary Admission
  → Copilot Global Boundary Admission
  → One-Source Global Result Integration
  → Global Rescan and Recovery
  → Global Disable Barrier and Teardown
  → Cross-Cutting Verification
  → Documentation, Evidence, and Dependency Review
  → Release and Outcome Evidence
```

- Delivery phases are strictly sequential at the checkpoint level because every later phase reuses and regresses the preceding product slice.
- Within each phase, fixtures and failing tests precede implementation; an Implementation section never edits a test file.
- Phase 15 defines the pure Codex fallback-declaration interface without authorizing a configuration read; Phase 23 atomically admits the minimum `.codex/config.toml` carrier, registers `codex.repo.config` and `codex.derived.fallback-basename`, and activates bounded instruction fallbacks together with Codex MCP declarations.
- Phase 27 defines Claude owner-gated MCP adapters for future settings, custom-agent, marketplace, and plugin-manifest owners; Phases 52, 60, 71, and 79 activate those adapters only after the corresponding owner family is independently admitted. Phase 32 uses the same dormant-owner pattern for Copilot custom agents, with activation in Phase 54.
- Phases 57–58 extend the already admitted Codex configuration carrier with the `settings/config` recognition and full detail presentation; they do not add a second candidate, physical read, fallback rule, or MCP recognition.
- Marketplace detail precedes plugin-manifest inventory so only validated local source declarations can seed one bounded derivation edge.
- Phase 61 owns the exact Copilot VS Code settings exclusion after the earlier MCP phase keeps that path negative; Phases 77 and 79 similarly own the exact Codex and Claude plugin-file exclusions and upgrade the earlier MCP path-negative contexts without changing their admitted candidates.
- All owner families precede Hook recognition. Contained Hook recognition reuses already admitted owners, while priority MCP recognition is delivered earlier through admitted carriers or dormant owner-gated adapters that cannot read or publish a recognition until their owner exists.
- Phase 96 publishes exactly one enabled Global Source in `scanning` with zero files/graph; Phases 97–98 extend that same Source's boundary progress; Phase 99 performs the first ready/partial graph commit.
- Repository Inventory, Detail, and Comparison Acceptance complete US1, US2, and US3; Global Disable Barrier and Teardown is the first phase at which US4 is complete.

## Parallel Opportunities

- Setup configuration files can proceed in parallel after the dependency baseline and runnable commands are frozen.
- In Minimal Secure Foundation, shared DTO/limit/diagnostic tests, host-security tests, package-policy tests, and filesystem-fixture preparation use different files and can proceed in parallel where marked.
- Within a vendor Inventory phase, matcher, recognizer, integration, API, and browser tests may proceed in parallel only after that phase's fixture and conformance rows are complete and only when their exact file sets do not overlap.
- Within a vendor Detail phase, metadata, relationship, zero-activation, API, and browser tests commonly use separate files and may proceed in parallel where marked; parser work on the same parser file remains sequential.
- Vendor phases themselves remain checkpoint-sequential even when their implementation files differ, because every next visible checkpoint must regress the preceding vendor slice.
- Marketplace vendors cannot derive plugin candidates in parallel with their own Detail phase; plugin derivation starts only after local-source extraction passes.
- Codex, Claude, and Copilot plugin recognizer work occurs in separate phases; the Unified Plugin Manifests Inventory performs the first cross-tool read-once assembly.
- Hook parser/recognizer work is parallel only inside a phase when exact files differ. Shared `src/inspection/scan.ts`, UI, locale, and registry files are never marked parallel against another task in the same phase.
- MCP CLI, VS Code, contained-owner, and Cloud-fact phases use distinct tests, but shared Copilot recognizer, JSON parser, scan, and UI work stays sequential by phase.
- Repository acceptance tests marked `[P]` may proceed after the all-supported fixture and final registry graph are fixed.
- Global vendor boundary tests use isolated fixture roots, but Phases 96–98 remain sequential because they extend one enabled `scanning` Source; they may update Source progress but may not commit Global file rows before Phase 99.
- Global rescan and disable API, concurrency, boundary, lifecycle, and browser tests may proceed in parallel after their coordinator-state tests where exact files differ.
- Cross-cutting package, Node.js-only, accessibility, lifecycle, and official-source tests and the three vendor evidence reviews are independent marked work streams.

### Parallel example: vendor Inventory phase

```text
After the phase fixture and conformance tasks:
  matcher/registry contract
  recognizer unit test
  repository-scan integration test
  inventory UI unit test
  browser acceptance
```

### Parallel example: safe Detail phase

```text
After the phase metadata shape is fixed:
  vendor metadata test
  relationship test
  zero-activation or zero-connection test
  HTTP detail/reveal contract
  browser detail acceptance
```

## Implementation Strategy

### First visible milestone

1. Complete Setup and Minimal Secure Foundation.
2. Launch the authorized generation-zero shell.
3. Stop and review the bootable empty screen before any Repository I/O is introduced.

### Priority wave 1 — Skills, Instructions, and MCP

1. Deliver the complete Codex, Claude, and Copilot SKILL list/detail path, read-once shared inventory, SKILL comparison, and distinct skill-metadata comparison.
2. Deliver static Instructions list/detail checkpoints for all three tools. Keep configured Codex fallbacks as a pure declaration/derivation interface until a carrier is authorized.
3. Admit the minimum Codex `.codex/config.toml` carrier in the first MCP phase, then atomically activate its configured instruction fallbacks and contained MCP declarations without presenting it as a settings/config item yet.
4. Deliver standalone Claude, Copilot CLI, and Copilot VS Code MCP files immediately. Define contained MCP support for already admitted skill owners and owner-gated dormant adapters for settings, custom agents, marketplaces, and plugin manifests that have not yet been admitted.
5. Consolidate only currently materialized MCP files/owners and runtime facts, then deliver masked MCP comparison. Dormant adapters remain absent from inventory, detail, counts, connections, and selection.

### Priority wave 2 — Rules, Commands, Prompts, and Custom Agents

1. Deliver Codex and Claude Rules list/detail checkpoints and comparison; keep Copilot `.claude/rules` as an explicit initial-scope exclusion.
2. Deliver Claude and Copilot Commands list/detail checkpoints, their shared-file integration, and comparison.
3. Deliver the single-vendor Copilot Prompts inventory, detail, and comparison checkpoints.
4. Deliver Codex, Claude, and Copilot Custom Agents list/detail checkpoints. Activate the previously dormant Claude and Copilot agent-contained MCP adapters on those real owner recognitions without adding a candidate, rereading a file, or creating a synthetic file/connection.
5. Consolidate read-once shared custom-agent owners and deliver comparison with their owner-attached MCP recognitions preserved.

### Priority wave 3 — Remaining customizations

1. Extend the existing Codex carrier into full configuration recognition/detail, then deliver Claude and Copilot settings. Activate the dormant Claude settings-contained MCP adapter and reproject Copilot instruction enablement; Copilot settings remain non-MCP owners.
2. Deliver Claude Output Styles.
3. Deliver Marketplaces, activating Claude marketplace-contained MCP only when its owner is admitted.
4. Deliver Plugin Manifests after marketplace local-source validation, activating Claude plugin-contained MCP only on admitted manifest owners.
5. Deliver Hooks last among Repository customization families so every contained Hook attaches to an already admitted owner.
6. Complete Repository acceptance, Global inspection, cross-cutting verification, documentation/evidence review, and release evidence.

### Vendor-first vertical slices within each family

1. Complete each supported vendor's List/Inventory checkpoint.
2. Complete that vendor's safe Detail or contained-metadata checkpoint.
3. Add the explicit shared physical-file integration checkpoint where the allowlist permits multi-tool recognition.
4. Add one family comparison checkpoint after all supported vendor semantics exist.

Single-vendor families retain their own inventory/detail/comparison checkpoints. Every phase remains independently demonstrable even when an earlier MCP contract is waiting for a later owner family.

### Marketplace-to-plugin boundary

1. Marketplace Inventory admits authored catalogs only.
2. Marketplace Detail validates and retains bounded local source declarations without reading targets.
3. Plugin Manifest Inventory alone may use those declarations for a one-edge bounded-derived candidate.
4. Plugin component, Hook, MCP, script, asset, remote, installed, cache, and hosted targets remain relationships or exclusions.

### Dormant owner-adapter activation

1. An early MCP adapter is a pure, owner-gated parser/composition contract. It has no candidate rule, filesystem enumeration, read authority, inventory row, or selection target of its own.
2. If the owner already exists, the MCP recognition attaches to that same physical owner and generation read. If the owner is introduced later, its owner-family phase explicitly activates the adapter and proves one owner ID, one read, separate owner/MCP recognitions, and no synthetic file or connection.
3. Codex uses one admitted configuration carrier for fallback declarations, MCP, and later configuration presentation. Claude activates future-owner adapters in Custom Agents, Settings, Marketplaces, and Plugin Manifests. Copilot activates its agent-contained adapter in Custom Agents; settings are never MCP owners and plugin paths remain relationships.
4. Hook phases attach contained recognitions to already admitted owners and never create a Claude standalone hook or synthetic file.
5. Unified and acceptance phases prove read-once shared owner/file assembly before comparison and reject dormant/runtime-only entries as selectable files.

### Release completion

1. Pass Repository Inventory, Detail, and Comparison Acceptance.
2. Deliver no-I/O Global consent preview.
3. Publish one enabled `scanning` Global Source during accepted Codex enablement and extend it with independent Claude/Copilot boundary progress while its file graph remains empty.
4. Atomically commit the first ready/partial Global file graph into that existing Source with at most three successful boundaries.
5. Add Global rescan/recovery and the priority zero-I/O disable barrier.
6. Complete cross-cutting verification and documentation/evidence/dependency review.
7. Record SC-001–SC-008 denominators, thresholds, pass/fail results, release matrix, and residual risks.

## Notes

- Only `src/inspection/safe-fs.ts` may enumerate or read enabled inspected sources; caller paths, relationship targets, vendor locators, strategies, and evidence records never grant read authority.
- Every candidate phase uses candidate `lstat` first, then `realpath` containment, then a repeated unchanged `lstat`; applicable phases also compare root, every available ancestor, and same-handle identity.
- Every detected change or required check reported as unusable/ambiguous discards all bytes and publishes no readable result. Root/shared-ancestor unverifiability rejects the source attempt; candidate unverifiability rejects that item.
- Effective `O_NOFOLLOW` is mandatory defense in depth where Node.js exposes and enforces it, but no test may claim kernel-enforced containment against the documented active-mutator or platform-unobservable residual cases.
- All executable product, build, and test code is JavaScript/TypeScript. Rust, Cargo, Node-API/native addons, prebuilt binaries, lifecycle compilation, and lifecycle/runtime artifact downloads remain prohibited.
- Vendor behavior, Inspector matchers, runtime composition, and official evidence have separate ownership. Only static and bounded-derived Inspector rules can authorize a read.
- The only non-read `excluded` rule IDs are `shared.excluded.symlink-target`, `shared.excluded.managed-remote-state`, `copilot.excluded.additional-standard-locations`, `copilot.excluded.extra-directories`, `copilot.excluded.vscode-settings`, `copilot.excluded.cli-lsp`, `copilot.excluded.cli-extensions`, `codex.excluded.plugin-files`, `claude.excluded.plugin-files`, `codex.excluded.user-runtime`, `claude.excluded.user-runtime`, and `copilot.excluded.user-runtime`; every other rejection is a path-negative test or relationship-only condition.
- Relationships are descriptive, direct, bounded, and non-following. A relationship target is readable only through its own independent static or bounded-derived admission.
- One physical file is read once per generation and may retain multiple tool recognitions and multiple bounded provenances.
- `agents/openai.yaml` is a separate physical candidate and `skill metadata` recognition; it is never folded into the seed `SKILL.md` identity.
- Phase 23 admits `.codex/config.toml` once as the minimum carrier needed for configured instruction fallbacks and Codex MCP. Phases 57–58 reuse that same physical ID and generation read when they add `settings/config` recognition and full configuration detail; they never create a second configuration candidate.
- Claude standalone hooks, Codex standalone MCP, hosted/organization/managed/remote inputs, Claude workflows and agent memory, Codex Repository prompts and plugin components, Copilot LSP/extensions/general `.vscode/settings.json`, and extra configured roots never receive List phases or read authority.
- Contained Hook and MCP recognitions reuse their already admitted owner physical file. A dormant MCP adapter cannot enumerate, read, or publish anything before its independently authorized owner is admitted; activation adds a recognition to that owner without a new candidate or read. A declaration, plugin component path, Cloud fact, or runtime reference never creates a synthetic local file.
- Marketplace and plugin manifest are separate kinds. Only a validated local marketplace source may seed one bounded plugin-manifest derivation edge; components never recurse.
- Global inspection is one logical source with at most three independently admitted vendor boundaries. Its `Source.sourceId` remains stable for the process lifetime while file, recognition, provenance, relationship, mask, and related generation-owned IDs rekey on commits. Phase 96 publishes the enabled `scanning` Source with zero files/graph; Phases 97–98 extend its progress; Phase 99 makes the first ready/partial graph commit.
- Raw bytes and secret values remain server-memory-only for the minimum required lifetime. Masking overflow exposes no prefix, metadata, relationship, derivation, comparison, or reveal.
- The non-exhaustive-masking warning is implemented at the first Codex detail checkpoint and remains always visible through every later inventory, detail, and comparison increment.
- Normal startup, scans, builds, and tests are offline with respect to official documentation. Only the explicit maintainer source-check command may access the network.
- Every human-authored repository document change updates the English canonical file and Japanese companion together.
- Passing automated tests is evidence rather than exhaustive proof; Phase 104 requires full-context diff, package, participant, accessibility, measurable-outcome, and residual-risk review.
