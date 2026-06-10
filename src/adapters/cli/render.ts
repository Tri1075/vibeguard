/** Render a check report for humans (TTY) and machines (stable JSON for CI). */
import pc from 'picocolors';
import type { CheckReport } from '../../core/runner.js';
import type { Finding, Severity } from '../../core/types.js';

export function renderJson(report: CheckReport): string {
  const counts = severityCounts(report.findings);
  return `${JSON.stringify(
    {
      schemaVersion: 1,
      status: report.blocked ? 'blocked' : report.findings.length > 0 ? 'warnings' : 'clean',
      ranGates: report.ran,
      summary: counts,
      findings: report.findings,
    },
    null,
    2,
  )}\n`;
}

export function renderTty(report: CheckReport, useColor: boolean): string {
  const c = palette(useColor);
  const lines: string[] = [c.bold(`vibeguard check — ${report.ran.length} gate(s) ran`)];

  if (report.findings.length === 0) {
    lines.push(c.green('✓ clean — every rule passed'));
    return lines.join('\n');
  }

  let currentFile = '';
  for (const f of report.findings) {
    if (f.file !== currentFile) {
      currentFile = f.file;
      lines.push('', c.bold(f.file));
    }
    const where = f.line ? `:${f.line}` : '';
    lines.push(`  ${tag(f.severity, c)} ${c.dim(`[${f.rule}]`)} ${f.message}${c.dim(where)}`);
    lines.push(`      ${c.dim('fix:')} ${f.fix}`);
  }

  const s = severityCounts(report.findings);
  lines.push(
    '',
    `${report.blocked ? c.red('✗ BLOCKED') : c.yellow('⚠ warnings only')} — ` +
      `${s.critical} critical · ${s.high} high · ${s.medium} medium · ${s.low} low · ${s.info} info`,
  );
  return lines.join('\n');
}

function severityCounts(findings: Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) out[f.severity]++;
  return out;
}

interface Palette {
  red: (s: string) => string;
  green: (s: string) => string;
  yellow: (s: string) => string;
  orange: (s: string) => string;
  dim: (s: string) => string;
  bold: (s: string) => string;
}

function tag(severity: Severity, c: Palette): string {
  switch (severity) {
    case 'critical':
      return c.bold(c.red('[CRITICAL]'));
    case 'high':
      return c.orange('[HIGH]');
    case 'medium':
      return c.yellow('[MEDIUM]');
    case 'low':
      return c.dim('[low]');
    default:
      return c.dim('[info]');
  }
}

function palette(useColor: boolean): Palette {
  if (!useColor) {
    const id = (s: string): string => s;
    return { red: id, green: id, yellow: id, orange: id, dim: id, bold: id };
  }
  return {
    red: pc.red,
    green: pc.green,
    yellow: pc.yellow,
    orange: (s) => `\x1b[38;5;208m${s}\x1b[39m`,
    dim: pc.dim,
    bold: pc.bold,
  };
}
