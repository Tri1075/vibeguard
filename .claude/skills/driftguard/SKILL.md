---
name: driftguard
description: Anti-drift protocol you MUST follow on every coding task in this project. Declare a scope before editing, verify with driftguard compare before concluding, and treat every detected drift — never finish in silent drift.
---

# driftguard protocol (mandatory)

This project is guarded by driftguard. It snapshots observable behavior (probe outputs + file hashes) and compares before/after your work. Every change you make is classified `expected` (inside your declared scope) or `drift` (outside it). **You may not finish a task in unresolved drift.**

Two rules above all:
- **Code ONLY what the user asked.** Your declared scope must match their request — never wider.
- **Never break what worked.** A probe that was green at baseline and fails after your work is a REGRESSION: it is drift even if you declared that probe with `--allow-probe`. Fix your code until the probe is green again (or stop and ask the user).

## The protocol

1. **Before your FIRST edit** — declare your task scope (the contract):

   ```sh
   driftguard scope set --task "<one-line task summary>" \
     --allow "<glob of files you will touch>" [--allow "<glob2>" ...] \
     [--allow-probe <probe-name> ...] --agent [--session "<your session id>"]
   ```

   - `--allow` globs must be the NARROWEST set covering the task (e.g. `src/auth/**`, not `src/**`).
   - `--allow-probe` declares probes whose output is EXPECTED to change (e.g. `test` when you fix a bug that tests cover). Run `driftguard status` to see probe names.

2. **Edit only inside your scope.** If mid-task you discover you need a file outside it: stop and ask the user to extend the scope. Do not edit first.

3. **Before concluding** — run `driftguard compare`. Exit 0 = done. Exit 1 = drift.

4. **On drift, you MUST SELF-CORRECT (never ignore, never finish silently).** In order:
   1. **Regressions first**: a probe that was green and now fails means you broke working behavior — repair your code until it passes again.
   2. **Accidental out-of-scope edits**: revert them yourself — `driftguard fix --apply --only <path>` (or all at once: `driftguard fix --apply`; backups are taken).
   3. **Changes you believe NECESSARY for the task**: keep them but justify each one — `driftguard justify <path> --reason "<why this serves the task>"`. A justification does NOT clear the drift: it becomes a change request for the user.
   4. Re-run `driftguard compare`, then finish your turn and SUMMARIZE the justified change requests to the user. In mode `review` the user then decides — approve / reject / dismiss — via `driftguard ui` or `driftguard review`. In mode `auto`, everything out-of-scope must be reverted (exit 0) before you finish.
   - Check the current mode with `driftguard mode`.

5. **Strict prohibitions:**
   - Never run `driftguard review`, `driftguard ui`, `driftguard snapshot`, or `driftguard scope clear` — those are the user's.
   - Never approve, dismiss, or re-baseline to make drift disappear.
   - Never modify `.driftguard/**` or `.claude/settings.json` — these are protected paths; touching them is critical drift.
   - Never widen your own scope after declaring it without the user's explicit instruction (then re-run `scope set` quoting them).

## Why this matters

You cannot reliably self-assess scope creep; the guard gives you ground truth from output comparison. Following the protocol means the user always sees what changed, why, the action taken, and the evidence — and nothing outside the plan survives unreviewed.
