# skills/repertoire.md — with what capability I act

**This facet owns one question:** *Having chosen an engineering move, what available
capability can perform it?*

This is a **semantic index**, not a skills manual. Self-Governance chooses the move; the
specialized skill executes it. So this file records only what Self-Governance needs to
*compose* capabilities — what each one is for, when it fits, what it needs, what it produces,
and where it stops. It never reproduces another skill's instructions.

## Provider versus skill — the line to keep

A **model provider tells you something**; a **skill does something**.

| Provider (see [`../system/model-access.md`](../system/model-access.md)) | Skill (here) |
|---|---|
| "What depends on X?" | "migrate X" |
| "What requirement applies?" | "validate the requirement" |
| "What is deployed?" | "deploy" |

Some plugins expose both a query surface and an action. Keep the distinction even then:
ask the query side as a provider, invoke the action side as a skill.

## The capability record

Each capability is indexed by the same shape, so Self-Governance can reason about
composition uniformly:

- **Purpose** — what engineering work it does.
- **Situations served** — the recognized situations that call for it.
- **Preconditions** — what must be true before it can act.
- **Authority required** — what standing or evidence it needs to proceed.
- **Effect** — what it changes.
- **Evidence produced** — what it leaves behind that a later step can check.
- **Limitations** — what it does *not* do.
- **Failure modes** — how it goes wrong.
- **Escalation** — when to hand off, and to whom.

Every entry here is **soft**. A skill can aim a probabilistic agent, but it cannot *block* —
so its effect becomes consequential only through the governed engineering environment (a
lint it scaffolds, a gate a human wires, a runbook the operate skill runs). No skill in this
index certifies its own output.

---

## self-communicate — engineer-facing prose and diagrams

- **Purpose:** write and audit the representations the fleet and its operator produce — a
  control's description, a design doc, a runbook, a handoff, an API reference, a status
  report to the human, a technical diagram.
- **Situations served:** any modeling or governance move that ends in words or a picture —
  authoring a mechanism entry, a design doc, or a diagram; auditing prose for structure,
  term consistency, or machine-tell density.
- **Preconditions:** the *content* is settled; craft is what remains. Communicate shapes the
  telling, not the decision.
- **Authority required:** none beyond the writer's — it advises on craft; the author still owns the claim.
- **Effect:** improved prose and diagrams; a consistent house lexicon.
- **Evidence produced:** an audited passage with concrete fixes; a rendered diagram.
- **Limitations:** it does not decide *what is true* or *what to do* — only how to say it.
- **Failure modes:** polishing prose that encodes an unsettled or wrong decision; inventing
  terms that drift from the house lexicon.
- **Escalation:** when the prose reveals the underlying decision is unsettled, return to
  [`../practice/judgment.md`](../practice/judgment.md) before writing more.

## self-operate — run the operational lifecycles

- **Purpose:** run the engineered environment as explicit operational lifecycles — route a
  condition to a typed runbook, execute the repeatable procedure, recover on failure, and
  return recurring or structural deficiencies back to Self-Governance.
- **Situations served:** an operational task or break — dispatching or landing agents,
  deploys, cron or merge-train health, reclaiming disk, host-tool trouble, recovering a
  substrate failure. Any "execute or recover a lifecycle" request.
- **Preconditions:** a known lifecycle with a defined healthy baseline and a runbook; the
  environment's operational state is legible.
- **Authority required:** operational standing to run the procedure in this environment.
- **Effect:** the environment is operated or recovered — it runs the mechanisms
  Self-Governance mints.
- **Evidence produced:** operational observations — what ran, what state it reached, what
  recurred.
- **Limitations:** it does **not** choose system models for engineering reasoning, exercise
  general MAGE judgment, or decide whether the architecture should change. It runs
  lifecycles; it does not redesign them.
- **Failure modes:** re-patching a recurring operational break by hand instead of returning
  it as a deficiency; operating outside a defined runbook.
- **Escalation:** a recurring or structural weakness surfaced while operating crosses back to
  **this** skill (INTERPRET-FAILURE) — that hand-back is the two skills' first-class
  interface. This is the boundary the router's "execute an operational lifecycle" line marks.

## self-governance — the recursive entry (this skill)

- **Purpose:** apply MAGE to the agent's own engineering work; mint durable controls from
  recurring failures and catch predictive smells at design time.
- **Situations served:** a failure recurred (INTERPRET-FAILURE); a governance posture review
  or a new-subsystem design review (AUDIT); any point in the loop where the move is to
  *decide what should persist*.
- **Preconditions:** a real, grounded failure or a concrete design under review — never
  governance in the abstract.
- **Authority required:** none to *propose*; hard mechanisms are scaffolded, then handed to a
  human or the harness to enforce.
- **Effect:** a proposed constraint / sensor / validator / gate, plus the point fix; a
  prioritized adopt / adapt / skip plan.
- **Evidence produced:** the failure→mechanism map; a scaffolded lint, test, gate, or typed
  seam; a design doc or Epic authored from the templates.
- **Limitations:** it is soft — it proposes, it does not install; it is not self-certification.
- **Failure modes:** the tower of governance — minting mechanisms faster than they earn their
  keep. Default to *skip*.
- **Escalation:** an operational task hands to **self-operate**; the resulting prose hands to
  **self-communicate**.

## repo-query — the source model provider (a tool-skill)

- **Purpose:** answer implementation-truth questions from this repository — source structure,
  the call and dependency graph, ownership, orchestrator / Epic state. It is the source
  provider adapter behind the model-access contract, not a general action skill.
- **Situations served:** you need implementation truth (the source provider row of the
  provider-selection table).
- **Preconditions:** the repository and its system-models are present and current.
- **Authority required:** read access to the models it queries.
- **Effect:** none — it is a query surface; it *tells*, it does not *do*.
- **Evidence produced:** grounded claims carrying SOURCE / AUTHORITY / FRESHNESS / EVIDENCE /
  CONFLICT.
- **Limitations:** implementation facts only. It does not carry intended architecture,
  normative requirements, or authoritative evidence — apply brownfield honesty about what it
  cannot answer.
- **Failure modes:** being mistaken for the whole system model — treating a derived
  dependency graph as normative.
- **Escalation:** for intent, contracts, or assurance, route to the corresponding provider;
  when that provider does not yet exist here, name the gap (per
  [`../system/model-access.md`](../system/model-access.md) brownfield honesty).

---

## Extending this index

This is a **hand-authored** index of the capabilities present in this environment. Other
tool-skills — format or domain skills, deploy skills, validation skills — are capabilities
too; record each here in the same shape when it becomes part of the agent's repertoire, and
keep the record semantic (what it is *for*), never a copy of its manual.

**Future item:** structured, machine-readable per-skill capability metadata (a block in each
skill's own frontmatter plus a schema) would let this index be discovered rather than
hand-maintained. That is a suite-wide infrastructure change, deliberately out of scope for
this rebuild — the smallest useful representation today is this authored index. Flag it; do
not block on it.
