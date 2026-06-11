import { describe, expect, it } from 'vitest';
import { planFirst } from '../../src/gates/plan-first.js';
import { robustStack } from '../../src/gates/robust-stack.js';
import { skillMarkdown, protocolMarkdown } from '../../src/laws/skill.js';
import { EXTRA_SKILLS } from '../../src/laws/extra-skills.js';
import { buildHandoffDoc } from '../../src/core/handoff.js';
import { estimateTokens } from '../../src/core/tokens.js';
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

const SOLID_PLAN = [
  '# Plan',
  '## Goal',
  'Ship the thing.',
  '## Milestones',
  '1. scaffold',
  '2. core',
  '3. polish',
  '## Risks',
  '- scope creep',
  '## Validation',
  '- tests green per milestone',
  ...Array.from({ length: 8 }, (_, i) => `- detail ${i}`),
].join('\n');

describe('plan-first', () => {
  it('flags a project with no plan file', async () => {
    const f = await planFirst.run(ctx({ 'src/a.ts': 'live();' }));
    expect(f).toHaveLength(1);
    expect(f[0]?.severity).toBe('medium');
    expect(f[0]?.message).toContain('no action plan');
  });

  it('accepts a substantial PLAN.md', async () => {
    const f = await planFirst.run(ctx({ 'PLAN.md': SOLID_PLAN, 'src/a.ts': 'live();' }));
    expect(f).toHaveLength(0);
  });

  it('flags a thin plan as low severity', async () => {
    const f = await planFirst.run(ctx({ 'PLAN.md': '# Plan\ndo stuff\n' }));
    expect(f).toHaveLength(1);
    expect(f[0]?.severity).toBe('low');
    expect(f[0]?.message).toContain('thin');
  });

  it('accepts alternate plan files (FRAMING.md) and stays silent on empty trees', async () => {
    const f1 = await planFirst.run(ctx({ 'FRAMING.md': SOLID_PLAN }));
    const f2 = await planFirst.run(ctx({}));
    expect(f1).toHaveLength(0);
    expect(f2).toHaveLength(0);
  });
});

describe('robust-stack', () => {
  it('flags declared dependencies without a stack decision record', async () => {
    const f = await robustStack.run(ctx({ 'package.json': '{}', 'src/a.ts': 'x' }));
    expect(f).toHaveLength(1);
    expect(f[0]?.severity).toBe('medium');
    expect(f[0]?.file).toBe('package.json');
  });

  it('is silent when there is no manifest at all', async () => {
    const f = await robustStack.run(ctx({ 'src/a.ts': 'x' }));
    expect(f).toHaveLength(0);
  });

  it('accepts STACK.md with substance, flags a near-empty one', async () => {
    const good = await robustStack.run(
      ctx({ 'package.json': '{}', 'STACK.md': '# Stack\n- TS: mature, typed\n- vitest: standard\n' }),
    );
    const thin = await robustStack.run(ctx({ 'package.json': '{}', 'STACK.md': '# Stack\n' }));
    expect(good).toHaveLength(0);
    expect(thin).toHaveLength(1);
    expect(thin[0]?.severity).toBe('low');
  });

  it('accepts a "## Stack" section inside the plan file', async () => {
    const plan = `${SOLID_PLAN}\n## Stack\n- node: boring and proven\n`;
    const f = await robustStack.run(ctx({ 'package.json': '{}', 'FRAMING.md': plan }));
    expect(f).toHaveLength(0);
  });
});

describe('token economy: emitted artifacts stay within budget', () => {
  // These budgets are a contract: agents pay for every emitted token at each
  // session start. Raising a budget is an owner decision, not a side effect.
  it('rules skill ≤ 1100 tokens', () => {
    expect(estimateTokens(skillMarkdown())).toBeLessThanOrEqual(1100);
  });
  it('host-agnostic protocol ≤ 1100 tokens', () => {
    expect(estimateTokens(protocolMarkdown())).toBeLessThanOrEqual(1100);
  });
  it.each(EXTRA_SKILLS.map((s) => [s.name, s] as const))('%s stays within its budget', (_name, s) => {
    expect(estimateTokens(s.markdown())).toBeLessThanOrEqual(s.budgetTokens);
  });
  it('handoff template ≤ 300 tokens', () => {
    const doc = buildHandoffDoc({
      createdAt: '2026-06-11T00:00:00Z',
      task: 'demo task',
      allowGlobs: ['src/**'],
      driftStatus: 'clean',
      changedFiles: ['src/a.ts', 'src/b.ts'],
    });
    expect(estimateTokens(doc)).toBeLessThanOrEqual(300);
  });
});
