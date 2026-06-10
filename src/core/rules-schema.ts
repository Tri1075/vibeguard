/** Single source of truth for .vibeguard/rules.json (the owner's control panel). */
import { z } from 'zod';

/** One rule entry: toggle, severity, free-form params, scoped ignores. */
const RuleEntrySchema = z.object({
  enabled: z.boolean().default(true),
  severity: z.enum(['block', 'warn']).default('block'),
  params: z.record(z.unknown()).default({}),
  ignore: z.array(z.string()).default([]),
});

export const RulesFileSchema = z.object({
  schemaVersion: z.literal(1),
  /** beginner | experienced — drives onboarding guidance, not protection */
  profile: z.enum(['beginner', 'experienced']).default('beginner'),
  /** project-wide ignore globs applied to every gate */
  ignore: z.array(z.string()).default([]),
  /** per-rule config, keyed by rule id; absent rules fall back to defaults */
  rules: z.record(RuleEntrySchema).default({}),
});

export type RuleEntry = z.infer<typeof RuleEntrySchema>;
export type RulesFile = z.infer<typeof RulesFileSchema>;
