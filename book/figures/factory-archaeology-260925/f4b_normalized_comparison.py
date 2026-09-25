#!/usr/bin/env python3
"""F4b — Normalized comparison: do the realization traces move together?

Indexes commits / epics-created / merge-train-landings / files-changed each
to its own peak week (=1.0) so their SHAPES overlay. This is a SHAPE
comparison, NOT a substitute for the absolute charts (F1-F4). The gold
outcome the book seeks is 3-4 independent traces telling the same story;
this figure lets the reader see whether they do.

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv. matplotlib only.
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


def col(rows, name):
    out = []
    for r in rows:
        v = r.get(name, "")
        out.append(float(v) if v not in ("", None) else None)
    return out


def normalize(series):
    vals = [v for v in series if v is not None]
    if not vals:
        return series
    peak = max(vals) or 1.0
    return [None if v is None else v / peak for v in series]


def main():
    with (DATA / "weekly_factory_metrics.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    series = {
        "commits (all)": normalize(col(rows, "commits_all")),
        "epics created": normalize(col(rows, "epics_created")),
        "merge-train landings": normalize(col(rows, "agent_landings_merge_train")),
        "files changed": normalize(col(rows, "files_changed")),
    }
    fig, ax = plt.subplots(figsize=(12, 5.5))
    for label, s in series.items():
        sx = [i for i, v in zip(x, s) if v is not None]
        sv = [v for v in s if v is not None]
        ax.plot(sx, sv, marker=".", label=label, alpha=0.8)
    ax.set_title("F4b — Normalized realization traces (each indexed to its own peak week = 1.0)\n"
                 "shape comparison only; see F1-F4 for absolute values")
    ax.set_ylabel("fraction of series peak")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(fontsize=8)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f4b_normalized_comparison.{ext}", dpi=150)
    print(f"wrote f4b_normalized_comparison.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
