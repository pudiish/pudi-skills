---
name: prd-writer
description: Use this skill when drafting, rewriting, structuring, or reviewing a product requirements document (PRD). Produces a seven-section, evidence-first PRD — TL;DR, problem, user stories, success metrics, tiered requirements, non-goals, open questions — following the repo's own template when it has one.
license: MIT
---

# PRD Writer

Write PRDs that lead with the customer problem, carry only evidence that exists, and can be reviewed without interpretation.

## When to fire

Fire on explicit requests: "draft a PRD," "turn this brief into requirements," "write acceptance criteria for X," "review my PRD," "add a section for Y."

Fire also on the implicit cases, which are more common:

- A strategy brief, research doc, or set of notes exists and the user asks what to build, or asks to move from evidence to scope.
- The user asks for requirements, scope boundaries, non-goals, or success metrics for a specific capability.
- The user asks to revise, tighten, or stress-test part of an existing PRD — a single section still gets the full document's conventions.

Do **not** fire for upstream work: market research, discovery synthesis, positioning, pricing, or GTM planning. Those are separate artifacts, and pulling requirements into them destroys the research/solutioning boundary that makes the PRD trustworthy later. If the user is genuinely still in discovery, say which artifact the work belongs in and offer to write that instead.

## Read the repo first

Before drafting, check for and read what exists: `TEMPLATE.md`, `EXAMPLE.md`, `CLAUDE.md`, `docs/user-research/`, `docs/competitive/`.

Precedence, highest first:

1. **The repo's own PRD template** — structure and formatting authority.
2. **The repo's example PRD** — the quality bar, not a source of facts.
3. **`CLAUDE.md`** — product context, existing behavior, terminology.
4. **`docs/user-research/`** — customer evidence.
5. **`docs/competitive/`** — only when it explains a real constraint or expectation. Don't add a competitive section because the directory exists.
6. **The user's brief.**
7. **`references/prd-template.md`** — this plugin's fallback structure.

A template in the user's repo outranks the one this plugin ships; follow it exactly, including headings, ordering, and metadata. Same reasoning `conform` applies to code (`lean/skills/conform/SKILL.md` — enforced beats documented): the team's actual convention wins over an imported one.

## Evidence

Never invent a customer quote, customer name, research finding, usage number, conversion rate, baseline, competitor capability, deadline, stakeholder decision, or existing product behavior.

- Missing quote → `[QUOTE NEEDED — pull from user-research]`
- Missing anything else → `[OPEN — owner, date needed by]`

**Draft with the gap marked; don't block on it.** A visible placeholder gets questioned in review, which is what you want. Ask one question only when the user gave a bare problem statement *and* the repo has no research at all — and make it a request for specific evidence ("do you have an interview, support ticket, or user quote showing this?"), never "can you give more context?".

Keep inference separate from evidence. A reasonable conclusion drawn from research is worth stating, phrased as the assumption it is and parked in §7 with its consequence if wrong. What you may not do is promote it to fact.

## The seven sections

Full detail and examples in `references/prd-template.md`; treat that file as canonical and copy it per initiative rather than editing it in place.

| # | Section | The rule that matters |
|---|---|---|
| 1 | TL;DR | Under 80 words. Problem, who's affected, intended outcome. |
| 2 | Problem statement | Who, what blocks them, how often, what it costs. One real quote or the placeholder. Never opens with "we should build…". |
| 3 | User stories | 3–5, `P0`/`P1`/`P2`, each a distinct need rather than a rephrasing. |
| 4 | Success metrics | Every metric carries a number **and** a timeframe. No baseline → say how you'll establish one. |
| 5 | Requirements | Must / Should / Nice. Each states an observable outcome, not an implementation. Non-functional targets go in Must, as measurable requirements. |
| 6 | Non-goals | Always present. Deferred items name the signal that brings them back. |
| 7 | Open questions | What would change scope, requirements, UX, metrics, launch, or risk — plus assumptions that could be wrong. Not a bin for implementation choices. |

## Writing

American English, plain language, short sentences. Bullets over paragraphs — prose only for the problem statement. Concrete nouns and verbs. No marketing voice, no buzzwords, no "leverage a robust, scalable solution to empower users."

## Review before delivering

Never accept the first draft. Its job is to exist; its value is exposing gaps an outline can't show. Read it in three voices, one pass each:

- **Engineer** — is every requirement testable? What happens on retry, re-run, or backfill? Which one is the estimability risk?
- **Product director** — is scope defensible? Does every Must fail the "problem is unsolved without it" test? What gets asked first at go/no-go?
- **UX researcher** — which users does this actually serve? Are cold-start, empty, and error states defined? Is any signal carried by color alone?

Then the mechanical sweep, all of which are pass/fail:

- TL;DR under 80 words.
- Every metric has a number and a timeframe.
- Every quote is traceable to a real source, or is the placeholder.
- Non-goals section is present and non-empty.
- Every requirement traces to the problem in §2 — a requirement that doesn't isn't scope, it's drift.
- No invented specifics anywhere.

Fix what the sweep finds before delivering, and say what changed rather than quietly improving the text.
