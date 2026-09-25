#!/usr/bin/env python3
"""F24 — GenAI deploy-smoke cost over time (weekly).

Standalone: reads ../../data/factory-archaeology-260925/genai_deploy_cost_weekly.csv. matplotlib only.

CAVEAT (load-bearing): this is DEPLOY-SMOKE / examples-run OpenAI cost from
the timestamped deploy cost reports — NOT production traffic and NOT the
book's 628M-token / $946 production figure. It tracks deploy cadence and
smoke-fixture cost, useful as the only timestamped GenAI-cost series the repo
retains. Missing weeks (no deploy that week) are gaps, not zeros.
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
    with (DATA / "genai_deploy_cost_weekly.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    weeks = [r["iso_week"] for r in rows]
    pw = [r.get("project_week", "") for r in rows]
    x = list(range(len(weeks)))

    def val(r, k):
        v = r.get(k, "")
        return float(v) if v not in ("", None) else None
    cost = [val(r, "genai_deploy_cost_usd") for r in rows]
    tokens = [val(r, "genai_deploy_tokens") for r in rows]

    fig, ax = plt.subplots(figsize=(12, 5))
    cx = [i for i, v in zip(x, cost) if v is not None]
    cv = [v for v in cost if v is not None]
    ax.bar(cx, cv, color="#2c7fb8", label="deploy-smoke OpenAI cost (USD/week)")
    ax2 = ax.twinx()
    tx = [i for i, v in zip(x, tokens) if v is not None]
    tv = [v for v in tokens if v is not None]
    ax2.plot(tx, tv, marker=".", color="#d95f0e", label="deploy-smoke tokens/week")
    ax.set_title("F24 — GenAI DEPLOY-SMOKE cost over time (weekly)\n"
                 "NOT production traffic; NOT the book's 628M-tok/$946 production figure")
    ax.set_ylabel("USD / week (deploy smoke)")
    ax2.set_ylabel("tokens / week (deploy smoke)")
    ax.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    step = max(1, len(weeks) // 15)
    ax.set_xticks(x[::step])
    ax.set_xticklabels(pw[::step], rotation=45, ha="right", fontsize=7)
    ax.legend(loc="upper left", fontsize=8)
    ax2.legend(loc="upper right", fontsize=8)
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f24_genai_deploy_cost_over_time.{ext}", dpi=150)
    print(f"wrote f24_genai_deploy_cost_over_time.svg ({len(weeks)} weeks)")


if __name__ == "__main__":
    main()
