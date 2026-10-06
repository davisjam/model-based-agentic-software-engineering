// SEMANTIC-LIVE — a declaration the corpus presents as causal must change an answer when deleted.
//
// THE FAILURE CLASS: an example's instructional prose attributes causality to a declaration that is
// INERT. Delete the declaration, re-run every saved question, and no answer moves — so the sentence
// teaching a student what carries the result names something that carries nothing. The engine is
// right, the model is right, and the lesson is wrong, which is the one combination no existing gate
// here can see: the fixtures pin ANSWERS, and an inert declaration changes none of them.
//
// Two instances, both found by hand in a release audit and both reproduced by this gate:
//
//   1. `worker-queue` guards `claimed -> processing` on the lease not being free, and the prose says
//      the guard "-- not the absence of the transition -- is what carries the invariant". It does
//      not. `claimed` is reachable only through the `claim` event, which steps the lease out of
//      `free` in the same system transition, so the guard is never consulted on a reachable step.
//      Deleting it moves nothing.
//   2. `message-bus` explains its safety counterexample by naming `shipping-address`, "which the
//      data-policy model represents as a `carries_field` edge". The verdict reads the `carries`
//      PROPERTY on the event type; the whole `carries_field` layer is inert for every saved
//      question. The parity control in `test/examples.test.ts` keeps the two surfaces in sync, which
//      is why the layer is not WRONG — but it is not what decided the answer either.
//
// ## The method, mechanized
//
// The audit's own procedure: take a declaration, DELETE it, re-run every saved query, require an
// answer to move. This file does that through the real hypothesis seam — `Workspace.openHypothesis`
// with a transaction, exactly as `test/examples.test.ts` drives a declared modification — so the
// perturbation is an ordinary what-if and not a second code path into the engine.
//
// `base` is filled from the LIVE hash, never read from a fixture, for the reason stated where the
// declared modifications are driven: a hash written down is stale the moment the example changes.
//
// ## What counts as an ANSWER moving
//
// What the workbench PRESENTS as the answer: outcome, coverage kind and reason, refusal, magnitude,
// and the evidence a reader is shown (shape, role, graph nodes, step labels), plus every derived
// requirement verdict. Deliberately NOT `coverage.statesExplored` — the fixture discipline already
// refuses to pin the configuration count because it moves when a state is added anywhere, and a
// liveness probe that counted it would call every guard live and measure nothing. Measured: with
// the explore count in the fingerprint, 95 of 97 perturbations read live; without it, 40.
//
// ## Scope: WHICH declarations must be live, and why this is not the audit's scoping
//
// The audit scoped by what the instructional surface HIGHLIGHTS, and that set is not derivable.
// The walkthrough registry's `grounding` names examples, models, machines, saved queries and
// declared modifications — never an individual guard, relation type or property — so no declared
// prose-to-declaration link exists to read. The alternative, matching a declaration's spelling
// against fixture prose, is the mistake this repo has already paid for twice: UX-I7's checker read
// `/\bin model \S/` out of a rendered sentence, so a copy edit failed the invariant. Prose is not a
// join key.
//
// So the denominator is DERIVED FROM THE MEASUREMENT instead, in two mandatory families, each
// complete by construction:
//
//   1. **Every transition guard, per transition.** A guard's only job is to forbid a step. A guard
//      that forbids no reachable step is a guard in name, and the model already has `notes:` for a
//      remark. There is no legitimate decorative guard, so inertness here is always worth a
//      sentence — which is exactly what instance 1 was.
//   2. **Every declaration FAMILY with no live member** — a relation type within one model, or a
//      property name across the system. A family no answer anywhere reads is a LAYER rather than a
//      selection, and instance 2 is that shape precisely (`data-policy/carries_field`: five
//      relations, zero live).
//
// Families, and not individual relations and properties, because per-instance inertness there is
// NORMAL and measuring it would drown the gate: a graph query selects some entities and not others,
// so `criticality` is live on two buffers and inert on seven, and 48 of the 57 inert declarations at
// HEAD are that case. Forty-eight reasons written to satisfy a gate is how a control becomes
// decoration. The family rule keeps the complete-denominator property where it carries information
// and drops it where it does not — and a family declared non-operative that later gains a live
// member is reported, so the coarser key cannot hide a change.
//
// ## The escape hatch, in the corpus rather than in this file — and SHARED with the TRUTH gate
//
// "Or be labelled explicitly non-operative." The label lives in the example's own
// `expected-results.yaml`, as a `declarations:` row — the author's file, beside the answers it is
// about, read by this gate and written by nobody else. Not an allowlist in this file: from a list
// inside the gate, an exclusion someone decided and one someone forgot read the same.
//
// **Its spelling was settled 261005 with the TRUTH gate's design, which needs the same object.**
// `inert: true` plus `held_by:` plus `reason:`. Three decisions worth stating because they are
// joins, not preferences:
//
//   - `inert: true`, not `operative: false` — the first draft here. `inert` is the word both gates'
//     failure messages and the release audit already use, and the negation read as a double negative
//     at every call site.
//   - No positive direction. "This declaration carries that query's answer" needs the query and the
//     evidence, which is TRUTH's `claims:` shape; a boolean cannot say it. So `inert: false` is
//     REFUSED by the reader rather than accepted and ignored — one way to say each thing.
//   - `held_by:` from a CLOSED vocabulary. The structured pointer is what a display surface can
//     render; free text would make it a second sentence beside `reason`. It is also the
//     machine-readable substrate the EPISTEMIC-BOUNDARY gate consumes, so the "explanation, not
//     machinery" distinction is a verified fact there rather than a heuristic.
//
// It is a CLAIM and not a waiver, and the gate measures it:
//
//   - labelled inert, measured live       -> reported. The prose calls live machinery commentary.
//     That is the SYMMETRIC lie to the red alerts, it rots the same way, and both gates need the
//     verdict — which is the reason the label is one object rather than two.
//   - a subject that resolves to nothing  -> reported. A row naming a renamed machine or a dropped
//     relation type outlives its subject.
//   - a `held_by` outside the vocabulary  -> reported. The pointer must stay a pointer.
//
// ## The perturbation runner lives in `test/perturbation.ts`, not here
//
// TRUTH asks the NAMED-query version of this gate's question, so the two share the predicate core.
// It is a separate module with a per-answer delta return — `moved[]`, each entry naming the recorded
// answer and its two readings — so "did anything move" and "did `lease-held-while-processing` move
// from holds to refuted" are both lookups against one evaluation. The subject-locator builders are
// exported from there too, and a test below asserts they spell exactly what the enumeration emits:
// two gates addressing declarations in two spellings would each report the other's rows as vanished
// subjects.
//
// ## Why the two known findings are PINNED rather than declared
//
// Both red alerts are live defects at HEAD and a sibling wave is landing their corrections. A
// `declarations:` row saying "non-operative, on purpose" would be the allowlisting the audit's
// finding exists to prevent, so instead the two sit in `KNOWN_INERT_CLAIMS` below, which is asserted
// as an EXACT SET. A third finding fails the gate; a corrected finding also fails it, and the fix is
// to delete the entry here. That is not the baseline-ratchet this repo bans in
// `test/gate-reachability.test.ts` — a ratchet accepts "no worse than N" and drifts; an exact set
// with named members goes red in both directions and names what must change.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  guardSubject, HELD_BY, isLive, isRequired, perturbationsOf, propertySubject, relationSubject, sweep,
  type Measured,
} from "./perturbation.ts";
import { EXAMPLE_IDS, loadExample, type FixtureDeclaration } from "../scripts/gen-example-coverage.ts";

// ----------------------------------------------------------------------------------------------
// The mandatory denominator, derived from the sweep
// ----------------------------------------------------------------------------------------------

/** A family and what the sweep found across its members. */
interface Family {
  readonly subject: string;
  readonly live: number;
  readonly inert: number;
  /** Members the engine refuses to delete (V-rules). Consequential, and not answer-liveness. */
  readonly required: number;
  readonly instances: readonly string[];
  readonly isGuard: boolean;
}

function families(measured: readonly Measured[]): readonly Family[] {
  const by = new Map<string, {
    live: number; inert: number; required: number; instances: string[]; isGuard: boolean;
  }>();
  for (const m of measured) {
    if (m.refusal !== null) continue;
    const cur = by.get(m.subject)
      ?? { live: 0, inert: 0, required: 0, instances: [], isGuard: m.subject.startsWith("guard:") };
    // Three-way, because a declaration the engine refuses to delete is neither a moved answer nor a
    // layer nobody reads. Folding it into `inert` would invent the gate's own headline finding.
    if (isRequired(m)) cur.required += 1;
    else if (isLive(m)) cur.live += 1;
    else cur.inert += 1;
    cur.instances.push(m.instance);
    by.set(m.subject, cur);
  }
  return [...by.entries()]
    .map(([subject, v]) => ({ subject, ...v }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/**
 * Families that owe a ledger row: a guard with no live member, or any family with none.
 *
 * The guard clause is redundant with the family clause TODAY — a guard is its own family of one, so
 * an inert guard has zero live members either way. Both are stated because the two rules have
 * different reasons and only one survives a change: if a future transition carries two guards
 * deleted as one unit, the family would still be a family of one, and if guards were ever keyed by
 * machine the family clause alone would stop naming individual transitions.
 */
const mandatory = (fs: readonly Family[]): readonly Family[] =>
  fs.filter((f) => f.live === 0 && f.required === 0);

/** A reason floor, for the cause `test/gate-reachability.test.ts` states: a thin reason is a note. */
const MIN_REASON = 60;


// ----------------------------------------------------------------------------------------------
// The two known findings, pinned as an exact set
// ----------------------------------------------------------------------------------------------

/**
 * The red alerts the release audit found by hand, which this gate reproduces. **Now empty.**
 *
 * EXACT-SET, not a ceiling. A new inert mandatory family fails the gate; so does one of these being
 * corrected, and the fix then is to delete its entry. Each carried the prose that made it a defect
 * rather than a fact, so an entry said what had to change and not merely that something was pending.
 *
 * Expiry was never a date, it was a condition — and the condition arrived on 261005, which is why
 * this map is empty rather than deleted. Both entries discharged, and by different routes, which is
 * the part worth keeping:
 *
 *   - `worker-queue/guard:job-lifecycle/claimed->processing` stayed INERT. The defect was the prose,
 *     and the prose was corrected, so the honest home is a `declarations:` row — which is what the
 *     pin's own finding text told its reader to write. The row is
 *     `begin-guard-restates-the-claim-synchronization`.
 *   - `message-bus/relation:data-policy/carries_field` became REQUIRED. Not live: no answer reads
 *     the field layer even now. The aggregation declared on `carries_field` makes the engine refuse
 *     to delete the edge, which is consequential at the validation layer, so the pin went.
 *
 * Kept as an empty map rather than removed because the `mandatory` rule reads it and the next
 * hand-found red alert needs a home that already has a shape. The gate below is unconditionally
 * blocking with nothing quarantined, which is what empty MEANS here.
 */
const KNOWN_INERT_CLAIMS: Readonly<Record<string, string>> = {};

/** The key a finding and a pin entry share. */
const findingKey = (exampleId: string, subject: string): string => `${exampleId}/${subject}`;

// ----------------------------------------------------------------------------------------------
// The audit, over supplied inputs so the negative control can drive each defect
// ----------------------------------------------------------------------------------------------

/**
 * Every issue the ledger and the sweep disagree about, for one example.
 *
 * `pinned` is passed in rather than read from the module constant, so the negative control can run
 * the real rule with nothing quarantined and watch the red alerts come back.
 */
function auditExample(
  exampleId: string,
  measured: readonly Measured[],
  ledger: readonly FixtureDeclaration[],
  pinned: Readonly<Record<string, string>>,
): readonly string[] {
  const issues: string[] = [];
  const fs = families(measured);
  const bySubject = new Map(fs.map((f) => [f.subject, f]));
  const declared = new Map<string, FixtureDeclaration>();

  for (const refused of measured.filter((m) => m.refusal !== null)) {
    issues.push(`${exampleId}: the probe for \`${refused.subject}\` (${refused.instance}) was `
      + `REFUSED -- ${String(refused.refusal)}. A refused perturbation measures nothing, and reading `
      + `it as inert would invent a finding while reading it as live would hide one.`);
  }

  for (const row of ledger) {
    if (declared.has(row.subject)) {
      issues.push(`${exampleId}: two \`declarations:\` rows claim \`${row.subject}\` (\`${row.id}\` `
        + `and \`${declared.get(row.subject)?.id ?? "?"}\`). One subject, one claim -- two rows are `
        + `free to disagree about the same declaration.`);
    }
    declared.set(row.subject, row);
    if (row.reason.trim().length < MIN_REASON) {
      issues.push(`${exampleId}/\`${row.id}\`: a ${row.reason.trim().length}-character reason; at `
        + `least ${MIN_REASON} are required. Say what the declaration is FOR, or what reads it `
        + `instead of the engine.`);
    }
    const family = bySubject.get(row.subject);
    if (family === undefined) {
      issues.push(`${exampleId}/\`${row.id}\` claims \`${row.subject}\`, which resolves to no `
        + `declaration in this example. A row naming a renamed machine or a dropped relation type `
        + `outlives its subject. Subjects the sweep found: ${fs.map((f) => f.subject).join(", ")}`);
      continue;
    }
    // A row over a family the ENGINE refuses to delete. The row is not lying about answers -- no
    // answer reads it -- but `held_by` points at whatever held the declaration INSTEAD of the
    // engine, and now the engine holds it. No new `HELD_BY` member for this: a declaration the
    // validator refuses to drop needs no ledger row at all, so the honest edit is deletion.
    if (family.required > 0) {
      issues.push(`${exampleId}/\`${row.id}\` labels \`${row.subject}\` INERT and held by `
        + `\`${row.heldBy}\`, but the engine now REFUSES to delete `
        + `${family.required} of its ${family.live + family.inert + family.required} member(s). A `
        + `declaration the validator holds needs no ledger row -- the row named a weaker holder and `
        + `is now the stale one. Delete it.`);
    }
    if (!HELD_BY.has(row.heldBy)) {
      issues.push(`${exampleId}/\`${row.id}\` is held by \`${row.heldBy}\`, which is not one of `
        + `${[...HELD_BY].join(", ")}. The vocabulary is closed so the pointer stays a pointer: free `
        + `text here would make it a second sentence beside the reason.`);
    }
    // The SYMMETRIC lie, and the half a one-directional waiver could never catch: prose waving live
    // machinery away as commentary. Both this gate and the TRUTH design need this verdict.
    if (family.live > 0) {
      const moved = measured
        .filter((m) => m.subject === row.subject && isLive(m))
        .flatMap((m) => m.moved.map((d) => d.key));
      issues.push(`${exampleId}/\`${row.id}\` labels \`${row.subject}\` INERT and `
        + `${family.live} of its ${family.live + family.inert} member(s) move an answer when `
        + `deleted (${[...new Set(moved)].join(", ")}). The engine reads what the row calls `
        + `explanation -- which is the same defect as prose crediting an inert declaration, told `
        + `the other way round.`);
    }
  }

  for (const family of mandatory(fs)) {
    if (declared.has(family.subject)) continue;
    const key = findingKey(exampleId, family.subject);
    if (pinned[key] !== undefined) continue;
    const why = family.isGuard
      ? "A guard's only job is to forbid a step, and this one forbids no reachable step. If it is "
        + "there to restate a constraint the synchronization already carries, say so in a row -- and "
        + "check that no prose calls it the thing that carries the result."
      : `No answer anywhere reads any of this family's ${family.inert} member(s), so it is a layer `
        + "rather than a selection. That is legitimate for content a human reads or a sibling "
        + "control compares -- declare which, in a row.";
    // The template prints the SETTLED row shape — `inert: true` + a `held_by` from the closed
    // vocabulary — not the `operative: false` first draft the offenders sweep below rejects; it
    // did print the draft, and the first author to follow the suggestion met the rejection.
    issues.push(`${exampleId}: \`${family.subject}\` (${family.instances.join(", ")}) is INERT -- `
      + `deleting it moves no saved answer and no requirement verdict. ${why} Add to `
      + `examples/${exampleId}/expected-results.yaml:\n`
      + `      declarations:\n        - id: <a-name>\n          subject: ${family.subject}\n`
      + `          inert: true\n          held_by: <one of: ${[...HELD_BY].join(", ")}>\n`
      + `          reason: >\n            <why it is here>`);
  }

  for (const subject of Object.keys(pinned)
    .filter((k) => k.startsWith(`${exampleId}/`))
    .map((k) => k.slice(exampleId.length + 1))) {
    const family = bySubject.get(subject);
    if (family === undefined) {
      issues.push(`${exampleId}: \`${subject}\` is pinned in KNOWN_INERT_CLAIMS and resolves to no `
        + `declaration. The defect's subject is gone; delete the pin.`);
      continue;
    }
    if (family.required > 0) {
      issues.push(`${exampleId}: \`${subject}\` is pinned in KNOWN_INERT_CLAIMS and the engine now `
        + `REFUSES to delete ${family.required} of its `
        + `${family.live + family.inert + family.required} member(s). The declaration became `
        + `consequential at the VALIDATION layer rather than the answer layer, which is still a `
        + `correction -- delete the pin.`);
      continue;
    }
    if (family.live > 0) {
      issues.push(`${exampleId}: \`${subject}\` is pinned in KNOWN_INERT_CLAIMS as a known-inert `
        + `claim and it is now LIVE (${family.live} of ${family.live + family.inert} members move an `
        + `answer). The correction landed -- delete the pin, which is the whole point of pinning it `
        + `rather than declaring it non-operative.`);
      continue;
    }
    if (declared.has(subject)) {
      issues.push(`${exampleId}: \`${subject}\` is BOTH pinned in KNOWN_INERT_CLAIMS and declared in `
        + `\`declarations:\`. Two homes for one decision; the audit's finding was that an inert `
        + `declaration must not be allowlisted, so if the row is the honest answer the pin must go.`);
    }
  }
  return issues;
}

// ----------------------------------------------------------------------------------------------
// The gate
// ----------------------------------------------------------------------------------------------

test("the perturbation sweep measures something -- inputs asserted before the rule reads them", () => {
  // A probe that finds nothing is usually the probe. Every rule below passes trivially over an empty
  // sweep, so the shape of the measurement is asserted first and separately.
  let total = 0;
  let guards = 0;
  for (const id of EXAMPLE_IDS) {
    const measured = sweep(id);
    assert.ok(measured.length > 0, `${id}: the sweep enumerated no perturbation at all`);
    total += measured.length;
    guards += measured.filter((m) => m.subject.startsWith("guard:")).length;
    assert.deepEqual(measured.filter((m) => m.refusal !== null).map((m) => m.subject), [],
      `${id}: the shipped corpus must admit every probe the sweep builds`);
  }
  assert.ok(total >= 90, `${total} perturbations across ${EXAMPLE_IDS.length} examples -- the `
    + "enumeration is reading the wrong thing; 97 were measured when this gate landed");
  assert.ok(guards >= 8, `${guards} transition guard(s) found; the corpus declares more than that`);
  // Both halves of "an answer moves" must be observable, or the fingerprint is constant and the
  // sweep would report everything inert.
  const observed = EXAMPLE_IDS.flatMap((id) => sweep(id));
  assert.ok(observed.some(isLive), "no perturbation moved any answer -- the answer set is constant");
  assert.ok(observed.some((m) => !isLive(m)), "every perturbation moved an answer -- the answer set is noise");
  // Every delta must NAME the answer that moved, which is the contract the TRUTH gate consumes: it
  // needs "did THIS query move", not "did anything". A runner returning only a boolean would have
  // forced a second evaluation of the query set.
  const someDelta = observed.find(isLive)?.moved[0];
  assert.ok(someDelta !== undefined && /^(query|requirement):/.test(someDelta.key),
    "a delta must name the recorded answer it describes, by its own key");
  // The memo must return the SAME measurement, or the three rules below are reading three sweeps.
  assert.deepEqual(sweep(EXAMPLE_IDS[0] ?? ""), sweep(EXAMPLE_IDS[0] ?? ""),
    "the sweep memo must be stable; a per-call measurement would make the rules disagree");
});

test("the exported subject builders produce exactly the spellings the sweep emits", () => {
  // The seam the TRUTH gate consumes. Both gates address declarations, and the SPELLING is where two
  // gates silently fork: one builds `guard:m/a->b` and the other `m:a->b`, both resolve nothing in
  // the other's ledger, and each reports the other's rows as vanished subjects. So the builders are
  // exported from `test/perturbation.ts` beside the enumeration, and this asserts the two agree
  // rather than leaving the agreement to whoever reads the regex next.
  const sys = loadExample("worker-queue").workspace.state.system;
  const emitted = new Set(perturbationsOf(sys).map((p) => p.subject));
  assert.ok(emitted.size > 4, `${emitted.size} subject(s) over worker-queue -- the enumeration is wrong`);
  assert.ok(emitted.has(guardSubject("job-lifecycle", "claimed", "processing")),
    "the guard builder does not spell what the enumeration emits");
  assert.ok(emitted.has(relationSubject("worker-pool", "may_claim")),
    "the relation builder does not spell what the enumeration emits");
  assert.ok(emitted.has(propertySubject("holds_lease_as")),
    "the property builder does not spell what the enumeration emits");
  // And every emitted subject is reachable through SOME builder, so a fourth declaration kind cannot
  // land with an ad-hoc spelling no other gate can construct.
  for (const subject of emitted) {
    assert.match(subject, /^(guard|relation|property):/,
      `\`${subject}\` is outside the three declared locator grammars, so no other gate can build it`);
  }
});

test("every declaration the corpus presents as causal moves an answer, or says it does not", () => {
  const issues = EXAMPLE_IDS.flatMap((id) =>
    auditExample(id, sweep(id), loadExample(id).fixture.declarations, KNOWN_INERT_CLAIMS));
  assert.deepEqual(issues, [], `semantic liveness:\n  ${issues.join("\n  ")}\n`);
});

test("the quarantine is exactly the pinned set, and every pin still describes a finding", () => {
  // The quarantine, audited as its own claim. `auditExample` reports a pin whose subject moved or
  // vanished; this reports the opposite drift -- a pin that stopped being a finding because the rule
  // changed around it, which would leave a defect named in a comment and policed by nothing.
  //
  // The pinned set is EMPTY since 261005, so this now asserts the stronger thing: running the rule
  // with nothing quarantined produces nothing at all. The assertion shape is unchanged, which is
  // deliberate -- it keeps working the moment someone pins the next hand-found alert.
  for (const [key, prose] of Object.entries(KNOWN_INERT_CLAIMS)) {
    assert.ok(prose.trim().length >= MIN_REASON * 2,
      `the pin for ${key} must state the prose that makes it a defect, not just the subject`);
  }
  const unpinned = EXAMPLE_IDS.flatMap((id) =>
    auditExample(id, sweep(id), loadExample(id).fixture.declarations, {}));
  const keys = Object.keys(KNOWN_INERT_CLAIMS).sort();
  const found = unpinned
    .map((issue) => keys.find((k) => issue.startsWith(`${k.split("/")[0] ?? ""}: \`${k.slice((k.split("/")[0] ?? "").length + 1)}\``)))
    .filter((k): k is string => k !== undefined)
    .sort();
  assert.deepEqual([...new Set(found)], keys,
    `running the rule with nothing quarantined must reproduce EXACTLY the pinned findings. Got `
    + `${unpinned.length} finding(s):\n  ${unpinned.join("\n  ")}\n`);
});

test("the INERT label has ONE home and ONE spelling across the whole corpus", () => {
  // Settled 261005 with the TRUTH gate's design, which proposes the same label under `claims:`. One
  // object, one spelling, and this is the forcing function: a second home would let an author write
  // the label where nothing reads it, which looks exactly like not writing it.
  //
  // Read as raw YAML text rather than through the fixture reader, because the reader only sees the
  // keys it asks for -- a second block it does not read is invisible to it by construction, which is
  // the whole failure.
  const offenders: string[] = [];
  for (const id of EXAMPLE_IDS) {
    const path = `examples/${id}/expected-results.yaml`;
    const text = readFileSync(path, "utf8").replace(/#.*$/gm, " ");
    if (/^\s*claims:/m.test(text) && /\binert\s*:/.test(text)) {
      offenders.push(`${path} carries a \`claims:\` block AND an \`inert:\` field. If the label has `
        + "moved into `claims:`, this gate must read it from there -- teach it the new home rather "
        + "than leaving rows in two places where one gate reads each.");
    }
    if (/\boperative\s*:/.test(text)) {
      offenders.push(`${path} carries \`operative:\`, the first draft of this label. The settled `
        + "spelling is `inert: true` plus `held_by:`; a row in the old spelling is read by nothing.");
    }
    // Every `inert:` in the file must be inside a row the reader produced, or a row exists that no
    // control sees. Counted rather than parsed: the reader's own output is the denominator.
    const written = [...text.matchAll(/^\s*inert\s*:/gm)].length;
    const read = loadExample(id).fixture.declarations.length;
    if (written !== read) {
      offenders.push(`${path} writes ${written} \`inert:\` field(s) and the fixture reader produced `
        + `${read} declaration row(s). A row the reader does not reach is a label nobody checks.`);
    }
  }
  assert.deepEqual(offenders, [], offenders.join("\n  "));
});

test("the audit fires on each defect it exists to catch -- negative control", () => {
  // A control nobody has watched fail is a control nobody knows works, and the defect this file is
  // about was found by a human reading prose, not by anything running.
  const live = (subject: string, instance: string): Measured => ({
    subject, instance, operations: [], refusal: null, requiredBy: null,
    moved: [{ key: "query:q", query: "q", before: "holds", after: "refuted" }],
  });
  const inert = (subject: string, instance: string): Measured =>
    ({ subject, instance, operations: [], moved: [], refusal: null, requiredBy: null });
  /** The engine refuses the deletion: consequential, and not answer-liveness. */
  const required = (subject: string, instance: string): Measured =>
    ({ subject, instance, operations: [], moved: [], refusal: null, requiredBy: ["V46"] });
  const row = (over: Partial<FixtureDeclaration>): FixtureDeclaration => ({
    id: "a-row", subject: "guard:m/a->b", inert: true, heldBy: "the-reader",
    reason: "x".repeat(MIN_REASON) + " documentation on purpose", ...over,
  });
  const ok = [live("guard:m/a->b", "v ne 0"), inert("property:label", "e1")];

  // The patched shape passes, so every delta below is a delta against green.
  assert.deepEqual(auditExample("ex", ok, [row({ subject: "property:label" })], {}), [],
    "a live guard and a declared-inert property must pass");

  // Instance 1, as it actually is: an inert guard nobody declared.
  const bareGuard = auditExample("ex", [inert("guard:m/a->b", "v ne 0")], [], {});
  assert.equal(bareGuard.length, 1, `one finding expected, got ${bareGuard.length}: ${bareGuard.join("; ")}`);
  assert.match(bareGuard[0] ?? "", /guard:m\/a->b/, "the finding must name the subject");
  assert.match(bareGuard[0] ?? "", /is INERT/, "the finding must say what is wrong");
  assert.match(bareGuard[0] ?? "", /forbids no reachable step/, "a guard gets the guard-specific reason");
  assert.match(bareGuard[0] ?? "", /declarations:/, "the finding must say how to declare it");

  // Instance 2: a whole family with no live member.
  const layer = auditExample("ex", [inert("relation:dp/carries_field", "a -> b"),
    inert("relation:dp/carries_field", "a -> c")], [], {});
  assert.equal(layer.length, 1, "a family is reported once, not once per member");
  assert.match(layer[0] ?? "", /a layer rather than a selection/, "a family gets the family reason");
  assert.match(layer[0] ?? "", /a -> b, a -> c/, "the finding must name the members");

  // A family with ONE live member is a selection, not a layer. The rule must not fire.
  assert.deepEqual(auditExample("ex", [live("relation:dp/t", "a -> b"), inert("relation:dp/t", "a -> c")], [], {}),
    [], "a family with a live member is a selection and must not be reported");

  // The escape hatch clears it -- and only while the measurement still agrees.
  assert.deepEqual(auditExample("ex", [inert("guard:m/a->b", "v ne 0")], [row({})], {}), [],
    "an inert-labelled guard whose members are all inert must pass");

  // FALSELY INERT -- the symmetric lie, and the half a one-directional waiver could never catch.
  // The TRUTH design needs this verdict too, which is why the label is one object and not two.
  const stale = auditExample("ex", [live("guard:m/a->b", "v ne 0")], [row({})], {});
  assert.match(stale[0] ?? "", /labels .* INERT and 1 of its 1 member/,
    "an inert label over a live declaration must be reported");
  assert.match(stale[0] ?? "", /query:q/, "the finding must name the answer that moved");

  // A held_by outside the closed vocabulary: the structured pointer must stay a pointer.
  const vague = auditExample("ex", [inert("guard:m/a->b", "v")], [row({ heldBy: "it is fine" })], {});
  assert.ok(vague.some((m) => /which is not one of/.test(m)),
    `an unrecognised held_by must be reported: ${vague.join("; ")}`);

  // A row whose subject resolves to nothing.
  const ghost = auditExample("ex", ok, [row({ subject: "guard:gone/x->y" })], {});
  assert.match(ghost[0] ?? "", /resolves to no\s+declaration/, "a vanished subject must be reported");
  assert.match(ghost[0] ?? "", /Subjects the sweep found/, "the finding must say what the real subjects are");

  // A thin reason, which is how a ledger becomes a list of excuses.
  const terse = auditExample("ex", [inert("guard:m/a->b", "v ne 0")], [row({ reason: "documentation" })], {});
  assert.ok(terse.some((m) => /at least \d+ are required/.test(m)),
    `a reason under the floor must be reported: ${terse.join("; ")}`);

  // Two rows for one subject: two claims, free to disagree.
  const twice = auditExample("ex", [inert("guard:m/a->b", "v")], [row({ id: "one" }), row({ id: "two" })], {});
  assert.ok(twice.some((m) => /One subject, one claim/.test(m)), "a duplicated subject must be reported");

  // A refused probe is neither live nor inert, and must never be read as either.
  const refused: Measured = { subject: "guard:m/a->b", instance: "v",
    operations: [], moved: [], refusal: "the transaction was refused", requiredBy: null };
  const blocked = auditExample("ex", [refused], [], {});
  assert.ok(blocked.some((m) => /was REFUSED/.test(m)), `a refused probe must be reported: ${blocked.join("; ")}`);

  // The pin suppresses the finding, and nothing else.
  const pin = { "ex/guard:m/a->b": "x".repeat(MIN_REASON * 2) };
  assert.deepEqual(auditExample("ex", [inert("guard:m/a->b", "v")], [], pin), [],
    "a pinned known finding must not fail the gate");
  const healed = auditExample("ex", [live("guard:m/a->b", "v")], [], pin);
  assert.ok(healed.some((m) => /is now LIVE/.test(m)),
    `a pinned finding that was corrected must be reported so the pin gets deleted: ${healed.join("; ")}`);
  const vanished = auditExample("ex", [live("guard:m/other->x", "v")], [], pin);
  assert.ok(vanished.some((m) => /resolves to no declaration/.test(m)),
    `a pin whose subject is gone must be reported: ${vanished.join("; ")}`);
  const both = auditExample("ex", [inert("guard:m/a->b", "v")], [row({})], pin);
  assert.ok(both.some((m) => /Two homes for one decision/.test(m)),
    `a subject both pinned and declared must be reported: ${both.join("; ")}`);

  // ------------------------------------------------------------------------------------------
  // The REQUIRED state, added 261005 when the aggregation gate made six message-bus probes
  // unmeasurable through this seam. Each arm below is a way the two-state reading got it wrong.
  // ------------------------------------------------------------------------------------------

  // A required family owes NO ledger row: the validator holds it, which is stronger than anything
  // `held_by` can name. Under the two-state reading this was a REFUSED finding on every run.
  assert.deepEqual(auditExample("ex", [required("relation:dp/carries_field", "a -> b")], [], {}), [],
    "a family the engine refuses to delete must not be reported as inert, refused, or undeclared");

  // And it must not be read as LIVE either, or a prose defect crediting it with deciding an answer
  // would stop being catchable -- the distinction the third state exists to keep.
  const requiredFamily = families([required("relation:dp/t", "a -> b")])[0];
  assert.equal(requiredFamily?.live, 0, "required is not live: no answer was measured to move");
  assert.equal(requiredFamily?.inert, 0, "required is not inert either");
  assert.equal(requiredFamily?.required, 1, "required is counted in its own tally");

  // A row that still claims a weaker holder over a now-required family is the stale one.
  const outranked = auditExample("ex", [required("property:classification", "f1")],
    [row({ subject: "property:classification", heldBy: "parity-control" })], {});
  assert.ok(outranked.some((m) => /needs no ledger row/.test(m)),
    `a row outranked by the validator must be reported: ${outranked.join("; ")}`);

  // A pin over a now-required family is a landed correction, and must say so rather than sit quiet.
  const byValidation = { "ex/relation:dp/t": "x".repeat(MIN_REASON * 2) };
  const promoted = auditExample("ex", [required("relation:dp/t", "a -> b")], [], byValidation);
  assert.ok(promoted.some((m) => /REFUSES to delete/.test(m)),
    `a pin whose subject became validation-required must be reported: ${promoted.join("; ")}`);
  assert.ok(promoted.some((m) => /delete the pin/.test(m)), "and must name the edit that clears it");
});
