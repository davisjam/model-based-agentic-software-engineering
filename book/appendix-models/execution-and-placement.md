Execution and placement require two related views: where components run and connect, and how a host
schedules their work. Keeping those views separate lets review distinguish changes to topology from
changes to execution policy.

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
<!-- figure: assets/appendix-g-4-host-execution-policy.svg | *Stable topology, variable execution policy.* Deployment topology remains stable while host profiles select different scheduling behavior. -->

**Property.** A host's concurrency ceiling belongs to scheduling policy, not to the deployment graph.

**Authority and correspondence.** Deployment configuration reconciles against the topology; scheduler
behavior reconciles against the host execution policy. Either finding may remain advisory or feed a
deployment or scheduler gate.
