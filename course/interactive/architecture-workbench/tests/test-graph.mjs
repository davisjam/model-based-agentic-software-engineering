/* test-graph.mjs — the three architectures as graphs: reachability, roles, geometry.
 *
 * Reachability is re-derived in the harness by repeated relaxation rather than by calling the
 * engine's own breadth-first traversal, so a bug in the traversal cannot certify itself.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, expectedReachingTo, expectedReachableFrom, edgeKeys } from './harness.mjs';

test('there are exactly three predefined architectures, in the lecture’s order', () => {
  assert.deepEqual(M.ARCHITECTURE_IDS, ['retain', 'modular', 'services']);
  assert.deepEqual(M.ARCHITECTURES.map((a) => a.letter), ['A', 'B', 'C']);
});

test('every architecture declares the components its edges reference', () => {
  for (const arch of M.ARCHITECTURES) {
    const ids = arch.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, ids.length, `${arch.id} declares a duplicate component id`);
    for (const [from, to] of arch.edges) {
      assert.ok(ids.includes(from), `${arch.id}: edge from unknown component ${from}`);
      assert.ok(ids.includes(to), `${arch.id}: edge to unknown component ${to}`);
      assert.notEqual(from, to, `${arch.id}: ${from} depends on itself`);
    }
    assert.equal(new Set(edgeKeys(arch.id)).size, arch.edges.length,
      `${arch.id} declares the same dependency twice`);
  }
});

test('every component carries one of the declared concrete roles', () => {
  for (const arch of M.ARCHITECTURES) {
    for (const node of arch.nodes) {
      assert.ok(M.CONCRETE_ROLE_IDS.includes(node.role),
        `${arch.id}/${node.id} carries role ${node.role}, which is not a concrete role`);
    }
  }
});

test('every architecture has exactly one HTTP surface, and everything hangs off it', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    const edge = M.nodesWithRole(archId, 'edge');
    assert.deepEqual(edge, ['api'], `${archId} has ${edge.length} HTTP surfaces`);
    const arch = M.architectureById(archId);
    assert.equal(M.reachableFrom(archId, 'api').length, arch.nodes.length - 1,
      `${archId} has a component the HTTP surface cannot reach`);
  }
});

test('no architecture contains a dependency cycle', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const node of M.architectureById(archId).nodes) {
      assert.ok(!M.reachableFrom(archId, node.id).includes(node.id),
        `${archId}: ${node.id} can reach itself`);
    }
  }
});

test('forward and backward reachability agree with an independent derivation', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const node of M.architectureById(archId).nodes) {
      assert.deepEqual([...M.reachingTo(archId, node.id)].sort(),
        expectedReachingTo(archId, node.id).sort(),
        `${archId}: who can reach ${node.id}`);
      assert.deepEqual([...M.reachableFrom(archId, node.id)].sort(),
        expectedReachableFrom(archId, node.id).sort(),
        `${archId}: what ${node.id} can reach`);
    }
  }
});

test('reachability is the transitive closure of the direct relation, and is strictly wider', () => {
  /* The distinction the rule language rests on: an edge rule and a path rule are not the same
     check. Somewhere in these three graphs there must be a pair with a path and no edge, or
     MUST NOT REACH would be redundant. */
  let strictlyWiderSomewhere = false;
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const node of M.architectureById(archId).nodes) {
      for (const direct of M.dependenciesOf(archId, node.id)) {
        assert.ok(M.reachableFrom(archId, node.id).includes(direct));
      }
      for (const reached of M.reachableFrom(archId, node.id)) {
        if (!M.dependenciesOf(archId, node.id).includes(reached)) strictlyWiderSomewhere = true;
      }
    }
  }
  assert.ok(strictlyWiderSomewhere, 'no path exceeds an edge anywhere, so MUST NOT REACH is dead');
});

test('dependents and dependencies are exact mirrors of one another', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const [from, to] of M.architectureById(archId).edges) {
      assert.ok(M.dependenciesOf(archId, from).includes(to));
      assert.ok(M.dependentsOf(archId, to).includes(from));
    }
  }
});

test('shortest paths are real walks of the declared edges', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    const nodes = M.architectureById(archId).nodes.map((n) => n.id);
    for (const from of nodes) {
      for (const to of nodes) {
        const path = M.shortestPath(archId, from, to);
        if (path === null) {
          assert.ok(!M.reachableFrom(archId, from).includes(to),
            `${archId}: ${to} is reachable from ${from} but no path was returned`);
          continue;
        }
        assert.equal(path[0], from);
        assert.equal(path[path.length - 1], to);
        for (let i = 0; i + 1 < path.length; i += 1) {
          assert.ok(M.hasEdge(archId, path[i], path[i + 1]),
            `${archId}: path ${path.join('->')} uses a dependency that does not exist`);
        }
      }
    }
  }
});

test('only the extraction uses network dependencies, and only between booking and the policies', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    const network = M.architectureById(archId).edges.filter((e) => e[2] === 'network');
    if (archId === 'services') {
      assert.deepEqual(network.map((e) => `${e[0]}->${e[1]}`),
        ['booking->roomService', 'booking->labService']);
    } else {
      assert.deepEqual(network, [], `${archId} has a network dependency and is one deployable`);
    }
  }
});

test('the derived storage role covers both concrete storage roles', () => {
  assert.deepEqual(M.nodesWithRole('retain', 'storage'), ['persistence', 'db']);
  assert.deepEqual(M.nodesWithRole('modular', 'storage'), ['persistence']);
  assert.deepEqual(M.nodesWithRole('services', 'storage'), ['db']);
});

test('only the modular monolith keeps the policies away from a bare datastore', () => {
  /* The structural claim behind the storage-knowledge rule, asserted from the graph rather than
     taken from the rule report. */
  const reachesDatastoreDirectly = (archId) => M.nodesWithRole(archId, 'policy')
    .filter((id) => M.dependenciesOf(archId, id)
      .some((dep) => M.nodeById(archId, dep).role === 'datastore'));
  assert.equal(reachesDatastoreDirectly('retain').length, 2);
  assert.equal(reachesDatastoreDirectly('modular').length, 0);
  assert.equal(reachesDatastoreDirectly('services').length, 2);
});

test('every drawn edge starts and ends on a component border, never at a centre', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    for (const [from, to] of M.architectureById(archId).edges) {
      const g = M.edgeGeometry(archId, from, to);
      for (const [nodeId, x, y] of [[from, g.x1, g.y1], [to, g.x2, g.y2]]) {
        const node = M.nodeById(archId, nodeId);
        const centre = M.nodeCentre(node);
        assert.ok(Math.abs(x - centre.x) > 0.001 || Math.abs(y - centre.y) > 0.001,
          `${archId}: ${from}->${to} touches the centre of ${nodeId}`);
        const onVertical = Math.abs(x - node.x) < 0.02 || Math.abs(x - (node.x + M.NODE_W)) < 0.02;
        const onHorizontal = Math.abs(y - node.y) < 0.02 || Math.abs(y - (node.y + M.NODE_H)) < 0.02;
        assert.ok(onVertical || onHorizontal,
          `${archId}: ${from}->${to} endpoint (${x},${y}) is not on ${nodeId}'s border`);
      }
    }
  }
});

test('no two components overlap in the drawing', () => {
  for (const arch of M.ARCHITECTURES) {
    for (let i = 0; i < arch.nodes.length; i += 1) {
      for (let j = i + 1; j < arch.nodes.length; j += 1) {
        const a = arch.nodes[i];
        const b = arch.nodes[j];
        const apart = (a.x + M.NODE_W <= b.x) || (b.x + M.NODE_W <= a.x)
          || (a.y + M.NODE_H <= b.y) || (b.y + M.NODE_H <= a.y);
        assert.ok(apart, `${arch.id}: ${a.id} and ${b.id} overlap`);
      }
    }
  }
});

test('every component is drawn inside the canvas the page declares', () => {
  const html = M.ARCHITECTURES;
  for (const arch of html) {
    for (const node of arch.nodes) {
      assert.ok(node.x >= 0 && node.x + M.NODE_W <= 560, `${arch.id}/${node.id} overflows in x`);
      assert.ok(node.y >= 0 && node.y + M.NODE_H <= 400, `${arch.id}/${node.id} overflows in y`);
    }
  }
});

test('an arrowhead is a triangle whose tip sits on the segment’s end', () => {
  const points = M.arrowHead(0, 0, 0, 20, 8).split(' ').map((p) => p.split(',').map(Number));
  assert.equal(points.length, 3);
  assert.deepEqual(points[0], [0, 20]);
  /* The base sits back along the segment by the given size, and is symmetric about it. */
  assert.equal(points[1][1], 12);
  assert.equal(points[2][1], 12);
  assert.equal(points[1][0], -points[2][0]);
  assert.ok(Math.abs(points[1][0]) > 0, 'the triangle has no width');
});

test('a deployment-unit box encloses every component it names', () => {
  for (const arch of M.ARCHITECTURES) {
    for (const unit of arch.deploymentUnits) {
      const box = M.boundsOf(arch.id, unit.nodes, 10);
      assert.ok(box, `${arch.id}/${unit.id} produced no bounds`);
      for (const id of unit.nodes) {
        const node = M.nodeById(arch.id, id);
        assert.ok(node.x >= box.x && node.x + M.NODE_W <= box.x + box.width,
          `${arch.id}/${unit.id} does not enclose ${id} horizontally`);
        assert.ok(node.y >= box.y && node.y + M.NODE_H <= box.y + box.height,
          `${arch.id}/${unit.id} does not enclose ${id} vertically`);
      }
    }
  }
});

test('deployment units partition every component exactly once', () => {
  for (const arch of M.ARCHITECTURES) {
    const covered = arch.deploymentUnits.flatMap((u) => u.nodes);
    assert.equal(new Set(covered).size, covered.length,
      `${arch.id} places a component in two deployment units`);
    assert.deepEqual(covered.slice().sort(), arch.nodes.map((n) => n.id).sort(),
      `${arch.id}'s deployment units do not cover its components`);
  }
});

test('only the extraction permits an independent laboratory release, and it is the only multi-service one', () => {
  assert.equal(M.architectureById('retain').ownership.independentDeployment, false);
  assert.equal(M.architectureById('modular').ownership.independentDeployment, false);
  assert.equal(M.architectureById('services').ownership.independentDeployment, true);
  /* And the capability follows from the structure rather than being asserted beside it: the two
     policy components are in separate deployment units only in the extraction. */
  for (const archId of M.ARCHITECTURE_IDS) {
    const arch = M.architectureById(archId);
    const unitOf = (id) => arch.deploymentUnits.find((u) => u.nodes.includes(id)).id;
    const policies = M.nodesWithRole(archId, 'policy');
    const separated = unitOf(policies[0]) !== unitOf(policies[1]);
    assert.equal(separated, arch.ownership.independentDeployment,
      `${archId}: the independent-deployment flag disagrees with the deployment units`);
  }
});
