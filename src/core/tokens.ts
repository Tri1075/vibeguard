/**
 * Token-budget discipline (anti "dumb zone"). LLM attention degrades as context
 * fills, so we warn well before the window is full and force a handoff at 120K.
 * The estimate is deliberately simple (~4 chars/token) — exact enough to pace a
 * session, and host-agnostic.
 */

export const WARN_TOKENS = 100_000;
export const HANDOFF_TOKENS = 120_000;

export type ContextZone = 'smart' | 'warn' | 'handoff';

/** Rough token estimate for a blob of text/code. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Which zone a token count falls into. */
export function zoneFor(tokens: number): ContextZone {
  if (tokens >= HANDOFF_TOKENS) return 'handoff';
  if (tokens >= WARN_TOKENS) return 'warn';
  return 'smart';
}

/** One-line human advice for a zone. */
export function zoneAdvice(zone: ContextZone): string {
  switch (zone) {
    case 'handoff':
      return 'HAND OFF NOW: write HANDOFF.md and start a fresh session — you are in the dumb zone.';
    case 'warn':
      return 'Approaching the limit: finish the current step, start nothing new, prepare to hand off at 120K.';
    default:
      return 'Smart zone: keep the context lean.';
  }
}
