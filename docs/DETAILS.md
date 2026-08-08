# Engineering details

The README is the front door — short, action-first. This is everything it
leaves out: hook internals, what was tested and how, the real dependency
graph between skills, known limits, and history. Read it if you're deciding
whether to trust a hook, extending one, or curious what broke and got fixed.

## Skill boundaries, so one task doesn't load three skills

Every `SKILL.md` states a "Not for" case; the routing depends on it. The one
that changed in this pass: `conform` used to fire on "starting work in an
unfamiliar repo," which is true of almost every edit and meant it fired
alongside `lean` by default. It now fires on the **first** edit in a directory
this session, or an explicit style-match ask — ordinary edits are `lean`
alone. `bloat-review` only fires when review is explicitly asked for, never
while writing, so it doesn't compete with `lean` either.

## Dependencies between skills

Real, not incidental — found by grepping each `SKILL.md` for the others' names:

```
guardrails ←→ lean ←→ conform     (conform cites both; each states who wins)
lean → bloat-review → (debt scope, formerly pudi-debt)
devops → guardrails               (rule 7 extended to image tags)
scanner: risk-radar → build-report (renderer convention, both stay in scanner)
prd-writer, add-analyzer, build-report → none (self-contained)
```

No cycles. `guardrails` is the one every other skill defers to when rules
collide — stated once per skill, not re-litigated.

## Tests

Every mechanical rule has a case in [`test/cases.jsonl`](../test/cases.jsonl),
replayed through the real hook scripts:

```bash
node test/run-hooks.js      # 53/53
```

Adding a rule to a hook means adding a line to that file in the same commit.
The suite is the loop: write the case, watch it fail, fix the hook, watch it
pass. Six of the current cases were written against defects the hooks had, and
verified to fail before the fix landed.

Beyond the unit cases, the hooks were replayed over **3,726 files from five
real repositories** (flask, requests, express, slugify, fastapi). Every
dependency block was a genuine unpinned version; `report-check` blocked nothing
at all, which is what a scanner-only hook should do outside a scanner repo. The
corpus run also caught a false positive in `yaml-check` that the unit cases had
missed — `3.11` matched inside the already-quoted string `"pypy-3.11"`.

Cyclomatic complexity was measured, not guessed: `ast`-exact for the one Python
hook (`complexity-watch.py` scores 7 on its own worst function — exactly its
own warn line, so it wouldn't flag itself), a branch-count heuristic for the
three JS hooks. The heuristic over-counts regex alternation as branching (same
caveat `risk-radar` states about its own non-Python estimate); the real
complexity is concentrated in `dependencyArrayLines` and `checkTypeTraps`,
both of which are the only two functions with genuine nested conditionals —
both tested, both commented, left as-is.

Why `test/` exists at all: it's the only thing that actually verifies a hook
works. There's no CI running it — a GitHub Actions workflow was tried and
removed; the run failed on a billing lock before any step executed, not on
anything in the hooks themselves. Run `node test/run-hooks.js` by hand after
touching any hook script. This repo's whole premise is "the hook is the
enforcement, not the skill description" — a hook nobody re-tests is not
enforcement, it's a guess that happened to be right once.

---

## `lean` hook: `complexity-watch.py` (PostToolUse, warn only)

After a `.py` write or edit, measures max cyclomatic complexity with `ast` —
exact, not an estimate — and compares to the previous measurement. Speaks only
when complexity **both rose and landed above 7**; ordinary churn under the
threshold isn't worth a sentence. One line of `additionalContext`, never
blocks, any internal error exits silently.

Non-Python files are skipped rather than guessed at. Tests, fixtures, and
vendored dirs are skipped. Cache lives in the system temp dir keyed by absolute
path, so no repo gets a stray dotfile.

## `guardrails` hook: `policy-check.js` (PreToolUse, blocking)

Rule 7 is the hook. Four things blocked on every write:

| Blocked | Notes |
|---|---|
| Leading-underscore names you create | `__init__`, `__name__` etc. allowlisted |
| `if __name__ == "__main__":` | anchored to line start |
| `__all__ = ...` | anchored to line start |
| Unpinned dependencies | `requirements.txt`, `pyproject.toml`, `package.json` |

**It only inspects lines an edit actually adds.** An `Edit` whose `new_string`
carries untouched context isn't penalised for what was already there — without
this, any file containing a pre-existing violation becomes permanently
uneditable, including by the edit that would fix it.

`package.json` is parsed as JSON and only `dependencies` /
`devDependencies` / `peerDependencies` / `optionalDependencies` are read, so
`engines`, `browserslist`, and `scripts` — all of which routinely carry
`>=`/`>` characters — are never mistaken for a dependency. `pyproject.toml`
reads both the `dependencies = [...]` array form and the PEP 621
`[project.optional-dependencies]` table form.

Unpinned-dependency coverage, all verified:

```
certifi                 blocked — no version at all
numpy                   blocked
urllib3<3               blocked — range specifier
django>=4               blocked
flask~=2.0              blocked
pkg @ git+https://...   blocked — VCS ref with no pinned revision
requests==2.31.0        passes
requests[socks]==2.31.0 passes — extras are fine, the pin is what matters
tomli==2.0.1 ; python_version < "3.11"   passes — env markers aren't ranges
"engines": {"node": ">=18"}              passes — not a dependency block
```

Test it standalone — note `printf`, not `echo`: under zsh a `\n` inside single
quotes stays a literal backslash-n, which makes the JSON invalid, and the hook
fails open on unparseable input, so `echo` would show you a silent pass:

```bash
printf '%s' '{"tool_name":"Write","tool_input":{"file_path":"t.py","content":"__all__ = []"}}' \
  | node guardrails/scripts/policy-check.js; echo "exit=$?"   # exit=2
```

## `devops` hook: `yaml-check.js` (PreToolUse, blocking)

Blocks valid YAML that means the wrong thing — the class no linter catches,
because there is nothing syntactically wrong with it:

| Blocked | Why |
|---|---|
| `python-version: 3.10` | float `3.1`; also caught inside `[3.10, 3.11]` flow sequences and block lists |
| Tab indentation | YAML forbids it outright |
| `image: nginx:latest`, `image: nginx` | rule 7 for containers — the image that reschedules at 3am is not the one you tested |

Whole-token matching only: `["3.10", "pypy-3.11"]` does not flag the `3.11`
already quoted inside `"pypy-3.11"` — a false positive the corpus run caught
and the fix now has a regression case for. Templated references (`{{
.Values.x }}`, `${VAR}`) are skipped, since the value isn't decided here. The
Norway problem (`- NO` → `false`) is a **warning**, not a block: unquoted `no`
genuinely means `false` often enough that blocking it would be wrong.

Verified against all 68 YAML files in the corpus: zero false positives.

```bash
printf '%s' '{"tool_name":"Write","tool_input":{"file_path":"ci.yml","content":"python-version: 3.10"}}' \
  | node devops/scripts/yaml-check.js; echo "exit=$?"   # exit=2
```

## `scanner` hook: `report-check.js` (PreToolUse, blocking)

Two mechanical checks behind `build-report`'s non-negotiables.

**1. A generated report dashboard makes zero network requests.** Off-host
`<script src>`, `<link href>`, `<img src>`, `@import`, css `url()`, `fetch()`,
or `XMLHttpRequest` is blocked. Scoped by path — `.html` under any
`reports/` directory **at any depth, including the repo root**, or named
`dashboard|report|summary|scan-report|quality-report.html`. The path match was
originally anchored to require a leading slash, which silently skipped
repo-root paths like `reports/index.html` and bare `dashboard.html` — the two
most common paths Claude actually writes; fixed, and covered by a test case.
Ordinary web work is untouched: a CDN script tag in `src/app/index.html`
passes.

**2. No intact credential pattern outside a fixture or test directory.** AWS
access key id pattern and private-key headers only — pattern-certain, never
heuristic. A false positive here costs you a write, so entropy guessing stays
in the scanner where it costs only a finding. `fixtures/`, `testdata/`,
`test/`, `tests/`, and `spec/` are exempt — see Known limits below for why
that's a real trade-off, not a free one. Key ids ending in `EXAMPLE` (AWS's own
published placeholder) never block.

Like `policy-check.js`, this diffs `old_string` against `new_string` and checks
only added lines.

```bash
printf '%s' '{"tool_name":"Write","tool_input":{"file_path":"scanner-reports/dashboard.html","content":"<script src=\"https://cdn.example.com/x.js\"></script>"}}' \
  | node scanner/scripts/report-check.js; echo "exit=$?"   # exit=2
```

---

## Known limits

Stated rather than discovered later:

- **`complexity-watch.py` fails open by design.** Any internal error exits
  silently. That's correct for a warn-only hook, but it means a broken hook is
  indistinguishable from a quiet one. It invokes `python3` — bare `python`
  doesn't exist on stock macOS and most modern Linux, and would have failed
  invisibly.
- **`bloat-review`'s `net: -N lines` is an estimate with no verification step.**
  Count only what you actually located and named. The `debt` scope is the only
  real count of what was deliberately not built.
- **Secret detection is two patterns, on purpose.** AWS key ids and private-key
  headers. It will not catch a generic high-entropy token. That's the stated
  trade: in a blocking hook, a false positive costs a write.
- **Test directories are exempt from the secret check, and that is a real
  hole.** `fixtures/`, `testdata/`, `test/`, `tests/`, `spec/` are skipped, so a
  genuine key pasted into a test is not caught here. The alternative was worse:
  before this exemption existed, the hook blocked its own test suite from
  being written, and a security check nobody can test gets uninstalled. CI
  secret scanning is the actual backstop; this hook is a fast first pass,
  never the last line.
- **The added-lines diff is text-based.** Both blocking hooks compare trimmed
  lines, so moving an existing violating line, or adding a second copy of one
  already in `old_string`, is not flagged. It fails toward permitting, which is
  the right direction for a hook that would otherwise make files uneditable.
- **`scanner` is dormant in most repos.** Four of the ten skills across all
  five plugins only fire in a project with a scanner. If you don't have one,
  don't install the plugin.
- **The complexity numbers in the Tests section are one measurement, not a
  trend.** There is no history to compare against yet — the same limit
  `risk-radar` states about churn signal on a fresh git history.

## Open

- **[OPEN]** Static type-checker for personal projects (mypy / pyright / none),
  strictness, and whether a clean type-check gates anything.
- **[OPEN]** Commit-message format — Conventional Commits, ticket prefix, or
  free-form. `references/testing-and-commits.md` currently only says "explain
  why".

## History

Consolidated from eight loose skills in `~/.claude/skills/`. The `puditail`
suite was six skills; `puditail-audit` folded into what's now `bloat-review` as
a scope argument, `puditail-help` and `puditail-gain` were removed — the first
was a help card for a suite that no longer needs one, the second printed
upstream benchmark figures that couldn't be verified from this install.

Later split three ways: the scanner skills left the build-less plugin because a
plugin that sits dormant in most repos shouldn't be bundled with one that fires
on every task.

A `devops` plugin and a `conform` skill were added for infrastructure YAML/CI
work and for reading a codebase's real conventions before writing in it — both
gained a test suite (`test/cases.jsonl`, replayed against real hook scripts)
and a corpus validation pass against five real open-source repos, which is how
five of the current defects were actually found rather than argued about.

Renamed in the same pass that added those two: `pudi` → `lean`, `pudi-review`
→ `bloat-review` (now also carrying what was `pudi-debt` as a scope), and
`prd-writer` moved into its own `prd` plugin — the same dormant-elsewhere
argument that split `scanner` out originally. The `pudi:` inline marker
convention was deliberately left unrenamed; it is a code-level comment
convention, not a skill identity, and may already exist in real files.

A `remediate` skill was added to `scanner`: the other three find, present, and
rank problems; this one fixes the safe ones and re-scans to prove the score
moved, using the finding's existing `confidence` field as the apply-vs-plan
gate instead of a new mechanism.
