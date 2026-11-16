#!/usr/bin/env node
// Checks every skill in skills/ and drafts/, and that plugin.json lists exactly the published ones.
// Usage: node scripts/validate.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function dirs(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path).filter((d) => statSync(join(path, d)).isDirectory());
}

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function checkSkill(dir) {
  const rel = relative(root, dir).replaceAll('\\', '/');
  const folder = dir.split(/[\\/]/).pop();
  const file = join(dir, 'SKILL.md');
  if (!existsSync(file)) return errors.push(`${rel}: missing SKILL.md`);

  const text = readFileSync(file, 'utf8');
  const fm = frontmatter(text);
  if (!fm) return errors.push(`${rel}/SKILL.md: missing frontmatter`);

  if (!fm.name) errors.push(`${rel}: frontmatter has no name`);
  else {
    if (fm.name !== folder) errors.push(`${rel}: name "${fm.name}" differs from folder "${folder}"`);
    if (!NAME.test(fm.name)) errors.push(`${rel}: name must be lowercase letters, digits and hyphens`);
    if (fm.name.length > 64) errors.push(`${rel}: name is over 64 characters`);
  }

  if (!fm.description) errors.push(`${rel}: frontmatter has no description`);
  else if (fm.description.length > 1024) errors.push(`${rel}: description is ${fm.description.length} characters (max 1024)`);
  else if (fm.description.length > 950) warnings.push(`${rel}: description is ${fm.description.length}/1024 characters`);

  // Every referenced file inside the skill must exist: markdown links and bare references/... mentions.
  const targets = new Set();
  for (const m of text.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    if (!/^[a-z]+:/i.test(m[1])) targets.add(m[1]);
  }
  for (const m of text.matchAll(/\breferences\/[A-Za-z0-9_./-]*[A-Za-z0-9_-]\.md\b/g)) targets.add(m[0]);
  for (const t of targets) {
    if (!existsSync(join(dir, t))) errors.push(`${rel}/SKILL.md: references missing file ${t}`);
  }
}

const published = dirs(join(root, 'skills'));
const drafts = dirs(join(root, 'drafts'));
for (const d of published) checkSkill(join(root, 'skills', d));
for (const d of drafts) checkSkill(join(root, 'drafts', d));

for (const d of drafts) {
  if (published.includes(d)) errors.push(`drafts/${d}: same name as a published skill`);
}

const plugin = JSON.parse(readFileSync(join(root, '.claude-plugin', 'plugin.json'), 'utf8'));
const listed = (plugin.skills ?? []).map((p) => p.replace(/^\.\//, '').replace(/\/$/, ''));
for (const p of listed) {
  if (!p.startsWith('skills/')) errors.push(`plugin.json: ${p} is outside skills/`);
  else if (!published.includes(p.slice('skills/'.length))) errors.push(`plugin.json: ${p} does not exist`);
}
for (const d of published) {
  if (!listed.includes(`skills/${d}`)) errors.push(`plugin.json: skills/${d} is not listed`);
}
if (!/^\d+\.\d+\.\d+$/.test(plugin.version ?? '')) errors.push('plugin.json: version must be x.y.z');

const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
if (!changelog.includes(`## ${plugin.version}`)) errors.push(`CHANGELOG.md: no entry for version ${plugin.version}`);

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`error ${e}`);
console.log(`${published.length} published, ${drafts.length} drafts, ${errors.length} errors, ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
