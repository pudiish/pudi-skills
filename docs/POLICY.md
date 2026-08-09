# Policy

What these plugins enforce, who each rule is for, and which rule wins when two
disagree. This is the canonical copy; a SKILL.md that restates a rule is a
mirror of this file, not a second source of truth.

## Three tiers

A rule's tier decides whether you can switch it off. The tiers are not a
severity ranking — they answer "is this true for everyone, or is it Ishwar's
taste?"

| Tier | Holds for | Can be disabled | Rules |
|---|---|---|---|
| **safety** | everyone | no | no committed secrets, no destructive commands, no committing without an explicit ask |
| **reproducibility** | everyone | no | dependency resolution must be reproducible; image tags must be immutable; YAML must mean what it appears to mean |
| **preference** | Ishwar's repos | yes | no leading-underscore names, no `if __name__ == "__main__":`, no `__all__` |

The preference tier is the honest one. `def _helper():` is ordinary Python,
`__all__` is sometimes exactly right, and a `__main__` guard is how most Python
scripts are written. These are banned here because Ishwar wants them banned in
his repos, not because they are defects. If you installed `guardrails` for
reproducible dependencies and don't share the naming taste, turn the tier off —
that is what the switch is for, and the other two tiers stay on.

## Switching tiers

Set on the environment Claude Code runs in:

```bash
PUDI_GUARDRAILS=enforce   # default — a violation blocks the write (exit 2)
PUDI_GUARDRAILS=audit     # report every violation on stderr, block nothing
PUDI_GUARDRAILS=off       # disable the hook entirely

PUDI_GUARDRAILS_PREFERENCE=off   # drop the preference tier, keep the rest
```

An unrecognized value for `PUDI_GUARDRAILS` falls back to `enforce`. A typo
must never be the thing that silently disables enforcement.

Audit mode is the way into an unfamiliar repo: run it, read what *would* have
been blocked, then decide whether to enforce. It exits 0, so nothing is
prevented and nothing is hidden.

## Precedence

When two rules point different directions, higher wins:

```
1. explicit user instruction      "yes, pin it anyway"
2. safety                         secrets, destructive operations
3. repository-enforced config     the repo's own linter/CI, already committed
4. guardrails                     tiers above
5. repository conventions         what conform reads from sibling files
6. domain skill                   devops, prd, scanner
7. lean / YAGNI                   build the smallest thing
8. future-proofing                lowest — the thing lean exists to resist
```

Two consequences worth stating outright, because they are where this gets
misread:

- **`lean` loses to `guardrails`.** The laziest solution is bounded by what is
  non-negotiable, never the reverse.
- **A block is authoritative.** Don't route around a refused write by shelling
  out, splitting the change across files, re-encoding a value, or editing the
  hook. If a rule is wrong, say so and change it as its own change — never
  weaken enforcement as a side effect of an unrelated task.

## Ask or ship

Rule 1 ("ask, don't guess") and `lean`'s bias toward shipping pull against each
other. Split them by what is actually ambiguous:

| Ambiguous about | Do |
|---|---|
| **what** to build — which behavior, which contract, which file is authoritative | **ask** |
| a **risky or irreversible** action — data loss, force-push, production | **ask** |
| **how much** to build — how general, how configurable | ship the lazy version, name what you skipped |
| **style** — naming, layout, idiom | read the repo (`conform`), don't ask |
| **minor preference** with no correctness impact | pick the conventional option, move on |

The test is whether the answer changes correctness. If it does, ask. If it only
changes taste or scope, decide and say what you decided. An agent that asks
about everything is as useless as one that guesses about everything.
