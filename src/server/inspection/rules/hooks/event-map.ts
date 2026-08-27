// The one rule every vendor's hook reading shares: which entries of a declared
// hook map are events, and what each of them publishes.
//
// Where that map is, and which key holds it, is each vendor's own contract —
// Codex's top-level `hooks` object in a `hooks.json` and the `[hooks]` table of
// its config layer — so each reading finds its own container and hands the
// entries here. What a found map means is not a vendor difference: the
// documented shape is three levels deep — an event, the matcher groups under
// it, and the handlers inside each group — and one shared projection is what
// keeps an event row identical whoever declared it.
import type {
  DeclaredEntryDto,
  HookCarrierForm,
  HookEventDeclarationDto,
} from '../../../../shared/api-types';
import type { HookCarrierReading } from './compiled-rule';

/**
 * The events one declared map declares: one per list-valued entry, in the
 * parser's resolved order, each carrying the event name that entry wrote and
 * the groups under it (FR-007).
 *
 * Classification is structural and total: only a list declares an event,
 * because the documented shape puts matcher groups in a list under the event
 * name, and an entry whose value is a scalar, a mapping, or an authored `null`
 * is omitted whole rather than published partially — the same answer an absent
 * or non-mapping container gives.
 *
 * What is inside a group is published exactly as authored and never
 * classified: a group's own items may be malformed, and a reader inspecting
 * their file needs the malformed group stated rather than silently dropped. No
 * field is validated, no matcher is evaluated against a tool name, no
 * environment reference is resolved, and no declared command or handler gains
 * execution authority: the output is the file's own declarations, rendered and
 * nothing more (FR-020, FR-026).
 */
export function declaredHookEventsIn(
  entries: readonly DeclaredEntryDto[],
): readonly HookEventDeclarationDto[] {
  return entries.flatMap((entry) =>
    entry.value.kind === 'sequence' ? [{ event: entry.key, groups: entry.value.items }] : [],
  );
}

/**
 * The reading a failed extraction stands in for: the carrier's own form with
 * nothing declared under it.
 *
 * A failed extraction publishes no declaration while the carrier stays an
 * admitted candidate (FR-028), and the form is still known — it is the
 * admitting rule's, not the text's — so the recognition keeps its shape and
 * the row states the parse failure instead of a declaration.
 */
export function emptyHookCarrierReading(carrierForm: HookCarrierForm): HookCarrierReading {
  return carrierForm === 'standalone'
    ? { carrierForm, events: [], carrierFields: [] }
    : { carrierForm, events: [] };
}
