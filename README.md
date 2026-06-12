<div align="center">

# 🛡️ vibeguard

### AI writes your code now. vibeguard makes sure it's good code.

[![CI](https://github.com/Tri1075/vibeguard/actions/workflows/ci.yml/badge.svg)](https://github.com/Tri1075/vibeguard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-brightgreen.svg)](package.json)
[![dogfooded](https://img.shields.io/badge/dogfooded-100%25-success.svg)](#we-eat-our-own-cooking)

_The clean-code guardrails for AI agents — taught as rules, enforced as code, and they learn from every mistake._

</div>

---

An AI coding agent is a brilliant intern with infinite energy and **zero supervision**: giant files, pasted secrets, surprise packages, broken features it calls "done". Rules in a prompt don't fix that — agents rationalize around prose. **vibeguard pairs every rule with a deterministic checker, and physically blocks the agent until it fixes its own mess.**

```
        PLAN                  BUILD                 VERIFY                LEARN
  plan-first · grill me   the 9 rules (law)    9 gates (police) +    driftguard patterns
  write a PRD → issues    tdd · diagnose       driftguard: blocked   recurring drift becomes
                                               at Stop until fixed,  a CLAUDE.md rule —
                                               you arbitrate         detection feeds prevention
```

That last column is the part nobody else does: the guard doesn't just catch drift, **it closes the loop** so the same drift stops happening.

### See the whole loop — nothing faked

![vibeguard + driftguard: govern → drift → block → self-correct → learn](demo/loop.gif)

One command governs a throwaway project; the agent edits in scope and also drifts; the guard blocks the drift with a plain-English verdict; the agent self-corrects; and the recurring mistake becomes a standing rule. ([how it's recorded, anonymized](demo/))

**Measured, not promised**: [the benchmarks](docs/benchmarks.md) seed 11 realistic AI-agent faults into a clean project — hardcoded key, swallowed error, surprise dependency, out-of-scope edit, broken green check, guard tampering… — and the stack catches **11/11 with zero false positives** on the untouched tree. Reproduce it yourself: `node scripts/bench-detection.mjs`.

## Why it's different

Most tools that try to make AI write better code do one of these things. vibeguard is the only one that does all four:

|                                                | Prompt-rule packs | Linters (ESLint…) | Skill collections |  **vibeguard**  |
| ---------------------------------------------- | :---------------: | :---------------: | :---------------: | :-------------: |
| Teaches the AI what "good" means               |        ✅         |         —         |        ✅         |       ✅        |
| Deterministically checks the rule was followed |         —         |   ✅ _(style)_    |         —         | ✅ _(behavior)_ |
| Blocks the agent until it fixes its own mess   |         —         |         —         |         —         |       ✅        |
| Turns a recurring mistake into a standing rule |         —         |         —         |         —         |       ✅        |

Prompt rules _ask_ the AI nicely — and it rationalizes around them. Linters check your syntax, brilliantly, but they don't govern what the agent _does_ or stop it mid-session. Skill collections (like the excellent [agent-skills](https://github.com/addyosmani/agent-skills)) teach great workflows, but nothing checks the agent actually followed them. vibeguard pairs every rule with a deterministic gate, blocks the agent at the end of its turn until it self-corrects, and promotes each recurring mistake into a rule it won't repeat. **It doesn't replace your linter — it governs the AI that writes the code your linter checks.**

## The gold-standard stack

vibeguard is one quarter of a stack that gives any vibecoder — and any coding agent — gold-standard engineering with measurable time and token savings, one tool per stage of the loop:

| Stage              | Tool                                                   | What it saves                                                                                                                    |
| ------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| **Read less**      | [codegraph](https://github.com/colbymchenry/codegraph) | a pre-indexed code knowledge graph: the agent queries structure instead of grepping files — fewer tokens, fewer tool calls       |
| **Carry less**     | [headroom](https://github.com/chopratejas/headroom)    | context compression on LLM-bound payloads (already chained by `vibeguard run`) — the same session fits in fewer tokens           |
| **Redo less**      | **vibeguard**                                          | the rules are stated once and _checked_ every turn — mistakes are caught at the turn boundary, not three features later          |
| **Re-review less** | [driftguard](https://github.com/Tri1075/driftguard)    | scope enforcement + regression blocking + a decision grammar — you arbitrate concise change requests instead of re-reading diffs |

Each stage compounds with the next: the agent reads only what matters, carries a compact context, gets stopped the moment a green check breaks, and hands you decisions instead of homework. Time saved at every stage; tokens saved at every stage.

### Karpathy-aligned, and checkable

Andrej Karpathy's viral coding-agent rules name four behaviors: **think before coding** (assumptions explicit, ask rather than guess), **simplicity first** (nothing speculative), **surgical changes** (touch only what you must), **goal-driven execution** (define success criteria, loop until verified). The vibeguard law states all four to the agent — and the stack makes the last two _mechanically checkable_: surgical changes **is** driftguard's scope contract (out-of-scope edits are blocked at the end of the turn), and goal-driven execution **is** the gate loop (every rule is a green/red probe; green→red blocks until self-corrected). Credit: [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT). The full lineage of every rule — the canon experienced engineers will recognize, from SRP to ADRs to the Twelve-Factor App — is in [docs/sources.md](docs/sources.md).

## Install

One command on Claude Code, or one npm dependency for any other agent. Then it's invisible until something's wrong.

```sh
# Claude Code (plugin — the WHOLE loop, zero-config: rules, gates, live
# enforcement and the workflow skills, all self-contained — no npm, no build):
/plugin marketplace add Tri1075/vibeguard
/plugin install vibeguard@vibeguard
# Each session now auto-governs itself: it scopes the project at startup and
# blocks the agent at the end of any turn that broke a green check.
# Git repos only (a non-repo folder is left untouched); committed config stays
# portable — machine paths live in a gitignored overlay. Restarting the
# session never launders an unresolved regression.

# Any other agent (Cursor, Codex CLI, OpenCode, Hermes, Gemini CLI,
# Antigravity, Kiro, aider, local models…) — three gestures, one name:
npx vibeguard                 # govern this project (one question, then done)
npx vibeguard run codex       # daily: governed session + exit verdict
npx vibeguard review          # arbitrate what the guard caught (or: ui)
# IDE agents (Cursor, Antigravity, Kiro): npx vibeguard emit cursor
```

Never written code before? Type `npx vibeguard`, answer **beginner**, and `vibeguard check` will always tell you in plain English whether your code is healthy — and how to fix it when it isn't.

> **Platforms**: developed and CI-tested on macOS and Linux (Node ≥ 20). Windows is untested — reports and fixes are very welcome.

### Pick your dose

The full loop is the point — but every half works on its own, with commands that already exist:

| Recipe                  | What you get                                                                            | How                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Full loop** (default) | The law taught to the agent, the gates enforcing it, drift blocked, you arbitrate       | `npx vibeguard`, then `vibeguard run <cli>` (or the Claude Code plugin)                                                                   |
| **Law only**            | The rules land in your host's native file — nothing checks, nothing blocks              | `vibeguard emit <host>` and stop there; or set any rule to `"warn"` in `rules.json` to keep its findings advisory                         |
| **Police only**         | Anti-drift enforcement (scope, regressions, protected paths) without the clean-code law | [driftguard](https://github.com/Tri1075/driftguard) standalone: `npx drift-guard init` — and/or keep `vibeguard check` as a plain CI gate |

## Deploy everywhere

The same single-source law lands in each host's **native** rules location, and every host gets real enforcement — the honest difference is _when_ the police runs:

| Host                 | The law (rules)                                          | The police (enforcement)                                                               |
| -------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **Claude Code**      | native plugin: skills + hooks + bundled binaries         | **in-session** — blocked at Stop the moment a green check breaks, self-correction loop |
| **Cursor**           | `.cursor/rules/vibeguard.md` (`vibeguard emit cursor`)   | finish line — `vibeguard run cursor-agent` exit verdict, `vibeguard check` in CI       |
| **OpenAI Codex CLI** | `AGENTS.md` managed block                                | finish line — `vibeguard run codex`                                                    |
| **OpenCode**         | `AGENTS.md` managed block                                | finish line — `vibeguard run opencode`                                                 |
| **Hermes Agent**     | `AGENTS.md` managed block                                | finish line — `vibeguard run hermes`                                                   |
| **Gemini CLI**       | `AGENTS.md` managed block                                | finish line — `vibeguard run gemini`                                                   |
| **Antigravity IDE**  | `AGENTS.md` managed block (`vibeguard emit antigravity`) | finish line — `vibeguard check` / CI gates                                             |
| **Kiro**             | `AGENTS.md` managed block (`vibeguard emit kiro`)        | finish line — `vibeguard run kiro` (CLI) or `vibeguard check` / CI (IDE)               |
| _anything else_      | `AGENTS.md` (the [open standard](https://agents.md/))    | finish line — `vibeguard run <your-cli>`                                               |

**Finish line** means: `vibeguard run <cli>` refuses to start a session on red, lets the agent work without interference, then runs the **driftguard verdict when the agent exits** — out-of-scope edits and green→red regressions are reported as change requests for _your_ decision, and the wrapper exits non-zero so a script can't mistake a drifted session for a clean one. In-session blocking needs lifecycle hooks, which only some hosts expose: Cursor, Kiro and OpenCode have hook/plugin APIs — adapters for them are the next milestone, stated here so the matrix never overpromises.

## The 9 rules — each one is a law (the AI reads it) _and_ a police (a checker that can't be sweet-talked)

| #   | Rule                     | In plain words                                                                                                          |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | **Plan first**           | A real project starts with a robust plan — goal, milestones, risks — not with the first file the AI feels like writing. |
| 2   | **Robust stack**         | The AI researches the most solid technology for the job and writes down why. Boring and proven beats shiny and new.     |
| 3   | **Small files**          | Every file does one job, under 200 lines of code. Big files are where bugs hide.                                        |
| 4   | **No hidden shortcuts**  | If the AI wants to take a shortcut (a "hack"), it must **warn you first** and write it in a ledger you control.         |
| 5   | **No surprise packages** | The AI can't add new dependencies without your approval.                                                                |
| 6   | **No secrets in code**   | Passwords and API keys never go in the code. Ever.                                                                      |
| 7   | **No security holes**    | The classic mistakes that get apps hacked — blocked before they ship.                                                   |
| 8   | **No dead code**         | No commented-out leftovers, no unused exports. Clean house.                                                             |
| 9   | **No swallowed errors**  | When something fails, you hear about it — errors never vanish silently.                                                 |

Every rule is yours to tune — and only yours. **With [driftguard](https://github.com/Tri1075/driftguard) installed**, `.vibeguard/**` is a protected path: an agent edit to it is flagged as drift and blocked at the end of the turn. Standalone (gates only), that boundary is a convention the law states, not yet a lock — install driftguard for enforcement.

## The workflow skills

| Skill              | Say…              | What it does                                                                                                                                    |
| ------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **plan-interview** | "grill me"        | Grills your plan against the codebase's domain model, pins down the shared vocabulary, and captures it in CONTEXT.md + ADRs as you go.          |
| **write-a-prd**    | "write a PRD"     | Problem story → codebase verification → design grilling → module sketch → PRD filed as a GitHub issue.                                          |
| **to-issues**      | "to issues"       | Slices the plan/PRD into independent, vertically-sliced GitHub issues anyone can grab.                                                          |
| **tdd**            | "build this TDD"  | Red-green-refactor, one vertical slice at a time. Weakening a test counts as drift.                                                             |
| **diagnose**       | "diagnose this"   | Disciplined bug loop: reproduce, minimize, hypothesize, instrument, fix, regression-test.                                                       |
| **caveman**        | "caveman mode"    | Ultra-terse replies to stretch your context window — warnings never compressed away.                                                            |
| **self-review**    | "review yourself" | Metacognition: the agent audits its own changes against the rules, scope, and plan, fixes what it broke, and records why — before handing back. |

Several are inspired by [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT) — "grill me" follows his `grill-with-docs`, credit where credit is due. Using [Addy Osmani's agent-skills](https://github.com/addyosmani/agent-skills)? They compose: [their workflows on top, our enforcement underneath](docs/agent-skills.md).

## For engineers

> Worried it'll babysit you? It won't. It polices the AI, not you.

**Two postures — pick your bar.** The default for an experienced engineer is `guardian`: it _blocks_ the AI's genuinely dangerous moves — hardcoded secrets, insecure code, swallowed errors, unapproved dependencies — and only _advises_ on style (module size, debt markers). Your existing 250-line file and your deliberate `// TODO` are never blocked. Flip to `strict` (`vibeguard init --posture strict`, the beginner default) for the full clean-code bar. Every rule's severity, params, and ignores live in `.vibeguard/rules.json` — **you own it, the agent may never touch it.** You tune everything; it tunes nothing.

**Proportional, never ceremonial.** A typo fix just gets done. On a real task the agent _offers_ the choice — "just build it, or grill you on the design first?" — instead of forcing a plan ritual or skipping the thinking. The framing scales to the task, and you decide.

**Law + police, always paired.** Each rule ships as (a) an imperative rule text emitted into the host's native format — Claude Code skill, `.cursor/rules`, or a managed `AGENTS.md` block — and (b) a deterministic gate (`vibeguard check <rule>`, exit 0/1, stable `--json` for CI). The law now includes a **"No excuses" block**: the agent's favorite rationalizations, pre-refuted.

**Enforcement via [driftguard](https://github.com/Tri1075/driftguard).** `init` registers every gate as a driftguard probe and protects `.vibeguard/**`. A gate going green→red mid-session is a _regression_: the agent is blocked at end-of-turn, ordered to self-correct (repair → selective revert → justify), and you arbitrate the rest in a local dashboard. Recurring drift becomes a proposed CLAUDE.md rule via `driftguard patterns --apply`.

**Session discipline & token economy.** Warning at 100K tokens, mandatory `HANDOFF.md` at 120K (driftguard carries scope and baseline across sessions). Every artifact vibeguard injects into your agent's context has a **token budget locked by the test suite** — your context is spent on your code, not on our prose. `vibeguard run` chains [headroom](https://github.com/chopratejas/headroom) when installed.

**Gate quality bar.** False positives are the existential risk: comment-aware scanning, import-graph-aware dead-code detection, type exports exempt, `// vibeguard-allow` pragmas, owner-tunable params and per-rule ignores. Function-length deliberately waits for the TS compiler API rather than ship a brace-counting lie.

| Command                       | What                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `run <cli>`                   | emit host rules, refuse red start, chain headroom, launch agent |
| `check [rule] [--json\|--ci]` | run gates; CI lock                                              |
| `handoff` / `tokens`          | anti dumb-zone                                                  |
| `rules [--skill]`             | emit the law anywhere                                           |
| `debt add` / `deps approve`   | human-only ledgers                                              |

```yaml
# GitHub Action
- uses: Tri1075/vibeguard@main
  with: { command: check --ci }
```

## We eat our own cooking

vibeguard obeys its own nine rules in CI on every commit, and **develops under its own governance**: driftguard probes, declared scopes, arbitrated drift. Its companion driftguard was customer #1 — the gates found six oversized modules and seven pieces of dead code in it, and the AI that maintains it was made to fix every one.

## Built in the open

MIT, and built to be extended. Adding a rule is a small, well-scoped job — a law, a gate, a registry entry, and tests ([CONTRIBUTING.md](CONTRIBUTING.md)) — so the rule set can grow with the community rather than with one maintainer. New rules, new languages, sharper gates, and bug reports are all genuinely welcome. The goal is a shared standard for clean AI-assisted code that belongs to everyone who relies on it. Start with [ARCHITECTURE.md](ARCHITECTURE.md) — the full system map, the invariants, and where to plug in (driftguard has [its own](https://github.com/Tri1075/driftguard/blob/main/ARCHITECTURE.md)).

If vibeguard ever catches something before it reaches your main branch, a ⭐ helps the next person find it — that's the only nudge you'll get here.

**Roadmap**: ✅ 9 rules law+police · wrapper with exit verdict · 120K handoff · driftguard enforcement · patterns→CLAUDE.md · plugin marketplace · 8 hosts (law everywhere, finish-line police) — ⏳ in-session hooks for Cursor/Kiro/OpenCode · AST gates · more languages · public launch.

## License

[MIT](LICENSE)
