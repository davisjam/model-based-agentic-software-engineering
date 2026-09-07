# Caused-by provenance (agent-side change traceability)

**Intent** — When an agent-driven change alters system state, you must be able to trace it back to the
reason that caused it, drawn from a closed taxonomy of causes, enforced by asserting a typed
`caused-by` field at the commit gate. Upgrade correlation to causation wherever the cause is known at the
moment of action (carry it with the dispatch); accept a labeled `_proxy` only where no artifact can hold
the cause. Never reward a particular rate; the trace exists to explain, not to be optimized (our
instance: a `caused-by: epic:<id> | reflection:<fire_id> | ad-hoc` field asserted by the code-agent
pre-commit hook).

| | |
|---|---|
| Summary | A typed `caused-by` field, minted at the cause and gated at commit, threads a change to its reason. |
| Target | Agent · **Lifecycle & observability** |
| Form | `audit-trail` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Hard** (deterministic) — the pre-commit hook asserts the typed field is present and names a taxonomy value. Soft·Hard split: the taxonomy *value* is the agent's choice (soft); its *presence* is gated (hard); the `_proxy` suffix on an inferred cause is the honesty-by-construction half |

*Its place in the environment — a **variant / known-use** of **Caused-By Provenance**, under **PROVENANCE · Track provenance and trace causes**. Preserved here for its technical texture.*

## Motivation — the failure it kills

The failure is **the un-warranted change**: a landed diff whose reason survives only as tribal
knowledge. When the fleet does something surprising, RCA of "why did we do this?" becomes guesswork: the
diff shows *what* changed, never *what caused* the fleet to change it. Two costs follow:

- **Behavioral RCA has no ground truth.** You cannot debug the fleet's decisions if each decision's
  trigger is lost the moment the commit lands.
- **No causal claim is defensible.** Ask whether a nudge, a gate, or a policy actually changes behavior,
  and all you can offer is co-occurrence, which Goodharts the instant anyone optimizes it.

## Why it's not just an issue link, a stamp, a yield query, or a trailer

Four adjacent things each carry part of this, and each falls short on a different axis.

- **A `fixes: #123` ticket link is necessary but not sufficient.** It threads a change to a work item.
  It does not let you debug the *agent's behaviors*, which requires the agent's own traceable rationale.
  Safety-critical software makes the same demand: requirements traceability under
  [IEC 61508](https://en.wikipedia.org/wiki/IEC_61508) and
  [DO-178C](https://en.wikipedia.org/wiki/DO-178C) forces every artifact to trace to the requirement that
  caused it. The difference is tempo. Here the matrix emits continuously, one row per commit, rather than
  being assembled by hand after the fact.
- **Mutator-stamps attribute the wrong target.** The
  [mutator-stamps](../../product/provenance-and-attribution/mutator-stamps.md) record a *product mutation
  inside the delivered artifact*: which pass touched this PDF node. Caused-by records *the fleet's change
  to the repository*. One consumer asks who edited the document; the other asks why the fleet edited the
  code. Product-side and agent-side provenance are counterparts across the same seam, not duplicates.
- **The measured-leash yield query proves less.** Caused-by *specializes* the
  [measured leash](reflection-facet-substrate.md). The leash joins firings to actions by a *session key*:
  co-occurrence within a window, which cannot show one caused the other. Caused-by threads an explicit
  cause-id minted at the cause and carried to the effect: a deterministic join wherever an artifact holds
  the cause, an honest `_proxy` label wherever none can. It answers the same question (did this mechanism
  change behavior?) by causation where the evidence exists rather than correlation everywhere.
- **A soft commit trailer rots.** An unenforced "remember to note the reason" convention decays into
  blanks and guesses. This is a *hard* pre-commit assertion of a closed-taxonomy field: the commit does
  not land without a cause naming a known value. Presence is gated deterministically; only the choice
  among values stays the agent's judgment.

## Mechanism

- **A closed `caused-by` taxonomy.** A small typed set of causes (a scheduled effort, a runtime
  reflection firing, unscheduled work), not free strings. A cause outside the set fails loud.
- **A deterministic gate.** The code-agent pre-commit hook asserts the field is present and names a
  taxonomy value before the commit lands.
- **The cause travels with the dispatch.** The brief or dispatch that launched the agent already carries
  the cause-id, so the field "comes out for free" at commit time rather than being reconstructed:
  correlation upgraded to causation because the cause was known when the change was made.
- **Two truthfulness guards, first-class.** First, **no reward for a rate**: the caused-by mix is a
  health signal an operator reads, never a target; optimizing the fraction of "deterministic" causes
  would only teach the fleet to lie. Second, the **`_proxy` suffix**: a cause that had to be *inferred*
  (no artifact held it) is labeled as such, and a disciplined ablation closes the gap between proxy and
  truth rather than hiding it.

## Prerequisites

- **A commit gate to assert at**, here the code-agent pre-commit hook.
- **A closed taxonomy of causes** small enough to be exhaustive and typed.
- **A dispatch that carries the cause** so the known-cause path is deterministic, not reconstructed.
- **An honesty discipline**, the `_proxy` labeling and the no-reward-for-a-rate stance, without which
  the trace drifts toward a flattering number.

## Consequences & costs

- **Some causes are proxy-only.** A change provoked by the agent's own self-check facet has no external
  artifact holding its cause, so it is essentially inferred; label it `_proxy` and be honest. A heavier
  mechanism does not remove that uncertainty; it relocates it.
- **The taxonomy is a coordination point.** A genuinely new cause needs a *declared* taxonomy value, not
  a local string; deliberate, but it makes the cause set a shared surface.
- **The signal must not become a target.** The moment anyone rewards the deterministic-vs-proxy ratio,
  the field starts lying; the discipline is to read it, not to steer by it.

## Known uses

- The code-agent pre-commit hook asserting a `caused-by` field from the closed taxonomy before a commit
  lands.
- A telemetry query reporting the caused-by mix per class (how much of the fleet's change is traced
  deterministically versus `_proxy`-labeled), read by a self-operations runbook that queries the
  caused-by mix.

## Related mechanisms

- **Generalization** — [reflection-facet-substrate](reflection-facet-substrate.md) (and its
  [lifecycle-hooks](lifecycle-hooks.md) *measured leash*): the leash joins firings to actions by session
  key; this threads an explicit cause-id from cause to effect, a deterministic join where an artifact
  exists.
- **Counterpart** — [mutator-stamps](../../product/provenance-and-attribution/mutator-stamps.md):
  product-side provenance (a mutation inside the artifact) versus agent-side provenance (the fleet's
  change to the repo).
- **Generalization** — the catalogue's claim that a *traceability matrix* can be a queried model behind a
  drift gate rather than a filed spreadsheet: caused-by is that matrix emitted one row per commit.
- *See also* — [ddt-pin-trailers](../../product/regression-tests/ddt-pin-trailers.md): a sibling
  typed-trailer discipline asserted at the commit gate.
