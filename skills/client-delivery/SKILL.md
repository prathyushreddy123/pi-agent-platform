---
name: client-delivery
description: Standards for delivering work to clients safely and reproducibly. Use when working inside a client repository, preparing a deliverable, deploying, or handing off client work. Emphasizes client isolation, reproducibility, and deployment caution.
---

# Client Delivery

Client work must be isolated, reproducible, documented, and safe. Reputation and
trust depend on it.

## Client isolation

- Treat each client repo as a sealed context. Never copy code, data, secrets, or
  configuration between clients, or between a client and my own products.
- Use per-client credentials only; never reuse tokens across clients.
- Keep client work under its own path (e.g. `~/src/clients/<client>/<project>`)
  and its own worktrees.
- Never paste client secrets/data into logs, commits, or shared output.

## Reproducibility

- Pin dependencies; commit lockfiles.
- Document exact setup, build, test, and run commands (they belong in the
  project `AGENTS.md` / README).
- Prefer scripted, deterministic setup over undocumented manual steps.

## Validation before delivery

- Tests, lint, and type checks pass.
- The change matches the agreed scope — nothing extra.
- Review the full diff; no secrets, no debug code, no unrelated changes.

## Deployment caution

- Never deploy to or modify production without explicit, specific authorization.
- Confirm the target environment before any deploy/migration/infra command.
- Know the rollback plan before deploying.
- Destructive infra actions (delete, drop, force) require explicit approval.

## Handoff

Deliver with a clear summary: what changed, how to run/verify it, known
limitations, and next steps. Leave the repo in a clean, buildable state.
