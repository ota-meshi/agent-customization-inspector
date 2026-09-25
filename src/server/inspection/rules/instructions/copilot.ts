// How Copilot's instruction files are read: what one admitted instruction file
// governs (contracts/vendors/github-copilot.md § Repository vendor behavior).
//
// Two units, because Copilot documents two formats. A path-specific
// `*.instructions.md` opens with a frontmatter whose `applyTo` names the files
// it applies to, so what it governs is what it declared rather than where it
// sits — and a file whose declaration supplies none has no known range at all,
// which is a different answer from the whole repository. Every other Copilot
// instruction file — the repository-wide `copilot-instructions.md` and the
// agent-instruction filenames — is documented with no frontmatter, so it is
// read whole and governs the directory it sits in. That reading is this
// vendor's contract rather than anything shared.
//
// The base these units extend is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type {
  CompiledStaticFrontmatterLedInstructionRule,
  CompiledStaticWholeDocumentInstructionRule,
} from './compiled-rule';
import { escapeGlobLiteral } from './applicability-range';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Copilot instruction rule whose files are read whole, compiled for
 * execution: everything a Copilot rule is, plus the one question only an
 * instruction rule answers — what a file it admitted governs.
 *
 * The repository-wide file derives its range from its path: `.github` is
 * where Copilot keeps it, not what it governs, so that segment is stripped
 * from the tail and the directory above it is the range (data-model.md
 * § Inventory unit). The root file therefore derives the root's `**`, and a
 * `packages/api/.github/copilot-instructions.md` — admitted because the CLI
 * reads that filename relative to the context its session runs in — derives
 * `packages/api/**`. The agent-instruction filenames — `AGENTS.md`,
 * `CLAUDE.md`, `GEMINI.md` — keep their whole directory: no source documents
 * Copilot keeping one of them in `.github`, so a `.github/AGENTS.md` governs
 * that directory rather than borrowing a strip decided for a different
 * filename.
 */
export class CopilotCompiledInstructionRule
  extends CopilotCompiledRule
  implements CompiledStaticWholeDocumentInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Read whole: the editor's page documents a frontmatter for `.instructions.md`
   * files and none for the repository-wide file or the agent-instruction files
   * this unit admits (vscode.copilot.instructions § Instructions file format;
   * api-types.ts § InstructionFileFormat).
   */
  public readonly format: 'whole-document';

  /** The glob one admitted file governs; see the class comment. */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(0, -1);
    if (segments.at(-1) === 'copilot-instructions.md' && directory.at(-1) === '.github') {
      // `.github` is where Copilot keeps this file, not what it governs.
      directory.pop();
    }
    return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
  }

  /** Compiles one Copilot instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot instruction rule`);
    }
    this.format = 'whole-document';
  }
}

/**
 * A Copilot path-specific instruction rule, compiled for execution: the one
 * shipped instruction unit whose files open with declarations their product
 * reads, so the one whose files the scan parses.
 *
 * Its `applyTo` declaration is what such a file governs, wherever the file
 * sits, so the declared value keys the row and the path decides nothing
 * (spec.md § Clarifications). When the file declares nothing a row can be
 * keyed by — no `applyTo`, an empty one, a shape with no row spelling, or a
 * parse that failed — the answer is null, not a path: the vendor documents
 * these files as applied by their declaration alone, VS Code saying outright
 * that an undeclared file is not applied automatically, so a range read off
 * the path would state the widest governance for a file the vendor gives none.
 * The inventory lists such a file under the row that says no range is known,
 * with its own diagnostics beside it when the reason is a failed parse
 * (FR-028).
 *
 * Which records compile into this unit is the catalog's dispatch by rule ID
 * (`../copilot.ts`), and which files those records admit is their matcher's
 * `.instructions.md` step — so no filename is tested here.
 */
export class CopilotCompiledPathSpecificInstructionRule
  extends CopilotCompiledRule
  implements CompiledStaticFrontmatterLedInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Read as a frontmatter and the instructions below it: the editor's page
   * gives `.instructions.md` files the YAML frontmatter that decides how they
   * are applied (vscode.copilot.instructions § Instructions file format;
   * api-types.ts § InstructionFileFormat).
   */
  public readonly format: 'frontmatter-led';

  /** The glob one admitted file declares it governs, or null; see the class comment. */
  public applicabilityRangeOf(declared: readonly DeclaredEntryDto[]): string | null {
    // The parser resolves a key declared twice to its later declaration, so
    // the entry found here is the one the file itself resolves to.
    const applyTo = declared.find((entry) => entry.keyKind === 'string' && entry.key === 'applyTo');
    // Published as the parser resolved it (data-model.md § Field reading) —
    // the value's own quotes and YAML escapes resolved once, exactly as the
    // detail shows the declaration — and deliberately not escaped further:
    // the resolved value already is the author's pattern, and escaping it
    // would turn `src/frontend/**` into a directory literally named that. A
    // sequence or mapping has no spelling a row can be keyed by, and an
    // authored empty string denotes nothing; both are the null answer, like a
    // file that declares no `applyTo` at all. The declaration still reaches
    // the reader through the file's own detail, so nothing about it is hidden
    // by not keying a row.
    return applyTo?.value.kind === 'scalar' && applyTo.value.text !== ''
      ? applyTo.value.text
      : null;
  }

  /** Compiles one Copilot path-specific instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot instruction rule`);
    }
    this.format = 'frontmatter-led';
  }
}
