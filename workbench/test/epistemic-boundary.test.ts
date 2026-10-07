// EPISTEMIC-BOUNDARY — what the UI shows as an answer comes from the engine; what is the author's
// own explanation is distinguishable from one.
//
// THE FAILURE CLASS: a string the workbench displays as explanation, which the engine never
// consumed, reads as derived evidence. Invariant A1 says annotation SHALL NOT alter interpretation
// or analysis, and that half is held structurally — `systemHash` excludes annotation, so no note can
// move a verdict. The half with no holder is the one a reader experiences: A1 guarantees the
// author's sentence changed no result, and guarantees nothing about whether anyone can TELL. The
// release audit measured exactly this gap: notes, labels and absence prose are inert for verdicts
// and rendered, and the caveat treatment covers one note kind out of five.
//
// It is the sibling of the SEMANTIC-LIVE defect one layer out. There, prose credited an inert
// DECLARATION. Here, prose occupies a channel a reader reads as the engine's.
//
// ## Extending the partial mechanism rather than adding a second channel
//
// A mechanism already exists: `view-model.ts` sets `notesCaveat` when a note claims an assumption,
// and the inspector states the same sentence over the same objects. Two things were wrong with it as
// a holder of this invariant, and both are fixed rather than worked around:
//
//   1. **The PREDICATE had two homes.** Each surface spelled `kind === "assumption"` for itself, so
//      extending the policy to a second kind would have moved one surface and left the other saying
//      the boundary is somewhere else. Both now call `notesCaveatFor`, and the scan at the foot of
//      this file keeps the comparison in one module.
//   2. **Its coverage was a judgement nobody had written down.** Four of the five note kinds carry
//      no caveat, which is defensible — each line shows its kind as a word, and `assumption` is the
//      one that READS as binding — but from the code alone a decided omission and a forgotten one
//      looked identical. `NOTE_KIND_DISPOSITION` below states one per kind, and is required to be
//      total over `NoteKind`, so a sixth kind cannot land with nobody having chosen a side.
//
// ## The axis: VERDICT-BEARING, not authored-versus-assembled
//
// The first rule drafted here was "no authored string inside a derived channel", and MEASURING it
// refuted it: a model row's `detail` legitimately assembles the purpose question, `represents` and
// `omits` behind naming prefixes (`asks:`, `represents`, `deliberately omits`), a relation row's
// assembles the relation type's `description` and `absence` behind `Absence means:`, and the
// machine-row code says in terms that it keeps purpose in `detail` as well as in the labelled block.
// Thirty-four such crossings exist in the docable fixture alone and every one is a correct design —
// a descriptive row describing the model with the authored words, labelled.
//
// So the axis is narrower and sharper: the channels a reader takes for the ENGINE'S ANSWER. Those
// are the property rows' verdict fields and the banner. An authored sentence there is
// indistinguishable from a derived one, and nothing else in the view model makes that mistake
// possible. Reporting the 34 descriptive crossings would have been a false red on a wiring check,
// which is how a wiring check gets deleted.
//
// ## The sanctioned crossing, and why it is declared rather than special-cased
//
// `PropertyRow.refusal` quotes `purpose.omits` on purpose. The refusal rung consults the
// declaration — `src/engine/omission.ts` finds the omission that covers an unresolvable name, and
// `src/sparql/refusal.ts` quotes the author's own wording and says to drop it from `purpose.omits`
// if the question should be answerable. So `omits` is authored text the engine READS, the quotation
// is the evidence, and the refusal names its source. That makes it a crossing with a reason rather
// than an exception, so it is declared in `SANCTIONED_VERDICT_QUOTES` with the file and the call
// that justify it, checked — the discipline `test/gate-reachability.test.ts` uses for an exempted
// gate, for the same cause: an exemption someone decided and one someone forgot read the same.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { parse } from "yaml";
import { canonicalize } from "../src/ir/canonicalize.ts";
import { systemHash } from "../src/ir/hash.ts";
import { validate } from "../src/validator/rules.ts";
import { evaluateProperties } from "../src/app/properties.ts";
import { runSavedQueries } from "../src/engine/index.ts";
import { buildViewModel, CAVEAT, CAVEATED_NOTE_KINDS, notesCaveatFor } from "../src/ui/view-model.ts";
import type { PropertyRow, Row, ViewModel } from "../src/ui/view-model.ts";
import { authoredStrings, checkEpistemicBoundary, verdictFields } from "../src/ui/invariants.ts";
import { NOTE_KINDS } from "../src/transaction/types.ts";
import type { CanonicalSystem, NoteKind, QueryResult } from "../src/ir/types.ts";
import { EXAMPLE_IDS, exampleText, loadExample } from "../scripts/gen-example-coverage.ts";
import { HELD_BY } from "./perturbation.ts";

// ----------------------------------------------------------------------------------------------
// The systems under test
// ----------------------------------------------------------------------------------------------

/**
 * Every shipped system, plus the docable fixture the view-model suite is built on.
 *
 * Both, because they fail differently: the six examples are the corpus a student reads and carry the
 * notes and the purposes, and docable is the one system with saved properties that EVALUATE — so it
 * is the only one that produces populated verdict fields for the first rule to read.
 */
const SYSTEMS: readonly { readonly id: string; readonly system: CanonicalSystem }[] = [
  ...EXAMPLE_IDS.map((id) => ({ id, system: canonicalize(parse(exampleText(id))) })),
  { id: "docable", system: canonicalize(parse(readFileSync("examples/docable.mage.yaml", "utf8"))) },
];

/**
 * The view model with the REAL engine's answers behind it.
 *
 * Seeded from `runSavedQueries` rather than from an empty map, because the fields this gate is about
 * are the ones a result populates: with no results every property row reports "not evaluated" and
 * `evidence`, `coverage` and `refusal` are empty, so the rule would read a blank verdict channel and
 * report a pass having compared nothing. The whole point is to inspect a POPULATED answer.
 */
const viewOf = (system: CanonicalSystem): ViewModel => {
  const results = new Map<string, QueryResult>();
  for (const [id, answer] of runSavedQueries(system)) results.set(id, answer.result);
  return buildViewModel(system, validate(system), evaluateProperties(system, results, systemHash(system)),
    { hypothesis: null, selection: [] });
};

// ----------------------------------------------------------------------------------------------
// The channel census — total over the live object, not over a list
// ----------------------------------------------------------------------------------------------

/**
 * What every string-bearing channel of the view model IS, so a new one cannot land undisposed.
 *
 *   `verdict`      the engine's answer. Nothing authored may appear here.
 *   `quotes`       the engine's answer, quoting the author with the source named. Declared below.
 *   `authored`     the author's own words, rendered as theirs. `statement` is the one: §10.3 asks
 *                  for the claim in the author's words, and it sits beside `status`, which decides
 *                  it — two fields, two labels, which is the distinction this invariant wants.
 *   `descriptive`  a row describing the model. Assembles authored facts behind naming prefixes;
 *                  carries no verdict, so it is not a channel a reader reads as evidence.
 *   `structural`   an id, a key, a flag, a wire value. Not prose at all.
 *
 * The DENOMINATOR is the live object's keys, so this table is checked against what the type actually
 * has rather than against a copy of it — the discipline `test/derived-values.test.ts` polices. A key
 * with no disposition fails, and a disposition naming no key fails too: an entry for a field that
 * was renamed claims a decision about something nobody looked at.
 */
const ROW_CHANNELS: Readonly<Record<string, "descriptive" | "structural" | "authored">> = {
  id: "structural",
  label: "descriptive",
  kind: "descriptive",
  detail: "descriptive",
  // "Model in words" — the stored description, quoted verbatim. The author's own prose by
  // definition, which is exactly why it must never land in a verdict-bearing channel.
  words: "authored",
  purpose: "authored",
  assertedBy: "structural",
  states: "descriptive",
  notes: "authored",
  provenance: "authored",
  notesCaveat: "authored",
};

const PROPERTY_CHANNELS: Readonly<Record<string, "verdict" | "quotes" | "authored" | "structural">> = {
  id: "structural",
  statement: "authored",
  kind: "structural",
  status: "verdict",
  statusKey: "structural",
  verdict: "verdict",
  coverage: "verdict",
  grounds: "verdict",
  groundSubjects: "structural",
  // The cross-model marker: derived from the statement's own atoms spanning machines — structure
  // of the saved question, not a verdict about it.
  composes: "structural",
  groundsMissing: "verdict",
  evidence: "verdict",
  refusal: "quotes",
  compilation: "verdict",
  expectation: "verdict",
  revision: "verdict",
  stale: "structural",
};

/**
 * Verdict fields a caller has declared may quote the author, with the evidence that the engine reads
 * the quoted declaration.
 *
 * `evidenceIn` / `evidence` are checked, so the claim cannot rot into a comment: if the refusal rung
 * stops consulting `purpose.omits`, the quotation stops being evidence and this declaration fails
 * before anyone has to notice the prose.
 */
const SANCTIONED_VERDICT_QUOTES: Readonly<Record<string, {
  readonly evidenceIn: string; readonly evidence: string; readonly reason: string;
}>> = {
  refusal: {
    evidenceIn: "src/engine/omission.ts",
    evidence: "purpose.omits.find",
    reason: "A refusal whose cause is a declared omission quotes the author's own wording, and the "
      + "refusal rung CONSULTS that declaration to decide the cause — so `purpose.omits` is authored "
      + "text the engine reads, the quotation is the evidence rather than decoration, and the "
      + "sentence names where it came from and what to do about it.",
  },
};

/** A reason floor, for the cause stated in `test/gate-reachability.test.ts`. */
const MIN_REASON = 60;

/**
 * The note kinds, as a list, derived from the record the transaction layer owns.
 *
 * `NOTE_KINDS` is a `Record<NoteKind, true>` because its job there is membership testing. A second
 * literal list here would be the drift this file polices elsewhere, so the keys are read instead and
 * narrowed back to the union the record is keyed by.
 */
const noteKinds = (): readonly NoteKind[] => Object.keys(NOTE_KINDS) as readonly NoteKind[];

/**
 * One disposition per note kind: does its rendering carry the A1 caveat, and why.
 *
 * Required to be TOTAL over `NoteKind`. Every kind is non-semantic, so this is not about what
 * analysis reads — it is about which kinds a reader is liable to take for a constraint.
 */
const NOTE_KIND_DISPOSITION: Readonly<Record<NoteKind, { readonly caveated: boolean; readonly reason: string }>> = {
  assumption: {
    caveated: true,
    reason: "The one kind whose NAME claims force. A reader who meets 'assumption: the queue drains "
      + "within a second' reasonably takes it for a premise the analysis used, and it is not one, so "
      + "the boundary has to be said in words wherever the note is shown.",
  },
  comment: {
    caveated: false,
    reason: "An aside, and the word 'comment' claims nothing about analysis. Captioning every "
      + "comment with the A1 sentence would put the caveat on almost every annotated row, and a "
      + "caveat a reader meets everywhere is one they stop reading — including on the assumption.",
  },
  rationale: {
    caveated: false,
    reason: "Why the model has this shape. It describes the AUTHOR's reasoning rather than the "
      + "system's behaviour, so it does not read as a constraint on an execution; the kind-word is "
      + "the distinction, shown beside each line.",
  },
  question: {
    caveated: false,
    reason: "An open question. Interrogative on its face, so it cannot be mistaken for a premise an "
      + "analysis consumed — a reader's risk here is the opposite one, taking it for a gap in the "
      + "model, which is what it is.",
  },
  todo: {
    caveated: false,
    reason: "Work not done. Names a future change rather than a present constraint, and the "
      + "kind-word says so; the A1 sentence would be answering a question nobody asked of it.",
  },
};

// ----------------------------------------------------------------------------------------------
// The gate
// ----------------------------------------------------------------------------------------------

test("the channel census is total over what the view model actually renders", () => {
  // The denominator comes from the live objects, so a field added to `Row` or `PropertyRow` lands in
  // the policed set by existing. A literal list of fields here would be a second copy of the type.
  const rows: Row[] = SYSTEMS.flatMap(({ system }) => viewOf(system).sections.flatMap((s) => s.rows));
  assert.ok(rows.length > 50, `walked ${rows.length} row(s) — the view models are not being built`);
  const rowKeys = new Set(rows.flatMap((r) => Object.keys(r)));
  assert.ok(rowKeys.size > 5, `a row has ${rowKeys.size} key(s); the walk is reading the wrong object`);
  for (const key of [...rowKeys].sort()) {
    assert.ok(ROW_CHANNELS[key] !== undefined,
      `Row carries '${key}' and ROW_CHANNELS disposes it as nothing. Say what the channel IS: a `
      + `verdict a reader takes for the engine's answer, the author's own words, a descriptive `
      + `assembly, or structure. An undisposed channel is how authored prose reaches a verdict.`);
  }
  for (const key of Object.keys(ROW_CHANNELS)) {
    assert.ok(rowKeys.has(key), `ROW_CHANNELS disposes '${key}', which no row carries. An entry for a `
      + `renamed field claims a decision about something nobody looked at.`);
  }

  // The docable fixture is the one with evaluated properties, so it is where the property rows are.
  const docable = SYSTEMS.find((s) => s.id === "docable");
  assert.ok(docable !== undefined, "the docable fixture must be among the systems under test");
  const properties: readonly PropertyRow[] = viewOf(docable.system).properties;
  assert.ok(properties.length > 0, "docable renders no property rows, so the verdict census is empty");
  const propKeys = new Set(properties.flatMap((p) => Object.keys(p)));
  for (const key of [...propKeys].sort()) {
    assert.ok(PROPERTY_CHANNELS[key] !== undefined,
      `PropertyRow carries '${key}' and PROPERTY_CHANNELS disposes it as nothing. A property row is `
      + `where a reader looks for the answer, so an undisposed field there is the exact gap this `
      + `gate is about.`);
  }
  for (const key of Object.keys(PROPERTY_CHANNELS)) {
    assert.ok(propKeys.has(key), `PROPERTY_CHANNELS disposes '${key}', which no property row carries.`);
  }

  // Every field the invariant READS must be disposed `verdict` or `quotes`, or the function and the
  // census have drifted apart and one of them is policing a set the other does not know about.
  // The union across EVERY property row in every system, not one row's. An array channel
  // (`evidence`, `grounds`, `compilation`) contributes no entry while it is empty, so reading one
  // row would report a populated channel as unreachable -- a probe that found nothing, reported as a
  // finding about the code.
  const everyProperty = SYSTEMS.flatMap(({ system }) => viewOf(system).properties);
  const read = new Set(everyProperty.flatMap((p) => verdictFields(p))
    .map(([field]) => field.replace(/\[\d+\]$/, "")));
  for (const field of read) {
    const disposition = PROPERTY_CHANNELS[field];
    assert.ok(disposition === "verdict" || disposition === "quotes",
      `checkEpistemicBoundary reads '${field}' as an answer field and the census calls it `
      + `'${String(disposition)}'. The function and the table must agree about what an answer is.`);
  }
  for (const [field, d] of Object.entries(PROPERTY_CHANNELS)) {
    if (d !== "verdict" && d !== "quotes") continue;
    assert.ok(read.has(field), `the census calls '${field}' an answer channel and `
      + `\`verdictFields\` does not return it, so nothing checks it. An answer channel outside the `
      + `function's reach is an unpoliced channel — and for a sanctioned quote it would make the `
      + `declaration decorative, since withdrawing it would change nothing.`);
  }
});

test("the sanctioned verdict quotes are declared with evidence that still holds", () => {
  for (const [field, s] of Object.entries(SANCTIONED_VERDICT_QUOTES)) {
    assert.equal(PROPERTY_CHANNELS[field], "quotes",
      `'${field}' is declared a sanctioned quote and the census does not call it one`);
    assert.ok(s.reason.trim().length >= MIN_REASON,
      `the declaration for '${field}' carries a ${s.reason.trim().length}-character reason; at least `
      + `${MIN_REASON} are required. Say what the engine does with the quoted declaration.`);
    assert.ok(existsSync(s.evidenceIn),
      `'${field}' is sanctioned on the evidence of ${s.evidenceIn}, which does not exist`);
    assert.ok(readFileSync(s.evidenceIn, "utf8").includes(s.evidence),
      `'${field}' is sanctioned on the evidence that ${s.evidenceIn} contains \`${s.evidence}\`, and `
      + `it does not. Either the engine stopped consulting the declaration — in which case the `
      + `quotation is no longer evidence — or the declaration names the wrong call.`);
  }
  for (const [field, d] of Object.entries(PROPERTY_CHANNELS)) {
    if (d !== "quotes") continue;
    assert.ok(SANCTIONED_VERDICT_QUOTES[field] !== undefined,
      `the census calls '${field}' a sanctioned quote and nothing declares why. A verdict field that `
      + `may carry the author's words with no stated reason is the invariant's blind spot, not its `
      + `exception.`);
  }
});

test("no authored string reaches a verdict channel, across every shipped system", () => {
  const sanctioned = new Set(Object.keys(SANCTIONED_VERDICT_QUOTES));
  const violations = SYSTEMS.flatMap(({ id, system }) =>
    checkEpistemicBoundary(viewOf(system), system, sanctioned)
      .map((v) => `${id}: ${v.subject} — ${v.problem}`));
  assert.deepEqual(violations, [], `epistemic boundary:\n  ${violations.join("\n  ")}\n`);
});

test("the authored-string census finds the prose it is supposed to compare against", () => {
  // Every rule above passes trivially over an empty authored set, and "nothing matched" is the
  // expected output of reading the wrong object. So the input is asserted on its own.
  let total = 0;
  for (const { id, system } of SYSTEMS) {
    const authored = authoredStrings(system);
    total += authored.length;
    const homes = new Set(authored.map((a) => a.home.split(".")[1] ?? ""));
    assert.ok(authored.length > 0, `${id}: the authored-string census is empty`);
    assert.ok(homes.has("purpose"), `${id}: no purpose text reached the census`);
  }
  assert.ok(total > 100, `${total} authored string(s) across ${SYSTEMS.length} systems — too few to `
    + "be the corpus; the census is reading the wrong fields");
  // `purpose.omits` is EXCLUDED on purpose, and its exclusion is the sanctioned crossing's premise.
  // If it drifted back in, the refusal rule would report every omission-caused refusal.
  for (const { id, system } of SYSTEMS) {
    // By HOME, not by text. The same phrase is legitimately one model's `represents` and another's
    // `omits` -- `permitted invocation` is both in the docable fixture -- so comparing texts would
    // assert the census must drop a string it reads for a different and correct reason.
    const homes = authoredStrings(system).map((a) => a.home);
    assert.deepEqual(homes.filter((h) => h.endsWith(".purpose.omits")), [],
      `${id}: a declared omission reached the authored census from an omits home, which would report `
      + "every omission-caused refusal as a violation of the boundary it is evidence for");
  }
});

test("every note kind is disposed, and the rendered caveat matches its disposition", () => {
  // TOTAL over `NoteKind`, derived from the kind list the transaction layer owns rather than from a
  // copy. A sixth kind lands in the policed set by existing.
  for (const kind of noteKinds()) {
    const d = NOTE_KIND_DISPOSITION[kind];
    assert.ok(d !== undefined, `note kind '${kind}' has no disposition. Decide whether its rendering `
      + "carries the A1 caveat and say why — from the code alone a decided omission and a forgotten "
      + "one look the same.");
    assert.ok(d.reason.trim().length >= MIN_REASON,
      `'${kind}' is disposed with a ${d.reason.trim().length}-character reason; at least `
      + `${MIN_REASON} are required.`);
    assert.equal(d.caveated, CAVEATED_NOTE_KINDS.has(kind),
      `'${kind}' is disposed caveated=${String(d.caveated)} and CAVEATED_NOTE_KINDS says otherwise. `
      + "The table is the reasoning and the set is the behaviour; they must be one decision.");
  }
  for (const kind of Object.keys(NOTE_KIND_DISPOSITION)) {
    assert.ok((noteKinds() as readonly string[]).includes(kind),
      `'${kind}' is disposed and is not a note kind. The entry outlived its subject.`);
  }
  // At least one kind on each side, or the disposition is a formality over a set that cannot differ.
  assert.ok(noteKinds().some((k) => NOTE_KIND_DISPOSITION[k].caveated), "no kind is caveated");
  assert.ok(noteKinds().some((k) => !NOTE_KIND_DISPOSITION[k].caveated), "every kind is caveated");

  // The behaviour, over the real corpus: the caveat is present exactly where a caveated kind is.
  let caveated = 0;
  for (const { id, system } of SYSTEMS) {
    for (const section of viewOf(system).sections) {
      for (const row of section.rows) {
        const expected = notesCaveatFor(row.notes);
        assert.equal(row.notesCaveat, expected,
          `${id}/${section.id}/${row.id}: notesCaveat is ${JSON.stringify(row.notesCaveat)} and the `
          + `shared predicate says ${JSON.stringify(expected)}`);
        if (row.notesCaveat !== null) caveated += 1;
      }
    }
  }
  assert.ok(caveated > 0, "no row in the whole corpus carries the caveat, so the behaviour assertion "
    + "above is vacuous — either no example declares an assumption note, or the caveat is not wired");
});

test("the caveat predicate has ONE home, so extending it cannot move one surface and not the other", () => {
  // The structural half. The sentence was already shared; the PREDICATE was not, and each surface
  // deciding which kinds get the caveat for itself is how two surfaces come to say the boundary is in
  // different places. Read over comment-stripped text, the lesson a naive sweep learned when it
  // matched `<section>` inside an HTML comment: this file argues about the comparison it forbids.
  const strip = (text: string): string =>
    text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
  const OWNER = "src/ui/view-model.ts";
  const files = readdirSync("src", { recursive: true, encoding: "utf8" })
    .map((entry) => `src/${entry}`)
    .filter((path) => path.endsWith(".ts") && statSync(path).isFile());
  assert.ok(files.length > 20, `walked ${files.length} source file(s) — the tree walk is wrong`);

  // The comparison, in any spelling that decides caveat membership from a kind.
  const COMPARISON = /\bkind\s*(?:===|==)\s*["'`]assumption["'`]|["'`]assumption["'`]\s*(?:===|==)\s*\S*\bkind\b/;
  const offenders = files
    .filter((path) => path !== OWNER && COMPARISON.test(strip(readFileSync(path, "utf8"))))
    .sort();
  assert.deepEqual(offenders, [], `these files decide the caveat's kind membership for themselves: `
    + `${offenders.join(", ")}. Import \`notesCaveatFor\` from ${OWNER} instead — the predicate is `
    + `the policy, and a second copy of it is a second policy.`);

  // And the owner must still BE the owner, or the ban above polices an empty rule.
  const owner = strip(readFileSync(OWNER, "utf8"));
  assert.match(owner, /CAVEATED_NOTE_KINDS/, `${OWNER} no longer declares the caveated-kind set`);
  assert.match(owner, /export const notesCaveatFor/, `${OWNER} no longer exports the predicate`);
  // Both consumers must reach it, or one of them has quietly stopped saying the boundary at all.
  for (const consumer of ["src/ui/shell/inspector.ts"]) {
    assert.match(strip(readFileSync(consumer, "utf8")), /notesCaveatFor/,
      `${consumer} renders notes and does not call the shared predicate`);
  }
  assert.ok(CAVEAT.length > 60, "the caveat sentence must still say the boundary, not a word");
});

test("the inert label supplies this gate's substrate, rather than the display rule inferring it", () => {
  // The coordination point with the SEMANTIC-LIVE and TRUTH waves, settled 261005. "Displayed as
  // explanation but not consumed by the engine" is a predicate a display rule would otherwise have
  // to GUESS at — there is no way to look at a rendered relation row and know whether a query reads
  // the edge. `inert: true` + `held_by:` in the example's fixture is that predicate as DATA, already
  // measured against the engine by `test/semantic-live.test.ts`, so the display rule becomes a
  // rendering of a verified fact.
  //
  // This asserts the data is PRESENT and USABLE — every labelled declaration names a holder from a
  // closed vocabulary, so a chip like "rationale, held by a parity check — not consumed by the
  // engine" is constructible. It does NOT assert the chip exists: no surface renders it today, and a
  // test claiming otherwise would be the vacuous half this repo keeps finding. The renderer is a
  // declared follow-up, named here so it is a decision rather than an oversight.
  // IMPORTED, not re-declared. A copy here would be a second vocabulary, and the first draft of
  // this join was exactly that -- two sets plus a text scan asserting the sibling mentioned every
  // member. Sabotage proved the scan toothless: the renamed member was still mentioned in the
  // sibling's own fixtures, so a diverged vocabulary passed. One import, held by the compiler.
  let labelled = 0;
  const bad: string[] = [];
  for (const id of EXAMPLE_IDS) {
    for (const row of loadExample(id).fixture.declarations) {
      labelled += 1;
      if (!HELD_BY.has(row.heldBy)) {
        bad.push(`${id}/${row.id}: held_by '${row.heldBy}' is outside the vocabulary a display rule `
          + `can render (${[...HELD_BY].join(", ")})`);
      }
      if (row.reason.trim().length < MIN_REASON) {
        bad.push(`${id}/${row.id}: the reason a reader would be shown is ${row.reason.trim().length} `
          + "characters");
      }
    }
  }
  assert.deepEqual(bad, [], bad.join("\n  "));
  assert.ok(labelled > 10, `${labelled} labelled declaration(s) across the corpus — too few to be `
    + "the substrate; either the ledger is empty or this is reading the wrong field");
  assert.ok(HELD_BY.size >= 3, `the holder vocabulary has ${HELD_BY.size} member(s); a vocabulary `
    + "with one member cannot distinguish what holds a declaration from the fact that something does");
});

test("the boundary check fires on each defect it exists to catch — negative control", () => {
  const docable = SYSTEMS.find((s) => s.id === "docable");
  assert.ok(docable !== undefined);
  const system = docable.system;
  const vm = viewOf(system);
  const authored = authoredStrings(system);
  const sample = [...authored].sort((a, b) => b.text.length - a.text.length)[0];
  assert.ok(sample !== undefined && sample.text.length > 20,
    "the corpus must carry a substantial authored string, or the injections below prove nothing");

  // The patched shape passes, so every delta is a delta against green.
  assert.deepEqual(checkEpistemicBoundary(vm, system), [], "the real view model must pass");

  // Instance: an authored sentence in a verdict field. Injected into `status`, which is what the
  // properties rail leads with — the field a reader quotes as the answer.
  const poisoned: ViewModel = {
    ...vm,
    properties: vm.properties.map((p, i) => (i === 0 ? { ...p, status: `Satisfied. ${sample.text}` } : p)),
  };
  const found = checkEpistemicBoundary(poisoned, system);
  assert.ok(found.length >= 1, `an authored string in a verdict field must be reported: ${found.length}`);
  assert.match(found[0]?.problem ?? "", /contains the authored string at/, "the report must say what is wrong");
  assert.match(found[0]?.problem ?? "", /purpose|notes|provenance/, "the report must name the authored home");
  assert.equal(found[0]?.invariant, "A1-PRESENTATION");

  // The SANCTIONED field must be exempt only while it is declared so. Same injection into `refusal`.
  const quoted: ViewModel = {
    ...vm,
    properties: vm.properties.map((p, i) => (i === 0 ? { ...p, refusal: `Not answerable. ${sample.text}` } : p)),
  };
  assert.deepEqual(checkEpistemicBoundary(quoted, system, new Set(["refusal"])), [],
    "a declared sanctioned quote must pass");
  assert.ok(checkEpistemicBoundary(quoted, system, new Set()).length >= 1,
    "the same string must be reported when the field is NOT sanctioned — otherwise the exemption is "
    + "doing nothing and the field was never checked");

  // A row that renders an assumption and states no boundary.
  const assumed = (notesCaveat: string | null): ViewModel => ({
    ...vm,
    sections: vm.sections.map((s, i) => (i !== 0 ? s : {
      ...s,
      rows: s.rows.map((r, j) => (j !== 0 ? r : {
        ...r,
        notes: [{ id: "n", kind: "assumption", text: "the queue drains within a second", author: null, warning: null }],
        notesCaveat,
      })),
    })),
  });
  const silent = checkEpistemicBoundary(assumed(null), system);
  assert.ok(silent.some((v) => /states no boundary/.test(v.problem)),
    `an uncaveated assumption must be reported: ${silent.map((v) => v.problem).join("; ")}`);
  assert.deepEqual(checkEpistemicBoundary(assumed(CAVEAT), system), [],
    "the same row with the boundary stated must pass");

  // And the other direction: a caveat on a row with nothing to caveat.
  const shouting: ViewModel = {
    ...vm,
    sections: vm.sections.map((s, i) => (i !== 0 ? s : {
      ...s, rows: s.rows.map((r) => ({ ...r, notes: [], notesCaveat: CAVEAT })),
    })),
  };
  const noisy = checkEpistemicBoundary(shouting, system);
  assert.ok(noisy.some((v) => /carrying no note of a caveated kind/.test(v.problem)),
    `a caveat with no assumption behind it must be reported: ${noisy.map((v) => v.problem).join("; ")}`);

  // A note of a NON-caveated kind must not demand one, or the rule would caveat everything.
  const commented: ViewModel = {
    ...vm,
    sections: vm.sections.map((s, i) => (i !== 0 ? s : {
      ...s,
      rows: s.rows.map((r, j) => (j !== 0 ? r : {
        ...r,
        notes: [{ id: "n", kind: "comment", text: "an aside", author: null, warning: null }],
        notesCaveat: null,
      })),
    })),
  };
  assert.deepEqual(checkEpistemicBoundary(commented, system), [],
    "a comment must not demand the assumption caveat");
});
