*Can I trust this representation for the question I am asking?*

Trust begins by stating the correspondence a representation claims. A derived service map may
describe the implementation at HEAD; an ownership model may encode intent the implementation
must satisfy; a generated policy may be the authoritative source from which implementation
artifacts derive. These are distinct correspondence relations.

Read four things together:

- **Correspondence.** Does the claimed relation still hold? Descriptive models should still
  match observed reality; intent-bearing models should still be satisfied where authority
  applies; generated artifacts should still derive from their declared source.
- **Coverage and relevance.** Does the representation cover the engineering surface for which
  it is being relied upon? Missing coverage may be legitimate when implementation lies below
  the model's intended grain.
- **Traceability.** Can the reader move from the model claim to the territory it concerns, and
  back where that reverse relation is meaningful?
- **Freshness.** Has the claimed correspondence been re-established since the territory or the
  authored intent last changed?

```
  REPRESENTATION HEALTH     "Can I trust this representation for this question?"
  ────────────────────────────────────────────────────────────────────────────
  Correspondence   claimed relation still holds
  Coverage         intended surface is represented
  Traceability     claims resolve to their subjects
  Freshness        relation re-established after change
  ────────────────────────────────────────────────────────────────────────────
  Ask first: what correspondence does this model claim?
```

A failed correspondence reading means the representation cannot safely support the reasoning
currently assigned to it. The finding does not determine whether the representation or the
represented system should change.

In DocAble, the Missing-Model surface fell from 56% to 7.89% over nine passes. Appendix G
records the measurement and its limitations.
