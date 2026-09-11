# Roadmap / phase status

Incremental build. Status as of initial scaffold.

| Phase | Goal | Status |
|------:|------|--------|
| 0 | Inspect environment | done |
| 1 | Global AGENTS.md operating rules | done |
| 2 | Reusable prompt library | done |
| 3 | First reusable skills | done |
| 4 | Project/client directory convention | done |
| 5 | agent-platform repository | done (this repo) |
| 6 | Git worktree automation | done (scripts/worktree.sh) |
| 7 | Pi ↔ Herdr integration | done (initial round-trip + extension tools) |
| 8 | Lead / worker / reviewer workflow | done ([demo](phase8-demo.md)) |
| 9 | Task state | done ([JSON state and handoffs](task-state.md)) |
| 10 | Safety gates | done ([policy and limitations](safety-gates.md)) |
| 11 | Sandboxed execution (Docker) | deferred (on demand for untrusted execution) |
| 12 | Herdr workspace layout template | done ([adaptive layout](herdr-workspace-layout.md)) |
| 13 | Client project template | done ([safe project overlay](client-project-template.md)) |
| 14 | Package & bootstrap | done ([fresh-machine guide](bootstrap.md)) |
| 15 | Orchestration cockpit (theme + footer + roster) | in progress ([cockpit](cockpit.md)) — parts A (theme + role badge) and B (lead-pane roster) done; part C (layout + sidebar) planned |

Prompts, skills, the global AGENTS.md, and repository-owned extensions are
symlinked from this repo into `~/.pi/agent/` via `scripts/bootstrap.sh`, so this
repo is the single source of truth with no drift. Herdr's generated state hook
remains managed directly by `herdr integration install pi`. The
[fresh-machine guide](bootstrap.md) documents prerequisites, safe linking,
verification, updates, and recovery.
