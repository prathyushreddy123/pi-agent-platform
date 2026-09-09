# agent-platform

My personal, version-controlled multi-agent software development environment,
built around [Pi Coding Agent](https://github.com/badlogic/pi) and
[Herdr](https://herdr.dev).

This repository is the **source of truth** for my custom Pi/agent setup. It is
designed to be cloned onto a fresh WSL/Linux machine and bootstrapped into
`~/.pi/agent/` (see [`docs/architecture.md`](docs/architecture.md) and, later,
`scripts/bootstrap.sh`).

## Layout

```
agent-platform/
  extensions/   Pi extensions — new capabilities (worktrees, orchestration, safety).
  skills/       Pi skills — reusable procedural knowledge loaded on demand.
  prompts/      Pi prompt templates — workflows I invoke with /name.
  scripts/      Helper scripts (worktree automation, agent control, bootstrap).
  templates/    Reusable templates (global AGENTS.md, client project template).
  docs/         Architecture and design notes.
```

## Roles: prompt vs skill vs extension

- **Prompt** — a workflow I explicitly invoke (`/review`). Lives in `prompts/`.
- **Skill** — reusable knowledge an agent loads when relevant. Lives in `skills/`.
- **Extension** — a new capability Pi cannot do with standard tools (e.g. spawn
  another agent via Herdr). Lives in `extensions/`.

## Control plane

- **Pi** — reasoning, coding, tools, skills, prompts, orchestration logic.
- **Herdr** — workspaces, tabs, panes, agent processes, terminals, servers, logs.
  (No tmux.)
- **Git + worktrees** — source of truth and per-task isolation.
- **Docker/sandbox** — execution isolation, added when appropriate.

## Status

Phases 0–9 are complete, including safe worktree automation, initial Pi ↔ Herdr
orchestration, a lead/worker/reviewer demonstration, and durable task state with
structured handoffs. See [`docs/roadmap.md`](docs/roadmap.md) for phase status.
