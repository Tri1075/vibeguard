/**
 * The self-review skill — "metacognition". The agent becomes its OWN first
 * reviewer: after editing, it surfaces exactly what it touched, judges each
 * change against the rules, the scope, and the plan, fixes its own mistakes,
 * and records the reasoning — before the Stop gate or the human ever sees it.
 * No mysticism: it's a disciplined reflection loop over the deterministic tools
 * (driftguard compare, vibeguard check) plus the patterns→CLAUDE.md learning
 * loop. That composition IS the tool correcting and improving itself.
 */

export function selfReviewSkillMarkdown(): string {
  return [
    '---',
    'name: vibeguard-self-review',
    'description: Metacognition — after a chunk of editing, the agent audits its OWN changes against the rules, the declared scope, and the plan, fixes what it broke, and records why, before handing back. Use after editing, or when the user says "review yourself", "self-correct", or "metacognition".',
    '---',
    '',
    '# Self-review — be your own first reviewer',
    '',
    'Before you say you are done, audit your OWN changes with full awareness of what you touched.',
    '',
    '1. SURFACE what changed: run `driftguard compare` (and read the diff as if a stranger wrote it). Know every file you touched and why.',
    '2. JUDGE it against three things: the rules (`vibeguard check`), the declared scope (is anything out of bounds?), and the plan (does PLAN.md still hold, or did you drift?).',
    '3. FIX your own mistakes now — do not wait to be caught. A rule red → repair the code. Out of scope → revert it, or justify it with a real reason. Plan drift → update the plan and say so out loud.',
    '4. NAME the reasoning: one line per significant change — what you did and why — so the next reader, and the next you, inherit the intent.',
    '5. RE-VERIFY in a loop until `vibeguard check` is green and `driftguard compare` shows only changes you can defend. Only then hand back.',
    '',
    'You are your own first reviewer; the human arbitrates what you genuinely cannot decide — not what you should have caught yourself. Over time, recurring mistakes become standing rules (`driftguard patterns`), so the same error is not made twice: detection feeds prevention, and the tool improves itself.',
    '',
  ].join('\n');
}
