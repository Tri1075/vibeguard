/**
 * Rule 7 — error-handling: no silently swallowed errors.
 *
 * Precise on purpose (the false-positive budget is ~zero):
 * - TS/JS: a `catch` block with NO content at all — not even a comment — is
 *   flagged. A comment-only catch documents intent and passes.
 * - TS/JS: an empty inline promise handler `.catch(() => {})` is flagged.
 * - Python: an `except:` whose body is only `pass` (no comment) is flagged.
 * Floating-promise detection needs real type information → deferred to the
 * AST milestone; the LAW still forbids it.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { classifyLines } from '../core/comments.js';
import { isCodeFile } from '../core/langs.js';

const PRAGMA = /vibeguard-allow/;
const EMPTY_CATCH = /\bcatch\b\s*(\([^)]*\))?\s*\{\s*\}/;
const EMPTY_PROMISE_CATCH = /\.catch\s*\(\s*(\([^)]*\)|\w+)?\s*=>\s*\{\s*\}\s*\)/;
const PY_EXCEPT = /^\s*except\b[^:]*:\s*(#.*)?$/;
const PY_PASS = /^\s*pass\s*$/;

export const errorHandling: Gate = {
  id: 'error-handling',
  title: 'No silent catch, no swallowed errors',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const file of ctx.files) {
    if (!isCodeFile(file)) continue;
    const source = await ctx.readText(file);
    if (source === null) continue;
    if (file.endsWith('.py')) findings.push(...pythonSilentExcept(file, source));
    else findings.push(...jsSilentCatch(file, source));
  }
  return findings;
}

/** TS/JS: empty `catch {}` (possibly across lines) and empty `.catch(() => {})`. */
function jsSilentCatch(file: string, source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');
  const kinds = classifyLines(source);
  const isComment = (lineNo: number): boolean => kinds[lineNo - 1]?.comment === true;
  lines.forEach((line, i) => {
    if (PRAGMA.test(line) || isComment(i + 1)) return;
    if (EMPTY_PROMISE_CATCH.test(line)) {
      findings.push(silent(file, i + 1, 'empty promise .catch handler swallows the error'));
    }
  });

  // `\s` matches newlines, so the pattern naturally spans multi-line catches.
  const re = new RegExp(EMPTY_CATCH.source, 'g');
  for (const match of source.matchAll(re)) {
    const lineNo = (source.slice(0, match.index).match(/\n/g)?.length ?? 0) + 1;
    if (PRAGMA.test(lines[lineNo - 1] ?? '') || isComment(lineNo)) continue;
    findings.push(silent(file, lineNo, 'empty catch block — the error vanishes'));
  }
  return findings;
}

/** Python: an except whose entire body is a bare `pass`. */
function pythonSilentExcept(file: string, source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split('\n');
  lines.forEach((line, i) => {
    if (!PY_EXCEPT.test(line) || PRAGMA.test(line)) return;
    const body = lines[i + 1] ?? '';
    const rest = lines[i + 2] ?? '';
    // Body is exactly one bare `pass`, and the block does not continue further.
    const onlyPass = PY_PASS.test(body) && !(rest.trim() !== '' && indentOf(rest) >= indentOf(body));
    if (onlyPass) findings.push(silent(file, i + 1, 'except: pass — the error vanishes'));
  });
  return findings;
}

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function silent(file: string, line: number, what: string): Finding {
  return {
    rule: 'error-handling',
    severity: 'high',
    file,
    line,
    message: what,
    fix: 'Handle it, log it WITH context and rethrow/propagate, or document the intentional ignore with a comment inside the block.',
  };
}
