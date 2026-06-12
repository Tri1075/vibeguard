/**
 * `vibeguard run <cli> [args...]` — the daily gesture. Prepares a governed
 * session, refuses to start on red, then launches the agent (optionally wrapped
 * by headroom for token economy).
 */
import { existsSync } from 'node:fs';
import os from 'node:os';
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
  verify?: boolean; // commander sets false for --no-verify (skip the exit verdict)
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
  const agentExit = exitCodeFor(child, bin);

  // Finish-line verdict: hosts without lifecycle hooks (everything but the
  // Claude Code plugin) get their enforcement HERE — the agent ran without
  // interference, now driftguard compares and the wrapper refuses to call a
  // drifted session a success.
  const verdict = opts.verify === false ? null : await finishLineVerdict(root);
  process.exit(verdict === 'drift' && agentExit === 0 ? 1 : agentExit);
}

/**
 * Run `driftguard compare` (its own TTY render, counsel included) and fold the
 * outcome: 'clean' | 'drift' | null (not configured / tooling error — a guard
 * bug must never fail the user's session: same fail-open doctrine as hooks).
 */
async function finishLineVerdict(root: string): Promise<'clean' | 'drift' | null> {
  const bin = await driftguardInvocation(root);
  if (!bin) return null;
  const res = await execa(bin[0], [...bin[1], 'compare'], {
    cwd: root,
    stdio: 'inherit',
    reject: false,
    timeout: 120_000,
  });
  if (res.exitCode === 0) {
    process.stdout.write(`${pc.green('✓ finish line: no drift')} — the session kept its contract.\n`);
    return 'clean';
  }
  if (res.exitCode === 1) {
    process.stderr.write(
      `${pc.red('✗ finish line: drift detected')} — change requests await YOUR decision: ` +
        `\`driftguard review\` or \`driftguard ui\`. (Wrapper exits non-zero so scripts can't mistake this for a clean run.)\n`,
    );
    return 'drift';
  }
  process.stdout.write(pc.dim('finish line: driftguard could not verify (tooling) — not blocking.\n'));
  return null;
}

/** How to invoke driftguard here: bundled bin via env, or the PATH binary. */
async function driftguardInvocation(root: string): Promise<[string, string[]] | null> {
  if (!existsSync(path.join(root, '.driftguard', 'config.json'))) return null;
  const envBin = process.env['DRIFTGUARD_BIN'];
  if (envBin) return ['node', [envBin]];
  return (await hasBinary('driftguard')) ? ['driftguard', []] : null;
}

/**
 * Map an execa result to a faithful exit code. With `reject:false`, a clean
 * run carries a numeric `exitCode`; a spawn failure (e.g. the agent CLI is not
 * installed) and a signal death BOTH leave `exitCode` undefined. Returning 0
 * there would tell a calling script the agent ran when it never did — the exact
 * silent success the wrapper must not produce.
 */
function exitCodeFor(child: { exitCode?: number; signal?: string }, bin: string): number {
  if (typeof child.exitCode === 'number') return child.exitCode;
  if (child.signal) {
    process.stderr.write(`${pc.red(`✗ ${bin} terminated by ${child.signal}`)}\n`);
    const num = os.constants.signals[child.signal as NodeJS.Signals];
    return typeof num === 'number' ? 128 + num : 1;
  }
  process.stderr.write(`${pc.red(`✗ could not launch "${bin}"`)} — is it installed and on your PATH?\n`);
  return 127;
}

/** Best-effort fresh baseline so driftguard measures drift from "now". */
async function refreshDriftguardBaseline(root: string): Promise<void> {
  const bin = await driftguardInvocation(root);
  if (!bin) return;
  await execa(bin[0], [...bin[1], 'snapshot', 'baseline'], { cwd: root, reject: false, timeout: 120_000 });
}
