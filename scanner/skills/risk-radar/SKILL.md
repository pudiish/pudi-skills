---
name: risk-radar
description: >
  Rank which files are most likely to cause the next bug, from git churn,
  author spread, and complexity. Use for a risk report, danger zones, a
  technical-debt forecast, hotspot analysis, "which files will break next", or
  any mention of churn or the risk radar.
license: MIT
---

# Risk Radar

Hotspots with a published formula and a reason per row. Without git history
there is no churn signal and the risk score is `null` — never a guess.

## The formula

```
risk = 0.45*norm(mean_complexity) + 0.35*norm(churn) + 0.20*norm(authors)
norm(x) = x / max(x over ranked files)
```

Weights ship in the output. A ranking whose weights are hidden is a black box,
and a black box is ignorable.

Window: 90 days by default, configurable like any other threshold.

## Three rules

1. **Author spread counts.** Distinct authors per file in the window
   (`git log --pretty=%an -- <file>`) — many hands means diffused knowledge.
2. **Every row gets a plain-English "why", built from the data:** "mean
   complexity 9.4, edited 14x by 4 authors in 90 days." A score without a
   reason is noise.
3. **Forecast language only.** "Highest predicted risk", never "will fail".
   The radar ranks where to look first; it does not find defects.

## Weak signal

Fewer than 20 commits in the window: say so in the output and note the ranking
leans on complexity. Stated, not hidden.

## Output

Top-5 danger zones as the headline table, top-10 in the JSON. No score weight —
a hotspot is where to look first, not a defect.

## Two modes

- **Scanner present** — extend `analysis.hotspots` additively: keep `top` and
  `findings` exactly as they are, add `risk_top5`, `weights`, `window_days`,
  bump `schema_version`. Renderers pick up the top-5 table through the
  `build-report` conventions.
- **No scanner** — run the bundled standalone:
  `python scripts/risk_radar.py <path> [--days 90] [--top 5]`. Stdlib only,
  works in any git repo with zero setup, labels its complexity estimate as
  approximate. Its `--scan report.json` mode reads
  `analysis.complexity.findings` for exact numbers instead of the regex
  approximation.
