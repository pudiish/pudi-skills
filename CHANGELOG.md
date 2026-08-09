# Changelog

These plugins are executable behavior, not documentation — a changed hook
policy changes what Claude is allowed to write in your repo. Anything that
alters what gets blocked is recorded here, loudly.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are per plugin, listed under each entry.

## Unreleased

### guardrails 0.3.0

**Changed — affects what gets blocked.**

- Rules now carry a tier: **safety**, **reproducibility**, or **preference**.
  Violations name their tier when reported. Tiers are defined in
  [`docs/POLICY.md`](docs/POLICY.md).
- `PUDI_GUARDRAILS_PREFERENCE=off` disables the preference tier — the
  leading-underscore, `__main__`, and `__all__` rules. Reproducibility and
  safety rules stay enforced. Previously these were not separable: installing
  the plugin for dependency pinning meant accepting the naming rules too.

**Added.**

- `PUDI_GUARDRAILS=audit` reports every violation on stderr and exits 0,
  blocking nothing. Intended for surveying an unfamiliar repo before opting
  into enforcement.
- `PUDI_GUARDRAILS=off` disables the hook entirely.
- An unrecognized `PUDI_GUARDRAILS` value falls back to `enforce`, so a typo
  cannot silently disable enforcement.

No rule changed what it *detects* in this release. Only the response to a
detection is new.

### lean 0.2.0

**Fixed.**

- The complexity hook was invoked as `python3 …/complexity-watch.py` directly
  from `hooks.json`. On a machine without `python3` — stock Windows, or macOS
  without the Xcode command line tools — that exits 127 and a PostToolUse
  failure is invisible: the write already happened, so the hook was simply
  dead and said nothing. It now runs through a Node wrapper
  (`scripts/complexity-watch.js`) that reports the missing interpreter once per
  session and stays quiet after. Node is guaranteed present, so the wrapper
  itself cannot fail this way.

The measurement is unchanged and still exact — it uses Python's `ast` module
rather than counting keywords, which on a file with strings and comments
containing `if`/`for`/`and` reads 2 where a regex reads 20.

### Repository

**Added.**

- GitHub Actions runs `test/run-hooks.js` and `test/validate-structure.js` on
  every push to `master` and every pull request.
- `test/validate-structure.js` validates that each marketplace entry resolves
  to a real plugin, manifest names and versions agree, every SKILL.md has
  matching frontmatter, and no `hooks.json` references a missing script — the
  last of which fails open, letting a write through unchecked.
- `docs/POLICY.md`: canonical tier definitions, the cross-skill precedence
  order, and the ask-or-ship rule.
- This changelog.

**Changed.**

- The ask-or-ship rule now covers style and minor-preference ambiguity
  (read the repo / pick the conventional option) rather than only the
  what-versus-how-much split, and names risky irreversible actions as
  always-ask. Guidance only; no hook behavior changed.
- `README.md` states the enforcement trust model up front: which plugins can
  block a write, and which rules are personal taste rather than engineering
  consensus.

## 0.2.0 and earlier

Tracked in git history and [`docs/DETAILS.md`](docs/DETAILS.md). This changelog
starts here; earlier releases predate it.
