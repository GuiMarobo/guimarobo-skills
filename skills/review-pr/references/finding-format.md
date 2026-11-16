# Findings: format, severity, report

## Finding

```
### [<ID>] <one-line title>
- Severity: Blocker | Major | Minor | Nit · Confidence: high | medium · Status: CONFIRMED | PLAUSIBLE
- Lens: <lens> · Ref: <e.g. OWASP A01:2025 · API1:2023 · CWE-639>   (security/standards only)
- Where: <path:line>  (more locations on extra lines)
- Scenario: <concrete input/state/sequence → wrong outcome or exploit and its impact>
- Evidence: <≤6 quoted lines of code or tool output>
- Fix direction: <what to change and where; not a full patch>
- Regression test: <the RED test that would have caught it, at which seam>
```

IDs: `B1…` Blocker, `M1…` Major, `m1…` Minor, `n1…` Nit.

Rules:
- No scenario, no finding. "Consider validating input" is not a finding. "POST /orders with `quantity: -5` creates an order with a negative total because …" is.
- Low confidence → don't report it as a finding. Put it under *Not checked / open questions*.
- One root cause = one finding, even across many lines. List the locations.

## Severity

| Severity | Meaning | Examples |
|---|---|---|
| **Blocker** | must not merge | exploitable vulnerability (IDOR, injection, auth bypass, leaked secret); data loss/corruption; crash or wrong result on a normal path; destructive or locking migration; failing gate caused by the branch; AC not met |
| **Major** | fix before merge unless consciously accepted | bug on a realistic edge path; vulnerability needing extra conditions; N+1 or unbounded query on a growing dataset in a hot path; external call without timeout; non-idempotent consumer; unflagged breaking API change; an AC or authz rule without a test |
| **Minor** | worth fixing, doesn't block | maintainability smells, defence-in-depth hardening, redundant tests, small perf wins |
| **Nit** | optional | at most 5 in the whole report; drop the rest |

Severity reflects **impact × likelihood in this codebase**, not the category. An injection sink fed only by a constant is not a Blocker.

## Report template

```
# PR review: <branch> vs <base>
Verdict: BLOCK | CHANGES REQUESTED | APPROVE WITH NOTES | APPROVE
<2–3 sentences: overall risk and the most important thing to fix>

## Gates
| Gate | Result |
|---|---|
| typecheck | ✔ / ✖ <summary> |
| lint | … |
| tests | 312 passed · coverage on changed lines 87% |
| mutation (changed files) | 81% · 7 survivors | not run: <why> |
| dependency audit | … |
| secrets | … |
| SAST (Semgrep) | … |
| pre-existing failures | none / <file (n)>: not caused by this branch, not counted as findings |

## Summary
Blocker 1 · Major 3 · Minor 4 · Nit 2   (refuted and dropped: 6)
By lens: security 2 · correctness 2 · performance 1 · tests 3 · …

## Blockers
…
## Majors
…
## Minors
…
## Nits
…

## PR discussion   (only when the PR has unresolved threads or change requests)
- <path:line or "general"> "<request, trimmed>" (@author): addressed (<file:line>) | not addressed | unclear

## Not checked / open questions
- <gate not run, lens limitation, runtime/config assumptions>
```

Verdict: any Blocker → BLOCK; any Major → CHANGES REQUESTED; only Minors/Nits → APPROVE WITH NOTES; nothing → APPROVE.
