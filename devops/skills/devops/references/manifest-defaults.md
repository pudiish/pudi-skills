# Manifest defaults

Set these unless there is a reason not to. Each one exists because its absence
has caused a specific, common outage.

## Kubernetes workloads

- **Image tag pinned to a digest or an immutable tag.** `:latest` means the
  pod that reschedules at 3am is not the pod you tested. This is `guardrails`
  rule 7 applied to containers.
- **Resource requests and limits on every container.** No requests means the
  scheduler assumes zero and overpacks the node. Memory limit without a request
  is worse than neither.
- **Readiness and liveness probes, with different settings.** Readiness gates
  traffic; liveness restarts. A liveness probe as aggressive as a readiness
  probe turns a slow start into a restart loop. Slow starters get a
  `startupProbe` instead of a longer liveness delay.
- **`securityContext`:** `runAsNonRoot: true`, `allowPrivilegeEscalation:
  false`, `readOnlyRootFilesystem: true` where the app tolerates it.
- **A PodDisruptionBudget** for anything with more than one replica, or a node
  drain takes the whole service down at once.
- **Explicit `strategy`.** The default RollingUpdate is usually right; know
  that it is what you are getting.
- **Secrets by reference** — `secretKeyRef`, never a literal in the manifest.
  A base64 value in a committed manifest is a plaintext secret with extra steps.

## GitHub Actions

- **Pin actions by commit SHA**, not a tag. Tags are mutable; a moved tag is
  a supply-chain change you did not review.
- **Least-privilege `permissions:`** at the workflow root. The default token is
  broader than a build needs.
- **`concurrency:` with `cancel-in-progress`** on PR workflows so pushes do not
  queue up runners.
- **`timeout-minutes` on every job.** The default is six hours of a hung job
  burning minutes.
- Never interpolate untrusted input (`github.event.pull_request.title`, branch
  names) directly into a `run:` block — that is shell injection. Pass it
  through `env:` and quote the variable.

## docker-compose

- Pin image tags; add a `healthcheck` to anything another service depends on.
- Keep secrets in `.env` or a secret store, never inline in the compose file,
  and keep `.env` gitignored.
- Name volumes explicitly so a `down -v` is a decision rather than a surprise.
