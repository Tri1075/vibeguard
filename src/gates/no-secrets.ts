/**
 * Rule 4 — no-secrets: never hardcode credentials.
 *
 * Pattern scan for well-known credential shapes plus a generic high-entropy
 * assignment check. A line carrying an inline `vibeguard-allow` pragma is
 * skipped (vetted false positive). Findings are critical: a leaked key in a
 * public repo is the worst kind of drift.
 */
import type { Finding, Gate, GateContext } from '../core/types.js';
import { isCodeFile } from '../core/langs.js';

interface SecretRule {
  name: string;
  re: RegExp;
}

const SECRET_RULES: SecretRule[] = [
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'GitHub token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: 'OpenAI key', re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { name: 'Anthropic key', re: /\bsk-ant-[A-Za-z0-9-]{20,}\b/ },
  { name: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: 'private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/ },
  { name: 'JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
];

// Generic "secret-ish assignment": a credential-named field set to a long literal.
const GENERIC =
  /\b(secret|password|passwd|token|api[_-]?key|access[_-]?key|private[_-]?key)\b\s*[:=]\s*['"][^'"]{12,}['"]/i;
const PRAGMA = /vibeguard-allow/;

export const noSecrets: Gate = {
  id: 'no-secrets',
  title: 'No hardcoded secrets',
  run(ctx: GateContext): Promise<Finding[]> {
    return analyse(ctx);
  },
};

async function analyse(ctx: GateContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const file of ctx.files) {
    if (!isCodeFile(file) && !/\.(json|ya?ml|env|toml|ini|cfg)$/.test(file)) continue;
    const source = await ctx.readText(file);
    if (source === null) continue;
    source.split('\n').forEach((raw, i) => {
      if (PRAGMA.test(raw)) return;
      const hit = SECRET_RULES.find((r) => r.re.test(raw));
      const generic = !hit && GENERIC.test(raw) && hasHighEntropyLiteral(raw);
      if (!hit && !generic) return;
      findings.push({
        rule: 'no-secrets',
        severity: 'critical',
        file,
        line: i + 1,
        message: `possible hardcoded secret (${hit ? hit.name : 'credential-named literal'})`,
        fix: `Move it to an environment variable and load it at runtime. If this is a false positive, append \`// vibeguard-allow\` on the line with a reason.`,
      });
    });
  }
  return findings;
}

/** Shannon entropy of the longest quoted literal on the line, thresholded. */
function hasHighEntropyLiteral(line: string): boolean {
  const literals = line.match(/['"]([^'"]{12,})['"]/g) ?? [];
  return literals.some((lit) => shannon(lit.slice(1, -1)) >= 3.2);
}

function shannon(s: string): number {
  const freq = new Map<string, number>();
  for (const ch of s) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}
