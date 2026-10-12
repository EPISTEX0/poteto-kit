---
name: investigate
description: Find the root cause of a bug, regression, slowdown or surprising behavior without guessing. Use before stating any cause or proposing a fix for a problem you have not already proven. Requires reading the actual code path, reproducing first, holding at least two hypotheses, and separating observed facts from inference.
---

<!-- HOW TO USE:
1. Install this folder as .agents/skills/investigate/ (see the install table in templates/README.md). Fill the two placeholders: {{REPRO_SKILL}} (the skill that runs the real app and captures evidence; `verify-app` if you installed it) and {{SUBAGENT_LIMIT}} (the most read-only subagents to run at once; 4 is a sensible default, lower it when memory is tight).
2. It works best next to verify-app (for reproducing). Reference it from AGENTS.md: "Never state a root cause without running the investigate skill."
3. Born from a real failure: the agent confidently said "it has to be this" without having opened the code that was affected. If your agents fail differently, extend the Rules with your own observed failure (see skills/_skill-from-failure.md).
4. Delete this comment block when done.
-->

# investigate: stop guessing

The failure this skill prevents: you are told something is broken, you immediately and confidently name a cause, and the tool calls show you never read the code that would be affected. A fluent guess is not a finding. Every wrong guess costs a fix attempt, a review round and trust.

## Rules (all mandatory)

1. **No root cause without the code path.** You may not state a root cause until you have read the code path it lives in, and you cite it as `path/to/file.ext:line` (a range for multi-line causes). If you have not opened the file, you do not know.
2. **Reproduce first.** Before theorizing, reproduce the problem with the `{{REPRO_SKILL}}` skill (run the real app, capture evidence) or, for non-UI issues, a failing command or test. Save the artifacts. If you cannot reproduce, say "not reproduced" and list what you tried; that is a result, not a failure.
3. **At least two hypotheses.** Write down at least two distinct candidate causes before testing any. For each: what you would expect to observe if it were true, and what would refute it. If you have only one, you are anchored; force a second from a different layer (data, timing, config, environment, recent change).
4. **Fan out, read-only.** Spend subagents on the legwork: one per hypothesis or per code area (at most {{SUBAGENT_LIMIT}} at once). Subagents only read, search and run reproduction; they do not edit. Each returns: finding, `file:line` evidence, and what is still unknown. Do not accept a subagent claim without a `file:line` or a command output.
5. **Observed versus inferred.** Every statement in your write-up is labelled `OBSERVED` (you saw it in a run, a log, a trace, or the code text) or `INFERRED` (you reasoned to it). Never present an inference with the confidence of an observation.
6. **"Smoking gun" requires a reproduction.** You may use the words "smoking gun", "root cause", or "confirmed" only if you changed or toggled the suspected cause and the symptom changed accordingly (for example, the fix removes the symptom and reverting it brings it back), with evidence. Otherwise write "most likely cause (inferred)".
7. **Check the recent change surface.** Look at `git log -p` / blame on the implicated lines. Many bugs are one commit; cite it.
8. **Stop when stuck, do not bluff.** If after two rounds the evidence does not discriminate between hypotheses, say what the missing measurement is and ask for it or go get it.

## Procedure

1. **Restate** the problem in one sentence: expected versus actual, and where the user sees it. If the report is vague, map it with the feature map first.
2. **Reproduce** (rule 2). Record exact steps, build/commit, artifacts.
3. **Hypotheses** (rule 3): list H1..Hn with "if true I would see ...; refuted by ...".
4. **Investigate** (rule 4): assign each hypothesis or area to a read-only subagent, or do it yourself when small. Read the full function, its callers and its callees, not just the grep hit. Follow the data from the symptom backwards to where the wrong value or behavior first appears.
5. **Discriminate:** pick the cheapest experiment that separates the hypotheses (add a log, toggle a flag, bisect, disable a code path in a scratch copy) and run it.
6. **Confirm** (rule 6): change the suspected cause, observe the symptom change. Revert and see it come back where feasible.
7. **Write up** in the format below. Only then propose or make a fix.

## Output format

```
## Investigation: <one-line problem>
- Reproduction: REPRODUCED | NOT REPRODUCED | BLOCKED. Steps, build, artifacts: <paths>
- Hypotheses:
  - H1 <cause>: <status: SUPPORTED | REFUTED | UNTESTED>. Evidence: <file:line / output>
  - H2 <cause>: ...
- Root cause: <statement> (<OBSERVED | INFERRED>) at <file:line>[, introduced in <commit>]
- Confirmation: <what was toggled/changed, symptom before and after> | "none: this is inferred"
- Observed facts: 1. ... (with file:line or artifact)
- Inferences: 1. ...
- Unknowns / not checked: ...
- Proposed fix: <smallest change> (not applied yet | applied in <diff summary>)
```

## Self-check before you answer

- Can I point at the exact lines that cause it? If not, I have a hypothesis, not a root cause.
- Did I open every file I mention? Did I read the whole function?
- Did I use "smoking gun" or "confirmed" without a toggle-and-observe? Remove it.
- Is there a second plausible explanation I did not test? Name it under Unknowns.
