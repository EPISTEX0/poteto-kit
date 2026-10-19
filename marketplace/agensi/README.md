# Agensi packages

Self-contained copies of two skills from `templates/skills/`, for upload to the [Agensi](https://agensi.io) skill marketplace. Unofficial, not affiliated with Lauren Tan (poteto). MIT, like the rest of this repo.

| Folder | Source template | What changed |
| --- | --- | --- |
| `investigate/` | `templates/skills/investigate/` | HOW TO USE block removed; the two placeholders replaced with fixed wording and the value 4; a scope/side-effects note and a no-subagents fallback added. |
| `create-verification/` | `templates/skills/create-verification/` and `templates/skills/verify-app/` | HOW TO USE blocks removed from `SKILL.md` and from the bundled templates; placeholders in `SKILL.md` replaced with "detect it from the repo" instructions; a Setup section installs the bundled `references/verify-app-template/` (`SKILL.md` renamed to `SKILL.template.md`, `cross-cutting-flows.md` installed as a stub), lists the files not bundled, and discloses the test-account and upload side effects; the rules lost with the comment blocks (checked selectors, four sections in order, contract changes with the CLI) moved into Steps 2 and 3; a no-subagents fallback in Step 1; GitHub URLs pointed at the bundle. |

A buyer's agent runs the uploaded `SKILL.md` as is, so each folder must work with nothing outside it: no unfilled placeholder in `SKILL.md`, no HOW TO USE block, no link to a file that is not in the folder. Placeholders remain only inside `create-verification/references/verify-app-template/`, which the skill fills in.

## Keep in sync by hand

These are copies, not generated. When a source template under `templates/skills/` changes (`investigate`, `create-verification`, or anything under `verify-app/` that is bundled), update the matching copy here by hand, keeping the changes listed above, and rebuild the zips.

## Build the zips

`SKILL.md` must sit at the zip root, so zip from inside each folder:

```sh
mkdir -p dist
(cd marketplace/agensi/investigate && zip -r ../../../dist/investigate.zip .)
(cd marketplace/agensi/create-verification && zip -r ../../../dist/create-verification.zip .)
unzip -l dist/investigate.zip dist/create-verification.zip   # check: SKILL.md at the root, exactly one
```

Run it from the repo root. `dist/` is not committed.
