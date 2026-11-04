/* test-threat.mjs — the threat model and the mitigation assessment.
 *
 * Two confusions are easy for a student to carry out of this lecture, and the course is explicit
 * that both must be made explicit in the interface:
 *
 *   - rate limiting alone does not eliminate the vulnerability, because a single request may
 *     consume substantial resources; and
 *   - moving the computation into a worker protects the browser interface but does not make the
 *     regular expression efficient.
 *
 * Both are encoded in the mitigation table rather than left to prose that a later edit can smooth
 * away, so both are testable. That is the point of this file: a claim written only into a paragraph
 * has no gate on it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { R } from './harness.mjs';

/* --- the threat model ----------------------------------------------------------------------- */

test('the threat model carries the course\'s seven elements, in order', () => {
  assert.deepEqual(R.THREAT_MODEL.map((r) => r.element), [
    'Asset', 'Adversary', 'Capability', 'Entry point', 'Vulnerability', 'Threat',
    'Security objective',
  ]);
});

test('each element names the ReDoS instance the lecture uses', () => {
  const byElement = Object.fromEntries(R.THREAT_MODEL.map((r) => [r.element, r.value]));
  assert.equal(byElement.Asset, 'Service availability');
  assert.equal(byElement.Adversary, 'Unauthenticated API client');
  assert.equal(byElement.Capability, 'Controls search input');
  assert.equal(byElement['Entry point'], 'Search endpoint');
  assert.equal(byElement.Vulnerability, 'Superlinear regex matching');
  assert.equal(byElement.Threat, 'Resource exhaustion through crafted inputs');
  assert.equal(byElement['Security objective'], 'Bound computation per request');
});

test('the security objective is the axis the mitigations are judged on', () => {
  /* The table and the assessment must agree about what they are measuring, or the panel grades
     answers against a standard it never stated. */
  const objective = R.THREAT_MODEL.find((r) => r.element === 'Security objective').value;
  assert.equal(R.assessMitigations([]).objective, objective);
});

/* --- the mitigation table ------------------------------------------------------------------- */

test('five mitigations are offered, each with a detail and a caveat', () => {
  assert.deepEqual(R.MITIGATIONS.map((m) => m.id),
    ['replace', 'engine', 'restrict', 'isolate', 'admission']);
  for (const m of R.MITIGATIONS) {
    assert.ok(m.label && m.label.length > 15, `${m.id} has no readable label`);
    assert.ok(m.detail && m.detail.length > 40, `${m.id} has no detail`);
    assert.ok(m.caveat && m.caveat.length > 20, `${m.id} has no caveat`);
    assert.ok(['yes', 'conditional', 'no'].includes(m.bounds), `${m.id} bounds=${m.bounds}`);
  }
});

test('an unknown mitigation is refused rather than ignored', () => {
  assert.throws(() => R.findMitigation('firewall'), /unknown mitigation/);
  assert.throws(() => R.assessMitigations(['firewall']), /unknown mitigation/);
});

/* --- the two distinctions the course insists on --------------------------------------------- */

test('rate limiting alone does not meet the objective, and says why', () => {
  const a = R.assessMitigations(['admission']);
  assert.equal(a.meetsObjective, false);
  assert.equal(a.removesVulnerability, false);
  assert.match(a.warnings.join(' '), /single request may\s+consume substantial resources/,
    `warnings were: ${a.warnings.join(' | ')}`);
});

test('the rate-limit option itself records that it bounds nothing per request', () => {
  assert.equal(R.findMitigation('admission').bounds, 'no');
  assert.match(R.findMitigation('admission').caveat, /does not eliminate the vulnerability/);
});

test('isolation meets the objective WITHOUT removing the vulnerability', () => {
  /* The worker distinction, stated as data. Isolation bounds what one request can consume, so the
     objective is met; the expression is still superlinear, so the vulnerability is still there. A
     student who conflates the two has got the most tempting answer wrong. */
  const a = R.assessMitigations(['isolate']);
  assert.equal(a.meetsObjective, true);
  assert.equal(a.removesVulnerability, false);
  assert.match(a.warnings.join(' '), /bounds the damage, not the cost/);
});

test('the isolation caveat insists the limit be enforceable, not cooperative', () => {
  /* The page is itself an instance: a Web Worker cannot be asked to stop matching, so the limit is
     enforced by destroying it. A caveat that omitted this would describe a control the page does
     not implement. */
  assert.match(R.findMitigation('isolate').caveat, /ENFORCEABLE/);
  assert.match(R.findMitigation('isolate').caveat, /cooperative check/);
});

test('isolation paired with a real fix draws no damage-versus-cost warning', () => {
  const a = R.assessMitigations(['isolate', 'replace']);
  assert.equal(a.removesVulnerability, true);
  assert.equal(a.warnings.length, 0, `warnings: ${a.warnings.join(' | ')}`);
});

/* --- the remaining options ------------------------------------------------------------------ */

test('replacing the expression removes the vulnerability and meets the objective', () => {
  const a = R.assessMitigations(['replace']);
  assert.equal(a.meetsObjective, true);
  assert.equal(a.removesVulnerability, true);
  assert.deepEqual(a.warnings, []);
});

test('an engine with complexity guarantees also removes the vulnerability', () => {
  const a = R.assessMitigations(['engine']);
  assert.equal(a.meetsObjective, true);
  assert.equal(a.removesVulnerability, true);
  assert.match(R.findMitigation('engine').caveat, /backreferences and lookaround|declines some/);
});

test('a length restriction is conditional, and the condition is stated', () => {
  const a = R.assessMitigations(['restrict']);
  assert.equal(a.meetsObjective, false, 'a conditional control was graded as sufficient');
  assert.equal(a.conditionalOnly, true);
  assert.match(a.warnings.join(' '), /small enough/);
  assert.match(R.findMitigation('restrict').caveat, /not a security control/);
});

test('the length-restriction detail distinguishes the quadratic case from the exponential one', () => {
  /* The same cap is adequate for one and useless for the other, which is the reason the two
     experiments have such different input ranges. */
  const d = R.findMitigation('restrict').detail;
  assert.match(d, /quadratic/);
  assert.match(d, /exponential/);
});

/* --- the assessment as a whole -------------------------------------------------------------- */

test('selecting nothing is graded as unmet, with a reason', () => {
  const a = R.assessMitigations([]);
  assert.equal(a.meetsObjective, false);
  assert.equal(a.warnings.length, 1);
  assert.match(a.warnings[0], /Nothing selected/);
  assert.deepEqual(a.selected, []);
});

test('the assessment echoes exactly the selection it was given', () => {
  const a = R.assessMitigations(['engine', 'admission']);
  assert.deepEqual(a.selected, ['engine', 'admission']);
  assert.equal(a.meetsObjective, true, 'a sufficient control was cancelled by an insufficient one');
});

test('the assessment does not mutate its argument', () => {
  const chosen = ['isolate'];
  R.assessMitigations(chosen);
  assert.deepEqual(chosen, ['isolate']);
});

test('a missing argument is treated as an empty selection, not as a crash', () => {
  assert.equal(R.assessMitigations().meetsObjective, false);
  assert.equal(R.assessMitigations(null).meetsObjective, false);
});

test('exactly one mitigation is marked conditional, so the axis stays legible', () => {
  const byBounds = (v) => R.MITIGATIONS.filter((m) => m.bounds === v).map((m) => m.id);
  assert.deepEqual(byBounds('conditional'), ['restrict']);
  assert.deepEqual(byBounds('no'), ['admission']);
  assert.deepEqual(byBounds('yes'), ['replace', 'engine', 'isolate']);
});
