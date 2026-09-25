#!/usr/bin/env python3
"""F19 — Delegation over time: agent-driven vs human-or-unknown commit share.

Standalone: reads ../../data/factory-archaeology-260925/delegation_weekly.csv. matplotlib only.

This is the best DEFENSIBLE agent-vs-human realization proxy — the commit
provenance split — NOT a manufactured quantitative delegation staircase.
'human_or_unknown' is an EXPLICIT residual (early-history agent commits fall
here), so it OVER-states human work, not under. Even so it is ~5.5% overall.
See ../../data/factory-archaeology-260925/provenance/E_delegation.md.
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
    with (DATA / "delegation_weekly.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))

    def i(r, k):
        return int(r[k]) if r.get(k) not in ("", None) else 0
    agent = [i(r, "agent_authored") for r in rows]
    auto = [i(r, "automation_integrated") for r in rows]
    human = [i(r, "human_or_unknown") for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5.5))
    ax.bar(x, agent, label="agent-authored", color="#2c7fb8")
    ax.bar(x, auto, bottom=agent, label="automation-integrated (merge-train)", color="#7fcdbb")
    ax.bar(x, human, bottom=[a + b for a, b in zip(agent, auto)],
           label="human-or-unknown (explicit residual — OVER-states human)", color="#c7c7c7")
    ax.set_title("F19 — Delegation over time (commit provenance proxy; NOT a manufactured staircase)\n"
                 "human-or-unknown is ~5.5% overall and OVER-states human work")
    ax.set_ylabel("commits / ISO week")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f19_delegation_over_time.{ext}", dpi=150)
    print(f"wrote f19_delegation_over_time.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
