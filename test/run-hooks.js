#!/usr/bin/env node
// Runs every case in cases.jsonl against the real hook scripts and checks the
// exit code. The plugins' whole claim is "exit 2 is not probabilistic" — that
// claim is worth nothing untested, and every defect this suite was born from
// was a hook silently passing something it was written to block.

const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const scripts = {
  guardrails: join(root, "guardrails", "scripts", "policy-check.js"),
  scanner: join(root, "scanner", "scripts", "report-check.js"),
  devops: join(root, "devops", "scripts", "yaml-check.js"),
};

const cases = readFileSync(join(__dirname, "cases.jsonl"), "utf8")
  .split("\n")
  .filter((line) => line.trim() && !line.trim().startsWith("//"))
  .map((line) => JSON.parse(line));

const failures = [];
for (const testCase of cases) {
  const toolInput = { file_path: testCase.path };
  if (testCase.old === undefined) {
    toolInput.content = testCase.content;
  } else {
    toolInput.old_string = testCase.old;
    toolInput.new_string = testCase.new;
  }
  const payload = JSON.stringify({
    tool_name: testCase.old === undefined ? "Write" : "Edit",
    tool_input: toolInput,
  });

  // spawnSync reports the exit code and stderr for a success as well as a
  // failure, which an audit case needs — it exits 0 and still must have spoken.
  // A case's `env` carries the hook's mode switches; the parent env is dropped
  // so a mode exported in the developer's shell cannot change the result.
  const run = spawnSync("node", [scripts[testCase.hook]], {
    input: payload,
    env: { PATH: process.env.PATH, ...(testCase.env || {}) },
  });
  const exitCode = run.status;
  const stderr = run.stderr.toString();

  const expected = testCase.expect === "block" ? 2 : 0;
  // An exit-0 case may still assert on the report text; that is the only way
  // audit mode ("reports but does not block") is distinguishable from silence.
  const reportedOk = !testCase.stderrHas || stderr.includes(testCase.stderrHas);
  const passed = exitCode === expected && reportedOk;
  if (!passed) failures.push({ testCase, exitCode, expected, stderr, reportedOk });
  process.stdout.write(
    `${passed ? "ok  " : "FAIL"} [${testCase.hook}] ${testCase.why}\n`
  );
}

process.stdout.write(`\n${cases.length - failures.length}/${cases.length} passed\n`);
for (const failure of failures) {
  process.stdout.write(
    `  FAIL ${failure.testCase.why}\n` +
      `       path=${failure.testCase.path} expected exit ${failure.expected}, got ${failure.exitCode}\n`
  );
  if (!failure.reportedOk) {
    process.stdout.write(
      `       expected stderr to contain ${JSON.stringify(failure.testCase.stderrHas)}\n` +
        `       got: ${JSON.stringify(failure.stderr.trim())}\n`
    );
  }
}
process.exit(failures.length === 0 ? 0 : 1);
