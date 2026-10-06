/**
 * The MAGE vocabulary. One term per IR field, and no term MAGE cannot state the meaning of.
 *
 * `RDF-VOCABULARY.md` defines each one; this module is the machine-readable half, and the two are
 * checked against each other by `test/rdf.test.ts` so a term cannot be added here and left
 * undefined there.
 *
 * **Nothing from RDFS or OWL appears, by construction.** There is no `subClassOf`, no `domain`, no
 * `range`, no `inverseOf`, no `TransitiveProperty`. Each of those invites a reasoner to add facts
 * MAGE never asserted, which is the same failure the engine's `unlicensed` outcome exists to refuse
 * one layer up. MAGE fixes the meaning of these terms itself.
 *
 * **No inverse term is materialized.** `contains` has no `containedBy`, `from` no `isFromOf`. SPARQL
 * traverses backwards with `^` already, and a materialized inverse doubles the dataset while making
 * `COUNT` answer a question nobody asked.
 */
import { vocabularyIri } from "./iri.ts";
import type { Iri } from "./terms.ts";

const V = vocabularyIri;

/**
 * Classes. Capitalized, one per IR concept, used only as the object of `rdf:type`.
 */
export const MAGE_CLASSES = {
  System: V("System"),
  Entity: V("Entity"),
  /** A property KEY an author used, not a property value. Carries the declared value domain. */
  Property: V("Property"),
  RelationType: V("RelationType"),
  Domain: V("Domain"),
  /** One member of a declared domain. A named thing, so it gets identity rather than a literal. */
  DomainValue: V("DomainValue"),
  Model: V("Model"),
  Machine: V("Machine"),
  MachineInstance: V("MachineInstance"),
  State: V("State"),
  Variable: V("Variable"),
  /** A recomputed value. Never stored, never part of state identity. */
  DerivedValue: V("DerivedValue"),
  Transition: V("Transition"),
  Guard: V("Guard"),
  Effect: V("Effect"),
  Event: V("Event"),
  Query: V("Query"),
  /** A quantitative annotation. A structured resource, so the dimension travels with the number. */
  Quantity: V("Quantity"),
  /** One declared accounting basis, for one path-aggregated metric. The route a quantity reaches an analysis by. */
  Accounting: V("Accounting"),
  /** One of MAGE's five dimensions. Carries its base unit and its aggregation scope. */
  Dimension: V("Dimension"),
} as const satisfies Record<string, Iri>;

/**
 * Properties. Lowercase, one per IR field.
 */
export const MAGE = {
  // --- identity and declaration -------------------------------------------------------------
  /** The object's MAGE id, so a result row reads back without anyone parsing an IRI. */
  id: V("id"),
  /** Display name. Mutable in the IR, unlike the id. */
  label: V("label"),
  /** System to top-level declared resource. The membership edge, so two systems can share a store. */
  declares: V("declares"),

  // --- entities ------------------------------------------------------------------------------
  /** The author's free-form type word: `service`, `component`. A literal; MAGE declares no taxonomy. */
  entityType: V("entityType"),
  /** Parent to child. Containment, one direction only. */
  contains: V("contains"),

  // --- relation types ------------------------------------------------------------------------
  description: V("description"),
  /** What the ABSENCE of an edge of this type means. The half of the model that is easiest to lose. */
  absence: V("absence"),
  /** `allowed` or `forbidden`. Whether a multi-hop question over this type is licensed at all. */
  pathComposition: V("pathComposition"),
  symmetric: V("symmetric"),
  acyclic: V("acyclic"),
  /**
   * A declared SOURCE kind (one triple per union member) — deliberately `mage:domain`, never
   * `rdfs:domain`, whose semantics are inference: an RDFS reasoner would CONCLUDE an endpoint's
   * type from a nonsense edge, which is the exact inversion V48 exists to refuse (SEMANTICS §3.3).
   */
  domain: V("domain"),
  /** A declared TARGET kind. `mage:range`, never `rdfs:range`, for `domain`'s reason. */
  range: V("range"),

  // --- domains and values --------------------------------------------------------------------
  /** `enum`, `ordered-enum`, `boolean` or `integer`. */
  domainKind: V("domainKind"),
  /** Domain to one of its members. */
  domainValue: V("domainValue"),
  /** The scalar a domain value stands for, as a typed literal. */
  value: V("value"),
  /**
   * Zero-based position in a declared order.
   *
   * On a domain value ONLY for an `ordered-enum`: declaration order is the order there, and nowhere
   * else. On a machine instance it is the index in the expansion.
   */
  ordinal: V("ordinal"),
  /**
   * An inclusive bound. One fact, three subjects: an integer domain's declared range, the two ends
   * of a quantity's range, and a dimension's V29 ceiling. Minting a term per subject would say
   * "inclusive lower bound" three times in three spellings.
   */
  rangeMin: V("rangeMin"),
  rangeMax: V("rangeMax"),
  /** Property key to the domain its values are drawn from. */
  valueDomain: V("valueDomain"),

  // --- purposeful reduction ------------------------------------------------------------------
  /** The engineering question the model or machine exists to answer. */
  question: V("question"),
  /** A distinction the author claims this reduction preserves. */
  represents: V("represents"),
  /** A distinction the author claims this reduction drops. Drives the not-answerable decision. */
  omits: V("omits"),

  // --- models --------------------------------------------------------------------------------
  /** Model to the named graph holding its relations. The handle a `GRAPH` clause needs. */
  graph: V("graph"),
  /** Model to an entity in its declared scope. */
  includes: V("includes"),

  // --- machines ------------------------------------------------------------------------------
  /** Machine to the entity whose behavior it describes. Optional correspondence, not identity. */
  describes: V("describes"),
  initialState: V("initialState"),
  state: V("state"),
  variable: V("variable"),
  derived: V("derived"),
  transition: V("transition"),
  /** Declared multiplicity. */
  instanceCount: V("instanceCount"),
  instance: V("instance"),

  // --- variables and derived values ----------------------------------------------------------
  /** `boolean`, `integer` or `enum`. */
  variableKind: V("variableKind"),
  /** One value the variable may take. Enumerated, because a finite domain is a list, not a promise. */
  permittedValue: V("permittedValue"),
  initialValue: V("initialValue"),
  /** A guard or effect expression, verbatim. The engine owns the grammar. */
  expression: V("expression"),

  // --- transitions ---------------------------------------------------------------------------
  /** Position within the machine's transition list. Semantic: a reorder is a different system. */
  transitionIndex: V("transitionIndex"),
  from: V("from"),
  to: V("to"),
  /** Transition to the event it synchronizes on. Synchronization, and nothing else. */
  sync: V("sync"),
  guard: V("guard"),
  effect: V("effect"),
  /** The guard's dotted reference, verbatim. Resolving it is the engine's job, not the projection's. */
  ref: V("ref"),
  /** `eq`, `ne`, `lt`, `le`, `gt`, `ge`. */
  op: V("op"),
  /** The scalar the guard compares against. */
  comparand: V("comparand"),
  /** The variable an effect writes. */
  targetVariable: V("targetVariable"),

  // --- derived adjacency ---------------------------------------------------------------------
  /**
   * State to state, where the machine declares a transition between them. Declared adjacency, NOT
   * enabledness and NOT reachability: guards may make every such step infeasible. The projection
   * therefore declares `canTransitionTo` to have `pathComposition` `forbidden`, so the licensing
   * gate refuses `canTransitionTo+` for the same reason it refuses a multi-hop `owns`.
   */
  canTransitionTo: V("canTransitionTo"),

  // --- events --------------------------------------------------------------------------------
  /** Event to a machine that must take part in it. */
  participant: V("participant"),

  // --- quantities and dimensions -------------------------------------------------------------
  /**
   * The quantity's target, as the author wrote it: `entity:cache`, `transition:parse`.
   *
   * Verbatim, like `mage:ref`, and for a harder reason: four of the six target kinds have no
   * semantic id to mint an IRI from. `RDF-VOCABULARY.md` §7 states the whole argument.
   */
  target: V("target"),
  /** `transition` / `relation` / `entity` / `state` / `parameter` / `model`. Withheld when unrecognized. */
  targetKind: V("targetKind"),
  /** Quantity to its dimension resource. An IRI, so a `FILTER` joins on it rather than on a word. */
  dimension: V("dimension"),
  /** `point` / `range` / `expression` / `absent`. Which shape of value the author wrote. */
  valueKind: V("valueKind"),
  /** A point magnitude, in the dimension's BASE units. Never the authored unit. */
  magnitude: V("magnitude"),
  /** The unit every magnitude of this dimension is expressed in. Withheld when dimensionless. */
  baseUnit: V("baseUnit"),
  /**
   * `resident`: this quantity is charged in every configuration where the thing it annotates exists.
   *
   * One of the two summands of `memory(c)`. Withheld when the author's word is not in the closed
   * vocabulary, because the projection carries meaning and V37 is what quotes an author's own text.
   */
  residency: V("residency"),
  /**
   * Quantity to the STATE whose activation charges it — the other summand of `memory(c)`.
   *
   * An IRI, not the author's string, and the only reference the projection resolves. V37 fixes how a
   * `when.state` spells its machine, so the resolution is MAGE's rather than a guess, and a charge
   * condition a consumer cannot follow to the state it names is the one thing a graph was for.
   */
  chargedWhile: V("chargedWhile"),
  /**
   * `entities`: which target kind this metric's accounting charges. A closed vocabulary of one.
   *
   * Withheld when the author's basis word is unreadable, for the same reason as `mage:residency`.
   */
  accountingBasis: V("accountingBasis"),
  /**
   * `configuration` / `execution` / `structural`: which axis this dimension aggregates along.
   *
   * On the DIMENSION, not on the quantity, because that is where the fact lives — the IR derives it
   * from the dimension and forbids an author from choosing it. Named `aggregationScope` rather than
   * `scope` because a model already has a scope, and the two are unrelated.
   */
  aggregationScope: V("aggregationScope"),
} as const satisfies Record<string, Iri>;
