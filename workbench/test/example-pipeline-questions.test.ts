// Example 4's execution-cost questions, measured — and the one place the cross-domain composition
// is held as a claim about the KERNEL rather than about a figure.
//
// `Examples and Semantic Completion` §12.3. `test/examples.test.ts` already runs every saved query
// and compares the outcome, the coverage and the evidence, so none of that is repeated here. What
// it does NOT compare is the `magnitude`, which is the whole answer to a quantitative question, and
// what no gate stated at all is the DIVISION OF LABOUR the composition rests on. Both live here.
//
// ## Three claims, and why each is a claim rather than a number
//
//   1. **The figures agree with the hand-derived oracle.** Every expected magnitude below is read
//      out of `expected-results.yaml`'s `quantitative_expectations` or recomputed from the model's
//      own declared charges — never written as a literal. A literal here would be a third copy of
//      725 and 2,750, free to drift from the two that already exist on purpose.
//
//   2. **Behaviour's whole contribution to the composed question is one key.** The registry says
//      the composition is licensed by `target`, so the saved question that uses it must carry
//      nothing else behavioural, and the same question with `target` dropped must still be a
//      well-formed quantitative question. That pair is what makes "the maximum latency among
//      successful executions" ONE question rather than two, and it is checked rather than asserted
//      in a comment.
//
//   3. **Selecting changes the answer, and between these two selections it does not.** §12.1 asks
//      the example to teach the difference between all executions and successful ones. Measured,
//      the two agree at 2,750 ms, and the reason is structural: `publish` and `failed` are both
//      zero-charge edges out of `validating`, so the execution that exhausts its retries and the
//      one that publishes on the last retry visit the same entities the same number of times. The
//      honest demonstration is the SPREAD across the lifecycle's states, where the figure does
//      move — and it is derived from the model's charges, so it cannot read as a snapshot.
//
// ## What is reported rather than pinned
//
// `mage-query.schema.json` declares `quantityQuery` closed — `additionalProperties: false`, and no
// property in it names an aggregation, because the §29 refinement's `max|min|named` selector was
// rejected. `parseQuantityQuery` does not enforce that closure: a query carrying `aggregate: min`
// is answered with the MAXIMUM and nothing says the key did nothing. The declared contract is
// asserted below; the parser's silence about an unknown key is a finding against the engine and is
// deliberately NOT pinned here, because a test that locks today's behaviour in place would make the
// fix look like a regression.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COMPOSITIONS, modelTypeForQueryKind } from "../src/engine/model-types.ts";
import type { CanonQuantity, CanonicalSystem, QueryResult } from "../src/ir/types.ts";
import { DIMENSIONS } from "../src/ir/types.ts";
import { loadExample } from "../scripts/gen-example-coverage.ts";
import type { LoadedExample } from "../scripts/gen-example-coverage.ts";

const EXAMPLE = "document-processing";
const MACHINE = "document-lifecycle";

const pipeline = (): LoadedExample => loadExample(EXAMPLE);

/** The saved query, as the author wrote it. Fetched loudly: a renamed id must fail here. */
function saved(system: CanonicalSystem, id: string): unknown {
  const q = system.queries.get(id);
  assert.ok(q !== undefined, `${EXAMPLE} declares no saved query '${id}'`);
  return q.raw;
}

/** The hand-derived figure behind a question, in the dimension's base unit. */
function oracle(ex: LoadedExample, id: string): number {
  const e = ex.fixture.quantitativeExpectations.find((x) => x.id === id);
  assert.ok(e !== undefined, `${EXAMPLE} declares no quantitative expectation '${id}'`);
  assert.ok(e.handDerived, `${id} must be the hand-derived oracle, or it is checking the product against itself`);
  return e.expected;
}

/** One declared charge, normalized. The model is the source; nothing here restates a magnitude. */
function charge(system: CanonicalSystem, quantityId: string): number {
  const q: CanonQuantity | undefined = system.quantities.get(quantityId);
  assert.ok(q !== undefined, `${EXAMPLE} declares no quantity '${quantityId}'`);
  const v = q.value;
  assert.ok(v.kind === "point" || v.kind === "range", `${quantityId} carries no magnitude`);
  const m = v.kind === "point" ? v.magnitude : v.high;
  assert.ok(m.base !== null, `${quantityId}: '${m.raw}' did not reach base units`);
  return m.base;
}

/** The worst-case latency over the executions reaching a lifecycle state. */
const latencyReaching = (ex: LoadedExample, state: string): QueryResult =>
  ex.workspace.query({
    kind: "quantity", quantifier: "exists",
    quantity: { metric: "latency", target: { [`${MACHINE}.state`]: state } },
  });

const magnitudeOf = (where: string, res: QueryResult): number => {
  assert.equal(res.outcome, "holds", `${where}: ${res.outcome} — ${res.refusal ?? "no refusal"}`);
  assert.ok(res.magnitude !== null, `${where}: a measurement must carry a magnitude`);
  assert.equal(res.magnitude.dimension, "duration", `${where}: the dimension travels with the number`);
  assert.equal(res.magnitude.unit, DIMENSIONS.duration.base, `${where}: the figure is in base units`);
  return res.magnitude.value;
};

// ----------------------------------------------------------------------------------------------
// 1. The figures
// ----------------------------------------------------------------------------------------------

test("§12.3 Q1: the saved nominal-latency question computes the hand-derived retry-free figure", () => {
  const ex = pipeline();
  const res = ex.workspace.query(saved(ex.workspace.state.system, "nominal-successful-latency"));
  assert.equal(magnitudeOf("Q1", res), oracle(ex, "retry-free-latency"),
    "the product and the hand derivation disagree — the disagreement is the finding, not the fixture");
  // And the figure is about the execution the question NAMES: a worst case whose witness stopped
  // short of the selection would be a number about a prefix.
  const last = res.evidence?.steps.at(-1);
  assert.equal(last?.to.control.get(MACHINE), "published");
  assert.equal(last?.to.values.get(`${MACHINE}.retry_count`), 0,
    "retry_count at publication is what identifies the nominal execution, not the trace length");
});

test("§12.3 Q3 and Q4: both saved questions compute the hand-derived maximum", () => {
  const ex = pipeline();
  const system = ex.workspace.state.system;
  const expected = oracle(ex, "max-publishing-latency");

  const any = ex.workspace.query(saved(system, "max-latency-of-any-execution"));
  const successful = ex.workspace.query(saved(system, "max-latency-among-successful-executions"));
  assert.equal(magnitudeOf("Q3", any), expected);
  assert.equal(magnitudeOf("Q4", successful), expected);

  // Q4's witness must END at the selection, which is what distinguishes a selected maximum from an
  // unselected one that happens to agree with it.
  const last = successful.evidence?.steps.at(-1);
  assert.equal(last?.to.control.get(MACHINE), "published");
  assert.equal(last?.to.values.get(`${MACHINE}.retry_count`), 3);
});

test("§12.3 Q5 and Q6: the two-second ceiling is refuted, and the refutation names the execution", () => {
  const ex = pipeline();
  const system = ex.workspace.state.system;
  const res = ex.workspace.query(saved(system, "successful-executions-within-two-seconds"));

  assert.equal(res.outcome, "refuted");
  assert.equal(res.coverage.kind, "exhaustive");
  // The ceiling is declared ONCE, in the model, and the query names it. The comparison the verdict
  // rests on is therefore re-derivable here from the two declarations and nothing else.
  const ceiling = charge(system, "successful-latency-requirement");
  const observed = res.magnitude?.value;
  assert.equal(observed, oracle(ex, "max-publishing-latency"));
  assert.ok(observed !== undefined && observed > ceiling,
    `the verdict refutes a ${ceiling} ms ceiling, so the observed ${String(observed)} ms must exceed it`);

  // Q6 is this evidence. A refuted universal owes a counterexample, and the counterexample is the
  // execution a reader asked to be shown.
  assert.equal(res.evidence?.role, "counterexample");
  assert.equal(res.evidence?.shape, "trace");
  const retries = res.evidence?.steps.filter((s) => s.label === "retry").length ?? 0;
  assert.equal(retries, 3, "the worst publishing execution is the one that used every permitted retry");
});

// ----------------------------------------------------------------------------------------------
// 2. The composition, as a claim about the kernel
// ----------------------------------------------------------------------------------------------

test("Q4 is the registered composition, and behaviour's whole contribution is the target key", () => {
  const ex = pipeline();
  const system = ex.workspace.state.system;

  // The registry's own row, found by the dialects it joins rather than by its name.
  const behavioural = modelTypeForQueryKind("behavior");
  const quantitative = modelTypeForQueryKind("quantity");
  const composition = COMPOSITIONS.find((c) => c.from === behavioural.id && c.to === quantitative.id);
  assert.ok(composition !== undefined,
    "no registered composition runs from the behavioural dialect to the quantitative one, so Q4 is unlicensed");
  assert.equal(composition.restricts, "execution",
    "a composition that narrowed something other than the execution domain would not be this question");
  // The licensing arm matters as much as the key: a composition licensed `by-construction` would
  // be one no declaration gates, and this one is gated by a key an author writes.
  assert.equal(composition.licensing.kind, "declared",
    "a composition nobody declares is not one an author can reach for");
  assert.match(composition.licensing.by.role, /target/,
    "the registry must name the key a behavioural result enters through, or this test cannot find it");

  // The saved question, read as a document. `quantity.target` is the only behavioural key in it:
  // everything else names the metric, and the metric is the quantitative dialect's own.
  const raw = saved(system, "max-latency-among-successful-executions") as {
    readonly quantity: Readonly<Record<string, unknown>>;
  };
  assert.deepEqual(Object.keys(raw.quantity).sort(), ["metric", "target"],
    "Q4 must say which executions and which metric, and nothing else — an aggregation key here " +
    "would be the selector the quantification design rejected");
  const target = raw.quantity["target"] as Readonly<Record<string, unknown>>;
  assert.deepEqual(Object.keys(target), [`${MACHINE}.state`],
    "the selection must be a predicate over the behavioural model, which is what makes it behavioural");
  assert.ok(system.machines.has(MACHINE), `the selection names machine '${MACHINE}', which must exist`);

  // And the same question with the selection dropped is still a question. That is the composition's
  // claim stated negatively: behaviour narrows a domain and supplies nothing the question needs to
  // be well-formed.
  const plain = saved(system, "max-latency-of-any-execution") as {
    readonly quantity: Readonly<Record<string, unknown>>;
  };
  assert.deepEqual(Object.keys(plain.quantity), ["metric"]);
  assert.equal(plain.quantity["metric"], raw.quantity["metric"],
    "the pair differs in the selection alone, or it is not a before-and-after of one question");
  assert.equal(magnitudeOf("unselected", ex.workspace.query(plain)),
    magnitudeOf("selected", ex.workspace.query(raw)),
    "measured: these two agree in this model — see the spread test for why that is not the selection failing");
});

test("the query surface declares no aggregation selector, and the declaration is closed", () => {
  // Asserted against the published schema rather than against the parser, which is the honest
  // split: the schema is where the closure is DECLARED. See this file's header for the parser.
  const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as {
    readonly $defs: { readonly quantityQuery: { readonly additionalProperties?: unknown;
      readonly properties: Readonly<Record<string, unknown>> } };
  };
  const q = schema.$defs.quantityQuery;
  assert.equal(q.additionalProperties, false,
    "an open quantity query would let an aggregation key ride in beside the metric");
  for (const word of ["aggregate", "aggregation", "bound", "end", "extremum", "min", "max", "reduce"]) {
    assert.ok(!(word in q.properties),
      `'${word}' is a property of the quantity query, so a caller can choose the aggregation`);
  }
  // Positive control: the two keys the composition and the ceiling need ARE there, so the loop
  // above is not passing because the property table is empty.
  for (const word of ["metric", "target", "within"]) {
    assert.ok(word in q.properties, `'${word}' must be declared, or the questions above are unaskable`);
  }
});

// ----------------------------------------------------------------------------------------------
// 3. What the selection does, measured across the lifecycle
// ----------------------------------------------------------------------------------------------

test("the selection moves the figure, and the two §12.1 asks about are the pair where it does not", () => {
  const ex = pipeline();
  const system = ex.workspace.state.system;
  const max = oracle(ex, "max-publishing-latency");

  // Early in the lifecycle the selection bites hard: the executions that reach `parsing` have paid
  // exactly one parse and nothing else, which is the model's own declared charge.
  assert.equal(magnitudeOf("parsing", latencyReaching(ex, "parsing")), charge(system, "parse-latency"),
    "an execution selected at parsing has paid one parse — if this is the global maximum the " +
    "selection is doing nothing at all");

  // One state earlier than the end, the figure is the maximum less the last validation: the
  // worst execution reaching `remediating` has not yet entered `validating` a fourth time.
  assert.equal(magnitudeOf("remediating", latencyReaching(ex, "remediating")),
    max - charge(system, "validate-latency"));

  // And the three states at the end agree, because the edges into them charge nothing. `waiting`
  // with the retries spent is the FAILURE terminal, and it costs exactly what publishing costs —
  // which is the structural reason Q3 and Q4 coincide.
  for (const state of ["validating", "waiting", "published"]) {
    assert.equal(magnitudeOf(state, latencyReaching(ex, state)), max,
      `${state}: the edges into the terminal states charge nothing, so all three sit at the maximum`);
  }

  // Stated directly, because it is the sentence the example's header makes and a reader should be
  // able to see it checked: the FAILURE terminal costs the same as publishing. Selecting the
  // executions that spend every retry and never publish returns the same magnitude, and its witness
  // ends in `waiting` rather than in `published`.
  const exhausted = ex.workspace.query({
    kind: "quantity", quantifier: "exists",
    quantity: {
      metric: "latency",
      target: {
        "all-of": [
          { [`${MACHINE}.state`]: "waiting" },
          { [`${MACHINE}.retries_exhausted`]: true },
        ],
      },
    },
  });
  assert.equal(magnitudeOf("retries exhausted", exhausted), max,
    "the failure terminal and the success terminal cost the same, which is why the two §12.1 " +
    "questions agree; a model whose failure path charged differently would separate them");
  assert.equal(exhausted.evidence?.steps.at(-1)?.to.control.get(MACHINE), "waiting",
    "the witness must be the execution that never published, or this is measuring the same trace twice");
});
