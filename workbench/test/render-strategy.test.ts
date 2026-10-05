/**
 * The render-strategy registry's rungs 2 and 4.
 *
 * `DESIGN-render-rules-261004.md` §B.1 gives `renderStrategy` four rungs and names which machinery
 * holds each. **Two of them are not here, and the omission is the point:**
 *
 *   - **Rung 1, PRESENCE, is the compiler.** `renderStrategy` is a required field on `ModelType`, so
 *     a new model type cannot land without declaring a projection or declaring itself nonvisual, and
 *     no test is needed to say it. Measured by deleting the quantitative row: TS2741, *"Property
 *     'renderStrategy' is missing … but required in type 'ModelType'."*
 *   - **Rung 3, DISPATCH TOTALITY, is the compiler.** `pictureRequestFor` switches on the construct
 *     with no `default` and a return type excluding `undefined`. Measured by adding a fourth
 *     `RenderConstruct`: TS2366 in the dispatcher plus TS2741 on `CONSTRUCT_SCENES` and
 *     `EXEMPLAR_SELECTION`. That is what replaces §22.4's *"there should be no generic
 *     `renderAnythingAsGraph()` fallback"* with a type error.
 *
 * **Rung 2 is below: the content is not a placeholder.** **Rung 4 is below too, and it is the rung
 * `semanticBasis` cannot have** — §B.1's argument is that a render strategy's correspondent is
 * `src/render/`, which CI holds in its hand, where `semanticBasis`'s correspondent is a standard the
 * workbench takes no runtime dependency on. So "this declaration is the strategy the code actually
 * runs" is re-derivable, and the test below re-derives it by rendering.
 *
 * **What is held by nothing here.** That a `projection` sentence TRULY describes the reduction a
 * reader sees — that "it drops topology" is the whole of what the budget drops, and that the prose
 * names no preservation the picture does not make. A person reads that. It is the same residue
 * `test/bindings-census.test.ts` names for a binding's prose, and these tests must not be read as
 * covering it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { MODEL_TYPES, type RenderConstruct } from "../src/engine/model-types.ts";
import {
  CONSTRUCT_SCENES, EXEMPLAR_SELECTION, pictureRequestFor, renderStrategyFor, sceneConstructFor,
} from "../src/app/render-strategy.ts";
import { SHIPPED_EXAMPLE_IDS, type ShippedExampleId } from "../src/app/examples.ts";
import { renderBudgetView } from "../src/app/budget.ts";
import { renderView } from "../src/render/index.ts";
import { presentTypes } from "../src/app/learn.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

const systemOf = (id: ShippedExampleId): CanonicalSystem =>
  canonicalize(parse(readFileSync(`examples/${id}/system.mage.yaml`, "utf8")));

const SYSTEMS: ReadonlyMap<ShippedExampleId, CanonicalSystem> =
  new Map(SHIPPED_EXAMPLE_IDS.map((id) => [id, systemOf(id)]));

// ---------------------------------------------------------------------------------------------
// Rung 2 — the content owes a real claim
// ---------------------------------------------------------------------------------------------

test("no render strategy is a placeholder — the content owes a real reduction (rung 2)", () => {
  // Omission is rung 1's job and the compiler has it. The realistic decay is `projection: "a
  // graph"` — present, typed, and saying nothing — which is why these are content floors rather
  // than presence checks. The floors mirror the ones `semanticBasis`'s rung 2 already carries.
  const seen = new Set<string>();
  for (const t of MODEL_TYPES) {
    const s = t.renderStrategy;
    seen.add(s.kind);
    switch (s.kind) {
      case "projected":
        assert.ok(s.projection.length > 80,
          `${t.id}: a projection too short to say what it preserves AND what it drops`);
        // Both halves, because a reduction that names only what it keeps is the half that misleads:
        // a reader who is not told what is absent assumes the picture is complete.
        assert.ok(/\bpreserves?\b/i.test(s.projection),
          `${t.id}: the projection does not say what it PRESERVES`);
        assert.ok(/\bdrops?\b/i.test(s.projection),
          `${t.id}: the projection does not say what it DROPS — the half that misleads if absent`);
        break;
      case "nonvisual":
        assert.ok(s.why.length > 30, `${t.id}: a nonvisual arm owes a real reason, not a placeholder`);
        break;
    }
  }
  // VACUITY GUARD, and it is a WEAK one on purpose — see the note below. The registry carries no
  // `nonvisual` row, so this loop exercises one arm of two. Asserting that both arms are present
  // would be asserting a type exists that nothing declares.
  assert.deepEqual([...seen], ["projected"],
    "a `nonvisual` row landed: extend this test's floors rather than widening the expectation");
});

/*
 * ## The vacuity case for rung 2, constructed
 *
 * **It passes while the property is violated like this:** a `projection` sentence 81 characters
 * long containing the words "preserves" and "drops" and describing the WRONG projection — say the
 * structural row claiming it preserves magnitudes. Every floor above is met and the declaration is
 * false. The floors catch decay into emptiness; they cannot catch a confident wrong sentence.
 *
 * That is why rung 4 exists and why it renders rather than reading. Rung 4 catches the sentence
 * naming the wrong CONSTRUCT. What survives both is a sentence naming the right construct and
 * misdescribing its reduction, and that residue is `asserted` — a person reads it. Stated here
 * rather than left implicit, because a reader who sees two green rungs will otherwise assume three.
 *
 * **The `nonvisual` arm is unexercised, which is a real and declared gap.** No model type declares
 * it, so its 30-character floor has never run against a row. It is forward policing, not a measured
 * control, and the assertion above fails loudly the day a row lands rather than letting the arm
 * ship unchecked.
 */

// ---------------------------------------------------------------------------------------------
// Rung 4 — every declared strategy is the one the code runs
// ---------------------------------------------------------------------------------------------

/** Which construct each picture arm can only have come from. The join rung 4 turns on. */
const CONSTRUCT_OF_PICTURE: Readonly<Record<RenderConstruct, "scene" | "budget">> = {
  model: "scene",
  machine: "scene",
  "quantitative-model": "budget",
};

test("every declared render strategy is the projection the code runs (rung 4)", () => {
  const rendered = new Map<string, number>();
  for (const t of MODEL_TYPES) {
    const strategy = renderStrategyFor(t.id);
    if (strategy.kind === "nonvisual") {
      // A nonvisual type must produce NO picture over any shipped system. The claim is falsifiable
      // in the direction that matters: a type declaring it has no picture, that draws one anyway.
      for (const system of SYSTEMS.values()) {
        assert.equal(pictureRequestFor(t.id, system), null,
          `${t.id} declares itself nonvisual and produced a picture`);
      }
      continue;
    }

    for (const [example, system] of SYSTEMS) {
      if (!presentTypes(system).includes(t.id)) continue;
      const picture = pictureRequestFor(t.id, system);
      assert.ok(picture !== null,
        `${t.id}: '${example}' declares this type and the dispatcher produced no picture`);

      assert.equal(picture.kind, CONSTRUCT_OF_PICTURE[strategy.construct],
        `${t.id}/${example}: declares construct '${strategy.construct}' and the code asked for a `
        + `'${picture.kind}' picture`);

      // ...and the per-instance subject is a thing the IR DECLARES, read out of the construct the
      // declaration names. This is the half that catches a dispatcher reaching into the wrong map.
      if (picture.kind === "scene") {
        const declared = picture.subject.kind === "model"
          ? system.models.has(picture.subject.id)
          : system.machines.has(picture.subject.id);
        assert.ok(declared,
          `${t.id}/${example}: the picture names ${picture.subject.kind} '${picture.subject.id}', `
          + "which this system does not declare");
        assert.equal(picture.subject.kind, strategy.construct,
          `${t.id}/${example}: the scene subject is not the declared construct`);
      } else {
        assert.ok(system.quantitativeModels.has(picture.dimension),
          `${t.id}/${example}: the picture names dimension '${picture.dimension}', undeclared here`);
      }

      // And it DRAWS. A declaration whose projection throws or refuses is not the strategy the code
      // runs, however well the two agree on paper.
      if (picture.kind === "scene") {
        const view = renderView(system, { subject: picture.subject });
        assert.ok(view.svg.length > 0 && view.accessible.nodes.length > 0,
          `${t.id}/${example}: the declared scene produced no picture`);
      } else {
        const view = renderBudgetView(system, picture.dimension);
        assert.ok(view.ok, `${t.id}/${example}: the declared budget refused`);
        assert.ok(view.value.accessible.allocations.length > 0,
          `${t.id}/${example}: the declared budget drew no allocation`);
      }
      rendered.set(t.id, (rendered.get(t.id) ?? 0) + 1);
    }
  }

  // PER-TYPE accounting, not a total. A total clears its floor while one type is covered three
  // times and another not at all, which is the arrangement under which this test would pass over a
  // declaration nothing ever exercised. Measured 261005: structural 5, behavioural 3,
  // quantitative 2, over five shipped examples.
  for (const t of MODEL_TYPES) {
    if (t.renderStrategy.kind === "nonvisual") continue;
    assert.ok((rendered.get(t.id) ?? 0) > 0,
      `${t.id} declares a projection that no shipped example exercised, so its declaration was `
      + "checked against nothing. Ship an example declaring this type, or the row is fiction");
  }
});

test("the quantitative type's picture is a BUDGET, never the structural extractor", () => {
  // The forbidden behaviour, pinned at the registry rather than at the page that used to do it.
  // §22.3: *"Do not force quantities into the structural renderer simply because Mermaid can draw
  // boxes and arrows."* §22.4: no generic fallback for a registered model type. Both are now
  // statements about one declared field, so this is the assertion that goes red if the declaration
  // is changed back — which is the only way the behaviour can return.
  const strategy = renderStrategyFor("quantitative-model");
  assert.equal(strategy.kind, "projected");
  assert.ok(strategy.kind === "projected" && strategy.construct === "quantitative-model",
    "the quantitative type must project its OWN construct, not borrow another type's reduction");

  const sensor = SYSTEMS.get("embedded-sensor-node");
  assert.ok(sensor !== undefined, "the sensor-node example is the quantitative exemplar");
  const picture = pictureRequestFor("quantitative-model", sensor);
  assert.equal(picture?.kind, "budget",
    "a scene picture here is the positional fallback returning, by a different route");

  // §24's own requirement for this example: memory allocation and budget visually legible, rather
  // than a dependency graph with numbers beside it. The margin is what makes it a budget.
  const view = renderBudgetView(sensor, picture.dimension);
  assert.ok(view.ok);
  assert.notEqual(view.value.accessible.budget, null,
    "the exemplar must declare a ceiling, or the selection rule prefers nothing");
  assert.notEqual(view.value.accessible.margin, null, "a budget without a margin is a total");
});

test("the exemplar selection each construct declares is the selection it makes", () => {
  // `EXEMPLAR_SELECTION` is prose beside behaviour, which is the shape that drifts. So it is
  // re-derived: a system whose FIRST declared instance differs from the one a preference would pick
  // separates the two rules, and the sensor node is that system if any shipped one is.
  assert.equal(EXEMPLAR_SELECTION["quantitative-model"], "prefers-a-declared-ceiling");
  for (const [example, system] of SYSTEMS) {
    const dims = [...system.quantitativeModels.values()];
    if (dims.length === 0) continue;
    const picture = pictureRequestFor("quantitative-model", system);
    if (picture === null) continue;
    assert.equal(picture.kind, "budget");
    const withCeiling = dims.find((d) => d.budget !== null);
    assert.equal(picture.dimension, (withCeiling ?? dims[0])?.dimension,
      `${example}: the dimension chosen is neither the first with a ceiling nor the first declared`);
  }

  // The structural and behavioural arms declare `first-declared`, and that IS a position. It is not
  // the behaviour §22.3 forbids — that was choosing which CONSTRUCT to draw, so a type borrowed
  // another type's reduction. This chooses among instances of the construct the type declares.
  assert.equal(EXEMPLAR_SELECTION.model, "first-declared");
  assert.equal(EXEMPLAR_SELECTION.machine, "first-declared");
  for (const [example, system] of SYSTEMS) {
    if (system.models.size === 0) continue;
    const picture = pictureRequestFor("structural-graph", system);
    assert.equal(picture?.kind === "scene" ? picture.subject.id : null,
      [...system.models.keys()][0], `${example}: not the first declared model`);
  }
});

/*
 * ## The vacuity case for rung 4, constructed
 *
 * **It passes while the property is violated like this:** a shipped corpus in which no system
 * declares a type. `presentTypes` skips it, the inner loop never runs, and the type's declaration
 * is checked against nothing. The per-type floor is what refuses that. It was written as a bare
 * total first — `rendered >= MODEL_TYPES.length` — which cleared while one type was covered three
 * times and another not at all, so the construction above was live against the first draft of this
 * very test and the floor is per-type because of it.
 *
 * **The deeper one, and it is live — measured by mutation, not reasoned about.** Rung 4 holds
 * "the code agrees with the declaration", which is not "the declaration is right". Two mutations
 * ran against this file on 261005 and together they draw the boundary:
 *
 *   - **The quantitative row's `construct` changed to `"model"`** — the forbidden fallback
 *     returning, by the shortest route. Rung 4 stayed **GREEN**: the declaration now says `model`,
 *     the dispatcher duly draws a scene, and the two agree about the wrong thing. The three tests
 *     below caught it.
 *   - **The dispatcher's quantitative arm changed to return a scene**, leaving the declaration
 *     alone. Rung 4 went **RED**, which is what it is for.
 *
 * So rung 4 is `checked` for code-to-declaration correspondence and for drawability, and nothing
 * here grades the declaration's own truth. What makes the fallback unable to return quietly is the
 * CONJUNCTION — no single test below is the control, and a reader should not treat rung 4 as one.
 * Closing the residue would need the projection prose to be machine-readable, which §B.4 rules
 * against for reasons this wave did not relitigate.
 */

// ---------------------------------------------------------------------------------------------
// The derivation that replaced a second hand-written table
// ---------------------------------------------------------------------------------------------

test("the canvas's construct table is derived from the registry, not restated beside it", () => {
  // The defect this closes was live: the Learn page drew a budget for the quantitative type while
  // the cross-model canvas reported it as having no picture, each with its own confident reason,
  // and nothing could fail. One declaration, read twice, is the fix — so the assertion is that
  // every value IS the registry's, by derivation.
  for (const t of MODEL_TYPES) {
    const strategy = t.renderStrategy;
    const scene = sceneConstructFor(t.id);
    if (strategy.kind === "nonvisual") {
      assert.deepEqual(scene, { kind: "none", why: strategy.why },
        `${t.id}: a nonvisual type's canvas reason must be its own`);
      continue;
    }
    assert.equal(scene, CONSTRUCT_SCENES[strategy.construct],
      `${t.id}: the canvas classification is not the construct table's entry BY IDENTITY — a copy `
      + "that happens to agree today is free to drift tomorrow");
  }

  // And the reason a type cannot be a panel says SCENE, not picture. The two were one sentence
  // while one type had neither, and the sentence outlived the fact: a quantitative model became
  // addressable and gained a projection, and the canvas went on reporting that it had no picture.
  const quant = sceneConstructFor("quantitative-model");
  assert.equal(quant.kind, "none");
  assert.ok(quant.kind === "none" && !/not an addressable construct/.test(quant.why),
    "the stale reason is back: a quantitative model IS addressable, and says so in src/ir/types.ts");
  assert.ok(quant.kind === "none" && /node/.test(quant.why),
    "the reason must name what is actually missing — a node for a connection to anchor on");
});
