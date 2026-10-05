// §16's semantic coverage gate: every obligation it states, over every example that ships.
//
// **READ THIS FIRST — what a green run proves, and what it does not.**
//
// It proves that each of §16's clauses has a DENOMINATOR derived from the corpus, that the
// denominator is non-empty for a reason established independently of the clause it serves, and that
// every member of it is discharged. That is a coverage claim, in `test/model-coverage.test.ts`'s
// sense and deliberately in its shape: the denominator comes from the repository, the exemption cap
// is zero, and an empty numerator over an empty denominator fails rather than passes.
//
// It does NOT prove that the examples teach well, that a question is worth asking, or that a note
// says something true. Six of the eleven clauses were already held before this file existed — by
// `test/examples.test.ts`, `test/bindings-census.test.ts` and the validator's own reference rules —
// and where that is so this file holds TOTALITY rather than re-deciding the verdict: that nothing
// authored escapes the control that decides it. Naming which control decides what is half of what
// the obligation table below is for.
//
// ## The obligation set is READ from §16, never written here
//
// `specClauses()` parses the clause list out of the design document and the table below must claim
// each clause exactly once, in both directions. Nothing in this file states how many obligations
// there are, and nothing states how many examples, questions, requirements, promises or magnitudes
// the corpus holds. Three incidents in one day came from a figure pinned against a set this project
// keeps growing — a reserved id that collided, an ordinal wrong when written, a corpus count that
// fired on legitimate growth — so a twelfth clause and a seventh example each grow both sides of
// every comparison here and only a real divergence fires.
//
// ## Vacuity is guarded per obligation, and the guard is named per obligation
//
// Eleven walks over empty collections all pass. So each audit returns its `subjects` — the
// denominator — beside its `findings`, and a separate gate refuses any audit whose denominator is
// empty. Each audit also carries a `witness` sentence naming where its non-emptiness comes from,
// and in every case that source is a DIFFERENT reader from the one the audit checks: the presented
// questions come through the application's `ExampleCatalog`, the registered ones through
// `canonicalize`; the requirement census comes from the authored YAML, the verifications from the
// engine. `test/vacuous-verification.test.ts` is the landed exemplar and its reasoning is the
// reasoning here.
//
// ## Residues are named, never absorbed
//
// An audit may reach a subject it cannot decide. Those come back as `residues` and are asserted to
// be a named, explained set — because a subject silently dropped from a numerator is the vacuous
// pass this project keeps finding, wearing the one costume a coverage gate is most likely to wear.
//
// ## The eleventh clause is REVIEWABLE, and this file says so instead of pretending
//
// *"No prose-only question may imply capability the kernel cannot perform."* That is a claim about
// prose against the kernel, and it is not a loop. Its obligation carries `grade: "asserted"` in
// §13.1's vocabulary and `audit: null` — no predicate — and a gate below holds the two together, so
// an author who adds a predicate must also change the grade. The full ruling is at `prose-capability`
// below. The short version: the three instances of this class found on 261005 were a doc comment
// whose rationale was false of five shipped examples, a registry entry denying a model type was
// addressable when it was, and twice a test pinning a false sentence as a substring. A keyword scan
// over example prose would have caught none of them and would have fired on `256 KiB` eight times in
// a file whose prose is scrupulously correct about there being no `KiB` token.
//
// ## What this file found, so a reader does not have to reconstruct it
//
// Two fixed in the corpus, three reported and not reached for:
//
//   - FIXED. `message-bus` presented `Restricted data reaches Analytics` for a query whose own
//     statement is `An event carrying restricted data reaches a service not permitted to process
//     it`. The label named one service the query never mentions; it was true only because the search
//     returned that service's witness. 53 of the corpus's other labels are their query's own
//     statement verbatim, so equality is the corpus's own discipline and `question-registration`
//     now holds it.
//   - FIXED. The capstone's two hand-derived quantitative expectations were premise-checked by
//     nothing: the three tests that walk charges, occurrences and ceilings all open
//     `loadExample("document-processing")`. The fixture disclosed it and asked for the
//     generalization; `pinned-properties-evaluated` is that generalization, and it also cross-checks
//     each figure against the engine where a magnitude-bearing query of the metric is registered.
//   - REPORTED, engine. `src/engine/ltl.ts`'s tokenizer forbids `-` inside a reference, while
//     `resolveRef` accepts one and every behaviour query in the corpus uses one. So the LTL TEXT
//     surface cannot name eight of the nine machines the examples declare — `always
//     (motion-interlock.state: enabled)` comes back as a GRAMMAR error — and only `mission` is
//     reachable. The object grammar accepts them, which is why the temporal test never met this.
//     `ltl-formulas` therefore type-checks through `resolveFormula` and records the text-surface
//     refusal as a measured finding rather than routing around it.
//   - REPORTED, loader. `canonicalize` reads a relation type's `composition.path` as
//     `=== "allowed" ? "allowed" : "forbidden"`, so `path: sideways` becomes `forbidden` with no
//     finding; the schema's enum catches it only on the Python shape pass, which the browser seam
//     never runs. `composition-registration` therefore reads the AUTHORED BYTES against the schema's
//     own enum: reading `pathComposition` would make the check unfalsifiable, because the coercion
//     erases the violation before the check can see it.
//   - REPORTED, sibling test. `test/examples.test.ts`'s "every declared modification changes a
//     recorded answer" is stronger than its body: three corpus changes declare `from === to` and the
//     loop accepts them without comment. The sentence is true of the corpus for a reason the test
//     does not state — each is a REPAIR whose query a sibling modification flips — and
//     `mutation-transitions` holds that reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { SHIPPED_EXAMPLE_IDS, ExampleCatalog } from "../src/app/examples.ts";
import type { ShippedExampleId } from "../src/app/examples.ts";
import { Workspace } from "../src/app/services.ts";
import { DIMENSIONS, evaluationOf } from "../src/ir/types.ts";
import type {
  CanonicalSystem, CanonQuantity, Dimension, Magnitude, QueryResult,
} from "../src/ir/types.ts";
import { buildScope, runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import { parseQuery } from "../src/engine/types.ts";
import type { Predicate } from "../src/engine/types.ts";
import { parseRequirement } from "../src/engine/verification.ts";
import { BINDINGS, COMPOSITIONS } from "../src/engine/model-types.ts";
import {
  alwaysOf, andOf, eventuallyOf, impliesOf, nextOf, notOf, orOf, proposition, resolveFormula,
  untilOf,
} from "../src/engine/ltl.ts";
import type { ParsedFormula } from "../src/engine/ltl.ts";
import { quantityMagnitude } from "../src/quant/types.ts";
import type { RangeEnd } from "../src/quant/types.ts";
import { exampleText, loadExample, realPorts } from "../scripts/gen-example-coverage.ts";
import type {
  EvidenceExpectation, Fixture, QuantitativeExpectation,
} from "../scripts/gen-example-coverage.ts";

// ----------------------------------------------------------------------------------------------
// §16's own text, as the obligation denominator
// ----------------------------------------------------------------------------------------------

const SPEC = "DESIGN-v02-examples-and-semantic-completion-261004.md";

/**
 * The clauses §16 states, read out of the document.
 *
 * Ten are bullets under "For every built-in example:"; the eleventh is the paragraph that closes the
 * section, and it is a clause rather than commentary — it states a prohibition in the same voice.
 * Parsed rather than transcribed so the obligation table cannot quietly stop covering the spec, and
 * so no number describing the spec is written anywhere in this file.
 */
function specClauses(): readonly string[] {
  const text = readFileSync(SPEC, "utf8");
  const open = text.indexOf("16. Semantic coverage gate for examples");
  assert.ok(open >= 0, `${SPEC}: §16's heading is gone, so this gate no longer knows what it enforces`);
  const close = text.indexOf("17. Learn page integration", open);
  assert.ok(close > open, `${SPEC}: §16 has no following section, so its extent cannot be read`);
  const block = text.slice(open, close);

  const bullets = block.split("\n")
    .filter((line) => line.startsWith("* "))
    .map((line) => line.slice(2).trim().replace(/;$/, "").replace(/\.$/, ""));
  const closing = block.split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("No prose-only"))
    .map((line) => line.replace(/\.$/, ""));

  const clauses = [...bullets, ...closing];
  assert.ok(bullets.length > 0, `${SPEC}: §16 lists no bulleted clause, so this gate's denominator is empty`);
  assert.ok(closing.length > 0, `${SPEC}: §16's closing prohibition is gone; it is clause eleven here`);
  return clauses;
}

// ----------------------------------------------------------------------------------------------
// The corpus, loaded once
// ----------------------------------------------------------------------------------------------

type Raw = Record<string, unknown>;

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);

interface Example {
  readonly id: ShippedExampleId;
  /** The authored model document, as written. */
  readonly raw: Raw;
  readonly system: CanonicalSystem;
  readonly fixture: Fixture;
  /** The fixture document, as written — the subject of the authored-key walk. */
  readonly fixtureRaw: Raw;
  /** The questions a student is PRESENTED, through the application's own catalogue. */
  readonly presented: readonly string[];
  readonly workspace: Workspace;
}

type Corpus = readonly Example[];

let cached: Corpus | null = null;

async function corpus(): Promise<Corpus> {
  if (cached !== null) return cached;
  const read = (path: string): Promise<string> => Promise.resolve(readFileSync(path, "utf8"));
  const built: Example[] = [];
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const loaded = loadExample(id);
    const raw = parse(exampleText(id)) as unknown;
    assert.ok(isObj(raw), `${id}: the model document is not a mapping`);
    const fixtureRaw = parse(readFileSync(fixturePath(id), "utf8")) as unknown;
    assert.ok(isObj(fixtureRaw), `${id}: the fixture document is not a mapping`);
    // Through the APPLICATION's catalogue, not through `readFixture`. The presented set is the thing
    // a student reads, and a gate that derived it from the same reader it checks could not notice
    // the presentation surface drifting away from the corpus.
    const catalogue = new ExampleCatalog(new Workspace(realPorts), read);
    const described = await catalogue.describe(id);
    built.push({
      id, raw, fixtureRaw,
      system: loaded.workspace.state.system,
      fixture: loaded.fixture,
      presented: described.tryAsking,
      workspace: loaded.workspace,
    });
  }
  cached = built;
  return built;
}

const fixturePath = (id: string): string => `examples/${id}/expected-results.yaml`;

/** One authored row, asserted present before it is read — a probe reading `undefined` is vacuous. */
function rowOf(block: Raw, key: string, what: string): Raw {
  const found = block[key];
  assert.ok(isObj(found), `${what}: the corpus declares no '${key}', so this probe's premise is stale`);
  return found;
}

// ----------------------------------------------------------------------------------------------
// The audit shape
// ----------------------------------------------------------------------------------------------

/**
 * A subject reached and not decided.
 *
 * A pair rather than a sentence, so a residue without a reason is unrepresentable. The alternative —
 * a string the receipt inspects for a reason — was the first shape here and it failed its own gate on
 * a punctuation mark, which is the argument for the type doing the work.
 */
interface Residue {
  readonly subject: string;
  readonly why: string;
}

interface Audit {
  /** The denominator, one entry per subject, derived from the corpus. Empty is a finding. */
  readonly subjects: readonly string[];
  /** Where non-emptiness comes from, established by a reader other than the one being checked. */
  readonly witness: string;
  readonly findings: readonly string[];
  /** Subjects reached and not decided. Named here rather than dropped from the numerator. */
  readonly residues: readonly Residue[];
}

interface Obligation {
  readonly id: string;
  /** A distinctive fragment of §16's own clause. The join key, in both directions. */
  readonly clause: string;
  /** §13.1's correspondence vocabulary, applied to this obligation's own enforcement. */
  readonly grade: "asserted" | "checked" | "derived" | "generated";
  /** Null ONLY where the clause is reviewable rather than checkable. Held with `grade` below. */
  readonly audit: ((c: Corpus) => Audit) | null;
  /** Which control decides it, where that is not this file. Read by the receipt gate. */
  readonly decidedBy: string;
}

const audit = (
  subjects: readonly string[], witness: string,
  findings: readonly string[], residues: readonly Residue[] = [],
): Audit => ({ subjects, witness, findings, residues });

// ----------------------------------------------------------------------------------------------
// 1. Every student-visible executable question maps to a registered query
// ----------------------------------------------------------------------------------------------

/**
 * The presented questions, joined to the queries the kernel has saved.
 *
 * Three joins, and the third is the one nothing else held. A presented question must (a) name a row
 * in the fixture, (b) whose id the canonical system declares as a saved query, and (c) whose
 * presented LABEL is that query's own `name`. The third matters because a label is otherwise a
 * second copy of the statement the saved query already persists — `src/app/properties.ts` says so in
 * terms, "the statement is already semantic and already persisted as the saved query's `name`" — and
 * a second copy free to drift is the duplication this project removes on sight.
 *
 * VACUITY: the denominator comes from `ExampleCatalog.describe`, which throws when an example marks
 * no query suggested, and the thing it is joined against comes from `canonicalize`. A walk that
 * enumerated nothing would fail the comparison against a presented set the application insists is
 * non-empty, rather than carrying the zero-findings claim for free.
 */
function auditQuestionRegistration(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  for (const ex of c) {
    const byLabel = new Map(ex.fixture.queries.map((q) => [q.label.trim(), q] as const));
    for (const label of ex.presented) {
      subjects.push(`${ex.id}/${label}`);
      const row = byLabel.get(label.trim());
      if (row === undefined) {
        findings.push(
          `${ex.id}: the catalogue presents '${label}' and no fixture row carries that label, so the `
          + `question a student reads is attached to nothing`);
        continue;
      }
      const saved = ex.system.queries.get(row.id);
      if (saved === undefined) {
        findings.push(
          `${ex.id}/${row.id}: presented, and the system declares no saved query by that id — a `
          + `student-visible question the kernel cannot be asked`);
        continue;
      }
      const parsed = parseQuery(saved.raw);
      if (!parsed.ok) {
        findings.push(`${ex.id}/${row.id}: presented, and its saved query does not parse: ${parsed.refusal}`);
        continue;
      }
      const name = parsed.value.name;
      if (name === null) {
        findings.push(
          `${ex.id}/${row.id}: the saved query states no \`name\`, so the label is the only statement `
          + `of the question and nothing holds it to the query`);
        continue;
      }
      if (name.trim() !== row.label.trim()) {
        findings.push(
          `${ex.id}/${row.id}: the student is shown '${row.label.trim()}' and the saved query states `
          + `'${name.trim()}'. Two statements of one question, and nothing decides which is the `
          + `proposition the verdict is about`);
      }
    }
    // Both directions: a suggested row the catalogue does not present is a question the corpus
    // believes it ships and the application does not.
    const presented = new Set(ex.presented.map((l) => l.trim()));
    for (const q of ex.fixture.queries) {
      if (q.suggested && !presented.has(q.label.trim())) {
        findings.push(
          `${ex.id}/${q.id}: marked suggested and the catalogue does not present it, so the corpus and `
          + `the application disagree about what a student is offered`);
      }
    }
  }
  return audit(subjects, "the presented set comes from `ExampleCatalog.describe`, which refuses an "
    + "example that suggests nothing; the registered set comes from `canonicalize`", findings);
}

// ----------------------------------------------------------------------------------------------
// 2. Every claimed expected result is test-pinned
// ----------------------------------------------------------------------------------------------

/**
 * Every authored key in every fixture, each with the disposition that says what holds it.
 *
 * The denominator is a generic WALK of the fixture document, not a list of fields, so a key nobody
 * anticipated is picked up without anyone editing this file. The table below maps a key PATH to one
 * of three dispositions, and a path with no disposition is the finding:
 *
 *   `compared`   a control derives the same value and fails on a difference. The control is named.
 *   `shape`      the reader enforces presence and type, and nothing compares the value.
 *   `prose`      written for a human to read; no machine claim is made.
 *
 * A typo'd key — `rationalee:`, `expected_s:` — lands in none of the three and fires here, which is
 * the real content of the clause. A claim the reader silently drops is indistinguishable from a
 * claim nobody made, and the fixture layer exists precisely so that a recorded answer cannot be
 * quietly absent.
 *
 * VACUITY: the walk's output is compared against the TYPED fixture the reader produced — if the walk
 * found no `queries[].expected.outcome` while the reader produced queries, the walk is reading the
 * wrong document and says so, rather than reporting an empty denominator as a clean one.
 */
const DISPOSITIONS: Readonly<Record<string, "compared" | "shape" | "prose">> = {
  "example": "compared",
  "system": "compared",
  "title": "compared",
  "summary": "compared",
  "models": "shape",
  "models[].id": "compared",
  "models[].kind": "compared",
  "requirements": "shape",
  "requirements[].id": "compared",
  "requirements[].statement": "compared",
  "requirements[].expressed_as": "compared",
  "requirements[].satisfied_when": "compared",
  "requirements[].decided_by": "compared",
  "requirements[].declared_as": "compared",
  "requirements[].limit_ms": "compared",
  "requirements[].limit_mb": "compared",
  "requirements[].blocked_by": "shape",
  "requirements[].status": "compared",
  "requirements[].note": "prose",
  "queries": "shape",
  "queries[].id": "compared",
  "queries[].label": "compared",
  "queries[].suggested": "compared",
  "queries[].models": "compared",
  "queries[].note": "shape",
  "queries[].expected": "shape",
  "queries[].expected.outcome": "compared",
  "queries[].expected.coverage": "compared",
  "queries[].expected.coverage_reason": "compared",
  "queries[].expected.refusal_contains": "compared",
  "queries[].expected.no_evidence": "compared",
  "queries[].expected.evidence": "shape",
  "queries[].expected.evidence.shape": "compared",
  "queries[].expected.evidence.role": "compared",
  "queries[].expected.evidence.path": "compared",
  "queries[].expected.evidence.nodes_include": "compared",
  "queries[].expected.evidence.node_count": "compared",
  "queries[].expected.evidence.min_steps": "compared",
  "queries[].expected.evidence.cycle_min_steps": "compared",
  "queries[].expected.evidence.labels_at_least": "compared",
  "queries[].expected.evidence.final": "compared",
  "modifications": "shape",
  "modifications[].id": "compared",
  "modifications[].label": "compared",
  "modifications[].rationale": "shape",
  "modifications[].note": "prose",
  "modifications[].transaction": "shape",
  "modifications[].transaction.operations": "compared",
  "modifications[].changes": "shape",
  "modifications[].changes[].query": "compared",
  "modifications[].changes[].from": "compared",
  "modifications[].changes[].to": "compared",
  "modifications[].counterexample": "shape",
  "modifications[].counterexample.shape": "compared",
  "modifications[].counterexample.role": "compared",
  "modifications[].counterexample.path": "compared",
  "modifications[].counterexample.nodes_include": "compared",
  "modifications[].counterexample.node_count": "compared",
  "modifications[].counterexample.min_steps": "compared",
  "modifications[].counterexample.cycle_min_steps": "compared",
  "modifications[].counterexample.labels_at_least": "compared",
  "modifications[].counterexample.final": "compared",
  "quantitative_expectations": "shape",
  "quantitative_expectations[].id": "compared",
  "quantitative_expectations[].metric": "compared",
  "quantitative_expectations[].label": "shape",
  "quantitative_expectations[].hand_derived": "compared",
  "quantitative_expectations[].trace_from": "compared",
  "quantitative_expectations[].reachability_from": "compared",
  "quantitative_expectations[].bound": "compared",
  "quantitative_expectations[].charges": "compared",
  "quantitative_expectations[].occurrences": "compared",
  "quantitative_expectations[].resident_mb": "compared",
  "quantitative_expectations[].when_charged_mb": "compared",
  "quantitative_expectations[].arithmetic": "prose",
  "quantitative_expectations[].expected_ms": "compared",
  "quantitative_expectations[].expected_mb": "compared",
  "quantitative_expectations[].baseline_mb": "compared",
  "quantitative_expectations[].note": "prose",
};

/** Keys whose VALUE is an author-chosen map and whose members are therefore not key paths. */
const VALUE_MAPS: ReadonlySet<string> = new Set([
  "charges", "occurrences", "resident_mb", "when_charged_mb", "labels_at_least", "final",
  "operations",
]);

function authoredKeyPaths(doc: unknown, at = ""): readonly string[] {
  if (Array.isArray(doc)) return doc.flatMap((item) => authoredKeyPaths(item, `${at}[]`));
  if (!isObj(doc)) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(doc)) {
    const path = at === "" ? key : `${at}.${key}`;
    out.push(path);
    if (VALUE_MAPS.has(key)) continue;
    out.push(...authoredKeyPaths(value, path));
  }
  return out;
}

function auditClaimFields(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  const residues: Residue[] = [];
  for (const ex of c) {
    for (const path of new Set(authoredKeyPaths(ex.fixtureRaw))) {
      subjects.push(`${ex.id}:${path}`);
      const disposition = DISPOSITIONS[path];
      if (disposition === undefined) {
        findings.push(
          `${ex.id}: '${path}' is authored and this gate knows no disposition for it. Either the `
          + `fixture reader carries it and the table below must say what compares it, or the reader `
          + `drops it — in which case the claim is indistinguishable from a typo`);
        continue;
      }
      if (disposition !== "compared") {
        residues.push({
          subject: `${ex.id}:${path}`,
          why: disposition === "shape"
            ? "the reader enforces presence and type; no control compares the value"
            : "written for a human to read; no machine claim is made",
        });
      }
    }
    // `system:` names the document the fixture describes. Compared by reading the file it names and
    // requiring it to be the bytes the loader loads, so no filename is written here.
    const named = ex.fixtureRaw["system"];
    assert.equal(typeof named, "string", `${ex.id}: the fixture names no system document`);
    const text = readFileSync(`examples/${ex.id}/${String(named)}`, "utf8");
    if (text !== exampleText(ex.id)) {
      findings.push(
        `${ex.id}: the fixture says it describes '${String(named)}' and that file is not the one the `
        + `loader reads, so every claim in it is about a different document`);
    }
    if (String(ex.fixtureRaw["example"]) !== ex.id) {
      findings.push(`${ex.id}: the fixture's own \`example\` key says '${String(ex.fixtureRaw["example"])}'`);
    }
  }

  // The walk's premise, asserted: the reader produced claims, so the walk must have found their keys.
  const walked = new Set(subjects.map((s) => s.slice(s.indexOf(":") + 1)));
  assert.ok(walked.has("queries[].expected.outcome"),
    "the authored-key walk found no recorded outcome anywhere in the corpus, so it is reading the "
    + "wrong document and the zero-findings claim above rests on nothing");
  return audit(subjects,
    "the walk's output is checked to contain the recorded-outcome key the typed reader also produces",
    findings, residues);
}

// ----------------------------------------------------------------------------------------------
// 3. Every pinned property is evaluated in CI
// ----------------------------------------------------------------------------------------------

const metricOf = (e: QuantitativeExpectation): string =>
  e.metric === "memory" ? "peak_memory" : "latency";

/** The magnitudes a quantity query of this metric reports, over the whole example. */
function magnitudesOfMetric(ex: Example, metric: string): readonly number[] {
  const out: number[] = [];
  for (const [, saved] of ex.system.queries) {
    const parsed = parseQuery(saved.raw);
    if (!parsed.ok || parsed.value.kind !== "quantity") continue;
    if (parsed.value.quantity.metric !== metric) continue;
    const res: QueryResult = ex.workspace.query(saved.raw);
    const value = res.magnitude?.value;
    if (typeof value === "number") out.push(value);
  }
  return out;
}

/**
 * Every pinned property, evaluated here rather than taken on trust.
 *
 * Two kinds of pinned property ship. A REQUIREMENT's recorded `status` is evaluated by
 * `test/examples.test.ts` through the production join; this audit holds the totality — every
 * authored obligation is enumerated by that join, and a recorded status of `pending-evaluator` must
 * still be genuinely undecidable, because a status parked on an absent evaluator is the one claim
 * that quietly stops being true when the evaluator lands.
 *
 * A hand-derived QUANTITATIVE EXPECTATION is the other, and it is where the gap was. Its premises —
 * which quantity supplies each charge, which entity each occurrence names, which query supplies the
 * trace — were checked for one example by three tests that each open that example by name, so the
 * capstone's figures were read strictly by the reader and compared by nothing. This walks every
 * example's expectations, checks each premise against the model, and cross-checks the TOTAL against
 * the engine wherever the example registers a quantity query of the matching metric. Where it
 * registers none, the expectation is a named residue rather than a silent pass.
 *
 * VACUITY: the requirement census is built from the AUTHORED YAML and compared against the join's
 * enumeration, which is `test/vacuous-verification.test.ts`'s construction and for its reason — a
 * census computed by calling the join twice agrees with itself about having done nothing.
 */
function auditPinnedProperties(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  const residues: Residue[] = [];
  for (const ex of c) {
    const authored = Object.keys(isObj(ex.raw["requirements"]) ? ex.raw["requirements"] : {});
    const enumerated = [...verifySystemRequirements(ex.system).keys()];
    for (const id of authored) {
      subjects.push(`${ex.id}/requirement:${id}`);
      if (!enumerated.includes(id)) {
        findings.push(
          `${ex.id}/${id}: the model authors this obligation and the verification join does not `
          + `enumerate it, so nothing evaluates what it claims`);
      }
    }
    for (const id of enumerated) {
      if (!authored.includes(id)) {
        findings.push(`${ex.id}/${id}: verified and not authored — the join invented an obligation`);
      }
    }
    for (const req of ex.fixture.requirements) {
      if (req.status !== "pending-evaluator") continue;
      subjects.push(`${ex.id}/pending:${req.id}`);
      findings.push(
        `${ex.id}/${req.id}: recorded 'pending-evaluator', which parks a property on an absent `
        + `evaluator. Re-derive it: ${String(req.blockedBy)}`);
    }

    for (const e of ex.fixture.quantitativeExpectations) {
      subjects.push(`${ex.id}/expectation:${e.id}`);
      const end: RangeEnd = e.bound === "low" ? "lower" : e.bound === "high" ? "upper" : "point";
      for (const [id, amount] of e.charges) {
        const q = ex.system.quantities.get(id);
        if (q === undefined) {
          findings.push(`${ex.id}/${e.id}: charges name quantity '${id}', which the model does not declare`);
          continue;
        }
        const m = quantityMagnitude(q, end);
        if (!m.ok) {
          findings.push(`${ex.id}/${e.id}: quantity '${id}' has no magnitude at '${end}': ${m.refusal}`);
          continue;
        }
        if (m.value !== amount) {
          findings.push(
            `${ex.id}/${e.id}: the charge for '${id}' is ${amount}, and the model declares ${m.value} `
            + `at the '${end}' end. The disagreement is the finding — do not adjust the fixture`);
        }
      }
      for (const [entity] of e.occurrences) {
        if (!ex.system.entities.has(entity)) {
          findings.push(`${ex.id}/${e.id}: occurrences name entity '${entity}', which the model does not declare`);
        }
      }
      for (const [key, amounts] of [["resident_mb", e.residentMb], ["when_charged_mb", e.whenChargedMb]] as const) {
        for (const [id] of amounts) {
          if (!ex.system.quantities.has(id)) {
            findings.push(`${ex.id}/${e.id}: ${key} names quantity '${id}', which the model does not declare`);
          }
        }
      }
      for (const [key, named] of [["trace_from", e.traceFrom], ["reachability_from", e.reachabilityFrom]] as const) {
        if (named !== null && !ex.system.queries.has(named)) {
          findings.push(`${ex.id}/${e.id}: ${key} names '${named}', which is not a registered query`);
        }
      }
      const reported = magnitudesOfMetric(ex, metricOf(e));
      if (reported.length === 0) {
        residues.push({
          subject: `${ex.id}/expectation:${e.id}`,
          why: `the example registers no '${metricOf(e)}' quantity query, so the engine reports no `
            + `figure to compare this total against. Its premises are checked above; its arithmetic `
            + `is checked by the example-specific tests where those exist`,
        });
        continue;
      }
      if (!reported.includes(e.expected)) {
        findings.push(
          `${ex.id}/${e.id}: the hand figure is ${e.expected} and no '${metricOf(e)}' query reports `
          + `it — the engine reports ${reported.join(", ")}. The disagreement is the finding`);
      }
    }
  }
  return audit(subjects,
    "the requirement census is the authored `requirements:` blocks, read independently of the join "
    + "whose enumeration it is compared against", findings, residues);
}

// ----------------------------------------------------------------------------------------------
// 4. Every requirement references an actual query and valid satisfied_when
// ----------------------------------------------------------------------------------------------

/**
 * Both routes a requirement can take to a verdict, each checked to its end.
 *
 * `expressed_as` must name a registered query and declare a `satisfied_when` the production parse
 * accepts — through `parseRequirement`, so a word naming an evaluation status is refused here and
 * not merely absent from the corpus by luck. `decided_by` names a supplied hand-derived expectation
 * instead, and then the chain that carries the number is the thing to check: `declared_as` must name
 * a quantity the model declares, and the fixture's limit must BE that quantity's magnitude in base
 * units. That last join was held for one example by name; it is held for the corpus here.
 *
 * VACUITY: the denominator is the union of the authored `requirements:` block and the fixture's
 * rows, two documents read separately, and a requirement present in one and not the other is itself
 * a finding — so neither side can be empty without the comparison failing.
 */
function auditRequirementReferences(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  for (const ex of c) {
    const authored = isObj(ex.raw["requirements"]) ? ex.raw["requirements"] : {};
    for (const id of Object.keys(authored)) {
      subjects.push(`${ex.id}/authored:${id}`);
      // `SavedRequirement.raw`, not the document's own mapping value. The authored block is keyed by
      // id and `canonicalize` hoists the key into the mapping so one reader serves both surfaces —
      // the array-shaped fixture and the map-shaped model. Reading the document value directly
      // refuses every requirement in the corpus for want of an `id`, which is the shape this probe
      // had first and the reason the hoist exists.
      const saved = ex.system.requirements.get(id);
      if (saved === undefined) {
        findings.push(
          `${ex.id}/${id}: authored and the canonical system carries no such requirement, so the `
          + `declaration never reached the engine`);
        continue;
      }
      const parsed = parseRequirement(saved.raw, `${ex.id}/${id}`);
      if (!parsed.ok) {
        findings.push(`${ex.id}/${id}: the authored declaration does not read: ${parsed.problem.problem}`);
        continue;
      }
      if (!ex.system.queries.has(parsed.value.expressedAs)) {
        findings.push(
          `${ex.id}/${id}: names query '${parsed.value.expressedAs}', which the system does not declare`);
      }
    }
    for (const req of ex.fixture.requirements) {
      subjects.push(`${ex.id}/fixture:${req.id}`);
      if (req.expressedAs !== null) {
        if (!ex.system.queries.has(req.expressedAs)) {
          findings.push(`${ex.id}/${req.id}: names query '${req.expressedAs}', which is not registered`);
        }
        const parsed = parseRequirement({
          id: req.id, statement: req.statement,
          expressed_as: req.expressedAs, satisfied_when: req.satisfiedWhen,
        }, `${ex.id}/${req.id}`);
        if (!parsed.ok) {
          findings.push(`${ex.id}/${req.id}: satisfied_when is not valid: ${parsed.problem.problem}`);
        }
        if (!Object.hasOwn(authored, req.id)) {
          findings.push(
            `${ex.id}/${req.id}: takes the saved-query route and the MODEL authors no such `
            + `obligation, so the fixture states a requirement the system does not prescribe`);
        }
      } else {
        const decider = ex.fixture.quantitativeExpectations.find((e) => e.id === req.decidedBy);
        if (decider === undefined) {
          findings.push(`${ex.id}/${req.id}: decided_by names '${String(req.decidedBy)}', which is not supplied`);
        }
      }
      if (req.declaredAs === null) continue;
      const ceiling = ex.system.quantities.get(req.declaredAs);
      if (ceiling === undefined) {
        findings.push(`${ex.id}/${req.id}: declared_as names quantity '${req.declaredAs}', which is not declared`);
        continue;
      }
      if (req.limit === null) continue;
      const m = quantityMagnitude(ceiling, "point");
      if (!m.ok) {
        findings.push(`${ex.id}/${req.id}: the declared ceiling has no magnitude: ${m.refusal}`);
        continue;
      }
      if (m.value !== req.limit) {
        findings.push(
          `${ex.id}/${req.id}: the fixture's limit is ${req.limit} and '${req.declaredAs}' declares `
          + `${m.value}. Two figures for one ceiling, and the statement quotes the wrong one`);
      }
    }
  }
  return audit(subjects,
    "the denominator unions the authored `requirements:` block with the fixture's rows, read from "
    + "two documents, and a row in one and not the other is a finding", findings);
}

// ----------------------------------------------------------------------------------------------
// 5. Every binding references valid elements
// ----------------------------------------------------------------------------------------------

/**
 * Every instance of every registered binding, with its referent resolved.
 *
 * A binding is READ, never declared (`DECISIONS-RULED-authored-constructs-261004.md` §2), so the
 * denominator cannot come from a `bindings:` key — there is none and there never will be. It comes
 * from the registry's own `witness`: `appears-in` is witnessed by a model's `entities` membership,
 * `machine-of-entity` by a machine's `entity:`, `state-of-entity` by an entity's
 * `executes_in_state`. Every registered row must contribute instances, and every instance's
 * referent must resolve.
 *
 * `test/bindings-census.test.ts` holds the complementary half — that every cross-type reference the
 * corpus authors is NAMED by a registered binding — and it cannot hold this one, because it DERIVES
 * a reference by resolving it: a referent that resolves nowhere is not seen as a cross-type
 * reference at all, so it falls out of that census silently. This is the direction the census
 * cannot see.
 *
 * VACUITY: the registry supplies the keys and the corpus supplies the instances, and a registered
 * row that no example witnesses is a finding — so the denominator cannot be empty while the registry
 * is non-empty. The negative control below perturbs each instance and requires a validator finding,
 * which is what proves the referents are checked rather than merely well-spelled today.
 */
function auditBindingReferents(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  const witnessed = new Set<string>();

  for (const ex of c) {
    for (const [mid, machine] of ex.system.machines) {
      if (machine.entity === null) continue;
      witnessed.add("machine-of-entity");
      subjects.push(`${ex.id}/machine-of-entity:${mid}`);
      if (!ex.system.entities.has(machine.entity)) {
        findings.push(
          `${ex.id}/${mid}: \`entity: ${machine.entity}\` names no declared entity, so the binding `
          + `between this behaviour and the thing it describes points at nothing`);
      }
    }
    const states = new Map<string, string>();
    for (const [mid, machine] of ex.system.machines) for (const s of machine.states) states.set(s, mid);
    const entities = isObj(ex.raw["entities"]) ? ex.raw["entities"] : {};
    for (const [eid, entity] of Object.entries(entities)) {
      if (!isObj(entity)) continue;
      const props = isObj(entity["properties"]) ? entity["properties"] : {};
      const declared = props["executes_in_state"];
      if (declared === undefined) continue;
      witnessed.add("state-of-entity");
      subjects.push(`${ex.id}/state-of-entity:${eid}`);
      const value = isObj(declared) ? String(declared["value"]) : String(declared);
      const bare = value.includes(".") ? value.slice(value.indexOf(".") + 1) : value;
      const machine = value.includes(".") ? value.slice(0, value.indexOf(".")) : states.get(bare);
      if (machine === undefined || !ex.system.machines.has(machine)) {
        findings.push(`${ex.id}/${eid}: executes_in_state '${value}' names no declared machine`);
        continue;
      }
      if (!(ex.system.machines.get(machine)?.states.includes(bare) ?? false)) {
        findings.push(
          `${ex.id}/${eid}: executes_in_state '${value}' names no state of '${machine}'. This is the `
          + `join entity accounting charges through, so a reference that resolves nowhere silently `
          + `removes the entity from every analysis`);
      }
    }
    for (const [modelId, model] of ex.system.models) {
      for (const member of model.entities) {
        witnessed.add("appears-in");
        subjects.push(`${ex.id}/appears-in:${modelId}.${member}`);
        if (!ex.system.entities.has(member)) {
          findings.push(`${ex.id}/${modelId}: declares member '${member}', which is not a system entity`);
        }
      }
    }
  }
  for (const binding of BINDINGS) {
    if (!witnessed.has(binding.name)) {
      findings.push(
        `the registry declares binding '${binding.name}' and no shipped example witnesses one, so `
        + `this obligation says nothing about it and the declaration may be stale`);
    }
  }
  return audit(subjects,
    "the keys come from `BINDINGS`'s own witnesses and the instances from the corpus; a registered "
    + "row no example witnesses is a finding, so neither side can be empty quietly", findings);
}

// ----------------------------------------------------------------------------------------------
// 6. Every composition is registered
// ----------------------------------------------------------------------------------------------

/** The values the model schema admits for a relation type's path composition. */
function schemaPathValues(): readonly string[] {
  const schema: unknown = JSON.parse(readFileSync("mage-model.schema.json", "utf8"));
  assert.ok(isObj(schema));
  const relationTypes = rowOf(rowOf(schema, "properties", "the model schema"), "relation-types", "the schema");
  const composition = rowOf(
    rowOf(rowOf(relationTypes, "additionalProperties", "relation-types"), "properties", "a relation type"),
    "composition", "a relation type");
  const path = rowOf(rowOf(composition, "properties", "composition"), "path", "composition");
  const values = path["enum"];
  assert.ok(Array.isArray(values) && values.length > 0,
    "mage-model.schema.json no longer enumerates a relation type's path composition, so this gate "
    + "has no registered set to check an authored value against");
  return values.map(String);
}

/**
 * Two kinds of composition ship, and both must be registered somewhere the kernel reads.
 *
 * A CROSS-MODEL composition is a behavioural predicate selecting the executions a quantitative
 * question is evaluated over — a quantity query carrying a `target:` — and v0.2 admits exactly one
 * row for it by ruling. Each instance's (from, to) type pair must be that row.
 *
 * A relation type's PATH composition is the other, and it is read from the AUTHORED BYTES against
 * the schema's own enum. That is not a stylistic choice: `canonicalize` reads `composition.path` as
 * `=== "allowed" ? "allowed" : "forbidden"`, so an unrecognized value becomes `forbidden` with no
 * finding anywhere on the TypeScript path — the seam a student's own edit travels. Reading
 * `pathComposition` would make this check unfalsifiable, because the coercion destroys the evidence
 * before the check could see it. The negative control below drives exactly that.
 *
 * VACUITY: both halves are counted into one denominator and each half is separately required to be
 * non-empty, so an example set that stopped composing anything could not carry a clean reading.
 */
function auditCompositionRegistration(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  const admitted = new Set(schemaPathValues());
  let crossModel = 0;
  let pathDeclarations = 0;

  for (const ex of c) {
    for (const [qid, saved] of ex.system.queries) {
      const parsed = parseQuery(saved.raw);
      if (!parsed.ok || parsed.value.kind !== "quantity") continue;
      if (parsed.value.quantity.target === null) continue;
      crossModel += 1;
      subjects.push(`${ex.id}/cross-model:${qid}`);
      const row = COMPOSITIONS.find((x) => x.from === "state-machine" && x.to === "quantitative-model");
      if (row === undefined) {
        findings.push(
          `${ex.id}/${qid}: a behavioural selection restricts a quantitative question and no `
          + `registered composition runs state-machine to quantitative-model`);
      }
    }
    const relationTypes = isObj(ex.raw["relation-types"]) ? ex.raw["relation-types"] : {};
    for (const [rid, declaration] of Object.entries(relationTypes)) {
      if (!isObj(declaration)) continue;
      const composition = declaration["composition"];
      if (composition === undefined) continue;
      pathDeclarations += 1;
      subjects.push(`${ex.id}/path:${rid}`);
      if (!isObj(composition)) {
        findings.push(`${ex.id}/${rid}: \`composition\` is not a mapping, so it declares nothing`);
        continue;
      }
      const value = composition["path"];
      if (typeof value !== "string" || !admitted.has(value)) {
        findings.push(
          `${ex.id}/${rid}: \`composition.path: ${JSON.stringify(value)}\` is not one of `
          + `${[...admitted].join(", ")}. The loader coerces an unrecognized value to the restrictive `
          + `arm with no finding, so every multi-hop question over this relation silently becomes `
          + `unlicensed instead of being answered`);
      }
    }
  }
  assert.ok(crossModel > 0,
    "no shipped example composes a behavioural selection into a quantitative question, so the "
    + "cross-model half of this obligation is checking nothing");
  assert.ok(pathDeclarations > 0,
    "no shipped relation type declares a path composition, so the authored half of this obligation "
    + "is checking nothing");
  return audit(subjects,
    "the admitted value set is read from `mage-model.schema.json`'s own enum and the instances from "
    + "the authored bytes; both halves are asserted non-empty before the findings are read", findings);
}

// ----------------------------------------------------------------------------------------------
// 7. Every unit is recognized
// ----------------------------------------------------------------------------------------------

/**
 * Every written magnitude in a quantity, with the dimension that owns it.
 *
 * The third element is a literal's OWN declared dimension, which an expression operand carries
 * separately from the quantity it sits in — `metrics.visits * 50 ms` declares `duration` on the
 * literal while the quantity may declare something else, and checking the literal's unit against the
 * quantity's dimension would read the wrong unit table. Null means "the quantity's".
 */
function magnitudesOf(q: CanonQuantity): readonly (readonly [string, Magnitude, Dimension | null])[] {
  const v = q.value;
  if (v.kind === "point") return [["value", v.magnitude, null]];
  if (v.kind === "range") return [["low", v.low, null], ["high", v.high, null]];
  if (v.kind === "expression") {
    const out: (readonly [string, Magnitude, Dimension | null])[] = [];
    for (const [i, term] of v.terms.entries()) {
      for (const [j, factor] of term.factors.entries()) {
        const operand = factor.operand;
        if (operand.kind !== "literal") continue;
        out.push([`terms[${i}].factors[${j}]`, operand.magnitude, operand.dimension]);
      }
    }
    return out;
  }
  return [];
}

/**
 * Every written magnitude in the corpus, with its unit resolved against the dimension that owns it.
 *
 * Two things must hold and they are different. The magnitude must have REACHED base units — `fault`
 * is null exactly when `base` is not, which is §7's "a quantity reaches anything downstream in base
 * units or not at all" held as a type — and its unit token must belong to the DECLARED dimension,
 * not merely to some dimension. A duration declared in `MB` normalizes cleanly against the wrong
 * table, which is the failure the second half exists for.
 *
 * Every magnitude SHAPE is walked: a point, both ends of a range, and every literal term of an
 * expression. A range whose `high` is faulted while its `low` is clean is the asymmetry a
 * point-only walk would miss.
 *
 * VACUITY: the denominator is compared against the quantities the corpus declares, so a walk that
 * found no magnitude while quantities exist fails rather than reporting a clean sweep of nothing.
 */
function auditUnitsRecognized(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  let quantities = 0;
  for (const ex of c) {
    for (const [qid, q] of ex.system.quantities) {
      quantities += 1;
      for (const [where, magnitude, own] of magnitudesOf(q)) {
        const dimension: Dimension | null = own ?? q.dimension;
        subjects.push(`${ex.id}/${qid}.${where}`);
        if (dimension === null) {
          findings.push(`${ex.id}/${qid}: dimension '${q.dimensionRaw}' is not one of the declared five`);
          continue;
        }
        if (magnitude.fault !== null || magnitude.base === null) {
          findings.push(
            `${ex.id}/${qid}.${where}: '${magnitude.raw}' did not reach base units (${String(magnitude.fault)})`);
          continue;
        }
        const units = DIMENSIONS[dimension].units;
        if (magnitude.unit === null) {
          if (Object.keys(units).length > 0) {
            findings.push(
              `${ex.id}/${qid}.${where}: '${magnitude.raw}' carries no unit and ${dimension} has `
              + `${Object.keys(units).join(", ")}. A silently assumed unit is the dimension bug this `
              + `obligation exists to catch`);
          }
          continue;
        }
        if (!Object.hasOwn(units, magnitude.unit)) {
          findings.push(
            `${ex.id}/${qid}.${where}: unit '${magnitude.unit}' is not a ${dimension} unit `
            + `(${Object.keys(units).join(", ")})`);
        }
      }
    }
  }
  assert.ok(quantities === 0 || subjects.length > 0,
    "the corpus declares quantities and this walk found no magnitude in any of them, so it is "
    + "reading the wrong field and its clean reading means nothing");
  return audit(subjects,
    "the magnitude walk is checked against the quantity count the same systems report, so an empty "
    + "walk over a non-empty corpus fails", findings);
}

// ----------------------------------------------------------------------------------------------
// 8. Every LTL formula parses and type-checks
// ----------------------------------------------------------------------------------------------

const LTL_IN_PROSE = /\b([GFX])\(/;

/** The formula-shaped strings the corpus writes, with the file and line each sits on. */
function proseFormulas(id: string): readonly (readonly [string, string])[] {
  const out: (readonly [string, string])[] = [];
  for (const file of [`examples/${id}/system.mage.yaml`, fixturePath(id)]) {
    const lines = readFileSync(file, "utf8").split("\n");
    for (const [i, line] of lines.entries()) {
      if (!LTL_IN_PROSE.test(line)) continue;
      const start = line.search(LTL_IN_PROSE);
      let depth = 0;
      let end = -1;
      for (let k = start; k < line.length; k += 1) {
        const ch = line.charAt(k);
        if (ch === "(") depth += 1;
        if (ch === ")") { depth -= 1; if (depth === 0) { end = k + 1; break; } }
      }
      if (end === -1) continue;
      out.push([`${file}:${i + 1}`, line.slice(start, end)]);
    }
  }
  return out;
}

const TEMPORAL_WORDS: Readonly<Record<string, (f: ParsedFormula) => ParsedFormula>> = {
  G: alwaysOf, F: eventuallyOf, X: nextOf, not: notOf,
};

const BINARY_WORDS: Readonly<Record<string, (a: ParsedFormula, b: ParsedFormula) => ParsedFormula>> = {
  and: andOf, or: orOf, "->": impliesOf, U: untilOf,
};

/**
 * Translate the standard notation the corpus writes into the kernel's own formula objects.
 *
 * The OBJECT grammar, not the text grammar, and the reason is a measured defect rather than a
 * preference: the text tokenizer's reference pattern forbids `-`, so `motion-interlock.state:
 * enabled` comes back as a grammar error while `resolveRef` resolves the same reference happily.
 * Eight of the nine machines the corpus declares are hyphenated. Routing through `proposition` and
 * the combinators reaches `resolveFormula` — the kernel's own type-checker — without going through
 * the pattern that cannot spell the corpus.
 *
 * A bare word becomes the state predicate of the one machine declaring that state. An ambiguous or
 * unknown word is NOT guessed at: it comes back as a refusal, so an untranslatable formula is a
 * finding rather than a skip.
 */
function translate(system: CanonicalSystem, text: string): { ok: true; value: ParsedFormula } | { ok: false; why: string } {
  const owners = new Map<string, string[]>();
  for (const [mid, machine] of system.machines) {
    for (const state of machine.states) {
      const list = owners.get(state);
      if (list === undefined) owners.set(state, [mid]);
      else list.push(mid);
    }
  }
  const tokens = text.replace(/->/g, " -> ").replace(/[()]/g, (p) => ` ${p} `).trim().split(/\s+/);
  let at = 0;
  const peek = (): string | undefined => tokens[at];

  const atom = (word: string): { ok: true; value: ParsedFormula } | { ok: false; why: string } => {
    const machines = owners.get(word);
    if (machines === undefined) return { ok: false, why: `'${word}' is not a declared state of any machine` };
    if (machines.length > 1) {
      return { ok: false, why: `'${word}' is a state of ${machines.join(" and ")}, so the formula is ambiguous` };
    }
    const machine = machines[0];
    assert.ok(machine !== undefined);
    const predicate: Predicate = {
      kind: "atoms", atoms: [{ ref: `${machine}.state`, op: "eq", value: word }],
    };
    return { ok: true, value: proposition(predicate) };
  };

  const unary = (): { ok: true; value: ParsedFormula } | { ok: false; why: string } => {
    const word = peek();
    if (word === undefined) return { ok: false, why: "the formula ends where an operand was expected" };
    at += 1;
    if (word === "(") {
      const inner = expression();
      if (!inner.ok) return inner;
      if (peek() !== ")") return { ok: false, why: "an unclosed group" };
      at += 1;
      return inner;
    }
    const op = TEMPORAL_WORDS[word];
    if (op !== undefined) {
      const operand = unary();
      return operand.ok ? { ok: true, value: op(operand.value) } : operand;
    }
    return atom(word);
  };

  function expression(): { ok: true; value: ParsedFormula } | { ok: false; why: string } {
    let left = unary();
    if (!left.ok) return left;
    for (;;) {
      const word = peek();
      if (word === undefined || word === ")") return left;
      const op = BINARY_WORDS[word];
      if (op === undefined) return { ok: false, why: `'${word}' is not a connective this translation knows` };
      at += 1;
      const right = unary();
      if (!right.ok) return right;
      left = { ok: true, value: op(left.value, right.value) };
    }
  }

  const parsed = expression();
  if (!parsed.ok) return parsed;
  if (at !== tokens.length) return { ok: false, why: `trailing '${tokens.slice(at).join(" ")}'` };
  return parsed;
}

/**
 * Every LTL formula the corpus writes, type-checked against the system it is written about.
 *
 * The AUTHORED surface admits none, and that is derived rather than asserted: neither schema carries
 * a formula field and no behaviour form takes one, so there is no `ltl:` key for an example to use.
 * The formulas that exist therefore live in PROSE — a machine's note, a fixture's reasoning, a
 * file's header — and prose is where a renamed state goes stale silently. So the denominator is the
 * prose occurrences, and each must translate and resolve against the example's own vocabulary.
 *
 * The implication is pinned too: if an authored formula surface appears, prose occurrences stop being
 * the whole denominator and this audit says so instead of continuing to check only half.
 *
 * VACUITY: the occurrences are found by scanning the shipped files, and the type-checker is proven
 * live by the negative control below — a formula naming an undeclared state must refuse. Without
 * that control a translation that produced an unresolvable atom table would pass every formula.
 */
function auditLtlFormulas(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  const schemas = [
    readFileSync("mage-model.schema.json", "utf8"),
    readFileSync("mage-query.schema.json", "utf8"),
  ].join("\n");
  if (/"formula"/.test(schemas)) {
    findings.push(
      "a published schema now carries a `formula` field, so an authored LTL surface exists and the "
      + "prose occurrences below are no longer this obligation's whole denominator");
  }
  for (const ex of c) {
    const scope = buildScope(ex.system);
    for (const [where, text] of proseFormulas(ex.id)) {
      subjects.push(`${where}: ${text}`);
      const translated = translate(ex.system, text);
      if (!translated.ok) {
        findings.push(`${where}: '${text}' does not parse — ${translated.why}`);
        continue;
      }
      const resolved = resolveFormula(scope, translated.value);
      if (!resolved.ok) {
        findings.push(`${where}: '${text}' does not type-check — ${resolved.refusal}`);
      }
    }
  }
  return audit(subjects,
    "the authored surface's absence is read from the two published schemas; the denominator is the "
    + "prose occurrences in the shipped files, and the resolver is proven to refuse by a control",
    findings);
}

// ----------------------------------------------------------------------------------------------
// 9. Every promised witness/counterexample is actually obtainable
// ----------------------------------------------------------------------------------------------

const constraintCount = (e: EvidenceExpectation): number =>
  (e.path === null ? 0 : 1) + e.nodesInclude.length + (e.nodeCount === null ? 0 : 1)
  + (e.minSteps === null ? 0 : 1) + (e.cycleMinSteps === null ? 0 : 1)
  + e.labelsAtLeast.size + e.final.size;

/**
 * Every promise of evidence, and the complement: every piece of evidence the engine hands back.
 *
 * Both directions, because each catches a different thing. A promise the engine cannot keep is the
 * clause's own words. A piece of evidence nobody promised is the coverage hole behind them — the
 * engine produced a witness, the fixture recorded nothing about it, and a shape change would pass
 * every gate. And a promise carrying no discriminating constraint is satisfied by any evidence at
 * all, which is a recorded claim that cannot fail; `test/examples.test.ts`'s comparator walks an
 * empty constraint set and reports no mismatch, as it must.
 *
 * VACUITY: the obtainable set is driven here, so the denominator and the numerator come from two
 * sources — the fixture's promises and the engine's answers — and the degeneracy check makes an
 * empty promise a finding rather than a free pass.
 */
function auditEvidencePromises(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  for (const ex of c) {
    for (const q of ex.fixture.queries) {
      const saved = ex.system.queries.get(q.id);
      if (saved === undefined) continue;
      const res: QueryResult = ex.workspace.query(saved.raw);
      const promise = q.expected.evidence;
      if (promise !== null) {
        subjects.push(`${ex.id}/${q.id}`);
        if (constraintCount(promise) === 0) {
          findings.push(
            `${ex.id}/${q.id}: the promised ${promise.role} constrains nothing, so any evidence `
            + `satisfies it and the record cannot fail`);
        }
        if (res.evidence === null) {
          findings.push(`${ex.id}/${q.id}: a ${promise.role} is promised and the engine returns none`);
          continue;
        }
        if (res.evidence.shape !== promise.shape || res.evidence.role !== promise.role) {
          findings.push(
            `${ex.id}/${q.id}: promised a ${promise.shape} ${promise.role} and got a `
            + `${res.evidence.shape} ${res.evidence.role}`);
        }
        continue;
      }
      if (res.evidence !== null) {
        findings.push(
          `${ex.id}/${q.id}: the engine returns a ${res.evidence.shape} ${res.evidence.role} and the `
          + `fixture promises nothing, so its shape is pinned by nothing`);
      }
    }
    for (const mod of ex.fixture.modifications) {
      if (mod.counterexample === null) continue;
      subjects.push(`${ex.id}/${mod.id}`);
      if (constraintCount(mod.counterexample) === 0) {
        findings.push(`${ex.id}/${mod.id}: the promised counterexample constrains nothing`);
      }
    }
  }
  return audit(subjects,
    "the promises come from the fixture and the obtainable evidence from a live run through the "
    + "workspace, and the two are compared in both directions", findings);
}

// ----------------------------------------------------------------------------------------------
// 10. Every prescribed mutation produces its documented verdict transition
// ----------------------------------------------------------------------------------------------

/**
 * Every prescribed transition, measured on both sides of the mutation.
 *
 * `test/examples.test.ts` drives the transitions and compares them, and its title claims more than
 * its body: "every declared modification changes a recorded answer" is false of three corpus rows
 * that declare `from === to`, and the loop accepts them silently. The sentence IS true of the
 * corpus, for a reason the test does not state — each non-transition is a REPAIR, and the query it
 * leaves unchanged is one a sibling modification in the same example flips. That is the property
 * held here: a modification either moves an answer or re-establishes one a sibling broke. A
 * modification that does neither demonstrates nothing, and a reader cannot tell it from a mutation
 * whose effect was lost.
 *
 * VACUITY: a corpus of none-flipping modifications could satisfy "every non-flip is paired" only if
 * some sibling flips, so the pairing rule is self-witnessing; and the flip count is asserted
 * non-zero so the whole arm cannot hold over a corpus that moves nothing.
 */
function auditMutationTransitions(c: Corpus): Audit {
  const subjects: string[] = [];
  const findings: string[] = [];
  let flips = 0;
  for (const ex of c) {
    const flipped = new Set<string>();
    for (const mod of ex.fixture.modifications) {
      for (const change of mod.changes) if (change.from !== change.to) flipped.add(change.query);
    }
    for (const mod of ex.fixture.modifications) {
      subjects.push(`${ex.id}/${mod.id}`);
      if (mod.changes.length === 0) {
        findings.push(`${ex.id}/${mod.id}: prescribes a mutation and documents no verdict transition`);
        continue;
      }
      for (const change of mod.changes) {
        if (!ex.system.queries.has(change.query)) {
          findings.push(`${ex.id}/${mod.id}: documents a transition for '${change.query}', which is not registered`);
        }
        if (change.from !== change.to) flips += 1;
      }
      const moves = mod.changes.some((change) => change.from !== change.to);
      if (moves) continue;
      const repairs = mod.changes.filter((change) => flipped.has(change.query));
      if (repairs.length === 0) {
        findings.push(
          `${ex.id}/${mod.id}: every documented transition is a non-transition and no sibling `
          + `modification flips any of the queries it names, so this mutation demonstrates nothing — `
          + `and a lost effect would look exactly like this`);
      }
    }
  }
  assert.ok(flips > 0,
    "no modification in the corpus moves a recorded answer, so the pairing rule above is holding "
    + "over a set where nothing is demonstrated");
  return audit(subjects,
    "the flip count is derived from the corpus and asserted non-zero before the pairing rule is "
    + "read, so a corpus that moved nothing could not satisfy it", findings);
}

// ----------------------------------------------------------------------------------------------
// 11. No prose-only "question" may imply capability the kernel cannot perform — THE RULING
// ----------------------------------------------------------------------------------------------

/**
 * RULED: reviewable, not checkable. Graded `asserted` in §13.1's vocabulary.
 *
 * The clause compares a SENTENCE against what the kernel can do. Neither side is addressable by a
 * loop. The sentence's implication lives in natural language — "will it eventually reach X", "with
 * how much margin", "is it currently permitted" each imply a different capability, and two of those
 * three the kernel has — and the kernel's capability is a judgement about what an evaluator's
 * verdict licenses a reader to conclude, which is the thing §13 exists to write down because no
 * gate holds it.
 *
 * The evidence for the ruling is that every mechanical proxy fails in BOTH directions on this
 * corpus:
 *
 *   - A keyword scan for temporal words fires on `event-propagation`'s own question — "can an event
 *     originating at one service eventually cause an event to reach another service?" — where
 *     "eventually" is transitive reachability over a structural relation and correct.
 *   - A scan for units the kernel does not recognize fires eight times on `256 KiB` in a file whose
 *     prose states, in terms, that there is no `KiB` token and that `256 KB` in the memory
 *     dimension's binary table is exactly the part's SRAM.
 *   - And it would have missed every instance of the class this project actually found on 261005:
 *     a doc comment whose stated rationale was false of five shipped examples, a registry entry
 *     denying that a model type was addressable when it was, and two tests pinning a false sentence
 *     as a substring. None of those is a question, none contains a keyword, and all three were
 *     found by reading.
 *
 * So there is no predicate here, and `audit: null` says so in the type. A gate below holds `grade`
 * and `audit` together, so an author who writes a predicate must also drop the `asserted` grade and
 * argue for the stronger word — which is §13.1's earn-discipline applied to this file's own claim
 * about itself. A gate claiming enforcement it lacks is the defect this corpus spent the week
 * removing, and writing one here would have closed the week by committing it.
 *
 * What a reviewer should read, since the clause is theirs: every purposeful model's `question`,
 * every requirement's `statement`, and every saved query's `name`. The first of those is where the
 * class would live, because a model's question is the only prose in the corpus that promises an
 * answer without naming the query that gives it.
 */
const PROSE_CAPABILITY_RULING =
  "reviewable; no predicate. The surface is every purposeful model's `question`, every requirement's "
  + "`statement`, and every saved query's `name`.";

// ----------------------------------------------------------------------------------------------
// The obligation table
// ----------------------------------------------------------------------------------------------

const OBLIGATIONS: readonly Obligation[] = [
  {
    id: "question-registration",
    clause: "every student-visible executable question maps to a registered query",
    grade: "checked", audit: auditQuestionRegistration,
    decidedBy: "this file; the set equality is also held by test/examples.test.ts",
  },
  {
    id: "claim-fields-pinned",
    clause: "every claimed expected result is test-pinned",
    grade: "checked", audit: auditClaimFields,
    decidedBy: "this file holds the disposition of every authored key; the values are compared by "
      + "test/examples.test.ts's comparator",
  },
  {
    id: "pinned-properties-evaluated",
    clause: "every pinned property is evaluated in CI",
    grade: "checked", audit: auditPinnedProperties,
    decidedBy: "this file for the expectations' premises and totals; test/examples.test.ts for each "
      + "requirement's derived status",
  },
  {
    id: "requirement-references",
    clause: "every requirement references an actual query and valid satisfied_when",
    grade: "checked", audit: auditRequirementReferences,
    decidedBy: "this file, through parseRequirement",
  },
  {
    id: "binding-referents",
    clause: "every binding references valid elements",
    grade: "checked", audit: auditBindingReferents,
    decidedBy: "this file for referent validity; test/bindings-census.test.ts for the complementary "
      + "totality over authored cross-type references",
  },
  {
    id: "composition-registration",
    clause: "every composition is registered",
    grade: "checked", audit: auditCompositionRegistration,
    decidedBy: "this file, against the model schema's enum and the COMPOSITIONS registry",
  },
  {
    id: "units-recognized",
    clause: "every unit is recognized",
    grade: "checked", audit: auditUnitsRecognized,
    decidedBy: "this file; the loader's own V28 refuses an unnormalized magnitude at load",
  },
  {
    id: "ltl-formulas",
    clause: "every LTL formula parses and type-checks",
    grade: "checked", audit: auditLtlFormulas,
    decidedBy: "this file, through resolveFormula over the prose occurrences",
  },
  {
    id: "evidence-promises",
    clause: "every promised witness/counterexample is actually obtainable",
    grade: "checked", audit: auditEvidencePromises,
    decidedBy: "this file for the promise shapes and the unpromised complement; "
      + "test/examples.test.ts for each promise's constraints",
  },
  {
    id: "mutation-transitions",
    clause: "every prescribed mutation produces its documented verdict transition",
    grade: "checked", audit: auditMutationTransitions,
    decidedBy: "this file for the pairing rule; test/examples.test.ts drives the transitions",
  },
  {
    id: "prose-capability",
    clause: "No prose-only",
    grade: "asserted", audit: null,
    decidedBy: PROSE_CAPABILITY_RULING,
  },
];

// ----------------------------------------------------------------------------------------------
// The gates
// ----------------------------------------------------------------------------------------------

test("§16's clause list and this file's obligations cover each other exactly", () => {
  // The denominator of the GATE, derived from the specification rather than written down. A twelfth
  // clause fails here instead of silently going unenforced, and an obligation whose clause was
  // reworded fails rather than drifting into enforcing something §16 no longer says.
  const clauses = specClauses();
  const unclaimed = clauses.filter(
    (clause) => !OBLIGATIONS.some((o) => clause.toLowerCase().includes(o.clause.toLowerCase())));
  assert.deepEqual(unclaimed, [],
    `§16 states clauses no obligation claims:\n  ${unclaimed.join("\n  ")}`);

  for (const obligation of OBLIGATIONS) {
    const matches = clauses.filter((c) => c.toLowerCase().includes(obligation.clause.toLowerCase()));
    assert.equal(matches.length, 1,
      `'${obligation.id}' matches ${matches.length} of §16's clauses (${matches.join(" | ")}); the `
      + `join must be one to one or the table is enforcing something the spec does not say`);
  }

  // No count is written: the two sides are compared as SETS, and both grow together.
  assert.equal(OBLIGATIONS.length, clauses.length,
    `§16 states ${clauses.length} clauses and this file declares ${OBLIGATIONS.length} obligations`);
  assert.deepEqual(
    [...new Set(OBLIGATIONS.map((o) => o.id))].length, OBLIGATIONS.length,
    "two obligations share an id, so one of them is reported under the other's name");
});

test("every obligation declares a denominator, and no denominator is empty", async () => {
  // The vacuity gate, applied to this file. Eleven walks over empty collections all pass, so the
  // denominators are read BEFORE any finding is, and an obligation that audits nothing fails here
  // whatever its findings say. `model-coverage`'s own sentence: an empty numerator over an empty
  // denominator is the vacuous pass this project keeps finding.
  const c = await corpus();
  assert.ok(c.length > 0, "the corpus is empty, so every audit below would pass having done nothing");
  for (const obligation of OBLIGATIONS) {
    if (obligation.audit === null) continue;
    const result = obligation.audit(c);
    assert.ok(result.subjects.length > 0,
      `'${obligation.id}': the denominator is EMPTY, so its clean reading is a statement about `
      + `nothing. Witness claimed: ${result.witness}`);
    assert.ok(result.witness.length > 0, `'${obligation.id}': declares no witness for its non-emptiness`);
    // Every subject names the example it came from, so a denominator built from one example cannot
    // stand in for the corpus.
    const examples = new Set(result.subjects.map((s) => s.slice(0, s.indexOf("/"))));
    assert.ok(examples.size > 0, `'${obligation.id}': its subjects name no example`);
  }
});

test("every §16 obligation audits clean over every shipped example", async () => {
  // THE gate. Each audit is a pure function over the loaded corpus, so the negative controls below
  // can drive every finding with a corpus built for it.
  const c = await corpus();
  const findings: string[] = [];
  for (const obligation of OBLIGATIONS) {
    if (obligation.audit === null) continue;
    for (const finding of obligation.audit(c).findings) findings.push(`[${obligation.id}] ${finding}`);
  }
  assert.deepEqual(findings, [],
    `§16 findings over the shipped examples:\n  ${findings.join("\n  ")}`);
});

test("the receipt says what each obligation holds, what decides it, and what it leaves", async () => {
  // The number travels with its limit, which is `model-coverage`'s discipline for the same reason:
  // a coverage figure read without its exclusions is read as a stronger claim than it is.
  const c = await corpus();
  const lines: string[] = [];
  for (const obligation of OBLIGATIONS) {
    if (obligation.audit === null) {
      lines.push(`${obligation.id}: ${obligation.grade} — ${obligation.decidedBy}`);
      continue;
    }
    const result = obligation.audit(c);
    lines.push(
      `${obligation.id}: ${obligation.grade}, ${result.subjects.length} subject(s), `
      + `${result.residues.length} residue(s) — ${obligation.decidedBy}`);
    // A residue is a subject reached and not decided, and it must say which and why. An unexplained
    // residue is a subject dropped from the numerator, which is the one way a coverage gate lies.
    for (const residue of result.residues) {
      assert.ok(residue.subject.length > 0, `'${obligation.id}': a residue names no subject`);
      assert.ok(residue.why.length > 0, `'${obligation.id}': residue '${residue.subject}' states no reason`);
      assert.ok(result.subjects.some((s) => s === residue.subject || s.startsWith(`${residue.subject}:`)
        || residue.subject.startsWith(s)),
        `'${obligation.id}': residue '${residue.subject}' is not one of this audit's own subjects, so `
        + `it is excusing something the denominator never counted`);
    }
  }
  assert.equal(lines.length, OBLIGATIONS.length, "the receipt skipped an obligation");
  for (const line of lines) assert.ok(line.includes("—"), `the receipt line '${line}' names no decider`);
});

test("the reviewable clause is graded `asserted` and carries no predicate", () => {
  // The two halves of the ruling, held against each other. A future author who writes a predicate
  // for the prose clause must also change the grade, and a future author who upgrades the grade must
  // supply the predicate — so neither half can move alone, and this file cannot come to claim
  // enforcement it does not have.
  for (const obligation of OBLIGATIONS) {
    if (obligation.audit === null) {
      assert.equal(obligation.grade, "asserted",
        `'${obligation.id}' has no predicate and claims '${obligation.grade}'. In §13.1's vocabulary `
        + `'checked' means a named gate re-derives the claim and fails on drift; nothing here does`);
      assert.ok(obligation.decidedBy.startsWith("reviewable"),
        `'${obligation.id}' has no predicate and must say so where a reader looks for the control`);
      continue;
    }
    assert.notEqual(obligation.grade, "asserted",
      `'${obligation.id}' carries a predicate and still grades itself 'asserted', which understates `
      + `what it holds and invites someone to add a second check for the same clause`);
  }
  // The surface the reviewer is handed, derived rather than described, so the ruling names a real set.
  assert.ok(PROSE_CAPABILITY_RULING.includes("question"), "the ruling must name the prose surface it leaves");
});

test("the prose-question surface the ruling hands a reviewer is non-empty and derived", async () => {
  // The clause is reviewable, which is a reason to give the reviewer the set — not a reason to leave
  // the set unstated. If a future corpus declared no model question, the ruling above would be a
  // statement about nothing and should be re-opened rather than inherited.
  const c = await corpus();
  const surface: string[] = [];
  for (const ex of c) {
    for (const m of ex.system.models.values()) {
      if (m.purpose.question !== null) surface.push(`${ex.id}/model:${m.id}`);
    }
    for (const m of ex.system.machines.values()) {
      if (m.purpose.question !== null) surface.push(`${ex.id}/machine:${m.id}`);
    }
    for (const r of ex.fixture.requirements) surface.push(`${ex.id}/statement:${r.id}`);
  }
  assert.ok(surface.length > 0,
    "no shipped example declares a purposeful question or a requirement statement, so the eleventh "
    + "clause has no subject and its ruling needs re-deriving rather than inheriting");
  const examples = new Set(surface.map((s) => s.slice(0, s.indexOf("/"))));
  assert.equal(examples.size, c.length,
    `the prose surface covers ${examples.size} of the ${c.length} shipped examples, so a reviewer `
    + `handed it would be reviewing a subset without being told`);
});

// ----------------------------------------------------------------------------------------------
// Negative controls — a check nobody has watched fail is a check nobody knows works
// ----------------------------------------------------------------------------------------------

/**
 * The whole corpus with one example replaced — never a corpus of one.
 *
 * The audits carry corpus-level witnesses: the composition audit refuses a corpus that composes
 * nothing, the mutation audit refuses one that flips nothing. A control that handed over a single
 * example would trip those witnesses instead of the finding it is driving, and would read as the
 * control failing rather than as the control being wrongly built. So a control replaces, and the rest
 * of the corpus stays where it is.
 */
async function replacing(id: ShippedExampleId, patch: (ex: Example) => Example): Promise<Corpus> {
  const base = await corpus();
  const found = base.find((ex) => ex.id === id);
  assert.ok(found !== undefined, `${id} is not a shipped example`);
  return base.map((ex) => (ex.id === id ? patch(found) : ex));
}

/** The corpus with one example's MODEL BYTES mutated and reloaded through the production seam. */
function mutated(id: ShippedExampleId, change: (doc: Raw) => void): Promise<Corpus> {
  return replacing(id, (ex) => {
    const doc = parse(exampleText(id)) as unknown;
    assert.ok(isObj(doc));
    change(doc);
    const workspace = new Workspace(realPorts);
    const loaded = workspace.load(stringify(doc));
    assert.ok(loaded.ok, `${id}: the mutated document did not load`);
    return { ...ex, raw: doc, system: workspace.state.system, workspace };
  });
}

/** The corpus with one example's FIXTURE BYTES mutated. */
function mutatedFixture(id: ShippedExampleId, change: (doc: Raw) => void): Promise<Corpus> {
  return replacing(id, (ex) => {
    const doc = parse(readFileSync(fixturePath(id), "utf8")) as unknown;
    assert.ok(isObj(doc));
    change(doc);
    return { ...ex, fixtureRaw: doc };
  });
}

/** Findings from one audit over a mutated corpus, as a single string the controls match against. */
const findingsOf = (result: Audit): string => result.findings.join("\n");

test("control: a presented label that is not its query's statement is caught", async () => {
  const drifted = await replacing("message-bus", (ex) => ({
    ...ex, presented: ["A question nobody saved"],
  }));
  assert.match(findingsOf(auditQuestionRegistration(drifted)), /carries that label/,
    "a presented question attached to no fixture row must be caught");

  const relabelled = await replacing("message-bus", (ex) => {
    // A SUGGESTED row, derived: only those reach `presented`, so relabelling an unsuggested one
    // would leave the audit with nothing to compare and the control would pass on an absence.
    const first = ex.fixture.queries.find((q) => q.suggested);
    assert.ok(first !== undefined, "message-bus must suggest a query for this control");
    assert.ok(ex.presented.includes(first.label), "and the catalogue must present it");
    return {
      ...ex,
      fixture: {
        ...ex.fixture,
        queries: ex.fixture.queries.map(
          (q) => (q.id === first.id ? { ...q, label: "A narrower claim" } : q)),
      },
      presented: ex.presented.map((l) => (l === first.label ? "A narrower claim" : l)),
    };
  });
  assert.match(findingsOf(auditQuestionRegistration(relabelled)), /Two statements of one question/,
    "a label that is not the saved query's own statement must be caught, because the two are then "
    + "free to drift and nothing decides which the verdict is about");
});

test("control: an authored fixture key with no disposition is caught", async () => {
  const typo = await mutatedFixture("worker-queue", (doc) => {
    const modifications = doc["modifications"];
    assert.ok(Array.isArray(modifications));
    const first = modifications[0];
    assert.ok(isObj(first));
    first["rationalee"] = "a typo'd key, which the reader drops in silence";
  });
  const findings = auditClaimFields(typo).findings;
  assert.ok(findings.some((f) => f.includes("rationalee")),
    `a typo'd authored key must be caught — it is indistinguishable from a claim nobody made. `
    + `Got: ${findings.join(" | ")}`);

  const wrongSystem = await mutatedFixture("worker-queue", (doc) => {
    doc["system"] = "../message-bus/system.mage.yaml";
  });
  assert.ok(auditClaimFields(wrongSystem).findings.some((f) => f.includes("different document")),
    "a fixture naming a system document other than the one the loader reads must be caught");
});

test("control: a hand figure the engine contradicts is caught", async () => {
  const patch = (change: (e: QuantitativeExpectation) => QuantitativeExpectation) =>
    replacing("autonomous-delivery", (ex) => {
      const latency = ex.fixture.quantitativeExpectations.find((e) => e.metric === "latency");
      assert.ok(latency !== undefined, "the capstone must declare a latency expectation for this control");
      return {
        ...ex,
        fixture: {
          ...ex.fixture,
          quantitativeExpectations: ex.fixture.quantitativeExpectations.map(
            (e) => (e.id === latency.id ? change(e) : e)),
        },
      };
    });

  const inflated = await patch((e) => ({ ...e, expected: e.expected + 1 }));
  assert.match(findingsOf(auditPinnedProperties(inflated)), /the hand figure is/,
    "a total the engine does not report must be caught — this is the arm the capstone's fixture "
    + "asked for, and before it the figure was pinned by nothing");

  const wrongCharge = await patch((e) => ({
    ...e, charges: new Map([...e.charges].map(([k, v], i) => [k, i === 0 ? v + 1 : v])),
  }));
  assert.match(findingsOf(auditPinnedProperties(wrongCharge)), /the model declares/,
    "a premise that drifts from the model's own magnitude must be caught");
});

test("control: a requirement naming an unregistered query or a bad ceiling is caught", async () => {
  const dangling = await mutated("worker-queue", (doc) => {
    const requirements = rowOf(doc, "requirements", "worker-queue");
    const first = Object.keys(requirements)[0];
    assert.ok(first !== undefined);
    const declaration = requirements[first];
    assert.ok(isObj(declaration));
    declaration["expressed_as"] = "no-such-query";
  });
  assert.match(findingsOf(auditRequirementReferences(dangling)), /no-such-query/,
    "a requirement naming a query the system does not declare must be caught");

  const shifted = await replacing("document-processing", (ex) => {
    const ceiling = ex.fixture.requirements.find((r) => r.declaredAs !== null && r.limit !== null);
    assert.ok(ceiling !== undefined, "document-processing must declare a ceiling for this control");
    return {
      ...ex,
      fixture: {
        ...ex.fixture,
        requirements: ex.fixture.requirements.map(
          (r) => (r.id === ceiling.id ? { ...r, limit: (ceiling.limit ?? 0) + 1 } : r)),
      },
    };
  });
  assert.match(findingsOf(auditRequirementReferences(shifted)), /Two figures for one ceiling/,
    "a limit that is not the declared quantity's magnitude must be caught");
});

test("control: a binding referent that resolves nowhere is caught", async () => {
  const badMachine = await mutated("worker-queue", (doc) => {
    const machines = rowOf(doc, "machines", "worker-queue");
    const first = Object.keys(machines)[0];
    assert.ok(first !== undefined);
    const machine = machines[first];
    assert.ok(isObj(machine));
    machine["entity"] = "no-such-entity";
  });
  assert.match(findingsOf(auditBindingReferents(badMachine)), /no-such-entity/,
    "a machine describing an entity the system does not declare must be caught");

  const badState = await mutated("document-processing", (doc) => {
    const entities = rowOf(doc, "entities", "document-processing");
    for (const entity of Object.values(entities)) {
      if (!isObj(entity)) continue;
      const props = entity["properties"];
      if (!isObj(props) || props["executes_in_state"] === undefined) continue;
      props["executes_in_state"] = "no_such_state";
      return;
    }
    assert.fail("document-processing authors no executes_in_state, so this control has no subject");
  });
  assert.match(findingsOf(auditBindingReferents(badState)), /no_such_state/,
    "an executes_in_state naming no declared state must be caught — this is the direction the "
    + "binding census cannot see, because it derives a reference BY resolving it");
});

test("control: an unregistered path composition is caught, and the loader hides it", async () => {
  // Two assertions, and the second is the reason the first reads the authored bytes. The loader
  // coerces an unrecognized value to the restrictive arm and raises nothing, so a check reading
  // `pathComposition` would be unable to fail.
  const typo = await mutated("worker-queue", (doc) => {
    const relationTypes = rowOf(doc, "relation-types", "worker-queue");
    const first = Object.keys(relationTypes)[0];
    assert.ok(first !== undefined);
    const relationType = relationTypes[first];
    assert.ok(isObj(relationType));
    relationType["composition"] = { path: "allow" };
  });
  assert.match(findingsOf(auditCompositionRegistration(typo)), /"allow"/,
    "a path composition outside the schema's enum must be caught");

  const entry = typo.find((ex) => ex.id === "worker-queue");
  assert.ok(entry !== undefined);
  for (const relationType of entry.system.relationTypes.values()) {
    assert.ok(relationType.pathComposition === "allowed" || relationType.pathComposition === "forbidden",
      "the canonical field is two-valued, which is why it cannot carry the violation");
  }
  assert.deepEqual(entry.workspace.state.findings, [],
    "MEASURED, and the reason this audit reads the authored bytes: the loader admits an "
    + "unrecognized `composition.path` with NO finding, coercing it to the restrictive arm. Every "
    + "multi-hop question over that relation silently becomes unlicensed. If this assertion starts "
    + "failing the loader has been fixed and this audit can read the canonical field instead");
});

test("control: an unrecognized or absent unit is caught", async () => {
  const foreign = await mutated("embedded-sensor-node", (doc) => {
    const quantities = rowOf(doc, "quantities", "embedded-sensor-node");
    const first = Object.keys(quantities)[0];
    assert.ok(first !== undefined);
    const quantity = quantities[first];
    assert.ok(isObj(quantity));
    quantity["value"] = "64 ms";
  });
  assert.match(findingsOf(auditUnitsRecognized(foreign)), /is not a memory unit|did not reach base units/,
    "a duration unit on a memory quantity must be caught — it normalizes cleanly against the wrong "
    + "table, which is the whole reason the unit is checked against its own dimension");

  const bare = await mutated("embedded-sensor-node", (doc) => {
    const quantities = rowOf(doc, "quantities", "embedded-sensor-node");
    const first = Object.keys(quantities)[0];
    assert.ok(first !== undefined);
    const quantity = quantities[first];
    assert.ok(isObj(quantity));
    quantity["value"] = "64";
  });
  // The loader refuses a unit-less literal on a united dimension before normalization, so the fault
  // arm is what fires and the `unit === null` arm below it is defence in depth — reachable only if
  // the loader ever starts normalizing one. Both are asserted against here, with the arm that
  // actually catches it named, rather than one regex that would pass whichever fired.
  assert.match(findingsOf(auditUnitsRecognized(bare)), /did not reach base units \(unit-missing\)/,
    "a magnitude with no unit on a dimension that has units must be caught");
});

test("control: a prose formula naming an undeclared state does not type-check", async () => {
  // The translator and the kernel's resolver, both driven. Without the first assertion a translation
  // that produced an empty atom table would resolve happily and pass every formula in the corpus.
  const c = await corpus();
  const ex = c.find((x) => x.id === "transaction-workspace");
  assert.ok(ex !== undefined);
  const scope = buildScope(ex.system);

  const shipped = proseFormulas(ex.id);
  assert.ok(shipped.length > 0,
    "transaction-workspace writes no formula in prose, so this control has no subject and the "
    + "obligation's denominator has moved");
  const sample = shipped[0];
  assert.ok(sample !== undefined);
  const good = translate(ex.system, sample[1]);
  assert.ok(good.ok, `the shipped formula must translate: ${good.ok ? "" : good.why}`);
  assert.ok(resolveFormula(scope, good.value).ok, "and must type-check against its own machine");
  assert.ok(good.value.atoms.size > 0,
    "the translation produced NO atoms, so `resolveFormula` had nothing to resolve and every "
    + "formula would type-check — the vacuity this control exists to rule out");

  const renamed = translate(ex.system, "G(proposed -> F(ghost))");
  assert.ok(!renamed.ok, "a formula naming an undeclared state must refuse at translation");

  const undeclared: ParsedFormula = proposition({
    kind: "atoms", atoms: [{ ref: "transaction-lifecycle.state", op: "eq", value: "ghost" }],
  });
  const resolved = resolveFormula(scope, undeclared);
  assert.ok(!resolved.ok, "and the kernel's own resolver must refuse it too");
  assert.match(resolved.refusal, /not a declared state/, "naming the vocabulary it checked against");
});

test("control: the LTL TEXT surface cannot name a hyphenated machine — measured, not assumed", async () => {
  // Why the audit routes through the object grammar. `resolveRef` resolves a hyphenated reference
  // and every behaviour query in the corpus uses one; the formula tokenizer's reference pattern does
  // not admit `-`, so the student-facing text surface refuses a correct property about a declared
  // machine with a GRAMMAR error. Out of this gate's scope to fix and recorded here so the finding
  // travels with the evidence. If this assertion starts failing the tokenizer has been widened and
  // the audit can take the text route.
  const { compileFormula } = await import("../src/engine/ltl.ts");
  const c = await corpus();
  const ex = c.find((x) => x.id === "transaction-workspace");
  assert.ok(ex !== undefined);
  const scope = buildScope(ex.system);

  const hyphenated = [...ex.system.machines.keys()].filter((id) => id.includes("-"));
  assert.ok(hyphenated.length > 0, "this control needs a hyphenated machine and the example has none");
  const machine = hyphenated[0];
  assert.ok(machine !== undefined);
  const state = ex.system.machines.get(machine)?.states[0];
  assert.ok(state !== undefined);

  assert.ok(resolveFormula(scope, proposition({
    kind: "atoms", atoms: [{ ref: `${machine}.state`, op: "eq", value: state }],
  })).ok, "the reference resolves through the kernel's resolver, so the id is not the problem");

  const viaText = compileFormula(scope, `always (${machine}.state: ${state})`);
  assert.ok(!viaText.ok,
    "if the text surface now accepts a hyphenated machine, the finding has been fixed — delete this "
    + "control and let the audit compile through the text grammar");
  assert.match(viaText.refusal, /not part of the formula grammar/,
    "and the refusal is a GRAMMAR complaint about the model's own identifier spelling, which is what "
    + "makes it a defect rather than a declined capability");
});

test("control: a degenerate or unkept promise of evidence is caught", async () => {
  const patch = (rewrite: (e: EvidenceExpectation) => EvidenceExpectation | null) =>
    replacing("worker-queue", (ex) => {
      const promised = ex.fixture.queries.find((q) => q.expected.evidence !== null);
      assert.ok(promised !== undefined, "worker-queue must promise evidence for this control");
      const shape = promised.expected.evidence;
      assert.ok(shape !== null);
      return {
        ...ex,
        fixture: {
          ...ex.fixture,
          queries: ex.fixture.queries.map((q) => (q.id === promised.id
            ? { ...q, expected: { ...q.expected, evidence: rewrite(shape) } }
            : q)),
        },
      };
    });

  const emptied = await patch((e) => ({
    shape: e.shape, role: e.role,
    path: null, nodesInclude: [], nodeCount: null, minSteps: null, cycleMinSteps: null,
    labelsAtLeast: new Map<string, number>(), final: new Map(),
  }));
  assert.match(findingsOf(auditEvidencePromises(emptied)), /constrains nothing/,
    "a promise with no discriminating constraint must be caught: any evidence satisfies it, so the "
    + "record cannot fail and the sibling comparator reports no mismatch");

  const dropped = await patch(() => null);
  assert.match(findingsOf(auditEvidencePromises(dropped)), /pinned by nothing/,
    "evidence the engine returns and the fixture no longer promises must be caught");
});

test("control: a mutation that demonstrates nothing is caught", async () => {
  const c = await corpus();
  // EVERY example reduced to non-transitions, not one: the witness is corpus-level, so flattening a
  // single example would leave the rest of the corpus flipping and the control would prove nothing.
  const inert: Corpus = c.map((ex) => ({
    ...ex,
    fixture: {
      ...ex.fixture,
      modifications: ex.fixture.modifications.map((m) => ({
        ...m, changes: m.changes.map((change) => ({ ...change, to: change.from })),
      })),
    },
  }));
  assert.throws(() => auditMutationTransitions(inert),
    /no modification in the corpus moves a recorded answer/,
    "a corpus where nothing moves must fail on the witness, before any finding is read — otherwise "
    + "the pairing rule holds over a set that demonstrates nothing");

  // One unpaired non-transition against a corpus that still flips elsewhere. The query it names is
  // DERIVED: a registered query no modification flips, so the row cannot accidentally be a repair.
  const unpaired = await replacing("worker-queue", (ex) => {
    const flipped = new Set(ex.fixture.modifications.flatMap(
      (m) => m.changes.filter((ch) => ch.from !== ch.to).map((ch) => ch.query)));
    const quiet = [...ex.system.queries.keys()].find((id) => !flipped.has(id));
    assert.ok(quiet !== undefined, "this control needs a registered query no modification flips");
    const flipping = ex.fixture.modifications.find((m) => m.changes.some((ch) => ch.from !== ch.to));
    assert.ok(flipping !== undefined, "this control needs a modification that flips an answer");
    return {
      ...ex,
      fixture: {
        ...ex.fixture,
        modifications: [
          ...ex.fixture.modifications,
          { ...flipping, id: "demonstrates-nothing", changes: [{ query: quiet, from: "holds", to: "holds" }] },
        ],
      },
    };
  });
  assert.match(findingsOf(auditMutationTransitions(unpaired)), /demonstrates nothing/,
    "an unpaired non-transition must be caught");
});

test("control: the obligation table cannot pass by auditing a corpus of nothing", async () => {
  // The whole-file vacuity control. Every audit is run over an empty corpus and must yield an empty
  // denominator, so the non-emptiness gate above is the thing standing between a green run and a
  // statement about nothing — rather than each audit happening to have a subject today.
  const c = await corpus();
  assert.ok(c.length > 0);
  for (const obligation of OBLIGATIONS) {
    if (obligation.audit === null) continue;
    let subjects = -1;
    try {
      subjects = obligation.audit([]).subjects.length;
    } catch {
      // An audit whose own witness assertion fires on an empty corpus is stronger than one that
      // returns an empty denominator, and both are caught by the gate above.
      continue;
    }
    assert.equal(subjects, 0,
      `'${obligation.id}' derives ${subjects} subject(s) from an EMPTY corpus, so its denominator is `
      + `not coming from the examples and the non-emptiness gate cannot speak for it`);
  }
});

test("the verification of a shipped requirement still reaches a verdict through this gate's reader", async () => {
  // A crossing check on the corpus loader itself. The audits read `ex.system` and `ex.fixture`, and
  // a loader that quietly produced an empty system would make several of them pass by having no
  // subject. So one requirement is verified end to end here, through the production join, and its
  // recorded status is required to come back.
  const c = await corpus();
  let verified = 0;
  for (const ex of c) {
    const derived = verifySystemRequirements(ex.system);
    for (const req of ex.fixture.requirements) {
      const live = derived.get(req.id);
      if (live === undefined) continue;
      verified += 1;
      assert.equal(live.status, req.status,
        `${ex.id}/${req.id}: the fixture records '${req.status}' and the engine derives `
        + `'${live.status}'. The disagreement is the finding — do not adjust the fixture`);
    }
  }
  assert.ok(verified > 0,
    "no shipped requirement reached a verdict through this file's corpus loader, so the audits above "
    + "are reading a system the engine cannot answer questions about");
  // And the saved queries run, which is what every evidence and transition subject rests on.
  for (const ex of c) {
    const answers = runSavedQueries(ex.system);
    assert.equal(answers.size, ex.system.queries.size,
      `${ex.id}: ${answers.size} of ${ex.system.queries.size} saved queries answered`);
    for (const [id, answer] of answers) {
      assert.ok(evaluationOf(answer.result) !== null, `${ex.id}/${id}: produced no evaluation`);
    }
  }
});
