Execution models answer where work runs and which execution decisions may vary by environment. In
review, they are where a reviewer checks *which deployment or execution assumptions moved?* Two
related representations suffice for the book: the deployment topology and the host execution policy.

**Engineering question.** Where does work run, and which scheduling decisions may change with the
host it runs on?

**Representation.** Keep the two apart.

- **Deployment topology** describes where things run and connect: web reaches a queue, the queue
  feeds a worker, the worker reaches storage and a service. This graph is the stable engineering
  view.
- **Host execution policy** describes how aggressively work may be scheduled on a given host profile.
  An elastic host fans out without limit; a metered host takes a bounded fan; a scarce host
  serializes to one at a time. The policy is the variable overlay on the stable topology.

[ref:fig-g4-execution-placement] shows the stable graph with the policy as a separate layer beneath
it.

<!-- label: fig-g4-execution-placement -->
<!-- figure: assets/appendix-g-4-host-execution-policy.svg | *Stable topology, variable execution policy.* The deployment topology (web → queue → worker → storage) is the engineering view that stays fixed. The host execution policy is a separate overlay keyed on the host profile: elastic fans out, metered takes a bounded fan, scarce serializes. The scheduler reads the profile; the deployment graph does not change per host. -->

**Property.** Topology facts and host policy must not be conflated. The representative invariant from
Part II is that load rationing lives in the scheduler, not in the deployment graph. The main text
states it as *no deploy edge carries the LOAD intent*: a host's concurrency ceiling is a scheduling
decision, so encoding it by mutating the topology per host is the error the property forbids.

**Authority and correspondence.** Deployment configuration reconciles against the topology; scheduler
behavior reconciles against the host profile. Where either check deserves authority, Part III supplies
the gate — a deployment gate over the wiring, a scheduler gate over the rationing.
