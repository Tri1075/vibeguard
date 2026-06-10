/**
 * Rule 1 — modules-small: keep modules small and single-purpose.
 *
 * The law tells the agent to split BEFORE 200 lines, by responsibility. This
 * gate measures code lines (non-blank, non-comment — so documentation is never
 * penalised) and flags catch-all module names that signal a missing boundary.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { countCodeLines } from '../core/comments.js';
import { numberParam } from './params.js';
import { isCodeFile } from '../core/langs.js';

const CATCH_ALL = /(^|\/)(utils?|helpers?|misc|common|stuff|shared)\.(ts|js|py|go|rs)$/i;

export const modulesSmall: Gate = {
  id: 'modules-small',
  title: 'Modules ≤ 200 code lines, single purpose',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const maxLines = numberParam(ctx.rule.params, 'maxLines', 200);
  const warnAt = numberParam(ctx.rule.params, 'warnAt', Math.round(maxLines * 0.8));
  const findings: Finding[] = [];

  for (const file of ctx.files) {
    if (!isCodeFile(file)) continue;
    const source = await ctx.readText(file);
    if (source === null) continue;

    const lines = countCodeLines(source);
    if (lines >= maxLines) {
      findings.push({
        rule: 'modules-small',
        severity: 'high',
        file,
        message: `${lines} code lines (limit ${maxLines}) — module is too big`,
        fix: `Split by responsibility into smaller modules. Never raise the limit yourself; that is an owner decision (edit .vibeguard/rules.json).`,
      });
    } else if (lines >= warnAt) {
      findings.push({
        rule: 'modules-small',
        severity: 'low',
        file,
        message: `${lines} code lines (approaching the ${maxLines} limit)`,
        fix: `Split now, before you hit the limit — extract the next responsibility into its own module.`,
      });
    }

    if (CATCH_ALL.test(file) && lines > 40) {
      findings.push({
        rule: 'modules-small',
        severity: 'medium',
        file,
        message: `catch-all module name — "${file}" likely mixes unrelated responsibilities`,
        fix: `Rename to a single-purpose name and split its exports by what they actually do.`,
      });
    }
  }
  return findings;
}
