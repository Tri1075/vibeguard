/**
 * Emit the rule artifacts for a detected host. One source (laws/skill.ts), the
 * right wrapper per host — so the rules never drift between Claude Code, Cursor,
 * and everything else.
 */
import path from 'node:path';
import { protocolMarkdown, skillMarkdown } from '../../laws/skill.js';
import { interviewSkillMarkdown } from '../../laws/interview.js';
import { prdSkillMarkdown } from '../../laws/prd.js';
import { writeFileAtomic } from '../../core/store.js';
import type { HostId } from '../../core/hosts.js';
import { upsertManagedBlock } from './agents-md.js';

/** Write the host's rule artifact. Returns the relative paths written. */
export async function emitHostArtifacts(root: string, host: HostId): Promise<string[]> {
  if (host === 'claude-code') {
    const rules = '.claude/skills/vibeguard/SKILL.md';
    const interview = '.claude/skills/vibeguard-plan-interview/SKILL.md';
    const prd = '.claude/skills/vibeguard-write-a-prd/SKILL.md';
    await writeFileAtomic(path.join(root, rules), skillMarkdown());
    await writeFileAtomic(path.join(root, interview), interviewSkillMarkdown());
    await writeFileAtomic(path.join(root, prd), prdSkillMarkdown());
    return [rules, interview, prd];
  }
  if (host === 'cursor') {
    const rel = '.cursor/rules/vibeguard.md';
    await writeFileAtomic(path.join(root, rel), protocolMarkdown());
    return [rel];
  }
  const rel = 'AGENTS.md';
  await upsertManagedBlock(path.join(root, rel), protocolMarkdown());
  return [rel];
}
