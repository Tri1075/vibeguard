/**
 * Rule — plan-first: a project starts with a robust action plan, not code.
 *
 * The law tells the agent to propose the plan (goal, ordered milestones,
 * risks, validation) before the first implementation step. This gate checks
 * the plan actually exists and is not an empty gesture. Advisory by default:
 * the agent writing the plan must be able to start, so a missing plan must
 * never lock the wrapper out (the owner can promote the rule to `block`).
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { numberParam, stringArrayParam } from './params.js';
import { DEFAULT_PLAN_FILES, countHeadings, countNonBlankLines, findPlanFile } from './plan-docs.js';

export const planFirst: Gate = {
  id: 'plan-first',
  title: 'A robust action plan exists and has substance',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  if (ctx.files.length === 0) return [];
  const candidates = stringArrayParam(ctx.rule.params, 'planFiles', DEFAULT_PLAN_FILES);
  const minSections = numberParam(ctx.rule.params, 'minSections', 3);
  const minLines = numberParam(ctx.rule.params, 'minLines', 15);

  const planFile = findPlanFile(ctx, candidates);
  if (planFile === null) {
    return [
      {
        rule: 'plan-first',
        severity: 'medium',
        file: candidates[0] ?? 'PLAN.md',
        message: 'no action plan found — building without a plan invites drift',
        fix: `Propose a robust plan (goal, ordered milestones, risks, validation per milestone) and save it as ${candidates[0] ?? 'PLAN.md'}.`,
      },
    ];
  }

  const text = await ctx.readText(planFile);
  if (text === null) {
    // Listed but unreadable (deleted mid-run, binary, oversized): for this
    // rule that IS a missing plan — never a silent pass.
    return [
      {
        rule: 'plan-first',
        severity: 'medium',
        file: planFile,
        message: 'the plan file cannot be read — building without a plan invites drift',
        fix: `Restore a readable plan at ${planFile} (goal, ordered milestones, risks, validation per milestone).`,
      },
    ];
  }

  const sections = countHeadings(text);
  const lines = countNonBlankLines(text);
  if (sections < minSections || lines < minLines) {
    return [
      {
        rule: 'plan-first',
        severity: 'low',
        file: planFile,
        message: `plan looks thin (${sections} section(s), ${lines} non-blank line(s))`,
        fix: 'Flesh the plan out: goal, ordered milestones, risks, and how each milestone is validated.',
      },
    ];
  }
  return [];
}
