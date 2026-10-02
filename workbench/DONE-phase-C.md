# Phase C — Engine — checkpoint

Branch `wb-engine-261002`, based on `be16daee`. Footprint: `src/engine/**` and `test/engine-*`.
No file outside that scope was touched. No new dependency.

## Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean (strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`) |
| `node --test "test/*.test.ts"` | 89 pass, 0 fail (79 new, 10 pre-existing kernel/parity) |
| `python3 validate.py models/workbench-components.mage.yaml` | clean, 9 asserted queries |
| `python3 validate.py examples/docable.mage.yaml` | clean |
| `npm run build` | **fails, pre-existing** — `build.mjs` entry points `src/ui/main.ts` and `src/worker/analysis.worker.ts` do not exist yet (Phases E/G). Not caused by and not fixable from this phase. |

## Modules

| Module | What it owns |
|---|---|
| `types.ts` | query normalizers from `unknown`; `Verdict` / `Refusal`; coverage constructors; `unlicensed` |
| `expr.ts` | the two tiny grammars — effect RHS, derived comparison — and the refusals for everything else |
| `refs.ts` | reference resolution; one resolver for guards, predicate atoms, effect targets and derived |
| `predicate.ts` | compile-once predicates; a compiled predicate cannot fail mid-walk |
| `graph.ts` | ten graph forms; the V7 composition refusal; the V20 `where` join |
| `explore.ts` | the configuration space; local vs event steps; state limit; cycle witness |
| `behavior.ts` | `reach` / `invariant` / `recurrence` / `deadend` / `transition-live` |
| `history.ts` | past-time → safety over a disclosed auxiliary history variable (V23) |
| `narrate.ts` | the structured non-visual twin of every result (FR-A11Y-2) |
| `index.ts` | facade: `runQuery`, `runTypedQuery`, `runSavedQueries`, `checkExpectation` |

## Decisions taken that the spec left open

Each is implemented, disclosed in code comments, and pinned by a test. Each wants a ruling.

1. **Which graph forms are "multi-hop" for V7.** Extended `validate.py`'s four path forms to include
   `components` (a connected component is a reachability class). Deliberately EXCLUDED `cycles`:
   docable's `owns` declares both `path: forbidden` and `acyclic: true`, and V8 makes a cycle a
   checked property, so cycle detection must be licensed or the declaration could never be checked.
   `containment` walks the entity tree, not a relation type, and §2 licenses it by construction.
2. **`recurrence` has two readings** and §7.2 does not say which. A true configuration cycle is tried
   first; failing that, target RE-ENTRY, with the substitution disclosed. The showcase query
   `document-can-return-to-waiting` only `holds` under the second reading, because `retry_count`
   advances on the way round so no configuration repeats.
3. **V22 under a found witness.** Coverage is `bounded` only when the search was truncated AND no
   settling evidence was found; that is the only case reading `inconclusive`. A witness or
   counterexample settles the claim regardless of how little was walked, which is what `validate.py`
   already does and what V22's own rationale (about absence) implies.
4. **An effect that would leave a variable's finite domain** disables the step and the fact is
   disclosed through `result.compilation`, rather than clamping silently or refusing the query.
5. **Derived expression grammar.** `<ref> <cmp> <literal>` or a bare boolean reference; a bare
   identifier on the right is a literal, never a reference. Everything else refused.
6. **`where` with no `from`/`to`** searches all endpoint pairs satisfying the clause. Needed for the
   showcase V20 join, which names neither endpoint.

## Changes needed to orchestrator-owned files

See the phase report for the exact edits: a `nodeSets` field on `evidence`, the structured
`not-answerable` refusal shape, a domain id on `CanonVariable`, the recurrence and V22 wordings, and
a one-line `validate.py` fix for the vacuous `restricted-reaches-public` answer.
