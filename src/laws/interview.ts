/**
 * The plan-interview skill ("grill me") — companion to the plan-first law.
 * A plan is only robust once every branch of its decision tree has been walked
 * and resolved AGAINST the code that already exists — and once the shared
 * understanding is written down, not left in the chat. Inspired by Matt
 * Pocock's `grill-with-docs`, the evolution of his `grill-me`
 * (github.com/mattpocock/skills, MIT).
 */

export function interviewSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-plan-interview',
    'description: Grill a plan or design against the codebase\'s domain model — resolve every branch, pin down the shared vocabulary, and capture the outcome in CONTEXT.md and short ADRs as you go. Use when the user wants to stress-test a plan, get grilled, or says "grill me".',
    '---',
    '',
    '# Grill me — against the domain model',
    '',
    'Interview me until we reach a shared understanding, grounded in the code that already exists — not in a vacuum.',
    '',
    '1. First read the domain model: CONTEXT.md if present, the core modules, and the names the code already uses. Grill against what IS.',
    '2. Walk each branch of the design tree, ONE question at a time; never advance while an answer is ambiguous. If the code can answer a question, explore it instead of asking.',
    '3. Sharpen terminology as we go: when a word is used vaguely, or differently from the code, stop and pin down ONE meaning. Shared vocabulary is the point.',
    '4. Persist understanding LIVE, not at the end: update CONTEXT.md with the agreed domain language, and record each significant choice as a short ADR (context → decision → consequence).',
    '5. Finish by updating PLAN.md and listing the risks that remain open.',
    '',
  ].join('\n');
}
