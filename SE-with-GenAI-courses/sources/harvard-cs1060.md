# Harvard — COMPSCI 1060 "Software Engineering with Generative AI"

**Gathered:** 2026-09-30 · **Preliminary class:** core comparator (an applied SE-lifecycle course whose stated premise is doing industrial software engineering *with* generative AI as standard tooling; nothing suggests building AI systems is the subject)

## Sources consulted
- https://www.coursicle.com/harvard/courses/COMPSCI/1060/ — third-party mirror of the registrar/catalog description (direct fetch rate-limited; description text recovered via search-result rendering)
- https://www.thecrimson.com/article/2025/1/31/compsci-1060-launch/ — Harvard Crimson news article on the course launch (Spring 2025 first offering), with instructor quotes
- https://locator.tlt.harvard.edu/course/colgsas-226052/2025/fall/19895 — official Harvard course locator entry for Fall 2025; **redirects to https://canvas.harvard.edu/courses/158623, which is behind Harvard SSO login — the actual syllabus/schedule is known to exist but is not publicly reachable**
- https://github.com/orgs/cs1060f25/repositories — course GitHub organization for Fall 2025 (105 repositories: student homework and team-project repos)
- https://github.com/cs1060f25/WilliamHYZhang-hw4 — student Homework 4 repo (assignment title and shape recoverable from README)
- https://github.com/cs1060f25/allenzhangyiteng-hw6 — student Homework 6 repo (forked from instructor template `ChristopherThorpe/company_formation_server`)
- https://www.realcleareducation.com/2025/01/31/harvard_launches_new_ai_software_development_course_1088538.html — syndicated coverage (fetch returned 403; used only as corroboration via search snippets)

## A. Explicit course content (quoted / cited)

### Identity
Harvard University · School of Engineering and Applied Sciences / Computer Science (COMPSCI) · COMPSCI 1060 · "Software Engineering with Generative AI" · Fall 2025 (first offered Spring 2025; also offered Fall 2026 per Coursicle) · Instructor: Christopher A. Thorpe · undergraduate (Harvard "1000-level"; tagged by CS advising as "advanced CS", counts toward the CS concentration) · lecture course, 4 credits, MW + TuTh 75-minute meetings, enrollment reported "capped at 66" at launch (Crimson), Coursicle later reports class size "66–234".

### Stated learning objectives
From the catalog description (as rendered by Coursicle's mirror of the Harvard catalog):
> "Students learn and practice industrial software engineering by building Software as a Service (SaaS) with modern tools... We will follow a software development lifecycle to plan, design, implement, test, deploy, and maintain a small, cloud-based SaaS system."

Modern tools are enumerated (same source) as: "generative AI, automated testing, continuous integration, and continuous deployment (CI/CD)."

Instructor statements of intent (Harvard Crimson, 2025-01-31):
> "How do we take an industrial approach and give undergraduate students a better experience when they do go into the industry?"
> "If you want to be a software engineer today, you won't be effective if you don't know how to use these tools."
> "The point of the class is not just generative AI. It's to go through the entire software engineering life cycle and learn how to build a meaningful application."

The Crimson also reports (paraphrase, not quote) that Thorpe aims to teach skills "expected to be relatively timeless" — useful even when the popular language or deployment framework changes — and that the course "embraces newer tools that use generative AI — which have become industry standard, and aims to teach students how to use them ethically and well."

### Organizing sequence
Not evident in available materials (the schedule lives on the SSO-gated Canvas site). What can be reconstructed from the public GitHub org: at least six numbered individual homeworks (hw4, hw6 repos visible) preceding/alongside team projects, with lecture-derived code (an instructor "company formation server from lectures" template forked for hw6).

### Assignments and project structure
- **Homework 4** (from student repo README): titled **"Homework 4: API Prototyping with Generative AI"** — build a Flask API serving county-level health data from a SQLite database, with a required `county_data` endpoint accepting a 5-digit ZIP code and a `measure_name` parameter from "required measure strings in the assignment spec." One student README notes: "Where applicable, inline comments in the source code note the origin of generated code snippets or external references." (Whether that provenance note is a course requirement or student initiative is not evident in available materials.)
- **Homework 6** (from student repo): extends an instructor-provided "Company formation server from lectures" — a server that "accepts company formation data and generates Articles of Incorporation for Delaware, California, and New York corporations and LLCs" via a `/form-company` POST endpoint emitting PDF paperwork.
- **Team final projects**: the cs1060f25 org hosts ~dozens of team `-project` repos (e.g., "NoteAI" — transforms lecture recordings into highlight videos "using multi-agent AI processing"; an "AI-assisted platform to accelerate grading"; "gather — Cursor for Social Scheduling"; a HUDS nutrition analyzer; a deepfake-detector "Security Platform"). The Crimson confirms "students work in teams to build programs end-to-end."

### AI tools and agent frameworks used
Not evident in available materials beyond "generative AI" generically (catalog) and student-project stacks (TypeScript/JavaScript/Flask visible in repos). No public tool list (Copilot/Cursor/Claude/etc.) found.

### Readings
Not evident in available materials.

### Treatment of: conventional SE activities
Central and explicit: the catalog description commits the course to the full lifecycle — "plan, design, implement, test, deploy, and maintain" — plus "automated testing, continuous integration, and continuous deployment (CI/CD)." Thorpe: "It's to go through the entire software engineering life cycle."

### Treatment of: human responsibility and judgment
Only the reported (paraphrased) aim to teach students to use GenAI tools "ethically and well" (Crimson). No further public detail. Not otherwise evident in available materials.

### Treatment of: evaluation/verification of AI-produced work
Not evident in available materials (automated testing / CI are in the catalog description, but their specific application to AI-produced code is not publicly documented).

### Treatment of: persistent engineering knowledge beyond source code
Not evident in available materials.

### Treatment of: controls, constraints, governance, enforcement
Not evident in available materials. (One student hw4 README's inline-provenance-comments practice is suggestive but cannot be attributed to a course rule from public evidence.)

## B. Surveyor notes (interpretation, labeled)
- **Coverage gap:** the syllabus, week schedule, grading, tool list, and any AI-use policy are all on Canvas behind Harvard SSO; the public record is a catalog blurb, one news article, and student repos. Evidence strength: moderate-thin on internals, solid on identity and framing.
- **Interpretation:** the course reads as a classic project-centered SE-lifecycle course (SaaS, teams, CI/CD, deploy-and-maintain) that has been rebuilt on the premise that GenAI tooling is now the standard means of production — AI is the medium, the lifecycle is the curriculum. Thorpe's "the point of the class is not just generative AI" quote is the clearest published statement of that organizing logic.
- The homework arc visible on GitHub (individual "API prototyping with generative AI" exercises → lecture-template extension → end-to-end team SaaS products) suggests a scaffolded ramp from AI-assisted component work to AI-assisted whole-system engineering, but the full assignment sequence is not public.
