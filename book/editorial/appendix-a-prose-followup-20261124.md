# Appendix A explanatory prose and A.8 structure — 24 November 2026

This follow-up applies the author's later restructuring and prose audit after publication of `ccad6a1ac`.

A.8 now introduces three separate commitments before their implementations: accounting for in-flight work, acquiring a protected merge claim, and publishing a durable result. Engineering Models connects their representations through job identity. Realization follows those commitments, then verifies lease safety, effect exclusivity, publication ordering, and progress separately. The timestamp distinction sits with the lease operations; execution-path history and recovery policy move to their relevant construction sections.

A.1, A.2, A.3, A.4, A.5, A.6, A.9, and A.10 receive the requested explanatory replacements. A.4 merges its fixed-task selection introduction and loses its repeated architectural-freedom closing. A.6 explains maintained versus recovered dependencies concretely. The designated verification procedures, A.7, and A.11 remain unchanged. AGENTS clarifies that imperative construction instructions are appropriate; disconnected action lists need explanatory relationships rather than a blanket grammatical conversion.

All figures, tables, code excerpts, labels, and unique evidence references remain. A.8 retains its no-worker-ID distinction, guarded versus unconditional release, timestamp tolerance, same-target SQL exclusion, independent publication stores, substitute-storage test scope, and absence of retained TLC results. Its verification instruction explicitly tests stale **guarded** release. The supplied explanatory replacement expands A.8; no technical condition is removed to manufacture a length reduction.

The complete prior sections are archived in `cutting-room-floor.md`. The author attachment, draft, audit report, and source-preservation hashes remain in the ignored evidence archive.

## Local rebuild

The standalone Appendix A PDF rebuild passes native figure, single-page table, section, and bookmark checks with zero unapproved TeX diagnostics. It contains 47 pages including the standalone review front matter, and 15,371 rendered-prose words. The revised A.8 realization and verification pages receive visual review: tables remain intact and the explanatory sequence and code blocks are legible. The full-book PDF is not rebuilt as part of this appendix-only follow-up.
