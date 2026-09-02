// The one implementation of the per-Source lookups the inventory and detail
// surfaces share (FR-030, FR-002).
//
// Every surface that renders a file beside its Source answers the same four
// questions — which route token a Source ID resolves to, which family it
// belongs to, what that family is called, and which directory the file was
// in — and several also group members into one block per family. Before this
// module each component answered them with a local copy, and eleven copies of
// one lookup are eleven places for it to drift; here each answer is written
// once and injected everywhere it is read.
import { computed, type ComputedRef } from 'vue';
import { useSessionViewState } from './session-view-state';
import { sourceIdOf, sourceSelectorOf, type SourceSelector } from '../components/detail-route';
import {
  fileSourceHomeOf,
  fileSourceRootOf,
  sourceFamilyNameOf,
  fileSourceQualifierOf,
} from '../components/source-name';
import type { SourceDto, SourceKind } from '../../shared/api-types';

/**
 * One Source family's block of an inventory grouping: the family, its name
 * where naming it distinguishes something, and the members that belong to it
 * ({@link SessionSources.familyBlocksOf}).
 */
export interface SourceFamilyBlock<Member> {
  /** Which family this block is; see `api-text.ts` § SOURCE_KIND_TEXT. */
  readonly kind: SourceKind;
  /**
   * What the block's heading says, or null where it would head a group of one:
   * a grouping that produced a single family has nothing to separate, and a
   * session holding one Source has nothing to separate anywhere
   * (`source-name.ts` § sourceFamilyNameOf).
   */
  readonly familyText: string | null;
  /** The block's members, in the order the input list carried them. */
  readonly members: readonly Member[];
}

/**
 * The session's published Sources and the per-Source lookups derived from
 * them. A class because production constructs one in exactly one place —
 * {@link useSessionSources} — so the constructor is the one place that says
 * how every lookup's data came to be (AGENTS.md § Class and interface
 * policy).
 */
export class SessionSources {
  /** The Sources the current generation published, in snapshot order. */
  public readonly sources: ComputedRef<readonly SourceDto[]>;

  /** Binds every lookup to the one Source list they all derive from. */
  public constructor(sources: ComputedRef<readonly SourceDto[]>) {
    this.sources = sources;
  }

  /**
   * The stable route token for one Source ID
   * (`detail-route.ts` § SourceSelector).
   *
   * A Source the snapshot does not list falls back to the repository token.
   * That is unreachable — a caller's Source is one the same snapshot
   * published — and the fallback exists so the lookup is total rather than
   * returning a null every caller would spell a fallback for.
   */
  public selectorOf(sourceId: string): SourceSelector {
    for (const source of this.sources.value) {
      if (source.sourceId === sourceId) {
        return sourceSelectorOf(source);
      }
    }
    return 'repository';
  }

  /**
   * The family one Source belongs to, for the block its members render
   * under. Total by the same unreachable-miss argument
   * {@link SessionSources.selectorOf} makes.
   */
  public familyKindOf(sourceId: string): SourceKind {
    for (const source of this.sources.value) {
      if (source.sourceId === sourceId) {
        return source.kind;
      }
    }
    return 'repository';
  }

  /**
   * What one family is called, or null where that distinguishes nothing
   * (`source-name.ts` § sourceFamilyNameOf).
   */
  public familyNameOf(kind: SourceKind): string | null {
    return sourceFamilyNameOf(this.sources.value, kind);
  }

  /**
   * Which directory one file's Source was admitted at, or null where its
   * family holds one Source and the summary panel states it once
   * (`source-name.ts` § fileSourceRootOf).
   */
  public rootTextOf(sourceId: string): string | null {
    return fileSourceRootOf(this.sources.value, sourceId);
  }

  /**
   * The consented home one file came from, by that member's own name, or null
   * where naming it distinguishes nothing (`source-name.ts` § fileSourceHomeOf).
   */
  public homeNameOf(sourceId: string): string | null {
    return fileSourceHomeOf(this.sources.value, sourceId);
  }

  /**
   * The accessible Source qualifier of one file's link name, or null where
   * its family holds one Source (`source-name.ts` § fileSourceQualifierOf).
   */
  public sourceQualifierOf(sourceId: string): string | null {
    return fileSourceQualifierOf(this.sources.value, sourceId);
  }

  /**
   * One link's accessible name with its Source qualifier appended where the
   * file's family holds more than one Source
   * ({@link SessionSources.sourceQualifierOf}): the visible label stays the
   * name's prefix (WCAG 2.5.3), and two same-path files of two consented
   * homes stop announcing identically in a links list (WCAG 2.4.6).
   */
  public qualifiedLinkName(label: string, sourceId: string): string {
    const qualifier = this.sourceQualifierOf(sourceId);
    return qualifier === null ? label : `${label} (${qualifier})`;
  }

  /**
   * The Source ID one route token names, or null when the snapshot lists no
   * Source answering to it — a hand-written address, or a link made while a
   * Global Source this session no longer carries was published
   * (`detail-route.ts` § sourceIdOf).
   */
  public sourceIdFor(selector: SourceSelector): string | null {
    return sourceIdOf(this.sources.value, selector);
  }

  /**
   * One member list grouped into one block per Source family, in the
   * published Source order the list already carries: the repository's members
   * and the consented homes' are two statements rather than one merged list —
   * the grouping the instruction blocks render, kept for every kind a member
   * publishes (FR-030, tasks.md T1140). The heading names a block only where
   * the session holds more than one Source
   * ({@link SessionSources.familyNameOf}).
   */
  /**
   * Whether one grouping's blocks carry family headings: only where they cover
   * more than one family, because a heading over the single family a row has
   * groups nothing.
   *
   * Read in two places, and it has to be one answer in both: the blocks
   * component draws the heading, and the owning row puts its comparison entry
   * on its own name line exactly when no heading exists to close instead
   * (`SourceFamilyBlocks.vue`). Read apart, the heading went and the entry went
   * with it — sixteen comparison links vanished the moment a personal setup was
   * consented.
   *
   * `entryKinds` are the families a row can still offer a comparison for after
   * a narrowing emptied their members: the blocks component renders those too,
   * so they count towards the heading exactly as members do.
   */
  public familyLineShownFor<Member extends { readonly sourceId: string }>(
    members: readonly Member[],
    entryKinds: readonly SourceKind[] = [],
  ): boolean {
    const kinds = new Set(members.map((member) => this.familyKindOf(member.sourceId)));
    for (const kind of entryKinds) {
      kinds.add(kind);
    }
    return kinds.size > 1;
  }

  public familyBlocksOf<Member extends { readonly sourceId: string }>(
    members: readonly Member[],
  ): readonly SourceFamilyBlock<Member>[] {
    const byFamily = new Map<SourceKind, Member[]>();
    for (const member of members) {
      const kind = this.familyKindOf(member.sourceId);
      let block = byFamily.get(kind);
      if (block === undefined) {
        block = [];
        byFamily.set(kind, block);
      }
      block.push(member);
    }
    return (
      [...byFamily]
        .map(([kind, blockMembers]) => ({
          kind,
          // A heading only where this grouping holds two families. The session
          // holding two is not enough: most rows are one family's whatever the
          // session inspects, and heading each of them named a group of one —
          // 15 of the 16 skill rows in the all-kinds fixture with the personal
          // setup enabled. A row of one family then reads as it does with no
          // personal setup at all, and which home a file came from is on the
          // file's own line either way (`SourceHomeBadge.vue`).
          familyText: byFamily.size > 1 ? this.familyNameOf(kind) : null,
          members: blockMembers,
        }))
        // The published family order — the Repository family first — whatever
        // order the narrowed member list arrived in: a filter that dropped
        // every Repository member must not float the Global block above where
        // the inventory reads it everywhere else (FR-030,
        // `#inventorySourceOrder`).
        .toSorted(
          (left, right) =>
            (left.kind === 'repository' ? 0 : 1) - (right.kind === 'repository' ? 0 : 1),
        )
    );
  }
}

/**
 * Joins the session the shell provides and derives the shared lookups from
 * its Sources. Injected rather than threaded down as props: which Sources a
 * session has is a fact about the session, not about the lists and pages in
 * between, and passing it through them made components carry a value they
 * never read.
 */
export function useSessionSources(): SessionSources {
  const sessionViewState = useSessionViewState();
  return new SessionSources(computed(() => sessionViewState.snapshot.value?.sources ?? []));
}
