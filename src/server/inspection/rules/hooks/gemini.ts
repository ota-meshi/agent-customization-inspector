// How Gemini CLI's hook declarations are read: which lifecycle events an
// admitted `settings.json` contains under its top-level `hooks` object
// (contracts/vendors/gemini-cli.md § Normative initial-release presentation
// allowlist, the `hook` row).
//
// One unit, because one owner publishes hook rows: the settings document, at
// the project root and at the consented home. What a found map means is the
// rule every vendor shares (`event-map.ts`). The vendor also merges hooks an
// installed extension bundles, and those stay excluded with the extension
// copies they ship in (`gemini.excluded.extensions`).
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticHookRule, HookCarrierReading } from './compiled-rule';
import { declaredHookEventsIn } from './event-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The Gemini CLI settings hook rule compiled for execution: the events the
 * top-level `hooks` object of an admitted settings document contains. The
 * recognition exists whatever the object declares — the matcher admits the
 * carrier, exactly as `.claude/settings.json`'s does — so a settings file
 * declaring no hooks reaches the hook inventory as a carrier declaring none
 * (spec.md FR-009).
 */
export class GeminiCompiledSettingsHookRule
  extends GeminiCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** Every Gemini CLI hook declaration is contained in the settings document. */
  public readonly carrierForm: 'contained';

  /**
   * The events the admitted owner declares under its top-level `hooks`
   * object, one per declared event, in the parser's resolved order (FR-007).
   * Read as JSON with comments (`parsers/json.ts` § acceptsComments). Throws
   * on text the format cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the owner
   * stays an admitted candidate (FR-028).
   *
   * Every entry of that object goes to the shared structural reading as the
   * file wrote it, the vendor's own settings keys included: its hook registry
   * skips `enabled`, `disabled`, and `notifications` before reading event
   * names (`HOOKS_CONFIG_FIELDS` in `packages/core/src/hooks/types.ts` of
   * google-gemini/gemini-cli), so a `disabled` list of hook names is a row
   * here that is no event there. It stays a row on purpose: what this product
   * shows is the file's own declarations (FR-025, FR-026), a reader who wrote
   * a disabled list needs it stated rather than silently dropped, and a key
   * list copied from the vendor is a classification this product would then
   * have to keep in step with a source no page documents
   * (contracts/vendors/gemini-cli.md § Known uncertainties item 9).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const { entries } = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    const declared = entries.find((entry) => entry.key === 'hooks');
    return {
      carrierForm: 'contained',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredHookEventsIn(declared.value.entries),
    };
  }

  /** Compiles one Gemini CLI settings hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI hook rule`);
    }
    this.carrierForm = 'contained';
  }
}
