/** Git detection, dependency-free: the plugin must decide fast and offline. */
import fs from 'node:fs';
import path from 'node:path';

/**
 * True when `dir` is inside a git working tree. Walks up looking for a `.git`
 * entry — a directory for normal checkouts, a file for worktrees/submodules.
 * No `git` binary involved: this runs on every SessionStart, in any folder.
 */
export function isInsideGitRepo(dir: string): boolean {
  let current = path.resolve(dir);
  for (;;) {
    if (fs.existsSync(path.join(current, '.git'))) return true;
    const parent = path.dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
