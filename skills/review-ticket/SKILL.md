---
name: review-ticket
description: Fast, low-cost senior review of one ticket's or task's changes in TypeScript/JavaScript (Node, NestJS, Express, Fastify, Next, front-end). Checks conformance to the ticket or request, correctness bugs, test quality, and obvious security holes, and reports only evidence-backed findings. Works in any repo with zero setup. Use right after a ticket or small change is implemented (the tdd skill hands off here), or when the user asks to review a ticket, task, or small change. For a whole branch or PR, use review-pr.
---

# Review Ticket

A fast gate between tickets. It catches what would be expensive to find later. **It reports; it does not fix.** It is cheap by design: one read-only reviewer on a smaller model, one pass, short output.

**Zero-config principle:** every input below has a fallback. Use the best source that exists, and say in the report which fallback you used.

## Project conventions

Look for a section headed `Workflow` in the repo's `CLAUDE.md` or `AGENTS.md`, or a `docs/agents/workflow.md` file. Each key it sets wins; each key it omits uses the default:

| Key | Default |
|---|---|
| Specs | `.scratch/<feature>/spec.md`, or the tracker in `docs/agents/issue-tracker.md` |
| Tickets | `.scratch/<feature>/issues/<NN>-<slug>.md` |
| Reviews | `.scratch/<feature>/reviews/` |
| Language | the language the user writes in |

- `<feature>` is the epic's folder name. A local ticket's **id** is `<feature>#<NN>`.
- Ticket labels are recognised in English or Portuguese: What to build / O que construir · Blocked by / Bloqueado por · Status · Acceptance criteria / Critérios de aceite · Notes / Pontos de atenção · Before starting / Antes de começar.
- **Status** lifecycle of a local ticket: `ready-for-agent` → `in-review` (tdd's commit) → `done` (this skill, step 6).
- **Language** covers the report (translate the template labels). Finding IDs, severities, and verdicts stay as written so other skills can parse them.

## 0. Is a review worth it?

Skip it (say so in one line) when the change is small **and** low-risk: under ~40 changed lines of production code, and it touches no entry point (route, handler, consumer), authentication/authorization, money, persistence, or external input. Those changes go to `review-pr` with the rest of the branch. Still save a one-line report with verdict SKIPPED (step 5), so `review-pr` knows nobody reviewed this ticket. The user can always ask for a review anyway.

## 1. Pin the scope

**Diff**, using the first that applies: the base and commit SHAs in the TDD report (`git diff <base>..<commit>`) · what the caller passed · the ticket's commits (`git log --grep "Refs: <ticket-id>"`, else the id anywhere in the message) · uncommitted work (`git diff HEAD` + untracked files) · the last commit · not a git repo: the files changed in this conversation. Leave `.scratch/` out. Confirm it is non-empty.

**Intent**, using the first that exists: the ticket and its ACs, plus its *Notes* section, which binds like an AC (a path the caller gave, or the Tickets location) · the TDD report's ACs · the user's request or commit messages · nothing: infer it from the diff in one sentence and mark conformance "inferred".

## 2. Gates

If a TDD report in context already shows tests, typecheck, and lint results for this exact change, reuse them. Otherwise run what exists **once**, quietly (tail of output only): the project's scripts, else `tsc --noEmit` if TypeScript is installed, ESLint/Biome on changed files if configured, the affected tests. Never `npx` a package that isn't a dependency. A missing gate is "not configured", not a failure.

**Only failures the diff causes are Blockers.** A failure is caused by the diff when it is in a file the diff added or changed, in a test that imports a changed module, or a type/lint error that a changed export produces. When unsure, treat it as caused.
- Caused by the diff → **Blocker**: report it and stop.
- Anything else → **pre-existing**: list it on the report's Gates line. It is not a finding and doesn't block.

## 3. One read-only reviewer

Spawn **one sub-agent with a fresh context, on a smaller model** (e.g. `model: sonnet`, if the agent tool lets you choose), in the **foreground** (never in the background: step 4 needs its output). The author's context biases the review, and a fresh, small context is also much cheaper than reviewing inside a long session. No sub-agents available → do it inline, re-reading the diff from scratch.

Give it: how to get the diff, the intent, the absolute path of [checklist.md](references/checklist.md), the paths of the project's written standards that exist (`CONTRIBUTING.md`, `CODING_STANDARDS.md`, `CLAUDE.md` / `AGENTS.md`; or "none"), and this brief:

> Review these changes against the stated intent using the four lenses in checklist.md: conformance, correctness, test quality, security quick-scan. Read only the diff and the code it calls or is called by (use search; don't read whole folders). Do not run code, tests, or scripts and do not edit files: reason from the code. Report a finding only with file:line and a concrete failure scenario (input/state → wrong outcome). No style comments, with one exception: a breach of a rule written in the standards files listed (not one that lint or types enforce) is a finding with lens "standards", the quoted rule as its scenario, and Minor severity unless the rule protects correctness. Use the output format in checklist.md. At most 6 findings; total answer under 350 words.

## 4. Filter

Drop findings without `file:line` or a concrete scenario (for a standards finding, the quoted rule), preferences that no written standard states, and anything lint/types enforce. For each Blocker, re-read the cited lines yourself (just those lines) and drop it if it doesn't hold. Keep at most 3 Minors.

## 5. Report

```
## Review: <ticket id or one-line intent>
Verdict: PASS | FIX REQUIRED | SKIPPED (small, low-risk)
Diff: <base>..<commit> · Intent: <source> · Gates: tests ✔ 42 · tsc ✔ · lint not configured · Pre-existing: none | <failures>

### [B1] <title>    (Blocker | Major | Minor)
- Lens: correctness · Where: src/orders/orders.service.ts:42
- Scenario: <input/state → wrong outcome>
- Evidence: <≤5 quoted lines>
- Fix direction: <what to change>
- Regression test: <the RED test to write>
```

Findings use exactly the format in checklist.md, so the reviewer's output goes in unchanged.

**FIX REQUIRED** when there is any Blocker or Major.

**Save it.** Print the report and write it to `<Reviews>/<NN>.md` (Reviews location from *Project conventions*). `<feature>` is the ticket's epic folder, else the current branch name with `/` replaced by `-`; `<NN>` is the ticket number, else a short slug of the intent. Create the folders if needed. Don't commit it. If the Reviews folder isn't git-ignored, say so once. This file is how `review-pr` and `implement-epic` learn what was already reported, even in another session.

Severity:
- **Blocker:** gate failure caused by the diff, an AC not met, exploitable vulnerability, data loss/corruption, crash on a normal path.
- **Major:** bug on a realistic edge path, missing authorization or validation, an AC without a test, a test that can't fail.
- **Minor:** low-risk issue worth fixing before the PR. Doesn't block.

## 6. Hand off

- **FIX REQUIRED** → all Blockers/Majors go back through the `tdd` skill in **one** batched fix round, in a fresh tdd sub-agent when `implement-epic` is orchestrating. If `tdd` isn't installed, fix test-first by hand. Each finding becomes a RED test reproducing it, and the fix is committed separately, without pushing.
- **Round 2 is a verify pass, not a new review:** no sub-agent. Read only the fix commit's diff and check, for each finding, that (a) a test reproducing it exists and (b) the code change addresses the cause. Run the tests once. Report "fixed / not fixed" per finding, plus any new Blocker visible in the fix diff itself. Nothing else. Append the result to the same review file, starting with the line `Verify: ALL FIXED` or `Verify: NOT FIXED <ids>`.
- Still not fixed after that → stop and escalate to the user.
- Minors → they are already in the review file, and `review-pr` picks them up. Don't loop on them.

**Close the ticket.** When the verdict is PASS or SKIPPED, the verify pass reports all fixed, or the user accepts the ticket as is, and the ticket is a local file with a `Status:` line: set it to `done` and commit only that file, `docs(<scope>): mark <ticket-id> done` (the repo's commit rules apply, as in tdd step 6; never push). That line is how `implement-epic` resumes, so don't skip it.
