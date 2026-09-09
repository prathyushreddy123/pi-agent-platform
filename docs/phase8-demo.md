# Phase 8 lead / worker / reviewer demonstration

## Objective

Prove the smallest useful multi-agent workflow without touching a client or
product repository.

## Disposable project

- Main checkout: `~/src/experiments/phase8-multi-agent-demo`
- Task worktree: `~/worktrees/phase8-multi-agent-demo/greeting`
- Task branch: `agent/greeting`

The baseline is a tiny Python greeting function with a standard-library
`unittest` test.

## Workflow exercised

1. The lead created and tested the baseline repository.
2. `scripts/worktree.sh` created an isolated task branch and worktree.
3. Herdr started a worker Pi using `claude-bridge/claude-opus-4-8`.
4. The worker implemented optional-name handling and focused tests without
   committing.
5. The lead independently inspected the diff and reran the tests.
6. The worker was stopped before the reviewer started.
7. Herdr started a read-only reviewer Pi using
   `openai-codex/gpt-5.6-sol`.
8. The reviewer inspected the diff, ran the tests, and approved the change.
9. The lead supplied a missing handoff detail; the reviewer corrected the
   worker's inaccurate claim that the changes were staged. They were unstaged.

## Result

- Four tests passed.
- Reviewer verdict: **approve** with no code findings.
- Main checkout remained clean.
- Worker changes remain uncommitted in the task worktree for human inspection.
- Temporary Herdr worker and reviewer panes were closed after completion.

## Lessons

- Lifecycle reporting, isolated delegation, independent validation, and
  read-only review all work end-to-end.
- Handoff text must be passed explicitly; a reviewer cannot assess a worker's
  report if the lead provides only the requirement and diff.
- Agent reports are evidence to verify, not a substitute for `git status`, the
  actual diff, and test output.
