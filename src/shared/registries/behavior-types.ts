// The `VendorBehaviorStatement` record shape and its closed vocabularies
// (data-model.md § VendorBehaviorStatement).
//
// Declared apart from the aggregate so each vendor catalog can author against
// the shape without importing the module that collects those catalogs, which
// would be a cycle. Ships zero runtime code — the `-types` name records that
// (see `src/shared/api-types.ts`).
import type { DocumentationStatus, LifecycleQualifier, SupportedTool } from '../entities';
import type { BehaviorId } from './identifier-types';
import type { EvidenceCitation } from './evidence-types';

/**
 * The closed product-surface vocabulary a behavior statement is scoped to
 * (data-model.md § VendorBehaviorStatement `surfaces`): there is no implicit
 * "all surfaces", so two surfaces with different bases or traversal are two
 * behavior IDs even when the relative filename matches. Members arrive with
 * the vendor phase that documents them.
 */
export type VendorSurface =
  /**
   * The Claude Code CLI plus the VS Code and JetBrains IDE integrations, which
   * consume the same skill locations — the CLI with the full feature set and
   * the IDEs with a documented subset (contracts/vendors/claude-code.md
   * § Repository vendor behavior, "CLI full; IDE subset"). Which surface is
   * running stays a `surface` condition; this member never claims feature
   * parity across the clients it names.
   */
  | 'claude-cli-and-ide-clients'
  /**
   * The ChatGPT desktop app, Codex CLI, and Codex IDE extension, which share
   * one local Codex host configuration
   * (contracts/vendors/openai-codex.md § Surface boundary). Hosted ChatGPT
   * Work is deliberately not part of this surface: it reads no local file.
   */
  | 'codex-local-clients'
  /**
   * Local Copilot Chat and local agent mode inside VS Code. A cloud-agent
   * session started from VS Code is `copilot-cloud`, not this surface
   * (contracts/vendors/github-copilot.md § Surface boundary). Separate from
   * the CLI and Cloud surfaces because the three document different lookup
   * bases and incompatible selection, and two surfaces with different bases
   * are two behavior IDs even when the relative filename matches.
   */
  | 'copilot-vscode'
  /** Local GitHub Copilot CLI (contracts/vendors/github-copilot.md § Surface boundary). */
  | 'copilot-cli'
  /**
   * Copilot cloud agent and hosted Copilot services: the hosted surface that
   * processes a repository on GitHub's side and relays organization or
   * enterprise state. It must not inherit a local user-home locator merely
   * because another surface supports a similarly named customization
   * (contracts/vendors/github-copilot.md § Surface boundary).
   */
  | 'copilot-cloud';

/**
 * Which documented ownership scope a behavior belongs to
 * (data-model.md § VendorBehaviorStatement `vendorScope`).
 */
export type VendorScope =
  /** A repository or workspace the user has open. */
  | 'repository'
  /** The invoking user's own home/profile configuration. */
  | 'user'
  /** A hosted, organization, enterprise, or managed input. */
  | 'hosted-managed'
  /** A plugin's own packaged content. */
  | 'plugin'
  /** State that exists only while the product runs. */
  | 'runtime-only';

/**
 * The closed locator base a documented lookup starts from
 * (data-model.md § VendorBehaviorStatement `lookupBase`). It records the
 * vendor's own starting point and never the Inspector's Source boundary.
 */
export type LookupBase =
  /** The editor workspace root. */
  | 'workspace-root'
  /** The Git or product repository root. */
  | 'repository-root'
  /** The product's runtime working directory. */
  | 'runtime-cwd'
  /** The chain of directories above a target file being worked on. */
  | 'target-path-chain'
  /** The product's own home directory, such as `CODEX_HOME`. */
  | 'tool-home'
  /** User profile data outside the product home. */
  | 'profile-data'
  /** An already-active configuration layer. */
  | 'active-config-layer'
  /** A registered plugin or skill catalog. */
  | 'registered-catalog'
  /** Service-side state with no local path. */
  | 'hosted-state'
  /**
   * The documentation names a relative location without anchoring its base.
   * A specific member here would assert an anchor the vendor never wrote —
   * exactly the guess this registry must not record — so the gap is stated as
   * itself and the record's `documentationStatus` carries it. Copilot CLI's
   * legacy `.claude/commands/` is the case: its reference implies a project
   * location but establishes no anchor (contracts/vendors/github-copilot.md
   * § Known conflicts and uncertainties item 3).
   */
  | 'undocumented';

/**
 * The closed traversal shape of a documented lookup
 * (data-model.md § VendorBehaviorStatement `traversal`). This describes the
 * *vendor's* walk and never the Inspector's: an upward member here does not
 * put a recursive token in any matcher, and lookup base, relative selector,
 * and traversal stay three separate closed fields.
 *
 * An upward member names where the walk stops, because that is what decides
 * whether a given directory is reached at all. A vendor that terminates
 * somewhere else needs its own member: one member covering several stop
 * conditions would name neither the direction nor the stop.
 */
export type VendorTraversal =
  /** Exactly one path below the base. */
  | 'exact'
  /**
   * An upward walk that stops at the repository root: the base directory, then
   * each parent in turn, ending with the repository root itself.
   *
   * How a vendor recognizes that root is its own business and belongs in the
   * record: Codex takes the nearest ancestor holding a project-root marker
   * (`project_root_markers`, default `.git`, user-overridable), while Claude
   * Code's documentation simply says the Git repository root.
   */
  | 'ancestor-chain-to-repository-root'
  /**
   * An upward walk that does not stop at a repository: the base directory,
   * then each parent, continuing toward the filesystem root.
   *
   * Separate from the repository-bounded member because the two reach
   * different directories from the same base, which is the whole content of an
   * upward shape. Claude Code's `CLAUDE.md` ancestor walk is documented this
   * way (`claude.behavior.repo.instructions.ancestor`,
   * contracts/vendors/claude-code.md § Documented Repository behavior).
   */
  | 'ancestor-chain-to-filesystem-root'
  /** A fixed list of standard locations. */
  | 'standard-location-chain'
  /** Everything below the base. */
  | 'recursive-under-base'
  /** Descendants resolved lazily when something references them. */
  | 'lazy-descendant'
  /** Only what an explicit registration names. */
  | 'explicit-registration'
  /** No traversal: the base itself is the subject. */
  | 'none';

/**
 * Where a documented lookup starts and how it walks
 * (data-model.md § VendorBehaviorStatement). Grouped into one field because
 * the four parts are one description of the vendor's own locator, and because
 * a packaged CLI drops all four together (`SHIPS_MAINTENANCE_DATA` (src/shared/registries/maintenance-data.ts)) —
 * modelling them as four independently nullable fields would let a record be
 * half-described, which no build produces.
 *
 * This is never an Inspector matcher: it grants no read authority and carries
 * no glob semantics (contracts/inspection-path-allowlist.md § "Vendor locators
 * are not Inspector matchers").
 */
export interface VendorLocator {
  /** Which documented ownership scope the behavior belongs to. */
  readonly vendorScope: VendorScope;
  /** Where the documented lookup starts; see {@link LookupBase}. */
  readonly lookupBase: LookupBase;
  /**
   * The vendor's own relative path text, or null when the behavior names no
   * path. It is documentation prose.
   */
  readonly relativeSelector: string | null;
  /** The documented traversal shape; see {@link VendorTraversal}. */
  readonly traversal: VendorTraversal;
}

/**
 * One maintained interpretation of documented vendor lookup behavior
 * (data-model.md § VendorBehaviorStatement). Fields match that table
 * one-for-one.
 *
 *
 * Cross-registry references are not fields here: they live in
 * `relation-types.ts` and each vendor's `<tool>/relations.ts`, so a record
 * describes only what the thing is. A behavior has no outgoing edge at all —
 * its evidence is its own `evidence` array rather than a reference, and it
 * deliberately has no edge to a strategy, which is what keeps the graph
 * acyclic.
 */
export interface VendorBehaviorStatement {
  /** Stable ID from the closed catalog, defined once in one bilingual vendor contract. */
  readonly behaviorId: BehaviorId;
  /** The product this statement describes. */
  readonly tool: SupportedTool;
  /** Non-empty surfaces the statement is scoped to; never an implicit "all". */
  readonly surfaces: readonly VendorSurface[];
  /**
   * Where the vendor looks and how it walks, or null in a packaged CLI; see
   * {@link VendorLocator} and `SHIPS_MAINTENANCE_DATA` (src/shared/registries/maintenance-data.ts). The four parts
   * are one field because they are one description: a build either keeps the
   * whole locator or drops it, and no record is ever half-described.
   */
  readonly locator: VendorLocator | null;
  /** How completely official sources establish this statement (QR-005). */
  readonly documentationStatus: DocumentationStatus;
  /** Upstream lifecycle claims in the fixed order; empty is not `stable`. */
  readonly lifecycleQualifiers: readonly LifecycleQualifier[];
  /**
   * The reviewed official sections this record was checked against, and what
   * each establishes. Empty in a packaged CLI: citations are maintenance
   * evidence the product never reads (see `evidence-types.ts`).
   */
  readonly evidence: readonly EvidenceCitation[];
}
