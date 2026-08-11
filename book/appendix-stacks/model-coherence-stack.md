*A two-page synthesis of the model-coherence stack. Six patterns let a context-bounded agent reason through
a typed map of the system instead of the whole territory — and keep the map equal to the territory, so what
the agent queries is what is true.*

## The capability

An agent cannot hold the whole codebase in its context. It has to act anyway. So the question is whether it
can reason *safely* about a system it can only see a slice of at a time.

**Give a bounded-context agent a typed map it can reason through, and hold that map equal to the code so the
map never lies.** It answers two capabilities at once — *maintain authoritative system
knowledge* and *keep representations equal to reality*. The models are executable data, not prose — read live, checked against
reality by a gate, derived where a derived edge cannot drift, and generated back into the system. An agent
that cannot hold the whole codebase queries the map instead, and the map is trustworthy because machinery,
not hope, keeps it current.

### Symptoms you need this stack

You are probably feeling one of these:

- Your architecture lives in diagrams and prose, and it is stale the day after the code moves.
- A fact copied out of a model into a consumer's own code has quietly diverged from what the model now says.
- The map points at something the code no longer has — or misses something the code does — and the fleet reasons through it anyway.
- One complex file format is written from a hundred raw call sites, so a malformed write can land from any of them.

### When to adopt this stack

Use this stack when:

- an agent cannot hold the whole system in context and must reason through a map of it instead
- you need a map the fleet can trust because machinery, not habit, keeps it equal to the code

Typical domains:

- large agent-collaborative codebases
- model-driven and MBSE engineering
- multi-service system topologies
- tools built over a complex shipped file format

## Failure classes it covers

- **The prose that drifts.** Structure lives only in diagrams and sentences; a program cannot read it, so it
  falls out of step the moment the code moves and no one notices.
- **The stale snapshot.** A consumer copies a fact out of the model into its own code; the copy and the model
  diverge silently, and the consumer acts on a value the model no longer holds.
- **The map that lies.** A model row points at a thing that no longer exists, or a real thing on disk has no
  row, and the fleet reasons through a map that quietly disagrees with the code.
- **The broken join.** The link between a model and the code it governs lives in someone's head; the code
  moves, the link breaks invisibly, and no gate fires.
- **The hand-edited generated file.** Boilerplate the model implies is written by hand beside it; the two
  fall out of step and the generated-looking file is silently stale.
- **The hundred raw writes.** Mutation of a format happens through many raw library calls, so a malformed
  write can land from any of a hundred sites with nowhere to encode the format's invariants.

## Composition

<!-- label: model-coherence-stack -->
<!-- figure: assets/model-coherence-stack.svg | The model-coherence stack in one picture. Six parts run left to right in two capability lanes plus the sealed-format part. Authoritative knowledge (fleet blue): DATA models the system as executable typed data; CONSUME reads it live and never snapshots; EMIT generates artifacts back from the model. Equal to reality (governed green): PARITY fails the build when a model and reality disagree either way; DERIVE anchors every model-to-code edge on a resolvable symbol a lint re-checks, so a derived edge cannot drift. SEAL (accent) routes all mutation of a shipped format through one typed model held sole by a ban-lint. The map is executable, read live, held equal to the territory, and generated back into it. -->

The stack has two lanes. Three parts make the map authoritative — model it as data, read it live, generate
from it. Two parts hold it equal to reality — a parity gate and derived edges. One part seals the same
discipline onto a shipped product format.

## The constituent parts

Six parts build the guarantee in rungs: model the system as executable data, read that data live instead of
copying it, hold it equal to reality with a parity gate, raise parity to a derived graph, generate real
artifacts from the model, and apply the same discipline to a shipped file format.

### DATA — model the system as executable data {#a-2-executable-source-of-truth}

**Make the system machine-readable.** Model the system as executable data the tools import and run on, so a
program reads the structure and catches it the moment it moves. (DATA.)

**Draws on** — the system's own structure: its components, its state machines, its service topology, its
registries. Nothing precedes it; this is the ground the rest stand on.

**Ensures** — a machine-readable model a tool loads on every run and generates real artifacts from. A
query returns the live fact where a stale sentence cannot. The structure lives as data, so a program can
check it, not merely a reader who happens to look.

**Hands to CONSUME** — a typed object every part below stands on. The consumer queries it, the parity gate
checks it against reality, the generator emits from it, the traceability graph anchors its edges to it. The
data is authoritative in name only until the parity gate three rungs down holds it equal to the code; on its
own it is just well-typed documentation.

→ **Deeper treatment:** role:executable-source-of-truth.

### CONSUME — read the model, don't copy it {#a-2-meta-model-consumption}

**Read the fact, never a copy of it.** Each consumer resolves the fact it needs by querying the live model,
so no second copy exists to fall out of date. (CONSUME.)

**Draws on** — the typed model DATA published, and a consumer that needs one of its facts: a queue name, a
component boundary, a policy value.

**Ensures** — one authoritative value and no second copy to fall out of date. The consumer reads the
model in place, so the fact it acts on is the fact the model holds now. A copy-detecting lint catches the
one consumer that smuggles a constant back in.

**Hands to PARITY** — a single value to check, not a scatter of copies to reconcile. Because every consumer
reads live, "source of truth" becomes true in practice rather than in aspiration, and the parity gate
downstream has one authoritative value to hold against reality instead of a dozen drifting snapshots. This
is the discipline that makes the DATA above it worth trusting.

→ **Deeper treatment:** role:meta-model-consumption.

### PARITY — fail the build when the map and territory disagree {#a-2-drift-parity-gates}

**Catch drift mechanically.** A fleet of deterministic lints fails the build whenever a model and the
reality it mirrors disagree, in either direction. (PARITY.)

**Draws on** — the executable model and the reality it claims to mirror: the code, the artifacts, the things
on disk it names.

**Ensures** — bidirectional parity or a red gate. Every model row resolves to a real thing, and every
real thing carries its row; a meta-sync contract names, per model, what reality it mirrors and when it must
be re-derived. So the map cannot quietly lie while the fleet reasons through it.

**Hands to DERIVE** — trusted data the rest of the stack can build on. The gate converts "the model is
probably right" into "the model is right or the build is red," so the executable data, its live consumers,
and the emitted artifacts can all be trusted at once. Drop it and every part around it degrades into
optimistic documentation.

→ **Deeper treatment:** role:drift-parity-gates.

### DERIVE — anchor every model-to-code edge to a symbol {#a-2-symbol-anchored-traceability-graph}

**Make every join refactor-proof.** Anchor each model-to-code edge on a resolvable symbol a lint re-checks,
so moving the code reddens the scan instead of silently breaking the link. (DERIVE.)

**Draws on** — the parity-held models and the code symbols they connect to: the functions, the classes, the
checks that give each edge a real endpoint.

**Ensures** — edges that cannot drift. Each terminates on a resolvable symbol, never a line number, and
is a derived obligation a lint re-checks at scan time. Move the code and the symbol either stays resolvable
or the scan reddens; the broken link turns mechanically visible instead of rotting in someone's head.

**Hands to EMIT** — a graph of trustworthy connections to generate from. Where PARITY asserts a model
matches reality, DERIVE computes the join, so those edges need no hand-authored parity rule at all — the
higher rung. It leaves the generator standing on links that a refactor cannot silently break.

→ **Deeper treatment:** role:symbol-anchored-traceability-graph.

### EMIT — generate real artifacts from the model {#a-2-model-driven-codegen}

**Generate from the model, don't restate it.** A generator emits real artifacts from the model — policy,
wiring, catalogs, contract types — each carrying a provenance header. (EMIT.)

**Draws on** — the parity-held, traceable model, consumed the way a compiler consumes a source file.

**Ensures** — generated artifacts that cannot silently drift from the model. Each is emitted from the
model, so the model drives the system rather than merely describing it. A provenance header names the
emitter and the regen path, so a hand-edit to a generated file is caught on the next run and reverted.

**Hands to SEAL** — a model that now writes the territory, not just maps it. Because the artifact is
derived, the parity gate treats it as generated output, not a second source to reconcile. What remains is to
apply the same one-model discipline to a shipped file format, which the last part does on the product side.

→ **Deeper treatment:** role:model-driven-codegen.

### SEAL — route a file format through one model {#a-2-pdf-model}

**Give the format one mutation surface.** Route every read and write of a complex file format through one
structured model, with raw library access banned (our instance: a PDF model over the canonical PDF library). (SEAL.)

**Purpose** — apply the same one-model discipline to a shipped file format, where mutation would otherwise
scatter across a hundred raw library calls with nowhere to encode the format's invariants.

**Mechanism** — one typed model is the sole door; a ban-lint forbids the raw library, so every change passes
through code that encodes the format's invariants. Every mutation a remediation pass wants to make routes
here rather than through a raw call site.

**Guarantee** — a single, compiler-checked mutation surface. A malformed write can no longer land from just
anywhere, and a fix to an invariant holds everywhere at once. This is also the single door the provenance
stack's stamp-writer needs to cover, so the two stacks meet at exactly this seam.

→ **Deeper treatment:** role:pdf-model.

## A DocAble example, end to end

DocAble's PDF remediation is where SEAL earns its place. Every tag-tree read and write routes through one
typed PDF model; a ban-lint forbids raw calls to the underlying library, so the format's invariants live in
exactly one place and a fix holds across every call site at once. The surrounding lanes govern the wider
system. The component-and-zone model, the job-lifecycle machines, the domain registries are all **DATA**. Tools
**CONSUME** them live: a check resolves "which service owns this seam" by querying the model, never a copied
constant — the data is a source of truth because it is read, not paraphrased. **PARITY** gates fail the build if a model row names a
service that no longer exists, or a service ships with no row. **DERIVE** anchors each model-to-code edge on
a symbol, so a refactor that moves the code reddens the scan instead of silently breaking the link. And
**EMIT** regenerates catalogs and wiring from the models with provenance headers, so the generated files
cannot quietly fall behind their source.

## Tradeoffs and adoption order

1. **DATA and CONSUME are the floor.** Typed data plus read-don't-copy costs a query in place of a constant.
   Without them there is no model to keep honest.
2. **PARITY is mandatory, not optional.** The executable data is worth nothing without the gate that holds it
   equal to reality; drop it and every model degrades into optimistic documentation. Its cost is a gate per
   model.
3. **DERIVE raises the ceiling.** Where the gate *asserts* a match, derived edges make parity unnecessary for
   those joins — symbol-anchored edges survive refactors that line numbers would not.
4. **EMIT and SEAL are targeted.** Codegen pays off where the model implies boilerplate; the sealed format
   model pays off on a complex shipped format, at the cost of building the model and migrating every call
   site.

The whole stack leans on one presumption: consumers read live and mutations route through the sanctioned
surface. A smuggled snapshot or an escaped raw call is where it weakens — each held by its own lint.

## Choosing a rung for one fact — hold the join at the highest affordable rung

The stack's parts are also a **strength ladder for a single fact that lives on two surfaces.** Whenever the
same fact is written in two places — a value in the model and a copy in the code, a spec and a sample, a
status recorded once and read somewhere else — the two can fall out of step. The parts above say how firmly
you can hold them together, strongest first:

- **UNIFY (strongest) — no second surface at all.** Keep the fact in exactly one place, as executable data
  (the **DATA** rung). There is no join to hold because there is no copy. The compiler, not a gate, keeps it
  honest.
- **CODEGEN — generate the second surface.** Where a second artifact must exist, emit it from the first
  (the **EMIT** rung), with a provenance header. The copy is regenerated, not hand-authored, so it cannot be
  edited into disagreement — a stray hand-edit is reverted on the next run.
- **DERIVE — compute the join.** Where both surfaces are genuinely authored, anchor the edge between them on
  a resolvable symbol a lint re-checks (the **DERIVE** rung). Move the code and the scan reddens; the join
  cannot break in silence.
- **PARITY — assert the join.** Where you cannot compute the edge, a deterministic lint asserts the two
  surfaces match and fails the build when they diverge (the **PARITY** rung). Both surfaces are hand-kept;
  the gate catches the drift after the fact.
- **comment (holds nothing).** A note that says "keep these in sync" is the bottom of the ladder. It records
  the obligation and enforces none of it — the two surfaces drift the first time someone touches one and not
  the other.

**The rule: for each two-surface fact, hold the join at the highest rung the two boundaries afford** — not
the highest rung imaginable. Some facts cannot climb. A config value and its documented sample must exist
as two real artifacts on two sides of a boundary; a model row and the code it governs are legitimately
separate. Those honest non-climbs are sanctioned — you hold them at PARITY or DERIVE and stop. What the rule
forbids is holding a join *below* its affordable rung: a fact synced by a comment that a parity gate could
have caught, a hand-mirrored pair that codegen could have generated, two copies that agree only because
nobody has touched either yet.

**A join held below its affordable rung is a latent drift class, and a close-time audit treats it as a
failure.** The reflex to reach for, whenever a change puts the *second* copy of a fact on disk, is to ask
which rung this pair can climb to and hold it there. The close-time review that keeps an effort honest (the
*derived defends, snapshotted drifts* discipline behind the Definition-of-Done) makes the same check at the
end: a fact left on a weaker rung than it afforded is flagged, not shipped. An audit of one such review pass
found most of its drift instances were exactly this defect — a join a rung too low — rather than an
outright missing check.

The everyday shape is a **status or summary field that is read to make a decision but written by hand.** Left
as a hand-edited line, it drifts the moment real work moves past it and the next reader trusts a stale value.
Derive it instead from the artifacts that already record the truth — a projection over the underlying files
and history — and it cannot drift, because there is no second surface to fall behind. That is the ladder
applied to one field: climb from a hand-kept copy (comment rung) to a derived projection (UNIFY/DERIVE) and
the whole drift class closes.

## Why this composition holds

The six parts make one guarantee only together: a map the fleet can trust because machinery, not habit,
keeps it equal to the code. Modeling the system as executable data is inert until something reads it live,
so the consume-don't-copy rule is what turns the data into a source of truth rather than one more document
to maintain. But a read map still lies the moment the code moves past it, which is why the parity gate fails
the build when model and reality disagree, and why every model-to-code edge is anchored to a symbol a lint
re-checks — a join that cannot drift silently under a rename. Generation closes the loop back into the
system, and the sealed format seam gives the invariants one place to live. Drop consumption and the models
decay into prose; drop parity and the map drifts; drop the anchored joins and the drift hides in a renamed
symbol. Each part removes the failure the next one would otherwise inherit.

## The full treatment

Each constituent links to its full pattern — in this appendix for the flagship members, online for the rest.
The stack is the substrate under the
[Provenance stack](appendix-d-provenance-fidelity-stack.html) (its sanctioned door is this
stack's sealed seam) and the
[Assurance stack](appendix-d-specification-verification-stack.html) (whose state machines
are DATA this stack keeps honest). The full 85-mechanism catalogue is online in the web edition.
