/**
 * Host registry: which agent host a CLI name belongs to, what rule artifact it
 * reads, and what enforcement it gets. One law (laws/skill.ts), one registry,
 * eight named hosts — anything unknown still works via the AGENTS.md standard.
 */

export type HostId =
  | 'claude-code'
  | 'cursor'
  | 'codex'
  | 'opencode'
  | 'hermes'
  | 'gemini'
  | 'antigravity'
  | 'kiro'
  | 'generic';

/** Where the law lands for this host. */
export type EmitKind = 'claude-skill' | 'cursor-rules' | 'agents-md';

/**
 * How the police runs there: `in-session` = lifecycle hooks block the agent
 * the moment it breaks a green check (Claude Code plugin); `finish-line` =
 * the wrapper refuses to start on red and runs the driftguard verdict when
 * the agent exits (plus `vibeguard check` in CI).
 */
export type Enforcement = 'in-session' | 'finish-line';

export interface Host {
  id: HostId;
  /** Human name for messages and the README matrix. */
  name: string;
  /** Substrings matched against the CLI basename (lowercased). */
  match: string[];
  emit: EmitKind;
  live: Enforcement;
}

/** Order matters: first match wins (e.g. `cursor-agent` before generic). */
export const HOSTS: Host[] = [
  { id: 'claude-code', name: 'Claude Code', match: ['claude'], emit: 'claude-skill', live: 'in-session' },
  { id: 'cursor', name: 'Cursor', match: ['cursor'], emit: 'cursor-rules', live: 'finish-line' },
  { id: 'codex', name: 'OpenAI Codex CLI', match: ['codex'], emit: 'agents-md', live: 'finish-line' },
  { id: 'opencode', name: 'OpenCode', match: ['opencode'], emit: 'agents-md', live: 'finish-line' },
  { id: 'hermes', name: 'Hermes Agent', match: ['hermes'], emit: 'agents-md', live: 'finish-line' },
  { id: 'gemini', name: 'Gemini CLI', match: ['gemini'], emit: 'agents-md', live: 'finish-line' },
  {
    id: 'antigravity',
    name: 'Antigravity IDE',
    match: ['antigravity'],
    emit: 'agents-md',
    live: 'finish-line',
  },
  { id: 'kiro', name: 'Kiro', match: ['kiro'], emit: 'agents-md', live: 'finish-line' },
];

const GENERIC: Host = {
  id: 'generic',
  name: 'generic agent',
  match: [],
  emit: 'agents-md',
  live: 'finish-line',
};

export function hostById(id: HostId): Host {
  return HOSTS.find((h) => h.id === id) ?? GENERIC;
}

/** Map a CLI command (e.g. "claude", "/usr/local/bin/cursor-agent", "aider") to a host. */
export function detectHost(cliName: string): HostId {
  const base = (cliName.split('/').pop() ?? cliName).toLowerCase();
  return (HOSTS.find((h) => h.match.some((m) => base.includes(m))) ?? GENERIC).id;
}

/** Human label for messages. */
export function hostLabel(host: HostId, cliName = ''): string {
  const h = hostById(host);
  switch (h.emit) {
    case 'claude-skill':
      return `${h.name} (skill + hard in-session enforcement via driftguard hooks)`;
    case 'cursor-rules':
      return `${h.name} (.cursor/rules)`;
    default:
      return host === 'generic' && cliName
        ? `generic agent "${(cliName.split('/').pop() ?? cliName).toLowerCase()}" (AGENTS.md)`
        : `${h.name} (AGENTS.md)`;
  }
}
