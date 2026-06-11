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
export async function registerWithDriftguard(root: string, checkCmd?: string): Promise<boolean> {
  const configFile = path.join(root, '.driftguard', 'config.json');
  if (!fs.existsSync(configFile)) return false;

  const config = (await readJson<DriftguardConfig>(configFile)) ?? {};
  config.probes = mergeProbes(config.probes ?? [], checkCmd ?? 'npx -y vibeguard-pack check');
  config.protect = mergeProtect(config.protect ?? []);
  await writeJsonAtomic(configFile, config);
  return true;
}

/**
 * One probe per gate: `<checkCmd> <id> --ci` exits non-zero on a block. The
 * default `npx -y vibeguard-pack check` runs our single-bin package (a bare
 * `npx vibeguard` would resolve an unrelated registry name). The plugin passes
 * its own bundled binary instead, so probes need no npx at all.
 */
function mergeProbes(existing: Probe[], checkCmd: string): Probe[] {
  const foreign = existing.filter((p) => !p.name.startsWith('vibeguard-'));
  const ours = GATES.map((g) => ({
    name: `vibeguard-${g.id}`,
    cmd: `${checkCmd} ${g.id} --ci`,
    timeoutMs: 60_000,
    unstable: false,
  }));
  return [...foreign, ...ours];
}

function mergeProtect(existing: string[]): string[] {
  return existing.includes(PROTECTED_PATTERN) ? existing : [...existing, PROTECTED_PATTERN];
}
