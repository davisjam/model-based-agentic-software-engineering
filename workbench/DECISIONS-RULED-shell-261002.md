# RULED — the shell's four open questions

The author ruled G1–G4 of [`DESIGN-shell-261002.md`](DESIGN-shell-261002.md) §G on 261002. This file
records what was ruled and what each ruling forecloses, so an implementing wave cites a decision
rather than re-deriving one. The design's §G keeps its options and reasoning; nothing there is edited.

Three rulings took the design's recommendation. One — G2 — the author stated in their own words,
and it matches recommendation (a).

---

## G1 — ratified: a human affordance is a declared, verified path

> Under UX-I8, "human-accessible affordance" means **reachable by a declared, machine-verified
> navigation path from the default workspace** (§2.2).

**Ratified as recommended.** UX-I1's text in `requirements-ux-261002.md` §23 is unchanged; its human
half is now read this way.

What this buys, and why the reading was worth asking about: UX-I1 spent most of its life as an
author's assertion. 29 affordance sites were declared as strings and nothing bound them to the page,
so a control could be renamed or removed and the invariant stayed green — measured and written up in
[`BASELINE-a11y-261002.md`](BASELINE-a11y-261002.md) §6 F-3. That hole is now closed at the element
level (the type refuses a wired affordance with nowhere to be, and a blocking browser gate checks the
served page both directions). G1 extends the same discipline one step further out: not merely *does
the element exist*, but *can a person get to it*.

The alternative readings are foreclosed:

- **Existence-only parity with UX-I8 as advisory layout guidance** would have let progressive
  disclosure void the invariant. A control hidden three menus deep behind no declared route satisfies
  "exists" and fails every user.
- **Reachability as a new UX-I10** would put two numbers on one claim.

**Follows from this:** the `path` field, the `NavSurface`/`NavPrecondition` closed vocabularies, the
static checks, and the generated keyboard drives of §2.2–§2.3. Wave 1d builds them. The migration
§2.4 describes holds: the field lands optional with path-less wired affordances asserted as a known
set, each shell wave drains its own region, and the final wave flips it hard.

**The load-bearing half is the drive, not the declaration.** A declared path that nothing walks is
the same defect F-3 was — a sentence an author wrote. §2.3's rung 2 generates the keyboard drive
*from* the declaration, so a path that type-checks but no human can follow fails in the browser tier.
An implementing wave MUST NOT land the field without the drive.

---

## G2 — ruled: filter-only

> **"filter-only"** — the author, in their own words, matching recommendation (a).

The ask bar's typed text filters the deterministic question catalogue (suggested + contextual).
Unmatched text is answered by pointing at the coding agent or Advanced query. There is no template
matcher and no keyword-to-query inference.

This keeps natural language where the architecture puts it. A bar that silently matched English into
a formal query would fabricate precision the engine never had — and this project has already shipped
one fabrication of exactly that family: a `latency` query over a system declaring no quantities
answered `holds` with magnitude `0 ms`, a figure that *looked measured*
([`DECISIONS-RULED-model-types-261002.md`](DECISIONS-RULED-model-types-261002.md) Ruling 3). The
anti-pattern is the same: producing a confident answer the substrate does not support.

**Foreclosed:** the conservative template matcher (b), whose refusals would read as bugs and whose
supported-form list is a maintenance magnet; and display-only text (c), which reads as a broken input
and contradicts the spec's own sketch.

**Wave 1c** builds the filter. It owns no parser.

---

## G3 — ruled as recommended: interpose only when a requirement would flip

A direct human edit that would flip a plain tracked **property** commits and announces the moved
verdict, with undo one keystroke away. A direct human edit that would flip a **requirement** — an
expectation-bearing property — interposes the REVIEW CHANGE surface before commit.

This tracks the distinction the author drew in the spec's own lifecycle: *ask → query → Track as
property → persistent property → Make requirement → enforced obligation*. An obligation is the thing
you asked to be told about before breaking; a property is the thing you asked to watch.

The cost is one hypothetical pre-evaluation, and only when expectations exist. It also gives the
review surface its second user — agent hypotheses being the first — which is what keeps that surface
from being machinery with one caller.

**Foreclosed:** commit-and-announce for everything (a), which turns a violated obligation into an
after-the-fact FYI — the thing the author explicitly distinguished from "blocked". And interposition
for every property-touching edit (b), which needs a dependency question the kernel does not answer
today (*which edits could affect which properties*); the design notes that conservative
re-evaluation of everything would be the honest v1 if (b) were ruled, and it was not.

**Wave 2c** builds it. Note the pre-evaluation path is real machinery the engine already supports:
a consequential edit transparently becomes a short-lived hypothesis.

---

## G4 — ruled as recommended: no pointer drag gestures this pass

The canvas gets selection, a context menu, and a blank-space `+ Add` menu. It does **not** get
drag-to-connect.

Every operation already has a non-canvas path, so canvas gestures are redundant affordances. Under
G1 that redundancy is not free: a new affordance must declare a verified path and carry keyboard
parity, and drag-connect is the one gesture with no natural keyboard analogue — it would need a
parity story invented for it.

**Foreclosed:** (b). The design estimated it extends wave 2b by roughly its own size, and it would
introduce the first pointer-only input. Worth recording the design's own caveat: the parity story
*could* have stayed intact — `canvas.connect` would register beside the dialog affordance — but it
would have had to be **said**, and under G1 it would now also have to be walked.

**Wave 2b** builds selection and the menus.

---

## What remains the author's

Not ruled here, and not blocking the shell waves:

- **Q1 — interval arithmetic, or worst-case bounds only?** Open; blocks the Phase I quantitative
  analysis, not the shell. Document Processing already declares a range (`Model Gateway 100–500 ms`),
  so the engine must decide what a path sum does with it. Interacts with Q5 (outcome shape for an
  unbounded additive maximum). See [`DESIGN-quantities-261002.md`](DESIGN-quantities-261002.md).
- **Q9 — is "run arbitrary SPARQL" a semantic capability under UX-I1?** Open; recommended no.
  Note G1 sharpens the stake: under the ratified reading, a capability needs a declared, walked path,
  so answering yes obliges a human route to arbitrary SPARQL rather than merely admitting one exists.
- **Accounting basis placement.** Reviewed 261002 and found to be the degenerate case rather than a
  divergence: the ruling says "per quantitative model", the code puts `accounting:` at the top level,
  and v0.1 has exactly one quantitative model per system — so they name the same place.
  `src/ir/types.ts:588` records the condition and commits to moving the declaration when quantities
  become model-scoped. No action taken; pre-nesting a one-element map today was judged ceremony.
