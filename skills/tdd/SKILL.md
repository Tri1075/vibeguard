---
name: tdd
description: Test-driven development with a red-green-refactor loop, one vertical slice at a time. Use when the user wants TDD, asks to build a feature test-first, or to fix a bug with a regression test.
---

# TDD — red, green, refactor

Build one vertical slice at a time. For each slice:

1. RED — write ONE failing test that states the behavior. Run it; confirm it fails for the right reason.
2. GREEN — write the minimum code that passes. No speculative generality.
3. REFACTOR — clean up with the tests green; the vibeguard rules (small modules, no dead code, error handling) apply here.
4. Repeat with the next slice.

Never write implementation before its failing test. Never weaken, skip or delete a test to get to green — driftguard treats that as drift and will block you.
