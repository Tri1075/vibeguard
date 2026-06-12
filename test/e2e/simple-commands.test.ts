/** The simplest gestures: bare `vibeguard` governs; review/ui proxy driftguard. */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa, type Result } from 'execa';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/bin.js');
const posixOnly = process.platform === 'win32' ? it.skip : it;
let dir: string;
let binDir: string;

function vg(args: string[], extraPath?: string): Promise<Result> {
  // Hermetic PATH (node + optional stubs): a driftguard on the dev machine
  // must not turn these cases into full inits with registry-bound probes.
  const PATH = [extraPath, path.dirname(process.execPath)].filter(Boolean).join(path.delimiter);
  return execa('node', [BIN, '-C', dir, ...args], {
    reject: false,
    env: { ...process.env, NO_COLOR: '1', PATH },
  });
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-simple-'));
  binDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-simple-bin-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
  await fsp.mkdir(path.join(dir, '.git'));
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.rm(binDir, { recursive: true, force: true });
});

describe('bare `vibeguard` (no command)', () => {
  it('governs a fresh git project in one gesture (non-interactive defaults off-TTY)', async () => {
    const res = await vg([]);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('governed');
    const rules = await fsp.readFile(path.join(dir, '.vibeguard/rules.json'), 'utf8');
    expect(rules).toContain('schemaVersion');
  });

  it('outside a git repo it explains and touches nothing', async () => {
    await fsp.rm(path.join(dir, '.git'), { recursive: true });
    const res = await vg([]);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('not a git repository');
    await expect(fsp.access(path.join(dir, '.vibeguard'))).rejects.toThrow();
  });
});

describe('vibeguard review / ui — one front door', () => {
  posixOnly('proxies to driftguard with a faithful exit code', async () => {
    const marker = path.join(dir, 'dg-args.txt');
    await fsp.writeFile(
      path.join(binDir, 'driftguard'),
      // answer the hasBinary version probe, then record the real call
      `#!/bin/sh\nif [ "$1" = "--version" ]; then echo 0.0.0; exit 0; fi\nprintf '%s' "$*" > "${marker}"\nexit 3\n`,
      { mode: 0o755 },
    );
    await fsp.mkdir(path.join(dir, '.driftguard'));
    await fsp.writeFile(path.join(dir, '.driftguard', 'config.json'), '{}', 'utf8');

    const res = await vg(['review'], binDir);
    expect(await fsp.readFile(marker, 'utf8')).toBe('review');
    expect(res.exitCode).toBe(3); // driftguard's code, passed through faithfully
  });

  it('without driftguard on the project, points to `npx vibeguard` and exits 2', async () => {
    const res = await vg(['ui']);
    expect(res.exitCode).toBe(2);
    expect(String(res.stderr)).toContain('npx vibeguard');
  });
});
