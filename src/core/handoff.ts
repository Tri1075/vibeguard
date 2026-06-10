/**
 * Build the HANDOFF.md a session writes before it relaunches fresh. We fill the
 * machine-knowable facts (driftguard scope/verdict, changed files); the agent
 * fills the prose (what's done, what's next, traps). driftguard carries the
 * scope across the handoff, so the new session inherits the contract.
 */

export interface HandoffFacts {
  createdAt: string;
  task: string | null;
  allowGlobs: string[];
  driftStatus: string | null;
  changedFiles: string[];
}

export function buildHandoffDoc(f: HandoffFacts): string {
  const scope = f.task
    ? `"${f.task}" — allowed: ${f.allowGlobs.join(', ') || '(none)'}`
    : '(no driftguard scope declared)';
  const drift = f.driftStatus ? f.driftStatus : '(driftguard not active)';
  const changed =
    f.changedFiles.length > 0 ? f.changedFiles.map((p) => `- ${p}`).join('\n') : '- (none detected)';

  return [
    '# Session handoff',
    '',
    `Generated ${f.createdAt} by \`vibeguard handoff\`. Re-inject this file at the start of the next session.`,
    '',
    '## Contract (carried by driftguard)',
    `- Task scope: ${scope}`,
    `- driftguard verdict: ${drift}`,
    '',
    '## Files changed this session',
    changed,
    '',
    '## Done so far',
    '<!-- agent: summarize what is complete and verified -->',
    '',
    '## Next steps',
    '<!-- agent: the very next actions, in order -->',
    '',
    '## Decisions & rationale',
    '<!-- agent: choices made and why, so the next session does not relitigate them -->',
    '',
    '## Traps / gotchas',
    '<!-- agent: anything that bit you or will bite the next session -->',
    '',
  ].join('\n');
}
