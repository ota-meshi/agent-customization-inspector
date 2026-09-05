// What a Codex permission policy is to the scan: the admitted file is itself
// the whole policy, so this unit reads nothing out of it
// (contracts/http-api.md § get-permission-policy-detail).
//
// A `.codex/rules/*.rules` file is the Starlark document its author wrote, and
// its detail serves that document — no key holds a block here, which is why
// this vendor's unit and the other product's share nothing but the kind.
//
// The base this unit extends is `../vendor/codex.ts` rather than `../codex.ts`,
// which holds this vendor's other kinds: both modules extend that base, and a
// base declared in either would have to be imported back by the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticPermissionsDocumentRule } from './compiled-rule';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Codex permission-policy rule compiled for execution: the admitted file is
 * itself the whole policy, so this unit reads nothing out of it. A
 * `.codex/rules/*.rules` file is the Starlark document its author wrote, and
 * its detail serves that document (contracts/http-api.md
 * § get-permission-policy-detail).
 */
export class CodexCompiledPermissionsDocumentRule
  extends CodexCompiledRule
  implements CompiledStaticPermissionsDocumentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads nothing: the admitted document is the policy (`compiled-rule.ts` § CompiledStaticPermissionsDocumentRule). */
  public readonly permissionsReading: 'whole-document';

  /** Compiles one Codex permission-policy record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex permission-policy rule`);
    }
    this.permissionsReading = 'whole-document';
  }
}
