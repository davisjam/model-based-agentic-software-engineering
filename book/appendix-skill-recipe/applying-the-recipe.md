<!-- point: the-recipe-runs-the-same-on-three-independent-domains | The recipe runs the same on three independent domains. | terms: self-communicate, self-governance, self-operate -->
This chapter runs the recipe three times — on self-communicate, self-governance, and self-operate — three
independent domains factored the same way. Each case answers the same questions in the same order, so you
can read the three side by side and watch the same skeleton surface in each. The third, self-operate, is
the useful stress test: operations looks least like something you can model, yet it factors much as the
other two do.

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

A fleet at velocity keeps producing recurring failures — the same bug class, a lint that mis-fires, a
manual step redone by hand, an agent regression. Patching instances never stops the class. The skill
converts each recurring failure into a **durable mechanism**, and at design time recognizes which
structural traits warrant a mechanism by construction.

### Fundamental model

**Two kinds of governance move.** A mechanism either **prevents** — a *constraint* that scopes the action
space so the wrong move cannot be picked — or **detects** — a *sensor* that fires after the fact: a lint,
gate, or test. That single distinction decides, for any failure, what you build.

### Orthogonal models

- **The mechanism census** (`reference/INDEX.md` plus `reference/<role>/<family>/<mechanism>.md`) — the
  catalogue of patterns you draw from.
- **Soft-vs-hard enforcement** — the form's strength.
- **The target axis** — agent, models-bridge, product.
- **The form taxonomy** — the nine structural forms.
- **Ambient principles** (`principles.md`) — the reflexes applied on every touch.
- **The two modes** — AUDIT and INTERPRET-FAILURE — plus the **MBSE starter kit** (`templates/`).

Why a catalogue with cross-cutting columns rather than one large reference doc: the **move** (constraint,
sensor) is independent of the **form** (soft, hard) — a constraint can be soft (a model that aims) or hard
(a compiler-enforced enum); a sensor can be soft (a convention) or hard (a blocking lint) — and both are
independent of **target** and of the **form taxonomy**. Because the axes are orthogonal, any mechanism is a
*point* in that space, which is why the census is a queryable table ("missing prevention? scan the
constraint rows"), not a flat list. The principles are a separate ambient layer that does not live in the
census.

### Governing principle

*Convert recurring failures into durable guardrails; guidance aims, machinery holds.* Three reflexes
follow: **architecture before sensors** (prefer the constraint that makes the error impossible),
**right-size the fix** (the smallest sound change; float the larger scheme), and **propose, don't install**
— a skill is soft, so hard mechanisms are scaffolded and handed to a human or harness; never claim
*enforced* when you have only *recommended*.

### Layout

```
self-governance/
  SKILL.md
  principles.md
  reference/  INDEX.md  ABSTRACTIONS.md  README.md  <role>/<family>/<mechanism>.md
  templates/  system-models-starter-kit.md  state-machine-model-starter.py
              component-zone-model-starter.py  service-flow-*  deployment-topology-starter.py
```

The tree mirrors the split: census (`reference/`), principles (`principles.md`), scaffolds (`templates/`).

### Lesson

The base model, prevent versus detect, is the cut every other axis hangs off; orthogonal axes make the
catalogue something you **query**, not read top to bottom. A skill **cannot install hard mechanisms** — it
proposes them, so honesty about enforced-versus-recommended is part of the craft. This skill also marks the
boundary between Modeling and Alignment plainly: the skill *represents* governance knowledge and helps an
agent reason through it, and the mechanisms it recommends may then give that knowledge *authority* through
constraints, validators, and gates. It composes: it mints the mechanisms self-operate runs and
self-communicate documents.

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
every symptom as a member of a lifecycle; when a failure **recurs**, hand it to self-governance — the
operate-govern bridge. Supporting reflexes: *determinize the runnable, brief the judgment*, and treat the
lifecycle as a state machine, not a habit.

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
a ref-check, not from tests. It **composes**: it runs the mechanisms self-governance mints, hands
recurrences back to it, and writes its runbooks in self-communicate's register.

The three skills differ substantially in subject matter, but the same construction pattern proved useful in
each: find the domain's fundamental model, separate its independent facets, and give the agent a governing
principle for reasoning across them.
