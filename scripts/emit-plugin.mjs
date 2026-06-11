/**
 * Generate the static plugin skills (skills/<name>/SKILL.md) from the single
 * TypeScript source of truth. CI re-runs this and fails on any diff, so the
 * marketplace plugin can never drift from the laws. Folder names drop the
 * "vibeguard-" prefix: the plugin already namespaces them (/vibeguard:tdd).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { skillMarkdown, EXTRA_SKILLS } from '../dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = path.join(root, 'skills');

const entries = [
  { folder: 'vibeguard', markdown: skillMarkdown() },
  ...EXTRA_SKILLS.map((s) => ({
    folder: s.name.replace(/^vibeguard-/, ''),
    markdown: s.markdown().replace(`name: ${s.name}\n`, `name: ${s.name.replace(/^vibeguard-/, '')}\n`),
  })),
];

fs.rmSync(skillsDir, { recursive: true, force: true });
for (const { folder, markdown } of entries) {
  const dir = path.join(skillsDir, folder);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), markdown, 'utf8');
}
process.stdout.write(`emitted ${entries.length} plugin skills to skills/\n`);
