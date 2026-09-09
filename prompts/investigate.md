---
description: Investigate/understand a codebase, system, or incident
argument-hint: "<question or area>"
---
Investigate: ${@:-(use the question I just described)}

This is a read-only investigation — do not change code.

1. Clarify the exact question being answered.
2. Map the relevant parts of the system (entry points, data flow, dependencies).
3. Gather evidence from code, config, logs, and history; cite file:line.
4. Note assumptions and unknowns explicitly.
5. Answer the question, and summarize how the relevant part actually works.
6. Recommend next steps if action is needed.
