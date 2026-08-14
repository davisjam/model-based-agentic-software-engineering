<!--
  Design-doc template — STARTER (adopt & adapt)

  A distilled, portable version of the design-doc conventions from a production system built by
  frontier coding agents. A design doc is the Phase-1 artifact of an Epic (see the Epic starter): it
  is where you encode the DESIGN and its INVARIANTS before any implementation dispatches — so the doc
  *drives* the work and later *drives the test backlog*, rather than being written after the fact.

  The load-bearing idea: a design doc earns its keep through four elements — (1) a section per real
  part, (2) invariants with stable IDs, (3) as-built-vs-design marks, (4) an enforcement map from
  invariants to tests. A doc without them is prose that rots. Replace the bracketed placeholders;
  keep the section contract.
-->

# Design: <subsystem / change> — <one-line intent>

**Status:** draft | ratified | as-built | DECISION-RECORD | ✅ <verdict>
**Author:** <who> · **Created:** <date> · **Epic:** <link, if any>

> Keep the Status line honest through the whole lifecycle. When the change lands, restamp: replace
> "draft / NOT SAFE / deferred" language with the landing outcome (`as-built` or `DECISION-RECORD`),
> preserving the original reasoning as clearly-flagged history. A design doc that still says "pending"
> weeks after it shipped is the single most common doc-rot failure.

## §1 Context & the failure it kills

The problem in one paragraph, then: what breaks today (or will), how often, and how expensive each
occurrence is. State the **essential** complexity (inherent to the problem) separately from the
**accidental** complexity (introduced by current tooling/choices) — the design should attack the
accidental kind and *budget* for the essential kind, not pretend a cleverer abstraction erases it.

## §2 Genre check (before you invent)

Before proposing a new abstraction / schema / tool: (1) what **genre** is this? (2) who is the
canonical best-in-class? (3) can you **adopt their schema** even if you skip their runtime? Prefer a
single source of truth: a stable check that reads a meta-file at build time beats codegen-from-spec
beats N hand-rolled copies. Record the alternatives you considered and why you rejected them — a
design doc with no rejected alternatives usually didn't look for them.

When two candidates clear the genre check, weigh **training-data density** as a tiebreaker: agents
produce more reliable output for a widely-adopted mainstream tool than for a niche one, which is
out-of-distribution and gets re-derived (and mis-derived) by every future agent. A heuristic, not a
mandate — record it as one factor among capability, fit, licensing, and uniformity.

## §3 The design

One subsection **per real part** — one heading (or table row) per source, stage, module, service, or
entity, mirroring the actual structure of the thing. Name shapes with types: types reveal the
architecture that primitive-passing leaves anonymous. Prefer one canonical seam per concern (a single
sanctioned way to do X), and make illegal states unrepresentable where you can (a typed model beats a
runtime guard).

## §3a Type-system posture (for any design that ships or touches typed code)

*Types are how you name shapes.* A design that adds a data shape, migrates to a typed language, or moves a
module across a boundary declares its type-**QUALITY** bar — not just "is it typed?" but "are the types
*good*?" The failure this kills: code that is technically typed but leaks an escape hatch (`any`, a bare
`object`, a blanket type-ignore) at every boundary — **fake types** that name no shape.

Six facets — answer each YES or N/A-with-reason:

1. **Strict compile.** Does the code compile under the language's *strict* tier, in the config that
   actually ships — not only a parallel strict-overlay check? A strict lint over files the delivery build
   compiles loosely is a half-measure: the shipped artifact was produced by the loose compile. If the
   target tier isn't strict yet, name the gap and the path to it.
2. **Escape-hatch budget = 0 (or justified).** New code adds no `any` / bare `object` / blanket type-ignore
   at a type position. A genuinely dynamic value uses the "unknown-then-narrow" idiom; an external-library
   gap gets a typed shim, not a blanket escape. Each surviving escape carries an inline `WHY:` comment.
3. **Domain identifiers are branded, not bare strings.** An ID that travels across boundaries gets a
   distinct type (a branded string, a `NewType`) so the compiler catches "passed a user-id where an
   order-id was expected."
4. **Variant shapes are discriminated unions, not optional-bag objects.** A value that is "shape A OR
   shape B" is a tagged union, not one object with every field optional — the compiler then forces
   exhaustive handling.
5. **Boundary typing for fetch / parse / IPC.** Deserialized JSON, message payloads, and cross-service
   data are typed at the seam (a declared shape plus a runtime-validated parse), not left as an untyped
   value that propagates through every downstream consumer. The untyped-deserialization boundary is the
   number-one escape-hatch amplifier.
6. **Interface / event types are named, not cast away.** Event handlers and per-element augmentation use
   the precise type or a declared interface, not an ad-hoc cast.

Facets 1, 3, 4 apply to any typed language; 5–6 are boundary-typing ideas with an analogue in every
ecosystem (a typed boundary model, a typed callback signature). Default-decline only with an explicit "no
type-system surface — &lt;reason&gt;".

## §4 Invariants (the join key)

Each invariant is a **tagged, testable predicate** with a stable ID and a `file:line` (or module)
cite. The ID is what tests and audits cite back — it is the join key between the doc and the code.

| ID | Invariant (a predicate that is true or false) | Where it lives (`file:line`) |
|----|-----------------------------------------------|------------------------------|
| INV-1 | <e.g. every job transition goes through the state machine — no ad-hoc status writes> | `<cite>` |
| INV-2 | <e.g. every emitted file carries a provenance header> | `<cite>` |

## §5 Second-order effects & dynamics

**Mandatory for any substrate with repetition, concurrency, or time-delayed consumption.** A
first-order design ("when X happens, do Y") is often right in isolation but pathological under
repetition or contention. Walk the dynamics explicitly:

- **Over time** — what happens at tick T+1, T+10, T+100? Does anything accumulate, starve, or oscillate?
- **Under concurrency** — what if N components do this simultaneously? Is there a race, a deadlock (an inverted lock-acquisition order), a thundering herd?
- **Under stale state** — what if state drifts between when it's produced and when it's consumed (a stale base, a retried cron tick, a cached snapshot)?

Dynamics-aimed tests find the real defects; a strong-but-static unit suite will miss driving-condition
bugs. Name the dynamics you're relying on, and the ones you're ruling out.

## §6 Observability

**Required for any substrate that emits events / topics.** For each signal: the topic name, what
"baseline healthy" looks like, what "something's wrong" looks like, and where the operator goes when it
fires (the playbook entry). A substrate you can't observe end-to-end is an incomplete design.

## §7 As-built vs. design (⚠️ the gaps are the next work)

Call out, with ⚠️, every place the shipped code diverges from this design — a deferred invariant, a
stubbed path, a "for now" shortcut. The ⚠️ marks are where the next work lives; an as-built doc with
none is usually hiding drift, not free of it.

## §8 Enforcement — invariants → tests/lints

Map **each invariant ID** to the test or lint that pins it, or mark it `UNTESTED`. This table *is* the
test backlog the doc drives.

| Invariant | Enforced by | Kind | Status |
|-----------|-------------|------|--------|
| INV-1 | `<test/lint>` | pin / property / lint | ✅ / UNTESTED |
| INV-2 | `<test/lint>` | lint | ✅ / UNTESTED |

Prefer converting a recurring manual audit into a **lint** whenever the signal is mechanically
detectable: audit signals are expensive, deferrable, and post-hoc; lint signals are cheap, at-commit,
and deterministic. Today's audit finding is tomorrow's lint.

## §8a Static & dynamic analyses — the completeness roll-up

§4 (invariants), §5 (dynamics), and §8 (enforcement) each name part of the analysis surface. This section
rolls them into one visible checklist, so *analysis-completeness* becomes something you check rather than
something a reader infers across four sections. For each invariant, name the STATIC analysis and the
DYNAMIC analysis that holds it — or mark the gap.

- **Static analyses — hold at build/commit time, before the code runs.**
  - **Types.** The strict compile plus the type-quality bar (§3a). An illegal state the compiler rejects
    needs no runtime check.
  - **Lints.** A pattern-scanning check that fails the commit on a banned shape — the cheapest, most
    deterministic control. Convert a recurring manual audit into a lint whenever the signal is
    mechanically detectable (§8).
- **Dynamic analyses — exercise the running system. Match the analysis to the invariant's shape.**
  - **Example tests** — a pin test for a specific behavior, a seam test for a boundary the design moved.
  - **Property tests** — for an invariant that quantifies over an input space (totality, round-trip,
    idempotence): generate many inputs instead of enumerating examples. The right tool for a *linear
    property*.
  - **Exhaustive state-space search** — for a *safety* invariant over a small, reachable state set (a
    state machine, a short protocol): enumerate every reachable state and assert the bad one is
    unreachable. Catches the interleaving a hand-written test never thinks to try.
  - **Model-checking** — for a *liveness* invariant ("the job eventually completes"): a temporal-logic
    checker proves the system cannot get permanently stuck, which no finite test can.

**The completeness check.** A *static-shape* model (a schema, a template) needs only static analyses plus
example tests. A *dynamic-stateful* model that can stall owes BOTH a safety analysis AND a liveness one — a
suite that proves only safety clears the safety bar while the system can still deadlock. An
*external-input* model owes property tests over its input space. Name, per invariant, the static and
dynamic analysis that holds it; a blank cell is the backlog.

## §9 (Optional) Open questions for the user

Park unresolved judgment-class decisions here for ratification before implementation dispatches — the
load-bearing calls (a naming seam, a scope boundary, a design axis) belong to the user, not to a
sub-agent that would silently answer a narrower question.
