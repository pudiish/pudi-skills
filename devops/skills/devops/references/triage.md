# Runtime triage

Symptom → the command that actually tells you → what it usually is.

## Kubernetes pods

| Symptom | Look here first | Usual cause |
|---|---|---|
| `CrashLoopBackOff` | `kubectl logs <pod> --previous` | app exits on boot: missing env/config, failed migration, bad command |
| `ImagePullBackOff` | `kubectl describe pod` events | wrong tag, private registry with no imagePullSecret, wrong arch |
| `Pending` | `kubectl describe pod` events | unschedulable: no node fits requests, no matching taint toleration, unbound PVC |
| `OOMKilled` (exit 137) | `kubectl describe pod` last state | memory limit below real usage, or a leak |
| `Running` but failing traffic | `kubectl get endpoints <svc>` | selector does not match pod labels — endpoints list is empty |
| Restarts, no crash | readiness/liveness probe config | liveness probe too aggressive, killing a healthy slow starter |
| `CreateContainerConfigError` | `kubectl describe pod` | referenced ConfigMap or Secret key does not exist |

`--previous` is the one people forget: on a crashloop the current container has
no logs yet, and the interesting output is in the container that already died.

Empty endpoints is the single most common "the deploy worked but nothing
works": `spec.selector` in the Service must match `spec.template.metadata.labels`
in the Deployment, not the Deployment's own labels.

## GitHub Actions

| Symptom | Cause |
|---|---|
| Workflow does not trigger at all | file not on the default branch yet; `on:` filters exclude the event; workflow file has a parse error (check the Actions tab, not the diff) |
| Skipped on a fork PR | `pull_request` from a fork gets no secrets by design |
| `if:` never fires | expression is a string — `if: ${{ github.ref == 'refs/heads/main' }}` |
| Passes locally, fails on runner | runner image tools differ; a step's `working-directory` is not inherited |
| Cache never hits | key includes something that changes every run |
| Job cannot see a previous job's file | separate runners — use artifacts, not the filesystem |

Matrix values hit the version-float trap hard: `python-version: [3.10, 3.11]`
becomes `[3.1, 3.11]`. Quote every entry.

## docker-compose

- `docker compose config` first — it resolves `.env`, `extends`, and overrides
  and prints what will actually run. Most compose bugs are visible right there.
- Container-to-container traffic uses the **service name** and the container
  port, never `localhost` and never the published host port.
- A bind mount over a directory the image populated hides the image's copy;
  empty `node_modules` is almost always this.
- `depends_on` waits for start, not for ready. Needs a healthcheck plus
  `condition: service_healthy`, or app-level retry.

## Terraform

- Read the plan's `-/+` and `destroy` lines before anything else; a forced
  replacement of a stateful resource is the expensive mistake.
- Drift means someone changed it by hand. Import or fix the source — never
  `-target` your way around it as a habit.
- State is the source of truth and it holds secrets in plaintext: remote
  backend, encrypted, locked.
