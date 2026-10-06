/**
 * Reference resolution — the one place a dotted string becomes a typed handle on a configuration.
 *
 * Guards (`worker.state: held`), predicate atoms (`document.state: published`), effect right-hand
 * sides (`retry_count + 1`) and derived values (`retry_count == 3`) all use the same reference
 * syntax, so they all resolve through here. One resolver means one set of refusal messages and one
 * place where "this model has no such vocabulary" is decided.
 *
 * Everything resolves ONCE, before exploration starts, into a closure over a `Configuration`. Two
 * reasons, and the second is the important one: the walk is then a pure function with no error
 * channel, and a typo in a reference is refused before a single configuration is enumerated rather
 * than discovered a million states in.
 *
 * Accepted forms:
 *
 *   document.state        control state of the instance `document`
 *   worker[1].state       control state of an instance of a multiply-instantiated machine
 *   document              bare instance id, also its control state
 *   document.retry_count  a variable of that instance
 *   retry_count           bare variable name, when exactly one single-instance machine declares it
 *   document.exhausted    a derived value, recomputed from the configuration (V18)
 *
 * Refused, with the cause named: a bare reference to a multiply-instantiated machine (there is no
 * participant selection in v0.1 — V11/V14), a name two machines both declare, and an order
 * comparison on anything without a declared ordering (V20).
 */
import type { CanonVariable, CanonicalSystem, Configuration, GuardOp, MachineInstance, Scalar } from "../ir/types.ts";
import { parseDerived } from "./expr.ts";
import { omissionCovering, omissionProse } from "./omission.ts";
import { detail, fail, ok, ORDER_OPS, type Atom, type Res } from "./types.ts";

export type Ref =
  | { readonly kind: "control"; readonly instance: string; readonly machine: string }
  | { readonly kind: "variable"; readonly instance: string; readonly key: string; readonly variable: CanonVariable }
  | { readonly kind: "derived"; readonly instance: string; readonly machine: string; readonly name: string };

export interface RefScope {
  readonly system: CanonicalSystem;
  readonly instances: ReadonlyMap<string, MachineInstance>;
  readonly instancesOf: ReadonlyMap<string, readonly MachineInstance[]>;
}

export function buildScope(system: CanonicalSystem): RefScope {
  const instances = new Map<string, MachineInstance>();
  const instancesOf = new Map<string, MachineInstance[]>();
  for (const inst of system.instances) {
    instances.set(inst.id, inst);
    const list = instancesOf.get(inst.machine);
    if (list === undefined) instancesOf.set(inst.machine, [inst]);
    else list.push(inst);
  }
  return { system, instances, instancesOf };
}

const varKey = (instance: string, variable: string): string => `${instance}.${variable}`;

/** Resolve a head token to a single instance, refusing the ambiguity rather than picking one. */
function headInstance(scope: RefScope, head: string): Res<MachineInstance> {
  const direct = scope.instances.get(head);
  if (direct !== undefined) return ok(direct);
  const machine = scope.system.machines.get(head);
  if (machine === undefined) return fail(`'${head}' is not a declared machine or machine instance.`);
  const list = scope.instancesOf.get(head) ?? [];
  const only = list.length === 1 ? list[0] : undefined;
  if (only !== undefined) return ok(only);
  return fail(
    `'${head}' is multiply-instantiated (instances: ${machine.instances}); a bare reference does ` +
    `not say which one. Address an instance — '${head}[0]' — because v0.1 has no participant ` +
    `selection (V11/V14).`);
}

function memberRef(scope: RefScope, inst: MachineInstance, tail: string): Res<Ref> {
  const machine = scope.system.machines.get(inst.machine);
  if (machine === undefined) return fail(`'${inst.machine}' is not a declared machine.`);
  if (tail === "state") return ok({ kind: "control", instance: inst.id, machine: machine.id });
  const variable = machine.variables.get(tail);
  if (variable !== undefined) {
    return ok({ kind: "variable", instance: inst.id, key: varKey(inst.id, tail), variable });
  }
  if (machine.derived.has(tail)) {
    return ok({ kind: "derived", instance: inst.id, machine: machine.id, name: tail });
  }
  const vocab = ["state", ...machine.variables.keys(), ...machine.derived.keys()];
  return fail(`machine '${machine.id}' declares no '${tail}'. It has: ${vocab.join(", ")}.`);
}

/** Machines declaring a member of this name, used to turn ambiguity into a refusal. */
function owners(scope: RefScope, name: string): readonly string[] {
  const out: string[] = [];
  for (const m of scope.system.machines.values()) {
    if (m.variables.has(name) || m.derived.has(name)) out.push(m.id);
  }
  return out;
}

export function resolveRef(scope: RefScope, raw: string): Res<Ref> {
  const text = raw.trim();
  if (text === "") return fail("an empty reference cannot be resolved.");

  // Dotted form first. Split at the LAST dot: ids may themselves contain dots, and the member name
  // never does.
  const dot = text.lastIndexOf(".");
  if (dot > 0 && dot < text.length - 1) {
    const head = text.slice(0, dot);
    const tail = text.slice(dot + 1);
    const inst = headInstance(scope, head);
    if (inst.ok) return memberRef(scope, inst.value, tail);
    // Fall through only if the head is not a machine at all; a multiply-instantiated head is a
    // genuine refusal and must not be masked by a bare-name reinterpretation.
    if (scope.system.machines.has(head)) return inst;
  }

  const asInstance = scope.instances.get(text);
  const declaring = owners(scope, text);
  if (asInstance !== undefined && declaring.length > 0) {
    return fail(
      `'${text}' is both a machine instance and a variable declared by ${declaring.join(", ")}. ` +
      `Qualify it — '${text}.state' for the control state.`);
  }
  if (asInstance !== undefined) {
    return ok({ kind: "control", instance: asInstance.id, machine: asInstance.machine });
  }
  if (scope.system.machines.has(text)) {
    // A machine name with several instances: refuse, don't pick one.
    const inst = headInstance(scope, text);
    return inst.ok ? ok({ kind: "control", instance: inst.value.id, machine: inst.value.machine }) : inst;
  }
  if (declaring.length > 1) {
    return fail(
      `'${text}' is declared by more than one machine (${declaring.join(", ")}). Qualify it, ` +
      `for example '${declaring[0]}.${text}'.`);
  }
  const owner = declaring[0];
  if (owner !== undefined) {
    const inst = headInstance(scope, owner);
    return inst.ok ? memberRef(scope, inst.value, text) : inst;
  }
  // The capstone's one unanswerable question arrives HERE, and until 261005 it got the grammar
  // lesson only: "'battery-charge.state' names nothing in this system." True, and it sends a
  // student hunting for a misspelling -- the exact failure `omission.ts` was written to prevent --
  // while the model declares "the battery's state of charge" as a purposeful omission in two
  // places and `omissionCovering` matches it.
  //
  // Word-cover the BARE name, not `raw`: a qualified reference like 'battery-charge.state' is not
  // word-covered by the omission's prose, while 'battery-charge' is. The structural clause is kept
  // verbatim and the omission appended, from the one place that sentence is worded.
  const need = text === "" ? raw : text;
  const omitted = omissionCovering(scope.system, need);
  const absence = `'${raw}' names nothing in this system`;
  if (omitted !== null) {
    // The TYPED half rides with the sentence, exactly as `undeclared()` next door builds it. This
    // line used to pass the prose alone, so the one refusal that reached an agent through this
    // path — the capstone's charge-remaining question — said `missing-distinction` in its sentence
    // and `unknown-vocabulary` with empty `missing`/`models` in its data: an agent branching on
    // `refusalDetail`, as its own description advises, got strictly less than the human reader
    // (261006 lab-solver run, guess 7). `test/refusal-detail-parity.test.ts` holds the
    // prose/data relationship over every refusal the corpus produces.
    const said = omissionProse(absence, omitted);
    return fail(said.prose, detail("missing-distinction", said.missing, said.models));
  }
  return fail(
    `${absence}. References address a control state ` +
    `('<machine>.state'), a variable, or a derived value.`,
    detail("unknown-vocabulary"));
}

// --------------------------------------------------------------------------------------------
// Reading
// --------------------------------------------------------------------------------------------

export type Reader = (cfg: Configuration) => Scalar;

/** Values a reference can take, for membership checking; null when the set is not enumerable. */
export function refDomain(scope: RefScope, ref: Ref): readonly Scalar[] | null {
  if (ref.kind === "control") return scope.system.machines.get(ref.machine)?.states ?? null;
  if (ref.kind === "variable") return ref.variable.domain;
  return [false, true];
}

/** Whether `<`, `>`, `<=`, `>=` are defined on this reference (V20's discipline, applied to state). */
export function refIsOrdered(ref: Ref): boolean {
  return ref.kind === "variable" && ref.variable.kind === "integer";
}

/**
 * Compile a reader. Derived values recurse, bounded by `trail` — V19 already forbids a cycle, but
 * an engine that would hang on an invalid model is an engine that hangs on exactly the models a
 * student is most likely to write.
 *
 * Note on a derived right-hand side: `state == held` reads `held` as the LITERAL `held`, never as a
 * reference to a variable named `held`. That matches how a predicate atom reads its value, so one
 * convention covers both; comparing two references is outside the derived grammar (see expr.ts).
 */
export function compileReader(scope: RefScope, raw: string, trail: readonly string[] = []): Res<Reader> {
  const resolved = resolveRef(scope, raw);
  if (!resolved.ok) return resolved;
  const ref = resolved.value;

  if (ref.kind === "control") {
    const instance = ref.instance;
    return ok((cfg) => cfg.control.get(instance) ?? "");
  }
  if (ref.kind === "variable") {
    const key = ref.key;
    const initial = ref.variable.initial;
    return ok((cfg) => cfg.values.get(key) ?? initial);
  }

  const marker = `${ref.instance}.${ref.name}`;
  if (trail.includes(marker)) {
    return fail(`derived value '${marker}' participates in a cycle; V19 forbids it.`);
  }
  const machine = scope.system.machines.get(ref.machine);
  const source = machine?.derived.get(ref.name);
  if (source === undefined) return fail(`derived value '${marker}' has no expression.`);
  const parsed = parseDerived(source);
  if (!parsed.ok) return fail(`derived value '${marker}': ${parsed.refusal}`);

  // A derived expression's inner reference is resolved RELATIVE to the owning instance, so
  // `exhausted: retry_count == 3` on worker[1] reads worker[1]'s own retry_count.
  const qualify = (inner: string): string => (inner.includes(".") ? inner : `${ref.instance}.${inner}`);
  const next = [...trail, marker];

  if (parsed.value.kind === "ref") {
    const inner = compileReader(scope, qualify(parsed.value.ref), next);
    if (!inner.ok) return inner;
    const read = inner.value;
    return ok((cfg) => read(cfg) === true);
  }

  const innerRaw = qualify(parsed.value.ref);
  const inner = compileReader(scope, innerRaw, next);
  if (!inner.ok) return inner;
  const innerRef = resolveRef(scope, innerRaw);
  if (!innerRef.ok) return innerRef;
  const op = parsed.value.op;
  if (ORDER_OPS.has(op) && !refIsOrdered(innerRef.value)) {
    return fail(
      `derived value '${marker}' orders '${parsed.value.ref}', which has no declared ordering. ` +
      `<, >, <= and >= need an ordered domain (V20); use == or != .`);
  }
  const read = inner.value;
  const rhs = parsed.value.value;
  return ok((cfg) => compareScalars(op, read(cfg), rhs));
}

export function compareScalars(op: GuardOp, left: Scalar, right: Scalar): boolean {
  if (op === "eq") return left === right;
  if (op === "ne") return left !== right;
  // Order comparisons are gated at compile time to numeric references, so this is total.
  const l = typeof left === "number" ? left : Number.NaN;
  const r = typeof right === "number" ? right : Number.NaN;
  if (Number.isNaN(l) || Number.isNaN(r)) return false;
  if (op === "lt") return l < r;
  if (op === "le") return l <= r;
  if (op === "gt") return l > r;
  return l >= r;
}

/**
 * Compile one atom into a predicate over configurations.
 *
 * Two checks here earn their keep. An order comparison on an unordered reference is refused rather
 * than silently false (V20). A value outside the reference's declared domain is also refused —
 * `document.state: publishd` would otherwise compare false everywhere and the user would read a
 * typo as a sound "refuted".
 */
export function compileAtom(scope: RefScope, atom: Atom): Res<(cfg: Configuration) => boolean> {
  const resolved = resolveRef(scope, atom.ref);
  if (!resolved.ok) return resolved;
  const ref = resolved.value;
  const reader = compileReader(scope, atom.ref);
  if (!reader.ok) return reader;

  if (ORDER_OPS.has(atom.op) && !refIsOrdered(ref)) {
    return fail(
      `'${atom.ref}' has no declared ordering, so '${atom.op}' is not defined on it. Order ` +
      `comparisons need a bounded-integer variable or an ordered domain (V20); use eq or ne.`);
  }
  const domain = refDomain(scope, ref);
  if (domain !== null && !ORDER_OPS.has(atom.op) && !domain.includes(atom.value)) {
    const kindName = ref.kind === "control" ? "state" : ref.kind === "variable" ? "value" : "derived value";
    return fail(
      `'${String(atom.value)}' is not a declared ${kindName} of '${atom.ref}'. Declared: ` +
      `${domain.map((v) => String(v)).join(", ")}.`);
  }
  const read = reader.value;
  const op = atom.op;
  const value = atom.value;
  return ok((cfg) => compareScalars(op, read(cfg), value));
}
