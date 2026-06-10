import { describe, expect, it } from 'vitest';
import { noDeadCode } from '../../src/gates/no-dead-code.js';
import { errorHandling } from '../../src/gates/error-handling.js';
import type { GateContext, ResolvedRule } from '../../src/core/types.js';

/** In-memory GateContext (same shape as gates.test.ts). */
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

describe('no-dead-code: commented-out code', () => {
  it('flags a run of disabled code, not prose comments', async () => {
    const disabled = ['// const a = compute();', '// if (a > 2) {', '//   send(a);', '// }', 'live();'].join(
      '\n',
    );
    const prose = [
      '// This module handles the billing flow.',
      '// It is intentionally small.',
      'live();',
    ].join('\n');
    const f1 = await noDeadCode.run(ctx({ 'a.ts': disabled }));
    const f2 = await noDeadCode.run(ctx({ 'b.ts': prose }));
    expect(f1.some((f) => f.message.includes('commented-out code'))).toBe(true);
    expect(f2).toHaveLength(0);
  });
});

describe('no-dead-code: unused exports', () => {
  const lib = 'export function used() {}\nexport function dead() {}\nexport interface Shape { x: number }\n';

  it('flags a value export nobody imports; types are exempt by default', async () => {
    const app = "import { used } from './lib.js';\nused();\n";
    const f = await noDeadCode.run(ctx({ 'src/lib.ts': lib, 'src/app.ts': app }));
    expect(f.map((x) => x.message)).toEqual([expect.stringContaining('"dead"')]);
  });

  it('multi-line imports (formatter-wrapped) count as usage', async () => {
    const app = "import {\n  used,\n  dead,\n} from './lib.js';\nused();\ndead();\n";
    const f = await noDeadCode.run(ctx({ 'src/lib.ts': lib, 'src/app.ts': app }));
    expect(f).toHaveLength(0);
  });

  it('re-export from an entry point counts as usage', async () => {
    const index = "export { dead } from './lib.js';\n";
    const f = await noDeadCode.run(ctx({ 'src/lib.ts': lib, 'src/index.ts': index }));
    expect(f.filter((x) => x.message.includes('"dead"'))).toHaveLength(0);
  });

  it('entry points themselves are never reported', async () => {
    const f = await noDeadCode.run(ctx({ 'src/index.ts': 'export function orphan() {}\n' }));
    expect(f).toHaveLength(0);
  });
});

describe('error-handling', () => {
  it('flags an empty catch (single and multi-line) and an empty promise catch', async () => {
    const code = [
      'try { go(); } catch {}',
      'try { go(); } catch (e) {',
      '}',
      'fetchData().catch(() => {});',
    ].join('\n');
    const f = await errorHandling.run(ctx({ 'a.ts': code }));
    expect(f.filter((x) => x.message.includes('empty catch'))).toHaveLength(2);
    expect(f.filter((x) => x.message.includes('promise'))).toHaveLength(1);
    expect(f.every((x) => x.severity === 'high')).toBe(true);
  });

  it('a comment-only catch documents intent and passes', async () => {
    const code = 'try { go(); } catch {\n  /* config may be absent — fail open */\n}\n';
    const f = await errorHandling.run(ctx({ 'a.ts': code }));
    expect(f).toHaveLength(0);
  });

  it('mentions of catch patterns in comments and strings do not trigger', async () => {
    const code = "// never write catch {} in real code\nconst doc = 'avoid catch';\nrun();\n";
    const f = await errorHandling.run(ctx({ 'a.ts': code }));
    expect(f).toHaveLength(0);
  });

  it('flags Python except: pass, accepts except with a real body', async () => {
    const bad = 'try:\n    go()\nexcept ValueError:\n    pass\n';
    const ok = 'try:\n    go()\nexcept ValueError:\n    log.warning("retrying")\n    retry()\n';
    expect(await errorHandling.run(ctx({ 'a.py': bad }))).toHaveLength(1);
    expect(await errorHandling.run(ctx({ 'b.py': ok }))).toHaveLength(0);
  });
});
