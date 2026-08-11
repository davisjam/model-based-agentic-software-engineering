The Part-II view chapters teach each model through a representative engineering question, one figure, and
one illustrative invariant. The full reference detail — the record schema, the complete invariant table, and
the derivation direction — lives here, so the mainline reads as a textbook and the exhaustive detail stays a
lookup a reader reaches for once they know which model they need.

Every page in this appendix follows the same five-field template. A reader who has read the pattern in
*Making Models Executable* scans any page by reflex:

- **(a) Quality property** — the engineering question the model lets you settle that raw code cannot.
- **(b) Structure** — the typed record schema: the entities, relations, and fields the model declares.
- **(c) Representative figure** — the one diagram that shows the model's shape.
- **(d) Invariants** — the complete table of predicates the model must satisfy, each with the check that
  enforces it on every build.
- **(e) Derivation direction** — whether the model is derived from the code, the code from the model, or
  each field split between the two, and what the drift gate compares.

The pages are the reference behind the Part-II view chapters. Where a chapter says the full
construct-and-invariant treatment is in the appendix, this is where it lands.
