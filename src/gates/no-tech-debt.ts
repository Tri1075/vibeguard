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

/** Markdown/rst: `#` means heading, not comment — scanning them is all noise. */
const DOC_EXT = /\.(md|mdx|markdown|rst)$/i;

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const markers = stringArrayParam(ctx.rule.params, 'markers', DEFAULT_MARKERS).filter((m) => m.trim());
  if (markers.length === 0) return []; // no markers configured → nothing to audit
  const ledger = await ctx.readText(relativeLedger(ctx));
  const ledgered = ledgeredPaths(ledger);
  const escaped = markers.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`\\b(${escaped.join('|')})\\b`);
  const findings: Finding[] = [];

  for (const file of ctx.files) {
    if (DOC_EXT.test(file)) continue;
    const source = await ctx.readText(file);
    if (source === null) continue;
    const kinds = classifyLines(source);
    const rawLines = source.split('\n');
    rawLines.forEach((raw, i) => {
      // The marker must live in a comment — a full-line comment, OR a trailing
      // comment of a code line, which is the most common form in practice.
      const commentText = kinds[i]?.comment ? raw : trailingComment(raw);
      if (commentText === null || !pattern.test(commentText)) return;
      if (ledgered.has(file)) return; // file is acknowledged in the ledger
      findings.push({
        rule: 'no-tech-debt',
        severity: 'medium',
        file,
        line: i + 1,
        message: `unledgered debt marker — "${commentText.trim().slice(0, 80)}"`,
        fix: `Either remove the shortcut, or record the debt: \`vibeguard debt add ${file} --reason "<why>"\` (the user must approve it).`,
      });
    });
  }
  return findings;
}

/**
 * The substring after the first inline comment opener that is NOT inside a
 * string literal, or null if none. The string-awareness keeps a `//` or `#`
 * sitting inside a quoted value (such as a marker-shaped test fixture) from
 * being misread as a real comment. ";" is intentionally not an opener: it ends
 * C-family statements far more often than it starts a comment.
 */
function trailingComment(raw: string): string | null {
  let quote: string | null = null;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (quote) {
      if (c === '\\')
        i++; // skip the escaped char
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      continue;
    }
    const two = raw.slice(i, i + 2);
    if (two === '//' || two === '/*' || two === '--' || c === '#') return raw.slice(i);
  }
  return null;
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
