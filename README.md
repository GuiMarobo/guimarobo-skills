# guimarobo-skills

Agent skills for shipping TypeScript/JavaScript features one ticket at a time: test-first implementation with a bounded budget, a cheap review per ticket, a deep review per branch, and an orchestrator that runs the whole loop over an epic.

They work in any repo with zero setup, and pick up the project's own conventions (a `Workflow` section in `CLAUDE.md` / `AGENTS.md`) when present.

## Skills

| Skill | What it does | Invoked |
|---|---|---|
| [`tdd`](skills/tdd/SKILL.md) | Red-green-refactor for one ticket, with a bounded test budget. Commits locally, never pushes, hands off to `review-ticket`. | Automatically, or `/tdd` |
| [`review-ticket`](skills/review-ticket/SKILL.md) | Fast senior review of one ticket's changes: conformance to the ACs, correctness, test quality, obvious security holes. | Automatically, or `/review-ticket` |
| [`review-pr`](skills/review-pr/SKILL.md) | Deep review of a branch or PR: the repo's deterministic gates, then grouped lens sub-agents (correctness, security, performance, data, API contract, tests…) and a refutation pass. Reports, doesn't fix. | Automatically, or `/review-pr` |
| [`implement-epic`](skills/implement-epic/SKILL.md) | Orchestrates an epic of local ticket files in dependency order: `tdd` → `review-ticket` → fix → verify per ticket in fresh sub-agents, then `review-pr`. | Only by `/implement-epic` |

How they fit together: [docs/workflow.md](docs/workflow.md).

## Install

**Claude Code, as a plugin**

```
/plugin marketplace add GuiMarobo/guimarobo-skills
/plugin install guimarobo-skills@guimarobo
```

As a plugin the commands are namespaced: `/guimarobo-skills:tdd`, `/guimarobo-skills:implement-epic`, and so on.

**Any agent that reads skills** (Claude Code, Cursor, Codex…), with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```
npx skills add GuiMarobo/guimarobo-skills
```

**By hand:** copy a folder from `skills/` into `~/.claude/skills/` (personal) or `.claude/skills/` (one project).

`implement-epic` needs `tdd`, `review-ticket` and `review-pr` installed alongside it.

## Repository layout

```
skills/<name>/SKILL.md      published skills (listed in .claude-plugin/plugin.json)
skills/<name>/references/   detail loaded only when the skill needs it
drafts/                     work in progress, not part of the plugin
docs/                       how the skills fit together
scripts/validate.mjs        checks every skill (also runs in CI)
scripts/link-local.ps1      links skills/ into ~/.claude/skills for local development
```

## Credits

Several ideas build on [Matt Pocock's skills](https://github.com/mattpocock/skills) (`tdd`, `code-review`, `to-spec`): mocking at system boundaries, testing at the highest seam, the spec axis of a review. Each reference file cites its sources.

## License

[MIT](LICENSE)
