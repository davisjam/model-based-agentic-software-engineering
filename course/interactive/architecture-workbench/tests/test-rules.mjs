/* test-rules.mjs — the architectural rule language: parsing, operand resolution, evaluation.
 *
 * The property that matters most here is the one a careless evaluator gets backwards: a rule that
 * does not apply to an architecture must report NOT APPLICABLE, never SATISFIED. A rule naming
 * `LabPolicy` says nothing about a structure that has no such component, and reporting that as a
 * pass is how a rule set silently stops enforcing anything after a rename.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { M, rule, verdict } from './harness.mjs';

test('the three documented rule forms parse and round-trip', () => {
  for (const text of [
    '[ HTTP API ] MUST NOT DEPEND ON [ Persistence ]',
    '[ LabPolicy ] MUST NOT DEPEND ON [ RoomPolicy ]',
    '[ BookingService ] MAY DEPEND ON [ Policy ]',
  ]) {
    const parsed = M.parseRule(text);
    assert.equal(parsed.error, undefined, `${text} did not parse`);
    assert.equal(M.formatRule(parsed.rule), text);
  }
});

test('brackets, spacing and case are all optional', () => {
  const canonical = '[ HTTP API ] MUST NOT DEPEND ON [ Persistence ]';
  for (const text of [
    'HTTP API MUST NOT DEPEND ON Persistence',
    '  [HTTP   API]   must not depend on   [Persistence]  ',
    '[HTTP API] Must Not Depend On [Persistence]',
  ]) {
    const parsed = M.parseRule(text);
    assert.equal(parsed.error, undefined, `${text} did not parse`);
    assert.equal(M.formatRule(parsed.rule), canonical, `${text} parsed to something else`);
  }
});

test('the parser rejects, rather than guesses, when it cannot read a rule', () => {
  for (const text of ['', '   ', 'HTTP API', 'HTTP API SHOULD AVOID Persistence',
    'MUST NOT DEPEND ON Persistence', 'HTTP API MUST NOT DEPEND ON']) {
    const parsed = M.parseRule(text);
    assert.equal(parsed.rule, undefined, `"${text}" should not have parsed`);
    assert.equal(typeof parsed.error, 'string');
    assert.ok(parsed.error.length > 0);
  }
});

test('MUST NOT REACH is not mistaken for a prefix of another relation', () => {
  assert.equal(rule('A MUST NOT REACH B').relation, 'must-not-reach');
  assert.equal(rule('A MUST NOT DEPEND ON B').relation, 'must-not-depend-on');
  assert.equal(rule('A MAY DEPEND ON B').relation, 'may-depend-on');
});

test('an operand resolves to a component before it resolves to a role', () => {
  /* `Persistence` names both a component and a role. The component is what a reader can see. */
  const inRetain = M.resolveOperand('retain', 'Persistence');
  assert.equal(inRetain.kind, 'component');
  assert.deepEqual(inRetain.ids, ['persistence']);
  /* In the extraction there is no such component, so it falls through to the role — which no
     component carries there, so the operand resolves to nothing. */
  const inServices = M.resolveOperand('services', 'Persistence');
  assert.equal(inServices.kind, 'role');
  assert.deepEqual(inServices.ids, []);
});

test('a role operand carries across all three architectures', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    const resolved = M.resolveOperand(archId, 'policy');
    assert.equal(resolved.kind, 'role');
    assert.equal(resolved.ids.length, 2, `${archId} does not have two policy components`);
  }
});

test('an unknown operand resolves to nothing and is reported as unknown', () => {
  const resolved = M.resolveOperand('retain', 'PaymentGateway');
  assert.equal(resolved.kind, 'unknown');
  assert.deepEqual(resolved.ids, []);
});

test('a rule naming an absent component reports not-applicable, never satisfied', () => {
  /* The headline property of this file. */
  assert.equal(verdict('retain', '[ LabPolicy ] MUST NOT DEPEND ON [ RoomPolicy ]').status,
    'not-applicable');
  assert.equal(verdict('services', '[ LabPolicy ] MUST NOT DEPEND ON [ RoomPolicy ]').status,
    'not-applicable');
  assert.equal(verdict('modular', '[ LabPolicy ] MUST NOT DEPEND ON [ RoomPolicy ]').status,
    'satisfied');
});

test('a not-applicable verdict explains which operand failed to resolve', () => {
  const result = verdict('retain', '[ LabPolicy ] MUST NOT DEPEND ON [ RoomPolicy ]');
  assert.match(result.reason, /LabPolicy/);
  assert.equal(result.violations.length, 0);
  assert.equal(result.applicablePairs, 0);
});

test('MUST NOT DEPEND ON checks a direct edge and nothing further', () => {
  /* In the retained structure the HTTP surface reaches persistence through booking, and the edge
     rule must still pass — that gap is the lesson the reachability rule exists to show. */
  const direct = verdict('retain', '[ HTTP API ] MUST NOT DEPEND ON [ Persistence ]');
  assert.equal(direct.status, 'satisfied');
  assert.ok(M.reachableFrom('retain', 'api').includes('persistence'));
});

test('MUST NOT REACH is violated wherever a path exists, and reports that path', () => {
  const result = verdict('retain', '[ HTTP API ] MUST NOT REACH [ storage ]');
  assert.equal(result.status, 'violated');
  assert.equal(result.violations.length, 2, 'both storage components are reachable');
  for (const violation of result.violations) {
    assert.ok(violation.path.length > 2, 'a reachability violation should report a real path');
    assert.equal(violation.path[0], 'api');
    for (let i = 0; i + 1 < violation.path.length; i += 1) {
      assert.ok(M.hasEdge('retain', violation.path[i], violation.path[i + 1]));
    }
  }
});

test('a reachability rule is strictly stronger than the matching edge rule, everywhere', () => {
  for (const archId of M.ARCHITECTURE_IDS) {
    assert.equal(verdict(archId, '[ HTTP API ] MUST NOT DEPEND ON [ storage ]').status, 'satisfied');
    assert.equal(verdict(archId, '[ HTTP API ] MUST NOT REACH [ storage ]').status, 'violated');
  }
});

test('MAY DEPEND ON behaves as an allowlist over the named source', () => {
  /* In the retained structure booking reaches persistence as well as the two policies, so
     permitting only policy makes the persistence edge a violation. */
  const retain = verdict('retain', '[ BookingService ] MAY DEPEND ON [ Policy ]');
  assert.equal(retain.status, 'violated');
  assert.deepEqual(retain.violations.map((v) => `${v.from}->${v.to}`), ['booking->persistence']);
  assert.equal(retain.applicablePairs, 3, 'booking has three outgoing dependencies');

  for (const archId of ['modular', 'services']) {
    assert.equal(verdict(archId, '[ BookingService ] MAY DEPEND ON [ Policy ]').status, 'satisfied');
  }
});

test('two permission rules on one source union their allowances', () => {
  const policy = rule('[ BookingService ] MAY DEPEND ON [ Policy ]');
  const storage = rule('[ BookingService ] MAY DEPEND ON [ Persistence ]');
  const alone = M.evaluateRule('retain', policy, [policy]);
  const together = M.evaluateRule('retain', policy, [policy, storage]);
  assert.equal(alone.status, 'violated');
  assert.equal(together.status, 'satisfied',
    'the second permission should discharge the violation the first could not');
});

test('a disabled permission rule does not widen the allowlist', () => {
  const policy = rule('[ BookingService ] MAY DEPEND ON [ Policy ]');
  const storage = rule('[ BookingService ] MAY DEPEND ON [ Persistence ]');
  storage.enabled = false;
  const report = M.evaluateRules('retain', [policy, storage]);
  assert.equal(report.results[0].status, 'violated');
  assert.equal(report.results[1].status, 'off');
});

test('a permission rule on a component with no outgoing dependency is satisfied, not violated', () => {
  const result = verdict('retain', '[ Database ] MAY DEPEND ON [ Policy ]');
  assert.equal(result.status, 'satisfied');
  assert.equal(result.applicablePairs, 0);
  assert.match(result.reason, /no outgoing dependency/);
});

test('the default rule set finds the violations the model claims, per architecture', () => {
  const rules = M.cloneDefaultRules();
  const counts = {};
  for (const archId of M.ARCHITECTURE_IDS) counts[archId] = M.evaluateRules(archId, rules).violationCount;
  assert.deepEqual(counts, { retain: 3, modular: 0, services: 2 });
});

test('the modular monolith is the only structure that satisfies every default rule', () => {
  const rules = M.cloneDefaultRules();
  for (const archId of M.ARCHITECTURE_IDS) {
    const report = M.evaluateRules(archId, rules);
    assert.equal(report.violatedRules === 0, archId === 'modular',
      `${archId}: violatedRules=${report.violatedRules}`);
  }
});

test('the extraction is NOT rule-clean — it does not win for having more components', () => {
  /* The §1 hard constraint, approached from the rules rather than from the cost model. */
  const report = M.evaluateRules('services', M.cloneDefaultRules());
  assert.ok(report.violationCount > 0,
    'the extraction must not come out cleaner than the modular monolith');
  assert.ok(report.violationCount > M.evaluateRules('modular', M.cloneDefaultRules()).violationCount);
});

test('the reachability rule ships disabled, so the default report is not uniformly red', () => {
  const reach = M.DEFAULT_RULES.filter((r) => r.relation === 'must-not-reach');
  assert.ok(reach.length > 0, 'no reachability rule is offered at all');
  for (const r of reach) assert.equal(r.enabled, false, `${M.formatRule(r)} ships enabled`);
});

test('every default rule parses as the syntax the page documents', () => {
  for (const r of M.DEFAULT_RULES) {
    const text = M.formatRule(r);
    const parsed = M.parseRule(text);
    assert.equal(parsed.error, undefined, `${text} is not expressible in the page's own syntax`);
    assert.equal(parsed.rule.relation, r.relation);
  }
});

test('cloneDefaultRules hands out an independent copy each time', () => {
  const first = M.cloneDefaultRules();
  first[0].enabled = !first[0].enabled;
  first.pop();
  const second = M.cloneDefaultRules();
  assert.equal(second.length, M.DEFAULT_RULES.length);
  assert.equal(second[0].enabled, M.DEFAULT_RULES[0].enabled);
});

test('a violation’s reported edges are real edges of the architecture', () => {
  const report = M.evaluateRules('retain', M.cloneDefaultRules());
  assert.ok(report.violatingEdges.length > 0);
  for (const key of report.violatingEdges) {
    const [from, to] = key.split('->');
    assert.ok(M.hasEdge('retain', from, to), `${key} is not an edge of the retained structure`);
  }
  for (const id of report.violatingNodes) {
    assert.ok(M.nodeById('retain', id), `${id} is not a component of the retained structure`);
  }
});

test('a student-introduced rule is evaluated exactly like a default one', () => {
  /* The editor's whole purpose: introduce a violation deliberately and see it. */
  const introduced = rule('[ Approval ] MUST NOT DEPEND ON [ Database ]');
  const result = M.evaluateRule('retain', introduced, [introduced]);
  assert.equal(result.status, 'violated');
  assert.deepEqual(result.violations.map((v) => `${v.from}->${v.to}`), ['approval->db']);
});

test('the three relations each describe themselves, so the interface need not', () => {
  assert.equal(M.RELATIONS.length, 3);
  for (const relation of M.RELATIONS) {
    assert.ok(['prohibition', 'permission'].includes(relation.kind));
    assert.ok(['direct', 'transitive'].includes(relation.scope));
    assert.ok(relation.describe.length > 10, `${relation.id} has no description`);
    assert.equal(M.relationById(relation.id), relation);
  }
});

test('three of the five obligations are declared undecidable from the graph', () => {
  /* The safeguard against reading a clean rule report as a clean architecture. */
  assert.equal(M.OBLIGATIONS.length, 5);
  const checkable = M.OBLIGATIONS.filter((o) => o.checkable);
  const not = M.OBLIGATIONS.filter((o) => !o.checkable);
  assert.equal(checkable.length, 2);
  assert.equal(not.length, 3);
  for (const o of not) {
    assert.ok(o.why && o.why.length > 20, `${o.id} is flagged undecidable without saying why`);
  }
  for (const o of checkable) {
    assert.ok(M.DEFAULT_RULES.some((r) => r.id === o.ruleId),
      `${o.id} cites rule ${o.ruleId}, which is not in the default set`);
  }
});
