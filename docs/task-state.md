# Task state and structured handoffs

## Context

The Phase 8 demonstration proved delegation and review, but also exposed two
coordination risks:

1. the reviewer did not initially receive the worker's report;
2. the worker's statement that files were staged contradicted Git evidence.

Task reports therefore need durable structure, and every handoff must include
independently collected repository evidence.

## Decision

Store one JSON file per task in:

```text
${AGENT_PLATFORM_STATE_DIR:-${XDG_STATE_HOME:-~/.local/state}/agent-platform}/tasks/<task-id>.json
```

Files are written through an atomic temporary-file rename with mode `0600`.
The containing directory uses mode `0700`. A short-lived per-task filesystem
lock serializes updates, and each record has a revision for optimistic conflict
checks.

This data is runtime state and is intentionally not committed to Git.

### Why not SQLite yet?

SQLite would provide stronger multi-record transactions and richer querying,
but v1 has no cross-task transaction requirement. Per-task JSON is easier to
inspect, back up, and recover without adding dependencies or migrations. Move
to SQLite only if query volume or coordination requirements justify it.

## Lifecycle

```text
planned -> assigned -> working -> review -> completed
   |          |           |         |
   +----------+-----------+---------+-> failed
              +-> blocked -> assigned / working / review / failed
failed -> planned / assigned
```

Transitions are validated. Recording a worker or reviewer result does not mark
a task completed. Human approval remains required before merge, push,
deployment, destructive cleanup, or a final `completed` transition.

## Tools

| Tool | Purpose |
|---|---|
| `task_create` | Create a planned task |
| `task_get` | Read the complete task record |
| `task_list` | List/filter task summaries |
| `task_update` | Transition status and update assignment metadata |
| `task_record_worker_result` | Store changed files, checks, issues, and Git status |
| `task_record_review_result` | Store reviewer evidence and verdict |
| `task_build_handoff` | Combine task state with fresh, read-only Git evidence |

There is deliberately no delete tool in v1.

## Structured handoff

`task_build_handoff` supports:

- `worker-to-reviewer`
- `reviewer-to-lead`
- `general`

When a worktree is configured and present, the tool obtains fresh:

- `git status --short --branch`
- unstaged diff statistics
- staged diff statistics

The recipient must independently inspect the full diff and run relevant tests.
A worker or reviewer report is evidence to verify, not ground truth.

## Recovery

- Malformed or incompatible task files fail closed with a clear error.
- Revision conflicts require rereading the task before retrying an update.
- Lock directories older than 30 seconds are treated as stale and recovered.
- Files can be inspected directly, but normal updates should use the tools so
  transitions, revisions, permissions, and atomic writes remain enforced.
