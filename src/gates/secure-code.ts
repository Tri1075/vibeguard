/**
 * Rule 5 — secure-code: OWASP-grade secure coding patterns.
 *
 * A line scan for the dangerous patterns that show up most in agent-written
 * code: dynamic code execution, shell/SQL string building, unsafe sinks,
 * disabled TLS verification, weak crypto, permissive CORS, unsafe deserialise.
 * The law also makes the agent warn the user when a request weakens security.
 */
import type { Finding, Gate, GateContext, Severity } from '../core/types.js';
import { isCodeFile } from '../core/langs.js';
import { classifyLines } from '../core/comments.js';

interface SecurityPattern {
  name: string;
  re: RegExp;
  severity: Severity;
  fix: string;
}

const PATTERNS: SecurityPattern[] = [
  {
    // Word-start (not `.eval`) so method calls like model.eval()/df.eval() don't fire.
    name: 'dynamic code execution (eval / new Function)',
    re: /(?<![.\w])eval\s*\(|\bnew\s+Function\s*\(/,
    severity: 'high',
    fix: 'Avoid eval/new Function. Parse data explicitly or use a safe dispatch table.',
  },
  {
    // Word-start so RegExp.prototype.exec (re.exec(s + x)) isn't flagged.
    name: 'shell exec with interpolation',
    re: /(?<![.\w])(exec|execSync|spawn|system|popen)\s*\([^)]*[`$+]/,
    severity: 'high',
    fix: 'Pass arguments as an array, never a concatenated string. Avoid shell:true with user input.',
  },
  {
    name: 'shell=True with interpolation (Python)',
    re: /subprocess\.\w+\([^)]*shell\s*=\s*True/,
    severity: 'high',
    fix: 'Use a list of args and shell=False; never interpolate user input into a shell string.',
  },
  {
    // The SQL keyword must sit INSIDE a string literal (opening quote, keyword,
    // more content, closing quote) before the `+`, so `delete cache['a'+k]` and
    // `store.update('x' + y)` no longer trip a "SQL concatenation" finding.
    name: 'SQL built by string concatenation',
    re: /['"`][^'"`]*\b(?:SELECT|INSERT|UPDATE|DELETE)\b[^'"`]+['"`]\s*\+|\bexecute\s*\(\s*[`'"][^`'"]*\$\{/i,
    severity: 'high',
    fix: 'Use parameterized queries / prepared statements, never string concatenation.',
  },
  {
    name: 'unsafe HTML sink (XSS)',
    re: /\.innerHTML\s*=|\bdocument\.write\s*\(|dangerouslySetInnerHTML/,
    severity: 'medium',
    fix: 'Set textContent or use a sanitizer; never assign untrusted data to innerHTML.',
  },
  {
    name: 'TLS verification disabled',
    re: /rejectUnauthorized\s*:\s*false|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*['"]?0/,
    severity: 'critical',
    fix: 'Never disable certificate verification. Fix the trust store instead.',
  },
  {
    name: 'weak hash / cipher',
    re: /\b(?:md5|sha1)\b|createCipher\b/i,
    severity: 'medium',
    fix: 'Use SHA-256+/bcrypt/argon2 for passwords and AES-GCM for encryption.',
  },
  {
    // Case-SENSITIVE: the bare `/i` form matched the French word "des" (and "rc4"
    // substrings). Legacy cipher acronyms are always uppercase in real code.
    name: 'weak cipher (DES / RC4)',
    re: /\b(?:DES|RC4|3DES)\b/,
    severity: 'medium',
    fix: 'Use AES-GCM; DES/3DES/RC4 are broken.',
  },
  {
    name: 'permissive CORS',
    re: /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*|cors\(\s*\{\s*origin\s*:\s*['"]\*/,
    severity: 'medium',
    fix: 'Allow an explicit origin allowlist, not "*", on credentialed endpoints.',
  },
  {
    name: 'unsafe deserialization',
    re: /yaml\.load\s*\((?![^)]*Loader)|pickle\.loads?\s*\(|unserialize\s*\(/,
    severity: 'high',
    fix: 'Use yaml.safe_load / a safe deserializer; never unpickle untrusted data.',
  },
];

const PRAGMA = /vibeguard-allow/;

export const secureCode: Gate = {
  id: 'secure-code',
  title: 'OWASP-grade secure coding patterns',
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
    const kinds = classifyLines(source);
    source.split('\n').forEach((raw, i) => {
      if (PRAGMA.test(raw)) return;
      if (kinds[i]?.comment) return; // a vulnerability lives in code, not in prose
      for (const p of PATTERNS) {
        if (!p.re.test(raw)) continue;
        findings.push({
          rule: 'secure-code',
          severity: p.severity,
          file,
          line: i + 1,
          message: `insecure pattern: ${p.name}`,
          fix: p.fix,
        });
      }
    });
  }
  return findings;
}
