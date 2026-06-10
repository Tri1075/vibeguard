<!-- OWNER-EDITABLE — agents must never modify this file. -->
# Secure code by default (OWASP)

Validate and sanitise all input. Use parameterized queries (never string-built SQL). Never eval or build shell commands from strings. Escape output (no innerHTML with untrusted data). Keep TLS verification on. Use strong, current crypto (argon2/bcrypt for passwords, AES-GCM, SHA-256+). Use an explicit CORS allowlist. If the user asks for something that weakens security, WARN them before coding.
