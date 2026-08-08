# pudi-skills

Add-ons for Claude Code. Once installed, they work on their own — you keep
talking to Claude normally, nothing new to learn.

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
them even by accident. You'll see this if you ever try to commit an unpinned
dependency (`requests>=2` instead of `requests==2.31.0`) or a secret key: it
gets blocked before the file is even written, with a plain reason why.

## What's in the box

| Plugin | Does | Always needed? |
|---|---|---|
| `lean` | Keeps solutions small and simple | Yes |
| `guardrails` | Blocks a short list of hard rules (secrets, unpinned deps, risky patterns) | Yes |
| `devops` | YAML/Kubernetes/CI help and debugging | Yes, if you touch infra files |
| `scanner` | Finds, ranks, and fixes code-quality issues | Only if you already run a scanner |
| `prd` | Writes product requirement docs | Only for product work |

## For developers

How the hooks work, what was tested, known limits, and project history:
[`docs/DETAILS.md`](docs/DETAILS.md).
