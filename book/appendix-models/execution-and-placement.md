Execution models represent where work runs and which scheduling decisions vary by environment. This
section separates deployment topology from host execution policy so review can identify whether a
change affects placement, connectivity, or scheduling.

**Engineering question.** Where does work run, and which scheduling decisions may change with the
host it runs on?

**Representation.** Use separate views for topology and host policy.

- **Deployment topology** represents where components run and how they connect: web → queue →
  worker → storage.
- **Host execution policy** maps each host profile to a scheduling policy: elastic fan-out, bounded
  fan-out, or serialized execution.

[ref:fig-g4-execution-placement] shows the stable graph with the policy as a separate layer beneath
it.

<!-- label: fig-g4-execution-placement -->
<!-- figure: assets/appendix-g-4-host-execution-policy.svg | *Stable topology, variable execution policy.* Deployment topology represents component placement and connectivity. Host execution policy separately maps host profiles to scheduling behavior, allowing scheduling to vary without changing the topology. -->

**Property.** Deployment topology and host scheduling policy remain separate. A host's concurrency
ceiling is represented in the scheduling policy rather than by changing deployment edges.

**Authority and correspondence.** Deployment configuration reconciles against the topology; scheduler
behavior reconciles against the host execution policy. Either finding may remain advisory or feed a
deployment or scheduler gate.
