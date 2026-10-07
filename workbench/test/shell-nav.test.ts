// The two navigation rails, as a reading, before any element exists.
//
// `navRails` is a pure function from the view model plus the system to a typed structure, which is
// what lets these run in `node:test` with no browser — the arrangement `view-model.ts` exists for
// and `shell/inspector.ts` reuses. Every semantic line is TEXT in a typed value before any element
// exists, so a test asserts the product rather than a stylesheet.
//
// **The oracle is the model and the status vocabulary, never a transcript of what a rail says
// today.** Corrections 2 and 6 moved two surfaces out of tables, so each claim here is a COVERAGE
// claim derived from a source of truth:
//
//   - the models rail's member set is compared to `vm.subjects`, the one list of drawable purposeful
//     models — which includes MACHINES, because a machine carries its own purpose and a rail built
//     from `system.models` alone reports worker-queue as having one model and is wrong;
//   - each row's words are compared to that object's own STORED description;
//   - the mark is compared to the status vocabulary, whose members come from `STATUS_TEXT`'s keys
//     rather than from an array written here;
//   - the short status word is compared to the LONG one, which is the pin that keeps the rail's
//     derivation from drifting out of the sentence it abbreviates.
import { exampleDir } from "../src/app/example-corpus.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { STATUS_TEXT } from "../src/app/properties.ts";
import type { PropertyStatus } from "../src/app/properties.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import { buildViewModel, resolveSubject, subjectValue } from "../src/ui/view-model.ts";
import type { ViewModel } from "../src/ui/view-model.ts";
import { navRails, statusWord } from "../src/ui/shell/nav.ts";
import type { NavRails } from "../src/ui/shell/nav.ts";

const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  render: { render: (system, request) => renderView(system, request) },
};

const source = (id: string): string => readFileSync(`${exampleDir(id)}/system.mage.yaml`, "utf8");
const parsed = (id: string): CanonicalSystem => canonicalize(parse(source(id)));

/**
 * A system with its properties EVALUATED, through the same facade the page paints from.
 *
 * Not a hand-built result map: the mark under test is a reading of a real verdict, and a fixture
 * verdict would let the rail agree with a map this file wrote rather than with the engine.
 */
function railsOf(id: string, target: string | null = null): {
  readonly system: CanonicalSystem; readonly vm: ViewModel; readonly rails: NavRails;
} {
  const ws = new Workspace(ports);
  const loaded = ws.load(source(id));
  assert.ok(loaded.ok, `${id} must load`);
  const system = ws.state.system;
  const vm = buildViewModel(system, ws.state.findings, ws.properties(), {
    hypothesis: null,
    selection: [],
    principal: resolveSubject(system, target),
  });
  return { system, vm, rails: navRails(vm, system, target) };
}

/** The status vocabulary, from the table the application words it with. */
const STATUSES = Object.keys(STATUS_TEXT) as readonly PropertyStatus[];

// --------------------------------------------------------------------------------------------
// The models rail — correction 2
// --------------------------------------------------------------------------------------------

test("the models rail lists exactly the drawable purposeful models, machines included", () => {
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { vm, rails } = railsOf(id);
    assert.deepEqual(
      rails.models.map((m) => m.subject),
      vm.subjects.map((s) => s.value),
      `${id}: the rail's member set is not the drawable-subject list — a rail that enumerates its `
      + "own models will disagree with the one surface that already knows them",
    );
    assert.equal(rails.modelsEmpty, null, `${id}: a non-empty rail still reports an empty state`);
  }
});

test("a machine reaches the rail, because a machine is a purposeful model too", () => {
  // The worked lesson, stated as a test rather than as a comment: a rail derived from
  // `system.models` would silently drop a behavioural model, and the system that proves it is
  // whichever shipped example declares one. Chosen by measurement, not by name.
  const withMachines = SHIPPED_EXAMPLE_IDS.filter((id) => parsed(id).machines.size > 0);
  assert.ok(withMachines.length > 0,
    "no shipped example declares a machine, so this claim cannot be checked — add one before deleting this");
  for (const id of withMachines) {
    const system = parsed(id);
    const { rails } = railsOf(id);
    for (const machine of system.machines.keys()) {
      const row = rails.models.find((m) => m.subject === subjectValue({ kind: "machine", id: machine }));
      assert.ok(row, `${id}: machine ${machine} is not in the models rail`);
      // The row wears the machine's authored display label (261006: machines carry `label` like
      // every other model; the raw kebab id was the fallback, not the name).
      assert.equal(row.name, system.machines.get(machine)?.label ?? machine,
        `${id}: machine ${machine} is named something else in the rail`);
    }
  }
});

test("every rail row carries the model's own STORED words, verbatim or not at all", () => {
  // Author ruling (261006): the purpose question left the default surface; the rail's sub-line is
  // the stored "Model in words", and a model whose author wrote none shows none — a synthesized
  // stand-in is the exact failure the doctrine forbids. Precondition: the shipped corpus must
  // exercise the non-null arm, or this pin is vacuous.
  let withWords = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = parsed(id);
    const { rails } = railsOf(id);
    for (const row of rails.models) {
      const subject = resolveSubject(system, row.subject);
      assert.ok(subject, `${id}: the rail offers ${row.subject}, which resolves to no subject`);
      const stored = (subject.kind === "model"
        ? system.models.get(subject.id)?.description
        : system.machines.get(subject.id)?.description) ?? null;
      assert.equal(row.words, stored,
        `${id}: ${row.subject}'s rail words are not the stored description — the rail must quote, never author`);
      if (stored !== null) withWords += 1;
    }
  }
  assert.ok(withWords > 0,
    "no shipped model stores a description; the verbatim arm of this pin never ran");
});

test("exactly one row is the one being viewed, and it is the subject the workspace resolves", () => {
  const id = SHIPPED_EXAMPLE_IDS[0];
  assert.ok(id !== undefined, "no shipped example to drive");
  const system = parsed(id);
  for (const choice of [null, ...[...system.machines.keys()].map((m) => `machine:${m}`)]) {
    const { rails } = railsOf(id, choice);
    const current = rails.models.filter((m) => m.current);
    assert.equal(current.length, 1,
      `target ${String(choice)}: ${current.length} rows claim to be the one being viewed`);
    const resolved = resolveSubject(system, choice);
    assert.ok(resolved, "every target resolves to a subject once a system is loaded");
    assert.equal(current[0]?.subject, subjectValue(resolved),
      `target ${String(choice)}: the marked row is not the subject the workspace draws`);
  }
});

// --------------------------------------------------------------------------------------------
// The properties rail — correction 6
// --------------------------------------------------------------------------------------------

test("the properties rail renders every tracked claim, by id", () => {
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { vm, rails } = railsOf(id);
    assert.deepEqual(
      rails.properties.map((p) => p.id),
      vm.properties.map((p) => p.id),
      `${id}: the rail is not showing the property list it was handed`,
    );
    if (vm.properties.length === 0) {
      assert.ok(rails.propertiesEmpty !== null && rails.propertiesEmpty.length > 0,
        `${id}: an empty rail says nothing, which reads as a rendering failure`);
    } else {
      assert.equal(rails.propertiesEmpty, null, `${id}: a non-empty rail still reports an empty state`);
    }
  }
});

test("the short status word is the long sentence's first words — one author, abbreviated", () => {
  // The derivation pin. `statusWord` uppercases the typed key rather than copying `STATUS_TEXT`'s
  // leading word into a second table; this is what makes that safe, and it fires the day the two
  // stop agreeing.
  for (const status of STATUSES) {
    assert.ok(STATUS_TEXT[status].startsWith(statusWord(status)),
      `STATUS_TEXT.${status} no longer opens with "${statusWord(status)}", so the rail's word and the `
      + "status sentence have drifted apart");
  }
});

test("every status has a mark, and the mark is never the only thing carrying it", () => {
  // Three glyphs, as the author drew them, and a WORD beside every one. The glyph is checked for
  // CLOSURE rather than per-status, because which statuses are not a plain yes or no is a judgement
  // the module states and this test should not restate — what it must hold is that the vocabulary
  // does not grow a fourth glyph quietly, and that `?` never stands alone for four different facts.
  const rows = SHIPPED_EXAMPLE_IDS.flatMap((id) => railsOf(id).rails.properties);
  assert.ok(rows.length > 0, "no shipped example tracks a claim, so no mark can be read");
  const glyphs = new Set(rows.map((p) => p.mark.glyph));
  for (const glyph of glyphs) {
    assert.ok(["✓", "✗", "?"].includes(glyph), `an unexpected rail glyph: ${glyph}`);
  }
  // Non-vacuity, and the reason it is worth a line: a mapping that answered `?` to everything would
  // satisfy every other assertion in this test. The shipped examples between them establish,
  // refute and decline, so all three marks must appear.
  assert.equal(glyphs.size, 3,
    `the shipped examples produce ${glyphs.size} distinct mark(s) — ${[...glyphs].join(" ")} — so the `
    + "three-valued reading is not being exercised");
  for (const row of rows) {
    assert.notEqual(row.mark.word.trim(), "",
      `${row.id} carries a glyph and no word, which is the one thing the house rule forbids`);
    assert.ok(
      row.full.stale
        ? row.mark.glyph === "?"
        : STATUS_TEXT[row.full.statusKey].startsWith(row.mark.word),
      `${row.id}'s mark "${row.mark.word}" does not describe its status "${row.full.statusKey}"`,
    );
  }
});

test("a claim explains itself through a model it derives from, or admits it grounds in nothing", () => {
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const { rails } = railsOf(id);
    for (const row of rails.properties) {
      const first = row.full.groundSubjects[0] ?? null;
      assert.equal(row.explains, first,
        `${id}/${row.id}: the rail navigates somewhere other than the first model the verdict cites`);
      if (row.full.grounds.length === 0) {
        assert.equal(row.explains, null,
          `${id}/${row.id}: an ungrounded claim offers a destination, which is navigation to nowhere`);
      }
    }
  }
});

test("the full reading stays reachable — every field the flat list showed is on the row", () => {
  // UX-I8 says progressive disclosure must not REMOVE semantic capability. The rail shows a mark, a
  // word and the claim; everything else the flat list showed is carried on `full`, which the rail
  // renders behind a disclosure. Asserted as identity with the view model's row rather than
  // field-by-field, so a field added to `PropertyRow` is covered the day it lands.
  const { vm, rails } = railsOf("message-bus");
  assert.deepEqual(rails.properties.map((p) => p.full), [...vm.properties],
    "a rail row's full reading is not the view model's own row, so the disclosure can show less than the list did");
});

// --------------------------------------------------------------------------------------------
// The `+` rows
// --------------------------------------------------------------------------------------------

test("the operations the rails offer are declared capabilities with a human site", () => {
  // The rails do not mint controls. `+ Model` and `+ Property` navigate to the element the
  // capability registry already declares for that operation, so the claim worth holding here is
  // that both capabilities exist and both have a bound human site to navigate to — the condition
  // `operationHref` resolves against a live document and would otherwise fail silently to text.
  for (const capability of ["create-model", "save-property"] as const) {
    const declared = CAPABILITIES.find((c) => c.id === capability);
    assert.ok(declared, `the rails offer ${capability}, which the registry does not declare`);
    const bound = declared.human.filter((a) => a.status !== "absent");
    assert.ok(bound.length > 0,
      `${capability} has no bound human site, so the rail's row has nowhere to send a user`);
  }
});
