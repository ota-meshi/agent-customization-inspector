# Contract: Local Session Transport

[日本語](http-api.ja.md)

**API version**: 1
**Transport**: devframe 0.7.5 standalone host, bound to `localhost` (loopback only),
authentication disabled (`auth: false`)
**RPC namespace**: every session function is registered under the
`agent-customization-inspector:` name prefix

This contract connects the static Nuxt SPA to the same-process Node inspection host
through the devframe local-tool framework, the same foundation eslint/config-inspector
uses. The `http-api` filename is kept stable so cross-references resolve; what it defines
is the complete local session transport. It is not a public network API. The
session channel accepts opaque IDs, committed Source-relative Paths, and closed commands
only — a Source-relative Path is a published identity resolved against the committed
snapshot, never a filesystem operand — and no function accepts a raw or absolute
filesystem path, URL, command, source text, parser option, glob, or executable content.

FR-022 authorizes exactly two closed internal-loopback classes at the issued `localhost`
authority:

1. **Packaged UI serving** — unauthenticated `GET`/`HEAD` for the packaged UI assets: the
   built Nuxt SPA output served by devframe from `cli.distDir` (`dist/public`) at `/`,
   including the SPA shell, its client-route fallback, and devframe's own
   connection-discovery metadata. Served static content contains no session data.
2. **Local session RPC channel** — the devframe RPC channel (WebSocket upgrade plus
   devframe's own message frames at the same loopback authority) carrying the functions
   declared below. The frame encoding belongs to devframe: this adapter carries every
   message as structured-clone text, and the product declares no per-function wire
   format.

Neither class is an outbound request or MCP connection. Any non-loopback or remote
authority, customization-selected destination, or transmission of inspected content to
another machine remains prohibited.

## Host requirements

1. The process binds a devframe-selected local port on the loopback interface only, via
   the fixed host name `localhost` (which the platform resolver yields as IPv4
   `127.0.0.1` or IPv6 `::1`). A launch may state a preferred port with `--port <number>`
   (FR-001), and devframe resolves it: a free port is kept, an occupied one moves to
   another, and 0 asks for a free port to be selected automatically. Which port is bound
   therefore stays devframe's decision whether or not a preference was stated. There is
   no host override: no configuration or flag binds `0.0.0.0`, a LAN address, or a Unix
   socket.
   Every inspected-source filesystem operation is issued by the inspection module
   (`src/server/inspection/`); no other production module imports a Node.js filesystem
   API, and there is no separate admission service in front of it. Node.js compatibility is declared
   once through `engines.node` and enforced by the package manager, and package/asset
   integrity is enforced by package tests and release gates; the host performs no runtime
   re-verification of its own packaged artifacts (Constitution Principle I).
2. The session host runs unauthenticated behind the loopback binding. The product adds
   no per-session token or capability, no bearer header, no origin or fetch-metadata
   classification of its own, and no CORS emission; devframe authentication is disabled
   (`auth: false`), matching config-inspector. Loopback binding is the complete host-side
   protection (QR-003, Constitution § Quality and Safety Standards). The residual limitation is documented: other
   local processes and, via DNS rebinding, a malicious web page can reach the session
   while the inspector runs. devframe applies its own origin gate to the WebSocket
   upgrade — the reason no product-owned check stands beside it — but that gate admits
   any hostname its loopback test matches, so it does not narrow this limitation
   (research.md § 8). Served content may include the user's own secrets, so the
   host is never exposed beyond the initiating machine.
3. Static byte serving is devframe-owned. The served SPA shell and assets are exactly what
   the Nuxt build emitted into the packaged `dist/public`; the product defines no
   static-assets manifest, no per-asset integrity re-verification, and no hand-written
   router. The one product-owned piece in front of it is the closed detail-route
   rewrite — `/skills/**`, `/instructions/**`, `/mcp/**`, `/hooks/**`,
   `/rules/**`, `/prompts-and-commands/**`, `/permissions/**`, `/agents/**`,
   `/plugins/**`, `/output-styles/**`, and `/settings-and-configuration/**`, one
   family per shipped kind detail: a `GET`/`HEAD` whose path enters one of these route families is
   rewritten to `/` and falls
   through, so devframe's own static handler serves the packaged shell for detail deep
   links its extension-guarded SPA fallback would treat as file misses. The rewrite
   touches no filesystem and shadows nothing — no packaged asset lives under any of the
   families (§ Required contract tests, item 5). Nuxt uses `app.baseURL: '/'` and no CDN URL, so
   the shell works unchanged on every client route. Static serving never reaches outside
   the packaged UI output directory and never falls back to an inspected file.
4. At startup the host prints the exact `http://localhost:<port>/` URL once to the
   initiating terminal. Automatic browser opening is product-owned through the startup
   opener and best-effort under
   FR-001: the opener runs only after the launch line, devframe's bundled opener stays
   disabled so only the product's opener runs, on macOS a session tab a running
   Chromium-family browser already has is focused before the `open` package's helper
   spawns a new one (research.md § 3), `--no-open` silently suppresses opening, and
   an unsupported or failed opener
   does not block startup; the printed URL remains the fallback. The product reports no
   browser-opening outcome: opening is best-effort and the printed URL is the complete
   fallback, so an opener failure is swallowed rather than surfaced. No spawned process
   receives inspection-derived content or path (FR-022). A reload or direct navigation
   of any client route needs no token: the served shell embeds no session data, and the
   freshly loaded SPA adopts state only through the RPC channel.
5. Beyond fixed help/version text and the required one-time initiating-terminal launch
   line, the host defines no telemetry or operational-event stream; FR-022 already
   prohibits transmitting anything off the
   initiating machine. Terminal and UI output are read by the same user who owns the
   inspected files, so failures are reported ordinarily: the real error message is
   printed or returned without a product-defined content filter.
6. Every function reads only its declared parameters, and each function's section
   documents them with the rejection a mismatch produces. A declared parameter is
   validated by resolution, never by a shape guard in front of it: every detail
   parameter is a published identity resolved against the committed generations and
   never a filesystem operand — the Source-and-path pair `get-file-detail`,
   `get-mcp-carrier-detail`, `get-hook-carrier-detail`, and
   `get-permission-policy-detail` each take; that pair plus the closed open target
   `open-file` takes; the Source, path, recognizing tool, and plugin-name
   parameters `get-plugin-carrier-detail` takes, whose answer is one
   inventory row's; and the carrier's Source-and-path pair plus the recognizing
   tool, the row's plugin name — null for the no-name row — and the shipped
   file's own Source-relative Path `get-plugin-file-detail` takes — and any value whose resource the invoked function does not hold, a
   value of another type included, resolves nowhere and is the `stale-resource`
   rejection; the Global functions' preview, allowlist-version,
   and consent parameters carry their own documented codes the same way. No generic
   malformed-argument vocabulary exists, because rejecting a shape the resolution already
   cannot match — or an extra positional argument the function never reads — is a runtime
   guard with no protective failure mode. A function declared with `Parameters: none`
   reads no input, so it has nothing to validate at its boundary. Every declared result and rejection is one
   complete JSON-serializable value — plain objects, arrays, strings, numbers, and
   booleans, with no `Map`, `Set`, `Date`, or class instance. Transport capacity is inherited from Node.js,
   devframe, and the execution environment rather than a product-defined request-size
   ceiling.

## RPC function catalog

| Function | Kind | Purpose |
|---|---|---|
| `agent-customization-inspector:get-session` | read | Full `SessionSnapshot` snapshot, or the control-only `GlobalFenceRecoverySnapshot` while fenced |
| `agent-customization-inspector:get-file-detail` | read | One active-generation `FileDetail` |
| `agent-customization-inspector:get-mcp-carrier-detail` | read | One active-generation `McpCarrierDetail`: one MCP-declaring file's declarations and file facts, never its source |
| `agent-customization-inspector:get-hook-carrier-detail` | read | One active-generation `HookCarrierDetail`: one hook-declaring file's lifecycle events and file facts, never its source; the two documented carrier forms are one discriminated result |
| `agent-customization-inspector:get-plugin-carrier-detail` | read | One active-generation `PluginCarrierDetail` for one inventory row: the complete source when the carrier is a manifest and, when the carrier is a catalog, the requested entry's declarations, never the catalog's own bytes |
| `agent-customization-inspector:get-plugin-file-detail` | read | One file a plugin ships, read as that plugin's: the complete authored source and the file's own diagnostics, for a path the requesting carrier's offering of that row's name reached |
| `agent-customization-inspector:get-permission-policy-detail` | read | One active-generation `PermissionPolicyDetail`: one declared permission policy, whole document or declared block |
| `agent-customization-inspector:rescan-repository` | command | Accept one explicit Repository scan command |
| `agent-customization-inspector:open-file` | command | Open one committed file in an application on the reader's own machine |
| `agent-customization-inspector:get-global-consent-preview` | read | Current or frozen `GlobalConsentPreview` |
| `agent-customization-inspector:create-global-consent-preview` | command | Capture and atomically create or replace the unconsented preview |
| `agent-customization-inspector:enable-global` | command | Confirm the session-wide consent; initial enable and active-consent retry |
| `agent-customization-inspector:rescan-global` | command | Accept one scan command for one enabled Global Source |
| `agent-customization-inspector:disable-global` | command | The priority Global-disable barrier |

Comparison views are constructed client-side from the ordinary detail functions, one
request per document a side shows, and there is no separate comparison function. The file
comparisons take at most two `get-file-detail` results — one per present side, and a
one-sided comparison's stated absent counterpart needs none — the MCP declaration
comparison two `get-mcp-carrier-detail` results, and the plugin comparison two
`get-plugin-carrier-detail` results plus a `get-plugin-file-detail` for each further
document its panels show: the two plugins' own manifests, and the copies of the file the
reader has selected. One request per document, never per panel: a document two sides resolve to, and
one a carrier's own response already served, are not asked for again — the second in
either pair order, so which side holds a document decides nothing. A view holds what its
panels are showing, so stepping between them shows what is already in hand rather than
re-reading it; every held document leaves with the view under the same generation and purge
rules as any other. There is also no masking, redaction, reveal, or
environment-resolution function anywhere in the catalog, and the host does not enable
devframe's optional MCP route.

The same channel also carries devframe's own built-ins, registered unconditionally by
the framework rather than by this catalog: `devframe:agent:list-tools` /
`invoke-tool` / `list-resources` / `read-resource` (empty — the product registers no
agent tools or resources), `devframe:rpc:server-state:subscribe` / `get` / `set` /
`patch` (unused — the product shares no server state), and `devframe:streaming:*`
(unused — the product declares no streaming channel). The editor and finder helpers
(`devframe:open-in-editor`, `devframe:open-in-finder`) are opt-in recipes this product
does not import, so they are not registered: each opens whatever path its caller sends,
while § open-file resolves the path against the committed generations first, so the only
absolute path a launch can receive is one this session published (FR-022).

## Common results and errors

Successful inspection-data results:

```json
{
  "globalContentEpoch": 4,
  "repositoryGeneration": 3,
  "globalGeneration": 1,
  "data": {}
}
```

Every normal inspection-data success result carries `globalContentEpoch`,
`repositoryGeneration`, and `globalGeneration` (null while no Global sequence exists).
Repository and Global inspection keep independent generation sequences because their
lifecycles are independent (FR-030): the Repository sequence starts at bootstrap
generation 0, while a Global sequence is created at generation 1 by the enable commit and
discarded by disable, which commits nothing. For a full `SessionSnapshot`, the
result-level values equal `data.repositoryGeneration` and `data.globalGeneration`; for a
`FileDetail`, every returned generation-owned ID belongs to the exact committed generation
of the file's owning sequence. The server captures the epoch and both generations,
constructs the complete payload, and then revalidates under the session coordinator lock
that the epoch is unchanged and `globalDisableInProgress` is still null before binding the
immutable success result. A failed revalidation discards that result and returns the
`global-disable-pending` conflict rejection. The server may deliver an already-bound
result after releasing the lock; it never reads one generation, constructs data outside
that generation, and later relabels the result. A result fully bound before disable
acceptance remains a bounded pre-fence-authorized response; the browser rejects or purges
it after observing the greater epoch or fence.

The normal result shape does not apply to the exact control-only
`GlobalFenceRecoverySnapshot`, which contains no generation or inspection graph.

A preview or command success that returns no inspection graph uses
`{ globalContentEpoch, data }` and omits the result-level generation fields;
any generation carried inside its documented result is an explicit command outcome. This keeps
control results epoch-aware without presenting them as generation snapshots.

The API defines no product-specific numeric limit for parameters, files, item counts,
parser structures, snapshots, details, or results. Capacity is inherited from Node.js,
the parser, the operating system, the filesystem, the browser, and the execution
environment. Response serialization is owned by the devframe channel: the handler returns
its declared result value, and a serialization/encoding or delivery failure after the
handler returns is reported as that request's ordinary error without rolling back or
duplicating any state the handler committed — no
successful result is reported, a partially delivered message is never a partial result,
and the client refetches the committed generation, exactly as for a transport failure. No domain layer classifies the failure's cause.

Deterministic rejections:

```json
{
  "error": {
    "code": "stale-resource"
  }
}
```

Every function's outcome is one of its declared closed result or rejection variants, or
the ordinary error of an unexpected failure. Those variants carry the HTTP status
semantics: queued command acceptance is the documented acceptance result, and each
`4xx` conflict or validation failure is a named deterministic rejection with the same
`code` (for example `stale-resource`, `scan-in-progress`, `global-enable-in-progress`,
`global-disable-pending`, `consent-preview-frozen`, `consent-preview-missing`,
`consent-required`, `allowlist-version-mismatch`, `consent-preview-mismatch`,
`no-retryable-global-tool`). These deterministic variants are declared functional
outcomes with fixed codes, not sanitization.

An unexpected thrown or rejected handler failure is not wrapped in a product envelope: it
crosses the devframe channel as an ordinary serialized RPC error (devframe/birpc
behavior), and the client shows the real error message. A failure before asynchronous job
acceptance rejects only that invocation; no job or `scanRequestId` is created and nothing
is retained in the session. For an accepted scan job, the invocation has already resolved
with its queued acceptance, so the terminal failure is retained where the data model
defines it: an explicit-rescan failure in the affected Source's `staleFailures` entry as
`{ kind: 'error', message }`, and an accepted admitted-subset Global batch failure in the
failed `batchStatus`. The two-stage Global-disable barrier is the sole exception: a
post-acceptance failure rejects that still-pending disable invocation with the real error
and also retains the same message for the fenced session as the failed disable
projection's `globalDisableInProgress.message`, present only while its `state` is `failed`
(FR-042). A failed request leaves the session usable and does not terminate the process;
the prior committed snapshot stays readable under its retained IDs. An automatic startup
throw/rejection has no RPC owner, reaches the process top level, and may terminate the
process.

## RPC functions

### `agent-customization-inspector:get-session`

Parameters: none.

Returns the current session snapshot and scan progress. The client invokes this function
on initial adoption and when source state changes; there is no separate liveness probe and
no page-lifecycle refetch (see § Concurrency and lifecycle). The
product defines no timer, filesystem watcher, or server-initiated push of inspection data;
the devframe channel is used request/response only for the declared functions.

Result data:

```text
SessionSnapshot
├── fileOpenTargets[] — the applications this host can hand a committed file
│   to, in the order a detail surface offers them and with the one a plain
│   click uses first: each editor the host resolved on this machine, then
│   `default-application` and `containing-folder`, each a hand-off to the
│   platform's own handler launchers (see § open-file)
├── sessionId, createdAt, repositoryGeneration, globalGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state, message? },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef } },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, member, enabled, status, generation, scanRequestId, diagnosticIds[]
│   ├── boundary { displayRoot, origin }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── sourceId, sourceRelativePath, diagnostic IDs, and encoding as the variant
│       discriminator — readable text adds sizeBytes and hadLeadingBom;
│       binary adds only sizeBytes; unknown adds nothing. A file publishes its own facts
│       only; what it was recognized as belongs to a per-kind inventory below
├── instructions[]
│   └── sourceId, applicabilityRange string | null,
│       files[] { sourceRelativePath, recognitions[] { tool, surfaces[] } } —
│       one row per Source and applicability range — the Source is the row's
│       other identity half (FR-030) — each file it governs with that file's
│       recognitions in the closed tool order, and each recognition's product
│       surfaces in the closed surface order; the one null row closes the
│       list with the files whose range is not known
├── skills[]
│   └── name string,
│       definitions[] { sourceId, sourceRelativePath, tool, surfaces[],
│                       parseStatus, diagnosticIds[], companionFiles[] } —
│       each definition names its file by Source and Source-relative Path
│       (FR-030): a member's skill rule lets two Sources hold one
│       `skills/<name>/SKILL.md` path, so the path alone names no file.
│       Definitions are in the published Source order, then path, then the
│       closed tool order, and a definition's census paths are paths of its
│       own Source,
│       sameNameResolutions[] { tool, resolution } — one per tool facing a collision
├── mcp[]
│   └── name string | null,
│       declarations[] { sourceId, sourceRelativePath, tool, surfaces[], parseStatus,
│       diagnosticIds[] } —
│       one row per declared server name with each declaration resolving it —
│       each naming its carrier by Source and Source-relative Path (FR-030),
│       in the published Source order, then carrier path, then the closed tool
│       order — each carrying the vendor surfaces its
│       admissions rest on, exactly as an instruction file's recognitions do;
│       the one null row closes the list with the readings publishing no named
│       declaration. A reading that could not be read is there whatever another
│       reading of the same file found: its servers are unknown rather than
│       absent, and one carrier is read once per product — a root `.mcp.json` is
│       JSONC to Copilot's editor host and strict JSON to Claude Code. A reading
│       that parsed and declares none is there only while no reading of its file
│       publishes a name, because the two vendors' schemas differing over one
│       carrier — the bare map one accepts and the wrapper the other requires —
│       is not a finding about the file
├── agents[]
│   └── name string | null,
│       definitions[] { sourceId, sourceRelativePath, tool, surfaces[],
│                       parseStatus, diagnosticIds[] } —
│       one row per agent name, in name order, each listing every file that
│       defines it — each named by Source and Source-relative Path (FR-030) —
│       in the published Source order, then path, then tool order. The name is the
│       one the admitting product identifies the agent by, and which fact
│       that is differs by product: OpenAI Codex and Claude Code make the
│       `name` field the agent's identity and a matching filename a
│       convention — Claude Code adds that a subfolder inside the agents
│       directory does not affect it either — while GitHub Copilot documents
│       `name` as an optional display name and identifies a profile by its
│       configuration file's own name minus `.md` or `.agent.md`. So two
│       files resolving to one name are two definitions of one row, and one
│       file two products resolve differently defines on two rows. A row
│       states no same-name resolution, unlike a skill's: Claude Code
│       documents that only one of two same-name files under one tree loads
│       and names no rule for which, and GitHub documents deduplication
│       between levels rather than within one, so a row that answered would
│       answer a question no page asks — the definitions stand side by side
│       and the reader sees both (FR-009). The one null row closes the list
│       with the files publishing no name — under a declared-`name` product,
│       one declaring none, one declaring anything but a scalar, and one
│       whose declarations could not be read at all, whose name is unknown
│       rather than absent; a file-name product's definition never reaches it
├── prompts[]
│   └── name string,
│       definitions[] { sourceId, sourceRelativePath, tool, surfaces[],
│       diagnosticIds[] } —
│       one row per name a reader invokes, in name order, each listing every
│       file a recognizing tool invokes it by — each naming its file by Source
│       and Source-relative Path (FR-030) — in the published Source order,
│       then path, then tool order. Which name that is belongs to the rule that admitted the file.
│       A command file's is never authored: both products ignore a `name` key
│       in one, and each derives the command from the path — so a root direct
│       child, where the two derivations agree, is one row naming both, and a
│       nested one is a row of Claude's alone. A VS Code prompt file's is the
│       `name` it declares, falling back to its own file name — so a prompt
│       declaring the name a command resolves to is a definition on that
│       command's row
├── rules[]
│   └── sourceId, sourceRelativePath, recognitions[] { tool, surfaces[] } —
│       one row per recognized rule file, named by its Source and its own
│       path — the file's identity (FR-030) — in the published Source order
│       then path, with each recognition in the closed tool order and each
│       recognition's product surfaces in the closed surface order
├── permissions[]
│   └── sourceId, sourceRelativePath, recognitions[] { tool, surfaces[] },
│       diagnosticIds[] —
│       one row per declared permission policy, named by the Source and path
│       of the file that declares it (FR-030), in the published Source order
│       then path; a carrier declaring none is recognized as whatever owns
│       the rest of it, and is no row here
├── hooks[]
│   └── event string | null,
│       declarations[] { sourceId, sourceRelativePath, tool, carrier,
│       surfaces[], parseStatus, diagnosticIds[] } —
│       one row per declared lifecycle event with each declaration declaring
│       it — each naming its carrier by Source and Source-relative Path
│       (FR-030) — in the published Source order, then carrier path, then tool
│       order, exactly as an MCP row groups its
│       declarations. `carrier` is the documented form the declaration was
│       authored in — `standalone` for a file whose whole purpose is hooks,
│       `contained` for a hook table inside a file admitted for other content
│       too — because one config layer can hold both forms and the vendor
│       loads both rather than choosing, so a row can list two declarations of
│       one event from two files of one layer. The one null row closes the
│       list with the carriers whose emptiness is a finding: one whose hook
│       block could not be read, whose events are unknown rather than absent,
│       and one whose whole purpose is hooks and that declares none, which each
│       declaration's own `parseStatus` tells apart. A carrier that merely may
│       contain a hook table and does not is on no row at all
├── plugins[]
│   └── name string or null,
│       carriers[] { sourceId, sourceRelativePath, tool, surfaces[], carrier,
│       parseStatus,
│       diagnosticIds[], files[] } — one row per plugin name, in name order,
│       each listing
│       every carrier that resolves it — each named by Source and
│       Source-relative Path (FR-030), its `files[]` paths of that same
│       Source — in the published Source order, then path, then tool order;
│       the one null-named row closes the list with the carriers that resolve no
│       name at all. Which name a carrier resolves belongs to the rule that
│       admitted it, exactly as a command's does: Codex addresses a catalog's
│       offering as `plugin@marketplace`, so one name two catalogs offer is two
│       rows. `carrier` is `manifest` or `catalog`: the manifest a product
│       loads a plugin by placement from, or the catalog whose entry offers it. A catalog is never a
│       row of its own — it resolves plugin names to the sources they come from,
│       which makes it a carrier. A carrier's `files[]` are the files its own
│       offering of this row's name reaches, sorted: the plugin root that
│       offering names, enumerated in full, the plugin's own manifest among
│       them — the manifest that is itself this row's carrier included, since
│       the folder holding it is the plugin. A file there that a rule
│       admitted on its own account is listed too and keeps its own row,
│       which is where its declarations and diagnostics are. The plugin's
│       whole file list is its carriers' lists together, derived where it is
│       shown: two carriers of one name can name two directories, so the row
│       publishes no second spelling of them. The row states no installation, enablement, trust, or cached copy
├── outputStyles[]
│   └── name string,
│       definitions[] { sourceId, sourceRelativePath, tool, surfaces[],
│       diagnosticIds[] } —
│       one row per style name a reader selects, in name order, each listing
│       every file a recognizing tool selects under it — each naming its file
│       by Source and Source-relative Path (FR-030) — in the published Source
│       order, then path, then tool order. Which name that is belongs to the rule that admitted
│       the file: Claude Code takes the frontmatter `name`, falling back to the
│       file name without its `.md` extension, and an authored empty name falls
│       back the same way. Never empty. A row states no same-name resolution:
│       the page resolves two project layers defining one name by proximity to
│       a session working directory this product never observes
├── settings[]
│   └── sourceId, sourceRelativePath, recognitions[] { tool, surfaces[] } —
│       one row per recognized settings or configuration file, named by its
│       Source and its own path — the file's identity (FR-030), so a consented
│       home's `settings.json` and a same-path document elsewhere are two
│       rows, in the published Source order then path — because this kind's
│       unit is the file; a file that also
│       carries declarations another kind owns — Codex's `.codex/config.toml`
│       — is a row here and on that kind's list too. No diagnostic list, for
│       the reason `rules[]` has none: nothing is read out of the document
└── diagnostics[] { diagnosticId, code, sourceId string,
    sourceRelativePath string | null — null except file scope }
    (active-generation records plus session-owned lifecycle records)
```

An inventory row's unit is decided by the kind, not by the file. A skill is one
invocation name as one tool resolves it (data-model.md § Inventory unit): the name that
tool's own documentation invokes the file by, resolved by the admitting rule. Codex and
Copilot invoke the authored frontmatter `name` — or the skill directory name when the
file declares none, declares it empty, or its extraction failed, the directory being the
path's own fact rather than something a failed parse could be read for (FR-028) — while
Claude Code's command name is the skill directory whatever the frontmatter declares,
prefixed root-relative for a nested skill, so `apps/web/.claude/skills/deploy/SKILL.md`
declaring `name: ship` is `apps/web:deploy` on its Claude Code row and `ship` on its
Copilot one. `name` is never null or empty. A definition is one
tool's recognition of one file — the ToolRecognition unit, one per `(file, tool)`, named
by `definitions[].tool` — so several `SKILL.md` files one tool invokes by one name
publish one entry listing each recognition as a definition — two files that declare no
name and sit in same-named skill directories among them — a file two tools invoke by one
name is two definitions of that entry, and a file whose tools invoke it by different
names defines on each name's entry. A definition publishes no name of its own: the row's
is the name, and a second copy on the definition would be a fact and something derived
from it. A definition carries its own recognition's `parseStatus` and
extraction-failure `diagnosticIds`: one extraction per kind means one failure record
(FR-028), which every failed definition of the file references and the file's `files[]`
entry lists once. The detail is headed by the row name of the definition its route
addresses (data-model.md § Skill presentation); the name comes
from the one rule that resolves it at recognition time, so vendor naming cannot drift
between server and client. An
MCP row is one declared server name, listing every `[mcp_servers.*]`-style declaration
that resolves it — one per `(carrier, tool)` — so one admitted `.codex/config.toml`
contributes one declaration per server it declares and a second carrier declaring the
same name joins that name's row. A declaration's home is an explicit carrier — the
Codex configuration layer, the Claude root `.mcp.json`, the Copilot CLI's root
`.mcp.json` and `.github/mcp.json`, the VS Code `.vscode/mcp.json` — and nothing else:
a file of any other kind that spells MCP-looking configuration in its own content — a
skill's or an agent's frontmatter, a settings file's inline map — is that kind's
ordinary content, visible in its own detail, and joins no MCP row. Each declaration
names its
own file, and one physical file two products admit — the root `.mcp.json` — is one
declaration per recognizing tool under each name it declares. The one row whose name is null closes the list with
the carriers currently publishing no named declaration, whether their declaration
block could not be read or declares none, which each declaration's own `parseStatus`
tells apart (FR-028). An instructions row is one applicability range — the glob the
governing files' own paths derive, `**` at the Repository root, or the one a file declares
for itself — listing each file it governs, so the root `AGENTS.md` and `CLAUDE.md` share one
row and a `packages/api/CLAUDE.md`
has its own (data-model.md § Inventory unit). The one row whose range is null closes the
list: its files' vendor reads that filename's applicability from the declaration alone,
and their declarations supply none a row can be keyed by — or could not be read at
all, which each file's own diagnostics state, so the row states that no range is known
rather than that none is declared (FR-028). A listed file names its recognitions rather
than its tools, because a tool alone cannot say where a product reads the file from: GitHub
Copilot's editor, CLI, and cloud surfaces document different lookup bases for the same
filenames, so a root `.github/copilot-instructions.md` is read by all three while the same
filename in a subdirectory is a CLI context alone. Each recognition's `surfaces` are the
surfaces of the documented behaviors its admitting rules rest on, and naming one is never
a claim that the surface loaded the file (FR-009). A skill definition states them too, and
for the same reason: a definition is one recognition under a name, and FR-009 states the
surfaces beside every recognition however many the product has. A rules row is one rule file, and a permissions row one declared permission policy named by
the path of the file that declares it: neither
declares a name a row could be keyed by nor governs a range it could be grouped under, so a
Source-relative Path is the row's identity, and a file two products recognize is one row
with two recognitions, named the same way an instruction file's are (data-model.md
§ Inventory unit). They are two kinds because the subject differs — a permission policy
decides which commands or tools a product may run, where a rule is guidance the product
reads — and both vendors happen to call their directory `rules`, so grouping by that shared
word would put two unrelated subjects in one list. A permissions row exists exactly where a
policy is declared: a file whose whole content is the policy is one row, a file carrying the
policy in one block of a larger document is one row, and a carrier declaring no such block is
neither — the rest of that document belongs to the recognition that owns it, and a row would
state a policy its author never wrote. A permissions row is the one kind's row that carries
`diagnosticIds[]`, and the exception is what the kind reads: a declared block is read out of a
document its parser can reject, so the extraction's own record — one per file, since the block is
read once — is what tells a reader why a row they can see publishes nothing. Every other kind's
row repeats no file fact, because no other kind's row has one of its own to state. A row is never a
claim that a product
loaded or enforced the file: whether a rule is in context, or a permission rule in force,
depends on runtime this tool never observes (FR-009). Every other kind's unit is settled by the task that ships its inventory,
from that kind's own vendor contract. A physical file therefore appears once in `files[]` with its own facts —
path, read outcome, size, diagnostics — and each kind's inventory refers to it by
`sourceRelativePath` and repeats none of them; a definition's recognition-owned parse
facts are the one deliberate exception, because the definition is that recognition.

`files[]` also carries the files accompanying a directory-shaped customization: a skill is
read whole, so the scripts, references, and assets inside its own directory are published
like any other file (contracts/inspection-path-allowlist.md § Bounded companion census).
The census itself admits nothing, so a file it alone lists belongs to no kind's
inventory; a path a rule independently admits — a nested `SKILL.md` inside another
skill's directory — is a candidate with its own recognitions and rows even while an
outer census lists it. The owning skill's `definitions[].companionFiles` is what names
the accompanying files, each by the
Source-relative Path that is its identity, so a client reaches each one's own facts
through `files[]` to offer the customization's directory.

`sameNameResolutions` states how a product resolves a name it recognizes on two or more of
an entry's definitions, so grouping never implies a winner the Inspector has not recorded.
A product contributes a statement only when it faces that collision: an entry with one
definition has nothing to resolve, and a product that recognizes only one of several has
nothing to choose between — the other definitions are not its files, and a rule quoted
there would answer a question it is not being asked. The collision must also be one the
quoted rule answers, and Claude Code's rule answers the clash of unqualified commands,
which come from skill directories: its statement attaches to every entry holding a Claude
definition whose skill directory name is shared with another Claude-recognized skill of
the same generation. A definition whose extraction failed is no collision evidence for a
tool that invokes the authored name: that name is unknown, so its row membership is this
product's provisional grouping rather than a name the tool resolved (FR-028). A product
whose skill strategy is not
in the shipped registry contributes none either — it recognizes no skill, so no entry can
reach it. The statements differ by product, and none is completely documented.

This full DTO is returned only while `globalDisableInProgress` is null. After a non-no-op
disable barrier is accepted, this function instead returns only this exact control DTO:

```text
GlobalFenceRecoverySnapshot
├── sessionId, globalContentEpoch
└── globalControl, globalEnableInProgress, globalDisableInProgress (required and non-null)
```

A failed tool's reason is on the control that failed, as its `failureCode`, so recovery
carries no Diagnostic array of its own; the retained failed disable request's error message
is carried only as the non-null projection's `globalDisableInProgress.message`, present
exactly while its `state` is `failed`. The DTO contains no generation, Source, Repository failure,
stale failure, unrelated Diagnostic/error, file, path, authored value, relationship, or
resource field. The fence remains in force when disable state is `failed`; only terminal
disable success or process restart permits a full DTO again. Every other inspection-data
function, including inventory/generation/Source/file/detail/Diagnostic/relationship/
comparison data, returns the `global-disable-pending` conflict rejection throughout the
fence. For every fenced function, this check follows parameter-shape validation but
precedes resource-ID existence, generation staleness, duplicate-work, and other
inspection-state checks; the fence conflict therefore wins without leaking retained graph
state.

Every Source has exactly one root. The Repository Source has no member; the session has
zero to four Global Sources, at most one each with `member: codex`, `member: claude`,
`member: copilot`, or `member: agents` — the shared agent home (FR-045). A Global root is never represented as a boundary inside another Source.
`repositoryGeneration` and `globalGeneration` are the two sequences' independently
committed generations; `globalGeneration` is null exactly while Global inspection is
disabled and no Global sequence exists. Each Source's `generation` is its owning
sequence's value: the Repository Source carries `repositoryGeneration`, and every Global
Source carries `globalGeneration`. Each `staleFailures` entry's `baseGeneration` likewise
references the affected Source's owning sequence. A commit in one sequence
invalidates only that sequence's views; the other sequence's
files, detail, and comparison views are untouched (FR-030).
`boundary.displayRoot` is a one-way escaped root presentation label, not a
`SourceRelativePath`, inventory-item locator, caller input, or read authority. The same distinction applies to a pre-admission consent-preview `displayRoot`,
which may represent an absolute or invalid lexical root before any owning Source exists.
The bootstrap Repository root has `origin: process-cwd` when `--root` was omitted and
`origin: root-option` otherwise; the API never exposes the retained raw or canonical root.
Top-level `snapshotState` is `current` or `stale-after-fatal-rescan`; only a fatal explicit
rescan adds or replaces one `staleFailures` entry and its failure reference for the affected
Source. Its `failureRef` is `{ kind: 'diagnostic', diagnosticId }` for a deterministic
returned failure and `{ kind: 'error', message }` carrying the failed request's error
message for a thrown/rejected accepted job. Entries and failure records for different
Sources coexist. A successful complete or partial scan clears only the entry and any
Diagnostic it references for the Source it refreshed; a commit for another Source preserves both, and Global disable clears both for
Sources it removes. `snapshotState` is stale exactly while the
array is non-empty. Automatic first Repository failure and initial Global-enable failure
create no `staleFailures` entry: a deterministic returned failure may use its closed
Diagnostic, a startup throw/rejection reaches the process top level, and an RPC-owned Global
failure surfaces as that request's ordinary error. Initial Global-enable failure preserves
all pre-existing entries and the derived snapshot state.
Each `sourceRelativePath` is relative to its owning Source's single root; the
API never substitutes an absolute or canonical filesystem path for it.
A public Source-relative Path serializes as the exact raw entry names joined with `/`,
the same spelling filesystem operations use internally (FR-024). Hard links are ordinary files:
there is no physical-identity grouping, no primary-path selection, and no alias path
list.
The inventory summary does not include source text. Deterministic sort order is source kind,
Global tool where present, then source-relative path — a total order already, because a
path is unique within its Source.
A file carries no recognition summary and no parse rollup — a recognition's own
`parseStatus` is the parse fact, and a file-level aggregate had no reader: what a file
was recognized as belongs to
the per-kind inventories, and each of their rows carries only what identifies that kind —
never an invented aggregate documentation or applicability status, parse result, or winner.
No response states whether a product would use a discovered file: that depends on runtime
the host never observes, so nothing is published about it (FR-009).

Within one generation there is exactly one `ToolRecognition` for each
`(file, tool, kind)` — an internal record of the committed generation the inventories and
the detail are projected from (data-model.md § ToolRecognition), carried by no response.
Compatible provenances merge into that recognition. If those
provenances require inconsistent parsed meaning, the one recognition becomes `failed` and
publishes none of that recognition's metadata, relationships, or derivations; it is never
split into competing recognitions.

The SPA owns a monotonically increasing `clientDataEpoch` (incremented only by the
central full client-data purge), one current generation per sequence
(`currentRepositoryGeneration` and `currentGlobalGeneration`), and an opaque request
token for every state-bearing request. A session result carrying an older value for
either sequence is ignored. An equal-generations result is adopted only when its token is
still the latest request token and its captured epoch equals `clientDataEpoch`. When a valid
result carries a newer generation for one sequence, the SPA aborts that sequence's
outstanding data requests, disposes only that sequence's generation-owned editors/models
and every detail or comparison state that includes one of that sequence's files, sets
that sequence's current generation, and adopts the complete new snapshot; the other
sequence's committed files, detail, comparison views, and editor models stay valid and
are not refetched. A result captured under an old epoch or a superseded owning-sequence
generation cannot repopulate state even if its bytes arrive later.
Every returned diagnostic is referenced by the active generation/source/file graph or by
`sessionDiagnosticIds`; client-caused request errors are never accumulated here.
Every retained failed-request error message is owned by exactly one `staleFailures`
entry, the failed `batchStatus`, or the failed disable projection's
`globalDisableInProgress.message`; it never enters either
Diagnostic list.
`scope` is an obligatory attachment discriminator, independent of diagnostic lifetime.
The two location fields are always present and are null where the scope does not use
them. The only legal shapes are: `file`, with `sourceId` and that file's
Source-relative Path both non-null; and `source`, with `sourceId` non-null and the path
null. There is no pathless scope — every diagnostic belongs to a Source — and a
source-scoped record never invents a path. Serialization rejects any other combination.
Progress is null for `idle` and `failed`; it is present for active work and
for final `ready`/`partial` counters as defined in the data model. The first legal snapshot
is bootstrap generation 0 with exactly one idle Repository Source selected lexically from
captured `process.cwd()` or the single `--root`, and no files/diagnostics. Its escaped root
label is presentation only and carries no read authority; the first scan reads the retained
selected root, and a root that does not exist or cannot be read as a directory fails that
scan with the source-scoped `root-unreadable` Diagnostic while the session stays usable
(FR-002). A startup throw/rejection may terminate the process, so no later readable
snapshot is promised.

No surface carries a notice about what authored content may contain, and the API sends no
warning fields for one. A viewer of the reader's own files over a loopback-bound session has
nothing to warn about, and a standing notice spends the screen telling a reader about their
own repository. Nothing stands in front of the content either. There is no acknowledgement step and no
acknowledgement state (FR-027): loopback binding is the complete host-side protection
(QR-003), so a confirmation would guard nothing while making every file take two
interactions to read, and the API neither accepts nor claims to enforce one.
Authored values — complete source text, declared authored metadata, authored relationship
targets, and either comparison side — are reachable only by requesting one `FileDetail` or
constructing one comparison at a time; no inventory or session response carries them. The
exception is the identity a row is listed under, because a list that cannot name what it
lists is not an inventory (FR-007, data-model.md § Inventory unit). Two rows have one: a
skill entry's `name` — the name each recognizing tool resolves, the authored `name`,
prefixed root-relative for a nested Claude Code recognition — and an instructions entry's
`applicabilityRange` when the file declares one for itself rather than deriving it from
its path, which is Copilot's `applyTo`. The authored part of each is the value the scan's
one parse resolved (data-model.md § Field reading) — the skill name's `007` read as `7`,
the range's quotes and escapes resolved — with no masking, escaping, or normalization
added by this product; the parts of a skill's name this product supplies — the directory
fallback when the file declares none, and the root-relative prefix a nested Claude Code
recognition carries — are built from the path the response already publishes, under
FR-007's naming rules.
Neither widens past the
row's identity — no other declared value travels with it — so every other declared value
stays behind an explicit detail request. The
central full-session client-data purge drops what the client holds. Route closure, selection
replacement, file or Source removal, and generation replacement are scoped cleanup rather
than that central purge; a generation replacement in either sequence disposes only that
sequence's scoped models. Global disable uses the central purge. None of this grants
filesystem authority or alters the returned content.

`globalControl` is null only when Global consent/control state is inactive. Otherwise
`state` is `active` or `disabling`, and `previewId` identifies the frozen active preview.
`confirmedTools` is always the fixed closed `[copilot, claude, codex, agents]` all-members consent set.
Initial enable and retry validation/admission remain operation-local: only the authority-free
`globalEnableInProgress { kind, operationId, previewId }` is visible. Initial enable keeps
`globalControl: null`; retry preserves its exact pre-operation control projection until one
result-bound disposition atomically commits. A duplicate enable while that projection is
non-null returns the `global-enable-in-progress` conflict rejection; disable remains
immediately available.

At a queued disposition, `pendingTools` is exactly the admitted non-empty batch subset and
`batchStatus` is exactly `{ scanRequestId, tools, phase, failureRef }` for that same subset.
`tools` is non-empty, unique, and in fixed member order. Its active `phase` is
`waiting | deriving | enumerating | reading | recognizing`, with null
`failureRef`. Batch success atomically publishes every Source, clears both fields, and
commits exactly one Global generation: generation 1 at initial enable, the Global
sequence's N+1 for a retry batch. Terminal deterministic failure leaves empty `pendingTools` and
`phase: failed` with `{ kind: 'tool-failures', failedTools }`, where `failedTools` is the
non-empty fixed-order set of the members this batch failed, each with a non-null `failureCode`
on its own control;
a terminal throw/rejection uses
`{ kind: 'error', message }` carrying the failed request's error
message. A failed batch remains request-correlated until retry acceptance or
disable. An `active-no-job` disposition has null `batchStatus`, creates no job/generation,
and retains or replaces only deterministic rejected-tool controls.

While `state: active`, `retryableTools` is exactly each unpublished non-pending `admitted`
control and each `rejected` control whose `retryDisposition` is `same-preview`; lexical
`new-preview-required` controls are excluded. It stays at the pre-operation projection
during operation-local retry validation. Retry is offered only when
`globalEnableInProgress` is null, `pendingTools` is empty, and the matching frozen preview
has been retrieved and verified. During a non-failed active batch, retryable tools are
informational only and enable returns the `global-enable-in-progress` conflict rejection.

From disable-barrier acceptance through terminal success, `state: disabling` has empty
pending/retry arrays and null `batchStatus`; `globalDisableInProgress` is non-null through
`draining`, `committing`, and retained `failed`. The control becomes null only at successful
`remove-active-state` completion. A `cleanup-only` barrier can have null `globalControl`.
A control's `failureCode` is the closed reason its own tool failed, non-null exactly while
that tool has failed and has no published Source; the client renders the sentence the code
names, the way every closed union is rendered. It is not a Diagnostic: a Diagnostic states
what happened while reading something in a Source, and a tool whose root was never admitted
has no Source for one to belong to. It remains until that control failure is cleared or
disable commits removal.
The failed `batchStatus` error message is the one retained record of an accepted
admitted-subset Global batch throw/rejection for the whole active consent. A
pre-acceptance retry failure preserves it; deterministic `active-no-job` retry or
replacement-batch acceptance clears it; a terminal replacement failure supersedes it; and
Global disable removes it. It never identifies one tool and never creates a
`StaleSourceFailure`.

Outcomes: the full or fenced DTO.

### `agent-customization-inspector:get-file-detail`

Parameters: the file's whole identity as the function's single argument — an object
carrying the committed Source-relative Path and the Source that holds it (FR-030). A
path alone names no file once a Global commit publishes a second Source, because both
can hold one path. The Source is named by a selector — `repository` or
`global-<member>` — rather than by a Source ID: an ID belongs to the launch that minted
it, while a link a reader keeps has to outlive that launch. The selector resolves like
every other detail parameter and is never a filesystem operand, so one no committed
Source answers to resolves nowhere and takes the same `stale-resource` rejection an
unknown path does.

```json
{ "sourceRelativePath": ".claude/skills/deploy/SKILL.md", "source": "repository" }
```

Returns one active-generation file detail, discriminated by whether a recognition owns
the file:

```text
FileDetail — kind: 'instructions' | 'skill' | 'agent' | 'prompt/command' | 'rule' |
             'output style' | 'settings/config' | 'file'
├── kind 'instructions' — the file is a recognized instruction file:
│   ├── file — one CustomizationFile, discriminated by encoding:
│   │   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   │   ├── readable text adds hadLeadingBom, sourceText, sizeBytes
│   │   └── binary adds sizeBytes; unknown adds nothing further
│   ├── presentation — the one scan-time parse, or null exactly when
│   │   extraction failed all-or-nothing (FR-028):
│   │   ├── frontmatter[] { key, keyKind, value } — a value is one of
│   │   │   { kind: 'scalar', scalarKind, text }, { kind: 'absent' },
│   │   │   { kind: 'sequence', items[] }, or
│   │   │   { kind: 'mapping', entries[] { key, keyKind, value } }, recursively
│   │   └── bodyText
│   └── diagnostics[]
├── kind 'skill' — the file is a recognized skill entry point:
│   ├── file — as above
│   ├── presentation — as the instructions variant: the same one scan-time
│   │   parse, with the same null-on-failure rule (FR-028)
│   └── diagnostics[]
├── kind 'agent' — the file is a recognized custom-agent definition:
│   ├── file — as above
│   ├── presentation — the one scan-time parse split into the two halves the
│   │   kind shows, or null exactly when extraction failed all-or-nothing
│   │   (FR-028):
│   │   ├── metadata[] { key, keyKind, value } — the same declared-entry
│   │   │   shape the instructions variant's frontmatter carries: every
│   │   │   declaration except the one holding the instructions, in the file's
│   │   │   own order
│   │   └── instructionsText — the instructions the file gives the agent
│   └── diagnostics[]
├── kind 'prompt/command' — the file is a recognized command file:
│   ├── file — as above
│   ├── presentation — as the instructions variant: the same one scan-time
│   │   parse, with the same null-on-failure rule (FR-028)
│   └── diagnostics[]
├── kind 'rule' — the file is a recognized rule file:
│   ├── file — as above
│   └── diagnostics[]
├── kind 'output style' — the file is a recognized output style:
│   ├── file — as above
│   ├── presentation — as the instructions variant: the same one scan-time
│   │   parse, with the same null-on-failure rule (FR-028). The frontmatter is
│   │   what the style declares, and the body is the instructions the vendor
│   │   appends to the system prompt
│   └── diagnostics[]
├── kind 'settings/config' — the file is a recognized settings or
│   configuration file:
│   ├── file — as above
│   └── diagnostics[]
└── kind 'file' — no recognition owns the file (a file only the census
    lists, or a diagnostic-only candidate):
    ├── file — as above
    └── diagnostics[]
```

No variant carries a locator for the file outside this product. Opening it in an
application on the reader's machine is § open-file's, which resolves the same
Source-relative Path against the same committed generations: the absolute path is the
host's, the client receives a Source's root only as the one-way `displayRoot` escaping
(data-model.md § SourceBoundary), and a detail response therefore hands the page nothing
it could open.

This tree is the response shape: a client can rely on exactly these fields and no
others. The `prompt/command` variant carries a `presentation` because a prompt or command file
supports a skill's frontmatter keys, so its detail leads with the declarations the file
wrote and the prompt that follows them. What it does not carry is the name a reader
would type: that is the rule's answer rather than a field of the detail, so it is the
inventory's fact — the name each `prompts[]` row is grouped under — exactly as a skill's
invocation name is (`skills[]`). A prompt file declaring one is
no exception: the declaration is in `presentation.frontmatter` like every other key the
file wrote, and what the rule made of it is the row's.
The `agent` variant carries a `presentation` of its own shape, because the split is not
always a frontmatter block: a Codex agent is TOML whose `developer_instructions` string is
the prose and whose remaining top-level keys are the configuration, while a Claude
subagent and a Copilot agent profile are Markdown split at the frontmatter fence — the
block configuring the agent and the body being the instructions it runs with. Where that split falls is the
admitting rule's contract; what it produces is one shape either way, so one detail
surface renders both — the metadata as YAML and the instructions as Markdown. The split
is taken only when the declaration holding the instructions resolves to a string: one
written as a table, a list, or a number is a declaration rather than prose, so it stays a
metadata entry and `instructionsText` is empty. What the variant does not carry is the
agent's name: a file's own `name` declaration is in `presentation.metadata` like every
other key it wrote, and the name each `agents[]` row is grouped under is the inventory's
fact, exactly as a command's invocation name is. That separation is what lets one file
appear under two names — a `.claude/agents/*.md` direct child is Claude Code's subagent,
named by its declared `name`, and a Copilot agent profile, named by the file's own
name — without the detail having to choose one of them. A declared `mcp_servers` block is one
metadata entry too: an MCP declaration's home is an explicit carrier, so an agent
spelling one joins no MCP row and this response is where the reader sees it
(data-model.md § Inventory unit).
The `rule` variant carries no `presentation`: such a file is
published as the one document its author wrote, so nothing is read out of it. A Claude
`.claude/rules/**` file
reaches the response whole, frontmatter block included, because splitting a rule into
declarations and a body would show the reader two halves of one file. With nothing read
out, nothing can fail to be read: the kind produces no extraction diagnostic, and a
declared `paths` glob is authored text this product never evaluates against a filesystem
path. The variant is its own rather than the unrecognized one, because a recognition does
own the file and its inventory row says so.
The `settings/config` variant carries no `presentation` for the same reason, and its row
unit is the file itself (data-model.md § Inventory unit), so the document its author wrote
is the whole answer: a Codex `.codex/config.toml` reaches the response as the TOML it is,
comments, authored spellings, and section order intact, which is what a reader comparing
the response against their own file needs. Its `[mcp_servers.*]` tables are a different
row's subject and are served declaration-first by `get-mcp-carrier-detail`; that they are
also visible here is the same document seen under its own row rather than a second
publication of one fact. No declared agent, skill, model-instruction, compact-prompt, or
hook path is read, resolved, or followed, and no environment reference is substituted
(FR-019, FR-026).

A permission policy is not among these variants. What a permissions row names is a policy,
not a file — one vendor's policy is a document of its own and another's is a block of a
settings file whose other keys belong to a different recognition — so it is
`get-permission-policy-detail`'s result rather than a shape here that would have to answer
for a file it is not about.
The parse the other recognized kinds show is the file's, not a recognizing tool's, and the
response publishes it once as `presentation`. For the Markdown kinds the extraction runs
once per `(file, kind)`, because every shipped vendor reads the same fixed YAML semantics
for them. The custom-agent kind is the exception, and it is the admitting rule's own
reading rather than the kind's: a Codex agent is TOML whose `developer_instructions`
string is the prose, while the Markdown products' agents split at a frontmatter fence, so
the extraction is per `(file, tool)` there. What each reading produces is the same shape,
which is why one `presentation` still publishes it — and where two products read one file,
their readings resolve identically, so the repetition is work over one string rather than
a second fact. There is no per-tool recognition list:
which tools recognize the file, what each resolves it as, and its parse state are the
inventory's facts, and each kind's own inventory carries them. A skill's are
`skills[].definitions[]`, an instruction file's are listed beside it on its inventory row
(`instructions[]`), and a custom agent's on `agents[].definitions[]`. Every kind's detail
route is the path alone: two products reading one file read the same bytes, so a per-tool
address would give one document two URLs, and where the products differ — the name each
invokes a skill by — the page states them together from the rows that hold the file. There is no admission record either: which rule
authorized a read, and where it matched, is an internal record of the committed
generation (data-model.md § ToolRecognition); no
session response carries it — a configured fallback instruction file's detail is
therefore indistinguishable in shape from a static one's. And there is no
`relationships` array of edge records: an edge may be emitted only from an origin a
relationship-only rule covers, the registry ships none
(contracts/runtime-composition.md § Normative relationship-only registry), so no
recognition produces one and the response carries no such array at all. An instruction
file yields none either, whichever product recognizes it:
this product does not read references out of prose, because no vendor page fixes where an
authored `@path`-shaped token ends, so every boundary rule would be this product's own
invention and a wrong one asserts a reference the reader never wrote. Such a token stays
source text, and no relationship-only rule covers an instruction origin. What such a
rule could ever cover is a declaration a format delimits — a frontmatter value, a JSON
or TOML field, a map key — where the boundary is the format's rather than this
product's.

Each frontmatter entry's `keyKind` is the closed union `string | number | boolean |
null`: the declared key's parsed type under YAML 1.2's core schema. A declaration's
identity is the `(keyKind, key)` pair — an unquoted `1` and a quoted `"1"` are two keys
that both render the `key` text `1` — so a client matching declarations across files
matches by that pair, never by `key` alone. The same entry shape, `keyKind` included,
recurs inside every nested `mapping` value.

For a readable file, `sourceText` is the complete decoded source, exactly as authored. This
function answers for the rows whose subject is the file itself, so a path carrying only
declaration-subject rows has no `FileDetail` at all: a standalone MCP declaration carrier —
a file the MCP kind recognizes and no file-subject kind claims — publishes its declarations
through `get-mcp-carrier-detail` and never its own bytes (FR-007), and a function whose
purpose is serving authored source carries no variant that must withhold it. Its path
requested here resolves to the same `stale-resource` rejection as any path this function
holds no detail for. A path that also carries a file-subject row is answered under that row
instead, because a row's subject is what its detail is about (FR-007): a Codex
`project_doc_fallback_filenames` entry naming `.mcp.json` makes that carrier an instruction
file besides, and an instruction file shows its complete source, so the one path serves its
declarations alone through `get-mcp-carrier-detail` and its whole document here. Only the
explicit carriers hold MCP recognitions: a file
of any other kind that spells MCP-looking configuration in its own content — a skill's
or an agent's frontmatter, a settings file's inline map — is that kind's ordinary
content, served by this function under its own kind with every declared key visible in
its presentation, and it joins no MCP surface.

A permission policy is withheld here on the same terms, in both its forms: what a
permissions row names is the policy rather than the file that declares it (data-model.md
§ Inventory unit), so neither form is a subject this function answers for — a carrier
declaring a policy block is a file admitted so that block can be published, and a file
whose whole content is the policy is a policy rather than a file this function has
anything of its own to say about. A path carrying a permissions row and no file-subject
row resolves to the `stale-resource` rejection, and `get-permission-policy-detail` is
where the policy is served.

A skill's `presentation` is what it declares and what it instructs, because that
is what its detail surface leads with. `frontmatter[]` lists every key the file declares,
in authored order, by the key the file wrote — never a vendor catalog's — and `bodyText`
is the same document with its frontmatter block removed, so the two never overlap. The
split is the frontmatter parser's own: re-deciding where the block ends would be a second
opinion about the format. Each entry's `value` mirrors what the parser resolved, in the shape the file wrote it: a
`scalar` carries its resolved text — quoting and escapes resolved, `007` read as `7`, a
key declared twice read as its later declaration — an `absent` is an authored null, a
`sequence` carries its items, and a `mapping` carries entries of its own, recursively.
Nothing is flattened into a spelling the file does not contain. A value that contains
itself has no such shape and no JSON form, so it fails that extraction all-or-nothing
(FR-028) rather than being summarized. The declared name is not published beside the
declarations: it is one of them, the row the page came from already shows the resolved
identity, and one fact in two places is two states that can disagree. No
value is masked, redacted, or shortened at any point.
JSON transport escaping must round-trip to the same string at the client. Environment-variable
references remain the characters that were written: the host never reads,
resolves, or substitutes the referenced process-environment value. The only environment
values used by inspection are the specifically documented tool-home variables used to derive
Global roots through the consent flow.
A registry-defined `targetOrigin: documented-default` relationship instead has
`authoredTarget: null`; the SPA labels its validated `normalizedTarget` as a documented
default and never implies that the synthetic path occurred in source.

Across Inventory, Detail, Comparison, Global controls, Diagnostics,
every API result, CLI output, and documentation, the product is limited to syntax-only parsing, reading the
value a parser resolves for a declaration the recognized kind publishes, frozen-catalog
classification, and documented
structural scope/order/condition/selection/reference projection. It never interprets or
ranks natural-language meaning or intent; decides customization correctness, validity,
compliance, effectiveness, or quality; or provides policy/remediation advice, validation,
lint, synchronization, conversion, formatting, or fixing. Strict validation of
Inspector-owned DTOs, registries, and internal invariants remains
permitted and is not customization validation. Deterministic availability Diagnostics carry
no content verdict. A failure confined to one file becomes that file's Diagnostic under
FR-028; any other unexpected RPC-owned failure propagates as the request's ordinary error
and never becomes a Diagnostic.

The file encoding state is assigned from the bytes of one completed ordinary read. Any NUL
byte yields `binary` with no `sourceText` or BOM record and no comparison eligibility; for
an admitted candidate that is diagnostic-only and makes an otherwise publishable generation
`partial`, while a census-listed companion's binary bytes are the ordinary fact of an asset
(FR-025). Every other byte sequence is
decoded exactly once as UTF-8 with replacement semantics. One leading BOM sets
`hadLeadingBom: true` and is removed. Text decoded without replacement uses `utf-8`; any inserted
`U+FFFD` uses `utf-8-replaced`. That exact garbled complete `sourceText` continues through
parsing, extraction, detail, and comparison and does not make the generation partial by
itself. There is no alternate decode, charset guessing, sampling, truncation, or product-
defined byte/line/item ceiling.

A definition's `parseStatus` is the closed enum
`not-attempted | parsed | failed` (§ get-session `skills[]`). Parsing and extraction are
all-or-nothing per `(file, kind)`: the detail's `presentation` is null exactly for a
`failed` extraction, which returns
no metadata, relationships, or derivations while the file-scoped
`recognition-parse-failed` Diagnostic — one record however many tools recognize the
kind — makes the generation `partial` and the complete readable
source stays displayed and comparison-eligible (FR-028). A failure that is not confined to
one file fails the attempt and is exposed, when RPC-owned, as the request's ordinary
error. Declaration comparison is one canonical serialized document per side, diffed
client-side (research.md § 7) — a frontmatter declaration is its file's one parse for
the Markdown kind, shared by every recognizing tool, so a tool is not a coordinate of it
and tool recognition is compared per tool beside the diff; each side serializes to YAML,
each comparison leading with the keys the vendors document for its kind, in the order the
page that publishes them does, and sorting every other key (declaration-order.ts). The
prompt-and-command comparison states one fact more per recognition, because this kind's
row is a name rather than a file: each recognizing tool's cell carries the name that
tool invokes that side's file by. The MCP kind's declarations are each
recognizing tool's own reading (data-model.md § Field reading): their comparison surface
is the declared server name's own — one name's declaration in each of two carriers of
its row, serialized to one canonical JSON document per side, loaded through two ordinary
`get-mcp-carrier-detail` results — and each detail renders its declaration content as
the same serialized document in the file's own key order (FR-007).

A declared value carries whole characters — an astral character is two UTF-16 code units
and a combining mark is two code points — so it survives extraction and JSON transport
unaltered, and no Unicode normalization is applied to it. No response carries source
coordinates: nothing points into a document, and a range beside the value it was taken from
asserts nothing the value does not already state. A document an extractor cannot parse
fails the affected recognition all-or-nothing, while its complete `sourceText` stays
available — which is where a reader goes for the spelling a value no longer carries.

The result uses inert JSON strings. The SPA must render `sourceText` and metadata through
Vue text bindings, not `v-html`, Markdown rendering, clickable links, URI handlers, or image
loads. The result is held only in memory, is never durably cached, and is never logged. The SPA
requests one file at a time and shows it with no notice beside it.

A detail request token captures exactly `(clientDataEpoch, sourceRelativePath)`. The SPA
adopts the result only when the captured epoch still equals the live epoch and the path is
still the selected file; replacement of the request token invalidates that capture. The
path is the file's stable identity, so the host resolves it against whatever generation is
current, and the epoch is what keeps a response captured before a purge from repopulating
state. Any mismatch disposes the result without creating a model, DOM text, metadata row,
or comparison input.

No response carries a documentation status, a lifecycle qualifier, or an evidence
assessment. Those are maintenance records on the registry itself (QR-005); a candidate
provenance publishes which rule admitted the file, not how well that rule is documented.

Outcomes: the `FileDetail` result; the `stale-resource` rejection when no current
committed generation holds this function's detail at the path — never scanned, removed by
a later commit, belonging to a disabled source, a pure MCP carrier's, whose
detail only `get-mcp-carrier-detail` serves, or a declared permission policy's, whose
detail only `get-permission-policy-detail` serves; a value of another type resolves the same
way, so no separate malformed-argument outcome exists; the
`global-disable-pending` conflict rejection while the disable fence is non-null.

### `agent-customization-inspector:get-mcp-carrier-detail`

Parameters: one object naming the Source and the committed Source-relative Path — the
declaring file's whole identity (FR-030), the pair `get-file-detail` takes — because a
Global member publishes MCP carriers too (FR-015, FR-017).

```json
{ "sourceRelativePath": ".codex/config.toml", "source": "repository" }
```

Returns one active-generation MCP carrier detail: the declarations the file makes and
its own file facts, and deliberately no `sourceText` field at all. It answers for the
explicit carriers alone: a file admitted so its declarations can be
published shows those declarations and never its own
bytes (FR-007), which is why the carrier's detail is this function's own result rather
than a `FileDetail` variant — the field is absent from the shape, not a value a surface
must decline to render. A file of any other kind never resolves here, whatever
MCP-looking configuration its content spells: that configuration is the file's own
declared content, visible in its `get-file-detail` presentation under its own kind.

```text
McpCarrierDetail
├── file — the carrier's content-free summary, discriminated by encoding:
│   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   ├── readable text adds hadLeadingBom and sizeBytes — never sourceText
│   └── binary adds sizeBytes; unknown adds nothing further
├── servers[] — the declarations, one per server in the parser's resolved
│   order, empty when the carrier declares none — or null exactly when
│   extraction failed all-or-nothing (FR-028), whose Diagnostic is below:
│   └── name, fields[] { key, keyKind, value } — the declared server name and
│       every field the declaration writes, by the keys the carrier wrote,
│       in the same entry shape `presentation.frontmatter` uses
└── diagnostics[]
```

This tree is the response shape: a client can rely on exactly these fields and no
others. The declarations are the carrier's own — each recognizing product's documented
reading over the one decoded text, merged into one response by declared name
(data-model.md § Field reading) — and every value is the carrier's literal: an
environment reference stays the characters that were written, and no process value is
substituted for it (FR-026). The same inert-rendering, single-request, and request-token
rules as `get-file-detail` apply, including the `(clientDataEpoch, sourceRelativePath)`
capture.

Outcomes: the `McpCarrierDetail` result — a parsed carrier declaring no server is a
result with empty `servers`, not a rejection; the `stale-resource` rejection when no
current committed generation holds an MCP recognition at the path — never scanned or
removed by a later commit, and a value
of another type resolves the same way, so no separate malformed-argument outcome exists;
the `global-disable-pending` conflict rejection while the disable fence is non-null.

### `agent-customization-inspector:get-hook-carrier-detail`

Parameters: one object naming the Source and the committed Source-relative Path, exactly
as `get-mcp-carrier-detail` takes them — the declaring file's identity (FR-030).

```json
{ "sourceRelativePath": ".codex/hooks.json", "source": "repository" }
```

Returns one active-generation hook carrier detail: the lifecycle events the file declares
and its own file facts, and deliberately no `sourceText` field at all — the same rule the
MCP carrier's detail follows, and for the same reason (FR-007). Publishing a declaration is
not running it: no declared command, handler, or referenced script is executed, opened, or
resolved, and no environment reference is substituted (FR-020, FR-026). A file of any other
kind never resolves here, whatever hook-looking configuration its content spells.

The result takes one of two shapes, discriminated by `carrier`, because the two documented
forms differ in what the carrier itself declares: a file whose whole purpose is hooks —
a Codex `.codex/hooks.json` — publishes its remaining top-level keys here, since it has no
other row to publish them; a file that contains a hook table among other content — an
inline Codex `[hooks]` in a `.codex/config.toml`, the `hooks` object of a Claude root
settings document — leaves its neighbouring keys to the recognitions of the same file that
own them.

Which files those are is each vendor's contract, and a documented hook location is not
automatically one of them: a declaration that is part of what another customization *is* —
a Claude skill's or subagent's frontmatter `hooks`, a plugin manifest's or a catalog
entry's — resolves here for no path, because that customization's own detail already
publishes the keys its file wrote and a second publication could disagree with the first
(contracts/vendors/claude-code.md § Normative initial-release presentation allowlist).

```text
HookCarrierDetail
├── carrier — 'standalone' | 'contained', the documented form of this carrier
├── file — the carrier's content-free summary, discriminated by encoding:
│   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
│   ├── readable text adds hadLeadingBom and sizeBytes — never sourceText
│   └── binary adds sizeBytes; unknown adds nothing further
├── events[] — the declarations, one per declared event in the parser's
│   resolved order, empty when the carrier declares none — or null exactly
│   when extraction failed all-or-nothing (FR-028), whose Diagnostic is below:
│   └── event, groups[] — the declared event name and the matcher groups it
│       declares, each as the value its item wrote, in the shared declared-value
│       shape the detail surfaces render
├── carrierFields[] — 'standalone' only: every top-level entry beside the hook
│   map, in the entry shape `presentation.frontmatter` uses
└── diagnostics[]
```

This tree is the response shape: a client can rely on exactly these fields and no others.
A group is published as its author wrote it, malformed or not — an item that is not a table
is a group a reader needs stated rather than dropped — while an event whose value is not a
list of groups declares nothing and is omitted whole, the same answer an absent hook map
gives. The same inert-rendering, single-request, and request-token rules as
`get-file-detail` apply, including the `(clientDataEpoch, sourceRelativePath)` capture.

Outcomes: the `HookCarrierDetail` result — a parsed carrier declaring no event is a result
with empty `events`, not a rejection; the `stale-resource` rejection when no current
committed generation holds a hook recognition at the path — never scanned, removed by a
later commit, or a path only a declaration names, and a value of another type resolves the
same way, so no separate malformed-argument outcome exists; the `global-disable-pending`
conflict rejection while the disable fence is non-null.

### `agent-customization-inspector:get-plugin-carrier-detail`

Parameters: one object naming the Source and the committed Source-relative Path of the
declaring file — the file's identity (FR-030) — the plugin name of the inventory row
being read, null for the row that closes the list with the declarations resolving no
name at all, and the product whose reading the answer is. A catalog's local-directory
enumeration remains the Repository catalog's: below the shared agent home no plugin
directory is admitted (FR-018, FR-045), so the personal marketplace publishes its
declarations alone.

```json
{
  "sourceRelativePath": ".agents/plugins/marketplace.json",
  "source": "repository",
  "pluginName": "secret-keeper@inspector-legacy",
  "tool": "codex"
}
```

The name is a parameter rather than a filter the client applies to what came back, because
the answer is one row's: a catalog offering many plugins would otherwise ship every other
plugin's declaration to a page about one of them. A step between two plugins of one catalog
is therefore a request of its own, exactly as a step between two files is.

The tool is a parameter for the same reason, one level further: an inventory row lists one
carrier per `(file, tool)`, and which directory an entry's source names is each vendor's own
contract, so one catalog admitted by every product has one reading per product — the same
entry naming a plugin root to one of them and nothing to the others. Answering with
whichever recognition a projection reached first would publish one product's root, source
form, and manifest forms under another product's name; a request that names the product
answers for the carrier line the reader followed. The manifest forms stay the union across
every recognition at that path, because which file inside a root is the plugin's own
declaration is a question each vendor answers for the same directory.

Returns one active-generation plugin carrier detail, discriminated by what the file is to
the plugins it declares. The two carrier kinds answer differently, which is why
this is the function's own result rather than a `FileDetail` variant: a manifest is itself
the customization — one plugin, declared by the whole file — so it serves that complete
authored source and nothing read out of it (FR-007, FR-025), a manifest being strict JSON
whose parsed key list would be the same document a second time, while a catalog resolves
many plugin names to the sources they come from, so it serves the requested entry's
declarations and carries no `sourceText` field at all, the field being absent from the shape
rather than a value a surface must decline to render. Showing a catalog's bytes on a page about one of its
plugins would put every other plugin it lists there too, which is the same reason an MCP
carrier's detail withholds its own.

```text
PluginCarrierDetail — carrier: 'manifest' | 'catalog'
├── carrier 'manifest' — the file is the manifest that makes the folder holding
│   it a plugin, which is what a product loading a plugin by placement reads:
│   ├── file — one CustomizationFile with its complete authored source,
│   │   discriminated by encoding exactly as `get-file-detail`'s is
│   ├── pluginRoot — the Source-relative directory this manifest's presence
│   │   makes a plugin, with its trailing slash; empty only when the
│   │   admitting rule resolved none, which no shipped rule does
│   └── diagnostics[] — where a manifest that could not be parsed is stated,
│       there being no parsed key list for it to be absent from (FR-028)
└── carrier 'catalog' — the file is a catalog listing plugins:
    ├── file — the carrier's content-free summary, discriminated by encoding:
    │   ├── sourceId, sourceRelativePath, encoding, diagnosticIds[]
    │   ├── readable text adds hadLeadingBom and sizeBytes — never sourceText
    │   └── binary adds sizeBytes; unknown adds nothing further
    ├── catalogFields[] { key, keyKind, value } — what the catalog declares
    │   about itself, never its `plugins` array, empty for a failed extraction
    ├── plugins[] — the requested row's declarations in the parser's resolved
    │   order, empty when the catalog offers the name nowhere, null for a
    │   failed extraction
    └── diagnostics[]
```

Each catalog entry is `name` — the plugin name it resolves, or null when it declares none —
`fields[] { key, keyKind, value }`, every key the file wrote for that plugin, in the same
entry shape `presentation.frontmatter` uses, and what the admitting rules answer from that
entry's declared source: `sourceForm`, `pluginRoot`, and `manifestPaths[]`.

`sourceForm` is what kind of place the plugin's files come from, as the closed set every
product's documented forms map onto — `repository-directory`, `github-repository`,
`git-repository`, `git-subdirectory`, `npm-package`, `zip-archive`, `command-output`, and
`unrecognized` for a source in no form the admitting vendor documents. The kind rather than
the vendor's own token, because one place has several spellings, and published beside the
root rather than derived from it: a relative path that leaves the Source is a form the rule
read and a directory it cannot name, while an npm package names no directory anywhere here,
and a surface holding only the root would state both as one absence. A manifest carrier's
declaration is `repository-directory`: the plugin is the directory holding the manifest.

`pluginRoot` is the Source-relative directory the plugin's files occupy — null when the
source names no directory here at all, as every form but a repository directory does, and
as a repository-relative path leaving the root does — and `manifestPaths[]` are the files
inside it that a client reads as the plugin's declaration of itself, in order and without
repetition, empty for such a source. The forms are every recognizing product's rather than one's: which file
inside a root is the plugin's own declaration is each vendor's contract, and one catalog
three products read resolves one plugin to one root with three lists of forms to look for
there, so a surface given a single product's list would report that this scan holds no
manifest for a plugin whose manifest it is listing among that plugin's own files. Nothing
is probed on disk: these are what the entry declared, read through the vendor's contract,
so a root this repository does not carry and one that ships no manifest each name paths the
generation holds no file at. Whether a file is there is what `files[]` says, and the surfaces that
open these paths keep only the ones the commit carries. They are what lets a surface show the plugin
rather than the entry: which files a plugin ships and which of them is its own manifest is
knowledge no client can derive from a path. Neither manifest form carries such a
parse, for the same reason: the file itself is what the response carries. This tree is the response shape: a client
can rely on exactly these fields and no others. Every value is the file's literal: a
credential stays the characters that were written, an environment reference is never
resolved (FR-026), and a component the manifest points at — bundled skills, `.mcp.json`,
`.app.json`, hook files, assets — is a declared value here and is never opened
(`codex.excluded.plugin-files`). Nothing in the response states that a plugin is installed,
enabled, trusted, or loaded: all four are User state this product never reads (FR-009). The
same inert-rendering, single-request, and request-token rules as `get-file-detail` apply,
including the `(clientDataEpoch, sourceRelativePath)` capture.

Outcomes: the `PluginCarrierDetail` result — a parsed catalog offering nothing under the
requested name is a result with empty `plugins`, not a rejection; the `stale-resource`
rejection when no current committed generation holds a plugin recognition at the path — never scanned or removed by a
later commit, and a value of another type resolves the same way, so no separate
malformed-argument outcome exists; the `global-disable-pending` conflict rejection while the
disable fence is non-null.

### `agent-customization-inspector:get-plugin-file-detail`

Parameters: one object naming the carrier that declares the plugin — its Source and
Source-relative Path — the product whose reading of it reached the file, the plugin name
of the row being read — null for the row that closes the list — and the Source-relative
Path of the file to read.

```json
{
  "sourceRelativePath": ".agents/plugins/marketplace.json",
  "source": "repository",
  "tool": "codex",
  "pluginName": "config-helper@inspector-examples",
  "filePath": ".codex/rules/team.rules"
}
```

Its own function rather than a `get-file-detail` variant, because the subject is the file
*as this plugin's*. `get-file-detail` answers for the row whose subject a file is, and a
file below a plugin root has no such row: it acquired no rule, no recognition, and no kind
by being enumerated there (contracts/inspection-path-allowlist.md § Bounded companion
census). A path a rule *does* independently admit — a nested `SKILL.md`, a declared
permission policy, an MCP carrier — keeps its own rows for its own kinds, and those rows
answer through their own functions; this one answers for the plugin's page, where the
subject is the plugin and the file is one of the files it ships.

The carrier and the product are parameters for the reason
`get-plugin-carrier-detail`'s are: which directory an offering names is each vendor's own
contract, so which files a plugin ships is a fact about one `(file, tool)` carrier's
reading of one row's name. Membership is what makes the path readable: the file must sit
below a directory that carrier's offering of that name reached, so the function cannot be
used to read an arbitrary file through a plugin's name.

Returns one active-generation result carrying the committed file with its complete authored
source (FR-025) and the file's own diagnostics in the commit's deterministic order
(FR-028). No parse accompanies it: a plugin's file is published as the file it is, and a
kind that recognizes it publishes its parse on that kind's own detail.

Outcomes: the ordinary data envelope; the `stale-resource` rejection when no current
committed generation holds a plugin recognition at the path for that product, when the
offering reached no directory the path sits below, or when this commit no longer holds a
file there — and a value of another type resolves the same way, so no separate
malformed-argument outcome exists; the `global-disable-pending` conflict rejection while
the disable fence is non-null.

### `agent-customization-inspector:get-permission-policy-detail`

Parameters: one object naming the Source and the committed Source-relative Path, exactly
as `get-file-detail` takes them — the identity of the file that declares the policy,
which is the permissions row's identity (FR-030): a consented member's settings or rules
file declares permission policy too (FR-016, FR-017).

```json
{ "sourceRelativePath": ".codex/rules/deploy.rules", "source": "repository" }
```

Returns one active-generation permission policy, published in the form the declaring
product spells it. What a permissions row names is a policy rather than a file, so its
detail is this function's own result: one vendor writes the policy as a document of its
own, and another declares it inside a settings file whose remaining keys are a different
recognition's content, and a single file-shaped result would have to answer for a file it
is not about.

```text
PermissionPolicyDetail — form: 'whole-document' | 'declared-block'
├── form 'whole-document' — the declaring file's whole content is the policy:
│   ├── file — one CustomizationFile, discriminated by encoding, exactly as
│   │   `get-file-detail` publishes one: readable text carries sourceText
│   └── diagnostics[]
└── form 'declared-block' — the policy is one block of a carrier whose other
    keys belong to another recognition:
    ├── file — the carrier's content-free summary, discriminated by encoding,
    │   exactly as `get-mcp-carrier-detail` publishes one — never sourceText
    ├── declaredPolicy[] { key, keyKind, value } — the declared block's own
    │   entries in the parser's resolved order, in the same entry shape
    │   `presentation.frontmatter` uses, or null exactly when extraction
    │   failed all-or-nothing (FR-028), whose Diagnostic is below
    └── diagnostics[]
```

This tree is the response shape: a client can rely on exactly these fields and no
others.

A `whole-document` policy is served as the one document its author wrote and
nothing is read out of it: a Codex `.rules` file's vendor contract admits only
`runtime-reference` relationships out of Starlark while leaving comments and unlisted
expressions as source text (contracts/vendors/openai-codex.md § Normative initial-release
presentation allowlist), and no shipped recognition produces an edge. With nothing read
out, nothing can fail to be read, so that form produces no extraction diagnostic.

A `declared-block` policy is the same principle from the other side. The file is a carrier
admitted so one block of it can be published, so it publishes that block and never its own
bytes, exactly as an MCP carrier does (FR-007) — the other keys of a Claude settings file
are the `settings/config` recognition's content and reach no permissions response. The
block is published whole, every entry its authored object holds in the parser's resolved
order, because an allowlist of some of its keys would drop authored policy without being
able to say which was dropped (FR-028). Rule strings ride as the text their author wrote:
a tool name with an optional specifier, never resolved to a file, a command, or a domain
(contracts/vendors/claude-code.md § Normative initial-release presentation allowlist), and
never evaluated against anything (FR-019). The same inert-rendering, single-request, and
request-token rules as `get-file-detail` apply, including the
`(clientDataEpoch, sourceRelativePath)` capture.

Outcomes: the `PermissionPolicyDetail` result; the `stale-resource` rejection when no
current committed generation holds a permissions recognition at the path — never scanned,
removed by a later commit, or a carrier whose declared block was withdrawn between
generations, and a value of another type resolves the same way, so no separate
malformed-argument outcome exists; the `global-disable-pending` conflict rejection while
the disable fence is non-null.

### `agent-customization-inspector:rescan-repository`

Parameters: none.

Accepts one Repository scan command when that source has no running or queued command. The
host generates one opaque `scanRequestId` at admission and returns
`ScanAdmission { scanRequestId, source }`; both fields in the returned Source/progress and
all later queued, active, complete, partial, or failed status for this command carry that
same ID. A successful committed generation records it, while older status or inventory
cannot satisfy this request. If
the coordinator is idle, work starts immediately; if another transaction is active, the
command is queued FIFO and the Repository summary returns `status: scanning`,
`progress.phase: waiting`, a non-null `queuedAt`, and null `startedAt`. The job begins from
the Repository sequence's committed generation at dequeue time, not the generation
observed by this request. The current Repository generation remains readable until a
complete or partial replacement is atomically published as exactly Repository generation
N+1. Publication invalidates every detail or comparison view that includes a Repository file —
the file identities themselves are Source-relative Paths and stay stable, so a retained
link resolves against the new generation; the Global sequence, its generation, and
Global-only views are untouched, so clients refetch only Repository data.
If the explicit rescan fails before commit, every uncommitted result, including any
provisional partial result, is discarded. The last committed generation and IDs remain
readable, the snapshot is `stale-after-fatal-rescan`, and the Repository Source is `failed`.
A deterministic returned fatal outcome uses its closed actionable lifecycle Diagnostic; an
unreadable selected root uses `root-unreadable`. A throw/rejection that is not confined to
one file propagates past every domain layer, and the accepted job retains the failed
request's error message for this same `scanRequestId`. In either case the
`staleFailures` entry carries exactly that failure representation —
`{ kind: 'diagnostic', diagnosticId }` or `{ kind: 'error', message }`; later success
clears both, while another Source's commit preserves them.

Outcomes: the acceptance result with the request ID and updated source summary; the
`scan-in-progress` conflict rejection only for a duplicate running/queued Repository
command; or the `global-disable-pending` conflict rejection while the disable fence is
non-null.

### `agent-customization-inspector:open-file`

Parameters: one object naming the file's whole identity and the application to hand it
to.

```json
{
  "sourceRelativePath": ".claude/skills/deploy/SKILL.md",
  "source": "repository",
  "target": "visual-studio-code"
}
```

The committed Source-relative Path, the Source that holds it — `repository` or
`global-<member>`, exactly as `get-file-detail` names one — and one member of the closed
target set
`visual-studio-code | sublime-text | terminal-editor | default-application | containing-folder`.

Opens the named file in the named application on the machine the host runs on. The host
performs the launch because the absolute path is the host's: the client receives a
Source's root only as the one-way `displayRoot` escaping (data-model.md
§ SourceBoundary), so the page sends the same identity it addresses every other request
with and holds no path of its own. The identity is resolved against the current committed
generations before anything is launched, so the only absolute path a launch can receive
is one this session published (FR-022) — and the Source is what decides which root it is
joined with: the repository's selected root, or the exact admitted root that tool's
consent control retained. A path alone would open whichever Source the session lists
first, handing the reader a file from a root they did not address (FR-030).

What each target reaches:

- `visual-studio-code` and `sublime-text` reach an editor the host resolved for this
  machine before it bound its port — the editor's command on `PATH`, or the launcher
  inside a known installation location when the command is not on `PATH`. On macOS the
  document goes to the application by name rather than to that launcher, because an
  editor's own command-line script resolves the editor's user data directory from
  `HOME`: a host whose `HOME` is not the reader's own would start a second instance
  under it and open the file nowhere.
- `terminal-editor` opens a terminal window running the editor `$EDITOR` or `$VISUAL`
  names. When neither names a terminal editor — neither is set, or the one that is
  brings its own window — it runs `vi`, the editor POSIX makes the default, since
  nothing on a macOS install sets those variables. It appears only where the host can
  open that window — macOS, through the operating system's `osascript` automation
  host — and only when the editor's command resolves there.
  A terminal hosts a program by running a command line, so this is the one launch whose
  argument reaches a shell: the path is handed to a fixed script as an argument and put
  into that command line by the automation host's own POSIX-shell quoting, so an authored
  name holding shell metacharacters is still one literal argument. The wait on that host
  is bounded, because macOS gates the first such request behind a one-time consent dialog
  a reader may never answer.
- `default-application` hands the file to whatever this machine has registered for that
  kind of file.
- `containing-folder` hands the file's directory to the same registered handler, which
  is how each platform opens a folder in its own file manager. Nothing is selected
  inside it: what the reader asked for is the folder.

`fileOpenTargets` in the `get-session` snapshot is exactly the set this function accepts
on this machine, in the order a surface offers them. An editor the host did not resolve is
absent from it — the host verifies an editor's own executable, so a surface offers no
editor the host could not start. The two handler targets are different: they are always
present, because each is a hand-off to the platform's own handler launcher, and whether a
handler is registered for the file is that machine's own state, which no probe short of
launching answers. A machine whose launcher is missing or has no handler reports that
launch's ordinary error.
The result carries no payload: it reports that the launch was requested, and says nothing
about what the machine did with the file, which is that machine's business.

Outcomes: the command result with a null payload; or the `stale-resource` rejection when
the current committed generations hold no file at the path — never scanned, or removed by
the commit that replaced the snapshot the page was rendered from, which are
indistinguishable and answered alike. A target outside the closed set is a client this
product did not ship, and propagates as an ordinary error rather than a declared
functional outcome.

### `agent-customization-inspector:get-global-consent-preview`

Parameters: none.

Returns only the already-current process-memory preview. It never captures environment
values and never creates, replaces, or invalidates a preview. With active consent or a
registered initial enable it returns that exact frozen preview; while a disable fence is
non-null it returns the barrier's exact `frozenPreview` so the control-only recovery view can
display the consent being revoked. With neither a current unconsented preview nor a frozen
preview it returns the `consent-preview-missing` rejection. It remains a read-only
current-preview lookup and does not schedule work.

Outcomes: the current or frozen `GlobalConsentPreview`; the `consent-preview-missing`
rejection.

### `agent-customization-inspector:create-global-consent-preview`

Parameters: none.

Captures and atomically creates or replaces an unconsented lexical, process-scoped preview
before any proposed Global path is touched:

```text
GlobalConsentPreview
├── previewId, allowlistVersion, traversalPlanVersion
├── entries[] { member, origin, displayRoot, inputState }
└── excludedRuleIds[]
```

For every permitted create invocation after coordinator conflicts are checked, the server reads `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once each in that order. Only `undefined` is
absent; an empty string is present. It calls imported
`node:os.homedir()` exactly once for that request — the shared agent home member always
derives from it — and uses active-platform `node:path.join`
with fixed `.copilot`, `.claude`, or `.codex` suffixes for the corresponding absent entries
and the fixed `.agents` suffix for the shared agent home. A `member` is one of the closed
`copilot | claude | codex | agents` set — the three tool homes and the shared agent home
(FR-045) — and every `…Tools`-spelled control or batch field carries these member ids.
It does not independently select `HOME`, `USERPROFILE`, or another home source, and the
lexical capture/join performs no existence check. Those variables are used only to locate proposed
Global roots and never to substitute references inside inspected content. The frozen
internal preview record, which is never serialized, additionally keeps each entry's
`lexicalRoot` as the exact raw string. Empty, relative, invalid, control-containing, and
backslash-containing values remain exact raw strings with their separate `inputState`. `displayRoot` is
one-way presentation escaping derived from `lexicalRoot`; it is never decoded back into a
path or used as admission input. The preview
performs no `stat`, `realpath`, directory enumeration, or file read under a
proposed Global root. Node.js and the execution environment determine whether the value can
be retained and escaped. A throw/rejection during environment capture, `homedir()`, join,
retention, presentation encoding, or serialization reaches this pre-acceptance RPC boundary and
rejects the invocation with its ordinary error (no job or `scanRequestId` is created), creates no read authority, and
performs no normalization, canonicalization, root creation, or read. Otherwise `displayRoot` shows the exact escaped lexical value; invalid empty
or relative overrides are shown as invalid instead of falling back. A successful create
atomically replaces the prior unconsented preview only after its complete result is
bound. Active consent returns the `consent-preview-frozen` conflict rejection; a
registered enable returns the `global-enable-in-progress` conflict rejection; and a
disable fence returns the `global-disable-pending` conflict rejection, with no environment
recapture or state change. The read function
supplies the exact frozen preview for fresh-client recovery; a different preview requires
disable first. The preview is the one server-retained record identified by its opaque
`previewId`; enable and retry name that ID, and the server acts only on its own stored
record — there is no cryptographic re-verification of server-retained state.

The preview intentionally carries no per-pattern display: what is read below an admitted
root is fixed by the shipped static typed `TraversalPlan` that the retained
`allowlistVersion`/`traversalPlanVersion` pair identifies, and the consent copy explains
that scope in plain language.
After consent and root admission, an exact-file rule reads only its named file and never
enumerates the Global root; a fixed-instruction-subtree rule enumerates only the plan-named
instruction subtree for its walk. No operation lists, stats, or reads a sibling setting,
credential, state, plugin, or other neighboring path.

The Codex plan alone uses `codex-global-first-non-empty`: it reads
`AGENTS.override.md` first, short-circuits before any `AGENTS.md` operation when the
override is non-empty, and advances only from an absent or safely-read empty override.
`absent` means the override file does not exist. An unreadable or binary override ends
selection with its file Diagnostic (`file-unreadable` or `file-content-binary`) and no
fallback. An optional
leading UTF-8 BOM alone or whitespace-only content is empty under
`decodedText.trim().length === 0`; `utf-8-replaced` participates as ordinary text and every
`U+FFFD` is non-whitespace. At most one non-empty Codex instruction file is published.

Outcomes: the created `GlobalConsentPreview`; the `consent-preview-frozen`,
`global-enable-in-progress`, or `global-disable-pending` conflict rejection; or, for a
capture/serialization throw or rejection, that request's ordinary pre-acceptance error.

### `agent-customization-inspector:enable-global`

Parameters:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-08-27",
  "previewId": "opaque-preview-id"
}
```

Result data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── scanRequestId: opaque ID | null
├── acceptedTools[] (zero to four member enums)
└── rejectedTools[] (zero to four member enums)
```

The UI may send this only after showing all four exact Global member path sets, lexical input
states, and exclusions from that preview. The host rejects a false confirmation, stale
contract version, or superseded preview.

This is not the product's only confirmation: the launch command's own
`--inspect-personal-setup` option states the same decision before a host exists, and the
CLI runs the same registration, admission, settlement, and batch there — the sequence this
function performs, not the function (FR-013). It awaits the batch, so such a launch prints
its origin with the Global generation already committed, and the session then holds an
active consent: a confirmation sent to this function afterwards runs the same-preview
retry when the server-derived `retryableTools` is nonempty, and takes the
`no-retryable-global-tool` refusal when nothing is left to retry. It uses only
the stored internal raw `lexicalRoot` and stored typed traversal program; it never rereads
environment input or reverse-converts `displayRoot`.
The parameters intentionally have no member selector. Initial enable derives the exact fixed
`[copilot, claude, codex, agents]` set from all four frozen preview entries, including entries that
are already lexically invalid. A retry derives the exact current server-side
`retryableTools` subset: unpublished non-pending admitted controls and same-preview rejected
controls only. Lexical `new-preview-required` controls require disable and a new preview.
The client cannot add, omit, remove, or reorder a member.

After the confirmation fields are verified, the coordinator registers exactly one
`GlobalEnableOperation` and exposes only
`globalEnableInProgress { kind, operationId, previewId }` while one provisional transaction
evaluates the whole derived set. A duplicate enable returns the
`global-enable-in-progress` conflict rejection; no tool outcome, root, context, Source,
job, or authority is
published by that projection. Empty, relative, and invalid entries are deterministic
rejections with no filesystem call. An eligible absolute root that is missing or is not a
readable directory records that member as absent or failed without preventing the other
members from committing (FR-014). An unexpected throw or rejection that is not confined to
one member's files propagates to the RPC owner without domain classification. During initial enable
this occurs before job acceptance, rejects the invocation with its ordinary error (no
`scanRequestId` is created), activates no consent/control/job, and commits none of a provisional subset.
During retry, existing consent/control and the prior snapshot remain unchanged.
Either pre-acceptance failure unregisters `globalEnableInProgress`; no terminal operation
history is retained.

When validation finishes without such an exception, `acceptedTools` and `rejectedTools`
are disjoint, unique, fixed-member-order arrays whose union is every member evaluated by the
transaction. The coordinator atomically activates
initial consent with controls for all four members. If no root was admitted, it returns
`state: active-no-job`, null `scanRequestId`, no Source/job/generation, and keeps controls
for disable plus same-preview retry only where `retryDisposition` permits it. Otherwise it allocates one `scanRequestId`, transfers every
admitted root into one provisional batch scan, returns `state: queued`, and publishes no
Source before that batch's commit. The same atomic acceptance publishes
`globalControl.pendingTools` and `batchStatus` with the promoted `scanRequestId`, member set,
`phase: waiting`, and null `failureRef`; fresh polling can therefore recover a lost
acceptance result. Separate member roots remain separate Source
identities, but all ready/partial Sources in the admitted subset appear together in exactly
one Global generation — the enable commit creates the Global sequence at generation 1, and
a retry batch beside existing Global Sources commits that sequence's exact N+1; no poll can
observe a per-member commit. That one commit preserves stable Source IDs and semantic
content for carried Global Sources, invalidates
old Global detail/comparison/editor state, and clears the applicable deterministic member
failures; the Repository sequence, its generation, and Repository views are
untouched.

The operation checks its ID/epoch and non-aborted signal before and after each asynchronous
step, plus the same operation-local provisional state for initial enable or the same active
control snapshot for retry. Immediately before the one batch enqueue, the coordinator
atomically activates initial consent/controls or applies the retry partition and verifies
that resulting active control state. A disable-first ordering
drains and returns the `global-disable-pending` conflict rejection with no late mutation;
an operation-first queued acceptance remains its accepted disposition even if a later
barrier cancels the batch. A
throw/rejection after queued acceptance is the terminal failure for the same non-null
`scanRequestId`, commits no subset Source/generation, and preserves the prior snapshot. It
creates no Diagnostic or `StaleSourceFailure` for an initial/retry admitted-subset Global batch;
instead the one operation-wide failed-request error message is retained on the failed
`batchStatus`. A later retry and disable apply the exact clear/
supersede lifecycle defined on the session projection.

The exact same consent may be retried only while the server-derived `retryableTools`
projection is nonempty. That exact eligible subset, not mere Source absence, is derived by the
server and cannot be narrowed by the client. A different preview/root or lexical
`new-preview-required` control requires Global disable first. An empty projection returns
the `no-retryable-global-tool` conflict rejection; the presence of a non-retryable missing
tool creates no
separate active-consent conflict. Even an all-lexically-invalid preview may be
confirmed and returns the deterministic `active-no-job` state, so there is no separate
`no-eligible-global-root` outcome.

Outcomes: the acceptance result; the `consent-required`, `allowlist-version-mismatch`, or
`consent-preview-mismatch` rejection; the `no-retryable-global-tool`,
`global-enable-in-progress`, or `global-disable-pending` conflict rejection; or, for an
unexpected pre-acceptance throw/rejection, that request's ordinary error.

### `agent-customization-inspector:rescan-global`

Parameters:

```json
{ "sourceId": "opaque-enabled-global-source-id" }
```

Accepts one scan command for the identified enabled member Global Source only while
Global disable is not pending. `sourceId` is an opaque ID and never a path. The command uses
the same FIFO, dequeue-time base-generation, atomic publication, progress, invalidation, and
serialization rules as Repository rescan, applied within the Global sequence: a successful
commit is that sequence's exact N+1, invalidates only Global views, and leaves
the Repository sequence, its generation, and Repository views untouched, so
clients refetch only Global data. At most one scan command is running or queued
for that Source; a duplicate cannot silently coalesce or trigger a second read. Admission
returns `ScanAdmission { scanRequestId, source }`; the opaque request ID is identical in the
returned Source/progress, every later status for the command, and any generation it commits.

A failed Global rescan commits nothing and publishes zero partial results from the failed
attempt. It reports top-level `snapshotState: stale-after-fatal-rescan`, Source
`status: failed`, and null `progress`, while
retaining `enabled: true`, the exact consent and validated single-root record, the last
committed graph, and all IDs from that graph. This creates or replaces only that Source's
`staleFailures` entry, which explains that the retained snapshot is stale. A deterministic
returned failure references its actionable lifecycle Diagnostic; a throw/rejection not
confined to one file propagates past the domain
and is retained as the failed request's error message for this `scanRequestId`. A
later successful complete or partial rescan of the same Source replaces its graph atomically
and clears both; another Source's commit preserves both.

Outcomes: the acceptance result with the request ID and updated source summary; the
`stale-resource` rejection for an unknown or removed Source ID; the
`global-disable-pending` conflict rejection if Global disable is pending/active; or the
`scan-in-progress` conflict rejection for a duplicate running/queued scan for that Source.

### `agent-customization-inspector:disable-global`

Parameters: none.

Result data:

```text
GlobalDisableResult
├── state: disabled | no-op
├── operationId: opaque ID | null
├── commitKind: cleanup-only | remove-active-state | null
└── repositoryGeneration
```

This is the priority security barrier for all inspection data, not merely a Global Source
deletion command. Before sending it, the SPA performs the central full purge. A true no-op
is possible only when no active/queued Global authority or retained disable failure
exists. It uses
the ordinary pre-acceptance result-binding gate, returns null operation/commit kind with
the unchanged `repositoryGeneration`, does not increment `globalContentEpoch`, and does
not disturb Repository work. No disable disposition commits a generation in either
sequence: `repositoryGeneration` is always the unchanged Repository value, and after a
successful `remove-active-state` the Global sequence no longer exists, so the next full
snapshot reports `globalGeneration: null` (FR-042). If validation or result construction fails before barrier acceptance,
the invocation rejects with its ordinary error and mutates nothing; because
the fresh session has a null fence, the already-purged client may immediately recover a full
snapshot.

Every non-no-op first acceptance atomically allocates the barrier operation, increments the
command epoch and `globalContentEpoch`, irreversibly revokes publication authority, exposes
non-null `globalDisableInProgress`, changes an existing `globalControl` to `disabling`, and
clears its `pendingTools`, `retryableTools`, and `batchStatus`. It aborts the registered
`globalEnableInProgress` operation and Global scans, prevents any queued Global command from
dequeueing, and fences every generation-mutating command. Repository rescan requests then
return the `global-disable-pending` conflict rejection; already-running Repository work is
revoked and held for
one requeue only after terminal disable success. Global enable/rescan also returns that
conflict. The session function returns only `GlobalFenceRecoverySnapshot`; every other
inspection-data function returns the same conflict. Liveness continues to report the greater
epoch and non-null projection.

The first acceptance fixes `commitKind`. `remove-active-state` is selected exactly when
public Global consent/control/Source state exists. `cleanup-only` is selected only when the
barrier must cancel and drain an operation-local initial enable that published no such
state. The barrier drains every revoked continuation and performs the final
queued-Global-work
cancellation sweep. It never requeues interrupted Global work.
Expected cancellation creates no Diagnostic and retains no error.

A request received while the barrier is `draining` or `committing` joins the same
`operationId` and terminal result; disconnecting any transport does not cancel it. An
unexpected post-acceptance throw/rejection, including drain or final
assembly failure, rejects that still-pending invocation with
the real error; `globalDisableInProgress.state` becomes `failed` and retains the same
message as its `message` field, the
process remains alive, the prior generation stays internal, and every inspection-data fence
remains closed. No failed cleanup re-exposes content.

A later disable invocation in `failed` state starts or resumes idempotent cleanup with a
new operation that inherits the exact `commitKind`, base generation, frozen preview, and
already incremented
`globalContentEpoch`; retry does not increment the content epoch again. Another failure
supersedes the sole retained
disable error; terminal success alone clears it and removes the fence. Process restart is
the fallback when cleanup cannot be confirmed, but the request-owned failure itself never
exits the process.

Terminal success is result-bound and atomic. For `remove-active-state`, it discards the
entire Global generation sequence — all Global Sources, consent, controls, roots, preview,
stale failures, tool Diagnostics, and retained failure messages — commits no generation in
either sequence, clears the fence, and returns the unchanged `repositoryGeneration`; every
Repository generation-owned ID stays valid, and a later re-enable restarts the Global
sequence at generation 1 under the already-greater `globalContentEpoch` (FR-042). The held
Repository command is then requeued once and may later commit the Repository sequence's
N+1. For `cleanup-only`, it removes only the unpublished operation-local state, clears the
fence, and changes no committed state: both sequences' generations and generation-owned
IDs are unchanged. Concurrent joiners receive that same terminal result.

Outcomes: the result on no-op, joined success, retry success, or first-attempt success; or
the post-acceptance failure's ordinary error. Disable itself never returns
`global-disable-pending`.

## Concurrency and lifecycle

- One coordinator serializes scan transactions as a correctness invariant. It accepts one
  running or queued scan command per Source; duplicate scans conflict, while a scan for
  another Repository or member Global Source queues FIFO and reports the waiting
  phase. A failure confined to one file becomes that file's Diagnostic (FR-028); any other
  scan or admission throw/rejection propagates to the owning
  boundary without domain state mutation. Disable follows its priority barrier join/no-op rules. Every
  automatic or explicit scan receives one opaque `scanRequestId` and starts from its
  owning sequence's generation current when it actually dequeues.
- Work is stopped by revoking an attempt's publication authority, not by a cancellation
  signal: a revoked attempt's late result is discarded and its Source overlay reverts to the
  exact pre-admission state, so nothing it produced can commit. A read already in flight is
  allowed to finish, because interrupting it would buy nothing the discard does not already
  give. Process shutdown revokes every attempt before closing the host. Global disable is
  the priority barrier documented above: it revokes any active
  uncommitted transaction, aborts/drains enable validation, performs a final queued-Global-
  work cancellation sweep, completes its fixed cleanup-only or remove-active-state
  disposition next, and requeues an interrupted Repository command once only after terminal
  success. Operation completion is governed by Node.js and the execution environment.
  Disable, shutdown, supersession, or a propagated fatal operation failure irreversibly
  revokes publication authority. A file-confined outcome (FR-028) does not by itself revoke
  the attempt's publication authority. After revocation, every late byte,
  graph record, Diagnostic, and DTO result is discarded. Physical
  cancellation of an uncancellable kernel operation is not guaranteed.
- A successful complete or partial scan commits exactly N+1 in its owning sequence and
  regenerates that sequence's generation-owned graph IDs for the Sources it publishes — the
  scanned Source, and in a Global batch commit each newly published member Source — while
  carried Global Sources keep their records and IDs, invalidated only through the
  generation the snapshot adoption replaces; process-lifetime-stable Source IDs and
  the entire other sequence — its generation, IDs, and views — remain unchanged. It clears
  only the scanned Source's stale-failure
  entry and referenced failure and carries both for other Sources. A fatal explicit rescan discards every uncommitted
  result, including partial results, leaves the owning sequence's N and its IDs active,
  marks the retained
  session snapshot stale, and creates or replaces one `staleFailures` entry for the
  affected Source referencing an actionable lifecycle Diagnostic or carrying the failed
  request's error message, replacing both for that Source
  on repeated failure. Repository N may be legal bootstrap
  generation 0; the Global enable commit creates its sequence at generation 1, and disable
  discards that sequence without committing a generation (FR-042). Barrier cancellation
  emits none.
- Session retrieval never extends the Node process lifetime or persists data and defines
  no product-specific time threshold. There is no liveness probe: the product does not model
  a second browser tab, and a lost host closes the loopback socket, which the transport
  reports to the page without being asked. Every response is still
  checked, so a matching session with an equal epoch and a null disable projection confirms
  the current baseline.
  A greater epoch or non-null projection runs the central purge before entering control-only
  recovery; network/runtime failure, channel loss, or session mismatch
  purges before an ended view. A page-lifecycle event is not a purge trigger: FR-027 purges after a document-liveness failure or an equivalent terminal reset, and neither switching tabs nor navigating away is either — a discarded document frees its own memory, and a bfcached one holds the same user's view of their own files on their own machine, which the trusted-workspace model does not treat as exposure. The client installs no visibility or unload listener.
  The purge increments a
  client epoch so a late in-flight result cannot repopulate DTOs or editor state, disposes
  Monaco models/editors/workers and subscriptions, clears DOM/store content, and aborts
  pending requests. Closing the Node process destroys the
  server-side session state, complete source content, source roots, generations, and
  diagnostics.
- No session-channel invocation starts an MCP server, follows an import, opens an inspected
  URL, invokes a
  customization command, or writes to an inspected source; the host does not enable
  devframe's optional MCP route.
- Enabled inspection sources are enumerated/read only by the inspection module built
  on `node:fs/promises`. It accepts validated source IDs and source-relative enumeration
  records, never an arbitrary absolute path supplied by an API request, relationship, or
  source file, and it relies on
  Node.js, the operating system, and the execution environment for available capacity. Every open uses only
  read-only, non-create, non-truncate flags. The service never calls a write, append, create,
  truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
  equivalent mutation-capable primitive on an inspected source. Traversal is an ordinary
  recursive walk of the fixed inspection-path allowlist. Symbolic links are followed
  transparently, because the inspector shows what an agent reading the same path would see;
  a link whose target is missing or unreadable yields that file's `file-unreadable`
  Diagnostic, and recursive traversal tracks visited directories by real path so a link
  cycle cannot prevent a scan from terminating (FR-024). Hard links are ordinary files with
  no physical-identity grouping. A file whose read fails yields `file-unreadable`, and
  an admitted candidate's NUL-containing content yields `file-content-binary` — a
  census-listed companion's binary bytes yield none; each Diagnostic-bearing outcome is
  file-confined, keeps every unaffected file complete, and makes an otherwise publishable
  generation `partial` (FR-028). A selected root that does not exist or cannot be read as a directory fails the
  Source attempt with `root-unreadable` and publishes no generation for that attempt
  (FR-002). There is no repeated identity re-verification between operations, no
  race-detection taxonomy, and no ticket, receipt, or resource-registry machinery (FR-019).
- Mutation verification instruments the product's filesystem calls and compares fixture
  content, length, identity/link state, mode, modification/change time, and extended
  attributes or ACLs where observable before and after inspection. Access-time movement
  caused only by an OS read is recorded separately; it neither fails the no-product-mutation
  claim nor counts as proof of it, and the product never requests an access-time update.
  A failed read of one file yields that file's `file-unreadable` Diagnostic in a `partial`
  generation; a failure not confined to one file discards the incomplete
  attempt, commits no item/result/generation, and, when RPC-owned, surfaces as the
  request's ordinary error. Neither outcome is labelled valid, invalid, correct, incorrect, or
  lint-failing.
- The product runs in a workspace the user already trusts: inspected customization files
  are not modeled as an adversary, and a file that changes or disappears during a scan is
  handled by the per-file diagnostics above or by the next explicit rescan rather than by
  race-detection machinery. The retained obligations are that inspected content is never
  executed, the session host binds loopback only and is never exposed beyond the initiating
  machine, and displayed content is rendered inert.

## Required contract tests

1. Startup fixtures assert that the standalone host's listening socket is bound to a
   loopback address (IPv4 `127.0.0.1` or IPv6 `::1`, per the platform's `localhost`
   resolution) on every supported OS and that no configuration or flag binds `0.0.0.0`, a
   LAN address, or a Unix socket; the printed launch line carries the `localhost`
   authority.
   Channel fixtures prove that the product adds no token, session capability, bearer
   header, or origin classification to the session channel — the WebSocket origin gate
   there is devframe's own — and that the shipped documentation states
   the residual unauthenticated-loopback limitation (other local processes; DNS
   rebinding). Presentation-output tests cover help/version text, the one launch-URL
   line, and fixed startup warnings; an unexpected startup failure prints its ordinary
   error.
2. A detail request resolves its path against the committing sequence's new generation
   after a successful Repository/Global rescan — serving what that generation holds at the
   path or the `stale-resource` rejection when it holds nothing — while the other
   sequence's detail/comparison views stay valid; a `remove-active-state` Global disable
   fails every Global path while preserving every Repository file; `cleanup-only` changes
   no committed state and preserves both sequences' generations. A fatal
   explicit rescan publishes zero failed-attempt partials, retains the last committed
   snapshot, marks it stale, and carries exactly one failure
   representation: an actionable Diagnostic reference for a deterministic returned failure
   or the failed request's error message for a throw/rejection; the stale-failure fixture
   asserts that retained message is returned with the stale snapshot.
   Bootstrap generation 0 contains exactly one non-authorizing Repository Source selected
   from captured `process.cwd()`/`--root`. Multi-Source sequences prove that A and B entry-failure pairs
   coexist, B's success does not clear A, A's partial success clears only A's pair,
   a repeated A failure replaces only A's pair, and Global disable clears only pairs for
   removed Global Sources. Diagnostic DTO fixtures accept exactly the two scoped shapes:
   file with matching `sourceId`/`sourceRelativePath`, and source with only
   `sourceId`. There is no pathless shape — every diagnostic this product produces was
   produced while reading something, and the Source it was read under is the least context
   that makes it resolvable. Every missing, extra, mismatched, or fabricated
   source/file/path combination is rejected before serialization.
   Failure fixtures prove that a pre-acceptance throw/rejection rejects only its
   invocation and retains nothing, that an accepted scan-job failure is retained as the
   failed request's error message with its `scanRequestId` in exactly one lifecycle owner,
   and that an accepted disable-barrier failure is retained only as the failed
   `globalDisableInProgress` projection's `message`.
   A failed request leaves the session usable: the same channel immediately serves the
   retained prior snapshot afterward. Request-owned rejections reject with the real
   error without exiting the process; automatic startup read rejection reaches the process
   top level and makes no product process-liveness guarantee.
3. Readable file detail returns complete authored source and, for every key the file wrote,
   the value its parser resolved — credentials and environment-reference text included,
   without masks or reveal controls. There is one value per key: a key declared twice
   resolves to its later declaration.
   A file summary exposes no parse rollup at all; each inventory definition exposes its
   `not-attempted | parsed | failed` state and the extraction-failure reference of its
   kind — one record however many tools recognize it — which is where a reader learns
   what a parse did. Compatible provenance
   merges once inside the internal recognition record, and inconsistent meaning fails
   that extraction all-or-nothing. Comparison keys are
   `(kind, declared key)`, with tool recognition compared per tool beside the
   declarations. Astral characters, combining sequences, and ordinary BMP text
   prove that a declared value survives extraction and JSON transport whole.
   Every returned relationship tuple `(tool, kind, relationship kind)` must appear in the
   maintained presentation allowlist, and the exact authored occurrence must be supported by
   the extractor for the recognition's actual admitted source form. Tuple membership never
   transfers eligibility between source forms. No allowlist stands between an authored key
   and its publication: a skill's declarations are the keys the file wrote, and an authored
   key set is not closed. A reference the allowlist does not name remains available only
   through complete `sourceText` and never produces an inferred relationship.
   Evidence fixtures accept only `documented | partially-documented | unknown | conflict`
   and keep unique fixed-order `preview | experimental | deprecated` qualifiers
   separately, treating an empty qualifier array as no lifecycle claim. These are registry
   records; no response serializes one.
   Encoding fixtures prove an admitted candidate's NUL is binary/diagnostic-only/`partial`
   and a companion's is the plain binary fact, valid text is
   `utf-8`, and invalid non-NUL input is readable `utf-8-replaced` with every
   `U+FFFD` preserved through parsing, detail, and comparison without making the generation
   partial by itself. No alternate decoder is invoked.
   A fixed Codex default-hook fixture instead returns `targetOrigin: documented-default`,
   null `authoredTarget`, and an explicit documented-default label; an explicit manifest
   hook returns `targetOrigin: authored` with its exact occurrence. Sentinel process values
   prove that environment references are never resolved or substituted. Tests assert that no notice about authored content
   appears on a detail surface, that no
   confirmation step stands in front of a `FileDetail` request or a comparison, that no
   inventory or session response carries authored content, and that no reveal function
   exists in the RPC catalog. Direct RPC tests prove that no acknowledgement parameter or
   function exists: loopback binding, not a claimed server-side presentation gate, is the
   complete host-side protection.
   Cross-surface negative fixtures prove that Inventory, Detail, Comparison, Global
   controls, Diagnostics, API DTOs, CLI output, and documentation expose only
   the documented structural projections: no natural-language meaning/intent
   interpretation or ranking, correctness/validity/compliance/effectiveness/quality verdict,
   policy/remediation advice, validation, lint, synchronization, conversion, formatting, or
   fixing field or behavior is admitted.
4. A declared parameter validates by resolution: a `get-file-detail`,
   `get-mcp-carrier-detail`, `get-hook-carrier-detail`, or
   `get-permission-policy-detail` argument whose resource the
   invoked function does not hold — a value of another type, or another of those
   functions' resource, included — is the
   `stale-resource` rejection, an extra positional argument is never read and changes
   nothing, and an unknown function name is not registered
   and cannot be invoked. Contract tests prove that no request, file,
   collection, parser, snapshot, detail, or result DTO exposes or enforces a product-
   defined numeric capacity ceiling. Injected Node.js, parser, filesystem, and serialization
   failures that are not confined to one file bypass domain classification and reject at
   the owning RPC boundary as ordinary errors carrying the real message, never a partial
   result, incomplete
   generation, or validity/correctness/compliance/lint verdict; the session stays usable
   and the prior snapshot stays readable afterward. Escaping and key-order
   fixtures prove that one complete JSON-serializable result value crosses the
   channel unchanged and round-trips at the client.
5. Static traversal and encoded traversal attempts never escape the packaged `dist/public`
   output; every served byte comes from that packaged Nuxt output, no inspected file is
   ever served, and the root, `/global-consent`, each kind's comparison route
   (`/skills/compare/<family>`, `/instructions/compare/<family>`,
   `/mcp/compare/<family>`, `/prompts-and-commands/compare/<family>`,
   `/agents/compare/<family>`, `/hooks/compare/<family>`,
   `/plugins/compare/<family>`), and each kind's detail route
   (`/<kind>/detail/<source>/<source-relative path>` for `skills`, `instructions`, `mcp`,
   `hooks`, `rules`, `prompts-and-commands`, `permissions`, `agents`, `plugins`,
   `output-styles`, and `settings-and-configuration`) all boot the same packaged SPA
   shell, which embeds no session data. A detail path carries the Source and then the
   path because a file's
   identity is its Source and its Source-relative Path (FR-030); every comparison lives
   under its kind's own `compare` segment with the Source *family* after it, because a
   pair never spans two families — the repository and a consented home are different
   kinds of place, so each family block of a row owns its own comparison entry — while
   one family can hold files from two consented homes (FR-015 through FR-017, FR-045),
   which is why each side still names its own Source in the query. The `compare` segment
   comes first because a detail's second segment is a Source selector, which `compare`
   never is: no Source-relative path — a Codex fallback filename spelled `compare`
   included — can collide with a comparison route.
6. Queue ordering across Repository and each member Global rescan, duplicate
   rejection, aborts, partial outcomes, fatal failures, and polling expose only
   whole generations. A scan queued behind another Source starts from its owning
   sequence's then-current generation, and a commit in one sequence leaves the other
   sequence's committed state observable unchanged. A `remove-active-state` barrier
   discards the Global sequence without committing a generation and leaves the Repository
   sequence at unchanged N before the held Repository command may commit N+1; a later
   re-enable restarts the Global sequence at generation 1 under the already-greater
   `globalContentEpoch`, so a Global result from the discarded era can never be adopted. A
   `cleanup-only` barrier changes no committed state, and a true no-op
   leaves both sequences and Repository work untouched. No barrier exposes an aborted transaction, and
   the one accepted Repository command is requeued once only after terminal success.
   Concurrent disable during `draining`/`committing` joins one operation/result; a later
   request after `failed` resumes the inherited cleanup. A paused validation/admission operation is
   aborted and drained before the final cancellation sweep; releasing its late continuation
   afterward creates no mutation, diagnostic, context, ID, or job. Injected unexpected
   admission rejections propagate to their outer boundary, leave domain state unchanged,
   and do not depend on a product-defined slot count. Deterministic barrier-ordering fixtures pause the operation (a) while
   validation is awaited, (b) after admission but before any control/context/diagnostic
   mutation, and (c) immediately before job enqueue/final result disposition. At every
   pause, a barrier-first ordering returns the `global-disable-pending` conflict rejection,
   permits no late side effect, unregisters
   the operation, and allows a later enable; an operation-first final disposition remains
   the committed queued acceptance even when the result is delivered after disable
   acceptance.
   Fence fixtures prove first non-no-op acceptance increments `globalContentEpoch` and
   immediately makes the session function control-only while every other inspection-data
   function
   returns the `global-disable-pending` conflict rejection, including throughout retained
   `failed`. They inject
   a post-acceptance drain rejection, and verify that the
   failed request's error message is retained only in `globalDisableInProgress.message`
   while `state: 'failed'`, plus process
   survival, no content re-exposure, and idempotent retry.
   Separate deterministic delivery pauses hold a data result before or across scan commit
   and disable acceptance. They prove that result epoch/generation and payload never mix,
   a result not yet bound when the fence linearizes becomes the conflict rejection, and a
   result already bound is
   treated only as the documented bounded pre-fence response and is purged when the client
   observes the greater epoch/fence. Older results are ignored; adopting a newer
   generation for one sequence aborts and disposes only that sequence's state while the
   other sequence's detail/comparison views survive the commit; and detail is adopted only
   when its captured epoch and path still match. Disable,
   shutdown, supersession, and injected assembly/serialization rejection
   tests leave a filesystem
   promise pending, revoke publication authority, and prove that every late result is
   discarded and that the correct outer boundary alone surfaces the failure — an ordinary
   RPC error or startup
   top-level propagation. A separate file-confined case — an unreadable file, binary
   content, or a parse failure — proves `partial`
   publication with the affected file's Diagnostic and every unaffected complete file,
   without revoking the whole attempt. An unreadable root instead proves a failed Source
   attempt with `root-unreadable` and no generation. Tests do not assert hard cancellation of the underlying Node.js/kernel
   operation or a product-defined completion deadline.
7. Reloading every client route discloses no session data: the served shell embeds no
   snapshot, and the freshly loaded SPA adopts state only through the loopback RPC channel.
   Session-response and recovery tests cover an ordinary request rejection staying
   request-local, channel loss, port reuse with a different
   `sessionId`, older/equal/greater epochs, null/draining/committing/failed projections, and a late in-flight
   result after the client epoch changed; none may leave or automatically restore pre-purge inventory,
   detail, comparison, editor, or authored-content DTO/DOM state. With active consent, recovery after a greater epoch, non-null fence, or
   explicit Resume reconnects over the loopback channel, adopts the returned `sessionId`
   without retaining/comparing the purged ID, and constructs only the closed recovery
   projections. Disable is available from
   active control/enable state immediately; draining/committing joins or waits, failed offers
   retry-disable, and retrieving/verifying the same frozen preview rebuilds only eligible
   retry controls. The explicit Resume inspection action is absent while the fence is
   non-null. With a null fence the page re-fetches a matching full session and constructs a
   fresh inventory summary with default state, but restores no
   pre-purge authored content, selection, filter, detail, comparison, or editor state. A
   later detail/comparison request fetches it again from the fresh session.
   Pre-acceptance disable failure and true no-op both leave a null fresh-session fence so a
   purged client can resume immediately.
8. A Global consent preview touches no proposed path, confirmation names the one
   server-retained preview by its `previewId` — binding the exact raw internal
   `lexicalRoot` values and typed traversal-plan version/program it retains — and
   a changed or superseded preview cannot authorize a read.
   Only the create function captures the three environment inputs plus the always-derived shared agent home and atomically creates or
   replaces an unconsented preview; the read function performs zero capture and returns only
   the current or
   frozen preview, including through the disable fence. Missing-current, active-consent,
   in-progress-enable, and disable-fence cases return their documented closed outcomes with
   no accidental replacement.
   Escape-collision, control-character, and backslash fixtures prove that
   enable uses only the stored raw value, never an environment reread or
   `displayRoot` reverse conversion. The parameters have no tool selector and initial
   enable always
   evaluates all four frozen entries. Missing or unreadable consented roots and
   deterministic lexical outcomes partition rejected tools from admitted ones; an
   unexpected throw/rejection
   rejects the invocation with its ordinary error, activates no initial control/job, and
   commits none of a provisional subset. Provisional enable work publishes no Source. One
   successful complete or partial batch commit produces one to four separately
   identified Global Sources together in exactly one Global generation, at most one per tool and
   exactly one root per Source; no cross-tool merge or observable per-tool commit occurs. An
   accepted batch throw/rejection not confined to one file retains the failed request's
   error message on the failed `batchStatus` for its one
   `scanRequestId`, commits no Source/generation, and creates no Diagnostic. Both prior-current and
   prior-stale cases are tested. Initial activation with every root deterministically
   rejected, including an all-lexically-invalid preview, yields the deterministic
   `active-no-job` acceptance, zero
   jobs/Sources, and an active `globalControl`. Its `retryableTools` contains exactly the
   same-preview subset; an all-lexically-invalid preview has none and requires disable/new
   preview. An all-rejected retry likewise creates zero new jobs/Sources while
   preserving existing Source semantic content and stable `sourceId` values without a
   generation commit. Partial acceptance partitions every evaluated tool. Every successful
   initial or retry batch publication advances the Global sequence exactly once — the
   initial enable commit creates it at generation 1 — and invalidates only old Global
   detail/comparison/editor state; Repository views survive unchanged. Successful
   publication clears its control diagnostic, unrelated outcomes preserve it, and disable
   removes every control diagnostic/context even when no Global Source was ever published.
   During initial and retry validation/admission, only `globalEnableInProgress` is newly
   visible: initial enable keeps `globalControl` null and retry keeps its exact
   pre-operation control projection. At result-bound queued acceptance, only accepted-batch
   tools appear in `pendingTools`, and `batchStatus` exposes the exact promoted request ID,
   tools, and active phase. Terminal deterministic and thrown/rejected failures use their
   exact closed `failureRef` variants; lost-acceptance recovery retains the status, while
   success,
   retry acceptance, and disable apply the contracted clear/replace lifecycle. An `unvalidated`
   active control is never retryable. During a
   mixed activation, already rejected/non-pending admitted tools may appear in
   `retryableTools`, but retry stays disabled and returns the `global-enable-in-progress`
   conflict rejection
   until `pendingTools` is empty; disable is available throughout.
   Injected unexpected admission rejections leave consent/control/Source state unchanged
   and surface only the invocation's ordinary error; every terminal outcome proves no
   stray operation history is retained.
   A fatal initial scan followed by a retry with a changed or now-unreadable retained root
   discards the old operation-local context and its unpublished IDs and leaves a rejected
   control with no authority before any later re-admission.
   An exact-active-consent retry derives the server's exact `retryableTools` subset; lexical
   `new-preview-required` controls and changed consent require disable/new preview first.
   Traversal fixtures prove that public patterns are derived from
   the typed plan, an exact Global target is read without enumerating the Global root, a
   fixed instruction-subtree walk enumerates only that subtree,
   and no neighboring setting, credential, state, or plugin path receives I/O.
9. The inspection module reads only allowlisted inspection paths on
   every supported OS. A symlinked customization file is read transparently and its linked
   content is displayed like any other file's; a link whose target is missing or unreadable
   yields the file-scoped `file-unreadable` Diagnostic in a `partial` generation. A
   directory-link cycle fixture proves that recursive traversal tracks visited directories
   by real path and terminates. Hard-linked entries are ordinary independent files with no
   grouping, alias, or read-once behavior. An unreadable file yields `file-unreadable` in a
   `partial` generation with every unaffected file complete; an unreadable root yields
   `root-unreadable` and a failed Source attempt with no generation.
   Instrumentation rejects every mutation-capable open flag and every write, append, create,
   truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
   equivalent call. Before/after fixtures prove unchanged content, length, identity/link
   state, mode, modification/change time, and extended attributes or ACLs where observable.
   OS-only access-time movement is recorded separately, is neither a failure nor proof, and
   no product call requests it. Operation lifecycle is managed without
   a product-defined concurrency ceiling.
10. The packaged CLI boots the devframe standalone adapter with authentication disabled:
    fixtures assert `auth: false`, the packaged `dist/public` UI directory, and the
    `agent-customization-inspector:` function namespace, and prove that `--no-open` opens
    no browser while inspection stays usable when automatic opening is disabled,
    unsupported, or fails (FR-001, FR-022). Package integrity, dependency-closure, and
    packed-file assertions are owned by package tests and release gates; the runtime
    performs no manifest or sibling-artifact re-verification (Constitution Principle I),
    and no packaging fixture classifies customization-file content.
11. Every automatic and explicit scan receives a unique opaque `scanRequestId`. Repository
    and Global rescan admission results, Source summaries, waiting/active/final progress,
    fatal status, and successful generation records preserve the same ID; stale or prior
    request state cannot satisfy the newer request. The SC-002 browser protocol starts a
    fresh process, waits for the automatic Repository scan to reach a terminal state outside
    timing, dispatches exactly one explicit Repository rescan, captures its admission ID,
    and stops the status and inventory timers only for visibly rendered state and the
    committed Repository generation associated with that same ID. Evidence records both
    the ID and Repository generation, and an already-rendered automatic inventory cannot
    qualify.
