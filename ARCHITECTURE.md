# vibeguard — Architecture & handover guide

For the next maintainer (or the curious contributor): how the system works, the
invariants you must not break, and where to extend things. Read it next to the
code — every module starts with a header comment stating its single purpose.
The sibling engine has its own guide: [driftguard ARCHITECTURE](https://github.com/Tri1075/driftguard/blob/main/ARCHITECTURE.md).

## 1. What the product is (one paragraph)

vibeguard makes an AI coding agent follow nine engineering rules by pairing
every rule with two artifacts from ONE source: the **law** (markdown the agent
reads — a Claude Code skill, a `.cursor/rules` file, or an `AGENTS.md` block)
and the **police** (a deterministic gate, `vibeguard check`, exit 0/1). With
[driftguard](https://github.com/Tri1075/driftguard) present, the gates become
live probes: a rule that goes green→red mid-session **blocks the agent at the
end of its turn** until it self-corrects, and recurring drift becomes a
standing CLAUDE.md rule (detection feeds prevention). The human owns the dial
(`rules.json`) — agents may never touch it.

## 2. System map

```
                ┌────────────────────── adapters/ ──────────────────────────┐
 user/agent ──► │ cli/    commander wiring (index) · init · bootstrap       │
                │         · govern (bare `npx vibeguard`) · run (wrapper +  │
                │         finish-line verdict) · emit (per-host artifacts)  │
                │         · review-proxy (front door to driftguard review/  │
                │         ui) · commands (check/debt/deps/rules) · session  │
                │         (handoff/tokens) · render · driftguard-link       │
 hosts ───────► │ hosts/  emit.ts (skill / cursor-rules / AGENTS.md kinds)  │
                │         agents-md.ts (managed block, marker-repairing)    │
                └────────────────────────────┬───────────────────────────---┘
                                             │ adapters depend on core/gates/laws,
                                             ▼ never the reverse
                ┌────────────────────── the three sources ──────────────────┐
                │ laws/   texts.ts — THE nine rules, one paragraph each     │
                │         skill.ts — compiles them into SKILL.md + protocol │
                │         (token-budgeted; tests assert the budgets)        │
                │         extra-skills.ts + 7 skill files — the workflow    │
                │         toolbox (grill me, PRD, issues, TDD, self-review…)│
                │ gates/  registry.ts — GATES list; one file per rule;      │
                │         postures.ts (guardian/strict severity mapping);   │
                │         params.ts/plan-docs.ts shared helpers             │
                │ core/   config (rules.json load+resolve) · runner (check  │
                │         orchestration) · files (discovery + per-run       │
                │         cached reads) · hosts (8-host registry) · tokens  │
                │         (estimate+zones) · handoff · deps-* · exports-    │
                │         graph · comments · langs · git · paths · store    │
                └────────────────────────────────────────────────────────---┘

 plugin: .claude-plugin/ (manifest+marketplace) · hooks/hooks.json (lifecycle)
         · plugin-bin/ (COMMITTED ncc bundles of vibeguard AND driftguard —
         a Claude Code plugin is cloned, not built)
 scripts: bundle-plugin · emit-plugin (skills/ sync) · smoke-plugin (e2e hook
         lifecycle vs bundled binaries) · bench-check (speed) ·
         bench-detection (+bench-faults: seeded-fault recall, zero-FP control)
```

## 3. Data flow of one `check`

1. `core/config.ts` loads `.vibeguard/rules.json`, applies the posture map
   (`gates/postures.ts`) and per-rule overrides → resolved rules (severity
   `block|warn`, params, per-rule ignore globs).
2. `core/files.ts#listProjectFiles` builds the file universe once —
   `git ls-files` (tracked + untracked-not-ignored, **minus deleted**) or a
   plain walk; `makeCachedReadText` gives every gate one shared read+decode
   per file (the ×2.4 measured speedup, see docs/benchmarks.md).
3. `core/runner.ts` runs each enabled gate with its filtered view; a `warn`
   rule's findings are downgraded to info; only medium+ findings on a `block`
   rule set `blocked` (the low/info band is always advisory).
4. `adapters/cli/commands.ts#checkCommand` renders TTY or `--json|--ci` and
   sets `process.exitCode` (never `process.exit` — a hard exit truncates piped
   JSON past 64KB).

## 4. The one-source invariant (law ⇄ police)

A rule exists exactly once, in three projections that must never drift apart:
`laws/texts.ts` (what the agent reads), `gates/<rule>.ts` (what the police
checks), and the README rules table (what the human shops). The emitted
artifacts (`skills/`, `.claude/skills/`) are **generated** — `npm run
emit:plugin` regenerates them and CI fails if they differ from source
(`git add -A skills/ && git diff --cached --exit-code`). Generated trees are
prettier-ignored: generated ≠ formatted.

## 5. Token budgets are a contract

Everything emitted into an agent's context is budgeted and the budgets are
asserted by tests (`test/unit/m4-gates.test.ts`): the law ≤ 1400 tokens
(owner-approved raises only: 1100 → 1300 for "No excuses", 1300 → 1400 for the
Karpathy directives), each companion skill has its own `budgetTokens`, the
HANDOFF template ≤ 300. Raising a budget is an owner decision recorded in the
test file, never a side effect of editing prose.

## 6. Enforcement tiers (how the police actually runs)

| Tier       | Mechanism                                                                                                              | Guarantee                           |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| CLI / CI   | `vibeguard check --ci` exit 0/1                                                                                        | merge gate, host-agnostic           |
| Wrapper    | `run <cli>`: refuses to start on red, then **driftguard verdict at agent exit** (drift → exit 1, fail-open on tooling) | finish-line enforcement on any host |
| In-session | the Claude Code plugin: gates registered as driftguard probes, Stop hook blocks green→red until self-corrected         | the full loop, zero-config          |

`adapters/cli/driftguard-link.ts` writes the bridge: portable probe commands
(`npx -y vibeguard-pack check <rule> --ci`) into the committed
`.driftguard/config.json`, machine-local bundled-binary commands into the
gitignored `config.local.json` overlay, and `.vibeguard/**` into driftguard's
protected paths. Probes are re-registered on every bootstrap (self-healing
paths).

## 7. Invariants (do not break)

- **`.vibeguard/**`is owner-only.** The law says it, driftguard enforces it
(protected path), and the tools never edit it themselves — gates read`rules.json`, they do not write it.
- **Hooks and wrappers fail open.** A vibeguard/driftguard bug must never
  break a user's session or hold an agent hostage (`bootstrap --quiet` is
  silent off-git; the finish-line verdict ignores tooling errors).
- **Bootstrap governs git repos only** — the plugin fires in every folder a
  session opens; a non-repo folder must stay untouched.
- **Anti-false-positive discipline.** Heuristic gates stay at advisory
  severity where ambiguity is real (commented-code detection, thin plans);
  fixtures in our own tooling are assembled by concatenation so the gates
  scanning this repo never see forbidden literals; an FP fix never deletes
  the case, it reformulates it. One noisy block and users uninstall — the
  zero-FP control run in `bench-detection` is the regression test for this.
- **Module size ≤ 200 code lines** (comments/blanks excluded) — enforced by
  our own `modules-small` gate on this repo (it has blocked this repo's own
  development more than once; split by responsibility, never raise the limit).
- **`plugin-bin/` is committed at release** and excluded from gates/lint/
  format; `bundle:plugin` runs `typecheck` first because ncc catches strict-TS
  errors that tsup/vitest let through.

## 8. Extension points

- **Add a rule**: law paragraph in `laws/texts.ts` + gate file in `gates/`
  (+ entry in `gates/registry.ts`, posture mapping in `postures.ts` if it
  should relax under guardian) + tests + README table row — and check the law
  still fits its token budget. The gate is registered as a driftguard probe
  automatically on the next bootstrap.
- **Add a host**: one entry in `core/hosts.ts` (match strings, emit kind,
  enforcement tier). New emission kinds go in `adapters/hosts/emit.ts`.
- **Add a workflow skill**: a file in `laws/`, registered in
  `extra-skills.ts` with an explicit `budgetTokens`; `emit:plugin` ships it.
- **Tune for a project** (owner): `.vibeguard/rules.json` — posture, per-rule
  severity/params/ignore. This file is the entire public configuration
  surface.

## 9. Testing strategy

`test/unit/` per concern (gates, postures, budgets, file cache, tokens);
`test/e2e/` drives the real CLI binary in throwaway dirs with **hermetic
PATH** (a driftguard on the dev machine must not change vibeguard-only
behavior) and stub agent/driftguard executables on PATH for wrapper tests.
`scripts/smoke-plugin.sh` is the release proof: the exact hook lifecycle
against the committed bundles. `scripts/bench-detection.mjs` is the product
proof: seeded faults caught, clean tree green. CI runs ubuntu per push; the
macOS leg runs weekly (minutes bill 10×).
