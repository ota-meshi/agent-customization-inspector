// The name two of the three products address a custom agent by: the `name` each
// of them documents as the agent's identity.
//
// One rule rather than two that happen to agree — Codex and Claude Code
// document the same field for the same purpose — while the third product's
// units answer from their own contract, which is why that answer is its own
// module rather than a branch here.
import type { DeclaredEntryDto } from '../../../../shared/api-types';

/**
 * The declared-`name` answer to {@link CompiledStaticAgentRule.agentNameOf},
 * shared by the two products that document the field as the agent's identity —
 * Codex and Claude Code — because their answer is one rule rather than two
 * that happen to agree. Read by the string key and the scalar kind: a sequence
 * under that key has a rendering too, and taking its text would name an agent
 * after the first item of a list the file did not write as a name.
 *
 * `null` rather than the empty string when nothing was declared, so no name at
 * all and an authored empty name stay distinguishable (FR-007).
 */
export function declaredAgentNameOf(declared: readonly DeclaredEntryDto[]): string | null {
  for (const entry of declared) {
    if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
      return entry.value.text;
    }
  }
  return null;
}
