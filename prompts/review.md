---
description: Review changes for correctness, safety, and quality
argument-hint: "[target: staged|branch|files]"
---
Review the changes (${1:-staged changes via `git diff --cached`; if none, the diff against the default branch}).

Act as a reviewer, not an implementer — do NOT modify the code unless I ask.
Assess:

- Correctness and logic errors
- Regressions and unintended side effects
- Error handling and edge cases
- Security concerns (injection, secrets, auth, unsafe input)
- Maintainability and unnecessary complexity
- Test coverage: do tests exist and do they actually cover this change?

Report findings grouped by severity (blocking / should-fix / nit), each with the
file:line and a concrete recommended change.
