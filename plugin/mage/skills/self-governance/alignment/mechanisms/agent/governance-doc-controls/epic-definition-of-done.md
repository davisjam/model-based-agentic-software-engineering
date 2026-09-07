# Epic Definition-of-Done (Final-Opus trust-nothing re-run)

**Intent** — An Epic-close gate mandating a "trust nothing" Final-Opus review that re-runs every owned
pin test and lint *at HEAD*, rather than trusting phase markers or prior claims, so an Epic cannot
close on stale or rotted assertions.

| | |
|---|---|
| Summary | Close an Epic only after re-running its checks at HEAD. |
| Target | Agent · **Governance-doc mechanisms** |
| Form | `quality-gate` |
| Move | `package` — a constraint shipped with its sensors |
| Model | — |
| Enforcement | **Hard** (deterministic) · *blocking close* — reachability/patch-id checks must pass, or a logged `--override` is required |

*Its place in the environment — the **canonical mechanism** for **COMPLETE · Establish completion on re-derived evidence**.*

## Motivation — the failure it kills

An Epic spanning many dispatches accumulates *claims* (phase markers, "lints pass," pin-test counts),
and those claims **rot** as sibling Epic sweeps churn the substrate underneath them. Close on the stale
claims and you ship an Epic whose defenses no longer actually hold (empirically: 7/7 back-catalogue
Epics self-marked DONE had quality-of-defense gaps). The failure is *a premature/false close*, and it
recurs at every Epic boundary.

## Why it's not just "trust the phase markers" (or "the agent said it's done")

Phase markers and self-reports are **exactly what rots**: a sibling sweep can break your lint while your
marker still reads green, and a self-marked-DONE is not verification. The DoD mandates **re-running
every owned pin test and lint at HEAD** and comparing against the claims, plus scanning the Epic's
design docs for dropped follow-up tags and doc rot. The gate trusts nothing recorded; it re-derives the
verdict from the substrate as it stands now. It is the **audit counterpart** to the rule
index: the index's lints keep its *form* honest; this re-run keeps an Epic's *claims* honest.

## Mechanism

An Epic-close tool enforces that every cited commit is reachable from main by ancestry or patch-id; a
missing one requires a logged override carrying a reason. On a clean close it rewrites the status and
closed-date fields atomically, moves the file into the closed tree, and regenerates the index. The
Definition-of-Done itself carries a fixed set of mandatory criteria: among them the Final-Opus re-run
of owned pins/lints at HEAD, docs + index updates, the tag routing-audit, and the filing of any design-doc
follow-up.

## Prerequisites

- **A machine-checkable close** (reachability / patch-id over the cited commits).
- **A well-defined "owned" set** of pin tests and lints per Epic to re-run.
- **A Final-Opus reviewer** with the judgment to re-verify rather than rubber-stamp.
- **A follow-up routing mechanism** so what the re-run surfaces becomes filed work, not a footnote.

## Consequences & costs

- **The re-run is expensive.** Opus time plus a full pass of owned pins/lints at close, deliberately
  heavyweight, because a false close is worse.
- **`--override` is a hole.** It exists for legitimately-unreachable commits, logged, but it is a way
  past the reachability check.
- **"Owned" must be accurate.** An Epic that under-declares what it owns re-runs too little and can
  still close on a rotted-but-unlisted defense.
- **Measured, and the split is the lesson: derived defends, snapshotted drifts.** The re-run's catch has
  been measured across the corpus of closed units of work, sorted under a fixed set of drift kinds. The
  pattern is clean and worth stating. What the audit reliably catches is the *snapshotted* fact — a status
  line copied by hand and never refreshed, a phase note that lags the phase, a test pinning yesterday's
  behavior, a broken trace link, a doc claim the code outgrew. What it cannot catch is the class with
  nothing to compare against: a surface that was never described, so there is no stale description to flag.
  The rule follows directly. Hold a fact as a *projection* of the artifacts that already record the truth
  and the audit — and often the gate before it — defends it for free; hold the same fact as a hand-kept
  *snapshot* and the audit is your last line before it drifts into a close. The measured efficacy is real,
  but it is bounded by that one blind spot, and the design response is to derive the fact rather than lean
  on the catch.

## Known uses

- `epic_close.py close --commits …` / `--override` (reachability-gated close).
- The Epic template's multi-criterion Definition-of-Done; the Final-Opus "trust nothing" re-run.
- The tag routing-audit + design-doc follow-up filing at close.

## Related mechanisms

- **Counterpart (audit)** — [claude-md-rule-index](claude-md-rule-index.md): the index's cap/conformance
  lints keep its *form* honest; this re-run keeps *claims* honest (presence ≠ obedience). Together they
  are the "keep the enforced documents honest" pair.
- **Consumer** — reads each Epic's owned pin tests and lints (and the repo meta-models behind them) to
  re-verify at HEAD.
