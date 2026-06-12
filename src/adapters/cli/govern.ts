/**
 * `vibeguard` with no command — the simplest gesture: govern this project.
 * Fresh project at a terminal → the one onboarding question (beginner or
 * experienced), then the idempotent bootstrap does everything else (non-git
 * guard, rules, driftguard config + probes + baseline). Already governed →
 * bootstrap just refreshes and says so.
 */
import fs from 'node:fs';
import { isInsideGitRepo } from '../../core/git.js';
import { pathsFor } from '../../core/paths.js';
import { bootstrapCommand } from './bootstrap.js';
import { initCommand } from './init.js';

export async function governCommand(cwd: string): Promise<void> {
  const fresh = !fs.existsSync(pathsFor(cwd).rulesFile);
  if (fresh && process.stdin.isTTY && isInsideGitRepo(cwd)) {
    await initCommand(cwd, {}); // asks the one question; writes the rules
  }
  await bootstrapCommand(cwd, {}); // idempotent: skips what already exists
}
