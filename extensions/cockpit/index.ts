import { fileURLToPath } from "node:url";

import type {
  ExtensionAPI,
  ExtensionContext,
  ResourcesDiscoverResult,
} from "@earendil-works/pi-coding-agent";

/**
 * cockpit — orchestration UX for the multi-agent platform.
 *
 * Phase A (this file):
 *   - Ships the `cockpit-dark` theme (opt-in via /theme) through resources_discover.
 *   - Adds a role/task identity badge to Pi's built-in footer via ctx.ui.setStatus().
 *
 * Pi's built-in footer already shows pwd, git branch, session name, token usage,
 * context percentage (with warn/error thresholds), model, and thinking level. The
 * only piece missing for multi-agent orchestration is *who this pane is*, so this
 * extension only contributes a colored role/task badge and does NOT replace the
 * footer. Later phases add the lead-pane roster widget and layout helpers.
 */

const STATUS_KEY = "cockpit";

/** Roles align with the platform's established naming convention
 *  (see docs/herdr-workspace-layout.md): lead / worker / reviewer / runtime. */
const ROLES = ["lead", "worker", "reviewer", "runtime"] as const;
type Role = (typeof ROLES)[number];

/** Semantic theme color used to tint each role's badge. Reusing semantic
 *  colors keeps the badge coherent across any active theme. */
const ROLE_COLOR: Record<Role, "accent" | "success" | "warning" | "muted"> = {
  lead: "accent",
  worker: "success",
  reviewer: "warning",
  runtime: "muted",
};

function normalizeRole(value: string | undefined): Role | undefined {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return (ROLES as readonly string[]).includes(v) ? (v as Role) : undefined;
}

/** Infer a role from an agent/session name suffix, e.g. `invoice-worker`. */
function roleFromName(name: string | undefined): Role | undefined {
  if (!name) return undefined;
  const lower = name.toLowerCase();
  for (const role of ROLES) {
    if (role !== "lead" && lower.endsWith(`-${role}`)) return role;
  }
  return undefined;
}

/** Best-effort task id: explicit env, else the session name with a known
 *  role suffix stripped, else the raw session name. */
function resolveTask(sessionName: string | undefined): string | undefined {
  const envTask = process.env.COCKPIT_TASK?.trim();
  if (envTask) return envTask;
  if (!sessionName) return undefined;
  const match = sessionName.match(/^(.*)-(worker|reviewer|runtime)$/i);
  return (match ? match[1] : sessionName) || undefined;
}

export default function cockpit(pi: ExtensionAPI) {
  // Expose the bundled theme(s) directory so `cockpit-dark` shows up in /theme.
  const themesDir = fileURLToPath(new URL("./themes", import.meta.url));

  pi.on("resources_discover", (): ResourcesDiscoverResult => {
    return { themePaths: [themesDir] };
  });

  function refreshBadge(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;

    const sessionName = ctx.sessionManager.getSessionName();
    const role = normalizeRole(process.env.COCKPIT_ROLE) ?? roleFromName(sessionName) ?? "lead";
    const task = resolveTask(sessionName);

    const theme = ctx.ui.theme;
    const label = theme.fg(ROLE_COLOR[role], `● ${role}`);
    const text = task ? `${label} · ${task}` : label;

    ctx.ui.setStatus(STATUS_KEY, text);
  }

  // Set the badge when a session begins and whenever its name changes.
  pi.on("session_start", (_event, ctx) => refreshBadge(ctx));
  pi.on("session_info_changed", (_event, ctx) => refreshBadge(ctx));
}
