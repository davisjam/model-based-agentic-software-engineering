# SCOPE — the narrow authored temporal slice, first v0.3 item (261005)

**Scoped, not designed.** This note says what the slice would have to settle and stops there. Every
question below stays open on purpose: answering one here would decide a piece of the authored language
in a scoping note, which is the move this item exists to avoid.

**Why it is a v0.3 item rather than a v0.2 omission.** The LTL layer is built, specified and tested.
Trace semantics, terminal behaviour, the fairness policy, first-class counterexamples and the
finite/infinite distinction are all satisfied at that layer, and the §20 release gate certifies each
one. What the layer has is no entry point: no query form, no schema vocabulary, no capability row, no
agent-facade operation, and no `src/` consumer of its entry point. So the gate can read all-green over
a regime in which neither a student nor an agent can ask a temporal question. §20's non-reachability
criterion now says so, which is the honest fix for v0.2.

Wiring the layer instead would have been the dishonest one. It would force decisions about the
authored temporal vocabulary, the query-form registry, the schema, the facade and the pedagogy **in
order to make a release gate's wording come true** — implementation pressure making language-design
decisions, backwards. The author's distinction governs: *"implemented" is not "part of the language.*"

---

## What the slice must settle

**The authored operator subset.** Which temporal operators an author may write, and the reason the
line falls where it does. The engine decides a full LTL formula; the authored subset need not be that
wide, and a narrower set is the likelier answer. `G` and `F` over a predicate already have shipped
behavioural forms that bridge to them, so the slice's real question is what the forms do *not* reach —
nesting, `U`, `X` under negation — and whether a student should reach it at all.

**The query-form registry entry.** A temporal question arrives as a form on the behavioural query, and
the shipped forms each denote one question rather than a search strategy. A formula form denotes a
*language* instead, which is a different kind of registry row. The slice must say whether that row
belongs beside the forms, replaces none of them, and what its primitive classification and semantic
basis are.

**The schema vocabulary.** A formula an author writes needs a surface in `mage-query.schema.json` —
its own `form` member, and the syntax the formula itself is written in. The forms are closed enums
today, which is what keeps an author from naming a question the engine cannot answer. A formula string
re-opens that, so the slice must say what validates it and when.

**The agent-facade row.** Not optional, and not deferrable to a later phase. §20's facade criterion
requires the agent facade to expose the same semantic operations as the human interface, so a
student-only wiring would violate the gate it was meant to satisfy. Whatever the human surface
admits, `window.mage` admits the same operation, and the capability registry carries the row that
makes both checkable.

**The pedagogy.** Where a temporal question belongs in the Learn progression, and against which
example. The behavioural flagship already teaches refutation with a counterexample, so the slice
inherits a place to stand rather than needing a new one — but a formula surface teaches a notation,
and the progression currently teaches questions.

---

## What lands with it

**§20's non-reachability criterion changes.** It declares the temporal layer engine-internal *in
v0.2*. The slice's first act is to retire that declaration, and the guard holding it in
`test/release-gate-negatives.test.ts` goes red the moment the wiring lands — by design. A red there
means the criterion needs rewriting, not that the wiring is wrong.

**The non-reachability guard becomes a reachability one.** The same axes it watches — form enum,
schema vocabulary, capability row, facade operation — are the axes the slice must populate, so the
assertion inverts rather than being deleted.
