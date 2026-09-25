#!/usr/bin/env python3
"""F21 + F22 — Model census: forms (F21) and targets (F22).

Standalone: reads ../../data/factory-archaeology-260925/model_census.csv. matplotlib only.
Reproduces the book's census at this revision (129 models). Two panels:
F21 horizontal bars by declared form; F22 by target (product / agent-factory
/ execution-environment).
"""
from __future__ import annotations
import csv
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "data" / "factory-archaeology-260925"
OUT = HERE.parent.parent / "assets"   # renders land where the book reads figures from


def main():
    with (DATA / "model_census.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    forms = Counter(r["form"] for r in rows)
    targets = Counter(r["target"] for r in rows)
    total = len(rows)

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5))

    fitems = forms.most_common()
    flabels = [k for k, _ in fitems][::-1]
    fvals = [v for _, v in fitems][::-1]
    ax1.barh(flabels, fvals, color="#2c7fb8")
    for i, v in enumerate(fvals):
        ax1.text(v + 0.3, i, str(v), va="center", fontsize=8)
    ax1.set_title(f"F21 — Model forms (n={total})")
    ax1.set_xlabel("declared models")

    titems = targets.most_common()
    tlabels = [k for k, _ in titems][::-1]
    tvals = [v for _, v in titems][::-1]
    colors = {"product": "#31a354", "agent/factory": "#d95f0e",
              "execution-environment": "#756bb1"}
    ax2.barh(tlabels, tvals, color=[colors.get(l, "#888") for l in tlabels])
    for i, v in enumerate(tvals):
        ax2.text(v + 0.5, i, str(v), va="center", fontsize=9)
    ax2.set_title(f"F22 — Model targets (n={total})")
    ax2.set_xlabel("declared models")

    fig.suptitle("Model census (reproduces the book: 129 models; forms 50/17/12/11/10/8/7/4/4/4/2; "
                 "targets 77/51/1)", fontsize=9)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f21_f22_model_census.{ext}", dpi=150)
    print(f"wrote f21_f22_model_census.svg (forms={dict(forms)}, targets={dict(targets)})")


if __name__ == "__main__":
    main()
