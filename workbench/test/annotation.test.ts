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
import { annotationHash, systemHash } from "../src/ir/hash.ts";
import { runQuery } from "../src/engine/index.ts";
import { checkAnnotation, checkMeaning } from "../src/validator/rules.ts";

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

test("annotationHash is the COMPLEMENT of systemHash, and it sees what no count can", () => {
  // The other half of A1, and the reason it has a function at all. Keeping annotation out of the
  // semantic hash is correct and it leaves one class of commit invisible: an `add-note` moves
  // nothing `systemHash` projects, so the shell's announcer -- the channel FR-A11Y-3 requires for
  // agent actions -- has no semantic diff to describe. Its first detector counted PROVENANCE
  // RECORDS, which cannot see a note at all (a note lands in `notes`; a record needs a declared
  // `provenance` block) and cannot see a SECOND note on an object under any encoding. So the two
  // digests are a pair: one must stand still across an annotation edit and the other must move.
  assert.notEqual(annotationHash(sys(annotated)), annotationHash(sys(base)),
    "two systems differing ONLY in annotation must have different annotation digests, or the "
    + "announcer has nothing to detect an annotation-only commit with");

  // A SECOND note on an object that already carries one. This is the case the count could not
  // reach: no object becomes newly annotated, so every count of annotated objects stands still.
  const twice = annotated.replace(
    `      - { id: n1, kind: rationale, text: "The entry point, modelled as one service deliberately." }`,
    `      - { id: n1, kind: rationale, text: "The entry point, modelled as one service deliberately." }
      - { id: n1b, kind: comment, text: "A second note on the object that already carried one." }`,
  );
  assert.notEqual(twice, annotated, "the fixture edit did not apply -- the anchor line moved");
  assert.equal(systemHash(sys(twice)), systemHash(sys(annotated)),
    "a second note moved the semantic revision, so A1's structural half has broken");
  assert.equal(
    [...sys(twice).entities.values()].filter((e) => e.annotation.provenance !== null).length,
    [...sys(annotated).entities.values()].filter((e) => e.annotation.provenance !== null).length,
    "the fixture does not reproduce the residue: the provenance-record count moved, so a counting "
    + "detector would have caught this case and the digest would be unnecessary",
  );
  assert.notEqual(annotationHash(sys(twice)), annotationHash(sys(annotated)),
    "a second note on an already-annotated object left the annotation digest unmoved -- the "
    + "detector is watching a proxy again");
});

test("annotationHash is not a transaction base: a SEMANTIC edit need not move it", () => {
  // Stated as a test because the two digests are easy to confuse once both exist. `matchesBase`
  // compares `systemHash`; an annotation-sensitive base would make attaching a note invalidate
  // every pending agent transaction, which is exactly what A1 exists to prevent.
  const extra = `${base}\nquantities: []\n`;
  assert.equal(annotationHash(sys(extra)), annotationHash(sys(base)),
    "the annotation digest moved on a change that carries no annotation");
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

const strayKeyDoc = `mage: 1
system: { id: a }
relation-types:
  may_invoke:
    description: permitted invocation
    composition: { path: allowed }
entities:
  api:
    type: service
    notes:
      - { id: n1, kind: comment, text: one thing, and another }
  gateway: { type: service }
models:
  flow:
    type: graph
    entities: [api, gateway]
    notes:
      - { kind: question, text: a question, with a comma }
    relations:
      - id: a-g
        from: api
        to: gateway
        type: may_invoke
        notes:
          - { kind: rationale, text: a permission, not an observation }
`;

test("ANNOTATION reports the truncated note and names the stray key", () => {
  // Carried is not the same as unchecked. The finding has to name the key, because the fix is to
  // quote the value and the author needs to know which text got cut.
  const found = checkAnnotation(sys(strayKeyDoc));
  assert.deepEqual(found.map((f) => f.rule), ["ANNOTATION", "ANNOTATION", "ANNOTATION"]);
  const api = found.find((f) => f.where.startsWith("entities."));
  assert.equal(api?.where, "entities.api.notes.n1");
  assert.match(api?.message ?? "", /'and another'/);
  assert.match(api?.message ?? "", /reads 'one thing'/);

  // All three annotation levels are swept. A note with no declared id is addressed by the
  // positional fallback canonicalize assigns it; a relation is addressed by its id, not an index,
  // because the IR flattens and re-sorts relations across models.
  assert.deepEqual(found.map((f) => f.where).sort(), [
    "entities.api.notes.n1",
    "models.flow.notes.note-1",
    "models.flow.relations.a-g.notes.note-1",
  ]);
});

test("ANNOTATION is not a semantic rule, and the meaning pass does not claim it", () => {
  // A1 again, this time about the validator's own shape: the pass that fixes meaning must stay
  // silent here, or the finding id would contradict the invariant the feature is built on.
  assert.deepEqual(checkMeaning(sys(strayKeyDoc)), []);
});

test("a well-formed note produces no finding", () => {
  assert.deepEqual(checkAnnotation(sys(annotated)), []);
  assert.deepEqual(checkAnnotation(sys(base)), []);
});
