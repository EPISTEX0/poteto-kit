<!-- HOW TO USE:
1. Keep this file only if someone besides the agent has to read the evidence (a lead, a client, an auditor) in a form other than Markdown. Otherwise delete it.
2. Fill the {{PLACEHOLDERS}}. The language and the section structure come from the team, not from the kit: ask for one document they already produce and follow it.
3. SKILL.md links here from "Evidence report format". Delete this comment block when done.
-->

# Human-readable evidence export (optional)

Why: `report.md` is for agents and PR descriptions. A reader who will not open Markdown wants a document in their own language and layout. The risk is a hand-assembled copy that drifts from the run; the fix is to generate it from the data and nothing else.

## Recipe

1. **Source of truth.** The export reads `report.json` of one run directory under `{{ARTIFACTS_DIR}}` and nothing else. Every number, verdict, date and path is read from it; none is typed in the template. The export lives in the CLI (`{{CLI_NAME}} export`, or a step of a run), not in an agent's prompt.
2. **Render HTML** in the team's own language and section structure: a function from the report data to one HTML string. Put the static wording (headings, explanations of what a check means) in the template, the facts in the data. Escape every inserted string. Shorten anything that carries a secret or a signature, such as a signed URL, to host and path before it reaches the report.
3. **Print to PDF with the browser that drove the run**: load the HTML into a page of the same browser the CLI already launches, wait for fonts (`document.fonts.ready`), emulate print media, and call its PDF method with an explicit page size and margins. No extra PDF library, so there is one fewer dependency to install and one fewer engine whose output differs from what you saw.
4. **Fonts for non-Latin scripts.** Name a font family that covers the script and is installed on the machines that run this (`fc-list :lang=<code>` lists candidates), with a fallback stack. A missing font does not fail; it prints empty boxes.
5. **Verify the output, both ways.** Extract the text (`pdftotext -layout file.pdf -`) and check the script's words, diacritics and numbers survive; render a page (`pdftoppm -png -r 80 -f 1 -l 1 file.pdf page`) and look at it. Extraction alone can pass over boxes, and a rendered look alone can hide wrong text. Add a test that changes a value in a copy of `report.json` and expects the PDF text to change with it: that is what proves nothing is typed by hand.

A PDF with no number you cannot trace to `report.json` is evidence; a PDF someone retyped is a claim.
