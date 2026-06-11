---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions — reproduce, minimize, hypothesize, instrument, fix, regression-test. Use when the user has a stubborn bug, a perf regression, or says "diagnose this".
---

# Diagnose

No edits until the bug is understood. Loop:

1. REPRODUCE — get a deterministic repro; if you cannot reproduce it, instrument until you can.
2. MINIMIZE — shrink the repro until every remaining element is load-bearing.
3. HYPOTHESIZE — state ONE testable cause; say what evidence would confirm or kill it.
4. INSTRUMENT — add targeted logging/measurement; gather the evidence; judge the hypothesis. Wrong? Back to 3.
5. FIX — the minimal change that addresses the confirmed cause, not the symptom.
6. REGRESSION-TEST — encode the bug as a test that fails on the old code; remove the instrumentation.
