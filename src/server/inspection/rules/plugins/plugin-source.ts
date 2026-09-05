// The one question every vendor's plugin rule answers the same way: which
// Source-relative directory, if any, a declared source names, and in what kind
// of place the plugin's files sit when it names none
// (`api-types.ts` § PluginSourceForm).
//
// A plugin is not a file this product admits: it is a directory a catalog entry
// names, or the directory a manifest's presence made one
// (contracts/inspection-path-allowlist.md § Bounded companion census). What
// each vendor documents as a source is that vendor's own module beside this
// one; what a `./`-anchored path may be, and what a form that names no
// directory resolves to, is the same for all of them and is here.
import type {
  DeclaredEntryDto,
  DeclaredValueDto,
  PluginSourceForm,
} from '../../../../shared/api-types';

/**
 * The characters no segment of an authored local path may hold
 * (contracts/inspection-path-allowlist.md § Common conformance requirements):
 * a backslash and a colon, because a value spelling a Windows path or a
 * drive-qualified one is a resolution this product cannot perform, and every
 * control character, which no vendor documents in a declared path.
 *
 * The refused control range is Unicode's `Cc` category — the C0 block, DEL, and
 * the C1 block — which is the same set `entities.ts` escapes when it renders an
 * authored value. A pattern stopping at DEL would let a C1 character stand in a
 * segment and name a directory the census then enumerates, where the contract
 * requires a control-carrying value to be refused with zero target I/O.
 */
const REFUSED_PATH_CHARACTERS =
  /*
    eslint-disable-next-line no-control-regex
    -----------------------------------------
    the refused set is the contract's, and control characters are what this pattern exists to name.
  */
  /[\\:\u0000-\u001F\u007F-\u009F]/u;

/**
 * The Source-relative segments a documented local plugin source names, or null
 * when it names no directory this Source could hold.
 *
 * Shared by every vendor's plugin rule because all three document the same
 * form — a `./`-anchored relative path, resolved against the Source root — and
 * what a directory here can be called is the platform's answer rather than any
 * vendor's. What stays in each vendor's own module is the vendor's part: which
 * key holds the source, which discriminant marks it local, and which other
 * source forms exist.
 *
 * The rejections are the path contract's, and they reject the whole derivation
 * rather than repairing it, with zero target I/O
 * (contracts/inspection-path-allowlist.md § Common conformance requirements):
 * one literal `./` prefix and U+002F as the sole separator, so a value with no
 * prefix, an empty segment — which is what a leading, trailing, or repeated
 * separator produces — a `.` or `..` segment, a first-segment home marker, a
 * refused character ({@link REFUSED_PATH_CHARACTERS}), or an unpaired
 * surrogate names nothing. Nothing here decodes, expands, resolves a home
 * directory, or parses a platform path: a reader produces validated literal
 * segments, never a path string.
 *
 * A trailing separator is refused rather than trimmed for that reason: `./x/`
 * and `./x` are one directory to a filesystem, but the contract's grammar is
 * what the census is bounded by, and a tokenizer that repairs one spelling has
 * to decide which others it repairs too.
 */
export function localPluginRootSegments(declaredPath: string | null): readonly string[] | null {
  if (declaredPath === null || !declaredPath.startsWith('./') || !declaredPath.isWellFormed()) {
    return null;
  }
  const segments = declaredPath.slice('./'.length).split('/');
  if (
    segments.some(
      (segment) =>
        segment === '' ||
        segment === '.' ||
        segment === '..' ||
        REFUSED_PATH_CHARACTERS.test(segment),
    )
  ) {
    return null;
  }
  // A first-segment home marker is the one placement that would name a
  // directory outside this Source on a client that resolves it.
  return segments[0]?.startsWith('~') === true ? null : segments;
}

/**
 * The value one declaration wrote under a string key, or null when it wrote
 * none.
 *
 * Shared by the three vendors' plugin source readings, which each start from
 * one key of a catalog entry and then descend into a mapping under it. What a
 * key is called and what its values mean stays in each vendor's own module;
 * this is the traversal all three would otherwise spell three times.
 *
 * A non-string key never matches: a JSON object's keys are strings, and a YAML
 * document's `true` or `1` key is not the key an author wrote as text.
 */
export function declaredValueUnder(
  declared: readonly DeclaredEntryDto[],
  key: string,
): DeclaredValueDto | null {
  for (const entry of declared) {
    if (entry.keyKind === 'string' && entry.key === key) {
      return entry.value;
    }
  }
  return null;
}

/**
 * What one catalog entry's declared source resolves to: the kind of place the
 * plugin comes from, and the Source-relative segments of its directory when
 * that place is a directory of this Source.
 *
 * The two are published apart for the reason
 * `api-types.ts` § PluginDeclarationDto.sourceForm gives: a documented
 * relative path that leaves the Source is a form the rule read and a directory
 * it cannot name, and the surfaces state those differently.
 */
export interface DeclaredPluginSource {
  /** The published classification (`api-types.ts` § PluginSourceForm). */
  readonly form: PluginSourceForm;
  /**
   * The plugin root's path segments as the declaration spelled them, or null when it names
   * no directory inside this Source — every form but a relative path, and a
   * relative path {@link localPluginRootSegments} refuses.
   */
  readonly rootSegments: readonly string[] | null;
}

/**
 * The answer for a source the admitting vendor's documentation does not
 * describe, which every vendor's reading returns for its own unlisted forms.
 */
export const UNRECOGNIZED_PLUGIN_SOURCE: DeclaredPluginSource = {
  form: 'unrecognized',
  rootSegments: null,
};
