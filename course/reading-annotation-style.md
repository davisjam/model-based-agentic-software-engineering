# Reading annotation style

House style for the reading lists in `course/lectures/*/*/index.md`. The binding rules are summarized in [`AGENTS.md`](AGENTS.md); this file is the full guidance and the audit procedure.

## Scope

Before finalizing the **Performance & Reliability** unit's reading list, inspect the reading descriptions in **all other units of the Software Engineering Handbook**, not just this unit. Treat those existing annotations as the house-style corpus. Compare their headings, citation presentation, paragraph length, reading guidance, and closing questions. Do not assume that the examples in this note supersede patterns consistently used across the handbook.

Review the sample supplied by the instructor for the Alignment unit as an especially useful reference: each entry has a purposeful short heading, identifies a specific source and scope, states the conceptual contribution, and gives students an analytical question. Its voice is academic, concrete, and economical, not a promotional blurb or a summary of everything in the source.

## Rewrite instructions

1. Organize a unit's reading choices under headings that name a **subject or a lecture**. Students sample readings. **Never classify readings as required, follow-up, optional, further, or recommended**, and never use a heading such as "Further reading", "Further depth" or "Optional reference": a tier tells a student which entries to skip, which is not the intent. The sole exception is a section serving a genuinely distinct purpose and applied consistently across the handbook. For the Performance & Reliability unit specifically, the two groups are **Performance** and **Reliability**.
2. Preserve the existing strong Performance choices and their accurate source identifiers. The ReDoS paper should **not** be assigned as a reading, even though it remains a lecture case study.
3. For Reliability, include a short FMEA/FTA reading choice and a Microsoft Azure Architecture Center pattern choice inviting students to select **three** patterns relevant to their project. Link each pattern name individually. Preserve the Google SRE overload/cascading-failure option.
4. The NASA *Fault Tree Handbook* is long. Assign **specific introductory excerpts**, not the whole book. The proposed handoff identifies §§2.3–2.4 and §§3.1–3.4 as candidate excerpts; check these against the actual PDF before finalizing the citation and scope. If its FMEA treatment is not sufficiently substantive for an introductory comparison, find a **comparable authoritative, accessible, concise FMEA source** and provide a working direct link. Do not invent sections, page ranges, or citations.
5. For each annotation, write a coherent paragraph of approximately 3–5 substantial sentences, adjusting length to the material. State what intellectual contribution the source makes, what students should attend to, and how it bears on this unit's engineering decisions. Avoid 1–2 sentence fragments and long catalogs of features.
6. **Avoid repeating “Read it for,” “Read this for,” or “As you read, look for” in every annotation.** Vary the *sentence structure and intellectual action*, not merely the opening verb. Choose phrasing appropriate to the source, such as:
   - “As you read, look for how …”
   - “Notice the distinction between …”
   - “Pay particular attention to …”
   - “Trace how the authors move from … to …”
   - “The useful question is whether …”
   - “Consider what changes when …”
   - “Compare this account with …”
   - “Ask which assumptions …”
   - “The example makes visible …”
   - “For your project, identify …”
   - “This provides a concrete account of …”
   These are **options**, not a template to cycle through mechanically. Some annotations should begin with a substantive claim about the source rather than an imperative.
7. Keep prompts specific and answerable from the reading. Prefer “Which resource is saturated when CPU remains idle?” to “Reflect on the importance of performance.” Avoid generic enthusiasm, slogans, aphorisms, and conspicuously uniform prose.
8. Use precise, verifiable citations and clickable source titles or links, following the handbook's actual reference conventions. For the Azure pattern choice, individually link **Bulkhead, Circuit Breaker, Health Endpoint Monitoring, Quarantine, Rate Limiting, Retry, and Throttling**; verify the official pages and do not duplicate Rate Limiting.
9. Preserve the distinction between a **reading choice** and a **lecture topic**. Do not assign a paper simply because it appears in a slide. A reading should offer a useful independent perspective, a concrete engineering method, or a deeper worked example.

## Quality-control pass

After drafting, inspect the descriptions **side by side** with at least several other unit landers. Check for repeated openers, uniform sentence rhythm, excessive imperative phrasing, vague questions, unnecessary length, and inconsistent bibliographic formatting. Verify all links and exact section locators. Make a final pass asking whether the annotations sound like one instructor making purposeful recommendations, rather than a generated catalog.

## Deliverable

Land the revised reading-list front matter in the unit's `index.md` using the repository's established schema and citation keys. Report which other units were used as style references, which sources/locators were verified, and any unresolved citation issues. Do not change the lander body or unrelated reading lists unless required for consistent formatting.
