The raw evidence behind Part V's three measured curves, one table per curve. Each is sourced and
window-bounded; the running text cites the curve, the ledger holds the counts.

## Support-ratio lines of code

Production and support-apparatus lines at each of the four dated commits — the counts behind the
support-ratio curve (*The Build*, "The support ratio: build the environment first"). Source: the
fail-loud census over the seven primary source roots.

| Window | Production LoC | Support LoC | Support ratio |
|---|---:|---:|---:|
| prototype — Apr 9 | 26,956 | 22,908 | 0.85× |
| mechanization — May 31 | 302,844 | 751,050 | 2.48× |
| hardening — Jun 30 | 337,905 | 1,244,194 | 3.68× |
| now — Aug 3 | 491,090 | 1,501,907 | 3.06× |

The apparatus starts below parity (0.85×), crosses production at mechanization (2.48×), peaks at
hardening (3.68×), then eases to 3.06× as feature work resumes on the finished environment — larger
than production across every mature window.

## Per-path churn

Lines added and deleted per window on the two product paths (`web/`, the Python service and worker;
`backend/`, the C# tool and rule engine) — the counts behind the churn silhouette (*The Build*, "The
shape of the churn"). Source: `git numstat` over the commit-date windows. Read as a churn signal, not a
hand-authored source count (generated bundles and vendored trees ride along; the inflation is bounded
and time-localized — see the chapter's accounting footnote).

| Window | web/ added | web/ deleted | backend/ added | backend/ deleted |
|---|---:|---:|---:|---:|
| prototype | 22,539 | 7,717 | 48,636 | 10,166 |
| mechanization | 371,855 | 161,044 | 941,120 | 286,378 |
| hardening | 179,649 | 33,983 | 109,188 | 3,767 |
| loop-mgmt | 96,825 | 14,332 | 116,313 | 9,708 |

Mechanization is the add-and-delete peak, where `backend/` rewrote itself; after it the deletions
collapse and the later windows go net-additive as the environment stabilizes the code.

## Control growth

The running count of project-specific lint files and gate scripts across the four windows — the counts
behind the control-growth curve (*The Build*, "The controls accumulate"). The full four-window series
is carried here in full, not compressed to endpoints. Source: a tree scan (`git ls-tree` per window
SHA) counting lint files under the lint directory and gate scripts, at the four study-window commit-date
boundaries.

| Window | Lint files | Gate scripts |
|---|---:|---:|
| prototype | 0 | 0 |
| mechanization | 336 | 20 |
| hardening | 595 | 76 |
| now | 747 | 102 |

Both surfaces start at literal zero: the substrate is post-prototype. At the final window the lint files
carry 993 registered lint specs, each a policy the environment enforces on every agent. The
failure-attribution discipline's footprint: 208 commits carry a paired fix-and-lint tag, and 27 lints
name a specific dated incident in their own text (spot-checked as genuine conversions). The counts
record a documented, growing discipline, not a measured causal rate — the fraction of controls born
from a failure versus authored up front is not separable from the tree scan alone.

## The derived floor under load {#model-sync-evidence}

The counts behind 5.3's field note on the map that pointed at a ghost, and behind the two-layer net
the models chapter names as concept ("How a model stays trustworthy"). Documentation drift is excluded
here by construction: this table is model↔code sync only — the doc-hygiene aside below is a distinct,
separately-counted class.

| Question | Evidence | Interpretation |
|---|---|---|
| Did real model↔code drift exist *before* the derived floor? | Around 27 genuine model↔code drifts at a signal-to-noise ratio near 1.0, found by re-running each closed Epic's own lints — including a prod-blocking pointer-drift incident and a fully-typed function shipped to zero consumers.¹ | Yes. The drift was real and had been escaping *silently* past a green definition of done. This is the class the floor was built to close. |
| Did the derived floor catch *fresh* drift at HEAD? | Six genuine catches in the refresh window: three traceability-broken (an unregistered model consumer, a missing component entry, a service-call-graph mismatch) and three stale-anchor or stale-test.² | Yes. Caught by the floor re-run at HEAD, not by a person reading — the hard layer firing on live code. |
| Did any drift reach a *post-close reopen*? | Zero, across a cumulative 56 Epic closes. | Nothing modeled-and-mechanically-decidable slipped past a close to a reopen. |
| Under what *change load* did the floor hold? | +8,970 / −173 lines across 63 commits to the models-bridge (query/reactor, governance-graph, and frontend-build models), a one-week window. | Heavy models-bridge churn is the load the net held under — the zero-reopen row is a result *under* this load, not one measured at rest. |

*Notes.* ¹ A pre-floor retro-audit re-ran each Epic's own lints against its own closed state; the
drifts it surfaced showed no false positives in manual review, classified by hand rather than against
an independently stated criterion. ² Caught by the derived floor re-run at HEAD: a symbol-anchored
drift lint, a consumer-registry-freshness check, and a service-call-graph drift lint.

Read together, the four rows answer a narrow question soberly: the drift the floor was built to close
was real and had been escaping unnoticed, the floor catches its kind fresh at HEAD, and nothing
modeled-and-decidable has yet slipped past a close to a reopen — under real churn, not at rest.

## Documentation-hygiene aside — not model sync {#doc-hygiene-aside}

Stale headers and stale prose numbers are **documentation drift, not model drift.** They are the soft
reading layer's true positives, not the derived floor's — and they are cheap: a reader (person or
strong model) catches them, and the close tooling heals them. Kept here, clearly separated, so they are
never folded into the model-sync count above.

| Doc-hygiene drift | Refresh-window count | Caught by | Healed by |
|---|---:|---|---|
| A status header frozen at a pre-close phase | 11 | reading (a person, or a strong model) | the close tooling rewrites the status atomically |
| A stale prose number (a count or percentage the code has since moved past) | 9 | a strong model re-deriving the number from code | a routed one-line fix or audit finding |

These rows describe prose no derived check parses. They are real, and the reading layer is the only
practical control for them — but they say nothing about whether the model still equals the code; that
claim rests on the table above, not this one.

## Reading the model-sync claim honestly {#model-sync-honest-reading}

The two tables above are receipts, not a proof, and they bound a narrower claim than their raw counts
might suggest:

- **Small N, stated plainly.** Per window, the count of genuine model↔code drifts is small — a handful,
  not a headline. The claim rests on that small set of genuine drifts the derived floor caught, plus
  zero model-drift reopens under heavy churn — not on any single catch-rate, which would mix doc-legible
  catches with modeled ones and rest on a denominator too small for the model-sync slice alone. This is
  a field report, not a proof.
- **The catch rate rose by composition, not by loosening.** A later refresh window caught more drift
  than an earlier one (17 of 20 closes, against the original 6 of 36) because it covered more territory
  — product-heavy Epics carrying more doc surface, exactly where the reading layer is the only practical
  control. The net did not weaken; there was more for it to catch.
- **The claim is about sync, not hygiene.** Three legs hold it up: the drift was real and had been used
  to escape (the ~27 pre-floor findings); the mechanism is derived reconciliation, not
  snapshot-and-sync, so it stays fresh by re-deriving rather than by being kept up to date by hand; and
  it held under load (the churn row, zero model-drift reopens). The doc-hygiene aside is kept separate
  on purpose — it would inflate this claim if folded in.
- **The boundary is the honest shape of the result.** Sync is enforced for the modeled and
  mechanically-decidable; it is aimed at, not enforced, for the semantic miss; and it is absent for the
  unmodeled until a metric or a self-governance reflex extends the net's coverage. Those are the two
  failure modes 2.3 names for the same net this table measures — a bound on the claim, not a footnote
  to it.
