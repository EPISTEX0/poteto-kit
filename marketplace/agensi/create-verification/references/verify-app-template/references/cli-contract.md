# The verify CLI: behavior contract

Why: everything below has one right answer every time, so it lives in code with tests, not in text the agent rereads on every run. Once the CLI enforces a rule, the agent only has to follow the CLI's message. The agent's workflow, the verdict and the judgment rules of the report are in `SKILL.md`; this file is for whoever builds or changes the CLI.

## Capabilities

What this skill can do through its CLI (`{{CLI_NAME}} --help` lists the exact commands):

- inspect the DOM (or the accessibility tree) and read the text and state of any element
- take screenshots of the window or one element
- click, type, and press keys or keyboard chords
- evaluate JavaScript to READ state (not to invoke application commands)
- profile: performance traces, CPU and heap data
- throttle CPU and network to expose slow-path bugs
- stream console and network output while you drive a flow
- manage parallel instances isolated per worktree, and verify another checkout with `--target <path>` (see `worktree-isolation.md`)
- run the build, lint and typecheck as gates beside the scenarios (see "Gates and the verdict" below)
- write `report.json` and a `report.md` that is the evidence report block in `SKILL.md` ("Evidence report format"), ready to paste
- create the one dedicated test account where the app has a login (see `test-account.md`)
- run `doctor`, a read-only health check (see "`doctor`: the checks" below)

Adapt the list to the surface you drive (browser, desktop shell, simulator, terminal); delete what you cannot support.

## Runtime pin and environment check

These are two different guards; do not merge them.

- **Runtime pin** (before anything is provisioned): the project names the exact runtime version it needs ({{RUNTIME_VERSION_FILE}}, for example a Node version file or a toolchain file). If the installed version differs, exit with a message that names the fix, before installing or building anything. A half-provisioned checkout is the worst failure to debug.
- **Environment check** (in `doctor`, see below): a read-only report of whether this machine can drive the app right now: display or headless browser, required tools, a profile that exists and is signed in, the port free or owned by you, a fresh build.

If either guard stops you, report BLOCKED with the reason. Skills that cost real resources or touch real accounts should carry guards like these.

## Pick a flow: refusal rules and port derivation

Decide first which instance you are going to drive; do not guess. The target is always named or unambiguous, never inferred.

1. Detect where you are: in a git worktree, `.git` is a file; in the main checkout it is a directory.
2. **Main checkout, no selector:** drive this checkout. Launch the dev build on the default port `{{DEFAULT_PORT}}` with the shared profile (`{{DEFAULT_PROFILE_DIR}}`). This is the human's session; do not fight it.
3. **Another checkout or worktree:** name it, in one of two shapes (`worktree-isolation.md`). Either the CLI lives in that worktree and every command takes `--worktree`, or the CLI runs from the main checkout and takes `--target <checkout>`. Both derive the port from the path and isolate the profile, so parallel agents never collide with each other or with the human. With `--target`, artifacts land in the checkout that holds the CLI, and the report labels the target (a detached one by the remote branch(es) that contain its commit, because a detached HEAD has no branch name).
4. **Refuse when ambiguous.** From a worktree, a command with none of `--worktree`, `--target` or an explicit `--cdp <port>` must fail with a message that names the fix. It must NOT silently attach to the default port: that would drive (and possibly corrupt) someone else's running app and then report on the wrong build. The same holds for a `--target` that is missing, is not installed or has its derived port held: refuse and say what to do; never install for it or pick another port.

How the port is derived, which ports to reserve and how a detached target is labelled: `worktree-isolation.md`.

## `doctor`: the checks

`{{CLI_NAME}} doctor` is one read-only command that answers "is this instance worth driving?":

- which worktree or checkout you are in, and which instance is selected
- which process owns the port (is it yours, someone else's, or nothing?)
- whether the build watcher is alive and the build is fresh (newer than the last source change)
- whether the environment check passes (tool versions match the runtime pin, build artifacts are fresh, the profile exists and is signed in, a display or headless browser is available)
- whether test credentials are present, as presence only (and a masked account name at most), never the values
- for a backend that allows one session per account: which policy applies, a run lock that serializes runs or one account per parallel worker
- for a backend probe without a token: an HTTP 401 means the API is up, so label it expected in the output (for example "answers 401 (expected: unauthenticated probe)") instead of reading it as a fault

Its exit codes are under "Exit codes" below.

## `smoke`

The CLI offers a `smoke` feature: a scenario that only loads the first screen, with no login (how the agent uses it: `SKILL.md`, "Run `doctor` first"). `smoke` checks the harness and is not a user feature, so it needs no feature file and covers no ids.

## The CLI: layout and tests

A control skill is code plus markdown. Keep the code in the repo beside its other scripts, not in the skill folder, and have the skill name it:

```
{{CLI_FILE}}                 the CLI entry point (suggested: scripts/verify/cli.ts); `--help` lists every command
scripts/verify/              helpers (connect, locate instance, trace, doctor) and tests for the CLI itself (arg parsing, port derivation, refusal, doctor output)
.agents/skills/verify-app/
  SKILL.md
  references/                cli-contract.md, features/ (feature map), worktree-isolation.md, and the optional test-account.md, evidence-export.md, cloud-environment.md
```

Test the CLI like any code: the refusal rule, port derivation, doctor output, the verdict and exit-code rules and the redaction of credentials are exactly what breaks silently. An agent can write most of the CLI for you from this description; what matters is the behavior contract in this file.

## Gates and the verdict

The verdict and the exit code come only from the scenarios' assertions. Gates (build, lint, typecheck) never change them; they are reported beside the verdict, in the Build line of the evidence report. A PASS with a `regressed` gate is a PASS of the feature and a failed gate: say both, and do not call the change done. Judge lint as a delta against the base, not as a raw count, because a repo with an existing lint backlog fails raw lint for reasons that are not yours: `ok` when no changed file got a new problem, `regressed` (list file, line and rule) when one did, `not measured` when no base exists. The base is the merge-base with `origin/{{DEFAULT_BRANCH}}`. No second worktree is needed: lint every changed file as it is now and as it was at the base (`git show <base>:<path>`, with the target's own lint config), then derive the base total as the whole-repo count now, minus the changed files now, plus those files at the base.

## Exit codes

CLI exit codes (suggested): 0 every assertion passed; 1 a step or assertion failed (read the output: a crash before the first assertion is BLOCKED, not FAIL or REPRODUCED); 2 usage error; 3 refused to start for an environment reason (ambiguous target, port held by another process; use further numbers for further refusals). `doctor` exits 0 when healthy and 1 when not ready. Exit 0 and 1 are the assertion result. Mapping it to a verdict (PASS, FAIL, REPRODUCED, NOT REPRODUCED, BLOCKED) is the agent's job, by "Verdict from the assertion" in the rules for the report in `SKILL.md`.

## `report.md` is generated from `report.json`

The CLI writes `report.md` as exactly the evidence report block in `SKILL.md` ("Evidence report format"), field for field in this order (a checks table may follow), and `report.json` as the source of truth that holds every number and every assertion result. The agent pastes `report.md` as it is and adds only what it observed outside the CLI (for example a comparison with the base); never rebuild the block by hand, and never type a number the CLI already wrote. For a reader who will not open Markdown, `evidence-export.md` is an optional recipe for a PDF built from `report.json`.

## Expected console noise

Expected console noise is a named allowlist, never a silent ignore: each entry is a pattern with a reason and the scenarios it applies to (for example a known 4xx an endpoint returns on every visit). A match is listed in the report with its reason; anything else in the console or among failed requests is a finding and fails the scenario. Add an entry only after you have shown the noise is not caused by your change.

## Trace size

Traces are large (about 2 MB per scenario in this kit's example). When to take one is the agent's call: `SKILL.md`, recipe C.
