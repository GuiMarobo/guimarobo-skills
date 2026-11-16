# guimarobo-skills

A public repo of agent skills, published as a Claude Code plugin. Files here are read by other people's agents, so write them for an agent with no context.

## Layout

- `skills/<name>/SKILL.md` — published skills. Every one is listed in `.claude-plugin/plugin.json`, and nothing else is.
- `skills/<name>/references/*.md` — detail the skill loads on demand. Link it from `SKILL.md` with a relative path, one level deep.
- `drafts/<name>/` — work in progress. Not listed in `plugin.json`, not installed by anyone.

## Rules

- Skill content is in English. Portuguese trigger phrases in a `description` are fine.
- Frontmatter `name` equals the folder name: lowercase, digits and hyphens, at most 64 characters. `description` is one line, at most 1024 characters, and says both what the skill does and when to use it.
- No private data: no local paths, client or project names, e-mails, tokens. Examples use neutral names.
- Credit sources in a `Sources` list at the end of the reference file that uses them.
- Any change to a published skill: add an entry to `CHANGELOG.md` and bump `version` in `.claude-plugin/plugin.json` (installed plugins only update when the version changes).
- Promoting a draft: move `drafts/<name>` to `skills/<name>`, add it to `plugin.json`, the README table and the changelog.
- Before finishing, run `node scripts/validate.mjs` and fix what it reports.
