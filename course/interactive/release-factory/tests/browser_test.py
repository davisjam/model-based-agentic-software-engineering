#!/usr/bin/env python3
"""Drive a real browser over the simulator, from file:// AND from the served site.

    python3 course/interactive/release-factory/tests/browser_test.py
    python3 .../browser_test.py --browser firefox
    python3 .../browser_test.py --browser chromium --browser firefox --serve

A browser answers questions Node cannot: do the four canvases actually paint, does any request
leave the page, does the layout survive a projector's 1920x1080 and a laptop's 1280x800, do the
keyboard shortcuts reach the model, and does axe-core find anything. Python because this
repository's tooling is Python and its no-shell policy sends a driver script here rather than to a
`.sh`.

With `--serve` the script builds nothing: it serves the simulator's own directory over HTTP from a
stdlib `http.server` thread, which exercises the served-over-http path that `file://` cannot.

Exit 0 when every check passes, 1 on a failure, 2 when no browser could be launched — so a runner
without Playwright reports "skipped" rather than red, matching this repo's skip-if-absent posture
for the axe and html-validate tiers.

Playwright and axe-core are DEV tools on the author's machine, exactly as they already are for the
sibling simulators. The published page gains no dependency from any of this.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import os
import socket
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
SIMULATOR_DIR = os.path.dirname(HERE)
SIMULATOR = os.path.join(SIMULATOR_DIR, 'index.html')
REPO_ROOT = os.path.abspath(os.path.join(SIMULATOR_DIR, '..', '..', '..'))
AXE_SOURCE = os.path.join(REPO_ROOT, 'node_modules', 'axe-core', 'axe.min.js')

failures: list[str] = []


def check(name: str, ok: bool, detail: str = '') -> None:
    if not ok:
        failures.append(name)
    print(f"  {'PASS' if ok else 'FAIL'}  {name}" + (f' — {detail}' if detail else ''))


def free_port() -> int:
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return int(s.getsockname()[1])


def serve_simulator() -> str:
    """Serve the simulator's own directory; returns its base URL. Daemon thread, dies with us."""
    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=SIMULATOR_DIR)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{port}/index.html'


# --------------------------------------------------------------------------------------------
# Individual checks
# --------------------------------------------------------------------------------------------

def check_no_network(label: str, requests: list[str]) -> None:
    """The page must issue no request beyond its own document.

    This is the consequence the packaging tier's rules exist to produce. Both are kept: the text
    rules say WHY a request could appear, this says whether one did.
    """
    external = [u for u in requests if not u.startswith('file://') and '127.0.0.1' not in u]
    check(f'{label}: no network request leaves the page', not external, ', '.join(external[:3]))


def canvas_ink(page, element_id: str) -> int:
    return page.evaluate(
        """(id) => {
             const c = document.getElementById(id);
             if (!c) return -1;
             const ctx = c.getContext('2d');
             const d = ctx.getImageData(0, 0, c.width, c.height).data;
             let n = 0;
             for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n += 1;
             return n;
           }""",
        element_id,
    )


def check_canvases_paint(page, label: str) -> None:
    for element_id in ('c-factory', 'c-backlog', 'c-ledger', 'c-sweep'):
        ink = canvas_ink(page, element_id)
        check(f'{label}: {element_id} paints', ink > 500, f'{ink} opaque pixels')


def snapshot(page) -> dict:
    return page.evaluate('window.releaseFactoryUi.snapshot()')


def config(page) -> dict:
    return page.evaluate('window.releaseFactoryUi.config()')


def press_segment(page, group_id: str, label_fragment: str) -> None:
    page.click(f'#{group_id} button:has-text("{label_fragment}")')


def check_engine_is_live(page) -> None:
    version = page.evaluate('window.ReleaseFactory && window.ReleaseFactory.VERSION')
    check('the engine is published to the page', bool(version), f'version {version}')
    surface = page.evaluate('typeof window.releaseFactoryUi')
    check('the interface exposes its test surface', surface == 'object', surface)


def check_self_tests(page) -> None:
    page.click('#help summary')
    page.click('#btn-selftest')
    page.wait_for_timeout(300)
    text = page.inner_text('#selftest-out')
    result = page.evaluate('window.ReleaseFactory.runSelfTests()')
    check('the in-page self-tests all pass',
          result['failed'] == 0 and result['passed'] == result['total'],
          f"{result['passed']}/{result['total']}")
    check('the self-test output reaches the page', 'self-tests passed' in text, text[:60])


def check_controls_drive_the_model(page) -> None:
    """Each of the five primary controls must reach the engine and reset the factory."""
    page.click('#btn-90')
    page.wait_for_timeout(200)
    before = snapshot(page)
    check('the factory runs', before['deployments']['total'] > 10,
          f"{before['deployments']['total']} deployments in 90 days")

    press_segment(page, 'seg-depth', 'Smoke')
    page.wait_for_timeout(120)
    after = config(page)
    reset = snapshot(page)
    check('test depth reaches the model', after['testDepth'] == 'smoke', after['testDepth'])
    check('changing a policy resets the factory', reset['days'] == 0, f"{reset['days']} days")

    press_segment(page, 'seg-admission', 'Advisory')
    page.wait_for_timeout(120)
    check('admission policy reaches the model', config(page)['admissionPolicy'] == 'advisory')

    press_segment(page, 'seg-strategy', 'Canary')
    page.wait_for_timeout(120)
    check('release strategy reaches the model', config(page)['releaseStrategy'] == 'canary')

    press_segment(page, 'seg-batch', '10')
    page.wait_for_timeout(120)
    check('batch size reaches the model', config(page)['batchSize'] == 10)

    press_segment(page, 'seg-arrival', 'Low')
    page.wait_for_timeout(120)
    check('arrival rate reaches the model', config(page)['arrivalRate'] == 'low')

    page.fill('#arrival-num', '137')
    page.dispatch_event('#arrival-num', 'change')
    page.wait_for_timeout(120)
    numeric = config(page)
    check('a numeric arrival rate supersedes the named one',
          numeric['arrivalRatePerDay'] == 137 and numeric['arrivalRate'] is None,
          json.dumps({'perDay': numeric['arrivalRatePerDay'], 'named': numeric['arrivalRate']}))

    page.click('#btn-defaults')
    page.wait_for_timeout(150)
    restored = config(page)
    check('Defaults restores every control',
          restored['testDepth'] == 'thorough' and restored['batchSize'] == 1
          and restored['releaseStrategy'] == 'immediate'
          and restored['admissionPolicy'] == 'required'
          and restored['arrivalRatePerDay'] is None,
          json.dumps({k: restored[k] for k in
                      ('testDepth', 'batchSize', 'releaseStrategy', 'admissionPolicy')}))


def check_run_pause_step(page) -> None:
    page.click('#btn-reset')
    page.wait_for_timeout(100)
    start = page.evaluate('window.releaseFactoryUi.eventCount()')
    page.click('#btn-step')
    page.wait_for_timeout(100)
    stepped = page.evaluate('window.releaseFactoryUi.eventCount()')
    check('Step advances exactly one event', stepped == start + 1, f'{start} -> {stepped}')

    page.click('#btn-run')
    page.wait_for_timeout(900)
    running = page.evaluate('window.releaseFactoryUi.isRunning()')
    moved = page.evaluate('window.releaseFactoryUi.eventCount()')
    check('Run advances the simulation', running and moved > stepped + 2,
          f'{stepped} -> {moved}')
    page.click('#btn-run')
    page.wait_for_timeout(200)
    paused = page.evaluate('window.releaseFactoryUi.eventCount()')
    page.wait_for_timeout(400)
    check('Pause stops it',
          not page.evaluate('window.releaseFactoryUi.isRunning()')
          and page.evaluate('window.releaseFactoryUi.eventCount()') == paused)

    page.click('#btn-reset')
    page.wait_for_timeout(120)
    check('Reset rewinds the clock', page.evaluate('window.releaseFactoryUi.eventCount()') == 0)


def check_keyboard(page) -> None:
    """Space, S and R must drive the model — and Space must not steal a focused button."""
    page.click('#btn-reset')
    page.evaluate('document.activeElement.blur()')
    page.keyboard.press(' ')
    page.wait_for_timeout(500)
    check('Space starts the run', page.evaluate('window.releaseFactoryUi.isRunning()'))
    page.keyboard.press(' ')
    page.wait_for_timeout(150)
    check('Space pauses it', not page.evaluate('window.releaseFactoryUi.isRunning()'))

    before = page.evaluate('window.releaseFactoryUi.eventCount()')
    page.keyboard.press('s')
    page.wait_for_timeout(120)
    check('S steps', page.evaluate('window.releaseFactoryUi.eventCount()') == before + 1)
    page.keyboard.press('r')
    page.wait_for_timeout(120)
    check('R resets', page.evaluate('window.releaseFactoryUi.eventCount()') == 0)

    # Space on a focused button must activate THAT button, not the run toggle.
    page.focus('#btn-step')
    page.keyboard.press(' ')
    page.wait_for_timeout(150)
    check('Space on a focused button does not hijack the run toggle',
          not page.evaluate('window.releaseFactoryUi.isRunning()')
          and page.evaluate('window.releaseFactoryUi.eventCount()') == 1)


def check_tab_reaches_the_controls(page) -> None:
    """Every interactive control must be reachable by keyboard, with a visible focus ring."""
    page.evaluate('window.scrollTo(0, 0)')
    page.evaluate('document.activeElement.blur()')
    seen = []
    for _ in range(26):
        page.keyboard.press('Tab')
        seen.append(page.evaluate(
            '() => { const a = document.activeElement; '
            'return a ? (a.id || a.tagName) : "none"; }'))
    check('Tab reaches the primary controls',
          any('seg' in s or s.startswith('btn-') or 'arrival' in s for s in seen),
          ', '.join(seen[:6]))
    ring = page.evaluate(
        """() => {
             const b = document.getElementById('btn-run');
             b.focus();
             const s = getComputedStyle(b);
             return { width: s.outlineWidth, style: s.outlineStyle };
           }"""
    )
    check('a focused control shows an outline',
          ring['style'] != 'none' and ring['width'] not in ('0px', ''),
          json.dumps(ring))


def check_presets(page) -> None:
    buttons = page.eval_on_selector_all('#presets .preset', 'els => els.length')
    expected = page.evaluate('window.ReleaseFactory.PRESETS.length')
    check('every preset has a button', buttons == expected, f'{buttons} of {expected}')

    page.click('[data-preset-id="step-1-thorough"]')
    page.wait_for_timeout(120)
    page.click('#btn-90')
    page.wait_for_timeout(400)
    one = snapshot(page)
    check('step 1 grows a backlog', one['stages']['backlog'] > 500,
          f"{one['stages']['backlog']} waiting")
    check('step 1 reports the build-test stage over capacity',
          one['capacity']['state'] == 'bad',
          f"utilisation {one['capacity']['utilization']:.2f}")

    page.click('[data-preset-id="step-2-shallower"]')
    page.wait_for_timeout(120)
    page.click('#btn-90')
    page.wait_for_timeout(400)
    two = snapshot(page)
    check('step 2 improves lead time',
          two['fourKeys']['leadTimeHours']['mean'] < one['fourKeys']['leadTimeHours']['mean'] / 5,
          f"{one['fourKeys']['leadTimeHours']['mean']:.0f} h -> "
          f"{two['fourKeys']['leadTimeHours']['mean']:.1f} h")
    check('step 2 exposes more defective requests',
          two['userImpact']['requestsExposedPerDay']
          > one['userImpact']['requestsExposedPerDay'] * 3,
          f"{one['userImpact']['requestsExposedPerDay']:.3g} -> "
          f"{two['userImpact']['requestsExposedPerDay']:.3g} per day")

    page.click('[data-preset-id="step-3-canary"]')
    page.wait_for_timeout(120)
    page.click('#btn-90')
    page.wait_for_timeout(400)
    three = snapshot(page)
    gap = abs(three['fourKeys']['changeFailureRate'] - two['fourKeys']['changeFailureRate'])
    check('step 3 leaves the change failure rate where it was',
          gap < 0.1 * two['fourKeys']['changeFailureRate'] + 0.03,
          f"{two['fourKeys']['changeFailureRate']:.3f} -> "
          f"{three['fourKeys']['changeFailureRate']:.3f}")
    check('step 3 cuts the median exposure per failed deployment',
          three['userImpact']['perFailedDeployment']['median']
          < two['userImpact']['perFailedDeployment']['median'] / 5,
          f"{two['userImpact']['perFailedDeployment']['median']:.0f} -> "
          f"{three['userImpact']['perFailedDeployment']['median']:.0f} requests")
    check('step 3 shows both halves of the canary',
          three['ledger']['detectedDuringCanary'] > 20
          and three['ledger']['reachedWholeFleet'] > 5,
          f"{three['ledger']['detectedDuringCanary']} caught in the soak, "
          f"{three['ledger']['reachedWholeFleet']} reached the fleet")

    page.click('[data-preset-id="step-4-knee"]')
    page.wait_for_timeout(120)
    page.click('#btn-90')
    page.wait_for_timeout(600)
    four = snapshot(page)
    check('step 4 drives a stage past capacity',
          four['capacity']['utilization'] > 1 or four['releaseCapacity']['utilization'] > 1,
          f"build+test {four['capacity']['utilization']:.2f}, "
          f"release {four['releaseCapacity']['utilization']:.2f}")
    check('step 4 bends the lead time',
          four['fourKeys']['leadTimeHours']['mean']
          > three['fourKeys']['leadTimeHours']['mean'] * 2,
          f"{three['fourKeys']['leadTimeHours']['mean']:.1f} h -> "
          f"{four['fourKeys']['leadTimeHours']['mean']:.0f} h")


def check_sweep(page) -> None:
    page.click('#btn-sweep')
    page.wait_for_function('window.releaseFactoryUi.sweepPoints() > 0', timeout=120000)
    page.wait_for_timeout(400)
    points = page.evaluate('window.releaseFactoryUi.sweepPoints()')
    check('the sweep produces a curve', points >= 10, f'{points} points')
    check('the sweep chart paints', canvas_ink(page, 'c-sweep') > 2000)
    alt = page.inner_text('#sweep-alt')
    check('the sweep describes itself for a screen reader',
          'arrival rates' in alt and 'lead time' in alt, alt[:90])


def check_live_descriptions(page) -> None:
    for element_id in ('factory-alt', 'backlog-alt', 'ledger-alt'):
        text = page.inner_text(f'#{element_id}')
        check(f'{element_id} carries a description', len(text) > 60, text[:70])
    ledger = page.inner_text('#ledger-alt')
    for phrase in ('introduced', 'kept out of production', 'reached real users', 'restored'):
        check(f'the ledger description names "{phrase}"', phrase in ledger)


def check_meaning_is_not_colour_alone(page) -> None:
    """Capacity state must be readable as words, not only as a hue."""
    text = page.inner_text('#r-test-cap') + ' ' + page.inner_text('#r-rel-cap')
    has_word = any(w in text for w in ('within capacity', 'near capacity', 'over capacity'))
    check('capacity state is stated in words', has_word, text[:80])
    has_glyph = any(g in text for g in ('●', '▲'))
    check('capacity state carries a glyph', has_glyph, text[:80])


def check_layout(page, width: int, height: int) -> None:
    page.set_viewport_size({'width': width, 'height': height})
    page.wait_for_timeout(250)
    overflow = page.evaluate(
        'document.documentElement.scrollWidth - document.documentElement.clientWidth')
    check(f'{width}x{height}: no horizontal page overflow', overflow <= 1, f'{overflow}px')
    smallest = page.evaluate(
        """() => {
             let min = 99;
             document.querySelectorAll('p, dd, dt, label, button, .kval, .ksub').forEach(el => {
               if (!el.offsetParent) return;
               const px = parseFloat(getComputedStyle(el).fontSize);
               if (px < min) min = px;
             });
             return min;
           }"""
    )
    check(f'{width}x{height}: no text below 11px', smallest >= 11, f'{smallest}px')


def check_download_control(page, label: str) -> None:
    href = page.get_attribute('#btn-download', 'href')
    download = page.get_attribute('#btn-download', 'download')
    check(f'{label}: the download control points at this page', href == 'index.html', str(href))
    check(f'{label}: the download names the artifact',
          download == 'release-factory.html', str(download))


def check_reduced_motion(page) -> None:
    # The control lives in the Advanced panel, which ships collapsed.
    page.evaluate("document.getElementById('advanced').open = true")
    page.wait_for_timeout(120)
    page.check('#reduced')
    page.wait_for_timeout(120)
    page.click('#btn-run')
    page.wait_for_timeout(700)
    advanced = page.evaluate('window.releaseFactoryUi.eventCount()') > 0
    page.click('#btn-run')
    check('reduced motion still advances the simulation', advanced,
          'the mode changes the redraw cadence, not the model')
    page.uncheck('#reduced')
    page.evaluate("document.getElementById('advanced').open = false")


def check_axe(page, label: str) -> None:
    if not os.path.exists(AXE_SOURCE):
        print(f'  SKIP  {label}: axe-core is not installed')
        return
    with open(AXE_SOURCE, encoding='utf-8') as handle:
        page.add_script_tag(content=handle.read())
    result = page.evaluate(
        """async () => {
             const r = await window.axe.run(document, {
               runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
             });
             return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length }));
           }"""
    )
    serious = [v for v in result if v['impact'] in ('serious', 'critical')]
    check(f'{label}: axe finds no serious WCAG 2 AA violation', not serious,
          json.dumps(serious[:3]))
    if result and not serious:
        print(f'    (minor: {json.dumps(result[:3])})')


# --------------------------------------------------------------------------------------------

def suite(browser, url: str, label: str) -> None:
    print(f'\n=== {label} ===')
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    requests: list[str] = []
    console_errors: list[str] = []
    page.on('request', lambda r: requests.append(r.url))
    page.on('pageerror', lambda e: console_errors.append(str(e)))
    page.on('console',
            lambda m: console_errors.append(m.text) if m.type == 'error' else None)
    page.goto(url)
    page.wait_for_timeout(500)

    check(f'{label}: the page loads without a script error', not console_errors,
          '; '.join(console_errors[:2]))
    check_no_network(label, requests)
    check_engine_is_live(page)
    check_canvases_paint(page, label)
    check_download_control(page, label)
    check_controls_drive_the_model(page)
    check_run_pause_step(page)
    check_keyboard(page)
    check_tab_reaches_the_controls(page)
    check_presets(page)
    check_sweep(page)
    check_live_descriptions(page)
    check_meaning_is_not_colour_alone(page)
    check_reduced_motion(page)
    check_layout(page, 1920, 1080)
    check_layout(page, 1280, 800)
    page.set_viewport_size({'width': 1920, 'height': 1080})
    check_self_tests(page)
    check_axe(page, label)

    # Nothing may have slipped onto the network during any of the above.
    check_no_network(f'{label} (after the full session)', requests)
    check(f'{label}: still no script error after the full session', not console_errors,
          '; '.join(console_errors[:2]))
    page.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='append', choices=['chromium', 'firefox', 'webkit'],
                        help='repeatable; defaults to chromium and firefox')
    parser.add_argument('--serve', action='store_true',
                        help='also run the suite against the page served over HTTP')
    args = parser.parse_args()
    browsers = args.browser or ['chromium', 'firefox']

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('browser_test: playwright is not installed; browser tier SKIPPED', file=sys.stderr)
        return 2

    targets = [('file://' + SIMULATOR, 'file://')]
    if args.serve:
        targets.append((serve_simulator(), 'http'))

    launched = 0
    with sync_playwright() as play:
        for name in browsers:
            try:
                browser = getattr(play, name).launch()
            except Exception as exc:                      # noqa: BLE001 - reported, not swallowed
                print(f'browser_test: cannot launch {name}: {exc}', file=sys.stderr)
                continue
            launched += 1
            try:
                for url, scheme in targets:
                    suite(browser, url, f'{name} over {scheme}')
            finally:
                browser.close()

    if launched == 0:
        print('browser_test: no browser could be launched; browser tier SKIPPED', file=sys.stderr)
        return 2
    print(f'\n{len(failures)} failure(s)')
    for name in failures:
        print(f'  FAILED: {name}')
    return 1 if failures else 0


if __name__ == '__main__':
    sys.exit(main())
