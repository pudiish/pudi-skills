# Agreed thresholds and recipes

Settled defaults so they are never re-debated. A project overrides them through
its own config table (`[tool.scanner]` or equivalent); precedence is
flags > config > these defaults.

| Analyzer | Detection | Thresholds |
|---|---|---|
| complexity | count branches via the language AST (Python `ast`) | warn > 7, flag > 10 |
| smells | per-function and per-file size checks | function > 50 lines, nesting > 4, params > 5, file > 800 LOC |
| security — secrets | AWS key pattern, `key/secret/token/password = "..."` assignments, private-key headers, high-entropy strings | entropy > 4.5 and length >= 20 |
| security — dangerous calls | eval/exec, `pickle.loads`, `os.system`, subprocess with `shell=True`, `yaml.load` without SafeLoader | message names the safer alternative |
| duplication | strip whitespace and comments, hash 6-line sliding windows | report duplicate pairs + duplicated % |
| docs | documented public functions / total public functions | Python docstrings via `ast`; other languages null |
| dependencies | imports per file, module graph | report circular-dependency cycles |
| hotspots | git churn (commits touching file) x mean complexity | ranking only, no score weight |

## Sub-score shape

Every sub-score is a bounded ratio of like units, so it means the same thing on
a 40-file service and a 400k-line monorepo:

- complexity: `100 * (1 - flagged functions / functions measured)`
- smells: mean of the per-function and per-file ratios
- security: `100 * (1 - weighted findings per 1000 code lines / 2)`, secrets
  counting 1.5x dangerous calls
- duplication: `100 - duplicated_lines_pct`
- docs: docstring coverage of public functions and methods
- dependencies: `100 - 20 * import cycles`; **null** when the graph resolved no
  edges

An analyzer that cannot measure returns null and its weight renormalizes over
the rest — never a phantom zero, never an unearned 100.

## Weights and grades

security 0.30, complexity 0.20, smells 0.15, duplication 0.15, docs 0.10,
dependencies 0.10. Grades: A >= 90, B >= 80, C >= 70, D >= 60, else F.

**Cap rule:** a pattern-certain hardcoded secret (AWS key pattern, private-key
header) caps the grade at C regardless of the number. Heuristic secret hits do
not cap — that asymmetry is deliberate, a heuristic is not evidence.

## Finding shape

```json
{
  "path": "src/pipeline.py",
  "line": 42,
  "rule": "complexity",
  "severity": "error|warning|info",
  "message": "plain sentence naming the number and the threshold",
  "confidence": "high|medium|low",
  "baselined": false
}
```

`message` states what was measured and against what: "golden_eleven has
cyclomatic complexity 11 (warn > 7, flag > 10)". A finding the reader cannot
act on without opening the source is an incomplete finding.

## Baseline and gate

Adopting on legacy code snapshots today's findings as known debt; the gate then
fires only on NEW findings at or above `gate_min_severity` and on score drops.
Baselined findings stay visible in every report flagged `"baselined": true` —
excluded from the gate, never from sight. The baseline file is committed so
that every re-baseline shows up in a PR diff.
