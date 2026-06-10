import { describe, expect, it } from 'vitest';
import { modulesSmall } from '../../src/gates/modules-small.js';
import { noSecrets } from '../../src/gates/no-secrets.js';
import { secureCode } from '../../src/gates/secure-code.js';
import { noTechDebt } from '../../src/gates/no-tech-debt.js';
import type { GateContext, ResolvedRule } from '../../src/core/types.js';

/** Build a GateContext backed by an in-memory file map. */
function ctx(files: Record<string, string>, params: Record<string, unknown> = {}): GateContext {
  const rule: ResolvedRule = { id: 'x', enabled: true, severity: 'block', params, ignore: [] };
  return {
    root: '/fake',
    files: Object.keys(files),
    rule,
    readText: (rel) => Promise.resolve(files[rel] ?? null),
    paths: {
      root: '/fake',
      dir: '/fake/.vibeguard',
      rulesFile: '/fake/.vibeguard/rules.json',
      instructionsDir: '/fake/.vibeguard/instructions',
      debtFile: '/fake/.vibeguard/debt.md',
      depsBaselineFile: '/fake/.vibeguard/deps-baseline.json',
    },
  };
}

describe('modules-small', () => {
  it('flags a file over the limit, warns near it, passes a small one', async () => {
    const big = `const x = ${'1'};\n`.repeat(205);
    const near = 'const x = 1;\n'.repeat(170);
    const small = 'const x = 1;\n'.repeat(10);
    const f = await modulesSmall.run(ctx({ 'a.ts': big, 'b.ts': near, 'c.ts': small }));
    const byFile = Object.fromEntries(f.map((x) => [x.file, x]));
    expect(byFile['a.ts']?.severity).toBe('high');
    expect(byFile['b.ts']?.severity).toBe('low');
    expect(byFile['c.ts']).toBeUndefined();
  });

  it('does not count comments toward the limit', async () => {
    const commentHeavy = `${'// doc line\n'.repeat(300)}const x = 1;\n`;
    const f = await modulesSmall.run(ctx({ 'a.ts': commentHeavy }));
    expect(f).toHaveLength(0); // 1 code line — documentation is free
  });

  it('flags catch-all module names', async () => {
    const f = await modulesSmall.run(ctx({ 'src/utils.ts': 'export const a=1;\n'.repeat(50) }));
    expect(f.some((x) => x.message.includes('catch-all'))).toBe(true);
  });
});

describe('no-secrets', () => {
  it('flags an AWS key and a generic high-entropy secret, respects the pragma', async () => {
    const code = [
      'const a = "AKIAIOSFODNN7EXAMPLE";',
      'const password = "p8F!kZ2qWvR9xL4m";',
      'const ok = "AKIAIOSFODNN7EXAMPLE"; // vibeguard-allow test fixture',
    ].join('\n');
    const f = await noSecrets.run(ctx({ 'a.ts': code }));
    expect(f).toHaveLength(2);
    expect(f.every((x) => x.severity === 'critical')).toBe(true);
  });

  it('skips documentation files', async () => {
    const f = await noSecrets.run(ctx({ 'README.md': 'example: AKIAIOSFODNN7EXAMPLE' }));
    expect(f).toHaveLength(0);
  });
});

describe('secure-code', () => {
  it('flags eval, disabled TLS (critical) and innerHTML', async () => {
    const code = [
      'eval(userInput);',
      'fetch(u, { rejectUnauthorized: false });',
      'el.innerHTML = data;',
    ].join('\n');
    const f = await secureCode.run(ctx({ 'a.ts': code }));
    expect(f.find((x) => x.message.includes('TLS'))?.severity).toBe('critical');
    expect(f.some((x) => x.message.includes('eval'))).toBe(true);
    expect(f.some((x) => x.message.includes('XSS'))).toBe(true);
  });

  it('ignores non-code files', async () => {
    const f = await secureCode.run(ctx({ 'notes.md': 'eval(x)' }));
    expect(f).toHaveLength(0);
  });
});

describe('no-tech-debt', () => {
  it('flags an unledgered TODO but not a ledgered file', async () => {
    const base = { 'a.ts': '// TODO fix this\nrun();', 'b.ts': '// FIXME later\nrun();' };
    const c = ctx(base);
    c.readText = (rel) =>
      Promise.resolve(
        rel === '.vibeguard/debt.md'
          ? '- `b.ts` — known, 2026-06-10'
          : (base[rel as keyof typeof base] ?? null),
      );
    const f = await noTechDebt.run(c);
    expect(f.map((x) => x.file)).toEqual(['a.ts']);
  });
});
