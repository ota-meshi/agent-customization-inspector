// The reading order each kind's surfaces lead a file's declarations with
// (FR-007, contracts/http-api.md § get-file-detail). One module for every
// kind, because the lists answer one question — which declared keys a reader
// looks for first — and a per-kind file each would let one kind's answer drift
// from the others' while the surfaces that read them are written the same way.
//
// Each list lives here rather than inside a surface because two surfaces order
// the same declarations: a detail page renders one file's, and a comparison
// canonicalizes two files' into aligned documents. What each surface does past
// the leaders is its own: a detail keeps the file's authored order, because
// past these the file's order is the only one this product has any basis for;
// a comparison sorts, because there a line difference has to be a key
// difference.
//
// Every key in every list is one a vendor documents for that kind, and the
// comment above each list names the page and section it was taken from. A key
// no list names is not excluded but trailing — in the file's authored order on
// a detail, sorted in a comparison — so a vendor adding a field needs no change
// here before the field appears.

/**
 * The declared keys a skill is read for, in one reading order whatever order
 * a particular file wrote them in: which skill this is and what it is for,
 * when it is invoked and by whom, what it may use, where it runs, what limits
 * its activation, and what it is packaged with. A reader comparing two skills
 * should not have to find `allowed-tools` in a different place in each file.
 *
 * The list is Claude Code's own frontmatter reference: the field rows of its
 * "Extend Claude with skills" page § Frontmatter reference, complete and in
 * that table's own order, rather than an order composed here. That page can be
 * taken whole because it enumerates the complete documented field set and
 * every field the other products document is inside it: VS Code's `SKILL.md`
 * format names `argument-hint`, `user-invocable`, `disable-model-invocation`,
 * and `context`; GitHub's cloud skills page names `license` and
 * `allowed-tools`; and Codex documents `name` and `description` alone, putting
 * its optional metadata in a sibling `agents/openai.yaml` instead. Taking a
 * published order is what keeps this list checkable against a page rather than
 * against a preference. The comments on the entries below name what each run
 * of that table answers, and which other product documents the same field;
 * they describe the published order rather than impose one, so a table that
 * reorders is followed rather than regrouped.
 *
 * All three products' skills share this one list for the reason the agent
 * metadata does: a key the open file does not declare simply never appears,
 * and neighbouring entries are a reading order rather than a claim that two
 * products' keys mean the same thing.
 */
export const LEADING_SKILL_FRONTMATTER_KEYS: readonly string[] = [
  // Which skill this is, what it is for, and when to reach for it. Every
  // product's page names `name` and `description`; `when_to_use` is Claude
  // Code's, holding the trigger phrasing that would otherwise crowd the
  // description.
  'name',
  'description',
  'when_to_use',

  // What a reader types after the command. `argument-hint` is Claude Code's
  // and VS Code's alike, `arguments` Claude Code's names for the positions
  // that hint describes.
  'argument-hint',
  'arguments',

  // Who may invoke it — the model, the reader, or both. Claude Code and
  // VS Code document both switches.
  'disable-model-invocation',
  'user-invocable',

  // What it may use while it is active. `allowed-tools` is Claude Code's and
  // GitHub's alike — pre-approval, so the turn does not stop to ask —
  // `disallowed-tools` Claude Code's removal of a tool for the same stretch.
  'allowed-tools',
  'disallowed-tools',

  // Which model it runs, and how hard it thinks there, both Claude Code's and
  // both lasting only while the skill is active.
  'model',
  'effort',

  // Where it runs. `context` is Claude Code's and VS Code's alike, choosing
  // between this context and a forked one; `agent` and `background` are
  // Claude Code's, and only answer anything once that fork is chosen.
  'context',
  'agent',
  'background',

  // What runs around it: Claude Code's hooks, registered on invocation and
  // left running for the rest of the session.
  'hooks',

  // What its activation and its inline commands depend on outside the prompt,
  // both Claude Code's: `paths` limits automatic loading to the files being
  // worked on, `shell` picks the shell that `!` blocks run in.
  'paths',
  'shell',

  // What it is packaged with rather than what it does — none of it acted on
  // by the product that reads it. `metadata` is Claude Code's free-form map
  // for the author's own tooling; `license` and `compatibility` come from the
  // Agent Skills spec, `license` also named by GitHub's cloud skills page.
  'metadata',
  'license',
  'compatibility',
];

/**
 * The declared keys an instruction file is read for, in the order VS Code's
 * "Use custom instructions in VS Code" page § Instructions file format
 * publishes them.
 *
 * One product's table is the whole list here because it is the only one: a
 * repository `.github/copilot-instructions.md`, a `CLAUDE.md`, an `AGENTS.md`,
 * and a `GEMINI.md` are documented as Markdown with no frontmatter schema at
 * all, so `.instructions.md` is the one location of this kind whose header any
 * vendor specifies. A file of another location that writes frontmatter anyway
 * is published exactly as it wrote it, its keys trailing these three.
 *
 * `applyTo` is the field a reader of this kind looks for above all, because it
 * is what the file governs — the fact the inventory groups the row by. It sits
 * where that table puts it rather than being promoted here, for the reason the
 * skill list keeps its table's order.
 */
export const LEADING_INSTRUCTION_FRONTMATTER_KEYS: readonly string[] = [
  // What the file is called and what it is for. `name` defaults to the file
  // name when the file declares none, and `description` is what a reader sees
  // on hover in the Chat view.
  'name',
  'description',

  // What it governs: the glob, relative to the workspace root, that decides
  // which files the instructions apply to on their own. A file declaring none
  // is never applied automatically — the fact the inventory groups this kind's
  // rows by (data-model.md § Inventory unit).
  'applyTo',
];

/**
 * The declared keys an output style is read for, in the order Claude Code's
 * output-styles page § Frontmatter publishes them.
 *
 * One product's table, because one product documents this kind: the page
 * lists the four fields a style file supports and what each is for, and a
 * reader comparing two styles should not have to find `keep-coding-instructions`
 * in a different place in each. Every other key the file wrote keeps its
 * authored place after these.
 */
export const LEADING_OUTPUT_STYLE_FRONTMATTER_KEYS: readonly string[] = [
  // What the style is and how a picker shows it: `name` is the style name when
  // the file sets one — the row's identity otherwise falls back to the file
  // name — and `description` is the line the settings picker shows beside it.
  'name',
  'description',

  // What it does to the system prompt: whether Claude Code's built-in software
  // engineering instructions stay, and — for a style a plugin ships — whether
  // the style applies whenever the plugin is enabled, overriding the reader's
  // own selection.
  'keep-coding-instructions',
  'force-for-plugin',
];

/**
 * The declared keys a prompt file is read for, in the order VS Code's "Use
 * prompt files in VS Code" page § Prompt file format publishes them.
 *
 * One product's table again, and for the same reason: a Claude Code command
 * file and a Copilot CLI command file take their name from the path and have
 * no documented header, so the VS Code prompt file is the one location of this
 * kind whose frontmatter any vendor specifies.
 *
 * The list leads with `description` because that table does, not because this
 * product ranks it: a command file's `name` key is read by neither product
 * that loads one, so a list promoting `name` would suggest an identity half
 * this kind does not have. Which name a row is grouped under stays the
 * admitting rule's answer either way (data-model.md § Inventory unit).
 */
export const LEADING_PROMPT_FRONTMATTER_KEYS: readonly string[] = [
  // What the prompt is for, and what a reader types to reach it: `name` is the
  // name used after `/` in chat, falling back to the file name, and
  // `argument-hint` is the hint shown in the chat input beside it.
  'description',
  'name',
  'argument-hint',

  // What runs it: the agent the prompt runs under — `ask`, `agent`, `plan`, or
  // a custom agent's name — and the language model that agent uses. Both fall
  // back to what the session already has.
  'agent',
  'model',

  // What that run may reach: the tools and tool sets available to the prompt,
  // built-in ones and MCP ones alike.
  'tools',
];

/**
 * The declared keys an agent file is read for, in one reading order whatever
 * order a particular file wrote them in: which agent this is, what it is for,
 * which model and effort it runs at, what it may use, where it may run, and
 * what it carries between runs. A reader comparing two agents should not have
 * to find `model` in a different place in each file.
 *
 * Every key here is one a product documents for a custom agent, and the four
 * tables that document them are:
 *
 * - Claude Code's "Create custom subagents" page § Supported frontmatter
 *   fields;
 * - OpenAI Codex's "Subagents" page § Custom agents and § Custom agent file
 *   schema, whose required three are joined by the other supported
 *   `config.toml` keys that section permits a custom agent file to set;
 * - GitHub's "Custom agents configuration" page § YAML frontmatter properties;
 * - VS Code's "Custom agents in VS Code" page § Header (optional), the same
 *   agent profile format read from the editor side.
 *
 * The order itself is composed here rather than transcribed, which is the one
 * difference from the lists above: no page enumerates all three products'
 * agent fields, so there is no published order to take, and the grouping below
 * answers a reader's questions in turn instead. Each key stays checkable
 * against the table its group names it from.
 *
 * It is a list of leaders and not a catalog of the field sets: a key it omits
 * is not excluded but trailing, in the file's authored order on the detail and
 * sorted in the comparison. Claude Code's `maxTurns`, `background`,
 * `isolation`, `color`, and `initialPrompt` and VS Code's `agents` are
 * documented fields that land there today.
 *
 * Every vendor's spellings sit in this one list, because the metadata half is
 * one shape whichever product wrote the file (`rules/registry.ts`
 * § CompiledStaticAgentRule): a key the open file does not declare simply
 * never appears, and neighbouring entries are a reading order rather than a
 * claim that two vendors' keys mean the same thing.
 */
export const LEADING_AGENT_METADATA_KEYS: readonly string[] = [
  // Which agent this is. All four tables open with `name` and `description`;
  // `target` is GitHub's and VS Code's, naming the surface a profile is
  // written for.
  'name',
  'description',
  'target',

  // Which model it runs, and how hard it thinks there. `model` is in all four
  // tables, while the effort key is each product's own: Codex's
  // `model_reasoning_effort` is one of the `config.toml` keys its schema
  // section permits, Claude Code's `effort` a frontmatter field of its own.
  'model',
  'model_reasoning_effort',
  'effort',

  // What it may use. `tools` is Claude Code's, GitHub's, and VS Code's alike;
  // `disallowedTools` is Claude Code's, which VS Code repeats in its
  // § Claude agent format; `skills` is Claude Code's; `handoffs` is VS Code's,
  // which GitHub's table names only to record that its cloud agent ignores it.
  'tools',
  'disallowedTools',
  'skills',
  'handoffs',

  // How it is reached. `argument-hint` is VS Code's, ignored by GitHub's cloud
  // agent for the same reason `handoffs` is, and the two invocation switches
  // beside it are documented by GitHub and VS Code alike.
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',

  // Which MCP servers it may reach: three products spelling one declaration
  // three ways — `mcp_servers` Codex's, `mcpServers` Claude Code's,
  // `mcp-servers` GitHub's and VS Code's — kept adjacent so a file using any
  // of them shows it in the same place a reader looked for the others.
  'mcp_servers',
  'mcpServers',
  'mcp-servers',

  // Where it may run: `sandbox_mode` is Codex's, `permissionMode` Claude
  // Code's.
  'sandbox_mode',
  'permissionMode',

  // What it carries between runs and what runs around it. `memory` is Claude
  // Code's; `hooks` is Claude Code's and VS Code's (Preview) alike.
  'memory',
  'hooks',

  // Data a product carries for the author's own tooling instead of acting on:
  // GitHub's `metadata`.
  'metadata',
];

/**
 * The fields one MCP server declaration is read for, in reading order: the
 * server's kind, how it launches, where it connects, and what environment it
 * gets — the keys the vendors' carrier schemas commonly declare.
 *
 * Composed here rather than transcribed, like the agent list and for the same
 * reason: the four carrier schemas this product reads — Codex's
 * `[mcp_servers.*]` tables, Claude's `mcpServers` map, and Copilot's two
 * documented shapes — publish no common table to take an order from. What the
 * grouping answers is the order the questions arrive in for a reader looking
 * at one server.
 *
 * A declaration is JSON on both of its surfaces rather than YAML, so this list
 * is read by `declared-entries-json.ts` while the four above are read by
 * `frontmatter-yaml.ts`. Which serializer applies is the kind's; which keys
 * lead is this module's, so the two never drift apart per kind.
 */
export const LEADING_MCP_DECLARATION_KEYS: readonly string[] = [
  // Which kind of server it is, which decides what the rest of the
  // declaration means: a launched process reads the next group, a remote
  // endpoint the one after it.
  'type',

  // How it launches, for a server this machine starts: the executable, its
  // arguments, and the directory it starts in.
  'command',
  'args',
  'cwd',

  // Where it connects, for a server that is already running somewhere: the
  // endpoint and what each request carries to it.
  'url',
  'headers',

  // What environment it gets, either way — inline values and the file they may
  // be read from. A credential here is one declared value like any other,
  // shown exactly as authored and never resolved (FR-025, FR-026).
  'env',
  'envFile',
];
