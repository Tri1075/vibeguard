import { describe, expect, it } from 'vitest';
import { detectHost, hostById, HOSTS } from '../../src/core/hosts.js';
import { estimateTokens, zoneFor } from '../../src/core/tokens.js';
import { buildHandoffDoc } from '../../src/core/handoff.js';

describe('host detection', () => {
  it('maps CLI names to hosts', () => {
    expect(detectHost('claude')).toBe('claude-code');
    expect(detectHost('/usr/local/bin/claude')).toBe('claude-code');
    expect(detectHost('cursor')).toBe('cursor');
    expect(detectHost('aider')).toBe('generic');
  });

  it('knows all eight supported hosts, basename and case included', () => {
    expect(detectHost('cursor-agent')).toBe('cursor');
    expect(detectHost('codex')).toBe('codex');
    expect(detectHost('opencode')).toBe('opencode');
    expect(detectHost('hermes')).toBe('hermes');
    expect(detectHost('/opt/google/gemini')).toBe('gemini');
    expect(detectHost('Antigravity')).toBe('antigravity');
    expect(detectHost('kiro')).toBe('kiro');
  });

  it('every named host has an emission kind and an enforcement level', () => {
    for (const host of HOSTS) {
      expect(['claude-skill', 'cursor-rules', 'agents-md']).toContain(host.emit);
      expect(['in-session', 'finish-line']).toContain(host.live);
    }
    // Unknown CLIs still get the law via the AGENTS.md standard.
    expect(hostById(detectHost('some-future-agent')).emit).toBe('agents-md');
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
