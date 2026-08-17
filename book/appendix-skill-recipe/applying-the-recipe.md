<!-- point: the-recipe-runs-the-same-on-three-independent-domains | The recipe runs the same on three orthogonal domains. | terms: self-communicate, self-governance, self-operate -->
This chapter runs the recipe three times — on self-communicate, self-governance, and self-operate: three
orthogonal domains factored the same way. Self-governance is the **recursive case**: it models the MAGE
method itself. Self-operate tests the method against a less obviously modelable domain: operations.

## self-communicate

### Problem

The fleet and its operator produce prose and diagrams constantly — control descriptions, design docs,
mechanism entries, runbooks, handoffs, and the orchestrator's own status reports and tradeoff explanations
to the human. Ungoverned, it drifts: inconsistent terminology, inappropriate document structure, LLM tells, and poor
figures. The problem is not generating prose but producing it consistently against an engineering standard.
The skill installs the craft so every document comes out terse, consistent, and correctly shaped.

### Fundamental model

**Rhetoric as craft**: good technical prose can be described in terms of named techniques rather than taste
alone. See it as classical figures applied with variety, and the document form, lexicon, voice, and audit
all attach to that one frame. Visualization extends the same principle to relationships that prose
represents poorly.

### Orthogonal models

One file per facet.

- **Rhetoric** (`writing/rhetoric.md`) — the device toolkit; sentence shape.
- **Document form** (`writing/engineering.md`) — the document's Diátaxis mode: tutorial, how-to,
  reference, or explanation.
- **Lexicon** (`writing/lexicon.md`) — one concept, one word.
- **Voice** (`writing/voice.md`) — the register and sound.
- **Audit** (`writing/audit.md`) — the grading procedure.
- **Visualization** (`drawing/diagrams.md`, Mermaid-first, with `charts.md` and `tables.md` for data
  figures) — the shapes prose carries poorly.

Each cuts an independent axis of a document. A doc's form is independent of its vocabulary
(lexicon), which is independent of its sound (voice), which is independent of its sentence devices
(rhetoric): change the mode without touching the terms, fix a term without reshaping the doc. The top split
is prose versus drawing; audit is the meta-facet that grades both.

### Governing principle

The governing principle is that representation should serve rather than distract from the idea. Apply the
facets in order: choose the document form, draft in the house voice using varied rhetorical devices, use
canonical terms from the lexicon, draw relationships that prose carries poorly, and audit before shipping.
A second stance runs underneath: name the concept once, then use the name.

### Layout

```
self-communicate/
  SKILL.md
  writing/   rhetoric.md  engineering.md  lexicon.md  voice.md  audit.md
  drawing/   diagrams.md  charts.md  tables.md  svg-audit.py
```

One directory per leg, one file per facet — the tree *is* the orthogonal-model set.

### Lesson

Rhetoric-as-craft gives the skill a model rather than a collection of style rules. The facets map cleanly to
resources, permitting progressive disclosure and reuse by other skills. The skill remains soft; where an
audit result must block delivery, the audit belongs in a gate.

## self-governance

### Problem

An agent can have excellent tools and still engineer badly. It runs the tests, calls the formatter,
queries the repository — and still models the wrong thing, gives authority to a fact that should stay
advisory, or freezes a one-off mistake into a permanent rule. The missing capability is not another tool.
It is the engineering method itself: knowing *what to model, what must hold, and which judgment is worth
making durable.*

Self-Governance packages that method as a skill. It teaches an agent to apply MAGE to its own engineering
work — recognize the situation, choose a modeling or alignment move, act through the governed environment,
and weigh what should persist. The skill carries the *method.* Concrete system truth — what this codebase
intends, contains, and guarantees — arrives from model providers, never from memory. The engineering method
and concrete system knowledge are separate concerns; the skill keeps them separate.

### Fundamental model

**The MAGE engineering loop.** Everything in the skill supports one cycle, run whenever the agent engineers:

- **Recognize the situation.** What am I actually facing?
- **Model or align.** Model what must be understood; give authority to what must hold. These are MAGE's two
  engineering activities.
- **Choose a move, then a capability.** Pick the engineering move the situation calls for, then the skill
  that performs it.
- **Act through the governed environment.** A move becomes consequential only there, never by the skill
  asserting its own output is safe.
- **Weigh the evidence.** On success, continue. On failure, diagnose, and ask whether the lesson should
  become **durable engineering structure.**

Modeling makes engineering knowledge explicit; Alignment gives selected obligations consequential authority. Self-Governance is
not a third activity beside them. It is the discipline of turning both on your own work.

### Orthogonal models

The loop's questions are independent, so each becomes its own facet. Each of six directories answers one
question; the router identifies the question and directs the agent to the corresponding facet.

- **`modeling/` — the model vocabulary and the verbs that build it.** *What kind of representation could
  help, and how does representation improve?* Families of model (structure, behavior, ownership, decision,
  measurement, provenance) and the ten moves that make a fact more explicit, structured, and executable.
- **`practice/` — situation recognition and proportionality.** *What situation am I in, and which move is
  warranted?* One facet classifies — a field guide of engineering situations, plus a design-time smell
  scan; its sibling weighs the tradeoff and right-sizes the response.
- **`system/` — model access.** *What is true of* this *system?* The skill carries the method, not any
  codebase's concrete models. This facet reaches them through a uniform provider contract and weighs the
  epistemic status of every answer.
- **`skills/` — capability selection.** *Which available capability performs the chosen move?* A semantic
  index of skills to compose — its two partners among them — never a copy of their manuals.
- **`alignment/` — how intent acquires authority.** *What should stay true without a person re-checking
  it?* Constraint, sensor, validator, gate; prevent-versus-detect; soft-versus-hard; the three governance
  targets; and the mechanism census.
- **`learning/` — governance conversion.** *What should persist from this episode?* The recurrence gate,
  the conversion menu, and the two standing procedures, AUDIT and INTERPRET-FAILURE.

<!-- index-def: governance-target-agent -->
<!-- index-def: governance-target-models-bridge -->
<!-- index-def: governance-target-product -->

The facets cut independent axes. Recognizing a situation does not fix which model answers it; choosing a
move does not decide how firmly it holds; knowing the method does not supply the system's facts. Because the
axes are orthogonal, the agent loads only the facet its question touches.

### Governing principle

*Apply MAGE to the work itself: model what must be understood, give authority to what must hold, and
convert recurring judgment into durable engineering structure.* Five operating rules follow:

- **Model before guessing.** Reach concrete system truth through a provider; do not reconstruct it from
  memory or raise confidence by rhetoric.
- **Ask what should become machinery.** At every failure, ask whether the lesson is durable — and default
  to *nothing.* Most failures convert to nothing, and the recurrence gate exists to license that answer.
- **Method before tool.** Choose the move the situation calls for, then the capability that performs it,
  not a capability because it is at hand.
- **Right-size the fix.** Prefer the smallest sound change that closes the class; propose a larger intervention
  rather than implementing it reflexively. Prevention by construction beats detection where the action space can
  honestly close.
- **Escalate a genuine judgment, not an inconvenience.** A real authority-or-consequence boundary earns a
  prepared decision handed upward. A merely hard problem does not.

**Self-governance is not self-certification.** The agent may select, model,
propose, and check, but its belief that the work is correct is not evidence that it is. A skill is soft — it
aims a probabilistic agent and cannot block. So hard mechanisms are *proposed and scaffolded,* then handed
to a human or the harness; never claimed as *enforced* when only recommended. The deciding evidence comes
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

Self-Governance is the appendix's culmination because the domain it models is the MAGE method itself. The
recipe turns recursive here: the skill that teaches an agent to build models is itself a model of how to
build them. That is why the fundamental model is the *loop,* not a taxonomy of mechanisms.

The Modeling–Alignment boundary matters especially here: self-governance can propose and scaffold a
constraint, validator, or gate, but the resulting mechanism — not the skill's judgment — must supply the
enforcement.

And it **composes.** It supplies the engineering judgment behind changes to models and mechanisms, mints the
controls self-operate runs, and writes what it produces in self-communicate's register.

## self-operate

<!-- point: operations-factors-the-same-way-as-the-others | Operations, the least modelable domain, factors the same way. | terms: self-operate, lifecycle -->

### Problem

Operating an agent-fleet repository involves recurring but heterogeneous tasks — dispatch and recover
agents, keep the mainline deployable, reclaim disk, weather colima and host-tool trouble, watch cron
health, RCA an ambiguous signal. Without a model, each failure appears as a new incident. The skill provides
a lifecycle map that routes symptoms to classes and typed runbooks that make responses repeatable.

### Fundamental model

**The engineering lifecycles.** A fleet repo runs the same few: manage-agents, manage-context,
manage-git-repo, manage-deploy, manage-dev-env, plus cron and govern-your-own-loop. Every symptom belongs
to one lifecycle, so every break routes to a *class* instead of being met cold. Operations *is* modelable —
the lifecycles are the base model hiding in the sprawl.

### Orthogonal models

- **The lifecycle map / symptom→doc catalog** — the routing table.
- **Typed runbooks** (`examples/runbook-*.md`) — steps typed RUNNABLE, JUDGMENT-AUTOMATABLE, or
  JUDGMENT-IRREDUCIBLE; the procedures a symptom routes to.
- **The runnable hook library** (`hooks/`) — reflection, typed-hook, and banking substrate; the machinery
  that fires a skipped reflex at its moment.
They cut operations along three independent axes: **where** (the lifecycle class — which resource broke),
**what-to-do** (the runbook's typed steps), and **when-it-fires** (the hook). One routing table, many
runbooks, a separate firing layer: a symptom's class does not fix its runbook's steps, and a hook fires
regardless of which lifecycle owns the break.

Supporting resources: build and handoff templates (`templates/`) — used when operating work crosses into
implementation.

### Governing principle

*Establish the healthy state first, then classify deviations from it.* Know the healthy baseline before you
hunt; meet every symptom as a member of a lifecycle; and when diagnosis calls for a modeling, alignment, or
governance-conversion move — a recurring break worth a control, a model that should change, an authority
that should shift — hand the engineering judgment to self-governance. Automate deterministic steps, prepare
irreducible judgments for escalation, and treat each lifecycle as a state machine rather than a habit.

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
from automatable and irreducible judgment. Reference linting validates generated repository bindings.
Self-governance supplies judgment about changes to models and mechanisms; self-operate runs the resulting
environment and returns consequential observations; self-communicate governs the resulting documentation.

The three skills act on one environment from three directions. [ref:fig-skill-composition] draws the shape:
self-governance engineers and improves the governed environment, self-operate runs its operational
lifecycles and returns evidence when reality exposes a deficiency, and self-communicate supplies the craft
for every representation the other two produce.

<!-- label: fig-skill-composition -->
<!-- figure: assets/figure-composition.svg | Three orthogonal skills act on one governed engineering environment. Self-governance improves it; self-operate runs it and returns evidence; self-communicate governs the representations both produce. -->

Orthogonality does not require isolation. Each skill has one reason to change — communication, engineering
judgment, or operation — and explicit interfaces connect them. Self-governance produces models and
mechanisms that self-operate uses; self-operate returns evidence for self-governance; self-communicate
governs their representations. This is the payoff of the construction method: independently understandable
models joined through explicit interfaces.
