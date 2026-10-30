---
title: Technical Debt, Architecture & Supply Chains
readings:
  groups:
    - heading: Architectural choices and their consequences
      items:
        - cite: fowler2014microservices
          locator: 'introduction, Componentization via Services, Organized around Business Capabilities, Decentralized Data Management, Evolutionary Design'
          annotation: 'Lewis and Fowler, ["Microservices: A Definition of This New Architectural Term"](https://martinfowler.com/articles/microservices.html) (2014). Read the introduction, *Componentization via Services*, *Organized around Business Capabilities*, *Decentralized Data Management* and *Evolutionary Design*; skim the rest. This supplies concrete architectural alternatives and explains why service boundaries affect deployment, data ownership, communication and changeability. It is useful precisely because the authors do not present microservices as universally preferable — they acknowledge the substantial costs of distributed coordination and the difficulty of changing service boundaries once established.'
    - heading: Technical debt as engineering judgment
      items:
        - cite: fowler2009debtquadrant
          annotation: 'Fowler, ["Technical Debt Quadrant"](https://martinfowler.com/bliki/TechnicalDebtQuadrant.html) (2009). Read the whole article. Fowler separates deliberate from inadvertent debt and prudent from reckless decisions. The point to carry away is that technical debt can be an economically defensible choice rather than merely evidence of poor engineering. Consider how cheaper agent-generated implementation changes the cost of both taking on debt and repaying it.'
    - heading: Evaluating inherited software
      items:
        - cite: openssf2025evaluating
          annotation: 'OpenSSF Best Practices Working Group, ["Concise Guide for Evaluating Open Source Software"](https://best.openssf.org/Concise-Guide-for-Evaluating-Open-Source-Software.html) (2025). Read the whole guide, concentrating on necessity, authenticity, maintenance, dependency management, security practices and practical evaluation. It gives an engineering procedure for deciding whether to adopt a dependency, rather than simply telling you to scan for known vulnerabilities, and it distinguishes evaluating a project''s security practices from evaluating its suitability for your application.'
    - heading: Optional reference — identifying license obligations
      items:
        - cite: spdx2025licenseinfo
          locator: 'the SPDX License List, identifiers, and license expressions'
          annotation: 'SPDX, ["Handling License Info"](https://spdx.dev/learn/handling-license-info/). Optional. Read the introductory material on the SPDX License List, short identifiers and license expressions, including combinations using AND, OR and WITH. It explains how licenses are identified and represented in machine-readable form — supporting material for the lecture''s treatment of permissive and copyleft licensing, and not a substitute for understanding the obligations of any particular license.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Architecture, Technical Debt & Software Supply Chains"
    src: 3-3-Architecture-Technical-Debt-and-Supply-Chains.pptx
---

*Can a useful implementation be changed economically, and what obligations has it inherited?*

An implementation that works is not yet an implementation that can be changed. This unit treats maintainability as a measurable structural property and dependencies as inherited obligations, then asks what both imply for the long-term ability to change a system.

**Lecture: Technical Debt, Architecture & Supply Chains.** Suppose an agent has produced an application that works. Can engineers change it economically when requirements evolve? We examine technical debt, coupling, cohesion, dependency structure, complexity metrics, and architectural erosion as ways to reason about maintainability. Architectural patterns provide alternatives for restructuring an implementation, not a catalogue to memorize; students compare patterns against concrete change pressures, including separation of request handling from domain logic and persistence. An application also inherits design and maintenance obligations from components it did not implement. Dependency graphs reveal direct and transitive dependencies, while software bills of materials, provenance records, and vulnerability information support assessment of what was included and where it came from. License analysis belongs alongside technical and security analysis: permissive and copyleft licenses impose different obligations, especially when software is combined or distributed.

## Readings

*The readings are listed above; the lecture slides appear under Materials once the deck lands.*
