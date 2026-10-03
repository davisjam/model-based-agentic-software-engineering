// Derivable values must be derived, not copied.
//
// Four instances in one session, each fixed as an instance. The behaviour-form vocabulary lived in
// three places and the runtime copy silently drifted from the type. The browser gate asserted
// `describe()` reports 20 operations; it was 20 when written and 22 an hour later. Two lists of the
// shipped examples disagreed the moment a third example landed. And the EX-I3 test pinned
// "unavailable" for a coverage row whose status is DERIVED, so a real advance failed it.
//
// One shape each time: a fact expressible from a source of truth, copied instead. In the second
// case the author had been explicitly warned off pinning a different count in the same file, so
// guidance demonstrably did not hold the line. That is the argument for a control.
//
// WHAT THIS IS NOT. A general "is this literal derivable?" check is infeasible — the
// queryable-versus-legitimate signal is not deterministic, and a sibling project assessed exactly
// that question and rejected it. This check is narrow on purpose: it reads the sources of truth,
// which in this repo are enumerable and importable, and looks for THEIR values copied into a test
// or a generator.
//
// WHY THE SHAPE IS WHAT IT IS — measured before it was designed, which is the only order that
// produces a check worth keeping. A scan for each source's count as a bare literal anywhere in the
// suite returns 125 hits for the four sources (3 → 85, 10 → 28, 6 → 10, 24 → 2) against one true
// positive. Narrowing to "on a line that also names the source" leaves 8 hits, still one true
// positive. Narrowing instead to a CARDINALITY expression compared to a literal by equality leaves
// 8, and raising the floor to counts of four or more leaves 0. The distribution says why: of 179
// cardinality-vs-literal sites in the suite, 151 compare against 0, 1, 2 or 3. Small counts are the
// noise floor, so the cardinality rule declines to look at them. The member-LIST rule covers what
// that gives up: of 370 string-array literals in the suite, 0 have the member set of any source. An
// exact vocabulary copy is a clean signal where its length is not.
//
// WHAT THAT GIVES UP, stated so nobody rediscovers it as a surprise:
//   - `SHIPPED_EXAMPLE_IDS` has three members, so its count is below the floor and only its member
//     list is policed. One live instance escapes because of this — see UNCAUGHT below.
//   - Recurrence 4 is not covered by either rule. A pin of the single word "unavailable" is
//     indistinguishable from any other string, at any precision this file can reach.
//   - The scan covers `test/` and `scripts/`, not `src/`. A test or a generator has no reason to
//     re-declare a vocabulary it can import, which is what makes the rule safe there. Widening to
//     `src/` would need the declaring modules exempted from their own member lists, and would cost
//     a false positive at `src/ui/view-model.ts` (`p.length === 6`, a split arity that collides
//     with `BEHAVIOR_FORMS.length`). The schemas are excluded for a stronger reason: their enum
//     copies are deliberate, because the schema is the published authority for the wire format, and
//     `test/engine-forms.test.ts` already holds that split shut.
//
// NO REGISTRY MODULE. The sources could have been listed in a `src/app/derivable.ts` for this file
// to read. They are not, because such a module would be a second surface for "what are the sources
// of truth" and could drift from the actual sources — the very failure this check exists to catch.
// `SOURCES` below imports the real declarations, so there is no copy to drift. One consumer, one
// home; extract on the second.
//
// UNCAUGHT, found while measuring and left for its owner: `test/services.test.ts:434` asserts
// `first.catalog.ids().length, 3` where `catalog.ids()` returns `SHIPPED_EXAMPLE_IDS`. That is
// recurrence 3's exact shape, still live. It is below the cardinality floor and so is not reported
// here; another agent owns that file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { CAPABILITIES } from "../src/app/capabilities.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { MODEL_TYPES } from "../src/engine/model-types.ts";
import { BEHAVIOR_FORMS, GRAPH_FORMS } from "../src/engine/types.ts";

/** A fact a test can import instead of copying. */
interface DerivableSource {
  /** The identifier a reader has to type, so the message can say it. */
  readonly name: string;
  readonly module: string;
  /** What to write where a count was pinned. */
  readonly cardinality: string;
  /** What to write where a vocabulary was copied. */
  readonly list: string;
  readonly members: readonly string[];
}

const SOURCES: readonly DerivableSource[] = [
  {
    name: "CAPABILITIES",
    module: "src/app/capabilities.ts",
    cardinality: "CAPABILITIES.length",
    list: "CAPABILITIES.map((c) => c.id)",
    members: CAPABILITIES.map((c) => c.id),
  },
  {
    name: "SHIPPED_EXAMPLE_IDS",
    module: "src/app/examples.ts",
    cardinality: "SHIPPED_EXAMPLE_IDS.length",
    list: "SHIPPED_EXAMPLE_IDS",
    members: SHIPPED_EXAMPLE_IDS,
  },
  {
    name: "GRAPH_FORMS",
    module: "src/engine/types.ts",
    cardinality: "GRAPH_FORMS.length",
    list: "GRAPH_FORMS",
    members: GRAPH_FORMS,
  },
  {
    name: "BEHAVIOR_FORMS",
    module: "src/engine/types.ts",
    cardinality: "BEHAVIOR_FORMS.length",
    list: "BEHAVIOR_FORMS",
    members: BEHAVIOR_FORMS,
  },
  // Three members, so the cardinality rule's floor passes over it and only the member-list rule
  // polices it — the SHIPPED_EXAMPLE_IDS situation, accepted for the same reason.
  {
    name: "MODEL_TYPES",
    module: "src/engine/model-types.ts",
    cardinality: "MODEL_TYPES.length",
    list: "MODEL_TYPES.map((t) => t.id)",
    members: MODEL_TYPES.map((t) => t.id),
  },
];

/**
 * The floor under the cardinality rule, chosen from the measured distribution rather than taste:
 * 151 of the suite's 179 cardinality-vs-literal sites compare against 0, 1, 2 or 3. Lowering this
 * trades one more covered source for thirteen false positives, which is how a check gets disabled.
 */
const MIN_CARDINALITY = 4;

/**
 * A cardinality compared to an integer by EQUALITY.
 *
 * Inequalities are excluded deliberately: `assert.ok(files.length > 10)` is a sanity bound whose
 * number is a floor, not a snapshot, and including them doubled the hit count without adding a true
 * positive.
 *
 * The receiver set is `length`, `size`, `count` and stops there, which is also measured. An earlier
 * draft read only `length|size` — and then failed to catch a planted copy of the original
 * regression, because the browser gate pins `d.count`, not a `.length`. Adding `count` costs
 * nothing: 68 sites in scope, 0 collisions. Adding `total` and `n` costs one immediately
 * (`test/quant-eval.test.ts` asserts a quantity `total` of 10, which is not a cardinality), and
 * dropping the receiver constraint altogether costs three. A magnitude is not a count; that is where
 * the line goes.
 */
const CARDINALITY_PIN = /\.(?:length|size|count)\s*(?:,|===|==)\s*(\d+)\b/g;

/**
 * An array literal of nothing but string literals, which is the shape a copied vocabulary takes.
 * A mixed array is not a vocabulary snapshot. Newlines are permitted between elements because the
 * declarations themselves wrap.
 */
const STRING_ARRAY = /\[(?:\s*(?:"[^"\n]*"|'[^'\n]*')\s*,)*\s*(?:"[^"\n]*"|'[^'\n]*')\s*,?\s*\]/g;

/**
 * The escape hatch. A literal that genuinely must be frozen — a characterization test pinning
 * today's value on purpose — says so and says why. The reason is mandatory: an unjustified
 * suppression is how a control becomes decoration, so a bare marker is itself reported.
 *
 * It must be a standalone line comment on the line directly above. A trailing comment is
 * deliberately NOT honoured, which keeps the detector a line test instead of a parser — and keeps
 * this file from failing its own check, since every mention of the marker here sits inside a string
 * or after prose. `test/source-hygiene.test.ts` solved the same self-reference problem the same way.
 */
const SUPPRESSION = /^\s*\/\/\s*derived-values:allow\b[ \t]*(.*)$/;

const MIN_REASON = 12;

interface Violation {
  readonly where: string;
  readonly message: string;
}

/** 1-based line number of a character offset. */
const lineOf = (text: string, offset: number): number =>
  text.slice(0, offset).split("\n").length;

const stringsIn = (arrayText: string): readonly string[] =>
  [...arrayText.matchAll(/"([^"\n]*)"|'([^'\n]*)'/g)].map((m) => m[1] ?? m[2] ?? "");

/**
 * True for a line that is nothing but a comment, which cannot pin anything.
 *
 * Found by this check firing on its own header: the paragraph below describing the
 * `src/ui/view-model.ts` false positive quoted the offending shape, and a substring detector cannot
 * tell a quoted shape from a live one. Prose about a rule must not violate the rule.
 */
const isCommentOnly = (line: string): boolean => /^\s*(?:\/\/|\*|\/\*)/.test(line);

const sameSet = (items: readonly string[], members: readonly string[]): boolean => {
  const set = new Set(items);
  return set.size === members.length && members.every((m) => set.has(m));
};

/** The marker, if the line directly above the offending one carries it. */
const suppressionFor = (lines: readonly string[], line: number): string | null => {
  const above = lines[line - 2];
  const m = above === undefined ? null : SUPPRESSION.exec(above);
  return m === null ? null : (m[1] ?? "").trim();
};

/**
 * Both rules over one file, plus the hatch's own hygiene.
 *
 * Returns the violations and the lines whose suppression marker was consumed, so the caller can
 * tell a live suppression from one left behind after its violation was fixed.
 */
function scan(path: string, text: string): {
  readonly violations: readonly Violation[];
  readonly consumed: ReadonlySet<number>;
} {
  const lines = text.split("\n");
  const violations: Violation[] = [];
  const consumed = new Set<number>();

  const report = (line: number, message: string): void => {
    if (isCommentOnly(lines[line - 1] ?? "")) return;
    const reason = suppressionFor(lines, line);
    if (reason === null) {
      violations.push({ where: `${path}:${line}`, message });
      return;
    }
    consumed.add(line);
    if (reason.length < MIN_REASON) {
      violations.push({
        where: `${path}:${line}`,
        message: `suppressed with no stated reason. Write \`derived-values:allow <why this value must be frozen>\` `
          + `(at least ${MIN_REASON} characters) or derive the value. The suppressed finding was: ${message}`,
      });
    }
  };

  for (const m of text.matchAll(CARDINALITY_PIN)) {
    const count = Number(m[1]);
    if (count < MIN_CARDINALITY) continue;
    const source = SOURCES.find((s) => s.members.length === count);
    if (source === undefined) continue;
    report(lineOf(text, m.index), `\`${m[0].trim()}\` pins the cardinality of ${source.name} `
      + `(${source.module}, ${count} members today). Write \`${source.cardinality}\`. The registry moves — `
      + `this is the shape that asserted 20 operations an hour before there were 22 — and a snapshot of it `
      + `stops testing what it claims without ever going red.`);
  }

  for (const m of text.matchAll(STRING_ARRAY)) {
    const items = stringsIn(m[0]);
    const source = SOURCES.find((s) => sameSet(items, s.members));
    if (source === undefined) continue;
    report(lineOf(text, m.index), `this array holds exactly the members of ${source.name} `
      + `(${source.module}). Write \`${source.list}\`. A second copy of a vocabulary typechecks while it `
      + `disagrees with the first, which is how the behaviour forms drifted.`);
  }

  lines.forEach((text_, i) => {
    if (SUPPRESSION.exec(text_) === null) return;
    const line = i + 1;
    // The marker governs the line below it, so that is the one that must have been reported.
    if (consumed.has(line + 1)) return;
    violations.push({
      where: `${path}:${line}`,
      message: `\`derived-values:allow\` suppresses nothing here. Delete it — a stale suppression is a `
        + `claim that a check ran when it did not.`,
    });
  });

  return { violations, consumed };
}

/**
 * Tests and generators. `src/` and the schemas are out of scope for the reasons in the header: a
 * test has no reason to re-declare an importable vocabulary, which is what makes the rule safe
 * here and noisy there.
 */
const scannedFiles = (): readonly string[] => {
  const out: string[] = [];
  for (const [dir, ext] of [["test", ".ts"], ["test/browser", ".mjs"], ["scripts", ".ts"]] as const) {
    for (const name of readdirSync(dir)) if (name.endsWith(ext)) out.push(`${dir}/${name}`);
  }
  return out;
};

test("no test or generator copies a derivable value", () => {
  const files = scannedFiles();
  assert.ok(files.length > 20, `expected to find the suite, got ${files.length} files — the glob is wrong`);
  const violations: Violation[] = [];
  for (const path of files) violations.push(...scan(path, readFileSync(path, "utf8")).violations);
  const report = violations.map((v) => `${v.where}: ${v.message}`);
  assert.deepEqual(report, [], `derivable values copied instead of derived:\n  ${report.join("\n  ")}\n`
    + `  If one of these must genuinely stay frozen, put a line comment directly above it reading\n`
    + `  \`derived-values:allow <why>\` with at least ${MIN_REASON} characters of reason.`);
});

test("the sources this check reads are the ones it claims to read", () => {
  // If a source is renamed or emptied, the rules above quietly stop covering it while the test
  // above stays green. Cardinality coverage is conditional on the measured floor, so that is
  // asserted rather than assumed — `SHIPPED_EXAMPLE_IDS` is expected to fall below it.
  for (const s of SOURCES) {
    assert.ok(s.members.length > 0, `${s.name} is empty — the rules over it are vacuous`);
    assert.equal(new Set(s.members).size, s.members.length, `${s.name} has a duplicate member`);
  }
  const policedByCount = SOURCES.filter((s) => s.members.length >= MIN_CARDINALITY).map((s) => s.name);
  assert.deepEqual([...policedByCount].sort(), ["BEHAVIOR_FORMS", "CAPABILITIES", "GRAPH_FORMS"],
    "the set of sources whose COUNT is policed has changed; re-measure the false-positive rate before accepting it");
});

test("both rules actually fire — negative control", () => {
  // A check nobody has watched fail is a check nobody knows works, and this file exists because
  // four checks failed to hold a line.
  //
  // The violating text is BUILT from the imported sources rather than typed out, for the same
  // reason `test/source-hygiene.test.ts` constructs its bytes numerically: a literal `24` or a
  // literal list of the forms would make this file fail its own check, and a check that has to
  // exempt itself is weaker than one that does not.
  const pin = `  assert.equal(d.operations.length, ${CAPABILITIES.length});`;
  const pinned = scan("fake.test.ts", pin).violations;
  assert.equal(pinned.length, 1, `a pinned registry count must be flagged, got ${pinned.length}`);
  assert.match(pinned[0]?.message ?? "", /CAPABILITIES/, "the message must name the source");
  assert.match(pinned[0]?.message ?? "", /CAPABILITIES\.length/, "the message must name the fix");

  // The original regression's own shape, which an earlier `length|size`-only draft missed: the
  // browser gate asserts on `d.count`, a projected total, not on an array's `.length`.
  const asItWasWritten = `  assert.equal(d.count, ${CAPABILITIES.length}, "the page must advertise every operation");`;
  const caught = scan("test/browser/workbench.test.mjs", asItWasWritten).violations;
  assert.equal(caught.length, 1, "the regression as actually written must be flagged");
  assert.match(caught[0]?.where ?? "", /workbench\.test\.mjs:1$/, "the report must say where");

  const copy = `  const forms = [${GRAPH_FORMS.map((f) => JSON.stringify(f)).join(", ")}];`;
  const copied = scan("fake.test.ts", copy).violations;
  assert.equal(copied.length, 1, `a copied vocabulary must be flagged, got ${copied.length}`);
  assert.match(copied[0]?.message ?? "", /GRAPH_FORMS/, "the message must name the source");

  // Reordering is not a defence: the set is what matters, not the order it was typed in.
  const shuffled = `  const forms = [${[...BEHAVIOR_FORMS].reverse().map((f) => JSON.stringify(f)).join(", ")}];`;
  assert.equal(scan("fake.test.ts", shuffled).violations.length, 1, "a reordered copy is still a copy");

  // And the ordinary things must NOT trip it, or the check fails every file and gets deleted.
  const innocent = [
    `  assert.equal(lines.length, 3);`,
    `  assert.ok(files.length > ${GRAPH_FORMS.length}, "the glob is wrong");`,
    `  assert.equal(d.count, CAPABILITIES.length, "describe() must project the registry");`,
    `  const subset = [${GRAPH_FORMS.slice(0, 3).map((f) => JSON.stringify(f)).join(", ")}];`,
    `  // prose quoting the shape: p.length === ${BEHAVIOR_FORMS.length} is a split arity, not a pin`,
    `  // and a commented-out [${GRAPH_FORMS.map((f) => JSON.stringify(f)).join(", ")}] asserts nothing`,
  ].join("\n");
  assert.deepEqual(scan("fake.test.ts", innocent).violations, [],
    "a small count, an inequality bound, a derived comparison, a subset and prose are all legitimate");
});

test("the escape hatch demands a reason, and a stale one is reported", () => {
  const pin = `assert.equal(d.operations.length, ${CAPABILITIES.length});`;

  const justified = `  // derived-values:allow frozen on purpose: this pins the v1 wire contract\n  ${pin}`;
  assert.deepEqual(scan("fake.test.ts", justified).violations, [],
    "a stated reason must suppress the finding");

  const bare = `  // derived-values:allow\n  ${pin}`;
  const bareFound = scan("fake.test.ts", bare).violations;
  assert.equal(bareFound.length, 1, "a marker with no reason must not suppress silently");
  assert.match(bareFound[0]?.message ?? "", /no stated reason/);

  const terse = `  // derived-values:allow because\n  ${pin}`;
  assert.equal(scan("fake.test.ts", terse).violations.length, 1, "a one-word reason is not a reason");

  const stale = `  // derived-values:allow frozen on purpose: this pins the v1 wire contract\n  const x = 1;`;
  const staleFound = scan("fake.test.ts", stale).violations;
  assert.equal(staleFound.length, 1, "a marker over nothing must be reported, or suppressions accumulate");
  assert.match(staleFound[0]?.message ?? "", /suppresses nothing/);
});
