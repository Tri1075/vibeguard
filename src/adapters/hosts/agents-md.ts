/**
 * Maintain a managed vibeguard block inside AGENTS.md without clobbering the
 * user's own content. The block is delimited by HTML comment markers so it can
 * be refreshed in place on every `run`.
 */
import fsp from 'node:fs/promises';

const START = '<!-- vibeguard:start (managed — edit .vibeguard/instructions instead) -->';
const END = '<!-- vibeguard:end -->';

/** Insert or replace the managed block in AGENTS.md at `file`. Returns true if changed. */
export async function upsertManagedBlock(file: string, body: string): Promise<boolean> {
  const block = `${START}\n${body.trimEnd()}\n${END}`;
  const existing = await read(file);

  if (existing === null) {
    await fsp.writeFile(file, `${block}\n`, 'utf8');
    return true;
  }
  const next = existing.includes(START)
    ? replaceBlock(existing, block)
    : `${existing.trimEnd()}\n\n${block}\n`;
  if (next === existing) return false;
  await fsp.writeFile(file, next, 'utf8');
  return true;
}

function replaceBlock(text: string, block: string): string {
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (start === -1 || end === -1 || end < start) return text;
  return `${text.slice(0, start)}${block}${text.slice(end + END.length)}`;
}

async function read(file: string): Promise<string | null> {
  try {
    return await fsp.readFile(file, 'utf8');
  } catch {
    return null;
  }
}
