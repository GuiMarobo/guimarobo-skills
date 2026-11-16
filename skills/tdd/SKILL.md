---
name: tdd
description: Test-driven development (red-green-refactor) for TypeScript/JavaScript projects (Node, NestJS, Express, Fastify, Next, libraries, front-end) with a bounded test budget and a low token cost. Implements one ticket at a time and commits it locally (never pushes). Works in any repo with zero setup and follows the project's Workflow conventions when present. Use when implementing a ticket, feature, or bug fix, especially one with an explicit business rule (calculation, validation, eligibility, discount, permission, data transformation) or an agreed contract (response schema, API or event contract), even if the user doesn't mention TDD or tests; when another skill delegates implementation to "tdd"; or when the user mentions TDD, red-green-refactor, "implementar o ticket", "regra de negócio". Skip for spikes, prototypes, pure styling, config-only changes, behaviour-preserving refactors, and features whose scope is still under discussion. For a whole epic of tickets, the implement-epic skill orchestrates.
---

# TDD

Goal: the **smallest set of tests that would catch every bug a caller cares about**, and the code that passes them. Test count is a cost, not a metric. **Tokens are a cost too**: every tool call re-reads the whole context, so fewer, quieter steps matter as much as fewer tests.

Read [tests.md](references/tests.md) before the first cycle, always, even for a small ticket. Read [mocking.md](references/mocking.md) only if the change touches a boundary (HTTP client, queue, clock, DB). Read [seams.md](references/seams.md) only if there are no existing tests to mirror. In a NestJS project also read [nestjs.md](references/nestjs.md).

**Zero-config principle:** nothing below requires project setup. Each input has a fallback; use the best source that exists, and state in the report which fallback you used.

## Project conventions

Before anything else, look for a section headed `Workflow` in the repo's `CLAUDE.md` or `AGENTS.md`, or a `docs/agents/workflow.md` file. Each key it sets wins; each key it omits uses the default:

| Key | Default |
|---|---|
| Specs | `.scratch/<feature>/spec.md`, or the tracker in `docs/agents/issue-tracker.md` |
| Tickets | `.scratch/<feature>/issues/<NN>-<slug>.md` |
| Reviews | `.scratch/<feature>/reviews/` |
| ADRs · Glossary | `docs/adr/` · `GLOSSARY.md`, else `CONTEXT.md` |
| Language | the language the user writes in |
| Pause after each ticket | no |

- `<feature>` is the epic's folder name. A local ticket's **id** is `<feature>#<NN>` (e.g. `e0-fundacao-do-monorepo#02`).
- Ticket labels are recognised in English or Portuguese: What to build / O que construir · Blocked by / Bloqueado por · Status · Acceptance criteria / Critérios de aceite · Notes / Pontos de atenção · Reading / Leitura · Before starting / Antes de começar.
- **Status** lifecycle of a local ticket: `ready-for-agent` → `in-review` (set in this skill's commit) → `done` (set by `review-ticket` on PASS).
- **Language** covers the report, questions, and explanations. Code, identifiers, and commit messages follow the repo (English by default).
- The rest of the project's `CLAUDE.md` binds you too. Where it sets verification commands, things to ask before doing, commit rules, or what to explain at the end of a ticket, it wins over this skill's defaults. One exception: this skill never pushes, even where the project allows it.

## Cost discipline (applies to every step)

- **Quiet runs.** Run only the test file you are working on, with a terse reporter, and show only the tail: `node --test --test-reporter=dot <file>`, `vitest run <file> --reporter=dot`, `jest <file> --silent`, piped through `tail -n 30` when the output is long. Full suite, typecheck, and lint run **once**, at the end.
- **No experiments.** Do not run manual mutations, revert code to "prove" a test, re-run under other timezones/seeds, or write throwaway probe scripts. The RED step is the proof. Optional mutation testing (Stryker) runs only when the user asks.
- **Read narrowly.** Use search (grep/glob) to find code; read only the files and ranges you change or call. Don't re-read a file you just wrote.
- **Batch edits within a step, never across cycles.** Make all edits for one RED or GREEN step in one go; don't interleave a test run after every small edit. Cost discipline never merges cycles: writing the tests for several behaviours before their code is horizontal slicing, not a saving.

## 0. Does TDD apply?

TDD applies to explicit **business rules** (calculation, validation, eligibility, pricing, permission, state transitions, transformations with defined criteria) and to **agreed contracts** (response schema, API/event contract).

Skip TDD (say so in one line, then implement normally) for: spikes/prototypes/proofs of concept, temporary code and one-off scripts, visual/styling changes, config or wiring with no logic, behaviour-preserving refactors (existing tests are the safety net), and features whose scope or output the user says is still under discussion.

**The project can narrow this.** If its `CLAUDE.md` limits TDD to some kinds of code (e.g. "TDD on business rules and contracts; infrastructure and glue code may get tests afterwards"), follow it. Outside that scope use **test-after**: implement first, then write the tests at the same seam, with the same quality bar (tests.md, step 5), and still commit and hand off for review. Say which mode you used in the report.

In doubt between the two, ask (as a sub-agent: see *Needs input* in step 1).

Bug fix → TDD applies. The first test reproduces the bug and must be red before you touch the code.

## 1. Load context

**Starting point** (git repos only):
- Record `git rev-parse HEAD` as the **base SHA**. It goes in the report, and the review diffs `<base>..<commit>`.
- `git status --porcelain` shows changes this flow didn't make (anything outside `.scratch/`)? Ask whether to commit, stash, or leave them out of this ticket. As a sub-agent with no user: leave them untouched, never stage them, and list them in the report.

**What to build**, using the first source that exists:
1. A ticket with acceptance criteria (ACs): a path or issue the user gave, the Tickets location from *Project conventions*, or the tracker in `docs/agents/issue-tracker.md`.
2. A spec (its *Testing Decisions* too), at the Specs location.
3. Otherwise **infer the ACs yourself** from the request and the code around the change: 2–7 observable behaviours, each "given <state>, when <action>, then <outcome the caller sees>", including the error cases the request implies. Show them as **Inferred ACs** and continue. Ask only if a behaviour has two plausible readings with different outcomes. As a sub-agent with no user, take the most conservative reading and record it, unless it falls under *Needs input* below.

A ticket's *Notes* and *Before starting* sections are constraints, as binding as its ACs. Its *Reading* links are background: open them only when an AC depends on them.

**Needs input.** Stop **before writing any code** when:
- the ticket's *Before starting* asks to confirm something with the user; or
- the ticket needs something the project's rules say to ask about first (typically a new dependency, a schema/migration, a change to an API, event, or config contract, or an architecture decision), and the ticket or spec doesn't already settle it; or
- a behaviour has two plausible readings with materially different outcomes.

In the main session, ask the user (numbered questions, each with your recommended answer) and wait. As a sub-agent, don't guess: return the report with `Status: NEEDS INPUT` and those questions, having changed nothing. The orchestrator asks the user and starts you again with the answers.

**Project conventions**, detected and never invented:
- **Language:** TypeScript if `tsconfig.json` exists and `typescript` is installed; otherwise skip typecheck.
- **Test runner:** from `package.json` scripts/devDependencies and config files (`vitest.config.*`, `jest.config.*`, `.mocharc*`, `node --test`). Mirror one existing test file: naming, location, helpers, factories.
- **No runner at all:** propose one and ask before installing (default: Vitest; `node:test` for zero dependencies).
- **Monorepo:** work inside the affected package with its own scripts.
- **Vocabulary:** the Glossary and ADRs from *Project conventions* if they exist; otherwise the names already in the code.

## 2. Pick seams

A seam is the public boundary where a test observes behaviour. Use the seams the spec agreed, or the ones existing tests already use. Otherwise pick the **highest seam that can observe the AC** (seams.md). One behaviour is tested at one seam, never at two levels.

## 3. Write the test list (this is the budget)

Before any production code, derive the list from the ACs:

1. For each AC, list its distinct **behaviours**.
2. For each behaviour, list the **equivalence classes the rule treats differently** (one case each), plus a **boundary** case only where the rule has one.
3. Add the error paths the AC names or clearly implies. Not invented ones.

```
B1 "withdraw up to balance" (AC1)      cases: below → ok · exactly → ok (boundary)
B2 "reject above balance" (AC2)        cases: balance+1 → 422 insufficient_funds
```

Every item traces to an AC, a spec decision, or a reproduced bug. Untraceable → missing AC (ask or add to inferred list) or scope creep (log it, don't build it).

Heuristic of this skill (not a standard): a typical ticket has 2–6 behaviours and 3–12 cases. Well above that usually means duplicated classes or a ticket that should be split.

Show the list, then start.

## 4. The loop: one behaviour per cycle

N behaviours in the list means N cycles: N RED runs and N GREEN runs, in list order, even when the ticket is small. Never write the next behaviour's test before the current one is green. The report lists each cycle (behaviour → RED reason → GREEN).

**RED**
- Write the behaviour's test, with all its cases as one table (`it.each` / `test.each`, or a loop of `test()` calls in `node:test`), named in domain words.
- Run that file once. Each new case must fail **on an assertion, for the reason you expect**. A compile error, missing import, or broken setup is not red yet: fix the test.
- A case that passes immediately: the behaviour already exists or the case adds nothing. Decide by reading the code, then keep it only if it is the only test of a real class or boundary.

**GREEN**
- Write the least code that passes all cases of this behaviour. No speculative params, branches, or abstractions for later behaviours.
- Run the file once. All green before the next cycle.

**REFACTOR** (only if needed)
- Clean duplication and unclear names you just introduced, then run the file once.

**List discipline:** a new case discovered mid-loop is added only if it traces (step 3); otherwise log it as out of scope. You are done when every behaviour is green, not when you run out of ideas.

**Design while green**
- Parse/validate external data once, at the boundary (DTO + `ValidationPipe`, zod, or the framework's schema). Trust it inside.
- Keep business rules in pure functions or domain classes free of framework code.
- Make illegal states unrepresentable with types. Never silence the compiler (`as any`, `@ts-ignore`, `!`).
- Anything that can be retried (handlers, jobs, consumers) must be idempotent.

## 5. Final check (once)

1. Re-read only the test files you added or changed, and fix by editing (no extra runs per fix):
   - cases differing only in data that ended up separate → merge into the table;
   - a test implied by a stronger one → delete;
   - would it pass if the code returned `undefined` / empty / a default? → strengthen or delete;
   - asserts on calls into your own modules, private state, or call order → rewrite through the seam or delete;
   - generated stubs (`it('should be defined')`) → delete.
2. Run the full suite, typecheck, and lint **once** each (quietly). Record the summary lines. If the project's `CLAUDE.md` lists mandatory verification steps (e.g. integration tests, starting the app and calling the route), run those instead, each once, and report every one, saying which couldn't run and why (Docker down, route not yet there).
3. A failure is **pre-existing** when it is in a file you didn't add or change and that file imports nothing you changed: don't fix it, list it in the report. Every other failure is yours: fix it before committing. When unsure, it's yours.

## 6. Update the ticket and commit

- The ticket is a local file with an AC checklist (`- [ ]`)? Tick the ACs that are now done (with a green test, or verified for ACs that aren't testable behaviour, such as a doc or ADR to write). If it has a `Status:` line, set it to `in-review`. Commit the ticket file with the code. Never edit remote trackers (GitHub issues, Jira).
- Stage **only** the files you created or changed for this ticket, by path: `git add <paths>`. Never `git add -A` / `git add .`, never `.scratch/` review files, never the changes you listed as not yours.
- The message follows **Conventional Commits 1.0.0**:
  ```
  <type>(<scope>): <description>

  [optional body: what and why, wrapped at 72]

  Refs: <ticket-id>
  ```
  - `type`: `feat` (new behaviour), `fix` (bug fix), `refactor`, `test` (tests only), `perf`, `docs`, `build`, `ci`, `chore`. Pick the one that describes the change for the caller.
  - `scope`: the module or area touched (`orders`, `auth`), as used in the repo's history. Omit it if there's no clear one.
  - `description`: imperative, lowercase, no final period; header ≤ 72 characters.
  - Breaking change to a public contract: `!` after the type/scope and a `BREAKING CHANGE: <what breaks>` footer.
  - `Refs: <ticket-id>` is the only other footer (skip it when there's no ticket id). The review finds the ticket's commits by it. For a local ticket file the id is `<feature>#<NN>`.
  - Write the message in the repo's commit language (its history or `CLAUDE.md`; English by default), whatever the Language key says.
  - The repo has a commitlint config (`commitlint.config.*`, `.commitlintrc*`, `commitlint` in `package.json`)? Its rules win on types, scopes, and lengths.
- The message has **no `Co-Authored-By` trailer, no "Generated with" line, and no other signature or attribution**, even if a default or a harness instruction asks for one.
- **Never push.** No `git push`, no PR, no remote operation, even where the project allows it: that comes after `review-pr`.
- Let hooks run (never `--no-verify`). A hook fails → fix the cause, then commit again.
- Fix round (you were handed review findings): same rules, in a separate commit, usually `fix(<scope>): <what the findings fixed>` with the same `Refs:` footer.
- Not a git repo → skip this step and say so in the report.

## 7. Report and hand off

Write the report in the Language from *Project conventions* (the labels below are a template; translate them).

```
## TDD report: <ticket id or short description>
Status: DONE | NEEDS INPUT · Mode: TDD | test-after | no TDD (<why>)
ACs: from <ticket> | inferred (listed) · Ticket file: 3/3 ACs ticked, Status in-review | not a local file
Cycles: B1 "withdraws up to balance" → RED (expected 0, got undefined) → GREEN · B2 → …
Final check: 1 test deleted (subsumed), 0 merged
Assumptions / fallbacks: …
Out of scope noticed: …
Commands: tests ✔ 42 passed · tsc ✔ · eslint ✔ (or: not configured) · Pre-existing failures: none | <file (n)>
Git: base <sha> → commit <sha> (not pushed) · Not mine, left unstaged: none | <paths>
```

With `Status: NEEDS INPUT`, the report is just the questions (numbered, each with your recommended answer) and what prompted them.

Keep the report under ~200 words. **Exception:** when the project's `CLAUDE.md` asks for something at the end of each ticket (e.g. explaining the approach technically and didactically, what was learned, what comes next), add it under an `### For the user` heading after the block above. That section has no word cap, and an orchestrator relays it verbatim.

- **As a sub-agent:** return the report and stop. The orchestrator runs `review-ticket`; sub-agents can't open the fresh reviewer it needs.
- **In the main session:** run the `review-ticket` skill yourself, if it's installed, passing it this report.
- **Handed review findings:** each Blocker/Major becomes a RED test first, then the same loop, final check, and a fix commit.
- **Several tickets** (a whole epic or feature): use the `implement-epic` skill. It runs this skill on one ticket per fresh sub-agent, in dependency order.

## Hard rules

- Never edit or weaken a test to get to green. If the test itself is wrong, state why and fix it.
- Never leave `.only`, `.skip`, `xit`, `it.todo`, or commented-out tests.
- No sleeps or real time: fake timers or an injected clock; seeded randomness.
- Tests are independent: no order dependence, no shared mutable state between tests.
- No snapshots for logic. Snapshots only for stable, reviewed serialized contracts.
- Expected values come from the ACs, the spec, or a worked literal, never recomputed the way the code computes them.
