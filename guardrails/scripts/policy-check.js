#!/usr/bin/env node
// PreToolUse hook for Write/Edit/NotebookEdit — mechanically enforces the
// rule 7 hard rules from skills/guardrails/SKILL.md regardless of whether the
// skill was triggered by description-matching. Exit 2 + stderr = block.
//
// Two env vars change what happens on a violation, never what counts as one:
//   PUDI_GUARDRAILS=enforce|audit|off   (default enforce)
//   PUDI_GUARDRAILS_PREFERENCE=on|off   (default on)
// See docs/POLICY.md for the tier definitions.

const { existsSync } = require("node:fs");
const { basename, dirname, join } = require("node:path");

const DEPENDENCY_BLOCKS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

// Which tier a rule belongs to decides whether it can be switched off, so the
// tier travels with the violation rather than being inferred from its wording.
const REPRODUCIBILITY = "reproducibility";
const PREFERENCE = "preference";

const MODES = new Set(["enforce", "audit", "off"]);

// A manifest whose ecosystem resolves through a lockfile is reproducible with a
// range in it — `^18.2.0` + package-lock.json installs one exact tree. Pinning
// the manifest instead is wrong for a library: it makes the package
// co-installable with nothing. requirements.txt has no lockfile companion in
// normal practice, so it is absent here and stays strictly pinned.
const MANIFEST_LOCKFILES = {
  "package.json": ["package-lock.json", "npm-shrinkwrap.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"],
  "pyproject.toml": ["poetry.lock", "uv.lock", "pdm.lock", "pixi.lock"],
};

const chunks = [];
process.stdin.on("data", (chunk) => chunks.push(chunk));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    process.exit(0);
  }

  const mode = readMode();
  if (mode === "off") process.exit(0);

  const toolInput = input.tool_input || {};
  const filePath = toolInput.file_path || "";
  const content = extractContent(input.tool_name, toolInput);

  if (!filePath || content == null) process.exit(0);

  const violations = [];
  const isCodeFile = /\.(py|js|jsx|ts|tsx|mjs|cjs)$/i.test(filePath);
  const isDependencyFile = /(requirements.*\.txt|pyproject\.toml|package\.json)$/i.test(filePath);

  if (isCodeFile && preferenceTierEnabled()) {
    checkLeadingUnderscore(content, violations);
    checkMainGuard(content, violations);
    checkDunderAll(content, violations);
  }
  if (isDependencyFile) {
    checkUnpinnedDependency(content, filePath, violations);
  }

  if (violations.length === 0) process.exit(0);

  process.stderr.write(report(violations, filePath, mode));
  // Audit reports the same finding on the same stream and still lets the write
  // through, so a repo can be surveyed before its author opts into enforcement.
  process.exit(mode === "audit" ? 0 : 2);
});

function readMode() {
  const requested = (process.env.PUDI_GUARDRAILS || "enforce").trim().toLowerCase();
  // An unrecognized value must not silently disable enforcement — a typo in
  // `PUDI_GUARDRAILS=audti` would otherwise read as "not enforce".
  return MODES.has(requested) ? requested : "enforce";
}

function preferenceTierEnabled() {
  return (process.env.PUDI_GUARDRAILS_PREFERENCE || "on").trim().toLowerCase() !== "off";
}

function report(violations, filePath, mode) {
  const heading =
    mode === "audit"
      ? `Guardrails audit — ${violations.length} finding(s) in ${filePath}, not blocked:`
      : "Guardrails rule 7 violation — blocked:";
  const lines = violations.map((v) => `  - [${v.tier}] ${v.message}`).join("\n");
  const footer =
    mode === "audit"
      ? "\nRunning in audit mode (PUDI_GUARDRAILS=audit). Unset it to block these.\n"
      : "\n";
  return `${heading}\n${lines}\n${footer}`;
}

function extractContent(toolName, toolInput) {
  if (toolName === "Write") return toolInput.content;
  if (toolName === "Edit") return addedLines(toolInput.old_string, toolInput.new_string);
  if (toolName === "NotebookEdit") return toolInput.new_source;
  return null;
}

// Rule 7 bans names you *create*, but an Edit's new_string carries untouched
// context lines too — only the genuinely added ones get checked.
function addedLines(oldString, newString) {
  if (typeof newString !== "string") return null;
  if (typeof oldString !== "string") return newString;
  const existing = new Set(oldString.split("\n").map((line) => line.trim()));
  return newString
    .split("\n")
    .filter((line) => !existing.has(line.trim()))
    .join("\n");
}

function checkLeadingUnderscore(content, violations) {
  const pattern =
    /\b(?:def|function|class|const|let|var)\s+(_[A-Za-z0-9_]*)\b|(?<![.\w])(_[A-Za-z][A-Za-z0-9_]*)\s*=(?!=)/g;
  const dunderAllowed = new Set(["__init__", "__name__", "__class__", "__main__", "__all__", "__file__", "__dict__", "__doc__"]);
  let match;
  const seen = new Set();
  while ((match = pattern.exec(content)) !== null) {
    const name = match[1] || match[2];
    if (!name || dunderAllowed.has(name)) continue;
    if (name.startsWith("__") && name.endsWith("__")) continue;
    if (!seen.has(name)) {
      seen.add(name);
      violations.push({
        tier: PREFERENCE,
        message: `leading-underscore name created: "${name}" (guardrails rule 7 — no leading-underscore names)`,
      });
    }
  }
}

function checkMainGuard(content, violations) {
  if (/^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m.test(content)) {
    violations.push({
      tier: PREFERENCE,
      message: 'if __name__ == "__main__": block added (guardrails rule 7 — forbidden)',
    });
  }
}

function checkDunderAll(content, violations) {
  if (/^\s*__all__\s*=/m.test(content)) {
    violations.push({
      tier: PREFERENCE,
      message: "__all__ = ... declaration added (guardrails rule 7 — forbidden)",
    });
  }
}

function checkUnpinnedDependency(content, filePath, violations) {
  const lockfiles = MANIFEST_LOCKFILES[basename(filePath).toLowerCase()];
  if (lockfiles && lockfiles.some((name) => existsSync(join(dirname(filePath), name)))) return;
  // Only a manifest that *could* have carried a lockfile gets told about one.
  const fix = lockfiles ? "pin exact versions, or commit a lockfile" : "pin exact versions";

  if (/package\.json$/i.test(filePath)) {
    checkPackageJsonPins(content, fix, violations);
    return;
  }
  // pyproject declares deps as quoted requirement strings inside arrays; the
  // requirement grammar is PEP 508 either way, so both file types share it.
  const isToml = /pyproject\.toml$/i.test(filePath);
  const lines = isToml ? dependencyArrayLines(content) : content.split("\n");
  for (const rawLine of lines) {
    for (const requirement of pythonRequirements(rawLine, isToml)) {
      const problem = unpinnedReason(requirement);
      if (problem) {
        violations.push({
          tier: REPRODUCIBILITY,
          message: `unpinned dependency "${requirement}" — ${problem} (guardrails rule 7 — ${fix})`,
        });
      }
    }
  }
}

// Only the lines inside a dependencies array are requirements. Scanning every
// quoted string in the file would read `name = "my-project"` as a bare package.
function dependencyArrayLines(content) {
  const collected = [];
  let depth = 0;
  let insideDependencyTable = false;
  for (const line of content.split("\n")) {
    // PEP 621 also spells extras as a table, where the keys are group names
    // rather than "dependencies": [project.optional-dependencies] / dev = [...].
    // Matching only `dependencies = [` missed every dependency written that way.
    const tableHeader = depth === 0 && line.match(/^\s*\[([^\]"']+)\]\s*$/);
    if (tableHeader) {
      insideDependencyTable = /(^|\.)(optional-)?dependencies$/.test(tableHeader[1].trim());
      continue;
    }
    const opensHere =
      /^\s*(?:dependencies|.*-dependencies|dev-dependencies)\s*=\s*\[/.test(line) ||
      (insideDependencyTable && /=\s*\[/.test(line));
    if (depth > 0 || opensHere) {
      collected.push(opensHere ? line.slice(line.indexOf("[")) : line);
      depth += (line.match(/\[/g) || []).length - (line.match(/\]/g) || []).length;
      if (depth < 0) depth = 0;
    }
  }
  return collected;
}

function checkPackageJsonPins(content, fix, violations) {
  for (const [name, version] of packageJsonDependencies(content)) {
    if (/^[\^~><]/.test(version) || version === "*" || version === "latest" || version === "") {
      violations.push({
        tier: REPRODUCIBILITY,
        message: `unpinned dependency "${name}": "${version}" in package.json (guardrails rule 7 — ${fix})`,
      });
    }
  }
}

// package.json is JSON, so parse it and read only the dependency maps. A line
// scan cannot tell "jest": "^29.0.0" from "node": ">=18" under engines, and
// engines is in most real package.json files — that made ordinary writes fail.
function packageJsonDependencies(content) {
  try {
    const parsed = JSON.parse(content);
    return DEPENDENCY_BLOCKS.flatMap((block) => Object.entries(parsed[block] || {}));
  } catch {
    // An Edit delivers only added lines, which never parse as JSON. Fall back to
    // tracking the enclosing block by name and skip any entry whose block cannot
    // be determined — missing one beats blocking a legitimate write.
    const found = [];
    let insideDependencies = false;
    for (const line of content.split("\n")) {
      const blockHeader = line.match(/"([A-Za-z]+)"\s*:\s*\{/);
      if (blockHeader) {
        insideDependencies = DEPENDENCY_BLOCKS.includes(blockHeader[1]);
        continue;
      }
      if (/^\s*\}/.test(line)) insideDependencies = false;
      const entry = insideDependencies && line.match(/"([@A-Za-z0-9/_.-]+)"\s*:\s*"([^"]*)"/);
      if (entry) found.push([entry[1], entry[2]]);
    }
    return found;
  }
}

// A requirements.txt line is one requirement; a pyproject line may carry several
// quoted ones. Comments, blank lines, and pip flags (-r, --index-url) are not
// requirements and are dropped here rather than half-matched later.
function pythonRequirements(rawLine, isToml) {
  if (isToml) {
    return [...rawLine.matchAll(/"([^"]+)"|'([^']+)'/g)]
      .map((match) => (match[1] || match[2]).trim())
      .filter((candidate) => /^[A-Za-z0-9]/.test(candidate));
  }
  const line = rawLine.split("#")[0].trim();
  if (!line || line.startsWith("-")) return [];
  return [line];
}

// Returns why the requirement is unpinned, or null when it names an exact
// version. Anything that is not `==`/`===` can resolve differently tomorrow.
function unpinnedReason(requirement) {
  const withoutMarker = requirement.split(";")[0].trim();
  if (!withoutMarker || !/^[A-Za-z0-9]/.test(withoutMarker)) return null;
  if (/\s@\s/.test(withoutMarker)) return "direct URL/VCS reference with no pinned revision";
  if (/===?[^=]/.test(withoutMarker)) {
    return /,/.test(withoutMarker) ? "exact pin combined with a range specifier" : null;
  }
  if (/(>=|<=|~=|!=|\^|>|<)/.test(withoutMarker)) return "range specifier instead of ==";
  if (/^[A-Za-z0-9._-]+(\[[^\]]*\])?$/.test(withoutMarker)) return "no version specified at all";
  return null;
}
