# Geng et al. 2026 — "Mapping the Emerging Curriculum for AI-Assisted Software Engineering via Syllabus Analysis"

**Type:** peer-style survey paper (arXiv preprint), used here as (a) a discovery source for the
corpus and (b) an independent triangulation point for our own coding. Not a course.

- arXiv:2608.05898v1 [cs.SE], 6 Aug 2026. Authors: Francis Geng, Anshul Shah, Mia Chen, Paul Denny,
  Juho Leinonen, Bill Griswold, Gerald Soosai Raj, Leo Porter (UCSD / Auckland / Aalto).
- Local copy consulted: `~/Downloads/2608.05898v1.pdf` (7 pp.).

## What they did

Analyzed 23 publicly documented U.S. upper-division, credit-bearing courses (Fall 2023 – Fall 2026)
that "explicitly frame generative AI as part of software engineering and include graded coursework
involving GenAI use for software engineering tasks." Inclusion required: explicit GenAI framing;
coverage of at least two SDLC domains; required GenAI in graded SE tasks. Searches ran Mar 2026;
32 institutionally eligible candidates screened down to 23. Their Table 1 is reproduced in
[candidates.md](candidates.md) (rows G1–G23).

## Findings relevant to this survey

Quotes from the paper:

- **No settled curricular model.** "the courses do not yet reflect a single curricular model. Many
  emphasize transferable practices, including prompting, agentic development, evaluation, testing,
  and workflow integration, but differ in tool choices, topics, and assessment structures. Our
  findings suggest that AI-assisted software engineering remains a design space rather than a
  standardized curriculum." (§7 Conclusion)
- **Layering, not reconceptualization.** "emerging AI-assisted software engineering courses appear
  to build on familiar software engineering education foundations. Many of the most visible
  elements are existing software engineering practices such as project work, programming,
  debugging, design and deployment. The newer curricular elements are the AI-mediated practices
  layered onto this foundation, such as prompting, agentic development, AI evaluation, managing
  context, and integrating AI into development workflows." (§6 Discussion)
- **Learning-objective themes** (Table 2, n=12 with public objectives): human-AI collaboration
  practices ("apply AI best practices" 6, "manage AI context" 2); software and AI tool development;
  software and AI evaluation ("evaluate software and AI artifacts" 5); responsible AI use and
  judgment ("analyze AI limitations" 2, "evaluate when to trust AI" 2).
- **Topic themes** (Table 5, n=18 with public topic lists): AI/ML fundamentals (most common);
  testing (10), AI evaluation (7), agentic development (10), prompting (9); "vibe coding" (5);
  selective rather than uniform SDLC coverage — "documentation, brownfield development, and
  general SE fundamentals were less visible in public materials."
- **Assessment** (Tables 3–4, n=14 conventional-graded): project/capstone median 50% of grade;
  AI-required work median 70%; proctored assessment in only 3 of 14 — "courses are emphasizing
  authentic AI-assisted practice."
- **Tools** (RQ3, n=9 naming tools): Claude Code most frequent (6), Cursor (3), GitHub Copilot (3),
  Claude Web (2), OpenAI Codex (2); long tail of one-course tools.

## Relevance caveats (surveyor note — interpretation)

- Their unit of analysis is topics/objectives/assessment — they do not code for the *conceptual
  organization* of courses, which is this survey's primary question. Their "design space, not a
  standardized curriculum" conclusion is however direct evidence that as of mid-2026 no consensus
  organizing decomposition had emerged across public U.S. courses.
- U.S.-only and public-materials-only; they caution the counts "reflect documented tool references
  rather than all tools instructors introduced."
