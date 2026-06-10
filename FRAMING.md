# vibeguard-pack — Product framing

> The essential foundation for vibecoders: the principles of the best engineers, followed by any LLM, enforced by gates — not by vibes.
> Status: framing frozen 2026-06-10. Private repository first; public release once battle-tested.

## 1. Vision

LLMs code fast and drift fast: bloated modules, silent technical debt, parachuted dependencies, hardcoded secrets, insecure patterns, saturated context windows that make the model dumb. vibeguard-pack is **the pack a user launches at the start of every coding session, whatever the LLM or CLI** (Claude Code, Cursor, aider, local models…). It serves beginners (safe defaults, zero config, guided explanations) and experienced engineers alike (everything is customizable — by the human owner, never by the agent).

**Founding principle — every rule ships as law + police.** A skill alone (text the LLM is *supposed* to follow) is weak. Each principle is delivered as a pair: an imperative rule text (the law) + a deterministic **gate** with exit 0/1 (the police). Lesson learned from driftguard: prompt-side prevention is never enough; empirical detection is mandatory.

## 2. Frozen decisions

| Decision | Choice |
| --- | --- |
| Name | **vibeguard-pack** (binary: `vibeguard`) |
| Session start | **wrapper `vibeguard run <cli>`** — prepares everything, then launches the agent |
| Rule set | **the 7 rules** (see §4), all in the MVP |
| 200-line measure | **code lines only** (non-blank, non-comment — ESLint `max-lines` convention), owner-configurable |
| Context limit | **handoff mandatory at 120K tokens**, warning at 100K — owner-configurable |
| Publication | GitHub private → public when proven; npm; Apache-2.0 |
| Customization | per-rule editable markdown instructions + `rules.json`; experience-level onboarding; user-level defaults |
| Owner boundary | `.vibeguard/**` is a driftguard-protected path — "never raise the limit yourself: owner decision" is guaranteed by construction |
| Language | the entire repository (code, comments, docs, rule texts) is **English** |
| Privacy | no personal names, emails, or absolute local paths anywhere in the repo or its git history (public-bound) |

## 3. The three transversal pillars

1. **driftguard — the enforcement arm.** Every pack gate registers as a **driftguard probe** at install time. Automatic consequences (already built and tested on the driftguard side): gate green→red = REGRESSION = `critical` severity = blocked at the Stop hook = self-correction loop (repair → revert → justify) then human arbitration (approve / reject / dismiss in the `driftguard ui` dashboard). The pack invents no enforcement machinery: it provides the law and the probes.
2. **headroom — token economy.** `vibeguard run` chains `headroom wrap <cli>` when available; violation reports sent back to the LLM go through compression (deterministic budget first, then headroom). Standing rule: minimal context, sober outputs.
3. **handoff — session discipline (anti dumb-zone).** LLM attention is U-shaped: the middle of a large context is poorly attended; past ~40% fill, quality slides ("dumb zone", Dex Horthy / HumanLayer; Stanford "lost in the middle"). Rule: **never code in the dumb zone**.
   - Warning at **100K tokens**: finish the current step, start nothing new.
   - **120K = mandatory handoff**: the agent writes `HANDOFF.md` (task & scope state, decisions and why, files touched, next steps, known traps, driftguard verdict) then asks the user to relaunch a fresh session.
   - The next session re-injects `HANDOFF.md` (headroom-compressed) at startup. **driftguard is the continuity backbone**: scope, baseline, attribution journal and decisions persist in `.driftguard/state/` across handoffs — the fresh session inherits the contract, and drift detection spans the session boundary.
   - Police: Claude Code adapter = precise counting via the session transcript (hooks receive `transcript_path`); other hosts = skill self-monitoring + headroom proxy counting when present (best effort, documented).

## 4. The seven rules

Each rule = an editable instruction file (`.vibeguard/instructions/<rule>.md`), a `rules.json` entry (on/off, params, severity `block|warn`), a CLI gate (`vibeguard check <rule>`), registered as a driftguard probe.

| # | Rule | The law (summary) | The police (gate) | M1? |
|---|---|---|---|---|
| 1 | **modules-small** | Modules ≤ 200 code lines, one nameable responsibility each. **Split BEFORE the limit** (at the warning). Never raise the limit yourself — owner decision. The law teaches *how* to split: by responsibility, never by arbitrary size. | code-line count per file: warn ≥ 160, red ≥ 200; catch-all module names (`utils`, `helpers`, `misc`) flagged | ✅ |
| 2 | **no-tech-debt** | Before implementing, assess whether the request or the approach creates debt (hack, duplication, hardcoded value, skipped test, band-aid dependency). If so → **warn the USER first**: "⚠️ Debt: X; clean alternative: Y (cost Z). Confirm?" Never silent debt. Accepted debt goes to the ledger. | `TODO/FIXME/HACK/XXX` markers (in comments) must each have an entry in **`.vibeguard/debt.md`** (reason, date, decider); unledgered marker = red | ✅ |
| 3 | **deps-hygiene** | No new dependency without explicit human approval. Propose first: need, stdlib alternatives, supply-chain cost. | manifest diff (`package.json`, `requirements.txt`, …) vs the approved baseline (`.vibeguard/deps-baseline.json`); any unapproved addition/major bump = red; `vibeguard deps approve` is human-only | ✅ |
| 4 | **no-secrets** | Never hardcode keys/tokens/passwords — environment variables only. On a leak: stop, alert, propose rotation. | regex scan (AWS, GitHub, OpenAI, Anthropic, Google, Slack, private-key blocks, JWT, generic `key=value`) + entropy heuristic; inline pragma `vibeguard-allow` for vetted false positives | ✅ |
| 5 | **secure-code** | OWASP-grade secure coding: validate inputs, parameterized queries, no `eval`/dynamic code, no shell string concatenation, escape output, safe crypto, TLS verification on, strict CORS. **If the user's request weakens security → warn them before coding** (same duty as debt). | static scan of dangerous patterns (eval/new Function, exec with interpolation, innerHTML/document.write, SQL string concat, `rejectUnauthorized:false`/`verify=False`, deprecated ciphers, weak hashes for passwords, permissive CORS, yaml/pickle unsafe loads, `shell=True` interpolation), each tagged with severity + fix hint | ✅ |
| 6 | **no-dead-code** | No commented-out code, no dead exports, no orphan files. Deleting is documenting — git remembers. | commented-out-code heuristic + unused exports (TS first) | law M1, gate M3 (AST) |
| 7 | **error-handling** | No silent catch, no swallowed errors; every error is handled, logged or propagated — with context. | AST scan: empty catch, bare-log catch, floating promises (TS) | law M1, gate M3 (AST) |

Gate languages: line/secret/debt/secure scans are language-agnostic from v1 (comment syntax per family); AST gates start with TypeScript (M3), Python next.

## 5. Architecture

```
vibeguard run claude         # ← the user's daily gesture (M2)
  ├─ 1. project installed? (else: vibeguard init — interactive onboarding)
  ├─ 2. gates green? (NEVER start a session on red)
  ├─ 3. driftguard: fresh baseline + pack probes registered + .vibeguard/** protected
  ├─ 4. rule artifacts for the detected host:
  │       Claude Code → .claude/skills/* (hard enforcement via hooks)
  │       Cursor      → .cursor/rules/*   (law only; police via gates in CI)
  │       others      → AGENTS.md         (idem)
  ├─ 5. headroom wrap when available (token economy)
  └─ 6. exec <cli> — the agent starts governed

.vibeguard/                   # driftguard-protected (agent touch = critical drift)
  rules.json                  # on/off + params + severity per rule (+ ignore globs)
  instructions/<rule>.md      # the law, owner-editable (header: OWNER-EDITABLE)
  debt.md                     # technical-debt ledger (human-approved entries)
  deps-baseline.json          # approved dependency set
HANDOFF.md                    # written at 120K, re-injected next session
```

- **Owner/agent boundary**: everything is customizable by the human, nothing by the agent — same proven mechanics as driftguard (protected paths + human approval + audit).
- **Experience-level onboarding** (at `init`, TTY only; `--profile` flag for CI): the user picks **beginner** (defaults untouched, instructions include extended "why it matters" pedagogy, next steps printed) or **experienced** (same safe defaults, closing message points to `rules.json` + `instructions/` for personalization: "they are yours — agents may never touch them"). Profiles change guidance, not protection: both levels get the full gate set.
- **Commenting standard (for collaborators)**: every module starts with a header comment stating its role and constraints; every exported symbol carries a doc comment; inline comments state non-obvious constraints. The 200-line rule counts *code* lines only, so documentation is never penalized — commenting generously is part of the pack's own law.
- **Monorepo layout**: `core/` (gates, host-agnostic) / `adapters/` (cli, driftguard, hosts) / `laws/` (one module per rule text). **Full dogfooding: the pack obeys its own 7 rules and runs under driftguard.** driftguard itself is customer #1 (several of its modules exceed 200 code lines and will be split — the first real-world demo).

## 6. A typical session (the full flow)

1. `vibeguard run claude` → gates green, fresh baseline, governed session.
2. The user asks for a feature. The agent declares its driftguard scope, assesses debt/security impact: risky request → **explicit warning to the user** before any code.
3. The agent codes. A module nears 160 lines → the law has taught it to split now; if it doesn't, the gate goes red at Stop → REGRESSION → blocked → self-correction.
4. At 100K tokens: handoff warning. At 120K: `HANDOFF.md` + clean relaunch. The driftguard scope survives.
5. End of task: driftguard Stop → drift/regressions processed (self-correction → justification → human arbitration in the dashboard, visual criticality).
6. CI: `vibeguard check` + `driftguard compare --ci` = the hard lock, whatever the host.

## 7. Roadmap

- **M1 — Core (this milestone)**: `init` (interactive level onboarding + profiles) + `rules.json`/instructions + the 5 non-AST gates (modules, debt, secrets, secure-code, deps) + `check [--json]` + debt/deps human commands + driftguard registration (probe + protected path) + laws for all 7 rules + Claude Code skill emission + fixtures/tests + English docs.
- **M2 — Wrapper & hosts**: `run <cli>` (host detection, artifacts, headroom chaining, green-gates-at-start) + Cursor/AGENTS.md adapters + handoff implementation (transcript counter on Claude Code, `HANDOFF.md` lifecycle).
- **M3 — AST gates & polish**: no-dead-code, error-handling, function-length (TS) + GitHub Action + beginner/expert documentation tracks + dogfooding driftguard splits + public release.

## 8. Risks

1. **Gate false positives → uninstall** (the existential risk, same as driftguard): cautious defaults, `warn` severity available per rule, inline `vibeguard-allow` pragmas with mandatory justification, human arbitration at the end of every chain.
2. **Token counting imprecise outside Claude Code**: announced as best-effort; handoff remains a discipline taught by the law even without an exact counter.
3. **Wrapper fragility across CLIs**: `run` = prepare + plain exec (no I/O interception); interception complexity stays in headroom, whose job it is.
4. **AST scope across languages**: TypeScript first, others via adapters — no universality promise in v1.
5. **Overlap with linters**: clear positioning — vibeguard-pack does not replace ESLint; it governs *the agent's behavior* (law + driftguard enforcement + human arbitration); linters remain tools that gates may invoke.

## 9. References

- "Dumb zone": Dex Horthy (HumanLayer) — degradation as context fills, U-shaped attention (Stanford "lost in the middle"); smart zone ≈ <75K, default here frozen at 120K by owner decision.
- Handoff: deliberate transfer to a fresh session via a structured document, instead of suffered compaction.
- driftguard: the sibling project (same GitHub account) — see its ARCHITECTURE.md for the enforcement loop invariants.
- headroom: github.com/chopratejas/headroom — context compression (lib/proxy/wrap).
