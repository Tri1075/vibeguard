/**
 * Session-discipline commands: `handoff` (write HANDOFF.md before a fresh
 * session) and `tokens` (estimate context size and name the zone). Together they
 * keep the agent out of the "dumb zone".
 */
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import pc from 'picocolors';
import { findRoot } from '../../core/config.js';
import { buildHandoffDoc, type HandoffFacts } from '../../core/handoff.js';
import { readJson } from '../../core/store.js';
import { estimateTokens, zoneAdvice, zoneFor } from '../../core/tokens.js';

function mustRoot(cwd: string): string {
  const root = findRoot(cwd);
  if (!root) {
    process.stderr.write(`${pc.red('not initialized')} — run \`vibeguard init\` first\n`);
    process.exit(2);
  }
  return root;
}

export async function handoffCommand(cwd: string, isoNow: string): Promise<void> {
  const root = mustRoot(cwd);
  const facts: HandoffFacts = {
    createdAt: isoNow,
    ...(await readDriftguardContract(root)),
    changedFiles: await changedFiles(root),
  };
  const file = path.join(root, 'HANDOFF.md');
  await fsp.writeFile(file, buildHandoffDoc(facts), 'utf8');
  process.stdout.write(
    `${pc.green('✓ HANDOFF.md written')} — fill the prose sections, then start a fresh session and re-inject it.\n`,
  );
}

export async function tokensCommand(cwd: string, file: string | undefined): Promise<void> {
  const text = file ? await fsp.readFile(path.resolve(cwd, file), 'utf8') : await readStdin();
  const tokens = estimateTokens(text);
  const zone = zoneFor(tokens);
  const color = zone === 'handoff' ? pc.red : zone === 'warn' ? pc.yellow : pc.green;
  const pretty = `~${tokens.toLocaleString('en-US')} tokens · ${zone} zone`;
  process.stdout.write(`${color(pretty)}\n${pc.dim(zoneAdvice(zone))}\n`);
}

interface Contract {
  task: string | null;
  allowGlobs: string[];
  driftStatus: string | null;
}

async function readDriftguardContract(root: string): Promise<Contract> {
  const scope = await readJson<{ task?: string; allowGlobs?: string[] }>(
    path.join(root, '.driftguard', 'state', 'scope.json'),
  );
  const last = await readJson<{ status?: string }>(
    path.join(root, '.driftguard', 'state', 'last-report.json'),
  );
  return {
    task: scope?.task ?? null,
    allowGlobs: scope?.allowGlobs ?? [],
    driftStatus: last?.status ?? null,
  };
}

async function changedFiles(root: string): Promise<string[]> {
  const res = await execa('git', ['status', '--porcelain'], { cwd: root, reject: false });
  if (res.exitCode !== 0) return [];
  return res.stdout
    .split('\n')
    .map((l) => l.slice(3).trim())
    .filter(Boolean)
    .slice(0, 50);
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}
