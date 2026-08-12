# Definitions — green-box drafts (from the "Definitions 1/2" + "Controllability" notes)

Integration draft for the book's core-term definitions, in the **green definition-box + per-aspect
elaboration** shape the author asked for. Each term gets a short **box** (the concise definition) followed by
**elaboration prose on each adjective/aspect** — most of which the author verbalized in the audio notes.

**Two follow-ups gate the final landing (not blockers for drafting):**
1. **Renderer feature — the green definition box.** Proposed directive `<!-- def: <term> -->` heading a
   blockquote → `<aside class="definition-box">` with green accent (a sibling of the concept-inset box).
   It needs `build_book.py`, currently owned by the C→A IR migration; it drops in as ONE directive-
   registry row + a CSS rule once that lands. Spec it there.
2. **Chapter home.** The author's audio says these belong "in the definitions, in Part 2" (and some framing
   early in Part 1). Likely a new **"Definitions" section** early in Part 2 (or a Part-1 §), cross-linked
   from the lexicon and the concept-model (`book/data/concepts.json`).

---

## Engineering

> 🟢 **Engineering** — the discipline of developing operable technological artifacts to solve problems,
> *and* of analytically identifying and assessing the competing means to those solutions, each with distinct
> trade-offs.

**On "develops operable artifacts."** Engineering produces something that *works* — a technological artifact,
with human operators, that addresses a real problem.

**On "analytical assessment of competing means / trade-offs."** This is the part that separates the engineer
from the technician: *if you cannot articulate the trade-offs, you are not engineering — you are a
technician.* An engineer weighs competing architectures and designs against desired properties.

**On "predictive."** An engineer can **model and predict** the outcomes of the decisions they are about to
make — from the architecture and design they propose — *prior to building.* Prediction-before-construction is
the engineering move.

## Software engineering

> 🟢 **Software development** produces a functioning artifact. **Software engineering** *predictively selects*
> a software artifact according to its desired properties.

**On the development-vs-engineering distinction.** Development asks "does it function and meet requirements?"
Engineering asks "of the artifacts that would function, which one should we build, given the properties we
want?" — and answers *before* building it. (This is why the book is about software *engineering*, not
software development.)

## Agent

> 🟢 **Agent** — a **controllable intelligence capable of independent reasoning** over a knowledge base.

**On "intelligence."** Out of scope to define fully, but a working sense: given a set of **constraints** and a
**goal**, it can devise a *means* of satisfying the goal without violating the constraints. Picture a raven
dropping pebbles into a jar to raise the water high enough to drink — goal: a drink; constraint: the beak
can't reach the bottom; means: pebbles. A raven Archimedes. *Eureka.*

**On "controllable" (not *controlled*).** You can change its environment and the knowledge available to it,
and it will do different things, and it will generally follow orders. **Controllable ≠ controlled:**
*controlled* means **perfect** guarantees of behavior; *controllable* means **probabilistic** guarantees.
This one adjective is why **governance is a major part of this book** — if agents were *controlled*, we would
not need governance at all.

**On "independent reasoning."** It genuinely reasons in response to a query — it is not merely retrieving or
pattern-matching stored answers.

**On "over a knowledge base."** The thing it reasons *over*. For this book, the **models are that knowledge
base** — which is what ties the agent definition to the model definition.

> **Footnote (for the interested reader).** This departs from the textbook definition deliberately. For
> Russell & Norvig an agent is anything that **perceives** its environment (sensors) and **acts** on it
> (actuators); a *rational* agent acts to maximize an expected performance measure. That perceive-act framing
> is the one for **building** an agent. This book is about **governing** one, so it foregrounds a different
> property — **controllability**, in the cybernetic sense of behavior you can steer but not perfectly
> determine. The gap between *controllable* (probabilistic guarantees) and *controlled* (perfect guarantees)
> is not a hedge; it is the book's whole reason to exist. And "reasoning over a knowledge base" is the clause
> that ties the agent to the model: the models *are* the knowledge base.

## Model

> 🟢 **Model** — a useful approximation of a phenomenon (simplified, but good enough to predict) — and, as
> this book uses it, a **blueprint**: a prescriptive description of a system to be built, which the built
> system is bound to realize.

**The first sense — a useful approximation.** The reader is probably familiar with this one: a model as a
simplified description prized because it *predicts*, not because it is exact. *f = ma* neglects friction and
is useful anyway; [Box's aphorism](https://en.wikipedia.org/wiki/All_models_are_wrong) — *all models are
wrong, some are useful* — is the canonical statement. Models in this sense come in kinds — mathematical,
qualitative, relational, data-flow — and their **fidelity** trades against **cost**: a coarse model is cheap
to reason about but carries error bars, and how much fidelity you need is in the eye of the application ("it
processes information serially" may do to sketch a system; reasoning about security or privacy wants one much
closer to the real thing).

**The second sense — the one I embed here — a blueprint.** A blueprint does not *approximate* an existing
building; it *specifies* one that does not yet exist, and the builder is bound to it. That is the sense this
book leans on: a model is a **prescriptive** description of the system you intend to build. It is what lets a
model do more than describe — a system built to a model may **elaborate** on it but may not **diverge** from
it. And that is exactly what lets a model serve as an agent's marching orders: it is at once a **constraint**
(bounding what may be built) and a **blueprint** (saying what to build), and, because the agent reasons over
it, the **knowledge base** for the artifact under construction.

> **Footnote.** The approximation sense is Box's. The blueprint sense — a description that *specifies* rather
> than *describes* — is what semiotics calls signification (a sign standing for its object); *blueprint* is
> the engineer's word for it, and the one I use.

## Structured

> 🟢 **Structured** — said of a model: written in an explicit, declared shape a machine can read and
> validate — a schema, not prose. The declared structure is what lets a machine hold the system up to the
> model: read the shape, check it for drift, query it, reason over it, enforce it. Prose can be a model;
> only a **structured** model can be checked.

Not a fifth term but an **adjective** — the property the fourth definition (*model*) comes to need. The
foundation model is a model in the approximation sense and is not structured in this one; the blueprints
this book teaches are.

**On "declared shape."** The structure is a written-down form — fields, states, relations — that a program
can parse without a human in the loop. This is not the narrow programming-language sense of a variable's
type; it is the broader one. A **type** is one way to declare a shape, and type-checking is its sharpest
case, but a schema, a state table, or a registry declares a shape just as well. What matters: the model has
a shape, the shape is explicit, and a checker can validate any instance against it.

**On what the shape buys — analyzability.** A machine can do to a structured model what it cannot do to
prose: **read** it, **check** it against the code and fail the build when they disagree, **query** it
without re-deriving structure from the source, **reason** over it, and **enforce** it — refusing work that
diverges. *Structured* was chosen over *typed* precisely because it names this whole span — analyzability —
not the type-check alone. **Structured subsumes typing.**

**Why it is the load-bearing half of the Modeling Thesis.** Prose can be a model — simplified, predictive,
even prescriptive. But only a **structured** model can sit at the apex of the documentation hierarchy,
because only a machine-readable description can be the one the machine checks the others against. Every
"structured, drift-checked model" in this book leans on the adjective: drop it and the drift gate has
nothing to read.

---

*The relationship between the four is "the whole book in a nutshell" (the author's phrase): engineers love
models because they can assess trade-offs without excess cost; agents are controllable reasoners; and a model
handed to an agent is at once its constraint, its blueprint, and its knowledge base — so the book's job is to
describe the models useful to agents, show how agents interact with them, keep them consistent with the
artifact as it is built, and teach engineers to construct/assess/use them to predict before building.*
