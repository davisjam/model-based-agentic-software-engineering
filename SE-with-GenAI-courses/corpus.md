# Corpus — candidate courses and classification

Compiled 2026-09-30. Sources of candidates: the Geng et al. 2026 syllabus survey (arXiv:2608.05898,
Table 1, rows marked G#), the survey brief's seed list (S#), and our own discovery pass (D#; see
[sources/discovery.md](sources/discovery.md)). Every classification links its evidence file; the
classification is only as good as that file, and several rest on thin public records — the
**Evidence** column states how much of the course is actually observable.

Classification: **core** = clearly centered on engineering software with AI · **mixed** =
substantial content on both engineering-with-AI and building-AI-systems · **exclude** =
principally about constructing AI systems, or a conventional SE course that merely permits AI.

## Core comparators (17)

| Course | Term | Class | Evidence | Rationale (one line) |
|---|---|---|---|---|
| [Harvard COMPSCI 1060 — Software Engineering with Generative AI](sources/harvard-cs1060.md) | F25 | core | moderate-thin (syllabus behind SSO) | Full-lifecycle SaaS course; GenAI is the standard means of production ("the point of the class is not just generative AI") |
| [Stanford CS 146S — The Modern Software Developer](sources/stanford-cs146s.md) | F25 | core | rich (assignments primary; syllabus via secondary) | SDLC re-walked with coding agents; "human-agent engineering, not vibe coding" |
| [CMU 17-316/616 — AI Tools for Software Development](sources/cmu-17316-ai-tools-for-software-development.md) | F25 | core | rich | Lifecycle project course where students direct AI ("You will not write actual code in this class") |
| [CMU 15-113 — Effective Coding with AI](sources/cmu-15113-effective-coding-with-ai.md) | S26 | core | rich | Application-building with AI tools; class co-develops quality/transparency standards |
| [UMD CMSC 398Z — Effective Use of AI Coding Assistants and Agents](sources/umd-cmsc398z.md) | F25 | core | rich-moderate | Practitioner apprenticeship on a tool ladder (Copilot → llm CLI → Claude Code on CPython) |
| [Northwestern COMP_SCI 397 — Applied AI for Software Development](sources/northwestern-cs397.md) | S25 | core | thin-moderate (no public syllabus) | Practicum: tool calibration then team full-stack build with AI throughout |
| [UVA CS 4501 — Software Engineering and LLMs](sources/uva-cs4501-se-llms.md) | F25 | core | moderate (topics skeleton public) | SDLC-shaped practicum, LLMs threaded through every stage, converging on an MVP |
| [CU Boulder CSCI 7000-11 — GenAI-powered Software Engineering](sources/cu-boulder-csci7000-genai-se.md) | F25 | core | rich | Graduate seminar on GenAI applied to maintenance-side SE practice, with hands-on tool use |
| [NJIT CS 485/698 — AI-Assisted Software Engineering](sources/njit-ai-assisted-se.md) | S26 | core | rich | Lifecycle project + "how to ensure AI-generated code is correct" as a first-class topic |
| [Utah CS 3960 — Vibe Coding](sources/utah-vibe-coding.md) | S26 | core | rich | Working with coding agents on large maintained codebases; testing arc as the human's lever |
| [UW CSE 490 A2 — AI-Assisted Software Development](sources/uw-ai-assisted-swdev.md) | F25 | core | thin (description + tools list only) | "A programmer directing AI agents is a team leader" — leader skills as the curriculum |
| [Northeastern CS 7180 — Vibe Coding: AI-Assisted SE](sources/northeastern-vibe-coding-ai-assisted-se.md) | S26 | core | rich | Tool-mastery ladder × professional-practice ladder (TDD, CI/CD, security gates) |
| [Memphis COMP 4991/6991 — AI Tools for Software Development](sources/memphis-ai-tools-software-development.md) | S26 | core | rich | MIT-licensed adaptation of CMU 17-316; same lifecycle-with-AI design |
| [CUHK-Shenzhen CSC4801 — AI-assisted Software Engineering](sources/cuhk-shenzhen-csc4801.md) | F26 | core | moderate (schedule public, slides not) | "Building software with coding agents": basis → techniques → competitive team build with cross-team audit |
| [Passau module 5487 — AI-Driven Software Development](sources/passau-ai-driven-software-development.md) | SoSe25 | core | rich (ICSE-SEET 2026 paper) | SDLC × AI-mode matrix; assessment displaced onto process + reflection |
| [Virginia Tech CS 5914 — AI Tools for Software Delivery](sources/virginia-tech-cs5914.md) | S24 | core (low confidence) | thin (one-page description) | GenAI leveraged for code gen/analysis/testing/docs; prompt-library capstone |
| [UChicago MPCS 51238 — Design, Build, Ship](sources/uchicago-design-build-ship.md) | S26 | core (provisional) | thin (catalog blurb + program article) | 10-week shipping practicum with AI-assisted tools as the accelerant; no public pedagogy on directing/verifying AI |

## Mixed (8)

| Course | Term | Class | Evidence | Rationale |
|---|---|---|---|---|
| [UIUC CS598LMZ — Software Quality Assurance with Generative AI](sources/uiuc-cs598lmz-sqa-genai.md) | S25 | mixed | rich | Symmetric research seminar: GenAI-for-QA and QA-for-GenAI; half the modules are about the models themselves |
| [UCSD CSE 190/291P — Generative AI and Programming](sources/ucsd-genai-programming.md) | S26 | mixed | rich | Builds LLM-integrated systems as the artifact, but teaches verifier-centered engineering-with-agents practice deliberately |
| [UMich EECS 498-016 — Applied Agentic Software Engineering](sources/umich-applied-agentic-se.md) | F26 | mixed | rich | Drive an agent → rebuild it (~72% of grade is constructing agent systems, as building-to-understand) |
| [Wisconsin COMP SCI 639 — AI-Assisted Software Development and Intelligent Applications](sources/wisconsin-madison-cs639.md) | F26 | mixed | rich | Dual-track by design: AI-assisted workflows + LLM/RAG/multi-agent app architecture |
| [FAU COT 6930 — Generative AI Software Development Lifecycles](sources/fau-genai-sdlc.md) | S26 | mixed (low confidence) | thin (syllabus JS-gated) | SDLC spine + "Generative Intelligence Systems" development; balance not publicly observable |
| [Aalto — Software Engineering with LLMs (FITech, 2 ECTS)](sources/aalto-software-engineering-with-llms.md) | ongoing | mixed | moderate | SDLC-with-LLMs hemisphere + build-LLM-API-apps hemisphere |
| [Colorado State CS-580B3 — AI for Software Engineering](sources/colorado-state-cs580b3.md) | S26 | mixed (leans exclude) | moderate | AI4SE survey; some use-AI-in-practice outcomes keep it out of exclude |
| Harvard HGSE T564A — Vibe Coding ([discovery](sources/discovery.md)) | F25 | mixed (not deep-dived) | syllabus public | Credit-bearing AI-centered software making, but creative/education-school framing, not engineering practice |

## Excluded (from candidates that looked in-scope by title)

| Course | Term | Reason | Evidence |
|---|---|---|---|
| [Purdue CS 59200-ASE — AI-Assisted Software Engineering](sources/purdue-cs59200-ase.md) (Tianyi Zhang) | S24 | AI4SE research seminar: outcomes are "design and implement AI-based software engineering tools"; SE tasks are application domains for ML research | rich |
| [UIUC CS598 — Software Engineering with LLM Agents](sources/uiuc-cs598-software-agents.md) | S26 | Center of gravity is constructing/training coding agents (benchmarks, training environments, RL — half the syllabus) | rich |
| [NC State GAI4SE — Generative AI for Software Engineering](sources/ncstate-gai4se.md) | F25 | Research seminar on GenAI-for-SE techniques and security-of-code-models; two practice-facing sessions only. (The github.com/gai4se course found in discovery is this same course.) | moderate (syllabus login-gated) |
| [Kalamazoo COMP 488 — AI-Assisted Software Development](sources/kalamazoo-comp488.md) | F23 | Syllabus body is a general advanced-SE/agile seminar; AI is one topic strand ("Experiment with AI-assisted software development") — borderline: AI depth not observable | moderate-thin |
| Cornell SYSEN 5493 — Coding with GenAI for Systems Engineers ([discovery](sources/discovery.md)) | S26 | In-scope by description but 1-credit intro with registrar-blurb-only public record — too thin to serve as a comparator | thin |
| BU MET CS 673; NUS CS3216; Oxford SE Programme LLM module; UCLA CS 230; UC Berkeley CS 61A AI unit; Univ. of St. Thomas AI Systems Engineering; UMass COMPSCI 520 ([discovery](sources/discovery.md)) | — | Out of scope on verification: conventional SE with AI merely permitted; building AI-powered products; building LLM systems; or a unit rather than a course | per discovery log |

## Insufficient public evidence (1)

| Course | Term | Status |
|---|---|---|
| [Michigan Tech CS 5090 — Software Engineering with Generative AI](sources/michigan-tech-cs5090.md) | F26 | Only existence, title, and instructor are public (first offering, Fall 2026). Provisionally core-or-mixed by title and instructor research profile; unclassifiable on evidence. Not used in the matrix. |

## Identity notes

- **"Purdue — AI-Assisted Software Engineering, Spring 2024" (Geng G2) is NOT ECE 30861.** It is
  CS 59200-ASE, taught by Tianyi Zhang (CS dept). Verified against the syllabus PDF Geng et al.
  cite. It enters this corpus as an ordinary external candidate (excluded, above).
- **"Northwestern CS485" (seed S5) does not exist at Northwestern.** The registrar's Spring 2025
  COMP_SCI listing has no 485; the only Northwestern referent is COMP_SCI 397. A course with the
  exact title "ST: AI-Assisted Software Engineering" exists as CS 485 at **NJIT** — the seed entry
  most plausibly conflated the two. Both underlying courses are in the corpus.
- **Course-family lineage:** Memphis COMP 4991/6991 is an MIT-licensed adaptation of CMU 17-316
  (declared on the Memphis site), and NJIT CS 485/698 shares distinctive assignment DNA with CMU
  17-316 (same "Mom Test" user-discovery protocol, INVEST-scored LLM user stories, dev-spec
  milestone, chat-log deliverables). Counted as three courses but treated as one design family
  where the survey reasons about organizing logic.

## Corpus counts

17 core · 8 mixed · 12+ excluded (5 title-plausible + 7 discovery-outs) · 1 insufficient-evidence.
Geng et al.'s 23 rows are fully triaged; 6 non-Geng candidates were added (CUHK-Shenzhen, Wisconsin,
Michigan Tech, Colorado State, Passau, Aalto) plus discovery-outs. Non-US discovery beyond Passau /
Aalto / CUHK-Shenzhen was dry — consistent with Geng et al.'s observation that publicly documented
courses of this kind are (as of mid-2026) largely a U.S. phenomenon.
