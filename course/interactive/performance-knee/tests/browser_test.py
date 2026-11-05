#!/usr/bin/env python3
"""Drive a real browser over the simulator, from file:// AND from the served site.

    python3 course/interactive/performance-knee/tests/browser_test.py
    python3 .../browser_test.py --browser firefox
    python3 .../browser_test.py --browser chromium --browser firefox --serve

A browser answers questions Node cannot: do the three canvases actually paint, does any request
leave the page, does the layout survive a projector's 1920x1080, do the keyboard shortcuts reach
the model, and does axe-core find anything. Python because this repository's tooling is Python and
its no-shell policy sends a driver script here rather than to a `.sh`.

With `--serve` the script builds nothing: it serves the simulator's own directory over HTTP from a
stdlib `http.server` thread, which exercises the served-over-http path that `file://` cannot. The
full MkDocs-published tree is verified separately by building the teach site and diffing the
published copy against the source (see the commit that wires the site integration).

Exit 0 when every check passes, 1 on a failure, 2 when no browser could be launched — so a runner
without Playwright reports "skipped" rather than red, matching this repo's skip-if-absent posture
for the axe and html-validate tiers.

Playwright and axe-core are DEV tools on the author's machine, exactly as chromedriver and axe-core
already are in the root devDependencies. The published page gains no dependency from any of this.
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
    return f'http://127.0.0.1:{port}/'


# --------------------------------------------------------------------------------------------- #
# individual checks
# --------------------------------------------------------------------------------------------- #

def check_no_network(page, label: str, requests: list[str]) -> None:
    """Two independent views: Playwright's own request log, and the page's resource timing."""
    external_logged = [u for u in requests if not u.startswith(('data:', 'file://', 'http://127.0.0.1'))]
    check(f'{label}: no request left the page', not external_logged,
          ', '.join(external_logged) or 'none')
    timed = page.evaluate(
        "() => performance.getEntriesByType('resource')"
        ".map(e => e.name).filter(n => !n.startsWith('data:'))")
    check(f'{label}: no subresource fetched', not timed, ', '.join(timed) or 'none')


def check_canvases_paint(page, label: str) -> None:
    """A chart that threw mid-draw leaves a blank bitmap, which looks exactly like a working one
    unless somebody reads the pixels. Sample each canvas and require real variation."""
    painted = page.evaluate("""() => ['c-queue','c-rt','c-knee'].map(id => {
      const c = document.getElementById(id);
      if (!c) return [id, -1];
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const first = [d[0], d[1], d[2], d[3]].join(',');
      let distinct = 0;
      // Stride 400 (every hundredth pixel). A sparser stride left single-digit sample counts on
      // the queue panel, which is mostly background by design, and the check flaked.
      for (let i = 0; i < d.length; i += 400) {
        if ([d[i], d[i+1], d[i+2], d[i+3]].join(',') !== first) distinct += 1;
      }
      return [id, distinct];
    })""")
    for canvas_id, distinct in painted:
        check(f'{label}: canvas #{canvas_id} painted', distinct > 40, f'{distinct} differing samples')


def check_no_canvas_text_clipped(page, label: str) -> None:
    """Canvas text neither wraps nor ellipsises: an over-long label runs off the bitmap and the
    reader silently loses the end of the sentence. Every label is drawn inside a padded box, so
    ink in the right-hand edge columns means something overflowed. Cheap, and it catches the
    class rather than the one string that happened to be too long today."""
    edges = page.evaluate("""() => ['c-queue','c-rt','c-knee'].map(id => {
      const c = document.getElementById(id);
      const ctx = c.getContext('2d');
      const band = ctx.getImageData(c.width - 4, 0, 4, c.height).data;
      // The canvas background is the page ground; compare against the top-left pixel.
      const bg = ctx.getImageData(0, 0, 1, 1).data;
      let ink = 0;
      for (let i = 0; i < band.length; i += 4) {
        if (Math.abs(band[i] - bg[0]) + Math.abs(band[i+1] - bg[1])
            + Math.abs(band[i+2] - bg[2]) + Math.abs(band[i+3] - bg[3]) > 24) ink += 1;
      }
      return [id, ink];
    })""")
    for canvas_id, ink in edges:
        check(f'{label}: nothing clipped at the right edge of #{canvas_id}', ink == 0,
              f'{ink} inked pixels in the last 4 columns')


def set_number(page, element_id: str, value) -> None:
    page.evaluate("""([id, v]) => {
      const el = document.getElementById(id);
      el.value = String(v);
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }""", [element_id, value])


def text_of(page, element_id: str) -> str:
    return page.evaluate("id => document.getElementById(id).textContent.trim()", element_id)


def check_controls_drive_the_model(page) -> None:
    set_number(page, 'lambda', 90)
    set_number(page, 'mu', 100)
    check('controls: rho follows lambda and mu', text_of(page, 'm-rho') == '0.900',
          text_of(page, 'm-rho'))
    check('controls: M/M/1 W = 100.0 ms at rho 0.9', text_of(page, 'm-w') == '100.0 ms',
          text_of(page, 'm-w'))
    check('controls: slider mirrors the numeric field',
          page.evaluate("() => document.getElementById('lambda-range').value") == '90')

    page.select_option('#dist', 'deterministic')
    check('controls: deterministic service switches the MODEL to M/D/1',
          text_of(page, 'm-model').startswith('M/D/1'), text_of(page, 'm-model'))
    check('controls: M/D/1 W = 55.0 ms at rho 0.9', text_of(page, 'm-w') == '55.0 ms',
          text_of(page, 'm-w'))
    page.select_option('#dist', 'exponential')

    set_number(page, 'lambda', 110)
    check('controls: lambda > mu prints no finite value', text_of(page, 'm-w') == 'no finite value',
          text_of(page, 'm-w'))
    reason = text_of(page, 'm-unstable')
    check('controls: lambda > mu states the reason',
          'No finite steady-state prediction' in reason, reason[:70])
    body = page.evaluate('() => document.body.innerText')
    check('controls: no Infinity or NaN anywhere on the page',
          'Infinity' not in body and 'NaN' not in body)
    check('controls: the analytical chart line is withdrawn when unstable',
          'model line withdrawn' in text_of(page, 'rt-alt') or 'no model line' in text_of(page, 'rt-alt'),
          text_of(page, 'rt-alt')[-60:])

    set_number(page, 'lambda', 30)
    page.click('#btn-reset')


def events_of(page) -> int:
    return int(page.evaluate(
        "() => parseInt(document.getElementById('s-events').textContent.replace(/,/g,''), 10)"))


def check_run_pause_step_reset(page) -> None:
    page.click('#btn-reset')
    check('reset: clock at zero', text_of(page, 's-time').startswith('0.00'), text_of(page, 's-time'))

    before = events_of(page)
    page.click('#btn-step')
    check('step: advances exactly one event', events_of(page) == before + 1,
          f'{before} -> {events_of(page)}')
    check('step: leaves the simulation paused',
          page.evaluate("() => document.getElementById('btn-run').textContent") == 'Run')

    frozen = text_of(page, 's-time')
    page.wait_for_timeout(450)
    check('pause: simulated time does not advance', text_of(page, 's-time') == frozen, frozen)

    page.click('#btn-run')
    page.wait_for_timeout(700)
    running = events_of(page)
    check('run: events accumulate', running > before + 1, f'{running} events')
    page.click('#btn-run')
    paused = events_of(page)
    page.wait_for_timeout(450)
    check('pause: events stop accumulating', events_of(page) == paused, f'{paused} events')

    page.click('#btn-reset')
    check('reset: returns to zero after a run', text_of(page, 's-time').startswith('0.00'),
          text_of(page, 's-time'))


def check_keyboard(page) -> None:
    page.evaluate('() => document.activeElement && document.activeElement.blur()')
    page.keyboard.press('Space')
    page.wait_for_timeout(150)
    check('keyboard: Space starts the run',
          page.evaluate("() => document.getElementById('btn-run').textContent") == 'Pause')
    page.keyboard.press('Space')
    page.wait_for_timeout(150)
    check('keyboard: Space pauses the run',
          page.evaluate("() => document.getElementById('btn-run').textContent") == 'Run')
    page.keyboard.press('r')
    page.wait_for_timeout(150)
    check('keyboard: R resets', text_of(page, 's-time').startswith('0.00'), text_of(page, 's-time'))

    # The shortcuts must stand down inside a form field, or typing a seed would start the run.
    page.evaluate("() => { document.getElementById('advanced').open = true; }")
    page.click('#seed')
    page.keyboard.press('Space')
    check('keyboard: Space inside a text field does not start the run',
          page.evaluate("() => document.getElementById('btn-run').textContent") == 'Run')
    page.evaluate("() => { document.getElementById('advanced').open = false; }")


def in_system(page) -> int:
    return int(page.evaluate('() => window.QueueSim.numberInSystem(window.__sim)'))


def click_preset(page, label: str) -> None:
    page.evaluate("""label => {
      Array.from(document.querySelectorAll('#presets .preset'))
        .find(b => b.textContent.indexOf(label) === 0).click();
    }""", label)


def check_presets(page) -> None:
    count = page.evaluate("() => document.querySelectorAll('#presets .preset').length")
    check('presets: six buttons rendered', count == 6, str(count))

    click_preset(page, 'Overloaded')
    params = page.evaluate(
        "() => document.getElementById('lambda').value + '/' + document.getElementById('mu').value")
    check('presets: Overloaded sets lambda 110, mu 100', params == '110/100', params)
    # Advance the engine directly: this check is about state, not about frame timing.
    page.evaluate('() => window.QueueSim.advanceSimulation(window.__sim, { untilTime: 60 })')
    backlog = in_system(page)
    check('presets: Overloaded accumulates a backlog', backlog > 100, f'{backlog} in system')

    click_preset(page, 'Recover capacity')
    after = in_system(page)
    mu = page.evaluate("() => document.getElementById('mu').value")
    check('presets: Recover capacity raises mu to 150', mu == '150', mu)
    check('presets: Recover capacity KEEPS the backlog', after == backlog, f'{backlog} -> {after}')
    marked = page.evaluate("""() => {
      const b = Array.from(document.querySelectorAll('#presets .preset'))
        .find(x => x.textContent.indexOf('Recover capacity') === 0);
      return b.classList.contains('keeps-backlog') && /keeps backlog/i.test(b.textContent);
    }""")
    check('presets: the backlog-keeping preset says so in words, not only in colour', marked is True)

    click_preset(page, 'Light load')
    check('presets: a resetting preset clears the backlog', in_system(page) == 0)


def check_experiments(page) -> None:
    page.evaluate("() => { document.getElementById('experiments').open = true; }")
    setups = page.evaluate("() => document.querySelectorAll('[data-xp]').length")
    check('experiments: setup buttons present', setups >= 9, str(setups))

    # The three GUIDED experiments are the exercise, and they live in the numbered procedure above
    # the apparatus. Each specifies all six house-style fields and loads its own baseline, so a
    # student is not reconstructing a configuration by hand.
    guided = page.evaluate("""() => [...document.querySelectorAll('li.exp')].map(li => ({
      fields: [...li.querySelectorAll('dl.six > dt')].map(d => d.textContent.trim()),
      baselines: li.querySelectorAll('[data-xp]').length,
    }))""")
    check('procedure: two or three guided experiments', 2 <= len(guided) <= 3, str(len(guided)))
    six = ['Baseline', 'Change', 'Hold constant', 'Predict', 'Run & measure', 'Explain']
    for i, exp in enumerate(guided, 1):
        check(f'procedure: experiment {i} specifies all six fields',
              exp['fields'] == six, str(exp['fields']))
        check(f'procedure: experiment {i} offers a baseline to load',
              exp['baselines'] >= 1, str(exp['baselines']))

    # Explore further carries the optional extensions. Each card hides its own explanation, and the
    # count is derived from the cards rather than frozen at a number a later edit has to remember.
    cards = page.evaluate("() => document.querySelectorAll('.xp').length")
    reveals = page.evaluate("() => document.querySelectorAll('.xp details').length")
    check('experiments: every Explore-further card hides one explanation',
          reveals == cards and cards >= 1, f'{reveals} reveals across {cards} cards')
    opened = page.evaluate(
        "() => Array.from(document.querySelectorAll('.xp details')).filter(d => d.open).length")
    check('experiments: nothing revealed before it is asked for', opened == 0, str(opened))
    page.evaluate("""() => document.querySelector('[data-xp="90,100,deterministic,reset"]').click()""")
    check('experiments: a setup button configures the experiment',
          text_of(page, 'm-model').startswith('M/D/1'), text_of(page, 'm-model'))
    # And a reveal actually reveals.
    page.evaluate("() => { document.querySelector('.xp details').open = true; }")
    revealed = page.evaluate("() => document.querySelector('.xp details p').textContent.length")
    check('experiments: Reveal explanation shows the interpretation', revealed > 200, str(revealed))
    page.evaluate("() => { document.getElementById('experiments').open = false; }")
    page.click('#btn-defaults')


def check_little_law_panel(page) -> None:
    """The cohort check must be EXACT when available and WITHHELD when it is not."""
    click_preset(page, 'Light load')
    page.evaluate('() => window.QueueSim.advanceSimulation(window.__sim, { untilTime: 400 })')
    page.evaluate('() => window.QueueSim.snapshot(window.__sim)')
    page.click('#btn-step')  # force a repaint through the normal path
    residual = text_of(page, 'lc-res')
    check("Little's Law: an exact cohort residual is shown", residual not in ('', '—'), residual)
    check("Little's Law: the residual is float noise, not a discrepancy",
          'e-1' in residual or 'e+0' in residual or residual.startswith('0'), residual)

    click_preset(page, 'Overloaded')
    page.evaluate('() => window.QueueSim.advanceSimulation(window.__sim, { untilTime: 300 })')
    page.click('#btn-step')
    pending = text_of(page, 'lc-pending')
    check("Little's Law: the check is withheld under overload, not faked",
          'empty' in pending.lower(), pending[:80])
    page.click('#btn-defaults')


def check_self_tests(page) -> None:
    report = page.evaluate('() => window.QueueSim.runSelfTests()')
    bad = [r['name'] for r in report['results'] if not r['passed']]
    check(f"in-page self-tests ({report['passed']}/{report['total']})", report['failed'] == 0,
          ', '.join(bad) or 'all passed')


def check_layout_and_legibility(page) -> None:
    # Load the page up first: the longest labels only exist when the counters are large.
    click_preset(page, 'Overloaded')
    page.evaluate('() => window.QueueSim.advanceSimulation(window.__sim, { untilTime: 120 })')
    page.click('#btn-step')
    for width, height in ((1920, 1080), (1366, 768), (414, 896)):
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(350)
        overflow = page.evaluate(
            '() => document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(f'layout {width}x{height}: no horizontal overflow', overflow <= 1, f'{overflow}px')
        check_no_canvas_text_clipped(page, f'layout {width}x{height}')
        if width >= 1366:
            sizes = page.evaluate("""() => ['m-w','m-rho','s-w','s-util']
              .map(id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize))""")
            check(f'layout {width}x{height}: key readouts projector-legible', min(sizes) >= 16,
                  f'smallest {min(sizes)}px')
            h1 = page.evaluate(
                "() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)")
            check(f'layout {width}x{height}: title is large', h1 >= 28, f'{h1}px')
            # The maths-bearing labels must not be clipped by their container.
            clipped = page.evaluate("""() => ['m-formula','m-w','lc-l','lc-prod']
              .filter(id => { const e = document.getElementById(id);
                return e.scrollWidth > e.clientWidth + 1; })""")
            check(f'layout {width}x{height}: no mathematical label is clipped', not clipped,
                  ', '.join(clipped) or 'none')
    page.set_viewport_size({'width': 1920, 'height': 1080})
    page.click('#btn-defaults')


def check_download_control(page, label: str) -> None:
    href, download = page.evaluate("""() => {
      const a = document.getElementById('btn-download');
      return [a.getAttribute('href'), a.getAttribute('download')];
    }""")
    check(f'{label}: Download HTML points at this same file', href == 'index.html', str(href))
    check(f'{label}: Download HTML names the artifact', download == 'performance-knee.html',
          str(download))


def check_reduced_motion(page) -> None:
    page.evaluate("""() => {
      document.getElementById('advanced').open = true;
      const r = document.getElementById('reduced');
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    page.click('#btn-run')
    page.wait_for_timeout(600)
    before = page.evaluate('() => window.__sim.eventCount')
    page.wait_for_timeout(500)
    after = page.evaluate('() => window.__sim.eventCount')
    check('reduced motion: the simulation still advances', after > before, f'{before} -> {after}')
    page.click('#btn-run')
    page.evaluate("""() => {
      const r = document.getElementById('reduced');
      r.checked = false;
      r.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('advanced').open = false;
    }""")
    page.click('#btn-reset')


def check_axe(page, label: str) -> None:
    if not os.path.exists(AXE_SOURCE):
        check(f'{label}: axe-core (skipped: node_modules/axe-core absent)', True)
        return
    with open(AXE_SOURCE, encoding='utf-8') as fh:
        page.add_script_tag(content=fh.read())
    results = page.evaluate('async () => await window.axe.run(document)')
    violations = [f"{v['id']}({len(v['nodes'])})" for v in results['violations']]
    check(f'{label}: axe-core finds no violation', not violations,
          ', '.join(violations) or 'clean')


# --------------------------------------------------------------------------------------------- #
# the run
# --------------------------------------------------------------------------------------------- #

def suite(browser, url: str, label: str) -> None:
    print(f'\n== {label}: {url} ==')
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    requests: list[str] = []
    console_errors: list[str] = []
    page.on('request', lambda r: requests.append(r.url))
    page.on('console', lambda m: console_errors.append(f'{m.type}: {m.text}')
            if m.type == 'error' else None)
    page.on('pageerror', lambda e: console_errors.append(f'pageerror: {e}'))
    page.goto(url, wait_until='load')
    # Expose the live simulation for the MODEL-state assertions. Installed by the test, not
    # shipped in the page: the production interface must not depend on the harness.
    page.evaluate("""() => {
      window.__sim = null;
      const original = window.QueueSim.snapshot;
      window.QueueSim.snapshot = sim => { window.__sim = sim; return original(sim); };
    }""")
    # Wait on a CONDITION, not a duration. A fixed sleep flaked on a cold start, where the first
    # synchronous draw can land before layout settles and the canvas backing store is then
    # reallocated (which clears it). Counting the page's own animation frames says what we
    # actually need: the render loop has run several times against a settled layout.
    page.evaluate('() => { window.__frames = 0;'
                  ' (function tick() { window.__frames += 1; requestAnimationFrame(tick); })(); }')
    page.wait_for_function('() => window.__sim !== null', timeout=15000)
    page.wait_for_function('() => window.__frames >= 6', timeout=15000)

    check_no_network(page, label, requests)
    check_canvases_paint(page, label)
    check_download_control(page, label)
    check_self_tests(page)
    check_controls_drive_the_model(page)
    check_run_pause_step_reset(page)
    check_keyboard(page)
    check_presets(page)
    check_experiments(page)
    check_little_law_panel(page)
    check_reduced_motion(page)
    check_layout_and_legibility(page)
    check_axe(page, label)
    check(f'{label}: no console error or uncaught exception', not console_errors,
          ' | '.join(console_errors[:3]) or 'clean')
    check_no_network(page, f'{label} (after interaction)', requests)
    page.close()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser', action='append', choices=['chromium', 'firefox', 'webkit'],
                        help='repeatable; defaults to chromium and firefox')
    parser.add_argument('--serve', action='store_true',
                        help='also run the suite against the simulator served over HTTP')
    parser.add_argument('--screenshot-dir', default=None,
                        help='write a full-page screenshot per browser into this directory')
    args = parser.parse_args()
    browsers = args.browser or ['chromium', 'firefox']

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('browser_test: playwright is not installed; browser tier SKIPPED', file=sys.stderr)
        return 2

    if not os.path.exists(SIMULATOR):
        print(f'browser_test: {SIMULATOR} is missing', file=sys.stderr)
        return 1

    serve_base = serve_simulator() if args.serve else None

    with sync_playwright() as play:
        for name in browsers:
            try:
                browser = getattr(play, name).launch()
            except Exception as exc:                      # noqa: BLE001 — reported, not swallowed
                print(f'browser_test: could not launch {name}: {exc}', file=sys.stderr)
                return 2
            try:
                suite(browser, f'file://{SIMULATOR}', f'{name} file://')
                if serve_base:
                    suite(browser, f'{serve_base}index.html', f'{name} served')
                if args.screenshot_dir:
                    os.makedirs(args.screenshot_dir, exist_ok=True)
                    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
                    page.goto(f'file://{SIMULATOR}', wait_until='load')
                    page.wait_for_timeout(1200)
                    page.screenshot(path=os.path.join(args.screenshot_dir, f'{name}-1920x1080.png'),
                                    full_page=True)
                    page.close()
            finally:
                browser.close()

    print()
    if failures:
        print(f'{len(failures)} BROWSER CHECK(S) FAILED:')
        for name in failures:
            print(f'  - {name}')
        return 1
    print('ALL BROWSER CHECKS PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
