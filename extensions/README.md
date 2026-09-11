# Extensions

Pi extensions add **new capabilities** Pi cannot perform cleanly with its
built-in tools. They are implemented incrementally.

- `worktree-manager/` — future Pi tool wrapper for the Phase 6 shell automation.
- `herdr-orchestrator/` — spawn/prompt/query/read/wait on agents via Herdr,
  behind an agent-type-agnostic interface (Phase 7, initial version complete).
- `task-manager/` — atomic per-task JSON state, validated lifecycle transitions,
  structured results, and evidence-based handoffs (Phase 9).
- `safety-gate/` — fail-closed approval gates for destructive shell commands
  and writes to credential/secret paths (Phase 10).
- `cockpit/` — orchestration UX. Ships the opt-in `cockpit-dark` theme, adds a
  role/task identity badge to the footer, and renders a lead-pane agent roster
  from `herdr agent list` (Phase 15, parts A + B). See
  [`../docs/cockpit.md`](../docs/cockpit.md).

See `docs/architecture.md`. Extension format: Pi loads `.ts`/`.js` extensions
from `~/.pi/agent/extensions/` and project `.pi/extensions/`.
