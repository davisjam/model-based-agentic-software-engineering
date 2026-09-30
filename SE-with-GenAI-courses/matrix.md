# Curriculum matrix — courses × concepts

Coded 2026-09-30, from the evidence files in [sources/](sources/) only (no ECE 30861 material had
been read at coding time). Scale per cell: **E** = explicit (the course states and teaches the
concept) · **P** = partial/adjacent (a related but narrower or weaker form) · **—** = not evident
in available materials. A **—** is a statement about the public record, not the real course; for
courses marked *thin* below, most **—** cells mean "unobservable," and the corpus-level pattern
claims rest on the well-evidenced courses.

**Coded set (14):** the 12 core comparators with at least moderate public evidence — Stanford
CS146S, CMU 17-316, CMU 15-113, UMD 398Z, NJIT CS485, Utah CS3960, Northeastern CS7180, Memphis
COMP4991, CUHK-Shenzhen CSC4801, Passau 5487, CU Boulder CSCI7000, UVA CS4501 — plus three mixed
courses whose engineering-with-AI track is richly documented: UCSD CSE190/291P, Wisconsin CS639,
UMich EECS498. **Thin set (5, not cell-coded):** Harvard CS1060, Northwestern CS397, UW CSE490A2,
Virginia Tech CS5914, UChicago MPCS51238 — coded only where a public statement exists (noted
inline); everything else is unobservable.

Shorthand: Stan = Stanford · C17 = CMU 17-316 · C15 = CMU 15-113 · UMD · NJIT · Utah · NEU =
Northeastern · Mem = Memphis · CUHK · Pas = Passau · CUB = CU Boulder · UVA · UCSD · Wis =
Wisconsin · UM = UMich.

## Delegation

| Concept | Stan | C17 | C15 | UMD | NJIT | Utah | NEU | Mem | CUHK | Pas | CUB | UVA | UCSD | Wis | UM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 what work to delegate | E | P | E | P | P | E | E | P | — | P | P | — | E | P | P |
| D2 what authority/freedom to delegate | E | — | — | — | — | P | E | — | — | — | — | — | E | — | E |
| D3 decomposition of work for agents | E | P | P | P | P | E | P | P | P | P | — | — | P | P | P |
| D4 human vs agent responsibility | E | E | E | P | P | E | E | P | — | E | P | P | E | E | E |
| D5 capability-dependent delegation | P | P | P | P | — | P | P | — | — | P | P | — | P | — | P |

Evidence for the E cells (representative; see the per-course evidence file for the full context):

- **D1** — Stan: division-of-labor content in "Coding Agent Patterns" (wk4) and the reported thesis
  that "judgment skills (decomposition, architecture, business context) remain distinctly human."
  C15: objective "Choose appropriate AI tools based on task requirements, tool capabilities, and
  project constraints" + "Articulate a personal framework for when and how to use AI." Utah:
  objective to develop workflows leveraging both AI and human strengths; "What's hard is handling
  edge cases... and applying some taste." NEU: "Humans write test descriptions and assertions. AI
  writes the implementation and boilerplate." UCSD: "Have agents handle boilerplate and tedious
  code while humans focus on UX testing, design decisions, and architectural choices requiring
  domain expertise." *Thin set:* UW's official description is a direct D1/D3/D4 statement ("It
  teaches clear specifications, system decomposition, code review, debugging, and similar skills
  needed of a team leader. A programmer directing AI agents is a team leader") — coded E on D1/D3/D4
  despite the thin record, on the strength of the official catalog text.
- **D2** — Stan: wk5 writeup must document "autonomy levels and supervision methods"; lecture
  content on "strategic vs. YOLO agent profiles." NEU: hook-mediated permissioning ("PreToolUse
  hooks block writes to sensitive files"). UCSD: guardrail hooks with Allow/Confirm/Deny over a
  typed tool surface. UM: students build "an approval layer... then rule-based auto-approval with a
  decision log" and study "Permission Policy and How It Fails."
- **D3** — Stan: multi-agent coordination with git worktrees (wk5), "Compose tools and skills into
  reliable development systems." Utah: objective "Understand how to create modularity to scale AI
  coding"; lecture C2 "Parallelizing Work."
- **D4** — C17: human-only reflection essays defended in class; "full understanding demonstrated
  through passing unit tests." C15: "never commit code you cannot explain." Utah: assigned reading
  "AI Can Write Your Code. It Can't Do Your Job."; "Your job is to deliver code you have proven to
  work." NEU: "You are the author of record. You are responsible for bugs, vulnerabilities, and
  license violations." Pas: "the human developer ultimately needs to retain both control over the
  tools and an understanding of the developed system." Wis: "can you explain, defend, and verify
  what it produced?" UM: "AI use is required. Understanding is what gets graded."
- **D5** — no E anywhere in the corpus: capability-*dependent* delegation appears only as
  tool-strengths/weaknesses comparison (Stan "Swiss cheese capability gaps"; UW "understanding
  their strengths and weaknesses"; Pas failure demonstrations), never as an explicit
  delegation-policy-scaled-to-capability framework.

## Modeling

| Concept | Stan | C17 | C15 | UMD | NJIT | Utah | NEU | Mem | CUHK | Pas | CUB | UVA | UCSD | Wis | UM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| M1 explicit models as engineering artifacts | P | P | P | P | P | — | P | P | P | P | — | P | P | P | P |
| M2 purposeful abstraction/reduction | — | — | — | — | — | — | — | — | — | — | — | — | P | — | — |
| M3 choosing which distinctions to preserve | — | — | — | — | — | — | — | — | — | — | — | — | — | P | — |
| M4 degrees of freedom / parsimony | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| M5 multiple models/views of one system | — | — | — | — | — | — | — | P | — | — | — | — | — | — | — |
| M6 model/implementation correspondence | — | P | — | — | P | — | P | — | — | P | — | — | — | P | — |
| M7 durable knowledge from prototypes/AI impl. | P | P | P | P | — | — | — | — | — | P | — | — | P | — | — |
| M8 preserved design judgments for later agents | E | — | P | P | — | E | E | — | P | — | — | — | E | E | P |

Evidence and reading:

- **M1 is uniformly P, never E.** Many courses require model-like artifacts — dev specs (C17, NJIT,
  Mem), architecture diagrams and API specs in Mermaid (Mem), storyboards, "PRDs for agents"
  (Stan), spec-driven development (CUHK), design docs before coding (Wis, UCSD), a spec rubric
  worth 50% (UM) — but in every case the artifact is a conventional lifecycle document or an
  agent-input document. No course teaches modeling *as a discipline*: what to include, what to
  leave out, what the model is *for*.
- **M2–M5 are near-empty.** The only P cells: UCSD's type-driven design ("Type signatures help
  both human and agent reason about abstractions") for M2; Wisconsin's "Goldfish tests" (a fresh,
  context-free AI verifying that the design docs suffice) for M3 — an operational probe of whether
  the preserved distinctions are adequate, though not framed that way (surveyor interpretation);
  Memphis's storyboard + architecture + API-spec triple for M5 (multiple artifact kinds, not
  taught as multiple views of one system).
- **M6** — Pas: the quality lecture makes the student responsible for "consistency between user
  stories and user requirements, implementation and user stories, or expected and tested
  behaviour." NEU: "Transform acceptance criteria from issues into test names and definitions of
  done." NJIT/C17: story → acceptance criteria → test chains. Wis: Goldfish comprehension checks
  against design docs. All P — correspondence appears as practice, never as a named principle.
- **M7** — P where reflection/handoff artifacts capture learning: C15 "leave READMEs... and prompt
  logs for whoever inherits the code—including future you" + the class-authored best-practices
  page; UMD's generate-design-doc-then-review workflow; Stan's "prompt as source code:
  specifications should be versioned with same discipline as traditional code" (secondary); Pas's
  graded report with worked failure examples.
- **M8 is the corpus's one strong Modeling concept — and it arrived from industry practice, not
  from modeling theory.** E cells: Stan ("CLAUDE.md project context pattern," Warp saved
  rules/playbooks); Utah (context engineering as a named skill; documentation-for-agents via the
  "Harness engineering" reading); NEU ("CLAUDE.md Pattern: Persistent project context file
  maintained across sessions... retain findings and plans in files rather than context window");
  UCSD ("Store guidelines, decisions, and schemas in the repository so the agent (and teammates)
  can access consistent information across sessions"); Wis (the "Elephant-Goldfish Model" —
  design documentation as the durable memory). In each case the mechanism is the agent-context
  file, taught as tool practice.

## Alignment / control

| Concept | Stan | C17 | C15 | UMD | NJIT | Utah | NEU | Mem | CUHK | Pas | CUB | UVA | UCSD | Wis | UM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A1 guidance vs enforcement | — | — | — | — | — | — | E | — | — | P | — | — | E | — | P |
| A2 deterministic checks around probabilistic agents | E | E | P | P | E | E | E | P | P | E | — | — | E | P | E |
| A3 executable specs, tests, validators, gates, sanctioned paths | E | P | — | — | E | E | E | P | P | E | — | — | E | P | E |
| A4 where an obligation should be checked | — | — | — | — | — | — | P | — | — | — | — | — | P | — | — |
| A5 recurring failures → durable controls | — | — | P | — | — | — | — | — | — | P | — | — | — | — | P |
| A6 implementation aligned with intent as system evolves | P | P | — | — | P | E | P | P | — | E | P | — | — | — | P |

Evidence:

- **A1** — NEU teaches the distinction as an explicit decision rule: "If you would be upset when
  the rule is broken, use a hook. If it's a preference, use CLAUDE.md." UCSD: "Safety requires
  defining explicit policies about acceptable behavior, then enforcing them through code rather
  than relying on model behavior"; "syntactic pattern matching is NOT a safety mechanism." UM
  (P): approval layer + permission policy are built and hardened, but the guidance/enforcement
  contrast is not itself named in public materials. Pas (P): CI "always enforced even without AI
  support" alongside prompt-strategy guidance — both present, distinction unnamed.
- **A2** — the corpus's strongest Alignment concept. Stan: test scripts gate assignments; Semgrep
  in CI. C17: "full understanding demonstrated through passing unit tests"; TDD/CI lectures.
  NJIT: coverage floors, GitHub CI, "Static analysis + LLMs," "Verification + LLMs." Utah: the
  whole A-track (testing → coverage → fuzzing → assertions/QuickCheck → program verification)
  positioned against agent output. NEU: "TDD serves as the most powerful form of this
  verification"; deterministic hook scripts. Pas: mandatory CI running "code formatters, linters,
  and the test suite so that core consistency and quality checks are always enforced even without
  AI support"; a coverage bar that "can unlikely be achieved by 'vibe coding'." UCSD: "the
  confidence in the built system rests on _the quality of the verifier_"; sanitizers,
  property-based invariant checks, stress tests, independent verifier re-runs against reward
  hacking. UM: regression gates, eval suites (8 tasks × 3 runs, pass rates).
- **A3** — same sites as A2 plus: UCSD's typed tool primitives over free-form shell (sanctioned
  paths); UM's stop conditions, model allowlists, approval layers; NEU's 8-gate security pipeline
  and "GitHub Issues as Specifications."
- **A4** — never explicit. Closest: NEU's staged defense-in-depth pipeline and PreToolUse vs
  PostToolUse hook timing; UCSD's placement of guardrails at the tool-call boundary vs
  verification at output. Neither frames "where should this obligation be checked?" as a design
  question.
- **A5** — no E. P cells are soft conversions: C15's class best-practices page (recurring
  experience distilled into standards — norms, not mechanical controls); Pas's report structure
  (failures → documented adaptations); UM's teardown report feeding the hardening phase. No course
  teaches failure→lint/gate conversion as a discipline.
- **A6** — Pas: mid-project requirement changes exist precisely because "AI tools [must] be able
  to support maintenance and evolution, rather than only generating the code of an initial
  prototype"; the consistency chain (M6 quote) is the alignment statement. Utah: "Maintaining
  large software projects over time, without the AI breaking older features or making the code
  impossible to work with, is a major theme."

## Traditional SE under AI

| Concept | Stan | C17 | C15 | UMD | NJIT | Utah | NEU | Mem | CUHK | Pas | CUB | UVA | UCSD | Wis | UM |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| T1 requirements | P | E | — | — | E | — | E | E | E | E | — | E | — | P | P |
| T2 specification | P | E | P | P | E | — | E | E | E | P | — | E | P | E | E |
| T3 architecture | P | P | — | P | P | P | P | E | — | — | — | E | P | P | E |
| T4 design | P | P | P | P | P | P | P | E | P | P | P | E | E | E | E |
| T5 implementation | E | E | E | E | E | E | E | E | E | E | E | E | E | E | E |
| T6 testing/validation | E | E | P | P | E | E | E | E | E | E | E | P | E | E | E |
| T7 maintenance/evolution | P | P | P | P | P | E | P | P | P | E | E | E | — | — | P |
| T8 deployment/operations | E | E | P | — | E | — | E | E | P | P | — | — | — | E | P |
| T9 teamwork/process | P | E | P | P | E | P | E | E | E | E | — | P | P | P | — |
| T10 measurement/evaluation | P | E | — | P | P | P | E | — | — | P | E | — | E | — | E |

Notes: T5/T6 are near-universal E — implementation-with-AI and testing are the corpus's common
core, matching Geng et al.'s topic-prevalence finding. T1/T2 E-cells cluster in the CMU
family (C17/NJIT/Mem: Mom-Test user discovery, INVEST-scored LLM-generated user stories, dev-spec
milestones) plus CUHK ("Specification Driven Development") and Passau/UVA (requirements units).
T7 is mostly P — brownfield/evolution work exists (Utah's sustained maintenance theme, Passau's
changing requirements, CU Boulder's refactoring/migration spine, Memphis's "Vibe Coding Brownfield
Projects", UVA's maintenance week) but only three courses make it central. T10 E-cells: C17
("analyze the impact of AI tools on software productivity across individuals, teams, and
organizations"), NEU (pass@k/pass^k, LLM-judge bias), UCSD (gold datasets, precision/recall/cost),
UM (eval suites, cost reports), CU Boulder (empirical evaluation as project stage).

## Cross-corpus observations (interpretation)

1. **The corpus's center of gravity is Delegation-D4 + Alignment-A2:** almost every well-evidenced
   course teaches "the human retains responsibility" and "verify AI output with deterministic
   machinery (tests/CI foremost)." These two cells are the emerging consensus.
2. **Modeling is the empty quadrant.** Outside M8 (agent-context files) and uniform P-grade
   conventional documents (M1), the modeling concepts — purposeful reduction, preserved
   distinctions, parsimony, multiple views, model/implementation correspondence as a principle —
   are essentially absent from every public record. Where persistent knowledge does appear, it
   entered through industry tool practice (CLAUDE.md et al.), not through modeling theory.
3. **Alignment appears as practice, rarely as principle.** Verification machinery is everywhere
   (A2/A3), but the meta-level concepts — guidance vs enforcement as a distinction (A1: only
   Northeastern and UCSD), check placement (A4: none), failure-to-control conversion (A5: none
   explicit) — are thin. The two E-cells on A1 both come from courses teaching Claude Code's
   hooks/CLAUDE.md machinery, i.e., the distinction was surfaced by the tool's design.
4. **Where the concepts do appear, the vocabulary is tool-specific, not conceptual** — CLAUDE.md,
   hooks, guardrails, evals — with two exceptions: UCSD's verifier-quality thesis and Passau's
   grade-the-process model, which both state tool-independent principles.
