/**
 * `vibeguard init` — scaffold .vibeguard/, write owner-editable instructions,
 * seed the dependency baseline, and register with driftguard. Interactive level
 * onboarding (beginner vs experienced) tailors guidance, never protection.
 */
import fs from 'node:fs';
import readline from 'node:readline/promises';
import pc from 'picocolors';
import { pathsFor } from '../../core/paths.js';
import { parseManifestDeps } from '../../core/deps-parse.js';
import { writeDepsBaseline } from '../../core/deps-baseline.js';
import { writeFileAtomic, writeJsonAtomic } from '../../core/store.js';
import { LAWS } from '../../laws/texts.js';
import { RULE_DEFAULTS } from '../../gates/registry.js';
import { postureForProfile, severityUnder, type Posture } from '../../gates/postures.js';
import { listProjectFiles, makeReadText } from '../../core/files.js';
import { registerWithDriftguard } from './driftguard-link.js';
import type { GateContext } from '../../core/types.js';

export interface InitOptions {
  profile?: 'beginner' | 'experienced';
  posture?: Posture;
  force?: boolean;
}

export async function initCommand(cwd: string, opts: InitOptions): Promise<void> {
  const root = cwd;
  const paths = pathsFor(root);
  if (fs.existsSync(paths.rulesFile) && !opts.force) {
    process.stdout.write(`${pc.yellow('already initialized')} — ${paths.rulesFile} exists (use --force)\n`);
    return;
  }
  const profile = opts.profile ?? (await askProfile());
  // The engineer dial: experienced → guardian (lean), beginner → strict (full).
  const posture = opts.posture ?? postureForProfile(profile);

  await writeJsonAtomic(paths.rulesFile, defaultRulesFile(profile, posture));
  for (const law of LAWS) {
    await writeFileAtomic(`${paths.instructionsDir}/${law.id}.md`, instructionDoc(law, profile));
  }
  // --force re-scaffolds, but the debt ledger and deps baseline are accrued
  // human decisions: clobbering them would silently erase approvals (and
  // blanket-approve whatever deps are declared right now). Preserve both.
  if (!fs.existsSync(paths.debtFile)) await writeFileAtomic(paths.debtFile, debtLedgerHeader());
  if (!fs.existsSync(paths.depsBaselineFile)) await seedDepsBaseline(root, paths);
  const linked = await registerWithDriftguard(root);

  process.stdout.write(
    `${pc.green('✓ vibeguard initialized')} (level: ${profile}, posture: ${posture}${posture === 'guardian' ? ' — blocks the AI’s dangerous moves, advises on style' : ' — full clean-code bar'})\n` +
      `  ${LAWS.length} rules written to .vibeguard/instructions/ (yours to edit)\n` +
      `  ${linked ? 'registered as driftguard probes + protected .vibeguard/' : 'driftguard not found — gates run via `vibeguard check` and CI'}\n`,
  );
  printNextSteps(profile);
}

async function askProfile(): Promise<'beginner' | 'experienced'> {
  if (!process.stdin.isTTY) return 'beginner';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const a = (await rl.question(`${pc.bold('Your level — [b]eginner or [e]xperienced?')} `))
      .trim()
      .toLowerCase();
    return a.startsWith('e') ? 'experienced' : 'beginner';
  } finally {
    rl.close();
  }
}

function printNextSteps(profile: 'beginner' | 'experienced'): void {
  if (profile === 'experienced') {
    process.stdout.write(
      `${pc.dim('→ Tailor the rules to your habits: edit .vibeguard/rules.json and .vibeguard/instructions/*.md. They are yours — agents may never touch them.')}\n`,
    );
  } else {
    process.stdout.write(
      `${pc.dim('→ Safe defaults are set. Start coding with `vibeguard run <your-cli>`; read .vibeguard/instructions/ to learn the why.')}\n`,
    );
  }
}

function defaultRulesFile(profile: 'beginner' | 'experienced', posture: Posture): unknown {
  const rules: Record<string, unknown> = {};
  for (const def of RULE_DEFAULTS) {
    // The posture decides what blocks vs advises; all rules stay enabled.
    const severity = severityUnder(posture, def.id, def.severity);
    rules[def.id] = { enabled: true, severity, params: def.params, ignore: [] };
  }
  return { schemaVersion: 1, profile, posture, ignore: ['*.min.js', '*.lock', 'vendor/**'], rules };
}

function instructionDoc(law: { id: string; title: string; body: string }, profile: string): string {
  const why =
    profile === 'beginner'
      ? '\n\n> Why this matters: small, secure, debt-free code is what lets a project keep moving fast. These are the habits of the best engineers.'
      : '';
  return `<!-- OWNER-EDITABLE — agents must never modify this file. -->\n# ${law.title}\n\n${law.body}${why}\n`;
}

function debtLedgerHeader(): string {
  return [
    '<!-- OWNER-EDITABLE — the technical-debt ledger. Each entry is human-approved. -->',
    '# Technical debt ledger',
    '',
    'Every accepted shortcut is recorded here with a path, a reason, and a date.',
    'Add entries with `vibeguard debt add <path> --reason "<why>"`.',
    '',
  ].join('\n');
}

async function seedDepsBaseline(root: string, paths: ReturnType<typeof pathsFor>): Promise<void> {
  const files = await listProjectFiles(root);
  const readText = makeReadText(root);
  const ctx = { root, files, readText, paths } as unknown as GateContext;
  await writeDepsBaseline(paths, await parseManifestDeps(ctx));
}
