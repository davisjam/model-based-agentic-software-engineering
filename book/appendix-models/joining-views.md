A real engineering question often crosses several models. That does not make the correct response a
larger model. In review, this is where a reviewer asks *which product journeys cross this surface,
and do the views that touch it still agree?*

Part II's joined-scenario example demonstrates the alternative: keep small, question-specific
representations and join them through stable identities. One fact then propagates through several
views without being copied into each.

**Engineering question.** Suppose a user journey is classified important enough that it must exercise
particular endpoints, carry corresponding test coverage, run in the appropriate test tiers, and
execute under the policy of the host those tests run on. No single stored model needs to hold all of
those facts.

[ref:fig-g7-joined-scenario] traces the join.

<!-- label: fig-g7-joined-scenario -->
<!-- figure: assets/appendix-g-7-composition-by-reference.svg | *Composition by reference.* A user journey names an endpoint identity; that identity keys into a service or node, which keys into coverage and test placement, which key into the host execution policy. Each is a small view answering its own question. The join across their stable identities (dashed) answers the cross-model question and produces a joined view — not a mega-model. -->

**Property.** The joined view states cross-model properties that no single view can:

- **Every major journey part has the required test coverage.**
- **Declared journey dependencies agree with the actual call sites.**
- **Declared endpoints are exercised.**
- **Test placement reflects journey criticality.**
- **Execution respects the selected host policy.**

Part II supplies representative checks for this composition. The named feeder structures a particular
system uses — the journey, the coverage view, the placement view — are not the point; they appear
here only as the illustration of a join, not as models you must build.

**The reusable pattern.** State the engineering question, select the relevant views, join them on
stable identities, then state the cross-view property. Do not build a mega-model merely because the
question spans several representations. The scenario is a traversal across views, not a seventh
stored model.
