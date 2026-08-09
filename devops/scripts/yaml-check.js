#!/usr/bin/env node
// PreToolUse hook for Write/Edit — catches YAML that parses fine and means the
// wrong thing. A linter or the parser itself will not flag any of these: they
// are valid YAML, just the wrong type. Exit 2 + stderr = block.
//
// The addedLines helper is duplicated from the other plugins' hooks on purpose.
// Each plugin has to install and run on its own, so a shared module would
// couple them; eight lines is the cheaper of the two costs.

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

  if (!/\.ya?ml$/i.test(filePath) || content == null) process.exit(0);

  const violations = [];
  const warnings = [];
  checkTypeTraps(content, violations, warnings);
  checkMutableImageTag(content, violations);

  if (violations.length > 0) {
    process.stderr.write(
      "devops yaml-check — blocked (valid YAML, wrong meaning):\n" +
        violations.map((violation) => "  - " + violation).join("\n") +
        "\n"
    );
    process.exit(2);
  }
  if (warnings.length > 0) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: "devops yaml-check: " + warnings.join(" "),
        },
      })
    );
  }
  process.exit(0);
});

function extractContent(toolName, toolInput) {
  if (toolName === "Write") return toolInput.content;
  if (toolName === "Edit") return addedLines(toolInput.old_string, toolInput.new_string);
  return null;
}

function addedLines(oldString, newString) {
  if (typeof newString !== "string") return null;
  if (typeof oldString !== "string") return newString;
  const existing = new Set(oldString.split("\n").map((line) => line.trim()));
  return newString
    .split("\n")
    .filter((line) => !existing.has(line.trim()))
    .join("\n");
}

// An unquoted two-part number under a version key is the single most expensive
// YAML bug there is: `python-version: 3.10` is the float 3.1, so CI silently
// runs 3.1 — or fails to find it — while the diff still reads "3.10".
function checkTypeTraps(content, violations, warnings) {
  let underVersionKey = false;
  for (const line of content.split("\n")) {
    if (/^[ ]*\t/.test(line)) {
      violations.push("tab used for indentation — YAML forbids tabs, use spaces");
      continue;
    }

    const keyed = line.match(/^\s*([A-Za-z0-9_.-]*[Vv]ersion[A-Za-z0-9_.-]*)\s*:\s*(.*?)\s*$/);
    if (keyed) {
      const value = keyed[2].replace(/#.*$/, "").trim();
      underVersionKey = value === "";
      // Whole tokens only. Searching for a number anywhere in the value flagged
      // the 3.11 inside "pypy-3.11", which is already quoted and already a
      // string — a false positive found by replaying real workflow files.
      const flowSequence = value.match(/^\[(.*)\]$/);
      for (const token of flowSequence ? flowSequence[1].split(",") : [value]) {
        const bare = token.trim();
        if (/^\d+\.\d+$/.test(bare)) {
          violations.push(
            `${keyed[1]}: ${bare} is a float, not the version "${bare}" — quote it as "${bare}"`
          );
        }
      }
      continue;
    }

    const item = line.match(/^\s*-\s*(.+?)\s*$/);
    if (item) {
      const value = item[1].replace(/#.*$/, "").trim();
      if (underVersionKey && /^\d+\.\d+$/.test(value)) {
        violations.push(`list item ${value} under a version key is a float — quote it as "${value}"`);
      }
      if (/^(no|NO|No|off|Off|OFF|yes|YES|Yes|on|On|ON|y|n|Y|N)$/.test(value)) {
        warnings.push(
          `list item "${value}" parses as a boolean in YAML 1.1 (the Norway problem) — quote it if it is a string.`
        );
      }
      continue;
    }
    if (line.trim() !== "" && !/^\s/.test(line)) underVersionKey = false;
  }
}

// :latest is guardrails rule 7 in container form — the image that reschedules
// at 3am is not the image that was tested.
function checkMutableImageTag(content, violations) {
  for (const line of content.split("\n")) {
    const image = line.match(/^\s*-?\s*image\s*:\s*["']?([^\s"'#]+)["']?/);
    if (!image) continue;
    const reference = image[1];
    if (reference.includes("{{") || reference.includes("${")) continue;
    if (/:latest$/.test(reference) || !/[:@]/.test(reference.split("/").pop())) {
      violations.push(
        `image "${reference}" has no immutable tag — pin a version or digest (guardrails rule 7 for containers)`
      );
    }
  }
}
