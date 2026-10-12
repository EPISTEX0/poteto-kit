# 09 - Other stacks: the same mechanisms, different tools

## The idea

The [example](../example/README.md) is a TypeScript web app, but nothing in the kit depends on TypeScript. Every mechanism is a *role* that a tool fills: a **verify driver** that runs the real product, an **import-boundary check**, a **banned-API check**, a **comment policy**, and **discovery from reserved files**. Pick the tool that fills each role in your stack, keep the role's contract (below), and the docs and templates apply unchanged.

## Why it works

- The value of each mechanism is its contract, not its tool. A verify driver must run the real thing and leave evidence. A boundary check must fail CI with a message that names the supported path. Any tool that meets the contract works, and an agent can write the glue code for you (see [02](02-verification.md)).
- Mapping roles to tools makes the gap visible. If your stack has no tool for a role, that is a layer-1 or layer-2 hole from [06](06-guardrail-layers.md), and a tiny script (a CI grep, a short test) usually closes it.
- The tools below are well-established; check the current docs for configuration syntax before you copy anything. This is a starting map, not a complete one.

### Verify driver: run the real product and capture evidence

Contract: start the real product, drive it the way a user (or caller) does, and save evidence (screenshot or response, logs, a trace where one exists) that a reviewer can check later.

| Stack | Driver | Evidence |
|---|---|---|
| Web | Playwright, or raw Chrome DevTools Protocol | screenshot, console log, trace |
| Electron | Playwright's Electron support, or CDP through `--remote-debugging-port` | screenshot, console log, trace |
| iOS | `xcrun simctl` to boot the simulator, install, launch and capture; XCUITest to drive the UI | simulator screenshot or recording, test results |
| Android | `adb` to install, launch, capture and read `logcat`; UI Automator or Maestro to drive the UI | screenshot, `logcat`, flow results |
| Flutter | the `integration_test` package | test results, screenshots from the test |
| React Native | Detox | test results, screenshots |
| Backend API | `curl` or an HTTP client against a running instance, plus the service logs | request, response, status, log lines |
| CLI | execute the binary | command, stdout, stderr, exit code |

Whatever the driver, keep the rest of the kit's shape: a `doctor` command, refuse instead of falling back, worktree isolation (one port or emulator per worktree), and a feature map that tells the agent how to reach each feature ([02](02-verification.md), [03](03-feature-map.md)). A self-test that plants a bug and proves verify catches it ([example/README.md](../example/README.md)) works with any driver.

### Import-boundary check: forbidden dependencies fail mechanically

| Stack | Tool |
|---|---|
| TypeScript / JavaScript | dependency-cruiser, or eslint-plugin-boundaries |
| Python | import-linter |
| Go | depguard (a golangci-lint linter), go-arch-lint |
| Java / Kotlin | ArchUnit |
| .NET | NetArchTest |
| Rust | split the code into workspace crates and use cargo-deny to ban crates; use module visibility (`pub(crate)`) for the rest |

### Banned APIs: block the pattern you were bitten by

| Stack | Tool |
|---|---|
| TypeScript / JavaScript | ESLint `no-restricted-imports`, `no-restricted-syntax`, `no-restricted-properties`, `no-restricted-globals` |
| Python | ruff's `banned-api` setting (`flake8-tidy-imports`) |
| Go | forbidigo (a golangci-lint linter) |
| Java / Kotlin | ArchUnit, or custom Error Prone checks |
| .NET | BannedApiAnalyzers |
| Rust | clippy's `disallowed_methods`, `disallowed_types` and `disallowed_macros` |

Put the supported alternative in the rule's message. Most of these tools let you set a custom message per ban.

### Comment policy: keep stale comments out

Few linters ban comments outright. Where a tool covers part of the policy, use it; otherwise write a tiny CI check.

- **TypeScript / JavaScript:** ESLint's core `no-inline-comments` and `no-warning-comments`, or a small custom rule like the example's `local/no-comments` (`example/eslint-rules/no-comments.js`).
- **Python:** ruff's `ERA001` flags commented-out code.
- **Go:** golangci-lint's `godox` flags TODO and FIXME markers.
- **Java:** Checkstyle's `TodoComment` and `TrailingComment` checks.
- **Anywhere else, or for a total ban:** a CI grep over source files that fails with a message naming the alternative (put the knowledge in the code, the commit message or the PR). Exempt the comments your tools need, such as license headers and directives (`//go:build`, `# noqa`, `// eslint-disable`).

Decide the policy first (no comments at all, or no commented-out code and no history notes) and write the policy into the error message.

### Discovery from reserved files instead of registries

Contract: adding a feature adds files and edits no shared list ([07](07-agent-first-architecture.md)). Use the discovery your framework already has.

| Stack | Mechanism |
|---|---|
| Next.js | file-based routing: `page.tsx`, `layout.tsx` and `route.ts` files under `app/` |
| SvelteKit | file-based routing: `+page.svelte` files under `src/routes/` |
| Nuxt | file-based routing: `.vue` files under `pages/` |
| Vite (any framework) | `import.meta.glob` over a reserved filename, as in `example/src/framework/discover.ts` |
| Python | packaging entry points, read with `importlib.metadata.entry_points`; Django discovers management commands from `management/commands/` |
| Java | `java.util.ServiceLoader` with `META-INF/services` files; Spring component scanning |
| .NET | ASP.NET Core discovers controllers by convention |
| Rust | a `build.rs` script that generates the module list from reserved files, or the `inventory` crate |
| Go | `go generate` to build the list from reserved files; fail CI if the generated file is stale |

Where the framework has no discovery, generate the list from the reserved files and fail CI when the generated file is out of date. The list is then an output, never something to edit.

## How to apply

1. For each role above, find your stack's row. Write the choice into [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md) next to the rule it enforces.
2. Start with the verify driver. Fill in `verify-app` ([templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)) around it, or let [create-verification](../templates/skills/create-verification/SKILL.md) generate the skill and feature map.
3. Add the import-boundary check for the boundary where regressions hurt most, then banned APIs drawn from your own review comments ([templates/guardrails/review-comment-to-rule.md](../templates/guardrails/review-comment-to-rule.md)).
4. Decide the comment policy, and encode it in a linter rule or a CI grep.
5. Switch to reserved-file discovery for the next feature you add. Delete the registry once nothing reads it.
6. For every rule, write a fixture that violates it and a test that proves the gate goes red, as the example does with `guardrail-fixtures/` ([example/README.md](../example/README.md)).
7. Wire every check into your gate command and CI ([templates/ci/ci.yml](../templates/ci/ci.yml)).

## Anti-patterns

- Copying the example's TypeScript tooling into a different language instead of finding the equivalent in that language.
- Choosing the tool before the invariant: first write down what must never happen, then pick the tool.
- A verify driver that mocks the boundary under test (the HTTP layer, the database, the device), so the evidence says nothing about the real path.
- A boundary or banned-API rule with no failing fixture, so nobody knows whether it still fires.
- A comment check with no exemptions for license headers and tool directives, which people then disable.
- Keeping a registry "just for now" next to the reserved-file discovery.

## Related

- [02 - Verification](02-verification.md)
- [06 - Guardrail layers](06-guardrail-layers.md)
- [07 - Agent-friendly architecture](07-agent-first-architecture.md)
- [templates/guardrails/enforcement-layers.md](../templates/guardrails/enforcement-layers.md)
- [templates/guardrails/architecture-contract.md](../templates/guardrails/architecture-contract.md)
- [templates/skills/verify-app/SKILL.md](../templates/skills/verify-app/SKILL.md)
- [example/README.md](../example/README.md)

Back to [README](../README.md)
