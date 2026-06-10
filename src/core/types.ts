/**
 * Shared contracts for vibeguard-pack.
 *
 * A "finding" is one rule violation: what was found, where, how serious, and how
 * to fix it. A "gate" turns a project tree into findings. Severity mirrors
 * driftguard's scale so the two tools speak the same visual language.
 */

/** Visual criticality, aligned with driftguard. */
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/** A single rule violation, with everything a human or an agent needs to act. */
export interface Finding {
  /** rule id that produced this finding, e.g. "modules-small" */
  rule: string;
  severity: Severity;
  /** POSIX path relative to the project root */
  file: string;
  /** 1-based line number when applicable */
  line?: number;
  /** one-line statement of WHAT is wrong */
  message: string;
  /** actionable HOW-to-fix hint */
  fix: string;
}

/** Result of running one gate over the project. */
export interface GateResult {
  rule: string;
  findings: Finding[];
}

/** A gate: pure analysis, no process exit, no console — the CLI renders. */
export interface Gate {
  /** stable rule id (kebab-case), also the probe name in driftguard */
  id: string;
  /** one-line human description */
  title: string;
  run: (ctx: GateContext) => Promise<Finding[]> | Finding[];
}

/** Everything a gate needs, resolved once by the runner. */
export interface GateContext {
  /** absolute project root */
  root: string;
  /** project files to scan: POSIX paths relative to root (already gitignore-filtered) */
  files: string[];
  /** the rule's resolved config (params + severity override) */
  rule: ResolvedRule;
  /** read a tracked file's text; returns null if unreadable/binary */
  readText: (relPath: string) => Promise<string | null>;
  /** layout of the .vibeguard/ directory */
  paths: VibeguardPaths;
}

/** Per-rule configuration, after merging defaults with rules.json. */
export interface ResolvedRule {
  id: string;
  enabled: boolean;
  /** block = red gate (fails CI / drift); warn = informational */
  severity: 'block' | 'warn';
  /** arbitrary rule parameters (e.g. maxLines), validated by each gate */
  params: Record<string, unknown>;
  /** extra ignore globs scoped to this rule */
  ignore: string[];
}

/** Resolved .vibeguard/ paths. */
export interface VibeguardPaths {
  root: string;
  dir: string;
  rulesFile: string;
  instructionsDir: string;
  debtFile: string;
  depsBaselineFile: string;
}
