---
description: Implement a focused change following global rules
argument-hint: "[task]"
---
Implement this task: ${@:-(use the task I just described)}

Follow my global operating rules:

1. Understand the surrounding code before editing.
2. Make the smallest change that satisfies the task; avoid unrelated edits.
3. Match existing conventions and style.
4. Add or update tests when appropriate.
5. Run the relevant tests, lint, and type checks if available.
6. Review the final `git diff` yourself.

Then report: what changed (files), commands/tests run and their results,
assumptions made, and anything unresolved.
