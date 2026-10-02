# Open decisions — MAGE Model Workbench

**Status:** awaiting the author. Nothing here blocks the integration work; each item names what is
implemented today, so a ruling either confirms the current behaviour or changes one named thing.

Ordered by how much the answer changes the product. D1 and D2 are semantics and would alter what the
workbench *claims*. D3 is architecture. D4 and D5 are process.

---

## D1 — Does a witness found inside a bound establish an existential? (V22 vs §7)

### The conflict, verbatim

**V22** (SEMANTICS.md §7.1) reads unconditionally:

> When `coverage.kind` is `bounded`, the result MUST be reported as **INCONCLUSIVE** and MUST NOT be
> rendered as "no".

**§7's evidence table** says an existential is established by a witness, with no coverage condition:

| Claim | `holds` is established by | `refuted` is established by |
|---|---|---|
| **∃** a trace satisfying *P* | a **witness** trace | **exhaustive absence** |

### The concrete case

A model with two machines, three worker instances and one `[0,10]` variable reaches millions of
configurations, so the state limit trips routinely — this is a normal path, not an edge case. Suppose
the engine is asked *"can a document reach `published` without being `reviewed`?"*, explores to its
limit of 1,000,000 configurations, and **finds the trace at step 4**:

```
waiting → processing → approved → published
```

That trace is a complete, checkable object. It demonstrates the execution exists. Exploring further
could only find *more* such traces; it cannot unfind this one.

Under V22 as written, the result is `inconclusive`. That is **unsound in the direction that matters**:
the workbench would decline to report a reachable bad state it had already demonstrated.

Note the asymmetry — it only bites one way round:

- **∃ with a witness:** bounded coverage is irrelevant. The witness settles it.
- **∃ without a witness:** bounded coverage is decisive. "No such trace exists" is only true under
  exhaustive search, so this must be `inconclusive`. V22 is exactly right here.
- **∀ with a counterexample:** the counterexample settles it, same as a witness.
- **∀ with no counterexample found:** bounded ⇒ `inconclusive`. V22 right again.

So V22 is correct in three of four cells and wrong in one.

### Proposed amendment

> When `coverage.kind` is `bounded` **and no settling evidence was found**, the result MUST be
> reported as INCONCLUSIVE and MUST NOT be rendered as "no".

Where *settling evidence* is a witness for an existential or a counterexample for a universal.

### What is implemented

The Phase C engine already implements the amended reading, and `validate.py` agrees. The test
`"a witness found inside a bound still settles the claim"` pins it. **A ruling of "V22 as written"
would require changing code and that test**; ratifying the amendment is a one-line spec edit.

**Recommendation: amend V22.** The unconditional version makes the tool refuse to report a defect it
has proof of, which is the opposite of the failure the coverage machinery exists to prevent.

---

## D2 — What does `recurrence` mean? (SEMANTICS.md §7.2 is silent)

### The problem

`recurrence` asks *"can the system return to S?"* and its evidence is a **lasso** — a prefix plus a
repeating cycle. A *true* lasso requires a repeated **configuration**, because that is what makes the
cycle actually repeatable.

But look at the saved query in our own worked example:

```yaml
document-can-return-to-waiting:
  name: Can the document return to waiting after failing?
  quantifier: exists
  behavior: { form: recurrence, target: { document.state: waiting } }
```

and the machine it asks about:

```yaml
- { from: failed, to: waiting, label: retry, requires: { retry_count: { lt: 3 } },
    effects: { retry_count: retry_count + 1 } }
```

Every pass through that loop **advances `retry_count`**. So no configuration ever repeats: the
control state returns to `waiting`, but `(waiting, 0)`, `(waiting, 1)`, `(waiting, 2)`,
`(waiting, 3)` are four distinct configurations. After the third retry the guard fails and the loop
is dead.

Under the strict reading, the honest answer to *"can the document return to waiting?"* is
**`refuted`** — which is plainly not what the question means, and would be actively misleading to a
student who can see the retry arrow on the diagram.

### The three candidate semantics

| Reading | Answer on our example | Cost |
|---|---|---|
| **(a) Strict configuration cycle** | `refuted` | Sound but useless; answers a question nobody asked |
| **(b) Control-state re-entry** | `holds`, with a trace | Easy, but silently drops the variable, so "can it loop forever?" and "can it come back once?" become the same question |
| **(c) Try (a), fall back to (b), DISCLOSE the substitution** | `holds`, trace, plus a disclosed note | Honest; costs a `compilation` entry and a sentence in the result |

### What is implemented

**(c).** The engine tries the true configuration cycle first, falls back to target re-entry, and
records the substitution in `result.compilation` — the same mechanism V23 uses to disclose the
history-variable rewrite. It also exports `findConfigurationCycle` returning `{ prefix, cycle, at }`,
which is the genuine repeatable-cycle test, and a test pins that a loop whose bounded variable
strictly advances yields `null` from it.

### Why this is the same question you already ruled on

Your path-aggregation ruling said: *bounded monotonic variables license finite unrolling; a positive
repeatable cycle makes an additive maximum unbounded, and that should produce a cycle witness.* That
is exactly this distinction — a strictly-advancing loop is **not** a repeatable cycle. D2 is that
same rule applied to `recurrence` instead of to aggregation.

**Recommendation: ratify (c), and say so in §7.2.** If you prefer (b)'s simplicity, the engine should
still expose `findConfigurationCycle` separately, because "can it loop indefinitely?" is a different
and sharper engineering question than "can it come back."

---

## D3 — The SPARQL evidence gap: how is it resolved?

### The measurement

Phase C produced a form-by-form expressibility table. Summarised:

| | Outcome expressible in SPARQL 1.1? | Witness expressible? |
|---|---|---|
| `direct` | ✅ `ASK { :a mage:rel :b }` | ✅ |
| `reachability`, `path` | ✅ `ASK { :a mage:rel+ :b }` | ❌ |
| `predecessors`, `successors` | ✅ | ✅ |
| `cycles` | ✅ `ASK { ?x mage:rel+ ?x }` | ❌ |
| `components` | partial (one group, not the partition) | ❌ |
| `containment` | ✅ test only | ❌ hierarchical path |
| `where` / ordered-domain join | ✅ BGP + FILTER | ✅ |
| `shortest-path` | ❌ | ❌ |
| `all-paths` | ❌ general; ✅ bounded as a UNION | ❌ |

**Nine of ten outcomes, roughly half the witnesses.** The cause is concrete: SPARQL 1.1 dropped path
variables, so `mage:rel+` *proves existence without binding the intermediates*. You cannot ask it
which nodes it went through.

This collides with a contract we have already fixed: **evidence travels with every answer.** A result
is a claim plus coverage plus evidence; an outcome-only answer is a weaker object than our
`QueryResult` type can even represent, since `evidence: null` currently means "none applicable."

### Three ways out

1. **Dual implementation, one semantics.** SPARQL is the agent-facing query *language*; witness-bearing
   forms are evaluated by the graph algorithm underneath. §14 already licenses this — *"use the least
   complicated deterministic mechanism that preserves the defined semantics"* — with the binding
   invariant that *"optimization must not create a second semantics."*
   **Cost:** two implementations forever, held together by a parity test (which we already do for
   V1–V25, and which has already caught two divergences).
2. **Accept evidence-free answers from the SPARQL path**, marked as such.
   **Cost:** weakens the contract everywhere, and the student loses the witness — which is the thing
   that makes an existential *teachable* rather than merely asserted.
3. **Extend SPARQL with path binding**, breaking "no extensions in v0.1; every accepted query stays
   valid SPARQL."
   **Cost:** the queries stop being portable, which was the reason for adopting SPARQL at all.

### Three things SPARQL structurally cannot hold, whichever way you rule

These must live at the MAGE seam, not in the query layer:

- **V7 licensing.** Nothing in RDF knows about `composition.path: forbidden`. A raw endpoint over the
  projection will cheerfully evaluate `mage:owns+`, and the workbench's most distinctive behaviour —
  refusing a question the model does not license — silently disappears. The check must gate the
  evaluator, driven from the IR.
- **V8 symmetry.** `(rel|^rel)` works only if the query *builder* knows the type is symmetric, or the
  projection materialises reverse triples. Pick one, once.
- **Cross-model union.** Our adjacency unions across every model so an architectural claim cannot
  escape by moving an edge to a different model. In RDF that becomes a named-graph decision: a
  default-graph query unions, a `GRAPH`-scoped one does not.

**Recommendation: (1).** You have already said two implementations under one semantics is acceptable;
this is asking whether you meant it permanently, because the evidence contract makes it permanent
rather than transitional.

---

## D4 — Is `catalog_tests.py --tier1` worth profiling?

BUILD-PERF measured the pre-push gate after its fix:

| Stage | Wall | CPU |
|---|---|---|
| `catalog.py build` (after the fix) | 8.6–10.7 s | 5.5 s |
| `catalog_tests.py --tier1` | **54 s** | **26 s** |

So tier1 is now ~5× the build it follows and the dominant pre-push cost. It was not profiled.

**Important caveat on any wall-clock number from this host:** BUILD-PERF found CPU steady at ~18 s
while wall ranged 21–74 s across four runs, and attributed the spread to roughly a hundred concurrent
agents. *A wall-clock measurement here reports the fleet, not the code.* Read the CPU column. (This is
also the real explanation for a 1:59 push I earlier misattributed to the Typst renders.)

**Recommendation: yes, one agent, measurement-first.** The brief that worked twice today is "measure
before you optimise, and distrust my hypothesis" — it produced a 53× win on a function nobody
suspected. 26 s CPU is a real target, and the same discipline applies.

---

## D5 — Per-phase landing, or batch?

### What per-phase landing costs today

Every commit runs the full pre-commit hook: `catalog.py build`, the book build, the skill bundle, the
mkdocs emit, the gates. Observed consequences this session:

- **Minutes per commit**, and under host load one run exceeded a 2-minute window.
- **The hook stages files I did not name.** Confirmed independently by me and by two agents. A
  pathspec commit does not prevent it.
- **Two interrupted runs left the tree damaged.** One emptied a hand-authored 601-line page
  (`_sync_figure_census`, truncate-then-write); one left `book/web/docs` behind and poisoned *every*
  later commit in the repo with `FileExistsError`. Both are fixed, but both existed because the hook
  is long enough to be interrupted.
- Three agents hit the orphan gate or the self-staging and resorted to `--no-verify`, which this repo
  bans — correctly, since it skips the build gate.

### The alternative

Accumulate several phases on a branch, run the gates once, land once.

- **Gain:** roughly 5× fewer hook runs; proportionally less exposure to interruption damage.
- **Cost:** coarser history; a broken intermediate state is not caught at the commit that introduced
  it; and bisecting a regression gets harder.

**Recommendation: batch within a phase, land at phase boundaries.** That is roughly what the worktree
agents did naturally, and it is why their branches were clean while my per-commit landing on `main`
was where the damage happened. I would keep landing *through* the hook — it is the gate that caught the
orphan page and would catch a broken build — just less often.

---

## D6 — V26: a guard's VALUE is unchecked (found by Phase D)

Not a question about preference so much as confirmation that it is worth the parity work.

**The gap.** V10 checks that a transition's `from`/`to` name declared states. **Nothing checks the
value side of a guard.** Given:

```yaml
- { from: processing, to: reviewed, requires: { worker.state: held } }
```

deleting state `held` from the `worker` machine passes whole-system validation. The guard survives,
referencing a state that no longer exists, and can therefore never hold. The transition becomes dead
code that still looks live on the diagram.

Phase D's words for why this is the worse class: *"a model that is wrong rather than invalid, which is
the worse failure because nothing reports it."* Its transaction engine already blocks the delete —
even with `cascade`, since dropping the guard and dropping the transition assert different things —
but there is no **load-time** rule, so a hand-edited file can carry the defect in.

**Cost:** V26 touches three places that must stay in parity — `SEMANTICS.md`, `src/validator/rules.ts`,
and `validate.py` — plus the parity test's PARITY set. That is the work; it is not large but it is not
one line either.

**Recommendation: add it.** The parity test makes the three-way consistency enforceable rather than
hoped for, and this is exactly the class of defect the numbered rules exist for.

### Ruled 261002 — add it, on both sides, inside the parity set

The author ruled for V26 and it is in flight. Three notes the implementation has to respect, each of
which surfaced only once someone sat down to write it:

- **V25 keeps its exclusive first pass.** A value that YAML implicit-typed is not the value the
  author wrote, so reporting a domain mismatch against it blames the wrong thing. Coercion is
  diagnosed before membership.
- **Integer domains are an interval, not a list.** An integer variable declares a `range`, so
  membership is a bounds test. Only the enum kinds have a list to be a member of.
- **An unresolvable `ref` already belongs to V6/V9/V10.** V26 must not double-report it. A rule that
  fires a second finding for a defect already named is noise in the output a reader has to learn to
  discount, and this file exists partly to stop that happening by accident.

V26 goes into `PARITY`, not `ASYMMETRIC`. The asymmetry table is an honest record of rules one side
cannot reach — a schema-layer check, a generated-type check — and each entry carries its reason.
Domain membership has no such excuse: both sides have the domain and both sides have the guard.
