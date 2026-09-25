// What an admitted Antigravity CLI context file governs
// (contracts/vendors/antigravity-cli.md § Documented Repository behavior,
// § Documented User behavior).
//
// Two answers, because the vendor states two. A workspace `GEMINI.md` or
// `AGENTS.md` is loaded for the directory holding it — whenever the terminal
// reads or edits a file it walks up from that file's folder to the workspace
// root, loading the pair at each level — so it governs that directory's
// subtree, exactly as a Claude Code instruction file does. A global one is a
// standalone file that applies across every project and is always active, so
// it governs the whole of the boundary it was admitted at, whichever directory
// of the home it sits in.
//
// The base these units extend is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticWholeDocumentInstructionRule } from './compiled-rule';
import { escapeGlobLiteral } from './applicability-range';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * An Antigravity CLI workspace instruction rule, compiled for execution: the
 * plan and guards every compiled rule is, plus the one question only an
 * instruction rule answers — what an admitted file governs.
 */
export class AntigravityCompiledInstructionRule
  extends AntigravityCompiledRule
  implements CompiledStaticWholeDocumentInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Read whole: the page states that `AGENTS.md` and `GEMINI.md` use no
   * frontmatter and that the terminal treats their entire content as plain
   * Markdown (google.antigravity.rules § YAML frontmatter and activation
   * modes; api-types.ts § InstructionFileFormat).
   */
  public readonly format: 'whole-document';

  /**
   * The glob one admitted workspace context file governs: the directory
   * holding it, with a trailing `.agents` dropped — the page gives
   * `<dir>/.agents/AGENTS.md` and `<dir>/.agents/GEMINI.md` as that directory's
   * own pair beside `<dir>/AGENTS.md` and `<dir>/GEMINI.md`, so `.agents` is
   * where the terminal keeps the file rather than what it governs
   * (google.antigravity.rules § Directory-scoped rules).
   */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    const directory = sourceRelativePath.split('/').slice(0, -1);
    if (directory.at(-1) === '.agents') {
      directory.pop();
    }
    return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
  }

  /** Compiles one Antigravity CLI workspace instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI instruction rule`);
    }
    this.format = 'whole-document';
  }
}

/**
 * The consented home's Antigravity CLI context rule, compiled for execution: a
 * unit of its own because its answer to what a file governs is not its path's.
 */
export class AntigravityCompiledGlobalInstructionRule
  extends AntigravityCompiledRule
  implements CompiledStaticWholeDocumentInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Read whole: the page gives the standalone global files as needing no
   * frontmatter (google.antigravity.rules § Global rules; api-types.ts
   * § InstructionFileFormat).
   */
  public readonly format: 'whole-document';

  /**
   * `**` — the whole of the consented boundary, for every admitted global file
   * alike: the page states that the standalone global files apply across all
   * projects and are always active, so a `config/GEMINI.md` governs no less
   * than the `GEMINI.md` beside `config/`.
   */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles the Antigravity CLI global context record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI instruction rule`);
    }
    this.format = 'whole-document';
  }
}
