// The §20 release gate's NEGATIVE criteria, held structurally.
//
// (`§20` here is the release gate in `DESIGN-v02-examples-and-semantic-completion-261004.md`. The
// workbench overloads that reference: `requirements-human-ux-261002.md` §20 is the capability table
// `test/capabilities.test.ts` reads, and "spec §20" in two design docs is the four-valued
// verification vocabulary. Three sections, one number.)
//
// ## Why these were missing, and why they are worth adding at zero findings
//
// The 261005 release-gate audit found criteria 1, 4 and 14 satisfied at HEAD with nothing holding
// them there, and named the reason they had been skipped: every one is a NEGATIVE property — *no*
// semantic `join`, *no* `violated` on the query side, *no* unnamed flagship. A suite assembled from
// positive examples reaches none of them, because there is no example of a thing not existing.
//
// **Every assertion below finds zero today, and that is the point rather than an apology.** The
// value is FORWARD: each one fails on the edit that would introduce the thing, which is the only
// moment at which catching it is cheap. A reader should not take a green run here as evidence that
// something was prevented; take it as evidence that the next attempt is refused.
//
// Each test states, in its own header, the case where it PASSES while the property is violated. None
// of these is airtight, and a guard whose bypass is unwritten invites the reader to assume it has
// none.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { BINDINGS, COMPOSITIONS, MODEL_TYPES } from "../src/engine/model-types.ts";
import { VERIFICATION_TEXT } from "../src/engine/verification.ts";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import type { Outcome } from "../src/ir/types.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";

const SCHEMAS = ["mage-model.schema.json", "mage-query.schema.json", "mage-transaction.schema.json"] as const;

/** The release gate's own document, read for its criterion text rather than transcribed. */
const SPEC = "DESIGN-v02-examples-and-semantic-completion-261004.md";

/**
 * §20's criteria, read out of the document.
 *
 * The same move `test/example-semantic-coverage.test.ts` makes for §16 and for the same reason: a
 * guard filed under a criterion should fail when the criterion it is filed under disappears, and no
 * number describing the gate is written anywhere in this file. The list is located by its heading and
 * its successor, so a criterion added or removed changes what this returns without any edit here.
 */
function releaseGateCriteria(): readonly string[] {
  const text = readFileSync(SPEC, "utf8");
  const open = text.indexOf("20. v0.2 release gate");
  assert.ok(open >= 0, `${SPEC}: §20's heading is gone, so these guards no longer know what they hold`);
  const close = text.indexOf("21. The intended educational progression", open);
  assert.ok(close > open, `${SPEC}: §20 has no following section, so its extent cannot be read`);
  const criteria = text.slice(open, close).split("\n")
    .filter((line) => /^[0-9]+\. /.test(line))
    .map((line) => line.replace(/^[0-9]+\. /, "").trim());
  assert.ok(criteria.length > 1, `${SPEC}: §20 enumerates no criterion, so this file's denominator is empty`);
  return criteria;
}

/** Every `enum` member in a published schema, with the JSON path that declared it. */
function schemaEnums(file: string): readonly { readonly path: string; readonly members: readonly string[] }[] {
  const out: { path: string; members: readonly string[] }[] = [];
  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (typeof node !== "object" || node === null) return;
    const obj = node as Record<string, unknown>;
    const members = obj["enum"];
    if (Array.isArray(members) && members.every((m) => typeof m === "string")) {
      out.push({ path: `${path}/enum`, members: members as readonly string[] });
    }
    for (const [k, v] of Object.entries(obj)) walk(v, `${path}/${k}`);
  };
  walk(JSON.parse(readFileSync(file, "utf8")), file);
  return out;
}

/** Every object KEY a published schema declares — the axis a capability can arrive on untokened. */
function schemaKeys(file: string): readonly string[] {
  const keys = new Set<string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node !== "object" || node === null) return;
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) { keys.add(k); walk(v); }
  };
  walk(JSON.parse(readFileSync(file, "utf8")));
  return [...keys];
}

// ----------------------------------------------------------------------------------------------
// Criterion 4 — `violated` lives at the verification layer and nowhere else
// ----------------------------------------------------------------------------------------------

/**
 * The query-side outcome vocabulary as a VALUE, keyed BY `Outcome` so the compiler holds it.
 *
 * `Outcome` is a type alias and erases at runtime, so a runtime assertion needs a value. Keying the
 * table by the union is what stops this being the hand-written copy the engine's own `OUTCOME_WORDS`
 * comment warns about: `tsc` refuses a table missing a word AND refuses one carrying a word the union
 * does not have.
 *
 * **Correcting the 261005 audit on the mechanism.** It reported that *"`tsc` would NOT complain if
 * someone added `"violated"` to `Outcome`"*, and that is measurably false at HEAD: `OUTCOME_WORDS` in
 * `src/engine/index.ts` is already `Readonly<Record<Outcome, true>>`, so the addition is `TS2741` on
 * that table before it is anything else. Measured by making the edit and reading the compiler.
 *
 * The guard is still worth its lines, for a reason one rung along from the one the audit gave. A
 * `TS2741` says *"property 'violated' is missing"* and names a lookup table, so the cheapest way to
 * green it is to add `violated: true` — which silences the compiler, leaves criterion 4 violated, and
 * leaves the suite green. So: the compiler catches the OMISSION, and the assertion below catches the
 * ACCOMMODATION, with the sentence explaining why the obvious fix is the wrong one. The second layer
 * is what the type alone cannot carry.
 */
const QUERY_OUTCOME_WORDS: Readonly<Record<Outcome, true>> = {
  holds: true, refuted: true, inconclusive: true, unlicensed: true,
};

/**
 * The two vocabularies meet at exactly `inconclusive`, and nowhere else.
 *
 * **Not disjointness.** The 261005 audit proposed asserting the two unions are disjoint; they are
 * not, and must not be. `inconclusive` is deliberately in both — `verify()` maps the query side's
 * `inconclusive` onto the verification side's, and the shared word is the design. An assertion of
 * disjointness would be RED at HEAD and the only way to green it would be deleting a word from one
 * union, which is weakening the code to satisfy a gate.
 *
 * Pinning the intersection EXACTLY is also stronger than the criterion as written. "No `violated` as
 * a raw query truth value" is one direction; this catches `satisfied` or `error` arriving on the
 * query side, `holds` or `refuted` arriving on the verification side, and — the case neither
 * direction names — `inconclusive` being REMOVED from one of them, which would silently change what
 * a word shared across the layer boundary means.
 *
 * **Where it passes while the property is violated:** a layer can leak the WORD without leaking the
 * TYPE. Something could compute a verification status and hand it to a caller typed as a string, or
 * a renderer could print "violated" beside a query answer; both are criterion-4 violations in spirit
 * and invisible here, because this reads the two vocabularies and not their uses. The audit measured
 * that direction by grep and found one capability summary string; nothing holds it.
 */
test("§20.4: the query and verification vocabularies meet at `inconclusive` and nowhere else", () => {
  const queryWords = Object.keys(QUERY_OUTCOME_WORDS).sort();
  const verificationWords = Object.keys(VERIFICATION_TEXT).sort();
  const shared = queryWords.filter((w) => verificationWords.includes(w));

  assert.deepEqual(shared, ["inconclusive"],
    `the two vocabularies share ${shared.join(", ") || "nothing"}, and they must share exactly `
    + `\`inconclusive\`.\n`
    + `  query side (Outcome):              ${queryWords.join(", ")}\n`
    + `  verification side (VerificationStatus): ${verificationWords.join(", ")}\n`
    + `A verification word on the query side is criterion 4's failure: \`violated\` is an accusation `
    + `a REQUIREMENT makes, and a query that can answer it has collapsed the layer that makes the `
    + `accusation answerable. A query word on the verification side is the same error mirrored. And `
    + `\`inconclusive\` leaving one of them is not a simplification -- it is the shared word that `
    + `carries the boundary, and verify() maps one onto the other.`);

  // Named individually, so the failure message says WHICH word and WHY rather than printing a diff.
  for (const word of ["satisfied", "violated", "error"]) {
    assert.ok(!queryWords.includes(word),
      `'${word}' is an \`Outcome\`. §20.4: it exists only at the verification layer, not as a raw `
      + `query truth value.`);
  }
  for (const word of ["holds", "refuted", "unlicensed"]) {
    assert.ok(!verificationWords.includes(word),
      `'${word}' is a \`VerificationStatus\`. A query outcome is not a verdict on an obligation.`);
  }
});

/**
 * The schema's outcome enums are the SAME vocabulary — the third surface, and the authored one.
 *
 * The type-level guard above holds `src/`. It says nothing about the published schemas, and
 * `mage-query.schema.json` enumerates the outcome words twice: as a saved query's `expect` and as a
 * result's `outcome`. A `violated` added there IS a raw query truth value — an author could write it
 * in YAML — and it is the surface a student reaches first. The audit's search for criterion 4 did not
 * cover it.
 *
 * **Where it passes while the property is violated:** the enums are located by JSON path, so a THIRD
 * outcome enum added at a path this test does not name goes unchecked. The path list is closed here
 * rather than discovered, because discovering "which enums are outcome enums" would have to guess
 * from their contents — and an enum that had gained `violated` is exactly the one the guess would
 * stop recognising.
 */
test("§20.4: the schema's outcome enums are the query vocabulary, with no verification word", () => {
  const OUTCOME_ENUM_PATHS = [
    "mage-query.schema.json/$defs/query/properties/expect/enum",
    "mage-query.schema.json/$defs/result/properties/outcome/enum",
  ];
  const expected = Object.keys(QUERY_OUTCOME_WORDS).sort();
  const found = schemaEnums("mage-query.schema.json");

  for (const path of OUTCOME_ENUM_PATHS) {
    const site = found.find((e) => e.path === path);
    assert.ok(site !== undefined,
      `${path} is gone. Either the outcome vocabulary moved -- in which case this list moves with it `
      + `-- or a saved query's outcome is no longer a closed set.`);
    assert.deepEqual([...site.members].sort(), expected,
      `${path} is not the \`Outcome\` vocabulary. The schema and the type must enumerate the same `
      + `four words, or YAML admits an outcome the engine cannot produce (or refuses one it can).`);
  }

  // And the whole-schema sweep, which needs no path list: no enum anywhere may offer a verification
  // word, whatever it is called.
  for (const file of SCHEMAS) {
    for (const site of schemaEnums(file)) {
      for (const word of ["violated", "satisfied"]) {
        assert.ok(!site.members.includes(word),
          `${site.path} offers '${word}'. A verification verdict is DERIVED per read and authored `
          + `nowhere (V18); a schema that lets an author write one has made a verdict into state.`);
      }
    }
  }
});

// ----------------------------------------------------------------------------------------------
// Criterion 1 — no semantic use of overloaded `join`
// ----------------------------------------------------------------------------------------------

/**
 * The combinators §4.3 forbids, closed.
 *
 * §4.3 names `pipe`, `join`, `fold`, `flatMap` and "higher-order composition" added *"merely to make
 * examples convenient."* The 261004 ruling was sharper: there is no generic semantic join at all —
 * there are bindings and compositions, and `CompositionSemantics`'s shape holds that by refusing a
 * composition of compositions. What the shape does NOT stop is a combinator arriving as a new query
 * FORM, a new registry row, or a new schema enum member, which is the gap this closes.
 *
 * The spellings go wider than the ruling's four, for the reason the audit gives: the design
 * deliberately avoids some spellings, so a search for `join` alone is the narrow search that misfired
 * twice on 261004. `combine` is absent from the list on purpose — `combineWith` survives in the
 * demoted navigation role the ruling licenses, and banning the spelling would ban the demotion.
 */
const BANNED_COMBINATORS = [
  "join", "joins", "merge", "unify", "fold", "pipe", "flatmap", "zip", "correlate", "compose",
] as const;

/**
 * Whether a declared name USES a banned combinator, as a word rather than as a substring.
 *
 * Three spellings reach the same vocabulary and all three must match: `semantic-join`, `joinModels`,
 * `join_models`. So the camel boundary becomes a separator BEFORE lowercasing — splitting a
 * lowercased `joinModels` yields one token and misses it, which this matcher did on its first draft
 * and its own negative control caught.
 *
 * Adjacent tokens are also tested joined, so `flatMap`, `flat_map` and `flat-map` all reach
 * `flatmap`. Matching tokens rather than substrings is what keeps `conjoined` and `decomposed` quiet
 * — and it is equally a bypass: `joinedSpan` tokenises to `joined`, not `join`.
 */
function bannedWordIn(name: string): string | null {
  const words = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
    .split(/[^a-z]+/).filter((w) => w.length > 0);
  const pairs = words.slice(0, -1).map((w, i) => w + words[i + 1]);
  const tokens = [...words, ...pairs];
  return BANNED_COMBINATORS.find((b) => tokens.includes(b)) ?? null;
}

/**
 * No query form, registry row or schema enum member names a banned combinator.
 *
 * Three axes, because the capability can arrive on any of them without the others noticing: the
 * engine's own form vocabulary (what a question can BE), the registries (what a cross-model
 * relationship can BE), and the published schemas (what an author can WRITE).
 *
 * **Where it passes while the property is violated:** this matches NAMES, and a generic join can
 * ship under an innocent one. A `graphQuery.form` called `"span"` that composed two models' edge
 * sets would be exactly the thing §4.3 forbids and would pass here without comment. The guard makes
 * the obvious route expensive; it cannot make the semantics observable from a vocabulary. The
 * control that does reach semantics is `CompositionSemantics`'s type plus
 * `test/model-types.test.ts`'s no-chain assertion, and this sits beside those rather than above them.
 *
 * Matching on word boundaries rather than substrings is what keeps it from firing on `conjoined` or
 * `decomposed` — and is also a bypass: `joinedSpan` splits to `joined`, not `join`.
 */
test("§20.1: no query form, registry row or schema enum names a banned combinator", () => {
  const offenders: string[] = [];

  // Axis 1 — the engine's form vocabularies and their classified primitives.
  for (const type of MODEL_TYPES) {
    for (const form of type.query.forms) {
      const hit = bannedWordIn(form);
      if (hit !== null) offenders.push(`MODEL_TYPES['${type.id}'].query.forms: '${form}' (${hit})`);
    }
    for (const p of type.query.primitives) {
      const hit = bannedWordIn(p.form);
      if (hit !== null) offenders.push(`MODEL_TYPES['${type.id}'].query.primitives: '${p.form}' (${hit})`);
    }
  }

  // Axis 2 — the registries. A combinator arriving as a row is the shape the deleted
  // one-`joins`-array-per-model census used to have, and its removal is recorded only in a test's
  // header comment, so nothing until now forbade its return.
  for (const type of MODEL_TYPES) {
    const hit = bannedWordIn(type.id);
    if (hit !== null) offenders.push(`MODEL_TYPES row '${type.id}' (${hit})`);
  }
  for (const b of BINDINGS) {
    const hit = bannedWordIn(b.name);
    if (hit !== null) offenders.push(`BINDINGS row '${b.name}' (${hit})`);
  }
  for (const c of COMPOSITIONS) {
    const hit = bannedWordIn(c.name);
    if (hit !== null) offenders.push(`COMPOSITIONS row '${c.name}' (${hit})`);
  }

  // Axis 3 — what an author can write. A form reaches YAML through a schema enum, and a key reaches
  // it directly, so both are checked: the audit's third axis was "could the capability exist without
  // the token", and a schema KEY is how it would.
  for (const file of SCHEMAS) {
    for (const site of schemaEnums(file)) {
      for (const member of site.members) {
        const hit = bannedWordIn(member);
        if (hit !== null) offenders.push(`${site.path}: '${member}' (${hit})`);
      }
    }
    for (const key of schemaKeys(file)) {
      const hit = bannedWordIn(key);
      if (hit !== null) offenders.push(`${file} key '${key}' (${hit})`);
    }
  }

  assert.deepEqual(offenders, [],
    `a banned combinator has landed as a declared vocabulary member:\n  ${offenders.join("\n  ")}\n`
    + `§4.3: there is no generic semantic join. There are BINDINGS -- two models' elements denote the `
    + `same thing -- and COMPOSITIONS -- one domain's result restricts another's question -- and both `
    + `are typed registry rows carrying a semantic basis. A combinator added as a form or a row buys `
    + `convenience by making the cross-model relationship unnameable, which is what the 261004 ruling `
    + `refused. If the new thing is genuinely neither a binding nor a composition, that is a design `
    + `question for §4, not a vocabulary entry.`);

  // The guard reaches a non-trivial surface. Without this it would pass on an empty registry, which
  // is how a vocabulary check quietly stops checking.
  const surface = MODEL_TYPES.flatMap((t) => t.query.forms).length + BINDINGS.length + COMPOSITIONS.length;
  assert.ok(surface > 15, `only ${surface} declared names were scanned -- the registries did not load`);
});

/**
 * The banned-combinator matcher FIRES — negative control.
 *
 * A forbidding assertion at zero findings is indistinguishable from a broken matcher, and this one
 * will sit at zero for its whole life. So the matcher is driven directly.
 */
test("§20.1: the banned-combinator matcher fires — negative control", () => {
  assert.equal(bannedWordIn("semantic-join"), "join");
  assert.equal(bannedWordIn("joinModels"), "join");
  assert.equal(bannedWordIn("fold-executions"), "fold");
  assert.equal(bannedWordIn("flat_map"), "flatmap");

  // Must NOT fire: the demoted navigation affordance the ruling licenses, and words that merely
  // contain a banned spelling.
  assert.equal(bannedWordIn("combineWith"), null);
  assert.equal(bannedWordIn("conjoined"), null);
  assert.equal(bannedWordIn("shortest-path"), null);
  assert.equal(bannedWordIn("executions-selected-by-behaviour"), null);
});

// ----------------------------------------------------------------------------------------------
// Criterion 14 — the flagship mapping
// ----------------------------------------------------------------------------------------------

/**
 * Criterion 14's checkable half, and the half that is NOT checkable from here.
 *
 * The audit ruled the mapping: §21's five flagships are `message-bus`, `transaction-workspace`,
 * `document-processing` (realising Processing Pipeline), `embedded-sensor-node` and
 * `autonomous-delivery`; `worker-queue` is a sixth that ships as a bonus, with its membership
 * question declared open at `src/app/examples.ts`. Six ship, and the criterion's "all five built-in
 * examples ship" was false when written.
 *
 * **What nothing in code names is WHICH five.** `SHIPPED_EXAMPLE_IDS` carries six ids in menu order
 * with no flagship flag, so a seventh example added tomorrow is indistinguishable from a sixth
 * flagship. Closing that needs a declared subset in the registry — `FLAGSHIP_IDS`, or a per-row
 * flag — which is a registry change outside this wave's scope and is reported rather than reached.
 * Declaring the five HERE was considered and refused: it would make the test file the registry, so
 * the Learn cards and the menu could not see the distinction, and it is the same double-entry shape
 * this session removed from `test/conformance.test.ts`.
 *
 * So this holds the part that does not need the declaration: every id the registry ships resolves to
 * a directory with a fixture, and the set is read rather than counted.
 *
 * **Where it passes while the property is violated:** everywhere the mapping lives. A seventh
 * example lands green here. `document-processing` could be rewritten to stop realising a Processing
 * Pipeline and nothing would notice, because the mapping from a §21 slot to an id exists only in
 * prose. That is criterion 14's real gap, and this test does not close it — it keeps the id set
 * honest about what is on disk while the gap stays open and named.
 */
test("§20.14: every shipped example id resolves to a built-in on disk", () => {
  assert.ok(SHIPPED_EXAMPLE_IDS.length > 0, "the shipped set is empty");
  assert.deepEqual([...SHIPPED_EXAMPLE_IDS], [...new Set(SHIPPED_EXAMPLE_IDS)],
    "an example id is listed twice, so the menu offers one example under two slots");

  for (const id of SHIPPED_EXAMPLE_IDS) {
    for (const file of ["system.mage.yaml", "expected-results.yaml"]) {
      const path = `examples/${id}/${file}`;
      assert.ok(readFileSync(path, "utf8").length > 400,
        `${path} is missing or too short -- '${id}' is offered by the menu and does not ship`);
    }
  }
});

// ----------------------------------------------------------------------------------------------
// Criterion 22 — the temporal layer is engine-internal, and nothing authored reaches it
// ----------------------------------------------------------------------------------------------

/**
 * The vocabulary an authored temporal surface would arrive under, closed.
 *
 * Measured against every published schema's enums and keys, the registered query forms and the
 * capability registry before landing: zero hits on all of them, including the risky common words
 * (`until`, `always`, `finally`). `next` is deliberately ABSENT — it is too ordinary a word to ban
 * across a schema's whole key space, and `X` arrives through the same `formula` surface the others do.
 *
 * `weakuntil` is absent for a different reason, and the negative control is what found it: `until` is
 * a substring of it, so a `weakuntil` entry can never be the word reported and would widen the list
 * without widening what it catches. A dead member of a closed set tells a later reader the set reaches
 * further than it does.
 */
const TEMPORAL_VOCABULARY = [
  "ltl", "temporal", "always", "eventually", "until", "globally", "finally", "formula",
] as const;

const namesTemporal = (name: string): string | null => {
  const flat = name.toLowerCase().replace(/[^a-z]/g, "");
  return TEMPORAL_VOCABULARY.find((w) => flat.includes(w)) ?? null;
};

/**
 * Criterion 22, held on the four axes an authored temporal question would have to arrive on.
 *
 * **This guard asserts an ABSENCE that the author ratified, and that is its whole job.** The LTL layer
 * is built, specified and tested, and the temporal criteria are satisfied AT that layer. What the
 * ratified decision adds is that *"implemented" is not "part of the language"*: wiring the layer to
 * make the gate's wording come true would force the authored temporal vocabulary, the query-form
 * registry entry, the schema and the facade row to be decided by gate pressure. So v0.2 declares the
 * layer engine-internal, and this is what stops the declaration from drifting into a surface nobody
 * decided to build.
 *
 * **It goes RED when v0.3 lands the slice, and that is correct.** A red here means criterion 22 needs
 * rewriting, not that the wiring is wrong — `SCOPE-v03-temporal-slice-261005.md` says so from the
 * other end, and the four axes below are the four the slice must populate.
 *
 * **Where it passes while the property is violated:** it matches NAMES on three axes and IMPORTS on
 * the fourth, so a temporal surface under an innocent name defeats it. A `behaviorQuery.form` called
 * `"pattern"` taking a formula string would be author-reachable temporal querying and would pass here
 * without comment. The import axis is the strong one — the entry point cannot be called from a surface
 * that does not import it — but it reads the tracked tree, so an untracked file is outside it, and a
 * dynamic import evades it.
 */
test("§20.22: no authored surface admits a temporal formula, and the entry point has no src consumer", () => {
  // The criterion must exist in §20 for these axes to be filed under it. Read, not transcribed: a
  // guard whose criterion was deleted should fail rather than keep holding a line nobody claims.
  const criteria = releaseGateCriteria();
  const declaring = criteria.filter((c) => c.includes("not author-reachable"));
  assert.equal(declaring.length, 1,
    `§20 should carry exactly one criterion declaring a layer not author-reachable; it carries `
    + `${declaring.length}. If the declaration was removed, these axes no longer hold a criterion and `
    + `the gate is back to certifying a layer no student can reach. If it was duplicated, one copy `
    + `will rot.`);

  const offenders: string[] = [];

  // Axis 1 -- the registered query forms. A temporal question reaching a student arrives as a form.
  for (const type of MODEL_TYPES) {
    for (const form of type.query.forms) {
      const hit = namesTemporal(form);
      if (hit !== null) offenders.push(`MODEL_TYPES['${type.id}'].query.forms: '${form}' (${hit})`);
    }
    for (const p of type.query.primitives) {
      const hit = namesTemporal(p.form);
      if (hit !== null) offenders.push(`MODEL_TYPES['${type.id}'].query.primitives: '${p.form}' (${hit})`);
    }
  }

  // Axis 2 -- what an author can WRITE. A formula surface needs a schema enum member or a key.
  for (const file of SCHEMAS) {
    for (const site of schemaEnums(file)) {
      for (const member of site.members) {
        const hit = namesTemporal(member);
        if (hit !== null) offenders.push(`${site.path}: '${member}' (${hit})`);
      }
    }
    for (const key of schemaKeys(file)) {
      const hit = namesTemporal(key);
      if (hit !== null) offenders.push(`${file} key '${key}' (${hit})`);
    }
  }

  // Axis 3 -- the capability registry, which is what criterion 20's parity gate ranges over. A
  // temporal capability registered here would be claimed on both surfaces by that gate's own rule.
  // The id and the service, not the summary: a summary is prose that may legitimately say "eventually"
  // in a sentence, while an id and a service name are vocabulary.
  for (const cap of CAPABILITIES) {
    const hit = namesTemporal(`${cap.id} ${cap.service}`);
    if (hit !== null) offenders.push(`CAPABILITIES['${cap.id}'] (${hit})`);
  }
  assert.ok(CAPABILITIES.length > 1, "the capability registry did not load");

  assert.deepEqual(offenders, [],
    `an authored temporal surface has landed:\n  ${offenders.join("\n  ")}\n`
    + `§20's non-reachability criterion declares the temporal layer engine-internal in v0.2. If this `
    + `is the v0.3 slice, it is welcome -- rewrite the criterion and invert this guard per `
    + `SCOPE-v03-temporal-slice-261005.md, which names the four things the slice must settle. If it `
    + `arrived to make a gate's wording come true, that is the move the 261005 ruling refused: `
    + `"implemented" is not "part of the language".`);

  // Axis 4 -- the entry point has no `src/` consumer, and the engine's barrel does not re-export it.
  // The strong axis: a surface cannot dispatch to a function it cannot name.
  const trackedSrc = execFileSync("git", ["ls-files", "--", "workbench/src/*.ts"], {
    encoding: "utf8", cwd: "..",
  }).split("\n").filter((p) => p.endsWith(".ts"));
  assert.ok(trackedSrc.length > 50, `expected the src tree, found ${trackedSrc.length} tracked files`);

  const ltlModules = trackedSrc.filter((p) => /\/ltl[^/]*\.ts$/.test(p));
  assert.ok(ltlModules.length > 0, "no LTL module is tracked, so this axis lost its subject");

  const consumers: string[] = [];
  for (const rel of trackedSrc) {
    if (ltlModules.includes(rel)) continue;
    const text = readFileSync(`../${rel}`, "utf8");
    if (/\brunLtlProperty\b/.test(text)) consumers.push(`${rel} names runLtlProperty`);
    for (const m of text.matchAll(/from\s+"([^"]*\/ltl[^"]*\.ts)"/g)) {
      consumers.push(`${rel} imports ${m[1]}`);
    }
  }
  assert.deepEqual(consumers, [],
    `the LTL layer has a src consumer:\n  ${consumers.join("\n  ")}\n`
    + `That is what makes it reachable, whatever the vocabularies say. The layer's own comment states `
    + `the reason it has none: "a formula surface that has not been designed is not a capability to `
    + `advertise."`);
});

/**
 * The temporal matcher FIRES — negative control.
 *
 * The assertion above sits at zero for its whole v0.2 life, so at zero findings it is
 * indistinguishable from a matcher that matches nothing. Driven directly, including the shapes a
 * temporal form would plausibly take.
 */
test("§20.22: the temporal matcher fires — negative control", () => {
  assert.equal(namesTemporal("ltl-property"), "ltl");
  assert.equal(namesTemporal("temporalFormula"), "temporal");
  assert.equal(namesTemporal("eventually"), "eventually");
  assert.equal(namesTemporal("weak_until"), "until");
  assert.equal(namesTemporal("formula"), "formula");

  // Must NOT fire: every form and registry name that ships today.
  for (const name of ["reach", "invariant", "recurrence", "repeatable-cycle", "deadend",
    "transition-live", "executions-selected-by-behaviour", "shortest-path", "peak_memory"]) {
    assert.equal(namesTemporal(name), null, `'${name}' ships and must not match`);
  }
});
