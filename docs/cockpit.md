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
- **B — Lead-pane roster widget (planned).** A compact, throttled, idle-gated
  table of all agents (`herdr agent list` + task state), rendered only in the
  lead pane.
- **C — Layout + sidebar (planned).** Workspace/tab labeling that makes Herdr's
  sidebar a useful navigator, plus optional sidebar config
  (`sidebar_start_collapsed`, `sidebar_collapsed_mode = "compact"`). Consistent
  with Phase 12, this does **not** force a fixed pane grid.

## Part A: the theme

`cockpit-dark` is a Monokai Pro–inspired dark theme tuned for reading code and
diffs (high-contrast syntax, clear added/removed colors) with role-coded
thinking-level colors. It is **opt-in**: it does not change your default theme.

Activate it with the `/theme` selector (choose `cockpit-dark`), or set
`"theme": "cockpit-dark"` in `~/.pi/agent/settings.json` once you are happy with
it.

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

## Install / verify

The extension is symlinked into `~/.pi/agent/extensions/` by
`scripts/bootstrap.sh` (added to its `LINKS` array). After linking, run
`scripts/bootstrap.sh --check`.

Because the other Pi sessions may be live, **reload extensions only when a
session is idle** (start a new session, or `/reload`), not mid-task.
