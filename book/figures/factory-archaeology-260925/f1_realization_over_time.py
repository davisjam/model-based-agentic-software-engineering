#!/usr/bin/env python3
"""F1 — Realization over time: weekly commits with build-stage annotations.

Standalone: reads ../../data/factory-archaeology-260925/weekly_factory_metrics.csv and ../../data/factory-archaeology-260925/events.csv,
writes f1_realization_over_time.svg into ../../assets/. matplotlib only.

Primary data is UNSMOOTHED. Provenance-split (agent / automation /
human-or-unknown) is stacked; note the landing-mechanism transition ~W32
where agent work shifts from direct co-authored commits to merge-train
squashes (classified 'automation'). See ../../data/factory-archaeology-260925/provenance/A_realization_throughput.md.
"""
from __future__ import annotations
import csv
import datetime as dt
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "data" / "factory-archaeology-260925"
OUT = HERE.parent.parent / "assets"   # renders land where the book reads figures from


def load_weekly():
    with (DATA / "weekly_factory_metrics.csv").open() as fh:
        return list(csv.DictReader(fh))


def load_stage_events():
    ev = []
    with (DATA / "events.csv").open() as fh:
        for r in csv.DictReader(fh):
            if r["category"] == "build_stage":
                ev.append(r)
    return ev


def as_int(v):
    return int(v) if v not in ("", None) else 0


def main():
    rows = load_weekly()
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))
    agent = [as_int(r["commits_agent"]) for r in rows]
    auto = [as_int(r["commits_automation"]) for r in rows]
    unk = [as_int(r["commits_human_or_unknown"]) for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5.5))
    ax.bar(x, agent, label="agent-authored (Co-Authored-By / Commit-of)", color="#2c7fb8")
    ax.bar(x, auto, bottom=agent, label="automation (merge-train squash / bookkeeping)", color="#7fcdbb")
    ax.bar(x, unk, bottom=[a + b for a, b in zip(agent, auto)],
           label="human-or-unknown (explicit residual)", color="#c7c7c7")

    # stage annotations (vertical lines at stage-start weeks)
    wk_index = {w: i for i, w in enumerate(weeks)}
    for e in load_stage_events():
        wk = e["iso_week"]
        if wk in wk_index:
            xi = wk_index[wk]
            ax.axvline(xi, color="#d95f0e", linestyle=":", alpha=0.6, linewidth=1)
            ax.text(xi, ax.get_ylim()[1] * 0.98, e["label"].replace("stage", "s").split("_")[0],
                    rotation=90, va="top", ha="right", fontsize=6.5, color="#d95f0e")

    ax.set_title("F1 — Realization over time: weekly commits on main, by authorship provenance\n"
                 "(unsmoothed; dotted lines = retrospective build-stage boundaries)")
    ax.set_ylabel("commits / ISO week")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(loc="upper right", fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f1_realization_over_time.{ext}", dpi=150)
    print(f"wrote f1_realization_over_time.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
