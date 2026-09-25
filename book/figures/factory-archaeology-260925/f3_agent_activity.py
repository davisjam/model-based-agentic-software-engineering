#!/usr/bin/env python3
"""F3 — Agent activity: merge-train landings + distinct agents + registry launches.

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv, writes
f3_agent_activity.svg into ../../assets/. matplotlib only. Unsmoothed.

Concurrency is NOT plotted as a fabricated series: the repository does not
retain a reliable peak/mean concurrent-agents time series (see
provenance/A_realization_throughput.md). The book's qualitative 'six to
eight parallel' is annotated as text, not drawn as data.
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
    landings = [val(r["agent_landings_merge_train"]) or 0 for r in rows]
    launches = [val(r["agent_launches_registry"]) for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5.5))
    ax.bar(x, landings, color="#756bb1", label="agent worktrees landed via merge-train (=distinct agents)")
    # registry launches: plot only where present (missing retained as gaps)
    lx = [i for i, v in zip(x, launches) if v is not None]
    lv = [v for v in launches if v is not None]
    ax.plot(lx, lv, marker="o", color="#d95f0e", label="agent 'register' events (registry, partial from 2026-05-30)")

    ax.set_title("F3 — Agent activity: merge-train landings & registry launches per week\n"
                 "(landings=0 before ~W32: agent work then landed via direct cherry-pick, not squash)")
    ax.set_ylabel("count / ISO week")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    ax.text(0.01, 0.95, "book note: a routine August day ran 'six to eight' agents in parallel\n"
                        "(qualitative; no reliable concurrency time series retained)",
            transform=ax.transAxes, fontsize=7, color="#555", va="top")
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f3_agent_activity.{ext}", dpi=150)
    print(f"wrote f3_agent_activity.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
