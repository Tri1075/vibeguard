/** Locate the project root, load rules.json, and resolve per-rule config. */
import fs from 'node:fs';
import path from 'node:path';
import { RULE_DEFAULTS } from '../gates/registry.js';
import { pathsFor, VIBEGUARD_DIR } from './paths.js';
import { readJson } from './store.js';
import { RulesFileSchema, type RulesFile } from './rules-schema.js';
import type { ResolvedRule, VibeguardPaths } from './types.js';

export interface LoadedConfig {
  rules: RulesFile;
  resolved: Map<string, ResolvedRule>;
  paths: VibeguardPaths;
}

/** Walk up from `cwd` to find a directory containing .vibeguard/. */
export function findRoot(cwd: string): string | null {
  let dir = path.resolve(cwd);
  for (;;) {
    if (fs.existsSync(path.join(dir, VIBEGUARD_DIR))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export async function loadConfig(root: string): Promise<LoadedConfig> {
  const paths = pathsFor(root);
  const raw = await readJson<unknown>(paths.rulesFile);
  const parsed = RulesFileSchema.safeParse(raw ?? { schemaVersion: 1 });
  const rules: RulesFile = parsed.success ? parsed.data : RulesFileSchema.parse({ schemaVersion: 1 });
  return { rules, resolved: resolveRules(rules), paths };
}

/** Merge each rule's defaults with the owner's rules.json overrides. */
function resolveRules(rules: RulesFile): Map<string, ResolvedRule> {
  const out = new Map<string, ResolvedRule>();
  for (const def of RULE_DEFAULTS) {
    const override = rules.rules[def.id];
    out.set(def.id, {
      id: def.id,
      enabled: override?.enabled ?? true,
      severity: override?.severity ?? def.severity,
      params: { ...def.params, ...(override?.params ?? {}) },
      ignore: [...rules.ignore, ...(override?.ignore ?? [])],
    });
  }
  return out;
}
