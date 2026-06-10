/**
 * Rule 2 — no-tech-debt: no silent technical debt.
 *
 * The law makes the agent WARN the user before introducing debt. This gate is
 * the audit: every debt marker (configurable; the defaults are listed in
 * DEFAULT_MARKERS below) must have a matching entry in the debt ledger
 * (.vibeguard/debt.md). An unledgered marker means debt slipped in — red.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { classifyLines } from '../core/comments.js';
import { stringArrayParam } from './params.js';

const DEFAULT_MARKERS = ['TODO', 'FIXME', 'HACK', 'XXX'];

export const noTechDebt: Gate = {
  id: 'no-tech-debt',
  title: 'No silent technical debt (markers must be ledgered)',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const markers = stringArrayParam(ctx.rule.params, 'markers', DEFAULT_MARKERS);
  const ledger = await ctx.readText(relativeLedger(ctx));
  const ledgered = ledgeredPaths(ledger);
  const pattern = new RegExp(`\\b(${markers.join('|')})\\b`);
  const findings: Finding[] = [];

  for (const file of ctx.files) {
    const source = await ctx.readText(file);
    if (source === null) continue;
    const lines = classifyLines(source);
    lines.forEach((line, i) => {
      if (!line.comment || !pattern.test(line.text)) return;
      if (ledgered.has(file)) return; // file is acknowledged in the ledger
      findings.push({
        rule: 'no-tech-debt',
        severity: 'medium',
        file,
        line: i + 1,
        message: `unledgered debt marker — "${line.text.slice(0, 80)}"`,
        fix: `Either remove the shortcut, or record the debt: \`vibeguard debt add ${file} --reason "<why>"\` (the user must approve it).`,
      });
    });
  }
  return findings;
}

/** Relative path of the ledger, for ctx.readText. */
function relativeLedger(ctx: GateContext): string {
  return ctx.paths.debtFile.slice(ctx.root.length + 1);
}

/** File paths mentioned in the ledger (markdown list entries reference a path). */
function ledgeredPaths(ledger: string | null): Set<string> {
  const out = new Set<string>();
  if (!ledger) return out;
  for (const line of ledger.split('\n')) {
    const match = line.match(/`([^`]+)`/);
    if (match?.[1]) out.add(match[1]);
  }
  return out;
}
