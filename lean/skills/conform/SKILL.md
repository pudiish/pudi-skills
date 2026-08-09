---
name: conform
description: >
  Derive a codebase's actual conventions from its code before writing in a
  directory you haven't touched yet this session — naming, error handling,
  test style, layering, config — so new code is indistinguishable from what is
  already there. Use on the first edit in an unfamiliar module, and explicitly
  on "match the existing style", "follow the existing pattern", "how does this
  codebase do X". Not for a directory already read this session, and not for
  greenfield code with no surrounding context — `lean` covers ordinary edits
  on their own.
license: MIT
---

# Conform

`lean` rung 2 says reuse what's here and `guardrails` rule 4 says search before
you create. Both assume you know what "here" does. This is how you find out.

## Sample three, never one

One file is an anecdote. Read **three siblings** in the directory you're about
to write in, plus **the nearest test file** — tests reveal the framework,
fixture style, assertion style, and what the authors consider a unit, none of
which the source shows.

Cheapest way in: `git log --oneline -15 -- <dir>` for what changes here, then
read the two files it touches most and one recent addition.

## What to extract

| Look for | Answer the question |
|---|---|
| Names | Full words or abbreviations? What are collections called? |
| Errors | Raise, return a result, or error tuple? Custom types or stdlib? |
| Imports | Absolute or relative? Module-level or lazy? |
| Structure | Where does a new file of this kind live? What does `__init__` export? |
| Tests | Framework, file location, naming, fixture vs. factory vs. literal |
| Config | Env, file, or constant? Who reads it, and where does it get validated? |
| Types | Annotated everywhere, at boundaries only, or not at all? |
| Logging | Structured or printf? What's the logger named? |

## When the codebase disagrees with itself

Real repos have layers of history. Precedence, highest first:

1. The **file you are editing**.
2. The **directory** it lives in.
3. The **most recently added** code doing the same job — recency beats
   frequency, since a repo mid-migration has more old code than new.
4. Repo-wide config that is actually enforced (`ruff.toml`, `.eslintrc`,
   `tsconfig`, CI lint step). Enforced beats documented.

A convention nothing enforces and nothing recent follows is dead. Don't revive
it, and don't count it as the house style.

## Two rules

- **Don't import a new convention silently.** Introducing a pattern the repo
  doesn't have is a proposal, not a detail — say it in one line and let it be
  rejected.
- **`guardrails` outranks local style.** Its rule 7 bans are hook-enforced, so
  a repo full of `_private` names does not license writing another one. Match
  the style; obey the guardrails. Where they collide, say so rather than
  quietly picking one.

## Output

One line before you write, so a wrong read is cheap to correct:

`Following <dir>: <naming>, <error style>, <test style>. Deviating on <X> because <Y>.`

Nothing to deviate on? Drop the second sentence. This is a sentence, not a
report — if the survey is longer than the change, you have over-read.
