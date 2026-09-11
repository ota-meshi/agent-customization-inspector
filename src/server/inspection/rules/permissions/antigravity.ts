// How Antigravity CLI's permission policy is read: the `permissions` object of
// an admitted `antigravity-cli/settings.json`, which is one of that file's
// three recognitions (contracts/vendors/antigravity-cli.md § Normative
// initial-release presentation allowlist, the `permissions` row).
//
// A declared block rather than a whole document, because the file is a
// settings document first: its rendering, keybindings, and model preferences
// sit beside the policy and belong to the settings recognition, so a
// permissions row that served the whole file would publish content its own
// subject does not cover (FR-007). This is the arrangement
// `.claude/settings.json` already has.
//
// Nothing is evaluated: an `action(target)` string is the text its author
// wrote, never a rule matched against a command, a path, or a URL, and the
// documented deny-then-ask-then-allow precedence is a composition record on
// the strategy rather than an ordering this reading performs (FR-019, FR-026).
//
// The base this unit extends is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticPermissionsCarrierRule } from './compiled-rule';
import { ParsedJsonDocument } from '../../parsers/json';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key holding the policy block in this vendor's one permissions carrier.
 * The permissions page's configuration example puts the three access lists
 * inside a top-level `permissions` object of the settings file, which is the
 * same spelling Claude Code's carrier uses for the same purpose.
 */
const ANTIGRAVITY_PERMISSIONS_KEY = 'permissions';

/**
 * An Antigravity CLI permissions rule compiled for execution: everything an
 * Antigravity CLI rule is, plus the one question only a permissions carrier
 * answers — what policy the document it admitted declares.
 */
export class AntigravityCompiledPermissionsCarrierRule
  extends AntigravityCompiledRule
  implements CompiledStaticPermissionsCarrierRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads a block out of the document it admits (`compiled-rule.ts`). */
  public readonly permissionsReading: 'declared-block';

  /**
   * The entries of the `permissions` object the settings file declares, in the
   * parser's resolved order (FR-007), or null when it declares no such object
   * — which is no policy rather than an empty one, so the recognizer publishes
   * no recognition and the file reaches no permissions row.
   *
   * The whole object, every key it holds: the page names `allow`, `ask`, and
   * `deny`, and an allowlist of those three would drop a fourth key a later
   * version adds without being able to say which was dropped.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * file stays an admitted candidate (FR-028).
   */
  public declaredPolicyOf(
    sourceText: string,
    sourceRelativePath: string,
  ): readonly DeclaredEntryDto[] | null {
    const declared = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath })
      .entries;
    // Strict JSON keys are strings, and the parser resolves a key declared
    // twice to its later declaration, so the spelling alone identifies the one
    // possible policy entry.
    const container = declared.find((entry) => entry.key === ANTIGRAVITY_PERMISSIONS_KEY);
    return container === undefined || container.value.kind !== 'mapping'
      ? null
      : container.value.entries;
  }

  /** Compiles one Antigravity CLI permissions record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI permissions rule`);
    }
    this.permissionsReading = 'declared-block';
  }
}
