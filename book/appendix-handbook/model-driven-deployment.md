<!-- GENERATED from book/latex/sources/appendix-handbook/model-driven-deployment.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

A service can know a dependency’s URL and still be unable to call it. DocAble encountered this failure when deployment wired service addresses without the corresponding invocation grants. Calls reached the cloud authorization boundary and failed before application code ran. Repairing one missing grant restores one call; deriving wiring and permissions from connected representations gives later changes a way to preserve their agreement.

[ref:handbook-derived-iam] shows the arrangement to construct. Follow the current deployment dependency map through environment-specific identity, grant planning, and application results. The typed architectural model is checked against that map while it remains a verified mirror. The figure keeps this correspondence relationship separate from the cloud permissions that actually admit calls.

<!-- label: handbook-derived-iam -->
<!-- figure: assets/handbook-derived-iam.svg | *Model-driven deployment with explicit authority boundaries.* The current dependency map and environment configuration supply a grant plan; application reports each binding’s result, while cloud IAM enforces installed permissions. The typed call model remains a verified mirror checked against the map. Service-name correspondence checks a different property. [short: Model-driven deployment] -->

## Components and Contracts {#handbook-model-service-flow}

The architectural contract identifies an intended caller, callee, API, and authentication obligation. Deployment configuration supplies different facts: the callee’s environment-specific name, its URL wiring, and the principal under which the caller executes. Common service identities join these records. Keeping the representations separate lets the same architectural relation be used across environments without embedding every deployed name in the call model.

This actual call declaration connects DocAble’s accessibility-quality service to its GenAI service. The referenced authentication contract specifies the transport, token-audience requirement, and need for an invocation grant.

<!-- print-keep-with-next: 14 -->

``` text
SyncEdge(
    caller=ComponentName("accessibility-quality-service"),
    callee=ComponentName("genai-service"),
    callee_api=ApiEntityName("genai-service-complete"),
    callee_url_env=EnvVarName("ADA_TOOL_GENAI_SERVICE_URL"),
    auth=_SOA_IAM_AUTH,
    url_seam=UrlSeam.DOWNSTREAM_URL_DEPS,
    expected_status=_SOA_STATUS_BASELINE,
),
```

The inspected grant planner consumes the existing deployment dependency map, not this edge declaration directly. For each selected caller it resolves the runtime service account and each environment-scoped callee, then constructs a command granting `roles/run.invoker`. Application deduplicates by principal and callee while retaining all logical callers in its report. DocAble’s inspected configuration uses a shared runtime service account, so several logical callers can collapse to the same concrete binding. The model does not provide per-service isolation that the deployment lacks.

Separate planning from attempting the external effect. A deterministic planner can be exercised without cloud access; an application component needs credentials, a target environment, and a policy for failed operations. DocAble retains the following result for each distinct binding:

<!-- print-keep-with-next: 11 -->

``` text
class DownstreamGrantResult(NamedTuple):
    callee: str
    member_sa: str
    callers: tuple[str, ...]
    status: str  # GRANTED / DRY-RUN / FAILED: <detail>
    detail: str
```

A dry run reports the intended command without applying it. A successful command records `GRANTED`; a nonzero result records `FAILED` and diagnostic detail. This result describes the application attempt. It is different from a later inspection of the live IAM binding or an authorized call through the deployed system. Cloud IAM, rather than the planning record, enforces the installed permission.

## Construct the Path Before Transferring Authority

**Begin with the deployed arrangement.** Identify the configuration that currently drives URL wiring, service naming, and runtime identity. Give the selected call a stable identity and write down the authentication obligation. An address, a principal, and an intended permission must not be inferred from one another merely because their names resemble each other. Keep unrelated services outside the first migration.

**Introduce a verified mirror.** Express the selected relationships in a typed model and project them into the form the current consumer expects. Compare that projection with the existing configuration. DocAble’s parity test requires the projected dependency map to equal the maintained deployment map; an injected missing edge checks that disagreement is detected. While both declarations exist, this comparison carries the correspondence obligation. It does not decide which declaration is correct when they disagree.

**Derive and inspect the plan.** Join the dependency to runtime identity and the deployed callee name. Keep the derivation deterministic, retain the logical callers behind a deduplicated binding, and expose a dry-run result. Review whether the resulting principal is as narrow as the intended architectural permission. A precise logical edge cannot compensate for an unnecessarily broad shared credential.

**Exercise application and repair.** Apply grants only after the named service resources exist. Define what the caller of the application component must do with a failed result. DocAble runs grant application after the fleet deployment loop. Failed grants are reported for fix-forward repair; they do not unwind the promoted fleet. Reapplying the idempotent grant on a later deployment can restore a manually revoked binding. An analogous system may instead block promotion, but that is a different policy that must be implemented and tested, not inferred from the existence of a grant plan.

**Transfer authority deliberately.** Once the model’s consumers and checks are dependable, migrate the relevant consumer to the model-derived view and retire the duplicate literal. This is the reusable construction sequence. In the inspected DocAble source, the edge model still declares itself a verified mirror and retirement of the old deployment literal remains a later step. Calling that transfer complete would misstate the implemented arrangement.

## Verify Distinct Failure Paths

Test the pure derivation with more than the successful example. Two callers sharing a principal and callee should produce one concrete application with both callers retained as reasons. A caller excluded from the selected deployment should not silently broaden the plan. A missing architectural edge should be detected by the correspondence check. A failed external command should remain a failed result, and a dry run should not be reported as an installed permission. These checks establish different contracts and should retain different diagnostics.

Live observations require their own scope and freshness. DocAble separately compares declared service names with a stored snapshot of the deployed fleet. An August 2026 investigation found 49 deployed names across production and staging against 28 names in the declared set. The resulting comparison began in advisory mode while discrepancies were reconciled. Name-set parity can expose an undeclared or missing service; it does not inspect IAM bindings. Even equality can preserve an undesirable naming arrangement if the declaration itself is wrong.

For an analogous deployment, choose evidence for the question actually being accepted. A unit test can check the planned binding, the application result can report whether the command succeeded, and a suitable live authorization probe can examine whether a selected call is admitted or refused. The blueprint does not make those observations interchangeable. Record the environment and observation time so that yesterday’s successful probe cannot silently stand for today’s deployment.

## Adapt the Authority Boundary {#handbook-maintaining-coherence}

The reusable interface is a relation between intended communication, deployed identity, and concrete permission. Another system might derive network policy, database privileges, or message-broker access through the same arrangement. Choose stable join keys, preserve the distinction between a plan and its effects, and state the failure response at the application boundary. If existing configuration is already authoritative and economical to maintain, a checked analytical view may be sufficient; migration to a new source of authority needs a benefit of its own.
