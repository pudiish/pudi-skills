#!/usr/bin/env node
// Checks that every plugin the marketplace advertises is actually installable:
// the source directory exists, the manifest parses, the names agree, and every
// skill has frontmatter Claude can match on. A hook suite cannot catch any of
// this — a typo'd path or an unparseable manifest fails at install time, on a
// user's machine, with no test in this repo that would have gone red first.

const { existsSync, readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");

const root = join(__dirname, "..");
const problems = [];

function check(condition, message) {
  if (!condition) problems.push(message);
}

const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
check(existsSync(marketplacePath), "missing .claude-plugin/marketplace.json");
if (problems.length > 0) fail();

let marketplace;
try {
  marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
} catch (error) {
  problems.push(`marketplace.json does not parse: ${error.message}`);
  fail();
}

check(Array.isArray(marketplace.plugins), "marketplace.json has no plugins array");
if (problems.length > 0) fail();

for (const entry of marketplace.plugins) {
  const label = entry.name || "(unnamed entry)";
  check(entry.name, "a marketplace entry has no name");
  check(entry.source, `${label}: no source`);
  if (!entry.source) continue;

  const pluginDir = join(root, entry.source);
  if (!existsSync(pluginDir)) {
    problems.push(`${label}: source ${entry.source} does not exist`);
    continue;
  }

  const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) {
    problems.push(`${label}: no .claude-plugin/plugin.json`);
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    problems.push(`${label}: plugin.json does not parse: ${error.message}`);
    continue;
  }

  // A mismatch here installs one plugin under another's name.
  check(
    manifest.name === entry.name,
    `${label}: plugin.json name "${manifest.name}" != marketplace name "${entry.name}"`
  );
  check(
    manifest.version === entry.version,
    `${label}: plugin.json version "${manifest.version}" != marketplace version "${entry.version}"`
  );
  check(manifest.description, `${label}: plugin.json has no description`);

  checkSkills(label, pluginDir);
  checkHooks(label, pluginDir);
}

// Claude selects a skill by matching its description, so a skill missing
// frontmatter is dead weight that never fires and never errors either.
function checkSkills(label, pluginDir) {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) return;
  for (const skillName of readdirSync(skillsDir)) {
    const skillFile = join(skillsDir, skillName, "SKILL.md");
    if (!existsSync(skillFile)) {
      problems.push(`${label}/${skillName}: no SKILL.md`);
      continue;
    }
    const body = readFileSync(skillFile, "utf8");
    if (!body.startsWith("---\n")) {
      problems.push(`${label}/${skillName}: SKILL.md has no frontmatter block`);
      continue;
    }
    const frontmatter = body.slice(4, body.indexOf("\n---", 4));
    const declaredName = frontmatter.match(/^name:\s*(\S+)/m);
    check(declaredName, `${label}/${skillName}: SKILL.md frontmatter has no name`);
    check(
      !declaredName || declaredName[1] === skillName,
      `${label}/${skillName}: frontmatter name "${declaredName && declaredName[1]}" != directory name`
    );
    check(
      /^description:/m.test(frontmatter),
      `${label}/${skillName}: SKILL.md frontmatter has no description`
    );
  }
}

// A hooks.json naming a script that isn't there fails silently at runtime:
// the write it was meant to block just goes through.
function checkHooks(label, pluginDir) {
  const hooksPath = join(pluginDir, "hooks", "hooks.json");
  if (!existsSync(hooksPath)) return;
  let hooks;
  try {
    hooks = JSON.parse(readFileSync(hooksPath, "utf8"));
  } catch (error) {
    problems.push(`${label}: hooks.json does not parse: ${error.message}`);
    return;
  }
  const referenced = JSON.stringify(hooks).match(/\$\{CLAUDE_PLUGIN_ROOT\}\/[A-Za-z0-9_./-]+/g) || [];
  for (const reference of referenced) {
    const relative = reference.replace("${CLAUDE_PLUGIN_ROOT}/", "");
    check(
      existsSync(join(pluginDir, relative)),
      `${label}: hooks.json references missing file ${relative}`
    );
  }
}

if (problems.length > 0) fail();
process.stdout.write(`ok   ${marketplace.plugins.length} plugins structurally valid\n`);

function fail() {
  process.stdout.write(`FAIL ${problems.length} structural problem(s)\n`);
  for (const problem of problems) process.stdout.write(`  - ${problem}\n`);
  process.exit(1);
}
