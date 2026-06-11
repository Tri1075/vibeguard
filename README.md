<div align="center">

# 🛡️ vibeguard

### AI writes your code now. vibeguard makes sure it's good code.

[![CI](https://github.com/Tri1075/vibeguard-pack/actions/workflows/ci.yml/badge.svg)](https://github.com/Tri1075/vibeguard-pack/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![dogfooded](https://img.shields.io/badge/dogfooded-100%25-success.svg)](#we-eat-our-own-cooking)

**⭐ If you believe everyone — beginner or expert, human or AI — deserves to ship clean code, star this repo. Every star helps another vibecoder find it.**

</div>

---

## You vibecode. We've got your back.

You describe what you want. An AI writes the code. That's **vibecoding** — and it's how most new code gets written today.

There's just one problem: **nobody is checking the AI.**

It breaks the feature that worked yesterday. It writes one giant 500-line file instead of clean small ones. It pastes your secret keys right into the code. It installs random packages you never asked for. It leaves a mess it calls "done" — and you only find out later.

An AI coding assistant is like a brilliant intern with infinite energy and **zero supervision**. vibeguard is the supervision.

## What it does — in plain words

1. **It teaches your AI the rules** that the world's best software engineers live by. Plan before you build. Pick proven tech, not hype. Small focused files. No secrets in code. No silent shortcuts. No security holes. Nine rules, written in plain language your AI reads before it writes anything.
2. **It checks the work — and can't be sweet-talked.** Rules in a prompt are a polite request; the AI can ignore them. vibeguard also ships _checkers_ (we call them gates) that scan the actual code. Red is red, no matter how confident the AI sounds.
3. **It catches destruction before you do.** With its companion engine [driftguard](https://github.com/Tri1075/driftguard), vibeguard takes a snapshot of what works _before_ the AI starts. When the AI finishes, it compares: anything that used to work and is now broken gets the AI **blocked and sent back to fix it** — then _you_ approve or reject what's left, with one click.

## Works with the AI tools you already use

**Claude Code · Cursor · OpenAI Codex · Gemini CLI · GLM · aider · Goose · Ollama & LM Studio (local models)** — and any other coding agent, via the universal `AGENTS.md` rules file.

```sh
npm i -D vibeguard-pack
npx vibeguard init           # answer one question: beginner or experienced?
npx vibeguard run claude     # ...or codex, cursor, gemini, aider — your session is now governed
```

## Never written code before?

That's exactly who this is for. Here's everything you need to know:

- `vibeguard init` — run once per project. Say you're a **beginner** and you get safe settings plus plain-English explanations of every rule.
- `vibeguard run <your AI tool>` — start your coding session through vibeguard. It hands the rules to your AI and refuses to start if the project is already broken.
- `vibeguard check` — ask "is my code clean?" anytime. Green means yes. Red shows you exactly what's wrong, where, and **how to fix it** — in one sentence each.

You never have to read the code to know whether it's healthy. That's the point.

## The 9 rules (in human words)

| #   | Rule                     | In plain words                                                                                                  |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------- |
| 1   | **Plan first**           | A real project starts with a robust plan — goal, milestones, risks — not with the first file the AI feels like writing. |
| 2   | **Robust stack**         | The AI researches the most solid technology for the job and writes down why. Boring and proven beats shiny and new. |
| 3   | **Small files**          | Every file does one job, under 200 lines of code. Big files are where bugs hide.                                |
| 4   | **No hidden shortcuts**  | If the AI wants to take a shortcut (a "hack"), it must **warn you first** and write it in a ledger you control. |
| 5   | **No surprise packages** | The AI can't add new dependencies without your approval.                                                        |
| 6   | **No secrets in code**   | Passwords and API keys never go in the code. Ever.                                                              |
| 7   | **No security holes**    | The classic mistakes that get apps hacked — blocked before they ship.                                           |
| 8   | **No dead code**         | No commented-out leftovers, no unused exports. Clean house.                                                     |
| 9   | **No swallowed errors**  | When something fails, you hear about it — errors never vanish silently.                                         |

**Bonus — "grill me".** Got a plan but not sure it holds? Say *"grill me"* and your AI interviews you about every branch of it, one question at a time, until you both actually agree on what you're building. (Ships as a second skill on Claude Code.)

Every rule is yours to tune. Experienced engineers can edit any rule, raise any limit, disable anything — the AI never can. That line is enforced by the engine, not by trust.

## We eat our own cooking

vibeguard obeys its own nine rules and checks itself in CI on every commit. Its companion driftguard was our first "customer": the gates found six oversized modules and seven pieces of dead code in it — and the AI that maintains it was made to fix every one. **If we won't live by these rules, why would you?**

---

## For engineers

<details>
<summary><b>How it actually works (click to expand)</b></summary>

**Law + police, always paired.** Each rule ships as (a) an imperative rule text emitted into the host's native format — Claude Code skill, `.cursor/rules`, or a managed `AGENTS.md` block — and (b) a deterministic gate (`vibeguard check <rule>`, exit 0/1, stable `--json` output for CI).

**Enforcement via driftguard.** `vibeguard init` registers every gate as a [driftguard](https://github.com/Tri1075/driftguard) probe and marks `.vibeguard/**` as a protected path. A gate going green→red during a session is a _regression_: the agent is blocked at end-of-turn, ordered to self-correct (repair → selective revert → justify), and the human arbitrates the remainder (approve / reject / dismiss) in a local dashboard with visual criticality.

**Session discipline.** LLM attention degrades as context fills (the "dumb zone"). The law mandates a warning at 100K tokens and a handoff at 120K: `vibeguard handoff` writes `HANDOFF.md`; driftguard carries scope and baseline across the fresh session. `vibeguard tokens` names your zone.

**Token economy.** `vibeguard run` chains [headroom](https://github.com/chopratejas/headroom) when installed. And vibeguard polices itself: every artifact it injects into your agent's context (rules skill, protocol block, handoff template) has a token budget locked by the test suite — your context is spent on your code, not on our prose.

**Owner-only customization.** `.vibeguard/rules.json` (enable/disable, severity `block|warn`, params, per-rule ignores) + editable `instructions/*.md` + `debt.md` ledger + `deps-baseline.json`. Inline `// vibeguard-allow` pragmas for vetted false positives.

**Gate quality bar.** False positives are treated as the existential risk: comment-aware scanning, multi-line-import-aware export graph, type exports exempt, entry points exempt, comment-only catches pass (documented intent), self-referential pattern files owner-ignored. Function-length deliberately waits for the TS compiler API rather than ship a brace-counting lie.

| Command                       | What                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `run <cli>`                   | emit host rules, refuse red start, chain headroom, launch agent |
| `check [rule] [--json\|--ci]` | run gates; CI lock                                              |
| `handoff` / `tokens`          | anti dumb-zone                                                  |
| `rules [--skill]`             | emit the law anywhere                                           |
| `debt add` / `deps approve`   | human-only ledgers                                              |

```yaml
# GitHub Action
- uses: Tri1075/vibeguard-pack@main
  with: { command: check --ci }
```

</details>

## Contributing

vibeguard wants to become **the world's reference for clean AI-assisted code** — and that takes a community. New rules, new language support, sharper gates: all welcome, and adding a rule is deliberately a two-small-files job ([CONTRIBUTING.md](CONTRIBUTING.md)).

<div align="center">

**⭐ One more time, because it matters: if you think the world should produce better code — written by anyone, reviewed by no one's vibes — star the repo and pass it on.**

</div>

## Roadmap

- ✅ The 9 rules, law + police · session wrapper · 120K handoff · driftguard enforcement · GitHub Action · plan-interview skill · locked token budgets
- ⏳ True AST gates (function length, floating promises) · more languages · VS Code surface · public launch

## License

[Apache-2.0](LICENSE)
