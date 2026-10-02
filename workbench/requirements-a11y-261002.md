Yes. I would make that a separate top-level requirement, even though it creates a useful overlap with agent operability. Accessibility is an obligation in its own right; agent legibility is partly a beneficiary of satisfying it.

I would put it immediately before the agent requirements:

FR-A11Y-1 — Accessible workbench

The entire MAGE Workbench SHALL conform to WCAG 2.1 Level AA and the applicable accessibility requirements of ADA Title II. All workbench functionality SHALL be operable without relying on vision, color perception, pointer precision, or mouse input. Interactive controls SHALL expose appropriate accessible names, roles, states, values, and relationships through native HTML semantics or ARIA where native semantics are insufficient. All functionality SHALL be keyboard accessible with logical focus order and visible focus indication. Dynamic changes that require user awareness SHALL be exposed appropriately to assistive technologies.

For MAGE specifically, I would add normative details because the graphical model editor creates some unusual accessibility problems:

FR-A11Y-2 — Accessible model representations. Information represented graphically in model diagrams SHALL also have an equivalent accessible representation. Entities, relations, states, transitions, properties, requirements, hypotheses, query results, witnesses, counterexamples, and validation errors SHALL be available through structured textual or semantic interfaces. Color, position, line style, shape, animation, and other visual characteristics SHALL NOT be the sole means of conveying semantic information. Model editing and query execution SHALL be possible without direct manipulation of the graphical canvas.

And:

FR-A11Y-3 — Accessible dynamic interaction. Agent actions, analysis completion, validation failures, hypothesis creation, query results, and other consequential asynchronous state changes SHALL be represented in a manner perceivable by assistive technologies without causing unnecessary focus movement or excessive announcements. Dialogs, inspectors, menus, trees, tabs, and other compound widgets SHALL implement the appropriate keyboard and focus behavior.

Then the agent requirement can deliberately build on this rather than duplicate it:

FR-AGENT-2 — Agent legibility. In addition to the accessible human interface required by FR-A11Y-1 through FR-A11Y-3, MAGE SHALL expose stable semantic identifiers and structured machine-readable state sufficient for a CDP-attached agent to inspect and operate the workbench without inferring engineering semantics from rendered geometry or other purely visual properties.

That gives us a nice architecture:

                         MAGE semantic state
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      Accessible UI        window.mage        Visual view
             │                  │                  │
             ▼                  ▼                  ▼
       Human + AT         CDP agent          Sighted human

And there is considerable engineering reuse without conflating the requirements. A named button helps screen-reader users and browser agents. Semantic headings, landmarks, labels, states, table structures, textual query evidence, stable focus behavior, and non-color status indicators likewise improve both. The accessibility requirement gives generic browser automation a surprisingly good fallback interface.

But window.mage goes beyond accessibility. A screen reader does not need a canonical model hash, transaction schema, query AST, exhaustive-vs-bounded coverage object, or machine-readable model omissions. The agent does. Conversely, window.mage does not satisfy accessibility: a keyboard/screen-reader user must be able to use the actual application.

I would also make accessibility part of the definition of done, not merely a frontend aspiration. Every new UI component needs keyboard operation, accessible name/role/state, focus behavior, nonvisual semantics, and automated accessibility checks; every model visualization needs a corresponding structured representation. Given that this is MAGE, it would be particularly embarrassing for the modeling workbench used to teach engineering obligations to treat accessibility as a cleanup pass.
