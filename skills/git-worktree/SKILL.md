---
name: git-worktree
description: Procedure for using Git worktrees to isolate tasks and agents. Use when starting an isolated task, running multiple agents on one repo, creating a task branch, or cleaning up completed work without disturbing the main checkout.
---

# Git Worktree

Worktrees let multiple branches be checked out at once in separate directories
that share one `.git`. This is how tasks and agents stay isolated: one task →
one branch → one worktree.

## Conventions

- Worktrees live outside the repo: `~/worktrees/<project>/<task>`
- Branch name: `agent/<task>` (or `feature/<task>` for my own work)
- Never nest a worktree inside the main checkout.

## When to create a worktree

- A task that will change files while another agent/task also needs the repo.
- Any delegated task given to a worker agent.
- Risky/experimental work you want to discard cleanly.

Do NOT create a worktree for a trivial read-only inspection.

## Create

```bash
cd /path/to/repo
git fetch                                   # if the branch tracks a remote
git worktree add ~/worktrees/<project>/<task> -b agent/<task> <base-branch>
```

- Verify the branch does not already exist (`git branch --list agent/<task>`).
  If it does, either reuse it deliberately or pick a new task name — do not
  clobber it.
- `<base-branch>` is usually the up-to-date default branch (e.g. `origin/main`).

## Inspect

```bash
git worktree list                           # all worktrees + their branches
cd ~/worktrees/<project>/<task> && git status
```

## Clean up (safely)

1. Confirm no uncommitted changes: `git status` must be clean.
2. Confirm work is merged or intentionally abandoned.
3. Remove the checkout:
   ```bash
   git worktree remove ~/worktrees/<project>/<task>
   ```
   `git worktree remove` refuses if there are uncommitted changes — never use
   `--force` to bypass this without explicit authorization.
4. Optionally delete the branch once merged: `git branch -d agent/<task>`
   (use `-d`, not `-D`, so Git refuses to drop unmerged work).

## Avoiding conflicts

- One branch can only be checked out in one worktree at a time.
- Prune stale entries after manual deletion: `git worktree prune`.
- Keep task names unique per project.
