# Extensions

Pi extensions add **new capabilities** Pi cannot perform cleanly with its
built-in tools. Implemented incrementally; these are placeholders describing
intent.

- `worktree-manager/` — create/list/inspect/remove task worktrees (Phase 6).
- `herdr-orchestrator/` — spawn/prompt/query/read/wait on agents via Herdr,
  behind an agent-type-agnostic interface (Phase 7).
- `task-manager/` — lightweight task state tracking (Phase 9).
- `safety-gate/` — approval gates for destructive operations (Phase 10).

See `docs/architecture.md`. Extension format: Pi loads `.ts`/`.js` extensions
from `~/.pi/agent/extensions/` and project `.pi/extensions/`.
