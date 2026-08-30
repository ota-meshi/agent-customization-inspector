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
   * What the block's heading says, or null where the session holds one Source
   * and every block would repeat the page's only answer
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
          familyText: this.familyNameOf(kind),
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
