---
name: review-pr
description: Deep senior review of a branch or PR in TypeScript/JavaScript (Node, NestJS, Express, Fastify, Next, front-end). Runs whatever deterministic gates the repo has (typecheck, lint, tests, audit, secrets, SAST, mutation), then up to 3 grouped, read-only lens sub-agents on a smaller model (correctness, security per OWASP Top 10:2025 / API Top 10 / CWE, performance, reliability, data/migrations, API contract, tests, spec, maintainability, frontend), then a refutation pass on Blockers/Majors so only evidence-backed findings survive. Cost-conscious by default; thorough mode on request. Works in any repo with zero setup. Reports by severity; does not fix. Use when the user asks to review a PR, a branch, or "everything since X" before merging.
---

# Review PR

Find what would hurt in production: bugs, vulnerabilities, scaling problems, broken contracts, and tests that don't protect anything. **It reports; it does not fix.**

Three layers, in order:
1. **Gates:** deterministic tools. Cheap, and they don't hallucinate.
2. **Lenses:** up to 3 parallel, read-only sub-agents on a smaller model, each covering a group of concerns (one pass on small diffs: see the fast path in step 4).
3. **Refutation:** a fresh sub-agent tries to disprove each Blocker and Major. Only survivors are reported.

**Cost discipline:** every tool call re-reads its whole context, so the orchestrator stays thin. Run gates quietly (summary lines only), pass sub-agents paths rather than file contents, and don't re-review what the per-ticket reviews already covered. **Thorough mode** (one sub-agent per lens, mutation testing) runs only when the user asks for it.

**Zero-config principle:** every input has a fallback. Use the best source that exists, and list the fallbacks used in the report.

## Project conventions

Look for a section headed `Workflow` in the repo's `CLAUDE.md` or `AGENTS.md`, or a `docs/agents/workflow.md` file. Each key it sets wins; each key it omits uses the default:

| Key | Default |
|---|---|
| Specs | `.scratch/<feature>/spec.md`, or the tracker in `docs/agents/issue-tracker.md` |
| Tickets | `.scratch/<feature>/issues/<NN>-<slug>.md` |
| Reviews | `.scratch/<feature>/reviews/` |
| ADRs · Glossary | `docs/adr/` · `GLOSSARY.md`, else `CONTEXT.md` |
| Language | the language the user writes in |

- `<feature>` is the epic's folder name. When the branch doesn't name it, take it from the ticket ids in the commits' `Refs: <feature>#<NN>` footers, else use the branch name with `/` replaced by `-`.
- Ticket labels are recognised in English or Portuguese (Blocked by / Bloqueado por, Acceptance criteria / Critérios de aceite, Notes / Pontos de atenção, …).
- **Language** covers the report and the questions in step 8 (translate the template labels). Finding IDs, severities, statuses, and the verdict stay as written.

## 1. Pin the fixed point

Use the first that applies, and state which one in the report:
1. The base the user gave (branch, SHA, tag).
2. A PR number/URL and `gh` available: `gh pr view <n> --json baseRefName,headRefName,title,body`; review `origin/<baseRefName>...<head>`.
3. Otherwise the repository's default branch: `git symbolic-ref --short refs/remotes/origin/HEAD`, else `main`, else `master`. Use `git merge-base HEAD <default>`.
4. On the default branch with no base: ask.

Then:
- `git rev-parse <base>` must resolve and `git diff <base>...HEAD` must be non-empty. Fail here, not inside the sub-agents.
- Uncommitted changes exist? Include them (`git diff <base>`) and say so.
- Leave `.scratch/` out of the diff, the line count, and the lenses: it holds working notes and per-ticket reviews, not code (`git diff <base>...HEAD -- . ':(exclude).scratch'`).
- Record the diff command, `git log <base>..HEAD --oneline`, the changed-file list, and the line count.
- More than ~3000 changed lines (excluding lockfiles and generated code): warn, and give the lenses a risk-ordered file list (auth, payments, data access, migrations, public API first).

## 2. Gather context (all optional)

- **Intent / spec**, first that exists: a path the user passed, the spec and ticket files at the Specs/Tickets locations for `<feature>` (the tickets whose ids appear in the commits' `Refs:` footers), other issue refs in commits, the tracker in `docs/agents/issue-tracker.md`, the PR title/body (`gh pr view`), the commit messages. If nothing has substance, the spec lens infers the intent from the diff and labels its findings "inferred".
- **Standards:** `CLAUDE.md` / `AGENTS.md`, `CONTRIBUTING.md`, `CODING_STANDARDS.md`, the lint config, the Glossary, the ADRs. None → the maintainability lens uses its baseline only.
- **Stack:** framework from `package.json` (`@nestjs/*`, `express`, `fastify`, `next`, `react`, …), ORM (`typeorm`, `prisma`, `mongoose`, `drizzle-orm`, `knex`, `sequelize`), test runner. Pass it to every lens; they apply framework-specific items only when they match.
- **Per-ticket reviews:** the files `review-ticket` saved in the Reviews location (`<Reviews>/*.md`) for this branch. Take from them the findings already reported and whether they were fixed, the Minors carried over, and the tickets marked SKIPPED (nobody reviewed those, so they get full attention).
- **PR discussion** (a PR exists and `gh` works): comments and reviews from `gh pr view <n> --json comments,reviews`, plus the unresolved review threads:
  ```
  gh api graphql -F owner=<owner> -F repo=<repo> -F n=<n> -f query='query($owner:String!,$repo:String!,$n:Int!){repository(owner:$owner,name:$repo){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved path line comments(first:3){nodes{author{login} body}}}}}}}'
  ```
  Keep only the unresolved threads and the comments that ask for a change, each trimmed to its request. They go to the spec lens.

## 3. Run the gates

Follow [tools.md](references/tools.md). Run only what is already installed, each **once**, keeping only summary lines and the findings (pipe long output through `tail`). Mutation testing runs only in thorough mode. For each missing tool, record "not run" with a one-line setup hint; never install anything without asking. **No gate is mandatory**: with zero tools, the lenses still review the code.

Gate failures go straight into the report: failing typecheck/tests **caused by the branch** → Blocker. A failure in a file the branch didn't touch, which imports nothing the branch changed, is **pre-existing**: list it in the Gates table, not as a finding (when unsure, treat it as caused). Also: a high/critical advisory reachable in production deps → Blocker or Major; a leaked secret → Blocker. Keep the raw outputs; the lenses get the parts relevant to them.

## 4. Select lenses

| Lens | File | Runs when |
|---|---|---|
| Correctness | [correctness.md](references/lenses/correctness.md) | always |
| Security | [security.md](references/lenses/security.md) | always |
| Tests | [tests.md](references/lenses/tests.md) | always |
| Spec | [spec.md](references/lenses/spec.md) | always (inferred mode when there's no spec) |
| Maintainability | [maintainability.md](references/lenses/maintainability.md) | always |
| Performance | [performance.md](references/lenses/performance.md) | data access, loops over collections, request handlers, jobs |
| Reliability | [reliability.md](references/lenses/reliability.md) | external calls, queues, cron, transactions, config, startup |
| Data | [data.md](references/lenses/data.md) | migrations, entities/models, Prisma schema, repositories, raw SQL |
| API contract | [api-contract.md](references/lenses/api-contract.md) | routes/controllers, DTOs/schemas, resolvers, exported library types, event schemas |
| Frontend | [frontend.md](references/lenses/frontend.md) | `.tsx` / `.jsx` / `.vue` / `.svelte` / `.html` or client code |

**Small diff (fast path):** up to ~300 changed lines of production code (excluding tests, lockfiles, generated code) and no per-ticket review marked SKIPPED that touches auth, money, persistence, or external input → use **one** lens sub-agent with all the selected lenses and **no** refutation sub-agent; instead, re-read the cited lines of each Blocker and Major yourself (step 6 rules still decide CONFIRMED / PLAUSIBLE / REJECTED). If this session has done nothing before this review (its context is still small), run that single pass inline instead of spawning, re-reading the diff from scratch. Either way, the single pass still covers every selected lens, including maintainability against the standards files from step 2 (read them; quote each rule the diff breaks). Say in the report that the fast path was used. Larger diffs, or the user asking for a full or thorough review, use the grouping below.

**Grouping (default):** put the selected lenses into **at most 3 sub-agents**, e.g. (1) correctness + reliability + data · (2) security + API contract + frontend · (3) tests + spec + maintainability + performance. Drop lenses that aren't triggered; with fewer lenses, use fewer sub-agents. Diffs over ~1500 changed lines may use up to 5 groups. One sub-agent per lens only in **thorough** mode (the user asks for it).

**No sub-agents available:** run the groups yourself one at a time, re-reading the diff for each, then do the refutation step yourself as a separate pass.

## 5. Spawn the lens sub-agents in parallel

Issue all calls together, each with a **fresh context**, on a **smaller model** (e.g. `model: sonnet`, if the agent tool lets you choose), and in the **foreground** (never in the background): the next step needs their output, and waiting on background notifications costs extra turns. Each prompt contains:
- the diff command, commit list, changed files, and the detected stack;
- the absolute path of its lens file(s) and of [finding-format.md](references/finding-format.md);
- only the gate output relevant to its lenses (tests: coverage and mutation survivors; security: audit, Semgrep, gitleaks; maintainability: lint, duplication), trimmed to the findings;
- for spec: the intent source (path, PR body, or "infer from diff") and the trimmed PR discussion, if any; for maintainability: the standards file list (or "none: baseline only");
- the findings from the per-ticket review files, if any ("already reported: …; don't repeat these"), and the tickets marked SKIPPED;
- this brief:

> You are a senior reviewer for: <lenses>. Follow the method and checklist in your lens file(s); apply framework-specific items only if they match the detected stack. Read the diff and the code it calls or is called by (use search; don't read whole folders). Do not run code, tests, or scripts and do not edit files: reason from the code. Per-ticket reviews already covered each ticket in isolation, so prioritise what only shows across the whole branch: interactions between tickets, shared state, contracts, and the lenses they didn't cover. Report only findings with file:line, a concrete failure scenario or exploit path, and quoted evidence (≤4 lines), in the format of finding-format.md. Skip what's already reported, style that tooling enforces, and hypotheticals you can't tie to this code. List briefly anything you couldn't verify. Max 8 findings; total answer under 600 words.

## 6. Refute (Blockers and Majors only)

Fast path (step 4): skip this sub-agent and re-read the cited lines yourself. Otherwise, if there are Blocker or Major findings, spawn **one fresh foreground sub-agent** (smaller model is fine) with just those findings plus the diff command. Minors and Nits skip refutation and are labelled PLAUSIBLE.

> For each finding, try to prove it wrong by reading the code: is the path reachable? Is the input actually controllable? Is there a guard, validation, constraint, or caller contract that prevents it? Only if reading can't settle a Blocker, you may run one small reproduction for it. Mark each finding CONFIRMED (you traced it), PLAUSIBLE (reachable but depends on runtime/config you can't see; say what), or REJECTED (give the reason). Merge duplicates across lenses. Re-assess severity per finding-format.md. Answer under 400 words.

Report CONFIRMED and PLAUSIBLE findings. Count REJECTED ones without listing them. For each Blocker, re-read the cited lines yourself before reporting it.

## 7. Report

Use the report template in [finding-format.md](references/finding-format.md). Print it. If the Reviews folder already exists, also save it there as `review-pr.md`, next to the per-ticket reviews; otherwise don't create files.

Be honest about coverage. The "Not checked" section lists every gate not run, every fallback used (inferred intent, default-branch base), and anything a lens couldn't verify.

## 8. Hand off

Ask the user how to proceed with the Blockers/Majors:
- **Fix now:** all of them go through the `tdd` skill in one batched round, in a fresh sub-agent (if installed; otherwise test-first by hand), each as a RED test reproducing it, committed without pushing. Afterwards, do a **verify pass**, not a new review: no sub-agents; read only the fix diff and check that each finding has a reproducing test and a fix for its cause; run the tests once.
- **File as tickets:** one ticket per finding (or per cluster), with the scenario and the regression test as ACs. Local tickets go in the Tickets location, numbered after the last existing ticket, in the same format and language as the epic's other tickets, with `Status: ready-for-agent`, so `implement-epic` can pick them up.

Minors and Nits are the user's call. Never block on them.
