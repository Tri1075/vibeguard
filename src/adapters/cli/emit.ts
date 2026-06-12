/**
 * `vibeguard emit [hosts...]` — write the rule artifacts for hosts you don't
 * launch through the wrapper (IDEs: Cursor, Antigravity, Kiro) or for several
 * hosts at once. With no argument it lists what each host gets; `--all` emits
 * every artifact kind once (multiple AGENTS.md hosts share one managed block).
 */
import pc from 'picocolors';
import { findRoot } from '../../core/config.js';
import { detectHost, HOSTS, hostById, type HostId } from '../../core/hosts.js';
import { emitHostArtifacts } from '../hosts/emit.js';

export interface EmitOptions {
  all?: boolean;
}

export async function emitCommand(cwd: string, hosts: string[], opts: EmitOptions): Promise<void> {
  const root = findRoot(cwd);
  if (!root) {
    process.stderr.write(`${pc.red('not initialized')} — run \`vibeguard init\` first\n`);
    process.exit(2);
  }

  const ids = opts.all ? HOSTS.map((h) => h.id) : hosts.map((name) => resolveHost(name));
  if (ids.length === 0) {
    process.stdout.write(usage());
    return;
  }

  // Several AGENTS.md hosts share one managed block — emit each kind once.
  const written = new Set<string>();
  const seen = new Set<string>();
  for (const id of ids) {
    const kind = hostById(id).emit;
    if (seen.has(kind)) continue;
    seen.add(kind);
    for (const rel of await emitHostArtifacts(root, id)) written.add(rel);
  }
  process.stdout.write(`${pc.green('✓ rules emitted')} → ${[...written].join(', ')}\n`);
}

/** Accept host ids and CLI names alike ("cursor", "codex", "gemini-cli"…). */
function resolveHost(name: string): HostId {
  const direct = HOSTS.find((h) => h.id === name.toLowerCase());
  return direct ? direct.id : detectHost(name);
}

function usage(): string {
  const rows = HOSTS.map((h) => `  ${h.id.padEnd(12)} ${artifactFor(h.id).padEnd(28)} ${h.name}`);
  return [
    'usage: vibeguard emit <host...> | --all',
    '',
    rows.join('\n'),
    '',
    `Unknown agents read ${pc.bold('AGENTS.md')} too: \`vibeguard emit <your-cli>\` falls back to it.`,
    '',
  ].join('\n');
}

function artifactFor(id: HostId): string {
  switch (hostById(id).emit) {
    case 'claude-skill':
      return '.claude/skills/*';
    case 'cursor-rules':
      return '.cursor/rules/vibeguard.md';
    default:
      return 'AGENTS.md (managed block)';
  }
}
