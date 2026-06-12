# Using vibeguard with agent-skills (or any skills collection)

[Addy Osmani's agent-skills](https://github.com/addyosmani/agent-skills) is an excellent
collection of 24 production-grade workflow skills (DEFINE → PLAN → BUILD → VERIFY → REVIEW → SHIP).
Skills collections like it — Addy's, [Matt Pocock's](https://github.com/mattpocock/skills), your own —
tell your agent **what good looks like**.

vibeguard is the layer underneath: it **checks the agent actually did it**.

Skills are prose, and agents rationalize their way around prose. vibeguard pairs every rule with a
deterministic gate (`vibeguard check`, exit 0/1) and, through [driftguard](https://github.com/Tri1075/driftguard),
physically blocks a drifting agent at the end of its turn: broken probes are regressions, out-of-scope
edits are change requests, and recurring patterns become CLAUDE.md rules (`driftguard patterns`).

## Run both

```sh
# Their workflows (the extended law):
/plugin marketplace add addyosmani/agent-skills

# Our enforcement (the police):
/plugin marketplace add Tri1075/vibeguard
npm i -D vibeguard-pack && npx vibeguard-pack init
```

They compose cleanly: use `/spec`, `/plan`, `/build` from agent-skills all day — every change still has
to pass the 9 vibeguard gates, and driftguard still arbitrates anything out of contract. No collection
needs to be "vibeguard-aware": the gates judge the code, not the prompts that produced it.
