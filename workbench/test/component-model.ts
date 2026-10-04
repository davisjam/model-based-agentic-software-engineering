/**
 * The components model's file-to-entity join, and the scanner that reads `src/` for it.
 *
 * Not a gate. This is the shared substrate two gates read the architecture through —
 * `test/import-graph.test.ts`, which holds the declared `depends-on` edge set against every import
 * specifier in the tree, and `test/adapter-reexport.test.ts`, which holds one symbol-level
 * prohibition the edge set cannot express. It carries no `test()` call, so the node runner's
 * `test/*.test.ts` glob does not hand it to a process and importing it registers nothing.
 *
 * It exists as its own module for the reason the second consumer always makes plain: a second copy
 * of this join would be a second reading of the model's own documented rules, free to drift from the
 * first while both stayed green. `test/import-graph.test.ts` implemented it first and the extraction
 * moved it here unchanged.
 *
 * ## The two rules, which are the MODEL's and not this file's
 *
 * Every entity in `models/workbench-components.mage.yaml` carries `provenance.subject.ref` — the
 * path, package relative, of the code it stands for — and that model's header documents two rules
 * that make the mapping total and unambiguous. This module implements those two and nothing else:
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
 * NOT canonicalize — the IR's `Provenance` carries prompt and history, not a subject — so this join
 * parses the YAML directly. A consequence worth stating: a ref with a typo validates clean, which is
 * why each consumer checks that every ref owns at least one real file.
 *
 * ## Import syntaxes, stated because a scanner's coverage is its whole worth
 *
 * The scan is a real parse — `typescript`'s own `createSourceFile`, already a devDependency — not a
 * pattern over text. A regex over TypeScript import syntax silently misses `export … from`,
 * specifiers split across lines, and `import type {`. `test/import-graph.test.ts` drives one fixture
 * per row of the list below.
 *
 * COVERED: `import x from`, `import { x }`, `import * as x`, bare `import "./x.ts"`,
 * `import type { x }`, inline `import { type x }`, import attributes (`with { type: "json" }`),
 * `export { x } from`, `export type { x } from`, `export * from`, `export * as ns from`, dynamic
 * `import("./x.ts")`, `import x = require("./x.ts")`, `require("./x.ts")`, and a `/// <reference
 * path="…" />` directive.
 *
 * NOT COVERED, and each REPORTED by the consumer rather than skipped: a dynamic `import(expr)` or
 * `require(expr)` whose specifier is not a string literal, because no static reader can resolve it
 * (`text` is null and the consumer decides); and a relative specifier with no file extension,
 * because resolution here is lexical — this package writes explicit `.ts` on all of its relative
 * specifiers and has no index files, so directory resolution would be machinery for a case that does
 * not exist.
 *
 * NOT RESOLVED: a specifier aliased through a tsconfig `paths` entry or a package.json `imports`
 * map. `resolveSpecifier` reads relative specifiers and hands back null for everything else, so
 * every claim built on this module is a claim about relative specifiers. That channel is asserted
 * SHUT rather than resolved, by `ALIAS_CHANNELS` in `test/import-graph.test.ts` — one assertion for
 * both consumers, because the precondition is the scanner's and not any one gate's.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { parse } from "yaml";
import ts from "typescript";

/** The architecture model both consumers hold the tree to, package relative. */
export const MODEL_PATH = "models/workbench-components.mage.yaml";

/** The model inside it whose relations ARE the architecture, and whose subject ref gives the root. */
export const DEPENDENCY_MODEL = "dependencies";

/** The relation the import graph instantiates. The model's other relation type is mutation authority. */
export const RELATION = "depends-on";

// ----------------------------------------------------------------------------------------------
// Reading the model: entities, their refs, their containment, and the declared edges
// ----------------------------------------------------------------------------------------------

/** One entity's contribution to the join. `ref` is null when the entity declares none. */
export interface Subject {
  readonly id: string;
  readonly ref: string | null;
  readonly contains: readonly string[];
  readonly layer: string | null;
}

/** The declared architecture: who owns which paths, which edges exist, and where the scan starts. */
export interface Architecture {
  readonly subjects: readonly Subject[];
  /** `from → to` keys over LIFTED entity ids, valued with the relation id the model gave. */
  readonly declared: ReadonlyMap<string, string>;
  /** The dependency model's own subject ref, or null when it declares none. */
  readonly root: string | null;
  /** Query ids whose `from` is each entity, for `expect: refuted` reachability over `RELATION`. */
  readonly prohibitions: ReadonlyMap<string, readonly string[]>;
  /** Query ids whose `to` is each entity, same filter. The boundary half of the same statement. */
  readonly prohibited: ReadonlyMap<string, readonly string[]>;
}

export const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : {};

export const asString = (value: unknown): string | null =>
  (typeof value === "string" ? value : null);

/** `from → to`, the one spelling of an edge used by every consumer. */
export const edgeKey = (from: string, to: string): string => `${from} → ${to}`;

/** The `from` and `to` of an `edgeKey`, so a consumer reads a key rather than re-splitting it. */
export const edgeEnds = (key: string): { readonly from: string; readonly to: string } => {
  const [from = "", to = ""] = key.split(" → ");
  return { from, to };
};

/** Read the model's YAML into the things the gates need. Tolerant: absences become findings. */
export function readArchitecture(raw: unknown): Architecture {
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
  const prohibited = new Map<string, string[]>();
  for (const [id, value] of Object.entries(asRecord(doc["queries"]))) {
    const query = asRecord(value);
    const graph = asRecord(query["graph"]);
    if (query["expect"] !== "refuted" || graph["form"] !== "reachability") continue;
    if (graph["relation"] !== RELATION) continue;
    for (const [end, into] of [["from", prohibitions], ["to", prohibited]] as const) {
      const at = asString(graph[end]);
      if (at === null) continue;
      const held = into.get(at) ?? [];
      held.push(id);
      into.set(at, held);
    }
  }

  return {
    subjects,
    declared,
    root: asString(asRecord(asRecord(model["provenance"])["subject"])["ref"]),
    prohibitions,
    prohibited,
  };
}

/** Containment, resolved transitively, as a function over a read architecture. */
export function liftToContainer(arch: Architecture, id: string): string {
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
export function ownerOf(arch: Architecture, path: string): Subject | null {
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

/** The entity a path belongs to for the purpose of a cross-component claim: owner, then lifted. */
export function entityOf(arch: Architecture, path: string): string | null {
  const owner = ownerOf(arch, path);
  return owner === null ? null : liftToContainer(arch, owner.id);
}

// ----------------------------------------------------------------------------------------------
// Reading the code: one real parse per file
// ----------------------------------------------------------------------------------------------

/** One file a gate reads. Supplied, so a control can drive the gate with a mutated tree. */
export interface SourceFile {
  readonly path: string;
  readonly text: string;
}

/** One module specifier, where it was written, and the syntax that wrote it. */
export interface Specifier {
  readonly file: string;
  readonly line: number;
  readonly syntax: string;
  /** The literal text, or null for a dynamic form whose argument is not a string literal. */
  readonly text: string | null;
  /**
   * The names this specifier RE-PUBLISHES, for the three `export … from` syntaxes: the exported
   * names as written, or `["*"]` for a star re-export, which republishes whatever the target has.
   * Empty for every import form — an import binds a name locally and adds nothing to the importing
   * module's surface, which is the distinction `test/adapter-reexport.test.ts` turns on.
   */
  readonly reExports: readonly string[];
}

/** The three `syntax` values that republish a target's names under the importing module's path. */
export const RE_EXPORT_SYNTAXES: readonly string[] = [
  "export from", "export type from", "export star from",
];

/**
 * Every module specifier in one file.
 *
 * The TypeScript parser rather than a pattern: the syntax list in this file's header is long, and
 * every row of it is a shape a text scan gets wrong in the direction that hides an edge.
 */
export function importSpecifiers(file: SourceFile): readonly Specifier[] {
  const sf = ts.createSourceFile(
    file.path, file.text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: Specifier[] = [];
  const push = (
    node: ts.Node, syntax: string, spec: ts.Node | undefined, reExports: readonly string[] = [],
  ): void => {
    if (spec === undefined) return;
    out.push({
      file: file.path,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      syntax,
      text: ts.isStringLiteralLike(spec) ? spec.text : null,
      reExports,
    });
  };

  // `/// <reference path="…" />`, which the parser hands over separately from the statement list.
  for (const ref of sf.referencedFiles) {
    out.push({
      file: file.path,
      line: sf.getLineAndCharacterOfPosition(ref.pos).line + 1,
      syntax: "reference path",
      text: ref.fileName,
      reExports: [],
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
      const clause = node.exportClause;
      const star = clause === undefined || ts.isNamespaceExport(clause);
      // The names as WRITTEN at this site. `export { A as B } from` republishes `B`, and both
      // spellings are recorded because a reader of a finding needs the local name to delete the line
      // and the source name to know what was taken.
      const names = clause !== undefined && ts.isNamedExports(clause)
        ? clause.elements.map((e) => (e.propertyName === undefined
          ? e.name.text
          : `${e.propertyName.text} as ${e.name.text}`))
        : ["*"];
      push(node, node.isTypeOnly ? "export type from" : star ? "export star from" : "export from",
        node.moduleSpecifier, names);
    } else if (ts.isImportEqualsDeclaration(node)
      && ts.isExternalModuleReference(node.moduleReference)) {
      push(node, "import equals require", node.moduleReference.expression);
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const dynamic = callee.kind === ts.SyntaxKind.ImportKeyword
        ? "dynamic import"
        : ts.isIdentifier(callee) && callee.text === "require" ? "require call" : null;
      if (dynamic !== null) {
        // An absent argument is not a specifier; a non-literal argument IS one a gate cannot read,
        // and `push` records it with a null text so the consumer reports it.
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
export function resolveSpecifier(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) return null;
  const parts = fromFile.split("/").slice(0, -1);
  for (const segment of specifier.split("/")) {
    if (segment === "." || segment === "") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}

/**
 * The names a module adds to its own public surface by DECLARATION, as written in its bytes.
 *
 * Declarations only: `export class`, `export function`, `export const`, `export type`,
 * `export interface`, and a bare `export { x }` with no `from`. A re-export is deliberately NOT
 * counted — `test/adapter-reexport.test.ts` asks which symbols a component ORIGINATES, and a module
 * that merely passes a name through did not originate it.
 */
export function declaredExports(file: SourceFile): readonly string[] {
  const sf = ts.createSourceFile(
    file.path, file.text, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node)
    && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const statement of sf.statements) {
    if (ts.isVariableStatement(statement)) {
      if (!exported(statement)) continue;
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) out.push(decl.name.text);
      }
      continue;
    }
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)
      || ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)
      || ts.isEnumDeclaration(statement) || ts.isModuleDeclaration(statement))
      && exported(statement) && statement.name !== undefined) {
      out.push(statement.name.text);
      continue;
    }
    // `export { x, y as z };` with no `from` — a local declaration published under those names.
    if (ts.isExportDeclaration(statement) && statement.moduleSpecifier === undefined) {
      const clause = statement.exportClause;
      if (clause !== undefined && ts.isNamedExports(clause)) {
        for (const element of clause.elements) out.push(element.name.text);
      }
    }
  }
  return [...new Set(out)];
}

// ----------------------------------------------------------------------------------------------
// The real tree, and the mutated tree every control is driven with
// ----------------------------------------------------------------------------------------------

/** Every `.ts` file under a directory, package relative, read. */
export function sourceTree(root: string): readonly SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of readdirSync(root, { recursive: true, encoding: "utf8" })) {
    const path = `${root}/${entry}`;
    if (!path.endsWith(".ts") || !statSync(path).isFile()) continue;
    out.push({ path, text: readFileSync(path, "utf8") });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export const modelText = (): string => readFileSync(MODEL_PATH, "utf8");
export const modelDoc = (): unknown => parse(modelText());

/**
 * The real tree with one file's text replaced, so a control runs against the real model and the real
 * file set rather than a toy. The mutation is applied to a COPY in memory: the file on disk is
 * untouched, which is the difference between a control and an experiment nobody can re-run.
 */
export function treeWithMutation(
  root: string, path: string, mutate: (text: string) => string,
): readonly SourceFile[] {
  const files = sourceTree(root);
  const target = files.find((f) => f.path === path);
  assert.ok(target !== undefined, `${path} is not in the scanned tree, so the mutation has no subject`);
  return files.map((f) => (f.path === path ? { path, text: mutate(f.text) } : f));
}
