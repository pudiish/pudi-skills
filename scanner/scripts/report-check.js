#!/usr/bin/env node
// PreToolUse hook for Write/Edit/NotebookEdit — enforces the two build-report
// constraints that are mechanically checkable: a generated report dashboard
// makes zero network requests, and no artifact outside a fixture corpus
// carries an intact credential pattern. Exit 2 + stderr = block.

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    process.exit(0);
  }

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || "";
  const content = extractContent(input.tool_name, toolInput);

  if (!filePath || content == null) process.exit(0);

  const violations = [];
  if (isGeneratedReport(filePath)) checkSelfContained(content, violations);
  if (!holdsTestData(filePath)) checkIntactSecret(content, violations);

  if (violations.length > 0) {
    process.stderr.write(
      "scanner report-check violation — blocked:\n" +
        violations.map((v) => "  - " + v).join("\n") +
        "\n"
    );
    process.exit(2);
  }
  process.exit(0);
});

function extractContent(toolName, toolInput) {
  if (toolName === "Write") return toolInput.content;
  if (toolName === "Edit") return addedLines(toolInput.old_string, toolInput.new_string);
  if (toolName === "NotebookEdit") return toolInput.new_source;
  return null;
}

// Only lines an edit genuinely adds get checked. Scanning new_string raw would
// re-block every edit to a dashboard that already carries a remote tag, making
// the file permanently uneditable — including the edit that would remove it.
function addedLines(oldString, newString) {
  if (typeof newString !== "string") return null;
  if (typeof oldString !== "string") return newString;
  const existing = new Set(oldString.split("\n").map((line) => line.trim()));
  return newString
    .split("\n")
    .filter((line) => !existing.has(line.trim()))
    .join("\n");
}

// Scoped by path so ordinary web work is untouched: only files that are
// already, by convention, generated scan output. Both patterns anchor with
// (^|/) because Claude writes repo-relative paths far more often than absolute
// ones — requiring a leading slash silently skipped `reports/index.html` and
// `dashboard.html`, the two most likely paths of all.
function isGeneratedReport(filePath) {
  const norm = filePath.replace(/\\/g, "/").toLowerCase();
  if (!norm.endsWith(".html")) return false;
  if (/(^|\/)[a-z0-9-]*reports?\//.test(norm)) return true;
  return /(^|\/)(dashboard|report|summary|scan-report|quality-report)\.html$/.test(norm);
}

// Where deliberately fake credentials legitimately live. Test directories are
// exempt alongside fixtures because a secret check that blocks its own test
// suite cannot be tested, and a hook nobody can test gets uninstalled. This is
// a real widening of the hole: a genuine key pasted into test/ is not caught
// here, and CI secret scanning remains the actual backstop.
function holdsTestData(filePath) {
  return /(^|\/)(fixtures|__fixtures__|testdata|tests?|__tests__|spec)\//i.test(
    filePath.replace(/\\/g, "/")
  );
}

function checkSelfContained(content, violations) {
  const remote = [
    [/<script[^>]+src\s*=\s*["'](?:https?:)?\/\//i, "<script src> pointing off-host"],
    [/<link[^>]+href\s*=\s*["'](?:https?:)?\/\//i, "<link href> pointing off-host"],
    [/<img[^>]+src\s*=\s*["'](?:https?:)?\/\//i, "<img src> pointing off-host"],
    [/@import\s+(?:url\()?["']?(?:https?:)?\/\//i, "@import of a remote stylesheet"],
    [/url\(\s*["']?(?:https?:)?\/\/[^)]/i, "css url() pointing off-host"],
    [/\bfetch\s*\(\s*["'](?:https?:)?\/\//i, "fetch() to a remote URL"],
    [/\bnew\s+XMLHttpRequest\b/, "XMLHttpRequest in a report that must open offline"],
  ];
  for (const [pattern, label] of remote) {
    if (pattern.test(content)) {
      violations.push(
        `${label} — the dashboard is one self-contained file, zero network requests (build-report constraint 1)`
      );
    }
  }
}

// Pattern-certain credentials only. Heuristics belong in the scanner's security
// analyzer, where a false positive costs a finding; here it would cost a write.
function checkIntactSecret(content, violations) {
  // AWS publishes placeholder key ids that end in EXAMPLE. A value AWS prints
  // in its own docs is not a credential, and blocking it makes every security
  // note that quotes those docs unwritable.
  const keyIds = content.match(/\bAKIA[0-9A-Z]{16}\b/g) || [];
  if (keyIds.some((keyId) => !keyId.endsWith("EXAMPLE"))) {
    violations.push(
      "intact AWS access key id pattern — mask it (first/last 3 chars) or split the literal; only a fixture corpus holds intact patterns"
    );
  }
  if (/-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/.test(content)) {
    violations.push(
      "private-key header in a non-fixture file — never commit key material, masked or not"
    );
  }
}
