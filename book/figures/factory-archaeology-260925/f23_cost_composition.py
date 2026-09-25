#!/usr/bin/env python3
"""F23 — Factory cost composition (book's authored figures).

Standalone: reads ../../data/factory-archaeology-260925/factory_cost_table.csv. matplotlib only.
Bar of the four cost inputs (log scale — human eng dwarfs the rest).
These are the book's cost-table figures through 2026-09-22 (see
provenance/G_cost.md); machine intelligence was NOT the expensive part.
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
    with (DATA / "factory_cost_table.csv").open() as fh:
        rows = [r for r in csv.DictReader(fh) if r["factory_input"] != "TOTAL"]
    labels = [r["factory_input"] for r in rows]
    costs = [float(r["cost_usd"]) for r in rows]
    colors = ["#7a3b12", "#2f5169", "#2c7fb8", "#31a354"]

    fig, ax = plt.subplots(figsize=(9, 5))
    bars = ax.bar(labels, costs, color=colors[:len(labels)], log=True)
    for b, c in zip(bars, costs):
        ax.text(b.get_x() + b.get_width() / 2, c, f"${c:,.0f}", ha="center", va="bottom", fontsize=9)
    ax.set_ylabel("USD (log scale)")
    ax.set_title("F23 — Factory cost composition (book figures, through 2026-09-22)\n"
                 "~90% is human engineering; machine intelligence < $6k of a ~$111k total")
    ax.set_xticklabels(labels, rotation=15, ha="right", fontsize=8)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f23_cost_composition.{ext}", dpi=150)
    print("wrote f23_cost_composition.svg")


if __name__ == "__main__":
    main()
