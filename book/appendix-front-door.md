The argument ends here. What follows is the working surface of MAGE — the reference material you return to while building rather than read sequentially. These appendices package the book's ideas for repeated use: engineering stacks, flagship mechanisms, operational references, implementation guidance. Like the Gang of Four, consult them when a problem arises; you need not read them cover to cover.

The map below shows how the parts fit, with the appendices as the working surface at its foot.

<!-- label: book-map-appendix -->
<!-- figure: assets/book-map.svg | A map of the book. The appendices are the working surface at the foot of it — return here while building. -->

[ref:where-to-look] sets each reference beside the job it does and the question that sends you to it.

<!-- label: where-to-look -->
<!-- table: The MAGE reference surfaces — each appendix and the online catalogue beside the job it does and the question that sends you to it. [short: The MAGE reference surfaces, their jobs, and the questions they answer] -->
| Reference | What it's for | Reach here when you're asking |
|---|---|---|
| [appendix: appendix-stacks] — MAGE Engineering Stacks | Compose a capability from the mechanisms that travel together | *How should I build this capability?* |
| [appendix: appendix-b-flagship-mechanisms] — Flagship Mechanisms | The engineering judgment behind the load-carrying mechanisms | *Why is this the right decision?* |
| [appendix: appendix-c-mechanism-catalog] — Mechanism Catalog | The whole vocabulary at a glance | *What is this mechanism again?* |
| [appendix: appendix-operators-reference] — Operator's Reference | Operate a governed environment: dashboards, health checks, the migration drill, release preflight, daily doctrine | *What should I watch or do while running the system?* |
| [appendix: appendix-skill-recipe] — How to Write a Skill | Package a body of judgment into a skill an agent can reach for | *How do I build a skill?* |
| [appendix: appendix-field-guide] — Field Guide | The six studied teams as one-page cards: who each is, the door it took into the design space, and the one lesson to carry | *Who was that team again?* |
| *Online catalogue* | The complete reference for one mechanism — every entry as a full Gang-of-Four page | *How do I implement this mechanism?* |

**Working the appendices together.** The first three appendices read best in sequence, from the capability you want down to the detail you ship. Start in [appendix: appendix-stacks] with the stack that delivers the capability and the mechanisms that compose it; study in [appendix: appendix-b-flagship-mechanisms] why each load-carrying mechanism takes the shape it does; keep [appendix: appendix-c-mechanism-catalog] open for quick recognition while you implement. When print runs out of room, the online catalogue carries the complete entry.

**The book and the online catalogue.** The book teaches the method and the engineering judgment behind MAGE — why the mechanisms take the shapes they do, and how they compose. The online catalogue is the exhaustive per-mechanism record: every mechanism as a full Gang-of-Four entry, with the implementation detail that does not fit in print.
