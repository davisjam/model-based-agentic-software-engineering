// `interpretedAs` must carry EVERY clause the evaluator reads — a sentence that silently drops the
// `where` join describes a different question than the one answered.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// The 261006 lab-solver run read the message-bus breach query's `interpretedAs` as "Is there a
// direct 'subscribes' relation from any entity to any entity?" — while the query's whole point,
// `compare: source.permits < target.carries`, was absent from the sentence. V21 makes the sentence
// the question actually evaluated, and FR-A11Y-2 makes it the non-visual twin of the highlighted
// answer; an agent trusting it (as both invite) would misread the breach witness as mere
// subscription. The agent caught it only by reading the saved query's definition out of the export
// — exactly the fallback `interpretedAs` exists to remove.
//
// ## What is held
//
//  1. THE CORPUS'S OWN JOINS — every shipped saved query that declares a `where` clause gets a
//     sentence naming every compared member and every constrained property. Swept from the
//     examples' authored bytes, so a new shipped query with a join is covered the day it lands,
//     and the sweep is pinned non-vacuous.
//  2. EACH CLAUSE FORM, EXACTLY — comparisons (the breach query's shape), source/target property
//     constraints in each operator form (`eq`/`ne`/`in`), and their conjunction, asserted as
//     exact sentences at the unit level.
//  3. A REFUSAL STILL SAYS WHAT WAS ASKED — the sentence is built from the query, never the
//     answer, so a `where`-carrying query that refuses carries the same full sentence.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { interpretation } from "../src/engine/graph.ts";
import { parseQuery } from "../src/engine/types.ts";
import type { GraphQuery } from "../src/engine/types.ts";
import { EXAMPLE_IDS, exampleText, loadExample } from "../scripts/gen-example-coverage.ts";

/** The parsed GRAPH query a saved raw document holds, or null when it is not a graph query. */
function graphQueryOf(raw: unknown): GraphQuery | null {
  const parsed = parseQuery(raw);
  if (!parsed.ok || parsed.value.kind !== "graph") return null;
  return parsed.value.graph;
}

/** The bare member name of a comparison side: `source.permits` -> `permits`. */
const memberOf = (ref: string): string => {
  const dot = ref.indexOf(".");
  return dot > 0 ? ref.slice(dot + 1) : ref;
};

test("every shipped where-clause query's sentence names every clause — the sweep is not vacuous", () => {
  let withWhere = 0;
  for (const id of EXAMPLE_IDS) {
    const ex = loadExample(id);
    for (const [queryId, saved] of ex.workspace.state.system.queries) {
      const q = graphQueryOf(saved.raw);
      if (q === null || q.where === null) continue;
      withWhere += 1;
      const result = ex.workspace.query(saved.raw);
      const sentence = result.interpretedAs;
      assert.ok(sentence !== null, `${id}/${queryId}: a graph query must carry its sentence`);
      const at = `${id}/${queryId}: interpretedAs "${sentence}"`;
      for (const cmp of q.where.compare) {
        for (const ref of [cmp.left, cmp.right]) {
          assert.ok(sentence.includes(`'${memberOf(ref)}'`),
            `${at} must name '${memberOf(ref)}' — the compared member is the question's point, ` +
            `and a sentence without it describes mere adjacency (the 261006 lab-run misread)`);
        }
      }
      for (const side of [...q.where.source, ...q.where.target]) {
        assert.ok(sentence.includes(`'${side.property}'`),
          `${at} must name the constrained property '${side.property}'`);
      }
    }
  }
  assert.ok(withWhere >= 2,
    `the corpus ships where-clause queries (found ${withWhere}); a sweep that finds none holds nothing`);
});

test("the breach query's sentence carries the join, in the ordered-comparison wording", () => {
  const ex = loadExample("message-bus");
  const saved = ex.workspace.state.system.queries.get("restricted-data-reaches-impermitted-subscriber");
  assert.ok(saved !== undefined);
  const result = ex.workspace.query(saved.raw);
  assert.equal(result.interpretedAs,
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the source's 'permits' is below the target's 'carries'?",
    "the exact sentence the lab-solver should have been given");
});

const base: GraphQuery = {
  form: "direct", relation: "subscribes", from: null, to: null, maxHops: null, where: null,
};

test("each clause form reaches the sentence: compare, eq, ne, in, and their conjunction", () => {
  assert.equal(interpretation({ ...base,
    where: { source: [], target: [], compare: [{ left: "source.permits", op: "lt", right: "target.carries" }] } }),
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the source's 'permits' is below the target's 'carries'?");
  assert.equal(interpretation({ ...base,
    where: { source: [{ property: "permits", op: "eq", values: ["internal"] }], target: [], compare: [] } }),
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the source's 'permits' is 'internal'?");
  assert.equal(interpretation({ ...base,
    where: { source: [], target: [{ property: "carries", op: "ne", values: ["public"] }], compare: [] } }),
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the target's 'carries' is not 'public'?");
  assert.equal(interpretation({ ...base,
    where: { source: [{ property: "tier", op: "in", values: ["gold", "silver"] }], target: [], compare: [] } }),
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the source's 'tier' is one of 'gold', 'silver'?");
  assert.equal(interpretation({ ...base,
    where: {
      source: [{ property: "permits", op: "eq", values: ["internal"] }],
      target: [{ property: "carries", op: "eq", values: ["restricted"] }],
      compare: [{ left: "source.permits", op: "lt", right: "target.carries" }],
    } }),
    "Is there a direct 'subscribes' relation from any entity to any entity, " +
    "where the source's 'permits' is 'internal' and the target's 'carries' is 'restricted' " +
    "and the source's 'permits' is below the target's 'carries'?");
});

test("a refusal still carries the full sentence — built from the query, never from the answer", () => {
  // The same where-carrying shape against a relation the system does not declare: unlicensed, and
  // the sentence still says exactly what was asked, join included.
  const ex = loadExample("message-bus");
  const result = ex.workspace.query({
    kind: "graph", quantifier: "exists",
    graph: {
      form: "direct", relation: "no_such_relation",
      where: { compare: [{ left: "source.permits", op: "lt", right: "target.carries" }] },
    },
  });
  assert.equal(result.outcome, "unlicensed");
  assert.ok(result.interpretedAs !== null && result.interpretedAs.includes("'permits' is below the target's 'carries'"),
    `a refusal must still say what was asked: got "${result.interpretedAs}"`);
});

// Keep the YAML import earning its place: the sweep above reads queries through the loaded system,
// and this pins that the corpus files themselves still author the join this file is about — a
// guard against the sweep silently reading a different corpus than the one shipped.
test("the shipped breach query still authors the compare join this file exists to carry", () => {
  const doc = parse(exampleText("message-bus")) as Record<string, unknown>;
  const queries = doc["queries"] as Record<string, unknown>;
  const breach = JSON.stringify(queries["restricted-data-reaches-impermitted-subscriber"]);
  assert.match(breach, /source\.permits/);
  assert.match(breach, /target\.carries/);
});
