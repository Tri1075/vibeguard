/**
 * Wire driftguard's in-session enforcement into Cursor (.cursor/hooks.json,
 * contract: https://cursor.com/docs/hooks). Merge-safe: our entries are
 * recognized by their `drift-guard hook` command and replaced in place; every
 * foreign hook the user configured is preserved. Commands use the portable
 * npx form — npx resolves the local devDependency first, so the hot path
 * stays fast when drift-guard is installed in the project.
 */
import path from 'node:path';
import fs from 'node:fs';
import { readJson, writeJsonAtomic } from '../../core/store.js';

interface CursorHookEntry {
  command: string;
  timeout?: number;
  [k: string]: unknown;
}
interface CursorHooksFile {
  version?: number;
  hooks?: Record<string, CursorHookEntry[]>;
  [k: string]: unknown;
}

const CMD = (event: string): string => `npx -y drift-guard hook ${event} --host cursor`;

/** Event → our entry. The stop gate runs probes, so it gets a real timeout. */
const WIRING: Record<string, CursorHookEntry> = {
  sessionStart: { command: CMD('session-start') },
  afterFileEdit: { command: CMD('after-file-edit') },
  afterShellExecution: { command: CMD('after-shell-execution') },
  beforeSubmitPrompt: { command: CMD('before-submit-prompt') },
  stop: { command: CMD('stop'), timeout: 120 },
};

/** Upsert our hook entries into .cursor/hooks.json. Returns the relative path. */
export async function emitCursorHooks(root: string): Promise<string> {
  const rel = '.cursor/hooks.json';
  const file = path.join(root, rel);
  const existing = fs.existsSync(file) ? ((await readJson<CursorHooksFile>(file)) ?? {}) : {};
  const hooks = existing.hooks ?? {};
  for (const [event, entry] of Object.entries(WIRING)) {
    const others = (hooks[event] ?? []).filter((e) => !String(e.command).includes('drift-guard hook'));
    hooks[event] = [...others, entry];
  }
  await writeJsonAtomic(file, { ...existing, version: existing.version ?? 1, hooks });
  return rel;
}
