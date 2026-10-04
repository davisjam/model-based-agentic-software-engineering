/**
 * The YAML adapter's surface stays inside the entities the model lets hold it.
 *
 * **What this closes, and it was proven open.** `models/workbench-components.mage.yaml` speaks in
 * EDGES: `ui-must-not-import-yaml` asserts no declared `depends-on` runs from `ui` to
 * `yaml-adapter`, and `test/import-graph.test.ts` holds the declared edge set against every import
 * in the tree. Neither says anything about what VALUE crosses a sanctioned edge. One line in
 * `src/transaction/parse.ts` —
 *
 *     export { MageDocument } from "../yaml/document.ts";
 *
 * — put the complete YAML parse path into the view with EVERY GATE GREEN: `tsc` clean, the node tier
 * at 935/935, `validate.py` at zero, both observed edges (`ui → transaction-engine`,
 * `transaction-engine → yaml-adapter`) declared, and no query's verdict changed. That is
 * `REAUDIT-system-models-261004.md` M10, and it is reproduced against a fixture at the foot of this
 * file, where the gate goes red.
 *
 * So this gate holds the one property the edge model cannot express, at the granularity the model
 * does not have: a SYMBOL. It is deliberately not an analysis. The author's ruling on Q6, 261004, is
 * the scope — "install the cheapest adequate control, and gather evidence before increasing the
 * model's degrees of freedom" — so there is no new relation type here, no information-flow
 * vocabulary, and no reachability closure. There is a byte-level assertion over `src/`, following
 * `test/worker.test.ts`, which asserts over a module's own source that the analysis worker imports
 * no transaction path.
 *
 * ## The rule, and why it is not the one the brief first wrote
 *
 * **No file re-exports a YAML-adapter symbol unless the adapter itself owns that file.**
 *
 * The obvious weaker rule — "unless its owning entity declares the edge" — does not close M10, and
 * finding that out is most of what this file is for. M10's intermediary is `transaction-engine`,
 * which DOES declare `tx-yaml`. A rule exempting declaring entities would have exempted the exact
 * line that defeated every gate. The distinction the rule turns on is the one the weaker version
 * misses: a declared edge licenses an entity to IMPORT the adapter, and importing binds a name
 * locally. Re-exporting REPUBLISHES it, under the importing component's own path, where every entity
 * permitted to depend on THAT component can take it without declaring anything. The edge set does
 * not change, which is why no edge-level gate can see it.
 *
 * One consequence is worth having on purpose: because the rule exempts only the adapter, a CHAIN of
 * re-exports cannot form. A two-hop laundering needs a first hop, and the first hop is a finding.
 * The residue is not depth; it is the shapes named below.
 *
 * ## The sanctioned set is DERIVED, so there is no second list to drift
 *
 * The entities permitted to hold the adapter's surface are read out of the model: those declaring a
 * `depends-on` edge whose TARGET is `yaml-adapter`. At this tree that derives `transaction-engine`
 * (`tx-yaml`) and `analysis-worker` (`worker-yaml`), and the direction matters — `yaml-ir` runs FROM
 * the adapter to the kernel and makes `model-ir` the adapter's dependency, not its consumer, so a
 * filter on "the row mentions yaml-adapter" would wrongly sanction the kernel. `the derived set
 * reads the model's consumers and not its dependencies` below pins that.
 *
 * Deriving it is what keeps the control honest. A new sanctioned consumer becomes sanctioned by
 * declaring the edge — which `test/import-graph.test.ts` then holds against the actual imports — and
 * not by editing this file. A hand-written list here would be a second copy of the architecture,
 * free to drift from the model while both stayed green, which is the failure this repo keeps meeting
 * in new costumes.
 *
 * ## What this does NOT cover
 *
 * Stated because a green run here is narrow and the next reader will otherwise over-read it. This is
 * a re-export check over declared symbols. It is not information-flow analysis, and these four
 * shapes move the adapter's capability past it:
 *
 *   - **A re-wrapped symbol.** `import { MageDocument } from "../yaml/document.ts";` followed by
 *     `export const load = (t: string) => MageDocument.load(t);` publishes the same capability under
 *     a name the adapter never declared. No `export … from` is written, so nothing here fires. This
 *     is the largest hole and it is open.
 *   - **A value laundered through an untyped intermediary.** `export const doc: unknown = …`, or a
 *     record field typed `object`, carries the value with the type erased; the symbol's identity is
 *     what this gate reads, and an erased type has none.
 *   - **A dynamic `import()`.** `export const yaml = () => import("../yaml/document.ts");` is a call
 *     expression, not an export clause. The specifier is even literal and resolvable, and this gate
 *     still does not treat it as a re-export, because it is not one.
 *   - **An aliased specifier.** `resolveSpecifier` resolves relative specifiers only, so a path
 *     mapped through tsconfig `paths`/`baseUrl` or a package.json `imports` map reads as a bare
 *     package here and is skipped. That channel is asserted SHUT rather than resolved, by
 *     `ALIAS_CHANNELS` in `test/import-graph.test.ts`; this file inherits that precondition and does
 *     not restate it.
 *
 * What IS covered, by contrast, and each driven below: a named re-export, a renamed one
 * (`export { MageDocument as Doc } from`), a type-only one, and `export *`. A type-only re-export
 * carries no runtime value and is the weaker case; it fires anyway, because the model's `depends-on`
 * says in terms that a type-only import counts, and because "it is only a type" is the sentence that
 * precedes using it as a value.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  declaredExports, edgeEnds, entityOf, importSpecifiers, modelDoc, modelText, ownerOf,
  readArchitecture, RELATION, RE_EXPORT_SYNTAXES, resolveSpecifier, sourceTree, treeWithMutation,
} from "./component-model.ts";
import type { Architecture, SourceFile } from "./component-model.ts";
import { parse } from "yaml";

/**
 * The entity whose surface this gate protects.
 *
 * NAMED rather than derived, unlike the kernel in `test/import-graph.test.ts`. The kernel has a
 * mechanical definition in the model's own spine — "its declared out-degree is zero" — and exactly
 * one entity satisfies it. "The concrete-syntax boundary" has no such predicate: three entities sit
 * at `layer: adapter` and the model's prose, not its structure, is what says this one is the only
 * component that knows YAML exists. Inventing a derivation would be a cleverness that retargets
 * silently when the model shifts.
 *
 * So it is named here and CROSS-CHECKED three ways against the model — the entity exists, its ref
 * owns real files, and the model still names it the target of a refuted reachability prohibition.
 * A model that stopped treating it as a boundary fails this gate rather than quietly moving it.
 */
const ADAPTER = "yaml-adapter";

/** The scan root, read from the dependency model's own subject ref rather than written here. */
const SCAN_ROOT = "src";

// ----------------------------------------------------------------------------------------------
// The derivation
// ----------------------------------------------------------------------------------------------

/**
 * The entities the model permits to hold the adapter's surface: those declaring an edge TO it.
 *
 * `arch.declared` is already filtered to `depends-on` and already lifted through containment, so a
 * contained entity's edge is attributed to its container — the same reading every other claim about
 * this model uses. `may_mutate` rows are not consumers and are excluded by that filter.
 */
const sanctionedConsumers = (arch: Architecture): readonly string[] =>
  [...arch.declared.keys()]
    .map(edgeEnds)
    .filter((edge) => edge.to === ADAPTER)
    .map((edge) => edge.from)
    .sort();

/** Entities the ADAPTER depends on. Not consumers; the direction check below is about these. */
const adapterDependencies = (arch: Architecture): readonly string[] =>
  [...arch.declared.keys()]
    .map(edgeEnds)
    .filter((edge) => edge.from === ADAPTER)
    .map((edge) => edge.to)
    .sort();

// ----------------------------------------------------------------------------------------------
// The audit: a pure function, so every control below drives it with the real mutation
// ----------------------------------------------------------------------------------------------

/** One re-export of an adapter symbol, wherever it was written — including inside the adapter. */
interface ReExport {
  readonly file: string;
  readonly line: number;
  readonly syntax: string;
  readonly specifier: string;
  /** The adapter file the specifier resolves to. */
  readonly resolved: string;
  /** The names republished, as written. `["*"]` for a star re-export. */
  readonly names: readonly string[];
  /** The lifted entity owning `file`, or null when no entity does. */
  readonly entity: string | null;
}

interface ReExportReport {
  readonly findings: readonly string[];
  /** The adapter's lifted entity id, or null when the model does not carry it. */
  readonly adapter: string | null;
  readonly sanctioned: readonly string[];
  /** Every adapter re-export seen, legitimate or not. The detector's own visibility. */
  readonly reExports: readonly ReExport[];
  /** The symbol names the adapter DECLARES, read from its bytes. */
  readonly surface: readonly string[];
  readonly specifiers: number;
}

/**
 * Everything that can be wrong between the adapter's surface and the tree, in one pass.
 *
 * Pure over `files` and the parsed model, which is what lets the controls at the foot of this file
 * inject M10 verbatim. A gate for a defect proven to slip past everything has to be proven to catch
 * it, and a gate nobody has watched fail is a gate nobody knows works.
 */
function auditAdapterReExports(files: readonly SourceFile[], rawModel: unknown): ReExportReport {
  const arch = readArchitecture(rawModel);
  const findings: string[] = [];
  const reExports: ReExport[] = [];

  const subject = arch.subjects.find((s) => s.id === ADAPTER) ?? null;
  if (subject === null) {
    findings.push(`\`${ADAPTER}\` is not an entity in the components model, so this gate has no `
      + `subject. The concrete-syntax boundary is what the whole check is about: if the entity was `
      + `renamed, rename it here; if it was deleted, the prohibition this file holds no longer has a `
      + `meaning and should be deleted with an argument rather than left asserting nothing.`);
    return { findings, adapter: null, sanctioned: [], reExports, surface: [], specifiers: 0 };
  }
  if (subject.ref === null) {
    findings.push(`entity \`${ADAPTER}\` declares no \`provenance.subject.ref\`, so no file routes `
      + `to it and this gate cannot tell which modules ARE the adapter. The ref IS the join.`);
  }

  const adapterFiles = files.filter((f) => entityOf(arch, f.path) === ADAPTER);
  if (adapterFiles.length === 0) {
    findings.push(`entity \`${ADAPTER}\` names \`${String(subject.ref)}\` and no scanned file `
      + `resolves to it, so the symbol set below is empty and every comparison in this gate is `
      + `vacuous. Either the code moved or the ref has a typo — and a typo'd ref validates clean, `
      + `because the loader does not read \`provenance.subject\`.`);
  }

  const surface = [...new Set(adapterFiles.flatMap(declaredExports))].sort();
  if (adapterFiles.length > 0 && surface.length === 0) {
    findings.push(`the ${adapterFiles.length} file(s) owned by \`${ADAPTER}\` declare no exported `
      + `symbol, which cannot be true of a component every other one reads. The export reader is `
      + `looking at the wrong thing, and a gate whose symbol set is empty reports green having `
      + `compared nothing.`);
  }

  const sanctioned = sanctionedConsumers(arch);
  if (sanctioned.length === 0) {
    findings.push(`no entity declares a \`${RELATION}\` edge to \`${ADAPTER}\`, so the sanctioned `
      + `set derived from this model is EMPTY. Either the model lost the edges that make the adapter `
      + `reachable at all — in which case the import-graph gate has more to say than this one — or `
      + `the derivation is reading the wrong direction and this gate is measuring nothing.`);
  }

  let specifiers = 0;
  for (const file of files) {
    const from = entityOf(arch, file.path);
    for (const specifier of importSpecifiers(file)) {
      specifiers += 1;
      if (!RE_EXPORT_SYNTAXES.includes(specifier.syntax)) continue;
      if (specifier.text === null) continue;  // No `export … from` has a non-literal specifier.
      const resolved = resolveSpecifier(specifier.file, specifier.text);
      if (resolved === null) continue;  // A bare package, or an alias; see this file's header.
      if (entityOf(arch, resolved) !== ADAPTER) continue;

      const seen: ReExport = {
        file: specifier.file,
        line: specifier.line,
        syntax: specifier.syntax,
        specifier: specifier.text,
        resolved,
        names: specifier.reExports,
        entity: from,
      };
      reExports.push(seen);
      // The adapter publishing its own names is not laundering; it is the adapter having a surface.
      if (from === ADAPTER) continue;

      const star = specifier.reExports.includes("*");
      const what = star
        ? `the adapter's WHOLE surface (${surface.length} symbol(s): ${surface.join(", ")})`
        : `\`${specifier.reExports.join("`, `")}\``;
      const kind = specifier.syntax === "export type from"
        ? " The syntax is type-only, so no runtime value crosses here — and `depends-on` says in "
          + "terms that a type-only import counts, and a republished type is the next writer's "
          + "licence to take the value."
        : "";
      const owner = from ?? "no entity";
      const licence = from !== null && sanctioned.includes(from)
        ? `\`${owner}\` declares \`${RELATION} → ${ADAPTER}\`, so it may IMPORT the adapter; that `
          + `edge is the ruling and it is not in question. This line does something else. It `
          + `REPUBLISHES the adapter's symbol under \`${owner}\`'s own path, where every entity `
          + `permitted to depend on \`${owner}\` can take it without declaring any edge to `
          + `\`${ADAPTER}\` — and no declared edge changes, which is why no edge-level gate sees it. `
          + `Import it and keep it local, or move the consumer's own edge into the model.`
        : `\`${owner}\` declares no \`${RELATION} → ${ADAPTER}\` edge at all, so the absence clause `
          + `is broken here too — \`test/import-graph.test.ts\` reports the EDGE and this reports `
          + `the SYMBOL. The entities the model permits to hold the adapter's surface are `
          + `${sanctioned.length === 0 ? "none" : sanctioned.join(", ")}, and none of them may `
          + `republish it either.`;

      findings.push(`\`${specifier.file}:${specifier.line}\` re-exports ${what} from \`${ADAPTER}\` `
        + `(\`${specifier.syntax}\` → \`${specifier.text}\`).${kind} ${licence} This is the shape `
        + `\`REAUDIT-system-models-261004.md\` M10 drove: it put the whole YAML parse path into the `
        + `view with every gate green.`);
    }
  }

  return {
    findings: [...new Set(findings)],
    adapter: ADAPTER,
    sanctioned,
    reExports,
    surface,
    specifiers,
  };
}

/** The real scan, with both inputs asserted before the audit reads them. */
function scanRealTree(): ReExportReport {
  const arch = readArchitecture(modelDoc());
  assert.equal(arch.root, SCAN_ROOT,
    `the dependency model's subject ref is \`${String(arch.root)}\` and this gate scans `
    + `\`${SCAN_ROOT}\`; the root moved and the scan did not follow it`);
  const files = sourceTree(SCAN_ROOT);
  // A probe that finds nothing is usually the probe, and this audit passes trivially over an empty
  // file set: no re-export can be found in a tree nobody walked.
  assert.ok(files.length > 50, `walked ${files.length} source file(s) under \`${SCAN_ROOT}\` — this `
    + `package has more than that, so the tree walk is wrong`);
  const report = auditAdapterReExports(files, modelDoc());
  assert.ok(report.specifiers > 300,
    `the parse found ${report.specifiers} module specifier(s) across ${files.length} files, which is `
    + `too few for this tree — the visitor is not reaching the export statements`);
  return report;
}

// ----------------------------------------------------------------------------------------------
// The real tree
// ----------------------------------------------------------------------------------------------

test("no file outside the YAML adapter re-exports one of its symbols", () => {
  const report = scanRealTree();
  console.log(`\nadapter-reexport — \`${String(report.adapter)}\` declares ${report.surface.length} `
    + `symbol(s) across ${report.surface.join(", ")}; sanctioned consumers derived from the model: `
    + `${report.sanctioned.join(", ")}; ${report.reExports.length} adapter re-export(s) in `
    + `${report.specifiers} module specifier(s)\n`);
  assert.deepEqual(report.findings, [],
    `the YAML adapter's surface has escaped the entities the model lets hold it:\n  `
    + `${report.findings.join("\n  ")}\n`);
});

test("the derived set reads the model's consumers and not its dependencies", () => {
  // The direction trap, pinned. `yaml-ir` runs FROM the adapter TO the kernel, so a filter on "this
  // row mentions yaml-adapter" would sanction `model-ir` — the adapter's own dependency — and the
  // kernel would become a component licensed to republish the adapter's surface. That is the
  // inversion of the model's central claim, arrived at by one sloppy predicate.
  const arch = readArchitecture(modelDoc());
  const sanctioned = sanctionedConsumers(arch);
  const dependencies = adapterDependencies(arch);

  assert.ok(sanctioned.length > 0,
    "no entity declares an edge to the adapter, so the derivation read nothing and every claim in "
    + "this file is vacuous");
  assert.ok(dependencies.length > 0,
    "the adapter declares no out-edge, so this direction check has no subject and would pass against "
    + "a derivation that read the rows symmetrically");
  for (const dependency of dependencies) {
    assert.ok(!sanctioned.includes(dependency),
      `\`${dependency}\` is something \`${ADAPTER}\` depends ON and it is in the sanctioned set. The `
      + `filter is reading rows rather than directions: a dependency is not a consumer, and `
      + `\`depends-on\` declares \`acyclic: true\`, so no entity can honestly be both.`);
  }
  assert.ok(!sanctioned.includes(ADAPTER),
    `\`${ADAPTER}\` is in its own sanctioned set. Harmless to the rule — the audit exempts the `
    + `adapter's own files by ownership, not by this set — and it means the derivation is counting a `
    + `self-edge the model does not declare.`);

  // Every member must be a real consumer in the CODE, not only in the declarations. The import-graph
  // gate holds declared-equals-observed for the whole edge set; this reads the one edge class this
  // file's conclusion rests on, so a derived set of entities that import nothing cannot look valid.
  const files = sourceTree(SCAN_ROOT);
  for (const consumer of sanctioned) {
    const importers = files.filter((f) => entityOf(arch, f.path) === consumer
      && importSpecifiers(f).some((s) => s.text !== null
        && entityOf(arch, resolveSpecifier(s.file, s.text) ?? "") === ADAPTER));
    assert.ok(importers.length > 0,
      `\`${consumer}\` is derived as a sanctioned consumer of \`${ADAPTER}\` and no file it owns `
      + `imports the adapter. The declaration has gone stale, and a sanctioned set wider than the `
      + `code is a set that licenses more than anyone decided to license.`);
  }
});

test("the adapter is still the boundary the model says it is", () => {
  // The three cross-checks that stand in for a derivation, per `ADAPTER`'s own comment. Without
  // them, naming the entity here would be a second copy of an architectural fact — and the copy
  // would keep passing after the model dropped the claim.
  const arch = readArchitecture(modelDoc());
  const subject = arch.subjects.find((s) => s.id === ADAPTER);
  assert.ok(subject !== undefined, `\`${ADAPTER}\` is not an entity in the components model`);
  assert.ok(subject.ref !== null, `\`${ADAPTER}\` declares no subject ref, so no file routes to it`);

  const files = sourceTree(SCAN_ROOT).filter((f) => entityOf(arch, f.path) === ADAPTER);
  assert.ok(files.length > 0,
    `\`${ADAPTER}\` names \`${String(subject.ref)}\` and owns no scanned file`);
  assert.ok(files.every((f) => ownerOf(arch, f.path)?.id === ADAPTER),
    "a file routing to the adapter through containment rather than directly would mean this gate's "
    + "subject is some other component's interior");

  // The model must still PROHIBIT reaching it. `yaml-adapter` is the target of three refuted
  // reachability queries at this tree; if that dropped to zero the model would have stopped calling
  // it a boundary, and a byte-level gate protecting a surface nobody restricts is machinery.
  const prohibitions = arch.prohibited.get(ADAPTER) ?? [];
  assert.ok(prohibitions.length > 0,
    `the model declares no refuted reachability prohibition whose target is \`${ADAPTER}\`, so it no `
    + `longer treats the adapter as a boundary. This gate holds the VALUE half of a claim whose `
    + `EDGE half the model has dropped — reinstate the prohibition, or retire this file.`);

  const surface = [...new Set(files.flatMap(declaredExports))];
  assert.ok(surface.includes("MageDocument"),
    `the adapter's declared surface is ${surface.join(", ")} and does not include \`MageDocument\`. `
    + `That is the symbol M10 laundered and the one the controls below re-export, so without it the `
    + `negative control is driving a fiction.`);
});

// ----------------------------------------------------------------------------------------------
// The controls. M10 is the reason this file exists, so M10 is what it is driven with.
// ----------------------------------------------------------------------------------------------

/** M10 verbatim: the one line that put the YAML parse path in the view with every gate green. */
const M10_SITE = "src/transaction/parse.ts";
const M10_LINE = `export { MageDocument } from "../yaml/document.ts";\n`;

/** The audit over the real tree and real model, with one file's text replaced in memory. */
const withLineIn = (path: string, line: string): ReExportReport => auditAdapterReExports(
  treeWithMutation(SCAN_ROOT, path, (text) => `${text}\n${line}`), modelDoc());

test("M10 goes RED: a re-export through a SANCTIONED intermediary is caught — negative control", () => {
  // The baseline first. Every delta below is a difference against it, and a control whose baseline
  // is already red proves nothing.
  assert.deepEqual(auditAdapterReExports(sourceTree(SCAN_ROOT), modelDoc()).findings, [],
    "the real tree must be clean, or the controls below measure against a red baseline");

  // THE ONE THAT MATTERS. `transaction-engine` declares `tx-yaml`, so it is IN the derived
  // sanctioned set — which is exactly why the weaker rule ("unless its owning entity declares the
  // edge") would have exempted this line and closed nothing.
  const arch = readArchitecture(modelDoc());
  const owner = entityOf(arch, M10_SITE);
  assert.ok(owner !== null && sanctionedConsumers(arch).includes(owner),
    `${M10_SITE} must be owned by a SANCTIONED consumer for this control to test what it claims; it `
    + `is owned by \`${String(owner)}\`. If the model changed, pick the mutation site from the `
    + `derived set rather than weakening the assertion.`);

  const m10 = withLineIn(M10_SITE, M10_LINE);
  assert.ok(m10.findings.length > 0,
    "M10 re-exports MageDocument from a sanctioned intermediary and the gate stayed green, which is "
    + "the state this whole file exists to leave");
  assert.ok(m10.findings.some((f) => f.includes(M10_SITE)),
    `the finding must cite the re-export site: ${m10.findings.join("; ")}`);
  assert.ok(m10.findings.some((f) => /`MageDocument`/.test(f)),
    `and name the symbol that travelled, not merely report "a re-export": ${m10.findings.join("; ")}`);

  // The message must tell a stranger why a DECLARED edge is not a licence to republish. Without
  // that sentence the natural fix for this red is to add an edge, which closes nothing.
  assert.ok(m10.findings.some((f) => /REPUBLISHES the adapter's symbol/.test(f)),
    `the finding must distinguish importing from republishing: ${m10.findings.join("; ")}`);
  assert.ok(m10.findings.some((f) => /may IMPORT the adapter/.test(f)),
    `and concede the import that IS licensed, or the finding reads as a false red on a ruled edge: `
    + `${m10.findings.join("; ")}`);
  assert.ok(m10.findings.some((f) => /M10/.test(f)),
    "and name the mutation, so the next reader can find what this cost");
});

test("every re-export syntax that republishes the surface is caught — negative control", () => {
  // A control that fires on one spelling is a control the next writer walks around. `export *` is
  // the cheapest of the four and takes the WHOLE surface, so a gate that only read named clauses
  // would be worse than useless: it would be a green run over the broadest possible laundering.
  for (const [line, expected] of [
    [`export { MageDocument } from "../yaml/document.ts";\n`, /`MageDocument`/],
    [`export { MageDocument as Doc } from "../yaml/document.ts";\n`, /MageDocument as Doc/],
    [`export type { Path } from "../yaml/document.ts";\n`, /`Path`/],
    [`export * from "../yaml/document.ts";\n`, /WHOLE surface/],
    [`export * as yaml from "../yaml/document.ts";\n`, /WHOLE surface/],
  ] as const) {
    const report = withLineIn(M10_SITE, line);
    assert.ok(report.findings.some((f) => expected.test(f) && f.includes(M10_SITE)),
      `\`${line.trim()}\` must be reported and matched by ${String(expected)}: `
      + `${report.findings.join("; ")}`);
  }

  // The type-only arm must SAY it is type-only. Firing on it is the strict call this file's header
  // argues for; firing on it without distinguishing it would overstate what crossed.
  const typeOnly = withLineIn(M10_SITE, `export type { Path } from "../yaml/document.ts";\n`);
  assert.ok(typeOnly.findings.some((f) => /type-only, so no runtime value crosses/.test(f)),
    `the type-only case must be named as such: ${typeOnly.findings.join("; ")}`);
});

test("a re-export from an UNSANCTIONED entity is caught, and says so differently", () => {
  // The other half of the rule, and the shape M10 completed in the view itself. `ui` declares no
  // edge to the adapter, so this is the absence clause broken as well — and the finding has to route
  // the reader to the EDGE gate rather than reporting the symbol as the whole story.
  const arch = readArchitecture(modelDoc());
  const site = "src/ui/main.ts";
  assert.equal(entityOf(arch, site), "ui", "the fixture site must be owned by the view");
  assert.ok(!sanctionedConsumers(arch).includes("ui"),
    "`ui` is in the derived sanctioned set, so this control is no longer testing an unsanctioned "
    + "entity — which would be a model change worth arguing, not a test to relax");

  const report = withLineIn(site, M10_LINE);
  assert.ok(report.findings.some((f) => f.includes(site) && /declares no `depends-on → yaml-adapter` edge at all/.test(f)),
    `an unsanctioned re-export must be reported with its own cause: ${report.findings.join("; ")}`);
  assert.ok(report.findings.some((f) => /import-graph\.test\.ts` reports the EDGE/.test(f)),
    `and point at the gate that holds the edge, so the two are not read as one: `
    + `${report.findings.join("; ")}`);
  // The derived set must appear in the message. A reader told "not permitted" needs to know who is.
  for (const consumer of sanctionedConsumers(arch)) {
    assert.ok(report.findings.some((f) => f.includes(consumer)),
      `the finding must name the permitted entities, \`${consumer}\` among them: `
      + `${report.findings.join("; ")}`);
  }
});

test("the gate does not fire on the shapes the model permits — positive control", () => {
  // A check that fires on everything is not a check. Three legitimate shapes, each of which a
  // sloppier predicate would call a violation, and a false red on an architecture gate is how an
  // architecture gate gets deleted.

  // 1. The adapter publishing its OWN names. `src/yaml/` has no index module today, so this shape
  //    does not exist in the tree — which means it is the shape a future index file would add, and
  //    this is what keeps it from landing as a red.
  const internal = auditAdapterReExports(
    treeWithMutation(SCAN_ROOT, "src/yaml/coercion.ts",
      (text) => `${text}\nexport { MageDocument } from "./document.ts";\n`),
    modelDoc());
  assert.deepEqual(internal.findings, [],
    `the adapter re-exporting its own symbol must not be a finding: ${internal.findings.join("; ")}`);
  assert.ok(internal.reExports.some((r) => r.entity === ADAPTER),
    "and the detector must SEE it — a clean result because the scan missed the line would be "
    + "indistinguishable from a clean result because the rule exempted it");

  // 2. A sanctioned consumer IMPORTING the adapter. This is the declared edge, and the whole point
  //    of the rule is that it stays legitimate: the gate's subject is republication.
  const imported = withLineIn(M10_SITE, `import { MageDocument as _Doc } from "../yaml/document.ts";\n`);
  assert.deepEqual(imported.findings, [],
    `a sanctioned consumer importing the adapter must not be a finding — that edge is the ruling: `
    + `${imported.findings.join("; ")}`);

  // 3. A re-export that has nothing to do with the adapter. The tree already writes these (the
  //    renderer and the engine both have index modules), so the baseline covers it; driven anyway
  //    with a fresh one, because the baseline would also be clean if the resolver never matched.
  const unrelated = withLineIn(M10_SITE, `export { renderView } from "../render/svg.ts";\n`);
  assert.deepEqual(unrelated.findings, [],
    `a re-export of another component's symbol is not this gate's business: `
    + `${unrelated.findings.join("; ")}`);
  assert.ok(sourceTree(SCAN_ROOT).some((f) => importSpecifiers(f)
    .some((s) => RE_EXPORT_SYNTAXES.includes(s.syntax))),
    "the tree writes no `export … from` at all, so the clean baseline above says nothing about "
    + "whether this gate can tell a permitted re-export from a prohibited one");
});

test("the audit fires on each way its own subject can go missing — negative control", () => {
  const files = sourceTree(SCAN_ROOT);

  // The adapter entity deleted. A gate whose subject is gone must say so, not pass.
  const renamed = parse(modelText().replace(/^  yaml-adapter:$/m, "  yaml-reader:"));
  const gone = auditAdapterReExports(files, renamed);
  assert.ok(gone.findings.some((f) => /is not an entity in the components model/.test(f)),
    `a missing adapter entity must be reported: ${gone.findings.join("; ")}`);
  assert.equal(gone.adapter, null, "and the report must not claim a subject it did not find");

  // A ref typo. The loader cannot catch this — it drops `provenance.subject` entirely — so the
  // entity validates clean while owning nothing, and every comparison here turns vacuous.
  const typo = parse(modelText().replace("ref: src/yaml", "ref: src/yml"));
  const stale = auditAdapterReExports(files, typo);
  assert.ok(stale.findings.some((f) => /no scanned file `?resolves to it/.test(f)),
    `a ref owning no file must be reported: ${stale.findings.join("; ")}`);
  assert.ok(stale.findings.some((f) => /vacuous/.test(f)),
    "and say that the gate's comparisons are now empty, which is the consequence a reader needs");

  // Both declared edges to the adapter removed: the derived sanctioned set goes empty. The audit
  // must report that rather than treat "nobody is permitted" as a stricter, healthier state.
  const unreachable = parse(modelText()
    .replace(/^.*\bid: tx-yaml\b.*$\n/m, "")
    .replace(/^.*\bid: worker-yaml\b.*$\n/m, ""));
  assert.notEqual(unreachable, modelText(), "the sabotage must actually remove the declarations");
  const empty = auditAdapterReExports(files, unreachable);
  assert.ok(empty.findings.some((f) => /sanctioned set derived from this model is EMPTY/.test(f)),
    `an empty derived set must be reported: ${empty.findings.join("; ")}`);

  // And the rule must still hold with an empty set, because "nobody may hold it" does not mean
  // "nobody is checked": M10's line is still a finding, now under the unsanctioned cause.
  const stillCaught = auditAdapterReExports(
    treeWithMutation(SCAN_ROOT, M10_SITE, (text) => `${text}\n${M10_LINE}`), unreachable);
  assert.ok(stillCaught.findings.some((f) => f.includes(M10_SITE)),
    `the re-export must stay caught when the derived set is empty: ${stillCaught.findings.join("; ")}`);

  // An empty file set. The audit passes trivially over a tree nobody walked, which is why
  // `scanRealTree` asserts the walk before the audit reads it — this is the second layer.
  const nothing = auditAdapterReExports([], modelDoc());
  assert.ok(nothing.findings.some((f) => /no scanned file `?resolves to it/.test(f)),
    `an empty file set must be reported rather than passing: ${nothing.findings.join("; ")}`);
  assert.equal(nothing.reExports.length, 0);
});
