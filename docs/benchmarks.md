# Benchmarks

Two questions, two reproducible benchmarks: **does the stack catch what an AI
agent actually slips in** (without crying wolf on clean code), and **what does
checking cost**. Both run against the bundled plugin binaries — exactly what
`/plugin marketplace add` ships — so the numbers describe what users get.

## 1. Detection: seeded faults, measured recall, zero false positives

Method (`node scripts/bench-detection.mjs`, exit 0 only if every fault is
caught AND the clean tree stays green on both tools):

- a fresh throwaway git repo is governed in **strict** posture (all nine rules
  gate; `guardian` intentionally downgrades the two style rules to advisory);
- each fault below is applied **alone** on a clean copy, then
  `vibeguard check --ci` and `driftguard compare --ci` run;
- agent attribution flows through the real PostToolUse hook, as in a live
  session;
- the control run first: the untouched governed tree must be fully green.

Result (2026-06-12, plugin binaries of this commit):

**Seeded faults caught: 11/11** (9 blocking, 2 advisory-by-design) ·
**False positives on the clean tree: none** (vibeguard none · driftguard none)

| Seeded fault (what an AI agent slips in)                           | Rule / class     | Caught by  | Result               |
| ------------------------------------------------------------------ | ---------------- | ---------- | -------------------- |
| Hardcoded AWS key pasted into source                               | `no-secrets`     | vibeguard  | ✅ caught — blocks   |
| Silently swallowed error (empty catch)                             | `error-handling` | vibeguard  | ✅ caught — blocks   |
| Monster module (250 lines, one file does everything)               | `modules-small`  | vibeguard  | ✅ caught — blocks   |
| Commented-out code kept "just in case"                             | `no-dead-code`   | vibeguard  | ✅ caught — advisory |
| Quick-hack marker without owner sign-off                           | `no-tech-debt`   | vibeguard  | ✅ caught — blocks   |
| Surprise dependency added without approval                         | `deps-hygiene`   | vibeguard  | ✅ caught — blocks   |
| Dynamic code execution on user input                               | `secure-code`    | vibeguard  | ✅ caught — blocks   |
| Plan deleted mid-project                                           | `plan-first`     | vibeguard  | ✅ caught — advisory |
| Out-of-scope edit (agent declared src/app.ts, touched src/util.ts) | `scope drift`    | driftguard | ✅ caught — blocks   |
| Green check broken (regression: empty catch lands after baseline)  | `regression`     | driftguard | ✅ caught — blocks   |
| Agent rewrites the owner's rules (.vibeguard/rules.json)           | `protected path` | driftguard | ✅ caught — blocks   |

Honest notes:

- **"advisory" is a design decision, not a miss**: commented-out code detection
  is a heuristic (the anti-false-positive discipline keeps it at info), and
  plan-first must never lock a project out of starting — the owner can promote
  either rule to `block` in `.vibeguard/rules.json`.
- Most of these faults are **invisible to a linter by construction** — secrets
  policy, unapproved dependencies, scope drift, behavioral regressions and
  guard tampering are not syntax. That is the point of pairing a law with a
  police rather than shipping another style checker.
- What this benchmark does NOT claim: end-to-end agent outcome quality (that
  varies with the model and the task). It measures the guard's contract: what
  gets through, what gets stopped.
- Writing this benchmark uncovered (and fixed) two real bugs: `check --ci`
  used to truncate reports past 64KB by exiting before stdout drained, and
  tracked-but-deleted files were phantom entries that let a deleted plan pass
  silently. A benchmark that can fail keeps everyone honest, including us.

## 2. Speed: one disk read per file, shared by all gates

Method (`node scripts/bench-check.mjs <dir> --synth 2000`): median of 7 runs
of `vibeguard check --ci`, process spawn included — what a user feels.

| Target                      | Before  | After      |       |
| --------------------------- | ------- | ---------- | ----- |
| Synthetic repo, 2000 files  | 1228 ms | **502 ms** | ×2.4  |
| driftguard repo (149 files) | 233 ms  | 199 ms     | −15 % |
| this repo (140 files)       | 205 ms  | 181 ms     | −12 % |

The gain grows with repo size (small repos are dominated by Node startup,
~80 ms). Within one check, every content gate shares a single read+decode per
file; the cache never outlives the run, so a new check always sees fresh edits.
