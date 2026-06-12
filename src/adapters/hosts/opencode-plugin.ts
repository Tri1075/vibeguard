/**
 * Wire driftguard's in-session enforcement into OpenCode via its plugin API
 * (.opencode/plugins/vibeguard.js — https://opencode.ai/docs/plugins). The
 * plugin reuses the kiro hook dialect (orders on stderr + exit 1) as its
 * verdict probe: one CLI surface, two hosts. On session.idle it runs the gate
 * and, on drift, injects the self-correction orders back into the session
 * (capability-guarded; falls back to a loud log). tool.execute.before blocks
 * writes to protected paths instantly. Flagged experimental in the README
 * until validated inside the real host.
 */
import path from 'node:path';
import { writeFileAtomic } from '../../core/store.js';

const PLUGIN_SOURCE = `/**
 * vibeguard enforcement for OpenCode — emitted by \`vibeguard emit opencode\`.
 * Managed file: re-emitted on every run; do not edit (owner: .vibeguard/).
 */
export const VibeguardPlugin = async ({ client, $, directory }) => {
  let injections = 0; // belt: driftguard's own session state is the suspenders

  return {
    event: async ({ event }) => {
      if (event.type !== 'session.idle' || injections >= 2) return;
      const res = await $\`npx -y drift-guard hook stop --host kiro\`
        .cwd(directory)
        .quiet()
        .nothrow();
      if (res.exitCode !== 1) return; // clean, no project, or tooling error: fail-open
      const orders = String(res.stderr ?? '').trim();
      if (!orders) return;
      injections += 1;
      const sessionID = event.properties?.sessionID;
      try {
        await client.session.prompt({
          path: { id: sessionID },
          body: { parts: [{ type: 'text', text: orders }] },
        });
      } catch {
        try {
          await client.app.log({
            body: { service: 'vibeguard', level: 'error', message: orders },
          });
        } catch {
          /* never break the session for a tooling reason */
        }
      }
    },

    'tool.execute.before': async (input, output) => {
      const target = String(output?.args?.filePath ?? output?.args?.path ?? '');
      if (/(^|\\/)\\.(vibeguard|driftguard)\\//.test(target)) {
        throw new Error(
          'vibeguard: protected path — agents may never modify .vibeguard/ or .driftguard/ (owner-only).',
        );
      }
    },
  };
};
`;

/** Write the plugin file. Returns the relative path. */
export async function emitOpencodePlugin(root: string): Promise<string> {
  const rel = '.opencode/plugins/vibeguard.js';
  await writeFileAtomic(path.join(root, rel), PLUGIN_SOURCE);
  return rel;
}
