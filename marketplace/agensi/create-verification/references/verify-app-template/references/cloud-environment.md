<!-- HOW TO USE:
1. Keep this file only if agents run the control skill in cloud agent VMs or CI-like sandboxes. Fill the {{PLACEHOLDERS}} with your real commands and locations; delete the sections your app type does not need.
2. It is a contract for the VM image and the CLI, not a script: build the pieces it names (a seed command, an artifact upload step) once, test them, then let agents rely on them.
3. SKILL.md links here from "Where it runs". Do not copy cloud rules into SKILL.md.
4. Delete this comment block when done.
-->

# Running the control skill in a cloud agent VM

Why: a cloud agent has no human at a screen, so it needs the same evidence loop as a local one (run the real app, drive it, capture artifacts) without the human's display, profile and shell. This works where the four things below can be provided. Where one cannot, say so (BLOCKED or `skip: <reason>`); never substitute reasoning or unit tests and call it verified.

## What the VM must provide

| Need | Satisfied by | If missing |
| --- | --- | --- |
| A way to render the UI | A headless browser (web, Electron renderer over CDP) or a virtual display such as `xvfb-run -a <command>` (apps that insist on a window) | BLOCKED: no display |
| The exact runtime and tools | The runtime pin (`{{RUNTIME_VERSION_FILE}}`) honoured by the image; tools listed in the skill's Prerequisites installed in the image, not at run time | BLOCKED: name the tool |
| A profile in the baseline state (signed in, onboarding done) | Seeding (below) | `skip: <reason>` for paths that need it |
| A place to put artifacts where a reviewer can open them | Upload (below) | The run is unproven for the reviewer; say where files are |

Mobile: an iOS simulator needs macOS, so a Linux VM cannot run it; an Android emulator needs hardware virtualization (KVM) on the VM, which many cloud sandboxes lack. Check with the environment check in `doctor`; if it fails, mark mobile paths manual rather than trying a slow software emulator.

## Display

- **Web, and Electron renderer:** launch a headless browser. Playwright's headless Chromium needs no display. If the sandbox forbids the browser's own sandbox (some containers), pass the flag only in the VM and never in a developer profile.
- **Electron or any app that needs a real window:** run the dev command under a virtual display (`xvfb-run -a {{DEV_COMMAND}}`) with the CDP port open, and drive it over CDP exactly as locally.
- Set a fixed viewport or screen size (for example 1440x900) and write it in the report's Environment line, so screenshots are comparable between runs.

## Profile and authentication seeding

- Use a dedicated test account ({{TEST_ACCOUNT}}) with the narrowest permissions the baseline needs. Never a person's real account.
- Seed the signed-in profile with `{{PROFILE_SEED_COMMAND}}` (restore a prepared profile or session state from your secret store into the isolated profile directory), then start the app. Seeding must be idempotent and must refuse to write into `{{DEFAULT_PROFILE_DIR}}` of someone else's session.
- Credentials come from the platform's secret store as environment variables or mounted files. Never write them into the repo, the report, the console log or an uploaded artifact.
- Real OAuth, SSO, MFA and CAPTCHA are manual. Seed past them; do not try to automate them.

## Ports

- Bind the app and its debug port to `127.0.0.1` only; never expose CDP publicly (it is full control of the browser).
- A VM normally has one agent, so the default port `{{DEFAULT_PORT}}` is fine. If several worktrees or agents share the VM, use `--worktree` and the derived port range `{{PORT_RANGE}}` (see `worktree-isolation.md`); the refusal rule applies unchanged.
- Wait for the readiness signal, then run `{{CLI_NAME}} doctor` and keep its summary for the report.

## Artifacts

- Write everything under `{{ARTIFACTS_DIR}}/<timestamp>/` as locally.
- Upload that directory to `{{ARTIFACT_STORE}}` on success **and** failure (a failed run's artifacts are the most useful). Put the links, not just local paths, in the Artifacts line of the evidence report.
- Redact secrets and personal data from console and network logs before upload. Large files (traces, heap snapshots): upload them and link; do not paste them.
- Record the build: commit, clean or dirty, the exact launch command, and the VM image or version.

## What to mark manual

Mark these `skip: <reason>` in the feature file (see "Proof and skip reporting" in `features/README.md`) and repeat the skip in the evidence report, with the closest real path you covered:

- Native OS dialogs, native menus, file drops, system notifications, external browser hand-offs.
- Real OAuth, SSO, MFA, payment flows.
- Hardware: camera, microphone, GPS, Bluetooth, biometric.
- Paths gated on an entitlement, device or OS the VM does not have. Also: {{CLOUD_MANUAL_PATHS}}.
- Absolute performance numbers. A shared VM is noisy; compare before and after on the same VM in the same run, and say the numbers are relative.

## Cleanup

Stop what you started (app, dev server, browser, virtual display, emulator), delete the seeded profile copy and temp files, and leave no credentials on disk.

## Failure policy

If the VM cannot meet the table above, the verdict is BLOCKED with the exact missing capability, what you tried, and what the image needs. A cloud run that quietly fell back to unit tests is a false report.
