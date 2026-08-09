---
name: devops
description: >
  Write and debug infrastructure YAML — Kubernetes manifests, GitHub Actions
  workflows, docker-compose, Helm values, CI pipelines — and triage them at
  runtime. Use when authoring or fixing a manifest, workflow, pipeline, or
  compose file, when a deploy, pod, job, or build is failing, and on "pod is
  crashlooping", "workflow won't trigger", "image pull error", "yaml won't
  parse", "why did the pipeline fail". Not for application code.
license: MIT
---

# DevOps

Two jobs: write YAML that means what it looks like, and find why the running
thing is broken.

## YAML that parses is not YAML that is correct

Every trap below is valid syntax that parses to the wrong *type*. The parser
will not warn you; the deploy will.

| You wrote | It becomes | Fix |
|---|---|---|
| `python-version: 3.10` | float `3.1` | quote it: `"3.10"` |
| `- NO` (country code) | boolean `false` | quote it: `"NO"` |
| `retries: 08` | invalid octal / `8` | quote or drop the zero |
| `at: 12:30` | `750` (sexagesimal) | quote it |
| `value:` (nothing) | `null`, not `""` | write `""` if you mean empty |
| tab for indentation | parse error | spaces only, always |

**The rule that covers all of them:** if it is a string but looks like a
number, a boolean, a version, or a time — quote it.

Two more that bite in real pipelines: duplicate keys silently take the last
value in most parsers, and `|` keeps newlines while `>` folds them to spaces
(`|-` strips the trailing newline, `|+` keeps it). Getting that backwards in a
script block is a whole afternoon.

## Never hand-verify a manifest

Reading YAML back to yourself confirms nothing. Run the real parser:

```
docker compose config                    # resolves vars, merges, prints final
kubectl apply --dry-run=server -f x.yaml # server-side, catches schema + admission
kubectl explain deployment.spec.template # the authoritative field reference
yq '.' file.yaml                         # does it parse, and to what
actionlint                               # GitHub Actions, catches bad exprs
helm template . | kubectl apply --dry-run=server -f -
```

`--dry-run=server` over `=client`: client only checks shape, server checks the
actual schema, admission webhooks, and quotas. Most real failures are
server-side.

## Debugging: go down a layer, don't go sideways

The summary line is never the error. Find the real one, then check the layer
beneath the failure — not another config knob at the same level.

1. **Reproduce**, and know whether it is every time or intermittent. Intermittent
   means resources, races, or one bad replica — not syntax.
2. **Read the actual error.** `kubectl describe` events and previous-container
   logs, not the dashboard status.
3. **Shrink it.** Smallest manifest or single job step that still fails.
4. **Change one thing.** Two changes and a pass tells you nothing.

State what you actually observed before proposing a fix. A confident guess at a
deploy failure costs an outage.

## Details

- Runtime triage — CrashLoopBackOff, ImagePullBackOff, Pending, OOMKilled,
  workflow-not-triggering, and the commands for each: `references/triage.md`
- Manifest defaults worth setting every time (limits, probes, security context,
  pinned tags): `references/manifest-defaults.md`

Read the one that matches what you are doing.

## Boundaries

`guardrails` still applies: no unpinned versions — that includes container
image tags (`:latest` is the same defect as `>=`) and unpinned GitHub Actions.
Never print or commit a secret value; reference it from a secret store. Cluster
mutations (`apply`, `delete`, `scale`, `rollout undo`) against anything not
clearly local get confirmed first.
