## How to use this catalogue

This appendix is a reference manual, not a chapter. Browse it; you are not meant to read it straight through. Each mechanism appears in its smallest useful form — a diagram, a short engineering summary, and a line of metadata — so you can recognize a mechanism and find it fast.

The chip line under each mechanism tells you four things at a glance: its **family**, its **primary concern**, whether it enforces **softly or hard**, and whether it is **essential** (expected in nearly every Governed Engineering Environment) or **specialized** (worth adopting when your domain calls for it). Essential and specialized mark expected applicability, not quality — a specialized mechanism is not a lesser one.

When a mechanism is central to MAGE, its Engineering Note in [appendix: appendix-b-flagship-mechanisms] carries the judgment behind it, and the brick points you there. The full [online catalogue]({{catalogue_url}}) holds the complete documentation, implementation guidance, and extended examples.

| Surface | Purpose | The reader's question |
|---|---|---|
| [appendix: appendix-stacks] | Reusable engineering architectures | *How do these mechanisms work together?* |
| [appendix: appendix-b-flagship-mechanisms] | Engineering judgment | *Why would an experienced engineer build it this way?* |
| [appendix: appendix-c-mechanism-catalog] (this appendix) | Mechanism catalogue | *What mechanisms exist, and where do I find them?* |
| [Online catalogue]({{catalogue_url}}) | Complete documentation | *I want the full entry — implementation, examples, the rest.* |

**Reading a brick.** Under each mechanism: **Family · Primary concern · Enforcement · Applicability**. *Enforcement* — **Hard** blocks, **Soft** guides, **Soft·Hard** ships a soft aim with a hard sensor. *Applicability* — **Essential** (expected in nearly every environment) or **Specialized** (adopt when the domain calls for it); this marks expected fit, not quality. A **technique** brick leads with the transferable pattern name and points to its advanced examples; an **instance** brick names the technique it folds under, loudest for the document-accessibility instances whose transferable lesson is the technique. A **flagship** mechanism also carries an **Engineering Note** link to its deeper discussion in [appendix: appendix-b-flagship-mechanisms].

{{technique_index}}
