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
  return execa('node', [BIN, '-C', dir, ...args], { reject: false, env: { ...process.env, NO_COLOR: '1' } });
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-boot-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
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
});
