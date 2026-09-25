#!/usr/bin/env python3
"""F13 — Mature-factory flow funnel (representative merge-train week).

Standalone: reads ../../data/factory-archaeology-260925/mature_flow_weekly.csv. matplotlib only.
Picks the week with the most merge_train_complete events (a full mature week,
not a hand-picked good day) and draws a clean staged funnel — NO exotic deps,
no Sankey. Registry-era only (from 2026-05-30). See ../../data/factory-archaeology-260925/provenance/D_mature_flow.md.
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
    with (DATA / "mature_flow_weekly.csv").open() as fh:
        rows = list(csv.DictReader(fh))

    def cint(v):
        return int(v) if v not in ("", None) else 0
    best = max(rows, key=lambda r: cint(r.get("merge_train_complete")))
    wk = best["iso_week"]

    started = cint(best["merge_train_started"])
    complete = cint(best["merge_train_complete"])
    aborted = cint(best["merge_train_aborted"])
    tombstoned = cint(best["tombstone"])

    stages = ["merge-train\nstarted", "merge-train\ncomplete\n(landed)",
              "aborted", "worktrees\ntombstoned"]
    vals = [started, complete, aborted, tombstoned]
    colors = ["#2f5169", "#31a354", "#de2d26", "#756bb1"]

    fig, ax = plt.subplots(figsize=(9, 5.5))
    bars = ax.bar(stages, vals, color=colors)
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v, str(v), ha="center", va="bottom", fontsize=10)
    rate = (100 * complete / started) if started else 0
    ax.set_title(f"F13 — Mature-factory merge-train funnel, representative week {wk}\n"
                 f"{started} started -> {complete} landed ({rate:.1f}%), {aborted} aborted; "
                 "registry-era (from 2026-05-30)")
    ax.set_ylabel("events in the week")
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f13_mature_flow_funnel.{ext}", dpi=150)
    print(f"wrote f13_mature_flow_funnel.svg (week {wk}: {started}->{complete})")


if __name__ == "__main__":
    main()
