/**
 * Emit the rule artifacts for a detected host. One source (laws/skill.ts), the
 * right wrapper per host — so the rules never drift between Claude Code, Cursor,
 * and the AGENTS.md hosts (Codex, OpenCode, Hermes, Gemini, Antigravity, Kiro…).
 */
import path from 'node:path';
import { protocolMarkdown, skillMarkdown } from '../../laws/skill.js';
import { EXTRA_SKILLS } from '../../laws/extra-skills.js';
import { writeFileAtomic } from '../../core/store.js';
import { hostById, type HostId } from '../../core/hosts.js';
import { upsertManagedBlock } from './agents-md.js';

/** Write the host's rule artifact. Returns the relative paths written. */
export async function emitHostArtifacts(root: string, host: HostId): Promise<string[]> {
  switch (hostById(host).emit) {
    case 'claude-skill': {
      const rules = '.claude/skills/vibeguard/SKILL.md';
      await writeFileAtomic(path.join(root, rules), skillMarkdown());
      const written = [rules];
      for (const skill of EXTRA_SKILLS) {
        const rel = `.claude/skills/${skill.name}/SKILL.md`;
        await writeFileAtomic(path.join(root, rel), skill.markdown());
        written.push(rel);
      }
      return written;
    }
    case 'cursor-rules': {
      const rel = '.cursor/rules/vibeguard.md';
      await writeFileAtomic(path.join(root, rel), protocolMarkdown());
      return [rel];
    }
    default: {
      const rel = 'AGENTS.md';
      await upsertManagedBlock(path.join(root, rel), protocolMarkdown());
      return [rel];
    }
  }
}
