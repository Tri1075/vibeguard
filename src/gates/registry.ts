/**
 * The gate registry: rule id → gate implementation, plus their built-in
 * defaults. Rules 6 (no-dead-code) and 7 (error-handling) ship their LAW in M1
 * but their AST gate lands in M3 — they are intentionally absent here so the
 * runner treats them as law-only for now.
 */
import type { Gate } from '../core/types.js';
import { modulesSmall } from './modules-small.js';
import { noTechDebt } from './no-tech-debt.js';
import { noSecrets } from './no-secrets.js';
import { secureCode } from './secure-code.js';
import { depsHygiene } from './deps-hygiene.js';

/** All gates available at this milestone, in display order. */
export const GATES: Gate[] = [modulesSmall, noTechDebt, depsHygiene, noSecrets, secureCode];

/** Default rules.json entry for every rule (laws included, even AST-pending ones). */
export interface RuleDefault {
  id: string;
  severity: 'block' | 'warn';
  params: Record<string, unknown>;
  /** false → law-only for now (gate arrives in a later milestone) */
  hasGate: boolean;
}

export const RULE_DEFAULTS: RuleDefault[] = [
  { id: 'modules-small', severity: 'block', params: { maxLines: 200, warnAt: 160 }, hasGate: true },
  {
    id: 'no-tech-debt',
    severity: 'block',
    params: { markers: ['TODO', 'FIXME', 'HACK', 'XXX'] },
    hasGate: true,
  },
  { id: 'deps-hygiene', severity: 'block', params: {}, hasGate: true },
  { id: 'no-secrets', severity: 'block', params: {}, hasGate: true },
  { id: 'secure-code', severity: 'block', params: {}, hasGate: true },
  { id: 'no-dead-code', severity: 'warn', params: {}, hasGate: false },
  { id: 'error-handling', severity: 'block', params: {}, hasGate: false },
];

export function gateById(id: string): Gate | undefined {
  return GATES.find((g) => g.id === id);
}
