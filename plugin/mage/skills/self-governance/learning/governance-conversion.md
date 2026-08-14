# Governance conversion — what should persist from this episode

**Owns the question:** *What should the environment learn from what just happened?*

This is the loop that turns experience into engineering capital. Work fails, or a review
surfaces a gap; the agent asks not only "how do I fix this instance?" but "is there a
durable lesson, and what form should it take?" The answer might change a model, sharpen a
skill, mint an alignment mechanism, record a limitation — or nothing at all.

This question is deliberately its own facet because it spans three others. A single failure
can resolve into a modeling change, a skill change, or an alignment change:

```
                 EXPERIENCE
                     |
              durable lesson?
                 /        \
               no          yes
               |            |
            move on     capitalize
                            |
          +-----------------+-----------------+
          |                 |                 |
        MODEL             SKILL           ALIGNMENT
        change            change           change
```

Because the outcome can land in any of those, no single one of them can own the *decision*.
This facet owns the decision — *what persists* — and points to the others for the *how*.

---

## The conversion loop

```
 failure
    |
 diagnosis
    |
 engineering judgment
    |
 durable lesson?  --no-->  fix the instance, move on
    |
   yes
    |
 durable mechanism
    |
 future failures prevented / detected
    |
 ENGINEERING CAPITAL
```

The discipline is in the middle. When work fails, do not stop at repairing the immediate
defect. Ask whether the failure names a *class* — and only then decide what durable form,
if any, kills the class. The goal is engineering capital, not bureaucratic sediment.

---

## The recurrence gate — most failures convert to nothing

Run this gate before anything else, because it is the one that keeps the tower of governance
from rising.

**A failure earns a durable mechanism only when it is a class, not a one-off.** Convert when:

- it has **recurred** — the same bug, lint miss, false-positive, or manual step happening a
  second time;
- it is **structurally certain to recur** across N sites — the "second site, not the third"
  signal, where the shape guarantees the next instance;
- or it **happened once but was costly enough that once is the recurrence** — a data-loss
  path, a prod incident, an irreversible mistake.

A single typo, a benign one-off, a failure with no path back: fix it, note it if useful, and
**stop**. Manufacturing a mechanism here makes the repo slower and more confusing than the
failure it feared.

---

## The conversion menu — including the option to do nothing

When the gate passes, a durable lesson can take any of these forms. The menu spans all three
sibling facets on purpose — the *diagnosis* decides which, not a default reflex toward
"add a lint."

- **Improve a system model** — the failure revealed a missing or wrong representation
  (→ [`modeling/repertoire.md`](../modeling/repertoire.md), [`modeling/moves.md`](../modeling/moves.md)).
- **Improve relationships or traceability** — the pieces were modeled but their links were
  not, so a change broke something no trace connected it to.
- **Establish a better authority source** — the team reasoned from a descriptive model where
  an authoritative one was needed (→ [`system/model-access.md`](../system/model-access.md)).
- **Improve a skill** — a capability lacked an important engineering distinction, or applied
  the wrong move (→ [`skills/repertoire.md`](../skills/repertoire.md)).
- **Improve context** — the agent lacked information it needed at the moment it decided.
- **Add a constraint** — restrict the action space so the wrong move cannot be picked
  (→ [`alignment/repertoire.md`](../alignment/repertoire.md)).
- **Add a sensor** — expose the state that was invisible when the failure formed.
- **Add a validator** — decide the property that was left to subjective inspection.
- **Add a gate** — condition progression on the evidence or authority that was missing.
- **Record an irreducible judgment** — the call genuinely required human judgment; write down
  what was decided and why, so the next agent inherits the reasoning rather than re-deriving it.
- **Do nothing durable** — the failure was incidental. Fix the instance and move on.

The alignment forms (constraint / sensor / validator / gate) are named here only as
*destinations*. How to build one, prevent-vs-detect, soft-vs-hard, and the mechanism census
all live in [`alignment/repertoire.md`](../alignment/repertoire.md) — this facet decides
*that* a mechanism should exist and *which kind of lesson* it is; that facet decides *how it
holds*.

---

## Defending the do-nothing option

**Not every failure deserves governance.** This is the option the loop most often should
take, and the one an eager agent most often skips — so it earns its own defense.

- **Incidental failures are the common case.** A one-time typo, a flaky run that never
  returns, a mistake with an obvious cause and no structural root: these carry no durable
  lesson. Converting them mints a mechanism that guards against a failure that will not recur.
- **Every mechanism has a standing cost.** A lint runs on every commit; a gate blocks every
  advance; a house-rule occupies context in every agent's boot. A mechanism that does not kill
  a recurring class is pure tax — slower iteration, more to reason about, one more thing that
  can itself misfire.
- **Governance accretion is a failure mode, not diligence.** Turning every isolated mistake
  into another permanent rule or gate produces bureaucratic sediment: a repo so encrusted with
  guards that the guards, not the failures, are what slow the work. The measure of this loop is
  engineering *capital* — mechanisms that pay back their cost by killing classes — not the
  *count* of mechanisms minted.

So the honest, common, correct answer is often "nothing durable." Say it plainly, even when
the failure stung. The recurrence gate exists precisely to license this answer.

---

## The two operating procedures

The old self-governance skill *was* these two modes. They survive here, demoted from the
spine of the skill to the two procedures of one facet — because both answer the same
question: what should persist.

### AUDIT — survey what the repo should have learned but has not

**Trigger:** "harden this repo," "what guardrails am I missing," "review my governance
posture," a periodic review.

AUDIT is governance conversion run in bulk, ex-post: instead of converting one fresh
failure, walk the failures the repo has *already* seen and ask which never converted.

1. **Learn the repo and gauge its scale first.** What agents run, how many at once, what
   breaks repeatedly, what house-rules file exists. Size the plan to that scale — a
   high-intensity operation warrants mediators and merge-train machinery; a solo dev warrants
   a house-rules doc and a lint or two. Read before opining.
2. **Walk the census by target.** For each mechanism in
   [`alignment/repertoire.md`](../alignment/repertoire.md)'s census, judge per target
   (agent / models-bridge / product): does this repo **need** it, already **have** it (name
   where), or would it **benefit**? A mechanism you cannot attach to a real failure here is one
   they do not need yet — skip it, and say why.
3. **Triage by complexity kind.** Attack *accidental* complexity (parallel implementations,
   scattered state, doc↔code drift); *budget* for *essential* complexity rather than proposing
   a mechanism that only relocates it.
4. **Prefer experiments over verdicts.** Where fit is uncertain, surface two or three candidate
   shapes and pilot the cheapest on one subsystem before a wider sweep. A killed bad mechanism
   is a win.
5. **Emit the plan.** Group as **adopt** (as-is), **adapt** (to their stack), and **skip**
   (with the reason). Order by leverage ÷ cost. Tag each item by move and form; each sensor
   names the signal it reads. Name the one mechanism you would build first, and why that one.
6. **Close with the Residual.** Name the quality goals no mechanism reaches — the failure that
   is an absence nobody specified (the missing authorization check has no failing test, by
   definition). Those stay human review; naming them is what makes the mechanized coverage
   credible. Authoring the missing spec is the one shrink move.

The **design-time trait scan** — the ex-ante half of the old AUDIT — is *situation
recognition*, so it lives in [`practice/situations.md`](../practice/situations.md) with its
YAGNI gate ("name the near-certain failure or no row"). AUDIT runs it over a *proposed*
design, then routes each named trait back through this menu.

### INTERPRET-FAILURE — convert one fresh failure

**Trigger:** a concrete failure just happened or recurred — "this bug class keeps coming
back," "an agent broke X again," "make this not happen anymore." **Invoke it the moment a
failure recurs a second time** — do not merely note the recurrence and move on; that is the
failure this procedure exists to catch.

1. **Recurrence gate.** The gate above. A one-off stops here.
2. **Interpret.** Open with the move question: a failure to *prevent* (you need a constraint)
   or to *detect* (sensor → validator → gate)? Place it: which target, which family, which
   existing mechanism is nearest — a *gap in* one, or a *missing* one? Decide the form, hard or
   soft. Then the sensor check: if you could not pin this failure from existing signal, the
   observability wiring is part of the mechanism, not an optional extra. The move/target/form
   vocabulary is [`alignment/repertoire.md`](../alignment/repertoire.md)'s; the *choice among
   legitimate options* is weighed in [`practice/judgment.md`](../practice/judgment.md).
3. **Genre-check before inventing.** If the fix is a new mechanism, ask: what is its genre, who
   is the canonical best-in-class, can we adopt an existing schema even if we skip its runtime?
   Prefer a single source of truth.
4. **Reason about second-order dynamics, and compose-check.** Walk it forward — T+10, under
   concurrency, if state drifts between dispatch and consumption. Then walk the interaction with
   what already fires on this event or resource (the compose-check in
   [`alignment/repertoire.md`](../alignment/repertoire.md)).
5. **Propose, right-sized.** Show the mechanism you would build — the exact failure it kills,
   its move and form, how it fires — plus the point fix for the instance. Default to the
   smallest sound structural fix, biased toward the constraint; float the larger scheme as an
   option; where the failure is costly, do both.
6. **On greenlight, do it.** Write the lint / test / gate / typed-seam change and the point fix.
   When it warrants a design doc or Epic, author it from the bundled templates so ratification
   lands committed in the doc, not in chat. Then state plainly what is now **enforced** (the
   hard mechanism you wrote and verified) versus **recommended** (left for a human to wire) — do
   not overstate enforcement, because a mechanism you only proposed does not yet hold
   ([`alignment/repertoire.md`](../alignment/repertoire.md) §not-self-certification).
7. **When the lesson is a whole model view, reach for the MBSE starter kit.** Some classes are
   not closed by one lint — they need a typed model view the fleet reasons through (a lifecycle
   whose races need a state machine, a subsystem map, a service-flow or deployment topology).
   That is a modeling change; route through [`modeling/moves.md`](../modeling/moves.md) and the
   starter kit under `templates/`.

---

## Fold the method in so it fires, not so it decorates

When you help a team fold this loop into their always-loaded governance doc, **cite the skill;
do not mirror it.** A paraphrased copy of the recurrence gate and the conversion menu gets
read *ambiently* and invoked *never* — so when a class recurs, the operator reaches for the
blurred reflex instead of this structured procedure, losing the gate, the genre-check, and the
menu. Keep a one-line reflex in the rules, cite the skill, and wire a **trigger** — a
recurring-failure reflection nudge that pushes "invoke governance conversion (INTERPRET-FAILURE)"
the moment a class recurs. Without the trigger, the loop fires almost never.

---

## Owns / does not own

- **Owns:** the decision of *what persists* from an episode; the recurrence gate; the
  conversion menu; the defense of the do-nothing option; the two bulk/single procedures
  (AUDIT, INTERPRET-FAILURE).
- **Does not own:** *how* a chosen mechanism is built or made to hold
  ([`alignment/repertoire.md`](../alignment/repertoire.md)); *which* model or move to reach for
  ([`modeling/repertoire.md`](../modeling/repertoire.md), [`modeling/moves.md`](../modeling/moves.md));
  *whether* the proportionality favors acting now ([`practice/judgment.md`](../practice/judgment.md));
  *what situation* the failure signals ([`practice/situations.md`](../practice/situations.md)).
  This facet decides that a lesson should persist and in what category — the siblings realize it.
