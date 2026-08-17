<!-- note-spread: 1 -->

**Intent** — An Epic-close gate mandating a "trust nothing" final review that re-runs every owned pin
test and lint at HEAD, rather than trusting phase markers or prior claims, so an Epic cannot close on
stale or rotted assertions.

## Problem

An Epic spanning many dispatches accumulates claims — phase markers, "lints pass," pin-test counts — and
those claims rot as sibling Epic sweeps churn the substrate underneath them. Close on the stale claims and
you ship an Epic whose defenses no longer hold; across one back-catalogue review, 7 of 7 Epics
self-marked done carried quality-of-defense gaps. The failure is a premature or false close, and it
recurs at every Epic boundary.

## Mechanism

An Epic-close tool enforces that every cited commit is reachable from the mainline by ancestry or
patch-id; a missing one requires a logged override carrying a reason. On a clean close it rewrites the
status and closed-date fields atomically, moves the file into the closed tree, and regenerates the index.
The Definition-of-Done itself carries a fixed set of mandatory criteria — among them the final re-run of
owned pins and lints at HEAD, the docs and index updates, the tag routing-audit, and the filing of any
design-doc follow-up.

## Engineering Consequences

The gate trusts nothing recorded; it re-derives the verdict from the substrate as it stands now. That
makes it the audit counterpart to the rule index: the index's lints keep its form honest, and this re-run
keeps an Epic's claims honest. Whatever the re-run surfaces routes into filed work rather than a
footnote, so a rediscovered gap becomes a task, not a note.

## Implementation Seam

The reachability- and patch-id-gated close tool plus the multi-criterion Definition-of-Done template. The
tool reads each Epic's declared set of owned pin tests and lints to re-run, so the "owned" declaration is
the contract the gate verifies against.

## Known Limitations

The re-run is expensive — reviewer time plus a full pass of owned pins and lints at close, deliberately
heavyweight because a false close is worse. The override is a hole: it exists for legitimately
unreachable commits and is logged, but it is a way past the reachability check. The whole re-derivation rests on "owned" being accurate: an Epic that under-declares what it owns re-runs
too little and can still close on a rotted but unlisted defense.
