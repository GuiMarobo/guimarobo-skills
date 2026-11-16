# Workflow conventions

`tdd`, `review-ticket`, `review-pr`, and `implement-epic` read the same per-repo conventions, so one project can keep specs in `docs/specs/` while another uses `.scratch/`, without changing the skills.

## Where they live

The first that exists:
1. A section of the repo's `CLAUDE.md` (or `AGENTS.md`) whose heading contains `Workflow`.
2. `docs/agents/workflow.md`.

None → every key uses its default.

## Format

One bullet per key, `Key: value`. Keys are in English; values can be in any language. Unknown keys are ignored.

```markdown
## Workflow

- Specs: docs/specs/<feature>/spec.md
- Tickets: docs/specs/<feature>/tickets/<NN>-<slug>.md
- Reviews: .scratch/<feature>/reviews/
- ADRs: docs/adr/
- Glossary: CONTEXT.md
- Language: pt-BR
- Pause after each ticket: yes
```

| Key | Meaning | Default |
|---|---|---|
| Specs | where an epic's spec lives | `.scratch/<feature>/spec.md`, or the tracker in `docs/agents/issue-tracker.md` |
| Tickets | one file per ticket | `.scratch/<feature>/issues/<NN>-<slug>.md` |
| Reviews | per-ticket review files and `review-pr.md` (local working notes, should be git-ignored) | `.scratch/<feature>/reviews/` |
| ADRs | architecture decision records | `docs/adr/` |
| Glossary | domain vocabulary | `GLOSSARY.md`, else `CONTEXT.md` |
| Language | reports, questions, explanations, new tickets | the language the user writes in |
| Pause after each ticket | `implement-epic` stops after every ticket for the user's review | `no` |

`<feature>` is the epic's folder name (e.g. `e0-fundacao-do-monorepo`). `<NN>` is the ticket's two-digit number.

Code, identifiers, and commit messages are **not** governed by Language: they follow the repo's history and `CLAUDE.md` (English by default).

## Tickets

**Id** of a local ticket: `<feature>#<NN>`, e.g. `e0-fundacao-do-monorepo#02`. Commits carry it as the footer `Refs: <feature>#<NN>`, and the review file is `<Reviews>/<NN>.md`.

**Labels**, recognised in either language:

| English | Português | Used for |
|---|---|---|
| What to build | O que construir | the behaviour |
| Blocked by | Bloqueado por | dependency edges: ticket numbers, or None / Nenhum |
| Status | Status | the lifecycle below |
| Acceptance criteria | Critérios de aceite | the `- [ ]` checklist |
| Notes | Pontos de atenção | constraints, as binding as ACs |
| Reading | Leitura | background, opened only when needed |
| Before starting | Antes de começar | things to confirm with the user before any code |

**Status lifecycle:**

| Status | Set by | Meaning |
|---|---|---|
| `ready-for-agent` | `to-tickets` | not started |
| `in-review` | `tdd`, in the ticket's commit | implemented; review pending or in progress |
| `done` | `review-ticket`, in a one-file commit | reviewed and accepted |

Any other value: not ready, so `implement-epic` skips it and reports it.

## The rest of CLAUDE.md

The skills also obey the project's other rules: verification commands, things to ask before doing (new dependency, migration, contract change, architecture), commit and branch rules, what to explain at the end of a ticket, and whether to stop after each one. When the project's rules and a skill's defaults differ, the project wins. The one exception: no skill pushes before `review-pr`.
