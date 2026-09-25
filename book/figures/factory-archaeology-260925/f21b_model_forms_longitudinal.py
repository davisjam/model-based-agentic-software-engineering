#!/usr/bin/env python3
"""F21b — Model census, LONGITUDINAL: accumulation over project weeks + the
by-form split where it is declared.

Standalone: reads ../../data/factory-archaeology-260925/model_form_weekly.csv (declared-model count by form,
reconstructed by re-parsing MODEL_FORM/MODEL_KIND at each week's last-commit
tree) and ../../data/factory-archaeology-260925/control_growth_weekly.csv (all system-model .py files/week).
matplotlib only. Companion to the F21/F22 snapshot (f21_f22_model_census.py).

IMPORTANT — the declared-form taxonomy (MODEL_FORM/MODEL_KIND) is a LATE-ARRIVING
property: it was introduced in a bulk back-classification wave on 2026-09-17
(project week 28). Model *files* accumulated smoothly across history (the
system-model .py count climbs from ~0 to ~300), but per-form classification
does NOT exist before W28 and is NOT reconstructable earlier without fabricating
each pre-W28 file's form. So:
  * Panel A (accumulation) is the honest longitudinal signal across ALL weeks:
    the total system-model .py file count vs the count carrying the declared
    taxonomy. The gap = files not yet back-classified; it closes at W28.
  * Panel B (by-form) shows the 11-form stack only for the weeks where the
    taxonomy is declared (W28+) — effectively the snapshot, annotated as such.
Missing/zero weeks are retained, never interpolated or fabricated.
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

FORMS = ["REGISTRY", "INSTRUMENT", "BUDGET", "SCHEMA", "CONSTRAINT_SET",
         "DATAFLOW", "TOPOLOGY", "STATE_MACHINE", "DECISION_TABLE",
         "POLICY", "INTERACTION"]
FORM_COLORS = ["#2c7fb8", "#41b6c4", "#7fcdbb", "#c7e9b4", "#31a354",
               "#addd8e", "#d95f0e", "#fe9929", "#756bb1", "#c994c7", "#dd3497"]


def as_int(v):
    return int(v) if v not in ("", None) else None


def main():
    with (DATA / "model_form_weekly.csv").open() as fh:
        mrows = list(csv.DictReader(fh))
    with (DATA / "control_growth_weekly.csv").open() as fh:
        cg = {r["iso_week"]: r for r in csv.DictReader(fh)}

    pw = [int(r["project_week"]) for r in mrows]
    declared_total = [as_int(r["total_models"]) for r in mrows]
    all_py = [as_int(cg.get(r["iso_week"], {}).get("system_model_py_files")) for r in mrows]

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5.5))

    # Panel A — accumulation across all weeks.
    ax_x = [p for p, v in zip(pw, all_py) if v is not None]
    ax_y = [v for v in all_py if v is not None]
    ax1.plot(ax_x, ax_y, marker=".", color="#155c38",
             label="all system-model .py files (accumulation)")
    dx = [p for p, v in zip(pw, declared_total) if v is not None]
    dy = [v for v in declared_total if v is not None]
    ax1.plot(dx, dy, marker=".", color="#2c7fb8",
             label="declared models (MODEL_FORM + MODEL_KIND)")
    # taxonomy-introduction marker
    ax1.axvline(28, color="#d95f0e", linestyle=":", alpha=0.7)
    ax1.text(28, max(ax_y) * 0.5, "taxonomy introduced\nW28 (2026-09-17)",
             rotation=90, va="center", ha="right", fontsize=7, color="#d95f0e")
    ax1.set_xlabel("Project week (W1 = 2026-03-12, ISO 2026-W11)")
    ax1.set_ylabel("count in system-models/ tree")
    ax1.set_title("F21b(A) — Models accumulate over project weeks\n"
                  "(files grow smoothly; the declared-form taxonomy is a late back-classification)")
    ax1.legend(fontsize=8, loc="upper left")
    ax1.grid(alpha=0.3)

    # Panel B — by-form stack for the weeks where forms are declared.
    declared_weeks = [(int(r["project_week"]), r) for r in mrows
                      if as_int(r["total_models"])]
    xs = [p for p, _ in declared_weeks]
    bottom = [0.0] * len(xs)
    for form, color in zip(FORMS, FORM_COLORS):
        vals = [as_int(r.get(form)) or 0 for _, r in declared_weeks]
        ax2.bar(xs, vals, bottom=bottom, label=form, color=color, width=0.7)
        bottom = [b + v for b, v in zip(bottom, vals)]
    ax2.set_xlabel("Project week (declared-form weeks only)")
    ax2.set_ylabel("declared models by form")
    ax2.set_title("F21b(B) — By-form composition where declared (W28+)\n"
                  "(pre-W28 form classification is not reconstructable — not fabricated)")
    ax2.set_xticks(xs)
    ax2.legend(fontsize=6, loc="upper left", ncol=2)
    ax2.grid(axis="y", alpha=0.3)

    fig.tight_layout()
    for ext in ("svg",):
        fig.savefig(OUT / f"f21b_model_forms_longitudinal.{ext}", dpi=150)
    print(f"wrote f21b_model_forms_longitudinal.svg "
          f"({len(declared_weeks)} declared-form weeks; taxonomy introduced W28)")


if __name__ == "__main__":
    main()
