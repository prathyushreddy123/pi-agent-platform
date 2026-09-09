---
description: Produce a concise task handoff summary
---
Produce a concise, evidence-based handoff so another agent or I can continue
cleanly. Inspect the current repository state instead of relying only on prior
agent claims. Use this exact structure:

**Objective** — what this task is trying to achieve.
**Status** — planned / assigned / working / blocked / review / completed / failed.
**Task context** — task ID, role/agent, worktree, and branch when available.
**Changed files** — files touched, distinguishing staged from unstaged changes.
**Commands/checks** — build/test/lint commands and their observed results.
**Results** — concise implementation or review result, including verdict if any.
**Known issues** — unresolved bugs, gaps, risks, and assumptions.
**Next step** — the single most useful next action and who should perform it.

If task-manager state exists, reconcile it with fresh `git status` and diff
evidence. Call out contradictions explicitly. Never imply that work was merged,
pushed, deployed, or cleaned up unless independently verified. Keep it short
and factual.
