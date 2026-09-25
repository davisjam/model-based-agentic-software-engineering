#!/usr/bin/env python3
"""F9 — Governance conversion over time: cumulative + weekly-new.

Standalone: reads ../../data/factory-archaeology-260925/governance_conversion_series.csv. matplotlib only.

SMALL N: these are the book's ~12 narrative governance-conversion episodes
(plus 3 ex-ante confirmations), NOT a mechanical census of every control.
Dates are approximate (book narrative + git anchors). Read as a documented,
named discipline, not a measured rate. See ../../data/factory-archaeology-260925/provenance/C_governance_conversion.md.
"""
from __future__ import annotations
import csv
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "data" / "factory-archaeology-260925"
OUT = HERE.parent.parent / "assets"   # renders land where the book reads figures from


def main():
    with (DATA / "governance_conversion_series.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    new = [int(r["conversions_new"]) for r in rows]
    cum = [int(r["cum_conversions"]) for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5))
    ax.bar(x, new, color="#d95f0e", label="new conversions this week")
    ax2 = ax.twinx()
    ax2.plot(x, cum, marker=".", color="#2f5169", label="cumulative conversions")
    ax.set_title("F9 — Governance conversion over time (book narrative episodes; small N, approx dates)\n"
                 "a documented, named discipline — NOT a measured causal rate")
    ax.set_ylabel("new conversions / week")
    ax2.set_ylabel("cumulative conversions")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(loc="upper left", fontsize=8)
    ax2.legend(loc="lower right", fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f9_conversion_over_time.{ext}", dpi=150)
    print(f"wrote f9_conversion_over_time.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
