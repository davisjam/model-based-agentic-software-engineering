#!/usr/bin/env python3
"""F5 + F6 — Factory capital (weekly LoC by category) and the support ratio.

Standalone: reads ../../data/factory-archaeology-260925/loc_weekly.csv (dense per-project-week series) and
../../data/factory-archaeology-260925/loc_snapshots.csv (the book's 4 authored snapshots, overlaid as
reference markers). matplotlib only.

F5 stacks production + support-category LoC across every project week (the
"heavy weekly cloc" reconstruction: newline count of code + markdown source at
each week's last-commit tree, vendored/generated trees excluded). F6 plots the
support/production ratio weekly, with the book's 4 snapshot ratios overlaid.

IMPORTANT — this is an INDEPENDENT re-derivation with our own path-map
(provenance/B_factory_capital.md), NOT the book's cloc numbers. Our
"production" at the Aug-3 SHA (~557k) is close to the book's 491k, but our
"support" is broader (it folds markdown docs + all of tools/ + deploy/), so the
folded ratio runs higher than the book's 3.0. The support_ratio_excl_docs line
(closer to the book's engineering-support framing) lands near ~3.5-3.9 at the
Aug-3 snapshot and reproduces the book's below-parity -> ~3x TREND. Missing
weeks (no commits) are gaps, not interpolated.
"""
from __future__ import annotations
import csv
import datetime as dt
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "data" / "factory-archaeology-260925"
OUT = HERE.parent.parent / "assets"   # renders land where the book reads figures from

# Project W1 = ISO week of repo inception (2026-03-12, ISO 2026-W11; Monday
# 2026-03-09). Keep in sync with the miner's project-week convention.
_W1_MONDAY = dt.date(2026, 3, 9)


def _project_week_of_date(date_str: str) -> int:
    d = dt.date.fromisoformat(date_str)
    monday = d - dt.timedelta(days=d.isoweekday() - 1)
    return (monday - _W1_MONDAY).days // 7 + 1


def num(v):
    return float(v) if v not in ("", None) else None


def main():
    with (DATA / "loc_weekly.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    pw = [int(r["project_week"]) for r in rows]
    cats = ["prod_loc", "test_loc", "controls_loc", "orchestration_loc",
            "infra_loc", "docs_loc", "system_model_loc"]
    labels = {
        "prod_loc": "production", "test_loc": "tests",
        "controls_loc": "controls (lint/gate/hooks)",
        "orchestration_loc": "orchestration (tools/agents)",
        "infra_loc": "infra (deploy/tools)", "docs_loc": "docs",
        "system_model_loc": "system-models",
    }
    colors = {
        "prod_loc": "#2f5169", "test_loc": "#9a3f12", "controls_loc": "#31a354",
        "orchestration_loc": "#756bb1", "infra_loc": "#c99a2e",
        "docs_loc": "#7fb0c9", "system_model_loc": "#d95f0e",
    }
    series = {c: [num(r[c]) for r in rows] for c in cats}

    # Book snapshot overlay (loc_snapshots.csv) — where a ratio is present.
    with (DATA / "loc_snapshots.csv").open() as fh:
        snaps = list(csv.DictReader(fh))
    snap_pts = [(_project_week_of_date(s["date"]), num(s["support_ratio"]), s["snapshot"])
                for s in snaps if num(s["support_ratio"]) is not None]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5))

    # F5 — stacked category LoC across project weeks (only populated weeks).
    xs = [p for p, r in zip(pw, rows) if r["prod_loc"] not in ("", None)]
    bottom = [0.0] * len(xs)
    for c in cats:
        vals = [num(r[c]) or 0.0 for r in rows if r["prod_loc"] not in ("", None)]
        ax1.bar(xs, vals, bottom=bottom, label=labels[c], color=colors[c], width=0.9)
        bottom = [b + v for b, v in zip(bottom, vals)]
    ax1.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    ax1.set_ylabel("lines of code (code + markdown; vendored excluded)")
    ax1.set_title("F5 — Factory capital by category, per project week\n"
                  "(weekly source-tree LoC; W2-W3 = no commits, gap not interpolated)")
    ax1.legend(fontsize=7, loc="upper left")
    ax1.grid(axis="y", alpha=0.3)

    # F6 — support ratio (two definitions) + book snapshot overlay.
    ratio = [num(r["support_ratio"]) for r in rows]
    ratio_xd = [num(r["support_ratio_excl_docs"]) for r in rows]
    rx = [p for p, v in zip(pw, ratio) if v is not None]
    rv = [v for v in ratio if v is not None]
    rxd = [p for p, v in zip(pw, ratio_xd) if v is not None]
    rvd = [v for v in ratio_xd if v is not None]
    ax2.plot(rx, rv, marker=".", color="#2c7fb8",
             label="support / production (all support, incl. docs)")
    ax2.plot(rxd, rvd, marker=".", color="#31a354",
             label="support / production (excl. docs — book-comparable)")
    if snap_pts:
        ax2.scatter([p for p, _, _ in snap_pts], [r for _, r, _ in snap_pts],
                    marker="D", s=60, color="#d95f0e", zorder=5,
                    label="book snapshot ratio (cloc; author-reported)")
        for p, r, name in snap_pts:
            ax2.annotate(f"{name}\n{r:.2f}x", (p, r), fontsize=7,
                         textcoords="offset points", xytext=(4, 6), color="#d95f0e")
    ax2.axhline(1.0, color="k", linestyle=":", alpha=0.5, label="parity (1.0x)")
    ax2.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    ax2.set_ylabel("support / production ratio")
    ax2.set_title("F6 — Support ratio over project weeks\n"
                  "(our path-map re-derivation; book cloc snapshots overlaid as diamonds)")
    ax2.legend(fontsize=7, loc="upper left")
    ax2.grid(axis="y", alpha=0.3)

    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f5_f6_capital_and_support_ratio.{ext}", dpi=150)
    print(f"wrote f5_f6_capital_and_support_ratio.svg "
          f"({len(xs)} populated weeks; {len(snap_pts)} book snapshots overlaid)")


if __name__ == "__main__":
    main()
