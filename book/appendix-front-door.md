The argument ends here. What follows is the working surface of MAGE — the reference material you return to while building rather than read sequentially. These appendices package the book's ideas for repeated use: engineering stacks, engineering moves, model and operational references, implementation guidance. Like the Gang of Four, consult them when a problem arises; you need not read them cover to cover.

The map below shows how the parts fit, with the appendices as the working surface at its foot.

<!-- label: book-map-appendix -->
<!-- figure: assets/book-map.svg | A map of the book. The appendices are the working surface at the foot of it — return here while building. -->

[ref:where-to-look] sets each reference beside the job it does and the question that sends you to it.

<!-- label: where-to-look -->
<!-- table: The MAGE reference surfaces — each appendix and the online catalogue beside the job it does and the question that sends you to it. [short: The MAGE reference surfaces, their jobs, and the questions they answer] -->
| Reference | What it's for | Reach here when you're asking |
|---|---|---|
| [appendix: appendix-stacks] — MAGE Engineering Stacks | Compose a capability from the mechanisms that travel together | *How should I build this capability?* |
| [appendix: appendix-b-engineering-moves] — Engineering Moves | Worked examples: one recurring problem, one move, two realizations | *How does this judgment transfer?* |
| [appendix: appendix-models] — Model Reference | The representative forms a model takes, with schemas and invariants | *What does this model look like?* |
| [appendix: appendix-operators-reference] — Operator's Reference | Operate a governed environment: dashboards, health checks, the migration drill, release preflight, daily doctrine | *What should I watch or do while running the system?* |
| [appendix: appendix-skill-recipe] — How to Write a Skill | Package a body of judgment into a skill an agent can reach for | *How do I build a skill?* |
| [appendix: appendix-field-guide] — Field Guide | The six studied teams as one-page cards: who each is, the door it took into the design space, and the one lesson to carry | *Who was that team again?* |
| [appendix: appendix-evidence-ledger] — Part-V Evidence Ledger | The raw count tables behind Part V's curves: support-ratio lines, per-path churn, control-growth totals | *What are the counts behind that curve?* |
| *Online catalogue* | The complete reference for one mechanism — every entry as a full Gang-of-Four page | *How do I implement this mechanism?* |

**Working the appendices together.** The first three appendices read best in sequence, from the capability you want down to the detail you ship. Start in [appendix: appendix-stacks] with the stack that delivers the capability and the mechanisms that compose it; study in [appendix: appendix-b-engineering-moves] how one engineering move takes different forms; keep [appendix: appendix-models] open for the model schemas while you implement. When print runs out of room, the online catalogue carries the complete entry.

**The book and the online catalogue.** The book teaches the method and the engineering judgment behind MAGE — why the mechanisms take the shapes they do, and how they compose. The online catalogue is the exhaustive per-mechanism record: every mechanism as a full Gang-of-Four entry, with the implementation detail that does not fit in print.
