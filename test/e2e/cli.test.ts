/** The CLI as users run it: init → check (clean/red) → debt/deps → driftguard link. */
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
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-e2e-'));
  const pkg = { name: 'demo', dependencies: { 'left-pad': '1.0.0' } };
  await fsp.writeFile(path.join(dir, 'package.json'), JSON.stringify(pkg), 'utf8');
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
});

describe('vibeguard CLI', () => {
  it('init scaffolds .vibeguard with rules, instructions and a deps baseline', async () => {
    const res = await vg(['init', '--profile', 'experienced']);
    expect(res.exitCode).toBe(0);
    const rules = JSON.parse(await fsp.readFile(path.join(dir, '.vibeguard/rules.json'), 'utf8'));
    expect(rules.profile).toBe('experienced');
    expect(Object.keys(rules.rules)).toContain('secure-code');
    expect(await fsp.readFile(path.join(dir, '.vibeguard/instructions/modules-small.md'), 'utf8')).toContain(
      'OWNER-EDITABLE',
    );
    const baseline = JSON.parse(await fsp.readFile(path.join(dir, '.vibeguard/deps-baseline.json'), 'utf8'));
    expect(baseline.approved['left-pad']).toBeTruthy(); // seeded from package.json
  });

  it('check is clean on an empty project, red when a secret is introduced', async () => {
    await vg(['init', '--profile', 'beginner']);
    expect((await vg(['check'])).exitCode).toBe(0);

    await fsp.writeFile(path.join(dir, 'app.js'), 'const k = "AKIAIOSFODNN7EXAMPLE";\n', 'utf8');
    const red = await vg(['check', '--json']);
    expect(red.exitCode).toBe(1);
    const report = JSON.parse(String(red.stdout));
    expect(report.status).toBe('blocked');
    expect(report.findings.some((f: { rule: string }) => f.rule === 'no-secrets')).toBe(true);
  });

  it('a new dependency is flagged until approved', async () => {
    await vg(['init', '--profile', 'experienced']);
    const pkg = path.join(dir, 'package.json');
    const json = JSON.parse(await fsp.readFile(pkg, 'utf8'));
    json.dependencies['lodash'] = '4.17.21';
    await fsp.writeFile(pkg, JSON.stringify(json), 'utf8');

    const before = await vg(['check', 'deps-hygiene', '--json']);
    expect(before.exitCode).toBe(1);
    expect(JSON.parse(String(before.stdout)).findings[0].message).toContain('lodash');

    expect((await vg(['deps', 'approve', 'lodash'])).exitCode).toBe(0);
    expect((await vg(['check', 'deps-hygiene'])).exitCode).toBe(0);
  });

  it('debt add ledgers a marker so the gate stops flagging it', async () => {
    await vg(['init', '--profile', 'beginner']);
    await fsp.writeFile(path.join(dir, 'work.js'), '// TODO wire this up\nrun();\n', 'utf8');
    expect((await vg(['check', 'no-tech-debt'])).exitCode).toBe(1);
    await vg(['debt', 'add', 'work.js', '--reason', 'tracked for next sprint']);
    expect((await vg(['check', 'no-tech-debt'])).exitCode).toBe(0);
  });

  it('rules --skill emits a Claude Code skill; init links driftguard when present', async () => {
    const skill = await vg(['rules', '--skill']);
    expect(String(skill.stdout)).toContain('name: vibeguard');
    expect(String(skill.stdout)).toContain('120K');

    await fsp.mkdir(path.join(dir, '.driftguard'), { recursive: true });
    await fsp.writeFile(
      path.join(dir, '.driftguard/config.json'),
      JSON.stringify({ schemaVersion: 1, probes: [] }),
      'utf8',
    );
    await vg(['init', '--profile', 'experienced', '--force']);
    const dg = JSON.parse(await fsp.readFile(path.join(dir, '.driftguard/config.json'), 'utf8'));
    expect(dg.protect).toContain('.vibeguard/');
    expect(dg.probes.some((p: { name: string }) => p.name === 'vibeguard-secure-code')).toBe(true);
  });
});

describe('benchmark-uncovered regressions', () => {
  it('check --ci emits COMPLETE JSON even on huge reports (no 64KB truncation)', async () => {
    // 300 single-line exports → hundreds of findings → >64KB of JSON. A hard
    // process.exit used to drop everything past the pipe buffer.
    await vg(['init', '--profile', 'beginner']);
    await fsp.mkdir(path.join(dir, 'src'), { recursive: true });
    for (let i = 0; i < 6; i++) {
      const big = Array.from({ length: 60 }, (_, j) => `export const v${i}_${j} = ${j};`).join('\n');
      await fsp.writeFile(path.join(dir, `src/big${i}.ts`), big, 'utf8');
    }
    const res = await vg(['check', '--ci']);
    const report = JSON.parse(String(res.stdout)) as { findings: unknown[] };
    expect(report.findings.length).toBeGreaterThan(100);
  });

  it('a tracked-but-deleted plan is a MISSING plan, not a silent pass', async () => {
    await vg(['init', '--profile', 'beginner']);
    await fsp.writeFile(path.join(dir, 'PLAN.md'), '# Plan\n\n## Goal\nx\n\n## Stack\ny\n', 'utf8');
    await execa('git', ['init', '-q'], { cwd: dir });
    await execa('git', ['add', '-A'], { cwd: dir });
    await execa('git', ['-c', 'user.email=t@e.c', '-c', 'user.name=t', 'commit', '-qm', 'i'], { cwd: dir });
    await fsp.rm(path.join(dir, 'PLAN.md')); // deleted on disk, still tracked
    const res = await vg(['check', 'plan-first', '--ci']);
    const report = JSON.parse(String(res.stdout)) as { findings: { rule: string; message: string }[] };
    expect(report.findings.some((f) => f.rule === 'plan-first' && /no action plan/.test(f.message))).toBe(
      true,
    );
  });
});
