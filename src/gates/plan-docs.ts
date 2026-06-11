/**
 * Shared lookup for project planning documents, used by the plan-first and
 * robust-stack gates so both agree on what counts as "the plan".
 */
import type { GateContext } from '../core/types.js';

/** Files accepted as the project's action plan, in preference order. */
export const DEFAULT_PLAN_FILES = [
  'PLAN.md',
  'docs/PLAN.md',
  'PLANNING.md',
  'FRAMING.md',
  'ROADMAP.md',
];

/** Heading that marks a stack decision record inside a plan document. */
export const STACK_HEADING = /^#{1,3}\s+.*\bstack\b/im;

/** First plan file present in the tracked tree, or null. */
export function findPlanFile(ctx: GateContext, candidates: string[]): string | null {
  const tracked = new Set(ctx.files);
  return candidates.find((f) => tracked.has(f)) ?? null;
}

export function countHeadings(markdown: string): number {
  return markdown.split('\n').filter((l) => /^#{1,6}\s/.test(l)).length;
}

export function countNonBlankLines(text: string): number {
  return text.split('\n').filter((l) => l.trim() !== '').length;
}
