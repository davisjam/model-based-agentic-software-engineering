/**
 * Every tracked model's OWN assertions, evaluated in CI.
 *
 * **READ THIS FIRST — what a green run here proves, and what it does not.**
 *
 * It proves VERDICT-SENSITIVITY of each model's own saved queries: every query carrying `expect` was
 * run through the engine and answered what it said it would, so an edit that changes a verdict
 * changes this gate. That is a real property and it was missing.
 *
 * It does NOT prove that any model CORRESPONDS TO THE CODE. The components model declares which
 * modules may depend on which, and nothing in this file derives the import graph from `src/` — so a
 * genuine kernel-to-view import passes this gate, the typecheck, and the rest of the node tier.
 * That was established by mutation, not inferred: a real
 * `import { checkPurposeVisibility } from "../ui/invariants.ts"` added to `src/ir/types.ts` passed
 * everything everywhere. The model's queries evaluate the model's DECLARED relations.
 *
 * `test/import-graph.test.ts` is what closes that, for the components model only: it parses every
 * specifier under `src/`, resolves each to the entity owning its path, and fails in both directions.
 * So the two gates are complementary and neither substitutes for the other — this one holds a
 * model's verdicts, that one holds one model's edge set to the tree. The other tracked models still
 * have no code join, and this file's green is not alignment for any of them. The receipt below
 * carries both sentences out of the process so the number travels with its limit.
 *
 * ## The failure class this closes
 *
 * A model's `expect` fields were enforced on the author's laptop and nowhere else. `validate.py`
 * does evaluate them — `check_queries` emits a failing `QUERY` finding on a mismatch, and
 * `--self-test` injects a kernel-to-UI edge and asserts the catch — but the only path that invokes
 * it is `hooks/pre-push`. CI never ran it to failure. `test/parity.test.ts` holds the two
 * implementations to identical ANSWERS, which is a different claim: it declares `QUERY` a
 * Python-only asymmetry and filters it out of the cleanliness assertion, and its answer comparison
 * is TS-against-Python and never against `expect`. So two tools agreeing on a verdict nobody
 * expected was a passing build.
 *
 * Mutation-proven at the tree this landed on: a `model-ir → ui` edge injected into
 * `models/workbench-components.mage.yaml` passed the entire CI gate set — exit 0, 921 of 921 —
 * while `validate.py --self-test` went red on a path a hurried commit skips.
 *
 * ## Shape, and why each part is there
 *
 * **The denominator is DERIVED, from `git ls-files`.** A literal list of model files would go stale
 * in the one direction that matters: a fourth self-model would land, carry assertions, and never
 * join the policed set — and from this file alone an unpoliced model and a covered one look
 * identical. TRACKED rather than on-disk, because an untracked scratch model is nobody's claim.
 *
 * **Three files are EXCLUDED, with evidence.** The shipped example systems keep their outcomes in
 * `expected-results.yaml`, beside the evidence shape each must produce, and `test/examples.test.ts`
 * drives them through the facade and compares. Each system file says so in its own prose, and that
 * sentence is the exclusion's evidence — so deleting the fixture discipline fails this gate even
 * though no path moved. The exclusion set is derived from `SHIPPED_EXAMPLE_IDS` for the same reason
 * the denominator is derived.
 *
 * **Exemptions are reasoned and CAPPED, and the cap is zero.** Every query in every subject model
 * carries `expect` at this commit, so the honest ceiling is zero and raising it is a deliberate edit
 * to a named constant — the discipline `test/browser/agent-coverage.test.mjs` and
 * `PARITY_VIOLATION_CEILING` already hold. A gate that exempts its way to green reports coverage
 * that does not exist.
 *
 * **A model with no queries is a FINDING, not a pass.** `workbench-affordances` carried forty-four
 * entities, eighty-one edges and zero assertions for two days; it was held to its generator and to
 * nothing else, so it could be read as a claim about the product while making none. An empty
 * numerator over an empty denominator is the vacuous pass this project keeps finding, one costume at
 * a time.
 *
 * **The audit is a pure function over evaluated reports,** so the negative control at the foot of
 * this file drives every finding with a model text built for it — including a flipped `expect`
 * through the real engine. A check nobody has watched fail is a check nobody knows works.
 *
 * ## What it still cannot see, stated rather than implied
 *
 * A model whose queries are weak. `expect: holds` on a question with a one-node answer is a verdict
 * this gate will happily confirm; whether the question is worth asking is a review judgement, and
 * the per-model controls (the components model's `ui-can-reach-kernel`, the affordance model's two)
 * are where that is defended. And BEHAVIOR queries are evaluated here by the TypeScript engine
 * alone: `validate.py` explores no state space, so for docable's three machine statements there is
 * no second implementation to disagree. The graph queries have one, and parity holds them equal.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Workspace } from "../src/app/services.ts";
import { checkExpectation } from "../src/engine/index.ts";
import type { ExpectationVerdict } from "../src/engine/index.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";

/**
 * A reason floor, the same one `test/gate-reachability.test.ts` and
 * `test/browser/agent-coverage.test.mjs` use, and for the same cause: an unjustified declaration is
 * how a control becomes decoration. "not assertable" is a note; a mechanism, a dependency or a
 * ruling is a decision someone else can review.
 */
const MIN_REASON = 40;

/**
 * How many queries may be exempted from verdict evaluation. **ZERO, measured.**
 *
 * Every saved query in every subject model carries `expect` at this commit. Raising this is the
 * sanctioned move when a query genuinely cannot carry a verdict, and it is a deliberate edit to a
 * named number — not an open-ended map that quietly absorbs whatever went red.
 */
const EXEMPTION_CEILING = 0;

/**
 * The receipt, written outside the repo by default for the reason the browser harness states: the
 * suite must not create untracked files in a tree other agents are committing from.
 *
 * It exists because this gate's whole output is a table, and a table printed into a passing test's
 * stdout is a table nobody reads. The receipt carries the per-model counts, every row's verdict, and
 * the two sentences about what the numbers mean — so the limit cannot be separated from the claim.
 */
const RECEIPT_PATH = process.env["WB_MODEL_COVERAGE_RECEIPT"]
  ?? join(tmpdir(), "wb-model-coverage-receipt.json");

/** What a green run establishes. Shipped in the receipt, asserted present. */
const CLAIM = "Every saved query carrying `expect` in every tracked model outside the shipped "
  + "example systems was evaluated through the engine, and its outcome matched. A model edit that "
  + "changes a verdict changes this gate.";

/** What it does not. Shipped beside the claim, because the number is read without the file. */
const NOT_PROVEN = "This does NOT prove any model corresponds to the code. No gate here derives the "
  + "import graph from src/, and a real kernel-to-view import was shown by mutation to pass the "
  + "whole node tier. The components model alone has a code join, held by test/import-graph.test.ts; "
  + "every other tracked model has none, so do not read this green as architectural alignment.";

// ----------------------------------------------------------------------------------------------
// The denominator
// ----------------------------------------------------------------------------------------------

/**
 * A model file deliberately outside the denominator: why, and what holds its verdicts instead.
 *
 * Shaped like `test/gate-reachability.test.ts`'s `Exemption` on purpose — an exclusion carries
 * EVIDENCE, a literal string the named file must contain, so the claim reads as a cross-file
 * assertion rather than a comment that can rot.
 */
interface Exclusion {
  /** Package-relative path of the file carrying the evidence. */
  readonly evidenceIn: string;
  /** Text that file must contain. Checked, so the claim cannot decay into prose. */
  readonly evidence: string;
  readonly reason: string;
}

/**
 * The shipped example systems, whose verdicts live in `expected-results.yaml`.
 *
 * DERIVED from `SHIPPED_EXAMPLE_IDS` — what "shipped" means here — so a fourth example is excluded
 * by landing rather than by someone remembering. The evidence is each system file's own sentence
 * declaring where its outcomes live, so a system that stopped deferring to its fixture would fail
 * this gate rather than silently fall outside it.
 *
 * `examples/docable.mage.yaml` is NOT excluded and must not be: it has no fixture file, so `expect`
 * is the only place a verdict can live for it, and it is the structural exemplar readers copy.
 */
const EXCLUDED: Readonly<Record<string, Exclusion>> = Object.fromEntries(
  SHIPPED_EXAMPLE_IDS.map((id) => [`examples/${id}/system.mage.yaml`, {
    evidenceIn: `examples/${id}/system.mage.yaml`,
    evidence: "Expected outcomes live in expected-results.yaml",
    reason: "A shipped example system. Its outcomes live in expected-results.yaml beside the "
      + "coverage kind and the evidence shape each query must produce — a richer pin than `expect` "
      + "can carry — and test/examples.test.ts drives every one through the facade and compares, "
      + "with its own negative control. A second copy of the verdict in the system file would be "
      + "free to drift from the fixture, which is the reason the file says so itself.",
  }]),
);

/** Every tracked `*.mage.yaml`, package-relative. Fails loud: there is no empty-is-fine path. */
const trackedModels = (): readonly string[] =>
  execFileSync("git", ["ls-files", "-z", "--", "*.mage.yaml"], { encoding: "utf8" })
    .split("\0").filter((path) => path.length > 0).sort();

/** The self-model directory, walked on disk — the cross-check that `git ls-files` read the tree. */
const selfModelsOnDisk = (dir = "models"): readonly string[] =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((entry) => `${dir}/${entry}`)
    .filter((path) => path.endsWith(".mage.yaml") && statSync(path).isFile())
    .sort();

// ----------------------------------------------------------------------------------------------
// Evaluation: one model file, through the facade
// ----------------------------------------------------------------------------------------------

/** One saved query, as this run answered it. */
interface QueryRow {
  readonly id: string;
  readonly kind: string;
  /** The declared expectation, or null for an exploratory query. */
  readonly expect: string | null;
  readonly outcome: string;
  /** `checkExpectation`'s arm. Typed from the engine's union, so a new arm reaches the switch below. */
  readonly verdict: ExpectationVerdict["kind"];
  /** The coercion message, or the cause the non-settling arms carry. */
  readonly note: string | null;
}

/** One model file's whole contribution to the measure. */
interface ModelReport {
  readonly path: string;
  readonly parsed: boolean;
  readonly findings: readonly string[];
  readonly rows: readonly QueryRow[];
}

/**
 * The cause an arm carries, for the three arms that carry one. TOTAL over `ExpectationVerdict` by
 * the compiler, so an arm added to the engine cannot reach the report with its cause dropped.
 */
function noteOf(v: ExpectationVerdict): string | null {
  switch (v.kind) {
    case "coerced": return v.message;
    case "unsettled":
      return `answered '${v.outcome}'`
        + `${v.limit === null ? "" : ` after hitting the ${v.limit}`}.`;
    case "declined": return v.refusal ?? "no refusal sentence was reported.";
    case "met":
    case "unmet":
    case "exploratory":
      return null;
  }
}

/**
 * Load a model through `Workspace` and answer every saved query it carries.
 *
 * Through the facade, not `canonicalize()` plus `runQuery()` directly: a reader who opens this model
 * in the workbench gets the facade's answers, and a gate that bypassed it would hold the engine to
 * its expectations while saying nothing about the application. `realPorts` is the same real engine
 * and real renderer `test/examples.test.ts` drives.
 *
 * `checkExpectation` decides met-or-not rather than an `outcome === expect` comparison written here.
 * It is the engine's own function, the one `validate.py`'s CI gate mirrors, and it carries the V25
 * arm a bare comparison would miss: `expect: true` is a YAML-coercion bug, and a hand-rolled
 * comparison would read it as an unmet expectation of `"true"` instead of naming the cause.
 */
function evaluateModel(path: string, text: string): ModelReport {
  const ws = new Workspace(realPorts);
  const loaded = ws.load(text);
  if (!loaded.ok) {
    return {
      path, parsed: false, rows: [],
      findings: loaded.findings.map((f) => `${f.rule} @ ${f.where}: ${f.message}`),
    };
  }
  const rows: QueryRow[] = [];
  for (const [id, saved] of ws.state.system.queries) {
    const raw = saved.raw as { readonly kind?: unknown; readonly expect?: unknown };
    const res = ws.query(saved.raw);
    const verdict = checkExpectation(saved.raw, res);
    rows.push({
      id,
      kind: typeof raw.kind === "string" ? raw.kind : "unknown",
      expect: typeof raw.expect === "string" ? raw.expect : null,
      outcome: res.outcome,
      verdict: verdict.kind,
      note: noteOf(verdict),
    });
  }
  return {
    path, parsed: true, rows,
    findings: loaded.findings.map((f) => `${f.rule} @ ${f.where}: ${f.message}`),
  };
}

// ----------------------------------------------------------------------------------------------
// The audit: a pure function, so the negative control can drive it with the defects
// ----------------------------------------------------------------------------------------------

/** A query exempted from verdict evaluation, keyed `<model path>#<query id>`. */
type Exemptions = Readonly<Record<string, string>>;

const exemptionKey = (path: string, id: string): string => `${path}#${id}`;

/**
 * Everything that can be wrong with the measure, in one pass.
 *
 * Seven findings, and the last four are what keep the exemption map from rotting: an unparseable
 * model; a model carrying validation findings, whose verdicts cannot be trusted; a model with no
 * assertions at all; a query with no `expect` and no excuse; an excuse under the reason floor; an
 * excuse over a query that DOES carry `expect`, which is a claim and its own contradiction; and an
 * excuse naming a query or a model that is not in the subject set, which has outlived its subject.
 */
function auditCoverage(
  reports: readonly ModelReport[], exemptions: Exemptions, ceiling = EXEMPTION_CEILING,
): readonly string[] {
  const issues: string[] = [];
  if (reports.length === 0) {
    issues.push("no model file reached this gate, so it has no denominator. Either the tracked-file "
      + "read returned nothing or every model was excluded — and an empty denominator must never "
      + "read as full coverage.");
    return issues;
  }

  const keys = new Set<string>();
  for (const report of reports) {
    if (!report.parsed) {
      issues.push(`\`${report.path}\` does not load, so none of its assertions could be evaluated: `
        + `${report.findings.join("; ")}. An unreadable model is not a covered model.`);
      continue;
    }
    if (report.findings.length > 0) {
      issues.push(`\`${report.path}\` loads with ${report.findings.length} validation finding(s): `
        + `${report.findings.join("; ")}. A model the rule set complains about cannot be held to its `
        + `own verdicts — the engine may be answering a question the file did not successfully ask.`);
    }
    if (report.rows.length === 0) {
      issues.push(`\`${report.path}\` carries no saved query, so it asserts nothing and cannot be `
        + `refuted. A projection with no assertion is held to its generator and to nothing else, `
        + `which is how a model comes to be read as a claim about the product while making none.`);
      continue;
    }
    for (const row of report.rows) {
      const key = exemptionKey(report.path, row.id);
      keys.add(key);
      const reason = exemptions[key];
      switch (row.verdict) {
        case "met":
          if (reason !== undefined) {
            issues.push(`\`${key}\` is exempted and this run evaluated it, met at `
              + `'${row.outcome}'. Delete the exemption: a declaration that a query is uncovered, `
              + `when it is covered, misreports the gate in the direction that costs the next reader `
              + `their trust in the number.`);
          }
          continue;
        case "unmet":
          issues.push(`\`${key}\` expects '${String(row.expect)}' and answered '${row.outcome}'. `
            + `Either the model changed and the expectation is now wrong, or the model says something `
            + `its author did not intend — and the second is why the expectation lives beside the `
            + `statement rather than in a test file.`);
          continue;
        // Separated from `unmet` deliberately. Both are uncovered assertions and both are issues,
        // but neither says the model contradicts its author: one ran out of search budget and the
        // other asked something these models do not represent. Reporting either as a contradiction
        // would send a reader to rewrite a correct expectation.
        case "unsettled":
          issues.push(`\`${key}\` expects '${String(row.expect)}' and the search did not settle it: `
            + `${String(row.note)} The expectation is not refuted — raise the budget, or state why `
            + `this model cannot be walked exhaustively.`);
          continue;
        case "declined":
          issues.push(`\`${key}\` expects '${String(row.expect)}' and these models decline the `
            + `question: ${String(row.note)} The expectation is not refuted — the vocabulary it `
            + `names is missing, so the remedy is a model rather than an edit to the expectation.`);
          continue;
        case "coerced":
          issues.push(`\`${key}\` carries an \`expect\` the engine cannot read: ${String(row.note)} `
            + `This is V25, and it is a YAML problem wearing a semantics costume.`);
          continue;
        case "exploratory":
          if (reason === undefined) {
            issues.push(`\`${key}\` carries no \`expect\`, so no outcome can fail it — it answered `
              + `'${row.outcome}' and nothing compared that to anything. Add \`expect\`, or declare `
              + `the exemption with the reason a verdict cannot be stated. A saved query with no `
              + `expectation is a question the model asks and never answers.`);
            continue;
          }
          if (reason.trim().length < MIN_REASON) {
            issues.push(`\`${key}\` is exempted with a ${reason.trim().length}-character reason; at `
              + `least ${MIN_REASON} are required. State the mechanism, the dependency, or the ruling.`);
          }
          continue;
        default:
          issues.push(`\`${key}\` produced an unrecognised verdict arm '${row.verdict}'. `
            + `\`checkExpectation\` grew a case this audit does not handle, and an unhandled arm `
            + `defaults to silence.`);
      }
    }
  }

  const names = Object.keys(exemptions);
  for (const key of names.sort()) {
    if (keys.has(key)) continue;
    issues.push(`the exemption map names \`${key}\`, which is not a saved query in any subject `
      + `model. A declaration about a query that no longer exists outlives its subject, and it `
      + `inflates the exempted count against a denominator that has shrunk.`);
  }
  if (names.length > ceiling) {
    issues.push(`${names.length} query exemption(s) are declared and the ceiling is ${ceiling}. `
      + `Raising the ceiling is the sanctioned move and it is a deliberate edit — but a gate that `
      + `exempts its way to green reports coverage that does not exist, so the number has to be `
      + `argued rather than grown.`);
  }
  return [...new Set(issues)];
}

// ----------------------------------------------------------------------------------------------
// Queries exempted from verdict evaluation. EMPTY, and the ceiling above says so.
// ----------------------------------------------------------------------------------------------

/**
 * Keyed `<model path>#<query id>`, valued with the reason a verdict cannot be stated.
 *
 * Empty at this commit, measured: every saved query in every subject model carries `expect`.
 * Adding an entry also means raising `EXEMPTION_CEILING`, which is the second deliberate edit, and
 * both are visible in one diff.
 */
const QUERY_EXEMPTIONS: Exemptions = {};

// ----------------------------------------------------------------------------------------------
// The receipt
// ----------------------------------------------------------------------------------------------

/** Per model: how many assertions, how many met, how many excused, and the outcome histogram. */
interface ModelSummary {
  readonly model: string;
  readonly queries: number;
  readonly asserted: number;
  readonly met: number;
  readonly exempt: number;
  readonly outcomes: Readonly<Record<string, number>>;
}

const summarize = (report: ModelReport, exemptions: Exemptions): ModelSummary => {
  const outcomes: Record<string, number> = {};
  for (const row of report.rows) outcomes[row.outcome] = (outcomes[row.outcome] ?? 0) + 1;
  return {
    model: report.path,
    queries: report.rows.length,
    asserted: report.rows.filter((r) => r.expect !== null).length,
    met: report.rows.filter((r) => r.verdict === "met").length,
    exempt: report.rows.filter((r) => exemptions[exemptionKey(report.path, r.id)] !== undefined).length,
    outcomes,
  };
};

/** The table, for the test's stdout. The receipt carries the same numbers for a CI log to publish. */
function renderTable(summaries: readonly ModelSummary[]): string {
  const rows = summaries.map((s) => [
    s.model, String(s.queries), String(s.asserted), String(s.met), String(s.exempt),
    Object.entries(s.outcomes).sort().map(([k, n]) => `${k}:${n}`).join(" "),
  ]);
  const header = ["model", "queries", "asserted", "met", "exempt", "outcomes"];
  const width = header.map((h, i) => Math.max(h.length, ...rows.map((r) => (r[i] ?? "").length)));
  const line = (cells: readonly string[]): string =>
    cells.map((c, i) => c.padEnd(width[i] ?? 0)).join("  ").trimEnd();
  return [line(header), line(width.map((w) => "-".repeat(w))), ...rows.map(line)].join("\n");
}

// ----------------------------------------------------------------------------------------------
// The gate
// ----------------------------------------------------------------------------------------------

/** The subject set: tracked models, minus the declared exclusions. */
const subjects = (): readonly string[] =>
  trackedModels().filter((path) => EXCLUDED[path] === undefined);

test("every tracked model's own assertions are evaluated, and every verdict is met", () => {
  const paths = subjects();
  // A probe that finds nothing is usually the probe. Both inputs are asserted before the audit reads
  // them, because this check passes trivially over an empty subject set — and `auditCoverage`'s own
  // empty-denominator finding is the second layer, not the first.
  assert.ok(paths.length > 0,
    "the subject set is empty — `git ls-files` returned no model file, or every model is excluded");
  const reports = paths.map((path) => evaluateModel(path, readFileSync(path, "utf8")));
  const total = reports.reduce((n, r) => n + r.rows.length, 0);
  assert.ok(total > 30,
    `${total} saved quer(ies) across ${paths.length} model(s) — this repo's models carry more than `
    + `that, so the loader is reading something other than the models`);

  const issues = auditCoverage(reports, QUERY_EXEMPTIONS);
  const summaries = reports.map((r) => summarize(r, QUERY_EXEMPTIONS));
  const unmet = reports.flatMap((r) => r.rows.filter((x) => x.verdict !== "met")
    .map((x) => ({ model: r.path, ...x })));

  const receipt = {
    measuredAt: new Date().toISOString(),
    claim: CLAIM,
    notProven: NOT_PROVEN,
    exemptionCeiling: EXEMPTION_CEILING,
    exemptions: QUERY_EXEMPTIONS,
    excluded: Object.fromEntries(Object.entries(EXCLUDED).map(([k, v]) => [k, v.reason])),
    totals: {
      models: summaries.length,
      queries: total,
      asserted: summaries.reduce((n, s) => n + s.asserted, 0),
      met: summaries.reduce((n, s) => n + s.met, 0),
    },
    perModel: summaries,
    notMet: unmet,
    rows: reports.flatMap((r) => r.rows.map((x) => ({ model: r.path, ...x }))),
  };
  writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  console.log(`\nmodel-coverage — ${CLAIM}\nmodel-coverage — NOT proven: ${NOT_PROVEN}\n`
    + `${renderTable(summaries)}\nreceipt: ${RECEIPT_PATH}\n`);

  assert.deepEqual(issues, [], `model coverage:\n  ${issues.join("\n  ")}\n`);
});

test("the denominator is derived, and each exclusion it declares is real", () => {
  const tracked = trackedModels();
  assert.ok(tracked.length > 0, "`git ls-files` reported no model file — the denominator is unread");

  // Every excluded path must still BE a tracked model. An exclusion for a file nobody has is a
  // decision about nothing, and it shrinks the denominator by a name rather than by an argument.
  for (const [path, exclusion] of Object.entries(EXCLUDED)) {
    assert.ok(tracked.includes(path),
      `\`${path}\` is excluded from the model-coverage denominator and is not a tracked model file. `
      + `Either the exclusion derivation went stale or the file moved.`);
    assert.ok(exclusion.reason.trim().length >= MIN_REASON,
      `\`${path}\` is excluded with a ${exclusion.reason.trim().length}-character reason; at least `
      + `${MIN_REASON} are required. Name what holds its verdicts instead.`);
    const text = readFileSync(exclusion.evidenceIn, "utf8");
    assert.ok(text.includes(exclusion.evidence),
      `\`${path}\` is excluded on the evidence that \`${exclusion.evidenceIn}\` contains `
      + `"${exclusion.evidence}", and it does not. The exclusion's whole claim is that something else `
      + `owns this model's verdicts; without that sentence nothing does.`);
  }

  // The cross-check `git ls-files` cannot make about itself: the self-model directory walked on
  // disk. A model sitting in `models/` outside the tracked set is a claim nothing reads.
  for (const path of selfModelsOnDisk()) {
    assert.ok(tracked.includes(path),
      `\`${path}\` is in the self-model directory and is not tracked, so this gate never reads it. `
      + `Track it or move it out of \`models/\`.`);
    assert.equal(EXCLUDED[path], undefined,
      `\`${path}\` is a self-model and is excluded from the denominator. The exclusions exist for the `
      + `shipped example systems, whose verdicts a fixture owns; a self-model has no such holder.`);
  }
});

test("the receipt carries what the numbers mean, and what they do not", () => {
  // The limit is not a comment. A reader meets this gate as three numbers in a CI log, so the
  // sentence about correspondence travels with them or it does not travel at all.
  assert.ok(CLAIM.length > 80 && NOT_PROVEN.length > 80,
    "the claim and its limit must each be a real sentence");
  assert.match(NOT_PROVEN, /import graph/,
    "the limit must name the missing gate, not merely gesture at incompleteness");
  assert.match(NOT_PROVEN, /does NOT prove/,
    "the limit must say plainly that correspondence is unproven");
});

// ----------------------------------------------------------------------------------------------
// The negative control
// ----------------------------------------------------------------------------------------------

/**
 * A two-entity model with one `direct` query that `holds`, parameterised by its own expectation.
 *
 * Built here rather than copied from a fixture file, so the flipped `expect` runs through the REAL
 * engine and the real facade: the control's subject is the comparison, and a comparison driven by a
 * hand-made `ModelReport` would prove only that the audit reads its own input.
 */
const controlModel = (expect: string | null): string => `mage: 1

system:
  id: model-coverage-control
  name: A two-entity fixture for the model-coverage negative control

relation-types:

  depends-on:
    description: The left entity depends on the right one.
    absence: No dependency is declared, so none may exist.
    composition:
      path: allowed

entities:

  alpha:
    type: module
    label: Alpha

  beta:
    type: module
    label: Beta

models:

  wiring:
    type: graph
    label: Wiring
    purpose:
      question: Does alpha depend on beta?
      represents: [module, depends-on]
      omits: [every other module and every other relation]
    entities:
      - alpha
      - beta
    relations:
      - { from: alpha, to: beta, type: depends-on }

queries:

  alpha-depends-on-beta:
    name: Alpha depends on beta
    kind: graph
    quantifier: exists
${expect === null ? "" : `    expect: ${expect}\n`}    graph:
      form: direct
      relation: depends-on
      from: alpha
      to: beta
`;

const CONTROL = "control.mage.yaml";
const CONTROL_QUERY = `${CONTROL}#alpha-depends-on-beta`;
const evaluateControl = (expect: string | null): ModelReport =>
  evaluateModel(CONTROL, controlModel(expect));

test("the coverage gate fires on each defect it exists to catch — negative control", () => {
  // The baseline first: everything below is a DELTA against it, and a control whose baseline is
  // already red proves nothing about the deltas.
  const honest = evaluateControl("holds");
  assert.deepEqual(honest.findings, [], `the control model must validate clean: ${honest.findings}`);
  assert.deepEqual(honest.rows.map((r) => [r.outcome, r.verdict]), [["holds", "met"]],
    "the control model's query must answer `holds` and meet its expectation");
  assert.deepEqual(auditCoverage([honest], {}), [], "the honest shape must pass");

  // THE ONE THAT MATTERS: a flipped expectation. This is the mutation that passed the whole CI gate
  // set before this file existed — a model asserting one verdict while the engine answers another.
  const flipped = auditCoverage([evaluateControl("refuted")], {});
  assert.equal(flipped.length, 1, `one finding expected, got ${flipped.length}: ${flipped.join("; ")}`);
  assert.match(flipped[0] ?? "", /alpha-depends-on-beta/, "the finding must name the query");
  assert.match(flipped[0] ?? "", /expects 'refuted' and answered 'holds'/,
    "the finding must name both verdicts; `a query failed` is not a report someone can act on");

  // A query with no expectation. It answered something, and nothing compared that to anything.
  const silent = auditCoverage([evaluateControl(null)], {});
  assert.equal(silent.length, 1, `one finding expected, got ${silent.length}: ${silent.join("; ")}`);
  assert.match(silent[0] ?? "", /carries no `expect`/);

  // Declaring it is the sanctioned answer, and it clears the gate — with the ceiling raised too,
  // which is the second deliberate edit.
  const reason = "The query joins two ordered domains and validate.py declines it for scope, so no "
    + "second implementation can confirm the verdict; see the parity exemption.";
  assert.ok(reason.length >= MIN_REASON);
  assert.deepEqual(
    auditCoverage([evaluateControl(null)], { [CONTROL_QUERY]: reason }, 1), [],
    "a declared exemption whose reason clears the floor must pass");

  // A thin reason is how an exemption map turns into a list of excuses.
  const thin = auditCoverage([evaluateControl(null)], { [CONTROL_QUERY]: "cannot assert" }, 1);
  assert.match(thin[0] ?? "", /at least \d+ are required/,
    "a reason under the floor must be reported");

  // The map growing past its ceiling — the failure this gate is likeliest to suffer is not a missing
  // expectation, it is an author with a red gate and a one-line exemption that makes it green.
  const grown = auditCoverage([evaluateControl(null)], { [CONTROL_QUERY]: reason }, 0);
  assert.ok(grown.some((m) => /the ceiling is 0/.test(m)),
    `growing the map past the ceiling must be reported: ${grown.join("; ")}`);

  // An exemption over a query that DOES carry an expectation: a claim and its own contradiction.
  const stale = auditCoverage([honest], { [CONTROL_QUERY]: reason }, 1);
  assert.match(stale[0] ?? "", /is exempted and this run evaluated it/,
    "an exemption over an evaluated query must be reported");

  // An exemption naming nothing in the subject set.
  const ghost = auditCoverage([honest], { "models/gone.mage.yaml#retired": reason }, 1);
  assert.ok(ghost.some((m) => /not a saved query in any subject model/.test(m)),
    `an exemption naming no query must be reported: ${ghost.join("; ")}`);

  // V25: `expect: true` is a YAML 1.1 coercion, and the engine says so rather than comparing the
  // string "true" against an outcome. The audit must carry that cause through, not flatten it.
  const coerced = evaluateControl("true");
  assert.deepEqual(coerced.rows.map((r) => r.verdict), ["coerced"],
    "a boolean `expect` must reach the audit as a coercion, not as an unmet expectation");
  const v25 = auditCoverage([coerced], {});
  assert.match(v25[0] ?? "", /V25/, `the coercion cause must be reported: ${v25.join("; ")}`);

  // A model with no assertions at all — gap 6's subject, and the vacuous pass this gate refuses.
  const silentModel: ModelReport = { path: "models/mute.mage.yaml", parsed: true, findings: [], rows: [] };
  const mute = auditCoverage([silentModel], {});
  assert.match(mute[0] ?? "", /carries no saved query/,
    "a model that asserts nothing must be reported, never counted as fully covered");

  // A model that does not parse. Unreadable must never read as covered.
  const broken = evaluateModel("models/broken.mage.yaml", "mage: 1\nsystem: [this is not a mapping\n");
  assert.equal(broken.parsed, false, "the broken fixture must fail to load, or this delta is vacuous");
  assert.match(auditCoverage([broken], {})[0] ?? "", /does not load/,
    "an unparseable model must be reported");

  // A model that loads WITH findings. Its queries may be answering a question the file failed to
  // ask, so a met expectation over a complaining model is not a verdict anyone should bank.
  const dirty: ModelReport = { ...honest, findings: ["V9 @ models.wiring: a fabricated finding"] };
  assert.match(auditCoverage([dirty], {})[0] ?? "", /validation finding/,
    "a model the rule set complains about must be reported");

  // And the empty denominator, one level up: with no subject at all every comparison above is
  // trivially true, and the gate would print green having measured nothing.
  const empty = auditCoverage([], {});
  assert.equal(empty.length, 1);
  assert.match(empty[0] ?? "", /no denominator/);
});

test("the subject set contains the self-models and the exemplar, and not the example systems", () => {
  // The predicate IS the coverage claim, so it is checked the way `test/gate-reachability.test.ts`
  // checks `isGate`: if the exclusion rule quietly swallowed the self-models, the gate above would
  // pass by policing nothing.
  const paths = subjects();
  assert.ok(paths.includes("models/workbench-components.mage.yaml"),
    "the components model is the one this gate was built for and it is not in the subject set");
  assert.ok(paths.includes("models/workbench-affordances.mage.yaml"));
  assert.ok(paths.includes("models/example-coverage.mage.yaml"));
  // The lifecycle model is the only tracked model whose queries are `kind: behavior`, so it is also
  // the only one `validate.py` declines for scope — this gate is the sole decider of its verdicts.
  assert.ok(paths.includes("models/workbench-lifecycle.mage.yaml"),
    "the lifecycle model is not in the subject set, and no other implementation answers its queries");
  assert.ok(paths.includes("examples/docable.mage.yaml"),
    "docable has no fixture file, so `expect` is the only holder its verdicts have");
  for (const id of SHIPPED_EXAMPLE_IDS) {
    assert.ok(!paths.includes(`examples/${id}/system.mage.yaml`),
      `${id}'s system file is in the subject set and its verdicts live in expected-results.yaml`);
  }
});
