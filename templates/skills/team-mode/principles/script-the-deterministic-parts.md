# script-the-deterministic-parts

**Rule:** When a step has one right answer every time, put it in code (a script, a CLI, a codemod) and leave only the judgment to the agent.

**Why:** Without a script, every agent writes its own throwaway version of the same step, and the next one discards it (the story is in `docs/02-verification.md`). A mechanical migration done by agent rewrites is slow and inconsistent where a transform would be exact.

**In practice:**
- When a skill tells the agent to run the same sequence of commands again, ask whether the sequence is deterministic. If it is, write the script once, give it tests, and have the skill call it (the `verify-app` CLI is the example).
- For a migration or bulk change that is mechanical, write a codemod or a syntax-tree transform instead of asking agents to rewrite files by hand. Review the transform and its output, not every file.
- Keep in the skill text only what needs judgment: what to check, how to read the result, when to stop.

**Tells you are violating it:** several near-identical one-off scripts in agent transcripts; a skill that lists exact commands for the agent to retype; the same mechanical edit made by hand across many agent PRs.

**Enforced by:** soft: this file. The hard form is the script itself, with its own tests.
