/** Tiny typed readers for the free-form `params` bag on a resolved rule. */

export function numberParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

export function stringArrayParam(params: Record<string, unknown>, key: string, fallback: string[]): string[] {
  const v = params[key];
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : fallback;
}
