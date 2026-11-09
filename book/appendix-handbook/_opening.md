<!-- GENERATED from book/latex/sources/appendix-handbook/_opening.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

An engineer consulting a handbook usually has something to do. A rule keeps being forgotten; a representation has drifted; an agent has completed work that cannot yet be accepted. This appendix starts with a short reference to the engineering moves developed in the book, then shows how several moves work together in DocAble.

The three worked compositions answer different questions. *Model Coherence* connects representations to the implementation they describe or govern. *Governance Conversion* turns a failure into something later work inherits. *Governed Delegation* gives a reasoner useful freedom while preserving boundaries around its actions and the evidence needed to accept its work. The examples were selected because each shows a different way an explicit representation changes engineering work: supplying knowledge, deriving configuration, controlling an action, or preserving evidence. Their value depends on what consumes them and how their correspondence with the system is maintained.

Not every engineering decision belongs in a model. Local implementation details remain in code, operational procedures often remain in runbooks, and judgments that cannot be reliably mechanized remain with engineers. The aim is to preserve consequential distinctions at a useful level of abstraction. A model that duplicates every implementation detail has surrendered much of its purpose.

**Where to Find the Models**

Each example identifies an actual representation, its consumers, and the correspondence or enforcement machinery around it. The excerpts omit unrelated declarations. They are intended to show what the engineer made explicit, rather than provide a complete implementation to copy.

<!-- label:  -->
<!-- table:  -->
| Model | Engineering question | Worked composition |
|------------------|----------------------------|------------------|
| Component and zone catalogue | Which implementation belongs to a component, and which knowledge applies there? | Model Coherence |
| Inter-service call contracts | Does a declared call have consistent wiring and the required invocation permission? | Model Coherence |
| Governance graph | Which mechanisms can interfere, and does their recorded wiring still exist? | Governance Conversion |
| Accessibility decision policy | How should uncertain evidence affect whether an image is described? | Governance Conversion |
| Document and changeset contract | What can a reasoner inspect and propose, and which edits can the applier refuse? | Governed Delegation |
| Work order and completion | Which knowledge applies to this assignment, and what establishes that its work arrived? | Governed Delegation |

A representation’s authority must be stated separately from its syntax. An authored contract specifies an obligation; an extracted view records what the implementation currently does; a derived plan computes a consequence of other facts. All three can be useful. A correct derivation from a mistaken obligation remains mistaken, and a faithful description can expose a system that should change.
