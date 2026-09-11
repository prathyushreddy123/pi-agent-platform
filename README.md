# agent-platform

My personal, version-controlled multi-agent software development environment,
built around [Pi Coding Agent](https://github.com/badlogic/pi) and
[Herdr](https://herdr.dev).

This repository is the **source of truth** for my custom Pi/agent setup. It is
designed to be cloned onto a fresh WSL/Linux machine and bootstrapped into
`~/.pi/agent/` (see the [architecture](docs/architecture.md) and
[fresh-machine guide](docs/bootstrap.md)).

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
- **Docker/sandbox** — optional execution isolation, deferred until untrusted
  execution requires it.

## Bootstrap

After installing Git, Node.js, Pi, and Herdr:

```bash
scripts/bootstrap.sh --dry-run
scripts/bootstrap.sh
herdr integration install pi
scripts/bootstrap.sh --check
```

The bootstrap never installs software or manages credentials and runtime state.
See [`docs/bootstrap.md`](docs/bootstrap.md) for setup and recovery details.

## Status

Phases 0–10 and 12–14 are complete, including safe worktree automation, Pi ↔
Herdr orchestration, lead/worker/reviewer workflow, durable task state and
handoffs, fail-closed safety gates, an
[adaptive Herdr workspace layout](docs/herdr-workspace-layout.md), a
[safe client-project overlay](docs/client-project-template.md), and reproducible
fresh-machine bootstrap. Docker sandboxing is deferred until untrusted execution
requires it. See [`docs/roadmap.md`](docs/roadmap.md) for phase status.
