// How Antigravity CLI's hook carriers are read: which lifecycle events each of
// its three documented carriers declares (contracts/vendors/antigravity-cli.md
// § Normative initial-release presentation allowlist, the `hook` row).
//
// Two units, because the two carriers have different contracts, and the split
// is the one Codex's already has: a `hooks.json` is a document whose whole
// purpose is hooks, so its emptiness is a finding and it reaches the inventory's
// no-event row, while the settings document's inline declarations sit among
// keys that belong to that file's settings and permissions recognitions.
//
// What is this vendor's own is the shape inside the container. The other three
// formats map an event directly to its matcher groups; this one maps a *hook
// name* to an object holding that hook's events and its own `enabled` flag, so
// the events sit one level deeper and each carries the name its author gave it
// ({@link declaredNamedHookEventsIn}). Nothing about that name is interpreted
// and nothing about `enabled` is: whether a hook runs is runtime this product
// does not observe, so the reader is shown the keys the file wrote (FR-009,
// FR-020, FR-026).
//
// The base these units extend is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticHookRule, HookCarrierReading } from './compiled-rule';
import { declaredNamedHookEventsIn } from './event-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key holding the hook map inside this vendor's settings document. The
 * plugins and skills page states that hooks are configured in a plugin's
 * `hooks.json` or in the primary `settings.json`, and gives no schema for the
 * settings form; the shared Hooks page gives the file's own shape, and the
 * settings form is read as that shape under this key
 * (contracts/vendors/antigravity-cli.md § Known uncertainties items 4 and 8).
 */
const ANTIGRAVITY_HOOK_MAP_KEY = 'hooks';

/**
 * The Antigravity CLI standalone hook carrier rule compiled for execution:
 * everything an Antigravity CLI rule is, plus the questions only a hook
 * carrier rule answers — which events an admitted `hooks.json` declares, and
 * what that file declares about itself.
 *
 * One unit for both standalone locations, the workspace's `.agents/hooks.json`
 * and the user tier's `config/hooks.json`: they are one documented file shape
 * at two roots, and which root a rule reads at is the rule's own base.
 */
export class AntigravityCompiledStandaloneHookRule
  extends AntigravityCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier is a file of its own (`compiled-rule.ts` § HookCarrierReading). */
  public readonly carrierForm: 'standalone';

  /**
   * What the admitted hook file declares: its top level is the map of named
   * hooks itself — this format has no wrapping key — so every top-level entry
   * is a hook name and the events are the entries inside it.
   *
   * `carrierFields` is therefore empty rather than "every key beside the hook
   * map": there is nothing beside it, and a named hook's own keys travel with
   * the events they belong to instead.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * carrier stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const { entries } = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    return {
      carrierForm: 'standalone',
      events: declaredNamedHookEventsIn(entries),
      carrierFields: [],
    };
  }

  /** Compiles one Antigravity CLI standalone hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI hook carrier rule`);
    }
    this.carrierForm = 'standalone';
  }
}

/**
 * The Antigravity CLI settings hook rule compiled for execution: the events
 * the inline `hooks` object of an admitted `antigravity-cli/settings.json`
 * declares.
 *
 * The document around the block belongs to the file's other recognitions — the
 * settings row serves it whole and the permissions row serves its policy — so
 * this unit publishes the events alone (FR-007).
 */
export class AntigravityCompiledInlineHookRule
  extends AntigravityCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier contains the block among other content (`compiled-rule.ts`). */
  public readonly carrierForm: 'contained';

  /**
   * The events the settings document declares under its top-level `hooks`
   * object, read as the same map of named hooks the standalone file is.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * document stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const document = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    const declared = document.entries.find((entry) => entry.key === ANTIGRAVITY_HOOK_MAP_KEY);
    return {
      carrierForm: 'contained',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredNamedHookEventsIn(declared.value.entries),
    };
  }

  /** Compiles one Antigravity CLI settings hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI hook carrier rule`);
    }
    this.carrierForm = 'contained';
  }
}
