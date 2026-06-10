/**
 * Rule 3 — deps-hygiene: no dependency without human approval.
 *
 * Compares the project's current direct dependencies against the approved
 * baseline (.vibeguard/deps-baseline.json). Anything added or major-bumped that
 * the owner has not approved is red until `vibeguard deps approve` records it.
 * Supports npm (package.json) and Python (requirements.txt) at v1.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { readDepsBaseline, type DepMap } from '../core/deps-baseline.js';
import { parseManifestDeps } from '../core/deps-parse.js';

export const depsHygiene: Gate = {
  id: 'deps-hygiene',
  title: 'No new dependency without human approval',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const current = await parseManifestDeps(ctx);
  if (Object.keys(current).length === 0) return [];
  const baseline = await readDepsBaseline(ctx.paths);
  return diff(current, baseline);
}

/** Flag additions and major-version bumps not present in the approved baseline. */
function diff(current: DepMap, approved: DepMap): Finding[] {
  const findings: Finding[] = [];
  for (const [name, entry] of Object.entries(current)) {
    const known = approved[name];
    if (!known) {
      findings.push({
        rule: 'deps-hygiene',
        severity: 'high',
        file: entry.manifest,
        message: `new dependency "${name}@${entry.version}" is not approved`,
        fix: `Justify the need (and stdlib alternatives) to the user, then run \`vibeguard deps approve ${name}\`.`,
      });
    } else if (majorOf(entry.version) !== majorOf(known.version)) {
      findings.push({
        rule: 'deps-hygiene',
        severity: 'medium',
        file: entry.manifest,
        message: `major bump of "${name}": ${known.version} → ${entry.version} (approved: ${known.version})`,
        fix: `Review breaking changes with the user, then run \`vibeguard deps approve ${name}\`.`,
      });
    }
  }
  return findings;
}

function majorOf(version: string): string {
  const m = version.replace(/^[^\d]*/, '').match(/^(\d+)/);
  return m?.[1] ?? version;
}
