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
