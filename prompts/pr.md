---
description: Prepare a pull request (summary, diff review, checklist)
argument-hint: "[base-branch]"
---
Prepare a pull request against ${1:-the default branch}.

1. Run `git status` and review the full diff for this branch.
2. Confirm the branch contains only changes relevant to this task.
3. Draft a PR title and description:
   - What changed and why
   - How it was tested (commands + results)
   - Risks / rollback notes
   - Anything reviewers should focus on
4. Provide a pre-merge checklist: tests pass, lint/type checks pass, no secrets,
   no unrelated changes, docs updated if needed.

Do NOT push or open the PR yourself unless I explicitly authorize it.
