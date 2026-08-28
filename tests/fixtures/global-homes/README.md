# Global home fixture trees

[日本語](README.ja.md)

`build-fixtures.ts` writes the User-Global homes this project's consent and Global
inspection suites inspect. One builder is one deterministic tree: given the same base it
writes the same bytes, so a suite asserting an exact path list or an exact row order can be
re-run without a golden file beside it.

## What these homes are for

A Global home is the product's own configuration directory, not a repository, and consent
authorizes exactly the customization files the allowlist names below it — the instruction
files, personal skills, agents, hooks, settings documents, and MCP carriers each member's
contract admits (spec.md FR-015 through FR-018, FR-045). Everything else in that
directory — credentials, sessions, caches, generated memories, installed plugin copies and
other automatically managed state — stays excluded however ordinary its filename looks. So each home holds both
halves: the admitted candidates in `expectedCandidatePaths`, and the neighbours in
`nearMissPaths` that no rule may admit. A suite that finds a neighbour enumerated, opened,
or read has found a defect rather than a stale fixture.

A fixture is used by pointing the environment at built homes — `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, and `CODEX_HOME` for the three tool members, and `HOME`, from which
the product derives the shared agent home `~/.agents` itself (FR-013, FR-045); all four
come back from `environment` already keyed by name — because those properties are the
product's only input here. It never takes a Global root as an argument.

Two rules hold for every home:

- **The harness is the only writer.** The product never mutates an inspected tree (FR-023).
  `observeTree` records content, length, identity, link target, mode, mtime, and ctime for
  every entry so a suite can compare the whole home before and after a session.
  `observeAccessTimes` is separate on purpose: reading a file is what moves its `atime`, so
  that attribute is the one a read may legitimately change and is never a mutation this
  product made. Node.js exposes no stable xattr or ACL API, so ctime is the indirect signal
  that metadata beside the content changed.
- **Nothing here is re-read as truth.** The credential-shaped literals in
  `GLOBAL_HOME_SECRETS` and the environment references in
  `GLOBAL_HOME_ENVIRONMENT_REFERENCES` exist so a suite can prove a detail shows them
  unmasked and unresolved (FR-025, FR-026); `GLOBAL_HOME_SENTINELS` holds the process
  values that must never appear in their place. The `hooks/pre-commit.sh` payload is
  executable-looking and inert: this product reads bytes and shows them, and nothing it
  reads is ever run (FR-020).

## The builders

| Builder | What it writes |
|---|---|
| `buildGlobalHomeFixture` | One realistic set of all three homes: the admitted instruction files of each, plus the configuration and state beside them. The Codex home carries both ordered instruction targets, so a fallback is observable. |
| `buildCodexInstructionHome` | One Codex home in which `AGENTS.override.md` and `AGENTS.md` each take an independent `CODEX_INSTRUCTION_CASES` outcome, for the first-non-empty branch. |
| `buildUnreadableGlobalHome` | One home the process cannot read, for the deterministic root-admission rejection: admission tests `R_OK \| X_OK`, so such a root is refused and creates no Source. It reports whether the mode took effect; restore `0o700` before removing the tree. |

`CODEX_INSTRUCTION_CASES` is the eight read outcomes that branch distinguishes — absent,
empty, BOM-only, whitespace-only, non-empty, replacement-decoded, binary, unreadable — each
stating whether it advances to the next target and whether it ends the branch with a
Diagnostic and no fallback. The two targets take their cases independently, because that is
what proves the fallback applies only for an absent or safely-read empty override.

`LEXICAL_ROOT_CASES` is a fixture too, even though it writes nothing. The consent preview
assigns its state from the captured string alone, before any filesystem operation, so most
of these cases name no directory: a present-empty override, a NUL code unit, each half of a
surrogate pair on its own, a relative spelling, and the absolute spellings that stay
eligible whether or not they sit under the ordinary home.

Two of them cannot be driven through a real `process.env`. Measured on Node 24 / darwin,
assigning a value holding a NUL truncates it at the NUL, and a lone surrogate comes back as
U+FFFD, which is well formed — so the `invalid` state is unreachable from a POSIX
environment and is exercised against the classifier directly instead. Setting them on
`process.env` in a test would assert a value the platform never delivers.

## What a suite may rely on, and what it may not

- **No file-size or file-count validation exists.** A home with one instruction file and a
  home with a hundred are read the same way, and a large file is not rejected, truncated, or
  summarized. A suite must not assert a limit the product does not implement.
- **Availability is not a verdict.** That a candidate is missing, empty, binary, or
  unreadable is a read outcome with its own Diagnostic; it is never a validity claim, a lint
  result, or an assessment of the reader's configuration (FR-020, FR-028).
- **A failure not confined to one file propagates unchanged.** There is no error envelope
  and no cause classification: the failed request reports its real error, and no partial
  preview, consent, root, Source, or generation is created (contracts/http-api.md § Common
  results and errors). A suite asserts the real error, not a product-owned code.
- **Injected platform failures live in the suite, not here.** A `homedir()` that throws, or
  a filesystem module every export of which refuses, is installed with the test runner's own
  module mocking (`tests/unit/host/global-consent.test.ts`). There is no fixture-side
  injector, because a double has to be installed before the module under test imports the
  thing it doubles — which is the runner's job, not a tree's.
- **The preview performs no I/O at all.** No `stat`, `realpath`, enumeration, or read
  happens under a proposed Global root before consent, so a preview test needs no home on
  disk — and a preview test that builds one is asserting that the home stayed untouched.

## What a new case owes the home it joins

Add the near miss with the candidate. A candidate whose neighbours are not written proves
nothing about the selector that admitted it, and a neighbour written without being listed in
`nearMissPaths` cannot fail a suite when a future selector reaches it. Capability-gated
cases go through the same all-or-nothing materialization the repository fixtures use: either
every link exists and the builder describes them, or none does and it describes none.
