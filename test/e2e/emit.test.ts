/** `vibeguard emit` e2e: per-host rule artifacts + in-session enforcement wiring. */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa, type Result } from 'execa';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../dist/bin.js');
let dir: string;

function vg(args: string[]): Promise<Result> {
  return execa('node', [BIN, '-C', dir, ...args], {
    reject: false,
    env: { ...process.env, NO_COLOR: '1' },
  });
}

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-emit-'));
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'demo' }), 'utf8');
  await vg(['init', '--profile', 'experienced']);
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
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

describe('vibeguard emit — in-session enforcement wiring (driftguard present)', () => {
  beforeEach(async () => {
    await fsp.mkdir(path.join(dir, '.driftguard'), { recursive: true });
    await fsp.writeFile(path.join(dir, '.driftguard', 'config.json'), '{}', 'utf8');
  });

  it('cursor gets .cursor/hooks.json with the five driftguard hooks, preserving foreign entries', async () => {
    await fsp.mkdir(path.join(dir, '.cursor'), { recursive: true });
    await fsp.writeFile(
      path.join(dir, '.cursor', 'hooks.json'),
      JSON.stringify({ version: 1, hooks: { stop: [{ command: './my-own-hook.sh' }] } }),
      'utf8',
    );
    await vg(['emit', 'cursor']);
    const hooks = JSON.parse(await fsp.readFile(path.join(dir, '.cursor/hooks.json'), 'utf8')) as {
      hooks: Record<string, { command: string }[]>;
    };
    for (const event of [
      'sessionStart',
      'afterFileEdit',
      'afterShellExecution',
      'beforeSubmitPrompt',
      'stop',
    ]) {
      expect(hooks.hooks[event]?.some((e) => e.command.includes('drift-guard hook'))).toBe(true);
      expect(
        hooks.hooks[event]?.every(
          (e) => e.command.includes('--host cursor') || !e.command.includes('drift-guard'),
        ),
      ).toBe(true);
    }
    expect(hooks.hooks['stop']?.some((e) => e.command === './my-own-hook.sh')).toBe(true); // foreign preserved
    // Idempotent: a second emit does not duplicate our entries.
    await vg(['emit', 'cursor']);
    const again = JSON.parse(await fsp.readFile(path.join(dir, '.cursor/hooks.json'), 'utf8')) as {
      hooks: Record<string, { command: string }[]>;
    };
    expect(again.hooks['stop']?.filter((e) => e.command.includes('drift-guard')).length).toBe(1);
  });

  it('kiro gets the agentStop gate and the promptSubmit roadmap hook files', async () => {
    await vg(['emit', 'kiro']);
    const gate = JSON.parse(
      await fsp.readFile(path.join(dir, '.kiro/hooks/vibeguard-gate.kiro.hook'), 'utf8'),
    ) as { when: { type: string }; then: { type: string; command: string } };
    expect(gate.when.type).toBe('agentStop');
    expect(gate.then.type).toBe('runCommand');
    expect(gate.then.command).toContain('hook stop --host kiro');
    const roadmap = JSON.parse(
      await fsp.readFile(path.join(dir, '.kiro/hooks/vibeguard-roadmap.kiro.hook'), 'utf8'),
    ) as { when: { type: string } };
    expect(roadmap.when.type).toBe('promptSubmit');
  });

  it('opencode gets the plugin: idle gate + protected-path block', async () => {
    await vg(['emit', 'opencode']);
    const plugin = await fsp.readFile(path.join(dir, '.opencode/plugins/vibeguard.js'), 'utf8');
    expect(plugin).toContain('session.idle');
    expect(plugin).toContain('hook stop --host kiro');
    expect(plugin).toContain('tool.execute.before');
    expect(plugin).toContain('protected path');
  });

  it('without driftguard configured, no enforcement wiring is written', async () => {
    await fsp.rm(path.join(dir, '.driftguard'), { recursive: true });
    await vg(['emit', 'cursor', 'kiro', 'opencode']);
    await expect(fsp.access(path.join(dir, '.cursor/hooks.json'))).rejects.toThrow();
    await expect(fsp.access(path.join(dir, '.kiro'))).rejects.toThrow();
    await expect(fsp.access(path.join(dir, '.opencode'))).rejects.toThrow();
  });
});
