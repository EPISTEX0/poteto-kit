---
name: verify-app
description: Run the real {{APP_NAME}} the way users reach it, drive it, and capture evidence (screenshot, console errors, performance trace, heap snapshot). Use to reproduce a bug report, verify a fix or feature before claiming it works, or measure performance. Never report "should work" without evidence from a real run.
disable-model-invocation: false
---

<!-- HOW TO USE:
1. Replace every {{PLACEHOLDER}} (search for "{{"). Fill Launch from references/launch-by-app-type.md: take the row for your app type and set {{DEV_COMMAND}}, the "Reached at" line ({{APP_URL}}, or the CDP port {{CDP_PORT}} or the simulator {{SIMULATOR_NAME}}; `none` and delete the line if the app has no address) and {{LAUNCH_DRIVER}} from it. Delete the recipes that do not apply. A slot your app has no counterpart for (no login, no feature flags): write `none`; where a sentence or bullet around it stops making sense (the Credentials bullet, the shared-profile step in "Pick a flow", the "signed in" checks in references/cli-contract.md), rewrite or delete it.
2. Keep the references/ directory next to this file. references/cli-contract.md is the spec of the CLI: read it before you build or change the CLI. references/features/ (the feature map) is what makes this skill useful on vague reports. Optional: worktree-isolation.md (parallel instances and `--target`), test-account.md (delete it if the app has no login), evidence-export.md (delete it if nobody asked), cloud-environment.md (delete it if you never run in the cloud).
3. Install it as .agents/skills/verify-app/ (the canonical location; see the install table in templates/README.md for Claude Code, Cursor and Codex). Keep the folder name equal to `name` above.
4. `disable-model-invocation: false` is a literal so the frontmatter stays valid YAML, and it lets the agent load the skill when the description matches. Set it to `true` only if you want an explicit /verify-app. When to choose which, and the Codex form: templates/README.md, "Step 1. Pillar 1: build verification".
5. Or let the agent generate it: run skills/create-verification/SKILL.md first, then edit the result.
6. A real control skill ships its own small CLI. The commands to build and the rules they must enforce are in references/cli-contract.md; `create-verification` can write the CLI for you.
7. Worked instance in this kit: example/ has a verify CLI, `npm run verify -- --feature <id> --scenario <name>` (run from example/). It shows the core loop, `doctor` and the refusal rule; it does not implement gates, `--target`, `account create` or the evidence-block `report.md` that references/cli-contract.md describes (its per-scenario `report.md` is simpler). Delete this line in the installed copy.
-->

# verify-app: run it for real, then report evidence

You are the verifier. A human who has to copy screenshots and console errors back to you is the bottleneck; this skill removes that human from the loop. Passing unit tests and "the code looks right" are not verification. Verification is: the real app ran, you drove it like a user, and you hold artifacts that show what happened.

## When to use

Use this skill when any of these is true:

- You received a bug report, a screenshot, or a vague message ("the left panel is laggy", "???"). Map it with `references/features/README.md`, then reproduce.
- You changed UI, behavior, or performance-sensitive code and are about to say "done" or open a PR.
- You are asked whether something is fixed, slow, leaking memory, or throwing errors.

Do not use it for pure refactors with no runtime effect, docs-only changes, or questions answerable from reading code (use the `investigate` skill for root causes).

## Capabilities

<!-- HOW TO USE: adapt the list to the surface you drive (browser, desktop shell, simulator, terminal); delete what you cannot support. -->
What this skill can do through its CLI (`{{CLI_NAME}} --help` lists the exact commands). Every scenario run goes through it:

- inspect the DOM (or the accessibility tree) and read the text and state of any element
- take screenshots of the window or one element
- click, type, and press keys or keyboard chords
- evaluate JavaScript to READ state (not to invoke application commands)
- profile: performance traces, CPU and heap data
- throttle CPU and network to expose slow-path bugs
- stream console and network output while you drive a flow
- manage parallel instances isolated per worktree, and verify another checkout with `--target <path>` (see `references/worktree-isolation.md`)
- run the build, lint and typecheck as gates beside the scenarios (see "Rules for the report")
- write `report.json` and a `report.md` that is the evidence report below, ready to paste
- create the one dedicated test account where the app has a login (see `references/test-account.md`)
- run `doctor`, a read-only health check (see below)

## Where it runs

- **Local machine:** the default. Use the flow below.
- **Cloud agent VM:** works where a display or a headless browser exists and a profile (signed-in state, seeded data) can be provided; see `references/cloud-environment.md` for setup, ports, artifact upload and what to mark manual. Where there is no display or headless browser, or no profile can be provided, report BLOCKED with the reason instead of attempting it.

## Prerequisites

- App type: {{APP_TYPE}} (one of: web, electron, ios, android, cross-platform mobile such as Flutter or React Native, backend HTTP API, cli).
- Install: `{{INSTALL_COMMAND}}`
- Required tools: {{REQUIRED_TOOLS}} (for example Playwright browsers, Chrome with `--remote-debugging-port`, Xcode simulator and `xcrun simctl`, Android SDK with `adb`, Maestro, `curl`).
- Artifacts directory: `{{ARTIFACTS_DIR}}` (default suggestion: `artifacts/verify/<timestamp>/`). Create it before each run. Never overwrite a previous run.
- Test data / login: {{TEST_DATA_OR_LOGIN}}
- Credentials (delete this bullet if the app has no login): in `{{CREDENTIALS_FILE}}`, a user config file outside the repo with mode 600, or in the environment. Never printed, copied into the repo or pasted into a report. Provisioning the account, and a backend that allows one session per account: `references/test-account.md`.

If a prerequisite is missing, install it if you can. If you cannot, follow the Failure policy below.

## Pick a flow

Decide first which instance you are going to drive; do not guess. The target is always named or unambiguous, never inferred.

1. Detect where you are: in a git worktree, `.git` is a file; in the main checkout it is a directory.
2. **Main checkout, no selector:** drive this checkout. Launch the dev build on the default port `{{DEFAULT_PORT}}` with the shared profile (`{{DEFAULT_PROFILE_DIR}}`). This is the human's session; do not fight it.
3. **Another checkout or worktree:** name it, in one of two shapes (`references/worktree-isolation.md`): `--worktree` on every command when the CLI lives in that worktree, or `--target <checkout>` when the CLI runs from the main checkout. The port is derived and the profile isolated for you. With `--target`, artifacts land in the checkout that holds the CLI.
4. **Never attach to the default port from a worktree:** name `--worktree`, `--target` or an explicit `--cdp <port>`; otherwise you drive someone else's app and report on the wrong build. If the CLI refuses, apply the fix its message names, such as an explicit free port; never kill, attach to or drive a process you did not start.

## Run `doctor` first

- When anything looks off, and before trusting any run, execute `{{CLI_NAME}} doctor`: one read-only command that answers "is this instance worth driving?"
- If it reports stale or foreign state, fix that (restart, rebuild, set up the worktree) before driving. If it or the runtime pin stops you, report BLOCKED with the reason. Put the doctor summary in the evidence report.
- When `doctor` passes but a full run is BLOCKED at login, run the `smoke` feature next: a scenario that only loads the first screen, with no login.
- If smoke fails, the harness is broken (CLI, server or browser). If smoke passes and login fails, the cause is the credentials or the backend. `smoke` checks the harness and is not a user feature, so it needs no feature file and covers no ids.

## Launch

Start the app in the mode users reach it, not a mocked harness.

- Launch command: `{{DEV_COMMAND}}`
- Reached at: {{APP_URL}}
- How you drive it and what to record: {{LAUNCH_DRIVER}}

Rules:

1. Wait for a readiness signal at the "Reached at" value (URL or health endpoint answers, CDP target listed, simulator or emulator booted, process prints ready). Do not sleep and hope.
2. Record the exact command, working directory, git commit (`git rev-parse HEAD`) and whether the working tree is dirty. This goes in the report.
3. Leave nothing running when you finish: stop dev servers, simulators and browsers you started.

## Navigate: use the feature map

Never guess where a feature lives in the UI. Open `references/features/README.md`: read its baseline preconditions, driving conventions and proof rules, find the feature in the index, and read that feature file (and `cross-cutting-flows.md` when the change spans features). Follow **How to get to it**, then use **Driving it** (selectors, chords, gotchas). Prefer ARIA labels and semantic data attributes, and keyboard chords over coordinate clicks. If the feature is missing from the map, or a step or selector no longer works, say so in the report and fix the feature file (see the `maintain-verification` skill) as part of your change.

## Recipes

### A. Reproduce a bug report

1. Map the report to a feature: read every piece of visible text in the report and note the screen region it shows, then search the index and the feature files in `references/features/` for that text (overview paragraphs and Sub-features lines are written to match). State which feature file and sub-feature you chose and why; if the report is too vague, try the 2-3 most likely and say so.
2. Launch the app. Navigate with the **How to get to it** steps of that sub-feature.
3. Perform the reported action. Capture, before and after: screenshot, console output (errors and warnings), and failed network requests.
4. Decide one of: REPRODUCED (artifacts show the symptom), NOT REPRODUCED (you did the steps and the symptom is absent; list exact steps and build), or BLOCKED (could not run; see Failure policy). "Not reproduced" is a legitimate answer, for example when the bug is already fixed on main.
5. Do not name a root cause here. Hand off to the `investigate` skill with your artifacts.

### B. Verify a fix or a new feature

1. Run the scenario that failed before your change (or the walk-through in the feature file's **Driving it** section). Capture the same artifacts.
2. Confirm the expected behavior is visible: screenshot of the end state, no new console errors, no failed requests.
3. Run one neighbouring scenario to check for regressions in the same feature (its Sub-features list and Driving it gotchas).
4. If a worked scenario exists as a script, run it (`{{CLI_NAME}} --help` lists them).
5. Compare against the state before the fix when possible (same steps on the base commit); a fix that was never seen failing is unproven. Recipe, run from the checkout that holds the CLI, with the worktree outside the repo and removed afterwards:
   1. `git worktree add --detach <dir> $(git merge-base HEAD origin/{{DEFAULT_BRANCH}})`
   2. `{{INSTALL_COMMAND}}` inside `<dir>` (the CLI refuses a target that is not installed and never installs for you)
   3. `{{CLI_NAME}} --feature <id> --target <dir>`, then the same command against the checkout with the change; compare the two reports (the base is expected to FAIL where the fix matters)
   4. `git worktree remove --force <dir>`

### C. Measure performance

Two different measures; report them separately and never mix them:

- **Frames over the 16.7 ms budget:** at 60 fps each frame has 16.7 ms. A frame that takes longer is a dropped or janky frame.
- **Long tasks (>50 ms, Long Tasks API):** main-thread tasks longer than 50 ms block input and rendering.

1. Start a performance trace (Chrome: CDP `Tracing.start` or Playwright `browser.startTracing`; Safari/iOS: Instruments `xctrace` Time Profiler; CLI: `time`, `perf`, or your language profiler).
2. Perform exactly the interaction reported (scroll the list, open the panel, type in the editor). Keep it repeatable; script it, do not improvise.
3. Stop the trace and save it to `{{ARTIFACTS_DIR}}`. Traces are large (about 2 MB per scenario in this kit's example): take one for a performance question or a failing run, not for every passing run.
4. Report numbers, not impressions: long tasks (>50 ms, Long Tasks API) as a count and the longest in ms; frames over the 16.7 ms budget as a count out of total frames; total blocking time; and the top 3 functions or call stacks by self time with file paths if available.
5. For suspected leaks, take a heap snapshot before the interaction, repeat the interaction 10 times, force GC, take a second snapshot, and report retained-size growth by constructor.
6. Measure before and after your change with the same script. A perf claim without both numbers is not evidence.

A flame graph you cannot interpret is a reason to read the code path (cite file:line) before claiming a cause, not a reason to guess.

## Evidence report format

End every run with a report in this exact shape. Put it in the PR description or hand it to the requester.

```
## Verification report
- Target: <feature-id> / <scenario or bug report summary>
- Build: commit <sha> (<branch, or the remote branch(es) containing it if detached>), <clean|dirty>, app launched with `<exact command>`; gates: build <ok|regressed|not measured>, lint <ok|regressed|not measured> (<delta against base <sha>>)
- Environment: <OS, browser/simulator version, viewport or device>
- Steps run: 1. ... 2. ... (what you actually did, from app start)
- Coverage: <feature file; entry points, modes, gated variants and success/cancel/error/empty/persistence paths exercised, each with its final observable state; paths NOT reached, with the blocker and the closest real path covered; repeat every `skip: <reason>` from the feature file>
- Doctor: <summary of `doctor` output: instance, port owner, build freshness, environment check>
- Expected: <what should happen>
- Observed: <what happened, facts only>
- Verdict: PASS | FAIL | REPRODUCED | NOT REPRODUCED | BLOCKED
- Artifacts: <path> (screenshot), <path> (console log), <path> (trace, or "not measured"), <path> (heap snapshot, or "not measured")
- Console errors / failed requests: <count of findings and the first few, or "none observed">; known noise matched: <pattern and reason, or "none">
- Perf: "not measured", or long tasks (>50 ms, Long Tasks API): <n>, longest: <ms>; frames over the 16.7 ms budget: <n> of <total>; before/after: <a> / <b>
- Not verified: <anything you did not check and why>
```

Rules for the report:

- **Gates.** The CLI computes the gates and the exit code; the verdict is yours, from the assertion (next bullet). A PASS with a `regressed` gate is a PASS of the feature and a failed gate: say both, and do not call the change done. How gates are judged: "Gates and the verdict" in `references/cli-contract.md`.
- **Verdict from the assertion.** The scenario asserts the expected behaviour, what should happen if the app is right. A failing assertion means REPRODUCED in recipe A and FAIL in recipe B. A passing one means NOT REPRODUCED in recipe A and PASS in recipe B. Exit 0 or 1 is the assertion result. A crash before the first assertion, a refusal (exit 3) or a run that never started is BLOCKED, whatever the exit code. Gates never change the verdict.
- Paste the CLI's `report.md` as it is: it is exactly the block above. Set its Verdict line by the verdict bullet above, and add only what you observed outside the CLI (for example a comparison with the base). Never rebuild the block by hand, and never type a number the CLI already wrote. For a reader who will not open Markdown, `references/evidence-export.md` is an optional recipe for a PDF built from `report.json`.
- **Expected console noise** is a named allowlist, never a silent ignore: each entry is a pattern with a reason and the scenarios it applies to (for example a known 4xx an endpoint returns on every visit). A match is listed in the report with its reason; anything else in the console or among failed requests is a finding and fails the scenario. Add an entry only after you have shown the noise is not caused by your change.
- A field that does not apply is written "not measured", never dropped or left blank. This covers Perf, the trace and the heap snapshot whenever you did not take them.
- Every claim in Observed points at an artifact path or a pasted log line.
- Separate what you observed from what you infer. Inference goes under its own label.
- "Should work", "looks correct", "tests pass" are not Observed. Tests passing is a separate line item.
- Coverage follows the feature file (see Proof and skip reporting in `references/features/README.md`): one convenient entry point is an incomplete proof when the map lists others. Record the action and the final observable state, not just setup.
- Include failures and surprises. A clean report from a run that hit errors you ignored is a false report.

## Failure policy

If you cannot run the app (build fails, dependency missing, port busy, no simulator, no credentials, crash on start):

1. Say so first, in the report, with Verdict BLOCKED and the exact error output.
2. List what you tried (at least two reasonable approaches before giving up) and what is needed to unblock.
3. Do not claim the change works. Do not substitute reasoning or unit tests for the missing run and call it verified; you may state what you checked instead, labelled as "not a runtime verification".
4. If the app runs but the scenario cannot be driven (missing selector, unreachable state), report that, add the missing stable selector if it is a small safe change, otherwise list it in "Not verified".

## Keep this skill honest

- When you find a step in a feature file that is wrong, fix it in the same change.
- When a verification run fooled you (passed while broken, or failed while fine), write the failure down and tighten the recipe; see `_skill-from-failure.md`.
- Re-run the skill's evals after editing it (`evals/EVAL_PLAYBOOK.md`).

## The CLI

The CLI lives in the repo at `{{CLI_FILE}}`, beside its other scripts, not in this folder. Its behavior contract is in `references/cli-contract.md`; read it before building or changing the CLI.
