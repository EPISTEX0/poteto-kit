<!-- HOW TO USE:
1. Install time only. Find the row for your app type and fill its placeholders from the repo. Then fill the Launch section of SKILL.md from it: the launch command goes into {{DEV_COMMAND}}, the "Reached at" cell into the "Reached at" line (keep {{APP_URL}}, or replace it with the CDP port or the simulator; write `none` and delete the line if the app has no address, as with a CLI), and the last cell into {{LAUNCH_DRIVER}}. If the app has more than one type, copy each row.
2. SKILL.md does not link here. Read this file from the kit, or copy it beside SKILL.md while you fill Launch and delete it afterwards: it keeps `{{` placeholders on purpose, and a leftover copy would fail the search for unfilled placeholders.
3. Delete this comment block when done.
-->

# Launch commands and drivers by app type

Start the app in the mode users reach it, not a mocked harness.

| App type | Launch command | Reached at | How you drive it and what to record |
| --- | --- | --- | --- |
| Web | `{{DEV_COMMAND}}` | serves at `{{APP_URL}}` | Playwright, or Chrome DevTools Protocol (CDP) on `{{CDP_PORT}}` |
| Electron | `{{DEV_COMMAND}}` with `--remote-debugging-port={{CDP_PORT}}` | CDP on `{{CDP_PORT}}` | Attach over CDP (Playwright `connectOverCDP` or raw CDP); drive the renderer, and check main-process logs separately |
| iOS | `{{DEV_COMMAND}}` (build and boot simulator `{{SIMULATOR_NAME}}`) | simulator `{{SIMULATOR_NAME}}` | `xcrun simctl` for install/launch/screenshot, plus UI automation (XCUITest, `idb`, or your simulator MCP tool) |
| Android | `{{DEV_COMMAND}}` (build, boot emulator `{{SIMULATOR_NAME}}`, `adb install`, launch the activity) | emulator `{{SIMULATOR_NAME}}` | `adb` for install, launch, `screencap` and `logcat`; UI automation through UIAutomator or Maestro flows |
| Flutter / React Native | `{{DEV_COMMAND}}` (for example `flutter run -d {{SIMULATOR_NAME}}`, or the React Native run command plus its Metro dev server) | device `{{SIMULATOR_NAME}}` | The framework's own driver where it exists (Flutter `integration_test`, Detox), else the platform automation above (Maestro, UIAutomator, XCUITest); read the framework's dev-server log for errors |
| Backend HTTP API | `{{DEV_COMMAND}}` | serves at `{{APP_URL}}` | Real requests with `curl` or an HTTP client against seeded data; record method, URL, request body, status and response body; capture the server log for the same time window |
| CLI | `{{DEV_COMMAND}}` | `none` (no address; the process prints ready) | Execute the binary with real arguments and stdin; capture stdout, stderr, exit code |

The rules that hold for every row (readiness signal, recording the command, commit and dirty state, leaving nothing running) are in the Launch section of `SKILL.md`.
