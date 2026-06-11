/**
 * Bridge to driftguard: register each gate as a probe and protect .vibeguard/**.
 * Best-effort — vibeguard works standalone (gates via CLI/CI); driftguard just
 * adds hard, in-session enforcement when it is present in the project.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GATES } from '../../gates/registry.js';
import { PROTECTED_PATTERN } from '../../core/paths.js';
import { readJson, writeJsonAtomic } from '../../core/store.js';

interface Probe {
  name: string;
  cmd: string;
  timeoutMs?: number;
  unstable?: boolean;
}
interface DriftguardConfig {
  probes?: Probe[];
  protect?: string[];
  [k: string]: unknown;
}

/** Returns true when driftguard config was found and updated. */
export async function registerWithDriftguard(root: string): Promise<boolean> {
  const configFile = path.join(root, '.driftguard', 'config.json');
  if (!fs.existsSync(configFile)) return false;

  const config = (await readJson<DriftguardConfig>(configFile)) ?? {};
  config.probes = mergeProbes(config.probes ?? []);
  config.protect = mergeProtect(config.protect ?? []);
  await writeJsonAtomic(configFile, config);
  return true;
}

/**
 * One probe per gate: `vibeguard check <id> --ci` exits non-zero on a block.
 * The npm package is `vibeguard-pack` (its bin is `vibeguard`); a package's
 * own bin is never linked into its own node_modules/.bin, so a bare
 * `npx vibeguard` would fall through to an unrelated registry package named
 * "vibeguard". `npx -y vibeguard-pack check …` runs our single-bin package.
 */
function mergeProbes(existing: Probe[]): Probe[] {
  const foreign = existing.filter((p) => !p.name.startsWith('vibeguard-'));
  const ours = GATES.map((g) => ({
    name: `vibeguard-${g.id}`,
    cmd: `npx -y vibeguard-pack check ${g.id} --ci`,
    timeoutMs: 60_000,
    unstable: false,
  }));
  return [...foreign, ...ours];
}

function mergeProtect(existing: string[]): string[] {
  return existing.includes(PROTECTED_PATTERN) ? existing : [...existing, PROTECTED_PATTERN];
}
