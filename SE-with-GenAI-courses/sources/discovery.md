# Discovery log — SE-with-GenAI courses (beyond seed list)

**Discovery agent run:** 2026-09-30. Web research only (WebSearch + WebFetch).
Scope rule: in-scope = principal educational object is software engineering USING AI
(LLMs/agents as part of SE practice). Excluded: building-AI-systems courses; generic SE
courses that merely permit Copilot.

Seed list (already covered, skipped on sight): Kalamazoo; Purdue; Virginia Tech; UIUC (x2);
Northwestern; CMU (x2); Harvard CS1060; NC State; Stanford "Modern Software Developer"; UMD;
CU Boulder; UW; UVA; NJIT; UChicago "Design, Build, Ship"; Memphis; Utah "Vibe Coding"; UCSD;
Florida Atlantic; Northeastern; Michigan "Applied Agentic SE"; CUHK-Shenzhen CSC4801;
Wisconsin; Michigan Tech CS5090; Colorado State CS580B3.

## Candidates found

| # | Institution | Course | Term | Instructor | URL | Characterization | Scope call |
|---|-------------|--------|------|-----------|-----|------------------|-----------|
| 1 | University of Passau (Germany) | "AI-Driven Software Development" (module 5487, M.Sc.) | SoSe 2025 (68 students); repeats SoSe 2026 | Benedikt Fein, Gordon Fraser, Steffen Herbold | https://staff.fim.uni-passau.de/~fein/publications/2026_icse-seet_ai-driven-software-development.pdf | Scaffolded SDLC-phase lectures (each: non-AI method first, then Chat/IDE/Agent/API AI modes) → 5-week individual project with mid-project requirement changes; graded on process rubric + reflective report, code intentionally down-weighted | IN — DEEP-DIVED → `passau-ai-driven-software-development.md` |
| 2 | Cornell | SYSEN 5493 "Coding with Generative AI for Systems Engineers" | Spring 2026 | (registrar listing) | https://classes.cornell.edu/browse/roster/SP26/class/SYSEN/5493 | 1-credit intro to AI coding assistants for generate/refine/debug tasks | IN (marginal) — centered on coding with GenAI, but 1-credit + systems-engineering audience; thin public record |
| 3 | Harvard Graduate School of Education | T564A "Vibe Coding" | Fall 2025 | Karen Brennan | https://kbrennan.scholars.harvard.edu/sites/g/files/omnuum5186/files/2026-02/T564A_2025_Syllabus.pdf | Six-session HGSE module: intuitive/tinkering approach to making software in conversation with AI | MIXED — credit-bearing, AI-centered making of software, but framing is creative/education-school, not engineering practice |
| 4 | Boston University (MET) | CS 673 Software Engineering | Fall 2025 | (syllabus PDF) | https://www.bu.edu/csmet/files/2025/10/metcs673OL25fall1Syllabus.pdf | Conventional team SE course; AI appears only as disclosure/integrity policy | OUT — AI-permitted, not AI-centered |
| 6 | NUS | CS3216 Software Product Engineering for Digital Markets | 2025 | — | https://news.nus.edu.sg/genai--science-teaching-learning-and-shaping-the-future-of-discovery/ | Students build GenAI-POWERED products | OUT — building AI-powered products, not SE-using-AI as educational object |
| 7 | (TBD) GAI4SE course | "Generative AI for Software Engineering" GitHub course | — | — | https://github.com/gai4se/GAI4SE-Course | Research-seminar shape (guest lectures, research ideas, code embeddings) | LIKELY OUT — research on GenAI4SE techniques (building/studying AI for SE), not practicing SE with AI; verify institution |
| 8 | Aalto University (Finland) | "Software Engineering with Large Language Models" (FITech, 2 ECTS free; Aalto EE certificate variant 3 ECTS €1,650) | continuously ongoing; FITech application window 9.3–31.5.2026 | not listed on public pages | https://www.aalto.fi/en/lifewide-learning-courses-and-programmes/software-engineering-with-large-language-models | LLMs across the SDLC (requirements, design, code, tests, review, quality of generated code, agent-based automation) + a second hemisphere on building LLM-API apps; open course material on fitech101 (client-side rendered) | IN/mixed — DEEP-DIVED → `aalto-software-engineering-with-llms.md` |
| 9 | Oxford (Software Engineering Programme) | "Generative AI with Large Language Models" module | 2025 | — | https://www.cs.ox.ac.uk/professionalprogramme/subjects/LLM.html | Transformer/diffusion architectures, RLHF, RAG, agent building (LangChain) | OUT — building LLM systems, not SE-using-AI |
| 10 | UCLA | CS 230 Software Engineering | Fall 2025 | Miryung Kim | https://web.cs.ucla.edu/~miryung/teaching/CS230-Fall2025/main.html | Automated SE: program analysis, fuzzing, verification | OUT — conventional automated-SE course; no GenAI-assisted-development centering |
| 11 | UC Berkeley | CS 61A (Fall 2026 revision) + 1-unit CS 194 companion | Fall 2026 | — | https://cs61a.org/fa26/articles/whats-new/ | Intro course adds a 2-week unit on AI-assisted programming with agentic tools | OUT as a course (unit within intro CS, not a course whose object is SE-with-AI); notable as curricular signal |
| 12 | Univ. of St. Thomas | "AI Systems Engineering" (Fall 2026) | Fall 2026 | — | https://github.com/aise-stthomas/f2026 | Engineering systems AROUND stochastic AI components | OUT — building/operating AI systems, not SE-using-AI |
| 13 | UMass Amherst | COMPSCI 520 (Fall 2025) | Fall 2025 | H. Conboy | https://people.cs.umass.edu/~hconboy/courses/CS520/2025Fall-COMPSCI520-syllabus-hconboy.pdf | Conventional SE course (surfaced by AI-assisted-SE search; not verified as AI-centered) | LIKELY OUT — no evidence of AI-required graded SE work; not deep-checked |

## Surveys / papers mined

- **Geng et al., "Mapping the Emerging Curriculum for AI-Assisted Software Engineering via Syllabus Analysis"** (arXiv:2608.05898, UCSD/Auckland/Aalto) — 23-course US dataset; its Table 1 matches the seed list almost 1:1 (Kalamazoo, Purdue, VT, UIUC x2, Northwestern, CMU x2, Harvard, NC State, Stanford, UMD, CU Boulder, UW, UVA, NJIT, UChicago, UIUC LLM-Agents, Memphis, Utah, UCSD, FAU, Northeastern, Michigan). Confirms seed coverage; explicitly US-only (limitation section) — so non-US channel is the open frontier. References mined for further leads: Borghoff et al. ECSEE 2025 (student SE projects w/ GenAI); Salomon et al. SPLASH-E 2025 (UZH SE course study); Rasnayaka et al. LLM4Code 2024 (NUS SE project course study); Baresi et al. CSEE&T 2025 (ChatGPT in five courses — perception study).
- **Fein, Fraser, Herbold, "AI-Driven Software Development: A New Course Concept and Assessment Model for the Era of Large Language Models"** (ICSE-SEET 2026) — the Passau course experience report (candidate #1).

## Channels tried

- **site:.edu syllabus searches** — yielded Cornell SYSEN 5493 (IN, thin), BU/UCLA/UMass (all OUT on verification) + seed-list confirmations.
- **GitHub course searches** — GAI4SE (likely out) + St. Thomas AI Systems Engineering (out); otherwise MOOC/bootcamp noise. Mostly DRY.
- **SIGCSE / ICSE-SEET / CSEE&T 2025-26 paper mining** — the productive channel: Passau course (deep-dived) + UCSD syllabus-analysis survey (confirms seed list is near-complete for public US courses as of Mar 2026). Secondary leads noted but not course-page-verifiable: Borghoff et al. ECSEE 2025 (Universität der Bundeswehr München student-project study), Salomon et al. SPLASH-E 2025 (UZH SE-course GenAI study), Rasnayaka et al. LLM4Code 2024 (NUS project-course study), Baresi et al. CSEE&T 2025 (five-course ChatGPT perception study, Politecnico di Milano) — all studies OF GenAI use in otherwise-conventional courses, not SE-with-AI courses per se.
- **UK (Oxford/Cambridge/Edinburgh/Imperial)** — DRY for credit-bearing: hits are lifelong-learning/short-course/bootcamp offerings; Oxford SE Programme's "Generative AI with LLMs" module is building-LLM-systems (out).
- **Canada (Waterloo/Toronto/UBC/McGill)** — DRY: hits are large-model model-building courses (UofT CSC2541) or non-credit (WatSPEED).
- **Australia (UNSW/Melbourne/Monash/Sydney)** — DRY: exec-ed and AI-degree marketing only.
- **Asia (NUS/NTU/HKUST/KAIST)** — DRY for scope: exec-ed non-credit or GenAI-product-building (NUS CS3216 out).
- **Nordics (Aalto/Helsinki)** — yielded Aalto SE-with-LLMs (deep-dived); Helsinki course found is LLM/NLP model-building (out).
- **German-language search ("KI-gestützte Softwareentwicklung")** — DRY: corporate training only (Passau's course was found via the English-language paper channel).
- **Fall 2026 post-survey-cutoff searches** — Berkeley CS 61A adds a 2-week AI-assisted-programming unit + 1-unit CS 194 companion (curricular signal, not a course in scope); Michigan Fall 2026 offering already in seed.

## Deep-dive selection rationale

1. **Passau "AI-Driven Software Development"** — richest public record of any new find (11-page ICSE-SEET 2026 paper with full grading rubrics + live course pages), unambiguously in-scope, non-US, and the only new find with a published assessment model designed for the AI era.
2. **Aalto "Software Engineering with LLMs"** — strongest remaining in-scope find: fully open course material, credit-bearing (2 ECTS via FITech), non-US, and a distinct institutional shape (national online network, low-credit, continuous intake). Caveats (mixed second hemisphere; split credit story) are documented in the evidence file.

Cornell SYSEN 5493 was not deep-dived: 1 credit, registrar-blurb-only public record. Harvard HGSE T564A not deep-dived: rich syllabus but education-school creative framing puts it outside strict SE-with-AI scope.


