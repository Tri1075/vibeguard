<!-- OWNER-EDITABLE — agents must never modify this file. -->
# Small, single-purpose modules (≤ 200 lines)

Every module does ONE nameable thing and stays under 200 code lines. Split BEFORE you reach the limit (you will be warned at ~160) — split by responsibility, never by arbitrary size. If a module goes red, split it; NEVER raise the limit yourself: that is an owner decision (editing .vibeguard/rules.json).
