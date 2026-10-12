<!-- HOW TO USE:
1. An eval is a unit test for an agent. You need no framework: a coordinator agent, a folder, subagents, a judge agent and a markdown scoreboard are enough.
2. Fill {{SKILL_NAME}}, {{SKILL_PATH}}, {{MODELS}} (the models you actually use), {{JUDGE_MODEL}} (must differ from the model under test), {{TARGET}}, {{K}} and {{CONCURRENCY}} (2-4, see section 5) in the coordinator prompt (section 4). Paste the prompt into a main agent session.
3. Prepare rubric.template.md (copy to evals/<skill>/rubric.md) and scoreboard.template.md (copy to evals/<skill>/scoreboard.md) first, or let the coordinator draft the rubric and review it yourself.
4. Run it every time you edit a skill. Keep a few tasks hidden from the loop (hold-out) to catch overfitting.
-->

# Eval playbook: test a skill like you test code

Why: skills decay, models change, and "it seemed to work once" is not evidence. An eval answers: when an agent receives realistic tasks, does the skill make it do what I intend, across the models I use? You can run it as rigorously or as lightly as the skill deserves; the structure is the same.

## 1. Roles

| Role | Does | Must not |
| --- | --- | --- |
| Coordinator (main agent) | Writes the rubric from the skill's intent, creates task directories, spawns subagents, collects outputs, calls the judge, updates the scoreboard, edits the skill | Reveal to workers that they are evaluated; judge its own subagents' output alone |
| Worker subagents | Each does one task, in its own directory, with the skill available as in real use | Read the rubric, the scoreboard, other tasks, or the eval folder |
| Judge (a different model than the workers) | Scores each transcript and artifact set against the rubric, returns JSON with quoted evidence | See the skill author's expectations beyond the rubric; be the same model family as the workers when avoidable |

A judge on a different model counters self-bias: a model tends to rate its own style and reasoning favorably. Use a second judge model on a sample of runs when the verdict matters.

## 2. Procedure

1. **Write the rubric from intent.** Ask: what must be true of the agent's behavior and output if the skill works? Write 5-10 criteria, each observable, each scored 0-10 with anchors (see `rubric.template.md`). Include at least one negative criterion (what the skill must prevent, for example "claims a root cause without citing file:line").
2. **Build N tasks (aim for 5-8, plus 2-3 hold-out).** Cover: the original failure that motivated the skill, the easy case, an ambiguous case, a case where the skill should not apply (to check it does not fire wrongly), and a case where the app cannot run (to check honest failure). Each task is a small self-contained directory: repo snapshot or fixture, the prompt as a user would really write it, and nothing else.
3. **Name directories neutrally.** Use names like `work-0417`, `ticket-a3`, `scratch-nord`. Never "eval", "test", "benchmark", "score", "rubric", "skill-test". Agents can detect that they are being evaluated and change their behavior. Also: no rubric text in the prompt, no scoreboard in the tree, no "as part of a check" phrasing, workers' working directory is only their task directory (copy it to `/tmp/<run>/<neutral-name>/`).
4. **Spawn workers: task x model.** For each task and each model in `{{MODELS}}`, start a fresh subagent with the real user prompt. Run in parallel but cap concurrency by memory (see section 5). Each worker has the skill installed the way your agents get it in real use (same skills directory, same `AGENTS.md`).
5. **Collect.** For each run store: the full transcript (tool calls and thinking blocks if available), final answer, produced files/diff, artifacts such as screenshots, and the final directory state. Record the model, the skill version (git commit hash of `{{SKILL_PATH}}`) and the run id.
6. **Judge.** Spawn the judge on `{{JUDGE_MODEL}}` once per run (fresh context), give it `judge-prompt.md`, the rubric, and the run's evidence. Require JSON output. Reject any judgment lacking an evidence quote for a score above 3, or a `failure_reason` for a score below 10; rerun it.
7. **Record** scores in the scoreboard (`scoreboard.template.md`): iteration, skill version, model, task, per-criterion scores, judge model, notes.
8. **Hill-climb.** Read the lowest-scoring criteria and the failure reasons. Edit the skill (smallest change that addresses the cause; see `skills/_skill-from-failure.md`). Increment the iteration and rerun. Stop when the target holds or progress stalls (section 3).

## 3. Stop conditions and overfitting guards

- **Target:** `{{TARGET}}`, for example "every criterion at least 9/10 on every training task and at least 8/10 on hold-out tasks, for all models in `{{MODELS}}`" (or "all criteria 10/10" for a small skill).
- **No-gain stop:** stop after `{{K}}` consecutive iterations (default 3) where neither the mean score nor the lowest score improves. Then report the remaining failures; do not keep adding special cases.
- **Overfitting:** keep 2-3 hold-out tasks the coordinator never uses for edits and runs only at the end of each stage. If training scores go up while hold-out stays flat or drops, the skill is memorizing the tasks: revert to the last version before the divergence, and rewrite the rule more generally instead of quoting task details.
- **Variance:** agent runs vary. When a score changes by 1-2 points, rerun before believing it. For a final verdict, run each task x model at least twice.
- **Do not let the skill see the tasks:** never paste task content, expected answers, or rubric wording into the skill; criteria describe behavior, skills describe procedure.
- **Red first:** for a new skill or a new task, run it once without the skill. If it scores high anyway, the task or the skill adds nothing (a test that cannot fail proves nothing).

## 4. Coordinator prompt (copy, fill, paste)

```text
You are the coordinator for an evaluation of the skill "{{SKILL_NAME}}" at {{SKILL_PATH}}.
Goal: make this skill measurably do what it intends, across models, without overfitting.
Target: {{TARGET}}. Stop early if there is no gain for {{K}} consecutive iterations.
Models under test: {{MODELS}}. Judge model: {{JUDGE_MODEL}} (never judge a run with the same model that produced it).

Work in /tmp/{{SKILL_NAME}}-run/ (create it; remove it when done). The durable results go to
evals/{{SKILL_NAME}}/ in the repo: rubric.md, scoreboard.md, and the final report.

Steps:
1. Read the skill. Write evals/{{SKILL_NAME}}/rubric.md from its intent using evals/rubric.template.md:
   5-10 observable criteria, each scored 0-10 with anchors, including at least one negative criterion.
   Show me the rubric before you spawn anything and wait for my approval or edits.
2. Create 6 training tasks and 2 hold-out tasks as directories under /tmp/{{SKILL_NAME}}-run/.
   Names must be neutral (for example work-0417, ticket-a3). Never use the words eval, test, benchmark,
   score, rubric, skill-check in a directory name, file name or prompt. Each directory contains only a
   realistic fixture and PROMPT.md written the way a real teammate would write the request. Include: the
   original failure case, an easy case, an ambiguous case, a not-applicable case, and a cannot-run-the-app case.
3. For every task and every model in the list, spawn a fresh subagent whose working directory is only
   its task directory, with the skill available as in normal use. Tell it nothing about evaluation.
   Limit concurrency to {{CONCURRENCY}} at a time (check free memory first). Save transcript, final answer,
   artifacts and file diff per run under /tmp/{{SKILL_NAME}}-run/results/<run-id>/.
4. For each run, spawn a judge on {{JUDGE_MODEL}} with templates evals/judge-prompt.md, the rubric and that
   run's results folder. Collect its JSON. Reject and rerun judgments that lack an evidence quote for any
   score above 3 or a failure_reason for any score below 10.
5. Append every run to evals/{{SKILL_NAME}}/scoreboard.md (iteration, skill commit, model, task,
   per-criterion scores, judge model, notes). Compute per-criterion means across tasks and models.
6. Diagnose the lowest criteria by reading the transcripts yourself (not only the judge's reason).
   Edit the skill with the smallest general change that addresses the cause. Never copy task details into the
   skill. Increment the iteration and repeat from step 3 for the training tasks only.
7. When the target holds on training tasks (or after {{K}} no-gain iterations), run the hold-out tasks once
   per model. If hold-out scores trail training by more than 1.5 points on average, treat it as overfitting:
   revert to the last non-diverging version and generalize the rule.
8. Final report: iterations run, score table first versus last, remaining failing criteria with transcript
   evidence, skill diff summary, hold-out result, and anything that needs a human decision.
Do not commit. Stop all subagents you started and delete /tmp/{{SKILL_NAME}}-run/ when finished.
```

## 5. Practical notes

- **Memory first.** Each subagent can run a real app and a browser. Check free memory, then set concurrency yourself (a safe default is 2-4 workers, not one per core). Put all temp files under `/tmp/<run>/` and delete them afterwards.
- **Local before cloud.** Run the first iterations where you can watch transcripts. Move to cloud agents or scheduled runs only after you trust the rubric.
- **Use your tool's loop or schedule feature** (for example `/loop`) to automate "keep iterating until every criterion is 10/10 or K iterations pass"; the coordinator prompt above already encodes the stop conditions.
- **Eval your verification skill too.** A task for `verify-app` should include a planted bug the agent must find with evidence, and a run where the app cannot start, to check it reports BLOCKED instead of "should work".
- **Re-run after any change** to the skill, to AGENTS.md rules it relies on, and when you adopt a new model.
