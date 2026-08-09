---
name: add-analyzer
description: >
  Add or change one analysis feature in a code-quality scanner — complexity,
  smells, secret detection, duplication, doc coverage, dependency cycles,
  hotspots, or a new metric. Use when the ask is to add a check, detector, rule,
  or metric to a scanner or lint pipeline ("flag long functions", "add
  complexity checking"). Not for ordinary application features.
license: MIT
---

# Add an Analyzer

One feature = one file. Never modify core traversal to add a check — if the
feature needs a pipeline change, that is a separate conversation.

## The six steps, in order

1. **Design first, no code.** State in a few lines: what it detects, the
   thresholds, and the JSON keys it adds under `analysis.<feature>`. Wait for
   a "go". This gate is the point of the skill; skipping it is how the wrong
   metric gets built twice.
2. **Record the decision** where the project logs them (`DECISIONS.md` if it
   has one): date, decision, alternatives considered, reason. No log file in
   the repo → put it in the commit body instead, don't create one uninvited.
3. **Build it as a plug-in.** One module exposing `analyze(file_info) -> dict`,
   registered in the analyzer list. Every finding uses the shared shape:
   `path`, `line`, `rule`, `severity`, `message`, `confidence`. Regex and
   heuristic results are never `confidence: high`.
4. **Two safety rules.** Language not supported → return `null`, never a
   guessed number. Secret values → masked everywhere, always (first/last 3
   chars). An analyzer that cannot measure renormalizes its weight away; it
   does not emit a phantom zero.
5. **Add a fixture that trips it** in the project's fixture corpus.
6. **Prove it, then commit.** Run the scanner on the fixtures, paste the real
   finding, verify one line number by hand. Commit only this feature:
   `feat(analyzers): <what it does>`.

## Honor suppressions

A line ending in `# scanner: ignore[rule]` is skipped and counted in
`summary.suppressed`. Silent suppression is a lie — the count is the receipt.

## Extending an existing analyzer

Additive only: keep existing keys and their meaning, add new ones alongside,
bump `schema_version`. Renaming a key silently breaks every renderer and CI
gate parsing that contract.

## Details

Agreed thresholds and per-analyzer recipes (so they are never re-debated):
`references/recipes.md`. Read it when implementing, not before designing.

## No scanner in this repo

Then this skill does not apply — you are being asked for a lint rule or a
one-off check. Use the host tool's own extension point (a `ruff`/`eslint` rule,
a pre-commit hook) and stop. Do not build a scanner to answer the question.
