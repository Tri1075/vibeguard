/** M2 end-to-end: run wrapper (host artifacts, green-gate), handoff, AGENTS.md block. */
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
  const PATH = extraPath ? `${extraPath}${path.delimiter}${process.env['PATH'] ?? ''}` : process.env['PATH'];
  return execa('node', [BIN, '-C', dir, ...args], {
    reject: false,
    env: { ...process.env, NO_COLOR: '1', PATH },
  });
}

/** Put a stub executable named `name` on PATH; it records that it ran. */
async function stubCli(name: string): Promise<string> {
  const marker = path.join(dir, `${name}.ran`);
  await fsp.writeFile(path.join(binDir, name), `#!/bin/sh\nprintf 'args:%s' "$*" > "${marker}"\nexit 0\n`, {
    mode: 0o755,
  });
  return marker;
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-m2-'));
  binDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-bin-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
  await vg(['init', '--profile', 'experienced']);
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
  await fsp.rm(binDir, { recursive: true, force: true });
});

describe('vibeguard run', () => {
  posixOnly('emits a Claude Code skill and actually launches the agent CLI on green', async () => {
    const marker = await stubCli('claude');
    const res = await vg(['run', 'claude', '--no-headroom'], binDir);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('Claude Code');
    const skill = await fsp.readFile(path.join(dir, '.claude/skills/vibeguard/SKILL.md'), 'utf8');
    expect(skill).toContain('name: vibeguard');
    // The launch is real, not a vacuous pass: the stub left its marker.
    expect(await fsp.readFile(marker, 'utf8')).toContain('args:');
  });

  posixOnly('writes a managed AGENTS.md block for generic hosts, preserving user content', async () => {
    await stubCli('aider');
    await fsp.writeFile(path.join(dir, 'AGENTS.md'), '# My project notes\nkeep me\n', 'utf8');
    await vg(['run', 'aider', '--no-headroom'], binDir);
    const agents = await fsp.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('keep me'); // user content preserved
    expect(agents).toContain('vibeguard:start');
    expect(agents).toContain('engineering rules (mandatory)');
  });

  it('reports a non-zero exit code when the agent CLI cannot be launched', async () => {
    const res = await vg(['run', 'no-such-agent-xyz', '--no-headroom']);
    expect(res.exitCode).toBe(127);
    expect(String(res.stderr)).toContain('could not launch');
  });

  it('refuses to start on red, unless --force', async () => {
    await stubCli('aider');
    await fsp.writeFile(path.join(dir, 'leak.js'), 'const k = "AKIAIOSFODNN7EXAMPLE";\n', 'utf8');
    const blocked = await vg(['run', 'aider', '--no-headroom'], binDir);
    expect(blocked.exitCode).toBe(1);
    expect(String(blocked.stderr)).toContain('refusing to start');
    const forced = await vg(['run', 'aider', '--no-headroom', '--force'], binDir);
    expect(forced.exitCode).toBe(0);
  });
});

describe('vibeguard run — finish-line verdict (hosts without lifecycle hooks)', () => {
  /** Stub driftguard whose `compare` exits with `compareExit` and leaves a marker. */
  async function stubDriftguard(compareExit: number): Promise<string> {
    const marker = path.join(dir, 'compare.ran');
    await fsp.writeFile(
      path.join(binDir, 'driftguard'),
      `#!/bin/sh\nif [ "$1" = "compare" ]; then touch "${marker}"; exit ${compareExit}; fi\nexit 0\n`,
      { mode: 0o755 },
    );
    await fsp.mkdir(path.join(dir, '.driftguard'), { recursive: true });
    await fsp.writeFile(path.join(dir, '.driftguard', 'config.json'), '{}', 'utf8');
    return marker;
  }

  posixOnly('a drifted session cannot exit 0 — the wrapper turns it red', async () => {
    await stubCli('aider');
    const marker = await stubDriftguard(1);
    const res = await vg(['run', 'aider', '--no-headroom'], binDir);
    expect(await fsp.readFile(marker, 'utf8')).toBeDefined(); // compare really ran
    expect(res.exitCode).toBe(1);
    expect(String(res.stderr)).toContain('drift detected');
    expect(String(res.stderr)).toContain('YOUR decision');
  });

  posixOnly('a clean session keeps the agent exit code and says so', async () => {
    await stubCli('aider');
    await stubDriftguard(0);
    const res = await vg(['run', 'aider', '--no-headroom'], binDir);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('no drift');
  });

  posixOnly('--no-verify skips the verdict entirely', async () => {
    await stubCli('aider');
    const marker = await stubDriftguard(1);
    const res = await vg(['run', 'aider', '--no-headroom', '--no-verify'], binDir);
    expect(res.exitCode).toBe(0); // drifted, but verification was explicitly skipped
    await expect(fsp.access(marker)).rejects.toThrow(); // compare never ran
  });

  posixOnly('a driftguard tooling error never fails the session (fail-open)', async () => {
    await stubCli('aider');
    await stubDriftguard(2);
    const res = await vg(['run', 'aider', '--no-headroom'], binDir);
    expect(res.exitCode).toBe(0);
    expect(String(res.stdout)).toContain('could not verify');
  });
});

describe('vibeguard emit', () => {
  it('writes the artifacts for the asked hosts, one AGENTS.md block for many hosts', async () => {
    const res = await vg(['emit', 'cursor', 'kiro', 'codex']);
    expect(res.exitCode).toBe(0);
    const cursorRules = await fsp.readFile(path.join(dir, '.cursor/rules/vibeguard.md'), 'utf8');
    expect(cursorRules).toContain('engineering rules (mandatory)');
    const agents = await fsp.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents.match(/vibeguard:start/g)).toHaveLength(1); // kiro + codex share the block
  });

  it('--all emits every artifact kind, including the Claude skills', async () => {
    const res = await vg(['emit', '--all']);
    expect(res.exitCode).toBe(0);
    await fsp.access(path.join(dir, '.claude/skills/vibeguard/SKILL.md'));
    await fsp.access(path.join(dir, '.cursor/rules/vibeguard.md'));
    await fsp.access(path.join(dir, 'AGENTS.md'));
  });

  it('with no argument, lists the supported hosts instead of writing anything', async () => {
    const res = await vg(['emit']);
    expect(res.exitCode).toBe(0);
    for (const id of [
      'claude-code',
      'cursor',
      'codex',
      'opencode',
      'hermes',
      'gemini',
      'antigravity',
      'kiro',
    ]) {
      expect(String(res.stdout)).toContain(id);
    }
    await expect(fsp.access(path.join(dir, 'AGENTS.md'))).rejects.toThrow();
  });

  it('an unknown CLI name falls back to the AGENTS.md standard', async () => {
    const res = await vg(['emit', 'some-future-agent']);
    expect(res.exitCode).toBe(0);
    const agents = await fsp.readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(agents).toContain('vibeguard:start');
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
