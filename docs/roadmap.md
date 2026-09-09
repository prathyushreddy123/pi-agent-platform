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
| 6 | Git worktree automation | planned |
| 7 | Pi ↔ Herdr integration | planned |
| 8 | Lead / worker / reviewer workflow | planned |
| 9 | Task state | planned |
| 10 | Safety gates | planned |
| 11 | Sandboxed execution (Docker) | planned |
| 12 | Herdr workspace layout template | planned |
| 13 | Client project template | planned |
| 14 | Package & bootstrap | planned |

Prompts and skills currently live both here (source of truth) and in
`~/.pi/agent/`. Phase 14 replaces the copies with symlinks from this repo.
