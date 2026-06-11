/**
 * Config resolution: a PARTIAL rule entry must inherit the registry default
 * severity, never a zod-injected one. Regression guard for the audit finding
 * where touching a param of an advisory `warn` rule silently promoted it to
 * `block` (rules-schema.ts default 'block' winning over the `??` fallback).
 */
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/core/config.js';

let root: string;

async function writeRules(rules: unknown): Promise<void> {
  const dir = path.join(root, '.vibeguard');
  await fsp.mkdir(dir, { recursive: true });
  await fsp.writeFile(path.join(dir, 'rules.json'), JSON.stringify(rules), 'utf8');
}

beforeEach(async () => {
  root = await fsp.mkdtemp(path.join(os.tmpdir(), 'vibeguard-cfg-'));
});
afterEach(async () => {
  await fsp.rm(root, { recursive: true, force: true });
});

describe('resolveRules severity inheritance', () => {
  it('keeps an advisory rule on warn when only its params are overridden', async () => {
    await writeRules({ schemaVersion: 1, rules: { 'no-dead-code': { params: { minCommentedRun: 5 } } } });
    const { resolved } = await loadConfig(root);
    expect(resolved.get('no-dead-code')?.severity).toBe('warn');
    expect(resolved.get('plan-first')?.severity).toBe('warn');
    // params still merge over the default
    expect(resolved.get('no-dead-code')?.params['minCommentedRun']).toBe(5);
  });

  it('honors an explicit severity override in both directions', async () => {
    await writeRules({
      schemaVersion: 1,
      rules: { 'no-dead-code': { severity: 'block' }, 'no-secrets': { severity: 'warn' } },
    });
    const { resolved } = await loadConfig(root);
    expect(resolved.get('no-dead-code')?.severity).toBe('block');
    expect(resolved.get('no-secrets')?.severity).toBe('warn');
  });

  it('keeps a block rule on block when nothing is overridden', async () => {
    await writeRules({ schemaVersion: 1, rules: {} });
    const { resolved } = await loadConfig(root);
    expect(resolved.get('no-secrets')?.severity).toBe('block');
  });
});
