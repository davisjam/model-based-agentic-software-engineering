"""The METRICS-DASHBOARD view — a typed model of the metrics the book steers by or certifies with, carrying
the author's INCLUSION CRITERION so a future metric is testable against it, not sorted by taste. A sibling of
the other declared -> generated book models (claims / outline / flagship-stack): the hand-authored source of
truth is `book-models/metrics-dashboard.json`. The model is now REGISTRY-ONLY — it is the resolution target
for the operator cards' `DASH:` evidence_refs and carries the structural mode-count / defined-in invariants.
The former page-parity projection into Appendix D.1's table is RETIRED: the Operator's-Reference copyedit
replaced D.1's raw 10-metric table with a conceptual five-reading table and routed the raw metrics to
Appendix H (the Evidence Ledger's per-section receipts), so no page holds the projection any longer.

FORMATIVE vs SUMMATIVE.  Every metric the book names is on the dashboard now — an engineering reference wants
the whole set — but each carries a MODE that says WHEN you read it. A `formative` metric is measured DURING
the work and feeds back to steer the next step. A `summative` metric is measured at MATURITY and delivers a
verdict on what was achieved. A `both` metric is a trajectory: watched formatively as it forms, reported
summatively at maturity. The criterion (verbatim from the author): a metric belongs iff it is one you STEER
BY while the work is in flight (formative) or one you CERTIFY THE RESULT with at maturity (summative) —
measured to guide or to judge engineering with MAGE, not merely reported.

DERIVATION, ONE SOURCE.
  * `render_table_md()` — the mode-banded markdown table (all ten metrics: a Formative band, a divider row,
    then a Summative band carrying the summative + both metrics). Regenerate it on demand with `... table`;
    it is no longer authored into any page (see the retirement note above).
  * `structural_findings()` — the invariants (schema + defined-in resolution + the ratified mode counts),
    wired into `catalog.py validate`. `parity_findings()` remains defined but is NO LONGER wired: the page
    it held equal was dissolved by the copyedit.

Run `python3 book-models/metrics_dashboard_model.py verify` to drift-check (structural invariants);
`... table` to print the mode-banded markdown table; `... show` to list every metric and its mode.
"""
from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass

from _book_pages import book_page_slugs as _book_page_slugs  # shared page-slug resolver (extract-on-2nd-site)
from _projection_parity import page_block_parity  # shared authored-page table-parity check (extract-on-3rd-site)

_HERE = os.path.dirname(os.path.abspath(__file__))
_DECLARED = os.path.join(_HERE, "metrics-dashboard.json")
_ROOT = os.path.dirname(_HERE)  # the governance-catalog repo root (book-models/ is one level down)
_BOOK = os.path.join(_ROOT, "book")

#: The page the mode-banded table is authored into (parity target). The Operator's Dashboard moved from a
#: back-matter chapter to Appendix D.1 (Operator's Reference); the model projects into and holds equal its new
#: appendix-card home.
_PAGE_REL = os.path.join("appendix-operators-reference", "operators-dashboard.md")

#: The valid MODE values — the formative/summative axis, plus `both` for a trajectory metric.
_VALID_MODES = ("formative", "summative", "both")

#: The ratified mode split — encode the author's set so a silent add/drop/reclassify reddens (C5).
EXPECT_TOTAL = 10
EXPECT_FORMATIVE = 6
EXPECT_SUMMATIVE = 1
EXPECT_BOTH = 3

#: The dashboard columns (the header the projection emits and the page carries; parity is exact).
_COLUMNS = ("Metric", "Mode", "What it counts", "When to watch", "Healthy direction", "Defined in")
_TABLE_HEADER = "| " + " | ".join(_COLUMNS) + " |"
_TABLE_RULE = "|" + "---|" * len(_COLUMNS)

_REQUIRED_FIELDS = ("name", "slug", "counts", "informs", "healthy_direction", "defined_in", "mode", "rationale")


# ---- typed model ------------------------------------------------------------------------------------

@dataclass
class Metric:
    """One metric the book names. `mode` is the formative/summative verdict against the inclusion criterion;
    `rationale` records WHY it lands in that band (so the call is auditable, not silent). `defined_in` cites
    the chapter and heading anchor where the metric lives — the load-bearing 'reference index' column."""
    name: str
    slug: str
    counts: str
    informs: str
    healthy_direction: str
    defined_in: dict
    mode: str
    rationale: str


@dataclass
class DashboardModel:
    inclusion_criterion: str
    mode_bands: dict
    metrics: "list[Metric]"

    def formative(self) -> "list[Metric]":
        """The formative band — metrics you steer by while the work is in flight, in declared order."""
        return [m for m in self.metrics if m.mode == "formative"]

    def summative_band(self) -> "list[Metric]":
        """The summative band — the summative verdict metric plus the `both` trajectory metrics (whose
        reference number is the mature verdict), in declared order."""
        return [m for m in self.metrics if m.mode in ("summative", "both")]

    def by_mode(self, mode: str) -> "list[Metric]":
        return [m for m in self.metrics if m.mode == mode]


# ---- load + build -----------------------------------------------------------------------------------

def _load_declared() -> dict:
    with open(_DECLARED, encoding="utf-8") as fh:
        return json.load(fh)


def derive_model() -> DashboardModel:
    """Build the typed model from the hand-authored declarations — the single derivation the projection and
    the checks share."""
    raw = _load_declared()
    metrics = [
        Metric(
            name=m["name"], slug=m["slug"], counts=m["counts"], informs=m["informs"],
            healthy_direction=m["healthy_direction"], defined_in=m["defined_in"],
            mode=str(m["mode"]), rationale=m["rationale"],
        )
        for m in raw["metrics"]
    ]
    return DashboardModel(
        inclusion_criterion=raw["inclusion_criterion"],
        mode_bands=raw.get("_mode_bands", {}),
        metrics=metrics,
    )


# ---- book-chapter resolution ------------------------------------------------------------------------
# The page-slug resolve set for each metric's `defined_in.page_slug` (C4) is the shared `_book_pages`
# derivation (imported as `_book_page_slugs` above), so a chapter add/rename updates every model at once.


# ---- invariants (C1-C5; the structural checks catalog.py validate walks) ----------------------------

def structural_findings(model: "DashboardModel | None" = None) -> "list[str]":
    """The STRUCTURAL / SCHEMA invariants. Each finding is a defect the fast gate should catch.

    C1 — a non-empty inclusion criterion (the model without its rule is just a list).
    C2 — every metric carries all required fields, non-empty (defined_in is a dict with chapter+page_slug).
    C3 — slugs are unique and kebab-case; `mode` is one of the valid formative/summative/both values.
    C4 — every `defined_in.page_slug` resolves to a real book chapter page.
    C5 — the mode split matches the ratified set (all ten present; 6 formative, 1 summative, 3 both).
    """
    if model is None:
        model = derive_model()
    findings: "list[str]" = []

    if not model.inclusion_criterion.strip():
        findings.append("C1 the model carries no inclusion_criterion")

    page_slugs = _book_page_slugs()
    seen: "set[str]" = set()
    raw = _load_declared()["metrics"]
    for m, rawm in zip(model.metrics, raw):
        # C2 — required fields present + non-empty.
        for f in _REQUIRED_FIELDS:
            if f not in rawm:
                findings.append(f"C2 metric {m.slug!r} is missing field {f!r}")
            elif f != "defined_in" and not str(rawm[f]).strip():
                findings.append(f"C2 metric {m.slug!r} has empty field {f!r}")
        if not isinstance(m.defined_in, dict) or not m.defined_in.get("label"):
            findings.append(f"C2 metric {m.slug!r} defined_in lacks a label")

        # C3 — slug shape + uniqueness + valid mode.
        if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", m.slug):
            findings.append(f"C3 metric {m.slug!r} slug is not kebab-case")
        if m.slug in seen:
            findings.append(f"C3 duplicate metric slug {m.slug!r}")
        seen.add(m.slug)
        if m.mode not in _VALID_MODES:
            findings.append(f"C3 metric {m.slug!r} mode {m.mode!r} is not one of {_VALID_MODES}")

        # C4 — defined_in resolves to a real chapter page.
        page = (m.defined_in or {}).get("label", "")
        if page and page not in page_slugs:
            findings.append(f"C4 metric {m.slug!r} defined_in label {page!r} resolves to no book chapter")

    # C5 — the ratified mode split (all ten present; the mode-classified counts).
    total = len(model.metrics)
    if total != EXPECT_TOTAL:
        findings.append(f"C5 {total} metrics, expected {EXPECT_TOTAL} (a metric was added or removed)")
    nf, ns, nb = len(model.by_mode("formative")), len(model.by_mode("summative")), len(model.by_mode("both"))
    if nf != EXPECT_FORMATIVE:
        findings.append(f"C5 {nf} formative metrics, expected {EXPECT_FORMATIVE} (a metric was reclassified)")
    if ns != EXPECT_SUMMATIVE:
        findings.append(f"C5 {ns} summative metrics, expected {EXPECT_SUMMATIVE} (a metric was reclassified)")
    if nb != EXPECT_BOTH:
        findings.append(f"C5 {nb} both-mode metrics, expected {EXPECT_BOTH} (a metric was reclassified)")

    return findings


# ---- projection: the markdown table -----------------------------------------------------------------

def _defined_in_cell(d: dict) -> str:
    """Render the `Defined in` cell as a book cross-chapter link — `[N.M](slug.html#anchor)`. The chapter
    number + href stem are DERIVED from the identity label (neither is stored)."""
    import chapter_identity_model as chapter_identity  # noqa: E402 — sibling book-model
    label, anchor = d.get("label", ""), d.get("anchor", "")
    known = label in chapter_identity.labels()
    chapter = chapter_identity.number(label) if known else label
    stem = os.path.basename(chapter_identity.html_href(label))[:-5] if known else label
    href = f"{stem}.html#{anchor}" if anchor else f"{stem}.html"
    return f"[{chapter}]({href})"


def _metric_row(m: Metric) -> str:
    """One metric as a markdown table row — the six columns in header order."""
    return (
        f"| **{m.name}** | {m.mode} | {m.counts} | {m.informs} | "
        f"{m.healthy_direction} | {_defined_in_cell(m.defined_in)} |"
    )


def _band_row(label: str) -> str:
    """A band-label row — the midrule/divider between the formative and summative groups. The label sits in
    the first cell; the remaining cells are empty, so it reads as a labeled divider that renders cleanly in
    BOTH projections (an ordinary pipe-table row in HTML and Typst alike)."""
    return f"| **{label}** |" + " |" * (len(_COLUMNS) - 1)


def render_table_rows(model: "DashboardModel | None" = None) -> "list[str]":
    """All ten metrics as markdown table lines (no header), in two mode bands separated by a band-label
    divider — the page carries exactly these."""
    if model is None:
        model = derive_model()
    rows: "list[str]" = [_band_row(model.mode_bands["formative"])]
    rows += [_metric_row(m) for m in model.formative()]
    rows.append(_band_row(model.mode_bands["summative"]))
    rows += [_metric_row(m) for m in model.summative_band()]
    return rows


def render_table_md(model: "DashboardModel | None" = None) -> str:
    """The full markdown table (header + rule + the two mode bands) the Operator's Dashboard page shows."""
    return "\n".join([_TABLE_HEADER, _TABLE_RULE, *render_table_rows(model)])


# ---- parity: the page carries the projection --------------------------------------------------------

def parity_findings(model: "DashboardModel | None" = None) -> "list[str]":
    """The page's table must equal the model's projection — the authored-content + parity-validator idiom.
    A mismatch means the page and the model have drifted; regenerate the table from `... table`. Delegates
    the extract-and-diff to the shared `page_block_parity` harness (extract-on-3rd-site DRY)."""
    if model is None:
        model = derive_model()
    return page_block_parity(
        os.path.join(_BOOK, _PAGE_REL), _TABLE_HEADER, render_table_md(model).splitlines(),
        display=_PAGE_REL, label="dashboard table", regen_hint="table")


def all_findings(model: "DashboardModel | None" = None) -> "list[str]":
    """The check catalog.py validate runs: STRUCTURAL only. WHY no parity: the copyedit dissolved D.1's
    projected 10-metric table (the metrics are now framed conceptually in D.1 and carried as per-section
    receipts in Appendix H), so there is no page left for the projection to hold equal — the page-parity
    check was verifying something editorial intent removed. This model stays as the DASH evidence-ref
    registry + the structural mode-count / defined-in invariants; `parity_findings` is intentionally
    unwired (kept only for the manual `table` regen path), not deleted."""
    if model is None:
        model = derive_model()
    return structural_findings(model)


# ---- CLI --------------------------------------------------------------------------------------------

def _cmd_table() -> int:
    print(render_table_md())
    return 0


def _cmd_show() -> int:
    model = derive_model()
    print(f"inclusion criterion:\n  {model.inclusion_criterion}\n")
    for m in model.metrics:
        print(f"[{m.mode:>10}] {m.name}  (defined in {m.defined_in.get('label', '?')})")
        print(f"             {m.rationale}")
    nf, ns, nb = len(model.by_mode("formative")), len(model.by_mode("summative")), len(model.by_mode("both"))
    print(f"\n{len(model.metrics)} metrics · {nf} formative · {ns} summative · {nb} both")
    return 0


def _cmd_verify() -> int:
    model = derive_model()
    findings = all_findings(model)
    if findings:
        print(f"metrics-dashboard: {len(findings)} finding(s):")
        for f in findings:
            print(f"  {f}")
        return 1
    nf, ns, nb = len(model.by_mode("formative")), len(model.by_mode("summative")), len(model.by_mode("both"))
    print(f"metrics-dashboard is in sync ({len(model.metrics)} metrics: {nf} formative, {ns} summative, "
          f"{nb} both; structural invariants pass — registry-only, page-parity retired)")
    return 0


def main(argv: "list[str]") -> int:
    cmd = argv[1] if len(argv) > 1 else "verify"
    if cmd == "verify":
        return _cmd_verify()
    if cmd == "table":
        return _cmd_table()
    if cmd == "show":
        return _cmd_show()
    print(f"usage: {argv[0]} [verify|table|show]")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
