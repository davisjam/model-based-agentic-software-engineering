# PHASE-1 DESIGN — MAGE Connective-Theses Whole-Book Re-Model (CONSOLIDATED)

**Synthesis of five facet designs (A–E) + the author spec (`/Users/davisjam/Downloads/rewrite.md`,
1593 lines, all approved at :1423).** This is the single implementable spec the phased rollout follows.
READ-ONLY design; nothing here is executed. Downstream phases PASTE the locked wording in §1–§2, they do
not paraphrase.

**The one-sentence thesis of the whole refactor (rewrite.md :1402):** *Nothing new is bolted onto MAGE.
The book already had all the concepts; it is finally stating the CAUSAL relationship among them.* The two
theses stop being parallel siblings and become one progression — **Modeling creates the surfaces on which
Alignment acts.** The macro-move that makes the book *enact* its own claim is the **Part 2 ↔ Part 3 swap**
(Modeling before Alignment), organized around **one canonical 8-rung Capability Ladder** and the
**"In other words…"** three-beat cadence as a house signature.

---

## §1. LOCKED CANON (from A + E) — paste verbatim, do not paraphrase

### 1.1 The canonical spine (8 stations)

```
Commodity intelligence → Context problem → Externalize knowledge → Structure into models
  → Make intent explicit → Give intent authority → Alignment mechanisms → Governed Engineering Environment
```

Both theses are **connective / causal, not parallel.** Alignment *depends on* Modeling; Modeling does not
depend on Alignment. Keep both theses; keep both names ("Alignment" stays — do NOT rename to
"Operationalization"; too academic, rewrite.md :676). The compiler analogy is LOCKED (rewrite.md :604-627):
AST → type system → optimization → code generation; the optimizer depends on the AST but is a distinct
*phase enabled by the representation*. Modeling = representation + inference; Alignment = authority
(Representation → Inference → **Authority**; first two Modeling, third Alignment).

**The non-collapse guard (LOCKED, rewrite.md :736-742, :1373) — downstream facets MUST preserve:**
- *Modeling without Alignment is useful* — Spotify's catalog helps an agent navigate with no invariant attached.
- *Alignment without rich modeling is useful* — Docker sandboxes actions and tests raw artifacts (the standing counterexample).
- *MAGE's strongest form joins them.* This guard stops the book from ever implying **every lint needs a knowledge graph.**

### 1.2 The Modeling Thesis — LOCKED (three-beat cadence)

> **The Modeling Thesis.** Externalize engineering knowledge and intent into explicit, structured
> representations that give commodity intelligence a compact world to reason through and give engineers a
> surface on which to specify, analyze, and predict the system. As those representations grow richer — from
> selected context, to connected knowledge, to invariant-bearing executable models — they make progressively
> more engineering questions tractable without returning to raw implementation.
>
> **In other words:** don't make every agent rediscover your architecture from raw code — move the
> engineering knowledge out of people's heads and into representations the next engineer, and the next
> agent, can start from.
>
> **Why it matters:** every fact you externalize is one an agent stops paying to rediscover on each task —
> and one the environment can later be taught to check.

The "from selected context, to connected knowledge, to invariant-bearing executable models" clause **is the
capability ladder in miniature — do not cut it.** This REPLACES the current reasoning-support-only framing
(tension T1, §7).

### 1.3 The Alignment Thesis — LOCKED (name kept, rewrite.md :718, :1375)

> **The Alignment Thesis.** Give engineering intent authority over autonomous work by encoding obligations
> into deterministic mechanisms that constrain action, observe violations, evaluate evidence, and control
> admission. Where the Modeling Thesis makes intent explicit, the Alignment Thesis makes that intent binding
> on what the fleet can do and what the environment will accept.
>
> **In other words:** once you've decided how the system should behave, stop asking every future agent to
> remember that decision — teach the environment to enforce it instead.
>
> **Why it matters:** every decision that becomes enforceable is one less decision every future agent must
> rediscover — authority, not memory, carries the policy forward.

The four verbs (constrain / observe / evaluate / control admission) map 1:1 onto the four mechanism
archetypes (**Constraint · Sensor · Validator · Gate**, `book/frontmatter/0.3-the-books-language.md:80-90`).
Keep the archetypes intact — they are now easier to explain: the four ways represented obligations acquire
operational force.

### 1.4 The FROZEN relationship phrase — LOCKED (RECONCILED, see §7-R1)

> **Modeling makes intent explicit; Alignment makes it binding.**
>
> **In other words:** first write down what matters in a form both people and machines can understand; then
> teach the engineering environment to insist on it.

Second sanctioned lower branch (rewrite.md :1453): *"models explain the system to the agent; alignment stops
the agent from violating what the models say."*

**Fuller formal statement (LOCKED, rewrite.md :732, :1447-1449):**
> The theses are causally linked, not parallel. Modeling turns implicit engineering knowledge into a
> representation both humans and machines can reason over. Alignment attaches authority to that
> representation. The richer the model, the more obligations can move from probabilistic judgment into
> deterministic enforcement. Modeling therefore feeds Alignment; Alignment, in turn, keeps the models and the
> system from silently diverging.

**"gives it authority" is the sanctioned SLOGAN + the Alignment-thesis station verb — NOT a competing
canonical relationship phrase.** (Resolution of the A/E-vs-B/D wording split, §7-R1.)

### 1.5 "Represented intent becomes authority" — the built bridge (LOCKED, rewrite.md :1457-1485)

Kept almost verbatim (memorable) but *built toward*, not dropped as a slogan:

> A model by itself has no authority. It helps an engineer think, and it helps an agent navigate, but nothing
> requires the implementation to obey it. The Alignment Thesis changes that relationship: once engineering
> intent is represented explicitly enough to be checked, the environment can enforce it.
>
> **Represented intent becomes authority.**
>
> **In other words:** the model stops being advice and starts becoming something the build, the deployment
> pipeline, or the runtime refuses to violate.

Alternate lower branch for executable-model sites (rewrite.md :1483): *"the model stops describing how the
system ought to behave and starts participating in making it behave that way."*

### 1.6 The "That is MAGE" ladder-prose (LOCKED verbatim, rewrite.md :1408-1419)

> Commodity intelligence creates a reasoning problem. / Context engineering begins the response. / Durable
> context becomes structured knowledge. / Structured knowledge becomes engineering models. / Models make
> intent explicit. / Explicit intent makes more judgment mechanizable. / Alignment gives that intent
> authority. / Failures enrich the representations and controls. / The environment compounds. / Autonomy
> scales. / **That is MAGE.**

Belongs at the hinge where the argument first assembles whole (Preface "What the method turned out to be",
echoed at the Part 6 synthesis).

### 1.7 The recurring Alignment-part sentence + named proposition

> The stronger the representation, the richer the obligation the environment can enforce deterministically.

Optional named proposition (state once, reuse; rewrite.md :1190): *Representation–Alignment Proposition — as
engineering intent becomes more explicit and structured, the set of obligations that can be enforced
deterministically expands.*

### 1.8 The "In other words…" house-rule — LOCKED (rewrite.md :1431-1435, :1509-1525)

Every **new theoretical statement** (a coined term, a formal definition, a thesis, a named proposition, a
slogan-grade phrase) is immediately followed by a one-sentence **"In other words…"** translation. Three-beat
cadence:
1. **Definition.** Precise, canonical, unsoftened.
2. **In other words…** Engineering intuition, one sentence, concrete verbs — the *same* idea viewed
   operationally, never a dumbed-down different claim.
3. **Why it matters.** The consequence (only where not already obvious).

**Fires on:** thesis/relationship statements; a coined/first-defined capitalized MAGE construct; a
slogan-grade phrase. **Does NOT fire on** ordinary exposition, worked-example prose, or a term's second
appearance. Glossary entries carry their own italic-tag gloss and need no separate "In other words".
One translation per genuinely new idea, not per paragraph.

### 1.9 The section-level editorial TEST — LOCKED (rewrite.md :1587-1591)

Replaces the old parallel test ("does this belong under Modeling or Alignment?") — which enforced the very
parallelism the refactor removes — with a **causal** test that gives the book motion:

> Does this section help the intelligence **understand** the engineered world, **make engineering intent
> explicit**, **give that intent authority**, or **improve the environment from what happened**? If the
> answer is none of those, the section needs a sharper role or a cut.

The four clauses are the spine's four load-bearing stations (Context→Knowledge = Modeling low rungs; Structure
into models = Modeling high rungs; Give authority = Alignment; improve-from-failure = the governance loop).
Audit form: tag every section with exactly one station label; a section that resists a single tag does two
jobs (split) or none (cut/refocus); a Modeling-part section tagged "give authority" is misfiled evidence.

---

## §2. THE CAPABILITY LADDER (from B + C)

### 2.1 The one canonical 8-rung ladder — LOCKED (never invent a second)

| # | Rung (canonical label) | Capability (one line) | kebab id (SSOT key) |
|---|---|---|---|
| 1 | **Context selection** | Choose which knowledge enters this reasoning episode — reason over a task-relevant slice, not the whole estate. | `context-selection` |
| 2 | **Externalized knowledge** | Put durable knowledge outside transient memory — catalogs, corpora, skills, registries — so no agent rediscovers it. | `externalized-knowledge` |
| 3 | **Structured relationships** | Typed entities and typed edges (deps, ownership, lineage) — relevance follows relationships; tools traverse it. | `structured-relationships` |
| 4 | **System models** | Add semantics — behavioral, process, physical, scenario — so the representation says what *shape* the system should have. | `system-models` |
| 5 | **Explicit properties (invariants)** | State invariants/obligations over the model — intent stops being implicit. | `explicit-invariants` |
| 6 | **Model-derived analysis** | Query, target, generate, predict, verify *from the model* — it settles questions, not just describes. | `model-derived-analysis` |
| 7 | **Traceability** | Join model elements bidirectionally to implementation — a claim points at the code that realizes it and back. | `traceability` |
| 8 | **Drift enforcement** | The environment refuses to let model and territory silently diverge — a gate blocks the edit until they agree. | `drift-enforcement` |

**Canonical labels above are authoritative for prose AND figures AND the JSON `label` field** (resolves the
B-vs-C label drift, §7-R3). The `capability_question` fuller phrasings live in the SSOT JSON (§2.5).

**Two framing guards (state both, verbatim-ish):**
- **A capability ladder, NOT a maturity model.** *The ladder orders representational capabilities, not
  organizations. Higher rungs make additional engineering questions possible; they do not imply that every
  system should climb every rung.* No levels, scores, badges, or monotonic-ascent claim (rewrite.md :128, :193-199).
- **Orders capabilities, not organizations.** Docker is strong on authority / weak on modeling; Zenseact
  strong on context routing without an invariant model; Siemens extraordinarily mature yet no
  adaptive-governance loop. Different legitimate stopping points.

### 2.2 The two-axis gradient (bottom = better context / top = stronger control)

Moving up does BOTH at once — *the Modeling Thesis gradually turns into the Alignment Thesis.* The "turn"
annotation (a dotted line, NOT a wall) sits between rungs 4 and 5. Render as a **continuous vertical gradient**
(reasoning-support hue fading into enforcement hue), never two hard-partitioned blocks (rewrite.md :170 caveat).

```
   ▲ STRONGER CONTROL — representations increasingly GOVERN the artifact
 8 Drift enforcement  ┐
 7 Traceability       │  ALIGNMENT-leaning (authority over the artifact)
 6 Model-derived      │
 5 Explicit properties┘
   · · · the intent becomes explicit · · ·  ← the turn (rungs 4/5)
 4 System models      ┐
 3 Structured rels    │  MODELING-leaning (help the reasoner: better context)
 2 Externalized knwl  │
 1 Context selection  ┘
   ▼ BETTER CONTEXT — representations mostly HELP THE REASONER
```

### 2.3 The 3 uses of the ONE ladder (rewrite.md :1204-1233)

| Use | Where | Question | Overlay | Mode |
|---|---|---|---|---|
| **Explanatory** | Opening / new Part 2 (Modeling) | "What becomes possible as representation gets stronger?" | two-axis gradient + the "turn" | **TEACHES** |
| **Adoption** | Part 4 (brownfield) | "Where are you now, cheapest useful next rung?" | "you-are-here" marker; climb one rung when a recurring engineering question justifies it | **GUIDES** |
| **Comparative** | Part 6 | "Where do the cases reach; where is the modeling frontier?" | case markers on rungs; "modeling ceiling" line | **MEASURES** |

**Discipline stated in both places:** *the ladder in Part 3-material (new Part 2) TEACHES; the matrix in Part 6
MEASURES.* Same figure, three times, only the overlay changes — author the SVG so overlays layer on without
redrawing the rungs.

### 2.4 The case × rung frontier (from the 12-rung matrix, collapsed)

```
   RUNG                     Zen  Shop Spot Cloud Siem  Docker  MAGE/DocAble
 8 Drift enforcement         ·    ·    ·    ·     ·      ·        ██  ← only MAGE
 7 Traceability              ·    ·    ·    ·     ██     ·        ██
 6 Model-derived analysis    ·    ◐    ◐    ◐     ██     ·        ██
 5 Explicit properties       ·    ◐    ◐    ██*   ██     ◐        ██
 4 System models             ·    ·    ◐    ·     ██     ·        ██
 3 Structured relationships  ○    ◐    ██   ██    ██     ○        ██
 2 Externalized knowledge    ██   ██   ██   ██    ██     ██       ██
 1 Context selection         ██   ██   ██   ██    ██     ██       ██
```
`*` Cloudflare rung-5 is the **instructive inversion**: reaches *explicit properties* (curated obligation
corpus, stable requirement identities enforced at review) while the governed system beneath is largely
unmodeled (rung-4 `not-seen`) — obligations modeled *more strongly than the system that must satisfy them*.
The normal climb builds 4→5; Cloudflare inverts it. **The frontier line** is drawn between rungs 3 and 4: the
five software-first cases cluster on 1-3 and go quiet above; Siemens + MAGE alone cross into 4+; MAGE alone
reaches 8. **That line IS the book's contribution.** Docker is **off-ladder** (deliberate strong-Alignment /
weak-modeling counterexample; the guard that stops "every mature agent environment needs a graph").

**Per-case placement (do-not-overclaim, from B §4):** Zenseact@1 (context selection floor — do NOT claim a
topology/invariant model) · Shopify@2 (durable org knowledge + selective retrieval; Nix = executable
exception; do NOT claim invariant-bearing graph) · Spotify@3 (the canonical system knowledge graph — highest
software-first structural reach; do NOT claim generalized drift gates) · Cloudflare@5-inverted · Siemens@4-7
(model-first, native traceability; **stops one rung short of 8** — no generalized drift gate over agent edits)
· DocAble/MAGE@1-8 (the only rung-8 case) · Docker off-ladder.

**Gallery rotation in the new Part 2 (Modeling):** after rungs 1-3, Spotify lead + Cloudflare/Shopify/Zenseact
as varied representations; at the executable frontier (4-8), Siemens + DocAble; Docker enters wherever
Alignment-without-modeling needs its guard.

### 2.5 The ladder SSOT + the 12→8 join

**A new declared model `book-models/capability_ladder_declared.json` + `capability_ladder_model.py` IS
warranted** (SSOT trigger: the ladder recurs 3× in figures + Part-4 climb + Appendix-A stacks + Appendix-E
skill-graduation + the Part-6 comparative; N hand-rolled copies WILL drift — A.9/A.24/rule #33). Genre check
(rule #22): genre = maturity/capability model; **adopt the rung-list schema, REJECT the maturity runtime**
(no scores/badges/levels/monotonic-ascent) — encode that as a declared `guard: "capability-not-maturity"`
field so a projection can't render it as CMM.

SSOT shape: 8 rung records (`id`/`order`/`label`/`capability_question`); `guard`; `gradient`
{bottom, top}; and a **total `modeling_ceiling_map`** (12 fine rungs → 8 teaching rungs) — the join that keeps
the teaching ladder and the empirical matrix from diverging. Canonical map (RECONCILED, §7-R4 — this is
authoritative over B's illustrative table):

```
topology→structured-relationships   ownership-deps→structured-relationships   data-lineage→structured-relationships
infra-as-code→externalized-knowledge   structured-policy→explicit-invariants   invariant-registry→explicit-invariants
behavioral-state→system-models   process-concurrency→system-models   scenario→system-models
model-derived-verification→model-derived-analysis   bidirectional-traceability→traceability   drift-gate→drift-enforcement
```

Checks (all **AUDIT-ONLY-first**, rule #55): **CL1** rung ids unique+kebab, `order` 1..8 contiguous; **CL2**
`modeling_ceiling_map` covers every 12-rung id and every value resolves to a rung (the abstraction is total);
**CL3** `guard == "capability-not-maturity"`. The **causal spine itself needs NO new model** — it is the
`argument_spine` `modeling.feeds = ["alignment-thesis"]` edge (§4) + the ladder. A third "spine" model is
rejected (A.20 accidental complexity).

The **8⊇12 correspondence table prints once in Appendix A** ("where the conceptual ladder meets implementation
architecture", rewrite.md :1249-1261); both the Part-2 figure and the Part-6 matrix cite it.

---

## §3. THE FIGURES (from B) — ASCII specs

All are hand-authored SVGs in `book/assets/`. Redraw order = work-order step 2 ("if those three tell the new
story, the prose can follow"). **Owner: Facet-B geometry; Sonnet may execute SVG once Opus specs it.**

| Book figure | SVG file | Current story | New story |
|---|---|---|---|
| 0.1-1 | `mage-method.svg` | Fleet **forks** into two sibling theses | Vertical connective descent → GEE → Capital → Trustworthy Autonomy |
| 0.1-2 | `theory-of-mage-card.svg` | Two theses in adjacent **equal** boxes | Middle becomes a small **causal sequence** Modeling→Alignment |
| 0.4-2 | `mage-overview.svg` | "Two **divide** the three not-knowings" | Same connective spine, Preface frame, ladder folded inline |
| NEW | `model-ladder.svg` (promote/retitle) | 6-rung all-green diagonal | **8-rung Capability Ladder** with the two-axis gradient |
| (P4) | `book-map.svg` | "Part 2 = Alignment, Part 3 = Modeling" | Swapped: Part 2 = Modeling, Part 3 = Alignment (scheduled P4, §5) |

**Figure 0.1-1 (`mage-method.svg`) — the load-bearing redraw.** Single descending column; the only place two
arrows appear is the "better context / stronger semantics" pair which **rejoins** (does not stay forked). The
new intellectual content is the **labeled, heavier "creates surfaces for" arrow** from STRUCTURED/EXECUTABLE
MODELS into ALIGNMENT THESIS:

```
COMMODITY INTELLIGENCE (broad·cheap·probabilistic) → REASONING-HORIZON PROBLEM
  → MODELING THESIS (externalize knowledge + engineering intent)
      → {better context for reasoning  +  stronger semantics for engineering} → rejoin
  → STRUCTURED / EXECUTABLE MODELS (what is · what ought · invariants)
      ═══ creates surfaces for ═══>  (LABELED heavier arrow = the new content)
  → ALIGNMENT THESIS (give engineering intent authority)
  → constraints · sensors · validators · gates → GOVERNED ENGINEERING ENVIRONMENT
  → governance conversion → ENGINEERING CAPITAL → TRUSTWORTHY AUTONOMY
```
Caption drops "Two theses answer it…"; leads with *"Modeling makes intent explicit; Alignment makes it binding
— one progression, not two branches."*

**Figure 0.1-2 (`theory-of-mage-card.svg`).** Keep the seven-panel grammar + other five panels; change ONLY
the two-thesis panel from side-by-side equal boxes to a **stacked pair joined by a vertical labeled arrow**
carrying "richer representations make more obligations enforceable." Governance-Conversion panel gets an arrow
touching *both* thesis boxes. Add the mnemonic: *"Model the world the intelligence must reason about; align its
actions to the engineering intent encoded there."*

**Figure 0.4-2 (`mage-overview.svg`).** Same connective spine tuned to the Preface's
reasoning-problem-before-control-problem frame; draw the ladder as a compact inline strip inside the MODELING
node (context→…→invariant) so the overview and the standalone ladder share vocabulary. Keep the
churn-vs-converge outcome contrast. Caption replaces "the two divide the three not-knowings" with
*"Commodity intelligence creates a reasoning problem before it creates a control problem; Modeling answers the
first, and in doing so builds the surfaces on which Alignment answers the second."*

**NEW ladder figure (`model-ladder.svg`, promoted).** The §2.1 8 rungs with the §2.2 two-axis gradient. Keep
model-ladder's Umber-Monograph palette + 16-28pt font band; change grammar from all-green-diagonal to a
**vertical gradient column**. Bottom micro-labels = the capability verbs (select · externalize · relate ·
model · assert · derive · trace · gate). Authored so the you-are-here + case-marker overlays layer on without
redrawing rungs. **Retire the 6-rung version** — the book carries exactly one canonical ladder (old rungs fold
in: Documentation→2, Knowledge-graph→3, Structured/Behavior/Reasoning→4-5, Computable→6).

**Second-order note (rule #45):** three opening figures + the Part-6 matrix + the standalone ladder now all
assert the *same* spine. **Single-source the rung set** (§2.5 SSOT) and add a light doc-lint: every figure that
draws the ladder uses the 8 canonical rung labels (§6 [LINT]).

---

## §4. THE MBSE MODEL CHANGES (from C)

The **website** projects from `book-models/*_declared.json`; the **print book** is hand-authored markdown +
SVG whose chapter order the SSOT `chapter_identity_declared.json` also governs. Every connective-spine framing
that reaches the site reaches it through a **model edit, not a hand-patch** (book coverage ⊇ site framings).

### 4.1 The swap-via-label-surrogate-key FINDING (the single most important de-risker)

**The Part 2↔3 swap edits exactly ONE field:** the `filename` prefixes in `chapter_identity_declared.json`
(part3 modeling chapters → `part2/2.x`; part2 alignment chapters → `part3/3.x`). Every other model joins on the
**number-free `label`**, so:

| Join | Keyed on | On swap |
|---|---|---|
| `argument_spine.chapter_advances` | label | **No edit** (AS5 holds; labels stable) |
| landing `book_home` → chapter href | label via `chapter_identity.html_href` | Auto-updates |
| concept-card "In the book" href | `_book_home_href` → label | Auto-updates |
| `chapter_shape` advances/exemptions | joined from spine at derive time | Follows spine |

`number` and `title` are DERIVED from the filename prefix — the renumber auto-propagates. **Verify, don't edit.**

### 4.2 Per-model change table

| Model | Change |
|---|---|
| **`argument_spine_declared.json`** (central) | (a) Add typed `feeds` field to `SpineClaim`; set `modeling-thesis.feeds = ["alignment-thesis"]` + new derived invariant **AS10** (every `feeds` target resolves to a *later-ordered* spine id). (b) Revise 4 statements from "divide" → dependency: `modeling-thesis` (fold in context-engineering origin, ≤32-word WORD_CAP), `alignment-thesis` (make dependency explicit), `theses-treat-the-causes`→connective claim (the sharpest single edit), `govern-the-environment` (light). (c) Re-seed `reviewed_hash` for each edited statement (AS8 freshness); `regenerate`; `verify` AS1-AS10. Argument order modeling(7)→alignment(8) is already correct. **No "In other words" field in the spine** — that translation is the projector's/chapters' job. |
| **`chapter_identity_declared.json`** | The swap: `filename`-prefix renumber only (§4.1). Bijection check CI3 stays green. |
| **`landing-big-ideas.json`** | Revise `modeling-thesis`/`alignment-thesis` `claim`(≤26 words)+`more`; carry the "In other words" branch in `more` (CC6 pins `claim`+title, not `more`). Re-project `catalog.py:_landing_big_ideas`/`_thesis_cell` from **equal pair → causal sequence** with a labeled "creates surfaces for →" connector (projector + CSS; DATA still from the two records → stays a projection). CC6 **will redden** → re-author the two concept entries. |
| **`argues_claims_declared.json`** | Revise claim 4 (`reliability-from-environment`) to depend on claim 3: *"Explicit representations create surfaces for alignment. Once engineering intent is machine-readable, more of it becomes mechanically enforceable…"* Re-verify `lint_part_opener_traceability` leg (c). |
| **`industry_cases_declared.json`** | Add `capability_ladder_rung` per case → joins `capability_ladder.rungs[].id`; new **IC7** (rung resolves). Docker maps LOW despite strong Alignment (the visible proof the ladder orders representations). **Do NOT reorder `roster.sites`** (IC6; the §1.3 citation is fixed) — express the teaching progression as the DERIVED sort by rung. Keep the 12-rung `modeling_ceiling_ladder` as the fine empirical instrument. |
| **`theory_of_mage_declared.json`** | Add a third proposition — the **Representation–Alignment Proposition** (§1.7) — `formalized_by: H3-mechanized-assurance` (or a new sub-hypothesis); **bump the proposition-count guard in the same commit**; regenerate hypotheses table; TM1-TM7 green. `representation-quality` dimension + two-loop caption already carry the dependency — keep. |
| **`claims_declared.json`** | Revise `theses-divide-the-not-knowings` statement from "divide" → dependency (KEEP the id so the spine's `reconciles.claims` AS4 completeness holds — safer than rename). |
| **`chapter_shape_declared.json`** | Re-assess swapped chapters whose opening/closing prose changes (CS5 staleness); re-seed `opening_anchor`/`closing_anchor`. `thesis_target` enum values stay valid (name the thesis, not the part). **The backward "next Part" transitions are the concrete drift the swap forces** — e.g. `when-guardrails-collide` close "the next Part opens the zoo of them" is now BACKWARD; `the-executable-zoo` now opens Part 2; `the-agent-stack` now opens Part 3. This is the **ONE model edit that trails prose** (CS5 freezes final words → step after the 2c prose wave). |

### 4.3 Website projection surfaces (all model-projected, hand-authored prose only in the sanctioned projectors)

1. Landing two-thesis band (`_landing_big_ideas`/`_thesis_cell`) — pair→causal-sequence + labeled arrow.
2. `concept-modeling-thesis.md` / `concept-alignment-thesis.md` — re-author `more`/intuition to the progression
   + "In other words"; `claim`/title re-pinned by CC6; modeling entry optionally gains the ladder figure as
   `entry_figures[1]` (CC5 allows 1-3).
3. Theory page (`_theory_page`) — two co-equal sections → Modeling FEEDS Alignment (connector + ladder +
   Definition→In-other-words→Why cadence).
4. Big Question page (`_big_question_body`) — through-line re-projection; connective sentences hand-authored,
   step texts reused verbatim.
5. Industry case pages + `constructing-the-gee.html` / `industry-case-studies.html` — the 8-rung ladder becomes
   a rendered figure/table; the 12-rung matrix caption reinterpreted as "where each system places the
   representation/control frontier".

### 4.4 New BLOCKING checks (all AUDIT-ONLY-first per rule #55)

AS10 (feeds forward-resolves), IC7 (ladder-rung resolves), CL1-CL3 (ladder SSOT), the §6 phrase-lint, the §6
ladder-vocabulary lint, and the §6 shared-enum lint. Each lands audit-only, a fix-wave drains to 0, then a
follow-up promotes to BLOCKING.

### 4.5 Models-before-prose sequencing invariant

Models 1-9 (§5) land + go green BEFORE the prose/projectors that project from them (an entry re-authored
against an un-swapped model fails CC6 twice). Sole exception: `chapter_shape` anchors, which by CS5's design
freeze the FINAL prose and therefore trail the 2c prose wave.

---

## §5. THE PHASED PLAN (from D, with C's model edits folded in, model-first-within-phase)

Master sequence = D's 11 phases + the terminology sweep. **Within each phase, the matching `book-models/` edits
(§4) land and go green BEFORE the markdown/SVG/site prose that projects from them** (the C+D interleave, §7-R5).
Each phase: scope · Opus/Sonnet · depends-on · canary.

- **P0 — Lock definitions + relationship + "In other words" rule + 8-rung ladder vocab.** Single SSOT design
  file `book/_design/connective-theses-canon.md` every later phase quotes verbatim (this document §1-§2 IS its
  content). **Opus.** Depends: none. Canary: author + Phase-1b ratify (the §8 forks resolve here).
- **P1 — Redraw figures 0.1-1, 0.1-2, 0.4-2** (§3). **Opus** specs geometry, Sonnet may execute SVG. Depends:
  P0. Canary: figures render; captions quote canon.
- **P2 — Execute the swap (riskiest, isolated, content-NEUTRAL).** Model-first: `chapter_identity_declared.json`
  renumber (§4.1) → bijection green; then the print-book mechanics — two-phase `git mv` through a temp namespace
  (`part2/2.x`→`part_tmp/T2.x`; `part3/3.x`→`part2/2.x`; `part_tmp`→`part3/3.x`), flip `_PART_TITLES` in
  `build_book_html.py`, `git rm` stale root-slug HTML, and the **literal-"Part N" prose re-point audit** (~13
  files, part1×4/part2/part3/part4×2/part6/frontmatter×2 — re-point by MEANING, NOT sed; `{{part:N}}` is Part-5
  only; `[ref:<label>]` is swap-safe). **Opus** sequences + audits; Sonnet does `git mv` under an exact Opus
  move-list. Depends: P0, P1. **Canary = the behavior-preservation diff-audit:** rendered-text deltas are ONLY
  numbers/titles/order + the ~13 re-points; NO prose changed. This is what makes the reframe phases land on a
  known-good base.
- **P3 — Build the canonical Capability Ladder.** Model-first: land `capability_ladder_declared.json` +
  `capability_ladder_model.py` (CL1-CL3 audit-only-first) + regenerate projections; then the promoted
  `model-ladder.svg` (§3) + the canonical prose block staged in the P0 canon. **Opus.** Depends: P0 (parallel to
  P2 — different files). Canary: renders; 8 rung strings pinned to canon.
- **P4 — Preface + How-to-read + book-map.** Developmental argument replaces division-of-labor; Claim 4 depends
  on Claim 3 (`argues_claims` §4.2); `0.5-how-to-read` + `book-map.svg` flip to Part 2 = Modeling / Part 3 =
  Alignment. **Opus.** Depends: P0/P1/P2/P3. Canary: book-map reflects swap; no literal-"Part N" contradiction.
- **P5 — Reframe the Modeling Part (now Part 2) — internal ascent + NET-NEW galleries.** Re-open around
  context→knowledge→connected-system-knowledge→intent-bearing→executable→governed; knowledge-graph-as-context-
  engineering FIRST; pull the is/ought/gate passage forward as the conceptual heart; Kruchten 4+1 demoted to
  *views over the connected system*; embed the ladder (use #1). **This is the largest content investment**
  (bucket C, §5-gallery). **Opus** opener + is/ought + gallery ladder-mapping; **Sonnet** per-view reframes +
  gallery projection under an Opus outline. Depends: P2/P3/P0. Canary: galleries WE1-clean + ladder-mapped;
  "Model Zoo = 4+1" definition gone.
- **P6 — Reframe the Alignment Part (now Part 3) — interpretation > content.** Keep mechanism prose; change job
  framing (Alignment = the operation by which represented intent acquires authority); open with the three
  increasing cases (no-rep / some-rep / rich-model); "soft conditioning" at the low ladder end, "hard authority"
  consumes explicit obligations; seed §1.7 sentence; add "In other words" to thesis statements; MOVE + reframe
  the existing part2 galleries. **Opus** opener + three-cases; **Sonnet** interpretive touch-ups + caption
  reframes. Depends: P2/P3/P0; **parallel-safe with P5** (disjoint dirs). Canary: three-cases present; "In other
  words" on each thesis statement; moved galleries still clean.
- **P7 — Part 4: the two theses visibly alternate.** One recurring **daily MAGE loop** (need → what must the
  agent know → SELECT/BUILD REPRESENTATION → what must remain true → STATE OBLIGATION → how much mechanizable →
  CONSTRAIN·SENSE·VALIDATE·GATE → work/evidence → failure → enrich); brownfield = the **ladder-as-adoption-path**
  (start at the lowest rung that solves a real reasoning problem); embed the ladder (use #2). Galleries stay,
  re-anchor to the loop. **Opus** loop + brownfield; **Sonnet** trims. Depends: P2/P3/P5/P6. Canary: loop figure
  renders; brownfield reads as a climb.
- **P8 — Part 5 (DocAble): causal-ascent episodes.** Replace static "✓ Modeling ✓ Alignment" stamps with
  longitudinal "Modeling → Alignment: once X was represented, the environment could enforce Y" micro-callouts;
  widen governance-conversion to "richer representations OR mechanisms". **Opus** (reads the case for causal
  episodes). Depends: P0/P2; parallel to P5/P6/P7. Canary: static stamps replaced; callout marker present.
- **P9 — Part 6: promote discovery into synthesis + `theory_of_mage` proposition.** Model-first: add the
  Representation–Alignment Proposition (§4.2) + bump count guard. Then promote "Modeling feeds Alignment" into
  the explicit spine; reinterpret cases as "where each places the representation/control frontier"; keep the
  12-rung matrix as the fine instrument; fix Figure 6.1-9's too-narrow "keeps each model equal to code"
  shorthand. **Opus.** Depends: P0/P2 (sequence its cross-ref audit — 15 `[ref:]` in 6.1 — after P2's literal-
  "Part N" pass). Canary: Proposition stated exactly once; matrix retained; 15 refs resolve.
- **P10 — Appendices re-indexing** (§6). **Opus** A + B; **Sonnet** C/D/E metadata adds. Depends: P0/P3/P6.
  Canary: appendix reachability intact; representation-metadata fields present.
- **P11 — Terminology / cross-ref / caption sweep (LAST).** Apply the §1.4 phrase test + the §1.9 editorial
  test; glossary adds (§6); final literal-"Part N" reconciliation; "In other words" cadence coverage. **Opus**
  partitions findings; **Sonnet** executes mechanical fixes. Depends: ALL prior. Canary: whole-book grep for
  "Part 2 = Alignment"/"Part 3 = Modeling" empty; glossary complete.

### 5.1 Gallery reconciliation (avoid redoing landed work)

- **A — MOVE + reframe:** current Part-2 (Alignment) galleries (agent-stack/semantic-gap/governed-env/metrics/
  guardrails) travel into new `part3/`; rosters/projection survive; only FRAMING shifts (now downstream of
  Modeling — reference the established ladder + three-cases). Owner **P6**, Sonnet caption reframe. Cost: LOW.
- **B — STAY:** current Part-4 galleries (4.1/4.2/4.6 + trims) don't move; re-anchor to the daily loop +
  ladder-as-adoption. Owner **P7**. Cost: LOW.
- **C — NET-NEW:** new Part-2 (Modeling) had NO galleries (Part 3 was HELD for this refactor). Author
  ladder-first: the context→knowledge→model ascent, is/ought/gate spine, the ladder-mapped industry rotation
  (§2.4). Owner **P5**. Cost: HIGH — the largest content investment; reuse the `<!-- worked-examples: KEY -->`
  block mechanism so new galleries match house shape exactly.

### 5.2 Fan-out waves (single-live-writer submodule; parallelism via `book/_design/drafts/`)

- **Wave 0 (SEQUENTIAL, blocking):** P0 → {P1, P3 overlap} → **P2 ALONE on `main`** (the structural move needs a
  quiet tree for its diff-audit).
- **Wave 1 (PARALLEL DRAFTING → draft files):** after P2 lands, fan out reframe authoring as DRAFT writers with
  disjoint dirs — P5 (part2 + new galleries), P6 (part3), P8 (part5), P9 (part6); none commits `main`. P7 drafts
  but assembles after P5/P6.
- **Wave 2 (SEQUENTIAL ASSEMBLY):** one infrastructure writer drains drafts onto `main` one phase at a time,
  full gate between each (P5→P6→P7→P8/P9).
- **Wave 3 (SEQUENTIAL):** P10 → P11 (both whole-book, last, single-writer).

Maps onto the just-completed examples-pass pattern (wave0 infra → wave1 drafters → wave2 assemblers) — the
fleet has the muscle memory.

---

## §6. APPENDICES + GLOSSARY + HOUSE-STYLE (from E)

### 6.1 Appendix A–E re-index (re-index, do NOT rebuild)

- **A — Engineering Stacks (deepest change).** A1: place the canonical ladder near the front ("where the
  conceptual ladder meets implementation architecture"; cite the ONE figure). A2: add the **Stack → Minimum
  representation** table (Context delivery→externalized knowledge; Model-guided navigation→structured
  relationships; Model coherence→typed system model; Model-derived assurance→explicit invariants; Drift-governed
  modeling→traceability + parity) — map the 7 current stacks onto these rows. A3: one bridging sentence
  reconciling the *within-stack* "highest affordable rung" ladder (a single fact) and the *across-stacks*
  capability ladder (a whole stack) as the same ordering at two scales.
- **B — Flagship Mechanisms.** B1: advertise Models-bridge as *"the mechanisms where Modeling becomes Alignment"*;
  flag **Executable Source-of-Truth** as the canonical instance of "represented intent becomes authority". B2:
  add a **`Representation required:`** field per flagship entry — closed enum (§6.4).
- **C — Mechanism Catalog.** C1: add an **`Acts on:`** chip to the brick chip-line — same closed enum (§6.4);
  orthogonal to the existing four chips (how it governs) — this says *what representation it operates over*. C2:
  de-universalize the opening prose: *"Representations and governance mechanisms are related but analytically
  distinct… the Acts-on chip tells you which"* — the one place the appendices stop implying everything is a
  governance mechanism.
- **D — Operator's Reference.** D1: add a `representation-health.md` card mirroring `model-health.md`'s
  one-question/four-row shape — *"Is the representation strong enough for the work I'm asking the fleet to do?"*
  (Knowledge completeness / Model gaps / Traceability breaks / **Residual semantic judgment** = the ladder's
  operating signal: a check stuck on semantic judgment marks a rung not yet climbed).
- **E — How to Write a Skill.** E1: add the **Skill → structured-model → Mechanism** graduation ladder (a skill
  is a *low-rung representation optimized for context delivery*). E2: boxed house-rule — *"Do not force knowledge
  into a hard model merely because a model can be built… graduate only when recurrence, consequence, or
  decidability justifies the investment"* — composes with the existing "teetering tower" warning (E2 = when to
  climb; tower = when to stop).

### 6.2 Glossary (`book/frontmatter/0.3-the-books-language.md`, "The core ideas" group)

Add **Knowledge representation** (rewrite.md :1339), **System knowledge graph** (:1341), **Capability ladder**
(:1343 — adopts the §2.1 canonical rung names; states "orders capabilities, not organizations; higher is not
automatically better"). **Revise The Model Zoo** off "4+1 views over DocAble" → *"the collection of specialized
views projected from one connected engineering representation… one model seen from many angles, not five
documents to reconcile"* (keep Kruchten; move 4+1 down one conceptual level). The four archetype defs are
**untouched** (rewrite.md §14); representations are added *alongside* mechanisms, never in place of them.

### 6.3 The "In other words…" house-rule codified (`plugin/mage/skills/self-communicate/writing/voice.md`)

Lands as a new "lower-branch cadence" section (Definition → In other words → Why it matters), cross-referenced
from `rhetoric.md` + the submodule-root CLAUDE.md style list — one of MAGE's stylistic signatures. **Exempt it
explicitly from the "avoid LLM tells — vary, don't ban" rule:** its recurrence is the point (like field-note
asides), so it does not count against em-dash/tricolon sameness budgets. The translation must *redefine, not
restate* (the `rhetoric.md` correctio test) and gets terser as the book teaches its own language (voice.md
"progressive density"). Embed the four worked examples verbatim (rewrite.md :1437-1523).

### 6.4 The phrase-lint + the shared enum (the [LINT]s)

- **Relationship-phrase lint (E Part 4, [LINT] domain:controls).** The canonical phrase is a **declared constant
  in the book model** (one string, one SSOT). *Coverage side:* every paragraph that claims to explain the thesis
  relationship (co-occurrence of "Modeling"+"Alignment", or a declared list of relationship-claim anchors)
  compresses to §1.4 — checked by requiring the two verbs "explicit"/"binding" (or the sanctioned slogan)
  present. *Consistency side:* the canonical phrase is spelled the ONE frozen way everywhere ("makes it
  binding"); the slogans are allowed as separately registered strings. Projection check over the book IR, NOT a
  regex on HTML.
- **Ladder-vocabulary lint (B §5 second-order, [LINT] domain:controls).** Every figure/table that draws the
  ladder uses the 8 canonical labels (§2.1).
- **Shared-enum lint (E dependencies, [LINT] domain:controls).** B2 `Representation required:` and C1 `Acts on:`
  share **one closed enum declared once in the catalogue model** (RECONCILED, §7-R6): the 5 values map to ladder
  rungs — `none/raw artifact` · `knowledge` · `structured model` · `invariant-bearing model` ·
  `traceable model / model↔territory`. A flagship/brick missing it or off-vocabulary is a finding.

---

## §7. CROSS-FACET RECONCILIATION

**R1 — Relationship-phrase wording: "makes it binding" (A + E) vs "gives it authority" (B + D / rewrite.md
:1357).** The author's own spec uses BOTH (:1357 "gives it authority", :1447 "makes it binding").
**RESOLUTION: freeze "Modeling makes intent explicit; Alignment makes it binding" as the ONE canonical
relationship phrase** (A + E — the two facets whose job is to lock canon — both recommend it; the "In other
words" worked example is built on it; and the synthesis brief itself states it frozen). **"gives it authority"
is the sanctioned SLOGAN and the Alignment-thesis's own station verb** ("give engineering intent authority") —
kept everywhere it names the Alignment thesis, but NOT used as the canonical *relationship* compression. B's
and D's prose/one-liner-lint text that used "gives it authority" as the *relationship* phrase switch to
"makes it binding." *(Minor AUTHOR touch-point — see §8-F7, since it is the author's own two phrasings.)*

**R2 — Figure ownership.** No conflict once the layers separate: **Facet-B owns the SVG art** (0.1-1, 0.1-2,
0.4-2, the promoted ladder, book-map); **Facet-C owns the site/model projectors** (`catalog.py` projectors,
`entry_figures`, the ladder SSOT registration); **Facet-D owns the schedule** (P1 figures, P3 ladder, P4
book-map). `book-map.svg` redraw = B's art, scheduled in **P4** (its caption depends on the Preface/how-to-read
wording).

**R3 — Ladder rung LABELS: B's short forms vs C's JSON labels** ("System models" vs "Intent-bearing system
models"; "Explicit properties (invariants)" vs "Explicit invariants / properties"; "Traceability" vs
"Bidirectional traceability"). **RESOLUTION: §2.1's canonical labels win for prose, figures, AND the JSON
`label` field** (single source; figures need short labels). The fuller descriptive sense lives in the SSOT's
`capability_question` field. C's `capability_ladder_declared.json` sets `label` = the §2.1 strings exactly.

**R4 — The 12→8 join: B's illustrative §1 table vs C's `modeling_ceiling_map`.** They disagree on
`infra-as-code` (B→rung 3; C→rung 2). **RESOLUTION: C's `modeling_ceiling_map` is authoritative** (it is the
actual checked code artifact, total per CL2; `infra-as-code = externalized-knowledge` rung 2 is correct — IaC
is externalized knowledge, not typed relationships). B's table is illustrative; §2.5 carries the canonical map.

**R5 — Sequencing: C's "models-before-prose" vs D's phase spine.** Two projections (print book = D's markdown/
SVG; website = C's model-projected). **RESOLUTION: D's 11-phase spine is the master sequence; C's per-model
edits fold into the matching phase, model-first-within-phase** (§5). The swap (P2) = `chapter_identity`
renumber (C) + `git mv`/`_PART_TITLES` (D), model-first. The ladder (P3) = SSOT model (C) + SVG/prose (D),
model-first. `chapter_shape` anchors are the sole prose-trails-model exception (§4.5).

**R6 — The two closed enums (E's B2 `Representation required` 5-value vs C1 `Acts on` 5-value).**
**RESOLUTION: one shared enum, declared once in the catalogue model** (§6.4), 5 values aligned to ladder rungs;
B2 and C1 are two surfaces of it, joined by the shared vocabulary constant, enforced by the shared-enum lint.

**R7 — Content boundary (agent-stack / semantic-gap hinge).** Both A (§3.3 item 8) and C (§1.2) flag: when the
Alignment chapters move to new Part 3, does `models-and-the-semantic-gap` (model material) travel with them, or
does the `the-agent-stack` + `semantic-gap` pair stay behind as a Part-1→Part-2 hinge opening the Modeling
part? **This is genuine content-ordering judgment → AUTHOR (§8-F1).** The identity model just carries whatever
chapter list is ratified. **Synthesis recommendation:** keep `the-agent-stack` + `models-and-the-semantic-gap`
as the hinge that OPENS new Part 2 (Modeling) — semantic-gap is model material and naturally sets up "where
knowledge enters / where to check", giving the Modeling part its on-ramp; do NOT drag them to Part 3.

**R8 — Swap mechanism (D Fork A).** content-move+renumber vs renumber-only. **RESOLUTION (technical, reviewer-
decidable): content-move+renumber** (§5 P2) — keeps the dir==prefix==part invariant; renumber-only leaves
`part2/3.1-…` contradictions + breaks root-slug output names (a permanent agent-confusion tax). Not an author
call. (§8-F3.)

---

## §8. UNIFIED FORKS LIST (deduped across all 5 facets)

### AUTHOR forks (genuine content / naming / scope judgment — surface for ratification)

- **F1 — Content boundary: the agent-stack / semantic-gap hinge (A §3.3-8, C §1.2, §7-R7).** Do the
  `the-agent-stack` + `models-and-the-semantic-gap` chapters travel into new Part 3 (Alignment), or stay as a
  Part-1→Part-2 hinge opening the Modeling part? **Facets recommend: keep as the hinge opening new Part 2**
  (semantic-gap is model material). *Load-bearing: changes what the ratified chapter list is; A.1 — do not let a
  sub-agent silently answer it.*
- **F2 — Reframe-aggressiveness asymmetry (D Fork B).** Ratify **light Part 3 (Alignment): minimal-content /
  maximal-framing** (new opener + three-cases + "In other words" + caption reframes, keep mechanism prose) vs
  **heavy Part 2 (Modeling): genuine internal-ascent rewrite + net-new galleries (bucket C).** *Facets
  recommend the asymmetry as stated (rewrite.md :996 "changes interpretation more than content" for Alignment).*
- **F3 — "Model Zoo" rename (D Fork F).** Rewrite floats renaming Part 3 "From Context to Models" in-head
  (:413-423) but keeps the name. **Facets recommend: keep the term "Model Zoo", revise its glossary definition**
  off "4+1 views over DocAble" → "views projected from a connected representation" (§6.2); do NOT rename the
  part. *Naming judgment — author's call.*
- **F7 — Relationship-phrase canonical wording (§7-R1).** The author's spec uses both "gives it authority"
  (:1357) and "makes it binding" (:1447). **Synthesis froze "makes it binding"** (A+E+brief). Author confirm —
  it is the author's own two phrasings, low-stakes but worth a nod. *(Borderline; tagged AUTHOR because the words
  are the author's, but already effectively ratified by the synthesis brief.)*

### PHASE-1B / ORCHESTRATOR forks (technical, reviewer-decidable — recorded, resolved in this synthesis)

- **F3-tech — Swap mechanism** (§7-R8): **content-move+renumber** (RESOLVED).
- **F4 — Ladder-SSOT sequencing (D Fork C):** figure-first vs prose-first. **RESOLVED: P3 authors the SVG asset
  + a canonical prose block staged in the P0 canon**, so all three uses embed by reference and cannot drift.
- **F5 — Swap timing vs destabilization (D Fork D):** **RESOLVED: execute the swap** (author-approved :1423);
  P2's content-neutral diff-audit is the safety net. Only revisit if P2's canary cannot go green.
- **F6 — Appendix edit surface (D Fork E):** appendices are `.html` at book root — confirm whether they have
  markdown/IR sources (edit source) or are hand-authored HTML (edit direct). **RESOLUTION: a 2-minute verify
  before P10 dispatches** (avoid editing generated files).
- **F8 — Retire the 6-rung `model-ladder.svg` vs sit-beside (B §2/§5):** **RESOLVED: retire/promote to the
  8-rung canonical ladder** — the book carries exactly one canonical ladder.
- **F9 — Enum unification (§7-R6), rung labels (§7-R3), 12→8 map (§7-R4):** all RESOLVED as recorded.

---

## §9. DEFINITION OF DONE (whole refactor)

1. Book builds green: `catalog.py build` (orphan/reachability + content-integrity), `catalog_tests.py` full
   pass, `catalog.py validate` 0 issues, PDF renders + passes content-integrity.
2. New Part order live: **Part 2 = Modeling, Part 3 = Alignment** in dir + filename + `_PART_TITLES` +
   `chapter_identity_declared.json` + nav + book-map.
3. The three opening figures tell the causal story (labeled "creates surfaces for" arrow present; no
   two-sibling fork); `model-ladder.svg` is the 8-rung ladder; 6-rung version retired.
4. One canonical 8-rung Capability Ladder embedded 3× (explanatory / adoption / comparative) with IDENTICAL rung
   names; the "capability ladder, not a maturity model" warning present at first use; `capability_ladder`
   SSOT + CL1-CL3 green; the 8⊇12 map total (CL2).
5. Thesis definitions + relationship paragraph match §1 canon verbatim wherever stated; the frozen phrase
   "Modeling makes intent explicit; Alignment makes it binding" compresses every relationship claim (phrase-lint
   green); "gives it authority" appears only as slogan / Alignment-station verb.
6. "In other words…" translation follows every canonical theoretical statement (cadence-coverage check); the
   house-rule is codified in `voice.md` and exempted from the LLM-tell budget.
7. Every landed gallery survives (moved+reframed / re-anchored); new Part-2 galleries authored, WE1-clean,
   ladder-mapped, projecting from `industry_cases_model.py`.
8. NO surviving "Part 2 = Alignment / Part 3 = Modeling" prose or caption anywhere (whole-book grep empty); all
   `[ref:]` resolve; the ~13 literal-"Part N" refs re-pointed by meaning; P2 diff-audit clean (behavior-preserving).
9. `argument_spine` `modeling.feeds = ["alignment-thesis"]` edge + AS10 green; `argues_claims` claim-4 depends
   on claim-3; `theory_of_mage` Representation–Alignment Proposition stated exactly once + count guard bumped;
   `industry_cases` per-case ladder-rung + IC7 green; 12-rung matrix retained.
10. Glossary updated (Knowledge representation, System knowledge graph, Capability ladder; Model Zoo revised off
    "4+1 = zoo"); appendices re-indexed (A ladder + Stack→Min-rep table; B Models-bridge seam + Representation-
    required field; C Acts-on chip + de-universalized prose; D representation-health card; E graduation ladder +
    "don't force knowledge into a hard model" rule); the shared 5-value enum declared once + shared-enum lint.
11. Editorial-test pass: every major section answers one of {understand the world / make intent explicit / give
    authority / improve from failure}; sections that answer none are sharpened or cut.
12. All new BLOCKING checks (AS10, IC7, CL1-CL3, phrase-lint, ladder-vocab lint, shared-enum lint) landed
    AUDIT-ONLY-first, drained to 0, then promoted (rule #55).
13. **Final Opus DoD review** (trust-nothing: re-run every gate + pin-test + lint at HEAD; re-verify every
    figure/caption/ladder-string claim; scan for [DESIGN] follow-ups) + **Phase-1b independent 2nd-Opus review**
    of this P0 canon before any impl phase (rule #58; reviewer wins §8 conflicts).
```

