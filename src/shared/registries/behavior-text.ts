// The order and the words the closed unions of `behavior-types.ts` stand for
// (AGENTS.md § User-visible copy policy).
//
// The table is a module of its own because `behavior-types.ts` ships zero
// runtime code by contract — the `-types` name records that — and both an
// order and a label table are runtime data. `Readonly<Record<Union, string>>`
// still does the work the policy asks of it wherever the table lives: a new
// surface cannot compile until someone has decided how it reads.
import type { VendorSurface } from './behavior-types';

/**
 * The closed presentation order of {@link VendorSurface}, grouped by product
 * in the closed tool order (`SUPPORTED_TOOL_ORDER`, src/shared/entities.ts) so
 * a row listing a tool and its surfaces reads in one direction.
 *
 * A recognition names several surfaces whenever its admitting rules rest on
 * several of them, and two scans of one tree must publish that list the same
 * way, so the order is fixed here rather than left to whichever admission the
 * walk reported first.
 */
export const VENDOR_SURFACE_ORDER: readonly VendorSurface[] = [
  /** Copilot's editor surface sorts first, as Copilot does among the tools. */
  'copilot-vscode',
  /** Copilot's local CLI follows its editor. */
  'copilot-cli',
  /** Copilot's hosted surface sorts last of its three. */
  'copilot-cloud',
  /** Claude Code's one surface follows Copilot's, as Claude does among the tools. */
  'claude-cli-and-ide-clients',
  /** Codex's shared local-host surface sorts first of its two, as Codex sorts last among the tools. */
  'codex-local-clients',
  /** Codex's plugin surface follows it: a narrower set of the same product's clients. */
  'codex-plugin-clients',
];

/**
 * The label shown for each surface. Read beside the product's own name rather
 * than alone — a row states the tool and then which of its surfaces recognized
 * the file — so each label names the surface within its product and does not
 * repeat the product.
 */
export const VENDOR_SURFACE_TEXT: Readonly<Record<VendorSurface, string>> = {
  /** Label for Claude Code's CLI and its IDE integrations, which share one configuration. */
  'claude-cli-and-ide-clients': 'CLI and IDE clients',
  /** Label for the ChatGPT desktop app, the Codex CLI, and the Codex IDE extension. */
  'codex-local-clients': 'Local clients',
  /** Label for the ChatGPT desktop app and the Codex CLI's plugin-management commands. */
  'codex-plugin-clients': 'Desktop app and plugin CLI',
  /** Label for local Copilot Chat and agent mode inside the editor. */
  'copilot-vscode': 'VS Code',
  /** Label for the local Copilot command-line client. */
  'copilot-cli': 'CLI',
  /** Label for the hosted Copilot agent and the services behind it. */
  'copilot-cloud': 'Cloud agent',
};
