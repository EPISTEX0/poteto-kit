---
name: verify-app
description: Run the real {{APP_NAME}} the way users reach it, drive it, and capture evidence (screenshot, console errors, performance trace, heap snapshot). Use to reproduce a bug report, verify a fix or feature before claiming it works, or measure performance. Never report "should work" without evidence from a real run.
disable-model-invocation: false
---

<!-- HOW TO USE:
1. Replace every {{PLACEHOLDER}} (search for "{{"). Delete recipes, Launch rows and driver sections that do not apply to your app type.
2. Keep the references/ directory next to this file: references/features/ (the feature map) is what makes this skill useful on vague reports, references/worktree-isolation.md covers parallel instances, and references/cloud-environment.md covers cloud agent VMs (delete it if you never run there).
3. Install it as .agents/skills/verify-app/ (the canonical location; see the install table in templates/README.md for Claude Code, Cursor and Codex). Keep the folder name equal to `name` above.
4. Invocation: `disable-model-invocation: false` (a literal, so the frontmatter stays valid YAML) lets the agent load the skill on its own when the description matches. Set it to `true` if you want the skill only on an explicit /verify-app (honoured by Claude Code and Cursor). Codex ignores the key; there, add agents/openai.yaml with `policy: { allow_implicit_invocation: false }` instead.
5. Or let the agent generate it: run skills/create-verification/SKILL.md first, then edit the result.
6. A real control skill ships its own small CLI (see "The CLI" below); the template describes the commands to build, and `create-verification` can write it for you.
7. Worked instance in this kit: example/ has a verify CLI, `npm run verify -- --feature <id> --scenario <name>` (run from example/). Delete this line in the installed copy.
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

What this skill can do through its CLI (`{{CLI_NAME}} --help` lists the exact commands):

- inspect the DOM (or the accessibility tree) and read the text and state of any element
- take screenshots of the window or one element
- click, type, and press keys or keyboard chords
- evaluate JavaScript to READ state (not to invoke application commands)
- profile: performance traces, CPU and heap data
- throttle CPU and network to expose slow-path bugs
- stream console and network output while you drive a flow
- manage parallel instances isolated per worktree (see `references/worktree-isolation.md`)
- run `doctor`, a read-only health check (see below)

Adapt the list to the surface you drive (browser, desktop shell, simulator, terminal); delete what you cannot support.

## Runtime pin and environment check

These are two different guards; do not merge them.

- **Runtime pin** (before anything is provisioned): the project names the exact runtime version it needs ({{RUNTIME_VERSION_FILE}}, for example a Node version file or a toolchain file). If the installed version differs, exit with a message that names the fix, before installing or building anything. A half-provisioned checkout is the worst failure to debug.
- **Environment check** (in `doctor`, see below): a read-only report of whether this machine can drive the app right now: display or headless browser, required tools, a profile that exists and is signed in, the port free or owned by you, a fresh build.

If either guard stops you, report BLOCKED with the reason. Skills that cost real resources or touch real accounts should carry guards like these.

## Where it runs

- **Local machine:** the default. Use the flow below.
- **Cloud agent VM:** works where a display or a headless browser exists and a profile (signed-in state, seeded data) can be provided; see `references/cloud-environment.md` for setup, ports, artifact upload and what to mark manual. Where there is no display or headless browser, or no profile can be provided, report BLOCKED with the reason instead of attempting it.

## Prerequisites

- App type: {{APP_TYPE}} (one of: web, electron, ios, android, cross-platform mobile such as Flutter or React Native, backend HTTP API, cli).
- Install: `{{INSTALL_COMMAND}}`
- Required tools: {{REQUIRED_TOOLS}} (for example Playwright browsers, Chrome with `--remote-debugging-port`, Xcode simulator and `xcrun simctl`, Android SDK with `adb`, Maestro, `curl`).
- Artifacts directory: `{{ARTIFACTS_DIR}}` (default suggestion: `artifacts/verify/<timestamp>/`). Create it before each run. Never overwrite a previous run.
- Test data / login: {{TEST_DATA_OR_LOGIN}}

If a prerequisite is missing, install it if you can. If you cannot, follow the Failure policy below.

## Pick a flow

Decide first which instance you are going to drive; do not guess.

1. Detect where you are: in a git worktree, `.git` is a file; in the main checkout it is a directory.
2. **Main checkout:** launch the dev build on the default port `{{DEFAULT_PORT}}` with the shared profile (`{{DEFAULT_PROFILE_DIR}}`). This is the human's session; do not fight it.
3. **Worktree or parallel agent:** every command takes `--worktree`, which derives a port from the worktree path and uses an isolated profile, so parallel agents never collide with each other or with the human. Details and setup commands: `references/worktree-isolation.md`.
4. **Refuse when ambiguous.** From a worktree, a command with neither `--worktree` nor an explicit `--cdp <port>` must fail with a message that names the fix. It must NOT silently attach to the default port: that would drive (and possibly corrupt) someone else's running app and then report on the wrong build.

## Run `doctor` first

When anything looks off, and before trusting any run, execute `{{CLI_NAME}} doctor`. It is one read-only command that answers "is this instance worth driving?":

- which worktree or checkout you are in, and which instance is selected
- which process owns the port (is it yours, someone else's, or nothing?)
- whether the build watcher is alive and the build is fresh (newer than the last source change)
- whether the environment check passes (tool versions match the runtime pin, build artifacts are fresh, the profile exists and is signed in, a display or headless browser is available)

If doctor reports stale or foreign state, fix that (restart, rebuild, set up the worktree) before driving. Put the doctor summary in the evidence report.

## The CLI

A control skill is code plus markdown. Ship the code with the skill:

```
verify-app/
  SKILL.md
  {{CLI_FILE}}        the CLI entry point; `--help` lists every command
  lib/                helpers (connect, locate instance, trace, doctor)
  references/         features/ (feature map), worktree-isolation.md, recipes
  test/               tests for the CLI itself (arg parsing, port derivation, refusal, doctor output)
```

Test the CLI like any code: the refusal rule, port derivation and doctor output are exactly what breaks silently. An agent can write most of the CLI for you from this description; what matters is the behavior contract above.

## Launch

Start the app in the mode users reach it, not a mocked harness.

| App type | Launch command | How you drive it |
| --- | --- | --- |
| Web | `{{DEV_COMMAND}}` (serves at `{{APP_URL}}`) | Playwright, or Chrome DevTools Protocol (CDP) on `{{CDP_PORT}}` |
| Electron | `{{DEV_COMMAND}}` with `--remote-debugging-port={{CDP_PORT}}` | Attach over CDP (Playwright `connectOverCDP` or raw CDP); drive the renderer, and check main-process logs separately |
| iOS | `{{DEV_COMMAND}}` (build and boot simulator `{{SIMULATOR_NAME}}`) | `xcrun simctl` for install/launch/screenshot, plus UI automation (XCUITest, `idb`, or your simulator MCP tool) |
| Android | `{{DEV_COMMAND}}` (build, boot emulator `{{SIMULATOR_NAME}}`, `adb install`, launch the activity) | `adb` for install, launch, `screencap` and `logcat`; UI automation through UIAutomator or Maestro flows |
| Flutter / React Native | `{{DEV_COMMAND}}` (for example `flutter run -d {{SIMULATOR_NAME}}`, or the React Native run command plus its Metro dev server) | The framework's own driver where it exists (Flutter `integration_test`, Detox), else the platform automation above (Maestro, UIAutomator, XCUITest); read the framework's dev-server log for errors |
| Backend HTTP API | `{{DEV_COMMAND}}` (serves at `{{APP_URL}}`) | Real requests with `curl` or an HTTP client against seeded data; record method, URL, request body, status and response body; capture the server log for the same time window |
| CLI | `{{DEV_COMMAND}}` | Execute the binary with real arguments and stdin; capture stdout, stderr, exit code |

Rules:

1. Wait for a readiness signal (URL or health endpoint answers, CDP target listed, simulator or emulator booted, process prints ready). Do not sleep and hope.
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
5. Compare against the state before the fix when possible (same steps on the base commit); a fix that was never seen failing is unproven.

### C. Measure performance

Two different measures; report them separately and never mix them:

- **Frames over the 16.7 ms budget:** at 60 fps each frame has 16.7 ms. A frame that takes longer is a dropped or janky frame.
- **Long tasks (>50 ms, Long Tasks API):** main-thread tasks longer than 50 ms block input and rendering.

1. Start a performance trace (Chrome: CDP `Tracing.start` or Playwright `browser.startTracing`; Safari/iOS: Instruments `xctrace` Time Profiler; CLI: `time`, `perf`, or your language profiler).
2. Perform exactly the interaction reported (scroll the list, open the panel, type in the editor). Keep it repeatable; script it, do not improvise.
3. Stop the trace and save it to `{{ARTIFACTS_DIR}}`.
4. Report numbers, not impressions: long tasks (>50 ms, Long Tasks API) as a count and the longest in ms; frames over the 16.7 ms budget as a count out of total frames; total blocking time; and the top 3 functions or call stacks by self time with file paths if available.
5. For suspected leaks, take a heap snapshot before the interaction, repeat the interaction 10 times, force GC, take a second snapshot, and report retained-size growth by constructor.
6. Measure before and after your change with the same script. A perf claim without both numbers is not evidence.

A flame graph you cannot interpret is a reason to read the code path (cite file:line) before claiming a cause, not a reason to guess.

## Evidence report format

End every run with a report in this exact shape. Put it in the PR description or hand it to the requester.

```
## Verification report
- Target: <feature-id> / <scenario or bug report summary>
- Build: commit <sha>, <clean|dirty>, app launched with `<exact command>`
- Environment: <OS, browser/simulator version, viewport or device>
- Steps run: 1. ... 2. ... (what you actually did, from app start)
- Coverage: <feature file; entry points, modes, gated variants and success/cancel/error/empty/persistence paths exercised, each with its final observable state; paths NOT reached, with the blocker and the closest real path covered; repeat every `skip: <reason>` from the feature file>
- Doctor: <summary of `doctor` output: instance, port owner, build freshness, environment check>
- Expected: <what should happen>
- Observed: <what happened, facts only>
- Verdict: PASS | FAIL | REPRODUCED | NOT REPRODUCED | BLOCKED
- Artifacts: <path> (screenshot), <path> (console log), <path> (trace), <path> (heap snapshot, if relevant)
- Console errors / failed requests: <count and the first few, or "none observed">
- Perf (if measured): long tasks (>50 ms, Long Tasks API): <n>, longest: <ms>; frames over the 16.7 ms budget: <n> of <total>; before/after: <a> / <b>
- Not verified: <anything you did not check and why>
```

Rules for the report:

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
