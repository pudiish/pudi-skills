#!/usr/bin/env python3
"""PostToolUse hook: warn only when an edit made a Python file more complex.

Reads the hook payload from stdin, measures max cyclomatic complexity of the
edited file with ast (exact, no estimate), and compares against the previous
measurement cached outside the user's repo. Speaks only when complexity both
rose and landed above the warn threshold — normal churn under it is not worth a
sentence. Fails open: any error exits quietly rather than interrupting work.
Non-Python files are skipped rather than guessed at.
"""
import ast
import json
import os
import sys
import tempfile

CACHE = os.path.join(tempfile.gettempdir(), "lean-complexity-cache.json")
WARN = 7
BRANCH_NODES = (ast.If, ast.For, ast.AsyncFor, ast.While, ast.ExceptHandler,
                ast.With, ast.AsyncWith, ast.Assert, ast.IfExp,
                ast.BoolOp, ast.comprehension)
SKIP_DIRS = ("/tests/", "/test/", "/fixtures/", "/node_modules/", "/.venv/", "/venv/")


def edited_python_file():
    """Normalized path from the hook payload when it is measurable Python."""
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return None
    path = (payload.get("tool_input") or {}).get("file_path", "")
    if not path.endswith(".py"):
        return None
    norm = path.replace("\\", "/")
    if any(part in norm.lower() for part in SKIP_DIRS):
        return None
    return norm if os.path.exists(norm) else None


def complexity_of(func):
    """Cyclomatic complexity of one function: 1 + decision points."""
    score = 1
    for node in ast.walk(func):
        if isinstance(node, ast.BoolOp):
            score += len(node.values) - 1
        elif isinstance(node, BRANCH_NODES):
            score += 1
    return score


def worst_function(path):
    """(name, complexity) of the most complex function, or None if unparseable."""
    try:
        with open(path, encoding="utf-8", errors="replace") as fh:
            tree = ast.parse(fh.read())
    except (OSError, SyntaxError, ValueError):
        return None
    worst = None
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            score = complexity_of(node)
            if worst is None or score > worst[1]:
                worst = (node.name, score)
    return worst


def swap_cache_entry(path, now):
    """Previous complexity for path, storing the current one. Errors never block."""
    cache = {}
    try:
        with open(CACHE, encoding="utf-8") as fh:
            cache = json.load(fh)
    except Exception:
        cache = {}
    previous = cache.get(path)
    cache[path] = now
    try:
        with open(CACHE, "w", encoding="utf-8") as fh:
            json.dump(cache, fh)
    except Exception:
        pass
    return previous


def run():
    """Measure the edited file and speak only when complexity regressed."""
    norm = edited_python_file()
    if norm is None:
        return
    worst = worst_function(norm)
    if worst is None:
        return
    name, score = worst
    previous = swap_cache_entry(norm, score)
    if previous is None or score <= previous or score <= WARN:
        return
    message = (f"lean complexity-watch: {norm} got more complex after this edit — "
               f"worst function is {name}() at cyclomatic complexity {score}, "
               f"was {previous}, warn threshold {WARN}. "
               f"Simplify now or say why the branch is load-bearing.")
    print(json.dumps({"hookSpecificOutput": {
        "hookEventName": "PostToolUse",
        "additionalContext": message}}))


try:
    run()
except Exception:
    pass
