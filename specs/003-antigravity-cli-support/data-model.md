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
like the three that exist. The Repository rules admit the root context pair, the two skill
shapes, the workspace rules directory, the standalone hooks carrier, the two custom-agent
shapes, and the MCP carrier; the two whose pages state backward support for the superseded
`.agent/` spelling carry a second selector for it. The Global rules admit the home's context
file, its MCP carrier, its standalone hooks carrier, its agents directory, its skills at both
documented global roots and in both shapes, and its settings carrier, the last under three
rules. The excluded groups name installed plugin
copies and their tracking manifest, the workspace plugin directory no terminal page documents,
and the credentials, session and history state, caches, and logs the parent already excludes.

## Compiled units

The skill kind gains a file-shaped compiled unit beside the directory-shaped one, and the two
form a closed union the recognizer discriminates. The file-shaped unit publishes the file's own
parse and no companion census; the directory-shaped unit is unchanged. Every other kind reuses
the compiled shape it already has: the Markdown instruction unit, the Markdown custom-agent
unit, the shared MCP server-map reading over a standalone strict-JSON carrier, the shared hook
event-map reading over both a standalone `hooks.json` and the settings carrier's inline
declarations, the permissions reading, and the settings carrier. A workspace rule needs no
specialized unit: `rule` is not among the kinds a vendor unit must answer for, so it compiles
through the vendor's own catalog entry like every other kind that publishes the file it names.

## Skill row and detail

A skill row stays one invocation name with one definition per file per recognizing product, so a
file-shaped and a directory-shaped skill sharing a name share a row. A file-shaped definition
carries no companion files, which the row already draws only where a skill has them.

The detail of a file-shaped skill shows the skill panel alone: no file panel, because that
panel's subject is the directory the skill does not have, and no tab strip, because a strip
offering one tab is not a choice. The heading stays the skill's own path, which is the one
identity every product reading it shares while the names they invoke it by differ. Dropping that panel
must not drop what it stated, so both of its facts move to the panel that remains: the file's
own text, under the `Source` viewer every single-file detail carries and on the condition they
use — readable, never parsed successfully — and the read outcome in full, the removed
byte-order mark included, which the attributes line above the panel then carries rather than
the short summary a page with a file panel shows there.

## Customization File and Tool Recognition

Unchanged in shape. One file may carry an Antigravity CLI recognition beside another product's,
which the root `GEMINI.md` and the root `AGENTS.md` both do.

## Parser format table

The formats this vendor needs are already read, and no parser is added: the shared JSON reader
takes the MCP carriers, the settings carrier, and the two standalone hook carriers, and the
shared frontmatter reading takes the
context files, the skills, and the custom agents. That JSON reader is every vendor's and is
unchanged; what moves is this vendor's own row in the format table, which records that the
cited pages document strict JSON and that any divergence between the vendor's reading and the
product's is recorded there as the others are.

## Version literals

`allowlistVersion` and `traversalPlanVersion` advance, because both the presentation allowlist
and the compiled traversal-plan set change.
