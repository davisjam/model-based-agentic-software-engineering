---
title: Phase 1: Regulatory Analysis
week:
mage_readings: []
objectives: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
---
*Starts Aug 31, 2026*

In Phase 1, your team and pod will study your assigned regulation and explore the software-engineering problems it creates.

Your goal is to understand the problem space before deciding exactly what to build. By the end of this phase, your pod should have a shared understanding of the regulation and its major engineering implications, while individual teams should have developed concrete ideas about systems that could address them.

## Step 1 — Study the Regulation

Study the assigned regulation and supporting materials you discover.

Identify:

- Who is subject to the regulation?
- What systems, products, activities, or information does it cover?
- What obligations are relevant to software?
- What must an organization be able to demonstrate?
- What deadlines, thresholds, exceptions, or other conditions matter?
- Where does the regulation leave room for interpretation or engineering judgment?
- What happens when an organization fails to satisfy its obligations?

Trace important conclusions back to authoritative sources. Regulations, agency guidance, standards incorporated by reference, and other primary materials should take precedence over summaries produced by third parties or Generative AI.

You do not need to model the entire regulation. Focus on the portions that could plausibly motivate the software systems your pod is considering.

## Step 2 — Model the Problem

Develop models that make the important parts of the problem explicit.

Choose representations appropriate to what you need to understand. Your models might represent:

- Stakeholders and their goals
- Regulatory obligations and relationships among them
- Important entities and information
- Processes and workflows
- System boundaries and external systems
- States and transitions
- Inputs, outputs, and events
- Trust boundaries, threats, or failure modes

There is no required modeling notation. Use representations that help your team reason about the problem and communicate it to others.

Models should simplify the problem deliberately. Include what matters to the decisions you need to make; do not attempt to reproduce the regulation in diagram form.

## Step 3 — Investigate Existing Solutions

Determine how the problem is addressed today.

Look for existing:

- Commercial products
- Open-source systems
- Organizational processes
- Standards and technical guidance
- Research prototypes
- APIs, libraries, and platforms that could form part of a solution

For important existing solutions, identify what they do well, what they leave unresolved, and whether your project should build on them, integrate with them, or take a different approach (e.g., ignore them and build your own anyway because it's interesting).

The existence of an existing product does not disqualify a project. Software engineering routinely involves deciding what to build, buy, reuse, or integrate.

## Step 4 — Identify Candidate Problems

Identify concrete problems for which software could help satisfy, operationalize, or provide evidence about the regulatory obligations you studied.

For each promising problem, describe:

- **User or stakeholder:** Who has the problem?
- **Problem:** What do they need to accomplish?
- **Regulatory connection:** Why does the regulation make this important?
- **Current approach:** How is the problem handled today?
- **Software opportunity:** What could software do better?
- **Evidence of success:** What observable outcome would indicate that a solution works?

Distinguish the problem from a particular implementation. "Organizations need to determine which product releases contain known vulnerable components" is a problem. "Build a React dashboard backed by a vulnerability database" is already a solution.

## Step 5 — Develop Candidate System Concepts

Each team should develop at least two candidate system concepts that address problems identified in the preceding analysis.

For each concept, provide:

- A short name
- The problem it addresses
- Intended users
- The system's principal responsibilities
- Important inputs and outputs
- The regulatory obligations it helps address
- A plausible way to evaluate whether it works
- Major technical or engineering risks
- Existing systems or components you might reuse

Keep these concepts at the system level. Detailed requirements, architecture, technology selection, and implementation planning belong primarily to Phase 2.

## Step 6 — Compare Within Your Pod

Meet with the other teams in your pod.

Compare:

- Interpretations of the regulation
- Problem models
- Existing solutions you discovered
- Candidate problems
- Candidate system concepts
- Important disagreements or uncertainties

Record useful disagreements rather than forcing premature consensus. Different interpretations are valuable when they expose assumptions that need to be resolved.

Your pod will converge on a common problem and system scope in Phase 2. Each team will then independently design and implement a system satisfying that shared specification. Phase 1 should therefore leave the pod with several well-understood alternatives from which to choose.

## Deliverables

Each team will submit a Phase 1 report containing:

1. **Regulatory analysis.** A concise account of the regulatory obligations most relevant to the problem space, with citations to authoritative sources.
2. **Problem models.** Models representing the important stakeholders, obligations, processes, information, or other structures your analysis requires.
3. **Existing-solution analysis.** A brief analysis of relevant commercial, open-source, organizational, or research solutions.
4. **Candidate problems.** The most promising software-engineering problems your team identified and their connection to the regulation.
5. **Two or more candidate system concepts.** Enough detail to support meaningful comparison during Phase 2.
6. **Pod findings.** Important ideas, disagreements, uncertainties, and alternatives that emerged from discussion with the other teams in your pod.
7. **References.** Sources used to support your analysis.

Your Phase 1 work should establish what matters and what might be worth building. Phase 2 will turn that understanding into a shared specification and a project that every team in the pod can independently realize and test.
