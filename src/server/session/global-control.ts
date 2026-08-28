// The Global consent and control state one session holds between an enable
// commit and a disable barrier (data-model.md § GlobalConsent,
// § GlobalToolControl, § GlobalControlView).
//
// It lives beside the session rather than inside it because it is a different
// lifecycle: the Repository Source exists for the whole process, while every
// record here appears at a confirmation and disappears at a disable. Keeping
// the two apart is what makes "the Repository sequence is untouched" a property
// of the code rather than a promise in a comment.
//
// Nothing here is a filesystem authority. A control holds the exact admitted
// root because admission produced it and the scan needs it, and that field is
// never serialized: what a client sees is the tool, the state, and the closed
// reason code — the frozen preview is where the reader is shown which
// directory each tool proposed (FR-002).
import type { SourceBoundaryOrigin } from '../../shared/entities';
import { GLOBAL_MEMBER_ORDER } from '../../shared/api-text';
import type {
  GlobalBatchStatusDto,
  GlobalMemberId,
  GlobalControlViewDto,
  GlobalRootInputState,
  GlobalRetryDisposition,
  GlobalToolControlDto,
  GlobalToolFailureCode,
  GlobalToolState,
} from '../../shared/api-types';

/** Sorts members into the one closed order every Global projection uses. */
export function inMemberOrder(members: Iterable<GlobalMemberId>): GlobalMemberId[] {
  const held = new Set(members);
  return GLOBAL_MEMBER_ORDER.filter((member) => held.has(member));
}

/**
 * One Global member's control record under the active consent
 * (data-model.md § GlobalToolControl).
 *
 * Constructed only by the two named factories below, so every value's origin
 * is one of exactly two events: a deterministic rejection, or an admission
 * that produced a root. A control is mutated in place at one point — the
 * coordinator's atomic disposition — and nowhere else.
 */
export class GlobalToolControl {
  /** The member this control is about. */
  public readonly member: GlobalMemberId;

  /** How far this member has got; see {@link GlobalToolState}. */
  public state: GlobalToolState;

  /** Non-null exactly while this member has failed and has no published Source. */
  public failureCode: GlobalToolFailureCode | null;

  /** Null unless {@link state} is `rejected`; see {@link GlobalRetryDisposition}. */
  public retryDisposition: GlobalRetryDisposition | null;

  /**
   * The exact admitted raw root, or null for a rejected control. Internal
   * only: it is the one value a scan may use as a filesystem operand, and it
   * never reaches a DTO.
   */
  public root: string | null;

  /**
   * The Source ID allocated at admission, or null. Allocated before the batch
   * is queued and published only by the batch's commit, so an admitted control
   * already knows the identity its Source will have — which is what lets one
   * commit publish every admitted tool at once.
   */
  public sourceId: string | null;

  /**
   * How the admitted root was arrived at, or null for a rejected control. It
   * is the other half of the Source boundary this tool will publish: the
   * escaped label is derived from {@link root} where it is projected, so the
   * two cannot disagree (AGENTS.md § Implementation simplicity policy).
   */
  public origin: SourceBoundaryOrigin | null;

  /** Builds one control; use {@link rejectedControl} or {@link admittedControl}. */
  private constructor(
    member: GlobalMemberId,
    state: GlobalToolState,
    failureCode: GlobalToolFailureCode | null,
    retryDisposition: GlobalRetryDisposition | null,
    root: string | null,
    sourceId: string | null,
    origin: SourceBoundaryOrigin | null,
  ) {
    this.member = member;
    this.state = state;
    this.failureCode = failureCode;
    this.retryDisposition = retryDisposition;
    this.root = root;
    this.sourceId = sourceId;
    this.origin = origin;
  }

  /**
   * One member refused deterministically. A lexical reason is
   * `new-preview-required` — the root itself has to change, and the root comes
   * from a preview — while a post-consent reason is `same-preview`, because
   * re-admitting the same frozen root is exactly what a retry does.
   */
  public static rejectedControl(
    member: GlobalMemberId,
    failureCode: GlobalToolFailureCode,
  ): GlobalToolControl {
    const lexical =
      failureCode === 'present-empty' || failureCode === 'relative' || failureCode === 'invalid';
    return new GlobalToolControl(
      member,
      'rejected',
      failureCode,
      lexical ? 'new-preview-required' : 'same-preview',
      null,
      null,
      null,
    );
  }

  /** One member whose root passed admission, with the Source ID its commit will publish. */
  public static admittedControl(
    member: GlobalMemberId,
    root: string,
    sourceId: string,
    origin: SourceBoundaryOrigin,
  ): GlobalToolControl {
    return new GlobalToolControl(member, 'admitted', null, null, root, sourceId, origin);
  }

  /**
   * Records that this member's Source is now committed, which clears the
   * deterministic failure a previous attempt had recorded: a published Source
   * is the answer to whatever the last one failed with.
   */
  public markPublished(): void {
    this.state = 'published';
    this.failureCode = null;
    this.retryDisposition = null;
  }

  /**
   * Whether the same consent may re-admit this member
   * (data-model.md § GlobalControlView `retryableTools`): every non-pending
   * unpublished admitted control, and every rejected control whose rejection
   * was not lexical. Pending membership is the caller's, because it belongs to
   * the accepted batch rather than to this control.
   */
  public get retryableUnderSamePreview(): boolean {
    return this.state === 'admitted' || this.retryDisposition === 'same-preview';
  }

  /** The public projection: everything but the admitted root and the Source ID. */
  public toDto(): GlobalToolControlDto {
    return {
      member: this.member,
      state: this.state,
      failureCode: this.failureCode,
      retryDisposition: this.retryDisposition,
    };
  }
}

/**
 * The one active Global consent and the controls it owns
 * (data-model.md § GlobalConsent).
 *
 * `confirmedTools` is the fixed all-members set the confirmation is for, and
 * it is deliberately not the same thing as the controls: a control exists for
 * every member this build can evaluate. Publishing both is not publishing a
 * fact twice — the consent covers the four members, and which of them this
 * build has a port for is a different fact, visible as the absence of a
 * control.
 */
export class GlobalConsentRecord {
  /** The frozen preview this consent is bound to; an opaque lookup reference. */
  public readonly previewId: string;

  /** The fixed all-members consent set; never client-selected. */
  public readonly confirmedTools: readonly GlobalMemberId[];

  /** UTC timestamp of the confirmation; memory only. */
  public readonly confirmedAt: string;

  /** One control per evaluated member, keyed by member. */
  public readonly controls: Map<GlobalMemberId, GlobalToolControl>;

  /**
   * The admitted subset one accepted batch owns, sorted. Empty until a batch is
   * accepted and again once it commits: a pending member is one whose scan is
   * in flight, which is a fact about the batch rather than about the control.
   */
  public pendingTools: readonly GlobalMemberId[] = [];

  /** The accepted batch's status, or null; see {@link GlobalBatchStatusDto}. */
  public batchStatus: GlobalBatchStatusDto | null = null;

  /** Opens a consent record with its controls, as one atomic disposition. */
  public constructor(
    previewId: string,
    confirmedAt: string,
    controls: readonly GlobalToolControl[],
  ) {
    this.previewId = previewId;
    this.confirmedTools = GLOBAL_MEMBER_ORDER;
    this.confirmedAt = confirmedAt;
    this.controls = new Map(controls.map((control) => [control.member, control]));
  }

  /**
   * The exact server-derived retryable subset: each non-pending unpublished
   * admitted control and each rejected control the same preview still applies
   * to. Derived on read rather than stored, so it cannot disagree with the
   * controls it is a projection of (AGENTS.md § Implementation simplicity
   * policy).
   */
  public retryableTools(): GlobalMemberId[] {
    const pending = new Set(this.pendingTools);
    const retryable: GlobalMemberId[] = [];
    for (const control of this.controls.values()) {
      if (!pending.has(control.member) && control.retryableUnderSamePreview) {
        retryable.push(control.member);
      }
    }
    return inMemberOrder(retryable);
  }

  /** The public control projection returned in every snapshot while this record lives. */
  public toDto(): GlobalControlViewDto {
    return {
      // `disabling` arrives with the disable barrier; while this record exists
      // and no barrier does, the consent is active.
      state: 'active',
      previewId: this.previewId,
      confirmedTools: this.confirmedTools,
      controls: inMemberOrder(this.controls.keys()).map((member) =>
        this.controls.get(member)!.toDto(),
      ),
      pendingTools: this.pendingTools,
      batchStatus: this.batchStatus,
      retryableTools: this.retryableTools(),
    };
  }
}

/**
 * What one member port answers for its member's frozen root
 * (contracts/http-api.md § enable-global). There is no third outcome: a root
 * either becomes this member's boundary or is refused for the one reason a root
 * can be refused for, and anything else throws so the whole transaction
 * aborts.
 */
export type GlobalMemberOutcome =
  | {
      /** The root was admitted; the exact string travels on for the scan. */
      readonly kind: 'admitted';
      /** The exact raw root this member's scan will read below. */
      readonly root: string;
    }
  | {
      /** The root is missing or is not a readable directory. */
      readonly kind: 'rejected';
      /** The one post-consent reason admission can refuse a root for. */
      readonly failureCode: 'root-unreadable';
    };

/**
 * What one member slot resolved to before the disposition: the port's own
 * outcome, or the lexical refusal the frozen preview already decided.
 *
 * Wider than {@link GlobalMemberOutcome} by exactly the three lexical reasons,
 * because those are refusals no port produces — they are decided from the
 * captured string with no filesystem call, so a port that could return one
 * would be claiming to have looked.
 *
 * `scan-failed` is deliberately absent: it is the outcome of reading an
 * admitted root, which happens after this disposition.
 */
export type GlobalResolvedOutcome =
  | {
      /** The root was admitted; the exact string travels on for the scan. */
      readonly kind: 'admitted';
      /** The exact raw root this member's scan will read below. */
      readonly root: string;
    }
  | {
      /** The member is refused, either lexically or by admission. */
      readonly kind: 'rejected';
      /** The closed reason, excluding the post-admission scan failure. */
      readonly failureCode: Exclude<GlobalToolFailureCode, 'scan-failed'>;
    };

/**
 * One member's admission port: the function that submits a frozen root to the
 * inspection module and returns its typed outcome.
 *
 * The coordinator holds ports rather than performing admission itself, for the
 * reason QR-003 gives: every filesystem operation belongs to the inspection
 * module, and a coordinator that reached for one would be a second place with
 * read authority. A port is called only for an `eligible` entry — the three
 * lexical rejections are decided from the captured string with no I/O at all.
 */
export type GlobalMemberPort = (lexicalRoot: string) => Promise<GlobalMemberOutcome>;

/**
 * One member's slot in the fixed-four transaction, as the host hands it to
 * the coordinator: the frozen preview's facts about that member plus the port
 * that can admit it.
 *
 * A null port is a member this build cannot evaluate, and it is neither
 * admitted nor rejected: fabricating either would put an outcome in front of a
 * reader that nothing produced. Such a slot receives no control, which is how
 * its absence stays visible instead of looking like a refusal.
 */
export interface GlobalEnableMember {
  /** The member this slot is for. */
  readonly member: GlobalMemberId;
  /** How the frozen root was arrived at; carried onto an admitted control. */
  readonly origin: SourceBoundaryOrigin;
  /** The exact frozen root, used only as a port argument. */
  readonly lexicalRoot: string;
  /** The lexical state the preview assigned, which decides a no-I/O rejection. */
  readonly inputState: GlobalRootInputState;
  /** The admission port, or null while this member's production port is unbound. */
  readonly port: GlobalMemberPort | null;
}
