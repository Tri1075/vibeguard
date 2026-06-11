/**
 * Enforcement postures — the engineer dial. `guardian` must keep every rule
 * ACTIVE but relax the two style-nag rules to advisory, so an engineer's
 * brownfield code (a 250-line file, a deliberate to-do note) is never blocked;
 * `strict` must preserve the registry baseline exactly. These are the severities
 * the user adopts the tool on, so they are a contract, not an implementation
 * detail.
 */
import { describe, expect, it } from 'vitest';
import { postureForProfile, severityUnder, type Posture } from '../../src/gates/postures.js';
import { RULE_DEFAULTS } from '../../src/gates/registry.js';

const STYLE_RULES = ['modules-small', 'no-tech-debt'];
const AI_DANGER_RULES = ['no-secrets', 'secure-code', 'error-handling', 'deps-hygiene'];

describe('postureForProfile', () => {
  it('gives an experienced engineer the lean guardian posture', () => {
    expect(postureForProfile('experienced')).toBe('guardian');
  });
  it('gives a beginner the full strict bar', () => {
    expect(postureForProfile('beginner')).toBe('strict');
  });
});

describe('severityUnder', () => {
  it('relaxes only the style-nag rules under guardian, never the AI-danger ones', () => {
    for (const def of RULE_DEFAULTS) {
      const sev = severityUnder('guardian', def.id, def.severity);
      if (STYLE_RULES.includes(def.id)) {
        expect(sev, `${def.id} should advise under guardian`).toBe('warn');
      } else {
        expect(sev, `${def.id} keeps its default under guardian`).toBe(def.severity);
      }
    }
  });

  it('keeps every AI-danger rule blocking under guardian', () => {
    for (const id of AI_DANGER_RULES) {
      expect(severityUnder('guardian', id, 'block')).toBe('block');
    }
  });

  it('changes nothing under strict — the registry default always wins', () => {
    for (const def of RULE_DEFAULTS) {
      expect(severityUnder('strict', def.id, def.severity)).toBe(def.severity);
    }
  });

  it('falls back to the registry default for an unknown rule id under any posture', () => {
    for (const posture of ['guardian', 'strict'] as Posture[]) {
      expect(severityUnder(posture, 'rule-that-does-not-exist', 'block')).toBe('block');
      expect(severityUnder(posture, 'rule-that-does-not-exist', 'warn')).toBe('warn');
    }
  });
});
