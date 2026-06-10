# Changelog

All notable changes to vibeguard-pack are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **M3 — every rule now has its police.** `no-dead-code` gate (commented-out
  code heuristic + unused-export graph for TS/JS — multi-line-import aware,
  type exports exempt by default) and `error-handling` gate (empty `catch`
  blocks incl. multi-line, empty promise `.catch`, Python `except: pass`).
  Reusable GitHub Action (`action.yml`). Low/info findings no longer block a
  `block`-severity rule (they advise; medium+ blocks).

- **M2 — session wrapper & handoff.** `vibeguard run <cli>` prepares a governed
  session (emits host rules, refuses to start on red, chains headroom) then
  launches the agent. Host adapters for Claude Code (skill), Cursor
  (`.cursor/rules`), and any agent (managed `AGENTS.md` block). `vibeguard
handoff` writes `HANDOFF.md`; `vibeguard tokens` names the context zone
  (smart / warn / handoff) to keep the model out of the "dumb zone".
- **M1 — core engine & 7 rules.** Law + police for modules-small, no-tech-debt,
  deps-hygiene, no-secrets, secure-code (gates), plus no-dead-code and
  error-handling (laws; AST gates land in M3). `init` with beginner/experienced
  onboarding, `check`, `debt`, `deps`, `rules`. driftguard integration: gates
  register as probes and `.vibeguard/**` is protected.

[Unreleased]: https://github.com/Tri1075/vibeguard-pack
