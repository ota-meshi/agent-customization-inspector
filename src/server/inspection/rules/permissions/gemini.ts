// What a Gemini CLI policy is to the scan: the admitted file is itself the
// whole policy, so this unit reads nothing out of it
// (contracts/http-api.md § get-permission-policy-detail).
//
// A `policies/*.toml` file is the TOML document of `[[rule]]` entries its
// author wrote, and its detail serves that document — no key holds a block
// here, which is the shape Codex's `.rules` files have and Claude's settings
// block does not.
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticPermissionsDocumentRule } from './compiled-rule';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Gemini CLI policy rule compiled for execution: the admitted file is itself
 * the whole permission policy, so this unit reads nothing out of it.
 */
export class GeminiCompiledPolicyDocumentRule
  extends GeminiCompiledRule
  implements CompiledStaticPermissionsDocumentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads nothing: the admitted document is the policy (`compiled-rule.ts` § CompiledStaticPermissionsDocumentRule). */
  public readonly permissionsReading: 'whole-document';

  /** Compiles one Gemini CLI policy record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI policy rule`);
    }
    this.permissionsReading = 'whole-document';
  }
}
