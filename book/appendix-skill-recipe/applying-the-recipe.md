<!-- point: the-recipe-runs-the-same-on-three-independent-domains | The recipe runs the same on three orthogonal domains. | terms: self-communicate, self-governance, self-operate -->
This chapter applies the recipe to self-communicate, self-governance, and self-operate. Self-governance is the **recursive case**: it models the MAGE
method itself. Self-operate tests the method against a less obviously modelable domain: operations.

## self-communicate

### Problem

The fleet and its operator produce prose and diagrams constantly — control descriptions, design docs,
mechanism entries, runbooks, handoffs, and the orchestrator's own status reports and tradeoff explanations
to the human. Ungoverned, it drifts: inconsistent terminology, inappropriate document structure, LLM tells, and poor
figures. The problem is not generating prose but producing it consistently against an engineering standard.
The skill packages the craft needed to do that.

### Fundamental Model

**Rhetoric as craft.** Treat technical writing as a set of named techniques rather than taste alone.
Document form, lexicon, voice, audit, and visualization then become independent facets of that model.

### Orthogonal Models

One file per facet.

- **Rhetoric** (`writing/rhetoric.md`) — the device toolkit; sentence shape.
- **Document form** (`writing/engineering.md`) — the document's Diátaxis mode: tutorial, how-to,
  reference, or explanation.
- **Lexicon** (`writing/lexicon.md`) — one concept, one word.
- **Voice** (`writing/voice.md`) — the register and sound.
- **Audit** (`writing/audit.md`) — the grading procedure.
- **Visualization** (`drawing/diagrams.md`, Mermaid-first, with `charts.md` and `tables.md` for data
  figures) — the shapes prose carries poorly.

Each answers a different question about the document: form chooses its structure, lexicon its terms, voice
its register, rhetoric its sentence-level technique, visualization what should be drawn, and audit how the
result is checked.

### Governing Principle

The governing principle is that representation should serve rather than distract from the idea. Apply the
facets in order: choose the document form, draft in the house voice using varied rhetorical devices, use
canonical terms from the lexicon, draw relationships that prose carries poorly, and audit before shipping.
One additional rule applies throughout: name the concept once, then use the name.

### Layout

```
self-communicate/
  SKILL.md
  writing/   rhetoric.md  engineering.md  lexicon.md  voice.md  audit.md
  drawing/   diagrams.md  charts.md  tables.md  svg-audit.py
```

One directory per leg, one file per facet — the tree *is* the orthogonal-model set.

### Lesson

Rhetoric-as-craft turns a collection of style rules into a model. Separate facets can then load
independently and be reused by other skills. The skill remains soft; where an
audit result must block delivery, the audit belongs in a gate.

## self-governance

### Problem

An agent can have excellent tools and still engineer badly. It runs the tests, calls the formatter,
queries the repository — and still models the wrong thing, gives authority to a fact that should stay
advisory, or freezes a one-off mistake into a permanent rule. The missing capability is not another tool.
It is the engineering method itself: knowing *what to model, what must hold, and which judgment is worth
making durable.*

Self-governance packages that method as a skill. It teaches the agent to recognize the situation, choose a
Modeling or Alignment move, act through the governed environment, and decide what should persist. The skill
carries the method, not the codebase's facts. Concrete system knowledge—what the codebase intends, contains,
and guarantees—must come from model providers rather than the skill's memory.

### Fundamental Model

**The MAGE engineering loop.** Everything in the skill supports one cycle, run whenever the agent engineers:

- **Recognize.** What situation am I facing?
- **Model or align.** What must be understood? What must hold?
- **Choose the move and capability.** What engineering move fits, and which skill performs it?
- **Act through the GEE.** The skill proposes; the environment supplies consequence.
- **Learn.** What did the evidence show, and should any lesson become durable?

Self-governance is not a third MAGE activity; it applies Modeling and Alignment to the agent's own engineering work.

### Orthogonal Models

The loop's questions are independent, so each becomes its own facet. Each of six directories answers one
question; the router identifies the question and directs the agent to the corresponding facet.

- **`modeling/`** — Which representation would help, and how should it be improved? Carries the six model families and modeling moves.
- **`practice/`** — What situation is this, and how much intervention is warranted?
- **`system/`** — What is true of this system? Retrieves concrete models through a provider contract and records their epistemic status.
- **`skills/`** — Which available capability performs the chosen move?
- **`alignment/`** — What should remain true without repeated human checking? Carries the mechanism repertoire and census.
- **`learning/`** — What should persist from this episode? Carries governance conversion and recurring failure analysis.

<!-- index-def: governance-target-agent -->
<!-- index-def: governance-target-models-bridge -->
<!-- index-def: governance-target-product -->

The facets answer independent questions: recognizing the situation does not select the model, choosing a
move does not determine its authority, and knowing the method does not supply system facts. Load only the
facet the current question requires.

### Governing Principle

*Apply MAGE to the work itself: model what must be understood, give authority to what must hold, and
convert recurring judgment into durable engineering structure.* Five operating rules follow:

- **Model before guessing.** Reach concrete system truth through a provider; do not reconstruct it from
  memory or raise confidence by rhetoric.
- **Ask what should become machinery.** At every failure, ask whether the lesson deserves durable structure—and
  default to no. Most failures should not become new governance.
- **Method before tool.** Choose the move the situation calls for, then the capability that performs it,
  not a capability because it is at hand.
- **Right-size the fix.** Prefer the smallest sound change that closes the class; propose a larger intervention
  rather than implementing it reflexively. Prevention by construction beats detection where the action space can
  honestly close.
- **Escalate judgment, not difficulty.** Escalate when authority or consequence requires a human decision,
  not merely because the problem is hard.

**Self-governance is not self-certification.** The agent may select, model,
propose, and check, but its belief that the work is correct is not evidence that it is. A skill is soft: it
guides a probabilistic agent but cannot block. Hard mechanisms may be proposed or scaffolded by the skill,
but enforcement must come from the harness or another external mechanism. The deciding evidence comes
from a mechanism that sits outside the reasoning which produced the change.

### Layout

```
self-governance/
  SKILL.md            the router — the loop, the routing table, the ambient stance
  principles.md       the portable engineering method (the ambient reflexes)
  modeling/    repertoire.md  moves.md
  practice/    situations.md  judgment.md
  system/      model-access.md
  skills/      repertoire.md
  alignment/   repertoire.md  mechanisms/INDEX.md  mechanisms/<target>/<family>/<mechanism>.md
  learning/    governance-conversion.md
  templates/   system-models-starter-kit.md  state-machine-model-starter.py  …
               — scaffolds for creating system models, never system-specific truth
```

One directory per question, one file per facet. The mechanism census lives under `alignment/`, where
prevent-versus-detect now sits one level below the loop.

### Lesson

Self-governance models the MAGE method itself. Its fundamental model is therefore the engineering loop, not a taxonomy of mechanisms.

The Modeling–Alignment boundary matters especially here: self-governance can propose and scaffold a
constraint, validator, or gate, but the resulting mechanism — not the skill's judgment — must supply the
enforcement.

It also composes with the other skills: self-governance designs models and mechanisms, self-operate runs them, and self-communicate governs how they are represented.

## self-operate

<!-- point: operations-factors-the-same-way-as-the-others | Operations, the least modelable domain, factors the same way. | terms: self-operate, lifecycle -->

### Problem

Operating an agent-fleet repository involves recurring but heterogeneous tasks — dispatch and recover
agents, keep the mainline deployable, reclaim disk, weather colima and host-tool trouble, watch cron
health, RCA an ambiguous signal. Without a model, each failure must be diagnosed almost from scratch. The skill provides
a lifecycle map that routes symptoms to classes and typed runbooks that make responses repeatable.

### Fundamental Model

**The engineering lifecycles.** A fleet repo runs the same few: manage-agents, manage-context,
manage-git-repo, manage-deploy, manage-dev-env, plus cron and govern-your-own-loop. Every symptom belongs
to one lifecycle, so every break routes to a *class* instead of being met cold. The lifecycle map is the
fundamental model: it turns operational sprawl into a small set of recurring classes.

### Orthogonal Models

- **Lifecycle map / symptom catalog** — identifies which operational lifecycle owns the problem.
- **Typed runbooks** (`examples/runbook-*.md`) — specify what to do, distinguishing runnable,
  judgment-automatable, and judgment-irreducible steps.
- **Hooks** (`hooks/`) — decide when a known reaction should fire automatically.

These answer three independent questions: where the problem belongs, what response it requires, and when
that response should trigger.

Supporting resources: build and handoff templates (`templates/`) — used when operating work crosses into
implementation.

### Governing Principle

Establish the healthy state first, then classify deviations from it. Route each symptom to a lifecycle and
run the corresponding procedure. When diagnosis reveals that a model, mechanism, or authority should change,
hand that engineering decision to self-governance. Automate deterministic steps; prepare irreducible
judgments for escalation.

### Layout

```
self-operations/
  SKILL.md
  principles.md
  examples/   lifecycle-L1..L6-*.md   runbook-*.md
  hooks/      reflection_facet*.py  hook_*.py  _hook_*.py  README.md  ...
  templates/  pointers-starter.yaml  runbooks-starter.yaml
              gen-and-lint-partb-starter.py  EPIC-TEMPLATE-starter.md  design-doc-template-starter.md
```

### Lesson

The lifecycle model turns incident response into routing: identify the affected lifecycle, select the
corresponding runbook, and determine which steps can be automated. Typed runbooks distinguish runnable steps
from automatable and irreducible judgment. Self-governance changes models and mechanisms; self-operate runs
them and returns evidence; self-communicate governs their representations.

[ref:fig-skill-composition] shows the three skills acting on one governed engineering environment:
self-governance changes it, self-operate runs it and returns evidence, and self-communicate governs its
representations.

<!-- label: fig-skill-composition -->
<!-- figure: assets/figure-composition.svg | Three orthogonal skills act on one governed engineering environment. Self-governance improves it; self-operate runs it and returns evidence; self-communicate governs the representations both produce. -->

Orthogonality does not require isolation. Each skill has one reason to change—communication, engineering
judgment, or operation—and explicit interfaces connect them. Self-governance produces models and
mechanisms that self-operate uses; self-operate returns evidence; self-communicate
governs their representations.
