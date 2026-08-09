# PRD Template

*Copy this file per initiative and fill in every section. Don't delete a section — mark it "N/A" with a one-line reason if it truly doesn't apply.*

**If the repo has its own PRD template, use that one instead.** This is the fallback, not the authority.

---

## How to use this template

- **Fill in order.** Problem → stories → metrics → requirements. Requirements written before the problem tend not to trace back to one.
- **Lead with the customer problem, never the solution.** "Users can't reliably X, which costs them Y" — not "we should build Z."
- **Mark gaps, don't fill them.** `[QUOTE NEEDED — pull from user-research]` for a missing quote, `[OPEN — owner, date needed by]` for anything else. A plausible-looking placeholder is worse than a visible one, because it stops being questioned.

---

## 1. TL;DR

Under 80 words: the problem, who has it, and the outcome this initiative is meant to produce. No marketing voice, no feature tour.

## 2. Problem statement

- **Who** has the problem, and what are they trying to accomplish?
- **What** currently blocks or frustrates them?
- **How often / how badly** does it happen?
- **Consequence** if it stays unsolved.

Include one real customer quote, cited to its source. If none exists in `docs/user-research/` or elsewhere in the repo, write exactly:

`[QUOTE NEEDED — pull from user-research]`

Never write a quote you constructed. Attributed speech that nobody said is the most damaging thing a PRD can contain, because every downstream reader treats it as evidence.

Cite provenance inline for any claim resting on a specific data point, rather than presenting it as self-evident.

## 3. User stories

Three to five, prioritized, each a distinct need rather than a rephrasing of the one above it.

```
P0 — As a [user], I want [capability], so that [outcome].
P1 — As a [user], I want [capability], so that [outcome].
P2 — As a [user], I want [capability], so that [outcome].
```

`P0` = the core problem is unsolved without it. `P1` = materially valuable, not blocking. `P2` = worth having, first to go.

## 4. Success metrics

Every metric carries **a number and a timeframe**. Both, always.

- ✅ Reduce failed onboarding attempts by 30% within 60 days of launch.
- ✅ Achieve 40% weekly adoption among existing admins within one quarter.
- ❌ Improve onboarding. / Increase engagement. / Better retention.

No baseline yet? Say so rather than inventing one:

`Establish baseline in the first 2 weeks post-launch, then a 20% improvement within 90 days.`

Measure the customer or business outcome, not whether the feature shipped. If a percentage gate matters, size the sample to the difference it has to detect — n=20 cannot separate 95% from 85%.

## 5. Requirements

Split into three tiers. Write each so it states an observable user-facing outcome, not an implementation.

- ✅ Users can save an incomplete application and resume it within 7 days.
- ❌ Build a draft-saving API.

### Must Have
Required for the core problem to be solved. If the initiative ships without it, §2 is still true.

Non-functional targets live here too, as measurable requirements: `p95 page load under 2s at 10k records`, `all interactive controls reachable by keyboard`, `records retained 90 days then purged`.

### Should Have
Materially increases value; the first release is still usable without it.

### Nice to Have
Deferrable with no damage to the core outcome.

**Three failure modes worth checking for by name:**

- **Undefined terms in a threshold.** "95% of claims are accurate" is unauditable until "claim" is defined — two reviewers will use different denominators. Define the term before you set a bar on it.
- **Principles dressed as tests.** "Confirmed by the absence of feature X" can't be asserted by anything. Convert it to an enforceable constraint: a write must carry an authenticated actor identity, verified by a test asserting rejection without one.
- **Missing states.** Every primary view needs a defined state for cold start, no results for this filter, in progress, and failed. A new deployment *begins* in cold start, so it's the default experience, not an edge case.

## 6. Non-goals

Always present, even if short. State what this initiative will **not** solve — especially anything a reader would reasonably assume is included. This section prevents scope creep more than any other.

- **Deferred:** in scope eventually, but not this release — each with the signal that brings it back (a usage threshold, a customer count, a dependency landing). "Later" with no trigger is a non-goal that hasn't admitted it yet.

## 7. Open questions

Unresolved decisions that would change scope, requirements, user experience, metrics, launch criteria, dependencies, or risk. Include assumptions this PRD depends on that could turn out wrong, each with its consequence — an assumption that changes a requirement if false is an open question, not a footnote.

Mark each `[OPEN — owner, date needed by]` and distinguish "blocks launch" from "resolve eventually."

- ✅ Should administrators or end users own the approval workflow?
- ❌ Should we use Postgres or Mongo? *(technical design, unless it changes what the user can do)*

---

## Formatting

- Inline status tags — `[OPEN]`, `[DECIDED — date]`, `[BLOCKED — reason]` — rather than vague language.
- No invented specifics: headcounts, tool names, vendors, revenue figures, competitor capabilities, or dates that weren't provided. Mark them `[OPEN]`.

---

## Example — a well-written Must Have

> **Feedback from a known stakeholder rolls up to their parent account, not a standalone entry.**
>
> - Given a feedback item whose author's email domain matches an account in the CRM, when it's ingested, the list view shows the account name as the primary label.
> - Given two items from different people at the same account requesting the same capability, both are surfaced as one deduplicated entry with a count of 2 and both contributors named.
> - Given an author who matches no account, the item is flagged "unresolved identity" in a visible queue rather than silently dropped or defaulted to zero.

*Why it works: each line is independently checkable, names the exact behavior rather than the desired feeling, and covers the success path, the duplicate path, and the failure path — where the bugs actually live.*
