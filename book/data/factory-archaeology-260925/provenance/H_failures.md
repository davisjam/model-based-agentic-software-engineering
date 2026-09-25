# Provenance — H: Failures and learning

## Dataset
The incident dataset IS `data/governance_conversions.csv` (section C) read
through a failure lens: each conversion row carries `triggering_incident |
affected_subsystem | failure_class | control_type (the response/durable change)
| recurrence_classification`. That is the brief's H schema (`date | incident |
subsystem | symptom | root condition | control missing | response | durable
change | recurrence | severity`) minus a few narrative-only fields.

## F27 / F28
- **F28 failure → representation/control** is `f10_what_experience_became.py`
  (section C): the distribution of what each incident *converted into* (explicit
  model / typed seam+ban / lint floor / decision rule / measurement-no-gate /
  routed judgment / derived provenance / mechanical blocking lint / …), plus the
  3 ex-ante confirmations counted separately (designed, not failure-driven). No
  separate figure is duplicated.
- **T3 governance-conversion episodes** is the strongest-episodes view of
  `governance_conversions.csv` (the 12 GC rows).
- **F27 incident classes over time** — the incident dates are approximate
  (book-narrative reconstruction), so a weekly incident-class time series would
  impose false precision on ~12 episodes. `governance_conversion_series.csv`
  gives the cumulative/weekly-new conversion counts (small N, approx dates)
  instead; a finer class-over-time plot is NOT defensible at this N and dating.

## Requested-but-unsupported / partial (section H)
- **Searching BEYOND the manuscript incidents** — the 12 conversion episodes are
  the ones the book narrates. A broader mining of field notes / commit messages /
  Epic history for ADDITIONAL incidents not in the manuscript is a genuine
  extension this pass did NOT complete (it would require classifying incident-
  shaped commit/Epic text at scale with per-item judgment). **[REMAINING]** — see
  README. The 12 curated episodes are the high-confidence spine; the broader
  sweep is future work, not fabricated here.
- **Severity/effect per incident** — the book gives qualitative effect (e.g.
  "silently deleted work for four days", "empty changelogs for a class of jobs")
  captured in the `notes`/`triggering_incident` fields, not a numeric severity
  scale. Not manufactured.

## Confidence
Reconstructed (from the book's own retrospective incident narrative). Recurrence
classification is CONSERVATIVE (see C_governance_conversion.md): absence of a
later observed failure is never treated as proof of prevention.
