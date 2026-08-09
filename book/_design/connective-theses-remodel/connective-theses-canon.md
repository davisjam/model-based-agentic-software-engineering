# The Connective Theses — Canon (P0 SSOT)

**Status: FROZEN foundation.** Destined for `book/_design/connective-theses-canon.md`. Every
downstream phase QUOTES this file verbatim — it does not paraphrase. Where prose, a figure caption,
a model statement, a glossary entry, or a landing card states any of the material below, it must
match this wording. Source of truth: the ratified spine design (Facet A), the ratified decisions +
Phase-1b REVISEs (author rulings win), and `rewrite.md`. This file is dateless canon, edited in
place — not a timestamped design doc.

One-line orientation: **the two theses are connective and causal, not parallel siblings.** Modeling
creates the representational surfaces on which Alignment acts. Nothing new is bolted onto MAGE; the
book is finally stating the causal relationship among concepts it already had.

---

## 1. The two thesis definitions — LOCKED

Each thesis is written in the book's stylistic signature, the **three-beat cadence**: a canonical
**Definition**, an **In other words…** engineering-intuition translation, and a **Why it matters**
consequence. The formal statement stays canonical; the lower branches let readers climbing at
different rates grab on. Downstream prose pastes these; it does not soften the definition.

### 1.1 The Modeling Thesis

> **The Modeling Thesis.** Externalize engineering knowledge and intent into explicit, structured
> representations that give commodity intelligence a compact world to reason through and give
> engineers a surface on which to specify, analyze, and predict the system. As those representations
> grow richer — from selected context, to connected knowledge, to invariant-bearing executable
> models — they make progressively more engineering questions tractable without returning to raw
> implementation.
>
> **In other words:** don't make every agent rediscover your architecture from raw code — move the
> engineering knowledge out of people's heads and into representations the next engineer, and the
> next agent, can start from.
>
> **Why it matters:** every fact you externalize is one an agent stops paying to rediscover on each
> task — and one the environment can later be taught to check.

The clause *"from selected context, to connected knowledge, to invariant-bearing executable models"*
IS the capability ladder in miniature (§4). Do not cut it. A knowledge graph is an *early
realization* of this thesis, not a lesser sibling of the full-strength MAGE model.

### 1.2 The Alignment Thesis (name kept — never "Operationalization")

> **The Alignment Thesis.** Give engineering intent authority over autonomous work by encoding
> obligations into deterministic mechanisms that constrain action, observe violations, evaluate
> evidence, and control admission. Where the Modeling Thesis makes intent explicit, the Alignment
> Thesis makes that intent binding on what the fleet can do and what the environment will accept.
>
> **In other words:** once you've decided how the system should behave, stop asking every future
> agent to remember that decision — teach the environment to enforce it instead.
>
> **Why it matters:** every decision that becomes enforceable is one less decision every future agent
> must rediscover — authority, not memory, carries the policy forward.

The four verbs — **constrain / observe / evaluate / control admission** — map 1:1 onto the book's
four mechanism archetypes: **Constraint · Sensor · Validator · Gate**. Keep the archetypes intact;
they are now the four ways represented obligations acquire operational force.

### 1.3 "Represented intent becomes authority" — the built bridge

The memorable phrase is kept almost verbatim, but *built toward*, never dropped as a slogan:

> A model by itself has no authority. It helps an engineer think, and it helps an agent navigate, but
> nothing requires the implementation to obey it. The Alignment Thesis changes that relationship:
> once engineering intent is represented explicitly enough to be checked, the environment can enforce
> it.
>
> **Represented intent becomes authority.**
>
> **In other words:** the model stops being advice and starts becoming something the build, the
> deployment pipeline, or the runtime refuses to violate.

Alternate lower branch, for sites that connect to executable models: *"the model stops describing how
the system ought to behave and starts participating in making it behave that way."*

---

## 2. The relationship — LOCKED

### 2.1 The frozen relationship phrase (the textual lint — propagate everywhere)

> **Modeling makes intent explicit; Alignment makes it binding.**
>
> **In other words:** first write down what matters in a form both people and machines can
> understand; then teach the engineering environment to insist on it.

The default verb is **"makes it binding."** The author may swap "binding" → "gives it authority"
(both are the author's own words, low-stakes) — but a downstream phase does NOT invent a third verb.
Second sanctioned lower branch: *"models explain the system to the agent; alignment stops the agent
from violating what the models say."*

### 2.2 The fuller formal statement

> The theses are causally linked, not parallel. Modeling turns implicit engineering knowledge into a
> representation both humans and machines can reason over. Alignment attaches authority to that
> representation. The richer the model, the more obligations can move from probabilistic judgment
> into deterministic enforcement. Modeling therefore feeds Alignment; Alignment, in turn, keeps the
> models and the system from silently diverging.

### 2.3 The dependency — why it does NOT collapse to one thesis

- **Alignment depends on Modeling; Modeling does not depend on Alignment.** A dependency, not a
  disappearance.
- **Compiler analogy.** AST → type system → optimization → code generation. The optimizer depends on
  the AST; that does not make optimization a "maintenance mechanism" — it is a distinct phase enabled
  by the representation. Modeling is the AST/type-system layer (representation + inference); Alignment
  is the phase that acts on it. **Representation → Inference → Authority**: the first two are
  Modeling, the third is Alignment.
- **Both theses survive independently — which is why there are still two.** Modeling without Alignment
  is useful (a service catalog helps an agent navigate with no invariant attached — Spotify).
  Alignment without rich modeling is useful (sandbox actions and run tests against raw artifacts —
  Docker, the standing counterexample). MAGE's strongest form joins them. This guard protects the
  book from ever implying that **every lint needs a knowledge graph.** Downstream phases must preserve
  it.

### 2.4 The recurring Alignment sentence

> The stronger the representation, the richer the obligation the environment can enforce
> deterministically.

This is the determinization frontier stated as a working sentence; state it once in the Alignment
part and reuse it.

---

## 3. The causal spine — one place, two forms

### 3.1 The 8-station spine (the compact reference figures and the section test cite)

```
Commodity intelligence
      →  Context problem
      →  Externalize knowledge
      →  Structure into models
      →  Make intent explicit
      →  Give intent authority
      →  Alignment mechanisms
      →  Governed Engineering Environment
```

### 3.2 The "That is MAGE" ladder (LOCKED verbatim — the reader-facing close)

> Commodity intelligence creates a reasoning problem.
> Context engineering begins the response.
> Durable context becomes structured knowledge.
> Structured knowledge becomes engineering models.
> Models make intent explicit.
> Explicit intent makes more judgment mechanizable.
> Alignment gives that intent authority.
> Failures enrich the representations and controls.
> The environment compounds.
> Autonomy scales.
>
> That is MAGE.

This belongs at the hinge where the argument is first assembled whole (the Preface "What the method
turned out to be", echoed at the Part 6 synthesis). It reconciles the front matter with Part 6's
existing discovery — *"Modeling feeds Alignment — the two theses are connective, not parallel."*

### 3.3 The figure geometry (for the Figures phase)

The opening figures draw a **vertical causal descent**, not two sibling branches. The one
load-bearing new element is a labeled **"creates surfaces for"** arrow from Structured/Executable
Models into the Alignment Thesis — heavier than the other connectors, because that arrow *is* the
causal-thesis claim.

```
              COMMODITY INTELLIGENCE  (broad · cheap · probabilistic)
                          |
                          v
              REASONING-HORIZON PROBLEM  (the system won't fit the window)
                          |
                          v
                   MODELING THESIS
        externalize knowledge + engineering intent
                          |
            +-------------+-------------+
            |                           |
            v                           v
      better context             stronger semantics
      for reasoning              for engineering
            |                           |
            +-------------+-------------+
                          |
                          v
            STRUCTURED / EXECUTABLE MODELS
         what is · what ought to be · invariants
                          |
                          |  creates surfaces for   <-- labeled arrow = new content
                          v
                   ALIGNMENT THESIS
          give engineering intent authority
                          |
                          v
       constraints · sensors · validators · gates
                          |
                          v
             GOVERNED ENGINEERING ENVIRONMENT
```

---

## 4. The Capability Ladder vocabulary — LOCKED (8 rungs, one canonical set)

One ladder, never a second. These labels are authoritative for **prose AND figures AND the
`capability_ladder_declared.json` `label` field** (resolves the earlier B-vs-C label drift). The
kebab id is the SSOT join key.

| # | Rung (canonical label) | Capability (one line) | kebab id | Lean |
|---|---|---|---|---|
| 1 | **Context selection** | Choose which knowledge enters this reasoning episode — reason over a task-relevant slice, not the whole estate. | `context-selection` | modeling |
| 2 | **Externalized knowledge** | Put durable knowledge outside transient memory — catalogs, corpora, skills, registries — so no agent rediscovers it. | `externalized-knowledge` | modeling |
| 3 | **Structured relationships** | Typed entities and typed edges (deps, ownership, lineage) — relevance follows relationships; tools traverse it. | `structured-relationships` | modeling |
| 4 | **System models** | Add semantics — behavioral, process, physical, scenario — so the representation says what *shape* the system should have. | `system-models` | modeling |
| 5 | **Explicit properties (invariants)** | State invariants and obligations over the model — intent stops being implicit. | `explicit-invariants` | alignment |
| 6 | **Model-derived analysis** | Query, target, generate, predict, verify *from the model* — it settles questions, not just describes. | `model-derived-analysis` | alignment |
| 7 | **Traceability** | Join model elements bidirectionally to implementation — a claim points at the code that realizes it and back. | `traceability` | alignment |
| 8 | **Drift enforcement** | The environment refuses to let model and territory silently diverge — a gate blocks the edit until they agree. | `drift-enforcement` | alignment |

**The two framing guards (state both, verbatim-ish, wherever the ladder appears):**

- **A capability ladder, NOT a maturity model.** *The ladder orders representational capabilities,
  not organizations. Higher rungs make additional engineering questions possible; they do not imply
  that every system should climb every rung.* No levels, scores, badges, or monotonic-ascent claim.
- **Orders capabilities, not organizations.** Docker is strong on authority and weak on modeling;
  Zenseact strong on context routing without an invariant model; Siemens extraordinarily mature yet
  without the adaptive-governance loop. Different legitimate stopping points.

**The two-axis gradient + the turn.** Bottom = *better context / helps the reasoner*; top = *stronger
control / governs the artifact*. Moving up does both at once — **the Modeling Thesis gradually turns
into the Alignment Thesis.** The "turn" is a dotted annotation between rungs 4 and 5, never a wall;
render as a continuous vertical gradient, not two hard-partitioned blocks.

**The transition sentence (say once):** *rungs 1–4 mostly help the reasoner; the turn at rung 5 makes
intent explicit; rungs 5–8 give the environment authority over the artifact.*

**The ladder TEACHES; the 12-rung matrix MEASURES.** The 8-rung ladder is the teaching abstraction
(opening / new Part 2). The 12-rung modeling-ceiling matrix is the fine-grained empirical instrument
(Part 6). They are the same axis at two resolutions, cross-referenced through the `modeling_ceiling_map`
join (§4 of the ladder SSOT), never merged. Say the teach/measure discipline in both places.

---

## 5. The section-level editorial TEST — LOCKED

Replaces the old parallel test ("does this belong under Modeling or Alignment?"), which enforced the
very parallelism the refactor removes, with a **causal** test that gives the book motion:

> Does this section help the intelligence **understand** the engineered world, **make engineering
> intent explicit**, **give that intent authority**, or **improve the environment from what
> happened**? If the answer is none of those, the section needs a sharper role or a cut.

The four clauses are the spine's four load-bearing stations:

| Clause | Spine station | Thesis |
|---|---|---|
| help the intelligence understand the world | Context → Knowledge | Modeling (low rungs) |
| make engineering intent explicit | Structure into models | Modeling (high rungs) |
| give that intent authority | Give intent authority → mechanisms | Alignment |
| improve the environment from what happened | Governance conversion | the loop |

Audit form: tag every section with exactly one station label. A section that resists a single tag
does two jobs (split it) or none (cut or refocus it). A Modeling-part section tagged "give authority"
is misfiled — evidence for relocation.

---

## 6. The "In other words…" house-rule — LOCKED (scoped to a DECLARED ANCHOR SET)

**The rule.** Every statement in the **declared anchor set** (§6.1) is immediately followed by a
one-sentence **"In other words…"** translation, in the three-beat cadence: canonical **Definition**,
one-sentence **In other words…** (engineering intuition, concrete verbs, the *same* idea viewed
operationally — never a dumbed-down different claim), and a **Why it matters** consequence where it
is not already obvious.

**Scope discipline (Phase-1b REVISE R4).** The rule fires ONLY on the anchor set — a registered,
closed list — NOT on "every new theoretical statement." A general "every theoretical statement"
trigger is editorial judgment, not mechanically decidable, and would over-claim mechanical
enforcement; a doc-lint can only check that each ANCHORED statement carries its translation. The rule
does NOT fire on ordinary exposition, worked-example prose, or a term's second appearance.
Over-applying it turns prose into call-and-response — one translation per genuinely new idea, not per
paragraph. Glossary entries carry their own italic-tag gloss and need no separate "In other words".

### 6.1 The declared anchor set

The closed set of statements each phase MUST follow with an "In other words…" line. A doc-lint checks
presence per anchor; adding a new anchor is a deliberate edit to this list.

1. **The Modeling Thesis** (§1.1).
2. **The Alignment Thesis** (§1.2).
3. **The relationship phrase** — "Modeling makes intent explicit; Alignment makes it binding" (§2.1).
4. **"Represented intent becomes authority"** — the built-bridge slogan (§1.3).
5. **The Representation–Alignment Proposition** — *as engineering intent becomes more explicit and
   structured, the set of obligations that can be enforced deterministically expands* (§7).
6. **The Capability Ladder** — its first, defining statement of what the ladder is (§4).

Not anchors (carry their own gloss or are exposition): the "That is MAGE" ladder prose (it is itself
the translation of the spine); the recurring Alignment working sentence (§2.4); glossary terms
(*knowledge representation*, *system knowledge graph*, *capability ladder*) — italic-tag glossed.

### 6.2 The reference implementation (the canonical cadence)

> Represented intent becomes authority.
> *In other words:* the environment starts enforcing engineering decisions instead of merely
> documenting them.
> *Why it matters:* every decision that becomes enforceable is one less decision every future agent
> must rediscover.

---

## 7. The Representation–Alignment Proposition (named, state once)

> **Representation–Alignment Proposition.** As engineering intent becomes more explicit and
> structured, the set of obligations that can be enforced deterministically expands.
>
> **In other words:** the more of the system you write down in a checkable form, the more of "how it
> must behave" the environment can enforce on its own instead of leaving to human vigilance.

This names the **determinization frontier** as the formal explanation of the thesis dependency — the
theory-level encoding of "Modeling feeds Alignment." It already lives as a formal result in Part 6;
the refactor makes the opening know what the closing chapters learned.

---

## 8. The non-tensions to PRESERVE (do not "fix")

Keep two theses; keep the name **Alignment** (never rename to "Operationalization" — too academic);
keep the four mechanism archetypes (Constraint · Sensor · Validator · Gate); keep Kruchten 4+1
(demoted to views/projections over one connected representation, NOT the definition of a model); keep
governance conversion and engineering capital (they grow *more* powerful — capital can now accrue on
either side of the relationship). Keep the "Model Zoo" name (revise only its glossary definition off
"4+1 views over DocAble" to "views projected from one connected engineering representation").
