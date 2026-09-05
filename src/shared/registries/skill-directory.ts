// The one path fact both layers of skill identity are built from (FR-007).
// The compiled skill rules read it to name what they admit — Claude Code's
// command is this segment, and it is what a declared-name product falls back
// to — and the same-name collision policy reads it to find the unqualified
// commands that clash. It lives on its own rather than in either, because a
// copy in each would be one rule in two places.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.

/**
 * The skill-directory segment of a `SKILL.md` entry-point path —
 * `<...>/<skill-directory>/SKILL.md`. Empty only for a path with no such
 * segment, which no shipped skill selector admits.
 */
export function skillDirectoryOf(path: string): string {
  return path.split('/').at(-2) ?? '';
}
