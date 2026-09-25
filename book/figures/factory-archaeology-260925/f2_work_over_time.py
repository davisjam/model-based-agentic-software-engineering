#!/usr/bin/env python3
"""F2 — Work over time: Epics created / closed / active per week.

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv, writes
f2_work_over_time.svg into ../../assets/. matplotlib only. Unsmoothed.
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


def as_int(v):
    return int(v) if v not in ("", None) else 0


def main():
    with (DATA / "weekly_factory_metrics.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    created = [as_int(r["epics_created"]) for r in rows]
    closed = [as_int(r["epics_closed"]) for r in rows]
    active = [as_int(r["active_epics_estimate"]) for r in rows]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
    ax1.bar([i - 0.2 for i in x], created, width=0.4, label="Epics created", color="#3182bd")
    ax1.bar([i + 0.2 for i in x], closed, width=0.4, label="Epics closed", color="#e6550d")
    ax1.set_ylabel("Epics / week")
    ax1.set_title("F2 — Work over time: Epics created vs closed per week (weekly work-intent units)")
    ax1.legend(fontsize=8)
    ax1.grid(axis="y", alpha=0.3)

    ax2.plot(x, active, marker=".", color="#31a354", label="active Epics (cum created - cum closed)")
    ax2.fill_between(x, active, alpha=0.2, color="#31a354")
    ax2.set_ylabel("active Epics (estimate)")
    ax2.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    ax2.legend(fontsize=8)
    ax2.grid(axis="y", alpha=0.3)
    step = max(1, len(weeks) // 15)
    ax2.set_xticks(x[::step])
    ax2.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f2_work_over_time.{ext}", dpi=150)
    print(f"wrote f2_work_over_time.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
