# Harvard COMPSCI 1060 — Software Engineering with Generative AI

Fall 2025 (first Spring 2025) · Christopher A. Thorpe · undergraduate lecture course, ~66+ students ·
[evidence](../sources/harvard-cs1060.md)

## What it teaches

Industrial software engineering by building SaaS: "plan, design, implement, test, deploy, and
maintain a small, cloud-based SaaS system" with "generative AI, automated testing, continuous
integration, and continuous deployment." Individual homeworks (e.g., "API Prototyping with
Generative AI") ramp into end-to-end team products. Thorpe's framing: "If you want to be a software
engineer today, you won't be effective if you don't know how to use these tools" — and, pointedly,
"The point of the class is not just generative AI. It's to go through the entire software
engineering life cycle."

## How it is organized (interpretation)

A classic project-centered SE-lifecycle course rebuilt on the premise that GenAI tooling is now the
standard means of production. AI is the medium; the lifecycle is the curriculum. The public GitHub
org suggests a scaffolded ramp from AI-assisted component work to AI-assisted whole-system
engineering.

## Evidence caveat

The syllabus, schedule, grading, tool list, and AI-use policy live on SSO-gated Canvas. The public
record is a catalog blurb, one news article, and student repos — treatment of verification,
responsibility, and governance is not observable, not necessarily absent.

## Adoptability (drop-in availability, audited 2026-09-30)

**Category 4 — essentially closed.** Every instructor-facing artifact sits behind Harvard
authentication; what is public is student submissions and two unlicensed app skeletons.

- **Public:** roughly 105 GitHub repos in the course org, overwhelmingly **student submissions**
  (`<name>-hw2`, `-hw4`, `-hw6`) plus ~14 team project repos showing what students built · two
  starter bases (`cs1060-hw2-base`, `faleproxy`), both READMEs read in full: setup, usage, and deploy
  documentation with **no** learning objectives, requirements, constraints, acceptance criteria,
  submission process, or grading criteria · a ~3-sentence catalog blurb, reachable only through a
  third-party mirror.
- **Absent:** no syllabus, no schedule beyond meeting-pattern metadata, **zero** decks or notes, **0**
  assignments with student-facing instructions, no project brief, no readings, no rubrics, no
  instructor guidance.
- **Login:** yes, for essentially everything. The syllabus, schedule, assignment specs, slides, and
  rubrics all sit on `canvas.harvard.edu/courses/158623`, which requires Harvard SAML. Worth flagging:
  the public-looking `locator.tlt.harvard.edu` course URL is a **302 redirect into that login**, not a
  public course page.
- **License:** **no license stated** for the course materials or the starter repos; the GitHub license
  API 404s on `cs1060-hw2-base`. Two *student* repos carry MIT, which is a student's grant over
  student work, not an instructor grant over course materials.
- **Checked:** the org repo listing via the web UI and two GitHub API pages; both starter READMEs; the
  license API; the locator URL through its redirect chain to Harvard SSO; a third-party catalog
  mirror; two WebSearches for a public course site or posted syllabus.

Method, corpus-wide counts, and the unreachable-this-pass log: [adoptability-audit.md](../adoptability-audit.md).
