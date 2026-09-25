#!/usr/bin/env python3
"""F4 — Change surface: files changed + insertions/deletions churn per week.

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv, writes
f4_change_surface.svg into ../../assets/. matplotlib only. Unsmoothed.

NOTE: churn is RAW diff churn (includes vendored/generated/snapshot files),
NOT source-tree LoC. Missing weeks (W12-W13, no diffs) are gaps.
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


def val(v):
    return None if v in ("", None) else int(v)


def main():
    with (DATA / "weekly_factory_metrics.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    files = [val(r["files_changed"]) for r in rows]
    ins = [val(r["insertions"]) for r in rows]
    dels = [val(r["deletions"]) for r in rows]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 7), sharex=True)
    fx = [i for i, v in zip(x, files) if v is not None]
    fv = [v for v in files if v is not None]
    ax1.bar(fx, fv, color="#08519c")
    ax1.set_ylabel("files changed / week\n(non-unique)")
    ax1.set_title("F4 — Change surface (raw diff churn; includes vendored/generated files)")
    ax1.grid(axis="y", alpha=0.3)

    ix = [i for i, v in zip(x, ins) if v is not None]
    iv = [v for v in ins if v is not None]
    dv = [(dels[i] or 0) for i in ix]
    ax2.bar(ix, iv, color="#31a354", label="insertions")
    ax2.bar(ix, [-d for d in dv], color="#de2d26", label="deletions")
    ax2.set_ylabel("lines / week")
    ax2.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    ax2.axhline(0, color="k", linewidth=0.5)
    ax2.legend(fontsize=8)
    ax2.grid(axis="y", alpha=0.3)
    step = max(1, len(weeks) // 15)
    ax2.set_xticks(x[::step])
    ax2.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f4_change_surface.{ext}", dpi=150)
    print(f"wrote f4_change_surface.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
