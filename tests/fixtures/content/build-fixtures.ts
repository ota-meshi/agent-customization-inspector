// T074: authored-content fixtures for the Codex `SKILL.md` extraction suites
// (FR-025, FR-028, data-model.md § DeclaredMetadataEntry).
//
// These are strings rather than a materialized tree. What the extraction suites
// exercise is decoding and field reading over complete decoded text, which a
// file on disk adds nothing to — the traversal that produces that text is
// already covered by its own filesystem fixtures.
//
// Every case makes one rule observable. A case that only exercised the happy
// path would let an extractor that refused a repeated key, or one that reported
// a value the parser never resolved, pass unnoticed — so the cases are
// deliberately awkward: quoted, escaped, blocked, repeated, aliased, tagged,
// astral, combining, and unparseable.

/** One authored `SKILL.md`, with what the Codex allowlist must make of it. */
export interface SkillContentCase {
  /** Short identifier used as the test name. */
  readonly id: string;
  /** The complete decoded text a scan would hand the recognizer. */
  readonly sourceText: string;
  /**
   * The recognized value of `codex.skill.name`, or null when the file declares
   * nothing the allowlist reads as that field. It is also the identity a row
   * groups by, because the two are the same value.
   */
  readonly name: string | null;
  /** The recognized value of `codex.skill.description`, or null when none is. */
  readonly description: string | null;
}

/**
 * The credential-shaped literal the secret cases declare. It is a fixture
 * value with the shape of a GitHub token and no validity anywhere; it exists so
 * a suite can prove the product neither masks it nor withholds it from the
 * detail route.
 */
export const CONTENT_FIXTURE_SECRET = 'ghp_FIXTURE000000000000000000000000000000';

/**
 * An astral character (U+1F600) followed by a combining sequence — `e` plus
 * U+0301, deliberately decomposed rather than the precomposed `é`. Both are
 * here because a value carrying them survives the parser and the JSON transport
 * only if every layer works in whole characters: an astral character is two
 * UTF-16 code units, and this mark is a second code point that renders as part
 * of the character before it. Precomposed, the pair would prove nothing — a
 * layer normalizing to NFC would leave it unchanged and pass.
 */
export const ASTRAL_AND_COMBINING = '\u{1F600}e\u0301';

/**
 * The authored `SKILL.md` cases every extraction suite runs over.
 *
 * Each pair says what a product loading the file would have, which is what this
 * product reports: quoting and escapes resolved, a block scalar joined as the
 * parser joins it, a key declared twice resolved to its later declaration, an
 * alias resolved to what it points at, and an environment reference left as the
 * characters that were written, because nothing here resolves one.
 */
export const SKILL_CONTENT_CASES: readonly SkillContentCase[] = [
  {
    id: 'plain scalars',
    sourceText: '---\nname: greet\ndescription: Say hello.\n---\n\nBody.\n',
    name: 'greet',
    description: 'Say hello.',
  },
  {
    id: 'double-quoted value resolves its quotes and escapes',
    sourceText: '---\nname: "a \\"b\\" c"\n---\n',
    name: 'a "b" c',
    description: null,
  },
  {
    id: 'single-quoted value resolves its doubled apostrophe',
    sourceText: "---\nname: 'it''s'\n---\n",
    name: "it's",
    description: null,
  },
  {
    id: 'block scalar resolves to the text it holds',
    sourceText: '---\ndescription: |\n  first\n  second\n---\n',
    name: null,
    description: 'first\nsecond\n',
  },
  {
    id: 'repeated field resolves to the later declaration',
    // What a parser resolves the key to is what a product reading the file
    // has, and this reports that rather than refusing the document.
    sourceText: '---\nname: first\nname: second\n---\n',
    name: 'second',
    description: null,
  },
  {
    id: 'alias resolves to what it points at',
    sourceText: '---\nanchor: &a greet\nname: *a\n---\n',
    name: 'greet',
    description: null,
  },
  {
    id: 'tag outside the core schema leaves the scalar it carried',
    sourceText: '---\nname: !!weird greet\n---\n',
    name: 'greet',
    description: null,
  },
  {
    id: 'number resolves as the parser resolves it',
    // `007` is the number seven to every product that loads this file; the
    // authored spelling stays visible in the source the detail route serves.
    sourceText: '---\nname: 007\n---\n',
    name: '7',
    description: null,
  },
  {
    id: 'environment reference stays the characters that were written',
    sourceText: '---\nname: greet\ndescription: "uses $HOME and ${TOKEN}"\n---\n',
    name: 'greet',
    description: 'uses $HOME and ${TOKEN}',
  },
  {
    id: 'literal credential is published unmasked',
    sourceText: `---\nname: secretive\ndescription: "token ${CONTENT_FIXTURE_SECRET}"\n---\n`,
    name: 'secretive',
    description: `token ${CONTENT_FIXTURE_SECRET}`,
  },
  {
    id: 'astral and combining characters survive whole',
    sourceText: `---\nname: ${ASTRAL_AND_COMBINING}\n---\n`,
    name: ASTRAL_AND_COMBINING,
    description: null,
  },
  {
    id: 'unlisted key produces no entry',
    sourceText: `---\nname: greet\napi_key: ${CONTENT_FIXTURE_SECRET}\n---\n`,
    name: 'greet',
    description: null,
  },
  {
    id: 'non-scalar value is not a field this allowlist reads',
    // The row names two frontmatter scalars, and a sequence is neither a name
    // a selector could match nor a description a menu could show.
    sourceText: '---\nname: [a, b]\n---\n',
    name: null,
    description: null,
  },
  {
    id: 'no frontmatter declares nothing',
    sourceText: '# Just a heading\n\nSome prose.\n',
    name: null,
    description: null,
  },
  {
    id: 'empty file declares nothing',
    sourceText: '',
    name: null,
    description: null,
  },
];

/**
 * Authored `SKILL.md` documents whose frontmatter cannot be parsed at all.
 *
 * Each one must become the recognition's `failed` state and its
 * `recognition-parse-failed` Diagnostic while the complete source stays
 * displayed (FR-028) — never a thrown scan, and never a partial extraction of
 * the fields that happened to parse before the problem.
 *
 * An alias and an unknown tag are deliberately absent: both parse, so both are
 * ordinary cases above. This product reports what a parser reads out of a
 * customization and is not a YAML validator standing between the two.
 */
export const MALFORMED_SKILL_CONTENT_CASES: readonly SkillContentCase[] = [
  {
    id: 'unterminated flow sequence',
    sourceText: '---\nname: [greet\n---\n',
    name: null,
    description: null,
  },
  {
    id: 'block mapping with a bad indent',
    sourceText: '---\nname:\n  - a\n b\n---\n',
    name: null,
    description: null,
  },
];
