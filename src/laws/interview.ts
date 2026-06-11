/**
 * The plan-interview skill ("grill me") — companion to the plan-first law.
 * A plan is only robust once every branch of its decision tree has been
 * walked and resolved; this skill makes the agent do exactly that.
 * Inspired by Matt Pocock's `grill-me` (github.com/mattpocock/skills, MIT).
 */

export function interviewSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-plan-interview',
    'description: Interview the user relentlessly about a plan or design, reaching shared understanding by resolving each branch of the decision tree. Use when the user wants to stress-test a plan, get grilled on their design, or says "grill me".',
    '---',
    '',
    '# Plan interview — grill me',
    '',
    'Interview me about every aspect of this plan until we reach a shared understanding.',
    'Walk down each branch of the design tree, resolving dependencies between decisions one by one.',
    'Ask ONE question at a time; do not move to the next branch while an answer is still ambiguous.',
    'If a question can be answered by exploring the codebase, explore the codebase instead of asking.',
    'When every branch is resolved, write the outcome into PLAN.md and list the risks that remain open.',
    '',
  ].join('\n');
}
