import { fileURLToPath } from "node:url";

import type {
  ExtensionAPI,
  ExtensionContext,
  ResourcesDiscoverResult,
} from "@earendil-works/pi-coding-agent";

/**
 * cockpit — orchestration UX for the multi-agent platform.
 *
 * Part A:
 *   - Ships the `cockpit-dark` theme (opt-in via /settings) through resources_discover.
 *   - Adds a role/task identity badge to Pi's built-in footer via ctx.ui.setStatus().
 *
 * Part B:
 *   - Renders a compact agent roster below the editor, in the lead pane only,
 *     polled from `herdr agent list` (read-only) on a throttled interval.
 *
 * Pi's built-in footer already shows pwd, git branch, session name, token usage,
 * context percentage (with warn/error thresholds), model, and thinking level, so
 * this extension only *adds* orchestration-specific signal and never replaces
 * built-in UI.
 */

const STATUS_KEY = "cockpit";
const ROSTER_KEY = "cockpit-roster";
const ROSTER_INTERVAL_DEFAULT_MS = 4000;
const ROSTER_INTERVAL_FLOOR_MS = 1500;

/** Roles align with the platform's established naming convention
 *  (see docs/herdr-workspace-layout.md): lead / worker / reviewer / runtime. */
const ROLES = ["lead", "worker", "reviewer", "runtime"] as const;
type Role = (typeof ROLES)[number];

/** A semantic theme color used to tint UI. Reusing semantic colors keeps the
 *  cockpit coherent under any active theme. */
type ThemeColor = "accent" | "success" | "warning" | "error" | "muted" | "dim" | "text";
interface ThemeLike {
  fg(color: ThemeColor, text: string): string;
}

const ROLE_COLOR: Record<Role, ThemeColor> = {
  lead: "accent",
  worker: "success",
  reviewer: "warning",
  runtime: "muted",
};

/** Lifecycle state -> color for the roster status dot. */
function stateColor(status: string): ThemeColor {
  switch (status) {
    case "working":
      return "accent";
    case "done":
      return "success";
    case "blocked":
    case "error":
      return "error";
    case "idle":
      return "muted";
    default:
      return "dim";
  }
}

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

/** Resolve this pane's role from env, else session-name suffix, else lead. */
function resolveRole(sessionName: string | undefined): Role {
  return normalizeRole(process.env.COCKPIT_ROLE) ?? roleFromName(sessionName) ?? "lead";
}

function inHerdr(): boolean {
  return process.env.HERDR_ENV === "1" && Boolean(process.env.HERDR_PANE_ID);
}

// --- roster data model -------------------------------------------------------

interface RosterAgent {
  label: string;
  role: Role | undefined;
  status: string;
  paneId: string | undefined;
}

/** Parse `herdr agent list` JSON into a stable, minimal roster model. */
export function parseAgents(stdout: string): RosterAgent[] {
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    return [];
  }
  const result = (envelope as { result?: { agents?: unknown } })?.result;
  const agents = Array.isArray(result?.agents) ? result.agents : [];
  const out: RosterAgent[] = [];
  for (const raw of agents) {
    if (!raw || typeof raw !== "object") continue;
    const a = raw as Record<string, unknown>;
    const name = typeof a.name === "string" && a.name ? a.name : undefined;
    const title =
      typeof a.terminal_title_stripped === "string" ? a.terminal_title_stripped.trim() : undefined;
    const paneId = typeof a.pane_id === "string" ? a.pane_id : undefined;
    const label = name ?? title ?? paneId ?? "agent";
    out.push({
      label,
      role: roleFromName(name),
      status: typeof a.agent_status === "string" ? a.agent_status : "unknown",
      paneId,
    });
  }
  return out;
}

/** Build roster widget lines, or undefined when there is nothing worth showing
 *  (so the widget claims no space in a solo lead session). */
export function formatRoster(
  agents: RosterAgent[],
  theme: ThemeLike,
  selfPaneId: string | undefined,
): string[] | undefined {
  // Only worth a widget once there is more than just this pane.
  const others = agents.filter((a) => a.paneId !== selfPaneId);
  if (others.length === 0) return undefined;

  const header = theme.fg("dim", `agents (${agents.length})`);
  const lines = [header];
  for (const a of agents) {
    const dot = theme.fg(stateColor(a.status), "●");
    const isSelf = a.paneId !== undefined && a.paneId === selfPaneId;
    const roleText = a.role ? ` ${theme.fg(ROLE_COLOR[a.role], a.role)}` : "";
    const name = isSelf ? theme.fg("text", `${a.label} (you)`) : a.label;
    const status = theme.fg("dim", a.status);
    lines.push(`${dot} ${name}${roleText} ${theme.fg("dim", "·")} ${status}`);
  }
  return lines;
}

function rosterIntervalMs(): number {
  const raw = Number(process.env.COCKPIT_ROSTER_INTERVAL_MS);
  if (!Number.isFinite(raw) || raw <= 0) return ROSTER_INTERVAL_DEFAULT_MS;
  return Math.max(ROSTER_INTERVAL_FLOOR_MS, Math.floor(raw));
}

export default function cockpit(pi: ExtensionAPI) {
  // Expose the bundled theme(s) directory so `cockpit-dark` shows up in /settings.
  const themesDir = fileURLToPath(new URL("./themes", import.meta.url));

  pi.on("resources_discover", (): ResourcesDiscoverResult => {
    return { themePaths: [themesDir] };
  });

  // --- Part A: footer identity badge ----------------------------------------

  function refreshBadge(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;
    const sessionName = ctx.sessionManager.getSessionName();
    const role = resolveRole(sessionName);
    const task = resolveTask(sessionName);
    const label = ctx.ui.theme.fg(ROLE_COLOR[role], `● ${role}`);
    ctx.ui.setStatus(STATUS_KEY, task ? `${label} · ${task}` : label);
  }

  // --- Part B: lead-pane agent roster ---------------------------------------

  let timer: ReturnType<typeof setInterval> | undefined;
  let lastLines: string | undefined;
  let rosterEnabled = true;

  function clearRoster(ctx: ExtensionContext): void {
    ctx.ui.setWidget(ROSTER_KEY, undefined);
    lastLines = undefined;
  }

  async function refreshRoster(ctx: ExtensionContext): Promise<void> {
    if (!rosterEnabled || ctx.mode !== "tui" || !inHerdr()) return;
    let stdout: string;
    try {
      const res = await pi.exec("herdr", ["agent", "list"], { timeout: 5000 });
      if (res.code !== 0) return;
      stdout = res.stdout;
    } catch {
      return; // stay silent on transient herdr errors
    }
    const agents = parseAgents(stdout);
    const lines = formatRoster(agents, ctx.ui.theme, process.env.HERDR_PANE_ID);
    const key = lines ? lines.join("\n") : "";
    if (key === lastLines) return; // avoid needless redraws
    lastLines = key;
    ctx.ui.setWidget(ROSTER_KEY, lines, { placement: "belowEditor" });
  }

  function startRoster(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui" || !inHerdr()) return;
    // Only the lead pane renders the roster.
    if (resolveRole(ctx.sessionManager.getSessionName()) !== "lead") return;
    if (timer) return;
    void refreshRoster(ctx);
    timer = setInterval(() => void refreshRoster(ctx), rosterIntervalMs());
    // Do not keep the process alive solely for the roster timer.
    (timer as { unref?: () => void }).unref?.();
  }

  function stopRoster(ctx: ExtensionContext): void {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
    clearRoster(ctx);
  }

  // --- wiring ----------------------------------------------------------------

  pi.on("session_start", (_event, ctx) => {
    refreshBadge(ctx);
    startRoster(ctx);
  });

  pi.on("session_info_changed", (_event, ctx) => {
    // Role/task may have changed with the session name; re-evaluate both.
    refreshBadge(ctx);
    if (resolveRole(ctx.sessionManager.getSessionName()) === "lead") {
      startRoster(ctx);
    } else {
      stopRoster(ctx);
    }
  });

  pi.on("session_shutdown", (_event, ctx) => stopRoster(ctx));

  // Manual control: `/cockpit` toggles the roster; `/cockpit refresh` forces one.
  pi.registerCommand("cockpit", {
    description: "Toggle or refresh the cockpit agent roster",
    handler: async (args, ctx) => {
      const arg = args.trim().toLowerCase();
      if (arg === "refresh") {
        await refreshRoster(ctx);
        return;
      }
      rosterEnabled = !rosterEnabled;
      if (rosterEnabled) startRoster(ctx);
      else stopRoster(ctx);
    },
  });
}
