<!-- OWNER-EDITABLE — agents must never modify this file. -->
# Handle every error

No silent catch, no swallowed error. Every error is handled, logged with context, or propagated. Never `catch {}` or catch-and-only-log-then-continue when the operation actually failed. Await or explicitly handle every promise.
