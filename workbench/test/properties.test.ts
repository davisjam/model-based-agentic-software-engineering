// Properties are propositions, not questions.
//
// The ruling this file holds: "Properties are obligations/propositions over models, not queries
// against them. The MODEL asks questions; the property panel records propositions." Keeping those
// grammatically distinct is what makes the verdict vocabulary read — "NOT ANSWERABLE / Analytics
// received OrderCreated at 2:04 PM" says the Workbench cannot decide a claim, where "this question
// is not answerable" says something slightly peculiar about a question.
//
// Two jobs, and the second is the one that will catch a future regression:
//
//   1. `normalizeToStatement` — the authoring boundary. A person may type the interrogative that
//      motivated the property; what gets SAVED is the proposition. The refusal path matters as much
//      as the rewrite, because a mangled statement reads as the author's own words and so nobody
//      goes looking for the tool that produced it.
//   2. The content gate — no shipped PROPERTY text is interrogative, while model purposes and the
//      registry's composition questions ARE. The exemption is asserted POSITIVELY: purposes must
//      ask. A test that merely skipped them would stay green if somebody flattened a model's
//      purpose into a statement, which would erase the same distinction from the other side.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { normalizeToStatement } from "../src/app/properties.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";

// --------------------------------------------------------------------------------------------
// 1. The authoring boundary
// --------------------------------------------------------------------------------------------

test("an interrogative with an unambiguous subject is recorded as a statement", () => {
  // The author's own worked example, and the one the ask bar's composer produces for a
  // reachability item -- so this is the path a tracked property actually takes.
  const r = normalizeToStatement("Is Fulfillment reachable from Checkout through a chain of subscriptions?");
  assert.equal(r.statement, "Fulfillment is reachable from Checkout through a chain of subscriptions.");
  assert.equal(r.rewritten, true);
  assert.equal(r.why, null);
});

test("the expletive 'there' fills the subject slot, so it needs no bounding", () => {
  const r = normalizeToStatement("Is there a direct 'calls' relation from api to parser?");
  assert.equal(r.statement, "There is a direct 'calls' relation from api to parser.");
  assert.equal(r.rewritten, true);
});

test("do-support is dropped onto the main verb, with adverbs left where the author put them", () => {
  assert.equal(normalizeToStatement("Does parsing run before validation?").statement,
    "parsing runs before validation.");
  // The composer's own `containment` spelling: an adverb sits between subject and verb.
  assert.equal(normalizeToStatement("Does api transitively contain parser?").statement,
    "api transitively contains parser.");
});

test("the four irregular present forms are handled, and the suffix rules cover the rest", () => {
  assert.equal(normalizeToStatement("Does Checkout have a publisher?").statement,
    "Checkout has a publisher.");
  assert.equal(normalizeToStatement("Does Checkout go idle?").statement, "Checkout goes idle.");
  // -es after a sibilant, -ies after consonant+y.
  assert.equal(normalizeToStatement("Does Checkout push OrderCreated?").statement,
    "Checkout pushes OrderCreated.");
  assert.equal(normalizeToStatement("Does Checkout retry delivery?").statement,
    "Checkout retries delivery.");
});

test("the subject keeps the author's spelling, because an id must not be re-cased", () => {
  // `dead_letter`, `api` and `parsing` all arrive as lowercase tokens and only the last is a
  // word. Sentence-casing the subject would rename a declared state or entity in the text of a
  // claim about it, so inversion moves the token and leaves its spelling alone.
  assert.equal(normalizeToStatement("Is dead_letter reachable within a two-configuration budget?").statement,
    "dead_letter is reachable within a two-configuration budget.");
  assert.equal(normalizeToStatement("Is parsing complete?").statement, "parsing is complete.");
  assert.equal(normalizeToStatement("Is Fulfillment subscribed?").statement, "Fulfillment is subscribed.");
});

test("a declarative statement is returned untouched, which is what makes this idempotent", () => {
  const once = normalizeToStatement("Is Fulfillment reachable from Checkout?");
  const twice = normalizeToStatement(once.statement);
  assert.equal(twice.statement, once.statement);
  assert.equal(twice.rewritten, false);
  // Both authoring paths normalize -- the ask bar for the derived id, `planEdit` for the saved
  // text -- so a second pass that changed the first's output would make the id and the statement
  // disagree about the same property.
  assert.match(twice.why ?? "", /already declarative/);
});

// The refusal path. Each of these COULD be rewritten by a greedier function, and each would be
// rewritten wrongly; the assertion is that the user's words survive.
test("a wh-question is kept verbatim: it asks for a value, not a yes/no claim", () => {
  const r = normalizeToStatement("What is the shortest 'calls' path from api to parser?");
  assert.equal(r.statement, "What is the shortest 'calls' path from api to parser?");
  assert.equal(r.rewritten, false);
  assert.match(r.why ?? "", /wh-question/);
});

test("a determiner-headed subject is kept verbatim, because inverting it can flip a quantifier", () => {
  // THE reason this limit exists. "Is ANY entity reachable" asks whether SOME is; "Any entity is
  // reachable" claims they all are. The composer emits this exact shape for an unbounded endpoint.
  const r = normalizeToStatement("Is any entity reachable from Checkout through one or more 'subscribes' relations?");
  assert.equal(r.rewritten, false);
  assert.ok(r.statement.endsWith("?"), "the user's text survives, question mark and all");
  assert.match(r.why ?? "", /determiner-headed/);

  // And a participial post-modifier, which is why det+noun is not a safe subject either: "an event
  // originating at Checkout" would bound to "an event" and strand "originating" after the modal.
  assert.equal(
    normalizeToStatement("Can an event originating at Checkout eventually reach Fulfillment?").rewritten,
    false);
});

test("'Did ...' is kept verbatim: irregular past forms are not a closed set worth encoding", () => {
  const r = normalizeToStatement("Did Analytics receive OrderCreated at 2:04 PM?");
  assert.equal(r.statement, "Did Analytics receive OrderCreated at 2:04 PM?");
  assert.equal(r.rewritten, false);
});

test("text that is not subject-auxiliary inverted at all is kept verbatim", () => {
  for (const typed of ["Fulfillment reachable?", "OrderCreated?", "   "]) {
    const r = normalizeToStatement(typed);
    assert.equal(r.rewritten, false, `${typed} must not be rewritten`);
    assert.equal(r.statement, typed.trim());
  }
});

// --------------------------------------------------------------------------------------------
// 2. The content gate
// --------------------------------------------------------------------------------------------

/**
 * True for text that ASKS. A trailing question mark, or a leading auxiliary or wh-word.
 *
 * Both halves are needed. The question mark alone would pass "Can a document reach published"
 * written without one, and the opener alone would pass a wh-question whose verb is elided.
 */
const INTERROGATIVE_OPENERS = new Set(["is", "are", "was", "were", "do", "does", "did", "can",
  "could", "may", "might", "will", "would", "shall", "should", "must", "has", "have", "had",
  "what", "which", "who", "whom", "whose", "where", "when", "why", "how"]);

function asks(text: string): boolean {
  const t = text.trim();
  if (t.endsWith("?")) return true;
  const first = (t.split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z]/g, "");
  return INTERROGATIVE_OPENERS.has(first);
}

/** Every tracked model system that ships, so a new example is covered without editing this test. */
const shippedModelSystems = (): readonly string[] =>
  execFileSync("git", ["ls-files", "--", "examples", "models"], { encoding: "utf8" })
    .split("\n")
    .filter((p) => p.endsWith(".mage.yaml"));

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

test("no shipped property STATES its claim as a question", () => {
  const files = shippedModelSystems();
  assert.ok(files.length > 0, "the gate must find the shipped model systems, or it checks nothing");

  const offenders: string[] = [];
  let checked = 0;
  for (const file of files) {
    const doc: unknown = parse(readFileSync(file, "utf8"));
    if (!isObject(doc) || !isObject(doc["queries"])) continue;
    for (const [id, raw] of Object.entries(doc["queries"])) {
      if (!isObject(raw)) continue;
      const name = raw["name"];
      if (typeof name !== "string") continue;
      checked += 1;
      if (asks(name)) offenders.push(`${file} queries.${id}: ${name}`);
    }
  }
  assert.ok(checked > 30, `the gate must reach the shipped properties; it read ${checked}`);
  assert.deepEqual(offenders, [], "a property asserts a proposition; the interrogative belongs upstream");
});

test("no shipped example fixture LABELS a property as a question", () => {
  // The fixture's label is what Learn's "Properties you can measure" list renders, so it ships to
  // a reader exactly as the saved name does.
  const offenders: string[] = [];
  let checked = 0;
  for (const file of execFileSync("git", ["ls-files", "--", "examples"], { encoding: "utf8" })
    .split("\n").filter((p) => p.endsWith("expected-results.yaml"))) {
    const doc: unknown = parse(readFileSync(file, "utf8"));
    if (!isObject(doc) || !Array.isArray(doc["queries"])) continue;
    for (const raw of doc["queries"]) {
      if (!isObject(raw) || typeof raw["label"] !== "string") continue;
      checked += 1;
      if (asks(raw["label"])) offenders.push(`${file} ${String(raw["id"])}: ${raw["label"]}`);
    }
  }
  assert.ok(checked > 20, `the gate must reach the fixture labels; it read ${checked}`);
  assert.deepEqual(offenders, []);
});

// The exemption, asserted positively. A model's purpose is the one place the interrogative BELONGS:
// a reduction exists to answer an engineering question, and V24's refusals quote it. If somebody
// "fixes" these into statements to satisfy the gate above, these tests fail instead.
test("every shipped model purpose DOES ask a question", () => {
  const silent: string[] = [];
  let checked = 0;
  for (const file of shippedModelSystems()) {
    const doc: unknown = parse(readFileSync(file, "utf8"));
    if (!isObject(doc)) continue;
    for (const key of ["models", "machines"]) {
      const block = doc[key];
      if (!isObject(block)) continue;
      for (const [id, raw] of Object.entries(block)) {
        if (!isObject(raw) || !isObject(raw["purpose"])) continue;
        const q = raw["purpose"]["question"];
        if (typeof q !== "string" || q.trim() === "") continue;
        checked += 1;
        if (!asks(q)) silent.push(`${file} ${key}.${id}: ${q}`);
      }
    }
  }
  assert.ok(checked > 10, `the exemption must be exercised; it read ${checked} purposes`);
  assert.deepEqual(silent, [],
    "a model asks the question it answers; flattening a purpose into a statement erases the "
    + "distinction the property rename exists to create");
});

test("the model-type registry's own questions, and its richer composition questions, ask", () => {
  for (const t of MODEL_TYPES) {
    assert.ok(asks(t.question), `${t.id}.question must ask: ${t.question}`);
    // "Together you can ask: ..." composition lines. An ASK is upstream inquiry, so these stay
    // interrogative even though they read next to property text in the Learn pages.
    assert.ok(asks(t.combineWith.richerQuestion),
      `${t.id}.combineWith.richerQuestion must ask: ${t.combineWith.richerQuestion}`);
  }
  assert.ok(MODEL_TYPES.length > 0);
});
