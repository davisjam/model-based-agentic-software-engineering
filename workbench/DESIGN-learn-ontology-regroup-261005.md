# Design — Learn: a four-group ontology for the walkthrough

**Base:** `0367915d0` ("workbench Learn: from encyclopedia to lesson + clickable walkthrough"),
tree clean. **Baseline measured here, not quoted:** `npm run check` exit 0; `npm run check:parity`
→ `UX-I1: 0 violation(s) over 26 capabilities`; `npm run test` **1400 pass / 0 fail / 0 skipped /
0 todo**.

**Author's direction, 261005.** The walkthrough ships sixteen flat steps. They teach the right
material in the wrong order: a student meets entities before learning what a model is *for*, and
meets "Multiple models" at step 12 as a late reveal rather than as the reason the earlier model
types were introduced separately. The instruction is to regroup into four named groups of fourteen
steps, so that the navigation itself teaches the structure, and to give each model-type step a
shared rhetorical card.

The target: *within about two minutes, a student knows why models exist, the three model forms the
Workbench gives them, the characteristic question each answers, and why they might need several.
Everything afterward elaborates that map rather than revealing it piecemeal.*

---

## §1. The four groups

| Group | Steps | The story the group tells |
|---|---|---|
| **Models** | 1–5 | what a model is for, the three forms, and why one is sometimes not enough |
| **Asking models** | 6–10 | ask → get evidence → save → oblige → refuse when unsupported |
| **Working with models** | 11–13 | change a model; make two models correspond; use one to constrain an analysis over another |
| **Agents** | 14 | the same capabilities, reached by a non-human caller |

---

## §2. Step map — sixteen to fourteen

`anchor` values are the page's stable link targets; a changed anchor breaks an inbound link, so
the column is stated explicitly rather than left to the implementer.

| New | Title | Anchor | From | Disposition |
|---|---|---|---|---|
| **Models** |
| 1 | Purpose and omissions | `walk-purpose` | old 3 | **moves to first.** Unchanged content; it is the step that says what a model is *for*, so nothing should precede it |
| 2 | Structural models | `walk-structural` | old 1 + old 2 | **merge.** Entities and relationships become one step with the card; both old definitions survive inside it |
| 3 | Behavioral models | `walk-behavioral` | old 4 | rename + card |
| 4 | Quantitative models | `walk-quantitative` | old 10 + old 11 | **merge.** Quantities and quantitative questions become one step with the card |
| 5 | Combining models | `walk-combining` | old 12, re-aimed | **replaces "Multiple models".** See §4 — this is the step that changes most |
| **Asking models** |
| 6 | Questions | `walk-questions` | old 5 | unchanged |
| 7 | Evidence | `walk-evidence` | old 6 | unchanged |
| 8 | Properties | `walk-properties` | old 7 | unchanged |
| 9 | Requirements | `walk-requirements` | old 8 | unchanged |
| 10 | Model boundaries | `walk-boundaries` | old 15 | **moves earlier.** It is the "refuse when unsupported" beat that completes this group's story |
| **Working with models** |
| 11 | What-if changes | `walk-changes` | old 9 | unchanged — anchor stays `walk-changes`, not renamed |
| 12 | Bindings | `walk-bindings` | old 13 | unchanged |
| 13 | Composition | `walk-composition` | old 14 | unchanged |
| **Agents** |
| 14 | Agents | `walk-agents` | old 16 | unchanged |

**Net:** sixteen steps become fourteen by two merges (1+2, 10+11). No step's *material* is
deleted. "Multiple models" is retired as a standalone title; its job moves up to step 5 and its
mechanics stay in steps 12 and 13.

---

## §3. The model-type card

Steps 2, 3, 4 and 5 carry a card in one shape. The card is **declared** page furniture, like the
step title; the `Ask:` line names a saved query whose answer the view computes at build time, the
same as every other fact on the page.

```
<Model type>
Represents <what it represents>
Ask: <the characteristic question>
```

| Step | Represents | Ask |
|---|---|---|
| 2 Structural | entities and relationships | Can Fulfillment be reached from Checkout? |
| 3 Behavioral | states and transitions over time | Can a proposed change reach Refused? |
| 4 Quantitative | quantities associated with an execution | Does the firmware fit within 256 KiB of SRAM? |
| 5 Combining | separate purposes preserved, while supporting questions that need more than one model | What is the worst-case latency among executions that reach Published? |

### 3.1 Every `Ask:` resolves to a shipped question — verified, not assumed

Learn's contract is that no fact on the page is authored. Each card's `Ask:` is therefore a
`grounding` entry resolved by `test/learn-walkthrough.test.ts` against the corpus, exactly as
existing steps are. The four were checked against the shipped corpus at this base:

| Card | Shipped id | Example | Pinned expectation |
|---|---|---|---|
| Structural | `checkout-event-reaches-fulfillment` — *"Events originating at Checkout eventually reach Fulfillment"* | `message-bus` | `holds`, `exhaustive`, path witness `[checkout, order-created, billing, payment-completed, fulfillment]` |
| Behavioral | `transaction-can-be-refused` — *"A proposed change can reach Refused"* | `transaction-workspace` | `holds`, `exhaustive`, trace witness, `min_steps: 2`, final `transaction-lifecycle.state: refused` |
| Quantitative | the SRAM budget question already driven by old step 11 | `embedded-sensor-node` | the declared `sram-budget` ceiling of 256 KB |
| Combining | `max-latency-among-successful-executions` — *"The executions that publish have a determinate maximum modeled latency"* | `document-processing` | `holds`, `exhaustive`, `models: [document-lifecycle, pipeline-performance]` |

**A correction made during this design, worth keeping because it would have failed the suite.**
The obvious-looking id for this card is `max-publishing-latency` — *"What is the maximum modeled
latency of a document that eventually publishes, including permitted retries?"* — and it reads like
the card's `Ask:` almost verbatim. It is **not a saved query**. It is a `hand_derived: true` metric
entry carrying `trace_from` and `bound: high`: the independently-derived control value that the
suite checks the engine's answer against. `StepGrounding`'s `query` kind resolves against saved
queries, so grounding the card on it would have turned `test/learn-walkthrough.test.ts` red.

The runnable composition is `max-latency-among-successful-executions`, which declares both models
and is `suggested: true` — a behavior predicate selecting the executions a quantitative query
measures, which is exactly the one composition the Workbench supports. The sibling
`max-latency-of-any-execution` is its unrestricted twin and stays where it is, in step 13, where the
pair is the teaching point.

No new fixture is required and no example is modified. **If an implementer finds one of these ids
absent at their HEAD, stop and report rather than authoring a replacement question** — an invented
`Ask:` would put the one thing on this page that the page promises never to contain.

---

## §4. Step 5, "Combining models" — the step that carries the new weight

The author's constraint: *give one intuitive composed example here, without yet teaching
binding/composition machinery.*

`message-bus` ships the ideal pair, and it is the reason this step can be honest without being
early. The **same question** is asked of two models:

| Model | Question id | Outcome |
|---|---|---|
| `event-flow` | `subscribes-chain-checkout-to-fulfillment` — *"Fulfillment is reachable from Checkout through a chain of subscriptions"* | **`unlicensed`** — *"not licensed by this model"* |
| `event-propagation` | `checkout-event-reaches-fulfillment` | **`holds`**, with the four-hop witness |

The corpus's own note on the first is the teaching point, and should be paraphrased rather than
quoted at length: `unlicensed` is a **successful** result reporting what the model does not
authorize. It is emphatically not `refuted`, which would assert no such chain exists — a claim
`event-flow` never made.

So step 5 shows a student one question, two models, two different kinds of honest answer. That
motivates "you may need more than one model" from a case the student can see, names `unlicensed`
as a first-class outcome, and sets up both later steps without teaching either: step 12 (Bindings)
says *these elements correspond*; step 13 (Composition) says *use one model to constrain an
analysis over another*.

The card's `Ask:` is `max-latency-among-successful-executions`, a genuine behavior × quantity
composition: a latency maximum taken over only those executions a behavioral predicate selects.
That is composition stated as a question a student already wants answered, which is why it belongs
on the card while the machinery stays in step 13 — where it is taught against its unrestricted
twin, `max-latency-of-any-execution`.

---

## §5. What changes in code

Footprint is `src/learn/**` plus `test/**`. Disjoint from any wave touching `src/engine/**`,
`examples/**`, or the handbook.

1. **`src/learn/walkthrough.ts`** — add a `WalkGroup` declaration (four groups, each with a title
   and the ordered anchors it contains) and an optional `card` field on `WalkStep`
   (`{ represents, ask }` where `ask` is a grounding reference, not a string answer). Re-order and
   merge `WALKTHROUGH_STEPS` per §2. The module docstring's "one declaration per step" sentence
   needs a clause for groups.
2. **`src/learn/walkthrough-view.ts`** — render group headings, render the card, and keep every
   fact derived through the existing seams (`renderView`, `runQuery`,
   `Workspace.openHypothesis`). **No new rendering or evaluation path** — the UNIFY rung the Learn
   wave established is a property to preserve, and `test/import-graph.test.ts` holds the edge set.
3. **`learn.html` / the jump grid** — the sixteen-tile grid becomes four labelled groups. The grid
   is the navigation that is supposed to teach the structure, so the group titles must be visible
   there, not only in the body.
4. **`test/learn-walkthrough.test.ts`** — resolve each card's `ask` grounding against the corpus;
   assert the group partition is total and disjoint (every step in exactly one group, no group
   empty). The partition assertion is the cheap control that catches a step added later with no
   group.
5. **`test/browser/learn-walkthrough.test.mjs`** — the student-path tests reference step anchors;
   update for the renamed anchors in §2.
6. **`test/browser/a11y/axe.test.mjs`** — group headings add heading levels. The Learn wave already
   hit `landmark-unique` on repeated budget names; a new heading tier is the same class of hazard
   and wants its a11y state re-run, not assumed.

### 5.1 Anchors that change

The sixteen shipped anchors were enumerated from `walkthrough.ts` at this base, not recalled:

```
walk-entities  walk-relationships  walk-purpose  walk-state-machines  walk-questions
walk-evidence  walk-properties  walk-requirements  walk-changes  walk-quantities
walk-quantitative-questions  walk-multiple-models  walk-bindings  walk-composition
walk-boundaries  walk-agents
```

**Six retire, four are born, ten are kept — and 10 + 4 = 14, which is the step count §2 claims.**
The arithmetic is stated because it is the cheapest check that §2's table and this section agree:

| Retired | Becomes |
|---|---|
| `walk-entities`, `walk-relationships` | `walk-structural` |
| `walk-state-machines` | `walk-behavioral` |
| `walk-quantities`, `walk-quantitative-questions` | `walk-quantitative` |
| `walk-multiple-models` | `walk-combining` |

The other ten — `walk-purpose`, `walk-questions`, `walk-evidence`, `walk-properties`,
`walk-requirements`, `walk-changes`, `walk-bindings`, `walk-composition`, `walk-boundaries`,
`walk-agents` — keep their anchors; only their ORDER changes. Renaming an anchor whose step is
otherwise unchanged would break inbound links for no gain.

Every reference to a retired anchor — in `learn.html`, in the reference sections' `more` links, in
the browser tests — must move in the same change. `grep -rn 'walk-' src/ test/ *.html` is the
completeness check.

---

## §6. Gates

Per the repo's merge discipline, measured on the **merged** tree and never quoted from this
document: `check`, `check:parity`, `test`, `build`, plus `test:browser` and `test:a11y` because
this reaches the page. The baseline to beat is the one at the head of this file.

## §7. Out of scope

The reference material below the walkthrough keeps its literal headings and its
"Implementation and provenance" disclosure. This design regroups the **walkthrough**; the
encyclopedia underneath is unchanged, and `Multiple models` survives there as reference material
even though it is retired as a walkthrough step.
