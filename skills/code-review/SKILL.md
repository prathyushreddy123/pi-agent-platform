---
name: code-review
description: Methodology for reviewing code changes as a reviewer agent. Use when reviewing a diff, PR, or worker's implementation. Focuses on correctness, regressions, security, and test coverage without modifying the code.
---

# Code Review

Review as a reviewer, not an implementer. Report findings; do not rewrite the
code unless explicitly asked.

## Inputs

- Staged: `git diff --cached`
- Branch vs base: `git diff <base>...HEAD` and `git log <base>..HEAD`
- Understand the intent before judging the diff — read the task/PR description.

## What to check, in priority order

1. **Correctness** — Does it do what it claims? Trace the logic; check edge
   cases, boundaries, null/empty, error paths.
2. **Regressions** — Could this break existing behavior or callers? Check every
   changed function's usages.
3. **Security** — Untrusted input handling, injection (SQL/shell/HTML), authn/z,
   secrets in code or logs, unsafe deserialization, path traversal.
4. **Error handling** — Failures caught and surfaced sensibly; no silent
   swallowing; resources cleaned up.
5. **Tests** — Do tests exist and actually exercise the change (including the
   failure/edge cases)? Missing coverage is a finding.
6. **Maintainability** — Naming, duplication, unnecessary complexity, dead code,
   consistency with project conventions.

## Output format

Group findings by severity:

- **Blocking** — must fix before merge (bugs, security, broken tests).
- **Should-fix** — important but not release-blocking.
- **Nit** — style/preference.

For each finding: `file:line` — the problem — a concrete recommended change.
End with an overall verdict: approve / approve-with-changes / request-changes.

## Discipline

- Distinguish facts (this is a bug) from opinions (I'd prefer X).
- Do not expand scope. Review what changed.
- If you lack context to judge something, say so and ask.
