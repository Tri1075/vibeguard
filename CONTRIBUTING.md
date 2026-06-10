# Contributing to vibeguard-pack

Thank you for helping make AI-written code cleaner for everyone. This project thrives on contributions — new rules, new language support, sharper gates, better docs.

## Setup

```sh
npm install
npm test            # build + full suite (unit + e2e)
npm run check       # alias: the dogfood — vibeguard checks itself
```

Requirements: Node ≥ 20, git. No global installs.

## Ground rules (we follow our own rules)

1. **English only** — code, comments, docs, rule texts.
2. **Small, single-purpose modules** — ≤ 200 code lines. Split before the limit.
3. **Comment for the next person** — every module opens with a header comment; every export has a doc comment.
4. **Law + police stay paired** — a new rule needs both a law (text) and a gate (deterministic check), or it is law-only and clearly marked.
5. **Dogfood stays green** — `vibeguard check` and the test suite must pass. CI runs both.
6. **No personal data** — no names, emails, or local paths anywhere.

## Adding a rule (the common contribution)

A rule is two small pieces:

1. **The law** — add an entry to `src/laws/texts.ts` (`id`, `title`, `body`). This is what every agent reads.
2. **The gate** — add `src/gates/<id>.ts` exporting a `Gate` (`id`, `title`, `run(ctx)`), register it in `src/gates/registry.ts`, and add its default to `RULE_DEFAULTS`.

Then write tests in `test/unit/gates.test.ts` (use the in-memory `ctx` helper) and, if it touches the CLI, `test/e2e/`. Keep the gate language-agnostic when you can; AST-based gates start with TypeScript.

A great gate is **precise** (few false positives — that is the existential risk), **actionable** (every finding has a concrete `fix`), and **configurable** (params read from `ctx.rule.params`).

## Scripts

| Script                            | What                  |
| --------------------------------- | --------------------- |
| `npm run build`                   | tsup → `dist/`        |
| `npm test`                        | build + vitest        |
| `npm run typecheck`               | strict `tsc --noEmit` |
| `npm run lint` / `lint:fix`       | ESLint (type-checked) |
| `npm run format` / `format:check` | Prettier              |

`prepublishOnly` enforces typecheck + lint + format + tests — a red state can never be published.

## Pull requests

- One focused change per PR. Describe the motivation and the user-visible effect.
- Add or update tests. Keep the dogfood green.
- Be kind in review. See our [Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting bugs & ideas

Open an issue with the templates provided. For security issues, see [SECURITY.md](SECURITY.md) — please do not open a public issue for vulnerabilities.
