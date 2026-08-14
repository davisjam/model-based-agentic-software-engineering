# practice/judgment.md — choosing among legitimate moves

**Owns one question: *given several legitimate moves, which is warranted?*** By the time you reach this
facet, `practice/situations.md` has already named the situation and handed you candidate move-families.
This facet weighs them. It is about tradeoff and proportionality, not classification.

Keep the split sharp:

| `practice/situations.md` | `practice/judgment.md` |
|---|---|
| What is happening? | What is worth doing? |
| classification | tradeoff |
| diagnosis | proportionality |
| routing | choice |

**Judgment does not disappear under MAGE — it moves.** The method does not replace engineering
judgment with a flowchart. It changes *where* judgment is spent and *what happens to a judgment that
repeats*. Governance is judgment rendered as code; judgment itself is the scarce resource. Spend it on
the calls that deserve it, and convert the ones that recur — no more.

**This facet weighs; it does not enumerate.** It does not list model families (that is
`modeling/repertoire.md`) or alignment mechanisms (that is `alignment/repertoire.md`). When a section
names a constraint or a validator, it points there. Guard this boundary — a facet that starts
re-teaching the repertoire becomes the junk drawer.

---

## Proportionality — right-size the response

An over-governed environment is also badly engineered. Do not answer every problem with another model,
document, validator, gate, approval, skill, or permanent rule. Ask whether the recurring cost or risk
justifies the mechanism, and prefer **the lightest durable mechanism that economically retires the
recurring cost**.

The sizing decision has a shape. Cross how much a failure costs against how often it happens; each cell
names the proportionate move — the smallest change that still closes the class.

| Cost × frequency | Rare failure | Frequent failure |
|---|---|---|
| **Cheap** | Leave it to judgment. A mechanism here is the first brick in the tower of governance. | A cheap lint or script. It trips agents often, and the tokens they burn working around it are real cost. |
| **Costly** | A runbook with a named escape; a blocking gate once the failure's shape is decidable. | **Prevention first where feasible:** a structured model that makes the mistake impossible, with a gate as the immediate floor and permanent backstop. This corner earns both. |
| **Any cell — if hard to detect, hard to reverse, or legally intolerable** | Escalate one tier. | Escalate one tier. |

The reflex to reach for a control on every failure is the expensive habit. **Float the larger scheme;
let the cost of the failure justify building it.** A catastrophic or legally intolerable failure need
not recur even once to earn prevention.

## Consequence versus recurrence — when to convert at all

Two triggers justify turning a lesson into machinery: the failure **recurs**, or a single occurrence is
**costly enough** that you cannot afford the second. Cheap-and-rare stays judgment. Cheap-and-frequent
earns a lint or a reusable procedure, because repeated agent and human attention is itself cost.

Distinguish an **incidental** failure from a **recurring or systematic** one. The cycle does not say
"second occurrence, add a lint." It says *recognize repeated expenditure of engineering judgment and
decide whether to turn it into an asset*. The full recurrence gate and conversion menu live in
`learning/governance-conversion.md`; this section is the economic test that decides whether to walk
through that door.

## Reversibility — defer the irreversible under uncertainty

Reversible work tolerates weaker assurance; you can undo a mistake. Irreversible or hard-to-detect
consequences deserve more evidence before you act, and a **second boundary**: re-establish the evidence
that must still hold at the last safe point before the consequence, not only when the property first
became decidable. A recorded "done" describes the past; regenerate the evidence that justifies the
consequence at the boundary that admits it. Under consequential uncertainty, narrowing scope or
deferring the irreversible step is often the warranted move.

## Cost of evidence — buy proportionate to risk

What you *know* and what you are *assuming* are different states. Distinguish them honestly:

```
known → represented → validated → inferred → assumed → unknown
```

These are not interchangeable. An authoritative requirement is not the same evidence as a derived
dependency graph or a stale model. When consequential uncertainty exists, the moves that buy evidence
include: inspect more evidence, query an authoritative model (`system/model-access.md`), create or
improve a representation, run an experiment, invoke a validator (`alignment/repertoire.md`), narrow the
scope of action, defer an irreversible action, or escalate. Buy evidence **proportionate to the
risk** — do not raise confidence by rhetoric, and do not gold-plate a cheap reversible call with a full
validation campaign.

## Cost of formalization — authority versus lightweight guidance

**Guidance aims; authority binds consequences.** A brief, convention, or example influences an agent
but can be misread or ignored. A type, permission, validator-backed gate, or constrained API acts
outside that cooperation. Do not make authority the automatic destination of every piece of guidance.

Make an obligation authoritative when three things hold at once: the obligation is **stable**, the
mechanism can **evaluate it at the right semantic boundary**, and the **cost of violation** justifies
the restriction. Keep it lightweight where judgment is still unsettled, or where mechanization would
cost more than the failure it prevents. A phrase like *must never happen* is a signal, not proof that a
blocking gate is right — first ask what property must hold and where it can be enforced. **The mechanism
follows the property, not the rhetoric.**

## When to model versus act

Before editing implementation, ask: **would acting now create risk that cheap modeling or evidence
would remove?** If yes, model or gather evidence first. Two symmetric failures bound this call:

- **Premature action** — editing before enough of the relevant intent, structure, and evidence is
  established. The fix is often a small representation, not more confidence.
- **Endless modeling** — refusing to act because another representation could theoretically be built.

Model at the **least unnecessary detail**, and only the view where the failure lives — you do not earn
points for climbing a modeling ladder or building a complete architecture when the failure sits in one
projection. A model earns its keep only if it changes a decision, a generation, a trace, or a control.

## When additional modeling has become waste

The stopping test is blunt: **if the next representation would not change what you do, do not build
it.** A model that improves no reasoning, decision, generation, traceability, or control is
model-theater. This also governs the *back* end of a mechanism's life — engineering capital
depreciates. A model must be reconciled, a validator recalibrated, a lint maintained. A control whose
upkeep exceeds the failure it prevents has become overhead. **Build the smallest asset that retires the
recurring cost, and retire the asset when it stops paying.**

## When judgment is irreducible

Some calls are genuinely judgments — novel, high-consequence, no decidable property. Here the failure
mode is faking determinism: dressing a judgment as a threshold so it *feels* governed. Do not. Instead:

- **Improve the evidence supplied to the decider** rather than pretending the decision vanished.
- **Fence the decidable parts.** Determinize the steps that have one correct outcome; leave the one
  real judgment in the middle, carrying prepared context — relevant state, allowed choices,
  distinguishing criteria, required output.
- **Surface the residual honestly.** The environment can collect evidence and narrow the question
  without collapsing the final call to a number.

Reflection assists reasoning; it is not an assurance boundary. An agent's belief that its work is
correct is evidence about intent, not independent evidence of correctness.

## When to escalate

**Escalation is an engineering move used at a genuine authority, uncertainty, or consequence boundary —
not the universal fallback.** Do not make "ask the human" the reflex answer to every hard problem;
thinking harder is not the only alternative, but neither is deferring by default. Reach for escalation
when the cost, irreversibility, or authority of the call warrants it — and when you do, escalate with a
**prepared decision**, not a shrug: the relevant state, the options, the criteria that distinguish
them, and the specific question. Where the call must stay someone else's, put the gate outside your own
discretion (`alignment/repertoire.md`).

## Smallest sound intervention versus redesign

Prefer the smallest change that closes the *class*, proportionate to the failure. Float larger schemes;
do not reflexively build them. Two refinements:

- **Architecture first where it makes the error impossible.** Prevention by construction — a closed
  action surface, a typed seam — beats catching the mistake after the fact, where the action space can
  honestly close (`alignment/repertoire.md`, `modeling/moves.md`).
- **Both, for the costly-and-frequent corner.** A structured model that prevents the mistake *and* a
  gate as the immediate floor. Defense-in-depth is warranted when the failure is both consequential and
  common — and only then.

Do not relabel essential complexity as accidental and hide it behind a prettier abstraction. The test
before any large refactor: is this removing accidental complexity, or just relocating the essential
kind?

---

## Anti-patterns weighed here

Recognized in `practice/situations.md`; the tradeoff that resolves them is here.

- **Governance accretion.** Turning every isolated mistake into another permanent rule or gate. The
  cure is the recurrence-and-cost test above — convert only what recurs or is catastrophic.
- **Skill roulette.** Choosing a capability because it exists rather than because the situation calls
  for it. Weigh the move against the diagnosed situation first (`practice/situations.md`,
  `skills/repertoire.md`).
- **Premature action.** Acting before establishing enough intent, structure, and evidence. Weigh
  model-versus-act.
- **Endless modeling.** Building representations instead of acting. Weigh when-modeling-becomes-waste.

## The tower of governance

Every mechanism you add is also a mechanism someone must maintain, reason around, and eventually
retire. A stack of well-meant controls, each defensible alone, becomes an environment that blocks
ordinary work — the tower of governance, built one reasonable-looking brick at a time. Proportionality
is the standing guard against it. MAGE exists to sustain high engineering velocity, not to recreate
heavyweight process bureaucracy around agents.

## Brownfield — progressive improvement, not an ideal first

Do not demand a complete modeling infrastructure before doing useful work. In an inherited estate the
warranted pattern is:

```
work
  → discover missing knowledge or control
  → introduce the smallest useful improvement
  → continue
  → repeat when justified
```

Adoption emerges through useful engineering work. Preserve the obligations already worth preserving,
surface the representations already worth trusting, and let the work expose what is still missing.

---

## Self-governance is not self-certification

The through-line under every choice above: your reasoning can select, propose, model, and check — but
your belief that the work is correct is not equivalent to independent evidence that it is. Where a
property must hold, the deciding evidence should come from outside the discretion that produced the
change (`alignment/repertoire.md`). Choosing well among moves includes choosing to let something other
than your own judgment have the last word.
