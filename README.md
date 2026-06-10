<div align="center">

# 🛡️ vibeguard-pack

### Clean code for the age of AI. The rules the best engineers follow — enforced on every LLM, on every session.

[![CI](https://github.com/Tri1075/vibeguard-pack/actions/workflows/ci.yml/badge.svg)](https://github.com/Tri1075/vibeguard-pack/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![dogfooded](https://img.shields.io/badge/dogfooded-100%25-success.svg)](#dogfooding)

**Stop shipping vibes. Start shipping clean code — even when an AI writes it.**

</div>

---

AI agents write code fast and break things faster: 500-line god-modules, silent technical debt, dependencies parachuted in, secrets hardcoded, insecure patterns, and context windows so bloated the model gets dumb. **vibeguard-pack** governs all of it — for Claude Code, Cursor, aider, or any LLM — so the code stays clean no matter who (or what) writes it.

It is built on one idea: **a rule is only real if it's enforced.** So every rule ships as a pair — a **law** the agent must follow, and a **gate** that checks it deterministically (exit 0/1). Prompts ask nicely; gates don't.

```sh
npm i -D vibeguard-pack
npx vibeguard init       # asks your level, scaffolds .vibeguard/, links driftguard
npx vibeguard run claude # governed session: rules in, gates green, then your agent launches
```

## Why it's different

|                                                              | Prompt rules / `.cursorrules` | A linter (ESLint…) |                      **vibeguard-pack**                      |
| ------------------------------------------------------------ | :---------------------------: | :----------------: | :----------------------------------------------------------: |
| Works on **any** LLM / CLI                                   |          ⚠️ per-tool          |         ❌         |                              ✅                              |
| **Enforced**, not just suggested                             |              ❌               |         ✅         |                              ✅                              |
| Governs the **agent's behavior** (debt, deps, secrets)       |              ❌               |     ⚠️ partial     |                              ✅                              |
| **Blocks** the agent mid-session until it self-corrects      |              ❌               |         ❌         | ✅ (via [driftguard](https://github.com/Tri1075/driftguard)) |
| Keeps the model out of the **"dumb zone"** (context handoff) |              ❌               |         ❌         |                              ✅                              |
| **Owner-only** limits (agent can't loosen rules)             |              ❌               |         ❌         |                              ✅                              |

## The 7 rules

| #   | Rule               | What it enforces                                                                                            |
| --- | ------------------ | ----------------------------------------------------------------------------------------------------------- |
| 1   | **modules-small**  | Modules ≤ 200 code lines, single purpose. Split _before_ the limit — never raise it yourself.               |
| 2   | **no-tech-debt**   | The agent warns you _before_ introducing debt; accepted debt is ledgered. Unledgered TODO/FIXME/HACK = red. |
| 3   | **deps-hygiene**   | No new dependency without your approval.                                                                    |
| 4   | **no-secrets**     | No hardcoded keys/tokens/passwords (pattern + entropy scan).                                                |
| 5   | **secure-code**    | OWASP-grade: no eval, no string-built SQL/shell, no disabled TLS, safe crypto, escaped output, strict CORS. |
| 6   | **no-dead-code**   | No commented-out code, no unused exports (heuristic graph, types exempt).                                   |
| 7   | **error-handling** | No silent catch, no swallowed errors.                                                                       |

> The 200-line limit counts **code lines only** (no comments, no blanks) — so documenting your code is always free, never penalized.

## See it catch drift

```console
$ vibeguard check
vibeguard check — 5 gate(s) ran

src/api/users.js
  [CRITICAL] [no-secrets] possible hardcoded secret (AWS access key):12
      fix: Move it to an environment variable and load it at runtime.
  [HIGH] [secure-code] insecure pattern: SQL built by string concatenation:34
      fix: Use parameterized queries / prepared statements, never string concatenation.

src/utils.js
  [HIGH] [modules-small] 247 code lines (limit 200) — module is too big
      fix: Split by responsibility. Never raise the limit yourself; that is an owner decision.

✗ BLOCKED — 1 critical · 1 high · 1 medium
```

## How it works — three pillars

- **[driftguard](https://github.com/Tri1075/driftguard) — enforcement.** Each gate registers as a probe. A rule going green→red mid-session becomes blocking drift: the agent is stopped at the end of its turn and must self-correct (repair → revert → justify), then **you** arbitrate (approve / reject / dismiss) in a local dashboard. `.vibeguard/**` is a protected path, so an agent can never loosen its own rules.
- **[headroom](https://github.com/chopratejas/headroom) — token economy.** `vibeguard run` chains headroom to compress context. Less waste, lower cost.
- **handoff — anti "dumb zone".** LLM attention degrades as the context fills (the middle of a big window is poorly read). The law tells the agent to warn at **100K tokens** and hand off at **120K**: `vibeguard handoff` writes a `HANDOFF.md`, you start a fresh session, and driftguard carries the scope across so nothing is lost.

## Customize everything (you, not the agent)

```
.vibeguard/
  rules.json              # enable/disable, severity (block|warn), per-rule params & ignores
  instructions/<rule>.md  # the rule text the agent reads — edit it to your taste
  debt.md                 # the technical-debt ledger
  deps-baseline.json      # your approved dependency set
```

```jsonc
// .vibeguard/rules.json — relax one limit, soften one rule
{
  "rules": {
    "modules-small": { "params": { "maxLines": 250, "warnAt": 200 } },
    "secure-code": { "severity": "warn" },
  },
}
```

`vibeguard init` is interactive: **beginner** gets safe defaults with extra "why it matters" guidance; **experienced** gets pointed straight at the files above to tailor the rules to their habits.

## Commands

| Command                       | Who   | What                                                               |
| ----------------------------- | ----- | ------------------------------------------------------------------ |
| `run <cli> [args]`            | both  | prepare a governed session, then launch the agent                  |
| `check [rule] [--json\|--ci]` | both  | run the gates — the CI / agent lock                                |
| `handoff` · `tokens [file]`   | both  | session discipline (anti dumb-zone)                                |
| `init [--profile]`            | human | scaffold, onboard, link driftguard                                 |
| `rules [--skill]`             | both  | emit the law for AGENTS.md / `.cursor/rules` / a Claude Code skill |
| `debt add` · `deps approve`   | human | record accepted debt / approve a dependency                        |

## Use it with any agent

```sh
npx vibeguard run claude          # Claude Code (skill + hard enforcement)
npx vibeguard run cursor          # Cursor (.cursor/rules)
npx vibeguard run aider           # any agent (AGENTS.md)
npx vibeguard rules >> AGENTS.md  # or just print the rules anywhere
```

## CI (GitHub Action)

```yaml
- uses: actions/checkout@v4
- uses: Tri1075/vibeguard-pack@main
  with:
    command: check --ci
```

## Dogfooding

vibeguard-pack obeys its own 7 rules and runs `vibeguard check` in CI. Every module is small and single-purpose (largest: ~110 lines). If we won't follow the rules, why should you?

## Contributing

This wants to become the reference for clean AI-assisted coding — and that takes a community. **New rules, new language support, better gates: all welcome.** Adding a rule is intentionally easy (see [CONTRIBUTING.md](CONTRIBUTING.md)). Good first issues are labeled.

⭐ **If you believe AI-written code should be clean, star the repo** — it helps others find it.

## Roadmap

- ✅ **M1** — core engine, 5 gates, 7 laws, CLI, driftguard integration
- ✅ **M2** — `run` wrapper, host adapters (Claude Code / Cursor / AGENTS.md), 120K handoff
- ✅ **M3** — no-dead-code & error-handling gates (TS/JS + Python `except: pass`), reusable GitHub Action
- ⏳ **Next** — true AST gates (function length, floating promises) via the TypeScript compiler, more languages, VS Code surface

## License

[Apache-2.0](LICENSE)
