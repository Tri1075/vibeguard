/** `vibeguard bootstrap` — idempotent one-shot setup used by the plugin. */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa, type Result } from 'execa';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/bin.js');
let dir: string;

function vg(args: string[]): Promise<Result> {
  // Hermetic PATH (node only): these cases cover the rules-only path, so a
  // driftguard found on the dev machine must not turn them into a full init
  // with registry-bound npx probes (slow, network-dependent, machine-specific).
  return execa('node', [BIN, '-C', dir, ...args], {
    reject: false,
    env: { ...process.env, NO_COLOR: '1', PATH: path.dirname(process.execPath) },
  });
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-boot-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
  // bootstrap only governs git repos (the plugin fires it in every folder); a
  // bare `.git` dir is enough for the walk-up detection — no git binary needed.
  await fsp.mkdir(path.join(dir, '.git'));
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
});

describe('vibeguard bootstrap', () => {
  it('governs a fresh project in one command (rules even without driftguard)', async () => {
    const res = await vg(['bootstrap']);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('governed');
    // The rules scaffold exists; the project is set up without any other step.
    const rules = await fsp.readFile(path.join(dir, '.vibeguard/rules.json'), 'utf8');
    expect(rules).toContain('schemaVersion');
  });

  it('is idempotent — a second run keeps the project governed and does not throw', async () => {
    await vg(['bootstrap']);
    const second = await vg(['bootstrap']);
    expect(second.exitCode).toBe(0);
    expect(String(second.stdout)).toContain('governed');
  });

  it('keeps committed probes portable; the machine-local binary goes to config.local.json', async () => {
    // Pre-existing driftguard project (engine present via a no-op stub bin).
    await fsp.mkdir(path.join(dir, '.driftguard'));
    await fsp.writeFile(path.join(dir, '.driftguard/config.json'), '{}', 'utf8');
    const stub = path.join(dir, 'dg-stub.cjs');
    await fsp.writeFile(stub, 'process.exit(0);', 'utf8');
    const localBin = '/opt/some machine/plugin-bin/vibeguard/index.js';

    const res = await vg(['bootstrap', '--driftguard-bin', stub, '--vibeguard-bin', localBin]);
    expect(res.exitCode).toBe(0);

    // config.json (committed) carries only the portable npx form — an absolute
    // home/plugin path in a committable file would leak and break teammates.
    const config = JSON.parse(await fsp.readFile(path.join(dir, '.driftguard/config.json'), 'utf8')) as {
      probes: { name: string; cmd: string }[];
    };
    const ours = config.probes.filter((p) => p.name.startsWith('vibeguard-'));
    expect(ours.length).toBeGreaterThan(0);
    for (const probe of ours) expect(probe.cmd).toMatch(/^npx -y vibeguard-pack check /);

    // config.local.json (gitignored overlay) carries this machine's binary,
    // quoted — plugin roots can contain spaces.
    const local = JSON.parse(await fsp.readFile(path.join(dir, '.driftguard/config.local.json'), 'utf8')) as {
      probes: { name: string; cmd: string }[];
    };
    expect(local.probes.map((p) => p.name)).toEqual(ours.map((p) => p.name));
    for (const probe of local.probes) expect(probe.cmd).toContain(`node "${localBin}" check `);

    const inner = await fsp.readFile(path.join(dir, '.driftguard/.gitignore'), 'utf8');
    expect(inner.split('\n')).toContain('config.local.json');
  });

  it('does NOTHING outside a git repo — no .vibeguard, exit 0, points to init', async () => {
    await fsp.rm(path.join(dir, '.git'), { recursive: true });
    const res = await vg(['bootstrap']);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('not a git repository');
    await expect(fsp.access(path.join(dir, '.vibeguard'))).rejects.toThrow();
    await expect(fsp.access(path.join(dir, '.driftguard'))).rejects.toThrow();
  });

  it('stays silent about the skip under --quiet (the hook path)', async () => {
    await fsp.rm(path.join(dir, '.git'), { recursive: true });
    const res = await vg(['bootstrap', '--quiet']);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toBe('');
    await expect(fsp.access(path.join(dir, '.vibeguard'))).rejects.toThrow();
  });
});
