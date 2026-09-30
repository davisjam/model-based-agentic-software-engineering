# Aalto University — "Software Engineering with Large Language Models" (FITech / Aalto OpenCS, 2 ECTS)

**Gathered:** 2026-09-30 · **Preliminary class:** mixed (SDLC-with-LLMs is the spine; a substantial tail builds LLM-integrated applications)

## Sources consulted
- https://www.aalto.fi/en/lifewide-learning-courses-and-programmes/software-engineering-with-large-language-models — official Aalto lifewide-learning / FITech listing (credits, price, outcomes, content list, application period).
- https://fitech101.aalto.fi/en/courses/software-engineering-with-large-language-models — Aalto OpenCS course landing (description, prerequisite chain, credit note).
- https://www.aalto.fi/en/lifewide-learning-courses-and-programmes/certificate-in-software-engineering-with-large-language-models — paid Aalto EE "Certificate" variant (3 ECTS, €1,650 + VAT, self-paced).
- Search-indexed chapter pages on fitech101.aalto.fi (titles visible in search results; direct fetches of chapter URLs returned HTTP 404 — the material renders client-side, so chapter content is public in a browser but was not retrievable verbatim here): "part-1/1-syntax-and-variables", "part-2/5-code-translation-and-rewrites", "part-6/2-large-language-model-apis", "part-6/3-chatting-with-a-large-language-model", "part-8/4-agent-based-systems-for-software-development", "course-practicalities/5-vscode-basics".
- Not publicly reachable in this run: per-chapter text, assignments, grading detail, instructor names.

## A. Explicit course content (quoted / cited)

### Identity
Aalto University (Finland) · offered via FITech (Finnish network university) and Aalto OpenCS · no conventional course number in public materials · "Software engineering with large language models" · "Continuously ongoing," online, self-paced; FITech listing shows "Application period: 9.3.2026 – 31.5.2026" · 2 ECTS "by Aalto University," free of charge (FITech variant); a 3 ECTS Aalto EE certificate variant costs €1,650 + VAT · instructor/responsible teacher: not evident in available materials · level: open/adult and degree-student audience ("it is good to have a general understanding of programming and software development"); continues from the course "Introduction to Large Language Models" · Note: the OpenCS landing currently states "This course is no longer available for credit. For now, it continues to stay available for self-study for all," while the aalto.fi FITech listing documents the 2 ECTS credit path with a 2026 application period.

### Stated learning objectives
From the FITech listing, upon completion participants:
- understand "the phases in the software development life cycle and can apply large language models as a part of the software development life cycle"
- can "create programs with the support of large language models and can create programs that interact with large language models"
- can "critically evaluate large language model outputs and know of issues of using large language models in software engineering"

Course framing (OpenCS landing): "Large language models (LLMs) are now a part of everyday software engineering. They can be used to clarify requirements, sketch designs, write code, generate tests, and review changes." The course covers "how to use LLMs as a part of the software development life cycle, and how to build applications that call LLM APIs, manage prompts and conversation state, and validate outputs."

### Organizing sequence
Stated content list (FITech listing): "Producing code with large language models, software engineering and software development life cycle, constructing programs with large language models, quality and applicability of large language model produced code, constructing programs that interact with large language models, issues and concerns related to using large language models for software engineering."
Part structure (from search-indexed chapter URLs and search-result summary; ordering as indexed): Course Practicalities (incl. "Visual Studio Code Basics") · Part 1 Python Programming Primer (e.g. "Syntax and Variables") · Part 2 Coding with Large Language Models (e.g. "Code Translation and Rewrites") · parts on Software Engineering and Development Life Cycle, Requirements and Specifications, and "Landing on the Moon with Large Language Models" · Part 6 Interacting with Large Language Models Programmatically (e.g. "Large Language Model APIs" — "provided by OpenAI and HuggingFace"; "Chatting with a Large Language Model") · a part on Software Security and Large Language Models · Part 8 Automated Software Engineering (e.g. "Agent-based Systems for Software Development" — systems "that can retrieve issues, generate code, and iteratively make adjustments") · End of Course Project.

### Assignments and project structure
"Completion method: online assignments" (FITech listing). An "End of Course Project" part exists. Assignment details: not evident in available materials.

### AI tools and agent frameworks used
LLM APIs "provided by OpenAI and HuggingFace" (search-indexed Part 6 summary); building chatbots against LLM APIs; agent-based systems for software development (Part 8). Visual Studio Code is the referenced editor (course-practicalities chapter). Specific assistant products (Copilot/Cursor etc.): not evident in available materials.

### Readings
Not evident in available materials.

### Treatment of: conventional SE activities
The SDLC is an explicit learning outcome ("understand the phases in the software development life cycle") and a named content area ("software engineering and software development life cycle"; a part on "Requirements and Specifications"). Depth of treatment: not evident in available materials.

### Treatment of: human responsibility and judgment
Only at the outcome level: participants "can critically evaluate large language model outputs and know of issues of using large language models in software engineering"; content list includes "issues and concerns related to using large language models for software engineering." Further detail: not evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
Named content area: "quality and applicability of large language model produced code"; the API-integration strand includes "validate outputs" as a stated skill. Mechanisms (tests, review workflows, graded verification): not evident in available materials.

### Treatment of: persistent engineering knowledge beyond source code
Not evident in available materials (the agent chapter's "retrieve issues" suggests issue-tracker interaction, but nothing on documentation/design records is public).

### Treatment of: controls, constraints, governance, enforcement
A dedicated part on "Software Security and Large Language Models" exists. Grading gates, AI-use policy, or process enforcement: not evident in available materials.

## B. Surveyor notes (interpretation, labeled)
- **Coverage gaps in the public record:** the chapter texts are public in a browser but behind client-side rendering, so this file could not quote them; instructors, grading scheme, and assignment specifics are absent from the reachable pages. The credit story is split across three pages (free 2 ECTS FITech path with an application window; a "no longer available for credit" note on OpenCS; a paid 3 ECTS Aalto EE certificate) and should be reconciled with Aalto directly if this course is promoted to core.
- **Organizing logic (interpretation):** the course reads as a two-hemisphere design — (1) practicing SE with LLMs across the lifecycle (coding, requirements, quality of generated code, agent-based automation) and (2) engineering software that embeds LLMs (APIs, prompt/conversation-state management, output validation). Hemisphere (1) is squarely in-scope for SE-with-AI; hemisphere (2) drifts toward building AI-integrated systems. The "mixed" class reflects that split; the course is nonetheless the strongest non-US, openly-published-materials instance found outside the seed list, and notable as a low-credit (2 ECTS), fully-online, nationally-networked (FITech) delivery model — a different institutional shape from the US semester courses in the seed set.
- **Scale note (interpretation):** as self-paced open material with continuous intake, cohort size and completion data are not published; claims about reach cannot be made from the public record.
