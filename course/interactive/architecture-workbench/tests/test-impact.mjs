/* test-impact.mjs — scenario-dependent impact sets, and the distinction the brief insists on.
 *
 * The property under test throughout: MUST MODIFY and POTENTIALLY IMPACTED are different claims.
 * The first is an assumption the scenario declares; the second is derived from the graph and says
 * only that a path exists. A test that merely counted "affected components" would pass while the
 * model lost the distinction, so every assertion here names which set it is talking about, and one
 * test pins the case where collapsing the two would invert the ranking.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M } from './harness.mjs';

const CHANGE_IMPACT = M.SCENARIOS.filter((s) => s.lens === 'change-impact').map((s) => s.id);

test('there are five scenarios, and each declares a lens matching its question', () => {
  assert.equal(M.SCENARIOS.length, 5);
  const lenses = {};
  for (const scenario of M.SCENARIOS) {
    assert.ok(['change-impact', 'ownership', 'release'].includes(scenario.lens),
      `${scenario.id} declares lens ${scenario.lens}`);
    assert.ok(scenario.question.endsWith('?'), `${scenario.id}'s question is not a question`);
    lenses[scenario.lens] = (lenses[scenario.lens] || 0) + 1;
  }
  /* Three scenarios ask which components a change reaches; the other two ask structural questions
     that a change-impact answer would misrepresent. */
  assert.deepEqual(lenses, { 'change-impact': 3, ownership: 1, release: 1 });
});

test('every scenario declares a must-modify set for every architecture', () => {
  for (const scenario of M.SCENARIOS) {
    for (const archId of M.ARCHITECTURE_IDS) {
      assert.ok(Array.isArray(scenario.mustModify[archId]),
        `${scenario.id} has no must-modify set for ${archId}`);
      for (const id of scenario.mustModify[archId]) {
        assert.ok(M.nodeById(archId, id),
          `${scenario.id}/${archId} assumes ${id} changes, and ${archId} has no such component`);
      }
      assert.ok(scenario.assumption[archId] && scenario.assumption[archId].length > 20,
        `${scenario.id}/${archId} declares a must-modify set with no stated assumption`);
    }
  }
});

test('a non-change-impact scenario assumes no component changes', () => {
  /* Faking a change set for "introduce a second team" would be the easier build and the wrong one. */
  for (const scenario of M.SCENARIOS.filter((s) => s.lens !== 'change-impact')) {
    for (const archId of M.ARCHITECTURE_IDS) {
      assert.deepEqual(M.impactSets(archId, scenario.id).mustModify, [],
        `${scenario.id}/${archId} invents a change set for a structural question`);
    }
  }
});

test('the three impact sets partition every component exactly once', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of M.SCENARIO_IDS) {
      const sets = M.impactSets(archId, scenarioId);
      const all = M.architectureById(archId).nodes.map((n) => n.id);
      const union = [...sets.mustModify, ...sets.potentiallyImpacted, ...sets.unaffected];
      assert.equal(new Set(union).size, union.length,
        `${archId}/${scenarioId}: a component is in two states at once`);
      assert.deepEqual(union.slice().sort(), all.slice().sort(),
        `${archId}/${scenarioId}: the states do not cover the components`);
    }
  }
});

test('must-modify is exactly the scenario’s declared assumption, never widened', () => {
  /* If the engine ever derived must-modify from the graph, this is the test that would catch it. */
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of M.SCENARIO_IDS) {
      assert.deepEqual(M.impactSets(archId, scenarioId).mustModify,
        M.scenarioById(scenarioId).mustModify[archId],
        `${archId}/${scenarioId}: must-modify diverged from the declared assumption`);
    }
  }
});

test('potential impact is derived from real paths in the declared direction', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of CHANGE_IMPACT) {
      const sets = M.impactSets(archId, scenarioId);
      assert.equal(sets.paths.length, sets.potentiallyImpacted.length);
      for (const entry of sets.paths) {
        assert.ok(['dependent', 'dependency'].includes(entry.direction));
        assert.ok(entry.path.length >= 2, `${archId}/${scenarioId}/${entry.node}: path too short`);
        for (let i = 0; i + 1 < entry.path.length; i += 1) {
          assert.ok(M.hasEdge(archId, entry.path[i], entry.path[i + 1]),
            `${archId}/${scenarioId}: path ${entry.path.join('->')} is not a walk of the graph`);
        }
        if (entry.direction === 'dependent') {
          assert.equal(entry.path[0], entry.node, 'a dependent path should start at the component');
          assert.ok(sets.mustModify.includes(entry.path[entry.path.length - 1]));
        } else {
          assert.equal(entry.path[entry.path.length - 1], entry.node);
          assert.ok(sets.mustModify.includes(entry.path[0]));
        }
      }
    }
  }
});

test('a dependency edge does not place both ends in the same state', () => {
  /* The brief's central modelling point, asserted as a property rather than an example: somewhere
     in these scenarios there is an edge whose two ends are in different states. If every edge put
     both ends in one state, the instrument would be painting reachable subgraphs. */
  let foundSplitEdge = false;
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of CHANGE_IMPACT) {
      const sets = M.impactSets(archId, scenarioId);
      for (const [from, to] of M.architectureById(archId).edges) {
        if (M.impactStateOf(sets, from) !== M.impactStateOf(sets, to)) foundSplitEdge = true;
      }
    }
  }
  assert.ok(foundSplitEdge, 'every edge has both ends in one state — the model paints subgraphs');
});

test('possible impact runs in both directions, and each is reported as itself', () => {
  const sets = M.impactSets('retain', 'lab-policy');
  /* The HTTP surface depends on booking, which changes: reached towards dependents. */
  assert.ok(sets.towardsDependents.includes('api'));
  assert.equal(M.impactDirectionOf(sets, 'api'), 'dependent');
  /* Persistence is used by booking, which changes: reached towards dependencies. */
  assert.ok(sets.towardsDependencies.includes('persistence'));
  assert.equal(M.impactDirectionOf(sets, 'persistence'), 'dependency');
  /* And the two directions never overlap. */
  for (const id of sets.towardsDependents) assert.ok(!sets.towardsDependencies.includes(id));
});

test('the author’s figure-2 chain is the retained structure’s laboratory-policy impact', () => {
  /* NEW LABORATORY POLICY -> BookingService -> {RoomRules, Approval} -> Persistence, with the
     first three modified and Persistence a possible downstream effect. The static figure in the
     page's introduction draws exactly this, so the figure and the engine cannot drift. */
  const sets = M.impactSets('retain', 'lab-policy');
  assert.deepEqual(sets.mustModify, ['booking', 'roomRules', 'approval']);
  assert.ok(sets.potentiallyImpacted.includes('persistence'));
  assert.equal(M.impactDirectionOf(sets, 'persistence'), 'dependency');
});

test('adding laboratory rules touches three components in the retained structure and one in each alternative', () => {
  assert.equal(M.impactSets('retain', 'lab-policy').mustModify.length, 3);
  assert.equal(M.impactSets('modular', 'lab-policy').mustModify.length, 1);
  assert.equal(M.impactSets('services', 'lab-policy').mustModify.length, 1);
});

test('only an explicit policy boundary leaves room policy outside a laboratory change', () => {
  /* The pedagogical payload of the first scenario, and it is about the ISOLATED set rather than
     the impacted one. */
  assert.deepEqual(M.impactSets('retain', 'lab-policy').unaffected, []);
  assert.ok(M.impactSets('modular', 'lab-policy').unaffected.includes('roomPolicy'));
  assert.ok(M.impactSets('services', 'lab-policy').unaffected.includes('roomService'));
});

test('storage knowledge propagates widest in the retained structure', () => {
  const must = (archId) => M.impactSets(archId, 'persistence').mustModify.length;
  assert.equal(must('retain'), 4);
  assert.equal(must('modular'), 1);
  assert.equal(must('services'), 3);
});

test('ranking by potential impact alone would rank the best structure worst for a storage change', () => {
  /* This is why the two sets are never conflated, and it is a genuine inversion rather than an
     artefact: for a storage change the modular monolith has the SMALLEST must-modify set and the
     LARGEST potentially-impacted set, so an instrument that painted the reachable subgraph and
     counted it would put the best structure last.

     Note what is NOT asserted here. The SUM of the two sets cannot carry the claim, because the
     three architectures have different component counts (six, five, five) and a sum is bounded by
     that count — so a sum-based assertion would be measuring graph size, not impact. The ordering
     by each set separately is the real finding. */
  const sets = Object.fromEntries(M.ARCHITECTURE_IDS
    .map((id) => [id, M.impactSets(id, 'persistence')]));
  for (const other of ['retain', 'services']) {
    assert.ok(sets.modular.mustModify.length < sets[other].mustModify.length,
      `modular should modify fewer components than ${other}`);
    assert.ok(sets.modular.potentiallyImpacted.length > sets[other].potentiallyImpacted.length,
      `modular should have a wider possible-impact set than ${other}`);
  }
  const byPotential = M.ARCHITECTURE_IDS.slice()
    .sort((p, q) => sets[p].potentiallyImpacted.length - sets[q].potentiallyImpacted.length);
  assert.equal(byPotential[byPotential.length - 1], 'modular',
    'the inversion this test guards against has disappeared — re-examine the claim, not the test');
  const byMust = M.ARCHITECTURE_IDS.slice()
    .sort((p, q) => sets[p].mustModify.length - sets[q].mustModify.length);
  assert.equal(byMust[0], 'modular');
});

test('a cross-cutting authorization policy touches several components in every structure', () => {
  /* The boundary was drawn for room-versus-laboratory, which is orthogonal to authorization. No
     architecture gets this one for free, and the instrument should not pretend otherwise. */
  for (const archId of M.ARCHITECTURE_IDS) {
    assert.equal(M.impactSets(archId, 'authorization').mustModify.length, 3,
      `${archId} should not escape a cross-cutting policy with a single edit`);
  }
});

test('network edges on an impact path are reported, and only the extraction has any', () => {
  for (const scenarioId of CHANGE_IMPACT) {
    assert.deepEqual(M.impactSets('retain', scenarioId).networkEdgesOnPaths, []);
    assert.deepEqual(M.impactSets('modular', scenarioId).networkEdgesOnPaths, []);
  }
  const services = M.impactSets('services', 'lab-policy');
  assert.ok(services.networkEdgesOnPaths.length > 0,
    'a laboratory change in the extraction crosses a network boundary and should say so');
  for (const key of services.networkEdgesOnPaths) {
    const [from, to] = key.split('->');
    assert.equal(M.edgeKind('services', from, to), 'network');
  }
});

test('the highlighted path edges are exactly the edges the reported paths walk', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of M.SCENARIO_IDS) {
      const sets = M.impactSets(archId, scenarioId);
      const derived = new Set();
      for (const entry of sets.paths) {
        for (let i = 0; i + 1 < entry.path.length; i += 1) {
          derived.add(`${entry.path[i]}->${entry.path[i + 1]}`);
        }
      }
      assert.deepEqual(sets.pathEdges.slice().sort(), [...derived].sort(),
        `${archId}/${scenarioId}: highlighted edges diverge from the reported paths`);
    }
  }
});

test('impactAll covers the three architectures in declaration order', () => {
  for (const scenarioId of M.SCENARIO_IDS) {
    assert.deepEqual(M.impactAll(scenarioId).map((s) => s.architecture), M.ARCHITECTURE_IDS);
  }
});

test('the ownership record names only components the architecture has, without double-booking', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    const ownership = M.architectureById(archId).ownership;
    const named = [...ownership.teamA, ...ownership.teamB, ...ownership.shared];
    assert.equal(new Set(named).size, named.length,
      `${archId}: a component is owned by two groups at once`);
    for (const id of named) {
      assert.ok(M.nodeById(archId, id), `${archId}: ownership names unknown component ${id}`);
    }
    assert.ok(ownership.verdict.length > 40, `${archId}: ownership has no stated verdict`);
  }
});

test('the retained structure offers no ownership partition at all', () => {
  const ownership = M.architectureById('retain').ownership;
  assert.deepEqual(ownership.teamA, []);
  assert.deepEqual(ownership.teamB, []);
  assert.ok(ownership.shared.length > 0);
  for (const archId of ['modular', 'services']) {
    const other = M.architectureById(archId).ownership;
    assert.equal(other.teamA.length, 1, `${archId} should give team A one policy component`);
    assert.equal(other.teamB.length, 1, `${archId} should give team B one policy component`);
  }
});

test('the graph description states the two impact states and their drawing, in words', () => {
  const text = M.graphDescription('retain', 'lab-policy');
  assert.match(text, /must be modified/);
  assert.match(text, /potentially impacted/);
  assert.match(text, /dashed outline/);
  assert.match(text, /not a change it establishes/);
  /* And it names every component and every edge, so the drawing is never the only copy. */
  for (const node of M.architectureById('retain').nodes) {
    assert.ok(text.includes(node.name), `the description omits ${node.name}`);
  }
});

test('the description follows the lens rather than describing a change set for every scenario', () => {
  assert.match(M.graphDescription('modular', 'second-team'), /ownership/);
  assert.match(M.graphDescription('services', 'independent-release'), /deployment units/);
  assert.match(M.graphDescription('retain', 'independent-release'), /not possible/);
  assert.match(M.graphDescription('services', 'independent-release'), /possible/);
});

test('every architecture and scenario pair produces a usable description', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const scenarioId of M.SCENARIO_IDS) {
      const text = M.graphDescription(archId, scenarioId);
      assert.ok(text.length > 200, `${archId}/${scenarioId}: description is only ${text.length} chars`);
      assert.ok(!text.includes('undefined'), `${archId}/${scenarioId}: description has a hole in it`);
    }
  }
});
