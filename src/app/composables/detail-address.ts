// The identity a path-addressed detail route carries in its URL (FR-030): the
// Source the address leads with, and the Source-relative Path inside it. Every
// such page resolves the same address the same way, so it is resolved once
// here rather than eleven times — the router hands the segments over
// individually and decoded, and joining them restores the published spelling
// exactly (`detail-route.ts` § decodeDetailRoutePath).
//
// The address arrives already resolved. Which parameters carry it and how
// they are spelled is the route's own shape, declared by the page's filename
// (`[source]/[...path].vue`), and undoing that spelling belongs to the module
// that made it (`detail-route.ts` § asSourceSelector, detailRoutePathOf); the
// page holds both, because the page is where the filename is. What is left
// here is what no route shape decides: an address naming no Source resolves
// nothing, and a Source token becomes the ID the snapshot published.
//
// A path's presentation is the second export rather than a field of the first,
// because the path a page is headed by is not always the address's: a skill's
// page heads the file selected inside its directory, and a plugin's heads the
// carrier it was declared in. Both take the presentation of whichever path
// they show, which is why it is a function over a path rather than a value
// derived from this one.
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import type { SourceSelector } from '../components/detail-route';
import { useSessionSources, type SessionSources } from './session-sources';
import { escapeControlCharacters, pathPresentationLabel } from '../../shared/entities';

/**
 * What the URL names, for the page that is about it; see the module header.
 */
export class DetailAddress {
  /**
   * The Source this page's address names — the half {@link openPath} does not
   * carry (FR-030). It is what the detail request resolves against and what
   * the open control hands the host, so both answer for the file the address
   * names rather than for whichever Source lists the path first.
   *
   * An address whose leading segment names no Source takes the repository
   * token. Nothing renders under such an address — {@link openPath} is empty,
   * so no detail resolves — so the token is never what a request is made with;
   * it exists so this is a `SourceSelector` rather than a null every caller
   * would branch on.
   */
  public readonly openSource: ComputedRef<SourceSelector>;
  /** The open Source's ID, or null while the snapshot does not carry it. */
  public readonly openSourceId: ComputedRef<string | null>;
  /**
   * The Source-relative Path this page is about, or the empty string for an
   * address whose leading segment names no Source. No file has an empty path,
   * so such an address resolves nothing and the page reports what it already
   * reports for a path the current scan does not hold.
   */
  public readonly openPath: ComputedRef<string>;

  /**
   * Derives both halves from the address the page decoded. `source` is null
   * where the leading segment names no Source this product issues
   * (`detail-route.ts` § asSourceSelector), which is the state both answer for.
   */
  public constructor(
    source: MaybeRefOrGetter<SourceSelector | null>,
    sourceRelativePath: MaybeRefOrGetter<string>,
    sessionSources: SessionSources,
  ) {
    this.openSource = computed((): SourceSelector => toValue(source) ?? 'repository');
    this.openSourceId = computed((): string | null =>
      sessionSources.sourceIdFor(this.openSource.value),
    );
    this.openPath = computed((): string =>
      toValue(source) === null ? '' : toValue(sourceRelativePath),
    );
  }
}

/**
 * How a page draws the path it is headed by; see {@link usePathPresentation}.
 */
export class PathPresentation {
  /**
   * The path as the heading shows it, through the one label rule every surface
   * that draws a path uses (`entities.ts` § pathPresentationLabel).
   */
  public readonly pathText: ComputedRef<string>;
  /**
   * Whether {@link pathText} is the spelled-out form rather than the file's own
   * spelling, which an authored name of whitespace or default-ignorable code
   * points produces. The label then draws this product's characters instead of
   * the reader's, so it is not authored text and does not title the tab.
   * Compared against the escaping rather than tested again, so the two cannot
   * answer differently.
   */
  public readonly pathIsSpelledOut: ComputedRef<boolean>;

  /** Derives how one path is drawn and whether it is this product's spelling. */
  public constructor(path: MaybeRefOrGetter<string>) {
    this.pathText = computed(() => pathPresentationLabel(toValue(path)));
    this.pathIsSpelledOut = computed(
      () => this.pathText.value !== escapeControlCharacters(toValue(path)),
    );
  }
}

/**
 * Resolves what one detail route's address names (FR-030).
 *
 * `source` is null where the leading segment names no Source this product
 * issues (`detail-route.ts` § asSourceSelector); both values below answer for
 * that state, which is the whole of what this composable decides.
 */
export function useDetailAddress(
  source: MaybeRefOrGetter<SourceSelector | null>,
  sourceRelativePath: MaybeRefOrGetter<string>,
): DetailAddress {
  return new DetailAddress(source, sourceRelativePath, useSessionSources());
}

/** Derives how one path is drawn and whether it is this product's spelling. */
export function usePathPresentation(path: MaybeRefOrGetter<string>): PathPresentation {
  return new PathPresentation(path);
}
