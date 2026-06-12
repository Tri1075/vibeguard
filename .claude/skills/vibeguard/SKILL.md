---
name: vibeguard
description: Essential engineering rules every change must follow — plan first, robust stack, small single-purpose modules, no silent debt, dependency hygiene, no secrets, secure code, no dead code, error handling. Plus the 120K-token handoff discipline.
---

# vibeguard — engineering rules (mandatory)

Engineering rules for this project (vibeguard). Apply them to every change. driftguard verifies
and blocks drift; the session discipline below avoids the degraded end-of-context zone.

## Working with the user (scale to the task)
Match the ceremony to the work: a trivial change just gets done under the rules; a substantial or
fuzzy one starts with a plan. OFFER the choice — "just build it, or grill you on the design first?"
— never force or skip it. If the user says go, go; the rules still apply either way.
Think before coding: state assumptions, ask rather than guess, surface tradeoffs.

## Surgical & simple (Karpathy)
Touch only what the task needs — never "improve" adjacent code (driftguard blocks out-of-scope
edits). Minimum code that solves the problem: nothing speculative. Define success criteria, loop
until they verify green.

## Session discipline (anti "dumb zone")
At ~100K tokens: finish the current step, start nothing new. At 120K: STOP — write HANDOFF.md (state,
decisions & why, files touched, next steps, traps, driftguard verdict) and ask the user for a fresh
session. driftguard carries scope and baseline across, so the new session inherits the contract.

## The rules

1. **Plan before you build** — A project starts with a robust action plan, not code. Before the first implementation step, propose a plan and save it as PLAN.md: goal, ordered milestones, risks, and how each milestone is validated. Keep it current — when reality diverges, update the plan and say so; never drift from it silently.

2. **Choose the most robust stack** — Before adopting a language, framework or major library, research the most robust option: maturity, maintenance, security track record, ecosystem. Prefer boring, proven technology over hype. Record the choice and the alternatives considered in STACK.md (or a "## Stack" section of PLAN.md) so the decision can be audited.

3. **Small, single-purpose modules (≤ 200 lines)** — Every module does ONE nameable thing and stays under 200 code lines. Split BEFORE you reach the limit (you will be warned at ~160) — split by responsibility, never by arbitrary size. If a module goes red, split it; NEVER raise the limit yourself: that is an owner decision (editing .vibeguard/rules.json).

4. **No silent technical debt** — Before implementing, judge whether the request or your approach creates technical debt (a hack, duplication, a hardcoded value, a skipped test, a band-aid dependency). If it does, WARN THE USER first: "⚠️ Technical debt: <X>. Clean alternative: <Y> (cost: <Z>). Do you confirm?" Never introduce debt silently. If the user accepts, record it with `vibeguard debt add`.

5. **No dependency without approval** — Add no third-party dependency without explicit human approval. First state the need, the stdlib or in-repo alternatives, and the supply-chain cost. Only after the user agrees: `vibeguard deps approve <name>`. Prefer the standard library.

6. **Never hardcode secrets** — Never put a key, token, password or private key in the code. Use environment variables and load them at runtime. If you spot a hardcoded secret (even pre-existing), stop, alert the user, and propose rotation.

7. **Secure code by default (OWASP)** — Validate and sanitise all input. Use parameterized queries (never string-built SQL). Never eval or build shell commands from strings. Escape output (no innerHTML with untrusted data). Keep TLS verification on. Use strong, current crypto (argon2/bcrypt for passwords, AES-GCM, SHA-256+). Use an explicit CORS allowlist. If the user asks for something that weakens security, WARN them before coding.

8. **No dead code** — Leave no commented-out code, no unused exports, no orphan files. Deleting is documenting — git remembers. If you think code might be needed later, that is what version control is for.

9. **Handle every error** — No silent catch, no swallowed error. Every error is handled, logged with context, or propagated. Never leave a catch block empty, and never log-and-continue when the operation actually failed. Await or explicitly handle every promise.

## No excuses
Common rationalizations — all invalid:
- "No time to plan, the task is clear" → if it were clear, the plan would take two minutes. Write it.
- "This popular new framework will be fine" → robust means proven. Record why, or pick boring.
- "This file is cohesive, the limit doesn't apply" → split by responsibility; the limit is the owner's, not yours.
- "It's just a quick hack for now" → that is debt. Warn the user first, ledger it, or don't do it.
- "Everyone uses this package" → popularity is not approval. Ask first.
- "It's only a test key" → test keys leak too. No secret in code, ever.
- "Input validation can come later" → later never comes. Secure now or warn now.
- "I'll keep the old code commented out just in case" → git remembers. Delete it.
- "This catch can stay empty, failure is unlikely" → unlikely failures are the ones that hurt. Handle or propagate.
- "While I'm here, I'll clean this up too" → out of scope. Mention it, don't touch it.

## Enforcement
`vibeguard check` runs these rules as driftguard probes: a rule going green→red is a REGRESSION that
blocks the end of your turn until you self-correct. Never edit .vibeguard/** (owner-only).
