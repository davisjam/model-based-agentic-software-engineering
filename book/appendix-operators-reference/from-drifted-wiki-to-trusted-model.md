Most organizations already possess fragments of a Governed Engineering Environment: documentation, tests,
review rules, CI checks, ownership files, runbooks, deployment policy, and expert knowledge. Brownfield
migration identifies which engineering questions need stronger representation, which obligations already
have effective authority, and where remaining gaps force repeated human reconstruction.

Where a wiki carries important system knowledge, link its claims to the implementation and evidence they
concern, test mechanically decidable claims, and promote only the portions whose future use justifies
stronger structure. [Chapter 4.2](4.2-brownfield.html) gives the full treatment.

### Joining the Wiki to the Code

Four additions can make a wiki a more trustworthy engineering entry point. Add them only where future use
justifies the added maintenance burden.

<!-- table: Joining wiki knowledge to implementation. Four additions and the behavior each must provide. [short: Joining the wiki to the code] -->
| Element | Required behavior |
|---|---|
| **Bidirectional links** | Wiki pages name the code and tests that back their claims; code and tests name the pages that explain their purpose. This bidirectional relation provides traceability between claims and the implementation or tests that support them. |
| **Agent briefs** | Tell agents how to locate, traverse, cite, and maintain the relevant wiki material. |
| **Design templates** | Name the wiki pages the work touches, and record when a missing page has to be created, before implementation begins. |
| **Definition-of-Done checks** | Before work is accepted, compare affected pages with the current repository rather than relying on the agent's report that they were updated. |

Add metadata only when a defined consumer uses it. Tags, backlinks, ownership fields, and machine-readable
mirrors should feed an audit, brief, retrieval step, analysis, or gate; otherwise they add another surface
that can drift.

### The Migration Path

The migration has four stages — Audit, Synchronize, Govern, and Extend — each with an explicit exit
criterion. Progress is defined by satisfying that criterion rather than by elapsed time.

<!-- table: The brownfield migration path. Each stage names its work and exit criterion. [short: Audit, synchronize, govern, extend] -->
| Stage | Work | Exit criterion |
|---|---|---|
| **Audit** | Inventory important engineering knowledge, implementation surfaces, and existing controls. Classify which claims have evidence or authority, which rely on convention, which disagree with the system, and which implementation regions legitimately fall below the grain of any useful explicit model. Keep this stage advisory. | Important gaps are classified rather than merely counted. |
| **Synchronize** | Repair high-value correspondence during ordinary work. When an agent or engineer touches a linked surface, re-check nearby claims, repair stale anchors, and surface semantic disagreements explicitly. | The representations you intend to trust have explicit, credible correspondence to their subjects. |
| **Govern** | Give selected obligations authority at the earliest boundary where the required property is decidable. Some obligations can be checked directly over artifacts or actions; others depend on the representations strengthened in earlier stages. | The high-value obligations selected for governance no longer depend primarily on someone remembering to inspect them. |
| **Extend** | Add richer representations, broader evidence, stronger mechanization, or additional authority only where expected return exceeds carrying cost. | Every addition has a named consumer or engineering question and a stated reason to exist. |

### The Promotion Rule

Audit → reconcile → trust → govern → extend selectively.

Do not give an inaccurate representation authority. Do not require an explicit model where a local control
already settles the obligation economically. Do not add structured metadata without a defined consumer.
Treat each migration step as an investment intended to reduce costly reconstruction or unmanaged obligations.

### Orphan Triage

Classify each unlinked region into one of three states so coverage reflects the intended model grain rather
than raw implementation count.

1. **Missing representation** — a real subsystem with no explaining page or model; write or propose one.
2. **Missing anchor** — the representation exists, but the link back from the code is absent; add the join.
3. **Below the grain** — implementation too fine-grained or generic to warrant its own representation, such
   as typed-ID aliases, configuration loaders, or enums.

See [Chapter 4.2](4.2-brownfield.html) for top-down and bottom-up model construction, lint-and-cover
preparation, the Missing-Model Metric, and cost-based governance sizing.
