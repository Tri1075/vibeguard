/**
 * Rule — robust-stack: the stack is a researched decision, not an accident.
 *
 * The law tells the agent to research the most robust option (maturity,
 * maintenance, security record) before adopting a framework or major library.
 * This gate checks the decision is auditable: once the project declares
 * dependencies (a manifest exists), a stack decision record must exist —
 * STACK.md or a "## Stack" section in the plan. Advisory by default.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { stringArrayParam } from './params.js';
import { DEFAULT_PLAN_FILES, STACK_HEADING, countNonBlankLines, findPlanFile } from './plan-docs.js';

const MANIFESTS = [
  'package.json',
  'requirements.txt',
  'pyproject.toml',
  'go.mod',
  'Cargo.toml',
  'Gemfile',
  'composer.json',
];

export const robustStack: Gate = {
  id: 'robust-stack',
  title: 'Stack choice is researched and recorded',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const tracked = new Set(ctx.files);
  const manifest = MANIFESTS.find((m) => tracked.has(m));
  if (!manifest) return [];

  const stackFiles = stringArrayParam(ctx.rule.params, 'stackFiles', ['STACK.md', 'docs/STACK.md']);
  const stackFile = stackFiles.find((f) => tracked.has(f));
  if (stackFile) {
    const text = await ctx.readText(stackFile);
    if (text !== null && countNonBlankLines(text) < 3) {
      return [
        {
          rule: 'robust-stack',
          severity: 'low',
          file: stackFile,
          message: 'stack record exists but is nearly empty',
          fix: 'Record each major choice: why it is the robust option, and which alternatives were considered.',
        },
      ];
    }
    return [];
  }

  const planFile = findPlanFile(ctx, stringArrayParam(ctx.rule.params, 'planFiles', DEFAULT_PLAN_FILES));
  if (planFile) {
    const plan = await ctx.readText(planFile);
    if (plan !== null && STACK_HEADING.test(plan)) return [];
  }

  return [
    {
      rule: 'robust-stack',
      severity: 'medium',
      file: manifest,
      message: 'dependencies declared but no stack decision record found',
      fix: `Research the most robust option for each major choice and record it (choice + alternatives considered) in STACK.md or a "## Stack" section of ${planFile ?? 'PLAN.md'}.`,
    },
  ];
}
