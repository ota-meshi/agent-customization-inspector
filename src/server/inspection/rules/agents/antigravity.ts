// How Antigravity CLI's custom agents are read: both admitted shapes are
// Markdown with YAML frontmatter, so the shared Markdown agent reading answers
// them and only the selectors differ (contracts/vendors/antigravity-cli.md
// § Documented Repository behavior, the `antigravity.behavior.repo.agents`
// row).
//
// One unit for both shapes and both boundaries, because the vendor documents
// one format: a file directly below `.agents/agents/`, an `agent.md` inside
// its own directory there, and the global directory's files are the same
// document read the same way.
//
// The base this unit extends is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticAgentRule } from './compiled-rule';
import { declaredAgentNameOf } from './declared-name';
import { ParsedMarkdownDocument } from '../../parsers/markdown';
import type { AgentPresentationDto, DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * An Antigravity CLI custom-agent rule, compiled for execution: the plan and
 * guards every compiled rule is, plus the two questions only an agent rule
 * answers — how an admitted file presents, and the name the vendor invokes it
 * by.
 */
export class AntigravityCompiledAgentRule
  extends AntigravityCompiledRule
  implements CompiledStaticAgentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * The frontmatter block and the body below it — the two halves of the
   * Markdown agent format this vendor documents, rendered by the shared
   * reading every Markdown agent uses.
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedMarkdownDocument(sourceText);
    return { metadata: document.frontmatterEntries, instructionsText: document.body };
  }

  /**
   * The `name` the file declares, which the subagents page documents as the
   * agent's identity, with the shared fallback where nothing usable was
   * declared ({@link declaredAgentNameOf}).
   */
  public agentNameOf(
    _sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null {
    return declaredAgentNameOf(declared);
  }

  /** Compiles one Antigravity CLI custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI custom-agent rule`);
    }
  }
}
