# RULED — `window.mage.evidence(queryId)` (UX-I2, V18)

**Status: ruled 2026-10-02.** `DESIGN-shell-261002.md` §10 flagged the method and deliberately left
it out of its own scope: it read a UI-side Map that only `savedQueries()` filled. This document
records what the defect turned out to be, the ruling on the three shapes available, and what each
rejected alternative would have cost.

---

## The defect was two defects, and the second is the expensive one

The method was `evidence(queryId): QueryResult | null` over a `lastResults` Map cleared and refilled
inside `savedQueries()`.

**Mode 1 — stale.** It returned whatever `savedQueries()` last computed. Edit the model, ask again,
and the answer described a revision the system had already left. `properties()`, declared two lines
above it in the same interface, recomputed on every call and argued in its own doc comment why.

**Mode 2 — indistinguishable absence.** It returned `null` when the Map was empty. So *"that
question has no witness"* and *"nobody primed the cache this method reads"* arrived at the call site
as ONE value. An agent asking about a perfectly good question read `null` and reasonably concluded
there was no evidence.

Mode 2 is the one worth naming carefully, because it is a *forced* confusion rather than a careless
one. The repo's standing warning — a probe that returns nothing has two explanations, and the
likelier one is the probe — is advice to a reader who *can* look harder. Here no amount of care at
the call site helped: a caller holding `null` had no second field to consult, because one value
carried both meanings. The API manufactured the failure it warns about.

A recomputing `evidence()` that still returned bare `null` would have fixed the cheaper half and
left the worse one standing.

---

## Ruling — recompute per call, and return a typed reading

`evidence(queryId)` looks the question up in `system.queries`, runs it through `workspace.query` —
the same service `runSavedQueries` calls per entry — and returns an `EvidenceReading`: a three-member
union carrying the witness, or a cause for its absence.

```
EvidenceFound       found: true   result: QueryResult  evidence: Evidence
EvidenceWithheld    found: false  cause: "unlicensed-by-model" | "no-witness"  result: QueryResult
NoSuchQuestion      found: false  cause: "no-such-question"                    result: null
```

Three decisions inside that shape, each with a reason:

- **Three causes, not two.** A refusal and an answered-but-silent question are different claims, and
  the SPARQL seam already protects that distinction one layer down — `refusal.ts` argues that
  collapsing "the model declines" into "the tool cannot" teaches a reader the workbench cannot do
  what it declines to do on purpose. The same argument reaches this seam.
- **`NoSuchQuestion` is its own member.** Not a `result: QueryResult | null` on the withheld arm. The
  compiler then holds the invariant a test would otherwise have to re-check: a question nobody asked
  cannot carry an answer.
- **Every absent reading lists `savedQuestions`.** This is the field that fixes the diagnosis rather
  than only the data. A caller reading an absence sees what the system DOES save, so a misspelled id
  separates from a genuine absence without a second call — the house habit of pairing a refusal with
  the change that would license the question.

The found arm surfaces `evidence` already narrowed, alongside the `result` it came from. A caller
that has checked `found` does not then re-check a nullable field, which is where a nullable return
would simply have relocated the problem.

`AGENT_API_VERSION` moves `0.1.0` → `0.2.0`. The return type is a breaking change to a published
surface, which is what that constant is for.

---

## Rejected — a cache keyed by `(queryId, systemHash)`

The strongest alternative, and the one this codebase uses elsewhere: the `systemHash` deliberately
excludes annotation, so a cosmetic edit does not invalidate it, and a hit is returnable only while
it is still true. It fixes mode 1 completely.

**Rejected on three grounds.** First, a verdict is derived state (V18), and the project has already
ruled on this value class: `Workspace.properties()` recomputes, and its comment calls that "the whole
design rather than an implementation note" — there is no field to cache a verdict in, so a stored
answer cannot outlive the system it described. A correctly-invalidated cache is still a stored
verdict, and it would make this one method the exception to a rule the rest of the layer keeps.

Second, the cost argument runs the other way. `evidence()` asks ONE saved question. `savedQueries()`
and `properties()` each already pass over all of them, so the recompute here is strictly cheaper than
work the surface does on every repaint.

Third, the hit rate. The sequence an agent actually runs is ask, edit, ask again — and every edit
advances the hash, so a hash-keyed cache misses on exactly that loop. What it would buy is repeated
identical asks against an unchanged model, which is not the access pattern, in exchange for a second
mechanism (a key, an eviction question, a stale-entry path) that the neighbouring method does without.

## Rejected — removing the method

§10 hinted at a "deprecation look", and the method has no consumer: nothing in the UI calls it, and
`lastResults` had exactly one reader, `evidence()` itself. So removal was live.

**Rejected because the capability registry declares it.** `window.mage.evidence` is the SOLE machine
affordance of the `inspect-evidence` capability (`src/app/capabilities.ts`), whose human affordance is
the evidence list inside the question list. UX-I1 requires both sides, and `BASELINE-a11y-261002.md`
§8 records that gate as BLOCKING rather than prose since F-3 closed. Deleting the method would report
a capability the product still has as a parity violation — so removal costs a re-sited capability row,
and buys nothing the fix above does not already deliver. Keeping the name re-sites nothing:
`capabilities.ts` is unchanged by this work.

---

## What pins it

`test/agent-evidence.test.ts`, eight tests driven through `createAgentApi` — the object `window.mage`
is bound to, unwrapped, at the install site in the UI entry. All eight were watched failing against
the pre-fix implementation before the fix landed.

| Pins | Test |
|---|---|
| mode 2 — a cold read answers a real question | `evidence() answers a real question on a workspace nobody ran first` |
| mode 2 — the answer does not depend on call order | `priming makes no difference — there is no cache to prime` |
| mode 1 — an edit that moves a verdict moves the reading | `evidence() describes the CURRENT system, not the one savedQueries() last saw` |
| mode 1 — every reading carries this revision's hash | `every reading is attributed to the revision it describes` |
| absence — a typo names the real ids | `a question nobody saved is reported as such, and names what IS saved` |
| absence — a refusal stays a refusal | `a refusal is not a missing witness — the two causes stay apart` |
| absence — an answered question with nothing to show | `an answered question with nothing to show reads as that, and not as a refusal` |
| all four arms are reachable over the shipped fixture | `the three causes are three values, over the shipped fixture` |

No test names a query id, a verdict or a count the fixture owns: ids come from `system.queries`, and
the expected answers from a second computation through `Workspace.query`.

## One residue

`src/app/properties.ts` cites `window.mage.evidence(id)` as the reason the `stale` field on an
evaluated property is reachable — "hands out a cached result that outlives its system". That is no
longer true of this method. `stale` is still reachable, because `evaluateOne` is exported and takes
results from its caller; the clause naming `evidence()` wants a different example.
