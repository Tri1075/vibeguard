/**
 * Enforcement postures — the engineer dial. Both keep ALL nine rules ACTIVE;
 * they differ only in what BLOCKS vs what merely advises. This is the lever that
 * lets an experienced engineer adopt the tool without being nagged about their
 * own code, while a beginner gets the full bar.
 *
 *  guardian (lean): block the AI's dangerous or sneaky moves — hardcoded
 *    secrets, insecure code, swallowed errors, unapproved dependencies — and let
 *    driftguard's drift & regression enforcement catch the rest. The two style
 *    rules (module size, debt markers) only advise, so it never blocks an
 *    engineer's existing 250-line file or a deliberate to-do note. Pairs with
 *    the "experienced" level. It polices the AI, not you.
 *  strict (full): the registry baseline — every deterministic rule blocks, the
 *    inherently-heuristic ones (plan/stack/dead-code) advise. The complete
 *    clean-code bar. Pairs with the "beginner" level.
 */
export type Posture = 'guardian' | 'strict';

/** Per-posture severity OVERRIDES; a rule not listed keeps its registry default. */
const POSTURE_OVERRIDES: Record<Posture, Record<string, 'block' | 'warn'>> = {
  // Relax the two "style nag" rules so brownfield code isn't blocked.
  guardian: {
    'modules-small': 'warn',
    'no-tech-debt': 'warn',
  },
  // No overrides — the registry defaults already block the deterministic rules.
  strict: {},
};

/** Sensible posture for an onboarding level (overridable by --posture). */
export function postureForProfile(profile: 'beginner' | 'experienced'): Posture {
  return profile === 'experienced' ? 'guardian' : 'strict';
}

/** Severity of a rule under a posture, falling back to the registry default. */
export function severityUnder(
  posture: Posture,
  ruleId: string,
  registryDefault: 'block' | 'warn',
): 'block' | 'warn' {
  return POSTURE_OVERRIDES[posture][ruleId] ?? registryDefault;
}
