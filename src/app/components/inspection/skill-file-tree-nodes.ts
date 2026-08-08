// The node model a skill's directory tree is drawn from.
//
// Its own module because two components share it: the tree builds the nodes
// from the paths the snapshot publishes, and the branch that renders them is
// recursive, so both need the same shapes and neither can own them alone.
//
// Nesting is derived from the paths rather than requested from the host: the
// census publishes Source-relative paths, and the directory structure is what
// their shared prefixes already say.
import {
  encodeRootPresentation,
  escapeControlCharacters,
  rendersNothingVisible,
} from '../../../shared/entities';

/** One file the tree offers, resolved to the committed identity that opens it. */
export interface SkillTreeFile {
  /** The committed file identity; the tree links to it. */
  readonly fileId: string;
  /** The Source-relative Path, used for the label and the nesting. */
  readonly sourceRelativePath: string;
}

/**
 * One path label as presentation text. Control characters are escaped
 * (data-model.md § SourceRelativePath), which leaves a space a space and a
 * zero-width space a zero-width space — so a label built only from those would
 * render as nothing, and the file's link would have neither visible text nor an
 * accessible name. A label with nothing visible left is therefore spelled out
 * entirely, the way a root label is, because it has to be unambiguous on its
 * own.
 */
function labelFor(label: string): string {
  const escaped = escapeControlCharacters(label);
  return rendersNothingVisible(escaped) ? encodeRootPresentation(label) : escaped;
}

/** One file's node: a leaf the reader can open. */
export class SkillTreeFileNode {
  /** The file this node opens. */
  public readonly file: SkillTreeFile;

  /** The file's own name, as presentation text. */
  public readonly label: string;

  /** Names one file by the last segment of its path below the tree root. */
  public constructor(file: SkillTreeFile, name: string) {
    this.file = file;
    this.label = labelFor(name);
  }

  /** Stable identity for the render; a file identity is already unique. */
  public get id(): string {
    return this.file.fileId;
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
  /** Stable identity for the render: the directory's own path below the root. */
  public readonly id: string;

  /** The directory's own segment, as presentation text. */
  public readonly label: string;

  /** The files and directories immediately inside it, in the order given. */
  public readonly children: SkillTreeNode[] = [];

  /** Names one directory by the segments leading to it, its own name last. */
  public constructor(ancestors: readonly string[], name: string) {
    this.id = [...ancestors, name].join('/');
    this.label = labelFor(name);
  }
}

/** One node of the tree: a file to open, or a directory that holds nodes. */
export type SkillTreeNode = SkillTreeFileNode | SkillTreeDirectoryNode;

/**
 * The tree for one skill's files, rooted at `directory`.
 *
 * The incoming order is preserved rather than re-sorted — it is the entry point
 * followed by the census in path order, so a directory's files are already
 * together — and a directory node is created the first time a file needs one.
 */
export function buildSkillTree(
  files: readonly SkillTreeFile[],
  directory: string,
): SkillTreeNode[] {
  const roots: SkillTreeNode[] = [];
  const directories = new Map<string, SkillTreeDirectoryNode>();
  for (const file of files) {
    const relative = file.sourceRelativePath.startsWith(directory)
      ? file.sourceRelativePath.slice(directory.length)
      : file.sourceRelativePath;
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
