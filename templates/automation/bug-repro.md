<!-- HOW TO USE:
1. Use this when you have a control skill (verify-app) with a feature map that works locally, and incoming bug reports pile up faster than people can try them. The automation answers one question per report: does this reproduce on main, with evidence? It does not diagnose or fix.
2. Prerequisites: verify-app runs from a cold start, its feature map exists (references/features/), and the VM or runner can run it (see references/cloud-environment.md in verify-app). Do not start this before you trust single-agent verification; see docs/08-scaling-to-cloud-agents.md.
3. Fill the {{PLACEHOLDERS}}. Wire the trigger with whatever event or schedule feature your agent platform has (issue webhook, label automation, scheduled poll, chat integration). Paste the prompt in section 3 as the automation's instructions.
4. Give it the narrowest permissions that work: read the repo, run the app, read other open reports, comment on the report. No push, no merge, no label other than the ones named below.
5. Delete this comment block when done.
-->

# Automation: reproduce every incoming bug report

Why: a bug report that sits unreproduced costs a human the first ten minutes of every triage, and most of those minutes are mechanical (find the feature, get to the screen, try the steps). With a feature map and a control skill an agent can do that part, with evidence, before a person looks.

## 1. Trigger

- **Event:** a new bug report is created in {{ISSUE_TRACKER}} (an issue opened, or an issue labelled `{{BUG_LABEL}}`, or a message in {{BUG_CHANNEL}}). One run per report.
- **Also on:** a new comment from the reporter on a report currently marked NEEDS INFO.
- **Do not run on:** reports labelled `{{SECURITY_LABEL}}` or that look like a security or privacy issue (credentials, personal data, an exploit). Route those to {{TRIAGE_OWNER}} privately; artifacts could leak the sensitive data.
- **Dedupe:** if the same report already has a verdict comment for the same commit, do nothing. A new run is justified only by a new commit on main or new information from the reporter.
- **Group related reports:** identical reports are deduped above, but related ones (the same feature, or symptoms that look alike, for example 30 reports that the app is slow) are not the same report. Do not hand each to its own fixing agent. List them under "Related" in your comment so that one coordinator can take the whole group. Slightly different reports read together often show that the cause sits higher up than any single report suggests.
- **Budget:** stop after {{MAX_RUN_MINUTES}} minutes of wall time and post what you have.

## 2. Environment

- A clean checkout of the default branch at its current commit, built from scratch with the pinned runtime. Record the commit.
- The control skill ({{CONTROL_SKILL}}, normally `verify-app`) with its feature map in `{{FEATURE_MAP_DIR}}`, running in the cloud environment described in its `references/cloud-environment.md`.
- Read-only to everything except the report's comment thread and the evidence store ({{ARTIFACT_STORE}}).

## 3. The prompt (paste as the automation's instructions)

```text
You triage one bug report: {{REPORT_LINK_OR_TEXT}}.
Goal: say, with evidence, whether it reproduces on the current main. You do not diagnose and you do not fix.

1. Read the report and any attachments. Write down every piece of visible text, the screen region, the
   version or build the reporter names, and the steps they give.
2. Map it to a feature with {{FEATURE_MAP_DIR}}/README.md ("Mapping a vague report to a feature"). Name the
   feature file and sub-feature you chose and why. If nothing matches, or the report gives no steps and
   no screen, go to NEEDS INFO.
3. Use the {{CONTROL_SKILL}} skill. Run `doctor`, launch the app from main, follow the feature file's
   "How to get to it" for the sub-feature, and perform the reported action. Capture a screenshot before and
   after, console output, and failed network requests. Follow every entry point of that sub-feature that the
   report could be about, not only the first one.
4. If the report depends on data, settings, account state or an installed dependency that your clean setup
   does not have, build a synthetic equivalent and repeat the steps with it. Never use the reporter's real
   data or credentials. If the symptom appears with data or settings the app supports, the verdict is
   REPRODUCED, and you list that input under Steps run as a precondition. Only when the symptom appears solely
   with an input the app does not support (a required dependency that is missing, a configuration it does
   not support, data corrupted outside the app) is the verdict SETUP OR DATA.
5. If it does not reproduce on main and the report names an older version or commit, check out that build
   and repeat the same steps. Reproducing there and not on main means FIXED ON MAIN; if you can cheaply find
   the first commit on main that no longer shows it, name it, otherwise leave it out.
6. Search the tracker for other open reports that map to the same feature or describe a similar symptom
   (read-only). List their links, one line each, under Related. Do not merge, close or comment on them.
7. Choose exactly one verdict from the list in section 4, post the comment in the exact format of section 5,
   and apply the label that matches. Stop.

Rules: facts only under Observed. Quote the steps you actually ran, from app start. Do not guess a root
cause, do not propose a fix, do not open a PR. If you cannot run the app, do not post a verdict: follow
the escalation rule. Leave nothing running; delete temporary files.
```

## 4. Verdicts

| Verdict | Means | Requires |
| --- | --- | --- |
| **REPRODUCED** | The reported symptom appears on main when the reported steps are followed. | Steps, the screenshot or log that shows the symptom, commit |
| **NOT REPRODUCED** | The steps were followed exactly and the symptom is absent on main, and no older build was named or the older build does not show it either. | Exact steps, evidence of the end state, commit, the build(s) tried |
| **FIXED ON MAIN** | The symptom reproduces on the reported older version or commit and is absent on main. | Evidence from both builds, both commits, the fixing commit if found |
| **SETUP OR DATA** | The symptom is absent on a clean main and appears only with an input the app does not support: a required dependency that is missing, an unsupported configuration, or data corrupted outside the app. If it reproduces with data or settings the app supports, it is REPRODUCED, not this. | The unsupported input named, shown with a synthetic equivalent (never the reporter's real data or credentials), or an error that names the missing piece. Without that evidence, use NOT REPRODUCED |
| **NEEDS INFO** | The report cannot be mapped to a feature or cannot be followed. | Up to three concrete questions, and what you already tried |

BLOCKED (the app could not be run) is not a verdict about the bug. It is an escalation (section 6).

## 5. Output format (one comment per report)

```text
## Bug repro: <REPRODUCED | NOT REPRODUCED | FIXED ON MAIN | SETUP OR DATA | NEEDS INFO>
- Report: <link>. Mapped to: <feature-id> / <sub-feature-id> because <visible text or screen region matched>
- Build: main at <sha>, <clean|dirty>, launched with `<exact command>`. Reported version: <version, sha, or "not stated">
- Steps run: 1. ... 2. ... (what you actually did, from app start)
- Expected: <what the report says should happen>
- Observed: <what happened, facts only>
- Evidence: <link> (screenshot before), <link> (screenshot after), <link> (console log), <link> (failed requests)
- Related: <links to other open reports for the same feature or a similar symptom, or "none found">
- Other build (FIXED ON MAIN only): <sha or version>, same steps, <observed>, <links>
- Not covered: <entry points or variants not tried, each with the reason; repeat any `skip: <reason>` from the feature file>
- Questions (NEEDS INFO only): 1. ... 2. ...
- Next: <REPRODUCED: ready for the `investigate` skill with these artifacts, together with every report under Related, not this one alone | NOT REPRODUCED: suggest closing after {{NEEDS_INFO_DAYS}} days without new information | FIXED ON MAIN: suggest closing, link the fixing commit | SETUP OR DATA: tell the reporter what differs and how to check it | NEEDS INFO: waiting on the reporter>
```

Labels: `repro:reproduced`, `repro:not-reproduced`, `repro:fixed-on-main`, `repro:setup-or-data`, `repro:needs-info` (create these once). Never close the report yourself.

## 6. Escalation rule

Post to {{ESCALATION_CHANNEL}} and mention {{TRIAGE_OWNER}} when any of these holds, with the report link, what you tried, and the evidence you have:

- The app could not be run (build fails, environment missing, no profile). Say BLOCKED, with the exact error. Do not post a verdict on the report.
- Verdict REPRODUCED and the report involves data loss, a crash on start, a security or privacy exposure, or a regression in a released version.
- Two runs of the same steps disagree (reproduced once, not the other). Report the ratio and do not choose.
- NEEDS INFO has had no reply for {{NEEDS_INFO_DAYS}} days.
- {{ESCALATION_EXTRA}}

Everything else is handled by the comment alone; do not interrupt a person for a routine verdict.

## 7. Keep it honest

- Sample the verdicts: a person re-checks {{SAMPLE_RULE}} of the NOT REPRODUCED, FIXED ON MAIN and SETUP OR DATA verdicts each week. A wrong NOT REPRODUCED or SETUP OR DATA sends a real bug away, which is the expensive error.
- A wrong verdict is a failure to learn from: write it down and fix the feature file, the control skill or this prompt (see `skills/_skill-from-failure.md`).
- Count per week: reports, verdict mix, share escalated, share a human overturned. Those four numbers say whether to widen or narrow the automation.
