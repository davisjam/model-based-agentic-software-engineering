// `requirements:` as an AUTHORED construct: the schema key, the IR, the hash, and the round trip.
//
// `test/verification.test.ts` holds the three layers — a query says holds/refuted, a requirement
// declares `satisfied_when`, verification interprets the pair — against raw declarations handed
// straight to `parseRequirement`. That was the only surface available while the construct was not
// authorable, and it leaves the question this file answers untouched: can a student WRITE one, and
// does what they wrote survive a load, a verification, an export, and a reload?
//
// The gap was measurable rather than arguable. `src/engine/verification.ts` has carried §5.3's
// vocabulary since 261004, and `mage-model.schema.json` had twelve top-level keys, none of them
// `requirements` — so the engine knew what a requirement MEANS and no document could contain one.
// The example corpus said so in its own file, in a header that is now gone: *"MAGE v0.1 has NO
// requirement construct ... A requirement is therefore carried here"* (`test/fixtures/examples/message-bus/
// expected-results.yaml`, at 5ed8975a). Quoted from history, not from the tree — the migration on
// 261005 moved every shipped example's declaration into its model, so the corpus no longer says it.
//
// ## What is pinned, and why each one earns its place
//
//   1. **The schema and the engine move together** — not asserted as two matching lists, which is a
//      restatement, but DRIVEN: each key the schema requires is deleted from an authored document in
//      turn, and the verification must become `error`. A required key the engine ignores fails here.
//   2. **The map key is the identity**, hoisted into the mapping the engine reads, so one reader
//      serves the authored map and the fixture corpus's array of self-identifying mappings.
//   3. **Query polarity survives** the whole path. The authored `expressed_as` names the POSITIVE
//      breach query, whose `holds` IS the violation, and the query's own text is byte-identical in
//      the exported document — there is no negated copy, because the schema declares nowhere to put
//      one.
//   4. **The declaration hashes; the status does not exist to hash.**
//   5. **The round trip declares what the engine answered about.** This is the clause that passed
//      silently before the membership fix (`test/model-membership.test.ts:187`), asked of the new
//      construct: the engine may not answer about an obligation the reloaded bytes do not carry.
//   6. **The accusing arm stays shut.** A dangling `expressed_as`, a prescribed non-proposition, and
//      a declined question each read as something other than `violated` — because a false accusation
//      is the worst answer available and the only one an engineer will act on wrongly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse, stringify } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { validate } from "../src/validator/rules.ts";
import { MageDocument } from "../src/yaml/document.ts";
import { runSavedQueries, verifySystemRequirements } from "../src/engine/index.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";
import type { Verification } from "../src/engine/verification.ts";

const SCHEMA = "mage-model.schema.json";

const QUERY = "restricted-data-reaches-impermitted-subscriber";
const REQUIREMENT = "no-restricted-data-to-an-impermitted-subscriber";

/**
 * A model that authors the construct, in the shape message-bus carries in its fixture.
 *
 * Small on purpose and not a shipped example: P0 holds that an example may USE the construct and
 * must not know about it specially. Message-bus's declaration DID move out of its fixture on 261005,
 * and this probe stays anyway — the shipped example exercises the construct, while this file drives
 * the paths a shipped example must not have to exhibit: a required key deleted in turn, a dangling
 * join, a prescribed non-proposition. The shape is the shipped one — an ordered-enum sensitivity
 * domain, a service that permits less than the event it subscribes to, and an existential `direct`
 * query whose `where` compares the two — so the polarity under test is the polarity that ships.
 *
 * `permits: internal` under `carries: restricted` makes the breach query HOLD, so the requirement is
 * VIOLATED. A fixture that shipped `satisfied` would never exercise the accusing arm, which is the
 * same choice message-bus made and for the same reason.
 */
const AUTHORED = `mage: 1

system:
  id: authored-requirement-probe
  name: Authored requirement probe

domains:
  sensitivity:
    type: ordered-enum
    values: [public, internal, restricted]
    description: Ascending sensitivity.

relation-types:

  subscribes:
    description: The design permits the service to receive this event type.
    absence: >
      No subscription is represented. The service may still reach the payload another way.
    composition:
      path: forbidden
    properties:
      symmetric: false

entities:

  analytics:
    type: service
    label: Analytics
    properties:
      permits: { value: internal, domain: sensitivity }

  order-created:
    type: event-type
    label: OrderCreated
    properties:
      carries: { value: restricted, domain: sensitivity }

models:

  data-policy:
    type: graph
    label: Data policy
    purpose:
      question: >
        Which services are permitted to receive which event types, and at what sensitivity?
      represents: [service, event type, subscription, sensitivity]
      omits:
        - when an event was actually delivered
    entities: [analytics, order-created]
    relations:
      - { from: analytics, to: order-created, type: subscribes }

queries:

  # \`holds\` here IS the safety violation: the question is existential, so a witness is a breach.
  ${QUERY}:
    name: An event carrying restricted data reaches a service not permitted to process it
    kind: graph
    quantifier: exists
    graph:
      form: direct
      relation: subscribes
      where:
        compare:
          - left: source.permits
            op: lt
            right: target.carries

requirements:

  ${REQUIREMENT}:
    statement: >
      No event type carrying data above a service's permitted sensitivity may be delivered to that
      service.
    expressed_as: ${QUERY}
    satisfied_when: refuted
`;

/** The one line that repairs the system under design: Analytics is permitted restricted data. */
const REPAIRED = (): string => {
  const from = "permits: { value: internal, domain: sensitivity }";
  assert.ok(AUTHORED.includes(from), "the repair's search text no longer matches the fixture");
  return AUTHORED.replace(from, "permits: { value: restricted, domain: sensitivity }");
};

const loaded = (text: string): CanonicalSystem => {
  const r = MageDocument.load(text);
  assert.ok(r.document !== null, `the document did not load: ${JSON.stringify(r.findings)}`);
  const system = r.document.seal().system();
  assert.deepEqual(validate(system), [],
    "the fixture must validate clean, or every verdict below describes a broken model");
  return system;
};

const verified = (text: string): Verification => {
  const all = verifySystemRequirements(loaded(text));
  const v = all.get(REQUIREMENT);
  assert.ok(v !== undefined, `no verification for '${REQUIREMENT}'; the IR dropped the declaration`);
  return v;
};

/** The authored document as a mutable object, for the deletion drive below. */
const asObject = (): Record<string, unknown> => parse(AUTHORED) as Record<string, unknown>;

/**
 * The requirement's own mapping inside a parsed document, for a test that is about to break it.
 *
 * Asserted non-null rather than optional-chained, because a missing block means the FIXTURE moved
 * and every mutation below would then be a no-op passing for a result.
 */
function block(doc: Record<string, unknown>): Record<string, unknown> {
  const map = doc["requirements"];
  assert.ok(typeof map === "object" && map !== null, "the fixture authors no requirements block");
  const one = (map as Record<string, unknown>)[REQUIREMENT];
  assert.ok(typeof one === "object" && one !== null, `the fixture authors no '${REQUIREMENT}'`);
  return one as Record<string, unknown>;
}

// ----------------------------------------------------------------------------------------------
// 1. The schema and the engine move together
// ----------------------------------------------------------------------------------------------

test("the schema declares requirements as an id-keyed map, the convention queries already uses", () => {
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as {
    readonly properties: Readonly<Record<string, {
      readonly propertyNames?: unknown;
      readonly additionalProperties?: { readonly required?: readonly string[] };
    }>>;
  };
  const requirements = schema.properties["requirements"];
  assert.ok(requirements !== undefined,
    "mage-model.schema.json declares no top-level `requirements`, so nothing a student writes can "
    + "reach `CanonicalSystem.requirements` — the gap this file exists about");

  // The MAP form, not an array of self-identifying mappings. Two ids cannot collide in a mapping, so
  // the duplicate-id case is unrepresentable rather than a finding somebody has to raise. The
  // fixture corpus uses the array form because `expected-results.yaml` answers to no schema.
  assert.deepEqual(requirements.propertyNames, { $ref: "#/$defs/id" },
    "requirements is not keyed by `#/$defs/id`, so its keys are not the identity namespace's shape");
  assert.deepEqual(schema.properties["queries"]?.propertyNames, requirements.propertyNames,
    "requirements and queries no longer agree on how an id-keyed collection is spelled");
});

test("every key the schema REQUIRES is one the engine refuses to proceed without", () => {
  // Driven rather than restated. A list compared against a list is satisfied by two copies of the
  // same mistake; deleting each required key in turn and watching the verification change is the
  // parity claim with a failure mode. A required key the engine ignores shows up here as a
  // requirement that still verifies, which is the drift "schema and TS move together" names.
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as {
    readonly properties: { readonly requirements: {
      readonly additionalProperties: { readonly required: readonly string[] };
    } };
  };
  const required = schema.properties.requirements.additionalProperties.required;
  assert.ok(required.length > 0, "the schema requires nothing of a requirement, so it shapes nothing");

  assert.equal(verified(AUTHORED).status, "violated", "the intact fixture must reach a verdict");

  for (const key of required) {
    const doc = asObject();
    const one = block(doc);
    assert.ok(key in one, `the fixture does not author '${key}', so deleting it proves nothing`);
    delete one[key];

    const v = verifySystemRequirements(canonicalize(doc)).get(REQUIREMENT);
    assert.ok(v !== undefined, `dropping '${key}' dropped the declaration entirely`);
    assert.equal(v.status, "error",
      `a requirement missing the schema-required '${key}' still verifies as '${v.status}'. The `
      + `schema demands the key and the engine does not, so one of the two is wrong — and if the `
      + `key is genuinely optional it does not belong in \`required\`.`);
  }
});

// ----------------------------------------------------------------------------------------------
// 2. The construct reaches the IR, and the key is the identity
// ----------------------------------------------------------------------------------------------

test("the authored declaration reaches the IR keyed by the map key, hoisted into what the engine reads", () => {
  const system = loaded(AUTHORED);
  assert.deepEqual([...system.requirements.keys()], [REQUIREMENT],
    "the authored requirement is not in the IR");
  const declared = system.requirements.get(REQUIREMENT);
  assert.ok(declared !== undefined);
  assert.equal(declared.id, REQUIREMENT);

  // The hoist is what lets ONE reader serve two surfaces. `parseRequirement` reads `id` out of the
  // mapping because the fixture corpus writes it there; the authored map puts it in the key.
  const raw = declared.raw as Record<string, unknown>;
  assert.equal(raw["id"], REQUIREMENT,
    "the map key was not hoisted into the mapping, so `parseRequirement` reads no id and every "
    + "authored requirement verifies as `error`");
  assert.equal(raw["satisfied_when"], "refuted", "the authored satisfaction condition did not survive");
});

test("the map key WINS over an inner id, so one declaration cannot answer to two names", () => {
  // Reached through `canonicalize` rather than through a document, because the schema forbids an
  // inner `id:` outright (`additionalProperties: false`) — so this is the repair for a document that
  // got here some other way: an agent API call, a hand-built object, a future loader. The key is the
  // identity, and a mapping that disagrees with its own key does not get to pick.
  const doc = asObject();
  block(doc)["id"] = "some-other-requirement";

  const system = canonicalize(doc);
  const declared = system.requirements.get(REQUIREMENT);
  assert.ok(declared !== undefined, "the declaration moved to the inner id, which is not its key");
  assert.equal((declared.raw as Record<string, unknown>)["id"], REQUIREMENT,
    "the inner id won, so the IR's key and the engine's verification name two different things and "
    + "a surface joining on either would silently disagree with one joining on the other");
});

test("a non-object requirement value is passed through, not defaulted into an obligation", () => {
  const doc = asObject();
  (doc["requirements"] as Record<string, unknown>)[REQUIREMENT] = "must not happen";

  const v = verifySystemRequirements(canonicalize(doc)).get(REQUIREMENT);
  assert.ok(v !== undefined, "a malformed declaration was dropped; a dropped requirement reads green");
  assert.equal(v.status, "error",
    "a string where a mapping belongs is a declaration that cannot be read, and the only honest "
    + "status for it is `error` — manufacturing a mapping here would invent an obligation nobody wrote");
});

// ----------------------------------------------------------------------------------------------
// 3. The declaration hashes; the verification does not exist to hash
// ----------------------------------------------------------------------------------------------

test("prescribing something changes the system; the satisfaction condition is part of what changes", () => {
  const withRequirement = systemHash(loaded(AUTHORED));

  const without = asObject();
  delete without["requirements"];
  assert.notEqual(systemHash(canonicalize(without)), withRequirement,
    "a system that prescribes a prohibition hashes the same as one that prescribes nothing, so a "
    + "transaction based on the second would apply to the first");

  // Polarity is semantic, so flipping it is a different system. This is the field that decides
  // whether `holds` accuses or discharges, and a hash blind to it would let an edit invert every
  // verdict while leaving a pending transaction applicable.
  const flipped = asObject();
  block(flipped)["satisfied_when"] = "holds";
  assert.notEqual(systemHash(canonicalize(flipped)), withRequirement,
    "`satisfied_when: holds` hashes the same as `refuted`, and those two systems disagree about "
    + "whether the shipped model is in breach");

  const reworded = asObject();
  block(reworded)["statement"] = "Restricted data must not reach an impermitted subscriber.";
  assert.notEqual(systemHash(canonicalize(reworded)), withRequirement,
    "the obligation's own prose is authored content and must hash with the rest of it");
});

test("the status is nowhere in the IR to hash, and the same bytes verify the same way twice", () => {
  // The exclusion is structural rather than a field omitted from the hash: there is no status to
  // omit. `SavedRequirement` carries `id` and `raw`, and `raw` is what the author wrote.
  const system = loaded(AUTHORED);
  const declared = system.requirements.get(REQUIREMENT);
  assert.ok(declared !== undefined);
  assert.deepEqual(Object.keys(declared).sort(), ["id", "raw"],
    "`SavedRequirement` grew a field. If it is a verdict, recording it changes the system the "
    + "verdict was about (V18) and inverts the climax the construct exists for");
  assert.deepEqual(Object.keys(declared.raw as object).sort(), ["expressed_as", "id", "satisfied_when", "statement"],
    "the authored mapping carries a key the schema does not declare");

  assert.deepEqual(verified(AUTHORED), verified(AUTHORED),
    "two reads of one document produced two verifications; the status is being carried rather than "
    + "derived");
});

// ----------------------------------------------------------------------------------------------
// 4. Polarity, through the whole path
// ----------------------------------------------------------------------------------------------

test("the requirement names the POSITIVE breach query, and nothing negates it internally", () => {
  const system = loaded(AUTHORED);

  // The query's own `quantifier: exists` and its unchanged text are the receipt. §5.2 forbids
  // negating the query to make the requirement read positively, and the structural reason it cannot
  // happen here is that there is nowhere to put a negation: the schema declares three keys and none
  // of them is a predicate.
  const saved = system.queries.get(QUERY);
  assert.ok(saved !== undefined, "the deciding query is not declared, so the join resolves nowhere");
  const raw = saved.raw as { readonly quantifier?: unknown; readonly graph?: { readonly where?: unknown } };
  assert.equal(raw.quantifier, "exists",
    "the deciding query stopped being existential, so `holds` is no longer the breach and "
    + "`satisfied_when: refuted` means something else");

  const v = verified(AUTHORED);
  assert.equal(v.status, "violated",
    "the breach query holds on this model and the requirement forbids it, so the obligation is "
    + "violated — and the WORD must be the requirement's, never the query's");
  assert.ok(v.status === "violated");
  assert.equal(v.verdict, "holds",
    "the verification must carry the query's own direction beside its own word: `violated` on "
    + "`holds` is 'the breach is exhibited', and a reader owed a verdict is owed the evidence");

  // And the query is answered identically whether or not anything prescribes it. A requirement is a
  // reading of a result, not an input to one.
  const without = asObject();
  delete without["requirements"];
  assert.equal(
    runSavedQueries(canonicalize(without)).get(QUERY)?.result.outcome,
    runSavedQueries(system).get(QUERY)?.result.outcome,
    "the presence of a requirement changed the query's answer, so the prescription is leaking into "
    + "the description");
});

test("the model changed, the query did not: one repaired property flips violated to satisfied", () => {
  const before = verified(AUTHORED);
  const after = verified(REPAIRED());

  assert.equal(before.status, "violated");
  assert.equal(after.status, "satisfied",
    "permitting Analytics restricted data removes the breach, so the obligation is discharged");
  assert.ok(after.status === "satisfied");
  assert.equal(after.verdict, "refuted",
    "`satisfied` must rest on the query being REFUTED — the breach was looked for and is not there");

  // The sentence §10 builds to. The deciding query's text is byte-identical across the repair, so
  // the verdict moved because the MODEL moved.
  const queryBlock = (text: string): string => {
    const at = text.indexOf(`  ${QUERY}:`);
    assert.notEqual(at, -1, "the deciding query's block was not found");
    return text.slice(at, text.indexOf("\nrequirements:", at));
  };
  assert.equal(queryBlock(REPAIRED()), queryBlock(AUTHORED),
    "the repair edited the query, so this says nothing about the model changing underneath a "
    + "question that stayed put");
});

// ----------------------------------------------------------------------------------------------
// 5. The round trip — the reloaded model declares what the engine answered about
// ----------------------------------------------------------------------------------------------

test("export and reload: the reloaded model declares the obligation the engine answered about", () => {
  // The clause that passed silently before the membership fix, asked of the new construct. The
  // failure it guards is not hypothetical for an authored key: a writer that does not know about
  // `requirements:` drops it on export, the reloaded document validates clean, and the engine goes
  // on answering about an obligation the student's file no longer contains.
  const r = MageDocument.load(AUTHORED);
  assert.ok(r.document !== null, `the document did not load: ${JSON.stringify(r.findings)}`);
  const document = r.document;

  const answered = verifySystemRequirements(document.seal().system()).get(REQUIREMENT);
  assert.ok(answered !== undefined, "nothing was answered, so there is nothing to round-trip");

  const reloaded = MageDocument.load(document.toText());
  assert.ok(reloaded.document !== null, "the exported bytes did not reload");
  const system = reloaded.document.seal().system();
  assert.deepEqual(validate(system), [], "the reloaded system must be clean");

  const declared = system.requirements.get(REQUIREMENT);
  assert.ok(declared !== undefined,
    `the engine answered about '${REQUIREMENT}' and the reloaded model does not declare it. That is `
    + `the shape of the membership defect: an answer about a system the file does not describe.`);
  assert.equal((declared.raw as Record<string, unknown>)["expressed_as"], QUERY,
    "the reloaded declaration names a different deciding query, so the obligation was re-denoted by "
    + "the write");
  assert.equal((declared.raw as Record<string, unknown>)["satisfied_when"], "refuted",
    "the satisfaction condition did not survive the write, and its two values are the difference "
    + "between a discharge and an accusation");

  assert.deepEqual(verifySystemRequirements(system).get(REQUIREMENT), answered,
    "the reloaded bytes verify differently from the document they were written from");

  // Comments survive, which is what makes the construct writable by a person rather than only by a
  // tool: the breach query's header is what tells a reader why `holds` is the violation.
  assert.match(document.toText(), /`holds` here IS the safety violation/,
    "the export dropped the comment that explains the polarity");
});

test("the exported document still validates against the published schema's shape", () => {
  // The schema is the surface a student's editor checks against, so an export the schema refuses is
  // a construct nobody can author twice. Checked through the one JSON structure both sides read,
  // rather than by re-serialising: `additionalProperties: false` at the top level means a key the
  // schema does not declare fails here, which is the half of "schema and TS move together" pointed
  // at the writer.
  const schema = JSON.parse(readFileSync(SCHEMA, "utf8")) as {
    readonly properties: Readonly<Record<string, unknown>>;
  };
  const r = MageDocument.load(AUTHORED);
  assert.ok(r.document !== null);
  const exported = parse(r.document.seal().toText()) as Record<string, unknown>;

  for (const key of Object.keys(exported)) {
    assert.ok(key in schema.properties,
      `the exported document carries a top-level '${key}' the published schema does not declare, so `
      + `a loader honouring \`additionalProperties: false\` refuses the file this tree just wrote`);
  }
  assert.ok("requirements" in exported, "the export dropped the requirements block");

  // And the round trip through a plain YAML writer — no comments, no document model — keeps the
  // declaration, so nothing in the construct depends on the comment-preserving path.
  const plain = canonicalize(parse(stringify(exported)) as Record<string, unknown>);
  assert.ok(plain.requirements.has(REQUIREMENT), "a plain re-serialisation lost the declaration");
});

// ----------------------------------------------------------------------------------------------
// 6. The accusing arm stays shut
// ----------------------------------------------------------------------------------------------

test("a dangling expressed_as is a DECLARATION error, not a breach and not an unrun search", () => {
  const doc = asObject();
  block(doc)["expressed_as"] = "a-query-nobody-declared";

  const v = verifySystemRequirements(canonicalize(doc)).get(REQUIREMENT);
  assert.ok(v !== undefined);
  assert.equal(v.status, "error",
    "a requirement naming a query the system does not declare references nothing, so there is no "
    + "obligation anybody could discharge — and reading it as `inconclusive` would report a dangling "
    + "reference as a search that merely has not run yet");
  assert.ok(v.status === "error");
  assert.match(v.problem, /a-query-nobody-declared/,
    "the error must name the unresolved query; 'the requirement could not be read' without the name "
    + "sends a reader to look at the whole file");
});

test("prescribing an evaluation status is refused, so no model can prescribe its own unanswerability", () => {
  for (const word of ["inconclusive", "unlicensed"]) {
    const doc = asObject();
    block(doc)["satisfied_when"] = word;
    const v = verifySystemRequirements(canonicalize(doc)).get(REQUIREMENT);
    assert.ok(v !== undefined);
    assert.equal(v.status, "error",
      `\`satisfied_when: ${word}\` verified as '${v.status}'. Neither word is a proposition value: `
      + `both are how the kernel reports that it did NOT settle the question, and a prescription `
      + `cannot be discharged by a non-answer.`);
  }
});

test("NEGATIVE CONTROL: a declined question reads inconclusive with its cause, never violated", () => {
  // The case the whole layer exists for, reached by an edit a student can make: delete the relation
  // type the breach query traverses and the question is no longer licensed. Under
  // "not refuted means violated" the engineer is told their safety requirement is breached and goes
  // looking for a data leak that is not there — a false accusation reachable by one deletion.
  const doc = asObject();
  const policy = (doc["models"] as Record<string, Record<string, unknown>>)["data-policy"];
  assert.ok(policy !== undefined, "the fixture's graph model moved");
  delete policy["relations"];
  delete (doc["relation-types"] as Record<string, unknown>)["subscribes"];

  const v = verifySystemRequirements(canonicalize(doc)).get(REQUIREMENT);
  assert.ok(v !== undefined);
  assert.notEqual(v.status, "violated",
    "removing the vocabulary the prohibition was stated in reported the system in BREACH. Nothing "
    + "about the system under design changed; the model simply no longer represents the relation.");
  assert.equal(v.status, "inconclusive",
    "a question the models decline does not settle the obligation, and it is not an error in the "
    + "declaration either — the author wrote a readable requirement");
  assert.ok(v.status === "inconclusive");
  assert.equal(v.because.kind, "unlicensed",
    "the cause must say the models decline the question, because its remedy is a MODEL and the "
    + "remedy for a bounded search is a budget; one word for both sends a reader the wrong way");
});

test("NEGATIVE CONTROL: deleting the prohibition does not discharge it, it removes it", () => {
  // The direction that would be worst because it is green: if dropping the declaration left a
  // `satisfied` verdict lying around, a prohibition could be discharged by deleting it.
  const without = asObject();
  delete without["requirements"];
  assert.deepEqual([...verifySystemRequirements(canonicalize(without)).keys()], [],
    "a system declaring no requirement reported a verification, so a status is surviving its "
    + "declaration");
});
