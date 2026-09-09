---
name: debugging
description: Systematic root-cause debugging methodology. Use when investigating a bug, crash, failing test, incorrect output, or intermittent failure, to find the true cause before changing code.
---

# Debugging

Find the root cause with evidence before changing anything. Avoid guess-and-patch.

## Process

1. **Define the failure precisely.** Observed vs expected behavior, exact error
   text, and the conditions under which it happens.
2. **Reproduce it.** A reliable reproduction is the foundation. If you cannot
   reproduce, gather the inputs/environment you need and say so.
3. **Localize.** Narrow where the failure originates — bisect by area, add
   logging/assertions, inspect state at boundaries. Use `git bisect` for
   regressions.
4. **Hypothesize.** List plausible root causes ranked by likelihood, based on
   evidence, not hunches.
5. **Test each hypothesis.** Confirm or eliminate with concrete evidence
   (logs, values, a minimal case). Change one variable at a time.
6. **Identify the root cause** — the underlying reason, not the surface symptom.
7. **Fix minimally** at the root, and consider whether the same bug pattern
   exists elsewhere.
8. **Verify.** Reproduce is now gone; add a regression test that would have
   caught it.

## Principles

- Read the actual error and stack trace fully before theorizing.
- Trust evidence over assumptions; verify what you "know" is true.
- Prefer the simplest explanation that fits all the evidence.
- Keep notes of what you ruled out, so you don't loop.
- Don't fix symptoms while the root cause remains.
