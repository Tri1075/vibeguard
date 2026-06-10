import { describe, expect, it } from 'vitest';
import { detectHost } from '../../src/core/hosts.js';
import { estimateTokens, zoneFor } from '../../src/core/tokens.js';
import { buildHandoffDoc } from '../../src/core/handoff.js';

describe('host detection', () => {
  it('maps CLI names to hosts', () => {
    expect(detectHost('claude')).toBe('claude-code');
    expect(detectHost('/usr/local/bin/claude')).toBe('claude-code');
    expect(detectHost('cursor')).toBe('cursor');
    expect(detectHost('aider')).toBe('generic');
  });
});

describe('token zones', () => {
  it('estimates ~4 chars per token and names the zone', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
    expect(zoneFor(50_000)).toBe('smart');
    expect(zoneFor(100_000)).toBe('warn');
    expect(zoneFor(120_000)).toBe('handoff');
  });
});

describe('handoff doc', () => {
  it('embeds the driftguard contract and changed files, with prose placeholders', () => {
    const doc = buildHandoffDoc({
      createdAt: '2026-06-10T00:00:00Z',
      task: 'fix auth',
      allowGlobs: ['src/auth/**'],
      driftStatus: 'clean',
      changedFiles: ['src/auth/login.ts'],
    });
    expect(doc).toContain('"fix auth"');
    expect(doc).toContain('src/auth/**');
    expect(doc).toContain('driftguard verdict: clean');
    expect(doc).toContain('src/auth/login.ts');
    expect(doc).toContain('## Next steps');
  });
});
