// What an admitted Antigravity CLI context file governs: the whole tree below
// the boundary it was admitted at (contracts/vendors/antigravity-cli.md
// § Documented Repository behavior, § Documented User behavior).
//
// One answer for both boundaries, because the vendor states one: the migration
// page says the agent parses and enforces the constraints in the active
// directory's `GEMINI.md` and `AGENTS.md` and consults the global
// `~/.gemini/GEMINI.md` alongside them, and names no path scope for either. A
// range narrower than `**` would state a governance the vendor never wrote.
//
// The base this unit extends is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticInstructionRule } from './compiled-rule';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * An Antigravity CLI instruction rule, compiled for execution: the plan and
 * guards every compiled rule is, plus the one question only an instruction
 * rule answers — what an admitted file governs.
 */
export class AntigravityCompiledInstructionRule
  extends AntigravityCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * `**` — the whole tree below the admitting boundary. The vendor documents
   * no `applyTo`, no path frontmatter, and no depth for either the workspace
   * pair or the global file, so the range is the boundary's own scope and the
   * file's own declarations are never read for one.
   */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles one Antigravity CLI instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI instruction rule`);
    }
  }
}
