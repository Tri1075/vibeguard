/**
 * `vibeguard bootstrap` — one idempotent command that makes a project governed:
 * vibeguard rules + driftguard config + gate probes + a baseline. This is what
 * the Claude Code plugin runs at SessionStart so the user does nothing but
 * describe and decide. Safe to run on every session — it only sets up what is
 * missing, then refreshes the baseline.
 */
import fs from 'node:fs';
import path from 'node:path';
import pc from 'picocolors';
import { execa } from 'execa';
import { pathsFor } from '../../core/paths.js';
import { hasBinary } from '../../core/proc.js';
import { initCommand } from './init.js';
import { registerWithDriftguard } from './driftguard-link.js';

export interface BootstrapOptions {
  /** path to a bundled driftguard binary (the plugin passes this); else PATH */
  driftguardBin?: string;
  /** path to a bundled vibeguard binary, used in the probe command; else npx */
  vibeguardBin?: string;
  /** suppress the human-facing line (when another hook prints the context) */
  quiet?: boolean;
}

export async function bootstrapCommand(cwd: string, opts: BootstrapOptions): Promise<void> {
  const root = cwd;
  const paths = pathsFor(root);
  const driftguardBin = opts.driftguardBin ?? process.env['DRIFTGUARD_BIN'] ?? null;
  const driftAvailable = driftguardBin !== null || (await hasBinary('driftguard'));
  const dg = (args: string[]): Promise<unknown> =>
    driftguardBin
      ? execa('node', [driftguardBin, ...args], { cwd: root, reject: false })
      : execa('driftguard', args, { cwd: root, reject: false });

  const hadDrift = fs.existsSync(path.join(root, '.driftguard', 'config.json'));

  // 1. vibeguard rules (safe defaults, non-interactive).
  if (!fs.existsSync(paths.rulesFile)) await initCommand(root, { profile: 'experienced' });

  // 2-4. driftguard: config, gate probes, baseline. Only when the engine exists.
  if (driftAvailable) {
    if (!hadDrift) await dg(['init', '--no-verify']);
    const vibeBin = opts.vibeguardBin ?? process.env['VIBEGUARD_BIN'];
    await registerWithDriftguard(root, vibeBin ? `node ${vibeBin} check` : undefined);
    await dg(['snapshot', 'baseline']); // refresh so drift is measured from now
  }

  if (!opts.quiet) {
    process.stdout.write(
      `${pc.green('✓ vibeguard: project governed')}${driftAvailable ? '' : pc.dim(' (rules only — driftguard not found, no live enforcement)')}.\n` +
        `${pc.dim('Describe what you want; the agent will plan it, scope it, and driftguard keeps the work honest.')}\n`,
    );
  }
}
