"""REFRESH the book's repo-derived metric tokens from a `run-cloc --stats-dump` measurement.

The book already HAS a single source of truth for its headline numbers: `book/data/metrics.json`,
whose keys are substituted into prose as `{{token}}` (Markdown surface, `build_book.py:_apply_metrics`)
and as `\\magevalue{token}` (native-LaTeX surface, `tools/mage_latex.py` — which rewrites `{{token}}`
<-> `\\magevalue{token}` across the projection and then resolves through the SAME `_apply_metrics`).
One token therefore reaches BOTH surfaces, and an unknown token fails the build loud.

What was MISSING is the step that puts a FRESH measurement into that file. The LoC values were typed in
by hand from a 2026-08-03 run and then partially superseded by a second, differently-scoped 2026-10-28
import (`seip_*`), so the file came to hold two competing snapshots of the same quantity. This module is
that missing step: it reads the measurement from the ONE tool that already defines these categories ---
the parent repo's `tools/dev/run-cloc.py --stats-dump` --- and emits ready-to-paste token values plus a
drift table against what the book currently claims.

WHY A BRIDGE AND NOT A SECOND MEASUREMENT. `run-cloc.py` owns the category partition (its
`PURPOSE_ROLLUP_CATEGORIES`, policed by a disjointness engine that proves no file is double-counted or
dropped). Re-deriving LoC here would be a second definition of "production code" that could silently
disagree --- the exact duplication this module exists to remove. So the only numbers below are
dump-sourced, and the one quantity the dump does not carry directly (the support-apparatus LoC subtotal,
which the dump exposes only as a RATIO) is re-summed from declared bucket keys and then PARITY-CHECKED
against the dump's own ratio. If `run-cloc`'s definition drifts, that check fails loud rather than
quietly reporting a stale rollup.

THREE CLASSES OF ROW, because not every book number should be machine-written:

  * GOVERNED  --- a LIVE "now" snapshot in a deterministic numeric format (comma-grouped integer,
                  one-decimal ratio). Emitted as a copy-pasteable JSON block, and written by `--write`.
  * FROZEN    --- a citation to a PUBLISHED, figure-coupled dataset. The `seip_*` tokens quote the
                  2026-10-28 SEIP manuscript export, whose week-31 values are also PLOTTED in
                  `book/assets/docable-seip-capital-261028.svg` (its caption states "Week 31 ratio is
                  3.8"). Refreshing them would make the prose contradict the chart printed beside it, so
                  they are compared and REPORTED but never written. They go stale only by republishing
                  the dataset and regenerating the figures together.
  * ADVISORY  --- the book deliberately carries a word-form or rounded approximation ("around eighty",
                  "1.75 million") so small drift cannot falsify the prose, and some advisory rows are
                  measured by a DIFFERENT instrument whose categories are not run-cloc's. Reported
                  beside the current claim; the judgment stays the author's.

THE TWO-DEFINITION TRAP (read before touching the mapping). `support_ratio` and `seip_support_ratio` are
NOT the same quantity measured at two dates. `run-cloc`'s support apparatus is
tests+lints+load-bearing-docs+agent-infra+tools; the SEIP grouping ALSO folds in infrastructure-as-code
and system-model meta-files. The 3.0 -> 3.8 step is therefore part growth and part re-definition. Both
scopes are resolved here from ONE snapshot and printed with their scopes named, so that the difference
stops being invisible --- even though only the run-cloc-scoped pair is writable.

CLI:
    python3 book-models/refresh_book_metrics.py                 # measure, then report drift + paste block
    python3 book-models/refresh_book_metrics.py --dump D.json   # reuse an existing dump (no re-measure)
    python3 book-models/refresh_book_metrics.py --no-verify     # skip run-cloc's disjointness engine
    python3 book-models/refresh_book_metrics.py --write         # patch book/data/metrics.json in place
    python3 book-models/refresh_book_metrics.py --out .scratch/cloc   # also keep a timestamped record

Exit codes: 0 = report produced (drift is information, not failure); 1 = runtime error;
2 = the measurement could not be obtained (run-cloc missing / parent repo not found).
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
METRICS_PATH = ROOT / "book" / "data" / "metrics.json"

#: The run-cloc purpose buckets whose sum is the tool's own "support apparatus" rollup
#: (`ratio_table`: tests + lints + load-bearing docs + agent infra + tools). Declared here as data so
#: the parity check below can prove this list still matches the tool's definition.
SUPPORT_BUCKETS = ("tests", "lints", "docs_load_bearing", "agent_infra", "tools")

#: The SEIP manuscript's "apparatus" grouping (`book/data/docable-seip-261028/size_groups.json`): the
#: support rollup PLUS infrastructure-as-code and system-model meta-files. The wider of the two scopes.
SEIP_APPARATUS_BUCKETS = SUPPORT_BUCKETS + ("infra_as_code", "system_model_meta")


def _commas(value: float) -> str:
    return f"{int(round(value)):,}"


def _one_dp(value: float) -> str:
    return f"{value:.1f}"


def _two_dp(value: float) -> str:
    return f"{value:.2f}"


def _millions(value: float) -> str:
    return f"{value / 1_000_000:.2f} million"


# ── THE ROUNDING RULE, declared once as data ────────────────────────────────────────────────
# Every governed quantity publishes TWO tokens: a RAW value (the exact measurement) and a
# ROUNDED value for presentation. The author's ruling (261106): "we should have a 'rounded' and
# 'raw' number so this stops being a question. Obviously in some contexts you would report one or
# the other." A passage that says "roughly" or "about" binds the rounded token; a table or an
# evidence appendix a reader might check against the data binds the raw one.
#
# The rounded value is DERIVED from the same measurement by the rules below — never typed in. A
# hand-written rounded number is the duplication this module exists to remove, one level up: it
# could disagree with its own raw sibling about which snapshot it describes.


def _round_loc(value: float) -> str:
    """Present a line count the way the book's prose already spells one.

    Two forms, because the existing prose uses both and the threshold between them is the only
    thing that decides which reads naturally: "approximately 491,000" below a million, "about
    1.50 million" above it. Nearest thousand keeps three significant figures at this scale, so
    the rounded form never implies more precision than the measurement supports.
    """
    if value < 1_000_000:
        return f"{int(round(value, -3)):,}"
    return _millions(value)


def _round_ratio(value: float) -> str:
    """One decimal place. The raw ratio carries two (3.45); a passage saying "about" wants 3.4."""
    return _one_dp(value)


#: Row classes. Only GOVERNED is ever written; the other two are compared and reported.
GOVERNED, FROZEN, ADVISORY = "governed", "frozen", "advisory"


@dataclass(frozen=True)
class Row:
    """One book token mapped to the dump quantity that should fill it.

    `compute` takes the parsed dump and returns a float; `fmt` renders it the way the book displays it.
    `klass` is GOVERNED (writable live snapshot), FROZEN (published figure-coupled citation) or
    ADVISORY (deliberate word-form / foreign instrument) — see the module docstring.
    """

    token: str
    compute: Callable[[dict], float]
    fmt: Callable[[float], str]
    scope: str
    klass: str = GOVERNED
    round_fmt: "Callable[[float], str] | None" = None

    @property
    def governed(self) -> bool:
        return self.klass == GOVERNED

    @property
    def rounded_token(self) -> "str | None":
        """The presentation sibling's token name, or None when the quantity has only one form.

        CONVENTION, stated here because a `.tex` author picks between the two at the call site: the
        BARE token is the raw measurement, and a `_rounded` suffix announces the presentation form.
        So `\\magevalue{prod_loc}` is exact and `\\magevalue{prod_loc_rounded}` is approximate, and a
        passage hedging with "roughly" or "about" names the suffixed one.
        """
        return f"{self.token}_rounded" if self.round_fmt else None


def _bucket(dump: dict, key: str) -> int:
    buckets = dump["loc_buckets"]
    if key not in buckets:
        raise KeyError(
            f"run-cloc dump has no loc_bucket {key!r} (have: {sorted(buckets)}). "
            "The tool's bucket keys changed — update SUPPORT_BUCKETS / the mapping table."
        )
    return int(buckets[key]["code"])


def _sum_buckets(dump: dict, keys: "tuple[str, ...]") -> int:
    return sum(_bucket(dump, k) for k in keys)


#: THE MAPPING TABLE (mapping-as-data, mirroring the parent repo's `repo_census.PAPER_MACROS`): book
#: token <- dump quantity. Correcting or extending the book coupling is a one-row edit here.
ROWS: "tuple[Row, ...]" = (
    Row("prod_loc", lambda d: _bucket(d, "production_code"), _commas,
        "run-cloc Production Code bucket", round_fmt=_round_loc),
    Row("support_loc", lambda d: _sum_buckets(d, SUPPORT_BUCKETS), _commas,
        "tests+lints+load-bearing docs+agent infra+tools (EXCLUDES IaC and models)",
        round_fmt=_round_loc),
    Row("iac_loc", lambda d: _bucket(d, "infra_as_code"), _commas,
        "run-cloc Infrastructure as Code bucket", round_fmt=_round_loc),
    Row("system_model_loc", lambda d: _bucket(d, "system_model_meta"), _commas,
        "run-cloc System-model meta-files bucket", round_fmt=_round_loc),
    Row("total_loc", lambda d: int(d["system_totals"]["raw_code"]), _commas,
        "whole-tree raw code (every bucket, snapshot/history docs included)",
        round_fmt=_round_loc),
    Row("support_ratio", lambda d: float(d["ratios"]["support_apparatus_x_prod"]), _two_dp,
        "support_loc / prod_loc", round_fmt=_round_ratio),
    Row("seip_prod_loc", lambda d: _bucket(d, "production_code"), _commas,
        "FROZEN at SEIP week 31; plotted in docable-seip-capital-261028.svg", FROZEN),
    Row("seip_apparatus_loc", lambda d: _sum_buckets(d, SEIP_APPARATUS_BUCKETS), _commas,
        "FROZEN at SEIP week 31 (support rollup PLUS IaC and models — the WIDER scope)", FROZEN),
    Row("seip_support_ratio",
        lambda d: _sum_buckets(d, SEIP_APPARATUS_BUCKETS) / max(_bucket(d, "production_code"), 1),
        _one_dp, "FROZEN — the capital-chart caption states 'Week 31 ratio is 3.8'", FROZEN),
    Row("mined_test_loc", lambda d: _bucket(d, "tests"), _millions,
        "FOREIGN instrument: the 29-week history-mining pass carries its OWN category path-map, "
        "so run-cloc's Tests bucket is not a like-for-like replacement", ADVISORY),
)


def parity_check(dump: dict) -> "tuple[list[str], list[str]]":
    """Check the measurement against itself -> `(blocking, advisory)`.

    Two severities, because they answer different questions and only one should stop a write.
    BLOCKING means the numbers contradict each other — the bucket sum misses the tree total, or the
    re-summed support rollup disagrees with the tool's own ratio. ADVISORY means a check could not
    be RUN; the numbers may be fine and nothing proved otherwise.

    The distinction is load-bearing here: run-cloc's file-level disjointness engine does not finish
    at this repo's size (its per-row `--by-file` walk of one directory exceeds the tool's internal
    180 s budget even on an unloaded host), so `partition_clean` is `null` on every obtainable
    dump. Treating that as blocking would refuse every write forever; treating it as nothing would
    publish an unproven claim. So it is reported, loudly, on every run.

    The dump publishes `ratios.support_apparatus_x_prod` but not the LoC subtotal behind it, so this
    module re-sums the declared buckets. That duplicated definition is held by this check: if the tool
    re-partitions its categories, the two disagree and we say so instead of shipping a stale rollup.
    """
    problems: "list[str]" = []
    advisory: "list[str]" = []

    # INV-RC-6 restated on OUR side: the PARTITION buckets sum to raw_code. run-cloc asserts this
    # itself, so a clean dump already proves it — but restating it here is what lets this module
    # report the partition state as a FACT rather than quoting someone else's assert.
    #
    # Read `subset_of` and skip any bucket that declares a parent. A sub-bucket is a labeled view
    # of its parent, not a sibling: `remediation_engine` is `subset_of == "production_code"` and
    # summing it alongside production_code overcounts by its own size. Two separate passes over
    # this dump (261106) both made exactly that mistake and concluded the partition was broken by
    # 326,257 lines. The tool publishes the discriminator; the error was not reading it.
    buckets = dump["loc_buckets"]
    partition = {k: v for k, v in buckets.items() if v.get("subset_of") is None}
    subs = {k: v for k, v in buckets.items() if v.get("subset_of") is not None}
    bucket_sum = sum(int(v["code"]) for v in partition.values())
    raw_code = int(dump["system_totals"]["raw_code"])
    if bucket_sum != raw_code:
        problems.append(
            f"PARTITION SUM FAILED: the {len(partition)} partition buckets sum to {bucket_sum:,} "
            f"but system_totals.raw_code = {raw_code:,} (residual {raw_code - bucket_sum:+,}). "
            "Buckets neither cover the tree nor stay disjoint — the category numbers are NOT "
            f"trustworthy. Sub-buckets excluded from the sum, as declared: "
            f"{ {k: v['subset_of'] for k, v in subs.items()} or 'none'}."
        )

    prod = _bucket(dump, "production_code")
    mine = _sum_buckets(dump, SUPPORT_BUCKETS) / max(prod, 1)
    theirs = float(dump["ratios"]["support_apparatus_x_prod"])
    if abs(mine - theirs) > 0.015:  # the dump rounds x_prod to 2dp
        problems.append(
            f"support-apparatus PARITY FAILED: SUPPORT_BUCKETS sum / prod = {mine:.4f} but the dump's "
            f"own support_apparatus_x_prod = {theirs:.4f}. run-cloc's ratio_table definition has "
            "drifted from SUPPORT_BUCKETS — reconcile before trusting support_loc."
        )
    clean = dump["meta"].get("partition_clean")
    if clean is False:
        problems.append(
            "run-cloc reported partition_clean=False — files are double-counted or dropped; "
            "the bucket numbers are NOT trustworthy."
        )
    elif clean is None:
        reason = dump["meta"].get("verify_skipped_reason")
        advisory.append(
            "FILE-LEVEL DISJOINTNESS UNPROVEN (partition_clean=null"
            f"{': ' + str(reason) if reason else ''}). The bucket sum below covers the tree "
            "exactly, so no lines are missing or counted twice IN AGGREGATE; what is unproven is "
            "the per-FILE claim that no individual file lands in two buckets. Offsetting errors "
            "would survive the aggregate check."
        )
    if bucket_sum == raw_code:
        advisory.append(
            f"partition VERIFIED by sum: {len(partition)} declared partition buckets total "
            f"{bucket_sum:,} = system_totals.raw_code exactly (residual 0). Sub-buckets excluded "
            f"as declared: { {k: v['subset_of'] for k, v in subs.items()} or 'none'}."
        )
    unc = partition.get("uncategorized", {}).get("code", 0)
    if unc and raw_code and unc / raw_code > 0.10:
        advisory.append(
            f"`uncategorized` holds {int(unc):,} lines — {100 * unc / raw_code:.1f}% of the tree. "
            "This does not break the partition (it is a declared bucket and sums in), but it bounds "
            "how much interpretive weight the category split can carry: a tenth-plus of the tree is "
            "counted without being attributed to a purpose."
        )
    return problems, advisory


def find_repo(explicit: "str | None") -> Path:
    """Locate the measured repository (the parent ADATool checkout).

    The catalogue is a submodule of it, so `ROOT.parent.parent` is the normal answer; `--repo` and
    `$MAGE_MEASURED_REPO` cover a standalone clone. Fails loud rather than measuring the wrong tree.
    """
    candidates = [explicit, os.environ.get("MAGE_MEASURED_REPO"), str(ROOT.parent.parent)]
    for cand in candidates:
        if not cand:
            continue
        path = Path(cand).expanduser().resolve()
        if (path / "tools" / "dev" / "run-cloc.py").is_file():
            return path
    raise SystemExit(
        "could not locate the measured repo (no tools/dev/run-cloc.py under any of: "
        f"{[c for c in candidates if c]}). Pass --repo <path> or set MAGE_MEASURED_REPO."
    )


def measure(repo: Path, *, no_verify: bool, timeout: int) -> dict:
    """Run the parent repo's `run-cloc.py --stats-dump` and parse its JSON. No second walk of the tree."""
    cmd = [sys.executable, "tools/dev/run-cloc.py", "--stats-dump"]
    if no_verify:
        cmd.append("--no-verify")
    print(f"measuring: {' '.join(cmd)}  (cwd={repo}, timeout={timeout}s)", file=sys.stderr)
    proc = subprocess.run(cmd, cwd=str(repo), capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise SystemExit(
            f"run-cloc --stats-dump exited {proc.returncode}.\n--- stderr ---\n{proc.stderr[-4000:]}"
        )
    return json.loads(proc.stdout)


def load_metrics() -> dict:
    return json.loads(METRICS_PATH.read_text(encoding="utf-8"))


def resolve(dump: dict) -> "list[tuple[Row, str]]":
    """Resolve every mapping row against the dump -> `[(row, displayed_value)]`."""
    return [(row, row.fmt(row.compute(dump))) for row in ROWS]


def resolve_pairs(dump: dict) -> "list[tuple[str, str]]":
    """Every token this module writes -> its value, raw and rounded, in paste order.

    Both members of a pair come from ONE `row.compute(dump)` call, so a raw value and its rounded
    sibling can never describe different snapshots. Only GOVERNED rows appear: a FROZEN citation is
    not refreshed, so emitting a rounded form of it would publish a token nothing may update.
    """
    pairs: "list[tuple[str, str]]" = []
    for row in ROWS:
        if not row.governed:
            continue
        value = row.compute(dump)
        pairs.append((row.token, row.fmt(value)))
        if row.round_fmt:
            pairs.append((f"{row.token}_rounded", row.round_fmt(value)))
    return pairs


def drift_table(resolved: "list[tuple[Row, str]]", metrics: dict) -> str:
    lines = [
        "| token | class | book claims | measured now | drift | scope |",
        "|---|---|---|---|---|---|",
    ]
    for row, value in resolved:
        current = str(metrics.get(row.token, "(absent)"))
        mark = "—" if current == value else "**yes**"
        lines.append(
            f"| `{row.token}` | {row.klass} | {current} | {value} | {mark} | {row.scope} |"
        )
    return "\n".join(lines)


def provenance(dump: dict, repo: Path) -> str:
    meta = dump["meta"]
    partition = meta.get("partition_clean")
    state = {True: "verified disjoint", False: "NOT DISJOINT", None: "unverified"}[partition]
    return (
        f"Repo-derived LoC tokens measured {meta.get('generated_at', '?')} by "
        f"`{meta.get('tool', 'run-cloc --stats-dump')}` on {repo.name} at HEAD "
        f"{meta.get('git_head', '?')}; file partition {state}. Refresh via "
        "`python3 book-models/refresh_book_metrics.py --write` — do not hand-edit these values. "
        "NOTE the two apparatus SCOPES: support_loc/support_ratio exclude infrastructure-as-code and "
        "system-model meta-files; seip_apparatus_loc/seip_support_ratio include them. The two ratios "
        "are different measurements, not two dates of one measurement."
    )


def paste_block(dump: dict, repo: Path) -> str:
    """The copy-pasteable JSON fragment: every written token, raw and rounded, plus provenance."""
    body = dict(resolve_pairs(dump))
    body["measurement_snapshot"] = _snapshot_date(dump)
    body["_cloc_snapshot_provenance"] = provenance(dump, repo)
    return json.dumps(body, indent=2, ensure_ascii=False)


def _snapshot_date(dump: dict) -> str:
    """The measurement date as the book displays it (ISO, matching `measurement_snapshot`).

    ONE snapshot token serves both presentation forms: the window a measurement describes is one
    fact regardless of whether a passage quotes the raw or the rounded figure.
    """
    return str(dump["meta"].get("generated_at", ""))[:10]


def write_metrics(dump: dict, repo: Path) -> "list[str]":
    """Patch `metrics.json` in place: every governed token (raw + rounded), the snapshot date, and
    the provenance key. Key order is preserved for existing keys (a minimal diff); new keys append.
    Returns the changed-token list, so the caller reports exactly what moved."""
    metrics = load_metrics()
    changed: "list[str]" = []
    for token, value in [*resolve_pairs(dump), ("measurement_snapshot", _snapshot_date(dump))]:
        if str(metrics.get(token)) != value:
            changed.append(f"{token}: {metrics.get(token, '(absent)')} -> {value}")
        metrics[token] = value
    metrics["_cloc_snapshot_provenance"] = provenance(dump, repo)
    METRICS_PATH.write_text(json.dumps(metrics, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return changed


def main(argv: "list[str] | None" = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dump", help="reuse an existing run-cloc --stats-dump JSON instead of measuring")
    ap.add_argument("--repo", help="the measured repository (default: the parent checkout)")
    ap.add_argument("--no-verify", action="store_true",
                    help="skip run-cloc's disjointness engine (faster; partition_clean becomes null)")
    ap.add_argument("--timeout", type=int, default=1800, help="measurement timeout in seconds")
    ap.add_argument("--write", action="store_true", help="patch book/data/metrics.json in place")
    ap.add_argument("--out", metavar="PREFIX",
                    help="also save the raw dump to <PREFIX>-YYMMDD.HHMMSS.json")
    args = ap.parse_args(argv)

    repo = find_repo(args.repo)
    if args.dump:
        dump = json.loads(Path(args.dump).read_text(encoding="utf-8"))
        print(f"reusing dump: {args.dump}", file=sys.stderr)
    else:
        dump = measure(repo, no_verify=args.no_verify, timeout=args.timeout)

    if args.out:
        stamp = datetime.now().strftime("%y%m%d.%H%M%S")
        out = Path(f"{args.out}-{stamp}.json")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(dump, indent=2) + "\n", encoding="utf-8")
        print(f"dump saved: {out}", file=sys.stderr)

    problems, advisory = parity_check(dump)
    resolved = resolve(dump)
    metrics = load_metrics()

    print("## Measurement\n")
    print(provenance(dump, repo))
    print(f"\n**Partition: {'FAILED' if problems else 'verified'}** "
          f"({len(problems)} blocking, {len(advisory)} advisory)\n")
    if problems:
        print("### ⛔ Blocking — the measurement contradicts itself; nothing should be written\n")
        for p in problems:
            print(f"- {p}")
    if advisory:
        print("\n### Advisory — what was and was not proven\n")
        for a in advisory:
            print(f"- {a}")
    print("\n## Drift: what the book claims vs what the repo measures\n")
    print(drift_table(resolved, metrics))

    print("\n## Raw and rounded, per quantity\n")
    print("| token | value | book claims | drift |")
    print("|---|---|---|---|")
    for token, value in [*resolve_pairs(dump),
                         ("measurement_snapshot", _snapshot_date(dump))]:
        current = str(metrics.get(token, "(absent)"))
        print(f"| `{token}` | {value} | {current} | "
              f"{'—' if current == value else '**yes**'} |")

    print("\n## Paste into `book/data/metrics.json`\n")
    print("```json")
    print(paste_block(dump, repo))
    print("```")
    for klass, heading in (
        (FROZEN, "Frozen — do NOT refresh (a published, figure-coupled citation)"),
        (ADVISORY, "Advisory — the author decides whether the form still holds"),
    ):
        rows = [(r, v) for r, v in resolved if r.klass == klass]
        if not rows:
            continue
        print(f"\n### {heading}\n")
        for row, value in rows:
            print(f"- `{row.token}`: book says {metrics.get(row.token, '(absent)')!r}; "
                  f"this snapshot would read {value!r} — {row.scope}")

    if args.write:
        if problems:
            print("\nREFUSED to write: the measurement did not verify (see caveats above). "
                  "A consistent stale set beats an inconsistent fresh one.")
            return 1
        changed = write_metrics(dump, repo)
        print(f"\nwrote {METRICS_PATH.relative_to(ROOT)} — {len(changed)} value(s) changed")
        for c in changed:
            print(f"  {c}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
