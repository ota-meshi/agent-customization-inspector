// The node model a skill's directory tree is drawn from.
//
// Its own module because two components share it: the tree builds the nodes
// from the paths the snapshot publishes, and the branch that renders them is
// recursive, so both need the same shapes and neither can own them alone.
//
// Nesting is derived from the paths rather than requested from the host: the
// census publishes Source-relative paths, and the directory structure is what
// their shared prefixes already say.
import { accessiblePresentationLabel, pathPresentationLabel } from '../../../shared/entities';

/** One file's node: a leaf the reader can open. */
export class SkillTreeFileNode {
  /**
   * Discriminant of {@link DirectoryTreeNode}: the branch renders a node by this
   * field, never by testing its runtime shape.
   */
  public readonly kind = 'file' as const;

  /**
   * The Source-relative Path of the file this node opens — the file's
   * identity (FR-030), and what the branch links to.
   */
  public readonly sourceRelativePath: string;

  /** The file's own name, as presentation text. */
  public readonly label: string;

  /**
   * The same name as accessible-name text: it starts with the visible label
   * (WCAG 2.5.3 Label in Name) and appends the spelled-out presentation
   * where whitespace would collapse two files a directory holds apart into
   * one announcement (FR-025, WCAG 2.4.4;
   * {@link accessiblePresentationLabel}).
   */
  public readonly accessibleLabel: string;

  /** Names one file by the last segment of its path below the tree root. */
  public constructor(sourceRelativePath: string, name: string) {
    this.sourceRelativePath = sourceRelativePath;
    this.label = pathPresentationLabel(name);
    this.accessibleLabel = accessiblePresentationLabel(name);
  }

  /** Stable identity for the render; a file's path is already unique. */
  public get id(): string {
    return this.sourceRelativePath;
  }
}

/**
 * One directory's node, holding what is under it.
 *
 * A directory is a node with children rather than a sibling row with a wider
 * indent, because that is the relationship: assistive technology reads a nested
 * list as nesting, and reads indentation as nothing at all.
 */
export class SkillTreeDirectoryNode {
  /**
   * Discriminant of {@link DirectoryTreeNode}: the branch renders a node by this
   * field, never by testing its runtime shape.
   */
  public readonly kind = 'directory' as const;

  /** Stable identity for the render: the directory's own path below the root. */
  public readonly id: string;

  /** The directory's own segment, as presentation text. */
  public readonly label: string;

  /**
   * The whitespace-preserving accessible spelling of the same segment, for
   * the branch's `aria-label` — an accessible name collapses whitespace, so
   * two directories held apart only by it must not announce as one, exactly
   * as the file nodes' rule (FR-025; `entities.ts`
   * § accessiblePresentationLabel).
   */
  public readonly accessibleLabel: string;

  /** The files and directories immediately inside it, in the order given. */
  public readonly children: DirectoryTreeNode[] = [];

  /** Names one directory by the segments leading to it, its own name last. */
  public constructor(ancestors: readonly string[], name: string) {
    this.id = [...ancestors, name].join('/');
    this.label = pathPresentationLabel(name);
    this.accessibleLabel = accessiblePresentationLabel(name);
  }

  /**
   * How many files stand under this directory, at any depth. Derived from
   * {@link children} where the row is drawn rather than stored beside them:
   * one fact, and a stored count could disagree with the nodes it counts
   * (AGENTS.md § Implementation simplicity policy).
   */
  public get fileCount(): number {
    let count = 0;
    for (const child of this.children) {
      count += child.kind === 'file' ? 1 : child.fileCount;
    }
    return count;
  }
}

/** One node of the tree, discriminated by `kind`: a file to open, or a directory that holds nodes. */
export type DirectoryTreeNode = SkillTreeFileNode | SkillTreeDirectoryNode;

/**
 * The tree for one skill's files, rooted at `directory`.
 *
 * The incoming order is preserved rather than re-sorted — it is the entry point
 * followed by the census in path order, so a directory's files are already
 * together — and a directory node is created the first time a file needs one.
 */
export function buildDirectoryTree(
  files: readonly string[],
  directory: string,
): DirectoryTreeNode[] {
  const roots: DirectoryTreeNode[] = [];
  const directories = new Map<string, SkillTreeDirectoryNode>();
  for (const file of files) {
    const relative = file.startsWith(directory) ? file.slice(directory.length) : file;
    const parts = relative.split('/');
    const name = parts.at(-1) ?? relative;
    let siblings = roots;
    const walked: string[] = [];
    for (const segment of parts.slice(0, -1)) {
      const key = [...walked, segment].join('/');
      const existing = directories.get(key);
      const node = existing ?? new SkillTreeDirectoryNode(walked, segment);
      if (existing === undefined) {
        directories.set(key, node);
        siblings.push(node);
      }
      siblings = node.children;
      walked.push(segment);
    }
    siblings.push(new SkillTreeFileNode(file, name));
  }
  return roots;
}
