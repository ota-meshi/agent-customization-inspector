// How Codex's hook carriers are read: which lifecycle events each of the two
// documented carriers declares (contracts/vendors/openai-codex.md § Normative
// initial-release presentation allowlist, the `hook` row).
//
// Two units, because the two carriers have different contracts: the standalone
// `.codex/hooks.json` is a strict-JSON document whose whole purpose is hooks,
// so the keys beside its `hooks` object are its own to publish, while the
// inline `[hooks]` table sits in a TOML config layer whose other keys belong to
// that file's settings recognition. Where each map is is this vendor's fact;
// what a found map means is the rule every vendor shares (`event-map.ts`).
//
// The base these units extend is `../vendor/codex.ts` rather than `../codex.ts`,
// which holds this vendor's other kinds: both modules extend that base, and a
// base declared in either would have to be imported back by the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticHookRule, HookCarrierReading } from './compiled-rule';
import { declaredHookEventsIn } from './event-map';
import { ParsedJsonDocument } from '../../parsers/json';
import { ParsedTomlDocument } from '../../parsers/toml';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key holding the event map in both of Codex's hook carriers: the
 * top-level object of a `hooks.json`, and the table an inline declaration
 * writes as `[hooks]` or `[[hooks.<Event>]]`. One literal, because the two
 * carriers spell the same container.
 */
const CODEX_HOOK_MAP_KEY = 'hooks';

/**
 * The Codex standalone hook carrier rule compiled for execution: everything a
 * Codex rule is, plus the questions only a hook carrier rule answers — which
 * events an admitted `.codex/hooks.json` declares, and what that file declares
 * about itself.
 */
export class CodexCompiledStandaloneHookRule
  extends CodexCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier is a file of its own (`compiled-rule.ts` § HookCarrierReading). */
  public readonly carrierForm: 'standalone';

  /**
   * What the admitted `hooks.json` declares: the events under its top-level
   * `hooks` object, one per declared event, and every other top-level key
   * beside it — the documented optional `description` among them — each in the
   * parser's resolved order (FR-007). One parse answers both, because both are
   * the same document's entries.
   *
   * What a found map means is the shared projection
   * ({@link declaredHookEventsIn}); an absent or non-mapping `hooks` key
   * declares no event, which is the same answer a file that is not an object
   * at all gives. Throws on text strict JSON cannot parse; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the carrier stays an admitted candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading {
    const { entries } = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath });
    const declared = entries.find((entry) => entry.key === CODEX_HOOK_MAP_KEY);
    return {
      carrierForm: 'standalone',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredHookEventsIn(declared.value.entries),
      carrierFields: entries.filter((entry) => entry.key !== CODEX_HOOK_MAP_KEY),
    };
  }

  /** Compiles one Codex standalone hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex hook carrier rule`);
    }
    this.carrierForm = 'standalone';
  }
}

/**
 * The Codex inline hook table rule compiled for execution: which events the
 * `[hooks]` table of an admitted `.codex/config.toml` declares.
 *
 * The same physical file is admitted as an MCP carrier and as the settings
 * document it is — three rules over one candidate and one read, each answering
 * for the row that reaches it (FR-007). What this unit publishes is the events
 * alone: the document around them is the settings recognition's, and the
 * `[mcp_servers.*]` tables are the MCP rows'.
 *
 * A layer holding both this table and a `hooks.json` has both loaded by Codex
 * with a startup warning, so the two recognitions stay distinct here rather
 * than being merged into one reading (`codex.hooks.additive`).
 */
export class CodexCompiledInlineHookRule
  extends CodexCompiledRule
  implements CompiledStaticHookRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'hook';

  /** This unit's carrier contains the table among other content (`compiled-rule.ts`). */
  public readonly carrierForm: 'contained';

  /**
   * What the admitted config layer declares as hooks: the events under its
   * `[hooks]` table, one per declared event, in the parser's resolved order
   * (FR-007) — read
   * over the document's rendered entries, where a table renders as the
   * `mapping` kind and `[[hooks.<Event>]]` renders as that event's list of
   * groups, so the structural question is the entries' own discriminant.
   *
   * An absent or non-table `hooks` key declares nothing. Throws on text TOML
   * cannot parse; the recognizer's extraction boundary turns the throw into
   * the recognition's `failed` state while the carrier stays an admitted
   * candidate (FR-028).
   */
  public hookCarrierReadingOf(sourceText: string): HookCarrierReading {
    const declared = new ParsedTomlDocument(sourceText).entries.find(
      (entry) => entry.key === CODEX_HOOK_MAP_KEY,
    );
    return {
      carrierForm: 'contained',
      events:
        declared === undefined || declared.value.kind !== 'mapping'
          ? []
          : declaredHookEventsIn(declared.value.entries),
    };
  }

  /** Compiles one Codex inline hook record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'hook') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex hook carrier rule`);
    }
    this.carrierForm = 'contained';
  }
}
