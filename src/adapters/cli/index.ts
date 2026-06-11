/** CLI wiring (commander). Keeps handlers in commands.ts / init.ts. */
import { Command } from 'commander';
import { TOOL_VERSION } from '../../version.js';
import { initCommand } from './init.js';
import { runCommand } from './run.js';
import { bootstrapCommand } from './bootstrap.js';
import { handoffCommand, tokensCommand } from './session.js';
import { checkCommand, debtAddCommand, depsApproveCommand, rulesCommand } from './commands.js';

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name('vibeguard')
    .description(
      'Essential engineering rules for vibecoders: small modules, no debt, dep hygiene, no secrets, secure code — law + gates.',
    )
    .version(TOOL_VERSION)
    .option('-C, --cwd <dir>', 'run as if started in <dir>', process.cwd());

  const cwd = (): string => program.opts<{ cwd: string }>().cwd;

  program
    .command('init')
    .description('scaffold .vibeguard/, write the rules, register with driftguard')
    .option('--profile <level>', 'beginner | experienced (skips the prompt)')
    .option('--posture <posture>', 'guardian (lean: block the dangerous, advise on style) | strict (full)')
    .option('--force', 'overwrite an existing setup')
    .action(
      async (opts: {
        profile?: 'beginner' | 'experienced';
        posture?: 'guardian' | 'strict';
        force?: boolean;
      }) => {
        await initCommand(cwd(), opts);
      },
    );

  program
    .command('bootstrap')
    .description(
      'idempotent one-shot setup: rules + driftguard config + probes + baseline (used by the plugin)',
    )
    .option('--driftguard-bin <path>', 'path to a bundled driftguard binary (else PATH)')
    .option('--vibeguard-bin <path>', 'path to a bundled vibeguard binary for the probe command')
    .option('--quiet', 'suppress the human-facing line')
    .action(async (opts: { driftguardBin?: string; vibeguardBin?: string; quiet?: boolean }) => {
      await bootstrapCommand(cwd(), opts);
    });

  program
    .command('run <cli> [args...]')
    .description('prepare a governed session (emit rules, green-gate, headroom) then launch the agent CLI')
    .option('--force', 'start even if gates are red')
    .option('--no-headroom', 'do not wrap the CLI with headroom')
    .allowUnknownOption(true)
    .action(async (cli: string, args: string[] = [], opts: { force?: boolean; headroom?: boolean }) => {
      await runCommand(cwd(), cli, args, opts);
    });

  program
    .command('handoff')
    .description('write HANDOFF.md for a clean session restart (anti dumb-zone, 120K tokens)')
    .action(async () => {
      await handoffCommand(cwd(), new Date().toISOString());
    });

  program
    .command('tokens [file]')
    .description('estimate context size and name the zone (smart / warn / handoff); reads stdin if no file')
    .action(async (file: string | undefined) => {
      await tokensCommand(cwd(), file);
    });

  program
    .command('check [rule]')
    .description('run all gates (or one rule); exit 1 if any block-severity rule fails')
    .option('--json', 'stable JSON output')
    .option('--ci', 'CI mode (implies --json)')
    .action(async (rule: string | undefined, opts: { json?: boolean; ci?: boolean }) => {
      await checkCommand(cwd(), rule, opts);
    });

  const debt = program.command('debt').description('technical-debt ledger (human-only)');
  debt
    .command('add <file>')
    .description('record an accepted technical debt for <file>')
    .requiredOption('--reason <text>', 'why this debt is accepted')
    .action(async (file: string, opts: { reason: string }) => {
      await debtAddCommand(cwd(), file, opts);
    });

  const deps = program.command('deps').description('dependency approval (human-only)');
  deps
    .command('approve [name]')
    .description('approve a new dependency (or all current ones if omitted)')
    .action(async (name: string | undefined) => {
      await depsApproveCommand(cwd(), name);
    });

  program
    .command('rules')
    .description('print the rule protocol (paste into .cursor/rules, AGENTS.md, any system prompt)')
    .option('--skill', 'Claude Code SKILL.md form (with frontmatter)')
    .action((opts: { skill?: boolean }) => {
      rulesCommand(opts);
    });

  await program.parseAsync(argv);
}
