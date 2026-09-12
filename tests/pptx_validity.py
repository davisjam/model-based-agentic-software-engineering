"""Committed-deck OOXML validity checks — the test-suite face of `tools/pptx_validate.py`.

Two PowerPoint needs-repair corruptions shipped in committed decks that python-pptx, LibreOffice,
and stdlib scans all tolerated (a `.git/` scaffold zipped into the package; a `<p:txBody>` with
zero `<a:p>` paragraphs). These checks run the validators that actually see them, split on the
suite's stdlib-twin pattern:

- **OPC part coverage** (Tier 1, stdlib, always): every zip entry content-typed, no foreign
  entries. Catches the foreign-parts class on any checkout.
- **OOXML schema validity** (Tier 2, `pre_push` — runs in `--tier1` skip-if-absent, the
  html-validate promotion posture): DocumentFormat.OpenXml's OpenXmlValidator via the
  `tools/pptx-validate-harness` .NET project. SKIP when no .NET toolchain resolves; real
  validation errors FAIL. Known pre-existing findings are grandfathered in
  `tools/pptx-validate-baseline.json` (path + error Id + part); anything NEW fails.
"""
from __future__ import annotations

import os

from tests.common import FAIL, PASS, ROOT, SKIP

import sys
sys.path.insert(0, os.path.join(ROOT, "tools"))
import pptx_validate  # noqa: E402 — the tool is the single implementation; these checks wrap it


def _tracked() -> "list[tuple[str, str]]":
    return [(p, os.path.join(ROOT, p)) for p in pptx_validate.tracked_pptx()]


def check_pptx_opc(strict: bool):
    """OPC part coverage over every git-tracked .pptx — stdlib, deterministic, always blocks."""
    issues = [f for disp, fs in _tracked() for f in pptx_validate.opc_findings(disp, fs)]
    return (FAIL if issues else PASS), issues


def check_pptx_schema(strict: bool):
    """OpenXmlValidator over every git-tracked .pptx — skip-if-absent (needs a .NET SDK)."""
    files = _tracked()
    if not files:
        return PASS, []
    dotnet = pptx_validate.resolve_dotnet()
    if dotnet is None:
        return (FAIL if strict else SKIP), ["dotnet not found — OOXML schema layer not run"]
    findings, skip_reason = pptx_validate.schema_findings(dotnet, files)
    if skip_reason:
        return (FAIL if strict else SKIP), [skip_reason]
    baseline = pptx_validate.load_baseline()
    new = [f"{disp}: {eid} — {detail}" for disp, eid, part, detail in findings
           if (disp, eid, part) not in baseline]
    return (FAIL if new else PASS), new
