#!/usr/bin/env python3
"""Drive a real browser over the ReDoS demonstration, from file:// AND from a served copy.

    python3 course/interactive/redos/tests/browser_test.py
    python3 .../browser_test.py --browser firefox
    python3 .../browser_test.py --browser chromium --browser firefox --serve

A browser answers questions Node cannot, and for this demonstration the central one is not
cosmetic: does the wall-clock budget actually terminate a running match, does the page survive it,
and does a fresh worker serve the next experiment? None of that can be checked without a real
worker on a real thread. The unit tier covers the sweep's STATE after a termination; only this tier
covers whether the termination happens and whether the page recovers.

Python with Playwright, matching the sibling simulator's tier and this repository's no-shell
tooling posture. Playwright and axe-core are DEV tools; the published page gains no dependency.

Exit 0 when every check passes, 1 on a failure, 2 when no browser could be launched — so a runner
without Playwright reports "skipped" rather than red, matching this repo's skip-if-absent posture
for the axe and html-validate tiers.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
import socket
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
DEMO_DIR = os.path.dirname(HERE)
DEMO = os.path.join(DEMO_DIR, 'index.html')
REPO_ROOT = os.path.abspath(os.path.join(DEMO_DIR, '..', '..', '..'))
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


def serve_demo() -> str:
    """Serve the demonstration's own directory; returns its base URL. Daemon thread, dies with us."""
    port = free_port()
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=DEMO_DIR)
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return f'http://127.0.0.1:{port}/'


# --------------------------------------------------------------------------------------------- #
# packaging: nothing leaves the page
# --------------------------------------------------------------------------------------------- #

def check_no_network(page, label: str, requests: list[str]) -> None:
    """Two independent views: Playwright's own request log, and the page's resource timing.

    `blob:` is accepted and must be: the worker script is delivered as an in-memory Blob URL, which
    is how the page stays a single file. Fetching one issues no network request. What may NOT appear
    is any http(s) URL other than the page's own origin when it is being served.
    """
    external = [u for u in requests
                if not u.startswith(('data:', 'blob:', 'file://', 'http://127.0.0.1'))]
    check(f'{label}: no request left the page', not external, ', '.join(external) or 'none')
    timed = page.evaluate(
        "() => performance.getEntriesByType('resource').map(e => e.name)"
        ".filter(n => !n.startsWith('data:') && !n.startsWith('blob:'))")
    check(f'{label}: no subresource fetched', not timed, ', '.join(timed) or 'none')


def check_no_console_errors(page, label: str, messages: list[str]) -> None:
    check(f'{label}: no console error', not messages, ' | '.join(messages[:3]) or 'clean')


def check_canvases_paint(page, label: str) -> None:
    """Require real ink on each canvas.

    Counted as OPAQUE PIXELS rather than as strided distinct samples, and that is a correction
    rather than a preference. A stride-based sampler reported BOTH canvases blank in Chromium while
    Firefox showed content — a convincing browser-specific defect that did not exist. The canvas in
    fact carried 20,366 opaque pixels of 257,720; the stride was aliasing against 1-pixel
    horizontal gridlines. Counting every pixel cannot alias.
    """
    painted = page.evaluate("""() => ['c-growth','c-work'].map(id => {
      const c = document.getElementById(id);
      if (!c) return [id, -1, 0];
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let opaque = 0;
      for (let i = 3; i < d.length; i += 4) { if (d[i] !== 0) opaque += 1; }
      return [id, opaque, d.length / 4];
    })""")
    for canvas_id, opaque, total in painted:
        frac = opaque / total if total else 0
        check(f'{label}: canvas #{canvas_id} painted', opaque > 500,
              f'{opaque} opaque of {total} px ({frac:.1%})')


def check_download_control(page, label: str) -> None:
    href, name = page.evaluate(
        "() => { const a = document.getElementById('btn-download');"
        " return [a.getAttribute('href'), a.getAttribute('download')]; }")
    check(f'{label}: Download HTML points at this same file', href == 'index.html', str(href))
    check(f'{label}: Download HTML names the artifact', name == 'redos.html', str(name))


def check_self_tests(page, label: str) -> None:
    report = page.evaluate('() => window.ReDoS.runSelfTests()')
    failed = [r['name'] for r in report['results'] if not r['passed']]
    check(f'{label}: in-page self-tests ({report["passed"]}/{report["total"]})',
          report['failed'] == 0, ', '.join(failed) or 'all passed')


# --------------------------------------------------------------------------------------------- #
# the budget: termination, recovery, responsiveness
# --------------------------------------------------------------------------------------------- #

def frames(page) -> int:
    return int(page.inner_text('#b-frames').replace(',', ''))


def counter(page, element_id: str) -> int:
    return int(page.inner_text(element_id).replace(',', ''))


def check_budget_terminates_and_recovers(page) -> None:
    """The central claim of the whole instrument, driven end to end.

    A single execution at the top of the nested-quantifier ladder costs far more than the deadline,
    and nothing can ask a regex engine to stop. So: the deadline must fire, the worker must be
    destroyed, the page must stay responsive throughout, the trial must be reported as terminated
    rather than charted, and the NEXT run must be served by a newly created worker.
    """
    page.click('#btn-reset')
    page.wait_for_timeout(150)
    workers_before = counter(page, '#b-workers')
    kills_before = counter(page, '#b-terminated')

    page.click('button.xpsel[data-xp="exponential"]')
    frames_before = frames(page)
    page.click('#btn-run-longest')

    # Poll for the termination rather than sleeping a fixed time: on a slow machine the deadline
    # still fires at ~400 ms, but the surrounding work is not instantaneous.
    page.wait_for_function(
        "() => document.getElementById('status-text').textContent.toLowerCase()"
        ".includes('terminated')", timeout=15000)
    frames_during = frames(page) - frames_before

    check('budget: an over-deadline trial is terminated',
          'terminated' in page.inner_text('#status-text').lower(),
          page.inner_text('#status-text'))
    check('budget: the termination is counted for the reader',
          counter(page, '#b-terminated') == kills_before + 1,
          f'{kills_before} -> {counter(page, "#b-terminated")}')
    check('budget: the interface kept painting while the match held the engine',
          frames_during > 10, f'{frames_during} frames during the killed run')
    check('budget: the reader is told what happened and why no time is reported',
          not page.is_hidden('#kill-notice')
          and 'destroyed the worker' in page.inner_text('#kill-notice'),
          page.inner_text('#kill-notice')[:70].replace('\n', ' '))

    outcomes = page.eval_on_selector_all(
        '#results-table tbody tr td:last-child', 'c => c.map(x => x.textContent)')
    check('budget: the terminated trial is reported, not dropped',
          any('terminated' in o for o in outcomes), ' / '.join(outcomes))
    times = page.eval_on_selector_all(
        '#results-table tbody tr td:nth-child(6)', 'c => c.map(x => x.textContent)')
    check('budget: no time is claimed for the terminated trial', all(t == '—' for t in times),
          ' / '.join(times))

    # RECOVERY. The worker was destroyed; the next run must get a fresh one and complete.
    page.click('button.xpsel[data-xp="ordinary"]')
    page.click('#btn-run')
    page.wait_for_function(
        "() => document.getElementById('status-text').textContent.toLowerCase()"
        ".includes('complete')", timeout=30000)
    check('recovery: the run after a termination completes',
          'complete' in page.inner_text('#status-text').lower(),
          page.inner_text('#status-text'))
    check('recovery: it was served by a NEWLY created worker',
          counter(page, '#b-workers') >= workers_before + 1,
          f'{workers_before} -> {counter(page, "#b-workers")} workers created')
    rows = page.eval_on_selector_all('#results-table tbody tr', 'r => r.length')
    check('recovery: the fresh worker produced measurements', rows > 1, f'{rows} rows')


def check_budget_halt_on_the_ladder(page) -> None:
    """The other halt reason: the engine's own between-executions budget, which must stop the climb
    and SAY where, rather than carrying on into ever more expensive lengths."""
    page.click('#btn-reset')
    page.click('button.xpsel[data-xp="quadratic"]')
    page.evaluate("""() => {
      const el = document.getElementById('maxlen');
      el.value = el.max;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    page.click('#btn-run')
    page.wait_for_function(
        "() => /complete|budget|terminated/i.test("
        "document.getElementById('status-text').textContent)", timeout=40000)
    status = page.inner_text('#status-text').lower()
    check('ladder: the climb stops at the budget or the deadline, not at the top',
          'budget' in status or 'terminated' in status, page.inner_text('#status-text'))
    lengths = page.eval_on_selector_all(
        '#results-table tbody tr td:nth-child(2)',
        'c => c.map(x => Number(x.textContent.replace(/,/g, "")))')
    check('ladder: lengths were walked in increasing order',
          lengths == sorted(lengths) and len(lengths) >= 3, str(lengths))


def check_safe_alternative_survives_the_same_input(page) -> None:
    """The headline comparison, driven rather than asserted in prose: experiment 4 runs the SAME
    longest input that killed experiment 2, and completes."""
    page.click('#btn-reset')
    page.click('button.xpsel[data-xp="safe"]')
    # The termination counter is cumulative for the session, by design — "how often did the page
    # have to destroy a worker" is a session fact. So assert the DELTA, not the absolute.
    kills_before = counter(page, '#b-terminated')
    page.click('#btn-run-longest')
    page.wait_for_function(
        "() => /complete/i.test(document.getElementById('status-text').textContent)", timeout=30000)
    check('safe alternative: completes at the longest input', True,
          page.inner_text('#status-text'))
    check('safe alternative: was not terminated',
          counter(page, '#b-terminated') == kills_before,
          f'{kills_before} -> {counter(page, "#b-terminated")} terminations')
    verdicts = page.eval_on_selector_all(
        '#results-table tbody tr td:nth-child(4)', 'c => c.map(x => x.textContent)')
    check('safe alternative: reaches the same verdict as the pathological expression',
          all(v == 'no match' for v in verdicts), ' / '.join(verdicts))


# --------------------------------------------------------------------------------------------- #
# controls
# --------------------------------------------------------------------------------------------- #

def check_experiment_selector(page) -> None:
    buttons = page.eval_on_selector_all('.xpsel', 'b => b.length')
    check('controls: four experiment buttons', buttons == 4, str(buttons))
    for slug, expression in (('ordinary', '/^.*\\s+$/'), ('quadratic', '/^.*\\s+$/'),
                             ('exponential', '/^(a+)+$/'),
                             ('safe', '/^.*[^\\s]\\s+$|^\\s+$/')):
        page.click(f'button.xpsel[data-xp="{slug}"]')
        shown = page.inner_text('#expr-source')
        check(f'controls: selecting {slug} shows its expression', shown == expression, shown)
        pressed = page.eval_on_selector_all(
            '.xpsel', 'b => b.filter(x => x.getAttribute("aria-pressed") === "true").length')
        check(f'controls: exactly one experiment is pressed after choosing {slug}',
              pressed == 1, str(pressed))
        state = page.eval_on_selector(
            f'button.xpsel[data-xp="{slug}"] .xstate', 'e => e.textContent')
        check(f'controls: {slug} says "selected" in words, not only by colour',
              state == 'selected', state)


def check_length_control(page) -> None:
    page.click('button.xpsel[data-xp="quadratic"]')
    page.evaluate("""() => {
      const el = document.getElementById('maxlen-range');
      el.value = '4000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }""")
    check('controls: the numeric field mirrors the slider',
          page.input_value('#maxlen') == '4000', page.input_value('#maxlen'))
    check('controls: the input panel follows the length',
          '4,001 characters' in page.inner_text('#input-len'), page.inner_text('#input-len'))

    # The two families have ranges three orders of magnitude apart; the control must follow.
    page.click('button.xpsel[data-xp="exponential"]')
    bounds = page.evaluate("""() => {
      const el = document.getElementById('maxlen');
      return [Number(el.min), Number(el.max)];
    }""")
    check('controls: the slider range follows the experiment family',
          bounds[1] <= 40, f'exponential bounds {bounds}')
    page.click('button.xpsel[data-xp="quadratic"]')
    wide = page.evaluate("() => Number(document.getElementById('maxlen').max)")
    check('controls: and widens again for the whitespace family', wide >= 10000, str(wide))

    # Out-of-range input is clamped rather than accepted.
    page.evaluate("""() => {
      const el = document.getElementById('maxlen');
      el.value = '999999999';
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    check('controls: an out-of-range length is clamped',
          Number := int(page.input_value('#maxlen')) == wide, page.input_value('#maxlen'))


def check_scale_toggle(page) -> None:
    for mode, expect in (('linear', 'linear in n, linear in time'),
                         ('logy', 'linear in n, logarithmic in time'),
                         ('loglog', 'logarithmic in n, logarithmic in time')):
        page.click(f'#scale-seg button[data-scale="{mode}"]')
        page.wait_for_timeout(120)
        note = page.inner_text('#growth-axes')
        check(f'controls: the {mode} axis mode is applied and announced', expect in note, note[-60:])
        pressed = page.eval_on_selector_all(
            '#scale-seg button', 'b => b.filter(x => x.getAttribute("aria-pressed") === "true").length')
        check(f'controls: exactly one axis mode is pressed ({mode})', pressed == 1, str(pressed))
    page.click('#scale-seg button[data-scale="linear"]')


def check_mitigations(page) -> None:
    def choose(only: str) -> str:
        page.evaluate("() => document.querySelectorAll('#mitigation-list input:checked')"
                      ".forEach(c => c.click())")
        page.click(f'#mit-{only}')
        page.wait_for_timeout(100)
        return page.inner_text('#mitigation-verdict')

    text = choose('admission')
    check('mitigations: a rate limit alone does not meet the objective',
          'unmet' in page.inner_text('#verdict-text').lower(), page.inner_text('#verdict-text'))
    check('mitigations: and the page says why — one request may be enough',
          'single request' in text, text[-90:].replace('\n', ' '))

    text = choose('isolate')
    check('mitigations: isolation meets the objective',
          'met' in page.inner_text('#verdict-text').lower(), page.inner_text('#verdict-text'))
    check('mitigations: but is stated NOT to remove the vulnerability',
          'bounds the damage, not the cost' in text and 'remains superlinear' in text,
          text[-90:].replace('\n', ' '))

    choose('restrict')
    check('mitigations: a length cap is graded conditional',
          'conditional' in page.inner_text('#verdict-text').lower(),
          page.inner_text('#verdict-text'))

    text = choose('replace')
    check('mitigations: replacing the expression removes the vulnerability',
          'removes the vulnerability' in text, text[:90].replace('\n', ' '))


def check_backtracking_model_is_labelled(page) -> None:
    caveat = page.inner_text('#model-caveat')
    check('model: the diagram is labelled a model and not a trace',
          'conceptual model of backtracking' in caveat and 'not a trace' in caveat,
          caveat[:80].replace('\n', ' '))
    check('model: it says the engine may optimise candidates away',
          'optimise some away' in caveat, 'present')

    page.click('button.xpsel[data-xp="exponential"]')
    rows = page.eval_on_selector_all('#model-body .decomp', 'r => r.length')
    check('model: the exponential diagram enumerates divisions', rows >= 8, f'{rows} rows')
    groups = page.eval_on_selector_all(
        '#model-body .decomp:first-child .grp', 'g => g.map(x => x.textContent).join("|")')
    check('model: the first division is the single whole group', groups == 'aaaaa', str(groups))

    page.click('button.xpsel[data-xp="quadratic"]')
    rows = page.eval_on_selector_all('#model-body .scan-row', 'r => r.length')
    check('model: the quadratic diagram enumerates stopping points', rows >= 8, f'{rows} rows')


def check_keyboard(page) -> None:
    page.evaluate('() => document.activeElement && document.activeElement.blur()')
    page.keyboard.press('3')
    check('keyboard: a digit selects an experiment',
          page.inner_text('#expr-source') == '/^(a+)+$/', page.inner_text('#expr-source'))
    page.keyboard.press('1')
    check('keyboard: and another digit changes it',
          page.inner_text('#expr-source') == '/^.*\\s+$/', page.inner_text('#expr-source'))

    page.keyboard.press('r')
    page.wait_for_function(
        "() => /running|complete/i.test(document.getElementById('status-text').textContent)",
        timeout=20000)
    check('keyboard: R starts a run', True, page.inner_text('#status-text'))
    page.wait_for_function(
        "() => /complete/i.test(document.getElementById('status-text').textContent)", timeout=30000)
    page.keyboard.press('x')
    check('keyboard: X resets',
          page.eval_on_selector_all('#results-table tbody tr', 'r => r.length') == 0,
          page.inner_text('#status-text'))

    # The shortcuts must stand down inside a field, or typing a length would start a run.
    page.click('#maxlen')
    page.keyboard.press('r')
    check('keyboard: R inside a form field does not start a run',
          'idle' in page.inner_text('#status-text').lower(), page.inner_text('#status-text'))
    page.evaluate('() => document.activeElement.blur()')

    # Every control is tab-reachable and shows a focus ring.
    reachable = page.evaluate("""() => {
      const sel = 'button, a[href], input, summary, [tabindex]:not([tabindex="-1"])';
      return Array.from(document.querySelectorAll(sel))
        .filter(el => !el.disabled && el.offsetParent !== null).length;
    }""")
    check('keyboard: the page exposes focusable controls', reachable >= 15, str(reachable))


def check_layout(page) -> None:
    for width, height in ((1920, 1080), (1366, 768), (420, 900)):
        page.set_viewport_size({'width': width, 'height': height})
        page.wait_for_timeout(260)
        over = page.evaluate(
            '() => document.documentElement.scrollWidth - document.documentElement.clientWidth')
        check(f'layout {width}x{height}: no horizontal overflow', over <= 1, f'{over}px')
        if width >= 1366:
            sizes = page.evaluate("""() => ['status-text','b-budget','expr-source']
              .map(id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize))""")
            check(f'layout {width}x{height}: key readouts are projector-legible',
                  min(sizes) >= 14, f'smallest {min(sizes)}px')
            h1 = page.evaluate(
                "() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)")
            check(f'layout {width}x{height}: the title is large', h1 >= 28, f'{h1}px')
    page.set_viewport_size({'width': 1920, 'height': 1080})
    page.wait_for_timeout(200)


def check_axe(page, label: str) -> None:
    if not os.path.exists(AXE_SOURCE):
        check(f'{label}: axe-core available (skipped: run npm ci)', True)
        return
    with open(AXE_SOURCE, encoding='utf-8') as fh:
        page.add_script_tag(content=fh.read())
    result = page.evaluate('() => axe.run().then(r => r.violations.map('
                           'v => v.id + "(" + v.nodes.length + ")"))')
    check(f'{label}: axe-core finds no violation', not result, ', '.join(result) or 'clean')


def check_dark_mode_redraw(page, label: str) -> None:
    """The charts read their colours from CSS custom properties, so a scheme switch must redraw
    them. A chart left painted in the light palette on a dark ground is unreadable, and nothing
    about it looks like a bug in a screenshot taken in light mode."""
    page.emulate_media(color_scheme='dark')
    page.wait_for_timeout(300)
    painted = page.evaluate("""() => {
      const c = document.getElementById('c-work');
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let opaque = 0;
      for (let i = 3; i < d.length; i += 4) { if (d[i] !== 0) opaque += 1; }
      return opaque;
    }""")
    check(f'{label}: the charts repaint for a dark scheme', painted > 500, f'{painted} opaque px')
    page.emulate_media(color_scheme='light')
    page.wait_for_timeout(200)


# --------------------------------------------------------------------------------------------- #
# the run
# --------------------------------------------------------------------------------------------- #

def suite(browser, url: str, label: str, deep: bool) -> None:
    print(f'\n== {label}: {url} ==')
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    requests: list[str] = []
    console: list[str] = []
    page.on('request', lambda r: requests.append(r.url))
    page.on('console', lambda m: console.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: console.append(f'pageerror: {e}'))
    page.goto(url)
    page.wait_for_timeout(400)

    check_no_console_errors(page, label, console)
    check_no_network(page, label, requests)
    check_canvases_paint(page, label)
    check_download_control(page, label)
    check_self_tests(page, label)

    if deep:
        check_experiment_selector(page)
        check_length_control(page)
        check_backtracking_model_is_labelled(page)
        check_mitigations(page)
        check_budget_terminates_and_recovers(page)
        check_budget_halt_on_the_ladder(page)
        check_safe_alternative_survives_the_same_input(page)
        check_scale_toggle(page)
        check_keyboard(page)
        check_dark_mode_redraw(page, label)
        check_layout(page)
        check_axe(page, label)
        check_no_console_errors(page, f'{label} (after interaction)', console)
        check_no_network(page, f'{label} (after interaction)', requests)

    page.close()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--browser', action='append', dest='browsers',
                    choices=['chromium', 'firefox', 'webkit'],
                    help='repeatable; default chromium + firefox')
    ap.add_argument('--serve', action='store_true',
                    help='also run against a served copy over http')
    args = ap.parse_args()
    browsers = args.browsers or ['chromium', 'firefox']

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print('browser_test.py: playwright is not installed — treating the tier as skipped',
              file=sys.stderr)
        return 2

    file_url = f'file://{DEMO}'
    serve_url = serve_demo() if args.serve else None

    launched = 0
    with sync_playwright() as p:
        for name in browsers:
            try:
                browser = getattr(p, name).launch()
            except Exception as exc:                      # noqa: BLE001 — reported, never swallowed
                print(f'browser_test.py: could not launch {name}: {exc}', file=sys.stderr)
                continue
            launched += 1
            try:
                suite(browser, file_url, f'{name} file://', deep=True)
                if serve_url:
                    suite(browser, f'{serve_url}index.html', f'{name} served', deep=True)
            finally:
                browser.close()

    if not launched:
        print('browser_test.py: no browser could be launched — treating the tier as skipped',
              file=sys.stderr)
        return 2

    print(f'\n{"ALL BROWSER CHECKS PASS" if not failures else f"{len(failures)} CHECK(S) FAILED"}')
    for name in failures:
        print(f'  FAILED: {name}')
    return 0 if not failures else 1


if __name__ == '__main__':
    sys.exit(main())
