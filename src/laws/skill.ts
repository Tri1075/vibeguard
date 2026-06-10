/**
 * Compile the seven laws into agent-facing artifacts: a Claude Code SKILL.md
 * and a host-agnostic protocol block (for .cursor/rules or AGENTS.md). Same
 * content, two wrappers — one source so the rules never drift between hosts.
 */
import { LAWS } from './texts.js';

const PREAMBLE = [
  'This project is governed by vibeguard-pack. Follow these engineering rules on every change.',
  'They pair with driftguard (which verifies and blocks drift) and the 120K-token handoff discipline below.',
  '',
  '## Session discipline (anti "dumb zone")',
  'LLM attention degrades as context fills. At ~100K tokens, finish the current step and start nothing new.',
  'At 120K tokens, STOP: write HANDOFF.md (task & scope state, decisions and why, files touched, next steps,',
  'traps, the driftguard verdict) and ask the user to start a fresh session. driftguard keeps the scope and',
  'baseline across the handoff, so the new session inherits the contract.',
  '',
  '## The rules',
].join('\n');

const CLOSING = [
  '',
  '## Enforcement',
  'These rules are checked by `vibeguard check` and registered as driftguard probes: a rule going from green',
  'to red is a REGRESSION and blocks you at the end of your turn until you self-correct. You may NOT edit',
  '.vibeguard/** (owner-only) to loosen a rule.',
].join('\n');

function rulesBlock(): string {
  return LAWS.map((law, i) => `${i + 1}. **${law.title}** — ${law.body}`).join('\n\n');
}

/** Claude Code skill form (frontmatter + body). */
export function skillMarkdown(): string {
  return [
    '---',
    'name: vibeguard',
    'description: Essential engineering rules every change must follow — small single-purpose modules, no silent debt, dependency hygiene, no secrets, secure code, no dead code, error handling. Plus the 120K-token handoff discipline.',
    '---',
    '',
    `# vibeguard — engineering rules (mandatory)`,
    '',
    PREAMBLE,
    '',
    rulesBlock(),
    CLOSING,
    '',
  ].join('\n');
}

/** Host-agnostic protocol (for .cursor/rules, AGENTS.md, any system prompt). */
export function protocolMarkdown(): string {
  return ['# vibeguard — engineering rules (mandatory)', '', PREAMBLE, '', rulesBlock(), CLOSING, ''].join(
    '\n',
  );
}
