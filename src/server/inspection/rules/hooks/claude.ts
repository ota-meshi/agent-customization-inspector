// How Claude's hook declarations are read: which lifecycle events each accepted
// owner contains, for the one vendor that documents no standalone hook file at
// all (contracts/vendors/claude-code.md § Normative initial-release
// presentation allowlist, the `hook` row).
//
// One unit, because one owner publishes hook rows: the two root settings files,
// whose top-level `hooks` object this reads. What a found map means is the rule
// every vendor shares (`event-map.ts`).
//
// The vendor documents four more owners — a skill's frontmatter, a subagent's,
// a plugin manifest's inline configuration, and a catalog entry's — and none of
// them is a hook carrier here. Such a declaration is part of what that
// customization *is*, and that customization's own row already publishes the
// keys its file wrote, so a hook row would publish one fact twice on a page
// whose subject is not that customization
// (contracts/vendors/claude-code.md § Normative initial-release presentation
// allowlist, the `hook` row).
//
// The base these units extend is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticHookRule, HookCarrierReading } from './compiled-rule';
import { declaredHookEventsIn } from './event-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key holding the event map in every Claude owner: a settings file's own
 * top level, a manifest's, and a frontmatter block's. One literal, because the
 * vendor documents the same three-level configuration format in all of them.
 */
const CLAUDE_HOOK_MAP_KEY = 'hooks';

/**
 * The events a declared `hooks` entry holds, or none when the entry is absent
 * or is not a map: only a map declares events, and a `hooks` value that names a
 * path instead — which a plugin manifest and a catalog entry may both write —
 * declares none here. Such a value is a component path this product never
 * follows (FR-004, FR-024), visible as authored content on the owner's own row.
 */
function claudeHookEventsIn(entries: readonly DeclaredEntryDto[]): HookCarrierReading['events'] {
  const declared = entries.find((entry) => entry.key === CLAUDE_HOOK_MAP_KEY);
  return declared === undefined || declared.value.kind !== 'mapping'
    ? []
    : declaredHookEventsIn(declared.value.entries);
}

/**
 * The Claude settings hook rule compiled for execution: the events the
 * top-level `hooks` object of an accepted `.claude/settings.json` or
 * `.claude/settings.local.json` contains.
 *
 * Strict JSON, as every Claude reading of these files is. The document around
 * the declarations belongs to the file's other recognitions — the settings row
 * serves it whole and the permission policy is its own row — so this unit
 * publishes the events alone (FR-007).
 */
export class ClaudeCompiledSettingsHookRule
  extends ClaudeCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** Every Claude hook declaration is contained in an accepted artifact. */
  public readonly carrierForm: 'contained';

  /**
   * The events the accepted owner declares under its top-level `hooks` object,
   * one per declared event, in the parser's resolved order (FR-007).
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * owner stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const { entries } = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    return { carrierForm: 'contained', events: claudeHookEventsIn(entries) };
  }

  /** Compiles one Claude settings hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude hook rule`);
    }
    this.carrierForm = 'contained';
  }
}
