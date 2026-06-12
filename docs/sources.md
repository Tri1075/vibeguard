# Where the rules come from

None of the nine laws is an invention. Each one names a principle that experienced engineers have
known, written down and defended for decades — vibeguard's contribution is the **police**, not the
law. This page credits the canon so you can go to the source, argue with it, or tune the rule with
full context.

## The nine laws

| Law                              | Principle                                                                               | Canonical sources                                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **plan-first**                   | Think before coding: a plan surfaces assumptions and tradeoffs before they become code. | [Karpathy's "think before coding"](https://github.com/forrestchang/andrej-karpathy-skills) · design docs culture (Google, ["Design Docs at Google"](https://www.industrialempathy.com/posts/design-docs-at-google/))                                                                   |
| **robust-stack**                 | Decide your stack deliberately and record why.                                          | Architecture Decision Records ([Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)) · ["Choose Boring Technology"](https://mcfunley.com/choose-boring-technology) (Dan McKinley)                                                                |
| **modules-small-single-purpose** | One module, one responsibility, small enough to hold in your head.                      | Single Responsibility Principle & _Clean Code_ (Robert C. Martin) · the Unix philosophy ("do one thing well", McIlroy)                                                                                                                                                                 |
| **no-tech-debt**                 | Debt is a deliberate, _visible_ loan — never a silent one.                              | The debt metaphor ([Ward Cunningham, 1992](http://c2.com/doc/oopsla92.html)) · [Fowler's Technical Debt Quadrant](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) (reckless/prudent × deliberate/inadvertent)                                                               |
| **deps-hygiene**                 | Every dependency is attack surface and maintenance load; add them on purpose.           | Supply-chain lessons: [left-pad (2016)](https://en.wikipedia.org/wiki/Npm_left-pad_incident), [xz backdoor (2024)](https://en.wikipedia.org/wiki/XZ_Utils_backdoor) · OWASP [Software Component Verification](https://owasp.org/www-project-software-component-verification-standard/) |
| **no-secrets**                   | Config — especially credentials — lives in the environment, never in code.              | [The Twelve-Factor App, III. Config](https://12factor.net/config) · [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)                                                                                         |
| **secure-code**                  | The common vulnerability classes are known and avoidable.                               | [OWASP Top 10](https://owasp.org/www-project-top-ten/) (injection, XSS, weak crypto…)                                                                                                                                                                                                  |
| **no-dead-code**                 | Unused code is a lie waiting to be believed; version control remembers.                 | YAGNI ([Extreme Programming](http://c2.com/xp/YouArentGonnaNeedIt.html), Beck/Jeffries) · _Clean Code_ on commented-out code                                                                                                                                                           |
| **error-handling**               | Never swallow a failure: handle it or propagate it, loudly.                             | Fail-fast (Shore, ["Fail Fast"](https://martinfowler.com/ieeeSoftware/failFast.pdf), IEEE Software) · _Effective Java_ on ignored exceptions                                                                                                                                           |

> **An honest nuance on error handling.** Karpathy's "skip error handling for impossible scenarios"
> and our error-handling law pull in different directions on purpose: his rule targets _speculative_
> handling (ceremony for failures that cannot happen), ours targets _swallowed_ failures (an empty
> catch around something that can). Both reject the same thing — error-handling theater — and the
> gate only fires on silent swallowing, never on the absence of unnecessary try/catch.

## Session discipline & workflow skills

- **120K handoff (anti "dumb zone")** — context degradation near the window's end and the
  handoff-document pattern come from [Dex Horthy / HumanLayer](https://www.youtube.com/watch?v=dtAJ2dOd3ko)
  ("advanced context engineering for coding agents").
- **Workflow skills** (grill me, write a PRD, to issues, TDD…) — several are adapted from
  [Matt Pocock's skills](https://github.com/mattpocock/skills) (MIT), credited per skill. The
  TDD skill follows Kent Beck's _Test-Driven Development: By Example_.
- **Interop** — [Addy Osmani's agent-skills](https://github.com/addyosmani/agent-skills) compose
  with vibeguard: [their workflows on top, our enforcement underneath](agent-skills.md).

## The Karpathy alignment

Andrej Karpathy's viral CLAUDE.md rules (January 2026, collected in
[forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), MIT;
good walkthrough in [this video](https://www.youtube.com/watch?v=7zZy1QTvokM)) name four behaviors:

1. **Think before coding** — assumptions explicit, ask rather than guess, tradeoffs surfaced.
2. **Simplicity first** — minimum code that solves the problem, nothing speculative.
3. **Surgical changes** — touch only what you must; don't "improve" adjacent code.
4. **Goal-driven execution** — define success criteria, loop until verified.

vibeguard's emitted law states all four (the "Working with the user" and "Surgical & simple"
sections). The stack then makes two of them **mechanically checkable** instead of aspirational:
_surgical changes_ is driftguard's scope contract — an out-of-scope edit is classified drift and
blocked at the end of the turn — and _goal-driven execution_ is the gate loop — every rule is a
probe with a green/red exit code, and a green→red transition blocks until self-corrected. Telling
an agent what good looks like is the law; checking it actually happened is the police. Both are
needed; only the second one is rare.
