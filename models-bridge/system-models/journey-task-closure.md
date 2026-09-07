# Journey task-closure (type the terminal post-condition, derive its strength)

**Intent** — Type a journey's terminal post-condition as a boolean expression over reusable,
accessibility-observable leaf-predicates, derive a closure-strength verdict from the expression, and hold
that every major journey derives `TASK_CLOSED` — so a journey test can no longer green while the user's
task is broken (our instance: a typed `closure` block on the `Journey` entity whose leaves subclass a
standard predicate library, from which a pure function derives `TASK_CLOSED` / `FLOW_ONLY` / `DISABLED`).

| | |
|---|---|
| Summary | Type a journey's terminal assertion as a boolean over observables; a derived strength gates it. |
| Target | Bridge · **System models** |
| Form | `validation` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `governs-a-model` — a gate/generator/API/policy whose subject is a model |
| Enforcement | **Soft·Hard** — the typed closure *aims* the terminal assertion (soft: it declares what DONE means, a human still writes the spec); a strength-derivation gate *holds* the floor (hard: a major journey deriving `FLOW_ONLY` fails) |
| Governs | `user-journey-model` — a journey's terminal post-condition, typed |

*Its place in the environment — a **variant / known-use** of **Model-Derived Assurance Coverage**, under **COMPLETE · Establish completion on re-derived evidence**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A journey test usually asserts that the **flow ran** — a page returned 200, a URL was reached, a card
appeared — not that the **task closed** — the artifact the user came for is present, valid, and operable.
The two are one hop apart, and that hop is where a real production break hid.

Picture the gap concretely. A user opens a sample document in the editor; the navigation to the editor
route succeeds and the test asserts exactly that; then the client fetches the accessibility view and the
fetch fails, so the view the user came to inspect never paints. The terminal assertion stopped at "the URL
loaded." The spec passes against broken production. Call it the **flow-vs-task gap**: a green terminal
assertion sitting one hop short of the user's goal.

The gap survives because "what *works* means at journey end" lives as prose in a review checklist. Prose
cannot be checked against the spec's real assertion, so a spec that asserts only the flow satisfies the
template while its code never reaches the task. **The failure is a terminal assertion trusted to mean more
than it checks.**

## Why it's not just a BDD `Then` clause (or the coverage floor, or "write a strong assertion")

The idea that a test should assert an outcome is old. What is new is typing that outcome as a
machine-resolvable boolean, deriving a strength verdict from it, and gating the verdict. Each adjacent
practice stops one step short:

- **Not just a BDD `Then` outcome.** Behavior-driven development declares the outcome as a
  natural-language string that a runtime parses at execution. Here the outcome is a **typed boolean algebra
  over machine-resolvable observables** — precise, drift-checkable, and read without a natural-language
  parser. The `Then`-is-a-first-class-thing discipline is worth borrowing; the string-parsing runtime is
  not.
- **Not just the coverage floor.** The floor proves a major journey has a test that *ran* in the fast
  tier. This proves that test's **terminal assertion means the task closed**. Presence versus meaning —
  the residual the floor explicitly leaves to human review, made a checked property.
- **Not just "write a strong end-to-end assertion."** A hand-written strong assertion is uncheckable and
  unreusable — nothing can tell a strong one from a weak one, and it cannot be resolved anywhere but where
  it was written. Typing the closure makes its strength **derivable** (so a weak one is a finding) and the
  closure **reusable by a second resolver** (the headless probe below).

The distinct move: **type the post-condition, derive its strength, gate the verdict.** It is the
derive-a-verdict-from-a-model-trait reflex and the audit-becomes-a-lint reflex, applied to the meaning of
the terminal assertion.

## Mechanism

Four parts sit on the structured journey model.

- **A typed `closure` block on the journey entity.** Each journey carries `Task = (entry → flow steps →
  closure)`. The `closure` is the terminal post-condition, promoted out of prose into a typed field the
  loader reads. A major journey with no closure is a finding.
- **A standard library of leaf-predicates (subclass, never hand-roll).** The leaves come from a shared,
  reviewed library — *the artifact rendered*, *the content is inspectable*, *no error-fallback is shown*,
  *a non-empty valid file was delivered*, *the author's content was preserved*, *a row for the user's own
  artifact exists*, *the feed populated with live data*. Each leaf resolves to a real signal, preferring an
  **accessibility observable** (a role or an accessible name, how the user perceives completion) over a raw
  DOM handle. Two **flow-only** leaves — *navigated to a URL*, *a route returned 2xx* — belong to the
  library so an expression may reference them, but neither can constitute a closure alone.
- **A boolean articulation language.** The closure is a small sealed algebra — `AND`, `OR`, `NOT` over the
  leaves — and nothing more. *"The artifact rendered AND the content is inspectable AND no error-fallback
  is shown."* The grammar is deliberately non-temporal: a journey closure is a single terminal-state
  property, so "always" and "leads-to" operators would be weight no journey needs.
- **A pure strength derivation and the gate over it.** From the expression a total function derives a
  verdict, stored nowhere by hand: `TASK_CLOSED` when the expression holds at least one non-flow-only
  positive leaf; `FLOW_ONLY` when every positive leaf is flow-only; `DISABLED` when the spec that asserts
  it is switched off. A major journey deriving `FLOW_ONLY` is a build finding — the mechanical form of "a
  journey test should have caught it." The flow-only leaves' asymmetry is the teeth: referenced freely,
  never a closure by themselves.

A set of lints forward-police the discipline — that every major journey declares a closure, that each leaf
subclasses the library rather than a one-off predicate, that the expression is well-formed and its derived
strength surfaced, and that each leaf binds to an observable that actually exists in the served UI. They
land audit-only first, since journeys not yet migrated derive `FLOW_ONLY`, then promote to blocking once
the backlog drains.

## Prerequisites

- **A structured journey model with addressable parts** — the same carrier the sibling journey models key off,
  so the closure attaches to a journey the coverage and placement models already name.
- **A way to resolve an observable to a real signal** — an accessibility role or label, a DOM id, an HTTP
  status, a file's magic bytes, a content-subset check — so each leaf binds to something checkable rather
  than to a description.
- **A criticality axis** to scope the gate to major journeys, so a minor journey's weaker closure is not a
  finding and the floor lands where it earns its keep.
- **A reviewed registry for the library** — the leaf classes, the grammar's leaf-keys, and the lint's
  allowlist derive from one source, so a new leaf is a deliberate addition rather than a per-journey fork.

## Consequences & costs

- **The gate closes *meaning*, not *robustness*.** A `TASK_CLOSED` closure asserts the right shape of
  outcome; it cannot prove the assertion is deep rather than shallow. That residual stays human review —
  the same boundary the coverage floor draws one level down.
- **The library must be extended deliberately.** A new leaf is a reviewed registry addition, not a
  per-journey predicate; let each journey mint its own and the library sprawls into the bespoke tangle the
  standard set exists to prevent.
- **A disabled closure must be represented, not invisible.** A closure behind a switched-off spec derives
  `DISABLED` and stays in the model as a visible gap, rather than vanishing into a green count.
- **Audit-only-first is the honest landing.** Existing journeys derive `FLOW_ONLY` until migrated, so the
  gate lands non-blocking, a wave drains the backlog, then it promotes — dropping it blocking-red would
  break every in-flight change at once.

## Capability beyond governance — one closure, two resolvers

Because the closure is *typed*, the same definition resolves two ways. Locally it drives a browser
assertion in the fast tier. Before promotion it drives a **headless probe against the deployed
canary** — the leaves that resolve over HTTP or a delivered file are checked against the pre-promotion
revision directly, without rebuilding the browser suite on the deploy host.

That reuse closes a containment hole. A fast post-deploy battery checks page *integrity* — a route
renders, no console error, no overflow — but never task *closure*, so a break that appears only under the
deployed configuration is invisible to a local-only assertion. Resolving each major journey's typed
closure against the canary restores "staging catches anything local catches" for the task dimension.
Convention alone could not do this: the typed closure is the single artifact both resolvers read.

## Known uses

- Typed `closure` blocks on the major journeys, each a boolean expression over library leaf-predicates —
  the exemplar being *the artifact rendered AND a control is inspectable AND no error-fallback*, the fixed
  form of the one-hop-past break.
- The pure strength derivation and its gate: a major journey deriving `FLOW_ONLY` is a finding, landed
  audit-only first while the migration backlog (a weak-proxy history journey, a disabled authed-download
  journey) drains.
- A canary closure-probe that resolves each major journey's typed closure against a pre-promotion
  revision, closing the containment hole where a configuration-only break is invisible to a local
  assertion.

## Related mechanisms

- **Sibling** — [journey-criticality-test-placement](journey-criticality-test-placement.md): both derive a
  verdict from a typed journey trait. There criticality derives the host tier a test runs on; here a
  closure expression derives the strength of the terminal assertion. Same derive-from-a-model-trait
  mechanism, different trait and different verdict — and this one picks up exactly where that entry's floor
  stops, at *quality* rather than *absence*.
- **Counterpart** — [coverage-model-mapping](coverage-model-mapping.md): that asks *is this journey
  endpoint tested at all* (presence over nodes); this asks *does the terminal assertion mean the task
  closed* (meaning of the assertion). Presence versus meaning — the named axis that keeps the two entries
  distinct.
- **Consumer** — the [user-journey model](user-journey-model.md) supplies the `Journey` carrier this adds
  the `closure` field to; that entry governs a journey's *dependency correctness* (declared deps ↔ real
  call sites), this governs its terminal *meaning*, on the shared carrier.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the strength gate is that parity mechanism
  applied to the terminal assertion, keeping the declared closure equal to what the spec really asserts.
- *See also* — [executable-source-of-truth](executable-source-of-truth.md): the closure is data, read
  every run and held equal to reality, not a prose outcome that rots the moment the spec moves.
