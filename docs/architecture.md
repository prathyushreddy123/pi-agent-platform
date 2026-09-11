# Architecture

## Target

```
                         ME
                          |
                          v
                HERDR PROJECT WORKSPACE
                          |
              +-----------+-----------+
              |                       |
         control tab            task tab (on demand)
          LEAD PI              WORKER -> REVIEWER
                                      |
                                 Git worktree
                                      |
                                tests / build
                                      |
                                   Git diff
                                      |
                                      v
                             ME (approve / merge)
                                      |
                                    CI/CD

              runtime tab (optional server / logs)
```

I am the final approval point for merges, pushes, deployments, and destructive
actions.

## Layers

| Layer | Owns | Tech |
|-------|------|------|
| Control plane | workspaces, panes, agent processes, terminals, servers, logs | Herdr |
| Agent layer | reasoning, tools, skills, prompts, delegation | Pi |
| Isolation | task/branch isolation | Git worktrees |
| Execution isolation | untrusted/risky execution | Docker/sandbox (deferred until needed) |

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

## Herdr workspace convention

Use one workspace per repository, a persistent `control` tab for the lead, and
task/runtime tabs only when needed. Worker and reviewer panes use the task
worktree; review begins after the worker settles. See
[`herdr-workspace-layout.md`](herdr-workspace-layout.md).

## Client project convention

Keep client repositories isolated under `~/src/clients/<client>/<project>`.
Each repository may add a project `AGENTS.md` containing verified commands,
boundaries, data restrictions, and delivery requirements without repeating the
global rules. Adopt it using the
[client project template](client-project-template.md).

## Portability boundary

The repository owns portable prompts, skills, rules, extensions, templates, and
helper scripts. `scripts/bootstrap.sh` links those assets and verifies required
tools; Herdr owns its generated Pi state integration. Provider credentials,
settings, sessions, logs, and task runtime state remain outside Git. See the
[fresh-machine bootstrap guide](bootstrap.md).

## Principles

Optimize for isolation, reliability, context quality, reproducibility,
observability, safe delegation, and easy recovery — not maximum agent count.
A reliable 3-agent workflow beats 10 noisy agents.
