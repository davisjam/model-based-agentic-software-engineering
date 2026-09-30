# ECE 30861 / MAGE vs the external corpus

Written last, 2026-09-30, after sections 1–4 were complete and committed — the external coding was
frozen before any ECE 30861 material was read. ECE 30861 sources read for this comparison: the
course index and reference syllabus, the lecture index (three acts), the Act II unit pages
(Delegation, Modeling, Alignment, Failure-Aware Engineering), and the `book/part2/` chapter list.
Not read: individual slide decks, most book chapters, project/assessment detail — so "not evident"
claims about ECE 30861 below are bounded by that reading, exactly as external "not evident" claims
are bounded by public materials.

ECE 30861's shape, for reference: **Act I Foundations** (process, teamwork, requirements,
specification, architecture, design, validation, decision-making/metrics) → **Act II Delegation
and Control** (Delegation: BOUND → EQUIP → AUTHORIZE → VERIFY; Modeling: purposeful reduction and
systems of models; Alignment: from guidance to authority, governing realization; Failure-Aware
Engineering) → **Act III Software in the World** (operations, security, maintenance, evolution,
professional judgment; materials forthcoming). Organizing claim: engineering is "exercising
informed control over consequential systems"; "we can delegate work to an agent; we cannot
delegate responsibility to it."

## 1. Shared — where other courses genuinely got there too

These are not near-misses; each is a real conceptual equivalent, usually under different
vocabulary, and several predate or parallel ECE 30861's framing.

**Delegated work, retained responsibility — corpus-wide consensus.** ECE 30861's central
delegation claim has independent arrivals nearly everywhere the record is rich: Passau ("the
human developer ultimately needs to retain both control over the tools and an understanding of
the developed system"; "the developer still has to retain responsibility for the produced
system"), Northeastern ("You are the author of record"), Wisconsin ("can you explain, defend, and
verify what it produced?"), CMU 15-113 ("never commit code you cannot explain"), Utah ("Your job
is to deliver code you have proven to work"), UMich ("Understanding is what gets graded"). This
is the emerging consensus of the field, not a distinctive position.

**Delegation as an old problem with disciplinary precedents.** UW CSE 490A2 makes the same move
ECE 30861 makes with nursing delegation and factory inspection, using a management precedent: "A
programmer directing AI agents is a team leader," so the curriculum is the classical leader skill
set (specification, decomposition, review). This is the closest external equivalent to
ECE 30861's delegation-is-an-old-problem framing — arrived at independently, stated in an
official course description.

**Authority as a variable independent of capability (AUTHORIZE).** Stanford grades writeups on
"autonomy levels and supervision methods" and teaches "strategic vs. YOLO agent profiles"; UMich
has students build "an approval layer... then rule-based auto-approval with a decision log" and
studies "Permission Policy and How It Fails"; UCSD teaches guardrail hooks (Allow/Confirm/Deny)
over a deliberately small typed tool surface. The corpus has real, taught equivalents of
capability-is-not-authority.

**Deterministic verification around probabilistic producers (the enforcement half of Alignment).**
The corpus's strongest convergence. Utah repositions the classical verification stack (testing →
coverage → fuzzing → assertions → verification) as the human's lever over agent output; NJIT ends
its arc in "Static analysis + LLMs" and "Verification + LLMs"; Passau mandates CI "always
enforced even without AI support" and sets a coverage bar that "can unlikely be achieved by 'vibe
coding'"; Northeastern calls verification mechanisms "the single highest-leverage thing" and
teaches deterministic hook scripts and an 8-gate pipeline; UCSD states the principle
tool-independently — "the confidence in the built system rests on _the quality of the verifier_"
— and teaches independent verifier re-runs against agent reward hacking.

**Even the guidance-vs-enforcement distinction has two external arrivals.** Northeastern states
it as a decision rule: "If you would be upset when the rule is broken, use a hook. If it's a
preference, use CLAUDE.md." UCSD: "defining explicit policies about acceptable behavior, then
enforcing them through code rather than relying on model behavior"; "syntactic pattern matching
is NOT a safety mechanism." These are genuine equivalents of Alignment's core contrast — reached,
in both cases, through the design of the tooling being taught (hooks vs context files) rather
than as a stated engineering principle, but reached nonetheless.

**Persistent context so agents need not re-infer (the practice slice of Modeling).** The
agent-context-file practice is taught explicitly at Stanford (CLAUDE.md pattern; "prompt as
source code... versioned with same discipline as traditional code" per secondary sources), UCSD
("Store guidelines, decisions, and schemas in the repository so the agent (and teammates) can
access consistent information across sessions"), Northeastern ("retain findings and plans in
files rather than context window"), Utah (context engineering as a named skill;
documentation-for-agents), and Wisconsin (design docs as the durable memory in its
"Elephant-Goldfish Model"). ECE 30861's claim that knowledge should live in the environment so
reasoners "do not have to reconstruct it anew" has a thriving practice-level counterpart.

**Assessment redesigned for mixed authorship.** Passau published the most developed external
answer: grade the process record and calibrated reflection, not the artifact, "since the work of
the students and the AI is directly mixed" — with full rubrics and first-run evidence in
ICSE-SEET 2026. ECE 30861's oral-exam emphasis is a different mechanism aimed at the same
problem; neither side of that comparison is unique in kind.

## 2. Distinctive — not found in the external corpus

**Modeling as a discipline is the sharpest differentiator.** The external Modeling quadrant is
nearly empty (matrix M2–M6): no course teaches purposeful reduction ("what must this model
preserve, and what can it safely leave out?"), obligation vs degrees of freedom, parsimony, the
model/representation distinction, capability-scaled specification (the obligation boundary that
doesn't move vs the specification boundary that does), or systems of models (meaning,
correspondence, identity/authority, composition). External courses require model-like documents
(dev specs, Mermaid diagrams, PRDs, spec-driven workflows) and teach context files as practice —
but nowhere is *choosing the reduction* itself taught. Wisconsin's Goldfish test (a fresh
context-free AI probing whether the design docs suffice) is the one external mechanism that
operationally tests model adequacy, and even it is framed as a verification trick, not a modeling
principle.

**The integrated decomposition itself.** No external course organizes its curriculum as *the
engineering consequences of delegable implementation* with named, connected pillars. The corpus's
dominant organizations are the inherited SDLC and the current tool ladder ([organization.md](organization.md));
its fragments of delegation, verification, and persistent context are distributed across courses
and, within any one course, are not connected by an argument like "Modeling determines what
engineering knowledge we make explicit. Alignment determines what consequence that knowledge
should have." The closest external approaches are partial: Utah (problem-named:
maintainability under agents; classical response), UCSD (one principle — verifier quality —
sharply stated), UW (delegation-as-management), Passau (assessment-model principle). Geng et
al.'s independent conclusion supports this: "the courses do not yet reflect a single curricular
model... AI-assisted software engineering remains a design space rather than a standardized
curriculum."

**Alignment's meta-level machinery.** Externally, enforcement is taught as practice; the
meta-concepts are absent from every public record we coded: check placement ("the earliest
boundary where you can actually decide it" — matrix A4: no E anywhere), the
correspondence/conformance/acceptance distinction, sanctioned paths with provenance-carried
admission, governance conversion (failure → durable structure, with the what-was-missing
diagnostic), engineering capital and its depreciation, and the recursion (model the control
machinery itself). Matrix A5 (recurring failures → durable controls) has no explicit external
instance; the nearest are CMU 15-113's class-authored best-practices norms and UMich's teardown
report feeding a hardening phase.

**Failure-aware engineering as a unit** — attribution of an incident across
implementation/design/architecture/specification/requirements levels, Schön-style reflection into
repertoire, severity as a model of consequence. External courses have postmortems (CMU family
P7), reflective essays, and failure demonstrations (Passau), but no taught framework for what a
failure reveals about the engineering rather than the artifact.

**A capability-conditioned specification theory.** Matrix D5 has no external E: tool
strengths/weaknesses comparison is common, but nothing like the specified-region argument
(scaffolding shrinks with capability; the obligation does not).

## 3. Plausibly omitted by ECE 30861 — recurring external ideas not evident in its read materials

This direction matters as much as §2. Each item recurs across well-evidenced external courses and
is *not evident in the ECE 30861 materials read* (which, per the header, excludes slides, most
book chapters, and project/assessment detail — some may be present there).

- **Hands-on multi-tool fluency as an outcome.** Stanford, UMD, Northeastern, UW, and Wisconsin
  treat concrete skill across a portfolio of current commercial tools (and knowing their
  comparative strengths) as a first-class graded outcome. ECE 30861 states the opposite stance
  deliberately ("We study contemporary mechanisms... for the engineering purposes they serve,
  rather than the details of particular products") — a real trade: corpus courses bet that
  tool-specific skill transfers and motivates; the risk on ECE 30861's side is graduates fluent
  in principles but unpracticed in the tools they will be handed.
- **Prompting and context-engineering craft at the technique level.** Prompting is among the most
  prevalent topics corpus-wide (Geng et al.: 9 of 18 topic lists); Stanford assignment 1 drills
  six named techniques; Northeastern teaches prompt engineering as a unit. ECE 30861's
  representation-engineering framing covers the *why*; drilled technique is not evident.
- **AI-specific security content.** Prompt injection (CUHK dedicated lecture; UMich's "A
  Repository That Tries to Prompt-Inject Your Agent"; UCSD's Unit 3), vulnerability profiles of
  AI-generated code and slopsquatting (Northeastern's Veracode/OWASP material), agent
  sandboxing. ECE 30861's Act III lists "Security & Adversarial Engineering" as forthcoming, so
  this may be planned — but the corpus teaches it now, and the AI-specific attack surface is a
  distinct body of content from classical security.
- **Quantitative eval formalisms for agent work.** pass@k vs pass^k for production (Northeastern),
  gold datasets with precision/recall/cost tradeoffs (UCSD), eval suites with repeated-run pass
  rates and cost reports (UMich), LLM-as-judge with named biases (Northeastern). ECE 30861 has
  decision-making/metrics and validation units; agent-eval formalism specifically is not evident.
- **The with-and-without-AI contrast as pedagogy.** The CMU family's paired structure (AI-mediated
  phases + AI-free reflective essays defended in person; human-first work products before AI
  comparison) and Memphis's per-unit reflection loop are a deliberate metacognitive design for
  calibrating reliance. ECE 30861's oral exams verify understanding, but the systematic
  contrast-and-reflect loop is a different mechanism, not evident in the read materials.
- **AI-interaction logs as an accountability substrate.** Mandatory chat-log/transcript submission
  (NJIT, Memphis, CMU 17-316, UCSD, Wisconsin) and instructor-visible tool telemetry (Utah via
  Amp) give graders an audit trail of the human-AI interaction. Not evident in the ECE 30861
  materials read.
- **Published first-run evidence.** Passau published its course design *with rubrics and
  empirical first-run results* at ICSE-SEET. As of this survey no equivalent published evaluation
  of the MAGE course design is evident in the repo materials read (the reference course is
  running Fall 2026).

## 4. Verdict on the survey's central question

> Has anyone else arrived at something like Delegation → Modeling → Alignment as the engineering
> consequences of delegable implementation — regardless of what they call it?

**As an integrated decomposition: no.** No external course in this corpus organizes itself around
that (or an equivalent) conceptual arc; the field's organizing shapes are the SDLC and the tool
ladder, and Geng et al. independently find no settled curricular model.

**As individual pillars: yes, two of the three, partially and practice-first.**
- *Delegation:* substantial partial equivalents — responsibility-retention is consensus; UW has
  the role-reframe; Stanford/UMich/UCSD teach authority and supervision. What's missing
  externally is the systematized decision framework (BOUND → EQUIP → AUTHORIZE → VERIFY,
  reasoning horizon, capability-scaled specification).
- *Alignment:* the enforcement half is the corpus's strongest convergence, and the core
  guidance-vs-enforcement distinction has two genuine external arrivals (Northeastern, UCSD).
  The meta-level (placement, conversion, capital, recursion) has none.
- *Modeling:* essentially no external equivalent beyond the persistent-context practice and
  conventional lifecycle documents. This pillar is where ECE 30861 is most alone — which cuts
  both ways: it is the clearest novelty claim, and it is the pillar with the least external
  validation that students need it.

A note on convergence direction: where external courses reached ECE 30861-adjacent concepts, they
mostly got there *through the tools* — hooks vs context files taught guidance-vs-enforcement,
CLAUDE.md taught knowledge-in-the-environment, agent permissioning taught authority. ECE 30861
derives the same ideas from engineering precedent (nursing delegation, factory inspection,
end-to-end arguments, management control). The concepts meet in the middle; the derivations are
opposite. That is evidence the ideas are real: independent arrival from opposite directions.

**Author's correction to this reading (260930).** The framing above treats tools and engineering
precedent as rival derivations, and worries that tool-fluent students may find the conceptual
apparatus redundant. That inverts the pedagogical point. ECE 30861 also teaches through the tools —
the question is not which derivation to use but what a student is left holding afterwards.

> "I obviously see this through the tools as well. But if we teach ONLY through the tools then the
> students don't see that it's a broader notion — just that there's a tool, hey."

A student who meets guidance-versus-enforcement only as *hooks versus context files* has learned a
fact about one vendor's agent harness. A student who meets it as the same distinction that separates
a posted policy from a locked door — and who has seen it in nursing delegation, factory inspection,
and end-to-end arguments — has learned an engineering idea that outlives the harness. The precedent
is not an alternative route to the same destination; it is what makes the destination general.

This reframes §2's distinctiveness finding. The external corpus's tool-first derivations are not
evidence that the concepts are widely held. They are evidence that the concepts are *reachable*
through current tooling — while leaving open whether students retain them once the tooling changes.
That is the claim this survey cannot settle, and the one worth measuring.
