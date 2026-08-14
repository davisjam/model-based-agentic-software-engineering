# system/model-access.md — where concrete system truth lives

**This facet owns one question:** *How do I obtain concrete knowledge about **this** system?*

Self-Governance carries the MAGE model repertoire — it knows what kinds of things an
engineer represents and why each matters. It does **not** carry any particular system's
concrete models. Those live outside the skill: in repositories, architecture models,
requirements stores, schemas, knowledge graphs, trace systems, telemetry, and assurance
evidence. This facet teaches the agent to reach them through a uniform **model-provider
contract**, and to reason about the epistemic status of what comes back.

The division of labor is sharp. Self-Governance decides *which engineering question must be
answered*. The provider decides *how that question is answered from the system's concrete
models*. The skill never assumes the storage format, and never rediscovers the system from
raw artifacts when a model can answer.

## The model-provider contract

A **model provider** answers semantic questions about the system. It exposes seven
capabilities. Self-Governance calls them by meaning, not by any provider's internal API.

| Capability | Returns |
|---|---|
| `discover_models()` | which representations exist here, and each one's authority and status |
| `query_model(question, scope)` | an answer grounded in one or more concrete models |
| `get_entity(id)` | a modeled entity and its relationships |
| `get_relations(id, relation_type?)` | dependencies, traces, containment, ownership, and the like |
| `get_evidence(claim_or_entity)` | tests, validators, observations, provenance |
| `get_authority(model_or_entity)` | authoritative / derived / advisory / stale / unknown |
| `get_conflicts(subject)` | contradictory representations or evidence |

Several providers may answer the same question from different models — **model federation**,
not one omniscient plugin. Ask each the part it can ground, then reconcile. A question like
*"Can I safely change this interface?"* decomposes into sub-questions the agent routes across
providers: the authoritative interface definition (schema), its consumers (source), the
compatibility obligation (requirements), the linked assurance (trace), the observed callers
(runtime).

## Provider selection is judgment

Route each engineering question to the provider whose model can ground it. The routing is
semantic — you choose by *what kind of truth you need*, never by a hard-coded plugin name.

| I need… | Ask the… |
|---|---|
| implementation truth (what the code actually does) | source / repository provider |
| intended structure (how it is meant to be organized) | architecture provider |
| normative obligation (what is permitted or required) | requirements / constraint provider |
| a data or interface contract | schema provider |
| relationships or coverage (what links to what) | traceability provider |
| observed behavior (what actually happened at runtime) | runtime / telemetry provider |
| assurance status (what establishes that a property holds) | evidence / validation provider |

**The routing is itself an engineering move.** A question about safety is not a question
about intent, and neither is a question about what the code happens to do today. Choosing the
wrong provider answers a narrower question than the one you asked — the same silent-narrowing
failure the judgment facet warns against. When several providers bear on one decision, query
each and let the epistemic status (below) tell you which answer governs.

## Every claim carries its epistemic status

A returned fact is never bare. Before Self-Governance acts on a claim, it inspects five
things — so that an authoritative requirement is never interchangeable with a derived
dependency graph or a stale model.

- **SOURCE** — which model produced this claim?
- **AUTHORITY** — is it normative, authoritative, derived, advisory, or stale?
- **FRESHNESS** — what version or state of the system does it describe?
- **EVIDENCE** — what supports it (tests, provenance, observation)?
- **CONFLICT** — does another model disagree?

Three consequences follow, and the agent should hold them as reflexes:

- **A repository is not automatically the authoritative model of intent.** It tells you what
  implementation exists; it may not tell you what was intended or what is permitted.
- **A model is not automatically current.** A representation can lag the code it describes;
  check freshness before trusting it.
- **A generated graph is not automatically normative.** A derived architecture graph and a
  normative requirements model are different kinds of thing, even when they overlap.

When providers conflict, that is a **finding**, not a nuisance to smooth over. Surface it and
let authority and freshness decide which model governs — or escalate if neither settles it.

## Brownfield honesty

Most environments expose only some providers. Often only a source provider exists. Use it —
and recognize the limit out loud:

> "I can establish implementation dependencies, but I do not currently have an authoritative
> requirements or architecture model."

That honest statement is far better than treating the repository as a complete model of
intent. Naming the missing provider is also a governance-conversion candidate: a durable
lesson may be *"this system needs an authoritative requirements model,"* handed to
[`../learning/governance-conversion.md`](../learning/governance-conversion.md).

## repo-query is one provider, not the system model

In this repository, the system-models query tool (`repo-query`) is **one concrete adapter**
behind the contract. It answers from source structure, the call and dependency graph,
ownership, and orchestrator / Epic state — implementation facts. It does not pretend to be
the whole system model, and the modeling repertoire is broader than "query the repo": the
repository can tell you what implementation exists, not what was intended, what is permitted,
or what evidence is authoritative. Treat `repo-query` as the source-provider instance and
apply brownfield honesty about the providers this environment does *not* yet expose.

## What this facet does *not* own

- **It is not a modeling file.** [`../modeling/repertoire.md`](../modeling/repertoire.md)
  says *an architecture model is useful for X*. This facet says *here is how you discover
  whether this environment exposes one, and how you obtain its contents*. Model families are
  nouns owned there; provider access is owned here.
- **It is not a capability index.** A provider **tells you something**; a skill **does
  something** — "what depends on X?" versus "migrate X." Capability selection lives in
  [`../skills/repertoire.md`](../skills/repertoire.md). Some plugins expose both a query
  surface and an action; keep the conceptual distinction even so.
- **It does not carry invocation mechanics.** How a particular provider is called — the MCP
  handshake, the CLI flags, the query syntax — belongs in that provider's **tool-skill**, not
  here. This facet teaches *when and why* to call a provider and *how to weigh what it
  returns*; the *how to call it* is documented with the tool.

## Status: the contract lands; the general provider does not yet exist

This facet teaches the **contract** — its semantics, selection-as-judgment, and epistemic
discipline. It has value today with only the source provider (`repo-query`) behind it,
precisely because it teaches the agent to recognize that limit rather than hallucinate a
complete model.

The **generalized `ModelProvider` implementation** — a full source adapter plus architecture,
requirements, schema, trace, and telemetry providers behind one interface — is a separate
infrastructure effort, not part of this rebuild. Until it exists, `discover_models()` returns
essentially the one adapter, and the agent operates in the brownfield story above. Reason
through the contract now; the federation arrives later.
