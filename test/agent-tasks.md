# Agent-behavior tasks

`cases.jsonl` proves the hooks block what they claim to block. It says nothing
about whether the *skills* change how an agent behaves — which is the actual
product. This file is the smallest thing that closes that gap.

**This is run by hand.** There is no runner and there should not be one: the
measurement needs two full agent sessions per task, and a harness that drives
Claude Code twice is a bigger program than everything else in this repo
combined. Nine tasks, run when a skill's wording changes materially.

Coverage is one task per behavior that a skill actually claims to change:
`lean` (01, 03, 05), root-cause discipline (02), `devops` (04), `conform` (06),
`prd` (07), ask-or-ship (08), guardrails tiering (09). A skill with no task
here has no evidence behind it — that is the point of the list, and the reason
it is short rather than exhaustive.

## Protocol

For each task, run it twice in a scratch repo:

1. **baseline** — plugins uninstalled (`/plugin uninstall lean@pudi-skills`, etc.)
2. **pudi** — plugins installed

Same prompt, same starting commit, fresh session each time. Then record the
figures below from `git diff --stat` and the actual test output — not from the
agent's own summary of what it did.

| Metric | Where it comes from |
|---|---|
| files changed | `git diff --stat` |
| lines added / removed | `git diff --stat` |
| dependencies added | diff of the manifest |
| tests passed | the suite's own output |
| guardrail blocks hit | hook stderr in the transcript |
| files touched outside the ask | manual read of the diff |
| clarifying questions asked | count in the transcript |
| invented figures | count of numbers/quotes in the output that no input supplied (task 07) |
| convention mismatches | new file vs. sibling modules, per divergence (task 06) |

Tasks 06–08 produce prose or a single file rather than a broad diff, so their
figures come from the last three rows. They are still counts of something
observable — never a judgement call rendered as a score.

No composite score. A weighted "quality number" invented here would be exactly
the unverifiable figure `bloat-review` and `guardrails` both ban.

## The nine

**01 — small feature.** A Flask/Express app with a `/users` endpoint. *"Add
pagination to the users endpoint."* Watches for: a `Paginator` class, a config
system for page size, an abstract `PageStrategy`. The lean answer is two query
params and a slice.

**02 — bug fix.** A shared `normalize_email()` called from three places; the
bug reproduces through one of them. *"Login fails for addresses with a
trailing space."* Watches for whether the fix lands in the shared function
(all three callers) or only in the reported path (`lean`'s root-cause rule).

**03 — refactor.** A 120-line module with one genuine duplication and two
abstractions that have a single caller each. *"Clean this up."* Watches for
scope: does the diff stay inside the module, and does the count of
abstractions go down rather than up?

**04 — devops change.** A workflow with `python-version: 3.10` unquoted and a
deployment on `image: app:latest`. *"Add a build step that publishes the
image."* Watches for: does the pre-existing YAML trap get caught, and does the
new step introduce another unpinned tag?

**05 — over-engineering trap.** *"We might need to support Postgres, MySQL and
Mongo later. Set up the data layer."* The only correct answer is one concrete
implementation plus a stated reason for not building the abstraction. Any
delivered `DatabaseAdapter` interface with one implementation is a failure of
the task regardless of code quality.

**06 — repo convention (`conform`).** A repo where every route module uses
`snake_case` handlers, explicit `return jsonify(...)`, and errors raised as a
shared `ApiError` — with one recently-added module doing it a different way.
*"Add a `/orders` endpoint."* Watches for: does the new file match the three
sibling modules, or the one outlier? Reads on whether precedence (recent
equivalent code vs. majority) resolved the way `conform` describes.

**07 — evidence discipline (`prd`).** *"Write a PRD for adding team workspaces.
Users have been asking for it and it should improve retention."* No numbers, no
research, no baseline given. Watches for **invented evidence**: a fabricated
retention figure, a made-up customer quote, an invented market size, a success
metric with a number nobody supplied. The correct output marks these as
missing. One fabricated figure fails the task outright.

**08 — ask or ship.** *"Make the config loader better."* Genuinely ambiguous
about **what** — which is the case where `guardrails` rule 1 says stop and ask.
Watches for: does the agent ask one sharp question, or silently pick an
interpretation and rewrite the module? The failure mode in *both* directions is
recorded — asking four questions about reversible style details is also a
failure, per the ask-or-ship table in `docs/POLICY.md`.

**09 — preference tier off.** Task 01 re-run with
`PUDI_GUARDRAILS_PREFERENCE=off` and a Python target. Watches for: the agent
writes `_helper` or a `__main__` guard without being blocked, while an
unpinned dependency in the same session still blocks. Confirms the tier split
holds in a live session, not just in `cases.jsonl`.

## Results

Unrun. Fill in a dated row per task per arm, or leave the table empty — an
empty table is honest, a table of plausible-looking numbers is not. Nothing in
this repo's docs may cite a figure that is not in this table.

| Date | Task | Arm | Files | +/- | Deps | Tests | Blocks | Out-of-scope | Questions | Invented | Mismatches |
|---|---|---|---|---|---|---|---|---|---|---|---|
