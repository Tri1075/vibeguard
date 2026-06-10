/** The approved-dependency baseline: the human-blessed dependency set. */
import { z } from 'zod';
import type { VibeguardPaths } from './types.js';
import { readJson, writeJsonAtomic } from './store.js';

export interface DepEntry {
  version: string;
  /** which manifest declared it */
  manifest: string;
}
export type DepMap = Record<string, DepEntry>;

const DepsBaselineSchema = z.object({
  schemaVersion: z.literal(1),
  approved: z.record(z.object({ version: z.string(), manifest: z.string() })).default({}),
});

export async function readDepsBaseline(paths: VibeguardPaths): Promise<DepMap> {
  const raw = await readJson<unknown>(paths.depsBaselineFile);
  if (raw === null) return {};
  const parsed = DepsBaselineSchema.safeParse(raw);
  return parsed.success ? parsed.data.approved : {};
}

export async function writeDepsBaseline(paths: VibeguardPaths, approved: DepMap): Promise<void> {
  await writeJsonAtomic(paths.depsBaselineFile, { schemaVersion: 1, approved });
}
