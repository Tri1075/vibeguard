# Demo — the loop in ~60 seconds

`run-demo.sh` runs the **real** vibeguard + driftguard loop on a throwaway
project: one command governs it, the agent edits in scope and also drifts, the
guard blocks the drift with the decision grammar, the agent self-corrects, and
recurring drift becomes a standing CLAUDE.md rule. Nothing is faked — it shells
out to the actual binaries.

## Run it

```sh
bash demo/run-demo.sh        # needs `vibeguard` and `driftguard` on PATH
```

## Record it (GIF)

```sh
# install vhs once: https://github.com/charmbracelet/vhs
vhs demo/demo.tape           # writes demo/loop.gif
```

## Anonymization — it's PII-free by construction

The demo is built so nothing identifying can appear:

- runs in a `mktemp` directory — never a real home path;
- a neutral git identity (`dev <dev@example.com>`), set only for the demo;
- the `.tape` forces `PS1='$ '` so the recording shows no username or host;
- it points the gate probes at the **local** binary (no `npx`, so no npm log
  paths leak into probe output).

Before publishing a rendered `loop.gif`, glance at it once: the only paths that
should appear are `mktemp` temp dirs (`/tmp/…` or `/private/var/folders/…`),
never a home directory or a name.
