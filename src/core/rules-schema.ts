/** Single source of truth for .vibeguard/rules.json (the owner's control panel). */
import { z } from 'zod';

/**
 * One rule entry. `enabled` and `severity` are OPTIONAL with no default on
 * purpose: resolveRules() falls back to each rule's registry default via `??`,
 * so a partial entry (e.g. just `params`) must NOT see a zod-injected value —
 * otherwise touching one param of an advisory `warn` rule would silently
 * promote it to `block`. Absence here means "inherit the registry default".
 */
const RuleEntrySchema = z.object({
  enabled: z.boolean().optional(),
  severity: z.enum(['block', 'warn']).optional(),
  params: z.record(z.unknown()).default({}),
  ignore: z.array(z.string()).default([]),
});

export const RulesFileSchema = z.object({
  schemaVersion: z.literal(1),
  /** beginner | experienced — drives onboarding guidance, not protection */
  profile: z.enum(['beginner', 'experienced']).default('beginner'),
  /** enforcement posture this file was generated from (informational) */
  posture: z.enum(['guardian', 'strict']).optional(),
  /** project-wide ignore globs applied to every gate */
  ignore: z.array(z.string()).default([]),
  /** per-rule config, keyed by rule id; absent rules fall back to defaults */
  rules: z.record(RuleEntrySchema).default({}),
});

export type RuleEntry = z.infer<typeof RuleEntrySchema>;
export type RulesFile = z.infer<typeof RulesFileSchema>;
