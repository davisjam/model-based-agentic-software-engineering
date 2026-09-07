# Agent Governance Mechanisms

<!-- summary: A pattern catalogue of the mechanisms for governable agentic software engineering — 85 across three roles. -->

*A catalogue of the **governance mechanisms** that keep a fleet of AI coding agents productive while
holding the cost of their failures within bounds, distilled from a 19-week case study of building a
production system with frontier coding agents. Each mechanism is written like a design pattern: the
recurring failure it kills, and why it is **not** just the cheaper thing everyone already does.*

## Between two schools of thought

Two common ways to build with agents sit at opposite ends of a spectrum. This catalogue is about the
**midway**.

| Vibe coding | · Governance-centric · — **the midway** | Oversight-centric |
|:---|:---:|:---|
| Prompt, accept what looks right, iterate by feel. Fast, but the same failures keep recurring and human review becomes the bottleneck. | Let velocity **expose** failures, and **convert** each recurring one into a durable guardrail. The guardrails grow from real failures, so code stays fast **and** trustworthy. | Check *everything* before you trust it: a human reviewing every change, or a formal spec verified against (spec-driven development is this). Rigorous, but checking is the bottleneck, and neither humans nor specs anticipate what only breaks at velocity. |
| *all velocity — no guardrails* | *velocity + guardrails grown from failure* | *all oversight — everything checked* |
| e.g. [Karpathy](https://x.com/karpathy/status/1886192184808149383) · [Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04) | | e.g. [Meyer, CACM](https://dl.acm.org/doi/full/10.1145/3773295) · [vibe-OS / vibe-tools](https://homes.cs.washington.edu/~oskin/vibeos/vibetools.html) |

**Both ends of the spectrum pay the *pet tax.*** Each spends per-change human attention. You *coax* the
output at one end or *inspect* it at the other, and that attention grows with the size of the fleet until
it becomes the bottleneck. The midway is
[**cattle, not pets**](https://cloudscaling.com/blog/cloud-computing/the-history-of-pets-vs-cattle/): build
the fences and chutes once, and the *guardrails* ride every change instead of a person.

The midway is a discipline: **establishing and maintaining a governed engineering environment**. It works
in two directions at once. **Up front**, you specify what you can: the architecture that makes a class of
error impossible, the model the fleet reasons through, the templates and checklists that put a change on
rails before it's written. **In flight**, you let velocity surface the failures you couldn't foresee, and
convert each recurring one into a durable guardrail. This catalogue describes both halves: the guidance on
what to fix in advance, and the machinery for responding when something slips through.

This middle column isn't new; what's new is the **substrate**. The process itself is the agentic-era
instantiation of quality practices long standard in regulated industry: documented process, requirements
traceability, verification tiers scaled to criticality, corrective-and-preventive action. Those programs
have always run on manually-maintained dead documents (Word, Excel, DOORS) that drift the moment they're
written and need dedicated staff to keep. Here the same process runs on **executable, agent-maintained
models that can't drift**. The traceability matrix is a queried model behind a drift gate. The process
rules are enforced infrastructure. The verification records are machine-checked against the code rather
than filed in a spreadsheet. The contribution isn't the assurance discipline; it's making that discipline
*live*, and tractable for a team of one.

## Documentation, taken to its limit

This is the right way to read the whole catalogue. Anyone who has built with agents has found the first move
on their own: give them good documentation and tests, then point them at it. Agents write and maintain those
artifacts as fast as they write code, so the cost that always made thorough docs a fantasy is gone. The step
the training data won't suggest is the next one. **Documentation has a hierarchy, and its top is not prose.
It is a typed model.**

A context-bounded agent working on a context-*exceeding* system needs a **typed, queryable, drift-checked
model** of that system to reason through, the blueprint for a structure too large to hold in one view. That
is **model-based software engineering**, and it is the bridge between the agent and the codebase it can't fit
in its head. Two things make it more than a tidier README:

- **Agent-legible and precise.** A six-state machine with typed invariants is something an agent reasons over
  *without error* the way it never could over 300,000 lines of prose-and-code. Abstraction shrinks the space
  it can be wrong in, not just the token count. A model is more precise than any document.
- **It can't lie.** A document rots the moment the code moves; a model wired to a build-time drift check
  *cannot*: the gate stays red until the map matches the territory again. That guarantee is what prose can
  never give.

Because agents build and maintain the model the way they maintain docs and tests, pointing them at it costs
almost nothing, and it pays back in **higher code quality, fewer tokens spent rederiving what the model
already states, and fewer mistakes.** The catalogue's **models-bridge** role is this bridge, made concrete.

## The move: a guardrail either prevents or detects

A guardrail's **move** is one of two kinds:

- **Constraint** — make the error **impossible by construction**: a typed model with one sanctioned
  seam, a state that can't be represented wrongly. Software
  [poka-yoke](https://en.wikipedia.org/wiki/Poka-yoke), error-*proofing*. Building a constraint is the
  work we call *architecture*.
- **Sensor** — where you can't prevent it, **observe and guard** the behavior: a lint, a gate, a
  validator, an audit that fires on a violation and holds the line. Error-*catching*.

A sensor detects a mistake and surfaces it after the fact. A constraint works like a wall: it makes the
whole class of mistake impossible to make. Reach for the wall first, because a sensor still lets the
mistake happen. But a wall built across the only exit blocks the people trying to leave — an
over-constrained design stops legitimate work as surely as it stops the error, so the wall belongs around
the class you can name, not across the whole floor. Most real mechanisms are a **package** across the two:
a soft constraint (a typed model that aims the agent) shipped with hard sensors (the lints and drift gates
that catch what it only aims at).

## Two independent axes: move and form

Constraint-versus-sensor is one axis; it is **not** the same as soft-versus-hard, and the catalogue keeps
them apart. A mechanism has a **move** — a *constraint* (it prevents) or a *sensor* (it detects) — and,
independently, a **form** — **soft** (probabilistic: it aims an agent, cannot block) or **hard**
(deterministic: it holds regardless). The two cross freely: a constraint can be soft (a typed model that
aims the agent's reasoning) or hard (an enum the compiler enforces), and a sensor can be soft (a
convention that reminds) or hard (a lint that blocks). The move says *what* the mechanism does; the form
says *how firmly*. Each entry's metadata card carries both — a `Move` row (`constraint`/`sensor`/`package`)
beside the soft/hard `Enforcement` row.

Every mechanism in the catalogue also governs one of three **roles** — the **agent** fleet, the **models**
that bridge agents and code, or the shipped **product** — and carries a **Model** relation
(`is-a-model` / `governs-a-model` / `—`) that says whether it *is* a typed model, *governs* one, or
neither.

## Why you might NOT want to use this

Governance has a cost: every mechanism taxes every future change and every agent's context budget. The
failure mode of adopting it wholesale is a **tower of governance nobody wants**, mechanisms manufactured
faster than they earn their keep, until the overhead outweighs the failures they were meant to prevent
(and there's an adverse selection: the people most drawn to a governance catalogue are the ones most at
risk of over-building it).

So it's **descriptive, not prescriptive**: a menu to tailor to your needs, not a bar to clear. If you
can't name the failure a mechanism prevents in *your* system, you might not need it yet.

## Read the catalogue

- **[The catalogue — interactive web view](https://davisjam.github.io/model-based-agentic-software-engineering/)** —
  the best way to read it: the governance map, a clickable census, and a full writeup per mechanism.
- **[The paper](https://arxiv.org/pdf/2607.01087)** — *Cheap Code, Costly Judgment: A Case Study on
  Governable Agentic Software Engineering*: the theory, evidence, and testable propositions.
- **[Quick start](quick-start.md)** — adopt these in your own repo.
- **The live system** these mechanisms govern: **DocAble** ([scholaccess.com](https://scholaccess.com)).

## The three skills

The catalogue also ships as **three partner Claude skills** (one plugin, `mage`):

- **self-governance** — *harden.* Audit your repo for missing guardrails, or convert a recurring failure
  into a durable mechanism. Carries the AI-First Engineering Method as its operating stance, plus the
  agent + models-bridge mechanism census as on-demand reference.
- **self-operations** — *operate.* Run the agent-fleet substrate day to day: the positive lifecycle map
  (agents, context, git, deploy, dev-env, cron) plus a symptom → resolving-doc catalog when something
  breaks. It bootstraps to your repo by inspection.
- **self-communicate** — *communicate.* Write and diagram engineer-facing docs (and the operator's own
  reports to the human) well: a rhetoric toolkit (classical figures used with variety), the Diátaxis
  engineering register, a house lexicon that names concepts consistently, a target voice, and an audit that
  grades a passage and emits fixes, plus a Mermaid-first diagram leg. It bootstraps its lexicon from a
  codebase walk and keeps it living.

They partner: **operate routes a break to its fix; when a failure recurs, it hands the class to
self-governance to convert into a mechanism; and self-communicate writes the result up in the shared
register.** Install all three from the [quick start](quick-start.md).

Govern and operate are **two lenses on one substrate, not competitors.** self-governance is the *census of
mechanisms* and the engine that mints new ones: the **design-time** view (what mechanisms exist, which you're
missing, how to add one). self-operations *runs the substrate those mechanisms govern*, the **run-time** view
(the lifecycle you operate, the runbook you follow, the hook you wire). The same mechanism appears in
self-governance's census *and* is operated through self-operations — one substrate seen design-time vs
run-time, not two copies. **self-communicate sits alongside as a third leg**, not a lens on that substrate,
but the craft that keeps its output legible: the mechanisms, design docs, runbooks, handoffs, and the
operator's own reports to the human are all prose, and this skill supplies the register and the shared
vocabulary they're written in. govern / operate / communicate.

## Using this repo

**To read it yourself, use the [web view](https://davisjam.github.io/model-based-agentic-software-engineering/)**:
that's the pretty version, with the governance map, a clickable census, and a full writeup per
mechanism. This raw repo is what you **hand to your coding agent**: vendor it (or the
[starter `CLAUDE.md`](downloads/CLAUDE-starter.md)) into your project, point your agent at it, and ask it
to produce a plan to adopt / adapt / apply the mechanisms in your context. See the
[quick start](quick-start.md).

**Already have a `CLAUDE.md`?** Don't start fresh: fold the *method* (the AI-First Engineering stance in
[`downloads/CLAUDE-starter.md`](downloads/CLAUDE-starter.md)) into your existing doc, adopt / adapt / skip
per principle. The [quick start](quick-start.md) has ready prompts for before *or* after you install the
skill.

The source is organized by role ([`agent/`](agent/) · [`models-bridge/`](models-bridge/) ·
[`product/`](product/)), with the full census in [`INDEX.md`](INDEX.md). `catalog.py` validates the
schema and builds the web view (`catalog.py validate` · `build` · `deploy local|github`; see
[`CLAUDE.md`](https://github.com/davisjam/agent-governance-mechanisms/blob/main/CLAUDE.md)).

## Start small, and make it yours

Start with the highest-leverage, lowest-cost mechanisms for the failures your agents *actually* make (a
governance doc, a gate or two), and add mechanisms only as velocity surfaces the failures they prevent.
Growing guardrails from real failure is the **in-flight** half of the discipline: what you couldn't
specify up front, you convert from failure.

**Adapt the mechanisms to your environment**: your language, your agents, your CI; they are patterns, not
a stack. But keep the part that travels furthest: most of the value lands **on the developer's own
machine, before CI ever runs**. Every developer already works locally; this method makes that local loop
unusually productive, the agent fails fast against the same gates a reviewer would apply, so defects are
caught and fixed *before the push*, and CI becomes confirmation rather than the first line of defense.
Whatever your stack, that "trustworthy locally, not just in CI" property is the part most worth porting.

---

To learn more about the experience behind this repository, see the
[*Cheap Code, Costly Judgment*](https://arxiv.org/pdf/2607.01087) paper.
