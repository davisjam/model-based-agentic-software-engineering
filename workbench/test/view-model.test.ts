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
import { buildViewModel } from "../src/ui/view-model.ts";
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
