# vibeguard-pack

**The essential foundation for vibecoders.** The engineering principles of the best developers, followed by any LLM (the _law_) and enforced by deterministic gates (the _police_) — not by vibes. Beginner-friendly out of the box, fully customizable by experienced engineers.

LLMs code fast and drift fast: bloated modules, silent technical debt, parachuted dependencies, hardcoded secrets, insecure patterns, and context windows so full the model goes dumb. vibeguard-pack governs all of that, on every session, whatever the LLM or CLI you use.

## The 7 rules

Each rule ships as a law (a rule text the agent must follow) **and** a police gate (`vibeguard check <rule>`, exit 0/1). Every gate registers as a [driftguard](https://github.com/Tri1075/driftguard) probe, so a rule going green→red becomes blocking drift the agent must self-correct.

| #   | Rule               | What it enforces                                                                                                      |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1   | **modules-small**  | Modules ≤ 200 code lines, single purpose. Split _before_ the limit; never raise it yourself (owner decision).         |
| 2   | **no-tech-debt**   | The agent warns you before introducing debt; accepted debt is recorded in a ledger. Unledgered TODO/FIXME/HACK = red. |
| 3   | **deps-hygiene**   | No new dependency without your approval.                                                                              |
| 4   | **no-secrets**     | No hardcoded keys/tokens/passwords (pattern + entropy scan).                                                          |
| 5   | **secure-code**    | OWASP-grade patterns: no eval, no string-built SQL/shell, no disabled TLS, safe crypto, escaped output, strict CORS.  |
| 6   | **no-dead-code**   | No commented-out code, no dead exports. _(law in M1, AST gate in M3)_                                                 |
| 7   | **error-handling** | No silent catch, no swallowed errors. _(law in M1, AST gate in M3)_                                                   |

The 200-line measure counts **code lines only** (non-blank, non-comment), so documenting your code generously is never penalized — it is part of the law.

## Quick start

```sh
npm i -D vibeguard-pack
npx vibeguard init            # asks your level, scaffolds .vibeguard/, links driftguard if present
npx vibeguard check           # run every gate; exit 1 if any blocking rule fails
```

`init` is interactive: tell it whether you are a **beginner** (safe defaults, extra "why it matters" guidance) or **experienced** (it points you to `.vibeguard/rules.json` and `.vibeguard/instructions/*.md` to tailor every rule to your habits). Pass `--profile beginner|experienced` to skip the prompt (e.g. in CI).

## The three pillars

- **driftguard — enforcement.** When the sibling [driftguard](https://github.com/Tri1075/driftguard) is installed, `init` registers each gate as a probe and protects `.vibeguard/**` (so an agent can never loosen your rules). A rule turning red mid-session blocks the agent until it self-corrects, then you arbitrate.
- **headroom — token economy.** The session wrapper chains [`headroom`](https://github.com/chopratejas/headroom) to compress context; reports sent back to the model are budgeted then compressed.
- **handoff — anti "dumb zone".** LLM attention degrades as context fills (the middle of a large window is poorly attended). The law instructs the agent to warn at **100K tokens** and hand off at **120K**: write `HANDOFF.md` and start a fresh session. driftguard carries the scope and baseline across the handoff, so nothing is lost.

## Customization (owner-only)

Everything lives in `.vibeguard/`, editable by you, never by an agent:

```
.vibeguard/
  rules.json              # enable/disable, severity (block|warn), per-rule params & ignores
  instructions/<rule>.md  # the rule text the agent reads — edit it to your taste
  debt.md                 # the technical-debt ledger
  deps-baseline.json      # your approved dependency set
```

Example — relax the module limit for one project and turn a rule into a warning:

```jsonc
{
  "rules": {
    "modules-small": { "params": { "maxLines": 250, "warnAt": 200 } },
    "secure-code": { "severity": "warn" },
  },
}
```

## Commands

| Command                       | Who   | What                                                                |
| ----------------------------- | ----- | ------------------------------------------------------------------- |
| `init [--profile]`            | human | scaffold, onboard, link driftguard                                  |
| `check [rule] [--json\|--ci]` | both  | run gates; the CI/agent lock                                        |
| `rules [--skill]`             | both  | print the law for AGENTS.md / `.cursor/rules` / a Claude Code skill |
| `debt add <file> --reason`    | human | record an accepted technical debt                                   |
| `deps approve [name]`         | human | approve a new dependency                                            |

## For other agents

```sh
npx vibeguard rules >> AGENTS.md          # any agent
npx vibeguard rules --skill > .claude/skills/vibeguard/SKILL.md
```

## License

Apache-2.0
