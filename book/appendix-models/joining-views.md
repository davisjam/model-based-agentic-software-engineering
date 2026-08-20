An engineering question may span several models without requiring one larger stored model. Keep
question-specific representations separate and join them through stable identities when a cross-model
property must be evaluated.

**Engineering question.** Does an important user journey exercise its declared endpoints, receive the
required test coverage and placement, and execute under the correct host policy?

[ref:fig-g7-joined-scenario] traces the join.

<!-- label: fig-g7-joined-scenario -->
<!-- figure: assets/appendix-g-7-composition-by-reference.svg | *Composition by reference.* Stable identities join the user-journey, service, coverage, test-placement, and execution-policy views. The resulting joined view supports cross-model queries without duplicating those facts into a single stored model. -->

**Property.** The joined view states cross-model properties that no single view can:

- **Every declared journey step has the required test coverage.**
- **Declared journey dependencies agree with the actual call sites.**
- **Declared endpoints are exercised.**
- **Test placement reflects journey criticality.**
- **Execution respects the selected host policy.**

**The reusable pattern.** State the engineering question, select the relevant views, join them on
stable identities, and evaluate the cross-view property. The scenario is a traversal across
representations, not an additional stored model.
