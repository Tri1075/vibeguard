/**
 * Registry of the companion skills emitted alongside the rules skill on
 * Claude Code. Several are inspired by Matt Pocock's public skills collection
 * (github.com/mattpocock/skills, MIT) — credit where credit is due. Each
 * carries a locked token budget, asserted by the test suite.
 */
import { interviewSkillMarkdown } from './interview.js';
import { prdSkillMarkdown } from './prd.js';
import { toIssuesSkillMarkdown } from './to-issues.js';
import { tddSkillMarkdown } from './tdd.js';
import { diagnoseSkillMarkdown } from './diagnose.js';
import { cavemanSkillMarkdown } from './caveman.js';

export interface ExtraSkill {
  /** skill name; also the emitted directory: .claude/skills/<name>/SKILL.md */
  name: string;
  markdown: () => string;
  /** maximum emitted size, in estimated tokens (owner-locked) */
  budgetTokens: number;
}

export const EXTRA_SKILLS: ExtraSkill[] = [
  { name: 'vibeguard-plan-interview', markdown: interviewSkillMarkdown, budgetTokens: 250 },
  { name: 'vibeguard-write-a-prd', markdown: prdSkillMarkdown, budgetTokens: 600 },
  { name: 'vibeguard-to-issues', markdown: toIssuesSkillMarkdown, budgetTokens: 350 },
  { name: 'vibeguard-tdd', markdown: tddSkillMarkdown, budgetTokens: 350 },
  { name: 'vibeguard-diagnose', markdown: diagnoseSkillMarkdown, budgetTokens: 350 },
  { name: 'vibeguard-caveman', markdown: cavemanSkillMarkdown, budgetTokens: 200 },
];
