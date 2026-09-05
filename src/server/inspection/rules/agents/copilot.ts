// How Copilot reads a custom agent: the name a spawn addresses it by, and where
// the admitted file's configuration ends and its instructions begin
// (contracts/vendors/github-copilot.md § Repository vendor behavior).
//
// A Copilot agent profile is Markdown, so the split is the frontmatter fence,
// and the name comes from the path rather than from a declared field — which is
// why this vendor's unit answers on its own instead of sharing the answer the
// other two document (`declared-name.ts`).
//
// The base this unit extends is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type { CompiledStaticAgentRule } from './compiled-rule';
import { ParsedMarkdownDocument } from '../../parsers/markdown';
import type { AgentPresentationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The longer of the two agent-profile spellings the shared reference names.
 * Declared once because the name derivation strips it and the shorter `.md`
 * is what remains, so the two must not drift apart.
 */
const COPILOT_AGENT_PROFILE_SUFFIX = '.agent.md';

/**
 * A Copilot custom-agent rule compiled for execution: everything a Copilot
 * rule is, plus the two questions only an agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin, and
 * which name the product identifies it by.
 *
 * The reading lives here, beside the rule that owns it, because the profile
 * format is this vendor's own contract
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules);
 * the Markdown parse and the rendering of resolved values are the format's and
 * stay in `parsers/markdown.ts`.
 *
 * Every Copilot agent record compiles into this one unit — the Repository
 * ones and `copilot.global.agent` alike: they differ in which directory they
 * admit and therefore in which surfaces they rest on, which is each rule's
 * own fact, while how an admitted file splits and what names it is identical
 * for all of them.
 */
export class CopilotCompiledAgentRule
  extends CopilotCompiledRule
  implements CompiledStaticAgentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted agent profile split into the two halves its detail shows
   * (FR-007): every frontmatter key the file declares — `name`, `description`,
   * `target`, `tools`, and the `mcp-servers` block among them — as the
   * metadata, and the body the fence leaves as the instructions the profile
   * gives the agent.
   *
   * The parse is this vendor's reading rather than the shared Markdown slot's,
   * for the reason Claude's is: what a rule reads out of a file is its own
   * contract, and a `.claude/agents/*.md` this rule admits is one physical
   * file two products define an agent from. Where the format coincides — as it
   * does here — the two resolve identically, so the repetition is work over
   * one string rather than a second fact
   * (`recognizers/candidate.ts` § CandidateExtractions).
   *
   * No field is validated, no environment reference is resolved, and no
   * declared tool, skill, server, or path gains read or connection authority.
   * A declared `mcp-servers` block is one metadata entry and nothing more: it
   * makes the file no MCP carrier, because an MCP declaration's home is an
   * explicit carrier and nothing else (data-model.md § Inventory unit).
   * Throws on text the frontmatter parser cannot read; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the file stays an admitted candidate whose complete source is still
   * displayed (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedMarkdownDocument(sourceText);
    return { metadata: document.frontmatterEntries, instructionsText: document.body };
  }

  /**
   * The configuration file's own name minus `.agent.md` or `.md`, which is
   * what the shared profile reference states Copilot identifies an agent by:
   * that name is what deduplicates the levels, while the frontmatter `name` is
   * documented as an optional display name. So the declarations are unused
   * here, deliberately — a row named after a declared `name` would report an
   * agent this product does not deduplicate under it — and a failed extraction
   * takes nothing away from the row's identity (FR-028).
   *
   * Never `null`: a path always answers. A file named `.agent.md` or `.md`
   * outright has an empty name, which is the vendor's own answer for it rather
   * than an absent one, and the row states it as the empty name it is.
   *
   * The slicing is exact rather than defensive: every record this unit
   * compiles — `copilot.repo.agent`, `copilot.repo.agent.claude`, and
   * `copilot.global.agent` — admits only selectors ending in `/\.md$/u`.
   */
  public agentNameOf(sourceRelativePath: string): string {
    const fileName = sourceRelativePath.split('/').at(-1)!;
    return fileName.endsWith(COPILOT_AGENT_PROFILE_SUFFIX)
      ? fileName.slice(0, -COPILOT_AGENT_PROFILE_SUFFIX.length)
      : fileName.slice(0, -'.md'.length);
  }

  /** Compiles one Copilot custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot custom-agent rule`);
    }
  }
}
