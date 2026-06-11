/**
 * Compile the nine laws into agent-facing artifacts: a Claude Code SKILL.md
 * and a host-agnostic protocol block (for .cursor/rules or AGENTS.md). Same
 * content, two wrappers — one source so the rules never drift between hosts.
 * Every line is paid in tokens at each session start: keep it compressed.
 */
import { LAWS } from './texts.js';

const PREAMBLE = [
  'Engineering rules for this project (vibeguard-pack). Apply them to every change. driftguard verifies',
  'and blocks drift; the session discipline below avoids the degraded end-of-context zone.',
  '',
  '## Session discipline (anti "dumb zone")',
  'At ~100K tokens: finish the current step, start nothing new. At 120K: STOP — write HANDOFF.md (state,',
  'decisions & why, files touched, next steps, traps, driftguard verdict) and ask the user for a fresh',
  'session. driftguard carries scope and baseline across, so the new session inherits the contract.',
  '',
  '## The rules',
].join('\n');

const NO_EXCUSES = [
  '',
  '## No excuses',
  'Common rationalizations — all invalid:',
  '- "No time to plan, the task is clear" → if it were clear, the plan would take two minutes. Write it.',
  '- "This popular new framework will be fine" → robust means proven. Record why, or pick boring.',
  '- "This file is cohesive, the limit doesn\'t apply" → split by responsibility; the limit is the owner\'s, not yours.',
  '- "It\'s just a quick hack for now" → that is debt. Warn the user first, ledger it, or don\'t do it.',
  '- "Everyone uses this package" → popularity is not approval. Ask first.',
  '- "It\'s only a test key" → test keys leak too. No secret in code, ever.',
  '- "Input validation can come later" → later never comes. Secure now or warn now.',
  '- "I\'ll keep the old code commented out just in case" → git remembers. Delete it.',
  '- "This catch can stay empty, failure is unlikely" → unlikely failures are the ones that hurt. Handle or propagate.',
].join('\n');

const CLOSING = [
  '',
  '## Enforcement',
  '`vibeguard check` runs these rules as driftguard probes: a rule going green→red is a REGRESSION that',
  'blocks the end of your turn until you self-correct. Never edit .vibeguard/** (owner-only).',
].join('\n');

function rulesBlock(): string {
  return LAWS.map((law, i) => `${i + 1}. **${law.title}** — ${law.body}`).join('\n\n');
}

/** Claude Code skill form (frontmatter + body). */
export function skillMarkdown(): string {
  return [
    '---',
    'name: vibeguard',
    'description: Essential engineering rules every change must follow — plan first, robust stack, small single-purpose modules, no silent debt, dependency hygiene, no secrets, secure code, no dead code, error handling. Plus the 120K-token handoff discipline.',
    '---',
    '',
    `# vibeguard — engineering rules (mandatory)`,
    '',
    PREAMBLE,
    '',
    rulesBlock(),
    NO_EXCUSES,
    CLOSING,
    '',
  ].join('\n');
}

/** Host-agnostic protocol (for .cursor/rules, AGENTS.md, any system prompt). */
export function protocolMarkdown(): string {
  return [
    '# vibeguard — engineering rules (mandatory)',
    '',
    PREAMBLE,
    '',
    rulesBlock(),
    NO_EXCUSES,
    CLOSING,
    '',
  ].join('\n');
}
