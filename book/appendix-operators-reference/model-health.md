*Can I trust this representation for the question I am asking?*

A model is a map of some aspect of the territory, not a second copy of the whole system.
Trust therefore begins by stating what correspondence the representation claims. A derived
service map may claim to describe the implementation at HEAD. An ownership model may carry
authored intent that the implementation is required to satisfy. A generated policy may be the
authoritative source the implementation is emitted from. These are different relations;
"model equals code" is not a universal one.

Read four things together:

- **Correspondence.** Does the relation the model claims still hold? A descriptive model
  should still describe; an intent-bearing model should still be obeyed where authority has
  been attached; a generated artifact should still derive from its declared source.
- **Coverage and relevance.** Does the representation cover the engineering surface you are
  relying on it for? Missing coverage is not automatically a defect. Some implementation sits
  legitimately below the model's grain.
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

The map/territory metaphor is useful intuition; the engineering target is the correspondence
contract. A red reading means the model cannot safely carry the reasoning currently assigned
to it. It does not tell you which side should change — the model or the territory.

*Observed in DocAble:* the Missing-Model surface drained from 56% to 7.89% over nine passes —
one run's coverage receipt, not a healthy direction to reproduce (Appendix G).
