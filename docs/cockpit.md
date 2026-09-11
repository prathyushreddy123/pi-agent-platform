# Orchestration cockpit

The **cockpit** is the customized terminal UX for managing and orchestrating
multiple agents so it stays seamless and easy to understand. It is a single,
memorable brand across the pieces it adds:

| Piece | Name |
|---|---|
| Extension | `extensions/cockpit/` |
| Theme | `cockpit-dark` |
| Command (later) | `/cockpit` |
| Env vars | `COCKPIT_ROLE`, `COCKPIT_TASK` |

It builds *on top of* Pi's built-in UI and the existing platform conventions —
it does not replace them. Roles are the ones already defined in
[`herdr-workspace-layout.md`](herdr-workspace-layout.md): **lead / worker /
reviewer / runtime**.

## Why so little custom UI

Pi's built-in footer already shows, per pane:

- working directory, git branch, and session name;
- token usage, cost, and **context percentage** with warn (>70%) and error
  (>90%) coloring;
- current model and thinking level.

So the cockpit does **not** re-implement the footer. The only thing missing for
multi-agent work is *which agent this pane is*. Everything else is theming and
(in later phases) a lead-pane roster and layout helpers.

## Phases

- **A — Theme + role badge (done).** Ships the `cockpit-dark` theme and a
  colored role/task badge in the footer.
- **B — Lead-pane roster widget (done).** A compact, throttled table of all
  agents from `herdr agent list`, rendered below the editor in the lead pane
  only. Self-hides when the lead is the only pane.
- **C — Layout + sidebar (planned).** Workspace/tab labeling that makes Herdr's
  sidebar a useful navigator, plus optional sidebar config
  (`sidebar_start_collapsed`, `sidebar_collapsed_mode = "compact"`). Consistent
  with Phase 12, this does **not** force a fixed pane grid.

## Part A: the theme

`cockpit-dark` is a Monokai Pro–inspired dark theme tuned for reading code and
diffs (high-contrast syntax, clear added/removed colors) with role-coded
thinking-level colors. It is **opt-in**: it does not change your default theme.

Select it inside a running Pi session with `/settings` (choose `cockpit-dark`
under the theme option), or set `"theme": "cockpit-dark"` in
`~/.pi/agent/settings.json`, or launch with `pi --use-theme cockpit-dark` to try
it for a single run without saving. Pi has no `/theme` command, and these are Pi
commands — run them in a Pi pane, not in another agent's terminal.

The theme is exposed to Pi through the extension's `resources_discover`
handler (`themePaths`), so it travels with the extension and needs no separate
install.

## Part A: the role/task badge

The extension adds one badge to the footer's status line via
`ctx.ui.setStatus("cockpit", …)`:

```
● lead                 (lead pane, no task)
● worker · invoice-validation
● reviewer · invoice-validation
● runtime · billing
```

The dot is tinted by role using the active theme's semantic colors, so it stays
coherent under any theme:

| Role | Color token |
|---|---|
| lead | `accent` |
| worker | `success` |
| reviewer | `warning` |
| runtime | `muted` |

### How role and task are resolved

1. `COCKPIT_ROLE` / `COCKPIT_TASK` environment variables, if set (the
   orchestrator can set these when spawning an agent).
2. Otherwise inferred from the **session/agent name suffix**, matching the
   platform convention: `…-worker`, `…-reviewer`, `…-runtime`. The task id is
   the remaining prefix (e.g. `invoice-validation-worker` → role `worker`, task
   `invoice-validation`).
3. Otherwise defaults to role `lead` with no task.

The badge only renders in interactive (`tui`) mode; it is skipped in
`print`/`json`/`rpc` runs.

## Part B: the agent roster

In the **lead** pane, the cockpit renders a compact roster below the editor,
polled from `herdr agent list` (read-only) every 4s (override with
`COCKPIT_ROSTER_INTERVAL_MS`, floor 1500ms):

```
agents (3)
● invoice-worker worker · working
● invoice-reviewer reviewer · blocked
● π - lead (you) · idle
```

- Each row: a status dot colored by lifecycle state (working=accent, done=
  success, blocked/error=error, idle=muted), the agent name, its inferred role,
  and its lifecycle state. This pane is marked `(you)`.
- Agent identity prefers the orchestrator-assigned `name`, falling back to the
  terminal title, then the pane id.
- The widget **self-hides** when the lead is the only pane, so a solo session
  wastes no space. It only renders in `tui` mode inside a Herdr pane, and only
  in the lead pane (worker/reviewer panes do not render a roster).
- Redraws only happen when the rendered rows actually change.

### `/cockpit` command

- `/cockpit` — toggle the roster on/off.
- `/cockpit refresh` — force an immediate refresh.

## Install / verify

The extension is symlinked into `~/.pi/agent/extensions/` by
`scripts/bootstrap.sh` (added to its `LINKS` array). After linking, run
`scripts/bootstrap.sh --check`.

Because the other Pi sessions may be live, **reload extensions only when a
session is idle** (start a new session, or `/reload`), not mid-task.
