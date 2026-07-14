# Repository Instructions

[日本語](AGENTS.ja.md)

## Documentation language policy

- Create and maintain both English and Japanese versions of every human-authored repository document.
- Add or update both language versions in the same change. A documentation task is not complete while either version is missing or outdated.
- Use the canonical `*.md` filename for English and the matching `*.ja.md` filename for Japanese. For names required by tools or community conventions, keep the required filename (for example, `AGENTS.md`) and add the Japanese companion beside it (for example, `AGENTS.ja.md`).
- Keep both versions semantically equivalent. They do not need to be word-for-word translations, but requirements, warnings, examples, links, and status information must agree.
- Preserve code, commands, paths, package names, API names, identifiers, and URLs unless localization is necessary for the example itself.
- When practical, link each language version to its counterpart near the top of the document.
- Before completing a documentation change, compare both versions for omissions, stale statements, and inconsistent technical details.
- This policy applies to new documents and to existing documents whenever they are modified. Generated files and vendored third-party documentation are excluded.

## Current implementation authorization

- Milestone M1 in `docs/plans/initial-product-design.md` was explicitly authorized and implemented on the `dev` branch on 2026-07-15.
- Keep implementation and review work within M1. Do not begin M2, M3, or M4 without a new explicit user approval, even after M1 is complete.
- M1 includes the development foundation, public contracts, separated source model, bounded discovery primitives, diagnostics, virtual-path safety, and test-only adapters and resolvers. It does not include real vendor adapters, redaction, diff generation, the CLI launcher, the HTTP server, or the Web UI.

## Approved product boundaries

- Build a read-only inspector and viewer. Do not execute inspected instructions, skills, commands, hooks, plugins, workflows, or extensions, and do not start or connect to MCP servers.
- Treat every inspected file, filename, path, metadata value, and configuration value as untrusted input.
- Repository is an isolated source that is always enabled. Global is a separate local-user source that is disabled by default and requires explicit opt-in.
- While Global is disabled, do not resolve, stat, list, or read user-home or tool-home candidates. Do not persist the Global preference.
- Keep Repository and Global roots, identities, revisions, catalogs, diagnostics, limits, and failures separate. Do not present a merged effective configuration.
- Inspect only within explicitly resolved roots, skip all symbolic links in the MVP, and prevent root escape.
- Bind every Global candidate to exactly one trusted built-in tool-home locator. Global bounded-directory candidates must start below the tool-home root; never probe the same candidate across unrelated tool homes.
- Do not expose absolute home paths, tool-home environment values, unredacted secrets, or source snippets in public diagnostics, IDs, logs, or normal serialization.
- Core contracts must remain vendor-neutral. Add tools through trusted built-in adapters, fixtures, metadata, and tests rather than fixed core conditionals or repository-supplied executable plugins.

## Approved technical defaults

- Use TypeScript, ESM-only modules, Node.js 22.12.0 or later, npm, and a single package rather than a monorepo.
- Use `gunshi` for CLI argument parsing and generated help when the CLI milestone is authorized. Do not use Commander.
- Keep filesystem and core logic independent from the future presentation layer. The planned UI is a local React and Vite Web UI with plain CSS and a thin CLI launcher.
- Use bounded, recoverable processing. A malformed or inaccessible artifact should produce a sanitized diagnostic without crashing the entire scan.
- Keep catalog responses summary-only and retrieve redacted detail on demand after source and revision checks. Raw unredacted text must not be retained in public snapshots or normal serialization.
- Use static, trusted adapter registration. The inspected repository cannot provide executable adapters or plugins.

## Required verification

- Before completing M1, run the available formatting, lint, typecheck, unit, contract, integration, coverage, build, and package checks.
- Test root containment, symlink skipping, all configured limits, recoverable filesystem and adapter failures, diagnostic sanitization, source separation, and zero Global resolver or fake-home filesystem calls when Global is disabled.
- Do not treat passing tests or coverage thresholds as a complete security guarantee; review boundary cases and unintended data exposure explicitly.
