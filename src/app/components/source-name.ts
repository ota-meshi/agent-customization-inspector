// What a surface calls the place a file came from (FR-030, FR-002).
//
// Two questions, because the inventory now asks both: which *kind* of place a
// block of files is of — the selected repository, or the reader's own
// configuration directories — and which *directory* one file was in. The family
// heads a block, and the directory belongs to the file, because one block can
// hold files from two consented homes and a heading naming both would name
// neither.
//
// One module for both, because the surfaces that answer them must not disagree:
// the inventory's instruction blocks, the files in no kind, and the instruction
// detail all stop naming a Source in the same session — the one that carries a
// single Source, where naming it would repeat the page's only answer.
import { GLOBAL_MEMBER_TEXT, SOURCE_KIND_TEXT } from '../../shared/api-text';
import type { SourceDto, SourceKind } from '../../shared/api-types';

/**
 * What to call one Source family, or null where naming it distinguishes
 * nothing.
 *
 * The family's own word (`api-text.ts` § SOURCE_KIND_TEXT), never a Source ID
 * or a route token: both are addresses, and to someone reading their own files
 * they stand where an answer should be.
 *
 * Null for a session carrying one Source, which is the ordinary one — nothing
 * outside the selected repository is inspected until a reader confirms it
 * (FR-013). There every block would repeat the page's only answer, and its
 * summary panel states that once already.
 */
export function sourceFamilyNameOf(sources: readonly SourceDto[], kind: SourceKind): string | null {
  return sources.length > 1 ? SOURCE_KIND_TEXT[kind] : null;
}

/**
 * The directory one file's Source was admitted at, as the escaped presentation
 * the boundary carries — or null when the family holds one Source and the
 * directory is already stated once beside it.
 *
 * The escaped `displayRoot` and never a path: it is a presentation of the value
 * the root came from, grants no read access, and is not something to open
 * (FR-002, data-model.md § SourceBoundary). Shown per file because a family can
 * hold two consented homes, and then the file's own directory is the only thing
 * that says which of them it was in.
 */
export function sourceRootOf(
  sources: readonly SourceDto[],
  kind: SourceKind,
  sourceId: string,
): string | null {
  const family = sources.filter((candidate) => candidate.kind === kind);
  if (family.length <= 1) {
    return null;
  }
  for (const source of family) {
    if (source.sourceId === sourceId) {
      return source.boundary.displayRoot;
    }
  }
  return null;
}

/**
 * The directory one file was in, resolved from its Source ID alone — the form
 * the name-keyed rows use, whose files span families rather than sitting in a
 * per-family block: a skill, agent, or MCP row lists every Source's files
 * under one name, so the file's own Source is the row's fact rather than a
 * block heading's ({@link sourceRootOf}).
 *
 * Null where the ID resolves to no listed Source — a row rendered against a
 * snapshot that no longer carries it — and null where the file's family holds
 * one Source, for the reason {@link sourceRootOf} states.
 */
export function fileSourceRootOf(sources: readonly SourceDto[], sourceId: string): string | null {
  for (const source of sources) {
    if (source.sourceId === sourceId) {
      return sourceRootOf(sources, source.kind, sourceId);
    }
  }
  return null;
}

/**
 * The Source half of one compared file's facts line: the family it is of and,
 * where that family holds more than one Source, the directory it was in — in
 * that order, ready for the kind and read-outcome facts the page appends.
 *
 * The family is stated unconditionally, unlike a list heading: a facts line
 * identifies one side on a page whose two sides can be two Sources — one
 * consented home's file beside another member's — so the family word carries
 * meaning even in a single-Source session (FR-002, FR-030). The directory
 * stays gated the way every per-file directory is
 * ({@link sourceRootOf}).
 */
export function sourceFactsOf(sources: readonly SourceDto[], sourceId: string): readonly string[] {
  for (const source of sources) {
    if (source.sourceId === sourceId) {
      const root = sourceRootOf(sources, source.kind, sourceId);
      return [SOURCE_KIND_TEXT[source.kind], ...(root === null ? [] : [root])];
    }
  }
  return [];
}

/**
 * The accessible qualifier of one file's Source, or null where its family
 * holds one Source and the link's name needs none. The member the home
 * belongs to plus the escaped directory it was admitted at — the facts the
 * row shows beside the link (the member label and `SourceRootLine`) — so two
 * links to one path in two consented homes never announce identically in a
 * links list (WCAG 2.4.6). Appended after the visible-label prefix, which
 * keeps the visible text at the front of the name (WCAG 2.5.3).
 */
export function fileSourceQualifierOf(
  sources: readonly SourceDto[],
  sourceId: string,
): string | null {
  for (const source of sources) {
    if (source.sourceId !== sourceId) {
      continue;
    }
    if (source.kind !== 'global') {
      // Exactly one Repository Source exists (data-model.md § Source), so a
      // repository family never holds a same-path pair to tell apart.
      return null;
    }
    if (sources.filter((candidate) => candidate.kind === 'global').length <= 1) {
      return null;
    }
    return `${GLOBAL_MEMBER_TEXT[source.member]}, ${source.boundary.displayRoot}`;
  }
  return null;
}
