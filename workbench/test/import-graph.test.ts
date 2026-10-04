/**
 * The REAL import graph of `src/`, derived from the code and held against the components model.
 *
 * **What this closes.** `models/workbench-components.mage.yaml` declares which component may depend
 * on which, and its `absence` clause says so in terms: an edge not drawn there is an edge the
 * implementation may not create. Nothing derived that edge set from the code, so the prohibition
 * bound a reader and bound no build. Established by mutation rather than inferred
 * (`AUDIT-system-models-261004.md` gap 1): a genuine kernel-to-view import —
 * `import { checkPurposeVisibility } from "../ui/invariants.ts"` added to `src/ir/types.ts` —
 * passed `tsc`, the whole node tier, `validate.py --self-test`, and model validation. The model's
 * queries evaluate the model's DECLARED relations; the declarations were nobody's claim about the
 * tree. `test/model-coverage.test.ts` says the same thing in its own header, and points here.
 *
 * The mutation is reproduced at the foot of this file against a FIXTURE, and the gate goes red.
 *
 * ## The join, and where it comes from
 *
 * Not invented here. Every entity in that model carries `provenance.subject.ref` — the path, package
 * relative, of the code it stands for — and the model's header documents two rules that make the
 * mapping total and unambiguous. This file implements those two rules and nothing else:
 *
 *   - **Longest prefix wins.** `src/app/agent-api.ts` resolves to `agent-adapter`, not to
 *     `app-services`, though it sits inside `src/app/`. Three refs name a file; the rest name a
 *     directory.
 *   - **A contained entity's edges lift to its container.** `quant-evaluator` is contained by
 *     `query-engine`, so an observed `src/quant → src/ir` is checked as `query-engine → model-ir`,
 *     and `src/quant → src/engine` is internal to one component and checked against nothing.
 *
 * The scan root is the dependency model's own `provenance.subject.ref` (`src`), read from the file
 * rather than spelled here, for the cause `test/derived-values.test.ts` polices: a second copy of a
 * fact is a fact that can drift. The refs themselves are the one part of the model the loader does
 * NOT canonicalize — the IR's `Provenance` carries prompt and history, not a subject — so this gate
 * parses the YAML directly. A consequence worth stating: a ref with a typo validates clean, which is
 * why `the file-to-entity join is total` below checks that every ref owns at least one real file.
 *
 * ## Both directions are failures, and the second one took an argument
 *
 * `observed ⊆ declared` is the prohibition, and an undeclared import is the violation this gate
 * exists for. The reverse — a declared edge no import creates — reads at first like a report:
 * nothing in the code is wrong, and the model merely permits something unused. It is asserted here
 * anyway, for three reasons:
 *
 *   1. **Reachability is monotone in edges.** The four kernel queries and the `ui-can-reach-kernel`
 *      positive control are answered over the declared graph. A stale edge can carry the positive
 *      control on a path the code no longer has, so the control passes while measuring a fiction —
 *      the vacuous pass this repo keeps finding in new costumes.
 *   2. **A stale edge widens the permitted set silently.** The next import of that shape lands with
 *      nothing to say, which is the state gap 1 was about.
 *   3. **The model claims equality, not containment.** Its `correspondence` record says `asserted`
 *      with a date and the note "edge set read by hand from today's import graph." A gate weaker
 *      than the claim leaves the claim unchecked.
 *
 * The practical half: both sets are 46 edges at this commit and identical, so asserting equality
 * lands green. There is nothing to drain, so the repo's drain-then-promote rule does not apply.
 *
 * ## Import syntaxes, stated because a scanner's coverage is its whole worth
 *
 * The scan is a real parse — `typescript`'s own `createSourceFile`, already a devDependency — not a
 * pattern over text. A regex over TypeScript import syntax silently misses `export … from`,
 * specifiers split across lines, and `import type {`. `the scanner sees every syntax it claims`
 * below drives one fixture per row.
 *
 * COVERED: `import x from`, `import { x }`, `import * as x`, bare `import "./x.ts"`,
 * `import type { x }`, inline `import { type x }`, import attributes (`with { type: "json" }`),
 * `export { x } from`, `export type { x } from`, `export * from`, `export * as ns from`, dynamic
 * `import("./x.ts")`, `import x = require("./x.ts")`, `require("./x.ts")`, and a `/// <reference
 * path="…" />` directive.
 *
 * NOT COVERED, and each is REPORTED rather than skipped: a dynamic `import(expr)` or `require(expr)`
 * whose specifier is not a string literal, because no static reader can resolve it; and a relative
 * specifier with no file extension, because resolution here is lexical — this package writes
 * explicit `.ts` on all 445 of its relative specifiers and has no index files, so directory
 * resolution would be machinery for a case that does not exist. A silent skip would be the hole; a
 * finding says the gate cannot see the edge and names the line.
 *
 * NOT COVERED and not reported: `declare module` augmentation and `/// <reference types="…" />`,
 * neither of which names a path inside the scan root.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { parse } from "yaml";
import ts from "typescript";
import { Workspace } from "../src/app/services.ts";
import { realPorts } from "../scripts/gen-example-coverage.ts";

/** The architecture model this gate holds the tree to, package relative. */
const MODEL_PATH = "models/workbench-components.mage.yaml";

/** The model inside it whose relations ARE the architecture, and whose subject ref gives the root. */
const DEPENDENCY_MODEL = "dependencies";

/** The relation the import graph instantiates. The model's other relation type is mutation authority. */
const RELATION = "depends-on";

/**
 * A reason floor, the same one `test/gate-reachability.test.ts` and `test/model-coverage.test.ts`
 * use, for the same cause: an unjustified declaration is how a control becomes decoration.
 */
const MIN_REASON = 40;

// ----------------------------------------------------------------------------------------------
// Specifiers resolving outside the scan root
// ----------------------------------------------------------------------------------------------

/**
 * A resolved path outside the scan root that is NOT a component edge: why, and the evidence.
 *
 * Shaped like the sibling gates' exclusions on purpose — a declaration carries a literal string
 * another file must contain, so it reads as a cross-file assertion rather than a comment that rots.
 */
interface Allowance {
  /** Package-relative path of the file carrying the evidence. */
  readonly evidenceIn: string;
  /** Text that file must contain. Checked, so the claim cannot decay into prose. */
  readonly evidence: string;
  readonly reason: string;
}

/**
 * The three JSON Schema documents `src/ui/main.ts` loads for the editor's own validation.
 *
 * They sit at the package root, outside the scan root, and no entity owns them — correctly: a schema
 * document is an INPUT this package generates types from, not a component with a dependency story.
 * The evidence is the `types` script's `json2ts -i` flag naming each one, so adding a fourth schema
 * or renaming one fails here rather than quietly joining the allowance.
 *
 * An unused entry is a finding too. Without that, this map is where a real undeclared edge would go
 * to be forgotten.
 */
const OUTSIDE_ROOT: Readonly<Record<string, Allowance>> = Object.fromEntries(
  ["model", "query", "transaction"].map((kind) => [`mage-${kind}.schema.json`, {
    evidenceIn: "package.json",
    evidence: `json2ts -i mage-${kind}.schema.json`,
    reason: "A JSON Schema document at the package root, loaded by the shell for client-side "
      + "validation and consumed by the `types` script that generates src/ir/schema-*.ts. It is data "
      + "this package owns rather than a component: there is no module to depend on, no imports of "
      + "its own, and nothing for the model to say about it.",
  }]),
);

// ----------------------------------------------------------------------------------------------
// Reading the model: entities, their refs, their containment, and the declared edges
// ----------------------------------------------------------------------------------------------

/** One entity's contribution to the join. `ref` is null when the entity declares none. */
interface Subject {
  readonly id: string;
  readonly ref: string | null;
  readonly contains: readonly string[];
  readonly layer: string | null;
}

/** The declared architecture: who owns which paths, which edges exist, and where the scan starts. */
interface Architecture {
  readonly subjects: readonly Subject[];
  /** `from → to` keys over LIFTED entity ids, valued with the relation id the model gave. */
  readonly declared: ReadonlyMap<string, string>;
  /** The dependency model's own subject ref, or null when it declares none. */
  readonly root: string | null;
  /** Query ids whose `from` is each entity, for `expect: refuted` reachability over `RELATION`. */
  readonly prohibitions: ReadonlyMap<string, readonly string[]>;
}

const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};

const asString = (value: unknown): string | null => (typeof value === "string" ? value : null);

/** `from → to`, the one spelling of an edge used everywhere below. */
const edgeKey = (from: string, to: string): string => `${from} → ${to}`;

/** Read the model's YAML into the three things the gate needs. Tolerant: absences become findings. */
function readArchitecture(raw: unknown): Architecture {
  const doc = asRecord(raw);
  const subjects: Subject[] = [];
  for (const [id, value] of Object.entries(asRecord(doc["entities"]))) {
    const entity = asRecord(value);
    const contains = Array.isArray(entity["contains"])
      ? entity["contains"].filter((c): c is string => typeof c === "string")
      : [];
    subjects.push({
      id,
      ref: asString(asRecord(asRecord(entity["provenance"])["subject"])["ref"]),
      contains,
      layer: asString(asRecord(entity["properties"])["layer"]),
    });
  }

  const container = new Map<string, string>();
  for (const subject of subjects) for (const child of subject.contains) container.set(child, subject.id);
  const lift = (id: string): string => {
    const seen = new Set<string>();
    let at = id;
    for (;;) {
      const up = container.get(at);
      if (up === undefined || seen.has(up)) return at;
      seen.add(up);
      at = up;
    }
  };

  const model = asRecord(asRecord(doc["models"])[DEPENDENCY_MODEL]);
  const declared = new Map<string, string>();
  const relations = Array.isArray(model["relations"]) ? model["relations"] : [];
  for (const [index, value] of relations.entries()) {
    const relation = asRecord(value);
    if (relation["type"] !== RELATION) continue;
    const from = asString(relation["from"]);
    const to = asString(relation["to"]);
    if (from === null || to === null) continue;
    declared.set(edgeKey(lift(from), lift(to)), asString(relation["id"]) ?? `relation #${index}`);
  }

  const prohibitions = new Map<string, string[]>();
  for (const [id, value] of Object.entries(asRecord(doc["queries"]))) {
    const query = asRecord(value);
    const graph = asRecord(query["graph"]);
    if (query["expect"] !== "refuted" || graph["form"] !== "reachability") continue;
    if (graph["relation"] !== RELATION) continue;
    const from = asString(graph["from"]);
    if (from === null) continue;
    const held = prohibitions.get(from) ?? [];
    held.push(id);
    prohibitions.set(from, held);
  }

  return {
    subjects,
    declared,
    root: asString(asRecord(asRecord(model["provenance"])["subject"])["ref"]),
    prohibitions,
  };
}

/** Containment, resolved transitively, as a function over a read architecture. */
function liftToContainer(arch: Architecture, id: string): string {
  const container = new Map<string, string>();
  for (const subject of arch.subjects) {
    for (const child of subject.contains) container.set(child, subject.id);
  }
  const seen = new Set<string>();
  let at = id;
  for (;;) {
    const up = container.get(at);
    if (up === undefined || seen.has(up)) return at;
    seen.add(up);
    at = up;
  }
}

/**
 * The entity owning a path, by longest prefix. A file ref matches only itself; a directory ref
 * matches itself and anything beneath it.
 */
function ownerOf(arch: Architecture, path: string): Subject | null {
  let best: Subject | null = null;
  for (const subject of arch.subjects) {
    const ref = subject.ref;
    if (ref === null) continue;
    const matches = ref.endsWith(".ts") ? path === ref : path === ref || path.startsWith(`${ref}/`);
    if (!matches) continue;
    if (best === null || ref.length > (best.ref ?? "").length) best = subject;
  }
  return best;
}

// ----------------------------------------------------------------------------------------------
// Reading the code: one real parse per file
// ----------------------------------------------------------------------------------------------

/** One file the gate reads. Supplied, so the controls can drive the audit with a mutated tree. */
interface SourceFile {
  readonly path: string;
  readonly text: string;
}

/** One module specifier, where it was written, and the syntax that wrote it. */
interface Specifier {
  readonly file: string;
  readonly line: number;
  readonly syntax: string;
  /** The literal text, or null for a dynamic form whose argument is not a string literal. */
  readonly text: string | null;
}

/**
 * Every module specifier in one file.
 *
 * The TypeScript parser rather than a pattern: the syntax list in this file's header is long, and
 * every row of it is a shape a text scan gets wrong in the direction that hides an edge.
 */
function importSpecifiers(file: SourceFile): readonly Specifier[] {
  const sf = ts.createSourceFile(
    file.path, file.text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: Specifier[] = [];
  const push = (node: ts.Node, syntax: string, spec: ts.Node | undefined): void => {
    if (spec === undefined) return;
    out.push({
      file: file.path,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      syntax,
      text: ts.isStringLiteralLike(spec) ? spec.text : null,
    });
  };

  // `/// <reference path="…" />`, which the parser hands over separately from the statement list.
  for (const ref of sf.referencedFiles) {
    out.push({
      file: file.path,
      line: sf.getLineAndCharacterOfPosition(ref.pos).line + 1,
      syntax: "reference path",
      text: ref.fileName,
    });
  }

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const syntax = clause === undefined
        ? "bare import"
        : clause.isTypeOnly
          ? "import type"
          : node.attributes === undefined ? "import" : "import with attributes";
      push(node, syntax, node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      const star = node.exportClause === undefined || ts.isNamespaceExport(node.exportClause);
      push(node, node.isTypeOnly ? "export type from" : star ? "export star from" : "export from",
        node.moduleSpecifier);
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)) {
      push(node, "import equals require", node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const dynamic = callee.kind === ts.SyntaxKind.ImportKeyword
        ? "dynamic import"
        : ts.isIdentifier(callee) && callee.text === "require" ? "require call" : null;
      if (dynamic !== null) {
        // An absent argument is not a specifier; a non-literal argument IS one this gate cannot
        // read, and `push` records it with a null text so the audit reports it.
        const first = node.arguments[0];
        if (first !== undefined) push(node, dynamic, first);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/** A relative specifier resolved against the importing file, lexically. Null for a bare package. */
function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const parts = fromFile.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "." || segment === "") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

// ----------------------------------------------------------------------------------------------
// The audit: a pure function, so every control below drives it with the real defect
// ----------------------------------------------------------------------------------------------

/** One observed edge and the import sites that create it. */
interface ObservedEdge {
  readonly from: string;
  readonly to: string;
  readonly witnesses: readonly string[];
}

interface GraphReport {
  readonly findings: readonly string[];
  /** Keyed `from → to` over lifted entity ids. */
  readonly observed: ReadonlyMap<string, ObservedEdge>;
  readonly declared: ReadonlyMap<string, string>;
  /** The entity derived as the kernel, or null when the derivation did not land on exactly one. */
  readonly kernel: string | null;
  readonly specifiers: number;
}

/**
 * The entity the model declares as the kernel, DERIVED rather than named here.
 *
 * The derivation is the model's own sentence — "its declared out-degree is zero" — read as a
 * predicate: an uncontained entity at `layer: kernel` with no declared out-edge. Exactly one
 * satisfies it. Naming `model-ir` in this file instead would make the spine claim a second copy, and
 * editing the model's spine away would then leave this gate asserting a fact the model had dropped.
 */
function deriveKernel(arch: Architecture): { readonly id: string | null; readonly reason: string } {
  const contained = new Set(arch.subjects.flatMap((s) => s.contains));
  const sources = new Set([...arch.declared.keys()].map((key) => key.split(" → ")[0] ?? ""));
  const candidates = arch.subjects
    .filter((s) => s.layer === "kernel" && !contained.has(s.id) && !sources.has(s.id))
    .map((s) => s.id);
  if (candidates.length === 1) return { id: candidates[0] ?? null, reason: "" };
  return {
    id: null,
    reason: candidates.length === 0
      ? `no uncontained entity at \`layer: kernel\` has zero declared out-edges, so the model no `
        + `longer declares a dependency sink. That sentence — "its declared out-degree is zero" — is `
        + `the model's spine, and a gate cannot hold the code to a claim the model has dropped.`
      : `${candidates.length} uncontained entities at \`layer: kernel\` have zero declared `
        + `out-edges (${candidates.join(", ")}). The kernel derivation needs exactly one; with two, `
        + `"the kernel" names nothing and this gate would police whichever came first.`,
  };
}

/**
 * Everything that can be wrong between the model and the tree, in one pass.
 *
 * Pure over `files` and the parsed model, which is what lets the controls at the foot of this file
 * inject the audit's own mutation and a removed declaration. A gate for a defect proven to slip past
 * everything has to be proven to catch it.
 */
function auditImportGraph(
  files: readonly SourceFile[],
  rawModel: unknown,
  allowance: Readonly<Record<string, Allowance>> = OUTSIDE_ROOT,
): GraphReport {
  const arch = readArchitecture(rawModel);
  const findings: string[] = [];
  const observed = new Map<string, ObservedEdge>();
  const kernel = deriveKernel(arch);
  if (kernel.id === null) findings.push(kernel.reason);

  const root = arch.root;
  if (root === null) {
    findings.push(`\`${MODEL_PATH}\`'s \`${DEPENDENCY_MODEL}\` model declares no `
      + `\`provenance.subject.ref\`, so the tree this gate is supposed to scan is unnamed. The root `
      + `is read from the model rather than written here; without it there is nothing to read.`);
    return { findings, observed, declared: arch.declared, kernel: kernel.id, specifiers: 0 };
  }
  if (arch.declared.size === 0) {
    findings.push(`\`${MODEL_PATH}\`'s \`${DEPENDENCY_MODEL}\` model declares no \`${RELATION}\` `
      + `relation. An empty declared set makes \`observed ⊆ declared\` unsatisfiable and an empty `
      + `observed set makes it vacuous, so neither direction may be read from a graph this size.`);
  }

  // The join must be TOTAL over the scan root. A directory with no entity is invisible to every
  // comparison below, which is the shape six of this tree's thirteen modules were in before 261004.
  const unowned = files.filter((f) => ownerOf(arch, f.path) === null).map((f) => f.path);
  for (const path of unowned) {
    findings.push(`\`${path}\` is under \`${root}\` and no entity's \`provenance.subject.ref\` owns `
      + `it, so every import it makes and receives is outside this gate. Give it an entity, or widen `
      + `an existing ref — an unowned file is not a file with no dependencies, it is a file nobody `
      + `is checking.`);
  }

  // The other half of totality: a ref owning nothing has gone stale, and the loader cannot say so
  // because it drops `provenance.subject` entirely.
  for (const subject of arch.subjects) {
    if (subject.ref === null) {
      findings.push(`entity \`${subject.id}\` declares no \`provenance.subject.ref\`, so no file `
        + `routes to it and no import it makes is checked. The ref IS the join.`);
      continue;
    }
    if (files.some((f) => ownerOf(arch, f.path)?.id === subject.id)) continue;
    findings.push(`entity \`${subject.id}\` names \`${subject.ref}\` and no scanned file resolves to `
      + `it. Either the code moved or the ref has a typo — and a typo'd ref validates clean, because `
      + `the loader does not read \`provenance.subject\`.`);
  }

  const used = new Set<string>();
  let specifiers = 0;
  for (const file of files) {
    for (const specifier of importSpecifiers(file)) {
      specifiers += 1;
      const at = `${specifier.file}:${specifier.line}`;
      if (specifier.text === null) {
        findings.push(`\`${at}\` is a \`${specifier.syntax}\` whose specifier is not a string `
          + `literal, so no static reader can resolve it and this gate cannot see the dependency it `
          + `creates. Make the specifier literal, or the edge is unchecked — reported rather than `
          + `skipped, because a skip is how a scanner's coverage claim becomes false.`);
        continue;
      }
      const resolved = resolveSpecifier(specifier.file, specifier.text);
      if (resolved === null) continue;  // A bare package specifier: not a component of this system.
      if (!/\.[A-Za-z0-9]+$/.test(specifier.text)) {
        findings.push(`\`${at}\` imports \`${specifier.text}\`, which carries no file extension. `
          + `Resolution here is lexical — this package writes explicit extensions everywhere and has `
          + `no index files — so an extensionless specifier would need directory resolution this gate `
          + `does not implement, and guessing is how a wiring check earns a false red.`);
        continue;
      }
      if (resolved !== root && !resolved.startsWith(`${root}/`)) {
        const entry = allowance[resolved];
        if (entry === undefined) {
          findings.push(`\`${at}\` imports \`${resolved}\`, outside the scan root \`${root}\`, and no `
            + `allowance declares it. Either it belongs to a component — in which case the model needs `
            + `the entity and the edge — or it is data, in which case say so with the evidence that `
            + `something else owns it.`);
          continue;
        }
        used.add(resolved);
        if (entry.reason.trim().length < MIN_REASON) {
          findings.push(`\`${resolved}\` is allowed outside the scan root with a `
            + `${entry.reason.trim().length}-character reason; at least ${MIN_REASON} are required. `
            + `State what it is and what owns it.`);
        }
        continue;
      }
      if (resolved.endsWith(".ts") && !files.some((f) => f.path === resolved)) {
        findings.push(`\`${at}\` imports \`${resolved}\`, which is not in the scanned file set. `
          + `Either the walk missed it — in which case every edge from that file is unchecked — or the `
          + `specifier is dangling.`);
        continue;
      }
      const from = ownerOf(arch, specifier.file);
      const to = ownerOf(arch, resolved);
      if (from === null || to === null) continue;  // Already reported as an unowned path above.
      const a = liftToContainer(arch, from.id);
      const b = liftToContainer(arch, to.id);
      if (a === b) continue;  // Internal to one component; the model has nothing to say about it.
      const key = edgeKey(a, b);
      const edge = observed.get(key);
      const witness = `${at} (${specifier.syntax}) ${specifier.text}`;
      if (edge === undefined) observed.set(key, { from: a, to: b, witnesses: [witness] });
      else observed.set(key, { ...edge, witnesses: [...edge.witnesses, witness] });
    }
  }

  // THE violation. An import the model does not declare is the `absence` clause broken, and the
  // mutation that defeated every gate in this repo took exactly this shape.
  for (const key of [...observed.keys()].sort()) {
    if (arch.declared.has(key)) continue;
    const edge = observed.get(key);
    findings.push(`\`${key}\` is an import the components model does not declare. Its \`${RELATION}\` `
      + `absence clause reads "an edge that is not drawn here is an edge the implementation may not `
      + `create", so this is either a dependency to undo or an architecture decision to make and `
      + `draw. Witnessed at ${(edge?.witnesses ?? []).slice(0, 4).join(", ")}.`);
  }

  // The other direction, argued in this file's header: a declared edge nothing creates.
  for (const key of [...arch.declared.keys()].sort()) {
    if (observed.has(key)) continue;
    findings.push(`\`${key}\` is declared as \`${arch.declared.get(key) ?? "?"}\` and no import in `
      + `\`${root}\` creates it. Reachability is monotone in edges, so a stale edge can carry the `
      + `model's positive control on a path the code no longer has, and it widens the permitted set `
      + `for the next import of that shape. Delete it, or restore the dependency it describes.`);
  }

  // The spine, held against the OBSERVED graph and not merely against the declarations. Editing the
  // model AND the code together passes the subset check above; it does not pass this.
  if (kernel.id !== null) {
    for (const edge of [...observed.values()].filter((e) => e.from === kernel.id)) {
      findings.push(`the kernel \`${kernel.id}\` imports \`${edge.to}\`. Its declared out-degree is `
        + `zero and that is the model's central claim — everything depends inward on the semantic `
        + `kernel. Witnessed at ${edge.witnesses.slice(0, 4).join(", ")}.`);
    }
  }

  for (const path of Object.keys(allowance).sort()) {
    if (used.has(path)) continue;
    findings.push(`\`${path}\` is declared as allowed outside the scan root and nothing imports it. `
      + `A stale allowance is where a real undeclared edge goes to be forgotten.`);
  }

  return { findings: [...new Set(findings)], observed, declared: arch.declared, kernel: kernel.id, specifiers };
}

// ----------------------------------------------------------------------------------------------
// The real tree
// ----------------------------------------------------------------------------------------------

/** Every `.ts` file under a directory, package relative, read. */
function sourceTree(root: string): readonly SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const path = `${root}/${entry}`;
    if (!path.endsWith(".ts") || !statSync(path).isFile()) continue;
    out.push({ path, text: readFileSync(path, "utf8") });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const modelText = (): string => readFileSync(MODEL_PATH, "utf8");
const modelDoc = (): unknown => parse(modelText());

/** The real scan, and the inputs asserted before the audit reads them. */
function scanRealTree(): GraphReport {
  const arch = readArchitecture(modelDoc());
  assert.ok(arch.root !== null, `${MODEL_PATH} declares no scan root`);
  const files = sourceTree(arch.root ?? "src");
  // A probe that finds nothing is usually the probe, and this audit passes trivially over an empty
  // file set: no observed edge can escape a declaration that no file creates.
  assert.ok(files.length > 50, `walked ${files.length} source file(s) under \`${arch.root}\` — this `
    + `package has more than that, so the tree walk is wrong`);
  assert.ok(arch.subjects.length > 10,
    `read ${arch.subjects.length} entit(ies) from the model — the model is not being read`);
  assert.ok(arch.declared.size > 20,
    `read ${arch.declared.size} declared \`${RELATION}\` edge(s) — the relation list is not being read`);
  const report = auditImportGraph(files, modelDoc());
  assert.ok(report.specifiers > 300,
    `the parse found ${report.specifiers} module specifier(s) across ${files.length} files, which is `
    + `too few for this tree — the visitor is not reaching the import statements`);
  return report;
}

test("every import in src/ is an edge the components model declares, and every declared edge exists", () => {
  const report = scanRealTree();
  console.log(`\nimport-graph — ${report.observed.size} observed edge(s) over `
    + `${report.specifiers} module specifier(s); ${report.declared.size} declared; `
    + `kernel \`${String(report.kernel)}\` out-degree `
    + `${[...report.observed.values()].filter((e) => e.from === report.kernel).length}\n`);
  assert.deepEqual(report.findings, [],
    `the import graph and the components model disagree:\n  ${report.findings.join("\n  ")}\n`);
});

test("the file-to-entity join is total in both directions", () => {
  // The join IS the gate's coverage claim. If a ref stopped owning files, or a directory stopped
  // having an owner, the comparison above would pass by checking less — the failure mode
  // `test/gate-reachability.test.ts` calls "passing by policing nothing".
  const arch = readArchitecture(modelDoc());
  const root = arch.root ?? "src";
  const files = sourceTree(root);

  // `sourceTree` reads `.ts` and nothing else, so a module in any other spelling would be scanned by
  // nothing and reported by nothing — the quietest hole a scanner can have. The tree has no such
  // file, and this is what keeps that true rather than assumed.
  const foreign = readdirSync(root, { recursive: true, encoding: "utf8" })
    .map((entry) => `${root}/${entry}`)
    .filter((path) => statSync(path).isFile() && !path.endsWith(".ts"));
  assert.deepEqual(foreign, [],
    `${foreign.join(", ")} under \`${root}\` is not a .ts file, so the scan does not read it. Either `
    + `teach the walk that extension or the imports in it are unchecked.`);

  const owners = new Map<string, number>();
  for (const file of files) {
    const owner = ownerOf(arch, file.path);
    assert.ok(owner !== null, `${file.path} is owned by no entity`);
    owners.set(owner?.id ?? "", (owners.get(owner?.id ?? "") ?? 0) + 1);
  }
  for (const subject of arch.subjects) {
    assert.ok((owners.get(subject.id) ?? 0) > 0,
      `entity \`${subject.id}\` (ref \`${String(subject.ref)}\`) owns no file`);
  }

  // The two rules the model's header documents, pinned on the cases that distinguish them from the
  // naive reading. Both come from the model's own prose, so a gate that got them wrong would read as
  // the code being wrong.
  assert.equal(ownerOf(arch, "src/app/agent-api.ts")?.id, "agent-adapter",
    "longest prefix must win: a file ref beats the directory it sits in");
  assert.equal(ownerOf(arch, "src/app/services.ts")?.id, "app-services",
    "a sibling of that file must still route to the directory's entity");
  assert.equal(ownerOf(arch, "src/ui/shell/surfaces.ts")?.id, "shell-surfaces");
  assert.equal(ownerOf(arch, "src/ui/shell/header.ts")?.id, "ui");
  assert.equal(ownerOf(arch, "src/worker/port.ts")?.id, "worker-wiring");
  assert.equal(ownerOf(arch, "src/worker/analysis.worker.ts")?.id, "analysis-worker");
  assert.equal(liftToContainer(arch, "quant-evaluator"), "query-engine",
    "a contained entity's edges must lift to its container, or the engine/quant cycle reads as a "
    + "violation of `acyclic: true`");
  assert.equal(liftToContainer(arch, "agent-adapter"), "agent-adapter",
    "an uncontained entity must not lift; agent-adapter is a peer of the facade, not part of it");
});

test("the containment lift drops the internal edge and keeps the lifted one", () => {
  // `src/quant → src/engine` and `src/engine → src/quant` are the cycle containment resolves, and
  // the model says so in terms. A lift that fired in one direction only would hide the other.
  const report = scanRealTree();
  assert.equal(report.observed.get(edgeKey("quant-evaluator", "query-engine")), undefined,
    "an edge internal to one component must not appear in the observed set");
  assert.equal(report.observed.get(edgeKey("query-engine", "quant-evaluator")), undefined,
    "nor the other direction of it");
  const lifted = report.observed.get(edgeKey("query-engine", "model-ir"));
  assert.ok(lifted !== undefined, "`src/quant → src/ir` must be observed as `query-engine → model-ir`");
  assert.ok(lifted.witnesses.some((w) => w.startsWith("src/quant/")),
    `the lifted edge must carry a src/quant witness: ${lifted.witnesses.join(", ")}`);
  assert.ok(lifted.witnesses.some((w) => w.startsWith("src/engine/")),
    "and an src/engine witness, or the lift replaced the container's own edge rather than joining it");
});

test("the kernel's observed out-degree is zero, and the model still asserts it", () => {
  const report = scanRealTree();
  assert.equal(report.kernel, "model-ir",
    "the kernel derivation — an uncontained entity at `layer: kernel` with no declared out-edge — "
    + "must land on model-ir; it is derived rather than named so that editing the model's spine away "
    + "fails here instead of silently retargeting this check");
  const out = [...report.observed.values()].filter((e) => e.from === report.kernel);
  assert.deepEqual(out.map((e) => e.to), [],
    `the kernel imports ${out.map((e) => `${e.to} (${e.witnesses[0] ?? ""})`).join(", ")}`);

  // The derivation must be the same entity the model's own prohibitions are written about. Without
  // this, a derivation that drifted onto another kernel-layer entity would keep passing.
  const arch = readArchitecture(modelDoc());
  const named = arch.prohibitions.get("model-ir") ?? [];
  assert.ok(named.length >= 3,
    `the derived kernel is the subject of ${named.length} refuted reachability quer(ies); the model's `
    + `four kernel prohibitions are what make it the kernel`);
});

test("the gate reads the same depends-on graph the engine answers queries over", () => {
  // Two readers of one file: this gate parses the YAML directly, because `provenance.subject.ref`
  // is not in the canonical IR, while the queries are answered over the canonicalized relations. If
  // those two disagreed, a green gate here would say nothing about the graph the model asserts on.
  const arch = readArchitecture(modelDoc());
  const ws = new Workspace(realPorts);
  const loaded = ws.load(modelText());
  assert.ok(loaded.ok, "the components model must load through the facade");
  assert.deepEqual(loaded.findings, [], "the components model must validate clean");

  const contained = new Set(arch.subjects.flatMap((s) => s.contains));
  const canonical = new Set(ws.state.system.relations
    .filter((r) => r.type === RELATION)
    .map((r) => edgeKey(liftToContainer(arch, r.from), liftToContainer(arch, r.to))));
  assert.deepEqual([...canonical].sort(), [...arch.declared.keys()].sort(),
    "the YAML read and the canonical relation list must describe the same edge set");
  assert.ok(contained.size > 0,
    "no entity declares `contains`, so the lift above is a no-op and the cycle argument is unmade");
});

test("the three allowed non-component imports are the schema documents, and nothing else", () => {
  for (const [path, entry] of Object.entries(OUTSIDE_ROOT)) {
    assert.ok(entry.reason.trim().length >= MIN_REASON,
      `\`${path}\` is allowed with a ${entry.reason.trim().length}-character reason`);
    const text = readFileSync(entry.evidenceIn, "utf8");
    assert.ok(text.includes(entry.evidence),
      `\`${path}\` is allowed on the evidence that \`${entry.evidenceIn}\` contains `
      + `"${entry.evidence}", and it does not. The allowance's whole claim is that something else `
      + `owns this file; without that line nothing does.`);
    assert.ok(readFileSync(path, "utf8").includes("$schema"),
      `\`${path}\` is allowed as a JSON Schema document and does not declare \`$schema\``);
  }
});

// ----------------------------------------------------------------------------------------------
// The scanner's coverage claim, driven one syntax at a time
// ----------------------------------------------------------------------------------------------

/** One row of the header's COVERED list: the source that writes it, and the specifier it carries. */
const SYNTAX_FIXTURES: readonly { readonly syntax: string; readonly source: string }[] = [
  { syntax: "import", source: `import x from "../ui/a.ts";\n` },
  { syntax: "import", source: `import { a, b } from "../ui/a.ts";\n` },
  { syntax: "import", source: `import * as ns from "../ui/a.ts";\n` },
  { syntax: "import", source: `import {\n  a,\n  b,\n} from\n  "../ui/a.ts";\n` },
  { syntax: "bare import", source: `import "../ui/a.ts";\n` },
  { syntax: "import type", source: `import type { A } from "../ui/a.ts";\n` },
  { syntax: "import", source: `import { type A, b } from "../ui/a.ts";\n` },
  { syntax: "import with attributes", source: `import d from "../ui/a.ts" with { type: "json" };\n` },
  { syntax: "export from", source: `export { a } from "../ui/a.ts";\n` },
  { syntax: "export type from", source: `export type { A } from "../ui/a.ts";\n` },
  { syntax: "export star from", source: `export * from "../ui/a.ts";\n` },
  { syntax: "export star from", source: `export * as ns from "../ui/a.ts";\n` },
  { syntax: "dynamic import", source: `const f = async () => await import("../ui/a.ts");\n` },
  { syntax: "import equals require", source: `import x = require("../ui/a.ts");\n` },
  { syntax: "require call", source: `const x = require("../ui/a.ts");\n` },
  { syntax: "reference path", source: `/// <reference path="../ui/a.ts" />\nexport const y = 1;\n` },
];

test("the scanner sees every syntax it claims", () => {
  for (const fixture of SYNTAX_FIXTURES) {
    const found = importSpecifiers({ path: "src/ir/probe.ts", text: fixture.source });
    const hit = found.filter((s) => s.text === "../ui/a.ts");
    assert.equal(hit.length, 1,
      `${JSON.stringify(fixture.source)} yielded ${hit.length} specifier(s) for ../ui/a.ts: `
      + `${JSON.stringify(found)}`);
    assert.equal(hit[0]?.syntax, fixture.syntax,
      `${JSON.stringify(fixture.source)} was read as \`${String(hit[0]?.syntax)}\``);
    assert.equal(resolveSpecifier("src/ir/probe.ts", "../ui/a.ts"), "src/ui/a.ts");
  }

  // The two it cannot read, which are REPORTED and not skipped. A scanner that quietly dropped them
  // would make the coverage list above false by omission.
  for (const source of [
    `const p = "../ui/a.ts";\nconst f = async () => await import(p);\n`,
    `const p = "../ui/a.ts";\nconst x = require(p);\n`,
  ]) {
    const found = importSpecifiers({ path: "src/ir/probe.ts", text: source });
    assert.deepEqual(found.map((s) => s.text), [null],
      `a non-literal specifier must be recorded with a null text: ${JSON.stringify(found)}`);
  }

  // Resolution, on the cases a lexical walk gets wrong if it is sloppy about `.` and `..`.
  assert.equal(resolveSpecifier("src/ui/shell/header.ts", "./surfaces.ts"), "src/ui/shell/surfaces.ts");
  assert.equal(resolveSpecifier("src/ui/shell/header.ts", "../../ir/types.ts"), "src/ir/types.ts");
  assert.equal(resolveSpecifier("src/ui/main.ts", "../../mage-model.schema.json"),
    "mage-model.schema.json");
  assert.equal(resolveSpecifier("src/ui/main.ts", "yaml"), null, "a bare package is not a path");
});

// ----------------------------------------------------------------------------------------------
// The controls. This gate exists because a mutation passed everything, so it is driven with that
// mutation and with the inverse sabotage.
// ----------------------------------------------------------------------------------------------

/**
 * The real tree with one file's text replaced, so the audit runs against the real model and the real
 * 87 files rather than a toy. The mutation is applied to a COPY in memory: `src/ir/types.ts` on disk
 * is untouched, which is the difference between a control and an experiment nobody can re-run.
 */
function treeWithMutation(path: string, mutate: (text: string) => string): readonly SourceFile[] {
  const files = sourceTree("src");
  const target = files.find((f) => f.path === path);
  assert.ok(target !== undefined, `${path} is not in the scanned tree, so the mutation has no subject`);
  return files.map((f) => (f.path === path ? { path, text: mutate(f.text) } : f));
}

test("the two mutations that defeated every existing gate are caught", () => {
  // The baseline first. Every delta below is measured against it, and a control whose baseline is
  // already red proves nothing.
  assert.deepEqual(auditImportGraph(sourceTree("src"), modelDoc()).findings, [],
    "the real tree must be clean, or the controls below measure against a red baseline");

  // MUTATION 1 — the audit's own, verbatim: `AUDIT-system-models-261004.md` gap 1. A real
  // kernel-to-UI import in `src/ir/types.ts`, which passed tsc, the node tier, `validate.py
  // --self-test` and model validation. Applied to a copy; the file on disk is not edited.
  const injected = `import { checkPurposeVisibility } from "../ui/invariants.ts";\n`;
  const kernelToView = auditImportGraph(
    treeWithMutation("src/ir/types.ts", (text) => injected + text), modelDoc());
  assert.ok(kernelToView.findings.length > 0, "the kernel-to-view import must be caught");
  assert.ok(kernelToView.findings.some((m) => /`model-ir → ui` is an import the components model does not declare/.test(m)),
    `the undeclared edge must be named: ${kernelToView.findings.join("; ")}`);
  assert.ok(kernelToView.findings.some((m) => /the kernel `model-ir` imports `ui`/.test(m)),
    "and the spine must be named separately, because that is the claim the model is built around");
  assert.ok(kernelToView.findings.some((m) => /src\/ir\/types\.ts:1/.test(m)),
    `the finding must cite the import site: ${kernelToView.findings.join("; ")}`);

  // The same mutation written as a TYPE import, which is the half a value-only scan would miss and
  // the model's `depends-on` definition counts: "a type-only import counts".
  const typeOnly = auditImportGraph(
    treeWithMutation("src/ir/types.ts",
      (text) => `import type { PurposeFinding } from "../ui/invariants.ts";\n${text}`),
    modelDoc());
  assert.ok(typeOnly.findings.some((m) => /`model-ir → ui`/.test(m)),
    `a type-only kernel-to-view import must be caught too: ${typeOnly.findings.join("; ")}`);

  // And written as `export … from`, the syntax a regex over `^import` would walk past.
  const reExported = auditImportGraph(
    treeWithMutation("src/ir/types.ts",
      (text) => `${text}\nexport { renderSvg } from "../render/svg.ts";\n`),
    modelDoc());
  assert.ok(reExported.findings.some((m) => /`model-ir → renderer`/.test(m)),
    `a re-export is a dependency: ${reExported.findings.join("; ")}`);

  // MUTATION 2 — the inverse sabotage: a declared edge removed while the import stays. This is the
  // direction this file's header argues is a failure rather than a report, and it is the direction
  // that lets the model's positive control pass on a path the code no longer has.
  const withoutLearnUi = modelText().replace(
    /^.*\bid: learn-ui\b.*$\n/m, "");
  assert.notEqual(withoutLearnUi, modelText(), "the sabotage must actually remove the declaration");
  const removed = auditImportGraph(sourceTree("src"), parse(withoutLearnUi));
  assert.ok(removed.findings.some((m) => /`learn-page → ui` is an import the components model does not declare/.test(m)),
    `removing a declaration must surface the import it covered: ${removed.findings.join("; ")}`);
  assert.ok(removed.findings.some((m) => /src\/learn\/main\.ts/.test(m)),
    "and name the import site, which is where the decision has to be made");

  // The other side of mutation 2: an edge declared and not created. Added to the model rather than
  // removed, so the finding is the one the header argues for.
  const extra = modelText().replace(
    /^(\s*)- \{ id: learn-ui,/m,
    `$1- { id: fabricated, from: renderer, to: agent-adapter, type: depends-on }\n$1- { id: learn-ui,`);
  assert.notEqual(extra, modelText(), "the sabotage must actually add the declaration");
  const unobserved = auditImportGraph(sourceTree("src"), parse(extra));
  assert.ok(unobserved.findings.some((m) => /`renderer → agent-adapter` is declared as `fabricated`/.test(m)),
    `a declared edge nothing creates must be reported: ${unobserved.findings.join("; ")}`);
  assert.ok(unobserved.findings.some((m) => /monotone in edges/.test(m)),
    "with the reason, because this is the direction a reader would otherwise argue down to a report");

  // Both sides edited together — the mutation a subset check alone cannot see. The import lands AND
  // the model is given the edge, so `observed ⊆ declared` holds and the spine is gone.
  const bothSides = auditImportGraph(
    treeWithMutation("src/ir/types.ts", (text) => injected + text),
    parse(modelText().replace(/^(\s*)- \{ id: val-ir,/m,
      `$1- { id: smuggled, from: model-ir, to: ui, type: depends-on }\n$1- { id: val-ir,`)));
  assert.ok(!bothSides.findings.some((m) => /is an import the components model does not declare/.test(m)),
    "with both sides edited the subset check is satisfied — which is exactly why the spine is held "
    + "against the observed graph separately");
  assert.ok(bothSides.findings.some((m) => /no uncontained entity at `layer: kernel` has zero declared out-edges/.test(m)),
    `editing the spine away must be reported: ${bothSides.findings.join("; ")}`);
});

test("the gate fires on each remaining defect it exists to catch — negative control", () => {
  const real = modelDoc();
  const files = sourceTree("src");

  // A new directory with no entity: invisible to every comparison, which is the state six of this
  // tree's thirteen modules were in before the model was re-founded.
  const orphan = auditImportGraph(
    [...files, { path: "src/telemetry/sink.ts", text: `import { hash } from "../ir/hash.ts";\n` }], real);
  assert.ok(orphan.findings.some((m) => /src\/telemetry\/sink\.ts` is under `src` and no entity/.test(m)),
    `an unowned file must be reported: ${orphan.findings.join("; ")}`);

  // A ref that owns nothing — the stale half of the same property. The loader cannot catch this
  // because it drops `provenance.subject` entirely, so a typo validates clean.
  const typo = parse(modelText().replace("ref: src/render", "ref: src/renderer"));
  assert.ok(auditImportGraph(files, typo).findings.some((m) => /names `src\/renderer` and no scanned file/.test(m)),
    "a ref owning no file must be reported");

  // An entity with no ref at all: nothing routes to it, so its imports are unchecked.
  const noRef = parse(modelText().replace(
    /^(  renderer:\n(?:.*\n)*?)    provenance:\n      subject: \{ kind: repository, ref: src\/render \}\n/m, "$1"));
  assert.ok(auditImportGraph(files, noRef).findings.some((m) => /declares no `provenance.subject.ref`/.test(m)),
    "an entity with no subject ref must be reported");

  // A specifier escaping the scan root with no allowance. `src/` importing a script is the shape:
  // a real dependency on a tree the model says nothing about.
  const escape = auditImportGraph(
    files.map((f) => (f.path === "src/ir/hash.ts"
      ? { ...f, text: `import { x } from "../../scripts/gen-affordances.ts";\n${f.text}` }
      : f)), real);
  assert.ok(escape.findings.some((m) => /outside the scan root `src`, and no allowance declares it/.test(m)),
    `an un-allowed escape must be reported: ${escape.findings.join("; ")}`);

  // A stale allowance, where a real undeclared edge would go to be forgotten.
  const stale = auditImportGraph(files, real, {
    ...OUTSIDE_ROOT,
    "retired.schema.json": {
      evidenceIn: "package.json", evidence: "json2ts",
      reason: "x".repeat(MIN_REASON) + " a retired schema nobody imports any more",
    },
  });
  assert.ok(stale.findings.some((m) => /`retired\.schema\.json` is declared as allowed/.test(m)),
    "an unused allowance must be reported");

  // A thin reason is how an allowance map turns into a list of excuses.
  const thin = auditImportGraph(files, real, Object.fromEntries(
    Object.entries(OUTSIDE_ROOT).map(([k, v]) => [k, { ...v, reason: "data" }])));
  assert.ok(thin.findings.some((m) => /character reason; at least \d+ are required/.test(m)),
    "a reason under the floor must be reported");

  // An extensionless specifier. Lexical resolution cannot read it, and guessing is how a wiring
  // check earns a false red — so it is a finding rather than a silent pass.
  const bare = auditImportGraph(
    files.map((f) => (f.path === "src/ir/hash.ts"
      ? { ...f, text: `import { CanonEntity } from "./types";\n${f.text}` }
      : f)), real);
  assert.ok(bare.findings.some((m) => /carries no file extension/.test(m)),
    `an extensionless specifier must be reported: ${bare.findings.join("; ")}`);

  // A dynamic import the gate cannot resolve. Reported, because a skip makes the coverage claim in
  // this file's header false by omission.
  const opaque = auditImportGraph(
    files.map((f) => (f.path === "src/ir/hash.ts"
      ? { ...f, text: `const p = "../ui/main.ts";\nexport const load = () => import(p);\n${f.text}` }
      : f)), real);
  assert.ok(opaque.findings.some((m) => /is a `dynamic import` whose specifier is not a string literal/.test(m)),
    `an unresolvable specifier must be reported: ${opaque.findings.join("; ")}`);

  // A dangling specifier under the root: either the walk missed a file — in which case every edge
  // from it is unchecked — or the import is broken.
  const dangling = auditImportGraph(
    files.map((f) => (f.path === "src/ir/hash.ts"
      ? { ...f, text: `import { gone } from "./removed.ts";\n${f.text}` }
      : f)), real);
  assert.ok(dangling.findings.some((m) => /is not in the scanned file set/.test(m)),
    "a dangling specifier must be reported");

  // The model with no declared edges. An empty declared set makes the subset check unsatisfiable;
  // it must not read as "nothing to check".
  const noRelations = parse(modelText().replace(
    /^      - \{ id: [a-z-]+, *from: .*$\n/gm, ""));
  const empty = auditImportGraph(files, noRelations);
  assert.ok(empty.findings.some((m) => /declares no `depends-on` relation/.test(m)),
    `an empty relation list must be reported: ${empty.findings.slice(0, 3).join("; ")}`);

  // No scan root: the tree this gate reads is read from the model, and without it there is nothing.
  const noRoot = parse(modelText().replace(/^        ref: src\n/m, ""));
  const rootless = auditImportGraph(files, noRoot);
  assert.ok(rootless.findings.some((m) => /the tree this gate is supposed to scan is unnamed/.test(m)),
    `a missing scan root must be reported: ${rootless.findings.join("; ")}`);

  // Two kernel candidates. The derivation needs exactly one, and with two "the kernel" names
  // nothing — so it says so rather than policing whichever came first.
  const twoKernels = parse(modelText().replace(
    /^      - \{ id: val-ir, *from: validator, *to: model-ir, *type: depends-on \}\n/m, ""));
  const ambiguous = auditImportGraph(files, twoKernels);
  assert.ok(ambiguous.findings.some((m) => /uncontained entities at `layer: kernel` have zero declared/.test(m)),
    `an ambiguous kernel must be reported: ${ambiguous.findings.slice(0, 3).join("; ")}`);
});
