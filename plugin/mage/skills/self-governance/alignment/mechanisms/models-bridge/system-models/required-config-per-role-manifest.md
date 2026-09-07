# Required-configuration-per-role manifest (admission policy on complete env)

**Intent** — Declare, per operating role and per plane it runs in, the **complete set of configuration a
process must have to start**, as a typed manifest an admission check reads — then refuse to launch a
process whose environment is missing any of its required set. A missing secret or unset variable fails
loudly at admission, before the process does half its work and then fails quietly deep in a request (our
instance: a dispatch-role × plane → required-env-var manifest that gates start-up when a role's set is
incomplete).

| | |
|---|---|
| Summary | Role × plane → the complete required config set, checked as an admission policy at start-up. |
| Target | Bridge · **System models** |
| Form | `typed-ir` |
| Move | `package` — a constraint shipped with its sensors |
| Model | `is-a-model` — a structured model you check a system property against |
| Enforcement | **Hard** (deterministic) — the manifest declares each role-and-plane's required set, and an admission check refuses to start a process whose environment omits any required entry |
| Derivation | `model-from-code` — the required set is reconciled against what each role's code actually reads |

*Its place in the environment — a **variant / known-use** of **Executable Source of Truth**, under **KNOW · Maintain authoritative system knowledge**. Preserved here for its technical texture.*

## Motivation — the failure it kills

A process needs a scatter of configuration — API keys, service tokens, admin secrets, endpoint URLs — and
*which* it needs depends on what role it plays and which plane it runs in. Locally a subset suffices;
in production a different subset is mandatory; a background role needs tokens a foreground one does not.
When the required set lives only as implicit knowledge, the failure mode is the worst kind of quiet: the
process starts fine, runs until it reaches the one code path that reads the missing variable, and *then*
fails — a 403 on an admin endpoint, an auth failure between services, an alt-text call that silently
returns nothing because the key was never set. The environment was incomplete from the first second, but
nothing checked completeness at the boundary, so the gap surfaces late, far from its cause, and often only
under the specific request that touches it.

## Why it's not just reading an env var when you need it

Reading a variable at its point of use, and failing if it's absent, catches the gap — but at the *worst
possible time*: after the process is admitted, mid-request, once for each missing variable, in whatever
order the code paths happen to fire. The manifest moves the check to **admission**: the complete required
set for this role-and-plane is known before the process does any work, so an incomplete environment is
refused at the boundary, once, with the full list of what's missing. That is the difference between a
scattered runtime `KeyError` and an **admission policy**. The manifest also makes *completeness* a checkable
property, which per-site reads never can: no single `getenv` call knows the whole set a role requires, so
no per-site check can say "this environment is complete for this role." Only a declared set can, and only
a declared set reconciled against what the role's code actually reads stays honest as the requirements
change.

## Mechanism

- **Enumerate the required set per role and plane.** For each operating role, in each plane it runs in,
  the manifest lists every configuration entry the process must have — the complete set, not a sample.
- **Check completeness at admission.** Before a process begins work, the check compares its environment
  against its role-and-plane required set and refuses to start if any entry is missing, reporting the whole
  gap at once.
- **Distinguish plane from plane.** A role's required set differs by where it runs — a local plane may
  demand less than a production one — so the manifest is keyed by both role and plane, not by role alone.
- **Reconcile the set against the code.** The declared requirements are checked against what each role
  actually reads, so a newly-required variable added in code without a manifest entry, or a manifest entry
  no code reads, is a build finding.
- **Fail loud and early, never late and quiet.** A missing entry stops the process at the boundary rather
  than letting it run until the request that happens to need the value, converting a deep intermittent
  failure into an immediate refusal.

## Prerequisites

- **Roles with genuinely different config needs.** The manifest earns its keep when what a process
  requires depends on its role and plane; if every process needs the same set, a single start-up assert
  suffices.
- **An admission point to check at.** There must be a boundary — a start-up hook, a dispatch gate — where
  the environment can be checked against the required set before work begins.
- **A reconciliation against real reads.** The required set must be checkable against what the role's code
  actually consumes, or the manifest drifts into an aspirational list.

## Consequences & costs

- **Incomplete environments are refused at the door.** A missing secret fails start-up with the full list
  of what's absent, instead of surfacing as a late, role-specific, request-specific error.
- **The manifest is another surface to keep true.** A newly-required variable must be added to the
  manifest as well as read in code; the reconciliation gate is what forces the two to agree instead of
  letting the manifest fall behind.
- **It checks presence, not correctness.** The manifest proves the required set is *present*, not that each
  value is *valid* — a wrong-but-set key still passes admission and fails at use, a narrower gap the
  manifest deliberately does not close.

## Known uses

- A dispatch-role × plane manifest of required configuration: which tokens and secrets each operating role
  must have set, differing between the local plane and the production plane.
- An admission check that refuses to start a process whose environment omits any entry in its
  role-and-plane required set, reporting the whole missing set at once.
- The required set reconciled against what each role's code actually reads, so a newly-mandatory secret
  added in code without a manifest entry is a build finding rather than a late production auth failure.

## Related mechanisms

- **Sibling** — [deployment-topology-model](deployment-topology-model.md): both model the physical
  runtime; that one places the processes across the fleet, this one states the configuration each placed
  process must have to start.
- **Enabler** — [role-typed-dispatch](../../agent/context-and-dispatch/role-typed-dispatch.md): the role a process is dispatched under is
  the key this manifest looks its required set up by; typed roles are what make a per-role required set
  expressible.
- **Consumer** — [meta-model-consumption](meta-model-consumption.md): the admission check reads the
  required set from the manifest rather than duplicating it, the read-don't-hardcode discipline applied to
  configuration requirements.
- *See also* — [drift-parity-gates](drift-parity-gates.md): the reconciliation that keeps the declared
  required set equal to what each role's code actually consumes.
