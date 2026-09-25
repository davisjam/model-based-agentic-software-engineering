#!/usr/bin/env python3
"""F7 — Controls accumulate: weekly lint files + gate scripts + model files.

Standalone: reads ../../data/factory-archaeology-260925/control_growth_weekly.csv. matplotlib only.
Weekly resolution (extends the book's 4-snapshot curve). The lint-file
definition is validated against the book (595 at the hardening window).
gate_scripts_ourdef is OUR reproducible definition (does not reproduce the
book's exact 0->20->76->102 — see provenance/C_governance_conversion.md).
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
        out.append(int(v) if v not in ("", None) else None)
    return out


def main():
    with (DATA / "control_growth_weekly.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    lint = col(rows, "lint_files")
    gate = col(rows, "gate_scripts_ourdef")
    model = col(rows, "system_model_py_files")

    fig, ax = plt.subplots(figsize=(12, 5.5))
    for series, label, color in [
        (lint, "project lint files (tools/lint/lint-*.py) — validated defn", "#9a3f12"),
        (gate, "gate/check scripts (our defn)", "#2f5169"),
        (model, "typed system-model .py files", "#155c38"),
    ]:
        sx = [i for i, v in zip(x, series) if v is not None]
        sv = [v for v in series if v is not None]
        ax.plot(sx, sv, marker=".", label=label, color=color)
    ax.set_title("F7 — Controls accumulate: durable engineering structure per project week\n"
                 "(git ls-tree at each week's last commit; weekly, extends book's 4 snapshots)")
    ax.set_ylabel("count in tree")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(fontsize=8, loc="upper left")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f7_controls_accumulate.{ext}", dpi=150)
    print(f"wrote f7_controls_accumulate.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
