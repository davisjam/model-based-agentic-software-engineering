# DESIGN — the formal foundation for LTL and Büchi checking in v0.2 (261004)

**Status: design, no code.** Written against `f3a9991c` (the commit that landed
`DESIGN-v02-semantics-261004.md`, the normative v0.2 spec this document serves). A sibling wave owns
that spec, `SEMANTICS.md` and `PLAN.md`; findings against them are routed at the end rather than
edited in.

The commission: *"We are supporting LTL/Büchi in the new spec. I want a formal foundation so we
don't wing stuff bizarrely."* The reason the foundation must come first: everything else this
project ships fails loudly — a type error, a red test, a refusal that names itself. **A subtly wrong
LTL checker fails silently and authoritatively.** It answers `holds` for a property that does not
hold, and nothing downstream can tell. So this document's centre of gravity is two things:
definitions precise enough to check code against (§2–§5), and a validation strategy that could
actually catch us being wrong (§9).

**Three kinds of claim appear below, and each is marked.** **[textbook]** — standard computer
science, checkable against the cited literature. **[choice]** — a v0.2 design decision, with its
justification. **[measured]** — a fact established by running the shipped engine; the probes are
throwaway and not committed, per house rule. Every claim about this codebase carries a `file:line`
verified at `f3a9991c`; the symbols are named too, because line citations in this repo drifted nine
lines inside one day (`DESIGN-expressiveness-261004.md:3-9`) — grep the symbol, not the number.

---

## 1. What already exists, and the one-sentence thesis

This foundation extends shipped machinery; it does not start over.

- **The trace domain is already formal.** `SEMANTICS.md` §6 (`:753-768`): a **configuration** is
  `(control, values)` over finite domains; a **step** is a local transition with guards satisfied,
  or an event step where every participant moves atomically; the **reachable set** is the least set
  closed under steps. And flatly: *"There is no fairness, no priority, and no notion of time"*
  (`SEMANTICS.md:767`).
- **The lasso evidence shape ships.** `Evidence` carries `shape: "lasso"` with `steps` (the prefix)
  plus `cycle` (`src/ir/types.ts:651-659`, the `cycle` field at `:656`); `behavior.ts` builds it
  (`lasso`, `src/engine/behavior.ts:64-65`). `repeatable-cycle` already finds a **genuinely repeated
  configuration** via `cycleThrough` (`src/engine/behavior.ts:367-379`,
  `src/engine/explore.ts:572-580`).
- **Six behavior forms ship** — `reach`, `invariant`, `recurrence`, `repeatable-cycle`, `deadend`,
  `transition-live` — each with exactly one denotation (`SEMANTICS.md` §7.2a, `:847-867`), each with
  a plain-language interpretation (V21, `behavior.ts:430-454`).
- **The scale is tiny and measured.** 18–39 reachable configurations on the shipped examples, ~54,000
  configurations/second single-threaded in the Worker (`DESIGN-expressiveness-261004.md` §3,
  `:154-164`); the largest self-model, the lifecycle model, pins **70** configurations exactly
  (`test/lifecycle-model.test.ts:109`) **[measured]**.

**The thesis, so nobody treats LTL as a new engine:** Büchi emptiness is the search the engine
already performs, with acceptance labels. `repeatable-cycle` is non-emptiness of the model read as a
Büchi automaton whose single acceptance set is the target predicate
(`DESIGN-expressiveness-261004.md` §4, `:188-194`) **[textbook]**. Full LTL adds: a formula
automaton, the product, generalized acceptance, and stutter-closure at dead ends. §7 names each
addition precisely. Nothing here needs SMT — finite-state LTL checking is graph search
**[textbook]** — so `PLAN.md` §1a.2 (`:320-328`, the verified z3/SharedArrayBuffer/Pages blocker)
is not an obstacle and must not be re-opened on this path.

---

## 2. Syntax

### 2.1 Grammar **[choice, fixed by the spec]**

The operator set is fixed by `DESIGN-v02-semantics-261004.md` §8 (`:326-334`) and is deliberately
minimal:

```
φ ::= a                    atomic proposition (§2.2)
    | not φ                ¬φ
    | φ and φ              φ ∧ φ
    | φ or φ               φ ∨ φ
    | φ implies φ          φ → φ        (sugar: φ → ψ ≡ ¬φ ∨ ψ)
    | next φ               X φ
    | eventually φ         F φ          (sugar: F φ ≡ true U φ)
    | always φ             G φ          (sugar: G φ ≡ ¬F ¬φ)
    | φ until φ            φ U ψ        (STRONG until — §3.2)
```

`true` and `false` are the empty conjunction and its negation. The student spelling on the left is
the only user surface; the symbolic column is for this document and the literature. Precedence, so a
parser and a reviewer agree: unary (`not`, `next`, `eventually`, `always`) binds tightest, then
`until` (right-associative), then `and`, `or`, `implies` (right-associative, weakest). Parenthesize
anything a reader would have to think about.

### 2.2 Atomic propositions **[choice]**

The spec's transition-system definition posits `L : S → 2^AP` (`DESIGN-v02-semantics-261004.md`
§6, `:266`). For our models, the answer to "what does AP range over — state membership? variable
predicates? both?" is **both, because one grammar already denotes both**: an atomic proposition is
exactly a shipped configuration predicate — an `Atom` (`ref`, `op`, `value`;
`src/engine/types.ts:220-224`) or a combinator over them (`not` / `all-of` / `any-of`,
`Predicate`, `:226-230`) — compiled by `compilePredicate` (`src/engine/predicate.ts:15-40`) and
evaluated per configuration.

So `L` is not a labeling table; it is evaluation: `a ∈ L(c)` iff the compiled predicate for `a`
returns true on configuration `c`. Three consequences, each deliberate:

1. **One denotation for predicates everywhere.** `transaction.state: based` means the same thing in
   `reach`, in `invariant`, and inside an LTL formula, because it is the same compiled function.
   Two predicate evaluators would be a §7.2a violation waiting to happen.
2. **The admission story is inherited.** A reference that resolves to nothing refuses as
   `unlicensed` before any trace is examined — `compilePredicate`'s whole design ("a typo must
   produce the second", `predicate.ts:1-7`) — never a silent `false` folded into a verdict.
3. **AP is closed under Boolean structure already**, so the LTL layer never needs to reach inside an
   atom. `always (proposed implies eventually (committed or refused))` has `proposed` and
   `committed or refused` as its atoms if written with predicate combinators, or as three atoms
   under LTL connectives — the two parses denote the same property, and the parser may normalize
   freely.

### 2.3 What a property is **[fixed by the spec]**

Per §9 of the spec (`:385-392`): a machine (for us: the composed system) denotes a set of traces;
a behavioral property **holds** iff every trace satisfies it, and is **refuted** iff some trace
does not, with that trace returned as the counterexample. LTL properties are therefore
**universally quantified over traces**, and the LTL query form's natural quantifier is `forall` —
the same slot `invariant` occupies in `NATURAL_QUANTIFIER` (`behavior.ts:52-59`). A declared
`exists` is refused with the dual named ("ask `forall` of `not φ`"), exactly as a quantifier
mismatch is refused today (`behavior.ts:123-133`) rather than reinterpreted **[choice]** — the
existential uses are already served by the six shipped forms, and giving one form two quantified
denotations is what §7.2a forbids.

---

## 3. Satisfaction, written out

### 3.1 The relation **[textbook]**

Let π = c₀ c₁ c₂ … be an **infinite** sequence of configurations (§4 says where these come from),
and write π[i..] for the suffix cᵢ cᵢ₊₁ …. Positions index from 0. Define π, i ⊨ φ by induction on
φ:

| φ | π, i ⊨ φ iff |
|---|---|
| a (atomic) | the compiled predicate for a is true on cᵢ |
| ¬φ | not (π, i ⊨ φ) |
| φ ∧ ψ | π, i ⊨ φ and π, i ⊨ ψ |
| φ ∨ ψ | π, i ⊨ φ or π, i ⊨ ψ |
| φ → ψ | π, i ⊨ φ implies π, i ⊨ ψ |
| X φ | π, i+1 ⊨ φ |
| φ U ψ | ∃ k ≥ i : π, k ⊨ ψ and ∀ j with i ≤ j < k : π, j ⊨ φ |
| F φ | ∃ k ≥ i : π, k ⊨ φ |
| G φ | ∀ k ≥ i : π, k ⊨ φ |

π ⊨ φ means π, 0 ⊨ φ. This is the standard relation of Baier & Katoen, *Principles of Model
Checking* (MIT Press, 2008), §5.1.1, and of Clarke, Grumberg & Peled, *Model Checking* (MIT Press,
1999), ch. 3; an implementer checks code against this table, and a reviewer checks this table
against those books.

### 3.2 The two rulings implementations most often get wrong

**`until` is STRONG** **[choice, following the literature's default]**. `P until Q` requires Q to
actually occur: the ∃k in the table is not optional. The spec's gloss "P until Q occurs"
(`DESIGN-v02-semantics-261004.md:333`) reads naturally as strong, and every cited text makes U
strong by default; weak until (hold P forever, or until Q) is definable as
`(P until Q) or always P` and is **not** a v0.2 surface operator. The one-denotation rule is the
reason to pick the literature's default rather than something friendlier: a reader who knows LTL
must not have to ask which dialect this is. §9.4's fixture list includes a machine on which the two
readings differ, so the ruling is pinned by a test, not only by this sentence.

**`next` indexes the immediate successor, including into stuttering.** π, i ⊨ X φ iff π, i+1 ⊨ φ —
there is no off-by-one freedom, and at a stuttering position (§4) the successor is the same
configuration, so `X φ ⟺ φ` there. X is the one operator that distinguishes stuttering from
progress; §9.4 pins it on a two-state fixture.

### 3.3 Identities the implementation must satisfy **[textbook]**

These are theorems of the relation above, restated here because §9.3 turns them into property
tests: `¬F φ ≡ G ¬φ`; `¬G φ ≡ F ¬φ`; `F F φ ≡ F φ`; `G G φ ≡ G φ`; `φ U ψ → F ψ`;
`¬(φ U ψ) ≡ (¬ψ) U (¬φ ∧ ¬ψ) ∨ G ¬ψ`; `X (φ ∧ ψ) ≡ X φ ∧ X ψ`; `F (φ ∨ ψ) ≡ F φ ∨ F ψ`. A
checker that violates any of them is wrong with no oracle needed.

---

## 4. The trace domain: finite executions, and §10's ruling made precise

### 4.1 The ruling **[fixed by the spec]**, formalized **[choice]**

LTL's traces are infinite; our machines may halt. `DESIGN-v02-semantics-261004.md` §10 rules:
**"Terminal states stutter forever"** (`:433`), giving every execution an infinite trace under
ordinary LTL semantics, and forbids inventing three-valued finite-trace LTL (`:443`).

Formalized against `SEMANTICS.md` §6's vocabulary: a configuration with no enabled step is a
**dead end** (`SEMANTICS.md:767-768`). Define the **stutter-closed step relation**

> T' = T ∪ { (c, τ, c) : c is a dead end }

where τ is a reserved internal stutter label, and define

> **Traces(M)** = the set of infinite sequences c₀ c₁ c₂ … with c₀ the initial configuration and
> every (cᵢ, cᵢ₊₁) a step of T'.

Two facts follow and both matter:

1. **Every maximal execution yields exactly one infinite trace.** A finite execution ending at a
   dead end extends uniquely by stuttering; an execution at a non-dead-end configuration MUST take
   some enabled step — **a non-terminal configuration cannot stutter**. "Terminal" in §10's ruling
   means *dead end* in §6's sense, nothing weaker. This sentence is load-bearing for §5.
2. **Every reachable configuration lies on some trace** (extend any witnessing execution to a
   maximal one). This is the lemma behind the `G φ ≡ invariant φ` oracle in §9.1.

Consequences of stuttering, spelled out as the spec asks: at a terminal configuration c, the trace
is …c c c…, so `always φ` from c onward requires exactly φ(c); `eventually ψ` evaluated after
reaching c is satisfied iff ψ(c); and `X φ ⟺ φ` at c. A property like
`G(request → F response)` is therefore refuted by a trace that *halts* in a request state just as
surely as by one that cycles away from the response — the counterexample's cycle is the stutter
self-loop, and the UI should render it as "…and the system halts here."

### 4.2 Why three-valued finite-trace LTL stays forbidden **[textbook rationale]**

LTL₃ and the finite-trace logics (RV-LTL, LTLf) are *different logics with different satisfaction
relations* — LTLf changes the meaning of X and U at the trace end; LTL₃ changes the co-domain of
⊨ itself. Adopting one silently would make every verdict incomparable with the literature this
document cites, and would smuggle in exactly the Kleene logic §26 of the spec warns against
(`:979-993`). The workbench's third and fourth outcomes (`inconclusive`, `unlicensed`) are
**evaluation outcomes, not truth values**: for an admitted proposition, π ⊨ φ is classical. The
stuttering ruling keeps it classical by keeping every trace infinite.

### 4.3 Where the stutter-closure lives — and where it must NOT leak **[choice]**

The stutter self-loop belongs to the **LTL product layer only** (§7). It must not be added to the
shared `exploreSpace` graph, because two shipped denotations would silently flip:

- `deadend` asks for a reachable configuration with no enabled step (`behavior.ts:247-254`); under
  stutter-closure no configuration has no enabled step, and the form answers `refuted` forever.
- `repeatable-cycle` asks for a genuinely repeatable configuration (`behavior.ts:356-379`); a
  stutter loop would make every dead end "repeatable", conflating halting with looping — precisely
  the §7.2a class of defect ("a query denotes a question, not a search strategy",
  `SEMANTICS.md:847-867`).

So: one trace domain (stutter-closed) for LTL satisfaction, one graph (un-closed) for the six
configuration-space forms, and the bridge equations of §9.1 state the exact relationship. An
implementation that shares a successor function must parameterize the closure, and §9.4's fixtures
include a dead-end machine checked through both layers to pin the boundary.

---

## 5. No fairness, what it costs, and P5's actual verdict

### 5.1 The semantics admits every execution **[fixed by the spec]**

`DESIGN-v02-semantics-261004.md` §11 (`:447-465`): all transition-system executions are admitted,
no implicit fairness, counterexamples expose starvation. `SEMANTICS.md` agrees twice ("no
scheduler, no fairness, no priority", `:222`; `:767`), and `PLAN.md`'s must-not keeps fairness out
while liveness came in (`PLAN.md:381-391`).

The consequence, stated sharply because it will surprise a student and should be taught rather than
hidden: a response property `G(request → F response)` **can be refuted by a trace that postpones an
enabled transition forever**. The refusing transition is enabled at every step of the
counterexample; the trace simply never takes it. Under no-fairness semantics that trace is as real
as any other **[textbook]**. `DESIGN-expressiveness-261004.md` §4 (`:209-218`) measured the same
point from the cost side: without fairness declarations, the engine could only ever *refute*
response properties in all but degenerate models. v0.2 accepts that openly — the counterexample is
the lesson.

### 5.2 P5, worked out on the actual machine **[measured]**

§30 of the spec requires the acceptance suite to express P5 — *"every proposed transaction
eventually commits or refuses"* (`:1110`) — and the spec's header flags its verdict as an open
tension (`:22-27`). Resolved here with the semantics, not an opinion.

**The machine.** The acceptance machine is the fourth self-model,
`models/workbench-lifecycle.mage.yaml` (§30: "build it", `:1100`; the model landed at
`0aaae241`): four composed machines, 70 reachable configurations
(`test/lifecycle-model.test.ts:109`), no dead ends (`lifecycle-has-no-dead-end`,
`workbench-lifecycle.mage.yaml:882-891`). In its vocabulary, P5's "proposed" is
`transaction.state: based` (base captured, verdict not in) and the formula is

> φ_P5 = G( based → F( committed ∨ refused ) )

**The verdict: REFUTED, by a genuine cycle, not a stuttering artifact.** Measured by running the
shipped engine (throwaway probe, not committed): the query `repeatable-cycle` with
`target: transaction.state = based` and `avoid: {committed, refused}` — which is exactly a search
for an execution that reaches `based` and then loops forever never deciding — answers **`holds`**,
with exhaustive coverage over the avoid-restricted region (26 configurations) and this lasso:

- **prefix:** `capture_base` (idle → based, base = auth_0);
- **cycle:** `concurrent_commit_auth_0` ; `concurrent_commit_auth_1` — two steps returning to the
  *identical* configuration.

That lasso satisfies `F(based ∧ G ¬(committed ∨ refused))`, i.e. ¬φ_P5, so φ_P5 is refuted. (The
avoid-restricted query is strictly stronger than ¬φ_P5 — it forbids committed/refused on the prefix
too — so its witness is a fortiori a P5 counterexample.) The counterexample is honest about the
product being modelled: the agent's transaction sits holding its base while the second author
commits forever. `refuse` is enabled, unguarded, at every configuration of the cycle
(`workbench-lifecycle.mage.yaml:439-442`); the trace never takes it. That is §11's starvation shape
exactly — and it is also *faithful*: nothing in the implementation forces an agent that captured a
base to ever call `transact`, and nothing stops other parties committing meanwhile.

**Ruling: `refuted` is the intended teaching outcome, not a modelling error** **[choice]**. The
acceptance suite should pin `P5: expect: refuted` with the starvation lasso as the headline §27
animation. Three reasons. First, it is the true verdict under the normative semantics on the
normative machine; "fixing" the model to make P5 hold would mean modelling a fairness guarantee the
product does not have. Second, the spec's own header already leans this way ("a starvation
counterexample a student can see is a stronger lesson than a property that quietly holds", `:25-27`).
Third, the refutation is exactly what makes §11's cost *visible* in the flagship example instead of
latent in a footnote.

### 5.3 A correction to §27's worked counterexample **[measured, routed to the sibling wave]**

§27 draws the P5-class counterexample as `idle → proposed → valid → valid → valid → …`
(`DESIGN-v02-semantics-261004.md:1013-1020`), and the header repeats it (`:24-25`). On the single
machine §6 of the spec sketches (`:281-290`), **that is not a trace**: `valid` has an enabled
transition (`commit`), so it is not a dead end and cannot stutter (§4.1, fact 1), and it has no
self-loop. On that sketch the unique maximal trace is `idle → proposed → valid → committed^ω`, so
P5 *holds* there — and `refused` is unreachable (the sketch declares the state but no transition
into it), so P2 ("refused is reachable", `:1107`) would be *refuted*. Neither is a defect in the
semantics; both say the sketch is an illustration, not the acceptance machine. The real
counterexample needs a second mutator to carry the cycle (or a genuine self-loop), which is
precisely what the lifecycle model's `second_author` machine exists to provide
(`workbench-lifecycle.mage.yaml:672-708`). The §27 drawing should be amended to the measured lasso
of §5.2 — a one-figure [FIX] owned by the sibling wave that owns the spec.

---

## 6. LTL → Büchi: the construction, named and cited

### 6.1 The choice **[choice]**

**Compile ¬φ to a generalized Büchi automaton by the tableau construction of Gerth, Peled, Vardi &
Wolper** — R. Gerth, D. Peled, M. Y. Vardi, P. Wolper, *"Simple on-the-fly automatic verification
of linear temporal logic"*, PSTV 1995 (the "GPVW" paper) — with the automata-theoretic framing of
M. Y. Vardi & P. Wolper, *"An automata-theoretic approach to automatic program verification"*,
LICS 1986, as the correctness frame. Textbook treatments to review against: Baier & Katoen §5.2
(the closure/GNBA construction and its correctness theorem) and Clarke–Grumberg–Peled ch. 9 (the
GPVW algorithm itself, with pseudocode).

The construction in one paragraph **[textbook]**: rewrite ¬φ to negation normal form (negations
pushed to atoms, using the U-duality of §3.3 and the release operator R internally); tableau nodes
are sets of subformulas obliged on the current suffix; a node expands by the expansion laws
`φ U ψ ≡ ψ ∨ (φ ∧ X(φ U ψ))` and `φ R ψ ≡ ψ ∧ (φ ∨ X(φ R ψ))` until only atoms and X-obligations
remain; X-obligations become the successor node. Acceptance: one set F_i per Until subformula
φᵢ U ψᵢ, containing the nodes where the until is discharged (ψᵢ obliged or the until not obliged) —
this is what stops a run promising `F ψ` forever without delivering. The result is a **generalized**
Büchi automaton (GNBA): a run accepts iff it visits every F_i infinitely often.

### 6.2 Why this one, against our constraints **[choice]**

- **Auditable against published pseudocode.** GPVW's own figures and CGP ch. 9 give an
  implementable algorithm a reviewer can diff the code against line by line. That is the brief's
  governing requirement: checked against a published algorithm, not against our intentions. The
  closure construction (Baier–Katoen §5.2) supplies the correctness proof for the same object.
- **Right-sized for tiny formulas.** Worst case the automaton is exponential in |φ| **[textbook]**,
  but the acceptance-suite formulas have 2–5 automaton states (GPVW generates only reachable
  tableau nodes), and the measured model scale is 18–70 configurations. The product stays in the
  hundreds. The practical constructions that exist to beat GPVW on automaton size — Gastin & Oddoux,
  *"Fast LTL to Büchi automata translation"*, CAV 2001 (LTL2BA, via very weak alternating
  automata); Spot's post-processing pipelines — buy minimality we cannot feel at this scale, at the
  price of machinery (alternating automata, simulation reductions) a student cannot read and a
  reviewer cannot cheaply audit. Wrong trade for this project.
- **Ships in a browser bundle.** The construction is a few hundred lines over the existing IR with
  zero dependencies, runs in the Worker beside the explorer
  (`src/worker/analysis.worker.ts:1-19`), and needs no SMT (§1).
- **No degeneralization pass.** We keep the GNBA's multiple acceptance sets and let the emptiness
  check handle them directly (§7.2), skipping the counter construction entirely — one less
  transformation to verify. (The counter construction, Baier–Katoen §4.3.4, remains the fallback if
  an implementation prefers plain Büchi; it is standard, but it is also a second place to be
  subtly wrong.)

**Complexity, honestly** **[textbook]**: LTL model checking is PSPACE-complete (Sistla & Clarke,
*"The complexity of propositional linear temporal logics"*, JACM 1985); the automaton is
2^O(|φ|) in the worst case; emptiness is linear in the product. At our measured scale
(≤ 70 configurations × ≤ ~10 automaton states, against a 100,000-state ceiling and
54k configurations/second) every acceptance-suite check is sub-millisecond-to-milliseconds in the
Worker — the budget is not the constraint, and saying so stops anyone optimizing prematurely.

### 6.3 The student never sees any of this **[fixed by the spec]**

§9 is explicit: *"Büchi automata are implementation machinery, not a Workbench model form"*
(`DESIGN-v02-semantics-261004.md:413-419`). This document holds that line: the user surface is the
friendly formula, the verdict, and the animated trace/lasso counterexample (§27). Automaton states,
product states, acceptance sets and SCCs appear in no UI, no result payload beyond diagnostics, and
no Learn page. The result's `compilation` notes (`src/ir/types.ts:674-677`) may disclose "compiled
to a 4-state automaton; product of 212 states" the way V23 disclosures work — a sentence of
provenance, not a lesson in ω-automata.

---

## 7. The product, emptiness, and counterexample extraction

### 7.1 The product **[textbook]**

Read the model as a Büchi automaton A_M over the stutter-closed step relation T' (§4.1): states are
configurations, initial state the initial configuration, every state accepting, and the "letter" at
a state is its AP valuation (evaluated by `compilePredicate`, §2.2). Build A_¬φ by §6. The product
A_M ⊗ A_¬φ has states (c, q), stepping to (c′, q′) when c →_{T'} c′ and q has a transition whose
label-constraints are satisfied by c's valuation. Then, by Vardi–Wolper:

> φ holds of M ⟺ L(A_M ⊗ A_¬φ) = ∅.

A nonempty intersection yields an accepting lasso; its projection onto the first component (drop
the automaton state) is an infinite execution of M violating φ — the counterexample §9 of the spec
requires.

### 7.2 Emptiness: SCC-based, not nested DFS **[choice]**

The two standard algorithms **[textbook]**: **nested DFS** (Courcoubetis, Vardi, Wolper,
Yannakakis, *"Memory-efficient algorithms for the verification of temporal properties"*, FMSD 1992;
Holzmann's Spin) — on-the-fly, memory-light, but awkward with generalized acceptance (it wants
plain Büchi, hence degeneralization); and **SCC-based** (Tarjan's algorithm; Couvreur,
*"On-the-fly verification of linear temporal logic"*, FM 1999) — compute strongly connected
components, accept iff some reachable nontrivial SCC intersects **every** acceptance set F_i.

**Recommendation: Tarjan SCCs over the materialized product.** Three reasons, each local to this
codebase:

1. **It matches the house search shape.** The shipped explorer materializes the whole reachable
   graph and derives witnesses post hoc by BFS over it (`exploreSpace`,
   `src/engine/explore.ts:402`; `pathBetween`, `:541`; `cycleThrough`, `:572`). Nested DFS's
   virtues — never materializing the space — purchase nothing when the space is 70 configurations
   and already materialized; its cost is a second, subtler search discipline to audit.
2. **Generalized acceptance comes free.** "Nontrivial SCC intersecting every F_i" handles the GNBA
   directly; no degeneralization, no counter automaton (§6.2).
3. **Tarjan is student-auditable textbook material** with a one-page proof, unlike the nested-DFS
   invariant, whose subtlety has produced published errata **[textbook]**.

### 7.3 Counterexample extraction **[choice, shape fixed by the IR]**

From an accepting SCC: take the shortest path from the initial product state to some state s in
the SCC (the **prefix**), then a cycle within the SCC from s through at least one state of each
F_i and back (the **cycle**), built by chaining `pathBetween`-style BFS segments inside the SCC.
Project both onto configurations. The result is exactly the shipped `lasso` evidence —
`steps` + `cycle` (`src/ir/types.ts:651-659`, `behavior.ts:64-65`) — so the UI that animates
`repeatable-cycle` witnesses today animates LTL counterexamples with **zero new evidence
machinery**, which is what §27 wants (`DESIGN-v02-semantics-261004.md:997-1024`). When the cycle is
the stutter self-loop at a dead end, the renderer should say "halts here" rather than draw a loop
(§4.1). Minimality of the counterexample is a non-goal; shortest-within-SCC segments are enough,
and the honest statement is "a counterexample", not "the smallest".

### 7.4 Exactly what must be added, and nothing else

The delta against shipped machinery, enumerated so the implementation phase has a checklist and a
reviewer has a boundary:

1. **A formula type + parser** for the §2.1 surface, admitted like every query: parse → resolve
   atoms against the system vocabulary (refusing unknowns as `unlicensed`, §2.2) → normalize.
2. **NNF rewrite + GPVW tableau → GNBA** (§6), with R internal-only.
3. **A product walk** over (configuration, automaton-node) pairs — the existing BFS skeleton
   parameterized by a successor function, honouring `DEFAULT_STATE_LIMIT`
   (`src/engine/explore.ts:39`) counted in **product** states.
4. **Stutter-closure at dead ends, inside the product successor only** (§4.3).
5. **Tarjan SCC + generalized acceptance test** (§7.2).
6. **Counterexample assembly and projection** (§7.3).
7. **Verdict mapping** onto the four-valued `Outcome` + `Coverage` (§8), plus `compilation`
   disclosures (automaton size, product size, stutter-closure applied).

Explicitly **not** added: any change to `exploreSpace`'s graph (§4.3), any new evidence shape, any
new outcome (§8), any fairness surface (§5), degeneralization (§6.2), SMT (§1).

---

## 8. Verdicts: the shipped vocabulary, nothing else

LTL verdicts use the shipped four-valued `Outcome` — `holds | refuted | inconclusive | unlicensed`
(`src/ir/types.ts:666`) — and the shipped `Coverage` (`:668-673`). The mapping, which is V22
(`SEMANTICS.md:815-831`) applied to the product:

| Situation | Outcome | Coverage |
|---|---|---|
| Accepting lasso found | `refuted`, lasso as `counterexample` | any — settling evidence is sound at any coverage |
| No accepting SCC, product fully explored | `holds` | `exhaustive` (product states) |
| Product walk truncated, no lasso found | `inconclusive` | `bounded`, `reason: "state-limit"` |
| Unknown atom, unsupported construct, `exists` quantifier | `unlicensed`, with the §7.6-style cause | `not-applicable` |

Two notes. The `refuted`-at-any-coverage row is the same asymmetry `behavior.ts` implements
(`settled`/`unsettled`, `:277-311`): a found cycle cannot be unfound by more search. And
`statesExplored` on an LTL result counts **product** states, which is the truth about the walk —
the disclosure should say so, since the number will exceed the model's configuration count and a
reader comparing it to `repeatable-cycle`'s number deserves the explanation. The `Coverage.reason`
enum already carries `"time-limit" | "depth-limit"` arms (`src/ir/types.ts:672`); the explorer
emits only `"state-limit"` today (`src/engine/explore.ts:479`), and the LTL walk should do the
same until a real time budget exists.

**`exhausted` is not an outcome and must not become one.** It is the SPARQL evaluator's word for
its own step budget (`src/sparql/eval.ts:71`), on the surface §29 demotes to diagnostic. The
spec's §17 lists it beside the outcomes (`DESIGN-v02-semantics-261004.md:684`); the spec's own
header already flags that as a category slip (`:18-21`), and `PLAN.md`'s must-not bans the fifth
outcome (`:381-391`). This document's position: the §17 list should drop `exhausted`; a bounded
LTL search is `inconclusive` with `bounded` coverage, full stop. Routed to the sibling wave with
the §5.3 item.

---

## 9. Validation: how we would discover the checker is wrong

This section earns the document. The failure mode under design is *silent authoritative
wrongness*, so each layer below is ranked by what it would actually catch, and the section ends
with the gate: what must be green before any LTL verdict reaches a user.

### 9.1 Agreement with the six shipped forms — the strongest oracle, because it is internal and already trusted

The six behavior forms are independently implemented, independently tested — including mutation
tests that flip each verdict (`test/lifecycle-model.test.ts`) — and governed by §7.2a's
one-denotation rule, so **where LTL and a shipped form answer the same question, disagreement is a
defect in one of them, by fiat.** The bridge equations, each a small lemma over §3–§4 (sketches
inline; the §4.1 lemma "every reachable configuration lies on a trace" carries most of them):

| Shipped form | LTL bridge | Why it holds |
|---|---|---|
| `invariant p` | ≡ LTL `G p` | every reachable config is on a trace; every trace config is reachable |
| `reach p` holds | ⟺ LTL `G ¬p` refuted — and the counterexample's prefix is a `reach` witness | ∃ trace reaching p ⟺ ¬∀ traces avoiding p |
| `deadend` holds at config d | ⟹ any LTL `F G a` with a true exactly at d is… | …satisfiable on the stuttering trace: the one place the closed and un-closed domains differ, asserted POSITIVELY to pin §4.3's boundary |
| `repeatable-cycle t` holds | ⟹ LTL `F G ¬t` refuted | the lasso through t visits t infinitely often |
| LTL `F G ¬t` refuted | ⟺ `repeatable-cycle t` holds ∨ some reachable dead end satisfies t | GF t on a stutter-closed trace needs a real cycle through t or a halt at t |
| `transition-live` | no LTL bridge — transitions are not AP (§2.2 ranges over configurations) | excluded deliberately; a step-labeled AP is a v0.3 question, not a gap |
| `recurrence` | no bridge asserted — re-entry is reachability-class, not ω (`SEMANTICS.md:847-867`) | asserting one would re-conflate what §7.2a separates |

**The harness: every saved behavioral query in every shipped model and example** (the lifecycle
model's nine, `workbench-lifecycle.mage.yaml:730-892`; the examples' expected-results files) **is
re-expressed through its bridge and both verdicts asserted equal, on every node run.** What this
catches: trace-domain mistakes, stutter-closure leaks, polarity and quantifier inversions, product
construction errors that change which executions exist — the exact class of silent authoritative
wrongness, caught by a second implementation that was *not* written as part of the LTL work. §5.2
is this oracle run by hand once: the `repeatable-cycle`+`avoid` query and φ_P5 must agree forever.

### 9.2 The negation self-check — the empirical Kleene detector

For every closed formula checked on any model (fixtures and property tests alike), check ¬φ too,
and assert the two implications the classical semantics forces: **φ `holds` ⟹ ¬φ `refuted`**, and
**φ and ¬φ never both `holds`**. (Both-`refuted` is legitimate — one trace violates φ, another
violates ¬φ — so it is not asserted against.) This is §26's "do not build Kleene logic in
accidentally" made mechanical: an implementation that quietly treats an undefined case as false on
both sides fails this check immediately. It also catches NNF and automaton-negation bugs, the
single most common construction error **[textbook folklore, stated as such]**.

### 9.3 Semantic identities as property tests — breadth without an oracle

Generate random small formulas (depth ≤ 4 over 2–3 atoms) against random small machines (2–4
states, one small variable), and assert verdict-equality for each §3.3 identity, plus the
implication `φ U ψ → F ψ` as verdict-implication. No oracle is needed: the identity IS the
specification. What this catches that fixtures cannot: the combinatorial corners nobody
hand-writes — nested untils, X under negation, until with an always-false right side. The project
already carries this test genre (`node:test` property-style loops in the gate suite); no new
dependency is required.

### 9.4 Hand-computed fixtures — the adversarial floor

Tiny machines where the answer is checkable by eye, each pinning a ruling from this document:

- **two-state flip-flop** (p ↔ ¬p): pins X indexing (`X p` alternates), `GF p` holds, `FG p`
  refuted;
- **a terminal state**: pins §4.1's stuttering consequences (`F ψ` after the halt iff ψ at the
  halt; the counterexample cycle renders as "halts here");
- **a dead end satisfying t**: pins the §9.1 deadend row — `F G ¬t` refuted here while
  `repeatable-cycle t` is refuted, the one sanctioned divergence;
- **an unreachable state**: `G ¬at(s)` holds; vacuity: `G (at(s) → anything)` holds — and the
  result should disclose "the antecedent never occurs" (a cheap side reach-check, the same
  discipline as the lifecycle model's vacuity-witness queries,
  `workbench-lifecycle.mage.yaml:719-722`) **[choice]**;
- **an atom true nowhere**: `F dead_atom` refuted with a concrete trace;
- **a strong/weak until separator**: a machine with `G p` and no q — `p U q` **refuted** (pins
  §3.2's strong ruling; a weak-until implementation answers holds and fails this fixture);
- **an empty acceptance set / pure-safety formula**: `G p` compiles to an automaton with no Until
  — pins that the emptiness check handles zero acceptance sets (every nontrivial SCC accepts);
- **the P1–P5 acceptance suite** on the lifecycle model, with pinned expected verdicts —
  **P5: `expect: refuted`** per §5.2, and its counterexample asserted to be a genuine
  (non-stutter) cycle.

### 9.5 External reference — fixtures, not a dependency

The bundle constraint (static Pages site, no runtime deps beyond what ships) rules out linking
Spot or Spin. What it does not rule out: **using a reference checker's published results as
checked-in fixtures.** Concretely: the worked automata in the GPVW paper and in Baier–Katoen
§5.2's examples (formula → automaton size → language membership for named words) become unit
fixtures for the construction; and, during development only, Spot's `ltl2tgba`/Spin run offline on
the §9.4 machines, with the verdicts recorded as data in the fixture files and the provenance
noted. This is the only layer whose authority is independent of this codebase entirely — §9.1–9.4
all share this document's trace domain, so a wrongness in the *frame* (a misreading of stuttering,
say) could in principle pass all four; an external checker does not share the frame. That
independence is why it is worth the fixture-maintenance cost, and its offline-only form is why it
costs no dependency.

### 9.6 The gate **[choice]**

**Required before any LTL verdict is shown to a user: §9.1, §9.2, §9.3 and §9.4 all green in the
standard node gate, on every run — plus the P1–P5 acceptance suite pinned.** These four run in
milliseconds at our scale and have no excuse to be sampled or nightly. §9.5 is required for the
*construction's* unit tests (the GPVW/B&K fixtures) and recommended, not blocking, for the
cross-checker fixtures. Ranked by what they catch: §9.1 catches the silent-authoritative class
directly and is the reason this checker can be trusted at all; §9.2/§9.3 catch construction bugs
broadly and cheaply; §9.4 catches the known traps by name; §9.5 catches us-being-wrong-about-the-
frame, which nothing internal can.

---

## 10. What this document deliberately does not reopen

- **Fairness** stays out (§5; `DESIGN-v02-semantics-261004.md` §11; `PLAN.md:381`). The full bill
  — declaration surface, filtered-search disclosure genre — is itemized in
  `DESIGN-expressiveness-261004.md` §4 (`:209-218`) and is untouched by anything here.
- **SMT** stays unneeded and unapproached (`PLAN.md` §1a.2, `:320-328`).
- **Three-valued / finite-trace LTL** stays forbidden (§4.2; spec §10 `:443`).
- **CTL / CTL\*, past-time LTL operators, probabilistic and timed logics** — spec §32 non-goals
  (`:1186-1189`); past-time keeps compiling to safety via history variables (`SEMANTICS.md` §7.3).
- **A fifth outcome** stays banned (§8).
- **Exists-quantified LTL** is refused with the dual named (§2.3) — revisit only if a real
  question cannot be served by the six existential forms plus forall-LTL.

---

## 11. Where this brief's ground truth was wrong

Checked as directed; two corrections and two refinements.

1. **"§27's own worked counterexample is `valid → valid → valid → …`" — not a trace of the machine
   it is drawn against.** On the spec §6 sketch, `valid` is neither terminal nor self-looping, so
   under §10's own ruling it cannot repeat; on that sketch P5 *holds* and P2 is *refuted*
   (`refused` has no incoming transition). The counterexample's *shape* is right; its carrier is
   the composed lifecycle model, where it was measured live (§5.2–§5.3). [FIX one figure, sibling
   wave.]
2. **"Measured 18–39 configs" understates the current ceiling.** The lifecycle model — the
   acceptance machine — pins **70** (`test/lifecycle-model.test.ts:109`). Changes no conclusion;
   the budget analysis in §6.2 uses 70.
3. **Refinement: `behavior.ts:64` is the lasso *builder*;** the repeated-configuration search is
   `repeatableCycle` at `behavior.ts:367-379` over `cycleThrough` at `explore.ts:572-580`. The
   brief's sentence is correct; the single line number covers only its first half.
4. **Refinement: "SEMANTICS.md §6 (`:753-771`)"** — §6 ends at `:768`; `:772` opens §7. Symbol
   over number, as the drift warning says.

All other load-bearing premises verified at `f3a9991c`: `Outcome` four-valued at
`src/ir/types.ts:666`; `exhausted` at `src/sparql/eval.ts:71`; the Worker placement; the SMT
blocker; the §7.2a one-denotation rule; the no-fairness lines; the superseded-liveness note in
`PLAN.md:383-391`.
