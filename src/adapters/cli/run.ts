/**
 * `vibeguard run <cli> [args...]` — the daily gesture. Prepares a governed
 * session, refuses to start on red, then launches the agent (optionally wrapped
 * by headroom for token economy).
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import pc from 'picocolors';
import { findRoot, loadConfig } from '../../core/config.js';
import { detectHost, hostLabel } from '../../core/hosts.js';
import { hasBinary } from '../../core/proc.js';
import { runCheck } from '../../core/runner.js';
import { emitHostArtifacts } from '../hosts/emit.js';
import { renderTty } from './render.js';

const useColor = (): boolean => process.stdout.isTTY === true && !process.env['NO_COLOR'];

export interface RunOptions {
  force?: boolean;
  headroom?: boolean; // commander sets false for --no-headroom
}

export async function runCommand(
  cwd: string,
  cli: string,
  cliArgs: string[],
  opts: RunOptions,
): Promise<never> {
  const root = findRoot(cwd);
  if (!root) {
    process.stderr.write(`${pc.red('not initialized')} — run \`vibeguard init\` first\n`);
    process.exit(2);
  }
  const config = await loadConfig(root);
  const host = detectHost(cli);

  const written = await emitHostArtifacts(root, host);
  process.stdout.write(
    `${pc.dim(`host: ${hostLabel(host, cli)} · rules written to ${written.join(', ')}`)}\n`,
  );

  // Never start a session on red.
  const report = await runCheck(config);
  if (report.blocked && !opts.force) {
    process.stdout.write(`${renderTty(report, useColor())}\n`);
    process.stderr.write(
      `${pc.red('✗ refusing to start a session on red')} — fix the findings, or pass --force to override.\n`,
    );
    process.exit(1);
  }

  await refreshDriftguardBaseline(root);
  const wrap = opts.headroom !== false && (await hasBinary('headroom'));
  const [bin, args] = wrap ? ['headroom', ['wrap', cli, ...cliArgs]] : [cli, cliArgs];
  if (wrap) process.stdout.write(`${pc.dim('headroom: compressing context for token economy')}\n`);
  process.stdout.write(`${pc.green('✓ governed session starting')} → ${bin} ${args.join(' ')}\n`);

  const child = await execa(bin, args, { cwd: root, stdio: 'inherit', reject: false });
  process.exit(child.exitCode ?? 0);
}

/** Best-effort fresh baseline so driftguard measures drift from "now". */
async function refreshDriftguardBaseline(root: string): Promise<void> {
  if (!existsSync(path.join(root, '.driftguard', 'config.json'))) return;
  if (!(await hasBinary('driftguard'))) return;
  await execa('driftguard', ['snapshot', 'baseline'], { cwd: root, reject: false, timeout: 120_000 });
}
