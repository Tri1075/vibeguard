/**
 * The credibility benchmark: seed realistic AI-agent faults into a clean,
 * governed project and measure what the stack actually catches — plus the
 * false-positive rate on the untouched tree (the existential metric: one
 * noisy block and users uninstall). Faults live in bench-faults.mjs.
 *
 * Method, honest by construction:
 * - fresh throwaway git repo, governed by the BUNDLED binaries (exactly what
 *   `/plugin marketplace add` ships), strict posture so all nine rules gate;
 * - each fault is applied alone on a clean copy, then `vibeguard check --ci`
 *   and `driftguard compare --ci` run; results are three-state:
 *   blocks / advisory (flagged at info severity by design) / MISSED;
 * - agent attribution goes through the real PostToolUse hook;
 * - exit 0 only when every fault is caught and the clean tree is green.
 *
 *   node scripts/bench-detection.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { makeFaults } from './bench-faults.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VG = path.join(ROOT, 'plugin-bin', 'vibeguard', 'index.js');
const DG = path.join(ROOT, 'plugin-bin', 'driftguard', 'index.js');

function sh(cwd, file, args, opts = {}) {
  try {
    const out = execFileSync(file, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
    return { code: 0, out: String(out) };
  } catch (e) {
    return { code: e.status ?? 1, out: `${String(e.stdout ?? '')}${String(e.stderr ?? '')}` };
  }
}

function freshProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeguard-bench-det-'));
  sh(dir, 'git', ['init', '-q']);
  sh(dir, 'git', ['config', 'user.email', 'bench@example.com']);
  sh(dir, 'git', ['config', 'user.name', 'bench']);
  write(dir, 'src/app.ts', 'export function add(a: number, b: number): number {\n  return a + b;\n}\n');
  write(dir, 'src/util.ts', 'export function id(x: string): string {\n  return x;\n}\n');
  write(dir, 'package.json', JSON.stringify({ name: 'bench-app', version: '0.0.0' }, null, 2));
  write(dir, 'PLAN.md', '# Plan\n\n## Goal\nDemo app.\n\n## Stack\nTypeScript.\n');
  sh(dir, 'git', ['add', '-A']);
  sh(dir, 'git', ['commit', '-qm', 'init']);
  // Strict posture: all nine rules gate (the point is rule coverage).
  sh(dir, process.execPath, [VG, '-C', dir, 'init', '--profile', 'beginner']);
  sh(dir, process.execPath, [DG, '-C', dir, 'init', '--no-verify']);
  sh(dir, process.execPath, [
    VG,
    '-C',
    dir,
    'bootstrap',
    '--driftguard-bin',
    DG,
    '--vibeguard-bin',
    VG,
    '--quiet',
  ]);
  return dir;
}

function write(dir, rel, content) {
  fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
  fs.writeFileSync(path.join(dir, rel), content);
}

/** Tell driftguard an agent made this edit — through the real hook. */
function attribute(dir, rel) {
  const payload = JSON.stringify({
    session_id: 'bench',
    cwd: dir,
    tool_name: 'Edit',
    tool_input: { file_path: path.join(dir, rel) },
  });
  // stdin must be a pipe: with 'ignore' the input is never delivered and the
  // hook fails open silently (no journal, no attribution).
  execFileSync(process.execPath, [DG, 'hook', 'post-tool-use'], {
    cwd: dir,
    input: payload,
    stdio: ['pipe', 'ignore', 'ignore'],
  });
}

function scopeSet(dir, allow) {
  sh(dir, process.execPath, [
    DG,
    '-C',
    dir,
    'scope',
    'set',
    '--task',
    'extend add()',
    '--allow',
    allow,
    '--agent',
    '--session',
    'bench',
  ]);
}

/** 'blocks' | 'advisory' (info severity by design) | 'missed'. */
function vibeguardVerdict(dir, rule) {
  const res = sh(dir, process.execPath, [VG, '-C', dir, 'check', '--ci'], {
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  let findings;
  try {
    findings = JSON.parse(res.out).findings ?? [];
  } catch {
    return 'missed';
  }
  const mine = findings.filter((f) => f.rule === rule);
  if (mine.length === 0) return 'missed';
  const blocking = res.code !== 0 && mine.some((f) => f.severity !== 'low' && f.severity !== 'info');
  return blocking ? 'blocks' : 'advisory';
}

function driftguardVerdict(dir) {
  return sh(dir, process.execPath, [DG, '-C', dir, 'compare', '--ci']).code === 1 ? 'blocks' : 'missed';
}

// --- run ---
const FAULTS = makeFaults({ write, attribute, scopeSet });
const rows = [];
let caught = 0;
let advisory = 0;

// Control first: the untouched governed tree must be FULLY green on both tools.
const control = freshProject();
const fpVibeguard = sh(control, process.execPath, [VG, '-C', control, 'check', '--ci']).code !== 0;
const fpDriftguard = sh(control, process.execPath, [DG, '-C', control, 'compare', '--ci']).code === 1;
fs.rmSync(control, { recursive: true, force: true });

for (const fault of FAULTS) {
  const dir = freshProject();
  fault.apply(dir);
  const verdict = fault.checker === 'vibeguard' ? vibeguardVerdict(dir, fault.rule) : driftguardVerdict(dir);
  if (verdict !== 'missed') caught++;
  if (verdict === 'advisory') advisory++;
  const label =
    verdict === 'blocks'
      ? '✅ caught — blocks'
      : verdict === 'advisory'
        ? '✅ caught — advisory'
        : '❌ MISSED';
  rows.push(`| ${fault.name} | \`${fault.rule}\` | ${fault.checker} | ${label} |`);
  fs.rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(
  [
    `Seeded faults caught: ${caught}/${FAULTS.length} (${caught - advisory} blocking, ${advisory} advisory-by-design)`,
    `False positives on the clean tree: vibeguard ${fpVibeguard ? 'YES ⚠' : 'none'} · driftguard ${fpDriftguard ? 'YES ⚠' : 'none'}`,
    '',
    '| Seeded fault (what an AI agent slips in) | Rule / class | Caught by | Result |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
  ].join('\n'),
);
process.exitCode = caught === FAULTS.length && !fpVibeguard && !fpDriftguard ? 0 : 1;
