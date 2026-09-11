# Herdr workspace layout

Phase 12 defines a small, adaptive layout rather than provisioning a fixed pane
grid. Herdr is the runtime control plane; Git worktrees and task state remain the
sources of isolation and workflow truth.

## Default template

Use one Herdr workspace per repository:

```text
Workspace: <project>

control                         task-<task-id> (on demand)
└── lead Pi                     ├── worker Pi
                                └── reviewer Pi (after worker settles)

runtime (optional)
├── development server
└── logs or focused test watcher
```

Only the `control` tab is expected for every project. Create task tabs and the
`runtime` tab when the work actually needs them; do not keep an empty four-pane
layout.

## Naming

Use stable task IDs across task state, branches, worktrees, tabs, and agents:

| Resource | Convention | Example |
|---|---|---|
| Workspace | `<repository-name>` | `billing-api` |
| Task | short descriptive ID | `invoice-validation` |
| Task tab | `task-<task-id>` | `task-invoice-validation` |
| Worker agent | `<task-id>-worker` | `invoice-validation-worker` |
| Reviewer agent | `<task-id>-reviewer` | `invoice-validation-reviewer` |
| Branch | `agent/<task-id>` | `agent/invoice-validation` |
| Worktree | `~/worktrees/<project>/<task-id>` | `~/worktrees/billing-api/invoice-validation` |

Names must still satisfy the stricter syntax of the tool that creates them. Use
a shorter task ID if a generated name would exceed a tool limit.

## Working directories

- The `control` tab starts in the project's main checkout.
- Worker and reviewer panes start in the task worktree, never the main checkout.
- Runtime panes start in the checkout or worktree whose code they execute.
- The lead verifies a pane's working directory before delegating or running a
  destructive operation.

## Task lifecycle

1. Open or focus the project's Herdr workspace and its `control` tab.
2. Create durable task state and an isolated Git worktree.
3. Create `task-<task-id>` only when delegation begins.
4. Start the worker in the task worktree and record its assignment.
5. Wait for the worker to settle; collect its structured result and fresh Git
   evidence.
6. Start the reviewer in the same worktree with an explicitly read-only role.
   Do not let a worker continue editing during review.
7. Return the reviewer verdict and evidence to the lead in `control`.
8. Ask for human approval before committing, merging, pushing, deploying, or
   destructive cleanup.
9. Close task panes only after preserving results and confirming there is no
   uncommitted or unpushed work that would be lost.

A blocked or uncertain agent pane is recovery evidence. Preserve it until the
lead has inspected its status and output.

## Optional runtime tab

Create `runtime` only for a long-lived server, log stream, or test watcher that
would otherwise clutter an agent pane. Label panes by purpose and make their
checkout explicit. Runtime processes do not imply deployment permission and
must not access production unless a task specifically authorizes it.

## What is intentionally not automated

Phase 12 does not add a layout script, configuration format, automatic pane
restoration, or fixed worker/reviewer panes. Herdr already persists workspaces,
and the orchestrator creates agent panes on demand. Automate this template only
if repeated manual setup becomes a demonstrated source of errors.
