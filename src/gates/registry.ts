/**
 * The gate registry: rule id → gate implementation, plus their built-in
 * defaults. Every rule ships law + police; `no-dead-code` defaults to `warn`
 * because its detectors are heuristic (owner can promote it to `block`).
 */
import type { Gate } from '../core/types.js';
import { modulesSmall } from './modules-small.js';
import { noTechDebt } from './no-tech-debt.js';
import { noSecrets } from './no-secrets.js';
import { secureCode } from './secure-code.js';
import { depsHygiene } from './deps-hygiene.js';
import { noDeadCode } from './no-dead-code.js';
import { errorHandling } from './error-handling.js';

/** All gates, in display order. As of M3 every rule has its police. */
export const GATES: Gate[] = [
  modulesSmall,
  noTechDebt,
  depsHygiene,
  noSecrets,
  secureCode,
  noDeadCode,
  errorHandling,
];

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
  { id: 'no-dead-code', severity: 'warn', params: { minCommentedRun: 3 }, hasGate: true },
  { id: 'error-handling', severity: 'block', params: {}, hasGate: true },
];

export function gateById(id: string): Gate | undefined {
  return GATES.find((g) => g.id === id);
}
