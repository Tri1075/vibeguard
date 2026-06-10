/**
 * The check runner: resolve files once, run each enabled gate, collect findings.
 * Pure orchestration — no console, no exit. The CLI renders and maps exit codes.
 */
import ignoreFactory from 'ignore';
import { GATES } from '../gates/registry.js';
import type { LoadedConfig } from './config.js';
import { listProjectFiles, makeReadText } from './files.js';
import type { Finding, GateContext } from './types.js';

export interface CheckReport {
  root: string;
  findings: Finding[];
  /** ids of gates that actually ran (enabled + implemented) */
  ran: string[];
  /** true when at least one BLOCK-severity rule produced a finding */
  blocked: boolean;
}

export interface RunOptions {
  /** restrict to these rule ids (default: all enabled) */
  only?: string[];
}

export async function runCheck(config: LoadedConfig, opts: RunOptions = {}): Promise<CheckReport> {
  const root = config.paths.root;
  const allFiles = await listProjectFiles(root);
  const readText = makeReadText(root);
  const findings: Finding[] = [];
  const ran: string[] = [];
  let blocked = false;

  for (const gate of GATES) {
    const rule = config.resolved.get(gate.id);
    if (!rule || !rule.enabled) continue;
    if (opts.only && !opts.only.includes(gate.id)) continue;

    const files = applyIgnores(allFiles, rule.ignore);
    const ctx: GateContext = { root, files, rule, readText, paths: config.paths };
    const raw = await gate.run(ctx);
    ran.push(gate.id);

    // A rule set to `warn` downgrades its findings to info and never blocks.
    const adjusted = rule.severity === 'warn' ? raw.map((f) => ({ ...f, severity: 'info' as const })) : raw;
    if (rule.severity === 'block' && raw.length > 0) blocked = true;
    findings.push(...adjusted);
  }

  findings.sort(bySeverityThenFile);
  return { root, findings, ran, blocked };
}

function applyIgnores(files: string[], globs: string[]): string[] {
  if (globs.length === 0) return files;
  const ig = ignoreFactory().add(globs);
  return files.filter((f) => !ig.ignores(f));
}

const ORDER: Record<Finding['severity'], number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function bySeverityThenFile(a: Finding, b: Finding): number {
  const s = ORDER[a.severity] - ORDER[b.severity];
  return s !== 0 ? s : a.file < b.file ? -1 : a.file > b.file ? 1 : (a.line ?? 0) - (b.line ?? 0);
}
