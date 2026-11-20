# Modeling approaches: source verification

Checked official project and standards documentation on 2026-11-20. The table describes capabilities, not a ranking or procurement recommendation.

- [Clafer](https://www.clafer.org/p/about.html): structural, feature, and class models with constraints; consistency checks and instance generation.
- [BESSER](https://besser.readthedocs.io/en/stable/concepts/index.html): structured models, visual/textual/Python interaction, and code generation. Generation does not itself establish correctness.
- [SysML v2](https://www.omg.org/spec/SysML/2.0) and [KerML](https://www.omg.org/spec/KerML/1.0): system modeling language and semantic foundation; reuse existing bibliography entries.
- [TLA+ Toolbox](https://lamport.azurewebsites.net/tla/toolbox.html): TLC model checker and separate proof-system support.
- [Alloy 6](https://alloytools.org/alloy6.html): relational and temporal models. Do not use old FAQ statements denying native temporal modeling. Analysis claims must preserve scope bounds.
- [JSON Schema](https://json-schema.org/overview/what-is-jsonschema): structural/data constraints evaluated by validators.
- [OpenAPI](https://spec.openapis.org/oas/v3.2.1.html): interface descriptions for HTTP APIs.
- [PlantUML](https://plantuml.com/) and [Mermaid](https://mermaid.js.org/intro/): text-to-diagram tools; visual syntax alone does not establish project-specific semantics or implementation conformance.

Sources are cited in the new table. No numeric engineering-cost reduction is claimed.
