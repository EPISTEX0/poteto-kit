# Agensi packages

Self-contained copies of two skills from `templates/skills/`, for upload to the [Agensi](https://agensi.io) skill marketplace. Unofficial, not affiliated with Lauren Tan (poteto). MIT, like the rest of this repo.

| Folder | Source template | What changed |
| --- | --- | --- |
| `investigate/` | `templates/skills/investigate/` | HOW TO USE block removed; the two placeholders replaced with fixed wording and the value 4. |
| `create-verification/` | `templates/skills/create-verification/` | HOW TO USE block removed; placeholders replaced with "detect it from the repo" instructions; a Setup section copies the bundled `references/verify-app-template/` (the `verify-app` templates, `SKILL.md` renamed to `SKILL.template.md`) into the repo. |

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
