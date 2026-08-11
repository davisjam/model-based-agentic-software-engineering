*A two-page synthesis of the Provenance stack. Five patterns make one guarantee: reconstruct a
remediated document's mutation history from the artifact itself, and catch any damage done through the
sanctioned door. Who and why for every change, and nothing silently lost.*

## The capability

Months after a file ships, someone asks what the tool changed, and why. The pipeline is long gone; all you
have is the document. Can you answer from the artifact alone?

**Reconstruct the full mutation history of a shipped artifact from the artifact alone — and prove nothing
the author wrote was dropped on the way out.** Two capabilities converge here: *track provenance and
trace causes*, and *preserve product semantics*. It assumes every change already flows through one
sanctioned door; on that door it builds attribution you can read back and a fidelity check you cannot skip.
The evidence lives inside the file, so it survives copy, download, and re-open — no side log to trust or
lose.

### Symptoms you need this stack

You are probably feeling one of these:

- The only honest answer to "what did the tool change here, and why?" is "we'd have to re-run the pipeline."
- A shipped file looks fine, then a reader hits a hole — a dropped table, a lost caption — that no pass flagged.
- You cannot tell tool-inserted content from what the author actually wrote.
- "We record every change" is a claim no one can exercise on a delivered file.

### When to adopt this stack

Use this stack when:

- auditors or downstream consumers require traceable, reversible attribution of every change
- tool-inserted content must stay distinguishable from what the author actually wrote

Typical domains:

- regulated software
- document processing and remediation
- medical systems
- financial systems
- any auditable transformation pipeline

## Failure classes it covers

- **The unattributable change.** A pass mutates a document but leaves no durable trace of who changed it or
  why; once the file leaves the pipeline the history is gone.
- **The indistinguishable insert.** A tool-inserted artifact looks exactly like authored content, so nothing
  can tell what the tool added — and a validator cannot cover what it cannot name.
- **The silent hole.** A new mutator lands without attribution wiring; "we record every change" quietly stops
  being true, one commit at a time.
- **The unread evidence.** Stamps sit in the artifact with no consumer, so "auditable" is a claim no one can
  exercise.
- **The silent loss.** A pass drops a table, a note, a paragraph; the file looks fixed but shipped damaged,
  and no one sees the hole until a reader hits it.

## Composition

<!-- label: provenance-fidelity-stack -->
<!-- figure: assets/provenance-fidelity-stack.svg | The Provenance stack in one picture. A document flows left to right through two lanes. The sanctioned door (fleet blue): MARK names every insertion so it is registry-covered; EMIT writes an attribution stamp for every mutation into the artifact. The guarantee (governed green): COVER's wiring lint holds the closed verb set at zero gaps; READ reconstructs the history from the embedded stamps; GATE asserts the input's content survives the output and names the pass that dropped it otherwise. Below the row, the artifact strip carries the stamps EMIT drops and READ and GATE read back. Mark it, cover the marking, read it back, and gate what leaves — provenance you can reconstruct from the artifact itself. -->

The five parts run as a chain: mark every insertion, stamp every mutation, prove the stamping complete, read
the history back, gate what leaves against what came in. Each part hands the next a stronger guarantee.

## The constituent parts

Five parts run as a chain, each handing the next a stronger guarantee: mark every insertion, stamp every
mutation, prove the stamping complete, read the history back, and gate what leaves against what came in.

### MARK — the reserved-prefix naming convention {#a-1-a11y-prefix}

**Name every insertion.** Every artifact the tool inserts gets a name marking it tool-added, so authored
and inserted content stay distinguishable and a validator can cover an insert by its name alone. (MARK.)

**Receives** — the raw insertions a remediation pass wants to write: alt text, tags, off-canvas scaffolding.
Nothing precedes it; this is where the chain starts.

**Guarantees** — a closed, registry-covered population of insertions. A three-way naming rule carries it: an
invisible insert takes a reserved prefix, a user-visible one keeps an ordinary name, a spec-mandated name
keeps its spec name. Every inserter records itself into one registry as it writes, so nothing enters the
artifact unmarked.

**Hands to EMIT** — a complete set to attribute. Because the population is closed and named, the
stamp-writer downstream has no blind spot: every insert it must stamp is already on the register. The naming
is by rule, not by taste, which is what makes the coverage mechanical rather than a habit that quietly
drifts the first time an inserter forgets to append.

→ **Deeper treatment:** role:a11y-prefix.

### EMIT — per-mutator attribution stamps {#a-1-mutator-stamps}

**Record every mutation.** Each sanctioned change embeds its own attribution — its pass, its visibility —
into the artifact at the mutation site, so the evidence travels with the file. (EMIT.)

**Receives** — the marked, registry-covered inserts from MARK, plus every other sanctioned mutation a pass
performs.

**Guarantees** — embedded, attributable evidence, not a promise in a log. One sanctioned stamp-writer per
format carries every stamp, and the raw stamp mutation is ban-linted away, so the writer is the sole surface.
A visibility model keeps it honest for delivery: stamps default to Debug and are stripped before the file
ships; user-visible passes opt into Preserved. The evidence lives in the document, not a side log, so it
survives copy, download, and re-open.

**Hands to COVER and READ** — two things at once: a closed verb set for the wiring lint to prove complete,
and an embedded stamp registry for the changelog to read back.

→ **Deeper treatment:** role:mutator-stamps.

### COVER — the mutator-stamp-wiring lint {#a-1-f10-wiring-lint}

**Prove the record complete.** A blocking lint scans every mutator verb in the document models' write layer
and fails the build on any verb that skips the stamp wiring, so attribution has no silent gap. (COVER.)

**Receives** — the same closed verb set EMIT's stamp-writer serves; the lint reads the write layer where the
mutators live.

**Guarantees** — zero open attribution gaps. The check asserts one property: every path that performs a
guarded mutation calls the stamp routine on its way out. So a new verb cannot land producing unattributable
mutations. It sees the absence a code reviewer's eye slides past — a missing call shouts nothing in a diff,
but a completeness scan over all verbs catches it. The lint stays cheap because it checks so little: not what
a mutator does, only whether the stamp call was made on the way out.

**Hands to READ** — a stamped population the changelog can trust. Because COVER proves the writer is called
across the whole verb set, READ downstream reads the embedded stamps as complete, not a sample.

→ **Deeper treatment:** role:f10-wiring-lint.

### READ — reconstruct the changelog {#a-1-derive-changelog}

**Reconstruct the history.** A command rebuilds the document's mutation history from its embedded stamps,
each entry a change attributed to the pass that made it. (READ.)

**Receives** — the stamps EMIT wrote and COVER proved complete, read straight from the produced artifact. It
runs after remediation, against the delivered file, so the history it assembles is the one that shipped.

**Guarantees** — an attributed, human-legible ChangeLog: pass → change, each entry carrying its visibility. It
reconstructs the history from the artifact itself, never a trusted external log, so the account is
reproducible from any conformant file. A diff would show what changed; this shows who changed it and why —
the questions RCA and user transparency actually ask. The account is only as complete as the stamps behind
it, which is exactly what COVER upstream holds at zero gaps.

**Hands off** — nothing further in the chain. READ is the consumer that makes emitting the stamps worthwhile:
no reader, no reason to stamp.

→ **Deeper treatment:** role:derive-changelog.

### GATE — the input ⊆ output fidelity gate {#a-1-content-validator}

**Prove nothing was lost.** Where MARK, EMIT, COVER, and READ attribute what the tool *added*, this gate
catches what a sanctioned pass silently *removed* — damage done through the same door provenance covers. (GATE.)

**Purpose** — close the chain from the other side. Attribution accounts for every change the tool made; it
says nothing about content the tool dropped. The gate covers that blind side.

**Mechanism** — a deterministic post-condition. It extracts the content of input and output and fails the job
unless the input's content is a subset of the output's, and it runs in production on every job. A staging-only
per-pass variant adds localization: a dedicated marker and a nonzero exit code name which pass dropped the
content, turning "content was lost somewhere" into "pass N lost it."

**Guarantee** — no damaged output leaves. A dropped paragraph, a mangled table, a lost caption cannot ship
unseen, the worst outcome for a fidelity-critical tool, because the output looks fine and quietly isn't what
the author wrote. What ships is both fully attributed and provably whole.

→ **Deeper treatment:** role:content-validator.

## A DocAble example, end to end

DocAble remediates a slide deck for accessibility. A pass writes alt text onto an untagged image. **MARK**
gives that description a reserved prefix and records it in the insertion registry, so it reads as tool-added,
not author-written. **EMIT** stamps the mutation into the file — this pass, invisible insertion — through
the one sanctioned stamp-writer for the format. **COVER** has already proven, at build time, that the
alt-text verb wires that stamp; a version of the verb that forgot to would have reddened the gate before it
shipped. Weeks later a customer asks what the tool changed: **READ** reconstructs the changelog straight
from the deck's embedded stamps, no pipeline access needed. And when a different pass quietly drops a
speaker-notes paragraph, **GATE** catches it — input content is not a subset of output — fails the job, and
names the pass that lost it, instead of shipping a deck that looks fixed but is not.

## Tradeoffs and adoption order

Adopt in chain order, because each part presumes the one before it.

1. **MARK first.** Until insertions are named and registered, nothing downstream has a complete population to
   attribute. A naming convention costs nothing at runtime.
2. **EMIT, then COVER.** Stamp through one writer, then add the wiring lint that holds the closed verb set at
   zero gaps. The stamps cost one write per mutation; the lint is deterministic and does not decay.
3. **READ** is a read-only projection — cheap, and it makes the stored provenance finally usable.
4. **GATE** last, and independently valuable: a set-containment check over extracted content, run in
   production. Its per-pass diagnostic variant stays staging-only to keep the production path fast.

The chain's guarantee is only as strong as the one door it presumes — every mutation must route through the
sanctioned surface, held by a separate ban-lint. Extraction that under-reads a format weakens the gate;
bound it to the canonical reader.

## Why this composition holds

These five parts are not a checklist run in order; each makes the next one honest. Marking produces a closed
population of insertions, which is the only thing a stamp-writer can promise to cover completely. A
completeness lint means something only over that closed set. A reconstructed changelog can be trusted only
because the lint holds the stamps at zero gaps. And the fidelity gate guards the one blind side attribution
cannot see — what a sanctioned pass removed, not what it added. Drop any single part and the guarantee
downstream falls from proof to hope. That interlock — each part making the next provable — is what separates
the stack from a bag of five useful tools.

## The full treatment

Every constituent above links to its full Gang-of-Four pattern — in this appendix for the flagship members,
online for the rest. The stack composes with the
[model-coherence stack](appendix-d-model-coherence-stack.html) — the sanctioned door it stamps is that
stack's typed seam — and the
[Assurance stack](appendix-d-specification-verification-stack.html). The complete
85-mechanism catalogue, each pattern with its Motivation, Applicability, and Known uses, is online in the
web edition.
