// What a hook rule is to the scan: the contract a compiled unit of this kind
// answers — which lifecycle events a carrier it admitted declares, the rows
// the hook inventory publishes one of per declaration (data-model.md
// § Inventory unit) — and which of the two documented carrier forms that rule
// admits.
//
// The kind's own contract rather than a member of every compiled rule: how
// declarations are read out of a carrier is the admitting vendor's own
// contract (AGENTS.md § Class and interface policy). Each vendor's reading is
// its own module beside this one, over the one structural rule they share
// (`event-map.ts`).
import type {
  DeclaredEntryDto,
  HookCarrierForm,
  HookEventDeclarationDto,
} from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * What one hook carrier's reading resolved out of its complete decoded text:
 * the events it declares, and — for a carrier that is a hook file of its
 * own — the keys it declares beside them.
 *
 * A closed union rather than one shape with an always-empty field for the
 * contained form, because a contained carrier's neighbouring keys are another
 * recognition's content and it has no answer to give (AGENTS.md § Class and
 * interface policy). The recognition's own details take the same two shapes,
 * so nothing downstream asks a contained carrier what it declares about
 * itself.
 */
export type HookCarrierReading =
  /** A hook file's own reading: its events, and the keys beside its hook map. */
  | {
      /** Discriminant: the carrier is a file whose whole purpose is hooks. */
      readonly carrierForm: 'standalone';
      /** The events the carrier declares, in the parser's resolved order (FR-007). */
      readonly events: readonly HookEventDeclarationDto[];
      /**
       * Every top-level key beside the hook map, in the parser's resolved
       * order — published because nothing else publishes them: such a file has
       * one recognition, so a key this reading drops is a key no surface shows
       * (FR-007).
       */
      readonly carrierFields: readonly DeclaredEntryDto[];
    }
  /** A contained table's reading: its events alone. */
  | {
      /** Discriminant: the carrier holds the hook table among other content. */
      readonly carrierForm: 'contained';
      /** The events the table declares, in the parser's resolved order (FR-007). */
      readonly events: readonly HookEventDeclarationDto[];
    };

/**
 * A compiled rule that admits a hook declaration carrier, and can therefore
 * answer what one of its admitted files declares — the rows the hook inventory
 * publishes, one per declaration (data-model.md § Inventory unit).
 *
 * The hook sibling of {@link CompiledStaticMcpReadingRule}, and deliberately
 * not a member of {@link CompiledRule}, for the same reason: how declarations
 * are read out of a carrier is the admitting vendor's own contract — Codex's
 * strict-JSON `.codex/hooks.json`, the inline TOML `[hooks]` table of its
 * config layer, and Claude's JSON settings documents — so a skill or
 * instruction rule must not be asked for it.
 */
export interface CompiledStaticHookRule extends CompiledInspectionRule {
  /** The recognized kind; a hook carrier unit compiles hook records alone. */
  readonly kind: 'hook';
  /**
   * Which documented form this rule's carrier is
   * (`api-types.ts` § HookCarrierForm). A property of the rule rather than of
   * the file, because it is the admitting contract that says which form the
   * location it names holds — which is also what answers for a carrier whose
   * extraction failed, exactly as a plugin carrier's kind does.
   */
  readonly carrierForm: HookCarrierForm;
  /**
   * What one admitted carrier's complete decoded text declares, as the form
   * this rule admits ({@link HookCarrierReading}): the events in the parser's
   * resolved order — empty when it declares none, with a declaration that is
   * not a list of groups omitted whole rather than published partially.
   *
   * The reading produces the wire declaration shapes directly
   * ({@link HookEventDeclarationDto}): what the one scan-time parse resolved
   * is what the carrier's detail publishes, so a second internal shape would
   * be a state able to disagree with it (FR-007).
   *
   * Throws on text the carrier's format cannot parse; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * (FR-028).
   *
   * The carrier's own Source-relative Path is what resolves the JSON document
   * this reading takes (`../../parsers/json.ts` § ParsedJsonDocument); a unit
   * whose carrier is not JSON declares the first parameter alone.
   */
  hookCarrierReadingOf(sourceText: string, sourceRelativePath: string): HookCarrierReading;
}
