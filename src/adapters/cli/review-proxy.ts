/**
 * `vibeguard review` / `vibeguard ui` — one front door for the whole loop.
 * driftguard does the arbitration work (human-only surfaces); the user just
 * never has to learn a second binary name. Faithful exit code passthrough.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { execa } from 'execa';
import pc from 'picocolors';
import { hasBinary } from '../../core/proc.js';

export async function driftguardProxy(cwd: string, args: string[]): Promise<never> {
  if (!existsSync(path.join(cwd, '.driftguard', 'config.json'))) {
    process.stderr.write(
      `${pc.red('no driftguard on this project')} — run ${pc.bold('npx vibeguard-pack')} first to govern it.\n`,
    );
    process.exit(2);
  }
  const envBin = process.env['DRIFTGUARD_BIN'];
  const [bin, pre] = envBin
    ? ['node', [envBin]]
    : (await hasBinary('driftguard'))
      ? ['driftguard', []]
      : ['npx', ['-y', '@tri1075/drift-guard']];
  const res = await execa(bin, [...pre, ...args], { cwd, stdio: 'inherit', reject: false });
  process.exit(typeof res.exitCode === 'number' ? res.exitCode : 1);
}
