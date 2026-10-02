# MAGE Model Workbench — semantic specification

**Status:** frozen kernel for v0.1. Everything in this document is implementable without an LLM, an
SMT solver, or a server. Anything not described here is not part of v0.1 semantics.

This is the authoritative semantics. The JSON Schemas beside it
([`mage-model.schema.json`](mage-model.schema.json), [`mage-query.schema.json`](mage-query.schema.json),
[`mage-transaction.schema.json`](mage-transaction.schema.json)) constrain *shape*; this document
fixes *meaning*. Where a question is about what a model asserts, this file decides it.

Validation rules are numbered **V1…V25** so implementations, tests, and error messages can cite them.

---

## 1. The governing principle: complexity is opt-in

> **A model has the simplest execution semantics consistent with what it explicitly represents.**

A single state machine does not introduce concurrency. Two machines introduce interleaving.
Synchronization exists only where an event is declared. Multiplicity exists only where instances are
declared. Binding between instances does not exist in v0.1 at all.

This is not only an implementation convenience. A tool that forces a modeler to represent
distinctions their question does not require is working against purposeful reduction. The semantic
tiers below are therefore *additive*, and each is visible on the page:

| Tier | Introduced by | Execution semantics |
|---|---|---|
| **T1** | one `machines:` entry | an ordinary finite transition system |
| **T2** | a second `machines:` entry | interleaved product; one machine steps per step |
| **T3** | an `events:` declaration + `sync:` on transitions | declared events step their participants jointly |
| **T4** | `instances: N` on a machine | N independent interleaved copies |

**Syntactic visibility (V1).** `sync:` means synchronization and nothing else; it MUST resolve to a
declared event in `events:`. Free-text documentation of a transition goes in `label:`. Therefore
"does this model contain joint steps?" is answerable by looking for `sync:`.

The key is `sync:` and **not** `on:` for a concrete reason: YAML 1.1 implicit-types a bare `on` key to
boolean `true`, so `on: acquire` loads as `{True: 'acquire'}` and the synchronization silently
disappears. See §10.1.

---

## 2. Identity

There is exactly **one identity namespace**: `entities`.

```yaml
entities:
  remediation:
    type: service
    label: Remediation Service
```

- **Ids are immutable (V2).** No operation changes an id. `set-label` changes the human-readable
  `label`; references always use the id. An id's absence from the system after a transaction is a
  deletion, never a rename.
- **Models reference entities; they never redeclare them (V3).** A `graph` model lists ids under
  `entities:`; every id MUST resolve to a system-level entity.
- Containment is declared on the entity (`contains: [...]`) and yields hierarchical paths
  (`docable/remediation/parser`). Containment MUST be acyclic (V4) and single-parent (V5).

**Machines are not entities.** A state machine has *behavioral* identity; it need not model a
component of a structural model. Where the correspondence does exist, declare it:

```yaml
machines:
  remediation-lifecycle:
    entity: remediation      # optional
```

`entity:` MUST resolve to a declared entity (V6). Selecting that entity then highlights its machine,
and vice versa. Absent `entity:`, a machine is simply an automaton the system contains — which is the
honest description of most behavioral models.

---

## 3. Graphs: entities and typed relations

```yaml
relation-types:
  data_flow:
    description: Data may flow directly from source to target.
    absence: No direct data flow is represented by this model.
    composition:
      path: allowed
    properties:
      symmetric: false
      acyclic: false

models:
  service-flow:
    type: graph
    entities: [api, remediation, gateway]
    relations:
      - id: api-remediation
        from: api
        to: remediation
        type: may_invoke
```

The workbench assigns **no** universal meaning to a relation type. `description` and `absence` are
for humans. The only machine-readable semantics are these:

### 3.1 Path composition is declared, not assumed

`composition.path` is `allowed` or `forbidden`. It governs whether a **multi-hop** query over that
relation type is licensed.

This is deliberately *not* a claim that the relation is transitive. `calls` is not transitive — if A
calls B and B calls C, A does not call C — yet "can A reach C through calls?" is a perfectly
meaningful derived question. `composition.path: allowed` says the transitive closure is a licensed
object of inquiry; it does not add edges to the model.

**V7.** A `path`, `reachability`, or `shortest-path` query over a relation type with
`composition.path: forbidden` MUST be refused, not answered:

> `owns` is declared as a direct relation without path-composition semantics. A multi-hop `owns`
> query is not licensed by this model.

Refusal is a successful query outcome (`outcome: unlicensed`), not an error. Being told that a
question is not answerable from a model is information.

**V8.** `properties.acyclic: true` makes a cycle in that relation type a validation error.
`properties.symmetric: true` means the engine treats each edge as bidirectional for traversal; it
does not require a reverse edge to be declared.

---

## 4. State machines

```yaml
machines:
  document:
    initial: uploaded
    states:
      uploaded:
      processing:
      reviewed:
      published:
      failed:
    transitions:
      - from: uploaded
        to: processing
        label: start
      - from: processing
        to: failed
        label: fail
```

- `initial` MUST name a declared state (V9); `from`/`to` MUST name declared states (V10).
- **Nondeterminism is allowed and required.** Several transitions may leave the same state under the
  same conditions; they are alternatives, and exhaustive analysis explores all of them. This is what
  makes "may fail" expressible.
- A machine with no `sync:` and no guards is a plain transition system (T1).

### 4.1 Guards

```yaml
    transitions:
      - from: processing
        to: reviewed
        requires:
          worker.state: held
          retry_count: { lt: 3 }
```

- A guard is **evaluated against the pre-transition system state**, atomically with the transition it
  gates.
- **A guard is not synchronization.** It *reads* another machine's state without causing that machine
  to step. This distinction is load-bearing and routinely conflated: `sync:` makes two machines move
  together; `requires:` lets one machine look at another and move alone.
- Consequently, an interval during which another machine may intervene **cannot** be expressed by a
  guard. If you need to represent check-then-act exposure, represent the interval as states and
  transitions. That is a modeling obligation, not a tool limitation.
- **V11.** A guard referencing a machine with `instances: N > 1` MUST be refused, for the same reason
  as V14 — there is no participant selection in v0.1.

### 4.2 T2 — interleaving

Two or more machines form an interleaved product. The configuration is the tuple of machine states
plus all variable valuations. **One enabled transition of one machine executes per step.** No
scheduler, no fairness, no priority.

That alone answers the first genuinely interesting class of question — *can `document=processing` and
`worker=idle` hold simultaneously?* — with no synchronization machinery at all.

### 4.3 T3 — declared synchronized events

```yaml
events:
  acquire:
    participants: [document, worker]

machines:
  document:
    transitions:
      - from: waiting
        to: processing
        sync: acquire
  worker:
    transitions:
      - from: idle
        to: held
        sync: acquire
```

A declared event is **one system transition involving all its participants**. Semantics:

1. The event is enabled iff **every** participant has an enabled `sync:`-transition for it in the
   current configuration (guards evaluated against the pre-state).
2. All participants' effects apply **atomically**; the intermediate state is not observable and
   cannot be queried.
3. **V12.** Every machine named in `participants` MUST declare at least one transition `sync:` that
   event, and every transition's `sync:` MUST name an event listing that machine as a participant.
   A participant that never participates is a modeling error, not a silent no-op.
4. **V13.** Two transitions joined by one event MUST NOT assign the same variable. Conflicting
   writes in a single atomic step are a validation error, detected statically from declared effects —
   not resolved by an arbitrary winner at runtime.

### 4.4 T4 — multiplicity, and what it deliberately does not give you

```yaml
machines:
  worker:
    instances: 3
```

`instances: N` yields N **independent** copies, `worker[0] … worker[2]`, whose transitions interleave.
Default is 1, and a machine with one instance is addressed by its bare name.

**V14 — participant selection is unsupported.** An event whose `participants` include a
multiply-instantiated machine MUST be refused at validation:

> `acquire` synchronizes with multiply-instantiated machine `worker`. Participant selection is not
> supported by this version. Model the participants explicitly, or use a single `worker` instance.

This is the honest boundary. Multiplicity gives **occupancy**, not **binding**:

- Answerable: *can two workers be `held` at the same time?* — a predicate over the product, with a
  witness trace.
- **Not** answerable: *can two workers hold the same document?* — "the same document" is a relation
  between instances, and v0.1 has no instance-valued state.

**Modeling around it.** Where binding genuinely matters, model the resource rather than the holders:
a single lock machine with states `free | held_by_0 | held_by_1` is finite, exhaustively analyzable,
and says exactly what it means. Prefer that to reaching for `instances:`.

**Reserved, not implemented.** This shape is legal to write and MUST be rejected by v0.1 with a
"reserved for a future version" message rather than misinterpreted (V15):

```yaml
variables:
  holding:
    type: ref
    target: document
    nullable: true
```

**Symmetry.** N independent copies of one machine type make configurations that differ only by
permuting identical instances equivalent. v0.1 need not exploit this; it is the obvious first
optimization if the state limit becomes a practical ceiling.

---

## 5. State: three categories with a hard boundary

```yaml
properties:               # immutable descriptive facts — NOT state
  region: us-east
variables:                # mutable — contributes to the state vector
  retry_count:
    type: integer
    range: [0, 3]
derived:                  # pure expressions over current state — NOT state
  exhausted: retry_count == 3
```

- **`properties` are immutable (V16).** No transition may assign one. They describe; they do not vary.
  They participate in graph and cross-model queries, never in the state vector.
- **`variables` are the state vector.** Every variable MUST have a **finite domain** in v0.1 (V17):
  bounded integer `range`, Boolean, or enum. No unbounded integers, no reals. This is what makes
  exhaustive exploration meaningful rather than aspirational.
- **`derived` values are never stored and never part of state identity (V18).** They are recomputed
  from the current configuration. Storing them would both inflate the product and allow two
  configurations with identical variables to compare unequal. The derived dependency graph MUST be
  acyclic (V19).

Domains are declarable and may be ordered:

```yaml
domains:
  sensitivity:
    type: ordered-enum
    values: [public, internal, restricted]
```

**V20.** Comparison operators (`<`, `>`, `<=`, `>=`) between two properties are well-typed only if
both declare the **same** domain and that domain is ordered. This is what makes the cross-model
security join legal:

```yaml
entities:
  remediation: { properties: { classification: restricted } }   # domain: sensitivity
  gateway:     { properties: { accepts: public } }              # domain: sensitivity
```

`classification > accepts` now typechecks. Partial orders and lattices are deliberately out of scope
until incomparable elements are actually needed.

---

## 6. Execution semantics, precisely

A **configuration** is `(control, values)` where `control` maps each machine instance to one of its
states and `values` maps each variable to a value in its finite domain. The initial configuration
takes each machine's `initial` and each variable's declared initial value.

A **step** from configuration *c* is one of:

- a **local** transition: some instance has a transition with no `sync:`, whose guards hold in *c*;
  that instance moves and its effects apply.
- an **event** step: some declared event has every participant offering an enabled `sync:`-transition
  in *c*; all participants move and all effects apply atomically.

The **reachable set** is the least set containing the initial configuration and closed under steps.
There is no fairness, no priority, and no notion of time. A configuration with no enabled step is a
**dead end** and is reported as such, not treated as an error.

---

## 7. Queries

Every query carries an explicit **quantifier**. This is not a stylistic choice: it determines what
counts as evidence, and conflating the two is the single most common modeling error the workbench
exists to make visible.

| Claim | `holds` is established by | `refuted` is established by |
|---|---|---|
| **∃** a trace satisfying *P* | a **witness** trace | **exhaustive absence** |
| **∀** reachable configurations satisfy *P* | **exhaustive satisfaction** | a **counterexample** |

Under bounded coverage neither column is available and the outcome is `inconclusive` (V22).

**V21.** A natural-language question that does not determine its quantifier MUST either request
clarification or display the interpretation it chose:

> I interpreted this as: *does there exist an execution in which `S` occurs before `T`?*

### 7.1 Coverage is part of every result

```yaml
outcome: refuted
coverage:
  kind: exhaustive
  states_explored: 37
```

```yaml
outcome: inconclusive
coverage:
  kind: bounded
  states_explored: 1000000
  reason: state-limit
```

**The outcome vocabulary is `holds | refuted | inconclusive | unlicensed` — deliberately not
`true`/`false`.** Two reasons, and both matter. Semantically, there is no boolean result: there is a
claim, its coverage, and its evidence, and naming the status `true` invites exactly the
`result: boolean` shortcut the result type exists to prevent. Mechanically, a bare `true` or `false`
in YAML is implicit-typed to a boolean (§10.1), so `expect: false` in a saved query arrives as a
Python/JS boolean and silently matches nothing. That bug was found by this spec's own gate, which is
the argument for V25 in miniature.

**V22 — incomplete coverage weakens conclusions drawn from ABSENCE, never evidence already found.**

> Incomplete coverage prevents conclusions that depend on the absence of settling evidence. It does
> not weaken settling evidence that has been found.

**Settling evidence** is a **witness** for an existential claim or a **counterexample** for a
universal one. Either establishes its claim on its own terms, because further search cannot unfind
it. So:

| | settling evidence found | none found |
|---|---|---|
| **∃** | `holds` — regardless of coverage | `refuted` iff exhaustive, else `inconclusive` |
| **∀** | `refuted` — regardless of coverage | `holds` iff exhaustive, else `inconclusive` |

Only the right-hand column depends on coverage, and that is the whole of V22. "No such trace exists"
is sound only under exhaustive coverage; under a bound the true statement is "no such trace within
the explored region", which is `inconclusive` and MUST NOT be rendered as "no".

The principle is stated generally rather than as a rule about bounded search, because it travels:
any future incompleteness — a time limit, a depth limit, a sampling strategy, an abstraction — has
the same shape.

The state limit is a **v0.1** concern, not a later one. Finite domains do not bound the product
*usefully*: two machines, three instances and one `[0,10]` variable already reach millions of
configurations.

### 7.2 Evidence shapes

- **trace** — a finite sequence of steps from the initial configuration.
- **lasso** — a finite prefix plus a repeating segment. Implementations MUST support both shapes from
  the start rather than retrofitting the second.

### 7.2a Two cycle questions, two forms — a query denotes a question, not a search strategy

`recurrence` and `repeatable-cycle` both produce a lasso, and they are deliberately distinct:

| Form | Asks | Holds when |
|---|---|---|
| `recurrence` | *Can the system return to S?* | the target is **re-entered**: a target configuration, ≥1 step, another target configuration |
| `repeatable-cycle` | *Can it loop indefinitely from S?* | a **configuration genuinely repeats**, which is what makes a cycle repeatable |

The worked example shows why one form cannot serve both. `document-can-return-to-waiting` asks about
a retry loop that advances `retry_count`, so `(waiting, 0)` … `(waiting, 3)` are four *distinct*
configurations and none ever repeats. The honest answers are therefore **`recurrence`: holds** (it
demonstrably returns) and **`repeatable-cycle`: refuted** (it cannot run forever).

An earlier design made `recurrence` search for a true cycle first and fall back to re-entry, saying
which it had done. That is **forbidden**: it lets one query mean two different things depending on
what the search happened to find, so a reader cannot tell from the query what was asked. Each form
has exactly one denotation, and `recurrence` discloses nothing because it substitutes nothing.

This is the same distinction the quantitative rules draw: a strictly-advancing loop is not a
repeatable cycle, which is why it cannot make an additive maximum unbounded.

### 7.3 Past-time properties compile to safety

"Can `published` occur without `reviewed` having occurred?" is a past-time property. v0.1 does **not**
implement past-time operators. Such a query is compiled into a safety property over an auxiliary
**history variable**: a Boolean `seen_reviewed`, set on entry to `reviewed`, with the invariant
`published → seen_reviewed`.

**V23.** The compilation MUST be disclosed in the result:

> I added a history variable `seen_reviewed` to answer this.

The engine is therefore safety-plus-reachability only. **Fairness is unsupported**, so reachability
("can it reach `published`?") is in scope and liveness ("will it eventually publish?") is not — the
latter is not established without fairness assumptions, and the workbench must say so rather than
guess.

### 7.4 Queries are persistent artifacts

Saved queries live in the model system and re-run when the model changes. Engineering questions
become versionable alongside the models that answer them.

---

## 8. Purpose: what a model represents, and what it declines to

```yaml
models:
  service-flow:
    question: Which services may invoke which other services?
    represents: [service identity, permitted invocation]
    omits: [observed runtime calls, request payloads, call frequency, latency]
```

This supports the most distinctive query outcome in the workbench — **"cannot be answered from this
model"** as a *successful* result:

> No. This model represents permitted invocation but deliberately omits payloads. You would need a
> data-flow model, or payload semantics added here.

**V24 — `omits` is checked, not asserted.** `represents` and `omits` draw from the model's actual
vocabulary (property names, relation types, state names, variable names). A name listed in `omits`
that nevertheless appears in the model is an **error**; a name in `represents` that does not appear is
a **warning**.

Without V24 this feature decays into prose that rots: a model declaring `omits: [payloads]` while
carrying a `payload` property will confidently tell a student it cannot answer a question it can.
Checked, "cannot answer" becomes a derived claim with the same standing as every other analysis
result.

### 8.1 Correspondence and provenance

```yaml
provenance:
  subject:
    kind: repository
    ref: src/services/remediation
  correspondence:
    kind: asserted          # asserted | checked | derived | generated
    checked: 2026-10-02
```

`kind` names how the correspondence between model and world was established. v0.1 permits `asserted`
and optional opaque references; the stronger kinds are the natural place for later tooling to earn
trust rather than claim it.

---

## 9. Agent protocol

```json
{
  "transaction": {
    "base": "sha256:…",
    "target": "main",
    "operations": [
      { "op": "set-label", "id": "service/remediation", "value": "Remediation Engine" },
      { "op": "add-transition", "machine": "document", "from": "processing", "to": "reviewed" }
    ],
    "semantics": { "atomic": true }
  }
}
```

Application order is fixed: **parse → verify `base` → apply to a temporary IR → validate the entire
resulting system → commit.** Any failure leaves the current system byte-identical.

- **`base` is a hash of the canonical IR, never the file bytes.** Comments and formatting are
  preserved on write (§10), so hashing the file would invalidate every pending transaction on a
  cosmetic edit.
- **`base` mismatch is a loud failure**, never a best-effort merge. An agent that computed a change
  against a system the user has since edited has to recompute it.
- Transactions are all-or-nothing and reversible, which yields undo/redo and an agent audit trail
  from the same mechanism.

The agent returns one of three things:

```ts
type AgentResult = Transaction | Query | Clarification;
```

`Clarification` matters: an agent that cannot determine a quantifier (V21) or a participant should ask
rather than guess. The agent's context carries the current system hash, the target branch or
hypothesis, the current selection, and the conversation so far — a single-shot `propose(system,
request)` cannot express "instead, success should move it to reviewed," which is the interaction the
workbench is for.

---

## 10. Persistence

- `.mage.yaml`, with JSON as an equivalent serialization of the same schema.
- **Comments and key order are preserved across tool writes.** Use a concrete-syntax-tree YAML
  library; parse-to-object-and-restringify is not acceptable for a representation advertised as
  Git-friendly and human-edited.
- The exported file is the portable source of truth. Browser storage is convenience state only.

### 10.1 YAML implicit typing is a correctness hazard, not a style issue

YAML 1.1 — which PyYAML and many other loaders implement — coerces several bare scalars to
non-strings. For a tool whose central artifact is a *state machine*, this is not a footnote:

| Written | Loads as |
|---|---|
| `on: acquire` | `{True: 'acquire'}` |
| `initial: off` | `{'initial': False}` |
| `states: {on:, off:}` | `{'states': {True: None, False: None}}` |
| `checked: 2026-10-02` | a date object, which JSON cannot represent |

A light switch with states `on` and `off` is the most natural state machine a student will ever write,
and it is destroyed before any schema sees it. Two consequences are therefore normative:

**V25 — reject ids that the loader would coerce.** Any entity, machine, state, event, variable or
domain id matching YAML's implicit-boolean or implicit-null set — `on`, `off`, `yes`, `no`, `true`,
`false`, `null`, `~`, and case variants — or which parses as a number, MUST be rejected at validation
with a message naming the cause:

> State id `off` would be read as boolean `false` by a YAML 1.1 loader. Rename it (`switch_off`), or
> quote it everywhere it appears. The workbench refuses it rather than risk loading a different model
> than you wrote.

Refusing is the honest choice: quoting works but depends on every future hand-edit remembering to do
it, and a silently coerced state id produces a model that validates and means something else.

**Dates and times are quoted strings.** JSON, the equivalent serialization, has no date type. Writers
MUST emit them quoted; readers MUST NOT rely on loader date coercion.
- Validation errors name the path and the cause: `document.transitions[4] references unknown state
  'approved'` — never merely "invalid YAML."

---

## 11. Non-goals for v0.1

UML or SysML compliance; arbitrary diagramming; code generation; reverse engineering; OCL; BPMN;
sequence diagrams; requirements management; collaborative editing; accounts; cloud storage; general
simulation; **fairness and liveness**; **past-time temporal operators**; **instance binding**;
**participant selection**; real-valued or unbounded variables; SMT.

Each of the last six is a deliberate, named limitation rather than an oversight, and each has a
refusal message so a user meets a clear boundary instead of a wrong answer.

---

## 12. Implementation boundary

The analysis engine runs in a **Web Worker** from the first commit. The UI owns editing, layout and
rendering; the worker owns state-space construction and query execution. Saved queries re-run on
change, and product exploration on the UI thread would freeze the tab.

**Layout stability is an acceptance criterion, not a polish item.** Stable ids feed deterministic
placement; existing positions are strong hints for incremental layout; a hypothesis renders on the
*same* layout with added, deleted and changed elements visually distinguished. The core interaction is
comparing before against after, and that comparison is unreadable if one added state re-ranks the
whole graph.
