Most engineering organizations already own the beginnings of a governed engineering environment — an
environment where engineering knowledge and policy live in shared models, tools, and checks instead of in a
few people's memory. They just call it the wiki.

A wiki is a lightweight human-facing knowledge graph: its pages are nodes, its links and backlinks are
edges, its tags carry loose metadata. The graph is already there; what it lacks is a disciplined join to
the code. This is the operating drill that supplies the join, then walks the wiki from drifted documentation
to a trusted — and eventually executable — model. It is the drill you run at the bench; Chapter 4.1 is the
full treatment.

### The minimum package

Four small additions turn the wiki from optional documentation into the start of an engineering
environment. Add all four, or the wiki stays a surface nobody trusts.

<!-- table: The minimum package — the four additions that make a wiki into engineering infrastructure, each with the behavior it must exhibit. [short: The minimum package] -->
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
executable models arrive. The exit criterion is what tells you a stage is done — not a calendar date.

<!-- table: The migration path — Audit, Synchronize, Govern, Extend, each with the work it asks and the exit criterion that closes it. [short: Audit, synchronize, govern, extend] -->
| Stage | Work | Exit criterion |
|---|---|---|
| **Audit** | Inventory the major wiki regions and implementation regions; add round-trip links in both directions; create or propose pages for large code with no explaining home; classify the orphans. Stays advisory — an audit, not a gate. | Every major wiki region links to the code and tests that realize it, and every major code and test region is linked, marked below the wiki's grain, or recorded as owing a new entry. |
| **Synchronize** | Drain the drift with ordinary work: an agent that touches linked code reads the attached pages, checks their claims, fixes nearby errors, adds missing links, and flags disagreements for a human. A boy-scout rule, not a rewrite. | A fresh audit shows the important wiki claims and the repository substantially in agreement, with no major orphan left unclassified. |
| **Govern** | Promote the wiki from optional context to required input: briefs mandate task-specific wiki analysis before implementation, templates name affected pages, the Definition of Done requires claims checked against the repository at HEAD. | The wiki is trusted enough to be required input and verified output. |
| **Extend** | Where the value justifies the cost, selected pages add structured invariants, correctness criteria, dependencies, ownership, transitions, and links to validators — mirrored in a machine-readable form once a real consumer exists. | Every structured field added drives at least one retrieval path, analysis, generator, validator, or gate. |

### The promotion rule

Move the wiki up the same way you land a new lint into a legacy tree: audit first, drain the findings,
then make it mandatory. Enforcing a broadly inaccurate wiki only promotes old errors to official
instructions, so trust is earned before it is required.

**Link the surface → drain the drift → earn trust → make synchronization mandatory → extend selected
claims into executable models.**

The Govern step is that promotion made durable: an obligation that used to depend on someone remembering
to update the wiki becomes part of the environment's acceptance criteria. (The book calls this the
Alignment Thesis applied one increment at a time.)

### Orphan triage

An audit sorts every unlinked region into exactly one of three states. The discrimination is what keeps
the audit honest — the goal is a map whose claimed surface agrees with the territory, not one wiki entry
per function.

1. **Missing model or page** — a real subsystem with no explaining page; write or propose one.
2. **Missing anchor** — the page exists, but the link back from the code is absent; add the join.
3. **Below the grain** — code too fine or too generic to earn a page of its own (typed-id aliases, config
   loaders, enums); the *grain* is the level of detail the model keeps, and this code sits legitimately
   beneath it.

### Full treatment

See [Chapter 4.1](4.2-brownfield.html) for the explanation this card compresses:

- top-down modeling from a whiteboard;
- bottom-up induction of the model from code;
- lint-and-cover preparation before induction;
- the Missing Model Metric — coverage run backwards, to point at unmodelled code;
- how much governance is enough, sized by a failure's cost times its frequency.
