// Builds the skill detail route for one definition (FR-007, data-model.md
// § Skill presentation): `/skills/<tool>/<source-relative path>`. The URL is
// the definition's stable identity — the recognizing tool and the file's
// place in the repository, which is the file's identity on the wire too
// (FR-030) — so the route path survives rescans and server launches and
// resolves against whatever the current scan holds at it: the same file
// wherever the launch selected the same root (FR-001), and that root's own
// file otherwise. The origin half of a bookmark is devframe's port selection.
import { encodeDetailRoutePath } from './detail-route';

/**
 * The detail route for one definition. Each path segment is percent-encoded
 * so an authored entry name cannot smuggle a separator or a query into the
 * URL, while the `/` separators stay separators for the catch-all route to
 * split on.
 */
export function skillDetailRoute(tool: string, sourceRelativePath: string): string {
  return `/skills/${tool}/${encodeDetailRoutePath(sourceRelativePath)}`;
}
