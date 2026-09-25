#!/usr/bin/env python3
"""F10 — What experience became: governance conversions by control category.

Horizontal bars: how many conversion episodes became each control category
(explicit model / typed seam+ban / typed client+graph / lint floor /
decision rule / decision-made-once / independent-evidence / routed judgment /
derived provenance / measurement-no-gate / measurement->rearchitecture /
mechanical blocking lint). Colored by enforcement (deterministic/blocking vs
probabilistic/advisory vs measurement).

Standalone: reads ../../data/factory-archaeology-260925/governance_conversions.csv. matplotlib only.
Small N (book episodes). Confirmations (ex-ante, not conversions) shown
separately and NOT mixed in.
"""
from __future__ import annotations
import csv
from collections import Counter
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Patch

HERE = Path(__file__).resolve().parent
DATA = HERE.parent.parent / "data" / "factory-archaeology-260925"
OUT = HERE.parent.parent / "assets"   # renders land where the book reads figures from


def main():
    with (DATA / "governance_conversions.csv").open() as fh:
        rows = [r for r in csv.DictReader(fh)]
    conv = [r for r in rows if not r["recurrence_classification"].startswith("confirmation")]
    # bucket by a compact control-category label derived from control_type
    def bucket(ct: str) -> str:
        ct = ct.lower()
        if "state model" in ct or "state machine" in ct:
            return "explicit state model"
        if "seam" in ct and "ban" in ct:
            return "typed seam + ban-lint"
        if "client" in ct or "service-flow" in ct or "service graph" in ct:
            return "typed client + service graph"
        if "lint floor" in ct or "abstraction" in ct:
            return "lint floor + typed abstractions"
        if "decision rule" in ct:
            return "decision rule (architectural)"
        if "decision-made-once" in ct or "banned" in ct or "default" in ct:
            return "decision-made-once + banned default"
        if "independent-evidence" in ct or "regeneration" in ct:
            return "independent-evidence at admission"
        if "routed" in ct:
            return "routed judgment + class regression"
        if "provenance" in ct or "wiring" in ct:
            return "derived provenance + wiring lint"
        if "measurement" in ct and "architecture" in ct:
            return "measurement -> re-architecture"
        if "measurement" in ct:
            return "measurement (deliberately no gate)"
        if "blocking lint" in ct:
            return "mechanical -> blocking lint"
        return ct[:30]

    # Enforcement class per episode (the docstring's promised colour encoding —
    # previously unimplemented, all bars were one colour: the F10 defect).
    # deterministic/blocking vs probabilistic/advisory vs measurement (no gate).
    def enforcement_class(r) -> str:
        det = r["determinism"].lower()
        enf = r["enforcement"].lower()
        if "measurement" in det:
            return "measurement (deliberately no hard gate)"
        if enf == "blocking":
            return "deterministic / blocking"
        return "probabilistic / advisory"

    ENF_COLOR = {
        "deterministic / blocking": "#2c7fb8",
        "probabilistic / advisory": "#d95f0e",
        "measurement (deliberately no hard gate)": "#31a354",
    }

    cats = Counter(bucket(r["control_type"]) for r in conv)
    # A category maps 1:1 to an episode here (12 distinct control types), so the
    # bar colour is that episode's enforcement class; if a category ever held
    # multiple episodes of mixed class, fall back to the neutral grey.
    cat_enf: dict[str, set] = {}
    for r in conv:
        cat_enf.setdefault(bucket(r["control_type"]), set()).add(enforcement_class(r))
    labels = list(cats.keys())
    counts = [cats[k] for k in labels]
    order = sorted(range(len(labels)), key=lambda i: counts[i])
    labels = [labels[i] for i in order]
    counts = [counts[i] for i in order]
    bar_colors = []
    for lb in labels:
        classes = cat_enf.get(lb, set())
        bar_colors.append(ENF_COLOR[next(iter(classes))] if len(classes) == 1 else "#999999")

    fig, ax = plt.subplots(figsize=(11, 6))
    ax.barh(labels, counts, color=bar_colors)
    for i, c in enumerate(counts):
        ax.text(c + 0.02, i, str(c), va="center", fontsize=9)
    ax.set_title("F10 — What experience became: governance-conversion episodes by control category\n"
                 "(12 book conversion episodes; 3 ex-ante confirmations excluded; bar colour = enforcement class)")
    ax.set_xlabel("number of conversion episodes")
    ax.set_xlim(0, max(counts) + 1)
    handles = [Patch(color=ENF_COLOR[k]) for k in ENF_COLOR]
    ax.legend(handles, list(ENF_COLOR.keys()), fontsize=8, loc="lower right", title="enforcement")
    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f10_what_experience_became.{ext}", dpi=150)
    print(f"wrote f10_what_experience_became.svg ({len(conv)} conversions, {len(labels)} categories)")


if __name__ == "__main__":
    main()
