# Changelog

All notable changes to vibeguard-pack are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **M14 — two dials + engineer positioning.** Adoption hinges on engineers not
  feeling babysat, so the tool now scales to both the person and the task.
  _Posture_ (`vibeguard init --posture guardian|strict`, also a `posture` field
  in `rules.json`) decides what blocks vs what merely advises: `guardian` (the
  experienced default) blocks the AI's dangerous moves — secrets, insecure code,
  swallowed errors, unapproved deps — and relaxes the two style-nag rules
  (module size, debt markers) to advisory, so a brownfield 250-line file or a
  deliberate `// TODO` is never blocked; `strict` (the beginner default) keeps
  the full clean-code bar. The emitted law gained a "Working with the user
  (scale to the task)" clause: a trivial change just gets done, a substantial
  one starts with a plan, and the agent _offers_ the choice ("just build it, or
  grill you on the design first?") instead of forcing or skipping it. The
  README's "For engineers" section now leads with "it polices the AI, not you,"
  the two postures, and "you own `rules.json`, the agent may never touch it."
  `bootstrap` defaults a fresh project to experienced + guardian so an engineer's
  first impression catches real risk without nagging their style. New
  `src/gates/postures.ts`, covered by `test/unit/postures.test.ts`.

- **M13 — demo.** `demo/run-demo.sh` runs the real loop on a throwaway project
  (govern → drift → block with the decision grammar → self-correct →
  patterns→CLAUDE.md) and `demo/demo.tape` renders it to a GIF with vhs.
  Anonymized by construction — a `mktemp` dir, a neutral git identity, a forced
  `PS1='$ '`, and local-binary probes (no npx, so no npm-log paths leak). PII
  audit of both repos (working tree + full git history + commit identities)
  came back clean.

- **M12 — self-review skill ("metacognition").** A new companion skill makes the
  agent its own first reviewer: after editing it surfaces what it touched
  (`driftguard compare`), judges each change against the rules (`vibeguard
check`), the declared scope, and the plan, fixes its own mistakes, records the
  reasoning, and re-verifies in a loop before handing back. Composed with the
  patterns→CLAUDE.md learning loop, the agent corrects and improves itself —
  the human arbitrates only what it genuinely cannot decide. (Pairs with the
  driftguard M12 Stop-latency cure so that self-review is cheap to run often.)

- **M11 — zero-friction plugin (foundation).** Toward "one install governs
  every project": a `vibeguard bootstrap` command does the whole idempotent
  setup in one shot (rules + driftguard config + gate probes + baseline), so a
  Claude Code SessionStart hook can frame a project with the user doing nothing
  but describe and decide. The CLI entrypoints (`src/bin.ts`) became
  ncc-bundlable (async IIFE), `scripts/bundle-plugin.mjs` compiles both vibeguard
  and driftguard to single self-contained binaries (no `node_modules`, no npx),
  and `hooks/hooks.json` wires the four lifecycle hooks to those bundled
  binaries via `${CLAUDE_PLUGIN_ROOT}` — so attribution and tamper-blocking are
  on by default, never disabled. The end-to-end plugin smoke caught a real
  driftguard bug (integrity key not canonicalized → false "tamper" across
  symlinked paths like macOS /var), now fixed. Bundles are gitignored during
  development; committing them is the release step.

### Changed

- **M10 — grill-with-docs & marketing.** The `plan-interview` skill ("grill
  me") evolved to follow Matt Pocock's `grill-with-docs`: it now grills the
  plan against the codebase's **domain model**, sharpens shared terminology,
  and persists the understanding into `CONTEXT.md` + short ADRs as it goes
  (token budget 250 → 400). README reworked for clarity on what the plugin
  delivers, an honest "why it's different" comparison (vs prompt-rule packs,
  linters, and skill collections), and a lighter-touch star ask.

### Fixed

- **M7 — audit remediation.** A four-auditor pass hardened the silent-failure
  surface. **Config:** a partial `rules.json` entry no longer silently promotes
  an advisory `warn` rule to `block` (zod defaults dropped for `severity`/
  `enabled`); a schema-invalid `rules.json` now fails loudly instead of
  reverting to defaults. **Wrapper:** `vibeguard run` returns a faithful exit
  code — 127 when the agent CLI can't be launched, `128+signal` on a signal
  death, instead of a misleading 0 (its e2e now uses a real stub on PATH, no
  longer passing only because the CLI was absent). **Driftguard probes** call
  `npx -y vibeguard-pack` (the published package) instead of the bare
  `vibeguard` name. **Gate precision:** secure-code stopped firing on the
  French word "des" (`\bDES\b` no longer `/i`), on method calls like
  `model.eval()`, and on `delete cache['a'+k]`; it now skips comment lines.
  no-tech-debt now catches trailing-comment markers (`doWork(); // TODO`,
  string-aware), skips Markdown headings, and treats an empty `markers` list as
  "disabled" (was "match everything"). no-secrets scans `.env.local`/unquoted
  env values and fine-grained GitHub PATs. `check <unknown-rule>` exits 2
  instead of a green 0; `deps approve Flask` stores under the matched key;
  `init --force` preserves the debt ledger and deps baseline; deps-hygiene now
  counts `devDependencies`. **Packaging:** the GitHub Action passes inputs via
  `env` (no `${{ }}`-into-`run` injection) and defaults to a pinned version;
  the CI plugin-sync check stages first so it catches untracked skills;
  AGENTS.md block repair recovers from corrupted markers; the npm `files`
  whitelist ships the plugin and docs, not the internal framing doc.

### Added

- **M5 — distribution & self-governance.** License switched to **MIT**.
  **Claude Code plugin marketplace**: the repo is now a plugin + marketplace
  (`/plugin marketplace add Tri1075/vibeguard-pack`); static `skills/` are
  generated from the TypeScript source (`npm run emit:plugin`) and CI fails on
  any drift between the two. **"No excuses" block** in the emitted law: the
  agent's favorite rationalizations, pre-refuted (token budget 1100 → 1300,
  owner decision). README rewritten ~40% shorter with the PLAN → BUILD →
  VERIFY → LEARN lifecycle and the engineers section un-collapsed.
  `docs/agent-skills.md`: using vibeguard as the enforcement layer under
  Addy Osmani's agent-skills (or any skills collection). vibeguard now
  **develops under its own governance** (driftguard probes, declared scopes,
  arbitrated drift).
- **M4 — plan, stack, and token economy.** Two new rules (9 total):
  `plan-first` (a project starts with a robust action plan — the gate checks
  PLAN.md exists and has substance; advisory by default so a missing plan never
  locks the wrapper out) and `robust-stack` (research the most robust stack and
  record the decision — the gate requires STACK.md or a `## Stack` plan section
  once a dependency manifest exists). New **plan-interview skill** ("grill me"):
  the agent interviews you about every branch of the plan's decision tree until
  shared understanding, exploring the codebase instead of asking when it can.
  New **write-a-prd skill**: problem description → codebase verification →
  relentless interview → deep-module design (user-validated, tests chosen by
  the user) → PRD filed as a GitHub issue from a fixed template.
  **Companion skill toolbox** completing the pipeline: `to-issues` (PRD →
  vertically-sliced independent GitHub issues), `tdd` (red-green-refactor per
  vertical slice, driftguard catches weakened tests), `diagnose` (reproduce →
  minimize → hypothesize → instrument → fix → regression-test) and `caveman`
  (ultra-terse reply mode; debt/security/drift warnings never compressed).
  Several skills are inspired by Matt Pocock's public skills collection
  (github.com/mattpocock/skills, MIT) — credit where credit is due.
  **Locked token budgets**: every agent-facing artifact (rules skill, protocol
  block, interview skill, handoff template) now has a maximum token cost
  asserted in the test suite — raising a budget is an owner decision.
- **M3 — every rule now has its police.** `no-dead-code` gate (commented-out
  code heuristic + unused-export graph for TS/JS — multi-line-import aware,
  type exports exempt by default) and `error-handling` gate (empty `catch`
  blocks incl. multi-line, empty promise `.catch`, Python `except: pass`).
  Reusable GitHub Action (`action.yml`). Low/info findings no longer block a
  `block`-severity rule (they advise; medium+ blocks).

- **M2 — session wrapper & handoff.** `vibeguard run <cli>` prepares a governed
  session (emits host rules, refuses to start on red, chains headroom) then
  launches the agent. Host adapters for Claude Code (skill), Cursor
  (`.cursor/rules`), and any agent (managed `AGENTS.md` block). `vibeguard
handoff` writes `HANDOFF.md`; `vibeguard tokens` names the context zone
  (smart / warn / handoff) to keep the model out of the "dumb zone".
- **M1 — core engine & 7 rules.** Law + police for modules-small, no-tech-debt,
  deps-hygiene, no-secrets, secure-code (gates), plus no-dead-code and
  error-handling (laws; AST gates land in M3). `init` with beginner/experienced
  onboarding, `check`, `debt`, `deps`, `rules`. driftguard integration: gates
  register as probes and `.vibeguard/**` is protected.

[Unreleased]: https://github.com/Tri1075/vibeguard-pack
