<!-- HOW TO USE:
1. Copy to {{SKILLS_DIR}}/CATALOG.md (or your docs; default skills directory .agents/skills). It is the map of your skill library: what kinds of skills exist, what prefix they use, who owns them. Agents read it to find the right skill; humans read it to find gaps.
2. Keep the taxonomy (section 1) and the naming rule (section 2), fill the starter catalog (section 3) with skills you actually have, and delete empty rows. Add a row the day you add a skill; the CI check in section 4 catches drift.
3. Grow the catalog from observed failures only (skills/_skill-from-failure.md). A catalog of imagined skills is noise.
4. Delete this comment block when done. Note that CATALOG.md is a file next to the skill folders, not a skill: it has no frontmatter.
-->

# Skill catalog

A skill library grows past what anyone remembers. This file fixes the vocabulary so it stays navigable when there are dozens of skills and several owners.

## 1. Taxonomy

| Kind | What it is | Naming | Examples |
| --- | --- | --- | --- |
| **Control** | Drive one product surface for real: launch, click, read state, screenshot, trace. One per surface. Ships a CLI, a feature map and tests | `verify-app` while you have one surface (the name this kit installs); once there are several, `control-<surface>`, with an area prefix when several teams own one (`client-control-app`) | `verify-app`, or `control-web`, `control-desktop`, `control-mobile`, `control-api` |
| **Performance** | Split by job: `check` a change for regression, `explore` an unexplained regression, `bisect` to the commit, `trace` to read a trace, `hillclimb` to improve a metric iteratively | `<verb>-<surface>-perf-regression`, `<surface>-trace`, `hillclimb-<surface>` | `check-{{APP_SHORT}}-perf-regression`, `bisect-{{APP_SHORT}}-perf-regression`, `{{APP_SHORT}}-trace`, `hillclimb-{{APP_SHORT}}` |
| **Challenge** (`are-you-sure-you-need-*`) | Stop an agent that reaches for a risky API or pattern; demand evidence and alternatives | `are-you-sure-you-need-<x>` | `are-you-sure-you-need-raf`, `are-you-sure-you-need-use-effect` |
| **Best practices** | The conventions of one area, with reasons; read before working there | `<area>-best-practices` | `{{APP_SHORT}}-best-practices`, `service-best-practices` |
| **Migrations** | Repeatable large mechanical changes, with a verification step | `<from>-to-<to>-migration`, `convert-<x>-to-<y>` | `{{MIGRATION_EXAMPLE}}` |
| **QA and design** | Check the result against design intent and visual quality | `<role>-qa-pass`, `<x>-linter`, `autofix-<x>` | `designer-qa-pass`, `design-implementation-linter` |
| **Mode** (router) | A router that sets the way of working and sends situations to leaves. Explicit invocation only | `<owner>-mode` | `team-mode` |
| **Principles** | One rule of judgment per file, cited by decisions. Files inside the router skill, not skills of their own | `<router>/principles/<name>.md` | `team-mode/principles/fix-root-causes.md`, `boundary-discipline.md`, `encode-lessons-in-skills.md`, `script-the-deterministic-parts.md` |
| **Playbooks** | Step-by-step procedures a router or leaf points at. Files inside that skill, not skills of their own. This kit ships none; add one when a procedure repeats | `<skill>/playbooks/<name>.md` | `team-mode/playbooks/prototype.md`, `bake-off.md` (yours to write) |
| **Investigation** | Find the cause of something, with evidence | `investigate`, `investigate-<thing>` | `investigate`, `investigate-reported-issue` |

Rule of thumb: control skills let the agent SEE; challenge, best-practice and principle skills shape what it DECIDES; a router routes between them; evals (`evals/EVAL_PLAYBOOK.md`) tell you whether any of them works.

## 2. Naming: flat folders, prefixes for grouping

Install every skill as one folder directly under the skills directory, and put the grouping in the name as a prefix:

```
{{SKILLS_DIR}}/
  CATALOG.md
  client-control-app/        a control skill for the client application
  client-check-app-perf-regression/
  client-app-best-practices/
  infra-deploy-checks/       deployment, CI, cloud environments
  <owner>-mode/              one person's or team's router (principles/ and playbooks/ live inside it)
  <owner>-qa-pass/
  <service>-best-practices/  a service or tool that owns its own skills
  investigate/               generic skills that apply everywhere keep a plain name
```

Why flat, and not `client/`, `infra/`, `<person>/` grouping folders: the tools that read skills do not agree about nesting. Cursor walks its skills directory recursively; Codex scans for skills upward from the working directory, not downward into subfolders; Claude Code documents `<skills-dir>/<name>/SKILL.md` and no grouping folders. A flat layout is the only one all three find, so a skill is portable between tools by copying one folder. The prefix gives you the grouping that folders would have given.

Rules:

- The folder name is the skill id, and the frontmatter `name` must equal it. Use lowercase letters, digits and hyphens only, and keep it short (Claude Code caps `name` at 64 characters).
- Prefix = area (`client-`, `infra-`) or owner (`<owner>-`). Never duplicate an id; the prefix is what keeps two teams' `best-practices` apart.
- Each prefix names an owner (a person or team) who reviews changes to it. Put owners in `{{OWNERS_FILE}}` or in this catalog's Owner column.
- Personal prefixes are fine and encouraged: people fork each other's skills, then promote the good ones by renaming to the shared prefix.
- Renaming a skill is a rename of its folder and its `name` together, plus every row and link that mentions it.

## 3. Starter catalog (fill in)

| Skill | Kind | Prefix | Owner | Surface or area | Has eval? | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `verify-app` | Control | `{{PREFIX}}` | {{OWNER}} | {{APP_NAME}} | {{yes / no}} | {{draft / active}} | Template: `skills/verify-app/` |
| `create-verification` | Meta | none | {{OWNER}} | any app | {{yes / no}} | {{...}} | Generates verify-app and the feature map |
| `maintain-verification` | Meta | none | {{OWNER}} | feature map | {{yes / no}} | {{...}} | CI-checked |
| `investigate` | Investigation | none | {{OWNER}} | any bug | {{yes / no}} | {{...}} | "Stop guessing" |
| `are-you-sure-you-need-{{x}}` | Challenge | `{{PREFIX}}` | {{OWNER}} | {{risky API}} | {{yes / no}} | {{...}} | |
| `{{app}}-best-practices` | Best practices | `{{PREFIX}}` | {{OWNER}} | {{area}} | {{yes / no}} | {{...}} | |
| `check-{{app}}-perf-regression` | Performance | `{{PREFIX}}` | {{OWNER}} | {{app}} | {{yes / no}} | {{...}} | |
| `team-mode` | Mode | `{{PREFIX}}` | {{OWNER}} | whole workflow | {{yes / no}} | {{...}} | Routes to the rows above |
| `team-mode/principles/{{name}}.md` | Principles | inside the router | {{OWNER}} | judgment | {{yes / no}} | {{...}} | One row per principle file, or one row for the folder |
| {{your skill}} | {{kind}} | {{prefix}} | {{owner}} | {{area}} | {{yes / no}} | {{status}} | |

## 4. Keeping it true

- Every skill folder has a row here; every row has a folder. A short CI script that lists `SKILL.md` files, greps their folder names in this file, and checks that each `name` equals its folder is enough; add it to `{{GATE_COMMAND}}`.
- Skills that no failure or eval needs any more are candidates for deletion; mark them "deprecated" first and remove them a release later.
- A skill without an eval is a claim, not a tool: put "no" in the Has eval? column honestly and use it as the backlog.
