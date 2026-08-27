// How Claude's permission policy is read: which block one admitted settings
// file declares (contracts/vendors/claude-code.md § Normative initial-release
// presentation allowlist, the `permissions` row).
//
// Which key holds the policy, and which format the document is, is this
// vendor's contract, so the reading is here; the whole object is published,
// because an allowlist of some of its keys would drop authored policy without
// being able to say which. Nothing is shared with the other product of this
// kind: a file that is itself the policy has no block to read.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticPermissionsCarrierRule } from './compiled-rule';
import { ParsedJsonDocument } from '../../parsers/json';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude permission-policy carrier rule compiled for execution: everything a
 * Claude rule is, plus the one question only this kind's carrier unit answers —
 * which policy block a settings file it admitted declares.
 */
export class ClaudeCompiledPermissionsCarrierRule
  extends ClaudeCompiledRule
  implements CompiledStaticPermissionsCarrierRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads a block out of the document it admits (`compiled-rule.ts` § CompiledStaticPermissionsCarrierRule). */
  public readonly permissionsReading: 'declared-block';

  /**
   * The entries of the `permissions` object one admitted settings file
   * declares, in the parser's resolved order (FR-007), or null when the file
   * declares no such object — which is no policy rather than an empty one, so
   * the recognizer publishes no recognition and the file reaches no
   * permissions row.
   *
   * The whole object, every key it holds: an allowlist of some of its keys
   * would drop authored policy without being able to say which was dropped
   * (contracts/vendors/claude-code.md § Normative initial-release presentation
   * allowlist). A `permissions` key whose value is not a mapping declares no
   * policy either — there is no block to publish — which is the same null.
   *
   * No rule string is resolved to a tool, a command, a path, or a domain, and
   * nothing is evaluated against a filesystem: the output is the block the
   * author wrote (FR-019, FR-026).
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
    // twice to its later declaration, so the spelling alone identifies the
    // one possible policy entry.
    const container = declared.find((entry) => entry.key === 'permissions');
    return container === undefined || container.value.kind !== 'mapping'
      ? null
      : container.value.entries;
  }

  /** Compiles one Claude permission-policy carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude permission-policy carrier rule`);
    }
    this.permissionsReading = 'declared-block';
  }
}
