/**
 * Precision regression tests for the audit fixes: the text-scanning blocking
 * gates must stop firing on mentions (French "des", method .eval(), JS
 * delete-with-concat, Markdown headings) while still catching real issues.
 */
import { describe, expect, it } from 'vitest';
import { secureCode } from '../../src/gates/secure-code.js';
import { noTechDebt } from '../../src/gates/no-tech-debt.js';
import { noSecrets } from '../../src/gates/no-secrets.js';
import type { GateContext, ResolvedRule } from '../../src/core/types.js';

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

describe('secure-code: no longer fires on mentions', () => {
  it('ignores the French word "des", method .eval(), and delete-with-concat', async () => {
    const f = await secureCode.run(
      ctx({
        'a.ts': '// liste des utilisateurs\nconst m = model.eval();\ndelete cache["a" + key];\n',
      }),
    );
    expect(f).toHaveLength(0);
  });

  it('still flags real eval(), uppercase DES, and quoted SQL concatenation', async () => {
    const evalF = await secureCode.run(ctx({ 'a.ts': 'eval(userInput);\n' }));
    const desF = await secureCode.run(ctx({ 'b.ts': 'const c = crypto.createCipheriv("DES", k, iv);\n' }));
    const sqlF = await secureCode.run(ctx({ 'c.ts': 'db.query("SELECT * FROM users WHERE id = " + id);\n' }));
    expect(evalF.some((x) => x.message.includes('dynamic code execution'))).toBe(true);
    expect(desF.some((x) => x.message.includes('DES'))).toBe(true);
    expect(sqlF.some((x) => x.message.includes('SQL'))).toBe(true);
  });

  it('does not flag a dangerous pattern that only appears in a comment', async () => {
    const f = await secureCode.run(ctx({ 'a.ts': '// never call eval(x) here\nconst y = 1;\n' }));
    expect(f).toHaveLength(0);
  });
});

describe('no-tech-debt: trailing comments and markdown', () => {
  it('flags a marker in a trailing comment', async () => {
    const f = await noTechDebt.run(ctx({ 'a.ts': 'doWork(); // TODO wire this up\n' }));
    expect(f.some((x) => x.message.includes('debt marker'))).toBe(true);
  });

  it('flags a Python trailing-hash marker but not a Markdown heading', async () => {
    const py = await noTechDebt.run(ctx({ 'a.py': 'x = 1  # FIXME later\n' }));
    const md = await noTechDebt.run(ctx({ 'README.md': '# TODO roadmap\n\n- ship it\n' }));
    expect(py).toHaveLength(1);
    expect(md).toHaveLength(0);
  });

  it('treats an empty markers list as "disabled", not "match everything"', async () => {
    const f = await noTechDebt.run(ctx({ 'a.ts': '// just a normal comment\n' }, { markers: [] }));
    expect(f).toHaveLength(0);
  });
});

describe('no-secrets: env files', () => {
  it('flags an unquoted credential in a .env, not in a .env.example', async () => {
    const real = await noSecrets.run(ctx({ '.env': 'DB_PASSWORD=hunter2hunter2x9\n' }));
    const tmpl = await noSecrets.run(ctx({ '.env.example': 'DB_PASSWORD=your-password-here\n' }));
    expect(real).toHaveLength(1);
    expect(tmpl).toHaveLength(0);
  });

  it('scans .env.local and catches a fine-grained GitHub PAT', async () => {
    const f = await noSecrets.run(ctx({ '.env.local': `GH=github_pat_${'A'.repeat(30)}\n` }));
    expect(f.some((x) => x.message.includes('PAT'))).toBe(true);
  });
});
