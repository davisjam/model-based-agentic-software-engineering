// `count` — the cardinality of the selection that already exists.
//
// `DESIGN-v02-quantification-261004.md` Phase 1 (§5), under §3.2's exactness ruling and §3.4's
// ruling 2. The operation adds no form, no query kind and no quantifier: a selection makes no
// claim, so `count` returns no `Outcome`, carries no quantifier, and never reaches `parseQuery`.
// What it adds is a figure, and a figure is where this repo's recurring defect lives.
//
// THE DEFECT THIS FILE EXISTS TO PREVENT. §3.2: *"A bounded walk makes a count a lower bound, not a
// count ... It must not emit a bare integer that a reader will take as exact."* That is the
// truncated-search-reported-as-`holds` failure in arithmetic clothing — a number read as a total the
// engine never established. Two properties hold the line, and each has a negative control below:
//
//   DERIVED, NOT RESTATED — the count comes off the same `ids` array the selection returns, so the
//     two cannot disagree about one selection. Checked against that array AND against a tally this
//     file computes from the canonical system itself, because agreement with the implementation's
//     own output is not yet evidence the implementation is right.
//
//   EXACT ONLY WHERE EXACTNESS WAS EARNED — the figure states the read that earns it rather than
//     leaving a reader to assume one, and the arm that established no selection carries no figure
//     at all. A refusal cannot report a count, which is §3.2 held by the type rather than by a
//     caller who remembers to check.
//
// Both auditors return findings instead of throwing, so the negative controls at the foot can drive
// them with a sabotaged value and read what they say. An auditor that passes whatever it is handed
// is decoration.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { countElements, selectElements } from "../src/engine/elements.ts";
import type { ElementCount, ElementSelection } from "../src/engine/elements.ts";
import { canonicalize } from "../src/ir/canonicalize.ts";
import type { CanonicalSystem } from "../src/ir/types.ts";

const docable = (): CanonicalSystem =>
  canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8")) as Record<string, unknown>);

/** Build a system from a plain object, through the real canonicalizer rather than a hand-built IR. */
const build = (doc: Record<string, unknown>): CanonicalSystem =>
  canonicalize({ mage: 1, system: { id: "t" }, ...doc });

/**
 * An INDEPENDENT tally of the ids a selector should pick out.
 *
 * It walks `system.entities` in this file's own code rather than calling `satisfiesConstraints`,
 * which is the point: sharing the matcher would make every comparison below a comparison of the
 * implementation with itself. Deliberately narrow — exact-match `eq` constraints and a declared
 * type — because an oracle that reimplements the whole grammar is a second implementation, and the
 * selectors in this file are chosen to stay inside what it covers.
 */
function tally(
  system: CanonicalSystem, type: string | null, where: Readonly<Record<string, unknown>> = {},
): readonly string[] {
  return [...system.entities.entries()]
    .filter(([, e]) => type === null || e.type === type)
    .filter(([, e]) => Object.entries(where)
      .every(([property, value]) => e.properties.get(property)?.value === value))
    .map(([id]) => id)
    .sort();
}

// ----------------------------------------------------------------------------------------------
// The auditors — pure, so the negative controls can drive them
// ----------------------------------------------------------------------------------------------

/**
 * Does this selection's count stand up to its own ids, and to a tally computed elsewhere?
 *
 * Three claims, reported separately because they fail for different reasons: a count that drifted
 * from the list it counts is a construction defect, a count that disagrees with the oracle is a
 * selection defect, and a figure claiming an exactness its basis does not name is the §3.2 defect.
 */
function auditCardinality(
  selection: ElementSelection, oracle: readonly string[],
): readonly string[] {
  const out: string[] = [];
  if (!selection.selected) return ["the selection was refused, so it reports no cardinality to audit"];
  const { count, ids } = selection;
  if (count.value !== ids.length) {
    out.push(`the count says ${count.value} and the selection returned ${ids.length} id(s); `
      + "one selection, two answers to how many");
  }
  if (count.value !== oracle.length) {
    out.push(`the count says ${count.value} and an independent tally of the same system says `
      + `${oracle.length}`);
  }
  if (count.exact !== true) {
    out.push("the figure does not claim exactness, over a table that was fully read");
  }
  if (count.basis !== "entity-table") {
    out.push(`the figure names its basis as '${String(count.basis)}', which is not the domain `
      + "`selectElements` walks; an exactness borrowed from another read is the §3.2 defect");
  }
  return out;
}

/**
 * Does a refused count keep its promise to report no figure?
 *
 * §3.2's ruling, structurally: a question that established no selection has no cardinality, and the
 * strongest holding of "must not emit a bare integer a reader will take as exact" is to emit none.
 * `Object.hasOwn` rather than a truthiness test, because a `count` of `0` or `null` on this arm
 * would be exactly the misreadable figure the ruling forbids.
 */
function auditRefusalIsFigureless(result: ElementCount): readonly string[] {
  const out: string[] = [];
  if (result.counted) return ["the question was answered, so there is no refusal to audit"];
  if (Object.hasOwn(result, "count")) {
    out.push("a refused count carries a `count` field; the engine established no selection, so any "
      + "figure here is a total it never walked");
  }
  if (result.refusal.prose.trim() === "") {
    out.push("the refusal states no reason, so a caller cannot tell a typo from a true absence");
  }
  return out;
}

// ----------------------------------------------------------------------------------------------
// Derived, not restated
// ----------------------------------------------------------------------------------------------

test("the count agrees with the ids it counts, and with a tally computed outside the engine", () => {
  const system = docable();
  const types = [...new Set([...system.entities.values()]
    .flatMap((e) => (e.type === null ? [] : [e.type])))].sort();
  assert.ok(types.length > 1, "the fixture must declare more than one type, or no filter shows filtering");

  // Unconstrained first: the whole table, which is the case where exactness is most obviously
  // earned and a drifting count is least obvious.
  const all = selectElements(system, undefined);
  assert.deepEqual(auditCardinality(all, tally(system, null)), []);
  assert.ok(all.selected && all.count.value > 1, "an unconstrained selection over the fixture is not empty");

  // Then every declared type, so the agreement is checked at more than one cardinality. A single
  // selector could agree by coincidence; the whole partition cannot.
  let summed = 0;
  for (const type of types) {
    const selection = selectElements(system, { type });
    assert.deepEqual(auditCardinality(selection, tally(system, type)), [], `type '${type}'`);
    assert.ok(selection.selected);
    if (!selection.selected) continue;
    assert.ok(selection.count.value > 0, `type '${type}' is declared but selected nothing`);
    summed += selection.count.value;
  }
  // The partition closes: typed counts sum to the typed population. This is what catches a count
  // that is right per selector and wrong about the domain it ranges over.
  assert.equal(summed, tally(system, null).filter((id) => system.entities.get(id)?.type !== null).length,
    "the per-type counts do not sum to the typed entities the system declares");
});

test("a selection that matches nothing counts zero, and the zero is exact rather than absent", () => {
  // §3.2's distinction, at the one value where it bites hardest. Zero is an ANSWER here — the table
  // was read and nothing matched — and it must arrive as an exact figure, not as a missing field a
  // reader interprets. The vacuity channel is not involved: a selection makes no claim, so there is
  // no universal holding for free and nothing for `Compilation.kind: "vacuous"` to disclose.
  const system = docable();
  const selection = selectElements(system, { type: "no-such-type-is-declared" });
  assert.deepEqual(auditCardinality(selection, []), []);
  assert.ok(selection.selected, "an unmatchable but READABLE selector answers; it does not refuse");
  if (!selection.selected) return;
  assert.deepEqual(selection.ids, []);
  assert.deepEqual(selection.count, { exact: true, value: 0, basis: "entity-table" });
  assert.ok(selection.declaredTypes.length > 0,
    "the zero must stay diagnosable: a caller needs the declared types to tell a typo from an absence");
});

test("countElements projects the selection rather than recomputing it", () => {
  // The derivation claim, made mechanical. Every field `ElementCount` carries is the selection's
  // own value, so a count cannot report a revision, a sentence or a figure the selection would not.
  // A second traversal here would be a second matcher over one grammar — the defect this module's
  // header extracted `satisfiesConstraints` to prevent.
  const system = docable();
  const type = [...system.entities.values()].find((e) => e.type !== null)?.type;
  assert.ok(type !== undefined);
  for (const selector of [undefined, {}, { type }, { type: "absent" }]) {
    const selection = selectElements(system, selector);
    const counted = countElements(system, selector);
    assert.ok(selection.selected && counted.counted, `'${JSON.stringify(selector)}' was refused`);
    if (!selection.selected || !counted.counted) continue;
    assert.deepEqual(counted.count, selection.count, "the two answers disagree about how many");
    assert.equal(counted.hash, selection.hash, "the count names a revision the selection is not on");
    assert.equal(counted.interpretedAs, selection.interpretedAs,
      "the count was understood as a different question than the selection it counts");
    assert.deepEqual(counted.declaredTypes, selection.declaredTypes);
    // And the one field it does NOT carry, which is the whole reason the shape differs: an agent
    // asking how many over a large table should not receive the table.
    assert.equal(Object.hasOwn(counted, "ids"), false,
      "`count` handed back the list; then it is `elements` under a second name");
  }
});

// ----------------------------------------------------------------------------------------------
// Exact only where exactness was earned
// ----------------------------------------------------------------------------------------------

test("the figure never claims more than the table it was read from holds", () => {
  // The structural bound on the basis claim: `entity-table` earns `exact` because the walk is over
  // `system.entities` with no limit, so no count can exceed that table's size. A figure larger than
  // the domain would mean the basis names a read the engine did not perform.
  const system = docable();
  for (const selector of [undefined, { type: "service" }, { where: {} }]) {
    const selection = selectElements(system, selector);
    assert.ok(selection.selected);
    if (!selection.selected) continue;
    assert.ok(selection.count.value <= system.entities.size,
      `counted ${selection.count.value} of a table holding ${system.entities.size}`);
  }
});

test("a question that established no selection reports no figure — the §3.2 holding", () => {
  // The two ways a count fails to complete, and neither may hand back a number. This is the bounded
  // case as Phase 1's domain actually presents it: the entity-table walk cannot be truncated, so a
  // count here is either exact or absent, and "absent" is what these arms are.
  const system = docable();

  // (a) An unreadable selector. Reading it as "no constraints" would answer with the whole table,
  // and a COUNT of the whole table is the same lie as a list of it, one field narrower.
  for (const unreadable of [[1, 2, 3], "service", { where: "classification" }, { where: [1] }]) {
    const refused = countElements(system, unreadable);
    assert.equal(refused.counted, false, `'${JSON.stringify(unreadable)}' was read as a selector`);
    assert.deepEqual(auditRefusalIsFigureless(refused), [], `'${JSON.stringify(unreadable)}'`);
    if (refused.counted) continue;
    assert.equal(refused.refusal.reason, "unsupported-expression");
  }

  // (b) The registry's substrate rung. A system declaring no structural model refuses the
  // enumeration, so it refuses the cardinality of it — with the registry's own sentence, not a
  // second wording invented here.
  const empty = countElements(build({}), undefined);
  assert.equal(empty.counted, false, "a system declaring no structural model must not report a count");
  assert.deepEqual(auditRefusalIsFigureless(empty), []);
  if (empty.counted) return;
  assert.equal(empty.refusal.reason, "missing-model-type");
  assert.ok(empty.interpretedAs.length > 0,
    "a refused count still says what it was asked, or the reader is sent back to guess at their input");
});

// ----------------------------------------------------------------------------------------------
// Negative controls — each predicate driven with the defect it exists to catch
// ----------------------------------------------------------------------------------------------

test("auditCardinality goes RED on a count that drifted from its own selection", () => {
  const system = docable();
  const selection = selectElements(system, undefined);
  assert.ok(selection.selected);
  if (!selection.selected) return;
  const oracle = tally(system, null);
  assert.deepEqual(auditCardinality(selection, oracle), [], "the positive case must pass first");

  // One off, which is the defect a hand-maintained tally produces and the one an eyeball misses.
  const drifted: ElementSelection = {
    ...selection, count: { ...selection.count, value: selection.count.value + 1 },
  };
  const findings = auditCardinality(drifted, oracle);
  assert.ok(findings.some((f) => /one selection, two answers/.test(f)),
    `a count disagreeing with its own ids was not caught: ${JSON.stringify(findings)}`);
  assert.ok(findings.some((f) => /independent tally/.test(f)),
    "the oracle arm stayed silent, so agreement with the engine is all this file would check");

  // And the sabotage that agrees with the ids while being wrong about the system: the oracle is the
  // only arm that can see this one, which is why it is not redundant with the arm above.
  const bothWrong: ElementSelection = {
    ...selection, ids: selection.ids.slice(1),
    count: { ...selection.count, value: selection.count.value - 1 },
  };
  assert.ok(auditCardinality(bothWrong, oracle).some((f) => /independent tally/.test(f)),
    "a self-consistent but wrong count passed; the ids arm cannot catch this and the oracle must");
});

test("auditCardinality goes RED on a figure that borrows an exactness it did not earn", () => {
  const system = docable();
  const selection = selectElements(system, undefined);
  assert.ok(selection.selected);
  if (!selection.selected) return;
  const oracle = tally(system, null);

  // The §3.2 defect itself: the right number, carrying a basis that names a read nobody performed.
  // `as` is needed because the type ALREADY forbids this — which is the holding working, and the
  // cast is how the control reaches past the compiler to check the runtime predicate too.
  const borrowed = {
    ...selection,
    count: { ...selection.count, basis: "configurations" },
  } as unknown as ElementSelection;
  assert.ok(auditCardinality(borrowed, oracle).some((f) => /exactness borrowed/.test(f)),
    "a figure naming a basis the engine did not read was accepted");

  const unclaimed = {
    ...selection, count: { ...selection.count, exact: false },
  } as unknown as ElementSelection;
  assert.ok(auditCardinality(unclaimed, oracle).some((f) => /does not claim exactness/.test(f)),
    "a figure over a fully-read table that declines to claim exactness was accepted");
});

test("auditRefusalIsFigureless goes RED on a refusal that smuggled a number", () => {
  const refused = countElements(docable(), "not-a-selector");
  assert.equal(refused.counted, false);
  assert.deepEqual(auditRefusalIsFigureless(refused), [], "the positive case must pass first");

  // The shape the ruling forbids: a refusal reporting zero. A caller reading `count.value` without
  // branching on `counted` would publish "no entities match" for a question the engine declined.
  const smuggled = {
    ...refused, count: { exact: true, value: 0, basis: "entity-table" },
  } as unknown as ElementCount;
  assert.ok(auditRefusalIsFigureless(smuggled).some((f) => /never walked/.test(f)),
    "a refusal carrying a figure was accepted; then the §3.2 holding is a comment");
});
