# pudi-skills

Pragmatic engineering habits for Claude Code: build the smallest solution that
is actually correct, follow what the repo already does instead of inventing a
new pattern, catch the risky change before it lands, and report real numbers
rather than "looks good".

Once installed they work on their own — you keep talking to Claude normally,
nothing new to learn.

## Install

You need [Claude Code](https://claude.com/claude-code) open. Then, in a
terminal:

```bash
git clone https://github.com/ishwarsw/pudi-skills.git
```

In Claude Code, run these one at a time:

```
/plugin marketplace add ./pudi-skills
/plugin install lean@pudi-skills
/plugin install guardrails@pudi-skills
/plugin install devops@pudi-skills
```

That's it. Two more, only if they apply to you:

```
/plugin install scanner@pudi-skills   # you already run a code-quality scanner
/plugin install prd@pudi-skills       # you write product requirement docs
```

To update later: `git pull` inside the `pudi-skills` folder, then run
`/plugin marketplace update pudi-skills` in Claude Code.

## Use

Nothing to remember. Just ask for what you want, plainly:

| You say | What happens |
|---|---|
| "Add a feature" / "fix this bug" | Claude builds the smallest version that works, no bloat |
| "Review this for over-engineering" | Points at exactly what to delete, and why |
| "Write this Kubernetes/CI/YAML file" | Catches YAML mistakes that look fine but mean the wrong thing |
| "My pod/deploy/pipeline is broken" | Walks the real failure down to its cause, step by step |
| "Write a PRD for X" | A full requirements doc with testable pass/fail criteria |
| "Fix the scan findings" *(scanner repos only)* | Fixes the safe ones, re-checks the score, tells you what's left |

Some rules are also machine-checked, not just suggested — Claude can't skip
them even by accident. You'll see this if you ever try to commit a secret key,
or a dependency whose version isn't nailed down: it gets blocked before the
file is even written, with a plain reason why. "Nailed down" means either an
exact version (`requests==2.31.0`) or a range plus a lockfile you've committed
— `"react": "^18.2.0"` next to a `package-lock.json` is fine, because the
lockfile is what decides the version.

## Requirements

Claude Code ships with Node, which is all the hooks need — except one. `lean`'s
complexity warning measures Python with the stdlib `ast` module, so it needs
**`python3` on your PATH** to do anything. Without it, that one hook says so
once and stays quiet; everything else in `lean` works normally. Nothing else in
any plugin requires Python.

## ⚠️ These plugins can stop Claude from writing a file

`guardrails`, `devops`, and `scanner` install **blocking hooks**. They run on
every Write and Edit, before the file is touched, and can refuse it outright.
Installing them delegates real authority over your editor — that is the point,
and you should know you're doing it.

Some of what `guardrails` blocks is universal (unpinned dependencies, secrets).
Some is **Ishwar's personal taste** — no `_private` names, no `__main__`
guards, no `__all__`. Those are perfectly normal Python; they're blocked here
because he wants them blocked in his repos. The tiers are spelled out in
[`docs/POLICY.md`](docs/POLICY.md).

**Try it before you enable it.** Audit mode reports what it *would* have
blocked and lets every write through:

```bash
PUDI_GUARDRAILS=audit          # report only, block nothing
PUDI_GUARDRAILS_PREFERENCE=off # keep the dependency rules, drop the taste
PUDI_GUARDRAILS=off            # disable the hook entirely
```

Point Claude at an unfamiliar repo in audit mode first, read the findings, then
decide. An unrecognized value falls back to blocking — a typo won't quietly
turn enforcement off.

## What's in the box

| Plugin | Does | Always needed? |
|---|---|---|
| `lean` | Keeps solutions small and simple | Yes |
| `guardrails` | Blocks a short list of hard rules (secrets, unpinned deps, risky patterns) | Yes |
| `devops` | YAML/Kubernetes/CI help and debugging | Yes, if you touch infra files |
| `scanner` | Finds, ranks, and fixes code-quality issues | Only if you already run a scanner |
| `prd` | Writes product requirement docs | Only for product work |

## For developers

- What gets enforced, the three tiers, and which rule wins a conflict:
  [`docs/POLICY.md`](docs/POLICY.md)
- How the hooks work, what was tested, known limits, project history:
  [`docs/DETAILS.md`](docs/DETAILS.md)
- What changed and when: [`CHANGELOG.md`](CHANGELOG.md)

Tests: `node test/run-hooks.js` and `node test/validate-structure.js`. Both run
in CI on every push and pull request.
