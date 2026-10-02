Yes. With CDP as an explicit environment assumption, I would now make this a first-class frontend requirement rather than a vague “agent-friendly” aspiration.

Requirement: Live agent operability through CDP

Use case

A student uses the MAGE Model Workbench in a visible Chromium browser while running a coding agent, such as Claude Code, alongside it.

┌──────────────────────────────┐    ┌────────────────────────────────┐
│ Claude Code                  │    │ Chromium                       │
│                              │    │                                │
│ > Add a cache before the     │    │ MAGE Model Workbench           │
│   model gateway and check    │    │                                │
│   latency and memory.        │    │ API → Remediation → Gateway    │
│                              │    │                                │
└──────────────┬───────────────┘    └───────────────▲────────────────┘
               │                                    │
               └──── browser tooling / CDP ─────────┘

The Chromium instance is configured to permit Chrome DevTools Protocol (CDP) attachment. The student’s coding agent has browser tooling capable of attaching through CDP to that existing browser instance.

The agent attaches to the same browser instance and MAGE tab that the student is viewing. It does not operate a separate headless browser or maintain a separate copy of the model.

The student converses with the agent in the agent’s ordinary interface. The agent discovers MAGE’s structured frontend API, inspects the current model, performs model operations, and invokes deterministic analyses. Those operations mutate the same client-side application state driving the visible workbench. The student therefore watches the model, selections, hypotheses, and analysis results change while the agent works.

MAGE itself remains a static client-side application. It requires no MAGE server, local daemon, MCP server, LLM API key, account, or embedded chat interface.

The intended loop is:

Student
   │
   │ natural language
   ▼
Coding agent
   │
   │ browser tooling
   ▼
CDP
   │
   ▼
Student's visible Chromium tab
   │
   ▼
window.mage
   │
   ▼
MAGE application services
   │
   ├── model state
   ├── transactions / hypotheses
   ├── deterministic analysis
   └── view state
             │
             ▼
       Visible workbench

The core frontend requirement is therefore:

MAGE SHALL expose a versioned, self-describing JavaScript interface in the live browser page through which a CDP-attached agent can inspect and operate the complete workbench. Operations through this interface SHALL act on the same authoritative client-side state used by the visible human interface, such that agent actions and their results are immediately observable by the user.

⸻

Frontend agent interface specification

1. Environment assumption

MAGE MAY assume for the supported agent workflow that:

* the workbench runs in a Chromium-based browser;
* the browser permits CDP attachment;
* an external coding agent has browser tooling capable of attaching to that browser;
* the agent can identify the MAGE tab and evaluate JavaScript in its page context.

CDP is transport, not part of MAGE. MAGE does not open a debugging port, discover agents, maintain a socket to an agent, or implement CDP.

The boundary is:

OUTSIDE MAGE                    INSIDE MAGE
Agent
  ↓
Browser tooling
  ↓
CDP
  ↓
────────────────────────────────────────────
  ↓
window.mage
  ↓
Application services

MAGE’s responsibility begins at the page context.

⸻

2. Single authoritative state

There SHALL be exactly one semantic workspace state in a running workbench.

Human UI operations, imported files, and agent API calls SHALL ultimately invoke the same application services:

Human controls ────────┐
                       │
window.mage ───────────┼──→ Application services ──→ Model store
                       │                              │
Import / restore ──────┘                              │
                                                      ▼
                                      ┌───────────────┼──────────────┐
                                      ▼               ▼              ▼
                                    SVG           Inspector       Evidence

There SHALL NOT be an agent-specific model copy.

Consequently, if an agent adds an entity through window.mage, the ordinary workbench renders it. If an agent changes the active model, the student’s visible model changes. If an agent executes a query, its result appears in the ordinary evidence interface.

⸻

3. Global API

The workbench SHALL expose exactly one stable global entry point:

window.mage

Implementation internals SHALL NOT be treated as agent API.

For example, React stores, component instances, IndexedDB layout, internal event buses, and renderer data structures may change without changing the agent protocol.

The public API SHALL be explicitly versioned.

A useful top-level organization is:

window.mage.describe()
window.mage.context()
window.mage.system()
window.mage.model(id)
window.mage.validate(...)
window.mage.propose(...)
window.mage.hypothesize(...)
window.mage.query(...)
window.mage.result(...)
window.mage.select(...)
window.mage.focus(...)
window.mage.show(...)
window.mage.commit(...)
window.mage.discard(...)
window.mage.undo()
window.mage.redo()

The exact names can change during implementation. The semantic capabilities are the requirement.

All inputs and outputs SHALL be JSON-serializable.

⸻

4. Self-description

An agent should be able to enter an unfamiliar MAGE page and bootstrap itself.

The first operation is:

await window.mage.describe()

A representative result:

{
  "application": "MAGE Model Workbench",
  "protocol": "mage-agent/1",
  "workbenchVersion": "0.1.0",
  "modelFormat": "mage/1",
  "capabilities": {
    "structuralModels": true,
    "behavioralModels": true,
    "quantitativeModels": true,
    "hypotheses": true,
    "transactions": true,
    "queries": true
  },
  "instructions": [
    "Inspect semantic models rather than inferring semantics from diagrams.",
    "Modify semantic state only through transactions.",
    "Use hypotheses for exploratory design changes.",
    "Use deterministic queries for claims about modeled behavior.",
    "Distinguish exhaustive, bounded, and not-answerable results."
  ],
  "operations": { "...": "..." },
  "schemas": { "...": "..." }
}

describe() SHALL be generated from the implemented protocol definitions sufficiently directly that documentation cannot silently diverge from the actual interface.

The agent should not require a MAGE-specific prompt containing the API manual.

⸻

5. Context discovery

The agent SHALL be able to determine what the student is currently looking at:

await window.mage.context()

For example:

{
  "system": "docable",
  "revision": "sha256:...",
  "activeModel": "performance",
  "selection": ["remediation", "model-gateway"],
  "activeHypothesis": null
}

This makes deixis possible.

The student can say:

What happens if we put a cache here?

The agent can inspect the current selection and active view rather than asking the student to transcribe entity IDs.

Selection is therefore part of agent-visible context, although it is not semantic model state.

⸻

6. Semantic inspection

The agent SHALL be able to inspect the semantic model directly:

await window.mage.system()
await window.mage.model("service-flow")

The returned representation SHALL expose the same normalized semantic IR used by validation and analysis.

For example, the agent should see:

{
  "id": "service-flow",
  "question": "Which services may invoke which other services?",
  "represents": [
    "service-identity",
    "permitted-invocation"
  ],
  "omits": [
    "payload",
    "runtime-observation",
    "latency"
  ],
  "relations": [
    {
      "type": "may-invoke",
      "source": "remediation",
      "target": "model-gateway"
    }
  ]
}

It SHALL NOT need to infer may-invoke from an arrow in SVG.

⸻

7. Transactions

All semantic changes initiated through the agent API SHALL use the workbench transaction mechanism.

For example:

await window.mage.propose({
  base: "sha256:abc123",
  operations: [
    {
      op: "add-entity",
      id: "response-cache",
      type: "cache",
      label: "Response Cache"
    },
    {
      op: "add-relation",
      type: "may-invoke",
      source: "remediation",
      target: "response-cache"
    }
  ]
})

The transaction engine SHALL:

1. verify the base semantic revision;
2. apply all operations to a temporary IR;
3. validate the complete resulting system;
4. reject the transaction atomically if invalid;
5. leave authoritative state untouched on failure.

The revision hash SHALL be over canonical semantic IR, not source-file bytes.

IDs SHALL be stable and immutable. Labels may change.

There SHALL be no public agent operation equivalent to unrestricted setState().

⸻

8. Hypotheses

Exploratory agent modifications SHALL be representable without changing the authoritative model.

For example:

const h = await window.mage.hypothesize({
  base: "...",
  operations: [...]
})

This SHALL create a first-class hypothesis.

The visible workbench immediately displays it, preferably using the existing layout:

Remediation ───────→ Gateway
             becomes
Remediation ──→ [Cache] ──→ Gateway
                 NEW
              HYPOTHESIS

The agent can analyze the hypothesis:

await window.mage.query({
  target: { hypothesis: h.id },
  ...
})

and eventually:

await window.mage.commit(h.id)

or:

await window.mage.discard(h.id)

The UI SHALL always distinguish hypothetical state from committed state.

⸻

9. Deterministic queries

The agent SHALL have structured access to the same query engine used by the human interface.

For example:

await window.mage.query({
  model: "document-lifecycle",
  quantifier: "exists",
  predicate: {
    ...
  }
})

Results SHALL be structured, not merely textual:

{
  "status": "satisfied",
  "coverage": {
    "kind": "exhaustive",
    "statesExplored": 37
  },
  "evidence": {
    "kind": "witness",
    "trace": ["uploaded", "processing", "published"]
  }
}

The result vocabulary SHALL distinguish at least:

established
refuted
witness-found
counterexample-found
bounded / inconclusive
not-answerable
invalid

The exact vocabulary should be normalized during implementation, but a Boolean true/false result is insufficient.

A bounded search that fails to find a witness SHALL NOT become false.

⸻

10. Quantitative queries

The same mechanism applies to quantitative models.

An agent may create a cache hypothesis and then ask:

await window.mage.query({
  target: { hypothesis: "hyp-17" },
  query: "expected-latency"
})

The workbench might return:

{
  "value": {
    "magnitude": 390,
    "unit": "ms"
  },
  "requirement": {
    "operator": "<=",
    "value": {
      "magnitude": 750,
      "unit": "ms"
    }
  },
  "status": "satisfied",
  "derivation": { "...": "..." }
}

The value, units, aggregation, assumptions, and requirement status come from MAGE’s quantitative engine.

Claude may explain them. Claude does not become the calculator of record.

⸻

11. Not-answerable is a first-class result

The API SHALL make inadequate models legible to agents.

Suppose the agent asks whether restricted document contents can reach Model Gateway, but the current model represents permitted invocation and deliberately omits payload.

MAGE should return something like:

{
  "status": "not-answerable",
  "reason": "missing-distinction",
  "model": "service-flow",
  "missing": ["payload"],
  "detail": "This model represents permitted invocation but not transmitted payload."
}

This is preferable to either guessing or returning false.

It allows the agent to tell the student:

The service-flow model cannot establish that. It models permitted calls but not what data those calls carry. We would need to add payload information or construct another model.

That is itself part of what the Modeling unit is trying to teach.

⸻

12. View operations

The agent SHALL also be able to manipulate view state without modifying semantic state.

For example:

await window.mage.focus("performance")
await window.mage.select(["response-cache", "model-gateway"])
await window.mage.show({ result: "query-27" })

These calls should produce immediate visible changes.

This gives the student a shared visual workspace with the agent.

Claude can say:

The important change is on the gateway path.

while simultaneously causing MAGE to highlight:

API → Remediation → [CACHE] → [GATEWAY]
                    ^^^^^^^^^^^^^^^^^^^^

View operations SHALL be clearly separated from semantic transactions.

⸻

13. Observable agent operation

A key design invariant is:

Consequential agent operations SHALL have an ordinary visible representation in the workbench.

Thus:

Agent selects entity
        → entity visibly selected
Agent opens model
        → model visibly becomes active
Agent creates hypothesis
        → hypothesis visibly appears
Agent runs query
        → query/result appears in evidence UI
Agent receives counterexample
        → trace can be displayed/highlighted
Agent commits hypothesis
        → hypothetical treatment disappears
           and model becomes authoritative

The student should not need to trust an invisible state known only to Claude.

⸻

14. DOM/accessibility remains important

CDP plus window.mage means we do not need to make agents reconstruct models from the DOM.

Nevertheless, the ordinary interface SHALL use semantic HTML and accessible controls.

Rendered semantic objects should expose their identities where practical:

<g
  data-mage-id="model-gateway"
  data-mage-kind="service"
  aria-label="Model Gateway">

Requirements and query results should exist as textual/structured DOM content, not only colors or pixels.

This serves accessibility, testing, generic browser automation, debugging, and agents that choose to interact through the ordinary UI.

But it is the fallback interface, not the principal semantic protocol.

⸻

15. CDP lifecycle

MAGE itself SHALL make no assumptions about the particular CDP client.

The expected external lifecycle is:

1. Student starts Chromium with/for remote debugging
2. Student opens MAGE
3. Coding agent's browser tooling attaches through CDP
4. Tool enumerates targets/tabs
5. Tool selects MAGE tab
6. Tool evaluates:
      window.mage.describe()
7. Agent discovers protocol
8. Agent reads:
      window.mage.context()
      window.mage.system()
9. Agent operates MAGE
10. Student observes those operations in that same tab

If the student reloads MAGE, normal workbench persistence restores the model. The external agent can rediscover the new page context through window.mage.describe().

MAGE does not maintain a session with Claude.

⸻

16. Persistence remains entirely client-side

CDP changes nothing about the storage architecture.

Static MAGE assets
        │
        ▼
Browser
        │
        ├── semantic IR
        ├── IndexedDB/local persistence
        ├── analysis workers
        └── renderer

The authoritative portable artifact remains the exported .mage.yaml file.

CDP merely allows an authorized local agent to operate the running frontend.

Closing the agent does not affect the model. Disconnecting CDP does not affect the model. Exporting the model does not require the agent.

⸻

17. Provider independence

The specification SHALL refer to a CDP-capable coding agent, not Claude, except in examples and course setup instructions.

The contract is:

             CDP-capable agent
                    │
                    ▼
                  CDP
                    │
                    ▼
                 Chromium
                    │
                    ▼
              window.mage
                    │
                    ▼
             MAGE semantics

Claude Code may be the recommended classroom configuration, but MAGE’s protocol contains no Claude-specific concepts.

This also leaves a straightforward path to exposing the same operation schemas through WebMCP or another browser-agent standard later without redesigning the semantic kernel.

⸻

Acceptance test

The following should be a release-blocking end-to-end acceptance test for the frontend.

Start Chromium with CDP access. Open a MAGE workspace containing structural, behavioral, performance, and memory models. Attach an external coding agent to that existing browser instance.

Give the agent only:

Look at the MAGE model I have open. Add a 128 MB cache before Model Gateway, assume an 80% hit rate, and determine whether this improves expected latency without violating the memory requirement. Don’t commit the change yet.

The agent must be able to discover the workbench without being given its internal API.

It should then, through the live page:

discover window.mage
        ↓
inspect model + current selection
        ↓
identify relevant structural/quantitative models
        ↓
construct transaction
        ↓
create hypothesis
        ↓
             STUDENT SEES CACHE APPEAR
        ↓
run latency analysis
        ↓
             STUDENT SEES RESULT
        ↓
run memory analysis
        ↓
             STUDENT SEES RESULT
        ↓
inspect deterministic evidence
        ↓
explain results in agent window

The authoritative model remains unchanged because the student requested a hypothesis.

The student can then say:

Try 256 MB.

The agent revises the hypothesis. The visible MAGE page changes.

Then:

That’s better. Keep it.

The agent commits the validated hypothesis. The visible MAGE page changes from hypothetical to authoritative state.

No copying of YAML, JSON, JavaScript, query expressions, or model identifiers by the student is involved.

⸻

Short normative version

If we want the actual requirements document to contain the compact form:

FR-AGENT-1 — Live CDP agent operation. The MAGE Workbench SHALL expose a versioned, self-describing JavaScript API at window.mage suitable for invocation by an external agent attached to the user’s existing Chromium browser through Chrome DevTools Protocol. The API SHALL permit discovery, semantic model inspection, transactional model modification, hypothesis creation and disposition, deterministic query execution, evidence inspection, and manipulation of non-semantic view state. All operations SHALL use the same application services and authoritative client-side state as the human interface. Agent operations SHALL therefore be immediately reflected in the visible workbench. MAGE SHALL NOT require an application server, embedded LLM, agent-specific backend, MCP server, or separate agent-side model state. CDP transport and agent configuration are responsibilities of the user’s execution environment, not the MAGE application.

And one companion requirement:

FR-AGENT-2 — Agent legibility. The MAGE Workbench SHALL expose sufficient semantic metadata, schemas, model purpose and omission information, result status, coverage, evidence, and stable identity for an attached agent to determine what the current models represent, what operations are available, and what conclusions the workbench licenses without inferring engineering semantics from rendered geometry or other purely visual properties.

Those two requirements capture the architecture cleanly.
