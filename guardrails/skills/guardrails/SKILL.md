---
name: guardrails
description: >
  Mandatory engineering rules for any coding task — writing, editing,
  refactoring, fixing, or reviewing code. Use whenever you are about to touch
  source code, choose names, add a dependency, change behavior, write tests,
  or commit. Not for pure Q&A or read-only exploration with no code change.
  Covers: ask-don't-guess, minimal diffs, stable signatures, naming, no
  wrapper functions, error handling, deps, testing, logging, commits.
license: MIT
---

# Guardrails

Ishwar's engineering standards. **MUST**/**MUST NOT** = non-negotiable. When a
rule and a request conflict: **stop and ask**, state your reasoning, don't
guess. These are his rules to change — ask him, and he can say yes.

Rules fall in three tiers — **safety**, **reproducibility**, **preference** —
defined in [`docs/POLICY.md`](../../../docs/POLICY.md), along with the
precedence order for resolving conflicts between skills. The preference tier
(rule 7's naming rules) is personal taste and can be switched off; safety and
reproducibility cannot. A violation names its tier when it reports.

## The non-negotiables (always apply)

1. **Ask, don't guess.** Ambiguous, underspecified, or multiple valid
   interpretations → stop and ask, show your reasoning before acting. Don't
   invent facts to fill a gap (paths, versions, expected behavior). A wrong
   assumption costs the whole change + rework; a question costs a moment.
2. **Minimal change.** Smallest diff that fully satisfies the request. No
   unrelated refactor/rename/reformat/"tidy". No scope creep. If a clean fix
   genuinely needs a broader change, surface the trade-off first.
3. **Stable public signatures.** Never change name/params/return
   shape/behavior of an existing public function/class/endpoint without
   explicit approval. New optional kwarg with safe default = fine.
4. **Reuse before create.** Search shared/common modules before writing a
   new utility. Duplicating existing logic is forbidden.
5. **No blanket transformations.** Sweeping "change everything" edits are
   decided per-item with a stated reason, never a codebase-wide sweep on
   your own initiative.
6. **No comments unless the *why* is non-obvious** (hidden constraint,
   workaround, subtle invariant). Never narrate *what* the code does or
   explain the change itself — that's for commit messages.
7. **Hook-enforced hard rules.** *(preference tier)* No leading-underscore
   names (`_foo`, `__foo`) that you create. No `if __name__ == "__main__":`
   blocks. No `__all__`. *(reproducibility tier)*
   **Dependency resolution must be reproducible** — an exact `==`/exact
   version, *or* a range backed by a committed lockfile beside the manifest
   (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `poetry.lock`,
   `uv.lock`, `pdm.lock`). Use whatever the repo already uses; never add a
   package manager to satisfy this. `requirements.txt` has no lockfile
   companion, so it stays strictly pinned. A PreToolUse hook
   (`scripts/policy-check.js`, shipped with this plugin) mechanically blocks
   these four on every Write/Edit/NotebookEdit regardless of whether this
   skill loaded — this section is the human-readable mirror of that
   enforcement, not the only copy of it. Don't relitigate them mid-task; if
   one is genuinely wrong for a case, say so and ask.
   **A block is authoritative.** Don't route around it: no writing the same
   content through `bash`/`cat`/`sed` after a Write is refused, no splitting
   the violation across files or edits, no re-encoding the same value to dodge
   the pattern, no editing or disabling the hook script to get unblocked. If
   the rule itself is wrong, stop and say so as its own change — never weaken
   enforcement as a side effect of an unrelated task.
8. **Justify behavior changes.** Before changing how existing code behaves:
   state the benefit, the safety (no hidden blocker/regression), and the
   downstream impact. Missing any of the three → leave it as-is, raise it.
9. **Never commit/push without explicit ask.** Same for force-push, branch
   delete, PR creation — confirm first.

## Ask or ship

Rule 1 and `lean`'s bias toward shipping pull opposite ways. Split them by
what is ambiguous — the test is whether the answer changes **correctness**:

- Ambiguous about **what** to build (which behavior, which contract, which
  file is authoritative) → **rule 1 wins, stop and ask.**
- Ambiguous about a **risky or irreversible** action (data loss, force-push,
  production) → **stop and ask**, however obvious it looks.
- Ambiguous about **how much** to build (how general, how configurable) →
  ship the lazy version and name what you skipped. Don't stall on scope.
- Ambiguous about **style** (naming, layout, idiom) → read the repo, that's
  `conform`'s job. Don't ask what the sibling files already answer.
- Ambiguous about a **minor preference** with no correctness impact → pick the
  conventional option and say which you picked.

Asking about everything is its own failure mode: it costs the user more than a
wrong guess on a reversible detail. Reserve the question for what a wrong
answer would actually break.

`lean` picks *how little* to build; guardrails bounds *what's not negotiable*
while doing it. Where they disagree, guardrails wins — its `demo()`/self-check
suggestion is overridden by rule 7, so a check goes in a `test_*.py`.

## Reporting: measured, or stated as unmeasured

Every claim about your own work is either a figure you actually observed or an
explicit admission that you didn't check. There is no third option, and
adjectives are not the third option.

- ✅ `3 files, +47/-18. 24/24 tests pass. No new dependency.`
- ✅ `Tests not run — no suite in this repo.`
- ❌ `small change, tests look good, security improved`

Never estimate a figure and present it as measured; `bloat-review`'s rule
against invented savings numbers is the same rule, and it applies everywhere.
When you're blocked, say so first and plainly — reason, the evidence you saw,
what you need — rather than burying it under what did work. `lean`'s Output
section governs how much you write; this governs whether it's true.

## Load more detail only if the task needs it

- Writing/reviewing **names, wrappers, error handling, concurrency, types,
  dependencies** → read `references/code-rules.md`
- Task involves **tests, logging, or commit/PR messages** → read
  `references/testing-and-commits.md`
- Unsure if you're covered, or need the full checklist before calling a
  change "done" → read `references/checklist.md`

Don't preload these — pull the one file that matches what you're actually
about to do.
