/**
 * Project file discovery: the universe a gate scans. Git-managed repos use
 * `git ls-files` (tracked + untracked-not-ignored) so we honour .gitignore for
 * free; otherwise we fall back to a plain recursive walk.
 */
import type fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execa } from 'execa';
import { VIBEGUARD_DIR } from './paths.js';

const ALWAYS_SKIP = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', VIBEGUARD_DIR]);
const MAX_FILE_BYTES = 2_000_000;

function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}

/** List source files (POSIX, relative to root), gitignore-aware when possible. */
export async function listProjectFiles(root: string): Promise<string[]> {
  const fromGit = await gitFiles(root);
  const files = fromGit ?? (await walk(root, root));
  return files.filter((f) => !isSkipped(f)).sort();
}

function isSkipped(rel: string): boolean {
  const top = rel.split('/')[0];
  return top !== undefined && ALWAYS_SKIP.has(top);
}

async function gitFiles(root: string): Promise<string[] | null> {
  try {
    const tracked = await execa('git', ['ls-files', '-z'], { cwd: root, reject: false });
    if (tracked.exitCode !== 0) return null;
    const untracked = await execa('git', ['ls-files', '-z', '--others', '--exclude-standard'], {
      cwd: root,
      reject: false,
    });
    const blob = `${tracked.stdout}\0${untracked.exitCode === 0 ? untracked.stdout : ''}`;
    return blob.split('\0').filter(Boolean).map(toPosix);
  } catch {
    return null;
  }
}

async function walk(root: string, dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (ALWAYS_SKIP.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(root, abs)));
    else if (entry.isFile()) out.push(toPosix(path.relative(root, abs)));
  }
  return out;
}

/** Read a file as UTF-8 text; null for missing, oversized, or binary content. */
export function makeReadText(root: string): (rel: string) => Promise<string | null> {
  return async (rel: string): Promise<string | null> => {
    try {
      const buf = await fsp.readFile(path.join(root, rel));
      if (buf.byteLength > MAX_FILE_BYTES) return null;
      if (buf.subarray(0, 8192).includes(0)) return null; // binary
      return buf.toString('utf8');
    } catch {
      return null;
    }
  };
}
