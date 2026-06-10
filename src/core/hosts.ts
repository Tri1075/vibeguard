/** Detect which agent host a CLI name belongs to, so `run` emits the right artifact. */

export type HostId = 'claude-code' | 'cursor' | 'generic';

/** Map a CLI command (e.g. "claude", "/usr/local/bin/cursor", "aider") to a host. */
export function detectHost(cliName: string): HostId {
  const base = (cliName.split('/').pop() ?? cliName).toLowerCase();
  if (base.includes('claude')) return 'claude-code';
  if (base.includes('cursor')) return 'cursor';
  return 'generic';
}

/** Human label for messages. */
export function hostLabel(host: HostId): string {
  switch (host) {
    case 'claude-code':
      return 'Claude Code (skill + hard enforcement via driftguard hooks)';
    case 'cursor':
      return 'Cursor (.cursor/rules)';
    default:
      return 'generic agent (AGENTS.md)';
  }
}
