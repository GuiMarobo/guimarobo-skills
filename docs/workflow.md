# How the skills fit together

```
        spec + ticket files (local, with ACs and "Blocked by")
                          │
                 /implement-epic  ── orchestrates, never implements
                          │
     ┌────────── for each ready ticket, in dependency order ──────────┐
     │                                                                │
     │   tdd (fresh sub-agent)  →  review-ticket  →  fix + verify     │
     │   commits locally,           PASS → ticket      only on        │
     │   ticket → in-review         marked done        FIX REQUIRED   │
     └────────────────────────────────────────────────────────────────┘
                          │
                 review-pr on the branch
                          │
          push and PR stay with you (or the project's rules)
```

Each skill also works on its own:

- **`tdd`** on a single ticket or bug fix, then it hands off to `review-ticket`.
- **`review-ticket`** right after any small change.
- **`review-pr`** before merging any branch.

## Project conventions

All four skills look for a `Workflow` section in the repo's `CLAUDE.md` or `AGENTS.md` (or a `docs/agents/workflow.md` file). Each key it sets overrides the default; each key it omits keeps it. The keys, their defaults, ticket ids and the Status lifecycle (`ready-for-agent` → `in-review` → `done`) are documented in [implement-epic/references/workflow.md](../skills/implement-epic/references/workflow.md).

The rest of the project's `CLAUDE.md` binds the skills too (verification commands, things to ask first, commit rules), with one exception: none of them ever pushes.
