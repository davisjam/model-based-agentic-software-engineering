// Annotation and provenance.
//
// The whole feature rests on ONE invariant:
//
//   A1 — Annotations SHALL NOT alter the semantic interpretation or analysis result of a model
//        unless their content is explicitly represented by a semantic construct.
//
// It is held STRUCTURALLY rather than by discipline: `systemHash` projects semantics only, and
// annotation is not in the projection. These tests prove that, because "we were careful" is not a
// control. Context can be abundant; formal commitment is deliberate.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { runQuery } from "../src/engine/index.ts";

const base = `
mage: 1
system: { id: a }
relation-types:
  may_invoke:
    description: permitted invocation
    composition: { path: allowed }
entities:
  api: { type: service }
  gateway: { type: service }
models:
  flow:
    type: graph
    entities: [api, gateway]
    relations:
      - { id: a-g, from: api, to: gateway, type: may_invoke }
`;

/** The same model, heavily annotated, including an assumption that LOOKS semantic. */
const annotated = `
mage: 1
system: { id: a }
relation-types:
  may_invoke:
    description: permitted invocation
    composition: { path: allowed }
entities:
  api:
    type: service
    notes:
      - { id: n1, kind: rationale, text: "The entry point, modelled as one service deliberately." }
  gateway:
    type: service
    notes:
      - { id: n2, kind: assumption, text: "Gateway latency is probably 200 ms." }
      - { id: n3, kind: todo, text: "Confirm whether this accepts restricted content." }
    provenance:
      created_by: agent
      created_at: "2026-10-02T14:32:00-04:00"
      prompt: Model the minimum service relationships needed to reach the gateway.
      rationale: Permitted invocation, not observed calls.
      history:
        - { revision: "fnv1a64:1111111111111111", actor: agent, prompt: initial sketch }
        - { revision: "fnv1a64:2222222222222222", actor: human, action: accepted-agent-hypothesis }
models:
  flow:
    type: graph
    entities: [api, gateway]
    notes:
      - { id: n4, kind: question, text: "Should observed calls be a second model?" }
    provenance:
      created_by: agent
      prompt: Build the smallest model that answers the reachability question.
    relations:
      - id: a-g
        from: api
        to: gateway
        type: may_invoke
        notes:
          - { kind: rationale, text: "may-invoke rather than invokes -- a permission, not an observation." }
`;

const sys = (text: string) => canonicalize(parse(text));

test("A1: annotation does not change the semantic revision", () => {
  // The structural half of the invariant. If this fails, adding a note would invalidate every
  // pending agent transaction -- the same reason view positions stay out of the IR.
  assert.equal(systemHash(sys(annotated)), systemHash(sys(base)),
    "two systems differing ONLY in annotation must be the same system");
});

test("A1: an assumption note cannot change a query result", () => {
  // n2 says "Gateway latency is probably 200 ms". A note saying something is an assumption does NOT
  // make the assumption part of formal analysis. To constrain a query it must be represented
  // formally -- as a property, variable, guard or quantity.
  const q = {
    kind: "graph", quantifier: "exists",
    graph: { form: "reachability", relation: "may_invoke", from: "api", to: "gateway" },
  };
  const plain = runQuery(sys(base), q).result;
  const noted = runQuery(sys(annotated), q).result;
  assert.equal(noted.outcome, plain.outcome);
  assert.equal(noted.systemHash, plain.systemHash, "the result describes the same system");
  assert.deepEqual(noted.coverage, plain.coverage);
});

test("annotation IS preserved and inspectable -- non-semantic is not the same as discarded", () => {
  const s = sys(annotated);
  const gw = s.entities.get("gateway");
  assert.ok(gw);
  assert.equal(gw.annotation.notes.length, 2);
  assert.deepEqual(gw.annotation.notes.map((n) => n.kind), ["assumption", "todo"]);
  assert.match(gw.annotation.notes[0]?.text ?? "", /probably 200 ms/);

  // The prompt is the field that earns provenance its place: it answers why the model has this
  // shape, which reading the model cannot tell you.
  assert.equal(gw.annotation.provenance?.createdBy, "agent");
  assert.match(gw.annotation.provenance?.prompt ?? "", /minimum service relationships/);
  assert.equal(gw.annotation.provenance?.history.length, 2);
  assert.equal(gw.annotation.provenance?.history[1]?.action, "accepted-agent-hypothesis");
});

test("annotation attaches below model level, including on a relation", () => {
  const s = sys(annotated);
  assert.equal(s.models.get("flow")?.annotation.notes[0]?.kind, "question");
  const rel = s.relations.find((r) => r.id === "a-g");
  assert.match(rel?.annotation.notes[0]?.text ?? "", /a permission, not an observation/);
});

test("an unknown note kind degrades to comment rather than being invented", () => {
  const s = sys(`mage: 1
system: { id: a }
entities:
  e:
    notes: [{ id: x, kind: wishful-thinking, text: hello }]
`);
  assert.equal(s.entities.get("e")?.annotation.notes[0]?.kind, "comment");
});

test("a note with no text is DROPPED, not kept as an empty one", () => {
  // Annotation that cannot be read is better absent than present-and-meaningless.
  const s = sys(`mage: 1
system: { id: a }
entities:
  e:
    notes: [{ id: x, kind: comment }, { id: y, kind: comment, text: real }]
`);
  const notes = s.entities.get("e")?.annotation.notes ?? [];
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.id, "y");
});

test("an object with no annotation shares the single empty value", () => {
  // Cheap, and it makes "has this anything attached?" an identity check at every call site.
  const s = sys(base);
  assert.equal(s.entities.get("api")?.annotation, s.entities.get("gateway")?.annotation);
  assert.deepEqual(s.entities.get("api")?.annotation.notes, []);
});

test("a note carrying an unexpected key is reported -- the comma-in-flow-style trap", () => {
  // YAML flow style terminates an unquoted value at a comma, so
  //   { kind: rationale, text: a permission, not an observation }
  // loads as text "a permission" plus a STRAY KEY "not an observation". The note survives, silently
  // truncated, and nothing complains. That happened in this very test file, which is how it was
  // found -- and it is exactly what a user writing a note with a comma will hit.
  const s = sys(`mage: 1
system: { id: a }
entities:
  e:
    notes:
      - { kind: comment, text: one thing, and another }
`);
  const notes = s.entities.get("e")?.annotation.notes ?? [];
  assert.equal(notes[0]?.text, "one thing", "the value really is truncated at the comma");
  // The hardening: canonicalize records the leftover keys so the validator can report them.
  assert.deepEqual(notes[0]?.unexpectedKeys, ["and another"],
    "a stray key is the signature of an unquoted comma and must not be swallowed");
});
