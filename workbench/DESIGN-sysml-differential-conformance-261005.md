# Differential and bounded-exhaustive conformance against SysML v2 / KerML — design (261005)

**Status: DESIGN + INVESTIGATION. No code, fixture, or manifest changed by this wave.**
**Authority:** `conformance/manifest.json` (`methods`, `ceiling`), `DESIGN-v02-semantics-261004.md`
§35.4–§35.6a, `src/engine/model-types.ts`, `SEMANTICS.md` §13 + §13.7.
**Baseline, measured by this wave at `46614d00`:** `npm run check && npm run test` → 1389 pass /
0 fail / 0 skipped; `npm run check:parity` → UX-I1: 0 violations over 26 capabilities.

**A ruling arrived mid-design and reframes it.** The author, verbatim: *"We must bring these in as a
dependency for prepush and CI, or just prepush if it's too hairy for github CI."* The manifest's
stated blocker — *"with no runtime dependency nothing in CI can execute the reference
implementation"* — is lifted by decision. §35.1's no-dependency ruling no longer bounds this design.
So the target is §35.5 rung 3 `checked` where a per-run gate can hold it, with transcribed
`oracle-executed` evidence as the fallback, not the goal. This document was asked to rule on the
transcript question anyway, and does (§3), because the ruling turns out to matter for which fixtures
can ever be `oracle-executed` at all.

Every feasibility number below was measured on this machine on 2026-10-05, not assumed. The probe
artifacts live in session scratch and are deliberately not committed; §7 records what was run and
what it cost.

---

## 1. The envelope, verified — and it is five areas, not three

The brief's premise was three `borrowed` areas plus four `extension` declarations. Measured against
`src/engine/model-types.ts` at `46614d00`, both counts are wrong, and the corrections widen the
testable surface:

**Borrowed: five areas.** Four `kind: "borrowed"` basis objects in the registry, plus one borrowed
§35.4 row carried outside it:

| # | Area | Declared at | Standard | What an independent implementation must agree with |
|---|---|---|---|---|
| B1 | structural-graph substrate | `model-types.ts:730` | KerML | a relation type classifies its links; a question naming one type ranges over that type's links and no others; direction is the declared direction |
| B2 | state-machine substrate | `model-types.ts:820` | SysML v2 | occupancy of a named state; declared succession; a guard conditions whether a transition OCCURS, not how an edge is annotated |
| B3 | quantitative substrate | `model-types.ts:975` | SysML v2 | a magnitude is a number paired with exactly one unit of its dimension; comparison is decided by magnitudes after unit normalization; cross-dimension comparison is a category error |
| B4 | binding subset | `KERML_BINDING_BASIS`, `model-types.ts:1103`, shared by all three `BINDINGS` rows | KerML | two model elements naming the declared correspondence denote the same thing — the assertion only, none of KerML's propagation machinery |
| B5 | requirement + verification | no registry object — `mage-model.schema.json` `properties.requirements` + `src/engine/verification.ts` (`VerificationStatus`, `verify`), exactly as manifest fixture 5's `semanticBasis.owner` states | SysML v2 | a requirement carries an obligation and no verdict; a verification RETURNS a four-valued verdict computed from the deciding query and `satisfied_when`, and stores nothing (V18) |

**Extensions: six `extension` objects plus three `extension-grounded`, not four.** `extension`:
the relational query vocabulary (`:700`), the quantity metric vocabulary (`:707`), `recurrence`
(`:870`), `deadend` (`:890`), `transition-live` (`:901`), and `executions-selected-by-behaviour`
(`:1247`). `extension-grounded` on the LTL foundation: `reach` (`:850`), `invariant` (`:860`),
`repeatable-cycle` (`:880`). None of the nine is inside any parity claim against SysML/KerML, and a
differential suite that accidentally tests them against the standard would be testing an equivalence
nobody asserted. The suite's scope is B1–B5.

**The exclusions bound the envelope as much as the inclusions.** The sharpest statement in the
registry is B4's non-borrowed list (`model-types.ts:1082-1096`): no value-identity propagation, no
expression/feature-chain binding, no type unification, no author-declarable connector vocabulary, no
end multiplicities. B2 restricts to finite variable domains; B3 to a closed `DIMENSIONS` table; B5
deliberately has no stored status. A differential test must treat each exclusion as OUT OF SCOPE BY
DECLARATION: the Pilot Implementation propagating a bound value where MAGE does not is not a
disagreement, because MAGE's declaration says it does not take that part. The suite must count and
list these declared-exclusion rows (§6's vacuity budget) rather than silently skipping them — a
skipped row and an excluded row must be distinguishable in the output.

## 2. What the oracle can actually decide — measured, and narrower than hoped

The SysML v2 Pilot Implementation is obtainable and runs headlessly here (§7 has the numbers). What
it can DECIDE is the load-bearing finding, because it bounds every proposal below:

- **Parse + validate SysML v2 textual models: YES.** All three SysML fixtures' Part B models
  (`transition-guard-occurrence-001`, `quantity-unit-magnitude-001`,
  `requirement-verification-verdict-001`) parse and validate clean through release `2026-08`
  (kernel 0.62.0). This wave is the first time any tool parsed them — every `source.sysml` header
  says "has NOT been parsed by any tool", and that sentence is now falsifiable per run.
- **Parse KerML textual models through the headless REPL: NO.** `SysMLInteractive` names its input
  buffer `1.sysml` and rejects `classifier` / `assoc` ("no viable alternative") — the two KerML
  fixtures' Part B cannot be fed to it as-is. The KerML grammar IS in the jar (the library loader
  reads 50+ `.kerml` files on every start), but no shipped headless entry point exposes it. Routes:
  (a) a ~50-line Java driver against the jar's KerML Xtext setup — engineering cost, version-fragile;
  (b) a SysML-spelled sibling source per KerML fixture (SysML text reaches the same kernel library
  types; fixture 2's `bind` is SysML's spelling of a BindingConnector specialization), with the
  specialization chain argued in `claim.md`. (b) is cheaper and honest if the chain is stated.
- **Execute state machines, verification cases, or any model: NO.** The magic set is
  `%eval %export %help %list %load %projects %publish %repo %show %view %viz`. No execution engine
  is reachable. The pinned claims of fixtures B2 (guard conditions occurrence) and B5 (verdict
  computed per ask) are about execution semantics, and the Pilot cannot produce a verdict on them.
- **Evaluate expressions: PARTIAL.** `%eval 2 + 3` → `LiteralInteger 5`. Quantity expressions do
  not reduce: `%eval` of `d + e` over `attribute d : LengthValue = 2 [m]` returns an unevaluated
  `OperatorExpression` node. Unit-normalized magnitude comparison — B3's pinned claim — is not
  decidable by the evaluator at this version.
- **Static dimension conformance: NOT CHECKED at 0.62.0.** `attribute bad : LengthValue = 2 [kg]`
  validates with no error and no warning. The Pilot is a WEAK oracle for exactly the B3 semantics
  MAGE pins. (Unresolved unit names do warn — `Should be a measurement reference (unit)` — so name
  resolution is decidable; conformance of the resolved dimension is not.)
- **Typed AST with implicit relationships: YES.** `%show` prints resolved membership, typing,
  implicit specializations (`PartDefinition A → [Subclassification (implicit)] Part`). This is the
  machine-comparable surface for structural facts. `%export` (JSON AST) rejects its documented
  syntax in the headless main at this version; `%show` is the usable surface.

**Consequence.** The Pilot's decidable surface covers: standard-side well-formedness for all five
areas (via SysML spellings), name resolution, declared + implicit structure, and literal expression
evaluation. It does not cover: behavioral occurrence, verification-case verdicts, or quantity
normalization. So "run the reference implementation and compare verdicts" is available for the
STRUCTURAL half of the correspondence and unavailable for the SEMANTIC half of B2, B3-normalization,
and B5 — for those, the independent check is the normative machine-readable libraries themselves
(§5) plus bounded-exhaustive suites against definitional oracles (§4).

## 3. Ruling: `oracle-executed` vs `checked`, and what pre-push-only earns

**The brief's reading is right, and the manifest's ceiling sentence conflates two claims.**
`oracle-executed` as `methods` defines it — "actually ran the standard-side model and its verdict is
transcribed, with the implementation's version" — is an offline, dated, versioned act. Nothing in
its definition requires CI. §35.6's own `executed` template says why the version field exists:
"a transcribed result is only reproducible against a named build." The reproducibility IS the value
over a reading, and it survives offline: release `2026-08` is a pinned, public, sha-checkable
artifact, so the transcript is re-runnable by anyone, which answers the brief's worry that "a
transcript of a run nobody can reproduce may be worth less than it looks" — pin the version and the
run IS reproducible, just not re-derived per push. `checked` (§35.5 rung 3) requires "a named gate
[that] re-derives the claim on every run and fails on drift in both directions" — that, and only
that, needs the runtime dependency. The ceiling's "nothing in CI can execute the reference
implementation" was the justification for `checked` being unreachable; it was never a reason
`oracle-executed` was. §35.5 already says this quietly: "a transcribed oracle result is an assertion
whose evidence a reader can reproduce by hand, which is stronger than a bare reading and still short
of `checked`."

**Two sharp caveats on that ruling.**

1. **The blocker was also false as a technical claim.** "Nothing in CI can execute the reference
   implementation" was §35.1's POLICY ruling wearing a technical costume. Measured: headless
   execution needs Java 17+, one 126 MB zip, no conda, no Docker, no Eclipse, ~4.6–4.9 s per session
   including the full standard-library load. CI could always have executed it; the repo had ruled
   not to depend on it. The author's new ruling removes the policy, and no technical blocker was
   behind it.
2. **Reachable-in-principle is narrower in practice.** Per `methodDiscipline`, a fixture's `method`
   is the weakest rung among its DECISIVE evidence. A Pilot run that validates `source.sysml`
   corroborates — it proves the vehicle is legal SysML — but it does not decide the pinned claim
   unless the claim is within the Pilot's decidable surface (§2). Of the five pinned claims, none is
   fully decidable by the Pilot today: B1/B4's static halves come closest (structure via `%show`),
   B2 and B5 need execution, B3 needs quantity evaluation. So no existing fixture flips to
   `oracle-executed` on the strength of a parse run, and writing one that did would be the
   gate-reports-other-than-it-measured defect this week is organized around. A NEW fixture pinned to
   a claim the Pilot CAN decide (implicit-specialization structure, name resolution) could honestly
   carry `oracle-executed`.

**Pre-push-only, ruled.** Rung 3's text is satisfied by a mandatory pre-push gate: it is a named
gate, it re-derives per run, it fails on drift both directions, and it guards every path to
publication. What pre-push-only lacks against CI is bypass-resistance (`--no-verify` is banned by
policy, not physics — and this repo's own operating notes already record its pre-push tier as weaker
than CI) and coverage of trees that never push. The drift sources here — fixture edits, oracle
version bumps — only ever reach readers THROUGH a push, so pre-push is proportionate, and the cheap
option is in fact the strong one. Two conditions make it honest rather than cheap: the gate's output
must name its tier ("checked at pre-push, vN of the oracle"), the same discipline `methodDiscipline`
applies to `method`; and whichever runner does NOT run it (default `npm test`, GitHub CI if dropped)
must be a DECLARED exclusion — the gate-wiring rule this repo learned on 261002–261003: an
undeclared exclusion and a forgotten gate look identical from the script list. Verdict on "too hairy
for github CI": **it is not hairy** — `setup-java` (Temurin 17+), one cached 126 MB artifact keyed
by sha256, ~5 s of runtime. Recommend pre-push as the gate of record and a CI mirror as the
bypass-resistant copy; if CI's network posture blocks the fetch despite caching, drop CI per the
author's pre-authorization and declare the exclusion in `pages.yml`'s own comment.

## 4. Bounded exhaustiveness — the spaces, the generators, the bounds, and why each bound

The author's scope: exhaustive over bounded spaces for the claimed subset. A bound is defensible
when it is derived from the structure of the claim — the quantifier depth, the recursion depth, the
closed table — such that any violation of the claim has a witness inside the bound. A bound chosen
because the suite runs fast is a coverage claim in disguise; each bound below states its witness
argument, and the one place the argument is genuinely a small-scope HYPOTHESIS rather than a theorem
is marked as such.

| Space | Claim it exhausts | Generator | Bound | Why that bound |
|---|---|---|---|---|
| S1 one-hop structural | B1: per-type link classification + direction (`direct`/`predecessors`/`successors`) | enumerate all edge subsets of T×E×E; every query form × type × endpoint over each | E=3 entities, T=2 types → 2^18 models (isomorphism-pruned) | the claim is pointwise per edge: cross-type leakage needs 2 types, direction inversion needs 2 entities, self-loop/endpoint aliasing needs 3; any violation has a ≤2-edge witness inside E=3,T=2 — a theorem about the claim's quantifier structure, not a budget |
| S2 composed structural | reachability / path / shortest-path / all-paths / components / cycles over declared edges | all digraphs on N nodes, one type; every composed form between every node pair | N=4 → 2^16 adjacency matrices | closure defects have minimal witnesses: length-3 paths separate "≤2 hops" bugs, cycles of length 1/2/3 plus a tail need 4 nodes; N=4 is the smallest N containing every minimal witness of every known closure-defect class — HYPOTHESIS for unknown classes, stated as such in the suite's own limit line |
| S3 behavioral | B2 + the six behavioral forms over the configuration space | (a) S=3 states, no variable, all transition subsets; (b) S=2, one boolean variable, guards from the closed grammar {true, v==c, v!=c}, effects {none, toggle}; (c) two machines, one sync label, S=2 each | ≤6 configurations per model; a few hundred thousand models total | each pair of the six forms is separated by a minimal witness: reach vs invariant by one unreachable state (S=2), deadend by one stuck configuration, recurrence vs repeatable-cycle by a lasso with tail (tail 1 + cycle 2 → S=3), transition-live by a declared-but-disabled transition (needs a guard → space (b)); sync needs space (c); the generator's bound is the union of the separating witnesses, and the grammar-coverage rule (every production of the transition grammar appears) catches the convenience failure of enumerating only guardless machines |
| S4 quantities | B3: unit normalization + ceiling comparison + cross-dimension refusal | the FULL cross product: every (dimension, unit, prefix) pair in `DIMENSIONS` × both directions × magnitudes {0, 1, one non-unit value} × all five comparison operators; plus every cross-dimension pair, which must refuse | the whole claimed space — the table is closed and finite | not a sample: the bound IS the space. Magnitudes: conversion is linear (x ↦ c·x), so agreement at 0 and 1 determines the factor and a third point guards against an affine (offset) implementation; if `DIMENSIONS` ever admits an affine unit (°C-like), the three-point argument fails and the suite must say so |
| S5 verification | B5: the whole `verify` function | every (satisfied_when ∈ {holds, refuted}) × (evaluation ∈ {completed-holds, completed-refuted, unlicensed, exhausted, error, not-evaluated}) | 12 rows — the entire domain | exhaustive in the strict sense; nothing bounded about it |
| S6 bindings | B4: the three correspondences, as read | systems of ≤2 models × ≤2 entities × every id-sharing pattern × machine `entity` present/absent × `executes_in_state` present/absent/dangling | a few dozen systems | B4's claim is a read of a declared correspondence with no propagation (§1's exclusions) — every observable is decided by one declaration, so the witness for any violation is one declaration plus one reader; the enumeration covers every (declaration-state × reader) pair |

**The oracles these spaces run against, and the two-layer honesty requirement.** S1–S3's and S5's
exhaustive halves compare MAGE against an INDEPENDENT DEFINITIONAL oracle: a from-scratch
implementation of the textbook definition (Warshall closure for S2, brute-force BFS + nested-DFS
lasso search for S3, a transcribed table for S5) written against the definition, not against
`src/engine/`. That establishes "MAGE implements its claimed mathematical semantics" — the premise
half of the equivalence claim. It does NOT establish "the claimed semantics is the standard's
semantics" — that half rests on the fixture corpus's normative-artifact evidence plus whatever the
Pilot decides (§2), and a suite that reports the first as the second is this week's defect at its
largest. Every suite emits both sentences, separately.

## 5. The quantities join — the one correspondence a gate can hold outright

The normative `SysML_Quantities_and_Units_Library-2.1.0-dev.*.kpar` is a zip of plain `.sysml` text
(verified: `SI.sysml`, `ISQBase.sysml`, `MeasurementReferences.sysml` as readable source). MAGE's
`DIMENSIONS` table re-states a subset of the same facts — unit symbols, dimensions, conversion
factors. That is the second-SURFACE pattern: one fact, two artifacts, currently joined by nothing.
A per-run gate that unzips the pinned `.kpar`, extracts the declared conversion factors for exactly
the units `DIMENSIONS` carries (its own parser — see §6g for why it must not route through
`DIMENSIONS`), and compares factor-by-factor, makes the B3 TABLE correspondence `checked` — a gate
that re-derives the claim per run against OMG's own machine-readable declaration, no JVM required,
152 KB artifact, milliseconds of runtime. This is the only one of the five areas where the
correspondence half itself (not just the standard-side model's validity) can reach rung 3 with
today's tooling, and it is cheap. Pin the `.kpar` by sha256 and fetch-cache it like the oracle
(committing it is a redistribution question this design does not settle).

## 6. Normalization — the specification, and the seven ways it could lie

Differential comparison needs MAGE's verdicts and the oracle's observations in one vocabulary. The
vocabularies, verified: MAGE query outcomes `holds | refuted | inconclusive | unlicensed`
(`src/ir/types.ts:767`) with `EvaluationStatus` `completed | unlicensed | exhausted | error`
(`:833`); MAGE verification `satisfied | violated | inconclusive | error`
(`src/engine/verification.ts:181`); SysML `VerdictKind` `pass | fail | inconclusive | error`
(SysML v2.0 9.2.17.2.2); the Pilot's observable output: per-line `ERROR:`/`WARNING:` diagnostics,
clean-echo on success, `%show` AST lines, `%eval` result nodes.

**The normalization, per comparison kind:**

- **N1 validity (all areas):** standard-side artifact → `{ oracleVersion, verdict: clean |
  diagnostics[] }` where each diagnostic is `(severity, message-pattern)`; compared against a
  per-fixture PINNED expectation list, exact on severity and pattern.
- **N2 structural facts (B1, B4, S6):** `%show` output → a set of `(relationship-kind, source,
  target)` triples, filtered by a PER-FIXTURE allowlist and mapped through an AUTHORED
  id ↔ qualified-name table carried in the fixture; MAGE's query results mapped through the same
  table; compared as sets.
- **N3 verdict movement (paired mutation, §8 P3):** for each meaning-level mutation applied to BOTH
  sides, the pair `(Δ-MAGE-verdict, Δ-oracle-observation)` must match the fixture's pinned
  movement table — moves-together, or declared-exclusion with the exclusion cited.
- **N4 verification words (B5):** `satisfied↔pass`, `violated↔fail`, `error↔error`;
  `inconclusive` maps ONLY when MAGE's `InconclusiveCause` travels with it (below).

**Where normalization would hide a real disagreement — the vacuity catalog.** Each entry names the
tempting collapse and the true divergence it would bury. The suite's output must carry a count per
entry (the vacuity-budget discipline this repo already applies elsewhere): excluded rows, dropped
diagnostics, unmapped names — all counted and listed, never silently absorbed.

- **(a) `unlicensed` folded toward `inconclusive`.** MAGE refuses questions its models do not
  license (forbidden path composition, undeclared relation types); no reference vocabulary has the
  concept. Folding `unlicensed` into "both non-definitive" declares agreement exactly where MAGE
  declined to answer a question the standard's semantics answers — the single most likely real
  divergence in the whole exercise. Rule: `unlicensed` rows are incomparable BY DECLARATION,
  reported as their own class.
- **(b) `inconclusive`-as-skip inside a bounded space.** S1–S3's bounds are chosen so MAGE
  completes. There, `exhausted` is not a skip — it is a FAILURE of the suite (the bound argument
  promised completion). Treating it as "no comparison" converts a broken bound into silence.
- **(c) fuzzy name matching.** MAGE ids vs SysML qualified names, aligned by suffix or
  case-folding, can align the wrong pair and report agreement about the wrong element. Rule: the
  correspondence map is authored per fixture; an unmapped name is a finding, not a skip.
- **(d) global library-noise filtering.** `%show` includes implicit library relationships
  (`Subclassification (implicit) Part`). A global "strip library elements" scrub would also strip
  the case where the pinned claim IS an implicit relationship — fixture 1's A3 pattern is exactly
  that. Rule: the filter is the per-fixture allowlist of N2, part of the pinned claim.
- **(e) severity folding.** Collapsing WARNING into clean hides the measurement-reference warnings
  that are B3's only static signal at 0.62.0; collapsing WARNING into ERROR manufactures
  disagreement. Rule: N1 pins severity per diagnostic.
- **(f) verdict-word homophony.** MAGE's verification `inconclusive` can carry an
  unlicensed-question cause; SysML's `inconclusive` is a verification-case outcome. Equating them
  on the word hides (a) at the verification layer. Rule: N4 maps `inconclusive` only with its
  `InconclusiveCause` attached, and an unlicensed-caused one lands in class (a).
- **(g) shared-code normalization — the purest theatre.** If the oracle side's unit conversion (or
  name resolution, or anything) is computed by routing through MAGE's own `DIMENSIONS` table or
  engine, the comparison is MAGE-vs-MAGE wearing a differential costume. Rule: the `.kpar`
  extractor and every definitional oracle in §4 share NO code with `src/engine/` or `src/ir/`;
  magnitude comparison is exact rational arithmetic, no epsilon — a tolerance is a budget for
  exactly the conversion-factor error the test exists to catch.

## 7. Feasibility — measured

- **Obtainable: yes.** GitHub release `2026-08` of `Systems-Modeling/SysML-v2-Pilot-Implementation`
  (published 2026-09-11): `jupyter-sysml-kernel-0.62.0.zip`, 126,136,336 bytes, containing
  `jupyter-sysml-kernel-0.62.0-all.jar` + `sysml.library` + EPL-2.0 LICENSE. Pinnable the way
  the repo's other third-party dependencies (`puppeteer` et al.) are: release tag + filename +
  sha256, fetch-once cached outside git. Not on
  Maven Central (`g:org.omg.sysml` → empty), so the GitHub release asset IS the pinning surface.
- **Runnable here: yes, headless, no install.** `java -cp "<dir>/*"
  org.omg.sysml.interactive.SysMLInteractive <ABSOLUTE path to sysml.library>` on the machine's
  Temurin 21. Two sharp edges, both measured: the library path must be absolute (a relative path
  dies on URI-encoding of the library's internal spaces), and the REPL loops uselessly on EOF — the
  input protocol is blank-line-terminated model blocks with `%exit` last, under a timeout.
- **Cost per run: ~5 s fixed, sub-second marginal.** Startup + `%exit`: 2.6 s. Full standard
  library + one model: 4.86 s. + two models + an eval: 4.80 s. Three fixture models in one session:
  4.65–4.86 s wall. All five fixtures plus a mutation grid fit in ONE session: the oracle tier adds
  ~5–6 s to pre-push against a gate that already runs minutes. License EPL-2.0 — compatible with a
  dev-time gate dependency; not redistributed.
- **CI: not hairy** (§3): `setup-java` + `actions/cache` on the zip's sha + the same 5 s.
- **Verdicts measured:** three SysML Part B fixtures validate clean; KerML Part B rejected by the
  REPL grammar; `%eval` literals reduce, quantity expressions do not; `LengthValue = 2 [kg]` passes
  validation silently; `%show` exposes implicit structure; `%export` unusable headless at 0.62.0.
- **Second-best checks, ranked, for what the Pilot cannot decide:** (1) the normative `.kpar`/XMI
  artifacts as a per-run structural oracle — already the corpus's `normative-artifact` rung, and §5
  upgrades one such join to a gate; (2) definitional oracles for the bounded spaces (§4); (3) an
  independent SysML v2 parser (e.g. Sensmetry's open-source SysIDE core) as a second validity
  opinion — unprobed this wave, noted not designed-for.

## 8. Phases, cheapest first — with the rung each reaches, stated

Vocabulary: §13's `asserted`/`checked` for the correspondence kind; the manifest's three `method`
rungs for fixture evidence; §35.5's rungs 1–3 for enforcement.

- **P0 — oracle-validate the standard side, transcribe (hours; the thinnest phase that genuinely
  strengthens).** Run the three SysML Part B sources (and SysML-spelled siblings for the two KerML
  fixtures, chains argued in `claim.md`) through the pinned oracle; record verdict + version +
  date in each `oracle.json` `evidence[]` as a CORROBORATING `oracle-executed` component — decisive
  only for "the standard-side model is well-formed," which no fixture currently rests on but every
  fixture presumes. No `method` headline changes (per `methodDiscipline`, and changing one on a
  parse run would be a gate reporting other than it measured). What it buys, honestly: it closes
  the real risk that a fixture's standard-side model is not legal SysML — a fixture about an
  illegal model corresponds to nothing — and it is small, and saying so is the ceiling discipline
  applied to this document.
- **P1 — the oracle gate at pre-push (1–2 days).** Fetch-cache script (pin by sha), a
  `test:oracle` tier feeding every tracked `source.sysml` + per-fixture N1 expectation lists
  through one REPL session, wired into pre-push, tier named in its output, exclusions declared in
  the runners that skip it; CI mirror if the cache behaves. Reaches: "standard-side validity +
  pinned diagnostics" becomes `checked` (rung 3, at pre-push). The MEANING correspondence stays
  `asserted` — P1 re-derives the vehicle, not the claim — and the gate's own output must say that
  sentence, or it becomes the 5-of-5 misreading with a JVM attached.
- **P2 — the quantities join + S4/S5 (days).** §5's `.kpar`-vs-`DIMENSIONS` factor gate; S4's
  full-space suite; S5's 12-row suite against the transcribed VerdictKind table. Reaches: the B3
  table correspondence becomes `checked` — the first correspondence half to reach rung 3 — and B5's
  verify function becomes exhaustively pinned against a normative-artifact transcription
  (correspondence `asserted`, with the strongest possible evidence short of an executing oracle).
- **P3 — bounded-exhaustive S1/S2/S3/S6 against definitional oracles (days, parallelizable).**
  Reaches: "MAGE implements its claimed semantics" becomes `checked` over the bounded spaces;
  the correspondence halves stay at their fixture's method rung, and each suite emits the
  two-sentence split of §4.
- **P4 — paired-mutation differential through the Pilot (a week).** N3's movement tables for the
  static halves of B1/B4; new fixtures pinned to Pilot-decidable claims, honestly `oracle-executed`.
  Reaches: correspondence-under-mutation `checked` where the Pilot decides; elsewhere the ceiling
  sentence stands, updated to say exactly which halves remain `asserted` and why (no executor, no
  quantity evaluator — version-dated facts that future Pilot releases may change).

A v0.2 release ships P0+P1 comfortably, P2 plausibly. P3/P4 are post-release and the ceiling
paragraph should keep saying so until they land.

## 9. What the brief (and the manifest) got wrong

1. **The envelope is five borrowed areas, not three** — B4 (binding) and B5
   (requirement/verification) are `borrowed` rows with testable surfaces; B5's basis lives outside
   the registry, which is easy to miss and the manifest's fixture 5 states explicitly. Extension
   declarations number nine (six `extension`, three `extension-grounded`), not four.
2. **The `oracle-executed`-vs-`checked` distinction is right but practically narrower than the
   brief hoped:** no existing fixture's PINNED claim is fully inside the Pilot's decidable surface,
   so the top method rung is reachable today only for standard-side validity (corroborating) or for
   new fixtures pinned to decidable claims — not by transcribing a verdict on the five claims as
   pinned (§3 caveat 2).
3. **The manifest's stated blocker was a policy ruling, not a technical fact.** Headless execution
   was always possible at ~5 s/run on stock Java (§7); "nothing in CI can execute the reference
   implementation" was §35.1's choice restated as an impossibility. The author's mid-wave ruling
   retires the policy; the manifest's `ceiling` text will need its justification rewritten when P1
   lands — the `checked` ceiling itself falls only when a gate actually re-derives a correspondence
   per run (P2's quantities join is the first).
4. **The brief's gate line omitted parity:** `npm run check && npm run test` emits no parity
   figure; `npm run check:parity` is a separate script (run by this wave: 0 over 26, matching).
5. **Corroborating color the brief did not ask for:** fixture B2's `oracle.json` already records a
   `defectFound` in the published spec (`deriveTransitionUsageGuardExpression` selecting `::trigger`,
   prose copied from the sibling constraint) — found by exactly the kind of close differential
   reading this design mechanizes. The method finds real defects in both directions, including
   upstream.
