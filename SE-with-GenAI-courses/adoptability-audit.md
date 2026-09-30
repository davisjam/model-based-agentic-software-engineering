# Adoptability audit — could another instructor actually teach these?

Audited 2026-09-30. Every classification rests on live fetches performed during this pass, against
the primary URLs recorded in [sources/](sources/). Per-course detail is appended to each
[courses/](courses/) brief; the eight mixed courses have no brief file, so their detail lives in
§5 below.

## The question

> If a software engineering instructor decided tomorrow, "I want to teach a serious course on
> software engineering with coding agents next semester, but I do not want to develop the course
> myself," how many publicly available courses could they realistically pick up and teach?

**The answer is five, and only three of those five carry a license that permits it.**

## 1. What this measures, and what it does not

This is not the question the rest of the corpus answers. [corpus.md](corpus.md) codes how much of
each course is *observable* — enough to say what it teaches and how it decomposes the problem. A
course can be richly observable and completely unadoptable. A well-written syllabus tells you
everything about the intellectual design and hands you nothing to teach from on Monday.

So this pass revisited the live URLs and coded a different variable: **drop-in instructional
availability**. None of the corpus's rich / moderate / thin evidence coding carries over, and none
of it was consulted while classifying.

**The categories.**

1. **Drop-in / canned** — an instructor could plausibly teach substantially the same course from the
   public materials. Most of: lecture slides or notes · assignments and projects with student-facing
   instructions · syllabus and calendar · assessment guidance or rubrics · setup instructions — all
   reachable without institutional login.
2. **Substantial reusable materials** — meaningful units or assignments reusable; the instructor
   still designs significant portions.
3. **Inspectable but not adoptable** — a public syllabus, calendar, description, or paper makes the
   intellectual content visible; the instructional package is not available.
4. **Essentially closed** — little useful instructional material public, or the important material
   sits behind institutional authentication.

Ties between 1 and 2 were resolved as 2. One course (Memphis) was classified 1 by its auditor and
flagged borderline; it is recorded here as 2 under that rule, with the reasoning stated in §3.

**Two rules shaped the coding.**

- **"Not public" and "unreachable this pass" stay separate.** A JavaScript-gated syllabus portal and
  a CDN bot-block are failures of this audit, not evidence about the course. They are recorded as
  such and never used to downgrade anyone. §6 lists every one.
- **No license stated means no license stated.** Public accessibility is not permission. An
  unlicensed public course site is legally not adoptable however complete it looks.

## 2. Counts

| Category | Core (17) | Mixed (8) | All 25 |
|---|---:|---:|---:|
| **1 — Drop-in / canned** | **5** | **0** | **5** |
| 2 — Substantial reusable materials | 6 | 4 | 10 |
| 3 — Inspectable but not adoptable | 4 | 4 | 8 |
| 4 — Essentially closed | 2 | 0 | 2 |

**Five of twenty-five qualify as drop-in.** All five are core comparators; no mixed course reaches
category 1, which follows from what those courses are — research seminars and build-an-agent
courses publish reading lists, not teaching packages.

Per course:

| Course | Class | Cat. | License |
|---|---|:--:|---|
| CMU 17-316/616 — AI Tools for Software Development | core | **1** | MIT |
| CMU 15-113 — Effective Coding with AI | core | **1** | no license stated |
| NJIT CS 485/698 — AI-Assisted Software Engineering | core | **1** | CC BY-SA 4.0 |
| Utah CS 3960 — Vibe Coding | core | **1** | no license stated |
| Northeastern CS 7180 — Vibe Coding: AI-Assisted SE | core | **1** | CC BY-NC 4.0 · code Apache 2.0 |
| Stanford CS 146S — The Modern Software Developer | core | 2 | no license stated |
| UMD CMSC 398Z — Effective Use of AI Coding Assistants | core | 2 | no license stated |
| CU Boulder CSCI 7000-11 — GenAI-powered SE | core | 2 | no license stated |
| UW CSE 490 A2 — AI-Assisted Software Development | core | 2 | no license stated |
| Memphis COMP 4991/6991 — AI Tools for Software Dev | core | 2 | upstream MIT attribution only |
| CUHK-Shenzhen CSC4801 — AI-assisted SE | core | 2 | no license stated |
| UIUC CS598LMZ — SQA with Generative AI | mixed | 2 | no license stated |
| UCSD CSE 190/291P — Generative AI and Programming | mixed | 2 | no license stated |
| UMich EECS 498-016 — Applied Agentic SE | mixed | 2 | no license stated |
| Aalto — Software Engineering with LLMs (FITech) | mixed | 2 | no license stated |
| Northwestern COMP_SCI 397 — Applied AI for Software Dev | core | 3 | no license stated |
| UVA CS 4501 — Software Engineering and LLMs | core | 3 | no license stated |
| Passau module 5487 — AI-Driven Software Development | core | 3 | paper CC BY 4.0; no materials |
| UChicago MPCS 51238 — Design, Build, Ship | core | 3 | no license stated |
| Wisconsin COMP SCI 639 — AI-Assisted Software Dev | mixed | 3 | no license stated |
| FAU COT 6930 — GenAI Software Development Lifecycles | mixed | 3 | no license stated |
| Colorado State CS-580B3 — AI for Software Engineering | mixed | 3 | no license stated |
| Harvard HGSE T564A — Vibe Coding | mixed | 3 | no license stated |
| Harvard COMPSCI 1060 — SE with Generative AI | core | 4 | no license stated |
| Virginia Tech CS 5914 — AI Tools for Software Delivery | core | 4 | no license stated |

**Licensing is the corpus's dominant condition, not an edge case.** Twenty-one of twenty-five state
no license over their instructional materials. Four state one: CMU 17-316 (MIT), NJIT (CC BY-SA
4.0), Northeastern (CC BY-NC 4.0 for materials, Apache 2.0 for code), and Passau — whose CC BY 4.0
covers the *paper* describing the course, since no materials were released. Two more courses carry
MIT only on an ancillary setup repo (UMich's `aider-ollama`, UCSD's `tritonai-starter`) while the
teaching materials themselves are unlicensed.

So the headline number splits. **Five courses are materially drop-in. Three are drop-in and legally
adoptable without writing to the author: CMU 17-316, NJIT CS 485, and Northeastern CS 7180.**

## 3. The five drop-in courses

### CMU 17-316/616 — AI Tools for Software Development (F25)

`https://ai-developer-tools.github.io/` · MIT

**What an outside instructor gets.** A forkable MkDocs course site under a real MIT `LICENSE` at the
root of `ai-developer-tools/ai-developer-tools.github.io`. A 1,738-word syllabus with the grading
split (46% in-class activities, 42% project, 12% homework essays), the late-work policy, and an
explicit AI-use policy that requires AI throughout development and forbids it for the reflection
essays. A dated day-by-day calendar. Twenty-four downloadable lecture PDFs. All thirteen graded
artifacts — six reflection essays and seven project phases — with student-facing instructions and
rubrics. The repo carries the full source, so an adopter forks and edits rather than transcribes.

**What they still build.** The reading list, which lives on the login-walled Canvas shell. One
lecture slot has no deck. Everything else is there.

### CMU 15-113 — Effective Coding with AI (S26)

`https://www.cs.cmu.edu/~mdtaylor/113/S26/` · **no license stated**

**What they get.** A self-contained archive: full syllabus with AI-use policy, a dated 14-week
schedule, twenty-two downloadable lecture decks, ten of ten graded artifacts with standalone
instructions, published grade weights, setup guides, demo repositories, and — unusually — a
12,000-word retrospective on the pilot run, which is the kind of artifact an adopter almost never
gets.

**What they still build.** The quiz and exam bank. And they must obtain permission: the site states
no copyright, no Creative Commons mark, and no license anywhere, and the three demo repos return
`license: null`.

### NJIT CS 485/698 — AI-Assisted Software Engineering (S26)

`https://kelloggm.github.io/martinjkellogg.com/teaching/cs485-sp26/` · CC BY-SA 4.0

**What they get.** The most complete package in the corpus. Twenty-six slide PDFs covering 25 of 26
meeting days, every one verified as a real payload. Seven reflection essays (a1–a7) and an eight-stage
project (p0–p7), all with full student-facing instructions and point-level rubrics. A syllabus, a
calendar carrying roughly 25 linked readings, three student tutorials (how to save LLM logs, how to
read a paper, a glossary). Every page footer reads: *"© 2022-2026 Martin Kellogg, Andrew Begel,
Austin Henley, Jonathan Bell, Adeel Bhutta and Mitch Wand. Released under the CC BY-SA license."*

**What they still build.** Little. No separate teaching-notes file exists, and the share-alike term
obliges an adopter to release derivatives under CC BY-SA.

### Utah CS 3960 — Vibe Coding (S26)

`https://github.com/utah-cs3960-sp26/syllabus` · **no license stated**

**What they get.** Twenty-one full lecture decks with editable sources, ranging to 67 MB. Five
homework specifications including a staged final project. A syllabus, a 16-week lecture grid with
annotated per-session readings, and runnable activity repositories — an install-Amp lecture-00
activity, a next-token-prediction demo, a tool-restricted agent shell with written week-4 and week-5
activity instructions. Twenty-four further public repos hold actual student submissions, which serve
as worked exemplars. And `writeup.md` is a signed post-mortem by Regehr and Panchekha on what landed
and what did not with 60 students.

**What they still build.** Point rubrics — grading guidance is narrative only. And permission: five
filename variants of `LICENSE` all 404, and all 25 repos in the org report `license: null`. The
course assigns the `chardet` relicensing dispute as a reading.

### Northeastern CS 7180 — Vibe Coding: AI-Assisted SE (S26)

`https://johnguerra.co/classes/aiCoding_spring_2026/` · CC BY-NC 4.0 (materials) · Apache 2.0 (code)

**What they get.** Twenty-one published reveal.js decks with their markdown sources. Five homeworks
and three projects, each with an itemized point rubric. Thirteen ready-made weekly quizzes. A
syllabus, a schedule, a 26 KB reading list, worked example repositories, setup handouts, and a
`COURSE_MEMORY.md` written for the instructor rather than the student. The `LICENSE` file names the
covered material explicitly: slides, syllabus, schedule, readings, homework, project specifications,
and handouts.

**What they still build.** Less than anywhere else. Two caveats: the NonCommercial term may bind
some institutions, and the complete package now lives in `john-guerra/ai-coding-class` framed as the
Fall 2026 successor offering, so an adopter gets the newer edition with the Spring 2026 syllabus
archived beneath it.

### Why Memphis is not a sixth

Memphis COMP 4991/6991 adapts CMU 17-316 and publishes a great deal: a 32-session dated calendar,
six rubriced homeworks, five project phases with detailed instructions, four activity handouts with
AWS and VS Code setup steps. Its auditor classified it 1 and flagged it borderline, so the tie-break
applies. The deciding facts: exactly ten `.pptx` decks are published against roughly sixteen
content-bearing lecture sessions, and every one of the ~22 "Lecture Video" links redirects to
Memphis SSO — so the material for the missing six sessions is gated rather than absent. Authoring
six lecture sessions is designing a significant portion of a course. Separately, the MIT statement in
the site footer is an *attribution to the upstream CMU work*, not a Memphis grant: no LICENSE file
exists in any Memphis-owned public repo, `/LICENSE` on the site 404s, and the backing repo is not
public. An adopter drawn to this lineage should fork CMU 17-316, which is more complete and carries
the license directly.

## 4. What separates the five from the rest

The drop-in courses are not the ones with the most material. They are the ones where three specific
things all happened at once.

- **Slides left the learning-management system.** This is the single strongest discriminator. Every
  category-1 course publishes its decks as downloadable files on an open site. Every category-3 and
  category-4 course routes slides through Canvas. The middle band is where courses publish *some*
  decks: CU Boulder 6 of 28, UMD 8 of 14, UIUC 5 of ~29, Memphis 10 of ~16.
- **Assignment specifications were written as public pages, not LMS posts.** UIUC's five homeworks
  sit on Campuswire. Wisconsin's five projects are named and weighted in the syllabus and specified
  nowhere. UMich routes work through per-student repositories that are not in the public org. In
  each case the course is otherwise substantial.
- **The dominant assessment carries a rubric.** Stanford publishes ten lecture decks, eight
  assignments with point allocations, and roughly 73 readings — and no brief or rubric at all for the
  final project worth 80% of the grade. That one hole is what holds it at 2.

Two further patterns are worth recording because they cut across the corpus.

- **Mid-delivery courses look thinner than they are.** CUHK-Shenzhen (7 decks, week 4 of 14) and
  UMich (12 decks against a 15-week schedule, README stating "if a week is missing, it has not
  happened yet") are accumulating, not withholding. The classification reflects what is available
  now, which is the right answer for an instructor planning next semester, but it will age.
- **Open-by-default is a stated policy in exactly one place.** UMD's syllabus says "All instructor
  provided course material will be open to anyone," and the audit verified the claim against every
  artifact probed. That is a permission to *follow along*, not a license to re-teach — but it is the
  only course in the corpus that states an access commitment at all.

## 5. The eight mixed courses

No `courses/` brief exists for these, so their findings are recorded here.

- **UIUC CS598LMZ — SQA with Generative AI (S25) · 2.** Complete syllabus, a dated 01/21–05/06
  session table, a reading list of 60-plus papers that is the seminar's real spine, and five full
  background decks. Zero of five homeworks have public instructions — they are released on
  Campuswire. Roughly 24 sessions are student paper presentations with no deck, by design. No
  license stated.
- **UCSD CSE 190/291P — Generative AI and Programming (S26) · 2, borderline 1.** Materially the
  richest package among the mixed courses: five unit pages of 6,500–9,000 words each (~35,000 words
  total) with working API code, embedded video, and inline Socratic questions; a 21-session dated
  calendar; four assignment handouts of ~2,000 words with staged submit-review-revise cycles; a
  published grading scheme; an MIT-licensed setup repo. Held at 2 because the peer-review templates
  and participation handouts are unpublished and reviews carry roughly half the grade, the six units
  are not sliced into a day-by-day plan, the markdown source repo (`ucsd-cse-115-215/notes`) returns
  404, and no license is stated.
- **UMich EECS 498-016 — Applied Agentic SE (F26) · 2.** Twelve real Slidev decks shipped as
  `.md` + `.pdf` + `.pptx`, a detailed syllabus with unusually specific itemized point rubrics, a
  15-week phase schedule, seven AI-generated companion podcast episodes with transcripts, and an
  MIT-licensed local-model setup repo. No assignment handouts are public — work is delivered through
  per-student repositories outside the public org. The site does not link the slides; you reach them
  only via the GitHub org. No license on the materials.
- **Aalto — Software Engineering with LLMs (FITech) · 2, borderline 1.** Roughly 45 complete chapters
  across six parts, readable start to finish with no account, with graded exercises embedded inline
  showing their full specs and point values. Held at 2 for three reasons: no license is stated
  anywhere, there are no slides and nothing instructor-facing, and the assessment machinery is bound
  to a closed-source Aalto platform an adopter cannot run. An instructor can point students at this;
  they cannot pick it up and teach it. Note also that the course root now states it is "no longer
  available for credit" while remaining open for self-study.
- **Wisconsin COMP SCI 639 (F26) · 3.** A detailed syllabus with a full grading breakdown, a public
  environment-setup PDF, a 77-link resource guide, a grading-policy page, and a complete 10-point
  oral-code-review rubric. But all 27 lectures sit in a GitLab repo behind UW-Madison Shibboleth,
  and all five projects are named and weighted yet specified nowhere public.
- **FAU COT 6930 (S26) · 3.** A complete Fall 2024 syllabus PDF for the same course is public
  (objectives, an 8-lesson topical outline, LAB 1–6 named one line each, grading weights). The
  Spring 2026 syllabus portal is JavaScript-gated. The `genilab` GitHub org holds exactly two public
  repos, both MIT-licensed *tool* code — a Python framework and a forms project — and no coursework
  of any kind. Assignments are stated to live on Canvas.
- **Colorado State CS-580B3 (S26) · 3.** A detailed syllabus and a genuine 16-week dated calendar
  make the arc fully legible. The Activities page, the one place assignments would live, is unedited
  template text carrying the literal line "The content on this page is placeholder text." The
  Policies page states plainly: "Canvas is where assignments, grades, and lecture slides will reside
  for this course."
- **Harvard HGSE T564A — Vibe Coding (F25) · 3.** One public syllabus PDF is the entire public
  footprint. It describes a genuinely interesting design — six weekly mini-projects, each on a
  different theme with a different tool (Replit, Figma Make, Claude Code), each week pairing a
  classic computer-science text with a contemporary critical piece, culminating in a position
  portfolio. Not one reading citation, handout, deck, or rubric is recoverable. An instructor could
  borrow the concept and would build the entire course.

## 6. Unreachable this pass

These are failures of the audit, not findings about the courses. None was used to downgrade anyone.

- **Harvard HGSE T564A — the syllabus PDF and the whole `kbrennan.scholars.harvard.edu` host.**
  Seven attempts (WebFetch, curl with a Chrome user-agent, curl with a full browser header set, the
  plain-HTTP variant, the `/courses` page, the site root) all returned an identical Akamai-style
  "Access Denied" interstitial — a CDN bot-block, not a login wall. The PDF *is* public: search
  engines index its full text and the Harvard Gazette links to it. Its content was recovered through
  four WebSearch passes plus the Gazette feature, which independently corroborates the structure.
- **FAU COT 6930 — the Spring 2026 Simple Syllabus page and the Medium lecture notes.** The syllabus
  portal returns HTTP 200 with a body containing only the string "Simple Syllabus"; the `?mode=view`
  variant behaves identically. All three `medium.com` URLs returned 403 to the fetcher. Search
  snippets confirm a Koch-authored lecture-note series derived from this course exists; its depth,
  completeness, paywall status, and license could not be verified.
- **Wisconsin COMP SCI 639 — the per-lecture topic list.** `fa26/schedule.html` loads but renders its
  table client-side, showing only "Loading…". The backing `schedule.json` yields the three-unit
  structure and three exam events but no per-lecture topics; four guessed data paths all returned
  403, since the host 403s on absent paths and blocks enumeration. Distinct from the GitLab lecture
  repo, which is genuinely Shibboleth-gated.
- **Stanford CS 146S — one guest slide deck (401, restricted) and the Fall 2025 assignment-deadlines
  Google Doc (404).** Worth recording separately: the site is a Next.js SPA whose entire Syllabus tab
  is dropped by text-extraction fetching. A naive fetch reports "no schedule, no slides, no
  assignments," which is wrong. The real data was recovered by downloading the JS chunks and parsing
  the one carrying the syllabus arrays. Anyone re-auditing this site with text extraction alone will
  badly undercount it.
- **UW CSE 490 A2 — projects 3 and 4.** Their prose specifications sit inside `a3.zip` / `a4.zip` in
  public Google Drive folders, confirmed listable but not opened. Their instruction quality is
  unverified rather than absent.
- **Worked around, nothing lost.** Passau's ACM DL landing page returned 403; the authors'
  self-hosted PDF of the identical paper served fine. UChicago's course page failed WebFetch TLS
  verification ("unable to verify the first certificate") and returned 200 cleanly under curl.
  Northwestern's `ce.northwestern.edu` article mirror failed TLS hostname validation; the same
  article served correctly from `mccormick.northwestern.edu`.

## 7. ECE 30861 / MAGE, by the same criteria

Audited on **actually public** materials only: what is live at the published site, and what is
committed and pushed to the public repository. Local working-tree files, unpushed commits, drafts,
and the authors' knowledge of the course were given zero weight. Verified `git diff origin/main..HEAD
-- course/` is empty, so nothing committed is unpushed, and confirmed the repository is public
through the unauthenticated GitHub API.

**Category 2 — substantial reusable materials.**

**What is genuinely public.** Fourteen module pages, each a real 650–3,000-word instructional page
rather than a title stub. Eleven lecture decks, all substantial at 25–41 slides, downloadable without
login as `.pptx` — verified by unauthenticated `curl` against seven binary URLs returning HTTP 200
with correct content types and multi-megabyte payloads. Six reading PDFs distributed directly. A full
syllabus and a 16-week calendar. A project spine that is the strongest component: an overview page, a
17-slide overview deck, a candidate-projects page, and six phase pages with student-facing
instructions. All of it under an explicit CC BY 4.0 grant, surfaced as a footer line on every page,
with no login anywhere.

That last combination — downloadable decks, explicitly licensed, no login — is rarer than it should
be, and it is the thing most nominally public SE courses quietly fail.

**What holds it at 2.**

- **Roughly half the semester has no lecture material.** Act I has 9 of 9 modules with decks. Act II
  has 4 modules and 2 decks. Act III has one module page, and its landing page ends with the literal
  line "Materials forthcoming" — while the published calendar names six Act III topics for weeks
  10–15. The calendar advertises about six weeks the materials cannot teach.
- **No rubric exists for the component worth 75% of the grade.** The project-assessment page explains
  the mechanism — pods, shared specifications, cross-testing between independently built systems —
  and contains no criteria, no performance levels, and no point allocation. The oral-exams page gives
  logistics and one sentence on "depth and accuracy of their understanding," with no question bank,
  no administration protocol, and no scoring rubric.
- **No setup or tooling guidance.** For a course whose premise is delegating implementation to
  agents, there is no agent setup guide, no named tool or model floor, no cost guidance for the GenAI
  access students are required to have, no starter repository, and no harness for the cross-testing
  the project assumes.

**Three defects worth fixing regardless of category.** One committed 32-slide deck
(`2-2-Modeling-1-Purposeful-Reduction.pptx`) serves HTTP 200 at its public URL but renders as
"(coming soon)" on its module page, because its front-matter entry carries no `src:` — a published
deck that reads as nonexistent to anyone browsing. No rendered PDFs accompany any deck, so an adopter
without PowerPoint or LibreOffice gets nothing readable. And the documented one-click course bundle
is a capability, not an artifact: the GitHub API reports 0 releases and 0 tags.

**Two licensing loose ends.** `course/LICENSE` carries an unresolved inline note — "REVIEW:
attribution names … pending author confirmation before first public release" — and the file itself is
excluded from the site build, so `/teach/LICENSE` 404s and the full text is repo-only (the footer
grant is discoverable, the text is not). More consequentially, **the book states no license at all**,
only "© James C. Davis, 2026–present," while the syllabus assigns it as a required text. For an
adopter who wants to assign it, that is an open permission question.

**What is missing for category 1.** Decks for the back half of the semester: Modeling session 2,
Alignment, Failure-Aware Engineering, and the six named Act III topics that have no module page at
all. A per-phase project rubric with criteria, levels, points, a submission format, and at least one
worked example. Oral-exam instruments: a question bank keyed to modules, an administration protocol,
and a scoring rubric. Student setup and tooling guidance. Rendered PDFs beside every `.pptx`. The
`src:` fix on the Modeling deck. A tagged release carrying the bundle, the `REVIEW:` note resolved,
and a license on the book.

**Where it honestly stands.** On availability alone ECE 30861 sits in the upper part of category 2 —
ahead of the common academic pattern of a public syllabus over a repository of assignment stubs, and
ahead of most of this corpus on the specific axis of downloadable, explicitly licensed, login-free
material. It falls short of the five drop-in courses on breadth and assessment. NJIT publishes 26
decks against 26 meeting days; ECE 30861 publishes 11 against a 16-week calendar. Northeastern
publishes an itemized point rubric for every homework and project; ECE 30861 publishes none for the
component carrying three-quarters of the grade. It is a well-licensed, genuinely downloadable *half*
of a course package with an unusually complete project spine. Being the authors is not a reason to
round that up.

## 8. Method and limits

- Twenty-five courses were audited in five batches plus a separate self-audit, each against the live
  primary URLs recorded in [sources/](sources/). Auditors followed links outward into slide
  directories, assignment trees, GitHub organizations, and license endpoints rather than stopping at
  the landing page.
- Claims that decide a classification were checked as artifacts, not as links: slide decks were
  downloaded and their byte counts and content types recorded; licenses were read from `LICENSE`
  files and the GitHub license API, not inferred from a footer; repository listings came from the API
  rather than the rendered page.
- Five load-bearing claims were then re-verified independently after the batches returned: CMU
  17-316's MIT `LICENSE` (200, 1,075 bytes, "MIT License / Copyright (c) 2025 AI-Developer-Tools"),
  its 24 deck PDFs, NJIT's CC BY-SA footer text, Utah's absent `LICENSE` and null license field, and
  Memphis's exactly ten published decks.
- **This is a snapshot.** Four courses were mid-delivery on 2026-09-30 (CUHK-Shenzhen, UMich,
  Wisconsin, ECE 30861), and three of the five drop-in courses run in Spring 2026. Availability
  moves; the numbers here will age within a term.
- **The audit does not judge quality.** A category-1 course is available, not good. A category-3
  course may be the better course. [matrix.md](matrix.md) and [organization.md](organization.md)
  address content; this file addresses availability, and the two say different things about the same
  courses.
