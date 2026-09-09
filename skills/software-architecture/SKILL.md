---
name: software-architecture
description: Guidance for making and evaluating software architecture and design decisions. Use when designing a new system/feature, evaluating trade-offs, choosing boundaries and data models, or reviewing a design for scalability, maintainability, and risk.
---

# Software Architecture

Make design decisions explicit, justified by requirements and trade-offs — not
by novelty. Prefer the simplest design that meets real constraints.

## Before designing

- Clarify functional requirements and hard constraints (scale, latency,
  consistency, compliance, budget, team size, deadlines).
- Identify what is likely to change and what is stable — put seams where change
  happens.
- Note explicit non-goals.

## Designing

1. **Boundaries & responsibilities** — Define components with clear
   responsibilities and interfaces. High cohesion, low coupling.
2. **Data** — Model the data and its ownership first; it outlives code. Decide
   sources of truth and consistency requirements.
3. **Control & data flow** — How requests move through the system; sync vs async;
   where state lives.
4. **Failure modes** — What happens when each dependency fails? Timeouts,
   retries, idempotency, degradation.
5. **Cross-cutting** — Auth, observability (logs/metrics/traces), config,
   secrets, migrations.

## Evaluating trade-offs

- State at least two viable options and why you chose one.
- Weigh: simplicity, operability, cost, performance, security, evolvability.
- Beware premature abstraction and premature optimization. YAGNI by default.
- Prefer boring, proven technology unless there's a concrete reason not to.

## Output

- A short design doc: context, decision, alternatives considered, consequences
  (an ADR-style record). Diagram the components and data flow when it helps.
- Call out the biggest risks and how the design mitigates them.
