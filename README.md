# Agent Customization Inspector

[日本語](README.ja.md)

**Every AI agent customization in your repository, on one page — with the text, and the
diffs.**

What is your repository telling AI coding agents? Not a question you can answer by opening
one file. Claude Code, GitHub Copilot, and OpenAI Codex each look for instructions, skills,
MCP servers, hooks, and permission rules in paths of their own: `AGENTS.md` at the root, a
`.claude/settings.json` a teammate added, a `copilot-instructions.md` that arrived with the
repository, the same MCP server declared in three places. Some of it you wrote. Some of it
came with the project. None of it is in one place.

One command answers it:

```bash
npx agent-customization-inspector
```

A local page opens with the customization files the three tools look for in the current
directory — what each one is, which tool reads it, and exactly what it says.

## The answer looks like this

![The inventory: kinds down the left with their counts, and each row naming the file, the tools that read it, and how they resolve a name two files share](docs/images/inventory.png)

Eleven kinds — **instructions, skills, MCP, agents, prompts and commands, rules,
permissions, hooks, plugins, output styles, and settings** — with their counts down the
left, and the chosen kind's rows on the right. Most rows are one file: click one and you get
its complete text, with the fields it declares laid out beside it.

Listed is not loaded. Which file a tool actually applies depends on the version, the working
directory, trust, flags, and policy — runtime this tool does not watch. It answers what is
there and what it says, and ranks nothing.

## The questions that come next

**"Which instructions govern what?"** Instruction files are grouped by the scope they
apply to, so `packages/api/**` gathers the files that govern that directory and the root's
`**` gathers the ones that govern everything.

**"Do these two copies still say the same thing?"** The same skill in `.claude/skills/` and
`.agents/skills/`. A `CLAUDE.md` and an `AGENTS.md` that started out as one file. A row holding
two readable copies opens a side-by-side diff.

![A skill named changelog compared across two files: its declared metadata, its instructions, and its complete source, each as a side-by-side diff](docs/images/comparison.png)

**"Where does this MCP server come from?"** MCP, hooks, and plugins are counted by name rather
than by file: one server name, every file that declares it, and what each declaration says —
so you can see for yourself which ones disagree.

**"And my own setup, not the repository's?"** Four directories hold customizations that follow
you into every project: `~/.claude`, `~/.codex`, and `~/.copilot` — or wherever
`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `COPILOT_HOME` point instead — plus the shared
`~/.agents`. Click *Inspect your personal setup* and the page names the four it resolved
before reading any of them; `--inspect-personal-setup` is that confirmation given on the
command line, so it reads them before the page exists.

**"Can I just open the file?"** Open it here first, and the file's own page offers whichever
editors this machine has — VS Code, Sublime Text, a terminal editor — along with *Open with
the default application* and *Open the folder this file is in*.

## Options

| Option | What it does |
|---|---|
| `--root <path>` | Inspect this directory instead of the current one. |
| `--inspect-personal-setup` | Also inspect the four personal directories above. Passing it *is* your consent — the page won't ask again. |
| `--open` / `--no-open` | Open the browser automatically, or don't. On by default. |
| `--port <number>` | Prefer this port. If it is taken, a free one is used instead; `0` always picks a free one. |
| `--help`, `--version` | Print and exit, without starting a session. |

The URL is always printed first, so if no browser opens you can still click or paste it — and
it is where the port actually in use appears.

## Which files are listed

Every location it reads is [listed per tool and per kind](docs/which-files-are-listed.md),
for the repository and for your personal setup.

## When a file can't be read

The inventory stays complete and tells you what happened, per file:

- **Could not be read** — a permission problem, or a symbolic link pointing at nothing.
- **Not text this product can show** — the file is binary.
- **Could not be parsed** — the frontmatter or JSON is malformed, so the fields that would
  have been read from it are missing.

Other kinds of failure — an unreadable root directory, a rescan that fails — are reported as
themselves, and a failed rescan keeps the previous results on screen rather than emptying
the page.

## Requirements

Node.js `^24.11.0 || ^26.0.0`, and a current browser. That's all — there is no config file,
no account, and no daemon left running.

## This project is an experiment

It is my experiment in handing as much of a project as possible to AI coding agents. The
specification under `specs/`, the implementation, this README — the agents wrote all of it,
and my own part is direction and review. Which also means it is built with the tools it
inspects, out of the customization files it lists.

The second experiment is [Spec Kit](https://github.com/github/spec-kit): the documents under
`specs/` and the scaffolding under `.specify/` are its workflow, and what an agent picks up
to work on is a task in `specs/001-inspect-agent-customizations/tasks.md`.

## For contributors

The behavior above is specified in detail under
[`specs/001-inspect-agent-customizations/`](specs/001-inspect-agent-customizations/), and a
change here starts from the task list rather than from the code:
[`tasks.md`](specs/001-inspect-agent-customizations/tasks.md)
holds the numbered phases, [`.specify/memory/constitution.md`](.specify/memory/constitution.md)
governs how work is done, and [`AGENTS.md`](AGENTS.md) holds the working policy.

The Spec Kit skills are committed here — `.agents/skills/speckit-*` for Codex and Copilot,
`.claude/skills/speckit-*` for Claude Code — so cloning is the whole setup and there is no
`specify init` to run. A finished task is ticked in `tasks.md` and `tasks.ja.md` together, in
the change that finishes it.

### Where to start, by kind of change

Spec Kit's [Quick Start](https://github.github.com/spec-kit/quickstart.html) defines the
process, and is the reference for every command below. It offers a shorter path —
`specify` → `plan` → `tasks` → `implement` → `converge` — and a full one that adds
`clarify`, `checklist`, and `analyze` as quality gates. This repository is on the full path
and its step 1 is done: `.specify/memory/constitution.md` exists, so nothing here starts
from `constitution`.

The docs write the commands as `/speckit.*`. This repository installs them as skills, so the
form your agent exposes may be `/speckit-implement`, `$speckit-implement`, or
`/skill:speckit-implement` instead. The steps are identical either way.

**A new capability.** The full path from `specify`: state what and why, `clarify` what the
specification leaves open, `plan` the design, `checklist` it, `tasks` to break it down,
`analyze` to check the artifacts against each other, then `implement` and `converge` until
converge reports converged.

**A changed requirement.** `specify` when you already know what it should say; `clarify` when
the change is really an answer to something the specification left open — it asks targeted
questions and folds the answers into a dated session of `spec.md`'s `## Clarifications`.
Either way, re-enter the full path at `plan`: `plan.md` derives from the specification, so
tasks generated against the old plan carry the old design forward.

**A bug.** None of the above applies: the specification already says what should happen. Fix
the code, add the regression test, and run the gate that owns it. What does apply first is
[`AGENTS.md`](AGENTS.md) § Evidence before conclusions — trace the candidate defect through
the current code, the governing requirement, and the task that owns it before calling it one.

**Finishing what is already planned.** `implement` executes `tasks.md` in dependency order,
and it is worth scoping to one phase at a time here. `converge` then measures the codebase
against spec, plan, and tasks and appends whatever is missing back into `tasks.md`, so the
two alternate until converge reports converged. `implement` also reads the checkbox state
under [`checklists/`](specs/001-inspect-agent-customizations/checklists/) as a gate and asks
before proceeding when an item is unchecked.

**The way the project itself is run.** `.specify/memory/constitution.md` belongs to
`constitution`; day-to-day policy goes in [`AGENTS.md`](AGENTS.md), in both languages, in the
change that settles it.

Common to all of them: every document is written in both languages in the same change, and a
change a user receives adds a `.changeset/` entry. `.specify/feature.json` is what pins these
commands to `specs/001-inspect-agent-customizations` — they resolve the feature from that
file rather than from the checked-out branch.

### Building and checking

```bash
pnpm install
pnpm exec playwright install --with-deps chromium   # the e2e and performance suites drive it
pnpm run build           # nuxt build + tsdown → dist/
pnpm run start:fixture   # build a sample repository and serve it with the packaged CLI
```

`pnpm run start:fixture [name] [cli flags…]` writes a deterministic sample tree under
`.tmp/fixtures/` and launches the built CLI against it — the manual-verification loop. With
no name it serves `all`, which contains every kind at once; add `--inspect-personal-setup`
to see consented home directories beside it.

```bash
pnpm run lint && pnpm run typecheck && pnpm exec vitest run
pnpm exec playwright test --project=chromium
```
