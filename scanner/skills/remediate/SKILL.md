---
name: remediate
description: >
  Apply fixes for scanner findings and re-scan to prove the quality score
  actually moved — not just list what's wrong. Use on "fix these findings",
  "fix the scan results", "improve the quality score", "auto-fix", "remediate
  the report". Not for findings that need a judgment call (medium/low
  confidence, or security) — those get a plan, not an edit, and not for a repo
  with no scanner.
license: MIT
---

# Remediate

`add-analyzer` finds problems, `build-report` presents them, `risk-radar`
ranks them. None of the three touch code. This is the one that does — and
proves it with a second real scan, not a claim.

## Only two outcomes per finding, decided by data already in the finding

Every finding already carries a `confidence` field (`references/recipes.md` in
`add-analyzer`: regex/heuristic results are never `confidence: high`). Reuse
it instead of inventing a new gate:

- **`confidence: high` and not `security`** → apply the fix directly. These
  are pattern-certain and mechanical: a hand-rolled loop the stdlib already
  does, a dangerous call with a named safe replacement, a duplicate block.
- **Everything else** (`medium`/`low` confidence, or any `security` finding
  regardless of confidence) → write the fix as a plan, same paste-ready-prompt
  shape `build-report --fixes` already produces, and stop. A security finding
  is never auto-edited: a hardcoded secret isn't fixed by rewriting the line,
  it's fixed by rotating the credential and moving it to a secret store — both
  human/infra actions this skill cannot take.

Never fix what you can't re-verify. If the finding's own rule can't confirm
the fix worked (docs coverage, some duplication cases), say so and route it to
the plan instead of guessing that it's fixed.

## Order

1. Scanner findings must be from a real, current scan — run one if the report
   is missing or stale. Never remediate against sample or cached data (the
   same non-negotiable `build-report` states for its inputs).
2. Partition findings into apply / plan, per the rule above.
3. Apply the high-confidence, non-security fixes **one finding at a time** —
   never a sweeping multi-finding edit (`guardrails` rule 5). Each fix that
   touches non-trivial logic leaves the one runnable check `lean` already
   requires; don't restate that rule, just do it.
4. Re-scan. The before/after score in the output is two real numbers from two
   real scans — never an estimate of what the score "should" be.
5. Report: `<N> fixed, <M> planned (need a decision), score <before> → <after>`.
   List the planned ones with the same paste-ready format `build-report`
   uses, so nothing found is silently dropped.

## What this does not do

Doesn't touch a finding scored by a language the analyzer returned `null` for
— nothing to fix when nothing was measured. Doesn't re-baseline: a
`"baselined": true` finding stays untouched and out of both buckets, same as
the gate ignores it. Doesn't invent a fix for a finding whose message doesn't
name a concrete change — if the finding can't be acted on without more
context, it goes to the plan, not the apply list, regardless of its
confidence field.

## Boundaries

Every fix this skill writes still goes through the plugin's own
`policy-check.js` and `report-check.js` hooks like any other edit — an
"auto-fix" that would introduce an unpinned dependency or a leading-underscore
name gets blocked the same as if a person typed it. This skill decides *which*
findings to touch; it does not get an exemption from the rules that already
govern the edit.
