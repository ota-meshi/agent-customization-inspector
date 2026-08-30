// The Global consent domain: the no-I/O preview a reader confirms before any
// User-Global path is authorized (contracts/http-api.md
// § get-global-consent-preview, § create-global-consent-preview;
// data-model.md § GlobalRootInputCapture, § GlobalConsentPreview).
//
// Global inspection is disabled in every new session, and consent is what
// authorizes reading the customization files the allowlist names below the
// four member roots — the three product home directories and the shared agent
// home (FR-045). This module owns everything that happens before that:
// capturing the three environment properties, deriving the shared agent home
// from the one homedir() capture, deciding each captured string's lexical
// state, escaping it for display, and retaining the one preview record the
// later enable request names.
//
// Threat-model boundary. The whole point of the preview is that it grants
// nothing and touches nothing:
//
//  - It performs no filesystem or network operation. No `stat`, `realpath`,
//    directory enumeration, or file read happens under a proposed Global root,
//    so a reader reviewing the preview has not yet let this product look at
//    their home directory. `node:path.join` and `node:path.isAbsolute` are
//    lexical string functions and are the only path operations here.
//  - It never normalizes, canonicalizes, or creates a root. An empty,
//    relative, or ill-formed override is displayed as what it is and never
//    falls back to the documented default: silently substituting a usable root
//    for an unusable one would authorize a directory the reader never set.
//  - `lexicalRoot` — the exact captured string — stays in the retained record
//    and never crosses the channel. What a client sees is `displayRoot`, the
//    one-way injective escaping, which is never decoded back into a path and
//    never used as an admission operand.
//
// Residual limitation: whether a captured string can be retained and escaped
// at all is inherited from Node.js, the operating system, and the browser. A
// throw or rejection anywhere in the capture reaches the session-API request
// boundary and fails that request with its real error, before acceptance,
// creating no preview, consent, root, Source, or authority — there is no
// catch, no cause classification, and no partial record.
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';

import { INSPECTION_RULES } from '../../shared/registries/inspection-rules';
import { admitGlobalRoot } from '../inspection/global-admission';
import type {
  GlobalEnableMember,
  GlobalMemberPort,
  GlobalResolvedOutcome,
} from '../session/global-control';
import { createOpaqueId, encodeRootPresentation } from '../../shared/entities';
import type { SupportedTool } from '../../shared/entities';
import type { RuleId } from '../../shared/registries/identifier-types';
import type {
  GlobalConsentPreviewDto,
  GlobalMemberId,
  GlobalPreviewEntryDto,
  GlobalRootInputState,
  GlobalRootOrigin,
} from '../../shared/api-types';

/**
 * The three tool homes located by their own environment properties, in the
 * contracted capture order. The shared agent home is deliberately absent: no
 * documented setting relocates it, so its entry is always the derived default
 * (FR-045) and the capture appends it after these three, completing the
 * contracted member order (`GLOBAL_MEMBER_ORDER`, api-text.ts).
 */
const GLOBAL_TOOL_HOME_ORDER: readonly SupportedTool[] = ['copilot', 'claude', 'codex'];

/**
 * How each tool's home is located: its own environment property, and the
 * directory name joined to the captured home when that property is absent
 * (contracts/http-api.md § create-global-consent-preview). Both halves are
 * fixed literals of the vendor contracts — this product chooses neither.
 */
const GLOBAL_HOME_SOURCES: Readonly<
  Record<SupportedTool, { readonly variable: string; readonly defaultSuffix: string }>
> = {
  /** Copilot's `COPILOT_HOME`, defaulting to `.copilot` in the home directory. */
  copilot: { variable: 'COPILOT_HOME', defaultSuffix: '.copilot' },
  /** Claude's `CLAUDE_CONFIG_DIR`, defaulting to `.claude` in the home directory. */
  claude: { variable: 'CLAUDE_CONFIG_DIR', defaultSuffix: '.claude' },
  /** Codex's `CODEX_HOME`, defaulting to `.codex` in the home directory. */
  codex: { variable: 'CODEX_HOME', defaultSuffix: '.codex' },
};

/**
 * One member's root as the capture produced it: the exact captured string,
 * where it came from, and the state the ordered algorithm assigned it.
 *
 * Constructed in exactly one place — {@link GlobalRootInputCapture} — so the
 * constructor is where a reader sees how each field came to hold what it does
 * (AGENTS.md § Class and interface policy).
 */
export class GlobalPreviewEntry {
  /** The member this entry is about. */
  public readonly member: GlobalMemberId;

  /** Whether the root came from the environment property or the default home. */
  public readonly origin: GlobalRootOrigin;

  /**
   * The exact captured string, internal only. It is the one value admission
   * may later use as a filesystem operand, and it is never serialized, never
   * logged, and never derived from {@link displayRoot}.
   */
  public readonly lexicalRoot: string;

  /**
   * One-way `RootPresentationEncoding` of {@link lexicalRoot}: display-only,
   * injective, and never decoded. It exists so a client can show the reader
   * exactly which directory is proposed without the string itself becoming a
   * path the client could hand back.
   */
  public readonly displayRoot: string;

  /**
   * The ordered lexical state, assigned before any I/O. Only `eligible` may
   * become a boundary after consent (data-model.md § GlobalConsentPreview).
   */
  public readonly inputState: GlobalRootInputState;

  /**
   * Builds one entry from a captured string, applying the ordered state
   * algorithm and the presentation encoding. No step normalizes the string,
   * changes separators, calls the filesystem, or chooses another root.
   */
  public constructor(member: GlobalMemberId, origin: GlobalRootOrigin, lexicalRoot: string) {
    this.member = member;
    this.origin = origin;
    this.lexicalRoot = lexicalRoot;
    this.inputState = classifyGlobalRoot(origin, lexicalRoot);
    this.displayRoot = encodeRootPresentation(lexicalRoot);
  }

  /** The public row: everything but the exact captured string. */
  public toDto(): GlobalPreviewEntryDto {
    return {
      member: this.member,
      origin: this.origin,
      displayRoot: this.displayRoot,
      inputState: this.inputState,
    };
  }
}

/**
 * Assigns the Global lexical state in the exact contracted order
 * (data-model.md § RootPresentationEncoding and Global lexical state). The
 * order is what the branches encode, and it matters: an empty override is
 * `present-empty` rather than `relative`, and an ill-formed string is
 * `invalid` rather than being run through `isAbsolute` for a verdict about
 * characters no path can hold.
 *
 * Exported for the unit suite, which drives every branch directly: the states
 * are the whole product of this module before consent, and asserting them
 * through a captured preview would test the capture as well.
 */
export function classifyGlobalRoot(
  origin: GlobalRootOrigin,
  lexicalRoot: string,
): GlobalRootInputState {
  // 1. Only a present override can be empty; an absent property selects the
  //    documented default, whose join is never empty.
  if (origin === 'environment' && lexicalRoot.length === 0) {
    return 'present-empty';
  }
  // 2. U+0000, or UTF-16 that is not well formed. `isWellFormed` is the
  //    platform's own answer to the surrogate half of this question, so no
  //    hand-written pair scan stands beside it (AGENTS.md § Platform baseline
  //    policy); the NUL test is separate because a NUL is well-formed UTF-16.
  //
  //    Measured 2026-08-27 on Node 24 / darwin: neither trigger survives
  //    `process.env` there — assigning a NUL truncates the value at it, and a
  //    lone surrogate comes back as U+FFFD, which is well formed. So this
  //    branch is unreachable through a POSIX environment and is kept for the
  //    platforms whose environment block is UTF-16, where a lone surrogate can
  //    round-trip. Reaching it is the unit suite's job, which calls this
  //    function with the string directly.
  if (lexicalRoot.includes('\u0000') || !lexicalRoot.isWellFormed()) {
    return 'invalid';
  }
  // 3. Active-platform absoluteness, which is a lexical question about the
  //    string and not a claim that the directory exists.
  if (!isAbsolute(lexicalRoot)) {
    return 'relative';
  }
  // 4. Every other absolute spelling, including one outside the ordinary home:
  //    location alone neither rejects a root nor grants a pre-consent read.
  return 'eligible';
}

/**
 * One request's capture of the three environment properties and, exactly once,
 * the home directory (data-model.md § GlobalRootInputCapture).
 *
 * The capture is operation-local: a new one is created for each permitted
 * create invocation, and a failed capture is discarded whole rather than
 * leaving a half-built preview behind. Retrieval of an existing preview never
 * constructs one, which is what makes the read function non-mutating.
 */
export class GlobalRootInputCapture {
  /**
   * The four entries in the contracted order — the three tool homes, then the
   * shared agent home — each carrying the exact captured string that produced
   * it.
   */
  public readonly entries: readonly GlobalPreviewEntry[];

  /**
   * Reads `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once
   * each in that order, then calls `node:os.homedir()` exactly once per
   * capture: the shared agent home always derives from it, and an absent
   * property's default joins against the same one string (FR-013).
   *
   * Only a captured `undefined` is absent: every string, `''` included, is a
   * present override. This product does not read `HOME`, `USERPROFILE`, or any
   * other platform home input itself — `homedir()` owns that behavior, and
   * duplicating its choice here would be a second, drifting answer to a
   * question the platform already answers.
   */
  public constructor(environment: NodeJS.ProcessEnv = process.env) {
    const captured = GLOBAL_TOOL_HOME_ORDER.map(
      (tool) => [tool, environment[GLOBAL_HOME_SOURCES[tool].variable]] as const,
    );
    // One `homedir()` call for the whole request: a capture whose defaults
    // came from several calls could show two different homes for one reader,
    // and the shared agent home below needs it unconditionally (FR-045).
    const capturedHomedir = homedir();
    this.entries = [
      ...captured.map(([tool, value]) =>
        value === undefined
          ? new GlobalPreviewEntry(
              tool,
              'default-home',
              // The join is lexical and performs no existence check.
              join(capturedHomedir, GLOBAL_HOME_SOURCES[tool].defaultSuffix),
            )
          : new GlobalPreviewEntry(tool, 'environment', value),
      ),
      // The shared agent home: always the derived default, because no
      // documented setting relocates `~/.agents` (FR-045) — an environment
      // origin here would claim a property no vendor documents.
      new GlobalPreviewEntry('agents', 'default-home', join(capturedHomedir, '.agents')),
    ];
  }
}

/**
 * The one server-retained preview record, identified by its opaque
 * `previewId` (data-model.md § GlobalConsentPreview).
 *
 * Memory only: nothing about a preview is written to disk, so a preview does
 * not outlive the process that captured it. Its `previewEpoch` is internal and
 * never serialized — it is what binds replacement and revalidation without
 * making an opaque ID carry an order it does not have.
 */
export class GlobalConsentPreview {
  /**
   * Canonical unpadded base64url encoding of an independent 32-byte CSPRNG
   * draw: 43 characters, and a process-memory lookup key rather than any grant
   * of authority.
   */
  public readonly previewId: string;

  /**
   * Monotonic capture counter, internal and never serialized. A later request
   * naming an older epoch is naming a preview this one replaced.
   */
  public readonly previewEpoch: number;

  /** The capture this preview froze; its entries hold the exact roots. */
  public readonly entries: readonly GlobalPreviewEntry[];

  /** The presentation-allowlist contract version this preview binds. */
  public readonly allowlistVersion: string;

  /** The compiled traversal-plan set version this preview binds. */
  public readonly traversalPlanVersion: string;

  /**
   * The Global-scoped excluded rules' IDs, sorted. Derived from the shipped
   * registry at capture time rather than authored beside it: an exclusion list
   * maintained separately from the rules could disagree with them, and what
   * the consent page states is what the shipped catalog excludes.
   *
   * Global-scoped, not every exclusion: a Repository exclusion says nothing
   * about what consent to read a home directory covers, and putting one in
   * front of a reader deciding that would describe the wrong boundary. The
   * list holds whatever Global-scoped exclusions the shipped catalog
   * carries — the consent page states its scope in plain language either
   * way, so an empty list would state a scope with no per-tool rows rather
   * than fail.
   */
  public readonly excludedRuleIds: readonly RuleId[];

  /** Freezes one capture into the retained record at `previewEpoch`. */
  public constructor(capture: GlobalRootInputCapture, previewEpoch: number) {
    // 32 bytes, so the ID is the 43-character 256-bit value the contract
    // fixes; the shared helper is the one place randomness is drawn.
    this.previewId = createOpaqueId(32);
    this.previewEpoch = previewEpoch;
    this.entries = capture.entries;
    // Written here as the two literals they are. Each is bumped in lockstep
    // with what it identifies — the presentation allowlist and the vendor
    // contracts for the first, any change to a compiled plan in the shipped
    // set for the second — and the contract suite pins both against the same
    // literals, so a bump is a change made deliberately rather than one that
    // happens to compile.
    //
    // `traversalPlanVersion` is distinct from `TraversalPlan.schemaVersion`,
    // which versions one plan record's shape rather than what the set selects.
    this.allowlistVersion = '2026-08-27';
    this.traversalPlanVersion = '2026-08-27';
    this.excludedRuleIds = Object.values(INSPECTION_RULES)
      .filter((rule) => rule.discoveryClass === 'excluded' && rule.sourceKinds.includes('global'))
      .map((rule) => rule.ruleId)
      .toSorted();
  }

  /**
   * The public preview: every field but each entry's exact captured string.
   * Built fresh per call from immutable data, so two calls are equal in field
   * semantics without either being able to mutate the record.
   */
  public toDto(): GlobalConsentPreviewDto {
    return {
      previewId: this.previewId,
      allowlistVersion: this.allowlistVersion,
      traversalPlanVersion: this.traversalPlanVersion,
      entries: this.entries.map((entry) => entry.toDto()),
      excludedRuleIds: this.excludedRuleIds,
    };
  }
}

/**
 * Holds the process's current consent preview and the two operations over it
 * (contracts/http-api.md § get-global-consent-preview,
 * § create-global-consent-preview).
 *
 * The pair is deliberately asymmetric. Capture is the only state-changing
 * operation and is the only one that reads the environment; retrieval is a
 * pure lookup of what is already current. That split is what lets a fresh
 * client redisplay the exact consent a previous client was shown — recapturing
 * on read would hand the reader a different preview than the one an in-flight
 * enable is bound to.
 *
 * The freeze conditions are the session's own states: an active consent, a
 * registered enable operation, or a non-null disable fence. While one holds,
 * {@link capture} is refused and the host answers the conflict its own
 * checks name (contracts/http-api.md § create-global-consent-preview).
 */
export class GlobalConsentDomain {
  /** The current preview, or null when none has been captured in this process. */
  #current: GlobalConsentPreview | null = null;

  /**
   * The next `previewEpoch` to assign. It increments with every newly captured
   * preview, so an epoch is never reused within a process.
   */
  #nextEpoch = 0;

  /**
   * Captures the environment and atomically creates or replaces the
   * unconsented preview, returning what it created.
   *
   * Atomic in the sense the contract requires: the previous preview stays
   * current until the complete new record is bound, so a throw during capture,
   * classification, escaping, or construction leaves the domain exactly as it
   * was and propagates unchanged to the request boundary.
   */
  public capture(environment?: NodeJS.ProcessEnv): GlobalConsentPreview {
    const captured = new GlobalConsentPreview(
      new GlobalRootInputCapture(environment),
      this.#nextEpoch,
    );
    this.#nextEpoch += 1;
    this.#current = captured;
    return captured;
  }

  /**
   * The current preview, or null when there is none. Never captures, never
   * replaces, and never invalidates: the caller turns null into the fixed
   * `consent-preview-missing` rejection, because whether a missing preview is
   * a rejection is the session API's decision rather than this domain's.
   */
  public current(): GlobalConsentPreview | null {
    return this.#current;
  }

  /**
   * Releases the frozen preview. Called only inside the disable barrier's
   * terminal success commit (contracts/http-api.md § disable-global): the
   * preview stays retrievable — frozen — through every failed cleanup, and a
   * later capture may replace it only once the barrier is gone.
   */
  public release(): void {
    this.#current = null;
  }
}

/**
 * The production admission port: submit the frozen root to the inspection
 * module and hand back its typed outcome unchanged (T951, T968).
 *
 * This function is the whole of the host's involvement with a proposed root.
 * It issues no filesystem call of its own and never inspects or converts a
 * Node error code — what an `EACCES` on a home directory means is the
 * inspection module's decision (QR-003) — and a throw propagates unchanged, so
 * a failure not confined to one member aborts the whole fixed-four
 * transaction.
 *
 * One function for every bound member rather than one per member. Whether a
 * proposed root can be read is a question about a directory, and the answer
 * comes from the same `admitGlobalRoot` for all four: a per-member copy would
 * be this body written again under another name, free to drift from the others
 * while claiming to do the same thing. What a member's admission then
 * authorizes is the member's own, and that lives in its rule catalog
 * (`GLOBAL_RULES_BY_MEMBER`), never here.
 */
export const admitGlobalMemberRoot: GlobalMemberPort = async (lexicalRoot, stillAuthorized) => {
  const admission = await admitGlobalRoot(lexicalRoot, stillAuthorized);
  return admission.kind === 'admitted'
    ? { kind: 'admitted', root: lexicalRoot }
    : { kind: 'rejected', failureCode: admission.reason };
};

/**
 * The member ports this build has bound, keyed by member.
 *
 * All four are production-backed, through the one admission every member
 * shares. A null port would be a member this build cannot evaluate — it is not
 * a rejection and not an admission, and it receives no control at all rather
 * than an outcome nothing produced (T959).
 */
export const PRODUCTION_GLOBAL_MEMBER_PORTS: Readonly<
  Record<GlobalMemberId, GlobalMemberPort | null>
> = {
  /** Bound by T982, through the one admission every member shares. */
  copilot: admitGlobalMemberRoot,
  /** Bound by T968, through the same. */
  claude: admitGlobalMemberRoot,
  /** Bound by T951, through the same. */
  codex: admitGlobalMemberRoot,
  /** Bound by T1137, through the same (FR-045). */
  agents: admitGlobalMemberRoot,
};

/**
 * The lexical rejection a preview entry's own state is, or null when the entry
 * is eligible and its port decides (data-model.md § GlobalToolControl).
 *
 * The three lexical states are refusals decided from the captured string, so
 * they cost no filesystem call: a reader whose `CODEX_HOME` is empty is told
 * so without this product having looked at anything.
 */
function lexicalRejection(entry: GlobalPreviewEntry): GlobalResolvedOutcome | null {
  switch (entry.inputState) {
    case 'eligible':
      return null;
    case 'present-empty':
    case 'relative':
    case 'invalid':
      return { kind: 'rejected', failureCode: entry.inputState };
  }
}

/**
 * Resolves every member of one fixed-four transaction against the frozen
 * preview: the lexical refusals with no I/O, and each eligible entry through
 * its bound port (contracts/http-api.md § enable-global).
 *
 * A member with no bound port is omitted from the result rather than given an
 * outcome, which is what leaves it out of both partitions and out of the
 * controls. Every port call runs before any disposition, so a throw aborts the
 * transaction with nothing activated.
 *
 * `stillAuthorized` is checked before each member's probe: the disable
 * barrier cancels the enable operation it drains, and starting the next
 * member's filesystem read after that acceptance would be new I/O the
 * contract's abort covers (contracts/http-api.md § disable-global). A
 * cancellation mid-loop stops the walk; the caller's own post-admission
 * re-check answers the fixed conflict, so the partial result activates
 * nothing.
 */
export async function resolveGlobalMembers(
  preview: GlobalConsentPreview,
  ports: Readonly<Record<GlobalMemberId, GlobalMemberPort | null>>,
  members?: readonly GlobalMemberId[],
  stillAuthorized?: () => boolean,
): Promise<{ readonly member: GlobalEnableMember; readonly outcome: GlobalResolvedOutcome }[]> {
  const resolved: { member: GlobalEnableMember; outcome: GlobalResolvedOutcome }[] = [];
  for (const entry of preview.entries) {
    if (stillAuthorized !== undefined && !stillAuthorized()) {
      break;
    }
    // A retry resolves only the server-derived retryable subset
    // (contracts/http-api.md § enable-global): a published member's root is
    // neither re-read nor re-dispositioned. The initial enable passes no
    // subset and evaluates every entry of the frozen preview.
    if (members !== undefined && !members.includes(entry.member)) {
      continue;
    }
    const port = ports[entry.member];
    if (port === null) {
      continue;
    }
    const member: GlobalEnableMember = {
      member: entry.member,
      origin: entry.origin,
      lexicalRoot: entry.lexicalRoot,
      inputState: entry.inputState,
      port,
    };
    const lexical = lexicalRejection(entry);
    const outcome = lexical ?? (await port(entry.lexicalRoot, stillAuthorized));
    if (lexical === null && stillAuthorized !== undefined && !stillAuthorized()) {
      // The transaction was revoked while this member's probes ran: its
      // outcome is a late result the settle gate would refuse anyway
      // (devframe-app.ts § runGlobalEnable), so it is dropped here and the
      // loop head stops the next member — revocation is permanent, so no
      // fabricated outcome can reach a disposition.
      break;
    }
    resolved.push({ member, outcome });
  }
  return resolved;
}
