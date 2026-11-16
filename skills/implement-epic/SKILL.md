---
name: implement-epic
description: Orchestrate a whole epic or feature made of local ticket files. Works through the tickets in dependency order (Blocked by / Bloqueado por), running tdd → review-ticket → fix → verify per ticket in fresh sub-agents, keeps each ticket's Status current so the run resumes in any session, honours the project's pause and ask-first rules, then runs review-pr on the branch. Use when the user runs /implement-epic, or asks to implement all the tickets of a spec or epic ("implementar o épico", "rodar os tickets do E0").
disable-model-invocation: true
---

# Implement epic

The main session **orchestrates; it doesn't implement.** Each ticket is built in a fresh `tdd` sub-agent, so the cost per ticket stays flat however many tickets came before, and the main context holds only the board and the reports.

Needs the `tdd`, `review-ticket`, and `review-pr` skills. If one is missing, say so and stop.

## 1. Conventions

Read the `Workflow` section of the repo's `CLAUDE.md` / `AGENTS.md` (or `docs/agents/workflow.md`), and read the rest of that `CLAUDE.md`: its rules about pausing, asking first, verification, explanations, and branches apply to this run. [workflow.md](references/workflow.md) documents the keys, their defaults, ticket ids, and the Status lifecycle. Read it only if the repo has no `Workflow` section, or you need to parse an unfamiliar ticket.

## 2. Locate the epic

The argument may be a spec folder, a tickets folder, or an epic name or prefix (`e0` → the one folder under the Specs root that starts with `e0`). No argument, or several matches: list the epics that still have tickets not `done`, and ask which one.

## 3. Build the board

For each ticket file, read only its header lines with search (title, Blocked by, Status) and count `- [ ]` / `- [x]`. Don't read the bodies: the sub-agents do that.

Show the board:

```
| #  | Ticket                    | Blocked by | Status          | Ready |
|----|---------------------------|------------|-----------------|-------|
| 01 | Raiz do workspace         | none       | done            |       |
| 02 | Gateway responde /health  | 01         | ready-for-agent | ✔     |
| 03 | Testes pelo seam do app   | 02         | ready-for-agent |       |
```

- **Ready** = not `done`, and every blocker is `done`.
- A blocker that names no existing ticket, or a dependency cycle → stop and report it.
- A Status outside the lifecycle (e.g. `needs-triage`) → treat the ticket as not ready, and list it under the board.

**Branch.** On the default branch, create `<prefix>/<feature>` following the repo's branch naming (e.g. `feat/e0-fundacao-do-monorepo`) when the project's rules allow creating branches; otherwise ask first. Already on a feature branch: stay on it.

## 4. Loop over the frontier

Pick the **lowest-numbered ready ticket**. Then, by its Status:

- `ready-for-agent` → **Implement** (a).
- `in-review` → resume at **Review** (b). If its review file already says FIX REQUIRED with no `Verify:` line, resume at **Fix** (c).

Spawn every sub-agent in the **foreground** (never in the background): each step needs the previous one's output.

**a. Implement.** Spawn a fresh sub-agent:
> Use the tdd skill on `<ticket path>`. You are a sub-agent with no user: follow the skill's sub-agent rules (Needs input, report). Return the TDD report.

Include the answers to any earlier questions about this ticket.

- `Status: NEEDS INPUT` → ask the user the questions as written (numbered, with the recommended answers), in the Language. Wait for the answers, then spawn a fresh sub-agent again with them. Nothing was committed, so there's nothing to undo.

**b. Review.** Run `review-ticket` in the main session, passing the TDD report (SHAs, ACs, gate results). It spawns its own fresh reviewer and, on PASS or SKIPPED, marks the ticket `done`.

**c. Fix** (only on FIX REQUIRED). Spawn a fresh tdd sub-agent with the ticket path, the TDD report, and the Blockers/Majors from the review file. Then run review-ticket's verify pass. Still not fixed → stop the run and escalate to the user with the review file's path.

**d. Relay.** Tell the user, in the Language: the ticket, the verdict, the commit SHAs, any Minors carried over, and the `For the user` section of the TDD report **verbatim** (the explanations the project asks for).

**e. Pause or continue.** If the Workflow sets `Pause after each ticket: yes`, or the project's `CLAUDE.md` asks you to stop after each ticket for review, stop here. Show the updated board, and say that running `/implement-epic <epic>` again continues from the next ready ticket. Otherwise refresh the board (re-read the Status lines) and go back to the top of step 4.

The user accepting a ticket as is (with unresolved findings) counts as done: review-ticket marks it.

## 5. Finish

No ready tickets left:
- Every ticket `done` → run `review-pr` on the branch (base: the default branch), then follow its hand-off. Pushing and opening the PR stay with the user, or with the project's rules once `review-pr` is through.
- Some tickets aren't done, but none is ready (blocked, or outside the lifecycle) → show the board and say what blocks each one.

## Hard rules

- Never implement or fix in the main session. If no sub-agents are available, run tdd inline for **one** ticket, then pause (the next run starts from a fresh session).
- Never start a ticket whose blockers aren't `done`, unless the user explicitly says so.
- Never edit a ticket's body or ACs. tdd ticks ACs and sets `in-review`; review-ticket sets `done`. The orchestrator only reads them.
- Never push, and never open a PR, from this skill.
