---
name: bloat-review
description: >
  Code review that hunts over-engineering only: reinvented standard library,
  unneeded dependencies, speculative abstractions, dead flexibility. One line
  per finding — location, what to cut, what replaces it. Three scopes: a diff
  (default), the whole repo, or the `pudi:` shortcut ledger. Use on "review for
  over-engineering", "what can we delete", "is this over-engineered", "audit
  this codebase", "find bloat", "what did we mark to do later". Complements
  correctness review; this one only hunts complexity.
license: MIT
---

# Bloat Review

Find what to delete. One line per finding: location, what to cut, what
replaces it. The best outcome is that the code gets shorter.

## Scope

- **diff** (default) — review the pending changes. Report in file/line order.
- **repo** — scan the whole tree. Rank biggest cut first.
- **debt** — harvest `pudi:` shortcut comments into a ledger instead of
  reviewing code. `grep -rnE '(#|//) ?pudi:' .`, skipping `node_modules`,
  `.git`, build output. Each marker names its ceiling and upgrade path, so pull
  both: `<file>:<line>, <what was simplified>. ceiling: <limit>. upgrade:
  <trigger>.` A marker with no upgrade path gets tagged `no-trigger` — those
  are the ones that silently rot. End with `<N> markers, <M> with no trigger.`
  Reads and reports only; nothing found is `No pudi: debt. Clean ledger.`

Pick `repo` when the ask names the codebase rather than the change. Pick
`debt` when the ask is about what was deliberately deferred, not what to cut
now — those are different questions with the same one-line-per-finding shape.

## Tags

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Format

`<file>:L<line>: <tag> <what>. <replacement>.`

❌ "This EmailValidator class might be more complex than necessary, have you
considered whether all these validation rules are needed at this stage?"

✅ `L12-38: stdlib: 27-line validator class. "@" in email, 1 line, real validation is the confirmation mail.`

✅ `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`

✅ `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.`

✅ `L52-71: delete: retry wrapper around an idempotent local call. Nothing replaces it.`

✅ `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), 1 line.`

## Where to look in repo scope

Deps the stdlib or platform already ships, single-implementation interfaces,
factories with one product, wrappers that only delegate, files exporting one
thing, dead flags and config, hand-rolled stdlib.

## Scoring

End with the only metric that matters: `net: -<N> lines possible.` Repo scope
adds deps: `net: -<N> lines, -<M> deps possible.`

Count only what you actually located and named. Never report a savings figure
for code that was never written — there is no baseline to subtract from, so
"this approach saved you X lines" is an invented number. The `debt` scope
above is the only real count of what was deliberately not built.

If there is nothing to cut: `Lean already. Ship.` and stop.

## Persona lenses (optional, second-opinion only)

Not a default pass — run when asked for "a different angle" or "a second
opinion," one line each, same finding format as above:

- **Security** — what does this flexibility expose that a fixed shape wouldn't?
- **3am maintainer** — which abstraction here needs the design doc to debug?
- **Cost** — which dependency or resource scales with load nobody bounded?

## Boundaries

Over-engineering and complexity only. Correctness bugs, security holes, and
performance are out of scope — route them to a normal review pass. One small
test or self-check per non-trivial path is the lean minimum, not bloat; never
flag it for deletion. Lists findings, applies nothing.
