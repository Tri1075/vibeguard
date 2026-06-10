# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report privately through GitHub:

1. Go to the repository's **Security** tab.
2. Click **Report a vulnerability** to open a private security advisory.

We will acknowledge your report, investigate, and coordinate a fix and disclosure with you. Thank you for helping keep vibeguard-pack and its users safe.

## Scope

vibeguard-pack reads project files and runs `git` to discover them. It does not transmit your code anywhere. The optional integrations it can launch (your agent CLI, `headroom`, `driftguard`) are separate tools with their own security policies.

## Supported versions

The latest released minor version receives security fixes. Pre-1.0, that is the most recent `0.x` release.
