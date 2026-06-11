/**
 * The write-a-prd skill — turn a fuzzy feature idea into a PRD through user
 * interview, codebase exploration and module design, then file it as a GitHub
 * issue. Completes the planning trio: plan-first (law), plan-interview
 * (stress-test), write-a-prd (formalize).
 * Inspired by Matt Pocock's `to-prd` (github.com/mattpocock/skills, MIT).
 */

export function prdSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-write-a-prd',
    'description: Create a PRD through user interview, codebase exploration, and module design, then submit it as a GitHub issue. Use when the user wants to write a PRD, create a product requirements document, or plan a new feature.',
    '---',
    '',
    '# Write a PRD',
    '',
    'Build the PRD with the user. You may skip steps you consider unnecessary.',
    '',
    '1. Ask the user for a long, detailed description of the problem they want to solve and any potential ideas for solutions.',
    '2. Explore the repo to verify their assertions and understand the current state of the codebase.',
    '3. Interview the user relentlessly about every aspect of the plan until you reach a shared understanding. Walk down each branch of the design tree, resolving dependencies between decisions one by one.',
    '4. Sketch the major modules to build or modify. Actively look for opportunities to extract deep modules that can be tested in isolation — a deep module (as opposed to a shallow one) encapsulates a lot of functionality behind a simple, testable interface that rarely changes. Check with the user that these modules match their expectations, and ask which modules they want tests written for.',
    '5. Once you have a complete understanding of the problem and solution, write the PRD with the template below and submit it as a GitHub issue (`gh issue create`).',
    '',
    '## PRD template',
    '',
    '```markdown',
    '## Problem Statement',
    "The problem the user is facing, from the user's perspective.",
    '',
    '## Solution',
    "The solution to the problem, from the user's perspective.",
    '',
    '## User stories',
    'The user stories.',
    '',
    '## Module design',
    'The major modules to build or modify; for each, its interface and whether it gets isolated tests.',
    '',
    '## Open questions',
    'Unresolved decisions and risks.',
    '```',
    '',
  ].join('\n');
}
