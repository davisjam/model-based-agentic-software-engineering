// The fence around the raw SPARQL console: MQ-I4 and MQ-I5.
//
// `DECISIONS-RULED-model-query-261002.md` keeps the console as "an advanced, debugging, or
// development escape hatch", explicitly outside the UX-I1 semantic interface, and names the two
// obligations most likely to rot. This file is the second one's enforcement and half of the first's.
//
//   OBLIGATION 1 — the exclusion is declared where the REGISTRY can see it, not in prose.
//     Held by `ESCAPE_HATCHES` existing, by `FenceCitation` being a closed union (a hatch with no
//     ruling to cite does not compile), and by `checkEscapeHatchFence` running inside the blocking
//     0-violation parity gate. What is left for a test is the CITATION JOIN: a closed union cannot
//     be forged, but a citation to a file that does not say what is claimed can be.
//
//   OBLIGATION 2 — "normal agent workflows do not depend on it" is a claim about USAGE, which no
//     type can hold. Three checks, each able to fail:
//       (a) SHIPPED ARTIFACTS — every shipped example's saved questions and every question the ask
//           catalogue offers are typed query documents that validate against `mage-query.schema.json`
//           and are admitted by the engine's own parser. None is SPARQL text.
//       (b) THE API'S OWN SELF-DESCRIPTION — `describe()` names the hatch ONLY under
//           `outsideSemanticInterface`, so no agent reading the API to find out what it can do lands
//           on the hatch.
//       (c) REFERENCE CLOSURE — the hatch and the service beneath it are reached only from a
//           declared file set. A UI surface or example generator that grows a dependency goes red.
//
// Every check carries a NEGATIVE CONTROL in the same test, because the lesson this session keeps
// relearning is that a control nobody has seen fail is a control nobody knows works: a probe
// fabricated 71 plausible findings and a tier reported `8 pass / 0 fail` over 27 tests, and both
// looked fine. So each predicate here is applied to a deliberately sabotaged input and must reject
// it. A grep-level check is acceptable for (c) because it checks USAGE, not semantics — the
// semantics are held by the types.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  CAPABILITIES, ESCAPE_HATCHES, SPARQL_HATCH_RENAME, affordanceParityGate,
  checkEscapeHatchFence, checkRegistryClosure,
} from "../src/app/capabilities.ts";
import type { Capability, EscapeHatch } from "../src/app/capabilities.ts";
import { AGENT_API_VERSION, createAgentApi } from "../src/app/agent-api.ts";
import { Workspace } from "../src/app/services.ts";
import { ExampleCatalog } from "../src/app/examples.ts";
import type { AssetReader } from "../src/app/examples.ts";
import { SHIPPED_EXAMPLE_IDS } from "../src/app/examples.ts";
import { parseQuery } from "../src/engine/types.ts";
import { askCatalogue } from "../src/ui/shell/askbar.ts";
import { planAsk } from "../src/ui/view-model.ts";
import type { Selection } from "../src/ui/view-model.ts";
import { realPorts, exampleText } from "../scripts/gen-example-coverage.ts";

const assets: AssetReader = (path: string) => Promise.resolve(readFileSync(path.replace(/^\.\//, ""), "utf8"));

/** A loaded shipped example, through the ONE import seam a person and an agent both use. */
const loadedExample = (id: string): Workspace => {
  const ws = new Workspace(realPorts);
  const out = ws.load(exampleText(id));
  assert.ok(out.ok, `${id} must load: ${out.findings.map((f) => f.message).join("; ")}`);
  return ws;
};

// ----------------------------------------------------------------------------------------------
// Obligation 1's remainder — the citation resolves, and says what is claimed
// ----------------------------------------------------------------------------------------------

test("MQ-I4: every hatch's fence citation resolves to a file that actually fences it", () => {
  assert.ok(ESCAPE_HATCHES.length > 0, "an empty hatch list makes every assertion below vacuous");
  for (const h of ESCAPE_HATCHES) {
    // The union stops an invented filename. It cannot stop a citation to a real document that says
    // nothing about fencing, which is how "declared where the registry can see it" rots into a
    // reference nobody followed.
    const doc = readFileSync(`${h.fencedBy}`, "utf8");
    assert.match(doc, /escape hatch/i,
      `${h.fencedBy} is cited as ${h.at}'s fence but never calls anything an escape hatch`);
    assert.match(doc, /explicitly outside/i,
      `${h.fencedBy} does not state that the hatch is outside the semantic interface`);
    assert.ok(h.reason.trim().length > 20, `${h.at}'s reason is too short to be a reason`);
  }
});

test("§G2 is ratified, and ratification bought legibility rather than enforcement", () => {
  // The ruling, 261004: the rename stands. Pinned because a `ratified` flag nothing reads is a field
  // that drifts back. `AGENT_API_VERSION` was READ from this record while the rename was the
  // surface's latest change; 0.4.0 (the describe() sufficiency release) ended that derivation, so
  // the pin weakens to ordering: the published version must not fall BEHIND the rename the record
  // declares, or the record describes a change the surface has un-shipped.
  assert.equal(SPARQL_HATCH_RENAME.ratified, true, "§G2 was ruled (a); the record must say so");
  const triple = (v: string): readonly number[] => v.split(".").map((n) => Number.parseInt(n, 10));
  const [maj, min, pat] = triple(AGENT_API_VERSION);
  const [rMaj, rMin, rPat] = triple(SPARQL_HATCH_RENAME.apiVersion);
  assert.ok([maj, min, pat, rMaj, rMin, rPat].every((n) => Number.isInteger(n)),
    "both versions must read as x.y.z");
  assert.ok(
    maj! > rMaj! || (maj === rMaj && (min! > rMin! || (min === rMin && pat! >= rPat!))),
    `the published version (${AGENT_API_VERSION}) must not precede the rename record's `
      + `(${SPARQL_HATCH_RENAME.apiVersion}) — the record is history the surface still carries`);
  assert.notEqual(SPARQL_HATCH_RENAME.at, SPARQL_HATCH_RENAME.previously,
    "a rename whose before and after agree renamed nothing");

  // And the qualification the author attached, as a CHECKED property rather than a sentence in a
  // comment: the namespace is not an enforcement mechanism. Every control keys off the DECLARATION,
  // so a hatch declared at any other string is fenced exactly as well — which is why the fence
  // survives the site being changed out from under it, and why the rename's teeth are zero.
  const elsewhere: readonly EscapeHatch[] = ESCAPE_HATCHES
    .map((h) => ({ ...h, at: "window.mage.someOtherName" }));
  assert.deepEqual(checkEscapeHatchFence(CAPABILITIES, elsewhere), [],
    "the fence must hold for a hatch declared at any site; if it depends on the name, the name is "
    + "doing enforcement work the ruling says it does not do");
  const reRegistered: readonly Capability[] = CAPABILITIES.map((c) => (c.id === "query"
    ? { ...c, machine: [...c.machine, { at: "window.mage.someOtherName", status: "wired" as const, parameters: [] }] }
    : c));
  assert.equal(checkEscapeHatchFence(reRegistered, elsewhere).length, 1,
    "and it must still CATCH a hatch re-registered inside the interface under that other name — "
    + "otherwise the assertion above passed because the check reads nothing");
});

test("MQ-I4: a hatch is in exactly one list, and the BLOCKING gate is what notices", () => {
  // Disjointness, over the real registry.
  assert.deepEqual(checkEscapeHatchFence(), [], "a declared hatch is also a capability affordance");
  assert.deepEqual(checkRegistryClosure([], ESCAPE_HATCHES.map((h) => h.at)), [],
    "a declared hatch must be a LEGAL machine site, or the closure check reports the fence as drift");
  // And the gate reads it. This is the placement that matters: a fence checked only here would be
  // a second definition of passing, with `npm run check:parity` green while the invariant was broken.
  const gate = affordanceParityGate();
  assert.equal(gate.headline, `UX-I1: 0 violation(s) over ${CAPABILITIES.length} capabilities`);
  assert.ok(gate.passed);

  // ---- the sabotage ---------------------------------------------------------------------------
  //
  // Put the hatch back inside the semantic interface, exactly as it was before this wave, and watch
  // both the fence check and the blocking gate go red. Without this the fence is a function that
  // has only ever returned the empty list.
  const site = SPARQL_HATCH_RENAME.at;
  const sabotaged: readonly Capability[] = CAPABILITIES.map((c) => (c.id === "query"
    ? { ...c, machine: [...c.machine, { at: site, status: "wired" as const, parameters: [] }] }
    : c));
  const caught = checkEscapeHatchFence(sabotaged);
  assert.equal(caught.length, 1, "re-registering the hatch as a `query` affordance must be caught");
  assert.equal(caught[0]?.capability, "query", "and reported against the row an author has to edit");
  assert.match(caught[0]?.problem ?? "", /is not outside it/);
  assert.equal(affordanceParityGate(sabotaged).passed, false,
    "the 0-violation gate must FAIL on a hatch that is also an affordance");

  // The other sabotage: a hatch that declares no reason for existing.
  const reasonless: readonly EscapeHatch[] = [{ ...ESCAPE_HATCHES[0]!, reason: "  " }];
  assert.equal(checkEscapeHatchFence(CAPABILITIES, reasonless).length, 1,
    "a hatch with no stated reason is an accident that acquired a fence");
});

// ----------------------------------------------------------------------------------------------
// Obligation 2 (a) — the shipped artifacts are typed query documents, not SPARQL text
// ----------------------------------------------------------------------------------------------

/**
 * The `query` definition out of `mage-query.schema.json`, read at test time.
 *
 * Read rather than transcribed: a copy of the required keys and the kind enum in this file would be
 * a second source of truth for the published wire shape, which is the defect the schema exists to
 * be the single copy of. The schema's own `allOf` if/then rules supply the per-kind requirements.
 */
interface QueryDef {
  readonly required: readonly string[];
  readonly additionalProperties: boolean;
  readonly properties: Readonly<Record<string, { readonly enum?: readonly string[] }>>;
  readonly allOf: readonly {
    readonly if: { readonly properties: Readonly<Record<string, { readonly const: string }>> };
    readonly then: { readonly required: readonly string[] };
  }[];
}

const queryDef = (): QueryDef => {
  const schema = JSON.parse(readFileSync("mage-query.schema.json", "utf8")) as
    { readonly $defs: Readonly<Record<string, QueryDef>> };
  const def = schema.$defs["query"];
  assert.ok(def, "mage-query.schema.json has no $defs.query — the whole check reads from it");
  assert.ok(def.required.length > 0 && def.allOf.length > 0,
    "the query definition carries no required keys or no kind rules; the validator would pass anything");
  return def;
};

/**
 * Validate a candidate against the schema's `query` definition. Returns the problems, so a caller
 * can assert on them rather than on a boolean.
 *
 * The SUBSET of JSON Schema this definition uses: object type, `required`,
 * `additionalProperties: false`, per-property `enum`, and `allOf` entries of the shape
 * `if kind === K then require K`. No `$ref` recursion — the sub-objects are validated by
 * `parseQuery`, which is the engine's own admission and a stronger check than a shape walk.
 */
const schemaProblems = (def: QueryDef, raw: unknown): readonly string[] => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [`not an object: ${typeof raw === "string" ? `a string (${JSON.stringify(raw).slice(0, 40)})` : typeof raw}`];
  }
  const doc = raw as Readonly<Record<string, unknown>>;
  const out: string[] = [];
  for (const key of def.required) if (!(key in doc)) out.push(`missing required '${key}'`);
  if (def.additionalProperties === false) {
    for (const key of Object.keys(doc)) {
      if (!(key in def.properties)) out.push(`undeclared property '${key}'`);
    }
  }
  for (const [key, spec] of Object.entries(def.properties)) {
    const value = doc[key];
    if (value !== undefined && spec.enum !== undefined && !spec.enum.includes(String(value))) {
      out.push(`'${key}' is '${String(value)}', not one of ${spec.enum.join("/")}`);
    }
  }
  for (const rule of def.allOf) {
    for (const [key, cond] of Object.entries(rule.if.properties)) {
      if (doc[key] === cond.const) {
        for (const need of rule.then.required) {
          if (!(need in doc)) out.push(`kind '${cond.const}' requires '${need}'`);
        }
      }
    }
  }
  return out;
};

test("MQ-I5: the validator rejects SPARQL text and a malformed document — negative control first", () => {
  // Stated before the sweep, deliberately. A sweep that passes because its predicate accepts
  // everything is the shape of this session's fabricated-findings probe, and the only defence is
  // showing the predicate's teeth on the exact input it exists to catch.
  const def = queryDef();
  const sparql = "PREFIX rt: <urn:mage:rt:> SELECT ?x WHERE { GRAPH ?g { ent:api rt:may_invoke ?x } }";
  assert.ok(schemaProblems(def, sparql).some((p) => p.includes("not an object")),
    "a SPARQL string must not validate as a query document");
  assert.ok(!parseQuery(sparql).ok, "and the engine must not admit it either");
  // A document that looks typed and is not: no quantifier, which is V21's refusal.
  assert.ok(schemaProblems(def, { kind: "graph", graph: { form: "reachability" } }).length > 0);
  // A document naming a kind without its sub-object — the `allOf` rules' job.
  assert.ok(schemaProblems(def, { kind: "graph", quantifier: "exists" })
    .some((p) => p.includes("requires 'graph'")));
  // And an undeclared property, which is what `additionalProperties: false` is for.
  assert.ok(schemaProblems(def, { kind: "graph", quantifier: "exists", graph: {}, sparql: "ASK {}" })
    .some((p) => p.includes("undeclared property 'sparql'")));
});

test("MQ-I5: every shipped example's saved questions are typed query documents", () => {
  const def = queryDef();
  let swept = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const ws = loadedExample(id);
    const saved = ws.state.system.queries;
    assert.ok(saved.size > 0, `${id} saves no questions; it cannot witness anything about them`);
    for (const [qid, q] of saved) {
      const problems = schemaProblems(def, q.raw);
      assert.deepEqual(problems, [], `${id}/${qid} is not a valid query document: ${problems.join("; ")}`);
      assert.ok(parseQuery(q.raw).ok, `${id}/${qid} is not admitted by the engine's own parser`);
      swept += 1;
    }
  }
  assert.ok(swept >= SHIPPED_EXAMPLE_IDS.length, `swept ${swept} saved questions; the sweep found nothing`);
});

test("MQ-I5: every question the ask catalogue OFFERS is a typed query document", () => {
  // The suggested/contextual half of the obligation. The catalogue is the primary human surface and
  // the one §8 flagged as able to become a hand-maintained brochure — if it ever offered free text
  // routed at the hatch, "normal workflows do not depend on it" would be false for every user.
  const def = queryDef();
  let offered = 0;
  for (const id of SHIPPED_EXAMPLE_IDS) {
    const system = loadedExample(id).state.system;
    // Every entity in turn as the selection, so the contextual items are actually produced rather
    // than the saved half being swept twice under a different name.
    // One Selection per entity, plus the empty one. Wave `wb-selection` replaced the bare
    // `string[]` this loop was written against with the discriminated `Selection` — a bare array no
    // longer type-checks, which is the unification working rather than a break to route around.
    const selections: Selection[] = [
      { kind: "none" },
      ...[...system.entities.keys()].map((id): Selection => ({ kind: "entity", id })),
    ];
    for (const selection of selections) {
      for (const item of askCatalogue(system, selection)) {
        if (item.ask === null) {
          assert.ok(item.savedId !== null, `catalogue item '${item.key}' offers neither a request nor a saved id`);
          const saved = system.queries.get(item.savedId);
          assert.ok(saved, `catalogue item '${item.key}' names saved question '${item.savedId}', which does not exist`);
          assert.deepEqual(schemaProblems(def, saved.raw), [], `saved offer '${item.key}' is not a query document`);
        } else {
          // `planAsk` is the ONE builder the Ask button and `save-property` both call, so checking
          // its output is checking what the surface actually submits.
          const plan = planAsk(item.ask);
          assert.ok(plan.ok, `catalogue item '${item.key}' does not plan: ${plan.ok ? "" : plan.problem}`);
          if (!plan.ok) continue;
          const problems = schemaProblems(def, plan.query);
          assert.deepEqual(problems, [], `offered question '${item.key}' is not a query document: ${problems.join("; ")}`);
          assert.ok(parseQuery(plan.query).ok, `offered question '${item.key}' is not admitted by the engine`);
        }
        offered += 1;
      }
    }
  }
  assert.ok(offered > SHIPPED_EXAMPLE_IDS.length, `swept ${offered} offers; the catalogue produced nothing`);
});

// ----------------------------------------------------------------------------------------------
// Obligation 2 (b) — the API's own self-description does not route anyone at the hatch
// ----------------------------------------------------------------------------------------------

test("MQ-I4: describe() names the hatch ONLY under outsideSemanticInterface", () => {
  const ws = loadedExample(SHIPPED_EXAMPLE_IDS[0]!);
  const api = createAgentApi(ws, { target: null, selection: [] }, {}, () => {}, new ExampleCatalog(ws, assets));
  const described = api.describe();

  // The hatch IS published — an agent must be able to learn the boundary from the API rather than
  // from a refusal or a code review (the FR-AGENT-2 pattern).
  assert.deepEqual(described.outsideSemanticInterface.map((h) => h.at), ESCAPE_HATCHES.map((h) => h.at));
  for (const h of described.outsideSemanticInterface) {
    assert.ok(h.reason.length > 0 && h.fencedBy.length > 0, `${h.at} is published without its reason or fence`);
  }

  // And it is published NOWHERE ELSE. Serialise the whole description, blank out the one field that
  // is allowed to name it, and assert the site does not appear in what is left. This is stronger
  // than §7.3's "`describe().operations` contains no hatch site": `operations` is one entry per
  // CAPABILITY id and never named any call site, so that clause was true before this wave and could
  // not have failed. What an agent can actually be routed by is the whole object.
  const elsewhere = JSON.stringify({ ...described, outsideSemanticInterface: [] });
  for (const h of ESCAPE_HATCHES) {
    assert.ok(!elsewhere.includes(h.at),
      `describe() names '${h.at}' outside outsideSemanticInterface — the semantic interface advertises the hatch`);
    assert.doesNotMatch(elsewhere, /sparql/i,
      "describe() mentions SPARQL outside the hatch declaration; the ruling makes it an implementation mechanism");
  }
  assert.deepEqual(described.operations.filter((o) => ESCAPE_HATCHES.some((h) => h.at.includes(o.name))), [],
    "no operation row may name a hatch");

  // ---- the sabotage ---------------------------------------------------------------------------
  //
  // Two ways the description could grow a route to the hatch, both of them one edit away: a summary
  // that offers SPARQL (the `query` row's summary said exactly that until this wave), and a
  // `notSupported` entry that names the site "helpfully".
  const asIfAdvertised = JSON.stringify({
    ...described,
    outsideSemanticInterface: [],
    operations: [...described.operations, { name: "query", summary: `call ${SPARQL_HATCH_RENAME.at}`, returns: "x" }],
  });
  assert.ok(asIfAdvertised.includes(SPARQL_HATCH_RENAME.at),
    "the predicate must see a hatch site smuggled into an operation summary");
  const asIfMentioned = JSON.stringify({ ...described, outsideSemanticInterface: [],
    notSupported: [...described.notSupported, "raw SPARQL: use sparql() instead"] });
  assert.match(asIfMentioned, /sparql/i, "the predicate must see SPARQL named outside the declaration");
});

// ----------------------------------------------------------------------------------------------
// Obligation 2 (c) — reference closure over a declared file set
// ----------------------------------------------------------------------------------------------

/**
 * The files allowed to CALL the hatch or the service beneath it, and why each one may.
 *
 * This is the list that makes the check mean something: a UI surface, an example generator or a
 * learn artifact growing a dependency on the console turns the gate red, which is the only
 * mechanical form "normal agent workflows do not depend on it" can take.
 *
 * `src/sparql/**` is NOT on this list and does not need to be — the check looks for calls to the
 * SEAM, not for the implementation beneath it. RDF and SPARQL stay implementation mechanisms; the
 * ruling fences the public surface.
 *
 * **ONE caller, and §7.3's list of four was wrong about three of them.** The design names
 * `agent-api.ts`, `services.ts`, "the worker plumbing" and `test/`. `services.ts` DEFINES
 * `Workspace.sparql` and never calls it, which is a different relation and not an allowance a
 * closure check should grant. `src/analysis.worker.ts` and `src/sparql/worker-eval.ts` contain no
 * reference to the seam at all: the escalation path carries a `TranslatedQuery` off an exhausted
 * answer and the worker admits it again on its own thread. Each of those would have been an
 * allowance for nothing — and the reverse direction below is what found them, which is the whole
 * reason it is asserted.
 */
const MAY_CALL_THE_HATCH: readonly { readonly path: string; readonly why: string }[] = [
  { path: "src/app/agent-api.ts", why: "declares `debug.sparql` and delegates it to the seam" },
];

/** Every call to the hatch or its seam, as `git grep` sees the tracked tree. */
const hatchCalls = (): readonly string[] => execFileSync("git", [
  "grep", "-n", "-E", "\\.sparql\\(",
  "--", "workbench/src", "workbench/scripts", "workbench/index.html", "workbench/examples",
], { encoding: "utf8", cwd: ".." }).split("\n").filter((l) => l.trim() !== "");

const fileOf = (grepLine: string): string => grepLine.slice(0, grepLine.indexOf(":"));

test("MQ-I5: the hatch and its seam are CALLED only from the declared file set", () => {
  // `git grep` over tracked sources, so an untracked scratch file cannot pass by being invisible
  // and a deleted one cannot linger in a stale index.
  const hits = hatchCalls();
  assert.ok(hits.length > 0, "the grep found nothing at all — the pattern is wrong, not the tree clean");

  const allowed = new Set(MAY_CALL_THE_HATCH.map((f) => `workbench/${f.path}`));
  const offenders = hits.filter((line) => !allowed.has(fileOf(line)));
  assert.deepEqual(offenders, [],
    `file(s) outside the declared set call the SPARQL hatch:\n  ${offenders.join("\n  ")}`);

  // The other direction, which is what keeps the list honest: an allowance for a file that does not
  // reach the hatch is an allowance for nothing, and it would hide a real dependency the day that
  // file came back. This is the direction that found §7.3's worker-plumbing error.
  const reaching = new Set(hits.map(fileOf));
  assert.deepEqual(MAY_CALL_THE_HATCH.filter((f) => !reaching.has(`workbench/${f.path}`)).map((f) => f.path), [],
    "MAY_CALL_THE_HATCH names file(s) that do not call it; delete the entry");

  // ---- the sabotage ---------------------------------------------------------------------------
  //
  // The dependency this check exists to catch: a UI surface calling the console. Applied to the
  // predicate rather than to the tree, because writing the file would be the thing under test.
  const asIfUiCalled = [...hits, "workbench/src/ui/shell/askbar.ts:400:  const a = api.debug.sparql(text);"];
  assert.equal(asIfUiCalled.filter((l) => !allowed.has(fileOf(l))).length, 1,
    "a UI surface reaching the hatch must be reported");
});

test("MQ-I4: the hatch's SITE STRING has exactly one author", () => {
  // The closure check above catches a CALL. This catches the other way a dependency forms: a
  // module, generator or served page that hand-types the site — a doc page offering it, a palette
  // entry naming it, a second affordance list re-declaring it. The registry is the one author, and
  // `describe()` is how everything else learns the string.
  const authored = execFileSync("git", [
    "grep", "-l", "-F", SPARQL_HATCH_RENAME.at,
    "--", "workbench/src", "workbench/scripts", "workbench/index.html", "workbench/examples", "workbench/models",
  ], { encoding: "utf8", cwd: ".." }).split("\n").filter((l) => l.trim() !== "");
  assert.deepEqual(authored, ["workbench/src/app/capabilities.ts"],
    "the hatch site string must be written in the registry and nowhere else");
});
