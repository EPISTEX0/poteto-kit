<!-- HOW TO USE:
1. Copy to evals/<skill>/scoreboard.md. Replace the criteria columns C1..C8 with the ids from your rubric (keep the order).
2. The coordinator appends one row per run (task x model x iteration), straight from the judge's JSON. Never edit past rows; add a new iteration instead.
3. "Skill version" is the git commit hash (or tag) of the skill folder when the run started. If the working tree was dirty, write "<hash>+dirty" and describe the change in Notes.
4. Use the summary table at the bottom to decide whether to stop (target reached, or {{K}} iterations without gain) and to spot overfitting (training versus hold-out).
-->

# Scoreboard: {{SKILL_NAME}}

Target: {{TARGET}}. Stop rule: {{K}} iterations without gain. Judge model(s): {{JUDGE_MODEL}}.

## Runs

Scores are integers 0-10 straight from the judge; `n/a` where the judge returned null. Set = `train` or `holdout`.

| Iteration | Skill version | Model | Task | Set | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | Mean | Judge model | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 (no skill) | none | {{MODEL_A}} | work-0417 | train | | | | | | | | | | {{JUDGE_MODEL}} | Red baseline: confirms the task can fail |
| 1 | {{COMMIT}} | {{MODEL_A}} | work-0417 | train | | | | | | | | | | {{JUDGE_MODEL}} | |

## Summary per iteration

| Iteration | Skill version | Change made to the skill | Train mean | Train min criterion | Holdout mean | Decision (continue / stop: target / stop: no gain / revert) |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | none | baseline | | | | continue |
| 1 | {{COMMIT}} | {{what you changed and why}} | | | | |

## Failures to fix next

| Criterion | Tasks and models where it scored below 9 | Transcript evidence (path:line or quote) | Hypothesis for the cause |
| --- | --- | --- | --- |
| | | | |
