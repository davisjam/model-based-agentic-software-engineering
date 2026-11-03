<!-- GENERATED from book/latex/sources/appendix-field-guide/cloudflare.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

### Cloudflare

*Internet infrastructure · policy-first governance at organizational scale*

#### Verso — Evidence

**What the public record shows.** Cloudflare describes an engineering-standards system in which requirements originating in RFCs are extracted into structured, machine-readable form. Requirements that can be checked mechanically can become custom checks; obligations requiring semantic judgment remain review questions. This separates the authority to establish policy from the machinery that applies it repeatedly.[cite: reimann2026codex]

Recording policy in a machine-readable form lets later checks apply it without asking someone to reconstruct the requirement each time.

**Boundary of the evidence.** The public accounts describe structured policy and checks more fully than executable models of the software being governed. They also describe rules and tooling changed in response to incidents and operating problems, but do not measure whether those changes reduced the failures that prompted them.[cite: hartman2026failsmall; rhea2026cloudflareos]

**Portable lesson.** Write a policy so that tools can apply it to later changes without requiring a person to interpret it again.

#### Recto — Connection to MAGE

<!-- label: field-guide-cloudflare -->
<!-- figure: assets/field-guide-cloudflare.svg | *Cloudflare’s connection to MAGE.* Structured requirements let tools apply policy across many changes. The accounts describe changes prompted by operating experience, but do not measure their effect on recurring failures. -->

**Connection to MAGE.** Cloudflare illustrates Alignment: tools check changes against engineering policy and can block violations. Modeling enters when requirements are recorded as structured statements that those tools can identify and use. Together, these mechanisms let one policy decision govern many later changes.

**What the evidence establishes.** The accounts describe policy enforcement and changes made in response to operating experience. They do not establish the effectiveness of the complete MAGE cycle.
