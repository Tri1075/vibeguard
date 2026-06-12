/**
 * Wire driftguard's in-session enforcement into Kiro (.kiro/hooks/*.kiro.hook,
 * runCommand contract: stdout feeds the agent on exit 0, stderr feeds the
 * agent and blocks on non-zero). Two hooks, both whole-file ours (safe to
 * overwrite): the agentStop gate and the promptSubmit roadmap journal.
 * Schema follows the documented trigger/action types; flagged experimental in
 * the README until validated inside the real IDE.
 */
import path from 'node:path';
import { writeJsonAtomic } from '../../core/store.js';

const GATE = {
  enabled: true,
  name: 'vibeguard gate',
  description:
    'driftguard verdict when the agent finishes its turn: silent when clean; on drift the self-correction orders reach the agent via stderr',
  version: '1',
  when: { type: 'agentStop' },
  then: { type: 'runCommand', command: 'npx -y drift-guard hook stop --host kiro', timeout: 120 },
};

const ROADMAP = {
  enabled: true,
  name: 'vibeguard roadmap evidence',
  description: 'journal the user ask so drift reports show it next to the agent-declared scope',
  version: '1',
  when: { type: 'promptSubmit' },
  then: { type: 'runCommand', command: 'npx -y drift-guard hook prompt-submit --host kiro' },
};

/** Write both hook files. Returns the relative paths. */
export async function emitKiroHooks(root: string): Promise<string[]> {
  const gate = '.kiro/hooks/vibeguard-gate.kiro.hook';
  const roadmap = '.kiro/hooks/vibeguard-roadmap.kiro.hook';
  await writeJsonAtomic(path.join(root, gate), GATE);
  await writeJsonAtomic(path.join(root, roadmap), ROADMAP);
  return [gate, roadmap];
}
