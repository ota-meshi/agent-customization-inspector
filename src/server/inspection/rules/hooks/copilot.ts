// How Copilot's hook carriers are read: which lifecycle events each of the two
// documented carriers declares (contracts/vendors/github-copilot.md § Normative
// initial-release presentation allowlist, the `hook` row).
//
// Two units, because the two carriers have different contracts: a
// `.github/hooks/*.json` is a document whose whole purpose is hooks, so the
// keys beside its `hooks` object — the documented `version` among them — are
// its own to publish, while an inline `hooks` block sits in a settings document
// whose other keys belong to that file's settings recognition. Where each map
// is is this vendor's fact; what a found map means is the rule every vendor
// shares (`event-map.ts`).
//
// Neither unit decides its carrier's format: the parsing seam resolves it from
// the `(tool, path)` (`../../parsers/json.ts` § ParsedJsonDocument), and a comment
// that document does not allow fails the extraction — the recognition's
// `failed` state with its diagnostic (FR-028).
//
// The base these units extend is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type { CompiledStaticHookRule, HookCarrierReading } from './compiled-rule';
import { declaredHookEventsIn } from './event-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key holding the event map in both of Copilot's hook carriers: the
 * top-level object of a `.github/hooks/*.json`, and the inline block of a
 * settings document. One literal, because every surface documents the same
 * container — the editor's page states outright that the format is the one
 * Claude Code and the CLI use.
 */
const COPILOT_HOOK_MAP_KEY = 'hooks';

/**
 * The Copilot standalone hook carrier rule compiled for execution: everything a
 * Copilot rule is, plus the questions only a hook carrier rule answers — which
 * events an admitted `.github/hooks/*.json` declares, and what that file
 * declares about itself.
 *
 * The event names are published exactly as written and never normalized: the
 * CLI documents `preToolUse` and the editor `PreToolUse` for what the editor
 * converts between at runtime, and a detail shows the key its author wrote
 * (FR-007).
 */
export class CopilotCompiledStandaloneHookRule
  extends CopilotCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier is a file of its own (`compiled-rule.ts` § HookCarrierReading). */
  public readonly carrierForm: 'standalone';

  /**
   * What the admitted hook file declares: the events under its top-level
   * `hooks` object, one per declared event, and every other top-level key
   * beside it — the documented `version` among them — each in the parser's
   * resolved order (FR-007). One parse answers both, because both are the same
   * document's entries.
   *
   * What a found map means is the shared projection
   * ({@link declaredHookEventsIn}); an absent or non-mapping `hooks` key
   * declares no event, which is the same answer a file that is not an object
   * at all gives. Throws on text the carrier's format cannot parse; the
   * recognizer's extraction boundary turns the throw into the recognition's
   * `failed` state while the carrier stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const { entries } = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    const declared = entries.find((entry) => entry.key === COPILOT_HOOK_MAP_KEY);
    return {
      carrierForm: 'standalone',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredHookEventsIn(declared.value.entries),
      carrierFields: entries.filter((entry) => entry.key !== COPILOT_HOOK_MAP_KEY),
    };
  }

  /** Compiles one Copilot standalone hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot hook carrier rule`);
    }
    this.carrierForm = 'standalone';
  }
}

/**
 * The Copilot settings hook rule compiled for execution: the events the inline
 * `hooks` block of an admitted settings document declares.
 *
 * One unit for both settings rules, because they read the same top-level
 * `hooks` object the same way: what differs between them is which surfaces
 * document the read.
 *
 * The document around the block belongs to the file's other recognitions — the
 * settings row serves it whole, and on a `.claude/settings*.json` the Claude
 * permission policy and Claude's own hook declaration are recognitions of the
 * same read — so this unit publishes the events alone (FR-007).
 */
export class CopilotCompiledSettingsHookRule
  extends CopilotCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier contains the block among other content (`compiled-rule.ts`). */
  public readonly carrierForm: 'contained';

  /**
   * The events the accepted settings document declares under its top-level
   * `hooks` object, one per declared event, in the parser's resolved order
   * (FR-007).
   *
   * Throws on text the document's own format cannot parse; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the document stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const document = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    const declared = document.entries.find((entry) => entry.key === COPILOT_HOOK_MAP_KEY);
    return {
      carrierForm: 'contained',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredHookEventsIn(declared.value.entries),
    };
  }

  /** Compiles one Copilot settings hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot hook carrier rule`);
    }
    this.carrierForm = 'contained';
  }
}
