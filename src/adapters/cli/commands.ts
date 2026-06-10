/** Thin command handlers: parse → call core → render → exit code. */
import fsp from 'node:fs/promises';
import pc from 'picocolors';
import { findRoot, loadConfig } from '../../core/config.js';
import { listProjectFiles, makeReadText } from '../../core/files.js';
import { parseManifestDeps } from '../../core/deps-parse.js';
import { readDepsBaseline, writeDepsBaseline } from '../../core/deps-baseline.js';
import { runCheck } from '../../core/runner.js';
import { writeFileAtomic } from '../../core/store.js';
import { pathsFor } from '../../core/paths.js';
import { protocolMarkdown, skillMarkdown } from '../../laws/skill.js';
import { renderJson, renderTty } from './render.js';
import type { GateContext, VibeguardPaths } from '../../core/types.js';

const useColor = (): boolean => process.stdout.isTTY === true && !process.env['NO_COLOR'];

function mustRoot(cwd: string): string {
  const root = findRoot(cwd);
  if (!root) {
    process.stderr.write(`${pc.red('not initialized')} — run \`vibeguard init\` first\n`);
    process.exit(2);
  }
  return root;
}

/** Build a GateContext for ad-hoc commands (debt/deps) that need to read files. */
async function gateContext(root: string, paths: VibeguardPaths): Promise<GateContext> {
  const files = await listProjectFiles(root);
  const readText = makeReadText(root);
  return { root, files, readText, paths } as unknown as GateContext;
}

export async function checkCommand(
  cwd: string,
  rule: string | undefined,
  opts: { json?: boolean; ci?: boolean },
): Promise<never> {
  const config = await loadConfig(mustRoot(cwd));
  const report = await runCheck(config, rule ? { only: [rule] } : {});
  process.stdout.write(opts.json || opts.ci ? renderJson(report) : `${renderTty(report, useColor())}\n`);
  process.exit(report.blocked ? 1 : 0);
}

export async function debtAddCommand(cwd: string, file: string, opts: { reason: string }): Promise<void> {
  const paths = pathsFor(mustRoot(cwd));
  const current = await readOr(paths.debtFile, '');
  const entry = `- \`${file}\` — ${opts.reason} (${new Date().toISOString().slice(0, 10)})\n`;
  await writeFileAtomic(paths.debtFile, current + entry);
  process.stdout.write(`${pc.green('✓ debt recorded')} for ${file}\n`);
}

export async function depsApproveCommand(cwd: string, name: string | undefined): Promise<void> {
  const root = mustRoot(cwd);
  const paths = pathsFor(root);
  const current = await parseManifestDeps(await gateContext(root, paths));
  const approved = await readDepsBaseline(paths);
  const toApprove = name ? pick(current, name) : current; // no name → approve the whole current set
  Object.assign(approved, toApprove);
  await writeDepsBaseline(paths, approved);
  process.stdout.write(
    `${pc.green('✓ approved')} ${name ?? `${Object.keys(toApprove).length} dependencies`}\n`,
  );
}

export function rulesCommand(opts: { skill?: boolean }): void {
  process.stdout.write(opts.skill ? skillMarkdown() : protocolMarkdown());
}

function pick<T>(map: Record<string, T>, key: string): Record<string, T> {
  const v = map[key] ?? map[key.toLowerCase()];
  if (!v) {
    process.stderr.write(`${pc.red('not a current dependency:')} ${key}\n`);
    process.exit(2);
  }
  return { [key]: v };
}

async function readOr(file: string, fallback: string): Promise<string> {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return fallback;
  }
}
