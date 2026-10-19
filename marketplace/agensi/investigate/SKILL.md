---
name: investigate
description: "Find the root cause of a bug, regression, slowdown or surprising behavior without guessing. Use before stating any cause or proposing a fix for a problem you have not already proven. Requires reading the actual code path, reproducing first, holding at least two hypotheses, and separating observed facts from inference. Unofficial, not affiliated with Lauren Tan (poteto). Free, MIT source: https://github.com/EPISTEX0/poteto-kit"
---

# investigate: stop guessing

The failure this skill prevents: you are told something is broken, you immediately and confidently name a cause, and the tool calls show you never read the code that would be affected. A fluent guess is not a finding. Every wrong guess costs a fix attempt, a review round and trust.

## Scope and side effects

This skill adds no network calls of its own and installs nothing. It reads files and runs the repo's own commands and tests to reproduce the problem; those commands may use the network or write files the way they normally do. Subagents only read.

## Rules (all mandatory)

1. **No root cause without the code path.** You may not state a root cause until you have read the code path it lives in, and you cite it as `path/to/file.ext:line` (a range for multi-line causes). If you have not opened the file, you do not know.
2. **Reproduce first.** Before theorizing, reproduce the problem with the repo's app-verification skill (for example `verify-app`) if one exists, otherwise run the app or a failing command or test yourself (run the real app and capture evidence for UI issues). Save the artifacts. If you cannot reproduce, say "not reproduced" and list what you tried; that is a result, not a failure.
3. **At least two hypotheses.** Write down at least two distinct candidate causes before testing any. For each: what you would expect to observe if it were true, and what would refute it. If you have only one, you are anchored; force a second from a different layer (data, timing, config, environment, recent change).
4. **Fan out, read-only.** Spend subagents on the legwork (if your agent cannot spawn subagents, do the same reads one after another yourself): one per hypothesis or per code area (at most 4 at once). Subagents only read, search and run reproduction; they do not edit. Each returns: finding, `file:line` evidence, and what is still unknown. Do not accept a subagent claim without a `file:line` or a command output.
5. **Observed versus inferred.** Every statement in your write-up is labelled `OBSERVED` (you saw it in a run, a log, a trace, or the code text) or `INFERRED` (you reasoned to it). Never present an inference with the confidence of an observation.
6. **"Smoking gun" requires a reproduction.** You may use the words "smoking gun", "root cause", or "confirmed" only if you changed or toggled the suspected cause and the symptom changed accordingly (for example, the fix removes the symptom and reverting it brings it back), with evidence. Otherwise write "most likely cause (inferred)".
7. **Check the recent change surface.** Look at `git log -p` / blame on the implicated lines. Many bugs are one commit; cite it.
8. **Stop when stuck, do not bluff.** If after two rounds the evidence does not discriminate between hypotheses, say what the missing measurement is and ask for it or go get it.

## Procedure

1. **Restate** the problem in one sentence: expected versus actual, and where the user sees it. If the report is vague, map it with the repo's feature map first if it has one, otherwise by reading the routes, screens and commands that match the words of the report.
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
