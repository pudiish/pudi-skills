#!/usr/bin/env python3
"""risk_radar.py — standalone predictive technical-debt ranker.

Stdlib only, works in any git repo with zero setup. Two modes:
- approximate (default): branch-keyword complexity estimate, labeled as such
- exact: --scan report.json reads analysis.complexity.findings from a scanner
  report that follows the JSON contract

Without git history the churn and author signals are null and the output says
so; nothing is guessed.

Usage: python scripts/risk_radar.py [path] [--days 90] [--top 5] [--scan report.json]
"""
import argparse
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict

BRANCH_RE = re.compile(r"\b(if|elif|else if|for|while|case|catch|except)\b|&&|\|\|")
CODE_EXT = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rb", ".cs", ".cpp", ".c"}
IGNORES = {".git", ".claude", "node_modules", "venv", ".venv", "__pycache__", "dist", "build"}
WEIGHTS = {"complexity": 0.45, "churn": 0.35, "authors": 0.20}


def git_history(root, days):
    """Commits and distinct authors per file in the window; (None, None) without git."""
    try:
        log = subprocess.run(
            ["git", "log", f"--since={days} days ago", "--name-only",
             "--pretty=format:@%an"],
            cwd=root, capture_output=True, text=True, timeout=30)
        if log.returncode != 0:
            return None, None
    except Exception:
        return None, None
    churn, authors = Counter(), defaultdict(set)
    author = None
    for line in log.stdout.splitlines():
        if line.startswith("@"):
            author = line[1:]
        elif line.strip():
            key = line.replace("\\", "/")
            churn[key] += 1
            if author:
                authors[key].add(author)
    return churn, {f: len(a) for f, a in authors.items()}


def approx_complexity(path):
    """Branch-keyword count + 1. Approximate by construction, never called exact."""
    try:
        with open(path, encoding="utf-8", errors="ignore") as fh:
            text = fh.read()
    except OSError:
        return 0
    return 1 + len(BRANCH_RE.findall(text))


def exact_complexity(scan_path):
    """Max complexity per file from analysis.complexity.findings messages."""
    with open(scan_path, encoding="utf-8") as fh:
        report = json.load(fh)
    findings = report.get("analysis", {}).get("complexity", {}).get("findings") or []
    per_file = defaultdict(int)
    for f in findings:
        path = (f.get("path") or "").replace("\\", "/")
        for tok in f.get("message", "").replace("(", " ").split():
            if tok.isdigit():
                per_file[path] = max(per_file[path], int(tok))
                break
    return dict(per_file)


def collect_rows(root, exact, churn, authors):
    """One row per code file: complexity, churn, author count."""
    rows = []
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in IGNORES]
        for name in files:
            if os.path.splitext(name)[1] not in CODE_EXT:
                continue
            full = os.path.join(dirpath, name)
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            if exact is not None:
                cx = next((v for k, v in exact.items() if k.endswith(rel)), 0)
            else:
                cx = approx_complexity(full)
            rows.append({"file": rel, "cx": cx,
                         "churn": churn.get(rel, 0) if churn else None,
                         "authors": authors.get(rel, 0) if authors else None})
    return rows


def score_rows(rows, have_git, method, days):
    """Attach risk and the mandatory why-sentence to each row."""
    max_cx = max(r["cx"] for r in rows) or 1
    max_ch = max((r["churn"] or 0) for r in rows) or 1
    max_au = max((r["authors"] or 0) for r in rows) or 1
    for r in rows:
        if have_git:
            r["risk"] = round(100 * (WEIGHTS["complexity"] * r["cx"] / max_cx
                                     + WEIGHTS["churn"] * (r["churn"] or 0) / max_ch
                                     + WEIGHTS["authors"] * (r["authors"] or 0) / max_au))
            r["why"] = (f"complexity {r['cx']} ({method}), edited {r['churn'] or 0}x "
                        f"by {r['authors'] or 0} author(s) in {days} days")
        else:
            r["risk"] = None
            r["why"] = f"complexity {r['cx']} ({method}); churn/authors: null, no git history"


def report(rows, churn, have_git, method, days, top):
    """Top-N table, weights published, weak-signal note when the window is thin."""
    print(f"# Risk Radar — top {top} ({method}, window {days}d)")
    print(f"weights: {WEIGHTS}" if have_git
          else "no git history: risk is null, ranking falls back to complexity only")
    if have_git and sum(churn.values()) < 20:
        print("note: <20 commits in window — churn signal is weak, ranking leans on complexity")
    print("\n| Rank | File | Risk | Why |\n|---|---|---|---|")
    for i, r in enumerate(rows[:top], 1):
        print(f"| {i} | {r['file']} | {r['risk'] if r['risk'] is not None else 'null'} | {r['why']} |")
    print("\nForecast, not verdict: highest predicted risk.")


def main():
    """Rank files by predicted risk and print the top-N table."""
    ap = argparse.ArgumentParser()
    ap.add_argument("path", nargs="?", default=".")
    ap.add_argument("--days", type=int, default=90)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--scan", help="scanner report.json for exact complexity")
    args = ap.parse_args()

    root = os.path.abspath(args.path)
    churn, authors = git_history(root, args.days)
    exact = exact_complexity(args.scan) if args.scan and os.path.exists(args.scan) else None
    method = "exact (scanner report)" if exact is not None else "approximate (branch keywords)"

    rows = collect_rows(root, exact, churn, authors)
    if not rows:
        sys.exit("No code files found.")

    have_git = churn is not None
    score_rows(rows, have_git, method, args.days)
    rows.sort(key=(lambda r: -(r["risk"] or 0)) if have_git else (lambda r: -r["cx"]))
    report(rows, churn, have_git, method, args.days, args.top)


main()
