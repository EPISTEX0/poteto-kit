# Running several copies at once

Parallel agents often work in separate copies or git worktrees of this project. Each copy must be able to build and serve without colliding with the others, and without silently connecting to someone else's server.

## What the verify command does
- It derives the preview port from a hash of the absolute project path (range 20000-31999). The same path always gets the same port; two copies get different ports with high probability.
- If that port is held by another process, it refuses with exit code 3 and names the pid and command. It never falls back to a different port on its own, because a silently different server could be another copy's stale build.
- Pass `--port <n>` to choose a port explicitly. An explicit port is used as given, but it is probed first: if another process holds it, verify refuses with exit 3 and names the holder, and it only drives a server whose `/.verify-build.json` nonce matches the build it just made.
- This example derives a port per project path for every copy, whereas the template's default/`--worktree` model is the alternative for apps with a fixed dev port.
- Artifacts go to `artifacts/` inside the copy, so copies do not overwrite each other. `VERIFY_ARTIFACTS_DIR` overrides it.

## Doctor
Run `npm run verify -- doctor` first whenever a run behaves oddly. It is read-only and reports: the project path, the node version against `engines`, whether the directory is a main git checkout, a linked worktree or neither, which browser binary will be used, whether `dist/` is fresh relative to `src/` and whether it was built with `INJECT_BUG`, and whether the derived port is free or who holds it. Exit code 1 means a blocking problem; a stale `dist/` is only a warning because verify rebuilds it.
