#!/usr/bin/env bash
#
# vibeguard + driftguard — the loop, in ~60 seconds.
#
# Anonymized BY CONSTRUCTION: runs in a throwaway temp dir, a neutral shell
# prompt, and a neutral git identity. It never prints a real path, username, or
# hostname. Run it in a terminal (or render it with demo/demo.tape via vhs).
#
# Requires `vibeguard` and `driftguard` on PATH (install the plugin, or
# `npm i -g vibeguard drift-guard`).
set -euo pipefail

# --- neutral, PII-free environment -------------------------------------------
DEMO=$(mktemp -d)
trap 'rm -rf "$DEMO"' EXIT
cd "$DEMO"
export GIT_AUTHOR_NAME=dev GIT_AUTHOR_EMAIL=dev@example.com
export GIT_COMMITTER_NAME=dev GIT_COMMITTER_EMAIL=dev@example.com
export NO_COLOR=  # keep driftguard's own colors; the prompt below is neutral
PS1='$ '

step() { printf '\n\033[1;36m# %s\033[0m\n' "$*"; sleep 1; }
run()  { printf '\033[2m$ %s\033[0m\n' "$*"; eval "$*"; sleep 1; }

git init -q
printf 'export const price = (cents) => cents / 100;\n' > price.js
printf 'export const invoice = (eur) => `Total: ${eur} EUR`;\n' > billing.js
git add -A && git commit -qm "init"

step "One command governs the project — rules, gates, and live enforcement."
# In the published plugin this is just `vibeguard bootstrap`; here we point the
# gate probes at the locally-installed binary (the npm package isn't public yet).
run "vibeguard bootstrap --vibeguard-bin \"\$(command -v vibeguard)\" --quiet"

step "You ask for a change. The agent declares what it may touch."
run "driftguard scope set --task 'fix price rounding' --allow 'price.js' --agent --session demo"

step "The agent edits price.js (in scope) — but also wanders into billing.js."
printf 'export const price = (cents) => Math.round(cents) / 100;\n' > price.js
printf 'export const invoice = (eur) => `Total: ${eur} USD`;  // oops, not asked\n' > billing.js
# attribute both edits to the agent (what the PostToolUse hook does live)
for f in price.js billing.js; do
  printf '{"session_id":"demo","cwd":"%s","tool_name":"Edit","tool_input":{"file_path":"%s/%s"}}' "$DEMO" "$DEMO" "$f" \
    | driftguard hook post-tool-use >/dev/null 2>&1 || true
done

step "End of turn — driftguard compares, and won't let the drift pass."
run "driftguard compare || true"

step "The agent self-corrects: revert the accident, keep the real fix."
run "driftguard fix --apply --only billing.js || true"

step "Clean. The price fix stayed; the out-of-scope edit is gone."
run "driftguard compare || true"

step "And recurring drift becomes a standing rule — the guard learns."
# seed two prior occurrences so the pattern is real, then propose the rule
mkdir -p .driftguard/state
{
  printf '{"at":"2026-06-09T10:00:00Z","sessionId":"s1","itemId":"p1","kind":"file","ref":"billing.js","class":"drift","regression":false,"attributedTo":"agent"}\n'
  printf '{"at":"2026-06-10T10:00:00Z","sessionId":"s2","itemId":"p2","kind":"file","ref":"billing.js","class":"drift","regression":false,"attributedTo":"agent"}\n'
} >> .driftguard/state/drift-events.ndjson
run "driftguard patterns || true"

step "Detection feeds prevention. That loop is the whole point."
