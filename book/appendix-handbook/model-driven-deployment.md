<!-- GENERATED from book/latex/sources/appendix-handbook/model-driven-deployment.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

## Problem

A service can know a dependency’s URL and still be unable to call it. DocAble’s deployment failure illustrates the problem: service addresses are wired without the corresponding invocation grants. Calls reach the cloud authorization boundary and fail before application code runs. Repairing one missing grant restores one call; deriving wiring and permissions from connected representations gives later changes a way to preserve their agreement.

## Conceptual Design

[ref:handbook-derived-iam] shows the arrangement to construct. Follow the current deployment dependency map through environment-specific identity, grant planning, and application results. The typed architectural model is checked against that map while it remains a verified mirror. The figure keeps this correspondence relationship separate from the cloud permissions that actually admit calls.

<!-- label: handbook-derived-iam -->
<!-- figure: assets/handbook-derived-iam.svg | *Model-driven deployment with explicit authority boundaries.* The current dependency map and environment configuration supply a grant plan; application reports each binding’s result, while cloud IAM enforces installed permissions. The typed call model remains a verified mirror checked against the map. Service-name correspondence checks a different property. [short: Model-driven deployment] -->

Consider the accessibility-quality service calling DocAble’s GenAI service. The architectural model declares the invocation and its authentication requirements, and a parity check compares that declaration with the deployment dependency map. The dependency map supplies the GenAI service’s address in the selected environment. Runtime-identity configuration identifies the principal under which accessibility-quality executes. Joining the deployment dependency to that principal and the deployed GenAI service name produces the invocation-grant plan. Deployment must install the grant; its application result and a call accepted by the cloud authorization boundary provide different evidence. A correct URL without the grant reproduces the original failure.

## Engineering Models {#handbook-model-service-flow}

Shared service identities connect the architectural contract, deployment configuration, runtime identity, and derived grant plan. These representations supply different facts to different consumers. The architectural contract describes intended communication; deployment configuration supplies environment-specific endpoints; runtime identity identifies the principal presented to cloud authorization; and the grant plan specifies the permissions to install. [ref:handbook-deployment-models] identifies the engineering question and consumer for each representation.

<!-- label: handbook-deployment-models -->
<!-- table: *Engineering models for deployment.* Shared service identities connect intended calls, deployed endpoints, and runtime principals. The derived grant plan specifies permissions; separate evidence checks correspondence and application. [short: Engineering models for deployment] -->
| **Model** | **Engineering question** | **Representation** | **Relationships / consumers** |
|---|---|---|---|
| Service architecture | Which services may call which APIs? | Typed caller–callee edges, API identities, authentication obligations. | Shared service identities connect intended calls to deployment facts; parity checks compare declarations. |
| Deployment dependencies | Which deployed endpoints must be wired? | Environment-scoped service names, dependency relationships, URL configuration. | Deployment consumes the map; the planner resolves each logical callee to its deployed resource. |
| Runtime identity | Under which principal does each caller execute? | Service-to-principal mapping for the selected environment. | Joins a logical caller to the identity used by cloud authorization. |
| Grant plan | Which concrete permissions are required? | Derived principal–callee–role bindings, retaining logical callers. | Application consumes the plan; results and authorization probes provide different evidence about its effects. |

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

The architectural contract states which calls are intended; the deployment map supplies the configuration actually used. The grant planner consumes the existing dependency map, not the typed call-edge model. It joins the map with runtime identities to derive concrete permissions. When the contract and deployment map disagree, a correspondence check identifies the discrepancy, but an engineer must decide which declaration to change. A correct derivation does not establish that the resulting permission is installed.

The model leaves service algorithms and internal organization open while fixing the communication and authorization relationships needed for deployment. A component name identifies a logical service; a runtime principal identifies an actor at the authorization boundary. If several services share one principal, the derived permission is shared too. Neither a detailed architecture nor a correct join can provide isolation absent from the runtime identity arrangement.

## Realization

### Derive and Apply Permissions {.unnumbered}

For each selected caller, the grant planner resolves its runtime service account and environment-scoped callee, then constructs a `roles/run.invoker` binding. Application deduplicates bindings by principal and callee while retaining the logical callers in its report. DocAble’s configuration uses a shared runtime service account, so several logical callers can produce the same concrete binding. The model does not provide per-service isolation that the deployment lacks.

Separate planning from attempting the external effect. A deterministic planner can be exercised without cloud access; an application component needs credentials, a target environment, and a policy for failed operations.

For each attempted binding, retain the callee, runtime principal, logical callers, application status, and diagnostic detail. Distinguish a dry run, successful application, and failed application. These results describe the attempt to install a permission; a live authorization check supplies separate evidence about its effect. Cloud IAM enforces the installed permission.

### Construct the Path and Transfer Authority {.unnumbered}

Construction begins with the deployed arrangement. The existing configuration identifies which resources supply URL wiring, service names, and runtime identities. Each intended call needs a stable identity and an authentication obligation. Similar names do not establish that a service address, runtime principal, and permission describe the same relationship.

The typed model can initially serve as a verified mirror. Its projection is compared with the maintained deployment map, and discrepancies require reconciliation. DocAble’s parity check detects a missing dependency edge, but cannot decide which declaration is correct.

Once correspondence is established, the grant planner joins the dependency with runtime identity and deployed service name. The resulting plan is deterministic and can be inspected before application. Deduplicated bindings retain their logical callers, making it possible to examine whether shared credentials grant broader authority than intended.

Application occurs after the named service resources exist. DocAble reports failed grants for subsequent repair rather than rolling back the promoted fleet. Reapplying an idempotent grant can restore a manually revoked binding. A different deployment process could block promotion, but would need an explicit gate and tests for that policy.

Authority transfers only when the relevant consumers use the model-derived representation. Until then, correspondence checks must connect the two declarations. Retiring the duplicate literal completes the migration and avoids leaving two competing sources of authority.

### Verify the Arrangement {.unnumbered}

Test the pure derivation with more than the successful example. Two callers sharing a principal and callee should produce one concrete application with both callers retained as reasons. A caller excluded from the selected deployment should not silently broaden the plan. A missing architectural edge should be detected by the correspondence check. A failed external command should remain a failed result, and a dry run should not be reported as an installed permission. These checks establish different contracts and should retain different diagnostics.

Live observations require their own scope and freshness. DocAble’s service-name investigation compares declared names with a snapshot of deployed services and exposes discrepancies requiring reconciliation. The initial check is advisory while those discrepancies are examined. Name-set parity can expose missing or undeclared services, but it does not inspect IAM bindings. Even agreement can preserve an undesirable deployment arrangement if the declaration itself is wrong.

For an analogous deployment, choose evidence for the question actually being accepted. A unit test can check the planned binding, the application result can report whether the command succeeded, and a suitable live authorization probe can examine whether a selected call is admitted or refused. The blueprint does not make those observations interchangeable. Record the environment and observation time so that yesterday’s successful probe cannot silently stand for today’s deployment.

## Adaptation and Limits {#handbook-maintaining-coherence}

The arrangement generalizes to other permissions derived from architectural relationships, including network policies, database privileges, and message-broker access. Its applicability depends on stable identities connecting intended communication to deployed resources and runtime principals. The principal limitation is that a correct permission plan does not establish its installation or enforcement. Those require evidence at the corresponding operational boundary. If existing configuration is already authoritative and economical to maintain, a checked analytical view may be sufficient; migration to a new source of authority needs a benefit of its own.

Generated configuration introduces another correspondence obligation: the artifact consumed must match the current model. DocAble’s Dockerfile generator has a blocking check that regenerates each file’s contents and compares them with the committed version. Its generated allowlists for document-format access illustrate the remaining risk: the C# checks consume the generated JSON, but the inspected arrangement has no equivalent regeneration-and-comparison gate for that file. A checker can therefore enforce a stale allowance correctly. For a generated artifact, connect its model, generator, freshness check, and actual consumer; checking that the consumer reads the file does not establish that the file is current.
