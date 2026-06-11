/**
 * Bundle the self-contained plugin binaries with ncc. Both CLIs compile to a
 * single CJS file each (deps inlined), so the Claude Code plugin's hooks can run
 * `node "${CLAUDE_PLUGIN_ROOT}/plugin-bin/<tool>/index.js"` with no node_modules
 * and no npx. driftguard is bundled from a sibling checkout (DRIFTGUARD_SRC) for
 * now; at release it becomes an npm dependency bundled from node_modules.
 *
 * Output (plugin-bin/) is gitignored during development; committing it is the
 * release step that makes `/plugin install` work without a build.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'plugin-bin');
const driftSrc = process.env['DRIFTGUARD_SRC'] ?? path.join(root, '..', 'driftguard');

function bundle(name, cwd) {
  const dest = path.join(out, name);
  // Array args, no shell string: paths can't be re-interpreted as shell syntax.
  const args = ['-y', '@vercel/ncc', 'build', 'src/bin.ts', '-o', dest, '-m', '--no-source-map-register'];
  execFileSync('npx', args, { cwd, stdio: 'inherit' });
  pruneTypeDecls(dest);
}

/**
 * ncc emits the inlined dependencies' `.d.ts` files next to `index.js` — pure
 * type cruft the runtime never loads. Drop them so the committed release is just
 * the single executable bundle (plus ncc's tiny package.json), not 135 stray
 * declaration files.
 */
function pruneTypeDecls(dir) {
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      fs.rmSync(path.join(entry.parentPath ?? entry.path, entry.name));
    }
  }
}

fs.rmSync(out, { recursive: true, force: true });
bundle('vibeguard', root);
if (fs.existsSync(path.join(driftSrc, 'src', 'bin.ts'))) {
  bundle('driftguard', driftSrc);
} else {
  process.stderr.write(
    `note: driftguard source not at ${driftSrc} — plugin-bin/driftguard not built (set DRIFTGUARD_SRC)\n`,
  );
}
process.stdout.write(`bundled plugin binaries → ${out}\n`);
