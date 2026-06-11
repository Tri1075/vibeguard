/**
 * The AGENTS.md managed block must survive corruption: a deleted or duplicated
 * marker (the law-delivery channel an agent could sabotage) is repaired, not
 * silently left frozen.
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { upsertManagedBlock } from '../../src/adapters/hosts/agents-md.js';

let file: string;

beforeEach(async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-agents-'));
  file = path.join(dir, 'AGENTS.md');
});
afterEach(async () => {
  await fsp.rm(path.dirname(file), { recursive: true, force: true });
});

describe('upsertManagedBlock', () => {
  it('creates, then idempotently refreshes the block, preserving user content', async () => {
    await fsp.writeFile(file, '# Notes\nkeep me\n', 'utf8');
    expect(await upsertManagedBlock(file, 'RULES v1')).toBe(true);
    const once = await fsp.readFile(file, 'utf8');
    expect(once).toContain('keep me');
    expect(once).toContain('RULES v1');
    // Same body again → no change.
    expect(await upsertManagedBlock(file, 'RULES v1')).toBe(false);
    // New body → replaces in place, exactly one block.
    await upsertManagedBlock(file, 'RULES v2');
    const twice = await fsp.readFile(file, 'utf8');
    expect(twice).toContain('RULES v2');
    expect(twice).not.toContain('RULES v1');
    expect(twice.match(/vibeguard:start/g)).toHaveLength(1);
  });

  it('repairs a corrupted block instead of freezing the law', async () => {
    // Only the start marker survives (agent deleted the end marker).
    await fsp.writeFile(
      file,
      '# Notes\n<!-- vibeguard:start (managed — edit .vibeguard/instructions instead) -->\nstale rules\n',
      'utf8',
    );
    const changed = await upsertManagedBlock(file, 'FRESH RULES');
    expect(changed).toBe(true);
    const text = await fsp.readFile(file, 'utf8');
    expect(text).toContain('FRESH RULES');
    expect(text).toContain('keep me'.replace('keep me', '# Notes')); // user heading kept
    // Exactly one well-formed block, no orphan/duplicated markers.
    expect(text.match(/vibeguard:start/g)).toHaveLength(1);
    expect(text.match(/vibeguard:end/g)).toHaveLength(1);
  });
});
