<!-- HOW TO USE:
1. Keep this file only if several agents (or an agent and a human) may run the app at the same time on one machine. Fill the {{PLACEHOLDERS}} with your real commands; delete anything your stack does not need.
2. The CLI behavior described here is a contract to implement and test in the skill's own CLI; the commands are examples of the shape, rename them freely.
3. Delete this comment block when done.
-->

# Parallel instances: worktree isolation

Why: the human's session, and every parallel agent, must be able to run and drive their own build at once. One shared port and one shared profile means agents fight over the same window, overwrite each other's state and report on the wrong build.

## The model

| | Main checkout | Worktree (parallel agent) |
| --- | --- | --- |
| Detect | `.git` is a directory | `.git` is a file pointing at the main repository |
| Port | default `{{DEFAULT_PORT}}` | derived from the worktree path (stable hash into the range `{{PORT_RANGE}}`) |
| Profile / user data | shared `{{DEFAULT_PROFILE_DIR}}` | isolated `{{WORKTREE_PROFILE_DIR}}` per worktree |
| Flag | none | `--worktree` on every command |
| Build watcher | optional | one per worktree |

## Refuse, do not fall back

From a worktree, a command that carries neither `--worktree` nor an explicit port must exit with an error that says what to pass. It must never quietly use the default port: the default instance is somebody else's session. The same rule applies to any ambiguous target (two instances match, port owner is a different checkout): stop and say which flag disambiguates. A fallback here turns a wrong target into a confident wrong report.

## Quick start

Typical commands (rename to match your CLI):

```
{{CLI_NAME}} worktree-setup --watch          # provision this worktree: install, build, start the watcher
{{CLI_NAME}} seed-profile                    # seed a signed-in profile into this worktree's isolated profile so the instance boots signed in
{{CLI_NAME}} --worktree restart              # (re)start the isolated instance
{{CLI_NAME}} --worktree info                 # which port, which profile, which build
{{CLI_NAME}} doctor                          # read-only health: port owner, watcher, build freshness, prerequisites
{{CLI_NAME}} cleanup --remove-worktree       # stop the instance, delete its profile, remove the worktree
```

Setup rules:

- Runtime pin: the project names the runtime version it needs ({{RUNTIME_VERSION_FILE}}). If the installed version differs, exit before provisioning anything; half-provisioned worktrees are the worst failure to debug.
- The seeded profile (signed in, onboarding done) is what makes an automated run start in the baseline state; real login is manual.
- Setup must be idempotent: running it twice leaves one working instance.

## doctor

Read-only. Reports: worktree context (main or worktree, which one), the process that owns the port (pid, command, which checkout), watcher liveness, whether the build is newer than the latest source change, and the environment check: tool versions match the runtime pin, build artifacts are fresh, the profile exists and is signed in. Exit code non-zero when the instance is not worth driving. Run it first whenever something looks off, and paste its summary into the evidence report.

## Cleanup

When the task is over: stop the instance and watcher you started, delete the isolated profile and temp files, and remove the worktree if you created it. Never touch the main checkout's instance or profile.

For agents that run in cloud VMs instead of local worktrees, see `cloud-environment.md`.
