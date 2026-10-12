<!-- HOW TO USE:
1. Copy to evals/<skill>/rubric.md. Replace {{SKILL_NAME}} and the example criteria with criteria derived from the skill's intent ("what must be true of behavior and output if the skill works").
2. 5-10 criteria. Each must be observable by someone reading only the transcript and artifacts, and must have anchors for 0, 5 and 10. Keep at least one negative criterion (a behavior the skill must prevent).
3. The ids (C1, C2, ...) are used by judge-prompt.md and scoreboard.template.md; keep them stable across iterations so scores stay comparable.
4. The coordinator may draft this file, but a human reviews it before any run. Never show this file to worker agents.
-->

# Rubric: {{SKILL_NAME}}

Intent of the skill (one paragraph, the reason it exists): {{INTENT}}

Scoring: each criterion is scored 0-10 as an integer. 10 means fully met with clear evidence; 5 means partly met or met with a significant gap; 0 means not met or the opposite behavior occurred. If a criterion does not apply to a task, the judge returns `"score": null` with the reason "not applicable"; those are excluded from means.

Evidence rule: a score above 3 requires a verbatim quote from the transcript or an artifact path. No quote, no score.

## Criteria

The examples below are written for the `verify-app` skill (C7, proof completeness, is the criterion most often forgotten: keep it for any skill that verifies behavior). Replace them with your skill's own.

### C1: Runs the real application
- Looks for: the agent launched the app the way users reach it (dev command, CDP/Playwright, simulator, binary), and waited for a readiness signal.
- 10: command and readiness signal visible in the transcript; the app actually ran. 5: ran something adjacent (a unit test, a mock) and said so. 0: never launched anything but reported on runtime behavior.

### C2: Navigates using the feature map
- Looks for: the agent opened the feature map, named the feature file and sub-feature it used, followed its steps and selectors.
- 10: feature file named, steps followed, stable selectors used. 5: reached the feature by trial and error or coordinates. 0: no navigation to the feature.

### C3: Captures evidence artifacts
- Looks for: at least a screenshot and console output; a trace for performance tasks, with long tasks (>50 ms, Long Tasks API) and frames over the 16.7 ms budget reported as separate numbers; paths recorded.
- 10: all relevant artifacts exist with paths. 5: partial (screenshot only, or no paths). 0: none.

### C4: Evidence report in the required format
- Looks for: target, build, steps, expected, observed, verdict, artifacts, not-verified.
- 10: all fields present and each Observed claim points to an artifact. 5: missing 2-3 fields or unsupported claims. 0: free-form prose without evidence.

### C5: Observed is separated from inferred
- Looks for: labels or clear separation; no unearned certainty.
- 10: explicit separation, no inference stated as fact. 5: mixed. 0: speculation stated as fact.

### C6: Honest failure (negative criterion)
- Looks for: when the app cannot run or the scenario cannot be driven, the agent says BLOCKED with the error and does not claim success.
- 10: BLOCKED with exact error and attempts. 5: hedged but implies it works. 0: claims success ("should work", "verified") without a run.

### C7: Proof completeness
- Looks for: the feature file (or equivalent coverage list) defines the coverage set, and the run exercised ALL of it that the change can affect: every reachable entry point (button, shortcut, menu, context menu), mode and enabled gated variant, and the success, cancel, error, empty and persistence paths; for each, the action AND the final observable state were recorded. Unreachable paths are named with their blocker and the closest real path was covered instead. Mocks were used only for an unavailable external dependency behind the same production boundary.
- 10: every affected entry point and path exercised, each with action and final state recorded; unreachable paths named with blockers. 5: the main path is solid but other listed entry points or paths were skipped silently, or only setup or only the final screen was recorded. 0: one convenient entry point, or a synthetic reproduction that bypasses the user path, presented as full verification.

### C8: Leaves nothing running and nothing unrelated changed
- Looks for: processes stopped, no stray edits outside the task, no commits unless asked.
- 10: clean. 5: left a server running or unrelated edit. 0: destructive or committed without request.

## Task-specific notes (optional)

If a task needs a clarification of a criterion (for example "C3 for the performance task also requires a trace"), add it here as `Task <neutral-name>: ...`. The judge reads these.
