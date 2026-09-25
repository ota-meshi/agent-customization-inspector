# Data Model: Support Antigravity CLI

[日本語](data-model.ja.md)

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md) | **Date**: 2026-09-10

What this feature changes in the parent's model. Everything not named here is unchanged.

## SupportedTool

The closed union's fourth member becomes `antigravity`, and `SUPPORTED_TOOL_ORDER` reads
`copilot`, `claude`, `codex`, `antigravity`. `SUPPORTED_TOOL_TEXT` labels it `Antigravity CLI`,
the name the vendor's own documentation uses, with no company prefix, as `Claude Code` carries
none. The union keeps four members, so every exhaustive table over it keeps four rows and no
surface gains or loses a column.

## VendorSurface

The union's last member becomes `antigravity-cli`, labelled `CLI` in `VENDOR_SURFACE_TEXT`,
ordered last as its tool is ordered last. The table names the surface within its product and
`SUPPORTED_TOOL_TEXT` names the product, so a row reads "Antigravity CLI · CLI". It is the one
surface every Antigravity CLI behavior names: the vendor's editor and desktop surfaces are
outside this release (spec.md § Clarifications).

## GlobalMemberId and the member tuple

`GlobalMemberId = SupportedTool | 'agents'` widens by derivation, so the id becomes
`antigravity`. `GLOBAL_MEMBER_ORDER` stays five members and reads
`[copilot, claude, codex, antigravity, agents]`. `GLOBAL_MEMBER_TEXT` labels the fourth
`Antigravity home`: the table names a member by whose directory it is rather than by the
directory's own name, which is already what `~/.config/github-copilot` labelled `Copilot home`
does. Every "exactly five" statement in the parent model stays exactly five.

## GlobalRootInputCapture

The capture reads three environment properties, in the fixed order `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and calls `node:os.homedir()` once. The fourth member's root
is `node:path.join(capturedHomedir, '.gemini')` in every case, with origin `default-home`,
exactly as the shared agent home's root is `join(capturedHomedir, '.agents')`.

Two shapes follow from that. The table mapping a tool to its environment property keys only the
members an environment property locates, so it holds three rows rather than one per tool. And
its `settingNames: 'root' | 'parent'` field goes with the member that needed `parent`: the
remaining rows all name the root itself, and a field with one value is deleted rather than kept
(research.md § 4).

The closed Global Root Admission Outcomes table the parent fixes is unchanged. The fourth
member simply never takes an environment-sourced outcome, which is the state the shared agent
home is already in.

## Vendor registry records (Antigravity CLI)

One vendor module directory holds the tool's rules, behaviors, strategies, and relations, shaped
like the three that exist. The Repository rules admit the context pair at every depth, the skill
folder, the rules directory at every depth, the standalone hooks carrier, the two custom-agent
shapes, and the MCP carrier; the two whose pages state backward support for the superseded
`.agent/` spelling carry a second selector for it. The Global rules admit the home's four
context files, its two rules directories, its MCP carrier, its standalone hooks carrier, its
agents directory, its skill folders at both documented global roots, and its settings carrier,
the last under three rules. The excluded groups name installed plugin
copies and their tracking manifest, the workspace plugin directory no terminal page documents,
and the credentials, session and history state, caches, and logs the parent already excludes.

## Compiled units

The skill kind keeps the one folder-shaped compiled unit every vendor shares. The context files
take two instruction units, because the vendor states two ranges: a workspace file governs the
directory holding it — the directory holding its `.agents/` when it sits in one — and a global
file governs every project alike. Every other kind reuses the compiled shape it already has: the Markdown custom-agent
unit, the shared MCP server-map reading over a standalone strict-JSON carrier, the shared hook
event-map reading over both a standalone `hooks.json` and the settings carrier's inline
declarations, the permissions reading, and the settings carrier. A workspace rule needs no
specialized unit: `rule` is not among the kinds a vendor unit must answer for, so it compiles
through the vendor's own catalog entry like every other kind that publishes the file it names.

## Skill row and detail

A skill row stays one invocation name with one definition per file per recognizing product, and
a folder in `.agents/skills/` carries three of them. The detail is the folder detail every skill
has.

## Customization File and Tool Recognition

Unchanged in shape. One file may carry an Antigravity CLI recognition beside another product's,
which the root `GEMINI.md` and every `AGENTS.md` do.

## Parser format table

The formats this vendor needs are already read, and no parser is added: the shared JSON reader
takes the MCP carriers, the settings carrier, and the two standalone hook carriers, and the
shared frontmatter reading takes the skills and the custom agents. The context files and the
rule files go through no parser. The Rules page says `AGENTS.md` and `GEMINI.md` use no
frontmatter and treats their entire content as plain Markdown, so a `---` block opening one is a
line of its instructions; a rule file is published as the one document its author wrote, its
`trigger` block included. Nothing is read out of either, so neither can fail to be read (the
parent's data model § ToolRecognition and its vendor contract's presentation allowlist). That
JSON reader is every vendor's and is unchanged; what moves is this vendor's own row in the format table, which records that the
cited pages document strict JSON and that any divergence between the vendor's reading and the
product's is recorded there as the others are.

## Version literals

`allowlistVersion` and `traversalPlanVersion` advance, because both the presentation allowlist
and the compiled traversal-plan set change.
