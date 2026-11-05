/* test-worker-protocol.mjs — the message contract between the page and its worker.
 *
 * The worker is built out of the page's own engine script element plus a protocol function, with
 * one line of prefix reconciling `window` and `self`. That assembly is the thing most likely to
 * break silently: it is text concatenation, it only runs in a browser, and when it is wrong the
 * symptom is a panel that never updates rather than an error anyone sees.
 *
 * So the protocol is exercised HERE, in Node, against a fake `self`. The code under test is the
 * same text the page ships — read out of index.html, not copied — which means a change to the
 * engine's namespace or to the message shapes fails on every machine rather than only on one with
 * a browser installed.
 *
 * What this file cannot cover, and browser_test.py therefore must: that an expensive match leaves
 * the interface responsive, and that destroying a worker really frees the page so a fresh one
 * serves the next run.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readDemoHtml, extractEngineSource, extractWorkerPrefix, extractWorkerProtocolSource, buildWorkerSource, spawnFakeWorker, cfg } from './harness.mjs';

const html = readDemoHtml();

/* --- assembly ------------------------------------------------------------------------------- */

test('the page declares the worker prefix that reconciles window with self', () => {
  /* In a worker there is no `window`, and the engine publishes its namespace there. One line
     bridges the two, and it must be exactly that — anything else and the engine would either throw
     on load or publish somewhere the protocol does not look. */
  assert.equal(extractWorkerPrefix(html), 'var window = self;\n');
});

test('the worker source is the engine, verbatim, plus the protocol', () => {
  const source = buildWorkerSource(html);
  assert.ok(source.startsWith('var window = self;\n'), 'the prefix is not first');
  assert.ok(source.includes(extractEngineSource(html)),
    'the worker does not carry the engine verbatim — it has acquired a second copy');
  assert.ok(source.includes('self.onmessage'), 'the worker installs no message handler');
  assert.ok(source.trimEnd().endsWith('();'), 'the protocol is never invoked');
});

test('the protocol function closes over nothing from the page', () => {
  /* Its TEXT is what travels, so a reference to a page-scope variable would become an undefined
     identifier inside the worker — and the failure would surface as silence. */
  const fn = extractWorkerProtocolSource(html);
  for (const pageOnly of ['ui.', 'run.', '$(', 'R.BUDGET', 'window.', 'document']) {
    assert.equal(fn.includes(pageOnly), false,
      `the worker protocol references page scope: ${pageOnly}`);
  }
  /* It reaches the model through `self`, which is the only global a worker has. */
  assert.match(fn, /self\.ReDoS/);
  assert.match(fn, /self\.performance\.now/);
});

test('the page builds the worker from the live document, not from a second copy of the engine', () => {
  assert.match(html, /document\.getElementById\('redos-engine'\)\.textContent/);
  /* Exactly one engine script element, or "the engine" would be ambiguous. */
  assert.equal((html.match(/<script id="redos-engine">/g) || []).length, 1);
});

test('the worker is delivered as a blob, so the page stays one file', () => {
  assert.match(html, /URL\.createObjectURL/);
  assert.match(html, /new Blob\(\[buildWorkerSource\(\)\]/);
  assert.match(html, /new Worker\(workerUrl\(\)\)/);
});

/* --- the live protocol ---------------------------------------------------------------------- */

test('the worker announces itself as ready on load', () => {
  const w = spawnFakeWorker();
  assert.deepEqual(w.sent, [{ type: 'ready' }]);
});

test('the engine is available inside the worker under the name it publishes', () => {
  const w = spawnFakeWorker();
  assert.ok(w.published, 'the engine did not publish into the worker global');
  assert.equal(typeof w.published.measureTrial, 'function');
});

test('a ping is answered with the same token', () => {
  const w = spawnFakeWorker();
  assert.deepEqual(w.send({ type: 'ping', token: 17 }), [{ type: 'pong', token: 17 }]);
});

test('a measure message returns one result carrying its token', () => {
  const w = spawnFakeWorker();
  const out = w.send({
    type: 'measure',
    token: 3,
    spec: { experimentId: 'quadratic', length: 500, budgetMs: 100 },
  });
  assert.equal(out.length, 1, `the worker sent ${out.length} messages`);
  assert.equal(out[0].type, 'result');
  assert.equal(out[0].token, 3, 'the token did not come back');
  const r = out[0].result;
  assert.equal(r.experimentId, cfg('quadratic'));
  assert.equal(r.length, 500);
  assert.equal(r.inputLength, 501);
  assert.equal(r.matchedAsExpected, true);
  assert.ok(Number.isFinite(r.msPerExecution));
});

test('the worker measures with its OWN clock, so the result is real timing', () => {
  const w = spawnFakeWorker();
  const out = w.send({
    type: 'measure',
    token: 1,
    spec: { experimentId: 'exponential', length: 16, budgetMs: 250 },
  });
  assert.ok(out[0].result.totalMs > 0, 'the worker reported zero elapsed time');
});

test('a warmup message returns a warmed acknowledgement', () => {
  const w = spawnFakeWorker();
  const out = w.send({
    type: 'warmup', token: 9, experimentId: 'safe', options: { ms: 5, repeats: 20 },
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'warmed');
  assert.equal(out[0].token, 9);
  assert.equal(out[0].warm.experimentId, 'safe');
  assert.ok(out[0].warm.repeats >= 1);
});

test('the result the worker sends is structured-clone safe', () => {
  /* It crosses a thread boundary by being cloned, and a function or a RegExp on the result would
     throw a DataCloneError in a real worker — in Node it would pass silently, which is exactly the
     kind of difference this test exists to remove. */
  const w = spawnFakeWorker();
  const out = w.send({
    type: 'measure', token: 1, spec: { experimentId: 'ordinary', length: 500, budgetMs: 50 },
  });
  assert.doesNotThrow(() => structuredClone(out[0]));
  for (const [key, value] of Object.entries(out[0].result)) {
    assert.ok(value === null || ['number', 'string', 'boolean'].includes(typeof value),
      `result.${key} is a ${typeof value}, which may not survive the thread boundary`);
  }
});

/* --- failure handling ----------------------------------------------------------------------- */

test('an unknown message type is reported, not ignored', () => {
  const w = spawnFakeWorker();
  const out = w.send({ type: 'interrogate', token: 5 });
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'error');
  assert.equal(out[0].token, 5);
  assert.match(out[0].message, /unknown message type: interrogate/);
});

test('a throwing trial comes back as an error with its token, not as silence', () => {
  /* The page arms a deadline per message and clears it on reply. A swallowed exception would leave
     the page waiting, the deadline would fire, and a code defect would be presented to the reader
     as an expensive regular expression. Converting it to a reported error is what keeps the two
     distinguishable. */
  const w = spawnFakeWorker();
  const out = w.send({ type: 'measure', token: 2, spec: { experimentId: 'nope', length: 10 } });
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'error');
  assert.equal(out[0].token, 2);
  assert.match(out[0].message, /unknown experiment/);
});

test('a malformed message does not take the worker down', () => {
  const w = spawnFakeWorker();
  assert.doesNotThrow(() => w.send(undefined));
  assert.doesNotThrow(() => w.send({}));
  /* …and it still serves the next real message. */
  const out = w.send({ type: 'ping', token: 1 });
  assert.deepEqual(out, [{ type: 'pong', token: 1 }]);
});

/* --- the budget, as the page wires it ------------------------------------------------------- */

test('the page arms a deadline before posting and clears it on reply', () => {
  /* Order matters: arming after the post leaves a window in which an immediately-expensive match
     has no deadline at all. */
  const armIndex = html.indexOf('armDeadline(token);');
  const postIndex = html.indexOf("run.worker.postMessage({ type: 'measure'");
  assert.ok(armIndex > 0 && postIndex > 0, 'the measure path could not be located');
  assert.ok(armIndex < postIndex, 'the deadline is armed after the message is posted');
  assert.match(html, /clearDeadline\(\);/);
});

test('the deadline handler destroys the worker and records a termination', () => {
  const start = html.indexOf('function onDeadline(');
  assert.ok(start > 0, 'there is no deadline handler');
  const body = html.slice(start, start + 1400);
  assert.match(body, /destroyWorker\(\)/, 'the deadline does not destroy the worker');
  assert.match(body, /recordTermination/, 'the termination is not recorded in the model');
  assert.match(body, /ui\.terminations \+= 1/, 'the termination is not counted for the reader');
  assert.match(body, /token !== run\.token/, 'a stale deadline could fire against a live trial');
});

test('destroying the worker advances the token, invalidating any reply in flight', () => {
  const start = html.indexOf('function destroyWorker(');
  const body = html.slice(start, start + 600);
  assert.match(body, /terminate\(\)/);
  assert.match(body, /run\.worker = null/, 'the reference is kept after termination');
  assert.match(body, /run\.token \+= 1/, 'a destroyed worker’s reply could still be accepted');
});

test('the page creates a worker lazily, so the run after a termination gets a fresh one', () => {
  const start = html.indexOf('function ensureWorker(');
  const body = html.slice(start, start + 800);
  assert.match(body, /if \(run\.worker\) return true/, 'a worker is recreated while one exists');
  assert.match(body, /new Worker\(/);
  assert.match(body, /ui\.workersCreated \+= 1/, 'worker creations are not counted for the reader');
});

test('a browser that refuses workers disables the run controls rather than falling back', () => {
  /* Falling back to the page's own thread would run an uninterruptible match where the deadline
     cannot reach it, freezing the page outright — the very failure being demonstrated. */
  const start = html.indexOf('function markWorkerUnavailable(');
  const body = html.slice(start, start + 1400);
  assert.match(body, /disabled = true/, 'the run controls stay live without a worker');
  assert.match(body, /cannot be interrupted/, 'the reader is not told why it is disabled');
  assert.equal(/onThisThread|runOnMainThread|fallbackToMainThread/.test(html), false,
    'a main-thread fallback exists');
});
