#!/usr/bin/env node
import pc from 'picocolors';
import { runCli } from './adapters/cli/index.js';

// An async IIFE rather than top-level await: identical behavior under ESM, but
// it also lets the plugin bundler (ncc) compile this entry to a single CJS file
// for the Claude Code plugin (`${CLAUDE_PLUGIN_ROOT}/...`).
void (async () => {
  try {
    await runCli(process.argv);
  } catch (e) {
    process.stderr.write(`${pc.red('vibeguard error:')} ${(e as Error).message}\n`);
    process.exit(2);
  }
})();
