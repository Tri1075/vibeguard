/**
 * Benchmark `vibeguard check --ci` end to end (process spawn included — that
 * is what a user feels). Runs N times per target, reports median and spread.
 * Optional synthetic target: pass --synth <files> to generate a throwaway
 * repo of that many small TS files (worst case: every content gate scans all).
 *
 *   node scripts/bench-check.mjs <dir> [dir...] [--synth 2000] [--runs 7]
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist/bin.js');
const args = process.argv.slice(2);
const runs = intFlag('--runs') ?? 7;
const synth = intFlag('--synth');
const targets = args.filter((a) => !a.startsWith('--') && a !== String(runs) && a !== String(synth));

function intFlag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : undefined;
}

function makeSynthRepo(count) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibeguard-bench-'));
  execFileSync('git', ['init', '-q'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'bench' }));
  const body = [
    '/** synthetic module for benchmarking — realistic-ish content. */',
    'export function handler(input: string): string {',
    '  try {',
    '    const trimmed = input.trim();',
    '    return trimmed.length > 0 ? trimmed : "empty";',
    '  } catch (error) {',
    '    throw new Error(`handler failed: ${String(error)}`);',
    '  }',
    '}',
    'export const VERSION = 3;',
    '',
  ].join('\n');
  for (let i = 0; i < count; i++) {
    const sub = path.join(dir, 'src', `pkg${i % 40}`);
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, `mod${i}.ts`), body.repeat(4));
  }
  execFileSync(
    BIN.includes('bin.js') ? process.execPath : 'node',
    [BIN, '-C', dir, 'init', '--profile', 'experienced'],
    {
      stdio: 'ignore',
    },
  );
  return dir;
}

function bench(dir) {
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    try {
      execFileSync(process.execPath, [BIN, '-C', dir, 'check', '--ci'], { stdio: 'ignore' });
    } catch {
      /* exit 1 (findings) is a valid benchmark run */
    }
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const median = times[Math.floor(times.length / 2)];
  return { median, min: times[0], max: times[times.length - 1] };
}

const list = [...targets];
let synthDir = null;
if (synth) {
  synthDir = makeSynthRepo(synth);
  list.push(synthDir);
}

for (const dir of list) {
  const label = dir === synthDir ? `synthetic (${synth} files)` : dir;
  const { median, min, max } = bench(dir);
  process.stdout.write(
    `${label}: median ${median.toFixed(0)} ms (min ${min.toFixed(0)}, max ${max.toFixed(0)}, ${runs} runs)\n`,
  );
}

if (synthDir) fs.rmSync(synthDir, { recursive: true, force: true });
