# How each course is intellectually organized

Written 2026-09-30, before any ECE 30861 material was read. Everything in this file is
**reconstruction from published sequence, objectives, and assessment structure** — the courses do
not generally state their own decomposition, so each entry is surveyor interpretation, anchored in
quotes where they exist. The question asked of each course: *what problem decomposition does it
hand the student?*

## The organizing shapes found in the corpus

Four recurring shapes, plus singletons. Assignments below are interpretation; several courses mix
shapes and are listed under their dominant one.

### Shape 1 — SDLC activity → ways AI can assist (the dominant shape: 8 courses)

The classical lifecycle is the spine; AI is threaded through each stage.

- **CMU 17-316 / NJIT CS485 / Memphis COMP4991** (one design family): seven project phases from
  requirements to postmortem, executed by directing an LLM. The lifecycle is inherited intact from
  conventional SE pedagogy; what changes is the production mechanism ("You will not write actual
  code in this class") and a per-phase human-only reflection loop.
- **Passau 5487**: explicitly a matrix — "the course is organised around core software engineering
  phases rather than AI aspects" (their stated durability argument) × four AI-integration modes
  (Chat/IDE/Agent/API). The most self-aware instance of Shape 1: the stable axis is chosen
  deliberately because the AI axis churns.
- **UVA CS4501**: the week sequence is the lifecycle in order, "emphasis on experiencing a new
  type of development," converging on an MVP.
- **CUHK-Shenzhen CSC4801**: basis (mechanism literacy) → techniques (the lifecycle re-taught
  agent-first, requirements through AIOps) → application (competitive team build). The middle act
  is Shape 1; the bookends are not.
- **Harvard CS1060** (thin evidence): "to go through the entire software engineering life cycle" —
  the catalog and instructor statements are pure Shape 1.
- **Aalto** (mixed): hemisphere 1 is lifecycle-with-LLMs.

*What Shape 1 implies:* the student's mental model of SE is unchanged; AI is a new tool at each
familiar station. Passau alone argues this is a feature (stability under tool churn).

### Shape 2 — tool/agent capability → techniques for using it (5 courses)

The tool ladder is the spine; engineering practice is what you climb it with.

- **Stanford CS146S**: foundations → agent anatomy → IDEs/context → agent patterns → terminal →
  assurance → operations, with each week's assignment onboarding another commercial tool (Cursor,
  Claude Code, Warp, Semgrep, Graphite, bolt.new). Tool-portfolio fluency is an explicit outcome;
  the SDLC appears, but as the terrain the tools traverse.
- **Northeastern CS7180**: a declared three-paradigm ladder (Claude Web → IDE-centric → Claude
  Code → Agent SDK) interleaved with a professional-practice ladder (user stories → Scrum/TDD →
  CI/CD → security gates → production). Dual-spine, tool ladder dominant.
- **UMD CMSC 398Z**: apprenticeship up a tool ladder (Copilot → `llm` CLI → Claude Code on real
  codebases), graded almost entirely on reflection about the tools.
- **CMU 15-113**: an escalating tool ladder (chatbot → IDE agent → agentic workflows/RAG) whose
  distinctive move is that the class *itself* produces the normative layer (the living
  best-practices standards).
- **Wisconsin CS639** (mixed): a project ladder (frontend → full-stack → RAG → multi-agent) that
  doubles as a tool-capability ladder.

*What Shape 2 implies:* the field's knowledge is organized around what the tools can do now — the
shape most exposed to obsolescence, and several of these courses say so ("experimental," "rapidly
shifting topic").

### Shape 3 — new engineering problem created by AI → response (4 courses, each partial)

Some part of the course is organized around a problem that did not exist before delegable
implementation, with a principled response.

- **Utah CS3960** — the clearest instance. The named problem: "Maintaining large software projects
  over time, without the AI breaking older features or making the code impossible to work with, is
  a major theme"; "AI tools make it easy to build brittle prototypes very quickly. What's hard is
  handling edge cases, dealing with interaction between features, and applying some taste." The
  response is structural: strand A repositions the classical verification stack (testing →
  coverage → fuzzing → assertions → verification) as the human's lever over agent output; strand C
  professionalizes context, decomposition, and documentation as agent-facing assets. This is a
  problem→principles organization wearing a practical course's clothes.
- **UW CSE490A2** — a role-reframe as the organizing idea: "A programmer directing AI agents is a
  team leader," so the curriculum is the classical leadership skill set (specification,
  decomposition, review, debugging). The new problem (delegation) is answered by an old
  discipline (management), taught on an existing codebase. Thin record, but the organizing
  statement is the official description itself.
- **UCSD CSE190/291P** (mixed) — a stated principle organizes the assurance strand: traditional
  confidence signals fail at agent scale, so "the confidence in the built system rests on _the
  quality of the verifier_," with reward-hacking and independent verification as consequences.
  A genuine problem→principle organization for one strand of a build-AI-systems course.
- **Passau's assessment model** (the course is Shape 1, but its *grading* is Shape 3): the new
  problem — "the work of the students and the AI is directly mixed" — is answered by displacing
  assessment onto the process record and calibrated reflection. A governance response, published
  with rubrics.

### Shape 4 — build-to-understand: de-black-box the agent (1 course)

- **UMich EECS498**: "drive one, take it apart, build one worth keeping." Phase 1 uses a
  transparent agent on local models so "context, model, prompt" stay visible; Phases 2–3 rebuild
  the agent (loop, tools, approval layer, evals) and harden it (permission policy,
  prompt-injection defense, regression gates). The organizing bet: you learn to direct agents by
  constructing their control machinery. Much of what is taught is, in substance, governance
  engineering — but framed as systems-building, not as an engineering method.

### Singletons

- **CU Boulder CSCI7000**: research-field survey organized by the instructor's practice area
  (maintenance/refactoring/migration) with GenAI as the new instrument.
- **Northwestern CS397**: calibrate the tools (2 weeks), then one sustained team build. The
  intellectual stance visible: "these tools are only as good as the user."
- **UChicago MPCS51238**: lean-startup shipping practicum; AI is an accelerant, not an object of
  study.
- **Virginia Tech CS5914** (thin): AI/ML literacy → GenAI across delivery tasks → a prompt-library
  capstone (prompting as a codifiable asset).

## The corpus-level finding (interpretation, pre-ECE-comparison)

**No course in the corpus organizes its whole curriculum around the engineering consequences of
delegable implementation as a named conceptual decomposition.** The dominant organizations are the
inherited SDLC (Shape 1) and the current tool landscape (Shape 2). This matches Geng et al.'s
independent conclusion that "AI-assisted software engineering remains a design space rather than a
standardized curriculum" and that the new elements are "layered onto" familiar SE foundations.

But the fragments of a consequences-first decomposition exist, scattered:

- **A delegation pillar exists in fragments.** UW states it outright (programmer-as-team-leader);
  Stanford teaches autonomy levels and supervision; UMich builds approval/permission machinery;
  division-of-labor statements recur (Northeastern, UCSD).
- **An alignment/verification pillar exists in strong form, as practice.** Deterministic
  verification around probabilistic generation is the corpus's most convergent idea — Utah's
  A-track, Northeastern's TDD-as-highest-leverage + hooks-vs-CLAUDE.md, UCSD's verifier-quality
  thesis, Passau's CI-independent-of-AI, NJIT's correctness arc. Two courses (Northeastern, UCSD)
  even articulate the guidance-vs-enforcement distinction.
- **A modeling pillar is almost entirely absent.** What exists is the persistent-context practice
  (CLAUDE.md, design-docs-first, Wisconsin's Elephant-Goldfish) — durable knowledge for agents —
  which arrived from industry tool conventions, not from any theory of purposeful abstraction.
  No course teaches choosing what a model must preserve, parsimony, or multiple views.

So the honest summary of the external corpus on its own terms: **the field has converged on
"delegate, then verify" as paired practices, has begun to institutionalize persistent context as
an artifact, and has nowhere assembled these into a principled decomposition of the new
engineering problem.** The nearest approaches are Utah (problem-named, classical-response),
UCSD's verifier thesis (one principle, sharply stated), and Passau's assessment model (one
governance principle, published with evidence).
