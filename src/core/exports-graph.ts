/**
 * A lightweight export/import cross-reference for TS/JS — no compiler needed.
 * Heuristic by design: it resolves relative imports only, treats `import *`
 * and dynamic `import()` as "uses everything", and never reports entry points.
 * False positives are the existential risk, so when unsure we stay silent.
 */

export interface ExportedSymbol {
  file: string;
  name: string;
  line: number;
  /** type/interface exports are zero-cost API docs — exempt by default */
  kind: 'type' | 'value';
}

const EXPORT_DECL = /^export\s+(?:async\s+)?(function|class|const|let|var|type|interface|enum)\s+(\w+)/;
const EXPORT_LIST = /^export\s*\{([^}]+)\}/;
// Whole-source, multi-line aware: formatters wrap long import/export lists, so
// line-by-line scanning would silently miss them (a real false-positive source).
// `[^;]` bounds the clause to ONE statement: a lazy [\s\S] would creep across
// a preceding non-relative import and swallow the next one (classic trap).
const IMPORT_FROM = /import\s+([^;]*?)\s+from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
const REEXPORT_FROM = /export\s+(\{[^;]*?\}|\*)\s*from\s+['"](\.{1,2}\/[^'"]+)['"]/g;
const DYNAMIC_IMPORT = /import\s*\(\s*['"](\.{1,2}\/[^'"]+)['"]/g;

/** Symbols each file exports (named only; default exports are never flagged). */
export function collectExports(file: string, source: string): ExportedSymbol[] {
  const out: ExportedSymbol[] = [];
  source.split('\n').forEach((line, i) => {
    const decl = EXPORT_DECL.exec(line.trim());
    if (decl?.[1] && decl[2]) {
      const kind = decl[1] === 'type' || decl[1] === 'interface' ? 'type' : 'value';
      out.push({ file, name: decl[2], line: i + 1, kind });
    }
    const list = EXPORT_LIST.exec(line.trim());
    if (list?.[1] && !line.includes(' from ')) {
      for (const raw of list[1].split(',')) {
        const cleaned = raw.trim().replace(/^type\s+/, '');
        const name = (cleaned.split(/\s+as\s+/).pop() ?? '').trim();
        if (name) out.push({ file, name, line: i + 1, kind: /^type\s/.test(raw.trim()) ? 'type' : 'value' });
      }
    }
  });
  return out;
}

export interface UsageMap {
  /** file → set of imported names ('*' means everything) */
  used: Map<string, Set<string>>;
}

/** Record what `source` (living at `fromFile`) imports from sibling files. */
export function collectUsage(fromFile: string, source: string, map: UsageMap, resolve: Resolver): void {
  for (const dyn of source.matchAll(DYNAMIC_IMPORT)) {
    if (dyn[1]) markAll(map, resolve(fromFile, dyn[1]));
  }
  for (const m of [...source.matchAll(IMPORT_FROM), ...source.matchAll(REEXPORT_FROM)]) {
    const clause = m[1]; // import clause, or `{ names }` / `*` for re-exports
    const target = resolve(fromFile, m[2] ?? '');
    if (!target) continue;

    // `export * from` / `import * as ns` / bare default import → permissive:
    // count everything as used rather than risk a false "unused export".
    if (clause === undefined || clause.includes('*') || !clause.includes('{')) {
      markAll(map, target);
      continue;
    }
    const braces = /\{([\s\S]+)\}/.exec(clause);
    for (const raw of (braces?.[1] ?? '').split(',')) {
      const name = (
        raw
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0] ?? ''
      ).trim();
      if (name) mark(map, target, name);
    }
  }
}

export type Resolver = (fromFile: string, spec: string) => string | null;

/** Resolve `./x` from `a/b.ts` against the known project file list. */
export function makeResolver(files: string[]): Resolver {
  const set = new Set(files);
  return (fromFile, spec) => {
    const base = joinPosix(dirOf(fromFile), spec);
    const candidates = [
      base,
      base.replace(/\.js$/, '.ts'),
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.js`,
      `${base}/index.ts`,
      `${base}/index.js`,
    ];
    return candidates.find((c) => set.has(c)) ?? null;
  };
}

function mark(map: UsageMap, file: string | null, name: string): void {
  if (!file) return;
  const entry = map.used.get(file) ?? new Set<string>();
  entry.add(name);
  map.used.set(file, entry);
}

function markAll(map: UsageMap, file: string | null): void {
  mark(map, file, '*');
}

function dirOf(p: string): string {
  const i = p.lastIndexOf('/');
  return i === -1 ? '' : p.slice(0, i);
}

/** POSIX path join with ./ and ../ resolution (project-relative paths only). */
function joinPosix(dir: string, spec: string): string {
  const parts = (dir ? `${dir}/${spec}` : spec).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}
