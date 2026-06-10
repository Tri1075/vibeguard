/**
 * Rule 6 — no-dead-code: no commented-out code, no unused exports.
 *
 * Two detectors, both deliberately conservative (a false positive here erodes
 * trust in every other gate):
 * 1. Commented-out code: a run of ≥ minRun consecutive comment lines where most
 *    lines LOOK like code (statement endings, keywords, assignments).
 * 2. Unused exports (TS/JS): a named export no project file imports, using the
 *    heuristic graph in core/exports-graph.ts. Entry points are exempt.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { classifyLines } from '../core/comments.js';
import { collectExports, collectUsage, makeResolver, type UsageMap } from '../core/exports-graph.js';
import { isCodeFile } from '../core/langs.js';
import { numberParam } from './params.js';

const PRAGMA = /vibeguard-allow/;
const TS_JS = /\.(ts|tsx|js|jsx|mjs|cjs)$/;
const ENTRY_POINT =
  /(^|\/)(index|bin|main|cli)\.(ts|tsx|js|mjs|cjs)$|\.d\.ts$|(^|\/)(test|tests|__tests__)\//;
const CODEISH =
  /[;{}]\s*$|=>|=\s*[^=]|^(if|for|while|return|const|let|var|function|import|export|def|class|await|console)\b|\)\s*[;{]?\s*$/;

export const noDeadCode: Gate = {
  id: 'no-dead-code',
  title: 'No commented-out code, no unused exports',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const minRun = numberParam(ctx.rule.params, 'minCommentedRun', 3);
  const reportTypes = ctx.rule.params['reportUnusedTypes'] === true;
  const findings: Finding[] = [];
  const usage: UsageMap = { used: new Map() };
  const resolve = makeResolver(ctx.files);
  const exportsByFile: ReturnType<typeof collectExports>[] = [];

  for (const file of ctx.files) {
    if (!isCodeFile(file)) continue;
    const source = await ctx.readText(file);
    if (source === null) continue;

    findings.push(...commentedOutCode(file, source, minRun));
    if (TS_JS.test(file)) {
      collectUsage(file, source, usage, resolve);
      if (!ENTRY_POINT.test(file)) exportsByFile.push(collectExports(file, source));
    }
  }

  for (const symbols of exportsByFile) {
    for (const sym of symbols) {
      if (sym.kind === 'type' && !reportTypes) continue; // zero-cost API docs
      const used = usage.used.get(sym.file);
      if (used && (used.has('*') || used.has(sym.name))) continue;
      findings.push({
        rule: 'no-dead-code',
        severity: 'medium',
        file: sym.file,
        line: sym.line,
        message: `unused export "${sym.name}" — nothing in the project imports it`,
        fix: `Delete it (git remembers), or if it is a public API surface, move/re-export it from an entry point.`,
      });
    }
  }
  return findings;
}

/** Flag runs of comment lines that read like disabled code. */
function commentedOutCode(file: string, source: string, minRun: number): Finding[] {
  const findings: Finding[] = [];
  const lines = classifyLines(source);
  let runStart = -1;
  let codeish = 0;
  let total = 0;

  const flush = (endIndex: number): void => {
    if (runStart !== -1 && total >= minRun && codeish / total >= 0.6) {
      findings.push({
        rule: 'no-dead-code',
        severity: 'medium',
        file,
        line: runStart + 1,
        message: `commented-out code (${total} lines) — disabled code rots`,
        fix: 'Delete it: version control already remembers. If it documents intent, write prose instead.',
      });
    }
    runStart = -1;
    codeish = 0;
    total = 0;
    void endIndex;
  };

  lines.forEach((line, i) => {
    const isCandidate = line.comment && !PRAGMA.test(line.text);
    if (!isCandidate) {
      flush(i);
      return;
    }
    const body = stripCommentPrefix(line.text);
    if (runStart === -1) runStart = i;
    total++;
    if (CODEISH.test(body)) codeish++;
  });
  flush(lines.length);
  return findings;
}

function stripCommentPrefix(text: string): string {
  return text.replace(/^(\/\/|#|--|;|\/\*+|\*+\/?|<!--)\s?/, '').trim();
}
