# CLAUDE.md rule index (the governance document as a mechanism)

**Intent** — Treat the top-level governance document as *enforced infrastructure*: a numbered,
stable-numbered rule index, loaded into every agent's boot context, held honest by its own enforcement
counterpart (a bloat/cap lint plus a rule-conformance lint), so the document that carries every
other mechanism cannot silently rot.


| | |
|---|---|
| Summary | The governance document itself, enforced by its own lints. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `validation` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Soft·Hard** — the rules are guidance to the agent (soft, booted into every context); a governance-doc bloat/cap lint + the rule-conformance lint are *blocking* (the hard counterpart) |

> **★ The meta-mechanism.** Every other entry in this catalog names a mechanism. *This* is the mechanism
> that records the others. CLAUDE.md is the durability mechanism for the whole "convert a failure into
> a mechanism" move: a rule written here is enforced on every subsequent agent boot without
> re-inspection. It is both a member of the catalog and its delivery vehicle.

*Its place in the environment — the **canonical mechanism** for **GOVERN · Govern the control machinery itself**. The variants and known uses that fold under it are gathered on the [construction-kit page](../../constructing-the-gee.md#cap-govern).*

## Motivation — the failure it kills

The failure class is **governance that doesn't bind and doesn't last.** Two ways it manifests. First,
*non-binding*: a convention lives in someone's head or a stale wiki page, so a fresh agent never
applies it and the failure it was meant to prevent recurs. Second, *rot*: a living rules document
either bloats until nothing in it is read (every agent pays the context cost, none of it lands), or
its rules drift out of sync with the canonical docs they were supposed to summarize. Both compound
brutally under a fleet: the document is booted by *every* agent, so a bloated or drifted index taxes
or misleads every dispatch, continuously.


## Why it's not just "write a good CONTRIBUTING.md / a README"

An ordinary project doc is **advisory and unenforced**: read at contributor discretion, edited by
hand, trusted to stay honest. CLAUDE.md is a mechanism because it inverts all three:

- **Binding, not advisory.** It is loaded into *every* agent's boot context by construction. It is
  the minimum shared world-model an agent executes against, not reference it might consult. (This is
  the same availability-vs-binding distinction as [dynamic-context-injection](../context-and-dispatch/dynamic-context-injection.md),
  applied to the whole index rather than a sliced subset.)
- **Enforced, not trusted.** Its enforcement counterpart holds the document to checks exactly as code
  is: a cap/bloat lint fails the build if the index grows past its scannable budget, and a
  rule-conformance lint fails if a rule stops cross-referencing its canonical doc.
- **Self-governing.** It carries its own admission rule, the three-part *earns-its-spot* test
  (regression-preventing **and** non-derivable-from-local-code **and** non-local), plus a router that
  sends anything failing the test to a sub-doc, an XML-doc comment, or an inline `WHY:`. The index
  governs *what may enter it*, which keeps the cap lint satisfiable without deleting real rules.

So what separates this from "a good doc"? Not prose quality. This document carries a budget, an
admission predicate, and lints that fail the pipeline; it is governed the way an artifact is governed,
because it is one.

## Mechanism

- **Stable-numbered index.** Each rule is a short boot-context statement + a cross-reference to the
  canonical deep doc that carries it in full ("CLAUDE.md carries the rule index; the sub-doc carries
  the principle"). Numbers are *stable, never renumbered*; they are cited by number across the
  codebase, so the index doubles as a **citable namespace** where each rule is addressable by a stable number.
- **The earns-its-spot test.** A rule belongs only if all three hold: (1) an agent touching unrelated
  code could accidentally violate it; (2) reading the local file wouldn't surface it; (3) it crosses
  files/subsystems. Anything else is routed out.
- **The hard counterpart (two lints).** A governance-doc bloat lint enforces the cap; the
  rule-conformance lint enforces the cross-reference discipline. Both are BLOCKING, so a bloating or
  drifting index fails the gate.

## Prerequisites

- A **boot-context loader** that injects the document into every agent; without this it is just
  another doc.
- A **budget + cap lint**, or the index bloats until it is unread. The cap is the forcing function
  that keeps every bullet paying its way.
- An **admission predicate** (the earns-its-spot test) and a **router** to somewhere-else, so keeping
  the index small doesn't mean losing rules; they relocate to sub-docs / code comments.
- A **cross-reference convention** (every rule → one canonical doc) plus a conformance lint, so the
  index stays a *map*, not a second copy that drifts.

## Consequences & costs

- **A hard budget means perpetual triage.** The cap is a fixed context budget, so admitting a new rule
  eventually means *evicting* one to a sub-doc. The index is never "done"; it is a continuously
  re-triaged working set, and the eviction call is judgment-heavy.
- **Presence ≠ obedience.** A rule being in the index does not make agents follow it; the index can
  claim a discipline that has quietly rotted. This is exactly why the
  [Epic DoD](epic-definition-of-done.md) re-runs owned lints/tests at HEAD rather than trusting the
  index: the meta-mechanism needs its own audit.
- **Stable numbering accretes history.** Never renumbering means retired rules leave gaps or tombstones;
  the citable namespace is durable but carries dead entries forever.
- **It taxes every dispatch.** The same load that makes it binding makes it a per-invocation cost across
  the whole fleet. The mechanism's benefit and its price are the same thing.

## Known uses

- `CLAUDE.md` — the numbered, stable-numbered rule index; boot context for every agent.
- The governance-doc bloat lint — the cap/bloat gate.
- The rule-conformance lint — enforces the per-rule canonical-doc cross-reference.
- The *"What belongs in this file"* meta-section — the self-governing admission rule and router.
- The [Epic Definition-of-Done](epic-definition-of-done.md)'s "trust nothing" re-run, which re-reads
  owned rules/lints at HEAD rather than trusting the index's claims: the audit that keeps the
  enforced document honest.

**Adopt it — the starter governance doc**, distilled from a real, mature CLAUDE.md:
[`CLAUDE-starter.md`](../../downloads/CLAUDE-starter.md). Part A is the portable *method* (the
principles the rules instantiate); Part B is a "write your own" scaffold for the numbered
project-reference rules, with the three-part "what earns a spot" admission test built in.

## Related mechanisms

- *See also (two lenses)* — [docs-hierarchy](../context-and-dispatch/docs-hierarchy.md): the *same
  artifact* seen as **dispatch-time shared context**. This entry is the **enforced-infrastructure**
  lens, the hard counterpart and the admission predicate that keep it from rotting.
- **Counterpart (audit)** — [epic-definition-of-done](epic-definition-of-done.md): a hard re-run that
  verifies the soft index's *claims* haven't rotted (presence ≠ obedience), complementing the cap/
  conformance lints that keep its *form* honest.
- **Consumer** — [dynamic-context-injection](../context-and-dispatch/dynamic-context-injection.md)
  reads this index as the corpus it slices, promoting the *relevant subset* into a specific brief.
- *See also (sibling)* — [mandatory-snippet-table](mandatory-snippet-table.md): another governance
  document enforced the same way (via [brief-linting](../context-and-dispatch/brief-linting.md) rather than a bloat lint).
- *See also (family)* — [doc-hygiene-lints](doc-hygiene-lints.md): the general family of
  "documentation with a hard-counterpart lint" this mechanism is the flagship of.
