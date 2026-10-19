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
