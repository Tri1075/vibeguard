#!/usr/bin/env bash
#
# Smoke-test the Claude Code plugin END TO END against the BUNDLED binaries —
# the real proof that `/plugin marketplace add` will work without a build step.
# It drives the exact lifecycle the hooks (hooks/hooks.json) fire, using only
# plugin-bin/ (no dev dist, no npx), exactly as Claude Code does with
# ${CLAUDE_PLUGIN_ROOT}:
#
#   SessionStart  → vibeguard bootstrap (rules + driftguard config + probes +
#                   baseline) + driftguard hook session-start (framing context)
#   PostToolUse   → driftguard hook post-tool-use (attribute an edit)
#   Stop          → driftguard hook stop (BLOCK on a gate regression)
#
# Runs in a throwaway repo with a neutral identity (no PII). Exits non-zero the
# moment any stage misbehaves, so it can gate CI and releases.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VG="$ROOT/plugin-bin/vibeguard/index.js"
DG="$ROOT/plugin-bin/driftguard/index.js"

pass() { printf '  \033[32mok\033[0m   %s\n' "$1"; }
fail() { printf '  \033[31mFAIL\033[0m %s\n' "$1"; exit 1; }

for b in "$VG" "$DG"; do
  [ -f "$b" ] || fail "missing bundle $b — run: npm run bundle:plugin"
done

PROJ="$(mktemp -d)"
trap 'rm -rf "$PROJ"' EXIT
cd "$PROJ"
git init -q
git config user.email "ci@example.com"
git config user.name "ci"
mkdir -p src
printf 'export function add(a: number, b: number): number {\n  return a + b;\n}\n' >src/app.ts
printf '{\n  "name": "smoke-app",\n  "version": "0.0.0"\n}\n' >package.json
git add -A && git commit -qm init

echo "== SessionStart outside a git repo (must be a no-op) =="
# The plugin fires bootstrap in EVERY folder a session opens ($HOME, downloads…)
# — outside a git repo it must write nothing and scan nothing.
NOGIT="$(mktemp -d)"
(cd "$NOGIT" && node "$VG" bootstrap --driftguard-bin "$DG" --vibeguard-bin "$VG" --quiet)
[ ! -e "$NOGIT/.vibeguard" ] || fail "bootstrap governed a non-git folder"
[ ! -e "$NOGIT/.driftguard" ] || fail "bootstrap wrote driftguard state in a non-git folder"
rm -rf "$NOGIT"
pass "bootstrap is a silent no-op outside a git repo"

echo "== SessionStart =="
node "$VG" bootstrap --driftguard-bin "$DG" --vibeguard-bin "$VG" --quiet
[ -f .vibeguard/rules.json ] || fail "bootstrap: no .vibeguard/rules.json"
[ -f .driftguard/config.json ] || fail "bootstrap: no .driftguard/config.json"
[ -f .driftguard/snapshots/baseline.json ] || fail "bootstrap: no baseline snapshot"
pass "bootstrap wrote rules + driftguard config + baseline"

# Committed config stays portable; this machine's bundled binary lives in the
# gitignored overlay — an absolute path must never land in config.json.
grep -q "npx -y vibeguard-pack check" .driftguard/config.json || fail "config.json: probes are not portable"
grep -qF "$VG" .driftguard/config.json && fail "config.json leaks the local binary path"
[ -f .driftguard/config.local.json ] || fail "no config.local.json overlay"
grep -qF "$VG" .driftguard/config.local.json || fail "overlay does not carry the bundled binary"
grep -q "config.local.json" .driftguard/.gitignore || fail "overlay is not gitignored"
pass "probe cmds: portable in config.json, machine-local in config.local.json"

CTX="$(printf '{"session_id":"smoke","cwd":"%s","source":"startup"}' "$PROJ" | node "$DG" hook session-start)"
printf '%s' "$CTX" | grep -q 'additionalContext' || fail "session-start: no framing context emitted"
pass "session-start emitted framing context"

echo "== PostToolUse =="
printf '\nexport const VERSION = 1;\n' >>src/app.ts
printf '{"session_id":"smoke","cwd":"%s","tool_name":"Edit","tool_input":{"file_path":"src/app.ts"}}' "$PROJ" |
  node "$DG" hook post-tool-use
grep -rq "app.ts" .driftguard/journal* .driftguard/state 2>/dev/null ||
  grep -rq "app.ts" .driftguard 2>/dev/null ||
  fail "post-tool-use: the edit was not attributed in the journal"
pass "post-tool-use attributed the edit in the journal"

echo "== Stop (must BLOCK a regression) =="
# An empty catch trips error-handling — a guardian-BLOCKING gate — so the probe
# goes green->red vs the baseline. (modules-small/no-tech-debt only advise under
# guardian, so a long file or a stray marker would NOT block here — the point.)
# The catch body is written multi-line ({\n  }) so this harness file does not
# itself read as an empty catch to the gate, while the temp project still gets a
# real one.
printf 'export function risky(): void {\n  try {\n    add(1, 2);\n  } catch (e) {\n  }\n}\n' >src/risky.ts
OUT="$(printf '{"session_id":"smoke","cwd":"%s"}' "$PROJ" | node "$DG" hook stop)"
printf '%s' "$OUT" | grep -q '"decision":"block"' ||
  fail "stop: did not block on a gate regression — got: $OUT"
pass "Stop blocked the regression with a decision"
printf '%s' "$OUT" | grep -q '"reason"' || fail "stop: the block carried no reason"
pass "the block carried a decision-grammar reason"

echo "== Session restart (must NOT launder the regression) =="
# A new session re-runs bootstrap, which refreshes the baseline. The unresolved
# green→red must survive the refresh — restarting is not an escape hatch.
node "$VG" bootstrap --driftguard-bin "$DG" --vibeguard-bin "$VG" --quiet
OUT2="$(printf '{"session_id":"smoke-2","cwd":"%s"}' "$PROJ" | node "$DG" hook stop)"
printf '%s' "$OUT2" | grep -q '"decision":"block"' ||
  fail "stop: a session restart laundered the regression — got: $OUT2"
pass "the regression still blocks after a re-bootstrap (new session)"

echo
printf '\033[32mPLUGIN LIFECYCLE OK\033[0m — bundled binaries drive bootstrap -> context -> journal -> block.\n'
