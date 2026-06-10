/** Central layout of the .vibeguard/ directory. Never build these paths elsewhere. */
import path from 'node:path';
import type { VibeguardPaths } from './types.js';

export const VIBEGUARD_DIR = '.vibeguard';

export function pathsFor(root: string): VibeguardPaths {
  const dir = path.join(root, VIBEGUARD_DIR);
  return {
    root,
    dir,
    rulesFile: path.join(dir, 'rules.json'),
    instructionsDir: path.join(dir, 'instructions'),
    debtFile: path.join(dir, 'debt.md'),
    depsBaselineFile: path.join(dir, 'deps-baseline.json'),
  };
}

/**
 * The .vibeguard/ subtree is owner-only: an agent that edits it is committing
 * critical drift. This pattern is handed to driftguard's config.protect so the
 * guard enforces "never raise your own limits".
 */
export const PROTECTED_PATTERN = `${VIBEGUARD_DIR}/`;
