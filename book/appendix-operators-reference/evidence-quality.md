*What justifies this claim?*

Start with the claim and identify the evidence capable of supporting it. Different properties require
different evidence: a structural invariant may be checked exhaustively, a performance claim may require
measurement, a semantic-fidelity claim may require generative evaluation and human judgment, and a formal
proof establishes only the property encoded under its stated model and assumptions.

Evaluate evidence through four questions:

- **Claim.** What exactly is being asserted, and over what scope?
- **Evidence.** What observation, measurement, proof, test, or other artifact bears on that claim?
- **Evaluation.** What procedure interprets the evidence, and what can that procedure miss?
- **Authority.** What consequence should the result have? Evidence may inform a human, produce a warning, or
  justify a blocking gate; evidentiary strength and enforcement authority remain separate decisions.

```
  EVIDENCE QUALITY                            "What justifies this claim?"
  ──────────────────────────────────────────────────────────────────────
  CLAIM
    ↓  what would settle it?
  EVIDENCE
    ↓  how is it interpreted?
  EVALUATION
    ↓  what does the result deserve?
  AUTHORITY
    advisory · warning · validator result · gate · human decision
  ──────────────────────────────────────────────────────────────────────
  No backing      →  unsupported claim
  Weak backing    →  state the limit
  Strong backing  →  still choose authority deliberately
```

The critical failure is a consequential claim whose stated confidence exceeds its evidentiary support.
Preserve evidence provenance, state limitations explicitly, and distinguish what the evidence establishes
from the authority the organization chooses to attach.
