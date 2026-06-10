#!/usr/bin/env node
import pc from 'picocolors';
import { runCli } from './adapters/cli/index.js';

try {
  await runCli(process.argv);
} catch (e) {
  process.stderr.write(`${pc.red('vibeguard error:')} ${(e as Error).message}\n`);
  process.exit(2);
}
