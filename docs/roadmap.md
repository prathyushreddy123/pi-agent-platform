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
| 9 | Task state | planned |
| 10 | Safety gates | planned |
| 11 | Sandboxed execution (Docker) | planned |
| 12 | Herdr workspace layout template | planned |
| 13 | Client project template | planned |
| 14 | Package & bootstrap | partial (scripts/bootstrap.sh) |

Prompts, skills, the global AGENTS.md, and repository-owned extensions are
symlinked from this repo into `~/.pi/agent/` via `scripts/bootstrap.sh`, so this
repo is the single source of truth with no drift. Herdr's generated state hook
remains managed directly by `herdr integration install pi`. Run
`scripts/bootstrap.sh --check` to verify links. Remaining Phase 14 work: a full
fresh-machine bootstrap.
