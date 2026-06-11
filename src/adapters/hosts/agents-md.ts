/**
 * Maintain a managed vibeguard block inside AGENTS.md without clobbering the
 * user's own content. The block is delimited by HTML comment markers so it can
 * be refreshed in place on every `run`.
 */
import { writeFileAtomic } from '../../core/store.js';
import fsp from 'node:fs/promises';

const START = '<!-- vibeguard:start (managed — edit .vibeguard/instructions instead) -->';
const END = '<!-- vibeguard:end -->';
const START_RE = /<!--\s*vibeguard:start[^>]*-->/g;
const END_RE = /<!--\s*vibeguard:end\s*-->/g;

/** Insert or replace the managed block in AGENTS.md at `file`. Returns true if changed. */
export async function upsertManagedBlock(file: string, body: string): Promise<boolean> {
  const block = `${START}\n${body.trimEnd()}\n${END}`;
  const existing = await read(file);

  if (existing === null) {
    await writeFileAtomic(file, `${block}\n`);
    return true;
  }
  const replaced = replaceBlock(existing, block);
  // replaceBlock returns null when the markers are missing or corrupt (e.g. an
  // agent deleted the end marker, freezing the law). Don't silently no-op:
  // strip any orphan markers and append a fresh, well-formed block.
  const next = replaced ?? `${stripMarkers(existing).trimEnd()}\n\n${block}\n`;
  if (next === existing) return false;
  await writeFileAtomic(file, next);
  return true;
}

/** Replace exactly one well-formed managed block, or null if none is intact. */
function replaceBlock(text: string, block: string): string | null {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) return null;
  return `${text.slice(0, start)}${block}${text.slice(end + END.length)}`;
}

/** Remove any stray start/end markers so a re-inserted block can't nest. */
function stripMarkers(text: string): string {
  return text.replace(START_RE, '').replace(END_RE, '');
}

async function read(file: string): Promise<string | null> {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return null;
  }
}
