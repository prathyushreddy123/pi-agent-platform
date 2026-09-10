# Architecture

## Target

```
                    ME
                     |
                     v
                 HERDR  (project workspace: control / build / review / runtime)
                     |
                     v
                 LEAD PI
                     |
          +----------+----------+
          |                     |
          v                     v
       WORKER               REVIEWER
          |                     |
          +----------+----------+
                     |
                Git worktrees
                     |
              Docker / sandbox
                     |
                tests / build
                     |
                  Git diff
                     |
                     v
                    ME  (approve / merge)
                     |
                   CI/CD
```

I am the final approval point for merges, pushes, deployments, and destructive
actions.

## Layers

| Layer | Owns | Tech |
|-------|------|------|
| Control plane | workspaces, panes, agent processes, terminals, servers, logs | Herdr |
| Agent layer | reasoning, tools, skills, prompts, delegation | Pi |
| Isolation | task/branch isolation | Git worktrees |
| Execution isolation | untrusted/risky execution | Docker/sandbox (later) |

## Component types

- **Prompts** (`prompts/`) — invoked workflows. Cheapest layer.
- **Skills** (`skills/`) — on-demand procedural knowledge.
- **Extensions** (`extensions/`) — real new capabilities Pi's built-in tools
  can't cover cleanly.

## Extensions

- `worktree-manager` — planned Pi wrapper around the safe Phase 6 script.
- `herdr-orchestrator` — spawn, prompt, query, wait for, and read agents through
  Herdr using agent-type-agnostic tools. It preflights agent-name collisions,
  waits for settled results by default, preserves uncertain panes for recovery,
  propagates cancellation, and truncates captured output.
- `task-manager` — atomic per-task JSON state with validated transitions,
  revisions, structured results, and evidence-based handoffs.
- `safety-gate` — interactive one-time approval and headless fail-closed
  enforcement for destructive commands and protected paths.

Extensions are scaffolded but implemented incrementally, only after the simpler
layers prove reliable.

## Principles

Optimize for isolation, reliability, context quality, reproducibility,
observability, safe delegation, and easy recovery — not maximum agent count.
A reliable 3-agent workflow beats 10 noisy agents.
