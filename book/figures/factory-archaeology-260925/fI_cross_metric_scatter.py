#!/usr/bin/env python3
"""FI — Cross-metric scatter grid (DESCRIPTIVE, no causal claims).

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv +
../../data/factory-archaeology-260925/cross_metric_correlations.csv. matplotlib only.

Four weekly scatters with Pearson/Spearman annotated. These are DESCRIPTIVE
relationships only — NO causal interpretation. The commits-vs-merge-train-
landings panel deliberately shows ~0 correlation: they measure different
things across the ~W32 landing-mechanism regime shift (that near-zero IS a
finding, not noise). See ../../data/factory-archaeology-260925/provenance/I_cross_metric.md.
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
    with (DATA / "weekly_factory_metrics.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    corr = {}
    with (DATA / "cross_metric_correlations.csv").open() as fh:
        for r in csv.DictReader(fh):
            corr[(r["metric_x"], r["metric_y"])] = (r["pearson_r"], r["spearman_rho"])

    def pts(a, b):
        xs, ys = [], []
        for r in rows:
            va, vb = r.get(a, ""), r.get(b, "")
            if va in ("", None) or vb in ("", None):
                continue
            try:
                xs.append(float(va)); ys.append(float(vb))
            except ValueError:
                continue
        return xs, ys

    panels = [
        ("commits_all", "files_changed"),
        ("epics_created", "epics_closed"),
        ("commits_all", "agent_landings_merge_train"),
        ("commits_all", "lint_files"),
    ]
    fig, axes = plt.subplots(2, 2, figsize=(12, 9))
    for ax, (a, b) in zip(axes.flat, panels):
        xs, ys = pts(a, b)
        ax.scatter(xs, ys, alpha=0.7, color="#2c7fb8")
        pr, sr = corr.get((a, b), ("", ""))
        ax.set_xlabel(a); ax.set_ylabel(b)
        ax.set_title(f"{a} vs {b}\nPearson r={pr}, Spearman rho={sr} (n={len(xs)})", fontsize=9)
        ax.grid(alpha=0.3)
    fig.suptitle("FI — Cross-metric weekly scatters (DESCRIPTIVE; no causal claims)", fontsize=11)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"fI_cross_metric_scatter.{ext}", dpi=150)
    print("wrote fI_cross_metric_scatter.svg")


if __name__ == "__main__":
    main()
