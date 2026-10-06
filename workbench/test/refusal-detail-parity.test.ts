// A refusal's TYPED half must be at least as informative as its sentence — for every refusal the
// corpus can produce, not for the ones somebody spot-checked.
//
// ## The failure this file exists to catch, measured before it was fixed
//
// The 261006 lab-solver run found ONE refusal under-reporting itself: the capstone's
// charge-remaining-at-delivery question. Its prose named the declared omission and the models
// ("the absence is a declared modelling decision: … deliberately omits …"); its `refusalDetail`
// said `unknown-vocabulary` with `missing: []`, `models: []` — while the sibling did-analytics
// refusal populated both richly. An agent branching on the typed data, as `refusalDetail`'s own
// description advises, got strictly less than the human sentence. The cause was a reference
// resolver that built the omission PROSE without the omission DETAIL, plus a compile path that
// prefixed the sentence and dropped the typed cause on the floor.
//
// The relationship is held CORPUS-WIDE because the defect was a per-site drop: any new refusal
// route that words an omission without its data re-creates it, and a spot-check of two known
// refusals would miss the third route the day it lands.
//
// ## What is held, for every unlicensed result of every shipped example's saved queries
//
//  1. PROSE/DATA AGREEMENT ON OMISSIONS — a sentence that declares a modelling decision comes with
//     `reason: "missing-distinction"`, a non-empty `missing` carrying the omission's own words,
//     and the declaring construct ids in `models`; every id the sentence quotes appears in the
//     data, and the omission text the sentence quotes appears in `missing`.
//  2. REASON-SHAPE FLOOR — `missing-distinction` never ships an empty `missing` (a cause that
//     names no distinction is the under-report wearing the right label).
//  3. THE REGRESSION ITSELF — charge-remaining-at-delivery now reads `missing-distinction`, with
//     `missing` and `models` looked up from the model's own purpose declarations rather than
//     hardcoded, and the sweep is pinned to have covered it.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { QueryResult } from "../src/ir/types.ts";
import { EXAMPLE_IDS, loadExample } from "../scripts/gen-example-coverage.ts";
import { omissionCovering } from "../src/engine/omission.ts";

interface Refused {
  readonly where: string;
  readonly result: QueryResult;
}

function allRefusals(): readonly Refused[] {
  const out: Refused[] = [];
  for (const id of EXAMPLE_IDS) {
    const ex = loadExample(id);
    for (const [queryId, result] of ex.workspace.runSavedQueries()) {
      if (result.outcome !== "unlicensed") continue;
      out.push({ where: `${id}/${queryId}`, result });
    }
  }
  return out;
}

const REFUSALS = allRefusals();

/** The marker `omissionProse` words every declared-omission sentence with — one source, one test. */
const OMISSION_MARKER = "declared modelling decision";

test("the corpus produces refusals to check, including declared-omission ones", () => {
  assert.ok(REFUSALS.length >= 3,
    `expected several refusals across the shipped examples; found ${REFUSALS.length}`);
  assert.ok(REFUSALS.some(({ result }) => result.refusal?.includes(OMISSION_MARKER) === true),
    "at least one shipped refusal words a declared omission, or clause 1 below holds nothing");
});

test("every refusal carries its typed half, and an omission sentence carries omission DATA", () => {
  for (const { where, result } of REFUSALS) {
    const prose = result.refusal;
    const data = result.refusalDetail;
    assert.ok(prose !== null && data !== null, `${where}: a refusal is a sentence AND a typed cause`);

    if (!prose.includes(OMISSION_MARKER)) continue;
    assert.equal(data.reason, "missing-distinction",
      `${where}: the sentence declares a modelling decision; the typed reason must say so too — ` +
      `an agent branching on refusalDetail must not get less than the human sentence`);
    assert.ok(data.missing.length > 0, `${where}: the omitted distinction must ride as data`);
    assert.ok(data.models.length > 0, `${where}: the declaring construct(s) must ride as data`);

    // Every construct id the sentence quotes appears in the data, and the quoted omission text
    // appears in `missing` — the sentence may not know more than the data does.
    const quotedIds = [...prose.matchAll(/model(?:s)? '([^']+)'/g)].map((m) => m[1] ?? "");
    for (const id of quotedIds) {
      assert.ok(data.models.includes(id),
        `${where}: the sentence names '${id}'; refusalDetail.models must carry it`);
    }
    // Lazy up to the sentence's own fixed suffix, because the author's omission text may itself
    // contain an apostrophe ("the battery's state of charge").
    const quotedOmission = /deliberately omits? '(.+?)'\. There is no misspelling/.exec(prose)?.[1];
    assert.ok(quotedOmission !== undefined, `${where}: the omission sentence quotes the author's words`);
    assert.ok(data.missing.includes(quotedOmission),
      `${where}: the sentence quotes '${quotedOmission}'; refusalDetail.missing must carry it`);
  }
});

test("missing-distinction never ships an empty missing — the under-report cannot relabel itself", () => {
  for (const { where, result } of REFUSALS) {
    const data = result.refusalDetail;
    if (data?.reason !== "missing-distinction") continue;
    assert.ok(data.missing.length > 0,
      `${where}: a missing-distinction refusal that names no distinction is the defect this file pins`);
  }
});

test("the regression itself: charge-remaining-at-delivery's typed half matches its sentence", () => {
  const ex = loadExample("autonomous-delivery");
  const result = ex.workspace.runSavedQueries().get("charge-remaining-at-delivery");
  assert.ok(result !== undefined, "the capstone ships the question");
  assert.equal(result.outcome, "unlicensed");
  const data = result.refusalDetail;
  assert.ok(data !== null);
  assert.equal(data.reason, "missing-distinction",
    "the battery's state of charge is a DECLARED omission, not a misspelling to hunt for");

  // Looked up, not hardcoded (the substrate-lookup rule): the expected data is the engine's own
  // covering-omission derivation for the reference the authored query names — the ONE source of
  // the omission join — so this pin moves with the corpus rather than with a copied string.
  const system = ex.workspace.state.system;
  const saved = system.queries.get("charge-remaining-at-delivery");
  assert.ok(saved !== undefined);
  const target = (saved.raw as { behavior: { target: Record<string, unknown> } }).behavior.target;
  const ref = Object.keys(target)[0];
  assert.ok(ref !== undefined, "the authored query names the unresolvable reference");
  const covering = omissionCovering(system, ref);
  assert.ok(covering !== null, "the corpus declares an omission covering the reference");

  assert.deepEqual(data.missing, [covering.text],
    "missing carries the author's own omission words, as the did-analytics refusal always did");
  assert.deepEqual(data.models, covering.declaredBy,
    "models names every construct declaring a covering omission, in the engine's own order");
});
