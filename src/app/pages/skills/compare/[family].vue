<script setup lang="ts">
// The skill comparison route (T200; FR-011, FR-012): a skill name's copies
// compared file by corresponding file — two readable files, or one beside
// its stated absence — their complete literal sources as one diff and their
// recognition metadata as typed rows, with no verdict, no merge, and no
// fix anywhere.
//
// The route is the skill kind's, not a shared one: the comparison is one
// name's copies compared file by corresponding file, a model other kinds
// do not fit — an MCP comparison compares declarations inside carrier
// files — so it lives under `/skills/compare/<family>` and each family's comparison
// phase designs its own surface (spec.md § Clarifications).
//
// The URL carries the model's own coordinates —
// `/skills/compare/<family>?name=<row name>&leftSource=<selector>&left=<entry path>&rightSource=<selector>&right=<entry path>&file=<relative>` —
// the row by the invocation name it is keyed by, the two copies by their
// entry files' whole identities — each side's own Source and Source-relative
// Path, the identity the inventory's definitions and the detail route already
// use (FR-030), each side naming its Source because a consented member
// publishes skills too and two Sources can hold one spelling
// (contracts/http-api.md § Host requirements #5) — and the compared file by its
// copy-relative place inside them, `file` omitted for the entries themselves.
// The row is named rather than derived, because two files can sit together on
// more than one row (`composables/skill-comparison.ts`). Coordinates rather than two
// free file paths, so a pair the model cannot express — two different
// names, one copy twice, another kind's file — cannot be written, only
// reported. The link survives rescans and server launches, resolving
// against whatever generation is current. Direct loads boot the shell
// first, so this page always opens against an adopted snapshot.
//
// Like the skill detail, this is a surface that shows file contents exactly
// as authored — credentials included, with nothing masked and no control
// that would uncover a masked value — and it says none of that (FR-027).
//
// Three things drop the open comparison, and all three are the same cleanup
// the comparison state owns: leaving the route closes it, a client-data
// purge clears it, and a commit drops the previous generation's view while
// this page re-requests the same pair under the new snapshot (FR-030).
import {
  comparisonFamilyOf,
  sideFamilyOf,
  fromJsonStringBody,
  type ComparisonSide,
  type SourceSelector,
  querySideOf,
  comparisonTitleSides,
} from '../../../components/detail-route';
import {
  comparisonOptionLabel,
  comparisonSourceQualifierOf,
} from '../../../components/comparison-side-picker';
import { sourceFactsOf } from '../../../components/source-name';
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NuxtLink } from '#components';
import RecognitionComparison from '../../../components/skill-comparison/RecognitionComparison.vue';
import SourceDiff from '../../../components/skill-comparison/SourceDiff.vue';
import { SkillRecognitionComparison } from '../../../components/skill-comparison/recognition-comparison';
import { skillComparisonRouteFor } from '../../../composables/skill-comparison';
import { useSessionViewState } from '../../../composables/session-view-state';
import { usePageOwnership } from '../../../composables/page-ownership';
import { useSessionSources } from '../../../composables/session-sources';
import {
  fileIdentityKey,
  escapeControlCharacters,
  FILE_ENCODING_TEXT,
  inlinePresentationLabel,
  isReadableFile,
} from '../../../../shared/entities';
import { FILE_DETAIL_KIND_TEXT } from '../../../../shared/api-text';
import type {
  FileDetailDto,
  SkillDefinitionDto,
  SkillInventoryEntryDto,
  SourceKind,
} from '../../../../shared/api-types';

const sessionViewState = useSessionViewState();

const comparison = sessionViewState.skillComparison;
const snapshot = sessionViewState.snapshot;
const status = comparison.status;

const route = useRoute();

const pageOwnership = usePageOwnership();
const router = useRouter();

/**
 * The Source family the address names, or null for a segment outside the two
 * this product issues ({@link comparisonFamilyOf}): every comparison route
 * leads with the family because a pair stays inside one family while a family
 * can hold two consented homes (contracts/http-api.md § Host requirements
 * #5). A null resolves nothing, and the template reports the link instead of
 * comparing.
 */
const family = computed<SourceKind | null>(() => comparisonFamilyOf(route.params['family']));

/**
 * One query parameter as the single path it names. A repeated parameter
 * arrives as an array; this route's are not repeated, so the array form
 * folds to its first value rather than being a case.
 */
function queryPath(name: string): string {
  const parameter = route.query[name];
  // Decoded through the spelling the link was built with, so a path holding
  // any character a file name can reaches the comparison as it was published
  // (`detail-route.ts`).
  if (typeof parameter === 'string') {
    return fromJsonStringBody(parameter);
  }
  return Array.isArray(parameter) && typeof parameter[0] === 'string'
    ? fromJsonStringBody(parameter[0])
    : '';
}

/**
 * The invocation name of the row the pair belongs to. Carried rather than
 * derived, because two files can sit together on more than one row: the
 * products invoke a skill by different facts
 * (`composables/skill-comparison.ts`).
 */
const rowNameParameter = computed(() => queryPath('name'));

/** The first copy's identity: its entry file's Source and path (FR-030). */
const leftSide = computed(() => querySideOf(route.query, 'leftSource', 'left'));
/** The second copy's identity: its entry file's Source and path (FR-030). */
const rightSide = computed(() => querySideOf(route.query, 'rightSource', 'right'));

/**
 * The compared file inside the copies, copy-relative. Absent means the
 * entries themselves: every copy's entry is its directory's `SKILL.md`, so
 * the default is the one relative path a pair of copies always shares.
 */
const requestedFile = computed(() => {
  const value = queryPath('file');
  return value === '' ? 'SKILL.md' : value;
});

/**
 * Whether the URL names a row and a pair at all; without all three there is
 * nothing to open. An empty `name` is an absent one here rather than a value:
 * a skill row is named by an authored name or by its skill directory, and
 * neither can be empty (FR-007).
 */
const hasPair = computed(
  () => rowNameParameter.value !== '' && leftSide.value !== null && rightSide.value !== null,
);

/**
 * The coordinates most recently requested by a switcher and not yet
 * reflected by the route. `router.replace` commits asynchronously, so two
 * rapid switches can land inside one navigation: a second switch that
 * composed with the route alone would compose with the coordinates being
 * replaced and silently undo the first. Every switcher reads and composes
 * through this pending value first; the watch below clears it the moment
 * the route has caught up, so the route stays the identity and this ref is
 * only the gap-filler.
 */
const pendingPair = shallowRef<{
  readonly left: ComparisonSide;
  readonly right: ComparisonSide;
  readonly file: string;
} | null>(null);

// The route caught up (or the reader navigated): the query is the truth
// again, and a pending value kept past this point would shadow it.
watch([rowNameParameter, leftSide, rightSide, requestedFile], () => {
  pendingPair.value = null;
});

/** The pending-aware current coordinates; the route's, once it has caught up. */
const currentLeft = computed(() => pendingPair.value?.left ?? leftSide.value);
const currentRight = computed(() => pendingPair.value?.right ?? rightSide.value);
const currentFile = computed(() => pendingPair.value?.file ?? requestedFile.value);

/**
 * Replaces the compared coordinates in place. `replace` rather than `push`:
 * rapid switching among a skill's files is this page's working motion, and
 * a history entry per switch would make the back button replay every pair
 * the reader stepped through on the way. The default compared file rides as
 * an absent parameter, so the entry pair's URL is spelled one way.
 */
function switchTo(left: ComparisonSide, right: ComparisonSide, file: string): void {
  if (family.value === null) {
    // Unreachable: the switchers render only behind a null pairFault, which
    // an unreadable family segment is one of. The guard is what lets this
    // build the address without a fallback family that would move the reader
    // to another block's comparison.
    return;
  }
  pendingPair.value = { left, right, file };
  // The row stays the one the link named: a switch moves a side inside that
  // row, and re-deriving the row from the new pair would let a switch land on
  // a different row's copies.
  void router.replace(
    skillComparisonRouteFor(
      family.value,
      rowNameParameter.value,
      left,
      right,
      file === 'SKILL.md' ? undefined : file,
    ),
  );
}

/** The directory a path sits in, trailing slash kept. */
function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/') + 1);
}

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/** The published Sources; what every identity below resolves against. */
const sources = sessionSources.sources;

/**
 * One copy of the compared name: which Source it is in, the copy directory
 * inside that Source, its entry file, and the Source-relative Paths the
 * committed inventory attributes to it — the entry file plus its published
 * companion census (api-types.ts § SkillDefinitionDto.companionFiles).
 *
 * A class because production constructs one in exactly one place —
 * {@link population} — and the members accumulate there (AGENTS.md § Class
 * and interface policy). The Source is part of the copy's identity: two
 * Sources can hold one directory spelling, and those are two copies
 * (FR-030).
 */
class SkillCopy {
  /** The switcher option value: the Source ID and directory as one key. */
  public readonly key: string;

  /** The Source ID the copy's files are committed under (FR-030). */
  public readonly sourceId: string;

  /** The copy's Source as the route names it; what a switch writes. */
  public readonly source: SourceSelector;

  /** The copy directory inside its Source, trailing slash kept. */
  public readonly directory: string;

  /** The copy's entry file — the identity path a copy switch writes. */
  public readonly entryPath: string;

  /**
   * The Source-relative Paths the committed inventory attributes to the
   * copy, all of the copy's own Source: a census entry is a path of the
   * Source that published it.
   */
  public readonly members: Set<string>;

  /** Records one copy directory; {@link population} adds the members. */
  public constructor(
    sourceId: string,
    source: SourceSelector,
    directory: string,
    entryPath: string,
  ) {
    this.key = fileIdentityKey(sourceId, directory);
    this.sourceId = sourceId;
    this.source = source;
    this.directory = directory;
    this.entryPath = entryPath;
    this.members = new Set();
  }
}

/**
 * A name's copies as the committed inventory attributes files to them,
 * keyed by {@link SkillCopy.key}.
 */
type CopyPopulation = ReadonlyMap<string, SkillCopy>;

/**
 * The committed readable files by identity — the comparison-eligible files
 * (FR-025). Keyed by Source and path, because two Sources can hold one
 * spelling and only one of them may be readable (FR-030).
 */
const readablePaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? [])
        .filter(isReadableFile)
        .map((file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)),
    ),
);

/**
 * Every committed file's identity, readable or not: what the one-sided open
 * below asks to tell a file that resolves in the current scan from one that
 * does not — a question about the snapshot, where membership in a copy is
 * the census's.
 */
const committedPaths = computed(
  () =>
    new Set(
      (snapshot.value?.files ?? []).map((file) =>
        fileIdentityKey(file.sourceId, file.sourceRelativePath),
      ),
    ),
);

/**
 * The one inventory row owning the pair: the row the URL names, holding both
 * identities as entry files of its definitions. The name is read from the URL
 * rather than derived from the two paths, because two files can sit together
 * on more than one row — `.claude/skills/alpha/SKILL.md` declaring
 * `name: beta` beside `.claude/skills/beta/SKILL.md` declaring `name: alpha`
 * is on the `alpha` row and the `beta` row alike — and a derived row would be
 * whichever sorts first, dropping a third copy of the row the reader opened
 * from out of the switchers below. Null when no such row exists, which the
 * template reports instead of comparing: a pair of two different names, one
 * copy twice, or an identity the current scan does not hold is not a
 * comparison this model expresses.
 */
const owningRow = computed<SkillInventoryEntryDto | null>(() => {
  const left = currentLeft.value;
  const right = currentRight.value;
  if (
    !hasPair.value ||
    left === null ||
    right === null ||
    (left.source === right.source && left.sourceRelativePath === right.sourceRelativePath)
  ) {
    return null;
  }
  // The sides' route tokens resolved to Source IDs, because a definition
  // names its file by ID and path — one identity, both halves (FR-030). A
  // token no committed Source answers to resolves to no row, which
  // {@link pairFault} reports as the pair not being this scan's.
  const leftId = sessionSources.sourceIdFor(left.source);
  const rightId = sessionSources.sourceIdFor(right.source);
  if (leftId === null || rightId === null) {
    return null;
  }
  for (const entry of snapshot.value?.skills ?? []) {
    if (entry.name !== rowNameParameter.value) {
      continue;
    }
    const entries = new Set(
      entry.definitions.map((d) => fileIdentityKey(d.sourceId, d.sourceRelativePath)),
    );
    if (
      entries.has(fileIdentityKey(leftId, left.sourceRelativePath)) &&
      entries.has(fileIdentityKey(rightId, right.sourceRelativePath))
    ) {
      return entry;
    }
  }
  return null;
});

/**
 * The owning name's copies with the files the committed inventory
 * attributes to each — the entry file plus its published companion census
 * (api-types.ts § SkillDefinitionDto.companionFiles). Null while no row
 * owns the pair.
 */
const population = computed<CopyPopulation | null>(() => {
  const row = owningRow.value;
  if (row === null) {
    return null;
  }
  const files = new Map<string, SkillCopy>();
  for (const definition of row.definitions) {
    if (sessionSources.familyKindOf(definition.sourceId) !== family.value) {
      // Another family's copy: a pair stays inside the addressed family, so
      // the switchers never offer a copy outside it.
      continue;
    }
    const directory = directoryOf(definition.sourceRelativePath);
    const key = fileIdentityKey(definition.sourceId, directory);
    let copy = files.get(key);
    if (copy === undefined) {
      copy = new SkillCopy(
        definition.sourceId,
        // The definition's Source resolves within the snapshot it came from;
        // the shared lookup is total either way (`session-sources.ts`).
        sessionSources.selectorOf(definition.sourceId),
        directory,
        definition.sourceRelativePath,
      );
      files.set(key, copy);
    }
    copy.members.add(definition.sourceRelativePath);
    for (const companion of definition.companionFiles) {
      copy.members.add(companion);
    }
  }
  return files;
});

/** The population's copies, in the row's definition order. */
const copies = computed<readonly SkillCopy[] | null>(() =>
  population.value === null ? null : [...population.value.values()],
);

/**
 * The copy one current side stands on: the side's Source and its entry
 * file's directory, resolved in the population. Null while no row owns the
 * pair — and the entry's copy always resolves while one does, because the
 * owning row's definitions are what the population was built from.
 */
function copyOfSide(side: ComparisonSide | null): SkillCopy | null {
  if (owningRow.value === null || population.value === null || side === null) {
    return null;
  }
  const sourceId = sessionSources.sourceIdFor(side.source);
  return sourceId === null
    ? null
    : (population.value.get(fileIdentityKey(sourceId, directoryOf(side.sourceRelativePath))) ??
        null);
}

/** The first compared copy; null while no row owns the pair. */
const leftCopy = computed(() => copyOfSide(currentLeft.value));

/** The second compared copy; null while no row owns the pair. */
const rightCopy = computed(() => copyOfSide(currentRight.value));

/** The compared file coordinate, echoed while a row owns the pair. */
const comparedFile = computed(() => (owningRow.value === null ? null : currentFile.value));

/**
 * The pair's compared file paths, composed from the copies and the compared
 * file — the path half of the identities the detail loads and the diff
 * labels use; each side's Source is its copy's (FR-030). Null while no row
 * owns the pair.
 */
const composedLeftPath = computed(() =>
  leftCopy.value === null ? null : leftCopy.value.directory + currentFile.value,
);
const composedRightPath = computed(() =>
  rightCopy.value === null ? null : rightCopy.value.directory + currentFile.value,
);

/**
 * The copy-relative paths readable among one copy's attributed files, the
 * entry file first and the census's own sorted order after it. Membership is
 * the copy's own published file list — the entry plus its census
 * (api-types.ts § SkillDefinitionDto.companionFiles), the same set the skill
 * detail's file tree shows — never a re-attribution among the row's copies:
 * a nested copy's companions are members of the outer copy's census too, and
 * that is the publication, so both copies offer them at their own relative
 * paths, exactly as both copies' file trees list them. The copy itself is
 * already settled by the side's entry identity ({@link copyOfSide}), so an
 * offered file never moves the pair to another copy (FR-011, FR-030).
 */
function readableRelatives(copy: SkillCopy): readonly string[] {
  const relatives: string[] = [];
  for (const path of copy.members) {
    if (readablePaths.value.has(fileIdentityKey(copy.sourceId, path))) {
      relatives.push(path.slice(copy.directory.length));
    }
  }
  return relatives;
}

/**
 * Whether one copy's published membership holds a file at `relative`,
 * readable or not; see {@link readableRelatives} for why membership is the
 * census's own fact rather than a re-attribution.
 */
function ownedIn(copy: SkillCopy, relative: string): boolean {
  return copy.members.has(copy.directory + relative);
}

/** Whether one copy owns a readable file at `relative`; see {@link ownedIn}. */
function readableIn(copy: SkillCopy, relative: string): boolean {
  return (
    ownedIn(copy, relative) &&
    readablePaths.value.has(fileIdentityKey(copy.sourceId, copy.directory + relative))
  );
}

/**
 * Whether a copy can be the opposite side of a comparison at `relative`: it
 * owns a readable file there, or it owns nothing there at all — the stated
 * absence a one-sided comparison shows (FR-011).
 *
 * An owned copy whose bytes no reader shows is neither: a binary counterpart
 * is not comparison-eligible (FR-025), and calling it an absence would say
 * the copy ships no such file while its own page lists one. Distinct from
 * {@link standsAt}, which asks whether a *named* file belongs to the model at
 * all — a hand-written link to a binary counterpart is inside the model and
 * settles as this surface's own not-readable statement.
 */
function opposableAt(copy: SkillCopy, relative: string): boolean {
  return (
    readableIn(copy, relative) ||
    (!ownedIn(copy, relative) &&
      !committedPaths.value.has(fileIdentityKey(copy.sourceId, copy.directory + relative)))
  );
}

/**
 * The copy-relative paths readable in both given copies, in the first
 * copy's option order — what a copy switch falls back to when the current
 * file cannot be kept, because a switch must land on a pair that has
 * something to show.
 */
function commonFiles(copy: SkillCopy, otherCopy: SkillCopy): readonly string[] {
  return readableRelatives(copy).filter((relative) => readableIn(otherCopy, relative));
}

/**
 * One compared-file switcher option. A class because production constructs
 * one in exactly one place — {@link fileOptions} — and the label is derived
 * where it is read rather than stored beside what it derives from (AGENTS.md
 * § Class and interface policy, § Implementation simplicity policy).
 */
class ComparedFileOption {
  /** The copy-relative path this option steps the pair to. */
  public readonly relative: string;

  /**
   * Which current copy alone has a file at this relative path, or null when
   * both own one. 'left'/'right' states a genuine absence: the other copy
   * owns nothing there and the current scan commits nothing at the composed
   * path — exactly the condition the one-sided open requires (openCurrent),
   * so the label and the opened comparison can never disagree. A committed
   * file at that path the copy does not own is neither, and gets no option
   * at all ({@link fileOptions}). Not readability: a binary counterpart is
   * owned, so its file is not "only in" the other copy.
   */
  public readonly onlyIn: 'left' | 'right' | null;

  /** Records one relative path and which side, if either, holds it alone. */
  public constructor(relative: string, onlyIn: 'left' | 'right' | null) {
    this.relative = relative;
    this.onlyIn = onlyIn;
  }

  /**
   * What the option reads as: the relative path through {@link inlinePresentationLabel},
   * and — for a file only one copy ships — which skill directory that is, so
   * the existence difference is visible in the list itself. A path that
   * happens to spell the one-sided note stays as authored: matching this
   * product's own copy against authored text would turn display wording
   * into load-bearing syntax, and the comparison itself shows each side's
   * identity in full.
   */
  public get label(): string {
    const spelled = inlinePresentationLabel(this.relative);
    if (this.onlyIn === 'left') {
      return `${spelled} (first skill directory only)`;
    }
    if (this.onlyIn === 'right') {
      return `${spelled} (second skill directory only)`;
    }
    return spelled;
  }
}

/**
 * The files the pair can step through: every file readable in either current
 * copy — the first copy's files in committed order, then the second copy's
 * own. The union rather than the intersection, because a file only one copy
 * ships is itself a difference between the copies (FR-011): stepping to it
 * shows the present side's complete content against its stated absence. A
 * file no reader shows is not offered on either side — a copy's own binary
 * file is not comparison-eligible, and neither is a readable file whose
 * counterpart is one ({@link opposableAt}, FR-025).
 */
const fileOptions = computed<readonly ComparedFileOption[]>(() => {
  const left = leftCopy.value;
  const right = rightCopy.value;
  if (left === null || right === null) {
    return [];
  }
  const committed = committedPaths.value;
  const options: ComparedFileOption[] = [];
  const offer = (relative: string, other: SkillCopy, onlyIn: 'left' | 'right'): void => {
    if (readableIn(other, relative)) {
      options.push(new ComparedFileOption(relative, null));
    } else if (
      !ownedIn(other, relative) &&
      !committed.has(fileIdentityKey(other.sourceId, other.directory + relative))
    ) {
      options.push(new ComparedFileOption(relative, onlyIn));
    }
    // Two corresponding paths offer nothing. A committed file the other copy
    // does not own — a symbolically linked subtree's independently committed
    // contents — is neither a counterpart nor an absence, and a hand-written
    // `file` coordinate naming it is rejected by the same predicate through
    // pairFault. A counterpart the other copy owns but no reader shows is
    // not comparison-eligible either (FR-025), and it is not an absence: the
    // copy does ship the file, so offering it as one-sided would say
    // otherwise ({@link opposableAt}).
  };
  for (const relative of readableRelatives(left)) {
    offer(relative, right, 'left');
  }
  for (const relative of readableRelatives(right)) {
    if (!options.some((option) => option.relative === relative)) {
      offer(relative, left, 'right');
    }
  }
  return options;
});

/**
 * Whether the switchers render: a row owns the pair — the only comparable
 * state the URL scheme can express — and the current copies offer at least
 * one comparable file.
 */
const switchersAvailable = computed(() => owningRow.value !== null && fileOptions.value.length > 0);

/**
 * The compared-file switcher binding: choosing a file moves the `file`
 * coordinate, so the two sides are always the same file of two copies. A
 * computed with a setter so the `<select>` binds with `v-model` and no
 * event handler reaches into the DOM for the chosen value.
 */
const fileSelection = computed({
  get: () => comparedFile.value ?? '',
  set: (relative: string) => {
    const left = currentLeft.value;
    const right = currentRight.value;
    if (owningRow.value !== null && left !== null && right !== null) {
      switchTo(left, right, relative);
    }
  },
});

/**
 * Whether a copy can stand on one side of a pair at `relative`: it owns a
 * file there, or genuinely holds nothing — nothing committed at the
 * composed path — which is the stated absence of a one-sided pair. A
 * committed file the copy does not own is neither; see
 * {@link fileOptions}.
 */
function standsAt(copy: SkillCopy, relative: string): boolean {
  return (
    ownedIn(copy, relative) ||
    !committedPaths.value.has(fileIdentityKey(copy.sourceId, copy.directory + relative))
  );
}

/**
 * The file a pair keeps when one side moves to `directory`, its other side
 * staying on `otherDirectory`: the currently compared file whenever one of
 * those two copies still owns it readably and the other can stand opposite
 * it ({@link opposableAt}) — a copy that owns nothing there makes the pair
 * one-sided, which is a difference this surface states rather than a pair
 * to steer around (FR-011), and the reader's chosen file is not changed
 * under them. Only when the current file cannot be kept does the switch
 * fall back to the first file both copies share, so it still lands where
 * something can be shown; the ready announcement names the compared file,
 * which is how that fallback is heard. Null when there is neither; that
 * copy's option is disabled.
 */
function fileFor(copy: SkillCopy, otherCopy: SkillCopy): string | null {
  const current = comparedFile.value;
  if (
    current !== null &&
    ((readableIn(copy, current) && opposableAt(otherCopy, current)) ||
      (readableIn(otherCopy, current) && opposableAt(copy, current)))
  ) {
    return current;
  }
  return commonFiles(copy, otherCopy)[0] ?? null;
}

/**
 * Whether a copy can stand on the side whose opposite is `otherDirectory`:
 * the other side's own copy cannot — the two sides would hold one file
 * (FR-011) — and neither can a copy that would neither keep the current
 * file nor share any comparable file with the other side.
 */
function copyDisabled(copy: SkillCopy, otherCopy: SkillCopy | null): boolean {
  return otherCopy === null || copy === otherCopy || fileFor(copy, otherCopy) === null;
}

/** The identity a copy switch writes into the URL: the copy's entry file. */
function sideOf(copy: SkillCopy): ComparisonSide {
  return { source: copy.source, sourceRelativePath: copy.entryPath };
}

/** The first side's copy switcher binding; see {@link fileSelection}. */
const leftCopySelection = computed({
  get: () => leftCopy.value?.key ?? '',
  set: (key: string) => {
    const copy = population.value?.get(key);
    const other = rightCopy.value;
    const relative = copy === undefined || other === null ? null : fileFor(copy, other);
    if (copy !== undefined && other !== null && relative !== null) {
      switchTo(sideOf(copy), sideOf(other), relative);
    }
  },
});

/** The second side's copy switcher binding; see {@link fileSelection}. */
const rightCopySelection = computed({
  get: () => rightCopy.value?.key ?? '',
  set: (key: string) => {
    const copy = population.value?.get(key);
    const other = leftCopy.value;
    const relative = copy === undefined || other === null ? null : fileFor(copy, other);
    if (copy !== undefined && other !== null && relative !== null) {
      switchTo(sideOf(other), sideOf(copy), relative);
    }
  },
});

/**
 * What is wrong with the link's coordinates, before any request — the
 * model's own validation, reported instead of a comparison. Null when the
 * pair is the model's: two distinct entry identities one row owns, with a
 * compared file each copy either owns or genuinely lacks.
 */
const pairFault = computed<string | null>(() => {
  if (family.value === null) {
    return 'This link does not say where its copies came from. Open a comparison from a skill’s row in the inventory, or from its detail page.';
  }
  if (!hasPair.value) {
    return 'This link names no pair of skill directories. Open a comparison from a skill’s row in the inventory, or from its detail page.';
  }
  const leftIdentity = currentLeft.value;
  const rightIdentity = currentRight.value;
  if (
    leftIdentity !== null &&
    rightIdentity !== null &&
    leftIdentity.source === rightIdentity.source &&
    leftIdentity.sourceRelativePath === rightIdentity.sourceRelativePath
  ) {
    return 'A comparison needs two distinct copies of a skill, and this link names the same one twice.';
  }
  if (
    leftIdentity !== null &&
    rightIdentity !== null &&
    (sideFamilyOf(leftIdentity) !== family.value || sideFamilyOf(rightIdentity) !== family.value)
  ) {
    // A cross-family link included: a pair never spans the repository and a
    // consented home (contracts/http-api.md § Host requirements #5).
    return 'A copy this link names is not from the place this link’s address names. Open a comparison from a skill’s row in the inventory.';
  }
  const left = leftCopy.value;
  const right = rightCopy.value;
  if (left === null || right === null) {
    return 'No skill name in the current scan owns both of this link’s directories. The inventory may have changed since the link was made; open a comparison from a skill’s row.';
  }
  // Each side must be the copy's own file or its stated absence
  // ({@link standsAt}): a committed file at the composed path that the copy
  // does not own — a symbolically linked subtree's independently committed
  // contents — is outside the model, so it is reported here exactly as the
  // switchers exclude it, never compared (FR-011).
  if (!standsAt(left, currentFile.value) || !standsAt(right, currentFile.value)) {
    return 'This link’s compared file is not one of the named copies’ own files. Step the compared-file switcher to a file the copies ship, or open a comparison from a skill’s row.';
  }
  return null;
});

/**
 * Opens what the current coordinates name: the two-file comparison when
 * both composed paths are committed — a binary counterpart included, whose
 * open settles as the named not-readable outcome — and the one-sided
 * comparison when exactly one is: the pair corresponds by construction, so
 * an uncommitted side is the stated absence itself (FR-011). Neither
 * committed — a hand-edited `file` no copy holds — settles as the ordinary
 * stale outcome.
 */
function openCurrent(): void {
  const left = leftCopy.value;
  const right = rightCopy.value;
  if (left === null || right === null) {
    // Narrowing only: every caller runs behind a null {@link pairFault},
    // which requires both copies to resolve.
    return;
  }
  const relative = currentFile.value;
  const leftComposed: ComparisonSide = {
    source: left.source,
    sourceRelativePath: left.directory + relative,
  };
  const rightComposed: ComparisonSide = {
    source: right.source,
    sourceRelativePath: right.directory + relative,
  };
  const committed = committedPaths.value;
  const leftCommitted = committed.has(
    fileIdentityKey(left.sourceId, leftComposed.sourceRelativePath),
  );
  const rightCommitted = committed.has(
    fileIdentityKey(right.sourceId, rightComposed.sourceRelativePath),
  );
  if (leftCommitted !== rightCommitted) {
    void comparison.openSingle(
      leftCommitted ? leftComposed : rightComposed,
      leftCommitted ? 'left' : 'right',
    );
    return;
  }
  void comparison.open(leftComposed, rightComposed);
}

// One effect owns "which pair should be open", so entering the route, a URL
// edit, a switch, and a committed generation all take the same path. The
// committed generations are part of the key for the same reason the skill
// detail's watch documents: adopting a newer one drops the open comparison
// while the coordinates stay identical, so their change is what re-requests
// the same pair under the new snapshot. Declared after the model computeds
// because its immediate run consults them.
watch(
  [
    family,
    // The row name is part of the key: a URL that changes only `name` names a
    // different row, which can turn a comparison the model expresses into one
    // it does not, and a key without it would leave the previous pair open
    // while the template reported the fault.
    rowNameParameter,
    leftSide,
    rightSide,
    requestedFile,
    // Only the addressed family's own sequence: a commit invalidates only its
    // own sequence's views (FR-030, spec.md § Clarifications Session
    // 2026-07-22), so a Global commit must not re-request — and re-mount — a
    // repository comparison whose generation did not move.
    (): number | null =>
      family.value === 'global'
        ? (snapshot.value?.globalGeneration ?? null)
        : (snapshot.value?.repositoryGeneration ?? 0),
  ],
  () => {
    if (
      composedLeftPath.value === null ||
      composedRightPath.value === null ||
      pairFault.value !== null
    ) {
      // The coordinates are outside the model; the template reports the
      // fault ({@link pairFault}) instead of a comparison.
      comparison.close();
      return;
    }
    openCurrent();
  },
  { immediate: true },
);

/**
 * The inventory's definitions of one compared file — one per recognizing
 * tool (FR-007), which is the inventory's fact rather than the detail's, so
 * it is resolved from the snapshot the page already holds. The skill
 * inventory alone, because typed recognition metadata is kind-specific
 * (FR-011, spec.md § Clarifications): the URL's coordinates name skill
 * entries, so no other kind's file can be a compared copy — another kind's
 * typed metadata belongs to that kind's own surface.
 */
function definitionsOf(file: FileDetailDto['file']): readonly SkillDefinitionDto[] {
  return (snapshot.value?.skills ?? []).flatMap((entry) =>
    entry.definitions.filter(
      (definition) =>
        definition.sourceId === file.sourceId &&
        definition.sourceRelativePath === file.sourceRelativePath,
    ),
  );
}

/**
 * What one compared file is, beside its path: the family it is of, the
 * directory it was in where that family holds more than one Source, its
 * recognized kind, and its read outcome (US3 scenario 1). Per side rather
 * than per pair, because the two sides can be two Sources — a consented
 * home's copy beside another member's is the pair this route expresses —
 * and a pair labelled once would say the same thing about both (FR-002,
 * FR-030).
 */
function fileFacts(detail: FileDetailDto): string {
  const facts = [
    ...sourceFactsOf(sources.value, detail.file.sourceId),
    FILE_DETAIL_KIND_TEXT[detail.kind],
    FILE_ENCODING_TEXT[detail.file.encoding],
  ];
  if (detail.file.encoding !== 'unknown') {
    facts.push(`${detail.file.sizeBytes} bytes`);
  }
  return facts.join(' · ');
}

/**
 * One side's text for the diff: the complete `sourceText` of a readable
 * detail, the empty string for the absent side of a one-sided comparison —
 * an empty side is what makes the present content read, line by line, as
 * the difference — and null for a variant that has no text to show.
 */
function diffText(detail: FileDetailDto | null): string | null {
  if (detail === null) {
    return '';
  }
  return isReadableFile(detail.file) ? detail.file.sourceText : null;
}

/**
 * Whether a switch has requested coordinates the route has not reflected
 * yet. Module scope, because {@link readyView} shadows the route computeds
 * with its own row-composed locals. A pending value equal to the route is
 * not a newer selection — re-picking the open file replaces the route with
 * itself, which vue-router answers without a change for the clearing watch
 * to see — so it does not count as pending here.
 */
const pendingDiffersFromRoute = computed(() => {
  const pending = pendingPair.value;
  if (pending === null) {
    return false;
  }
  const sameSide = (requested: ComparisonSide, routed: ComparisonSide | null): boolean =>
    routed !== null &&
    requested.source === routed.source &&
    requested.sourceRelativePath === routed.sourceRelativePath;
  return (
    !sameSide(pending.left, leftSide.value) ||
    !sameSide(pending.right, rightSide.value) ||
    pending.file !== requestedFile.value
  );
});

/**
 * The whole ready view as one derivation, null outside 'ready': the two
 * identity sides (each side's requested path with its adopted detail, or a
 * null detail for the stated absence of a one-sided comparison), the diff
 * input (the requested paths with the complete texts, guarded by the same
 * readable-variant check the comparison state enforces so `sourceText` is
 * never reached on a variant that lacks it), and the recognition
 * comparison — built for a one-sided pair too, whose present side's
 * recognitions and declarations stand beside the stated absence (FR-011,
 * T203).
 *
 * One computed rather than one per projection, because its release is its
 * next read: a dirty computed retains its previous value until then, and a
 * per-projection computed that only the ready branch reads would keep the
 * last pair's authored content cached behind an error statement for as long
 * as the page shows one (FR-027). Bundled here and read by the template's
 * first branch condition on every render, the view re-derives to null on
 * the first render after leaving 'ready' — the same flush that takes the
 * rendered content out of the DOM. The externally reachable holders of
 * authored text — the Monaco models and the fallback DOM — keep their
 * synchronous disposal through the purge's owner registry; this cache is
 * reachable only through the read that re-derives it.
 */
const readyView = computed(() => {
  if (status.value !== 'ready') {
    return null;
  }
  if (pendingDiffersFromRoute.value) {
    // A switch updates the composed coordinates one render before the
    // re-request drops this view. The adopted details are still the previous
    // selection's — and an absent side is encoded as a null detail, so it
    // cannot vouch for its own coordinate — which would label the old pair's
    // authored content, or a stated absence, with the new selection's paths
    // for that frame (FR-025, FR-030). Nothing renders until the route
    // catches up and the re-request owns the view.
    return null;
  }
  const leftPath = composedLeftPath.value;
  const rightPath = composedRightPath.value;
  if (leftPath === null || rightPath === null) {
    // A torn frame between a snapshot replacement and the re-request it
    // triggers: without a row there is no pair to show, whatever the status
    // still says.
    return null;
  }
  const left = comparison.leftDetail.value;
  const right = comparison.rightDetail.value;
  const originalText = diffText(left);
  const modifiedText = diffText(right);
  return {
    sides: [
      { caption: 'First file', path: leftPath, detail: left },
      { caption: 'Second file', path: rightPath, detail: right },
    ] as const,
    diff:
      originalText === null || modifiedText === null
        ? null
        : {
            originalText,
            originalPath: leftPath,
            modifiedText,
            modifiedPath: rightPath,
            // Presence crosses the boundary with the texts: an absent
            // side's empty model is diff arithmetic, not an empty file, and
            // the surface labels the difference (FR-025).
            originalAbsent: left === null,
            modifiedAbsent: right === null,
          },
    // A one-sided pair passes its absent side as null: the present side's
    // recognitions and declarations stand beside the stated absence (T203).
    recognition: new SkillRecognitionComparison(
      left === null ? null : { detail: left, definitions: definitionsOf(left.file) },
      right === null ? null : { detail: right, definitions: definitionsOf(right.file) },
    ),
  };
});

/**
 * What this page says for the state it is in — one value read by both the
 * visible copy and the live region, so what a reader hears is the sentence
 * on the screen (WCAG 4.1.3). A link fault outranks the request status;
 * empty for 'ready', whose content is read as focus moves through it, and
 * for 'loading', which has its own phrase.
 */
const stateStatement = computed<string | null>(() => {
  const fault = pairFault.value;
  if (fault !== null) {
    return fault;
  }
  switch (status.value) {
    case 'same-path':
      // Unreachable from this page — distinct copies compose distinct
      // paths — but the state is the composable's contract for its other
      // callers, and an arm must say something.
      return 'A comparison needs two distinct files, and this link names the same file twice.';
    case 'stale':
      return 'Nothing in the current scan sits at this link’s compared file. The inventory may have changed since the link was made; a rescan that brings the file back will make it resolve again.';
    case 'not-readable':
      // Through the switchers' own spelling ({@link inlinePresentationLabel}), because
      // this paragraph collapses whitespace: a path with consecutive,
      // leading, or trailing spaces would otherwise be announced under a
      // different spelling than the file it names (FR-025).
      return `This file has no readable source text to compare: ${inlinePresentationLabel(
        comparison.unreadablePath.value ?? '',
      )}`;
    case 'failed':
      return comparison.errorMessage.value === null
        ? 'This comparison could not be loaded.'
        : `This comparison could not be loaded. ${comparison.errorMessage.value}`;
    case 'idle':
      return 'This comparison could not be loaded.';
    case 'loading':
    case 'ready':
      return null;
  }
  return null;
});

/**
 * What the polite live region announces; see {@link stateStatement}. Unlike
 * the statement, 'loading' and 'ready' announce themselves: a reader
 * stepping the switchers holds focus on a select, so without a completion
 * phrase nothing would say the comparison behind it changed (WCAG 4.1.3).
 * The ready phrase names the compared file, because a copy switch can fall
 * back to a different file than the one the reader had ({@link fileFor}),
 * and the name is how that change reaches ears the moved select never left.
 */
const announcement = computed(() => {
  if (status.value === 'loading') {
    return 'Loading this comparison…';
  }
  if (status.value === 'ready') {
    const relative = comparedFile.value;
    return relative === null
      ? 'Comparison ready.'
      : `Comparison ready: ${inlinePresentationLabel(relative)}.`;
  }
  return stateStatement.value ?? '';
});

/**
 * Whether the failed statement gets a retry: 'failed' and the recoverable
 * 'idle' both re-request the same pair, while a link fault, 'stale', and
 * 'not-readable' describe the link itself, which no retry changes.
 */
const retryable = computed(
  () => pairFault.value === null && (status.value === 'failed' || status.value === 'idle'),
);

/**
 * What a copy switcher option reads as: the copy's directory and, where the
 * copy's family holds more than one Source, the directory its Source was
 * admitted at — two homes can hold one directory spelling, and an option
 * list naming it once would offer the same word twice
 * (`source-name.ts` § sourceRootOf).
 */
function copyLabel(copy: SkillCopy): string {
  return comparisonOptionLabel(
    inlinePresentationLabel(copy.directory),
    comparisonSourceQualifierOf(sources.value, copy.sourceId),
  );
}

/** The page heading, focused on entry so a keyboard user starts at the top. */
const heading = ref<HTMLHeadingElement | null>(null);

/** The ready view's own region; what the focus guard below watches. */
const readyRegion = ref<HTMLElement | null>(null);

/** The error/state statement's region; watched by the same focus guard. */
const stateRegion = ref<HTMLElement | null>(null);

/** The switchers' region; what the pickers focus guard below watches. */
const pickersRegion = ref<HTMLElement | null>(null);

/**
 * Whether the per-side copy switchers render: only a name with more than
 * two copies has a copy to move a side to — with exactly two, both already
 * stand on the two sides and each selector would offer nothing but its own
 * value (T200).
 */
const copySwitchersShown = computed(() => (copies.value?.length ?? 0) > 2);

/** The two copy pickers; what the copy-picker focus guard below watches. */
const firstCopyPicker = ref<HTMLElement | null>(null);
const secondCopyPicker = ref<HTMLElement | null>(null);

/** The failed statement's retry button; what the retry focus guard watches. */
const retryButton = ref<HTMLButtonElement | null>(null);

/** Set as the route is left, so the focus guard yields to the next route. */
let leaving = false;

// A generation replacement drops the ready view while keyboard focus may be
// inside it — in the diff editor above all — and the unmount would silently
// drop focus to the document body (WCAG 2.4.3, the skill detail page's own
// guards' contract). Synchronous, because after the patch the focused
// element is already gone. Scoped to the regions rather than the page, so a
// file switch — which also leaves 'ready' for a moment — never yanks focus
// off the switcher the reader is operating. The statement region is guarded
// the same way: a stale statement's automatic session refresh can adopt a
// newer generation while focus sits on the region's inventory link, and the
// return to 'loading' unmounts that link too.
watch(
  status,
  (next) => {
    if (leaving) {
      return;
    }
    const leavesReadyRegion =
      next !== 'ready' && readyRegion.value?.contains(document.activeElement) === true;
    const leavesStateRegion =
      (next === 'loading' || next === 'ready') &&
      stateRegion.value?.contains(document.activeElement) === true;
    if (leavesReadyRegion || leavesStateRegion) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The same rescue for the switchers themselves: a committed generation can
// take the population away — the name lost a copy, or a compared file
// stopped being readable — and unmount the very select the reader is
// operating (WCAG 2.4.3). Synchronous for the same reason as above.
watch(
  switchersAvailable,
  (available) => {
    if (!available && !leaving && pickersRegion.value?.contains(document.activeElement) === true) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// The retry button is its own case: a committed generation can take the
// pair's validity away while the reader is focused on it — 'failed'
// settles to 'idle' through the close, so the status guards above see no
// unmounting transition, and only pairFault's flip removes the button
// (WCAG 2.4.3). Scoped to the button itself, because the statement region
// stays mounted around it.
watch(
  retryable,
  (can) => {
    if (!can && !leaving && retryButton.value === document.activeElement) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

// And one level deeper: a committed generation can take away only a third
// copy the pair does not stand on — the remaining two keep the switchers
// available, so the guard above never fires — while the copy selectors
// alone unmount under the reader's focus (WCAG 2.4.3). The rescue scope is
// the two copy pickers, because the file switcher stays mounted and focus
// on it must not be yanked.
watch(
  copySwitchersShown,
  (shown) => {
    if (
      !shown &&
      !leaving &&
      (firstCopyPicker.value?.contains(document.activeElement) === true ||
        secondCopyPicker.value?.contains(document.activeElement) === true)
    ) {
      heading.value?.focus();
    }
  },
  { flush: 'sync' },
);

/**
 * Re-requests the pair the URL names; the failed state's retry. Focus moves
 * to the heading first, because the button this click came from unmounts
 * with the failed branch the moment the state returns to loading, and focus
 * would drop to the document body (WCAG 2.4.3).
 */
function retryOpen(): void {
  heading.value?.focus();
  // The retry button renders only while a row owns the pair, so both copies
  // resolve; {@link openCurrent} narrows the same way.
  openCurrent();
}

onMounted(() => {
  // Arriving from the inventory: the shell is already mounted, so nothing
  // else places focus, and this page's own mount is the moment its heading
  // exists (WCAG 2.4.3).
  heading.value?.focus();
});

/**
 * What the document title says this page is showing (WCAG 2.4.2): the
 * comparison, or the state that replaced it — a reader returning to a tab
 * must not find a title claiming a comparison the page no longer shows.
 */
const titleSubject = computed<string>(() => {
  if (pairFault.value !== null) {
    return hasPair.value ? 'Link names no comparable pair' : 'Link names no comparison';
  }
  switch (status.value) {
    case 'ready':
    case 'loading': {
      // The row and its pair in the title, so two comparison tabs never read
      // identically (WCAG 2.4.2; `detail-route.ts` § comparisonTitleSides).
      const sides = comparisonTitleSides(leftSide.value, rightSide.value);
      if (sides === null) {
        return 'Comparing skill files';
      }
      const subject = rowNameParameter.value === '' ? null : rowNameParameter.value;
      // The compared file rides in the title too: stepping the pair through
      // its files changes what the page shows, and two tabs on two files of
      // one pair must not read identically (WCAG 2.4.2).
      const base =
        subject === null
          ? `Comparing skill files — ${sides}`
          : `Comparing skill files: ${subject} — ${sides}`;
      return `${base} — ${requestedFile.value}`;
    }
    case 'stale':
      return 'Link not in this scan';
    case 'same-path':
      return 'Comparison needs two distinct files';
    case 'not-readable':
      return 'Comparison needs readable files';
    case 'failed':
    case 'idle':
      return 'Comparison could not be loaded';
  }
  return 'Comparing skill files';
});
watchEffect(() => {
  // Reported as this page instance's own, so an outgoing page's unmount
  // cannot erase what this page just titled the tab with
  // (`SessionViewState.reportPageSubject`).
  pageOwnership.reportSubject(titleSubject.value);
});

onBeforeUnmount(() => {
  // Before the close, whose status change would otherwise trip the focus
  // guard while the next route owns focus.
  leaving = true;
  // Leaving the route drops the authored sources this page requested; the
  // title subject is `usePageOwnership`'s to release, after unmount, where a
  // replacement page's own report stands.
  comparison.close();
});
</script>

<template>
  <div class="aci-skill-compare">
    <!-- Returns to the tab this page came from: the inventory's kind is URL
         state, so naming it here is what makes the link land on the skill
         list rather than the kind order's default tab. -->
    <p><NuxtLink to="/?kind=skill">Back to the inventory</NuxtLink></p>

    <h2 ref="heading" tabindex="-1">Compare skill files</h2>

    <!-- Stable rather than inserted with the state it reports, because a
         region that appears together with its message is not reliably read
         (WCAG 4.1.3). -->
    <p class="aci-live-region" role="status" aria-live="polite" aria-atomic="true">
      {{ announcement }}
    </p>

    <!-- The switchers: a comparison is one corresponding file across two
         copies of one skill name, so what a reader chooses is which file —
         the two sides are always that same file — and, when the name has
         more than two copies, which copies stand on the two sides. Stepping
         the compared-file switcher is how three or more files are reviewed
         pair by pair, with no selection composed anywhere else. Present
         whenever a row owns the coordinates — the not-readable state
         included, which is exactly the state a switch recovers from — while
         a link fault ({@link pairFault}) renders the report alone.
         Native selects, each labelled through `for`/`id` rather than a
         wrapping label: the accessible-name computation folds an embedded
         control's own value into a wrapping label's text, so a wrapped
         select would announce itself with its options mixed into its name
         (WCAG 2.4.6). -->
    <div v-if="switchersAvailable" ref="pickersRegion" class="aci-skill-compare__pickers">
      <div class="aci-skill-compare__picker">
        <label for="aci-skill-compare-file">Compared file</label>
        <select id="aci-skill-compare-file" v-model="fileSelection">
          <!-- Every file either current copy ships readably. One a single
               copy ships says so in its own label, and stepping to it shows
               the present content against its stated absence — the existence
               difference is part of the comparison (FR-011). -->
          <option v-for="option in fileOptions" :key="option.relative" :value="option.relative">
            {{ option.label }}
          </option>
        </select>
      </div>
      <!-- The per-side copy switchers appear only when the name has more
           than two copies: with exactly two, both already stand on the two
           sides and each selector would offer nothing but its own value —
           dead controls (T200). -->
      <template v-if="copySwitchersShown">
        <div ref="firstCopyPicker" class="aci-skill-compare__picker">
          <label for="aci-skill-compare-first-copy">First skill directory</label>
          <select id="aci-skill-compare-first-copy" v-model="leftCopySelection">
            <!-- The other side's copy is unselectable — the two sides would
                 hold one file (FR-011) — as is a copy sharing no comparable
                 file with it. -->
            <option
              v-for="copy in copies ?? []"
              :key="copy.key"
              :value="copy.key"
              :disabled="copy !== leftCopy && copyDisabled(copy, rightCopy)"
            >
              {{ copyLabel(copy) }}
            </option>
          </select>
        </div>
        <div ref="secondCopyPicker" class="aci-skill-compare__picker">
          <label for="aci-skill-compare-second-copy">Second skill directory</label>
          <select id="aci-skill-compare-second-copy" v-model="rightCopySelection">
            <option
              v-for="copy in copies ?? []"
              :key="copy.key"
              :value="copy.key"
              :disabled="copy !== rightCopy && copyDisabled(copy, leftCopy)"
            >
              {{ copyLabel(copy) }}
            </option>
          </select>
        </div>
      </template>
    </div>

    <!-- The ready view leads the branch chain so its one bundled projection
         is evaluated on every render — that read is what re-derives it to
         null after leaving 'ready' (see readyView). One wrapper, so the
         focus guard can ask whether focus is inside the region a generation
         replacement unmounts. -->
    <div v-if="readyView !== null" ref="readyRegion">
      <!-- Each side stated with its own identity — path, Source, file type,
           read outcome — so neither file loses it to the diff
           (US3 scenario 1). The order is the link's: first named, first
           shown. The absent side of a one-sided comparison states the
           absence in the same place: which copy has no file at this path is
           the difference the reader came to see. -->
      <div class="aci-skill-compare__files">
        <section v-for="side in readyView.sides" :key="side.caption">
          <h3>{{ side.caption }}</h3>
          <p class="aci-skill-compare__file-path aci-path aci-authored-text">
            {{ escapeControlCharacters(side.path) }}
          </p>
          <p v-if="side.detail !== null" class="aci-skill-compare__file-facts aci-note">
            {{ fileFacts(side.detail) }}
          </p>
          <p v-else class="aci-skill-compare__file-facts aci-note">
            No file at this path in this skill directory — the other side's complete content is the
            difference.
          </p>
        </section>
      </div>

      <!-- The component owns the section order — the declarations, the
           instructions, the complete files it takes below through the
           `source` slot, and last the recognitions (research.md § 7). What
           the source diff is stays this page's, because the absent side of a
           one-sided comparison is this page's model. -->
      <RecognitionComparison
        :comparison="readyView.recognition"
        :left-path="readyView.sides[0].path"
        :right-path="readyView.sides[1].path"
      >
        <template v-if="readyView.diff !== null" #source>
          <div class="aci-skill-compare__source">
            <!-- Headed like the sections around it, so the halves of the ready
                 view sit at one heading level and the editor-failure fallback's
                 own captions nest under a heading rather than beside one
                 (WCAG 1.3.1). -->
            <h3>Source comparison</h3>
            <SourceDiff v-bind="readyView.diff" />
          </div>
        </template>
      </RecognitionComparison>
    </div>

    <template v-else-if="status === 'loading'">
      <p class="aci-empty">Loading this comparison…</p>
    </template>

    <!-- One wrapper for the statement view too, so the focus guard can ask
         whether focus sits on a control an automatic refresh is about to
         unmount (WCAG 2.4.3). -->
    <div v-else-if="stateStatement !== null" ref="stateRegion">
      <p :class="retryable ? 'aci-error' : 'aci-note'">{{ stateStatement }}</p>
      <p v-if="retryable">
        <button ref="retryButton" type="button" @click="retryOpen">Try again</button>
      </p>
      <p>
        <NuxtLink to="/?kind=skill"
          >Return to the inventory and open a comparison from a skill's row.</NuxtLink
        >
      </p>
    </div>
  </div>
</template>

<style scoped>
.aci-skill-compare {
  display: flex;
  flex-direction: column;
}

.aci-skill-compare > p:first-child {
  margin: 0;
}

.aci-skill-compare h2 {
  margin: 0.25rem 0 0.5rem;
}

.aci-skill-compare h3 {
  font-size: 1rem;
  margin: 0.75rem 0 0.25rem;
}

/* The three switchers side by side, stacking on a narrow viewport. Each
   label is a column so the select sits under its name, and the selects
   shrink inside their columns rather than widening the page (WCAG 1.4.10). */
.aci-skill-compare__pickers {
  display: grid;
  gap: 0.5rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
  margin-block: 0.25rem;
}

@media (min-width: 52rem) {
  .aci-skill-compare__pickers {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.aci-skill-compare__picker {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.aci-skill-compare__pickers select {
  max-inline-size: 100%;
}

/* The two identities side by side above the diff, stacking on a narrow
   viewport (WCAG 1.4.10). */
.aci-skill-compare__files {
  display: grid;
  gap: 0.25rem 1.5rem;
  grid-template-columns: minmax(0, 1fr);
}

@media (min-width: 52rem) {
  .aci-skill-compare__files {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aci-skill-compare__files h3 {
  margin: 0.5rem 0 0.1rem;
}

.aci-skill-compare__files p {
  margin: 0.1rem 0;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-skill-compare__file-path {
  overflow-wrap: anywhere;
}
</style>
