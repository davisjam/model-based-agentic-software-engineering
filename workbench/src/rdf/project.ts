/**
 * Typed IR -> RDF dataset. The third representation, projected from the second.
 *
 * RDF is a PROJECTION, not a replacement. `src/ir/types.ts` remains the application semantics; the
 * renderer, validator, transaction engine and analysis engine all read the IR, and none of them
 * should prefer a quad to a field the IR already answers. What the projection buys is a standard
 * relational substrate: stable identity, typed resources, typed relations, properties, named
 * graphs, and SPARQL over all of it.
 *
 * **The named-graph rule.** A quad lands in model M's named graph exactly when its truth is
 * relative to M's reduction. Everything else lands in the default graph. `CanonRelation.model` is
 * the only field in the IR that carries a model, which is why relations are the only quads that
 * leave the default graph: an entity's existence, type, properties and containment hold whichever
 * reduction you adopt, a quantity asserts something about the modeled system rather than about a
 * reduction of it, and a model's own metadata (label, purpose, scope) describes the reduction
 * rather than asserting anything inside it. So the named graphs hold exactly the typed relation
 * edges, and the entity IRIs inside them are SHARED with the default graph and with each other.
 * That sharing is the mechanism: a conclusion emerges from the join across reductions rather than
 * from any single model.
 *
 * A consequence worth knowing before writing a query: the default graph holds NO relation edges, so
 * a default-graph basic graph pattern over a relation type matches nothing. Reproduce the engine's
 * cross-model union with an unscoped `GRAPH ?g { … }`. Silence beats a confident subset.
 *
 * **Total and deterministic.** Every field is projected without a precondition — a transition
 * naming an undeclared state still yields a quad, because refusing here would make the projection
 * depend on validation and the two would drift. The rule for a dangling reference: minting the IRI
 * is the reference, and content triples come only from the declaration. An undeclared state is
 * therefore a resource with no `rdf:type`, which is exactly what it is.
 *
 * **The hash does not move.** `systemHash` is computed over the canonical IR; it is not computed
 * here and this projection is not part of it. Note the direction of the asymmetry, because it
 * matters: the hash's semantic projection is NARROWER than the IR (it drops machine purposes,
 * relation ids, relation-type prose, the system name), so two systems with the same hash can
 * project to different quads. The quad set is therefore not a revision token. `systemHash` is.
 */
import type { CanonicalSystem, Dimension, Magnitude, Purpose } from "../ir/types.ts";
import { DIMENSION_IDS, DIMENSIONS } from "../ir/types.ts";
import {
  derivedIri, dimensionIri, domainIri, domainValueIri, effectIri, entityIri, eventIri, guardIri,
  instanceIri, machineIri, modelGraphIri, modelIri, propertyIri, quantityIri, queryIri,
  relationTypeIri, stateIri, systemIri, transitionIri, variableIri,
} from "./iri.ts";
import { canonicalDataset, numeric, RDF_TYPE, scalarTerm, str, bool, type Dataset, type Iri, type Quad, type Term } from "./terms.ts";
import { MAGE, MAGE_CLASSES } from "./vocabulary.ts";

export function project(system: CanonicalSystem): Dataset {
  const quads: Quad[] = [];
  const sys = system.systemId;

  const add = (subject: Iri, predicate: Iri, object: Term, graph: Iri | null = null): void => {
    quads.push({ subject, predicate, object, graph });
  };

  /**
   * One magnitude, in BASE units, and nothing when it has none.
   *
   * §7: a quantity reaches anything downstream in base units or not at all. A literal that failed to
   * normalize has no base, so no magnitude quad is emitted — the dangling-reference rule applied to a
   * number, where content triples come only from a declaration that carries them. Emitting the
   * author's text instead would put a value with no dimension in the place a query reads for one.
   */
  const addMagnitude = (subject: Iri, predicate: Iri, m: Magnitude): void => {
    if (m.base !== null) add(subject, predicate, numeric(m.base));
  };

  /** `question` / `represents` / `omits`, shared by models and machines. */
  const addPurpose = (subject: Iri, p: Purpose): void => {
    if (p.question !== null) add(subject, MAGE.question, str(p.question));
    for (const r of p.represents) add(subject, MAGE.represents, str(r));
    for (const o of p.omits) add(subject, MAGE.omits, str(o));
  };

  const SYS = systemIri(sys);
  add(SYS, RDF_TYPE, MAGE_CLASSES.System);
  add(SYS, MAGE.id, str(sys));
  add(SYS, MAGE.label, str(system.name));

  // --- domains ------------------------------------------------------------------------------
  for (const d of system.domains.values()) {
    const DOM = domainIri(sys, d.id);
    add(SYS, MAGE.declares, DOM);
    add(DOM, RDF_TYPE, MAGE_CLASSES.Domain);
    add(DOM, MAGE.id, str(d.id));
    add(DOM, MAGE.domainKind, str(d.kind));
    if (d.range !== null) {
      add(DOM, MAGE.rangeMin, numeric(d.range[0]));
      add(DOM, MAGE.rangeMax, numeric(d.range[1]));
    }
    d.values.forEach((v, index) => {
      const VAL = domainValueIri(sys, d.id, v);
      add(DOM, MAGE.domainValue, VAL);
      add(VAL, RDF_TYPE, MAGE_CLASSES.DomainValue);
      add(VAL, MAGE.value, scalarTerm(v));
      // Declaration order IS the order for an ordered-enum and for nothing else. An ordinal on an
      // unordered enum would license a comparison the model never authorized.
      if (d.kind === "ordered-enum") add(VAL, MAGE.ordinal, numeric(index));
    });
  }

  // --- entities, their properties and containment -------------------------------------------
  for (const e of system.entities.values()) {
    const ENT = entityIri(sys, e.id);
    add(SYS, MAGE.declares, ENT);
    add(ENT, RDF_TYPE, MAGE_CLASSES.Entity);
    add(ENT, MAGE.id, str(e.id));
    add(ENT, MAGE.label, str(e.label));
    if (e.type !== null) add(ENT, MAGE.entityType, str(e.type));
    for (const child of e.contains) add(ENT, MAGE.contains, entityIri(sys, child));

    for (const [key, pv] of e.properties) {
      const KEY = propertyIri(sys, key);
      add(KEY, RDF_TYPE, MAGE_CLASSES.Property);
      add(KEY, MAGE.id, str(key));
      if (pv.domain === null) {
        // No declared domain, so the value is a datum and nothing more.
        add(ENT, KEY, scalarTerm(pv.value));
      } else {
        // A value drawn from a declared domain is a NAMED thing in the system, so it gets identity.
        // That is also what makes the ordered comparison sound: the ordinal lives on the domain's
        // own value resource, so a join cannot drift across two domains that spell a value alike.
        const VAL = domainValueIri(sys, pv.domain, pv.value);
        add(KEY, MAGE.valueDomain, domainIri(sys, pv.domain));
        add(ENT, KEY, VAL);
        // The assertion supplies the scalar even when the domain is missing or does not list it.
        // Withholding it here would lose the value entirely for an undeclared domain.
        add(VAL, MAGE.value, scalarTerm(pv.value));
      }
    }
  }

  // --- relation types -----------------------------------------------------------------------
  for (const rt of system.relationTypes.values()) {
    const TYPE = relationTypeIri(sys, rt.id);
    add(SYS, MAGE.declares, TYPE);
    add(TYPE, RDF_TYPE, MAGE_CLASSES.RelationType);
    add(TYPE, MAGE.id, str(rt.id));
    if (rt.description !== "") add(TYPE, MAGE.description, str(rt.description));
    if (rt.absence !== null) add(TYPE, MAGE.absence, str(rt.absence));
    add(TYPE, MAGE.pathComposition, str(rt.pathComposition));
    add(TYPE, MAGE.symmetric, bool(rt.symmetric));
    add(TYPE, MAGE.acyclic, bool(rt.acyclic));
  }

  // --- models, and the relations that are the only model-scoped quads -----------------------
  for (const m of system.models.values()) {
    const MODEL = modelIri(sys, m.id);
    add(SYS, MAGE.declares, MODEL);
    add(MODEL, RDF_TYPE, MAGE_CLASSES.Model);
    add(MODEL, MAGE.id, str(m.id));
    add(MODEL, MAGE.label, str(m.label));
    add(MODEL, MAGE.graph, modelGraphIri(sys, m.id));
    addPurpose(MODEL, m.purpose);
    for (const id of m.entities) add(MODEL, MAGE.includes, entityIri(sys, id));
  }

  // The relation TYPE is the predicate, which is what makes `?a rt:may_invoke+ ?b` a property path
  // rather than a join. Author-declared names stay in their own `rt:` space so a relation type
  // called `label` cannot collide with `mage:label`.
  for (const r of system.relations) {
    add(
      entityIri(sys, r.from),
      relationTypeIri(sys, r.type),
      entityIri(sys, r.to),
      modelGraphIri(sys, r.model),
    );
  }

  // --- machines -----------------------------------------------------------------------------
  let projectedAnyTransition = false;
  for (const m of system.machines.values()) {
    const MACH = machineIri(sys, m.id);
    add(SYS, MAGE.declares, MACH);
    add(MACH, RDF_TYPE, MAGE_CLASSES.Machine);
    add(MACH, MAGE.id, str(m.id));
    addPurpose(MACH, m.purpose);
    if (m.entity !== null) add(MACH, MAGE.describes, entityIri(sys, m.entity));
    add(MACH, MAGE.instanceCount, numeric(m.instances));
    add(MACH, MAGE.initialState, stateIri(sys, m.id, m.initial));

    for (const s of m.states) {
      const STATE = stateIri(sys, m.id, s);
      add(MACH, MAGE.state, STATE);
      add(STATE, RDF_TYPE, MAGE_CLASSES.State);
      add(STATE, MAGE.id, str(s));
    }

    for (const v of m.variables.values()) {
      const VAR = variableIri(sys, m.id, v.id);
      add(MACH, MAGE.variable, VAR);
      add(VAR, RDF_TYPE, MAGE_CLASSES.Variable);
      add(VAR, MAGE.id, str(v.id));
      add(VAR, MAGE.variableKind, str(v.kind));
      add(VAR, MAGE.initialValue, scalarTerm(v.initial));
      for (const value of v.domain) add(VAR, MAGE.permittedValue, scalarTerm(value));
    }

    for (const [id, expression] of m.derived) {
      const DERIV = derivedIri(sys, m.id, id);
      add(MACH, MAGE.derived, DERIV);
      add(DERIV, RDF_TYPE, MAGE_CLASSES.DerivedValue);
      add(DERIV, MAGE.id, str(id));
      add(DERIV, MAGE.expression, str(expression));
    }

    for (const t of m.transitions) {
      projectedAnyTransition = true;
      const TRANS = transitionIri(sys, m.id, t.index);
      const FROM = stateIri(sys, m.id, t.from);
      const TO = stateIri(sys, m.id, t.to);
      add(MACH, MAGE.transition, TRANS);
      add(TRANS, RDF_TYPE, MAGE_CLASSES.Transition);
      add(TRANS, MAGE.transitionIndex, numeric(t.index));
      add(TRANS, MAGE.from, FROM);
      add(TRANS, MAGE.to, TO);
      if (t.label !== null) add(TRANS, MAGE.label, str(t.label));
      if (t.sync !== null) add(TRANS, MAGE.sync, eventIri(sys, t.sync));

      t.guards.forEach((g, index) => {
        const GUARD = guardIri(sys, m.id, t.index, index);
        add(TRANS, MAGE.guard, GUARD);
        add(GUARD, RDF_TYPE, MAGE_CLASSES.Guard);
        // The dotted ref stays verbatim. Resolving `worker.state` to an instance and a variable is
        // the engine's job; doing it twice is how two resolvers end up disagreeing.
        add(GUARD, MAGE.ref, str(g.ref));
        add(GUARD, MAGE.op, str(g.op));
        add(GUARD, MAGE.comparand, scalarTerm(g.value));
      });

      t.effects.forEach((e, index) => {
        const EFFECT = effectIri(sys, m.id, t.index, index);
        add(TRANS, MAGE.effect, EFFECT);
        add(EFFECT, RDF_TYPE, MAGE_CLASSES.Effect);
        add(EFFECT, MAGE.targetVariable, variableIri(sys, m.id, e.variable));
        add(EFFECT, MAGE.expression, str(e.expression));
      });

      add(FROM, MAGE.canTransitionTo, TO);
    }
  }

  // Derived adjacency declares its own composition policy, in the same vocabulary the licensing
  // gate already reads for author-declared relation types. One kind of fact, one gate.
  if (projectedAnyTransition) add(MAGE.canTransitionTo, MAGE.pathComposition, str("forbidden"));

  for (const i of system.instances) {
    const INST = instanceIri(sys, i.id);
    add(machineIri(sys, i.machine), MAGE.instance, INST);
    add(INST, RDF_TYPE, MAGE_CLASSES.MachineInstance);
    add(INST, MAGE.id, str(i.id));
    add(INST, MAGE.ordinal, numeric(i.ordinal));
  }

  // --- events -------------------------------------------------------------------------------
  for (const e of system.events.values()) {
    const EVENT = eventIri(sys, e.id);
    add(SYS, MAGE.declares, EVENT);
    add(EVENT, RDF_TYPE, MAGE_CLASSES.Event);
    add(EVENT, MAGE.id, str(e.id));
    for (const p of e.participants) add(EVENT, MAGE.participant, machineIri(sys, p));
  }

  // --- quantities, and the dimensions they use -----------------------------------------------
  // Structured resources, never flattened to a bare literal. Flattening `gateway-latency` to
  // `gateway latencyMs 250` drops the dimension, and SPARQL could then add milliseconds to
  // megabytes — which V30 refuses at the validation layer. A projection that silently permits what
  // validation forbids is the layering mistake where each layer looks correct alone. The relation
  // types already set the pattern: a type's own properties are projected as facts, not folded away.
  //
  // Every quantity lands in the DEFAULT graph whatever it targets; `RDF-VOCABULARY.md` §2a has the
  // reasoning, and the one-line version is that nothing in the IR attaches a quantity to a model.
  const usedDimensions = new Set<Dimension>();
  for (const q of system.quantities.values()) {
    const QUANT = quantityIri(sys, q.id);
    add(SYS, MAGE.declares, QUANT);
    add(QUANT, RDF_TYPE, MAGE_CLASSES.Quantity);
    add(QUANT, MAGE.id, str(q.id));
    // Verbatim, like a guard's `mage:ref`, and not resolved to the IRI of the thing it annotates:
    // only `entity:` and `model:` refs could be resolved at all, and resolving two of six kinds
    // would let a latency query answer with a silent subset. RDF-VOCABULARY.md §7.
    add(QUANT, MAGE.target, str(q.target.raw));
    if (q.target.kind !== null) add(QUANT, MAGE.targetKind, str(q.target.kind));
    // `dimensionRaw` is withheld when the dimension is not one of the five, for the same reason the
    // magnitude is: the projection carries meaning, and V28 is what quotes the author's own word.
    if (q.dimension !== null) {
      usedDimensions.add(q.dimension);
      add(QUANT, MAGE.dimension, dimensionIri(q.dimension));
    }
    // The discriminator, as `domainKind` and `variableKind` already are for their unions. Without it
    // an absent value and a magnitude that failed to normalize would both be silence.
    add(QUANT, MAGE.valueKind, str(q.value.kind));
    switch (q.value.kind) {
      case "point":
        addMagnitude(QUANT, MAGE.magnitude, q.value.magnitude);
        break;
      case "range":
        // Two bounds, two quads. A range collapsed to one number is a wrong answer waiting.
        addMagnitude(QUANT, MAGE.rangeMin, q.value.low);
        addMagnitude(QUANT, MAGE.rangeMax, q.value.high);
        break;
      case "expression":
        // The source verbatim, like an effect's. The parse is the engine's, and a second resolver is
        // how two resolvers come to disagree.
        add(QUANT, MAGE.expression, str(q.value.source));
        break;
      case "absent":
        break;
    }
  }

  // One resource per dimension a quantity actually used, so the base unit a magnitude is expressed
  // in has a home and is stated ONCE. No `mage:declares` edge reaches it: MAGE owns the five
  // dimensions, and no author declared them. Emitted on demand for the same reason
  // `canTransitionTo`'s composition policy is — a system with no quantities must project exactly
  // what it projected before quantities existed.
  for (const d of DIMENSION_IDS.filter((id) => usedDimensions.has(id))) {
    const spec = DIMENSIONS[d];
    const DIM = dimensionIri(d);
    add(DIM, RDF_TYPE, MAGE_CLASSES.Dimension);
    add(DIM, MAGE.id, str(d));
    // Withheld rather than spelled `"1"` for a dimensionless dimension: `ratio` and `count` carry no
    // unit token at all, and a projected `"1"` is a unit a query could filter on.
    if (spec.base !== null) add(DIM, MAGE.baseUnit, str(spec.base));
    add(DIM, MAGE.aggregationScope, str(spec.scope));
    if (spec.maximum !== null) add(DIM, MAGE.rangeMax, numeric(spec.maximum));
  }

  // --- saved queries ------------------------------------------------------------------------
  // Existence and id only. `SavedQuery.raw` is `unknown` — the query schema is a separate document
  // with no typed IR of its own yet — and projecting an untyped blob would advertise content a
  // consumer could not rely on. Which questions a system asks is still worth being able to ask.
  for (const q of system.queries.values()) {
    const QUERY = queryIri(sys, q.id);
    add(SYS, MAGE.declares, QUERY);
    add(QUERY, RDF_TYPE, MAGE_CLASSES.Query);
    add(QUERY, MAGE.id, str(q.id));
  }

  return canonicalDataset(quads);
}

/** The named graphs a projection uses, sorted. The handles a `GRAPH` clause can name. */
export const projectedGraphs = (dataset: Dataset): readonly string[] =>
  [...new Set(dataset.map((q) => q.graph?.value).filter((v): v is string => v !== undefined))].sort();
