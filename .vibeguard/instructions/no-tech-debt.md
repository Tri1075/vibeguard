<!-- OWNER-EDITABLE — agents must never modify this file. -->
# No silent technical debt

Before implementing, judge whether the request or your approach creates technical debt (a hack, duplication, a hardcoded value, a skipped test, a band-aid dependency). If it does, WARN THE USER first: "⚠️ Technical debt: <X>. Clean alternative: <Y> (cost: <Z>). Do you confirm?" Never introduce debt silently. If the user accepts, record it with `vibeguard debt add`.
