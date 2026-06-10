/** Parse direct dependencies from supported manifests into a uniform DepMap. */
import type { GateContext } from './types.js';
import type { DepMap } from './deps-baseline.js';

/** Read package.json + requirements.txt (when present) into one DepMap. */
export async function parseManifestDeps(ctx: GateContext): Promise<DepMap> {
  const out: DepMap = {};
  if (ctx.files.includes('package.json')) {
    Object.assign(out, parsePackageJson(await ctx.readText('package.json')));
  }
  if (ctx.files.includes('requirements.txt')) {
    Object.assign(out, parseRequirements(await ctx.readText('requirements.txt')));
  }
  return out;
}

function parsePackageJson(text: string | null): DepMap {
  if (!text) return {};
  let json: { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> };
  try {
    json = JSON.parse(text) as typeof json;
  } catch {
    return {};
  }
  const out: DepMap = {};
  for (const block of [json.dependencies, json.optionalDependencies]) {
    for (const [name, version] of Object.entries(block ?? {})) {
      out[name] = { version: cleanRange(version), manifest: 'package.json' };
    }
  }
  return out;
}

function parseRequirements(text: string | null): DepMap {
  if (!text) return {};
  const out: DepMap = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('-')) continue;
    const m = line.match(/^([A-Za-z0-9._-]+)\s*(?:[=<>!~]=?\s*([0-9][^\s;]*))?/);
    if (m?.[1]) out[m[1].toLowerCase()] = { version: m[2] ?? '*', manifest: 'requirements.txt' };
  }
  return out;
}

/** Strip range operators (^, ~, >=, …) to a bare version for comparison. */
function cleanRange(version: string): string {
  return version.replace(/^[\^~>=<\s]*/, '').trim() || '*';
}
