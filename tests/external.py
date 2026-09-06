"""External (Tier-2) checks that need a tool beyond the stdlib: axe-core accessibility over the built
site, and `claude plugin validate` on the manifests. Each SKIPs when its tool is absent (FAIL only under
--strict), so a fresh clone / browser-less CI stays green on the Tier-1 core.

One stdlib companion lives here too — `check_axe_coverage_set` — the Tier-1 twin of the axe pass. It
gates the DETERMINISTIC, model-derived coverage set the axe scan always includes, so the a11y gate stays
trustworthy even on a browser-less runner where the axe pass itself SKIPs (same "stdlib twin of a T2
check" pattern the suite uses elsewhere)."""
from __future__ import annotations

import os
import random
import re
import shutil
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from tests.common import _NON_SITE_DIRS, FAIL, PASS, ROOT, SKILL, SKIP, free_port, html_files, run


class _SiteHandler(SimpleHTTPRequestHandler):
    """Serve ONLY the built site. axe fetches an explicit page list, but a bare handler would expose the
    whole repo root (incl. `.git`) on the ephemeral localhost port for the run's duration — so refuse any
    path under a non-site dir or a dotfile. 404 (not 403) so it doesn't confirm what exists."""

    def send_head(self):
        rel = self.path.lstrip("/").split("?", 1)[0].split("#", 1)[0]
        if any(seg in _NON_SITE_DIRS or seg.startswith(".") for seg in rel.split("/") if seg):
            self.send_error(404)
            return None
        return super().send_head()

    def log_message(self, *_args):  # keep the suite output clean (no per-request GET spam)
        pass


def _axe_bucket(rel: str) -> str:
    """Template-family key for one served page (path relative to ROOT). Every page ADAtool renders comes
    from one of a handful of renderer templates; two pages sharing a bucket exercise the SAME template code,
    so scanning ≥1 per bucket covers every renderer path. Buckets:

      - each named top-level page + the three named book index pages → its own bucket (unique templates);
      - `book/appendix-*` → one bucket (the appendix-entry template);
      - other `book/*` (chapters) → one bucket (the chapter template);
      - catalogue entries by first path segment (`agent`/`models-bridge`/`product`), README indexes split
        from leaf entries (index template vs entry template)."""
    top_level_singletons = {
        "index.html", "catalogue-views.html", "quick-start.html",
        "catalogue-figure.html", "development-workflow.html",
        "book/index.html", "book/book-index.html", "book/list-of-figures.html", "book/figures.html",
    }
    if rel in top_level_singletons:
        return rel  # its own bucket
    if rel.startswith("book/appendix-"):
        return "book/appendix-*"
    if rel.startswith("book/"):
        return "book/chapters"
    seg = rel.split("/", 1)[0]  # agent / models-bridge / product (+ any other tree)
    kind = "readme" if rel.endswith("README.html") else "entry"
    return f"{seg}/{kind}"


def _axe_coverage_set(pages: list[str]) -> list[str]:
    """The DETERMINISTIC, model-derived coverage set: one canonical page per template-family bucket.

    The buckets are DERIVED from the built page list (`_axe_bucket` keys off each path's structure), so this
    is a lookup over the actual site — never a hardcoded page list. A new template family enters coverage the
    moment its first page builds; a removed one drops out. Within a bucket the representative is the
    lexicographically-first page, so the set is STABLE run to run. Every structural page-shape is therefore
    axe-checked on EVERY run — closing the false-green window where an unseeded pick could skip a broken
    shape between the exhaustive publish scans. `pages` are ROOT-relative; returns the chosen paths, sorted."""
    buckets: dict[str, list[str]] = {}
    for p in pages:
        buckets.setdefault(_axe_bucket(p), []).append(p)
    return sorted(min(members) for members in buckets.values())


# Fixed seed for the axe tail shuffle. The tail is a deterministic function of the CURRENT sorted page
# list: it still rotates as pages are added/removed, but a RE-RUN on the same tree draws the SAME sample,
# so the gate is reproducible — a flaked page can be re-scanned to the identical set instead of vanishing
# behind a fresh unseeded draw. (Sibling `random.Random(1)` in `check_axe_coverage_set` seeds for the same
# reason.) Coverage is unchanged: same deterministic floor, same tail COUNT — only the nondeterminism is gone.
_AXE_TAIL_SEED = 1


def _axe_sample(pages: list[str], target: int, rng: random.Random) -> tuple[list[str], list[str]]:
    """Choose the pages to scan: the deterministic coverage set (`_axe_coverage_set` — one canonical page
    per template family, scanned every run) PLUS a tail drawn from the remaining pages up to `target`
    (catches regressions in the long tail). `rng` is SEEDED (`_AXE_TAIL_SEED`), so with the pages passed
    sorted the tail is a reproducible function of the current page set — it shifts as the site grows but a
    re-run on the same tree picks the same tail. The coverage set is ALWAYS included in full, even if it
    alone meets or exceeds `target` — `target` caps only the tail, never the trustworthy floor. Returns
    `(coverage, sample)`: the coverage set and the full page list (coverage ∪ tail), both ROOT-relative, sorted."""
    coverage = _axe_coverage_set(pages)
    chosen: set[str] = set(coverage)
    remainder = [p for p in pages if p not in chosen]
    rng.shuffle(remainder)
    for p in remainder:
        if len(chosen) >= target:
            break
        chosen.add(p)
    return coverage, sorted(chosen)


def check_axe(strict: bool):
    """Run axe-core over a REPRESENTATIVE + RANDOM SAMPLE (~25 pages) of the built site, not the whole
    thing. The pages are homogeneous generated output — every one is emitted by the SAME small set of
    renderer templates — so a sample that touches each template family catches a template-level a11y bug
    just as reliably as scanning all ~190 pages, at a fraction of the cost (a full scan is ~10 min; the
    sample runs in ~1-2 min, which is what makes it usable in BOTH local `--full` and CI).

    Sampling has two parts (see `_axe_sample`):
      - DETERMINISTIC COVERAGE SET — bucket the pages by template family (`_axe_bucket`) and always include
        the canonical (lexicographically-first) page of every bucket (`_axe_coverage_set`), so every
        structural page-shape is axe-checked on EVERY run. The set is DERIVED from the built pages, not a
        hardcoded snapshot, so it tracks the site as families are added or removed. This is what makes the
        CI gate trustworthy between the exhaustive publish scans: a sampled tail could skip a broken shape
        on any given run, but the deterministic floor never does. Its stdlib twin `check_axe_coverage_set` gates
        the set's soundness even where no browser is present.
      - REPRODUCIBLE TAIL — fill up to the target with a sample of the remaining pages, using a SEEDED
        `random.Random(_AXE_TAIL_SEED)` over the sorted page list so the tail is a deterministic function of
        the current site: it shifts as pages are added or removed, but a re-run on the same tree draws the
        SAME tail. That reproducibility is what lets a flaked page (e.g. a mid-paint Mermaid contrast
        false-positive) be re-scanned to the identical sample and diagnosed, instead of vanishing behind a
        fresh unseeded draw. The deterministic coverage floor above still carries the structural guarantee.
    Target size defaults to 25, overridable via `ADA_CATALOG_AXE_SAMPLE` for tuning. The chosen count +
    per-bucket sample is printed so a failure is reproducible and the reader sees it's a sample.

    A per-page load delay lets async content (the figure iframes AND the book appendix's CDN-loaded Mermaid
    diagrams) settle so the scan is deterministic — without it a heavy page can be scanned before it
    finishes painting and return a spurious partial result (Mermaid repaints its placeholder blocks after
    the runtime loads, which mid-scan reads as contrast failures on unrelated elements).

    We scan with `tests/axe_scan.cjs`, which launches ONE headless Chrome and reuses it across every URL.
    The old `@axe-core/cli` path spawned a fresh Chrome per URL — a full-site scan paid the browser
    cold-start cost dozens of times (~20 min). One reused browser drops that to a navigation-plus-analyze
    per page. Same engine and pinned versions (`@axe-core/webdriverjs` + `axe-core` + `chromedriver` from
    `npm ci`/`setup.sh`); absent a local install `node` errors and we treat it as a skip (same as no
    browser)."""
    if not shutil.which("node"):
        return (FAIL if strict else SKIP), ["node not found — run ./setup.sh (installs the pinned axe scanner)"]
    scanner = os.path.join(ROOT, "tests", "axe_scan.cjs")
    if not os.path.exists(scanner):
        return (FAIL if strict else SKIP), ["tests/axe_scan.cjs missing"]
    all_pages = sorted(os.path.relpath(p, ROOT) for p in html_files())  # served site only (excl. plugin/)
    if not all_pages:
        return (FAIL if strict else SKIP), ["no built pages to scan (run `catalog.py build` first)"]
    try:
        target = int(os.environ.get("ADA_CATALOG_AXE_SAMPLE", "25"))
    except ValueError:
        target = 25
    rng = random.Random(_AXE_TAIL_SEED)  # SEEDED — tail is reproducible per-tree so a flaked page re-runs identically
    coverage, sample = _axe_sample(all_pages, target, rng)
    cover_set = set(coverage)
    buckets_hit = sorted({_axe_bucket(p) for p in sample})
    tail_n = len(sample) - len(cover_set)
    print(f"          axe: scanning {len(sample)}/{len(all_pages)} pages across {len(buckets_hit)} "
          f"template-family buckets — {len(cover_set)} deterministic coverage-set (one per family, every "
          f"run) + {tail_n} random tail:")
    for p in sample:
        print(f"            [{'cover' if p in cover_set else 'rand '}] {p}")
    pages = sample
    port = free_port()
    httpd = ThreadingHTTPServer(("127.0.0.1", port), partial(_SiteHandler, directory=ROOT))
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    try:
        urls = [f"http://127.0.0.1:{port}/{p}" for p in pages]  # `pages` are already ROOT-relative
        r = run(["node", scanner, "2500", *urls], timeout=900)
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as ex:
        return (FAIL if strict else SKIP), [f"axe could not run ({type(ex).__name__}) — treating as skip"]
    finally:
        httpd.shutdown()
    out = r.stdout + r.stderr
    found = re.findall(r'Violation of "([^"]+)" with (\d+)', out)
    if found:  # real a11y violations — aggregate by rule across all pages
        agg: dict[str, int] = {}
        for name, n in found:
            agg[name] = agg.get(name, 0) + int(n)
        return FAIL, [f"{name}: {cnt} occurrence(s)" for name, cnt in sorted(agg.items(), key=lambda kv: -kv[1])]
    if r.returncode != 0:  # non-zero without a violations summary = launch/browser failure
        return (FAIL if strict else SKIP), [f"axe did not complete (no headless browser?): {out.strip()[:200]}"]
    return PASS, []


def check_axe_coverage_set(strict: bool):
    """Tier-1 stdlib gate on the axe coverage set (no browser needed): the deterministic, model-derived set
    the axe pass always scans must be SOUND — one canonical representative per template-family bucket,
    DERIVED from the built pages (not a hardcoded snapshot; tests look up substrate values), and STABLE
    under input reordering. This is what makes the a11y gate trustworthy between exhaustive publish scans:
    even on a browser-less runner where the axe pass SKIPs, this pins that every structural page-shape sits
    in the every-run coverage set. SKIP (FAIL under --strict) if the site is not built yet."""
    all_pages = sorted(os.path.relpath(p, ROOT) for p in html_files())
    if not all_pages:
        return (FAIL if strict else SKIP), ["no built pages to check (run `catalog.py build` first)"]
    coverage = _axe_coverage_set(all_pages)
    all_buckets = {_axe_bucket(p) for p in all_pages}
    covered = {_axe_bucket(p) for p in coverage}
    issues = []
    missing = sorted(all_buckets - covered)
    if missing:
        issues.append(f"template families with no coverage page: {missing}")
    if len(coverage) != len(all_buckets):
        issues.append(f"coverage set has {len(coverage)} page(s) for {len(all_buckets)} template families "
                      f"(expected exactly one per family)")
    if len(set(coverage)) != len(coverage):
        issues.append("coverage set contains duplicate pages")
    shuffled = list(all_pages)
    random.Random(1).shuffle(shuffled)  # determinism: reordering the input must not change the derived set
    if _axe_coverage_set(shuffled) != coverage:
        issues.append("coverage set is not order-independent — the derivation is not deterministic")
    return (FAIL if issues else PASS), issues


def check_html_valid(strict: bool):
    """Full HTML validity via html-validate — the canonical validator (rules in `.htmlvalidate.json`),
    NOT a hand-rolled definition. Tier-2: needs Node + the pinned html-validate from `npm ci`/`setup.sh`;
    runs offline via `npx --no-install`. SKIP if npx/tool absent (same posture as axe)."""
    if not shutil.which("npx"):
        return (FAIL if strict else SKIP), ["npx not found — run ./setup.sh (installs the pinned html-validate)"]
    pages = sorted(os.path.relpath(p, ROOT) for p in html_files())
    if not pages:
        return (FAIL if strict else SKIP), ["no built pages to validate (run `catalog.py build` first)"]
    try:
        r = run(["npx", "--no-install", "html-validate", *pages], timeout=300)
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as ex:
        return (FAIL if strict else SKIP), [f"html-validate could not run ({type(ex).__name__}) — treating as skip"]
    if r.returncode == 0:
        return PASS, []
    out = r.stdout + r.stderr
    errs = [ln.strip() for ln in out.splitlines() if re.search(r"\d+:\d+\s+error", ln)]
    if errs:
        return FAIL, errs[:30]  # real validation errors
    return (FAIL if strict else SKIP), [f"html-validate did not complete: {out.strip()[:200]}"]


def check_lab_logo_url(strict: bool):
    """The canonical Duality Lab logo lives in a repo this one does not control
    (davisjam/davisjam.github.io, served at /images/logo.svg) and is referenced here root-absolute rather
    than vendored. A rename there breaks the image on every MAGE page silently; this is the control that
    catches it. Network — SKIP when offline, FAIL only under --strict (matches this file's convention).
    Uses curl (system cert store) rather than urllib to avoid the macOS CERTIFICATE_VERIFY_FAILED trap."""
    url = "https://davisjam.github.io/images/logo.svg"
    if not shutil.which("curl"):
        return (FAIL if strict else SKIP), ["curl not found — cannot verify the logo URL"]
    try:
        r = subprocess.run(["curl", "-sS", "-o", os.devnull, "-w", "%{http_code}", url],
                           capture_output=True, text=True, timeout=15)
    except subprocess.TimeoutExpired:
        return (FAIL if strict else SKIP), [f"timed out reaching {url} (offline?)"]
    if r.returncode != 0:
        return (FAIL if strict else SKIP), [f"could not reach {url} (offline?): {r.stderr.strip()[:160]}"]
    code = r.stdout.strip()
    return (PASS, []) if code == "200" else (FAIL, [f"{url} returned HTTP {code}, expected 200 — the "
                                                    "single-sourced logo was renamed or removed upstream"])


def check_claude_validate(strict: bool):
    """`claude plugin validate` on the plugin dir + the marketplace root. LOCAL-ONLY: the `claude` CLI is
    never invoked in CI (headless runners have no interactive CLI, and CI must not call it) — it SKIPs under
    a CI runner. On a developer machine it runs; SKIP if the CLI is absent there."""
    if os.environ.get("CI") or os.environ.get("GITHUB_ACTIONS"):
        return SKIP, ["local-only — `claude` is not invoked in CI (run locally with the CLI installed)"]
    if not shutil.which("claude"):
        return (FAIL if strict else SKIP), ["claude CLI not found"]
    issues = []
    for path, label in ((SKILL, "plugin"), (ROOT, "marketplace")):
        try:
            r = run(["claude", "plugin", "validate", path], timeout=120)
        except subprocess.TimeoutExpired:
            return (FAIL if strict else SKIP), [f"claude plugin validate ({label}) timed out"]
        if r.returncode != 0:
            issues.append(f"{label}: {(r.stdout + r.stderr).strip()[:300]}")
    return (FAIL if issues else PASS), issues
