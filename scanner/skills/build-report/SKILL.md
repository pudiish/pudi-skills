---
name: build-report
description: >
  Generate or update the human-readable outputs of a code-quality scan — HTML
  dashboard, Markdown summary, quality badge, or a FIXES.md of agent-ready fix
  prompts. Use when the ask is to make scan or analysis results presentable
  ("build the dashboard", "make the results readable", "add a badge"), even if
  no format is named. Not for application UI work.
license: MIT
---

# Build the Report

## Three constraints, never negotiable

1. **One self-contained HTML file.** Inline CSS, JS, SVG, fonts. Zero network
   requests — it has to open offline and survive being attached to a PR or an
   email.
2. **Generated from a real scan.** Never sample data, never a hand-written
   number. If the scan has not been run, run it.
3. **Secrets stay masked** in every output, always.

The bundled hook blocks 1 and 3 mechanically on write — see the plugin's
`scripts/report-check.js`.

## Section order (HTML and Markdown share it)

1. Quality score headline — the 0-100 number, the letter grade, and the
   weighting that produced it. No black-box grades.
2. Trend vs. last scan — grade delta, what improved, what regressed.
3. Summary cards — files, lines of code, languages.
4. Hotspot chart — churn x complexity, the "refactor these first" list.
5. Worst-10 files table.
6. Findings by severity (error → warning → info), collapsible.

## Extra outputs, one flag each

- `--badge` → `quality-badge.svg`, grade-colored, a capped grade says "(capped)"
  in words.
- `--fixes` → `FIXES.md`, the top findings rewritten as paste-ready agent
  prompts, hotspot-ordered.
- `--format md` → GitHub-flavored Markdown sized for a PR comment.

## Voice

Plain declarative sentences. No exclamation marks, no "simply/easily/just", no
adjective where a number exists — "scans a 40k-LOC repo in 1.8s" beats "fast".
Limitations stated plainly and unprompted. Empty states are sentences: "No
findings at error severity", never a blank div.

## Workflow

State the section list you will generate, build it, run it on this repo, then
give the user the output path to open. Real output or it did not happen.

## Details

Dashboard design language — layout, palette, chart specs, the findings
explorer, print and reduced-motion rules: `references/dashboard-design.md`.
Read it before writing HTML, skip it for Markdown or badge work.
