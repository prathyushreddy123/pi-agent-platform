---
description: Produce a concise task handoff summary
---
Produce a concise handoff for the current task so another agent or I can pick it
up cleanly. Use this exact structure:

**Objective** — what this task is trying to achieve.
**Status** — done / in progress / blocked, in one line.
**Changed files** — list files touched (from `git status`/`git diff`).
**Commands run** — build/test/lint commands executed and their results.
**Known issues** — bugs, gaps, or risks still open.
**Next step** — the single most useful next action.

Keep it short and factual. Do not include unchanged boilerplate.
