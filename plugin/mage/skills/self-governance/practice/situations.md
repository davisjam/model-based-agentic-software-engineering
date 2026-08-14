# practice/situations.md — the field guide

**Owns one question: *what engineering situation am I in?*** This facet classifies and routes. It
names the situation from its symptoms, gives you the questions that discriminate it from its
neighbors, and points at the move-families worth considering. It does **not** tell you how to run a
move (that is `modeling/moves.md` and `alignment/repertoire.md`) and it does **not** weigh which move
is warranted (that is `practice/judgment.md`).

Keep the split sharp:

| `practice/situations.md` | `practice/judgment.md` |
|---|---|
| What is happening? | What is worth doing? |
| classification | tradeoff |
| diagnosis | proportionality |
| routing | choice |

**Diagnose before you route.** The reflex under pressure is to jump to a move — add a paragraph to
the brief, write a lint, model the subsystem. Name the situation first. The same symptom (an agent got
the boundary wrong) can be implicit architecture, model drift, or a one-off. The move you reach for
depends on which.

**A situation is not a mandate to build.** Reaching a candidate move-family means the move is *worth
considering here*, not that you should encode it. Every route ends by handing the sizing decision to
`practice/judgment.md`.

---

## The recognition loop

```
OBSERVE the work
   → What situation am I in?          (this file)
   → What is known / implicit / uncertain / evidenced?
   → Is this principally a problem of representation, alignment,
     observability, validation, authority, or repeated failure?
   → Candidate move-family            (→ modeling/moves.md, alignment/repertoire.md, learning/…)
   → Which move is warranted?         (→ practice/judgment.md)
```

Each entry below follows one shape: **symptoms → likely situation → discriminating questions →
candidate move-families.**

---

## 1. Implicit brownfield architecture

- **Symptoms.** Agents keep reconstructing the same subsystem boundary from implementation. Every
  brief re-explains the same structure. A change lands in the wrong module because the seam was never
  legible. "Where does X live?" gets answered by grep, every time.
- **Likely situation.** Important architecture is unrepresented or weakly represented. The failure is
  in the *environment*, not in any one agent's reasoning — a representation problem.
- **Discriminating questions.** Does an authoritative structure model exist, or only code plus tribal
  knowledge? (ask a provider — `system/model-access.md`) · When agents get it wrong, is it the *same*
  boundary each time (systematic) or scattered (incidental)? · Is the fact re-derived from source each
  time, or copied into several stale docs?
- **Candidate move-families.** `externalize-judgment` and `make-dependencies-queryable`
  (`modeling/moves.md`). If the boundary must *hold*, a boundary constraint
  (`alignment/repertoire.md`). Whether the investment pays now → `practice/judgment.md`
  (proportionality). This is where **prompt-accretion** lives (see recognition cues below).

## 2. Ambiguous intent

- **Symptoms.** The requirement reads two ways. "Make onboarding less confusing." The agent is filling
  spec gaps with invention. Success cannot be stated as a property.
- **Likely situation.** A missing or unsettled normative model — no authoritative statement of what
  must be true. Split two cases: intent that is genuinely *unsettled* (an open engineering question)
  versus intent that is *settled but unwritten*.
- **Discriminating questions.** Is the intent still being discovered, or decided-but-never-recorded? ·
  Does a requirements or constraint provider hold the obligation, or nothing? (`system/model-access.md`)
  · Would one representation collapse the ambiguity, or is this a product question that needs
  exploration and evidence?
- **Candidate move-families.** Settled-but-unwritten → `make-fact-authoritative` (`modeling/moves.md`)
  plus a requirements query (`system/model-access.md`). Unsettled → do **not** give it premature
  authority; explore or prototype to learn, then promote what stabilizes. Whether to model now or act
  now → `practice/judgment.md` (model-vs-act).

## 3. Uncertain blast radius

- **Symptoms.** A local change looks safe but you cannot establish a downstream effect. "This probably
  won't break anything." The impact set is unknown; the confidence is rhetorical, not evidenced.
- **Likely situation.** A missing relationship or missing evidence — a dependency or trace the
  environment cannot answer.
- **Discriminating questions.** Can you *query* what depends on the thing you are changing, or are you
  grepping? (`get_relations` — `system/model-access.md`) · Is the missing thing a relationship (who
  calls this) or evidence (does a test cover this)? · Is the consequence reversible?
- **Candidate move-families.** `make-dependencies-queryable` (`modeling/moves.md`) plus a
  relations/evidence query (`system/model-access.md`). If the change is irreversible, narrow scope or
  defer → `practice/judgment.md` (reversibility). Do not raise confidence by rhetoric.

## 4. Conflicting representations

- **Symptoms.** The doc says one thing, the code does another. Two lists of the "same" fact disagree.
  A model claims a boundary the implementation crosses.
- **Likely situation.** Two representations both treated as authoritative have drifted — or one is
  silently stale.
- **Discriminating questions.** Which representation is authoritative and which is derived?
  (`get_authority` — `system/model-access.md`) · Is this one fact with a single rightful home being
  copied, or two facts that must *both* stay authoritative? · Which side is stale — check freshness and
  evidence.
- **Candidate move-families.** `get_conflicts` + `get_authority` (`system/model-access.md`) to settle
  which wins. Then `derive-don't-copy` (`modeling/moves.md`) if one home should own the fact;
  `check-correspondence` (`modeling/moves.md`) plus a drift sensor (`alignment/repertoire.md`) if both
  must remain. Close neighbor of model drift (§7).

## 5. Missing evidence

- **Symptoms.** A property is asserted but nothing tests it. "Should be fine." Human review is the only
  thing catching a class. Coverage cannot see the behavior, because nothing names it as an obligation.
- **Likely situation.** An obligation with no oracle — validation has nothing to test, or the census
  of required checks was never derived.
- **Discriminating questions.** Is the obligation even *named*, so coverage could see its absence? ·
  Is the property mechanically decidable or judgment-laden? · What evidence would discriminate — one
  example, a property over a domain, a runtime measurement?
- **Candidate move-families.** `derive-the-obligation-set` (`modeling/moves.md`) to name what needs
  evidence, then a validator (`alignment/repertoire.md`) where the property is decidable. If it is
  judgment-laden, improve the evidence supplied to the reviewer rather than faking determinism →
  `practice/judgment.md` (irreducible judgment). How much evidence to buy → `practice/judgment.md`
  (cost-of-evidence).

## 6. Recurring failure

- **Symptoms.** The same bug class returns. The same manual step every session. A lint keeps
  false-firing and you keep hand-patching it. "An agent broke X again."
- **Likely situation.** A durable-lesson candidate — repeated expenditure of engineering judgment on a
  class the environment could carry.
- **Discriminating questions.** Same class each time, or coincidental instances? · Is the property
  decidable (a candidate constraint or validator) or genuinely judgment-dependent? · Does the future
  return justify the machinery, or is the recurrence too cheap or too unstable to encode?
- **Candidate move-families.** This is the front door to `learning/governance-conversion.md` — the
  recurrence gate and the conversion menu. Prevention by construction (a constraint) beats detection (a
  sensor or validator) where the action space can honestly close (`alignment/repertoire.md`). Whether
  it clears the recurrence-and-cost bar at all → `practice/judgment.md` (consequence-vs-recurrence).
  Watch **governance-accretion** — not every mistake earns a permanent rule.

## 7. Model drift

- **Symptoms.** A representation that was once true has diverged from reality. A doc trusted as
  authoritative describes an old world. A derived artifact silently disagrees with its source.
- **Likely situation.** An unvalidated representation still treated as authoritative — a **stale
  model**.
- **Discriminating questions.** Is correspondence between model and reality *checked*, or assumed? ·
  One-way or bidirectional — does a regenerate-from-code check let the model lie? · Is the model still
  consumed for decisions (drift is consequential) or vestigial (retire it)?
- **Candidate move-families.** `check-correspondence` (`modeling/moves.md`) plus a **bidirectional**
  parity/drift sensor (`alignment/repertoire.md`) — a one-way check quietly makes code the truth. If
  the model no longer pays its upkeep, retirement is a legitimate move → `practice/judgment.md`
  (depreciation). Close neighbor of conflicting representations (§4).

## 8. Validation failure

- **Symptoms.** A gate rejected the work. A check went red. A validator fired.
- **Likely situation.** *Either* the work is wrong (repair it) *or* the check is wrong (a finding about
  the control). Do not assume the first.
- **Discriminating questions.** Is the verdict correct — is the work actually wrong? · If the check is
  wrong, is it wrong at this instance (tune it) or at the class (the obligation is mis-stated)? · Did
  the failure *recur* — is the control itself the recurring failure?
- **Candidate move-families.** Diagnose first, then repair the instance **or** route the control-defect
  to `learning/governance-conversion.md` (a check that keeps mis-firing is itself a recurring failure).
  Do not reason around a red gate and declare the work done — that is **self-certification**, and the
  method forbids it (`SKILL.md`, `alignment/repertoire.md`). Whether to trust the verdict at all →
  `practice/judgment.md` (evidence quality).

## 9. Authority boundary

- **Symptoms.** The change touches something you may not be authorized to decide. A destructive or
  irreversible operation. A security, legal, or safety obligation. A call that belongs to a human or
  another owner.
- **Likely situation.** You are at an authority-and-consequence boundary — a step whose decision is not
  yours to certify.
- **Discriminating questions.** Am I authorized to make this change? · Is the consequence reversible,
  and is it detectable if it goes wrong? · Is this a *human-judgment* step, a *bounded-judgment* step
  (dispatchable with prepared context), or a *runnable* one?
- **Candidate move-families.** Put the gate outside your own discretion (`alignment/repertoire.md`);
  surface the decision to whoever owns it. Escalation here is a **proportionate move, not a failure** —
  but frame it with prepared evidence (state, options, criteria, the specific question), not "please
  decide." When to escalate versus proceed → `practice/judgment.md`.

## 10. Novel high-consequence judgment

- **Symptoms.** A genuinely new situation. High cost of being wrong. No precedent, no runbook, no
  decidable property. A strong temptation to invent a deterministic rule so the call *feels* safe.
- **Likely situation.** Irreducible judgment — a decision that modeling and mechanism can inform but
  not replace.
- **Discriminating questions.** Is this genuinely novel, or a recurring class in disguise? · Would more
  evidence or modeling cheaply reduce the risk, or is the residual truly a judgment? · Can I fence the
  decidable parts and isolate the one true judgment?
- **Candidate move-families.** Collect evidence, query models, narrow the question — but do **not** fake
  determinism → `practice/judgment.md` (irreducible judgment). Fence the deterministic ends around the
  single judgment step (step-typing; `modeling/moves.md`). If the call is consequential and not yours,
  escalate (`practice/judgment.md`). Do not convert a one-off novel decision into a permanent rule —
  that is **governance-accretion**.

---

## Non-situations — recognize when NOT to reach

Two cases matter as much as the ten above, because reaching for machinery here *is* the failure:

- **Low-risk one-off.** A cheap, rare, reversible task with a cheap-to-check output. Write the
  contract, do the work, check it, move on. A mechanism here is the first brick in the tower of
  governance. Route: `practice/judgment.md` (proportionality) — and then just act.
- **Needless modeling.** The urge to build a representation that would not change any decision,
  generation, trace, or control. That is **model-theater**. If you cannot name the decision the model
  would change, do not build it. Route: `practice/judgment.md` (when-modeling-becomes-waste).

---

## Design-time smells (ex-ante recognition)

The ten situations above are mostly recognized *after* a symptom appears. A few structural traits make
a failure class near-certain *before* anyone has felt it, so recognizing them while a design is still
on the page is cheap insurance.

**The YAGNI gate is load-bearing: name the near-certain failure the trait creates, or there is no
row.** If you cannot state the failure, the trait is just a possibility, and reaching for a mechanism
builds the tower. Run this scan over a *proposed design or a subsystem under active construction* —
never over stable code. For each trait: name its site, name the near-certain failure, then route to the
move-family. Sizing the reach — how strong a mechanism, or none — is `practice/judgment.md`.

| Trait you see in the design | Near-certain failure it creates | Route to |
|---|---|---|
| Concurrency / shared mutable state / a multi-step mutation that can tear | interleaved writers corrupt state; a torn update | a lock, mediator, or atomic step (`alignment/repertoire.md`); walk the T+1…T+N dynamics |
| A stateful lifecycle (states + transitions) | an illegal transition nobody guards; scattered flags disagree | an explicit state machine, not ad-hoc flags (`modeling/moves.md`, `alignment/repertoire.md`) |
| The second copy of a logic | the two copies drift; a fix lands in one | unify now, on the second site (`modeling/moves.md`) |
| A raw seam to a powerful resource (query language, subprocess, filesystem, format library) | a hand-built call silently drops rules or corrupts | one typed seam + a ban-lint on the raw path (`modeling/moves.md` `close-the-action-surface`) |
| A fact re-derived or hardcoded in more than one place | a snapshot rots while the source moves | a queryable authority; `derive-don't-copy` (`modeling/moves.md`) |
| Retried / queued / time-delayed consumption | stale payload consumed at T+N; a duplicate fires | design the T+N dynamics up front; a dynamics-aimed test (`alignment/repertoire.md`) |
| A silent decision core (a threshold or timer changes state, nothing records what it decided) | an un-diagnosable failure — no signal to pin it | emit the structured per-decision signal now (`modeling/moves.md`; the wiring a future sensor needs) |
| A trust boundary (untrusted input, cross-service call, secret, broad capability) | injection, spoof, or over-broad capability | validate/escape at the boundary; least privilege (`alignment/repertoire.md`) |
| An irreversible op (delete, overwrite, migrate, force-push) | one bad run destroys work with no undo | a guard, dry-run, or backup (`alignment/repertoire.md`) |
| An invariant living only in prose or someone's head | the invariant rots the moment surrounding code shifts | encode it + a test that walks it (`modeling/moves.md`) |
| An advisory "remember to…" | the reminder is ignored; the class recurs | a hard gate — code rule to a lint, operator step to a lifecycle hook (`alignment/repertoire.md`) |
| The second *surface* of a pair (one fact/contract now stated in two places) | the two surfaces diverge silently | name the join; hold it at the highest affordable rung — **UNIFY** > **CODEGEN** > **parity sensor**, never a comment |

Three further traits are named exceptions to default-skip rather than a license to govern everything: a
hot-path N+1, a niche-versus-mainstream tool choice (weigh training-data density), and
mechanism-placement layer. Everything else stays recognized *after* the failure appears (→
`learning/governance-conversion.md`).

---

## Anti-pattern recognition cues

Anti-patterns are situations too — the situation of *reaching for the wrong response*. Recognize these
by their symptom; the response, and the tradeoff behind it, live in the routed facet. The
judgment-side anti-patterns (governance-accretion, skill-roulette, premature-action, endless-modeling)
are recognized here but weighed in `practice/judgment.md`.

- **Prompt accretion.** You are adding another instruction to the brief instead of improving the
  environment. Symptom of implicit architecture (§1). → `modeling/moves.md` (externalize),
  `learning/governance-conversion.md`.
- **Inspection loops.** You are spending agent reasoning to re-check a property that a machine could
  decide once. Symptom of missing evidence (§5). → a validator (`alignment/repertoire.md`).
- **Implicit architecture.** Every agent reconstructs system structure from implementation artifacts.
  → §1; `modeling/moves.md`.
- **Model theater.** A representation exists that improves no reasoning, decision, generation,
  traceability, or control. → the "needless modeling" non-situation; `practice/judgment.md`.
- **Stale models.** An unvalidated representation is treated as authoritative after reality diverged. →
  §7 (model drift); `check-correspondence` + a drift sensor.

These sharpen recognition. They are not slogans — each names a specific reach that the situation did
not call for.
