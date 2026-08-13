*What justifies this claim?*

Start with the claim, then ask what evidence could actually settle it. Different properties require different
evidence. A deterministic structural invariant may be checked exhaustively. A performance claim may require
measurement. A semantic-fidelity claim may require generative evaluation and residual human judgment. A formal
proof establishes a property only under the model and assumptions encoded in the proof.

Evidence quality therefore has four questions:

- **Claim.** What exactly is being asserted, and over what scope?
- **Evidence.** What observation, measurement, proof, test, or other artifact bears on that claim?
- **Evaluation.** What procedure interprets the evidence, and what can that procedure miss?
- **Authority.** What consequence, if any, should the result have? Evidence may inform a human, produce a
  warning, or justify a blocking gate. Strong evidence does not automatically imply blocking authority.

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

The key failure is not "a claim without a validator." It is a consequential claim whose stated confidence
exceeds its actual backing. Keep provenance for the evidence, state its limitations, and distinguish what the
evidence establishes from what the organization chooses to do with it.
