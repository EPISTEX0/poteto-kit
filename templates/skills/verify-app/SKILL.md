---
name: verify-app
description: Run the real {{APP_NAME}} the way users reach it, drive it, and capture evidence (screenshot, console errors, performance trace, heap snapshot). Use to reproduce a bug report, verify a fix or feature before claiming it works, or measure performance. Never report "should work" without evidence from a real run.
disable-model-invocation: false
---

<!-- HOW TO USE:
1. Replace every {{PLACEHOLDER}} (search for "{{"). Delete recipes, Launch rows and driver sections that do not apply to your app type. A slot your app has no counterpart for (no login, no feature flags): write `none`; where a sentence or bullet around it stops making sense (signed-in checks, the shared-profile step in "Pick a flow"), rewrite or delete it.
2. Keep the references/ directory next to this file: references/features/ (the feature map) is what makes this skill useful on vague reports, references/worktree-isolation.md covers parallel instances and `--target`, references/test-account.md covers a login (delete it if the app has none), references/evidence-export.md is an optional human-readable export (delete it if nobody asked), and references/cloud-environment.md covers cloud agent VMs (delete it if you never run there).
3. Install it as .agents/skills/verify-app/ (the canonical location; see the install table in templates/README.md for Claude Code, Cursor and Codex). Keep the folder name equal to `name` above.
4. Invocation: `disable-model-invocation: false` (a literal, so the frontmatter stays valid YAML) lets the agent load the skill on its own when the description matches; that is the default because the skill has to fire when the agent is about to say "done" or gets a bug report, with nobody remembering to ask. Set it to `true` if driving the app is costly or touches something shared (a live session, a paid environment, a cloud VM) or if you want the skill only on an explicit /verify-app (honoured by Claude Code and Cursor). Codex ignores the key; there, add agents/openai.yaml with `policy: { allow_implicit_invocation: false }` instead.
5. Or let the agent generate it: run skills/create-verification/SKILL.md first, then edit the result.
6. A real control skill ships its own small CLI (see "The CLI" below); the template describes the commands to build, and `create-verification` can write it for you.
7. Worked instance in this kit: example/ has a verify CLI, `npm run verify -- --feature <id> --scenario <name>` (run from example/). It shows the core loop, `doctor` and the refusal rule; it does not implement gates, `--target`, `account create` or the evidence-block `report.md` described below (its per-scenario `report.md` is simpler). Delete this line in the installed copy.
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
- manage parallel instances isolated per worktree, and verify another checkout with `--target <path>` (see `references/worktree-isolation.md`)
- run the build, lint and typecheck as gates beside the scenarios (see "Gates and the verdict")
- write `report.json` and a `report.md` that is the evidence report below, ready to paste
- create the one dedicated test account where the app has a login (see `references/test-account.md`)
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
- Credentials (delete this bullet if the app has no login): in `{{CREDENTIALS_FILE}}`, a user config file outside the repo with mode 600, or in the environment. Never printed, copied into the repo or pasted into a report. Provisioning the account, and a backend that allows one session per account: `references/test-account.md`.

If a prerequisite is missing, install it if you can. If you cannot, follow the Failure policy below.

## Pick a flow

Decide first which instance you are going to drive; do not guess. The target is always named or unambiguous, never inferred.

1. Detect where you are: in a git worktree, `.git` is a file; in the main checkout it is a directory.
2. **Main checkout, no selector:** drive this checkout. Launch the dev build on the default port `{{DEFAULT_PORT}}` with the shared profile (`{{DEFAULT_PROFILE_DIR}}`). This is the human's session; do not fight it.
3. **Another checkout or worktree:** name it, in one of two shapes (`references/worktree-isolation.md`). Either the CLI lives in that worktree and every command takes `--worktree`, or the CLI runs from the main checkout and takes `--target <checkout>`. Both derive the port from the path and isolate the profile, so parallel agents never collide with each other or with the human. With `--target`, artifacts land in the checkout that holds the CLI, and the report labels the target (a detached one by the remote branch(es) that contain its commit, because a detached HEAD has no branch name).
4. **Refuse when ambiguous.** From a worktree, a command with none of `--worktree`, `--target` or an explicit `--cdp <port>` must fail with a message that names the fix. It must NOT silently attach to the default port: that would drive (and possibly corrupt) someone else's running app and then report on the wrong build. The same holds for a `--target` that is missing, is not installed or has its derived port held: refuse and say what to do; never install for it or pick another port.

## Run `doctor` first

When anything looks off, and before trusting any run, execute `{{CLI_NAME}} doctor`. It is one read-only command that answers "is this instance worth driving?":

- which worktree or checkout you are in, and which instance is selected
- which process owns the port (is it yours, someone else's, or nothing?)
- whether the build watcher is alive and the build is fresh (newer than the last source change)
- whether the environment check passes (tool versions match the runtime pin, build artifacts are fresh, the profile exists and is signed in, a display or headless browser is available)
- whether test credentials are present, as presence only (and a masked account name at most), never the values
- for a backend that allows one session per account: which policy applies, a run lock that serializes runs or one account per parallel worker
- for a backend probe without a token: an HTTP 401 means the API is up, so label it expected in the output (for example "answers 401 (expected: unauthenticated probe)") instead of reading it as a fault

If doctor reports stale or foreign state, fix that (restart, rebuild, set up the worktree) before driving. Put the doctor summary in the evidence report.

When `doctor` passes but a full run is BLOCKED at login, run the `smoke` feature next: a scenario that only loads the first screen, with no login. If smoke fails, the harness is broken (CLI, server or browser). If smoke passes and login fails, the cause is the credentials or the backend. `smoke` checks the harness and is not a user feature, so it needs no feature file and covers no ids.

## The CLI

A control skill is code plus markdown. Keep the code in the repo beside its other scripts, not in the skill folder, and have the skill name it:

```
{{CLI_FILE}}                 the CLI entry point (suggested: scripts/verify/cli.ts); `--help` lists every command
scripts/verify/              helpers (connect, locate instance, trace, doctor) and tests for the CLI itself (arg parsing, port derivation, refusal, doctor output)
.agents/skills/verify-app/
  SKILL.md
  references/                features/ (feature map), worktree-isolation.md, and the optional test-account.md, evidence-export.md, cloud-environment.md
```

Test the CLI like any code: the refusal rule, port derivation, doctor output, the verdict and exit-code rules and the redaction of credentials are exactly what breaks silently. An agent can write most of the CLI for you from this description; what matters is the behavior contract above.

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

- **Gates and the verdict.** The verdict and the exit code come only from the scenarios' assertions. Gates (build, lint, typecheck) never change them; they are reported beside the verdict, in the Build line. A PASS with a `regressed` gate is a PASS of the feature and a failed gate: say both, and do not call the change done. Judge lint as a delta against the base, not as a raw count, because a repo with an existing lint backlog fails raw lint for reasons that are not yours: `ok` when no changed file got a new problem, `regressed` (list file, line and rule) when one did, `not measured` when no base exists. The base is the merge-base with `origin/{{DEFAULT_BRANCH}}`. No second worktree is needed: lint every changed file as it is now and as it was at the base (`git show <base>:<path>`, with the target's own lint config), then derive the base total as the whole-repo count now, minus the changed files now, plus those files at the base.
- **Verdict from the assertion.** The scenario asserts the expected behaviour, what should happen if the app is right. For a bug report (recipe A), that assertion failing means REPRODUCED and passing means NOT REPRODUCED. For a change (recipe B), failing means FAIL and passing means PASS. If the app never ran, or the CLI refused to start, the verdict is BLOCKED, whatever the exit code.
- **CLI exit codes** (suggested): 0 every assertion passed; 1 a step or assertion failed (read the output: a crash before the first assertion is BLOCKED, not FAIL or REPRODUCED); 2 usage error; 3 refused to start for an environment reason (ambiguous target, port held by another process; use further numbers for further refusals). `doctor` exits 0 when healthy and 1 when not ready.
- **The `report.md` is this block.** The CLI writes `report.md` as exactly the block above, field for field in this order (a checks table may follow), and `report.json` as the source of truth that holds every number and verdict. Paste `report.md` as it is and add only what you observed outside the CLI (for example a comparison with the base); never rebuild the block by hand, and never type a number the CLI already wrote. For a reader who will not open Markdown, `references/evidence-export.md` is an optional recipe for a PDF built from `report.json`.
- **Expected console noise** is a named allowlist, never a silent ignore: each entry is a pattern with a reason and the scenarios it applies to (for example a known 4xx an endpoint returns on every visit). A match is listed in the report with its reason; anything else in the console or among failed requests is a finding and fails the scenario. Add an entry only after you have shown the noise is not caused by your change.
- A field that does not apply is written "not measured", never dropped or left blank. This covers Perf, the trace and the heap snapshot whenever you did not take them. Traces are large (about 2 MB per scenario in this kit's example): take one for a performance question or a failing run, not for every passing run.
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
