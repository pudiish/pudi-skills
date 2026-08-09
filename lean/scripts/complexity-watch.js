#!/usr/bin/env node
// Runs complexity-watch.py, which needs python3 on PATH. Claude Code ships
// Node, so this wrapper always runs; python3 is the part that may be absent —
// on a stock Windows box, or a Mac without the Xcode command line tools.
//
// Invoking python3 directly from hooks.json exits 127 there, and a PostToolUse
// hook's failure is invisible: the write already happened, so the user gets no
// complexity warnings and no indication the hook is dead. This says so once
// per session instead, then stays quiet.

const { spawnSync } = require("node:child_process");
const { existsSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const NOTICE_MARKER = join(tmpdir(), "lean-python3-missing-notice");
const analyzer = join(__dirname, "complexity-watch.py");

let payload = "";
process.stdin.on("data", (chunk) => (payload += chunk));
process.stdin.on("end", () => {
  // Every path below exits 0. This hook warns; it must never fail a write.
  for (const interpreter of ["python3", "python"]) {
    const result = spawnSync(interpreter, [analyzer], { input: payload, encoding: "utf8" });
    // ENOENT means this interpreter is absent — try the next name. Any other
    // outcome means it ran, and its own fail-open handling has already applied.
    if (result.error && result.error.code === "ENOENT") continue;
    if (result.stdout) process.stdout.write(result.stdout);
    process.exit(0);
  }
  reportMissingInterpreter();
  process.exit(0);
});

// Said once per session, not on every edit: a repeated warning about a warning
// is worse than the silence it replaces.
function reportMissingInterpreter() {
  if (existsSync(NOTICE_MARKER)) return;
  try {
    writeFileSync(NOTICE_MARKER, "");
  } catch {
    return; // Can't track that we spoke, so don't speak — silence beats a loop.
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext:
          "lean complexity-watch is inactive: no python3 on PATH. The hook " +
          "measures Python complexity with the stdlib ast module and needs an " +
          "interpreter. Install python3, or uninstall lean's hook if you don't " +
          "write Python. Nothing else in lean is affected.",
      },
    }) + "\n"
  );
}
