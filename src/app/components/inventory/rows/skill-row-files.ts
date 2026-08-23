// The file model a skill row's definitions are drawn in.
//
// A row's unit is one resolved name and its unit of listing is one definition —
// one `(file, tool)` recognition (FR-007) — but several definitions can name
// one file: `.claude/skills/<name>/SKILL.md` is admitted by both Claude Code's
// and Copilot's rules, and `.agents/skills/<name>/SKILL.md` by both Codex's and
// Copilot's. Listing each definition from the top would therefore repeat the
// file's own facts once per recognizing tool — the same path, the same census
// count — leaving the reader to compare two identical lines to discover they
// name one file.
//
// This groups the row's definitions by the file that carries them, so a file's
// facts are stated once and each recognition keeps its own line beneath them.
// The grouping is presentation only: no definition is merged away, because the
// three products do not read a shared location under shared conditions —
// Claude Code discovers nested skill directories that Copilot's and Codex's
// anchored lookups never reach, and each product's own lookup base stays a
// runtime condition the Inspector does not observe (FR-009).
import { escapeControlCharacters } from '../../../../shared/entities';
import type { SkillDefinitionDto } from '../../../../shared/api-types';

/** One file of a skill row, with the definitions that recognize it. */
export class SkillRowFile {
  /**
   * The recognitions of this file on this row, in the order the generation
   * published them — the one held fact every other value derives from. Each
   * keeps its own detail route, its own parse state, and its own extraction
   * diagnostics. Non-empty by type: {@link skillRowFiles} seeds every group
   * with the definition that opened it, which is how the caller satisfies
   * it.
   */
  public readonly definitions: readonly [SkillDefinitionDto, ...SkillDefinitionDto[]];

  /** Holds the group's definitions; every published value derives from them. */
  public constructor(definitions: readonly [SkillDefinitionDto, ...SkillDefinitionDto[]]) {
    this.definitions = definitions;
  }

  /**
   * The file's Source-relative Path — its identity (FR-030), used as the
   * render key and never as display text. Derived from the first definition,
   * whose file every definition of the group shares.
   */
  public get sourceRelativePath(): string {
    return this.definitions[0].sourceRelativePath;
  }

  /**
   * The same path as presentation text, control characters escaped
   * (data-model.md § SourceRelativePath) so a path spanning lines cannot read
   * as two files.
   */
  public get pathText(): string {
    return escapeControlCharacters(this.sourceRelativePath);
  }

  /**
   * What ships beside this file in its skill directory. It is the file's own
   * fact rather than any one recognition's: the census is taken over the
   * admitted candidate's directory and every definition of the file carries
   * the same list (session.ts), so any one of them is the group's answer.
   */
  public get companionFiles(): readonly string[] {
    return this.definitions[0].companionFiles;
  }

  /**
   * The extraction-failure records this file's recognitions reference, without
   * repetition. It is one record however many products recognize the file —
   * the parse ran once per `(file, kind)` (FR-028) — so stating it once for
   * the file rather than once per recognition is what keeps a shared failure
   * from reading as several.
   */
  public get diagnosticIds(): readonly string[] {
    const ids = new Set<string>();
    for (const definition of this.definitions) {
      for (const id of definition.diagnosticIds) {
        ids.add(id);
      }
    }
    return [...ids];
  }
}

/**
 * Groups a row's definitions by the file each recognizes, keeping the
 * generation's order: the snapshot publishes definitions in Source-relative
 * Path order and then in the contracted tool order within one file
 * (session.ts), so a file's definitions already arrive together and the first
 * appearance of a path fixes where its group sits.
 */
export function skillRowFiles(definitions: readonly SkillDefinitionDto[]): readonly SkillRowFile[] {
  const byPath = new Map<string, [SkillDefinitionDto, ...SkillDefinitionDto[]]>();
  for (const definition of definitions) {
    const group = byPath.get(definition.sourceRelativePath);
    if (group === undefined) {
      byPath.set(definition.sourceRelativePath, [definition]);
    } else {
      group.push(definition);
    }
  }
  return [...byPath.values()].map((group) => new SkillRowFile(group));
}
