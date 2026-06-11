/**
 * The to-issues skill — break a plan or PRD into independently-grabbable
 * GitHub issues, sliced vertically. Step 3 of the planning pipeline:
 * plan-first → plan-interview → write-a-prd → to-issues → tdd.
 * Inspired by Matt Pocock's `to-issues` (github.com/mattpocock/skills, MIT).
 */

export function toIssuesSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-to-issues',
    'description: Break a plan, spec, or PRD into independently-grabbable GitHub issues using vertical slices. Use when the user wants to turn a plan or PRD into issues, split work into tasks, or says "to issues".',
    '---',
    '',
    '# To issues',
    '',
    'Turn the plan/PRD into GitHub issues the team (or the next agent session) can grab independently.',
    '',
    '1. Slice VERTICALLY: each issue delivers a thin end-to-end piece of user-visible value — never "the backend part" then "the frontend part".',
    '2. Make each issue self-contained: context, acceptance criteria, and which tests prove it done. A reader should need nothing else open.',
    '3. Order by dependency; mark the issues that unblock others.',
    '4. Show the user the slicing and adjust before filing anything.',
    '5. File with `gh issue create`, linking back to the PRD issue.',
    '',
  ].join('\n');
}
