/** M2 end-to-end: run wrapper (host artifacts, green-gate), handoff, AGENTS.md block. */
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
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-m2-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
  await vg(['init', '--profile', 'experienced']);
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
});

describe('vibeguard run', () => {
  it('emits a Claude Code skill and launches the agent CLI on green', async () => {
    const res = await vg(['run', 'claude', '--no-headroom', 'echo', 'hi']);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('Claude Code');
    const skill = await fsp.readFile(path.join(dir, '.claude/skills/vibeguard/SKILL.md'), 'utf8');
    expect(skill).toContain('name: vibeguard');
  });

  it('writes a managed AGENTS.md block for generic hosts, preserving user content', async () => {
    await fsp.writeFile(path.join(dir, 'AGENTS.md'), '# My project notes\nkeep me\n', 'utf8');
    await vg(['run', 'aider', '--no-headroom', 'true']);
    const agents = await fsp.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('keep me'); // user content preserved
    expect(agents).toContain('vibeguard:start');
    expect(agents).toContain('engineering rules (mandatory)');
  });

  it('refuses to start on red, unless --force', async () => {
    await fsp.writeFile(path.join(dir, 'leak.js'), 'const k = "AKIAIOSFODNN7EXAMPLE";\n', 'utf8');
    const blocked = await vg(['run', 'aider', '--no-headroom', 'true']);
    expect(blocked.exitCode).toBe(1);
    expect(String(blocked.stderr)).toContain('refusing to start');
    const forced = await vg(['run', 'aider', '--no-headroom', '--force', 'true']);
    expect(forced.exitCode).toBe(0);
  });
});

describe('vibeguard handoff & tokens', () => {
  it('handoff writes HANDOFF.md with prose placeholders', async () => {
    const res = await vg(['handoff']);
    expect(res.exitCode).toBe(0);
    const doc = await fsp.readFile(path.join(dir, 'HANDOFF.md'), 'utf8');
    expect(doc).toContain('# Session handoff');
    expect(doc).toContain('## Next steps');
  });

  it('tokens names the zone from a file', async () => {
    await fsp.writeFile(path.join(dir, 'big.txt'), 'x'.repeat(480_000), 'utf8');
    const res = await vg(['tokens', 'big.txt']);
    expect(String(res.stdout)).toContain('handoff zone');
  });
});
