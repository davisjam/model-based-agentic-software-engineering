Most organizations already possess fragments of a governed engineering environment: documentation, tests,
review rules, CI checks, ownership files, runbooks, deployment policy, and the knowledge carried by
experienced engineers. A wiki is one common starting surface. The migration problem is not to convert all
of that material into models. It is to decide which engineering questions deserve stronger representation,
which obligations already have useful authority, and where the gaps between the two still force repeated
human reconstruction.

Use the wiki as an entry point when it carries important system knowledge. Link its claims to the
implementation and evidence they concern, test the claims that can be tested, and promote only the portions
whose future use justifies stronger structure. This is the drill you run at the bench; Chapter 4.2 is the
full treatment.

### Joining the wiki to the code

When the wiki does carry important system knowledge, four small additions turn it from optional
documentation into a trustworthy entry point. Add each where its future use justifies the join — not
everywhere by reflex.

<!-- table: Joining the wiki to the code — four additions that turn a wiki into a trustworthy entry point, each with the behavior it must exhibit. [short: Joining the wiki to the code] -->
| Element | Required behavior |
|---|---|
| **Bidirectional links** | Wiki pages name the code and tests that back their claims; code and tests name the pages that explain their purpose. This two-way join is *traceability* — not a heap of hyperlinks, but claims and code that each point to the other. |
| **Agent briefs** | Tell agents how to reach the wiki, walk its links and tags, cite it, and maintain it as they work. |
| **Design templates** | Name the wiki pages the work touches, and record when a missing page has to be created, before implementation begins. |
| **Definition-of-Done checks** | Before work is accepted, read the affected pages against the current repository — do not trust them because an agent reports it updated them. |

One rule governs all four: **never add metadata without adding consumers.** A tag, a backlink, an
ownership field, a machine-readable mirror — each earns its place only when an audit, a brief, a retrieval
step, an analysis, or a gate reads it. Metadata with no reader is one more surface free to drift.

### The migration path

The migration runs in four stages. Each reaches a useful stopping point, so the work pays off long before
richer models arrive. The exit criterion is what tells you a stage is done — not a calendar date.

<!-- table: The migration path — Audit, Synchronize, Govern, Extend, each with the work it asks and the exit criterion that closes it. [short: Audit, synchronize, govern, extend] -->
| Stage | Work | Exit criterion |
|---|---|---|
| **Audit** | Inventory the important engineering knowledge, implementation surfaces, and existing controls. Identify which claims already have evidence or authority, which rely on reputation, which disagree with the system, and which implementation regions are legitimately below the grain of any useful explicit model. Stays advisory — an audit, not a gate. | Important gaps are classified rather than merely counted. |
| **Synchronize** | Repair high-value correspondence while ordinary work proceeds. When an agent or engineer touches a linked surface, re-check nearby claims, repair stale anchors, and surface semantic disagreements rather than silently choosing a winner. | The representations you intend to trust have explicit, credible correspondence to their subjects. |
| **Govern** | Give important obligations authority at the earliest boundary where the required property is legible. Some obligations may be checked directly over artifacts or actions; others use the representations strengthened in the previous stages. | The high-value obligations selected for governance no longer depend primarily on someone remembering to inspect them. |
| **Extend** | Where the return justifies it, add richer representations, broader evidence, stronger mechanization, or additional authority. Stop where the next increment costs more to carry than it is likely to return. | Every addition has a named consumer or engineering question and a stated reason to exist. |

### The promotion rule

**Audit → reconcile → trust → govern → extend selectively.**

Do not promote an inaccurate representation merely to make it mandatory. Do not require an explicit model
where a local control already settles the obligation cheaply. Do not add structured metadata until something
consumes it. Brownfield migration is not a march toward maximum modeling; it is a sequence of investments
that progressively remove expensive reconstruction and unmanaged obligations.

### Orphan triage

An audit sorts every unlinked region into exactly one of three states. The discrimination is what keeps the
audit honest — the goal is a map whose claimed surface agrees with the territory, not one entry per function.

1. **Missing representation** — a real subsystem with no explaining page or model; write or propose one.
2. **Missing anchor** — the representation exists, but the link back from the code is absent; add the join.
3. **Below the grain** — code too fine or too generic to earn a representation of its own (typed-id aliases,
   config loaders, enums); the *grain* is the level of detail the model keeps, and this code sits
   legitimately beneath it.

See [Chapter 4.2](4.2-brownfield.html) for the full treatment: top-down modeling from a whiteboard,
bottom-up induction of a model from code, lint-and-cover preparation, the Missing-Model Metric read as
representation reach, and sizing governance by a failure's cost times its frequency.
