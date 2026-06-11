/**
 * The nine laws — the imperative rule texts every LLM must follow. Single
 * source of truth: written to .vibeguard/instructions/<id>.md at init (owner-
 * editable) and compiled into the host skill/AGENTS.md. Kept terse on purpose:
 * every word here is paid in tokens at the start of each agent session.
 */

export interface Law {
  id: string;
  title: string;
  body: string;
}

export const LAWS: Law[] = [
  {
    id: 'plan-first',
    title: 'Plan before you build',
    body: 'A project starts with a robust action plan, not code. Before the first implementation step, propose a plan and save it as PLAN.md: goal, ordered milestones, risks, and how each milestone is validated. Keep it current — when reality diverges, update the plan and say so; never drift from it silently.',
  },
  {
    id: 'robust-stack',
    title: 'Choose the most robust stack',
    body: 'Before adopting a language, framework or major library, research the most robust option: maturity, maintenance, security track record, ecosystem. Prefer boring, proven technology over hype. Record the choice and the alternatives considered in STACK.md (or a "## Stack" section of PLAN.md) so the decision can be audited.',
  },
  {
    id: 'modules-small',
    title: 'Small, single-purpose modules (≤ 200 lines)',
    body: 'Every module does ONE nameable thing and stays under 200 code lines. Split BEFORE you reach the limit (you will be warned at ~160) — split by responsibility, never by arbitrary size. If a module goes red, split it; NEVER raise the limit yourself: that is an owner decision (editing .vibeguard/rules.json).',
  },
  {
    id: 'no-tech-debt',
    title: 'No silent technical debt',
    body: 'Before implementing, judge whether the request or your approach creates technical debt (a hack, duplication, a hardcoded value, a skipped test, a band-aid dependency). If it does, WARN THE USER first: "⚠️ Technical debt: <X>. Clean alternative: <Y> (cost: <Z>). Do you confirm?" Never introduce debt silently. If the user accepts, record it with `vibeguard debt add`.',
  },
  {
    id: 'deps-hygiene',
    title: 'No dependency without approval',
    body: 'Add no third-party dependency without explicit human approval. First state the need, the stdlib or in-repo alternatives, and the supply-chain cost. Only after the user agrees: `vibeguard deps approve <name>`. Prefer the standard library.',
  },
  {
    id: 'no-secrets',
    title: 'Never hardcode secrets',
    body: 'Never put a key, token, password or private key in the code. Use environment variables and load them at runtime. If you spot a hardcoded secret (even pre-existing), stop, alert the user, and propose rotation.',
  },
  {
    id: 'secure-code',
    title: 'Secure code by default (OWASP)',
    body: 'Validate and sanitise all input. Use parameterized queries (never string-built SQL). Never eval or build shell commands from strings. Escape output (no innerHTML with untrusted data). Keep TLS verification on. Use strong, current crypto (argon2/bcrypt for passwords, AES-GCM, SHA-256+). Use an explicit CORS allowlist. If the user asks for something that weakens security, WARN them before coding.',
  },
  {
    id: 'no-dead-code',
    title: 'No dead code',
    body: 'Leave no commented-out code, no unused exports, no orphan files. Deleting is documenting — git remembers. If you think code might be needed later, that is what version control is for.',
  },
  {
    id: 'error-handling',
    title: 'Handle every error',
    body: 'No silent catch, no swallowed error. Every error is handled, logged with context, or propagated. Never leave a catch block empty, and never log-and-continue when the operation actually failed. Await or explicitly handle every promise.',
  },
];

export function lawById(id: string): Law | undefined {
  return LAWS.find((l) => l.id === id);
}
