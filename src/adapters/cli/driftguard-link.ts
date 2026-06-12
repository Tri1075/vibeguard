/**
 * Bridge to driftguard: register each gate as a probe and protect .vibeguard/**.
 * Best-effort — vibeguard works standalone (gates via CLI/CI); driftguard just
 * adds hard, in-session enforcement when it is present in the project.
 *
 * Probe commands are split by audience: the committed config.json always gets
 * the PORTABLE form (`npx -y vibeguard check …` — works for teammates and
 * CI), while a machine-local command (the plugin's bundled binary at an
 * absolute path) goes into config.local.json, driftguard's gitignored overlay
 * that replaces probes by name. Absolute home-dir paths never reach a
 * committable file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { GATES } from '../../gates/registry.js';
import { PROTECTED_PATTERN } from '../../core/paths.js';
import { readJson, writeJsonAtomic } from '../../core/store.js';

const PORTABLE_CHECK_CMD = 'npx -y vibeguard check';

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
export async function registerWithDriftguard(root: string, localCheckCmd?: string): Promise<boolean> {
  const dir = path.join(root, '.driftguard');
  const configFile = path.join(dir, 'config.json');
  if (!fs.existsSync(configFile)) return false;

  const config = (await readJson<DriftguardConfig>(configFile)) ?? {};
  config.probes = mergeProbes(config.probes ?? [], PORTABLE_CHECK_CMD);
  config.protect = mergeProtect(config.protect ?? []);
  await writeJsonAtomic(configFile, config);

  if (localCheckCmd && localCheckCmd !== PORTABLE_CHECK_CMD) {
    const localFile = path.join(dir, 'config.local.json');
    const local = (await readJson<DriftguardConfig>(localFile)) ?? {};
    local.probes = mergeProbes(local.probes ?? [], localCheckCmd);
    await writeJsonAtomic(localFile, local);
    ensureLocalConfigIgnored(dir);
  }
  return true;
}

/**
 * One probe per gate: `<checkCmd> <id> --ci` exits non-zero on a block. The
 * portable npx form runs our single-bin package (a bare `npx vibeguard` would
 * resolve an unrelated registry name); the plugin's bundled binary lands in the
 * local overlay instead, so the hot path needs no npx at all.
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

/** Projects whose driftguard init predates the overlay still must not commit it. */
function ensureLocalConfigIgnored(dir: string): void {
  const inner = path.join(dir, '.gitignore');
  const current = fs.existsSync(inner) ? fs.readFileSync(inner, 'utf8') : '';
  if (current.split('\n').includes('config.local.json')) return;
  fs.writeFileSync(
    inner,
    `${current}${current.endsWith('\n') || current === '' ? '' : '\n'}config.local.json\n`,
  );
}
