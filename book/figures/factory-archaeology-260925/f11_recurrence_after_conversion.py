#!/usr/bin/env python3
"""F11 — Recurrence after conversion (CONSERVATIVE classification).

Bars over the recurrence categories, kept strictly distinct:
  * attempted-recurrence-caught — a later attempt at the prohibited pattern
    was blocked by the control.
  * escaped-recurrence-caught-by-human — a bypass/second problem was found by
    human review, NOT by the control.
  * later-hardening — a follow-on incident hardened the control (a related but
    distinct failure, not a recurrence of the original class).
  * no-observed-recurrence — no later instance observed. This is NOT evidence
    the control prevented one; absence is not proof.
  * deliberately-not-enforced — measurement kept without a gate on purpose.

Standalone: reads ../../data/factory-archaeology-260925/governance_conversions.csv. matplotlib only.
Small N (book episodes). The point of the figure is the DISTINCTION between
'caught' and 'no-observed', not a prevention rate.
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

CANON = [
    ("attempted-recurrence-caught", "#31a354"),
    ("escaped-recurrence-caught-by-human", "#d95f0e"),
    ("later-hardening", "#756bb1"),
    ("no-observed-recurrence", "#969696"),
    ("deliberately-not-enforced", "#3182bd"),
]


def classify(val: str) -> str | None:
    v = val.lower()
    if v.startswith("confirmation"):
        return None
    if "attempted-recurrence-caught" in v:
        return "attempted-recurrence-caught"
    if "escaped-recurrence" in v:
        return "escaped-recurrence-caught-by-human"
    if "later-hardening" in v:
        return "later-hardening"
    if "deliberately-not-enforced" in v:
        return "deliberately-not-enforced"
    if "no-observed-recurrence" in v:
        return "no-observed-recurrence"
    return "no-observed-recurrence"


def main():
    with (DATA / "governance_conversions.csv").open() as fh:
        rows = list(csv.DictReader(fh))
    counts = Counter()
    for r in rows:
        c = classify(r["recurrence_classification"])
        if c:
            counts[c] += 1
    labels = [k for k, _ in CANON]
    vals = [counts.get(k, 0) for k in labels]
    colors = [c for _, c in CANON]

    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.bar(range(len(labels)), vals, color=colors)
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v + 0.03, str(v), ha="center", fontsize=10)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=20, ha="right", fontsize=8)
    ax.set_ylabel("conversion episodes")
    ax.set_title("F11 — Recurrence after conversion (conservative; small N)\n"
                 "'caught' vs 'no-observed' distinguished — absence of recurrence is NOT proof of prevention")
    ax.set_ylim(0, max(vals) + 1)
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f11_recurrence_after_conversion.{ext}", dpi=150)
    print(f"wrote f11_recurrence_after_conversion.svg; distribution {dict(counts)}")


if __name__ == "__main__":
    main()
