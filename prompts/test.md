---
description: Add or run tests for the current change
argument-hint: "[area]"
---
Handle testing for: ${@:-the current change}

1. Identify how this project runs tests, lint, and type checks (inspect config).
2. Determine what is currently covered and what is missing for this change.
3. Add focused tests for the important behavior and edge cases (avoid trivial or
   redundant tests).
4. Run the tests, lint, and type checks.
5. Report the exact commands used, results, and any failures with their cause.
