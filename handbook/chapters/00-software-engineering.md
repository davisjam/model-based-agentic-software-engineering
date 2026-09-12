---
id: software-engineering
title: Software Engineering with GenAI
short_title: Software Engineering
order: 0
status: draft
description: >
  Commodity intelligence makes implementation abundant. Software engineering does not disappear; it
  reorganizes around the judgment, representation, evidence, and enforceable obligations that remain
  scarce.
objectives:
  - Explain how commodity intelligence changes the economics of software engineering.
  - Identify what becomes scarce when implementation capacity becomes abundant.
  - Relate the six claims about engineering with GenAI to the MAGE working cycle.
---

**Premise.** *Commodity intelligence changes the economics of software engineering.* As
implementation becomes abundant, engineering does not disappear: its scarce resources become more
visible.

This is the opening argument. It asks what changes when implementation capacity becomes abundant,
and why generative AI is an engineering tool to be governed rather than a replacement for
engineering judgment. The rest of the book develops the response.

## Six claims about software engineering with GenAI

Six claims describe how GenAI changes software engineering.

1. **Commodity intelligence changes the economics of software engineering.** Implementation capacity
   is becoming abundant relative to engineering judgment. As implementation gets cheaper, engineering
   effort shifts toward what remains scarce: deciding what to build, representing the system clearly
   enough to reason about it, producing evidence, and making important requirements enforceable by the
   engineering environment.
2. **Scale creates a reasoning problem.** Large software systems already exceed the reasoning horizon
   of humans; agents inherit the same problem. Software engineering has always answered scale with
   abstraction. Commodity intelligence does not remove that need. It makes the representations that
   guide the work more important.
3. **Modeling makes engineering knowledge and intent explicit.** Purposeful models capture the
   knowledge and intent needed for engineering decisions while leaving irrelevant choices open. As
   commodity intelligence lowers the cost of deriving, maintaining, and using such representations,
   more engineering knowledge can be carried forward rather than reconstructed from implementation.
   Models let humans and agents reason about larger properties while deliberately leaving realization
   choices open where engineering has imposed no obligation.
4. **Alignment makes engineering obligations enforceable.** Important engineering decisions cannot
   live only in instructions to an agent or in a person's head. Alignment encodes selected obligations
   into checks and controls that can constrain work or determine what the environment will accept.
   Engineers can then give agents substantial freedom in how they build the system while retaining
   control over the properties that matter.
5. **Governance conversion turns recurring judgment into durable engineering structure.** When a
   failure exposes missing knowledge or an unenforced obligation, encode the lesson into a model,
   procedure, or mechanism that future work can inherit. Durable structure becomes engineering capital
   when later work keeps benefiting from it.
6. **Engineering work will reorganize around what remains scarce.** As implementation becomes cheaper,
   more engineering effort will move toward representation, evidence, governance, coordination, and
   judgment. Agents may perform increasing portions of that work as well. The durable boundary is
   responsibility for deciding what matters, what evidence is sufficient, which obligations should be
   enforced, and what tradeoffs remain acceptable.

## From the claims to MAGE

These six claims lead to MAGE: Model-Based Agentic Software Engineering.

::: {.definition #def-mage title="MAGE"}
Model-Based Agentic Software Engineering (MAGE) is a working cycle: model consequential knowledge;
enforce important obligations; do the governed work; convert recurring failures and judgment into
durable structure; then repeat. Its goal is not maximum automation but greater autonomy that
preserves the engineering decisions and controls that matter.
:::

One question recurs throughout this book: *how do we safely grant autonomy to commodity
intelligence — and what cannot be delegated?* Modeling, Alignment, and governance conversion each
develop from that engineering problem, rather than standing as a collection of prescribed practices.
