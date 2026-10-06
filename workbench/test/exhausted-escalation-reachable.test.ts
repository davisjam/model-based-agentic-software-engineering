// `resolveExhausted`'s input must be OBTAINABLE FROM THE PUBLISHED SURFACE — the handle's producer
// named where the handle is described, and the named route actually yielding one.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// The 261006 lab-solver run — a browser-driving agent holding only `describe()` — read "the
// escalation handle comes off an exhausted answer and is obtainable nowhere else", tried every
// producer it could construct (ask with an authored `limit`, query, explore with a tiny limit —
// all of which answer `inconclusive` and carry no handle), never obtained one, and reported the
// escalation path unreachable. The route worked the whole time (`test/services.test.ts` drives it
// end to end); the one producer — `debug.sparql`'s `exhausted` arm — was simply named nowhere an
// agent could read. A published handle whose producer is unnamed is an affordance only its author
// can use.
//
// ## What is held
//
//  1. THE PRODUCER IS POINTED AT, AND THE POINTER RESOLVES. The published parameter description
//     for `escalation` directs the reader to `describe().outsideSemanticInterface` — it cannot
//     name the console's site directly, because MQ-I4 (test/escape-hatch.test.ts) fences the
//     semantic interface from advertising a hatch site anywhere but that one field — and the
//     hatch entry it points at carries the producing condition. This is the assertion that would
//     have failed before the fix: the old sentence pointed at nothing.
//  2. THE NAMED ROUTE YIELDS THE HANDLE. Following the named producer on the live API — not on
//     engine internals — with a deliberately small budget produces an `exhausted` answer carrying
//     a non-null `escalation`, and `analysis.resolveExhausted` accepts it and answers.
//  3. THE DECOYS STAY DECOYS. The route the agent actually tried (a behavioural query with a tiny
//     `limit`) answers `inconclusive` and carries no escalation field — pinned so the published
//     "only producer" sentence cannot go stale in silence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createAgentApi } from "../src/app/agent-api.ts";
import type { MageAgentApi } from "../src/app/agent-api.ts";
import { Workspace } from "../src/app/services.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import type { AnalysisPort } from "../src/app/ports.ts";
import { entityIri, modelGraphIri, relationTypeIri } from "../src/rdf/iri.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";
import { onThread } from "./worker-fixtures.ts";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));
const docable = (): string => readFileSync("examples/docable.mage.yaml", "utf8");

/** A licensed one-or-more closure a 2-step budget cannot finish — the deliberate exhaustion. */
const COMPOSING_SELECT =
  `PREFIX ent: <${entityIri("docable", "").value}>\n` +
  `PREFIX rt: <${relationTypeIri("docable", "").value}>\n` +
  `SELECT ?x WHERE { GRAPH <${modelGraphIri("docable", "service-flow").value}> { ent:api rt:may_invoke+ ?x } }`;

function apiOn(analysis?: AnalysisPort): { api: MageAgentApi; ws: Workspace } {
  const ws = new Workspace(analysis === undefined ? realPorts : { ...realPorts, analysis });
  const out = ws.load(docable());
  assert.ok(out.ok, "the worked example must load");
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  return { api, ws };
}

test("the escalation parameter points at its producer, and the pointer resolves", () => {
  const { api } = apiOn();
  const description = api.describe();
  const resolveCall = description.operations
    .flatMap((o) => o.calls)
    .find((c) => c.at === "window.mage.analysis.resolveExhausted");
  assert.ok(resolveCall !== undefined, "the operation must be published at all");
  const escalation = resolveCall.parameters.find((p) => p.name === "escalation");
  assert.ok(escalation !== undefined, "and must declare what to pass it");

  // The pointer: the one field of the publication an agent is told to read next. It cannot be the
  // console's site itself — MQ-I4 fences describe() from naming a hatch site anywhere else — so
  // the followable form is the FIELD NAME, and the hatch entry does the rest (next test).
  assert.match(escalation.summary, /outsideSemanticInterface/,
    "a handle described as 'obtainable nowhere else' must SAY where the somewhere is declared — " +
    "the 261006 lab run proved an agent cannot find the producer from the phrase alone");

  // And the pointer lands somewhere real: the publication declares at least one fenced surface,
  // so the field the summary names is not an empty list.
  assert.ok(description.outsideSemanticInterface.length > 0,
    "the summary points at outsideSemanticInterface, which must declare the producer");
});

test("the hatch's own entry declares the exhausted arm and the handle it carries", () => {
  // The other direction of the join: an agent reading the fence learns what comes off it. Without
  // this, the console's entry says only why it is fenced, and the handle's existence is a fact an
  // agent meets by accident.
  const { api } = apiOn();
  const hatch = api.describe().outsideSemanticInterface
    .find((h) => h.at === "window.mage.debug.sparql");
  assert.ok(hatch !== undefined, "the console is a declared hatch");
  assert.match(hatch.reason, /exhausted/,
    "the hatch must say its budget-spent arm answers `exhausted`");
  assert.match(hatch.reason, /escalation/,
    "and that the exhausted answer carries the escalation handle");
  assert.match(hatch.reason, /resolveExhausted/,
    "and name the consumer, so the two halves of the route reference each other");
});

test("following the named route yields the handle, and resolveExhausted accepts it", async () => {
  const thread = onThread();
  try {
    const { api } = apiOn(thread.client);
    // The named route: debug.sparql with a small budget, exactly as the description instructs.
    const spent = api.debug.sparql(COMPOSING_SELECT, 2);
    assert.equal(spent.answer.kind, "exhausted", "a 2-step budget cannot finish a one-or-more closure");
    assert.ok(spent.escalation !== null,
      "the exhausted answer must carry the escalation handle the description promises");
    if (spent.escalation === null) return;

    const out = await api.analysis.resolveExhausted(spent.escalation);
    assert.equal(out.status, "ok-evaluation",
      `the Worker must answer what the page's budget could not — got ${out.status}` +
      `${out.status === "failed" ? `: ${out.messages.join("; ")}` : ""}`);
  } finally {
    thread.stop();
  }
});

test("the decoy producers stay decoys: a limit-hit behavioural answer carries no escalation", () => {
  // What the lab-solver actually tried. This must keep answering WITHOUT an escalation field — if
  // it starts producing handles, the published "only producer" sentence goes stale and this is
  // the test that says so.
  const { api } = apiOn();
  const bounded = api.query({
    kind: "behavior", quantifier: "exists",
    behavior: { form: "reach", target: { "document.state": "published" }, limit: 2 },
  });
  assert.equal(bounded.outcome, "inconclusive", "a 2-configuration walk settles nothing (V22)");
  assert.ok(!("escalation" in bounded),
    "and an inconclusive QueryResult carries no escalation handle — the handle's producer is the " +
    "SPARQL console's exhausted arm, nowhere else, as the published description now says");
});
