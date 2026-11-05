/* test-cost.mjs — the horizon cost model, and the hard constraint the brief sets on it.
 *
 * Two things are pinned here above all others.
 *
 *   1. THE LECTURE'S TWO ILLUSTRATIVE TABLES. At no future changes and medium assurance the totals
 *      are 5 / 14 / 30 at an ordinary multiplier and 3.02 / 4.10 / 12.18 at a hundredth. A
 *      coefficient edit that stops reproducing them is a change to the lecture, not a refactor.
 *
 *   2. EXTRACTING SERVICES MUST NOT WIN FOR HAVING MORE COMPONENTS. Asserted by sweeping the whole
 *      parameter space rather than by spot-checking a setting, because a spot check cannot
 *      distinguish "never wins" from "does not win here".
 *
 * The totals are also re-derived in the harness straight from the closed-form expression the page
 * prints, so the printed formula cannot drift from the running arithmetic.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, withSettings, oneTimeOnly, totals, leader, expectedTotal } from './harness.mjs';

test('the one-time comparison reproduces the lecture’s ordinary-cost table', () => {
  const at = oneTimeOnly({ multiplierId: 'm1' });
  for (const [id, implementation, assurance, total] of [
    ['retain', 2, 3, 5], ['modular', 10, 4, 14], ['services', 18, 12, 30],
  ]) {
    const row = M.costBreakdown(id, at);
    assert.equal(row.implementationOnce, implementation, `${id} implementation`);
    assert.equal(row.assuranceOnce, assurance, `${id} assurance`);
    assert.equal(row.total, total, `${id} total`);
  }
});

test('the one-time comparison reproduces the lecture’s hundred-times-cheaper table', () => {
  const at = oneTimeOnly({ multiplierId: 'm001' });
  assert.equal(M.formatCost(M.costBreakdown('retain', at).total), '3.02');
  assert.equal(M.formatCost(M.costBreakdown('modular', at).total), '4.1');
  assert.equal(M.formatCost(M.costBreakdown('services', at).total), '12.18');
});

test('cheap implementation does not reorder the one-time comparison', () => {
  /* The lecture's point about its own two tables: the ordering survives a hundredfold discount. */
  for (const multiplierId of M.IMPLEMENTATION_MULTIPLIERS.map((m) => m.id)) {
    const at = oneTimeOnly({ multiplierId });
    const t = totals({ ...at });
    assert.ok(t.retain < t.modular, `at ${multiplierId}, retaining is no longer cheapest one-time`);
    assert.ok(t.modular < t.services, `at ${multiplierId}, the ordering changed`);
  }
});

test('every total agrees with the closed-form formula the page prints', () => {
  for (const multiplierId of M.IMPLEMENTATION_MULTIPLIERS.map((m) => m.id)) {
    for (const assuranceId of M.ASSURANCE_LEVELS.map((a) => a.id)) {
      for (const mixId of M.MIXES.map((m) => m.id)) {
        for (const changes of [0, 1, 7, 20, 100]) {
          for (const teams of [1, 2]) {
            const settings = withSettings({ multiplierId, assuranceId, mixId, changes, teams });
            for (const id of M.ARCHITECTURE_IDS) {
              const actual = M.costBreakdown(id, settings).total;
              const expected = expectedTotal(id, settings);
              assert.ok(Math.abs(actual - expected) < 1e-9,
                `${id} at ${multiplierId}/${assuranceId}/${mixId}/${changes}/${teams}: `
                + `engine ${actual}, formula ${expected}`);
            }
          }
        }
      }
    }
  }
});

test('the implementation multiplier scales implementation and leaves assurance alone', () => {
  const base = withSettings({ changes: 20, mixId: 'mixed' });
  for (const id of M.ARCHITECTURE_IDS) {
    const ordinary = M.costBreakdown(id, { ...base, multiplierId: 'm1' });
    const cheap = M.costBreakdown(id, { ...base, multiplierId: 'm001' });
    assert.equal(cheap.assuranceTotal, ordinary.assuranceTotal, `${id}: assurance moved`);
    assert.ok(Math.abs(cheap.implementationTotal - ordinary.implementationTotal / 100) < 1e-9,
      `${id}: implementation did not scale by the multiplier`);
  }
});

test('the assurance level scales assurance and leaves implementation alone', () => {
  const base = withSettings({ changes: 20, mixId: 'mixed' });
  for (const id of M.ARCHITECTURE_IDS) {
    const medium = M.costBreakdown(id, { ...base, assuranceId: 'medium' });
    const high = M.costBreakdown(id, { ...base, assuranceId: 'high' });
    assert.equal(high.implementationTotal, medium.implementationTotal, `${id}: implementation moved`);
    assert.ok(Math.abs(high.assuranceTotal - medium.assuranceTotal * 2) < 1e-9,
      `${id}: assurance did not scale by the level`);
  }
});

test('a longer horizon never lowers a total, and a zero horizon is the one-time cost alone', () => {
  for (const id of M.ARCHITECTURE_IDS) {
    let previous = -Infinity;
    for (const changes of [0, 1, 2, 5, 10, 20, 50, 100]) {
      const row = M.costBreakdown(id, withSettings({ changes, mixId: 'mixed' }));
      assert.ok(row.total >= previous, `${id}: the total fell from ${previous} at ${changes} changes`);
      previous = row.total;
      if (changes === 0) {
        assert.equal(row.total, row.implementationOnce + row.assuranceOnce);
        assert.equal(row.implementationRecurring, 0);
        assert.equal(row.assuranceRecurring, 0);
      }
    }
  }
});

test('a second team adds coordination cost, most to the structure with no boundaries', () => {
  const base = withSettings({ changes: 20, mixId: 'policy-only' });
  const added = {};
  for (const id of M.ARCHITECTURE_IDS) {
    const one = M.costBreakdown(id, { ...base, teams: 1 });
    const two = M.costBreakdown(id, { ...base, teams: 2 });
    assert.equal(one.coordinationPerChange, 0, `${id}: one team should carry no surcharge`);
    added[id] = two.total - one.total;
    assert.ok(added[id] > 0, `${id}: a second team added nothing`);
  }
  assert.ok(added.retain > added.modular, 'explicit boundaries should ease coordination');
  assert.ok(added.modular > added.services, 'separate deployables should ease it further');
});

test('expected change counts are integers that sum to the horizon, for every mix', () => {
  for (const mix of M.MIXES) {
    const shares = M.CHANGE_TYPE_IDS.reduce((sum, id) => sum + (mix.shares[id] || 0), 0);
    assert.ok(Math.abs(shares - 1) < 1e-9, `${mix.id}'s shares sum to ${shares}, not 1`);
    for (const n of [0, 1, 2, 3, 7, 12, 20, 33, 100, 200]) {
      const counts = M.horizonCounts(n, mix.id);
      let sum = 0;
      for (const id of M.CHANGE_TYPE_IDS) {
        assert.equal(counts[id], Math.floor(counts[id]), `${mix.id}/${n}: ${id} is not an integer`);
        assert.ok(counts[id] >= 0, `${mix.id}/${n}: ${id} is negative`);
        sum += counts[id];
      }
      assert.equal(sum, n, `${mix.id}: ${n} changes apportioned to ${sum}`);
    }
  }
});

test('apportionment is deterministic — the same input gives the same counts every time', () => {
  for (const mix of M.MIXES) {
    const first = M.horizonCounts(17, mix.id);
    for (let i = 0; i < 5; i += 1) {
      assert.deepEqual(M.horizonCounts(17, mix.id), first, `${mix.id} is not deterministic`);
    }
  }
});

test('a non-integer or negative horizon is floored rather than propagated', () => {
  assert.deepEqual(M.horizonCounts(-5, 'mixed'), M.horizonCounts(0, 'mixed'));
  assert.deepEqual(M.horizonCounts(7.9, 'policy-only'), M.horizonCounts(7, 'policy-only'));
});

/* --- the hard constraint ---------------------------------------------------------------------- */

test('EXTRACTING SERVICES NEVER LEADS ON COST ALONE — the whole parameter space', () => {
  /* The brief's §1 hard constraint. Swept rather than spot-checked: a spot check cannot tell
     "never wins" from "does not win at the setting I tried". */
  const sweep = M.sweepLeaders();
  assert.ok(sweep.combinations > 1000, `the sweep only covered ${sweep.combinations} combinations`);
  assert.deepEqual(sweep.servicesLeadsWithoutRequirement, [],
    'a setting with no independent-release requirement makes the extraction the cost leader');
});

test('whenever extracting services leads, it leads as the only eligible option', () => {
  const sweep = M.sweepLeaders();
  assert.ok(sweep.leaders.services > 0, 'the extraction never leads at all, which is also wrong');
  for (const record of sweep.servicesLeadsAtAll) {
    assert.equal(record.byRequirement, true,
      `the extraction led on price at ${JSON.stringify(record)}`);
    assert.equal(record.independentRelease, true);
  }
});

test('extracting services is dominated by the modular monolith at every horizon', () => {
  /* Stated as the crossover that does not exist, which is the form a reader can check. */
  for (const multiplierId of M.IMPLEMENTATION_MULTIPLIERS.map((m) => m.id)) {
    for (const assuranceId of M.ASSURANCE_LEVELS.map((a) => a.id)) {
      for (const mixId of M.MIXES.map((m) => m.id)) {
        for (const teams of [1, 2]) {
          const settings = withSettings({ multiplierId, assuranceId, mixId, teams });
          assert.equal(M.crossoverChanges('modular', 'services', settings), null,
            `the extraction repays against the modular monolith at `
            + `${multiplierId}/${assuranceId}/${mixId}/${teams} teams`);
        }
      }
    }
  }
});

test('more components does not mean more cost either — the model is not counting boxes', () => {
  /* The constraint's mirror image. If the ranking were driven by component count, the five-node
     architectures would be interchangeable; they are not, and the modular one wins on its
     coefficients rather than on its size. */
  assert.equal(M.architectureById('modular').nodes.length,
    M.architectureById('services').nodes.length);
  const t = totals({ changes: 20, mixId: 'policy-only' });
  assert.ok(t.modular < t.services,
    'two architectures of equal size should still be separated by their coefficients');
  assert.ok(M.architectureById('retain').nodes.length > M.architectureById('modular').nodes.length);
});

/* --- the requirement filter -------------------------------------------------------------------- */

test('the independent-release requirement excludes options before they are ranked', () => {
  const settings = withSettings({ changes: 20, mixId: 'mixed', teams: 2, independentRelease: true });
  const comparison = M.compareCosts(settings);
  assert.equal(comparison.verdict, 'only-option');
  assert.equal(comparison.leader.architecture, 'services');
  assert.deepEqual(comparison.excluded.map((r) => r.architecture).sort(), ['modular', 'retain']);
  /* And the instrument says which excluded option would have been cheaper, because that trade is
     the lesson rather than an embarrassment to hide. */
  assert.ok(comparison.cheaperButIneligible);
  assert.ok(comparison.cheaperButIneligible.total < comparison.leader.total);
});

test('with no requirement in force, nothing is excluded and all three are ranked', () => {
  const comparison = M.compareCosts(withSettings({ independentRelease: false }));
  assert.deepEqual(comparison.excluded, []);
  assert.equal(comparison.eligible.length, 3);
  assert.equal(comparison.cheaperButIneligible, null);
});

test('the ranking is sorted by total and led by its own first eligible row', () => {
  for (const changes of [0, 1, 12, 20, 50]) {
    for (const independentRelease of [false, true]) {
      const comparison = M.compareCosts(withSettings({ changes, independentRelease }));
      for (let i = 1; i < comparison.rows.length; i += 1) {
        assert.ok(comparison.rows[i - 1].total <= comparison.rows[i].total, 'rows are not sorted');
      }
      assert.equal(comparison.leader, comparison.eligible[0]);
    }
  }
});

test('a near-tie is reported as a tie rather than as a winner', () => {
  const comparison = M.compareCosts(withSettings({
    changes: 1, mixId: 'policy-only', multiplierId: 'm001', assuranceId: 'medium',
  }));
  assert.equal(comparison.verdict, 'too-close');
  assert.ok(comparison.margin < M.TIE_BAND);
  assert.ok(comparison.margin >= 0);
});

test('a clear win reports a margin wider than the near-tie band', () => {
  const comparison = M.compareCosts(withSettings({ changes: 20, mixId: 'policy-only' }));
  assert.equal(comparison.verdict, 'clear');
  assert.equal(comparison.leader.architecture, 'modular');
  assert.ok(comparison.margin >= M.TIE_BAND);
});

/* --- the three prediction conditions ------------------------------------------------------------ */

test('the three conditions give the answers the lecture expects at ordinary cost', () => {
  const at = { multiplierId: 'm1', assuranceId: 'medium' };
  assert.equal(M.conditionResult('c1', at).preferred, 'retain');
  assert.equal(M.conditionResult('c2', at).preferred, 'modular');
  assert.equal(M.conditionResult('c3', at).preferred, 'services');
});

test('the third condition is decided by a requirement, not by a price', () => {
  const result = M.conditionResult('c3', { multiplierId: 'm1', assuranceId: 'medium' });
  assert.equal(result.comparison.verdict, 'only-option');
  assert.ok(result.comparison.cheaperButIneligible,
    'the condition should surface that a cheaper option exists and cannot satisfy the requirement');
});

test('a hundredfold discount leaves two of the three conditions unmoved and the third a near-tie', () => {
  /* The experiment's finding, pinned. The first condition is the only one that moves, and it moves
     into the near-tie band — so the honest reading is that the model stops being able to separate
     retaining from modularizing, not that cheap implementation justified a restructuring. */
  const cheap = { multiplierId: 'm001', assuranceId: 'medium' };
  assert.equal(M.conditionResult('c2', cheap).preferred, 'modular');
  assert.equal(M.conditionResult('c3', cheap).preferred, 'services');
  const first = M.conditionResult('c1', cheap);
  assert.equal(first.comparison.verdict, 'too-close');
  assert.ok(first.comparison.margin < M.TIE_BAND);
});

test('the condition sweep reports which answers moved, and never invents one', () => {
  const unmoved = M.conditionSweep({ multiplierId: 'm1', assuranceId: 'medium' });
  assert.deepEqual(unmoved.moved, [], 'comparing the ordinary multiplier with itself moved an answer');
  const cheap = M.conditionSweep({ multiplierId: 'm001', assuranceId: 'medium' });
  assert.equal(cheap.moved.length, 1);
  assert.equal(cheap.moved[0].condition.id, 'c1');
  assert.equal(cheap.moved[0].from, 'retain');
  assert.equal(cheap.moved[0].to, 'modular');
});

test('cheap implementation never moves a condition towards extracting services', () => {
  for (const assuranceId of M.ASSURANCE_LEVELS.map((a) => a.id)) {
    for (const multiplierId of M.IMPLEMENTATION_MULTIPLIERS.map((m) => m.id)) {
      for (const moved of M.conditionSweep({ multiplierId, assuranceId }).moved) {
        assert.notEqual(moved.to, 'services',
          `at ${multiplierId}/${assuranceId}, ${moved.condition.id} moved to the extraction`);
      }
    }
  }
});

/* --- the crossover ----------------------------------------------------------------------------- */

test('cheap implementation brings the modularization crossover earlier, never later', () => {
  const base = withSettings({ mixId: 'policy-only', teams: 1, assuranceId: 'medium' });
  const ordinary = M.crossovers({ ...base, multiplierId: 'm1' });
  const cheap = M.crossovers({ ...base, multiplierId: 'm001' });
  assert.equal(ordinary.retainToModular, 4);
  assert.equal(cheap.retainToModular, 1);
  assert.ok(cheap.retainToModular < ordinary.retainToModular);
});

test('a crossover is the first horizon at which the candidate is no more expensive', () => {
  const base = withSettings({ mixId: 'policy-only', teams: 1, assuranceId: 'medium', multiplierId: 'm1' });
  const n = M.crossovers(base).retainToModular;
  const atCrossover = { ...base, changes: n };
  const justBefore = { ...base, changes: n - 1 };
  assert.ok(M.costBreakdown('modular', atCrossover).total
    <= M.costBreakdown('retain', atCrossover).total);
  assert.ok(M.costBreakdown('modular', justBefore).total
    > M.costBreakdown('retain', justBefore).total);
});

/* --- the sweep's own reporting ------------------------------------------------------------------ */

test('the sweep reports the shape of its instability, not only a percentage', () => {
  /* A stable-share percentage alone would stay green while the direction of every flip reversed. */
  const sweep = M.sweepLeaders();
  assert.deepEqual(sweep.orderingTransitionKeys, ['retain->modular']);
  assert.deepEqual(sweep.orderingChangesToServices, []);
  assert.deepEqual(sweep.orderingChangesSubstantive, [],
    'cheap implementation moved a preference the model could separate beforehand');
  assert.ok(sweep.orderingStableShare > 0.8);
  assert.ok(sweep.orderingChanges.length > 0,
    'no preference moves at all, which makes the experiment pointless — check the coefficients');
});

test('every leader the sweep records is one of the three architectures', () => {
  const sweep = M.sweepLeaders();
  const counted = M.ARCHITECTURE_IDS.reduce((sum, id) => sum + sweep.leaders[id], 0);
  assert.equal(counted, sweep.combinations);
  for (const id of M.ARCHITECTURE_IDS) {
    assert.ok(sweep.leaders[id] > 0, `${id} never leads anywhere in the sweep`);
  }
});

test('the sweep is deterministic', () => {
  const first = M.sweepLeaders();
  const second = M.sweepLeaders();
  assert.deepEqual(second.leaders, first.leaders);
  assert.equal(second.orderingChanges.length, first.orderingChanges.length);
});

/* --- formatting -------------------------------------------------------------------------------- */

test('costs format without trailing noise, and the lecture’s figures round-trip', () => {
  assert.equal(M.formatCost(5), '5');
  assert.equal(M.formatCost(14), '14');
  assert.equal(M.formatCost(30), '30');
  assert.equal(M.formatCost(3.02), '3.02');
  assert.equal(M.formatCost(4.1), '4.1');
  assert.equal(M.formatCost(12.18), '12.18');
  assert.equal(M.formatCost(0.105), '0.11');
});

test('a percentage with no value formats as a dash rather than as NaN', () => {
  assert.equal(M.formatPercent(null), '—');
  assert.equal(M.formatPercent(undefined), '—');
  assert.equal(M.formatPercent(Infinity), '—');
  assert.equal(M.formatPercent(0.43), '43%');
});
