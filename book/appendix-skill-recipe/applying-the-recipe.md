<!-- point: the-recipe-runs-the-same-on-three-independent-domains | The recipe runs the same on three orthogonal domains. | terms: self-communicate, self-governance, self-operate -->
This chapter runs the recipe three times — on self-communicate, self-governance, and self-operate: three
orthogonal domains factored the same way. Each case answers the same questions in the same order, so you
can read the three side by side and watch the same skeleton surface in each. The second, self-governance,
is the **recursive case**: it turns the MAGE method itself into a model an agent can reason through. The
third, self-operate, is the **stress test** — operations looks least like something you can model, yet it
factors much as the other two do.

## self-communicate

### Problem

The fleet and its operator produce prose and diagrams constantly — control descriptions, design docs,
mechanism entries, runbooks, handoffs, and the orchestrator's own status reports and tradeoff explanations
to the human. Ungoverned, it drifts: inconsistent terms, the wrong doc shape, LLM-tell density, hand-made
bad figures. The agent *can* write; it writes *inconsistently against an engineering standard*. The skill
installs the craft so every document comes out terse, consistent, and correctly shaped.

### Fundamental model

**Rhetoric as craft** — good technical prose has named parts, not a matter of taste. See it as classical
figures applied with variety, and the register, lexicon, voice, and audit all attach to that one frame.
Visualization, the second leg, rests on the same claim: a diagram is that craft for the shapes prose
carries poorly.

### Orthogonal models

One file per facet.

- **Rhetoric** (`writing/rhetoric.md`) — the device toolkit; sentence shape.
- **Engineering register** (`writing/engineering.md`) — the doc's Diátaxis mode: tutorial, how-to,
  reference, explanation.
- **Lexicon** (`writing/lexicon.md`) — one concept, one word.
- **Voice** (`writing/voice.md`) — the register and sound.
- **Audit** (`writing/audit.md`) — the grading procedure.
- **Visualization** (`drawing/diagrams.md`, Mermaid-first, with `charts.md` and `tables.md` for data
  figures) — the shapes prose carries poorly.

Each cuts an independent axis of a document. A doc's shape (register) is independent of its vocabulary
(lexicon), which is independent of its sound (voice), which is independent of its sentence devices
(rhetoric): change the mode without touching the terms, fix a term without reshaping the doc. The top split
is prose versus drawing; audit is the meta-facet that grades both.

### Governing principle

*The representation must not distract from the idea* — less is more — plus the order of application: name
the genre and mode first, draft in the house voice with varied devices, name concepts from the lexicon,
draw the shape where there is one, and audit before shipping. A second stance runs underneath: name the
concept once, then use the name.

### Layout

```
self-communicate/
  SKILL.md
  writing/   rhetoric.md  engineering.md  lexicon.md  voice.md  audit.md
  drawing/   diagrams.md  charts.md  tables.md  svg-audit.py
```

One directory per leg, one file per facet — the tree *is* the orthogonal-model set.

### Lesson

The base model, rhetoric-as-craft, turns a pile of style tips into a skill; facets map one-to-one to files,
so progressive disclosure loads only the one the task touches. It **composes** — it owns the prose the other
two skills produce, cited by base model rather than copied — and it can be **mined, not only authored**: the
lexicon is bootstrapped from a codebase walk and kept living. It is a **soft** skill; the one hard control
it suggests is running the audit as a gate.

## self-governance

### Problem

An agent can hold excellent tools and still engineer badly. It runs the tests, calls the formatter,
queries the repository — and still models the wrong thing, gives authority to a fact that should stay
advisory, or freezes a one-off mistake into a permanent rule. The missing capability is not another tool.
It is the engineering method itself: knowing *what to model, what must hold, and which judgment is worth
making durable.*

Self-Governance packages that method as a skill. It teaches an agent to apply MAGE to its own engineering
work — recognize the situation, choose a modeling or alignment move, act through the governed environment,
and weigh what should persist. The skill carries the *method.* Concrete system truth — what this codebase
intends, contains, and guarantees — arrives from model providers, never from memory. Knowing the method
and knowing the system are different competences, and the skill keeps them apart.

### Fundamental model

**The MAGE engineering loop.** Everything in the skill supports one cycle, run whenever the agent engineers:

- **Recognize the situation.** What am I actually facing?
- **Model or align.** Model what must be understood; make authoritative what must hold. These are the two —
  and only two — MAGE activities.
- **Choose a move, then a capability.** Pick the engineering move the situation calls for, then the skill
  that performs it.
- **Act through the governed environment.** A move becomes consequential only there, never by the skill
  asserting its own output is safe.
- **Weigh the evidence.** On success, continue. On failure, diagnose, and ask whether the lesson is durable
  enough to become **engineering capital.**

Modeling makes engineering knowledge explicit; Alignment gives that knowledge authority. Self-Governance is
not a third activity beside them. It is the discipline of turning both on your own work. That is the whole
of the rewrite: the fundamental model is the *loop,* not a catalogue of mechanisms.

### Orthogonal models

The loop's questions are independent, so each becomes its own facet. Six directories, one question each;
the router names the question and sends you to the owner.

- **`modeling/` — the model vocabulary and the verbs that build it.** *What kind of representation could
  help, and how does representation improve?* Families of model (structure, behavior, execution,
  measurement, provenance, composition) and the ten moves that raise a fact up the authority ladder.
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
  targets; and the mechanism census. This is the old skill's entire centerpiece, kept intact one level down.
- **`learning/` — governance conversion.** *What should persist from this episode?* The recurrence gate,
  the conversion menu, and the two standing procedures, AUDIT and INTERPRET-FAILURE.

<!-- index-def: governance-target-agent -->
<!-- index-def: governance-target-models-bridge -->
<!-- index-def: governance-target-product -->

The facets cut independent axes. Recognizing a situation does not fix which model answers it; choosing a
move does not decide how firmly it holds; knowing the method does not supply the system's facts. Because the
axes are orthogonal, the agent loads only the facet its question touches.

### Governing principle

*Apply MAGE to the work itself: model what must be understood, make authoritative what must hold, and
convert recurring judgment into capital.* The router ties the facets to that principle, and a handful of
reflexes carry it:

- **Model before guessing.** Reach concrete system truth through a provider; do not reconstruct it from
  memory or raise confidence by rhetoric.
- **Ask what should become machinery.** At every failure, ask whether the lesson is durable — and default
  to *nothing.* Most failures convert to nothing, and the recurrence gate exists to license that answer.
- **Method before tool.** Choose the move the situation calls for, then the capability that performs it,
  not a capability because it is at hand.
- **Right-size the fix.** Prefer the smallest sound change that closes the class; float the larger scheme
  rather than reflexively building it. Prevention by construction beats detection where the action space can
  honestly close.
- **Escalate a genuine judgment, not an inconvenience.** A real authority-or-consequence boundary earns a
  prepared decision handed upward. A merely hard problem does not.

One reflex sits above the rest: **self-governance is not self-certification.** The agent may select, model,
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
```

One directory per question, one file per facet. The mechanism census lives under `alignment/`, where
prevent-versus-detect now sits one level below the loop.

### Lesson

Self-Governance is the appendix's culmination because the domain it models is the MAGE method itself. The
recipe turns recursive here: the skill that teaches an agent to build models is itself a model of how to
build them. That is why the fundamental model is the *loop,* not a taxonomy of mechanisms. An earlier draft
of this skill made prevent-versus-detect the top of its tree; that was a good model of one engineering move,
not a large enough model of self-governance. The census, the two modes, soft-versus-hard, the three targets
all survive — they moved one level down, under Alignment, where they belong.

The skill draws the Modeling–Alignment boundary most plainly of the three. **A mastery-skill is a soft
mechanism.** It represents governance knowledge and helps an agent reason through it; it cannot make a
property hold. Where a property must hold, the knowledge crosses into Alignment — a constraint, validator,
or gate that does not depend on the agent's cooperation. The skill proposes and scaffolds those. It does not
install them, and it does not certify its own output.

And it **composes.** It supplies the engineering judgment behind changes to models and mechanisms, mints the
controls self-operate runs, and writes what it produces in self-communicate's register.

## self-operate

<!-- point: operations-factors-the-same-way-as-the-others | Operations, the least modelable domain, factors the same way. | terms: self-operate, lifecycle -->
A useful stress test, because operations looks *less* like a domain with an explicit model — a collection of
commands, incidents, and local habits. Running the recipe on it exposes structure underneath that apparent
sprawl; it factors much as communication and governance do.

### Problem

Running an agent-fleet repo is a sprawl of ad-hoc operations — dispatch and recover agents, keep the
mainline deployable, reclaim disk, weather colima and host-tool trouble, watch cron health, RCA an
ambiguous signal. Met cold, each break is a fresh fire, and it looks *least* like something you can model:
"it's just ops." The skill gives it a positive lifecycle map so every symptom routes to a class, and typed
runbooks so each fix is repeatable.

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
- **Build and handoff templates** (`templates/`) — for when operating spills into building.

They cut operations along three independent axes: **where** (the lifecycle class — which resource broke),
**what-to-do** (the runbook's typed steps), and **when-it-fires** (the hook). One routing table, many
runbooks, a separate firing layer: a symptom's class does not fix its runbook's steps, and a hook fires
regardless of which lifecycle owns the break.

### Governing principle

*Orient positive first, then route a break to its class.* Know the healthy baseline before you hunt; meet
every symptom as a member of a lifecycle; and when diagnosis calls for a modeling, alignment, or
governance-conversion move — a recurring break worth a control, a model that should change, an authority
that should shift — hand the engineering judgment to self-governance. That hand-off is the operate-govern
bridge. Supporting reflexes: *determinize the runnable, brief the judgment,* and treat the lifecycle as a
state machine, not a habit.

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

The base model, the lifecycles, was **discovered, not obvious**; naming it converted firefighting into
routing. Runbooks are **typed**, so the model itself says what to automate, what to brief, and what to
escalate. The repo-specific bindings are generated and ref-linted — a non-executable index earns trust from
a ref-check, not from tests. It composes: **self-governance supplies the engineering judgment behind
changes to models and mechanisms;** self-operate runs the resulting environment, routes consequential
observations back into that judgment, and writes its runbooks in self-communicate's register.

The three skills act on one environment from three directions. [ref:fig-skill-composition] draws the shape:
self-governance engineers and improves the governed environment, self-operate runs its operational
lifecycles and returns evidence when reality exposes a deficiency, and self-communicate supplies the craft
for every representation the other two produce.

<!-- label: fig-skill-composition -->
<!-- figure: assets/figure-composition.svg | The three partner skills act on one governed environment — orthogonal, not isolated. Self-governance improves it, self-operate runs it and feeds evidence back, self-communicate documents both. -->

Orthogonality does not require isolation. The three skills factor cleanly because each owns one reason to
change — how the fleet communicates, how it engineers its own environment, how it operates that environment
— and they stay useful together because the interfaces between them are explicit. Self-governance mints the
mechanisms self-operate runs; self-operate returns the evidence self-governance reasons from;
self-communicate documents both. That is what good factoring buys: a decomposition whose parts can each be
understood and revised on their own, joined by named seams rather than tangled by hidden ones. The same
construction pattern built all three — find the domain's fundamental model, separate its independent facets,
and tie them with a governing principle.
