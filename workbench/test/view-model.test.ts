// The accessible view model.
//
// These tests exist to make FR-A11Y-2 CHECKABLE rather than aspirational. The requirement is that
// no semantic information is carried by colour, position, line style or shape alone. Because the UI
// renders a typed structure of labels, roles and textual states, a test can assert that every
// status word is present as TEXT -- an assertion about the product, not about a stylesheet. A
// canvas-first design cannot be checked this way, which is a large part of why it fails in practice.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { validate } from "../src/validator/rules.ts";
import { runQuery } from "../src/engine/index.ts";
import { renderView } from "../src/render/index.ts";
import { Workspace } from "../src/app/services.ts";
import type { Ports } from "../src/app/services.ts";
import {
  annotationTargetValue, buildViewModel, elementValue, parseAnnotationTarget, parseElementValue,
  parseRelationValue, planEdit, relationValue, resolveSubject, subjectValue,
} from "../src/ui/view-model.ts";
import type { EditRequest } from "../src/ui/view-model.ts";
import type { QueryResult } from "../src/ir/types.ts";

const sys = () => canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")));

const vm = (results: ReadonlyMap<string, QueryResult> = new Map(), selection: string[] = []) => {
  const s = sys();
  return buildViewModel(s, validate(s), results, {
    hypothesis: null, currentHash: systemHash(s), selection,
  });
};

const allText = (m: ReturnType<typeof vm>): string => JSON.stringify(m);

test("every model fact reaches the structured view", () => {
  const m = vm();
  const text = allText(m);
  // Entities, relations, machines, states, transitions, variables -- all present as prose.
  for (const needed of [
    "Remediation Service", "Model Gateway",          // entity labels
    "may_invoke", "data_flow",                        // relation types
    "document", "worker",                             // machines
    "waiting", "processing", "published",             // states
    "retry_count",                                    // a state variable
    "acquire",                                         // a synchronized event
  ]) {
    assert.ok(text.includes(needed), `"${needed}" must be reachable without the diagram`);
  }
});

test("a relation's ABSENCE meaning is stated, not just its presence", () => {
  // The absence is often the more important half and is completely invisible in a diagram.
  const relations = vm().sections.find((s) => s.id === "relations");
  assert.ok(relations);
  const owns = relations.rows.find((r) => r.kind === "owns");
  assert.ok(owns, "the owns relation should appear");
  assert.match(owns.detail, /Absence means/, "what absence asserts must be in the text");
  assert.match(owns.detail, /NOT licensed/, "a forbidden path composition must be stated in words");
});

test("containment and cross-model appearance are words, not geometry", () => {
  const entities = vm().sections.find((s) => s.id === "entities");
  const remediation = entities?.rows.find((r) => r.id === "remediation");
  assert.ok(remediation);
  assert.match(remediation.detail, /contains parser/, "containment is an enclosing region in the SVG; here it must be prose");
  assert.match(remediation.detail, /appears in/, "identity across models must be stated");
});

test("a synchronized transition says it fires with its participants", () => {
  const machines = vm().sections.find((s) => s.id === "machines");
  const synced = machines?.rows.find((r) => r.kind === "synchronized transition");
  assert.ok(synced, "a sync transition should be distinguishable by KIND, not by edge style");
  assert.match(synced.detail, /fires together with/);
});

test("guards and effects are legible", () => {
  const machines = vm().sections.find((s) => s.id === "machines");
  const text = machines?.rows.map((r) => r.detail).join(" ") ?? "";
  assert.match(text, /requires retry_count lt 3/, "a guard must be readable");
  assert.match(text, /sets retry_count/, "an effect must be readable");
});

const result = (over: Partial<QueryResult>): QueryResult => ({
  outcome: "refuted",
  coverage: { kind: "exhaustive", statesExplored: 37, reason: null },
  evidence: null, refusal: null, interpretedAs: null, compilation: [],
  systemHash: systemHash(sys()), ...over,
});

test("the outcome WORD appears, and bounded coverage never reads as a no", () => {
  const s = sys();
  const h = systemHash(s);
  const bounded = result({
    outcome: "inconclusive",
    coverage: { kind: "bounded", statesExplored: 1_000_000, reason: "state-limit" },
  });
  const m = buildViewModel(s, [], new Map([["publish-requires-review", bounded]]),
    { hypothesis: null, currentHash: h, selection: [] });
  const q = m.questions.find((x) => x.id === "publish-requires-review");
  assert.ok(q);
  assert.match(q.outcome, /INCONCLUSIVE/);
  assert.match(q.outcome, /not a 'no'/, "the distinction a student gets wrong must be spelled out");
  assert.match(q.coverage, /bounded/);
  assert.match(q.coverage, /no conclusion is licensed/);
});

test("a refusal is reported as a successful answer with its reason", () => {
  const s = sys();
  const m = buildViewModel(s, [], new Map([["transitive-ownership", result({
    outcome: "unlicensed",
    refusal: "'owns' is declared as a direct relation without path-composition semantics.",
  })]]), { hypothesis: null, currentHash: systemHash(s), selection: [] });
  const q = m.questions.find((x) => x.id === "transitive-ownership");
  assert.match(q?.outcome ?? "", /NOT ANSWERABLE/);
  assert.ok((q?.refusal ?? "").length > 0, "the reason must travel with the refusal");
});

test("a stale result is flagged rather than shown as current", () => {
  const s = sys();
  const m = buildViewModel(s, [], new Map([["publish-requires-review", result({ systemHash: "fnv1a64:0000000000000000" })]]),
    { hypothesis: null, currentHash: systemHash(s), selection: [] });
  assert.equal(m.questions.find((x) => x.id === "publish-requires-review")?.stale, true);
});

test("a disclosed compilation is surfaced (V23)", () => {
  const s = sys();
  const m = buildViewModel(s, [], new Map([["publish-requires-review", result({
    compilation: [{ kind: "history-variable", explanation: "Added a history variable seen_reviewed to answer this." }],
  })]]), { hypothesis: null, currentHash: systemHash(s), selection: [] });
  // Look it up by id: `questions` follows the saved-query key order, so index 0 is not
  // necessarily the one seeded here. (This test asserted questions[0] and failed on my own bug.)
  const q = m.questions.find((x) => x.id === "publish-requires-review");
  assert.match(q?.compilation.join(" ") ?? "", /history variable/);
});

test("an active hypothesis says the authoritative model is unchanged", () => {
  const s = sys();
  const m = buildViewModel(s, [], new Map(), { hypothesis: "direct publish", currentHash: systemHash(s), selection: [] });
  assert.equal(m.banner?.tone, "warning");
  assert.match(m.banner?.text ?? "", /authoritative model is unchanged/);
});

test("selection is a textual state, not only a colour", () => {
  const m = vm(new Map(), ["gateway"]);
  const row = m.sections.find((s) => s.id === "entities")?.rows.find((r) => r.id === "gateway");
  assert.deepEqual(row?.states, ["selected"]);
});

test("NO status is conveyed by a bare symbol", () => {
  // The failure this guards: shipping a tick, a cross or a coloured dot as the only carrier.
  const m = vm(new Map([["q", result({ outcome: "holds" })]]));
  for (const q of m.questions) {
    assert.ok(/[A-Z]{4,}/.test(q.outcome) || q.outcome === "not yet run",
      `outcome "${q.outcome}" must carry a word, not just a glyph`);
    assert.ok(!/^[✓✗×✔✘]/.test(q.outcome), "a status must not START with a bare symbol");
  }
});

// --------------------------------------------------------------------------------------------
// Models, purpose and omissions
// --------------------------------------------------------------------------------------------

test("each model states what it asks and what it declines to say", () => {
  // The `inspect` capability claims the structured view reaches "purpose, omissions". It did not:
  // there was no models section at all, so a model's question -- the thing that licenses or refuses
  // every query over it -- was reachable only through a refusal message.
  const models = vm().sections.find((s) => s.id === "models");
  assert.ok(models, "a purposeful model is a modelled fact and must have its own rows");
  const flow = models.rows.find((r) => r.id === "service-flow");
  assert.ok(flow);
  assert.match(flow.detail, /asks:/, "the engineering question is what the model is FOR");
  assert.match(flow.detail, /deliberately omits/, "what a model declines to say is half of what it means");
});

test("a machine states its question too", () => {
  const machines = vm().sections.find((s) => s.id === "machines");
  const head = machines?.rows.find((r) => r.id === "document");
  assert.match(head?.detail ?? "", /asks: Can a document reach published without being reviewed\?/);
});

// --------------------------------------------------------------------------------------------
// Notes and provenance (A1)
// --------------------------------------------------------------------------------------------

const ANNOTATED = `
mage: 1
system: { id: a, name: Annotated }
relation-types:
  may_invoke:
    description: permitted invocation
    composition: { path: allowed }
entities:
  api:
    type: service
    notes:
      - { id: n1, kind: rationale, text: "One service deliberately.", author: human }
  gateway:
    type: service
    notes:
      - { id: n2, kind: assumption, text: "Gateway latency is probably 200 ms." }
    provenance:
      created_by: agent
      prompt: Model the minimum service relationships needed to reach the gateway.
      rationale: Permitted invocation, not observed calls.
models:
  flow:
    type: graph
    entities: [api, gateway]
    relations:
      - { id: a-g, from: api, to: gateway, type: may_invoke }
`;

const annotatedVm = () => {
  const s = canonicalize(parse(ANNOTATED));
  return buildViewModel(s, validate(s), new Map(),
    { hypothesis: null, currentHash: systemHash(s), selection: [] });
};

const entityRow = (id: string) =>
  annotatedVm().sections.find((s) => s.id === "entities")?.rows.find((r) => r.id === id);

test("a note appears where the user inspects the object, as a word-kinded line", () => {
  const api = entityRow("api");
  assert.ok(api);
  assert.deepEqual(api.notes.map((n) => n.kind), ["rationale"],
    "the note's kind is a WORD, so it is never a colour or an icon");
  assert.match(api.notes[0]?.text ?? "", /One service deliberately/);
  assert.equal(api.notes[0]?.author, "human", "who wrote it travels with it");
});

test("a note is NOT a finding", () => {
  // The failure this guards: rendering human context in the validation list, which tells the person
  // who wrote the comment that their comment is a problem.
  const m = annotatedVm();
  const findingText = m.findings.map((f) => `${f.rule} ${f.where} ${f.message}`).join(" ");
  assert.ok(!findingText.includes("One service deliberately"),
    "a note must never reach the findings list");
  assert.ok(!findingText.includes("200 ms"), "nor must an assumption note");
});

test("an assumption note carries the A1 boundary, because it is the thing people get wrong", () => {
  const gateway = entityRow("gateway");
  assert.ok(gateway?.notesCaveat !== null && gateway?.notesCaveat !== undefined);
  assert.match(gateway.notesCaveat, /context, not a constraint/);
  assert.match(gateway.notesCaveat, /analysis does not use it/);
  // And a row whose notes claim no assumption must not be given the caveat, or it becomes noise
  // everyone learns to skip.
  assert.equal(entityRow("api")?.notesCaveat, null);
});

test("provenance leads with the prompt", () => {
  // With agent-authored models the prompt answers the question reading the model cannot: why does
  // this object have this shape, and what was the agent asked to preserve?
  const fields = entityRow("gateway")?.provenance?.fields ?? [];
  assert.ok(fields.length > 0, "provenance must reach the inspector");
  assert.equal(fields[0]?.label, "Asked for", "the prompt is the valuable field, so it goes first");
  assert.match(fields[0]?.value ?? "", /minimum service relationships/);
  assert.ok(fields.some((f) => f.label === "Created by" && f.value === "agent"));
});

test("provenance that exists but cannot be read is reported, not dropped", () => {
  // docable's `remediation` records provenance under keys the IR does not read. "Records where it
  // came from, in a spelling we do not understand" is a different fact from "records nothing", and
  // silently showing nothing is how the first becomes invisible.
  const s = sys();
  const m = buildViewModel(s, [], new Map(),
    { hypothesis: null, currentHash: systemHash(s), selection: [] });
  const remediation = m.sections.find((x) => x.id === "entities")?.rows.find((r) => r.id === "remediation");
  assert.ok(remediation?.provenance, "the IR says provenance is present, so the view must say so");
  assert.equal(remediation.provenance.unreadable, true);
  assert.deepEqual(remediation.provenance.fields, []);
});

test("an object with no annotation gets no notes block", () => {
  const parser = entityRow("api");
  assert.ok(parser);
  const plain = annotatedVm().sections.find((s) => s.id === "machines");
  assert.equal(plain, undefined, "this fixture declares no machines");
  const relation = annotatedVm().sections.find((s) => s.id === "relations")?.rows[0];
  assert.deepEqual(relation?.notes, []);
  assert.equal(relation?.provenance, null);
});

// --------------------------------------------------------------------------------------------
// The editing forms: form input -> transaction operation
// --------------------------------------------------------------------------------------------

const plan = (req: EditRequest) => planEdit(req);

test("each form produces exactly the operation an agent would send", () => {
  // UX-I3: the human path and the agent path converge on one semantic operation. The operations
  // asserted here are the SAME shapes `test/transaction.test.ts` drives through the engine.
  const cases: [EditRequest, unknown][] = [
    [{ form: "add-entity", id: "cache", type: "service", label: "Cache" },
      { op: "add-entity", id: "cache", type: "service", label: "Cache" }],
    [{ form: "add-state", machine: "document", state: "archived" },
      { op: "add-state", machine: "document", state: "archived", label: undefined }],
    [{ form: "delete-element", element: "entity:parser", cascade: true },
      { op: "delete-entity", id: "parser", cascade: true }],
    [{ form: "delete-element", element: "state:document:failed", cascade: false },
      { op: "delete-state", machine: "document", state: "failed", cascade: false }],
    [{ form: "add-relation", model: "service-flow", from: "api", to: "gateway", type: "may_invoke" },
      { op: "add-relation", model: "service-flow", from: "api", to: "gateway", type: "may_invoke", id: undefined, label: undefined }],
    [{ form: "set-label", id: "gateway", label: "Public Gateway" },
      { op: "set-label", id: "gateway", value: "Public Gateway" }],
  ];
  for (const [req, expected] of cases) {
    const p = plan(req);
    assert.ok(p.ok, `${req.form} should plan, got: ${p.ok ? "" : p.problem}`);
    assert.deepEqual(p.operations, [expected]);
  }
});

test("the model form requires the question the op does not, and sends two operations", () => {
  // The asymmetry is deliberate. `add-model` carries no purpose, because `set-purpose` owns that
  // block; an agent may therefore build a model in stages. A PERSON creating one is taught the
  // habit instead: the form will not submit without the engineering question, and sends both ops in
  // one transaction so a question-less model is never committed.
  const p = plan({
    form: "add-model", id: "ownership", label: "Ownership",
    question: "Who owns the parser?", entities: " remediation , parser ",
  });
  assert.ok(p.ok, p.ok ? "" : p.problem);
  assert.deepEqual(p.operations, [
    { op: "add-model", id: "ownership", label: "Ownership", entities: ["remediation", "parser"] },
    {
      op: "set-purpose", scope: "model", id: "ownership",
      question: "Who owns the parser?", represents: undefined, omits: undefined,
    },
  ]);

  const noQuestion = plan({ form: "add-model", id: "ownership", label: "", question: "  ", entities: "" });
  assert.equal(noQuestion.ok, false);
  assert.match(noQuestion.ok ? "" : noQuestion.problem, /container, not a purposeful reduction/);

  // An empty entity list is omitted rather than written as an empty sequence, and the label too.
  const bare = plan({ form: "add-model", id: "sketch", label: "", question: "What is here?", entities: " , " });
  assert.ok(bare.ok);
  assert.deepEqual(bare.operations[0], { op: "add-model", id: "sketch", label: undefined, entities: undefined });
});

test("the note form stamps which side wrote the note and leaves the clock alone", () => {
  // `author` records the SIDE, not the person, and this side is known -- so it is stamped rather
  // than asked for. `at` is not: reading the clock here would make one form produce different bytes
  // on every click, and would make this function untestable.
  const p = plan({
    form: "add-note",
    target: annotationTargetValue({ kind: "model", id: "service-flow" }),
    kind: "assumption", text: "  Latency is probably 200 ms.  ",
  });
  assert.ok(p.ok, p.ok ? "" : p.problem);
  assert.deepEqual(p.operations, [{
    op: "add-note", scope: "model", id: "service-flow",
    note: { kind: "assumption", text: "Latency is probably 200 ms.", author: "human", id: undefined, at: undefined },
  }]);

  // A relation note keeps whichever addressing the relation itself was written with.
  const byEnds = plan({
    form: "add-note",
    target: annotationTargetValue({
      kind: "relation", ref: { kind: "ends", model: "flow", from: "api", to: "gateway", type: "data_flow" },
    }),
    kind: "comment", text: "Direct flow only.",
  });
  assert.ok(byEnds.ok);
  assert.deepEqual(byEnds.operations[0], {
    op: "add-note", scope: "relation", model: "flow", from: "api", to: "gateway", type: "data_flow",
    note: { kind: "comment", text: "Direct flow only.", author: "human", id: undefined, at: undefined },
  });

  for (const req of [
    { form: "add-note", target: "", kind: "comment", text: "x" },
    { form: "add-note", target: "entity:api", kind: "warning", text: "x" },
    { form: "add-note", target: "entity:api", kind: "comment", text: "   " },
  ] satisfies EditRequest[]) {
    const bad = plan(req);
    assert.equal(bad.ok, false, `${JSON.stringify(req)} must be refused`);
    assert.ok((bad.ok ? "" : bad.problem).length > 12, "the refusal must be a sentence, not a code");
  }
});

test("the model-removal form sends one operation and no cascade", () => {
  // There is no cascade checkbox beside this one, unlike the element form, and that absence is the
  // decision: a model's relations are claims rather than dangling pointers, so nothing offers to
  // drop them for you.
  const p = plan({ form: "delete-model", model: "service-flow" });
  assert.ok(p.ok);
  assert.deepEqual(p.operations, [{ op: "delete-model", id: "service-flow" }]);
  assert.equal(plan({ form: "delete-model", model: " " }).ok, false);
});

test("a blank field is refused in the UI's own words, not the schema's", () => {
  // The transaction parser would say "'id' is required and must be a string", which is written for
  // an agent reading a schema. A person who left a box empty deserves the other sentence.
  const empty = plan({ form: "add-entity", id: "   ", type: "", label: "" });
  assert.equal(empty.ok, false);
  assert.match(empty.ok ? "" : empty.problem, /An entity needs an id/);
  assert.ok(!(empty.ok ? "" : empty.problem).includes("must be a string"));

  for (const req of [
    { form: "add-state", machine: "document", state: "" },
    { form: "add-relation", model: "flow", from: "api", to: "", type: "may_invoke" },
    { form: "set-label", id: "gateway", label: "" },
    { form: "set-property", id: "", name: "accepts", value: "public", valueKind: "string", domain: "", unset: false },
  ] satisfies EditRequest[]) {
    const p = plan(req);
    assert.equal(p.ok, false, `${req.form} with a blank field must be refused`);
    assert.ok((p.ok ? "" : p.problem).length > 12, "the refusal must be a sentence, not a code");
  }
});

test("a property's kind is explicit, and a value that is not of that kind is refused", () => {
  // Guessing between the string "3" and the number 3 is how a model acquires a fact nobody wrote.
  const int = plan({ form: "set-property", id: "api", name: "retries", value: "3", valueKind: "integer", domain: "", unset: false });
  assert.ok(int.ok);
  assert.deepEqual(int.operations, [{ op: "set-property", id: "api", name: "retries", value: 3, domain: undefined, unset: undefined }]);

  const text = plan({ form: "set-property", id: "api", name: "retries", value: "3", valueKind: "string", domain: "", unset: false });
  assert.ok(text.ok, "the same keystrokes as text must still plan");
  assert.deepEqual(text.operations,
    [{ op: "set-property", id: "api", name: "retries", value: "3", domain: undefined, unset: undefined }],
    "the same keystrokes as text must stay text");

  const real = plan({ form: "set-property", id: "api", name: "retries", value: "3.5", valueKind: "integer", domain: "", unset: false });
  assert.equal(real.ok, false, "values are finite and exact; a decimal is a refusal");

  const bool = plan({ form: "set-property", id: "api", name: "public", value: "yes", valueKind: "boolean", domain: "", unset: false });
  assert.equal(bool.ok, false, "'yes' is not a boolean, and coercing it would be inventing a fact");
});

test("clearing a property is a distinct operation from setting it to nothing", () => {
  const cleared = plan({ form: "set-property", id: "api", name: "accepts", value: "", valueKind: "string", domain: "", unset: true });
  assert.ok(cleared.ok);
  assert.deepEqual(cleared.operations, [{ op: "set-property", id: "api", name: "accepts", value: undefined, domain: undefined, unset: true }]);
});

test("a relation is addressed the way it was written: by id, or by its endpoints", () => {
  // Two forms because `delete-relation` takes either, and guessing would delete the wrong edge when
  // two relations share endpoints.
  const byId = plan({ form: "delete-relation", relation: relationValue({ kind: "id", model: "flow", id: "a-g" }) });
  assert.ok(byId.ok);
  assert.deepEqual(byId.operations, [{ op: "delete-relation", model: "flow", id: "a-g", from: undefined, to: undefined, type: undefined }]);

  const byEnds = plan({ form: "delete-relation", relation: relationValue({ kind: "ends", model: "flow", from: "api", to: "gateway", type: "may_invoke" }) });
  assert.ok(byEnds.ok);
  assert.deepEqual(byEnds.operations,
    [{ op: "delete-relation", model: "flow", id: undefined, from: "api", to: "gateway", type: "may_invoke" }]);

  assert.equal(plan({ form: "delete-relation", relation: "" }).ok, false);
});

test("the select encodings round-trip, and reject anything else", () => {
  for (const ref of [
    { kind: "entity", id: "api" },
    { kind: "state", machine: "document", state: "waiting" },
  ] as const) {
    assert.deepEqual(parseElementValue(elementValue(ref)), ref);
  }
  for (const ref of [
    { kind: "id", model: "flow", id: "a-g" },
    { kind: "ends", model: "flow", from: "api", to: "gateway", type: "may_invoke" },
  ] as const) {
    assert.deepEqual(parseRelationValue(relationValue(ref)), ref);
  }
  for (const junk of ["", "api", "entity:", "state:document", "rel:", "rel:id:flow", "rel:ends:flow:api"]) {
    assert.ok(parseElementValue(junk) === null || !junk.startsWith("entity"), `'${junk}' must not parse as an element`);
    assert.equal(parseRelationValue(junk), null, `'${junk}' must not parse as a relation`);
  }
  // Annotation targets span three namespaces in ONE select, so the encoding has to tell them apart.
  // A relation reuses the relation encoding rather than inventing a third spelling of the same ref.
  for (const target of [
    { kind: "entity", id: "api" },
    { kind: "model", id: "service-flow" },
    { kind: "relation", ref: { kind: "id", model: "flow", id: "a-g" } },
    { kind: "relation", ref: { kind: "ends", model: "flow", from: "api", to: "gateway", type: "may_invoke" } },
  ] as const) {
    assert.deepEqual(parseAnnotationTarget(annotationTargetValue(target)), target);
  }
  for (const junk of ["", "api", "model:", "machine:document", "state:document:waiting", "rel:id:flow"]) {
    assert.equal(parseAnnotationTarget(junk), null, `'${junk}' must not parse as an annotation target`);
  }
});

// --------------------------------------------------------------------------------------------
// The licensed choices
// --------------------------------------------------------------------------------------------

test("a control cannot offer a relation type the model system never declared", () => {
  const edit = vm().edit;
  assert.deepEqual([...edit.relationTypes.map((c) => c.value)].sort(), ["data_flow", "may_invoke", "owns"]);
  assert.ok(edit.relationTypes.every((c) => c.label.includes("—")),
    "the type's own description is what tells a user which to pick");
});

test("a relation's endpoints are narrowed to the chosen model's entities", () => {
  // `add-relation` does not add an entity to a model, so an edge between entities a model does not
  // contain is an edge no view of that model will ever draw.
  const edit = vm().edit;
  const flow = edit.modelEntities.get("service-flow");
  assert.ok(flow && flow.length > 0, "the model's own entity list must reach the form");
  const lifecycle = edit.modelEntities.get("document-lifecycle");
  if (lifecycle !== undefined) {
    assert.notDeepEqual(flow.map((c) => c.value).sort(), lifecycle.map((c) => c.value).sort(),
      "two models with different entity lists must offer different endpoints");
  }
  assert.ok(flow.every((c) => edit.entities.some((e) => e.value === c.value)),
    "every offered endpoint must be a declared system entity");
});

test("the deletable list spans both namespaces, and says which", () => {
  const elements = vm().edit.elements;
  assert.ok(elements.some((c) => c.value === "entity:gateway" && c.label.startsWith("Entity:")));
  assert.ok(elements.some((c) => c.value === "state:document:waiting" && c.label.startsWith("State:")));
});

test("a note may only be attached to something that can carry one", () => {
  // Entities, models and relations: the three objects the IR gives an `annotation` field. A machine
  // or a transition is not offered, because a note written there is dropped on the next load --
  // and a control that appears to work and silently loses the text is worse than no control.
  const edit = vm().edit;
  for (const prefix of ["Entity:", "Model:", "Relation:"]) {
    assert.ok(edit.annotatable.some((c) => c.label.startsWith(prefix)), `${prefix} must be offered`);
  }
  assert.ok(edit.annotatable.every((c) => parseAnnotationTarget(c.value) !== null),
    "every offered target must parse back into an addressable object");
  assert.ok(!edit.annotatable.some((c) => c.value.startsWith("machine:") || c.value.startsWith("state:")),
    "a machine and a state carry no annotation, so neither may be offered");
  // The kinds come from the closed set the transaction layer declares, so the form cannot offer one
  // the parser refuses.
  assert.deepEqual(edit.noteKinds.map((c) => c.value).sort(),
    ["assumption", "comment", "question", "rationale", "todo"]);
  // And the model form's entity hints are real declared ids, not free invention.
  assert.ok(edit.entityIds.length > 0 && edit.entityIds.every((id) => sys().entities.has(id)));
});

test("set-label offers all three namespaces it can address", () => {
  // The op takes a bare id and no scope, so an id naming both an entity and a machine is ambiguous
  // and the engine refuses it. Saying which namespace each choice came from is how a user sees that.
  const labelled = vm().edit.labelled;
  for (const prefix of ["Entity:", "Model:", "Machine:"]) {
    assert.ok(labelled.some((c) => c.label.startsWith(prefix)), `${prefix} must be offered`);
  }
});

// --------------------------------------------------------------------------------------------
// The diagram's subject
// --------------------------------------------------------------------------------------------

test("the diagram subject resolves from the select, from an agent's bare id, or defaults", () => {
  const s = sys();
  assert.deepEqual(resolveSubject(s, "machine:document"), { kind: "machine", id: "document" });
  assert.deepEqual(resolveSubject(s, "model:service-flow"), { kind: "model", id: "service-flow" });
  // `window.mage.view.focus` takes a bare id; both must land on the same subject.
  assert.deepEqual(resolveSubject(s, "document"), { kind: "machine", id: "document" });
  assert.deepEqual(resolveSubject(s, "service-flow"), { kind: "model", id: "service-flow" });
  // An unknown target falls back to something drawable rather than drawing nothing.
  const fallback = resolveSubject(s, "no-such-thing");
  assert.ok(fallback !== null && s.models.has(fallback.id));
  assert.deepEqual(resolveSubject(s, null), fallback);
  assert.equal(subjectValue({ kind: "machine", id: "document" }), "machine:document");
});

test("every drawable subject is offered, labelled by what it is", () => {
  const m = vm();
  const s = sys();
  assert.equal(m.subjects.length, s.models.size + s.machines.size);
  assert.ok(m.subjects.every((c) => c.label.startsWith("Model: ") || c.label.startsWith("Machine: ")));
  for (const c of m.subjects) {
    assert.ok(resolveSubject(s, c.value) !== null, `'${c.value}' must resolve to a subject`);
  }
});

// --------------------------------------------------------------------------------------------
// The renderer, bound
// --------------------------------------------------------------------------------------------

const ports: Ports = {
  engine: {
    graphQuery: (system, query) => runQuery(system, query).result,
    behaviorQuery: (system, query) => runQuery(system, query).result,
    explore: () => ({ configurations: [], exhaustive: false }),
  },
  render: { render: (system, request) => renderView(system, request) },
};

const loaded = (): Workspace => {
  const ws = new Workspace(ports);
  assert.ok(ws.load(readFileSync("examples/docable.mage.yaml", "utf8")).ok);
  return ws;
};

test("the bound render port returns a twin with substance, not an empty one", () => {
  // The port used to return `{ svg: "", accessible: { nodes: [], edges: [], summary: "" } }`, which
  // was honest while nothing was wired and would be a lie now. An empty twin beside a drawn diagram
  // is worse than no diagram: it looks finished and a screen-reader user gets nothing.
  const view = loaded().renderView({ subject: { kind: "machine", id: "document" } });
  assert.ok(view.svg.length > 0 && view.tree.tag === "svg");
  assert.ok(view.accessible.nodes.length > 0, "every node the picture draws must reach the twin");
  assert.ok(view.accessible.edges.length > 0);
  assert.match(view.accessible.summary, /state machine/);
  assert.ok(view.accessible.nodes.every((n) => n.description.length > 0),
    "a node with no sentence is a node a screen reader cannot hear");
  // The twin carries the hash of the system it depicts, so a view cannot outlive its model silently.
  assert.equal(view.accessible.systemHash, loaded().state.hash);
});

test("every drawn shape carries the class its own stylesheet styles", () => {
  // The defect this pins shipped a diagram of solid black boxes with near-black labels inside them.
  // `markAttrs` emitted a `class` key that landed after each shape's own class in the object
  // literal and replaced it with null for anything unemphasized -- which is most shapes -- so `el`
  // dropped the attribute and the renderer's inline stylesheet matched nothing.
  //
  // It survived every existing test because `render-svg.test.ts` asserts that each MARKS class has
  // a stylesheet RULE. Nothing asserted the class reaches the element. Mounting the renderer in a
  // page is what found it, so this is the test that would have.
  const view = loaded().renderView({ subject: { kind: "machine", id: "document" } });
  const shapes: { tag: string; cls: string }[] = [];
  const walk = (n: typeof view.tree): void => {
    if (n.tag === "rect" || n.tag === "polyline") {
      shapes.push({ tag: n.tag, cls: String(n.attrs["class"] ?? "") });
    }
    for (const c of n.children) walk(c);
  };
  walk(view.tree);
  assert.ok(shapes.length > 4, `expected drawn shapes, found ${shapes.length}`);
  for (const s of shapes) {
    assert.match(s.cls, /^mage-(box|region|state|edge)\b/,
      `a <${s.tag}> shipped with class '${s.cls}'; with no class SVG fills it black`);
  }
  // And the fill those classes carry must actually be in the document the page mounts.
  assert.match(view.svg, /\.mage-state \{ fill:/);
});

test("selection reaches the picture as a named emphasis, never as colour alone", () => {
  const view = loaded().renderView({
    subject: { kind: "model", id: "service-flow" },
    selection: ["gateway"],
  });
  const gateway = view.accessible.nodes.find((n) => n.id === "gateway");
  assert.deepEqual(gateway?.emphasis.map((e) => e.kind), ["selected"]);
  assert.ok(view.accessible.legend.some((l) => l.kind === "selected"),
    "an emphasis used in the picture must appear in the legend, where its meaning is stated");
});

test("positions round-trip, so adding one node does not re-rank the world", () => {
  const ws = loaded();
  const first = ws.renderView({ subject: { kind: "machine", id: "document" } });
  const second = ws.renderView({ subject: { kind: "machine", id: "document" }, hints: first.positions });
  for (const [id, point] of first.positions) {
    assert.deepEqual(second.positions.get(id), point, `${id} moved despite being hinted`);
  }
});

// --------------------------------------------------------------------------------------------
// UX-I3: the human edit path and the agent edit path are one path
// --------------------------------------------------------------------------------------------

/**
 * The envelope `main.ts` builds, with `rationale` OMITTED rather than null.
 *
 * Written as null first, which rejected every edit: the schema types `rationale` as a string and
 * the parser refuses a present-but-non-string value, so the transaction came back complaining about
 * the rationale instead of applying the operation. The schema is right and the call site was wrong.
 */
const envelope = (base: string, operations: readonly unknown[], target = "main") =>
  ({ transaction: { base, target, operations } });

test("an operation planned from form input COMMITS through the same service window.mage calls", () => {
  // This is the whole UX-I3 claim, end to end and without a browser: what a click produces is a
  // transaction object, and the object goes to `Workspace.transact` -- the identical call
  // `window.mage.transact` makes. A second mutation path could not pass this test, because there
  // would be nothing here to hand the object to.
  const ws = loaded();
  const before = ws.state.hash;
  const p = planEdit({ form: "set-label", id: "gateway", label: "Public Model Gateway" });
  assert.ok(p.ok);
  const result = ws.transact(envelope(before, p.operations));
  assert.ok(result.ok, `expected a commit, got: ${result.findings.map((f) => f.message).join("; ")}`);
  assert.equal(ws.state.system.entities.get("gateway")?.label, "Public Model Gateway");
  assert.notEqual(ws.state.hash, before);
});

test("a rejected edit changes nothing and hands back findings to show the user", () => {
  // A control that did nothing and said nothing is the failure; the findings are what make the
  // difference between "rejected, and here is why" and a dead button.
  const ws = loaded();
  const before = ws.state.hash;
  const p = planEdit({ form: "add-entity", id: "gateway", type: "", label: "" });
  assert.ok(p.ok, "the UI cannot know the id is taken; the engine is what refuses it");
  const result = ws.transact(envelope(before, p.operations));
  assert.equal(result.ok, false);
  assert.ok(result.findings.length > 0, "a rejection must carry the findings that explain it");
  assert.equal(ws.state.hash, before, "a rejected transaction leaves the system unchanged");
});

test("the same planned operation opens a hypothesis, and discarding it restores the model", () => {
  const ws = loaded();
  const before = ws.state.hash;
  const p = planEdit({ form: "add-entity", id: "cache", type: "service", label: "Cache" });
  assert.ok(p.ok);

  const opened = ws.openHypothesis("add a cache", envelope(before, p.operations, "add a cache"));
  assert.ok(opened.ok, `expected the hypothesis to open, got: ${opened.findings.map((f) => f.message).join("; ")}`);
  assert.equal(ws.state.hypothesis, "add a cache");
  assert.ok(ws.state.system.entities.has("cache"), "the branch must show the proposed change");

  // And the banner must SAY it, in words, not only tint the page.
  const live = buildViewModel(ws.state.system, ws.state.findings, new Map(),
    { hypothesis: ws.state.hypothesis, currentHash: ws.state.hash, selection: [] });
  assert.equal(live.hypothesis, "add a cache");
  assert.match(live.banner?.text ?? "", /authoritative model is unchanged/);

  assert.ok(ws.discardHypothesis());
  assert.equal(ws.state.hypothesis, null);
  assert.equal(ws.state.hash, before, "the authoritative model was never touched");
  assert.ok(!ws.state.system.entities.has("cache"));
});

test("the model form's two operations commit as one act through the same service", () => {
  // UX-I3 for the only form that sends a pair. What the click produces is one transaction object,
  // and it goes to the same `Workspace.transact` `window.mage.transact` calls -- so the model and
  // its question arrive together or not at all.
  const ws = loaded();
  const p = planEdit({
    form: "add-model", id: "ownership", label: "Ownership",
    question: "Who owns the parser?", entities: "remediation, parser",
  });
  assert.ok(p.ok);
  const result = ws.transact(envelope(ws.state.hash, p.operations));
  assert.ok(result.ok, `expected a commit, got: ${result.findings.map((f) => f.message).join("; ")}`);

  const m = ws.state.system.models.get("ownership");
  assert.equal(m?.purpose.question, "Who owns the parser?");
  assert.deepEqual(m?.entities, ["remediation", "parser"]);
});

test("the note form reaches the service, and the revision does not move (A1)", () => {
  // The human half of the invariant. A person attaching a note through the UI must get the same
  // outcome an agent gets through `transact`: a commit, and a hash that stands still. If the hash
  // moved here, every pending agent transaction would be invalidated by someone typing a comment.
  const ws = loaded();
  const before = ws.state.hash;
  const p = planEdit({
    form: "add-note", target: annotationTargetValue({ kind: "entity", id: "gateway" }),
    kind: "assumption", text: "Public-only, as far as we know.",
  });
  assert.ok(p.ok);
  assert.ok(ws.transact(envelope(before, p.operations)).ok);

  assert.equal(ws.state.hash, before, "the human path moved the hash: A1 is broken in the UI");
  const notes = ws.state.system.entities.get("gateway")?.annotation.notes ?? [];
  assert.equal(notes[0]?.text, "Public-only, as far as we know.");
  assert.equal(notes[0]?.author, "human");
  // And the inspector shows it as a note, under its own label, never as a finding.
  const row = buildViewModel(ws.state.system, ws.state.findings, new Map(),
    { hypothesis: null, currentHash: ws.state.hash, selection: [] })
    .sections.flatMap((s) => s.rows).find((r) => r.id === "gateway");
  assert.equal(row?.notes[0]?.text, "Public-only, as far as we know.");
  assert.match(row?.notesCaveat ?? "", /context, not a constraint/);
});

test("the model-removal form is refused while the model still asserts a claim", () => {
  // The refusal a person sees, with the findings that explain it -- not a dead button.
  const ws = loaded();
  const before = ws.state.hash;
  const p = planEdit({ form: "delete-model", model: "service-flow" });
  assert.ok(p.ok);
  const result = ws.transact(envelope(before, p.operations));
  assert.equal(result.ok, false);
  assert.equal(result.findings.length, 3, "one finding per claim the deletion would have taken");
  assert.equal(ws.state.hash, before);
  assert.ok(ws.state.system.models.has("service-flow"));
});

test("committing a hypothesis makes it authoritative", () => {
  const ws = loaded();
  const p = planEdit({ form: "add-entity", id: "cache", type: "service", label: "Cache" });
  assert.ok(p.ok);
  assert.ok(ws.openHypothesis("add a cache", envelope(ws.state.hash, p.operations, "add a cache")).ok);
  assert.ok(ws.applyHypothesis());
  assert.equal(ws.state.hypothesis, null);
  assert.ok(ws.state.system.entities.has("cache"), "accepting keeps the change");
});

// --------------------------------------------------------------------------------------------
// The page contract
// --------------------------------------------------------------------------------------------

test("every element main.ts requires is present in index.html", () => {
  // `byId` throws at module load when an id is missing, so a typo here does not break one control:
  // it blanks the whole application before the first paint. Nothing else catches that headlessly.
  const main = readFileSync("src/ui/main.ts", "utf8");
  const html = readFileSync("index.html", "utf8");
  const wanted = new Set([...main.matchAll(/\b(?:byId|sel|txt|box)(?:<[^>]*>)?\("([a-z0-9-]+)"\)/g)]
    .map((m) => m[1] as string));
  // The fieldset ids are a list mapped over byId, so they are not call sites the pattern above sees.
  for (const m of main.matchAll(/"(form-[a-z-]+|edit-mode)"/g)) wanted.add(m[1] as string);
  assert.ok(wanted.size > 20, `expected to find the element ids, found ${wanted.size} — the scan is wrong`);

  const present = new Set([...html.matchAll(/id="([a-zA-Z0-9-]+)"/g)].map((m) => m[1] as string));
  const missing = [...wanted].filter((id) => !present.has(id)).sort();
  assert.deepEqual(missing, [], `index.html is missing: ${missing.join(", ")}`);
});

test("the diagram stays last in document order, below the structural sections", () => {
  // FR-A11Y-2: model editing and query execution must be possible without touching the canvas, so
  // the prose is the authoritative account and the picture is the convenience. Promoting the canvas
  // to make a screenshot look better is the regression this pins.
  const html = readFileSync("index.html", "utf8");
  const at = (id: string): number => {
    const i = html.indexOf(`id="${id}"`);
    assert.notEqual(i, -1, `index.html has no #${id}`);
    return i;
  };
  for (const id of ["model", "edit", "questions", "findings"]) {
    assert.ok(at(id) < at("diagram"), `#${id} must come before the diagram`);
  }
  assert.ok(at("diagram-text") < at("canvas"), "the twin must precede the picture it describes");
  assert.match(html.slice(at("canvas") - 200, at("canvas") + 200), /aria-hidden="true"/,
    "the canvas is hidden from assistive technology because the twin above is the representation");
});

test("every control added for editing is labelled and keyboard-operable", () => {
  // A bare icon button is unusable with a screen reader, and a div that listens for clicks is
  // unreachable by keyboard. Native button/input/select with a <label for> is the cheap way to have
  // both, so this asserts the markup rather than trusting it.
  const html = readFileSync("index.html", "utf8");
  const controls = [...html.matchAll(/<(?:input|select)\b[^>]*\bid="([a-z0-9-]+)"/g)];
  assert.ok(controls.length > 15, `expected the form controls, found ${controls.length}`);
  for (const match of controls) {
    const id = match[1] as string;
    if (html.includes(`for="${id}"`)) continue;
    // A control wrapped in its <label> is labelled too — the header's file input is written that
    // way. Nearest preceding tag wins: an open <label> closer than the last </label> means nested.
    const before = html.slice(0, match.index);
    assert.ok(before.lastIndexOf("<label") > before.lastIndexOf("</label>"),
      `#${id} has neither a <label for> nor an enclosing <label>`);
  }
  // Buttons carry text, not only an id, and are real buttons.
  const buttons = [...html.matchAll(/<button\b[^>]*>([^<]*)</g)].map((m) => (m[1] ?? "").trim());
  assert.ok(buttons.length > 7, `expected the buttons, found ${buttons.length}`);
  for (const text of buttons) {
    assert.ok(text.length > 2, "a button needs an accessible name, and its text is the cheapest one");
  }
  assert.ok(!/<div[^>]*onclick/i.test(html), "a clickable div is not keyboard-operable");
});
