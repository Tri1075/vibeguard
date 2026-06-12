/**
 * The read-once contract behind the check speedup: within one runCheck every
 * gate shares a single disk read per file; a NEW check always sees fresh
 * content (the cache never outlives the run).
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { makeCachedReadText } from '../../src/core/files.js';

let dir: string;

beforeEach(async () => {
  dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-cache-'));
  await fsp.writeFile(path.join(dir, 'a.ts'), 'first', 'utf8');
});
afterEach(async () => {
  await fsp.rm(dir, { recursive: true, force: true });
});

describe('makeCachedReadText', () => {
  it('reads each file once per check — later gates get the same content', async () => {
    const read = makeCachedReadText(dir);
    expect(await read('a.ts')).toBe('first');
    await fsp.writeFile(path.join(dir, 'a.ts'), 'second', 'utf8');
    // Same check run: the cached content is served, the disk is not re-read.
    expect(await read('a.ts')).toBe('first');
  });

  it('a new check sees fresh edits (the cache is per-run, never global)', async () => {
    expect(await makeCachedReadText(dir)('a.ts')).toBe('first');
    await fsp.writeFile(path.join(dir, 'a.ts'), 'second', 'utf8');
    expect(await makeCachedReadText(dir)('a.ts')).toBe('second');
  });

  it('caches misses too — a missing file is asked of the disk once', async () => {
    const read = makeCachedReadText(dir);
    expect(await read('ghost.ts')).toBeNull();
    await fsp.writeFile(path.join(dir, 'ghost.ts'), 'late', 'utf8');
    expect(await read('ghost.ts')).toBeNull(); // same run: still the cached miss
  });
});
