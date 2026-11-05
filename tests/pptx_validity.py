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
- **Structural / referential** (Tier 1, stdlib): the defects a schema validator cannot see
  because every part is individually valid — a dangling animation target, a duplicate shape id,
  a `custGeom` without geometry, an absurd font size. The tool's `pre-commit` face has GATED
  this layer since 261105, but only over STAGED blobs, so no runner reached it over the tracked
  corpus; `check_pptx_structural` closes that. It lands AUDIT-ONLY because the first tree-wide
  run finds pre-existing dangling targets (see that function).
- **Font-size sanity bound** (Tier 1, stdlib, BLOCKING): the one structural sub-check that is
  clean tree-wide, so it gates on its own rather than waiting for the layer's promotion — plus
  a sabotage control that proves it still goes red.
"""
from __future__ import annotations

import os
import tempfile
import zipfile

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


def check_pptx_structural(strict: bool):
    """The structural/referential layer over every git-tracked .pptx — stdlib, 1.5 s.

    AUDIT-ONLY on landing, and the measurement is why rather than a pre-existing backlog. The
    layer gates at `pre-commit` over STAGED blobs; nothing ran it over the tracked corpus, which
    is the gap this closes. But `_tracked()` resolves WORKING-TREE files, and the first tree-wide
    run during a live deck wave read THREE dangling-`spTgt` findings on one deck, then zero
    twenty minutes later — the deck's agent was mid-round, and both HEAD and the tree are clean
    now. A blocking check would have turned the whole checkout red during that window, on a
    sibling's intermediate state, which is the shared-fate failure the repo already pays for in
    `catalog.py validate`. Promote to `audit_only=False` once the deck wave quiesces and a run
    over a quiet tree reads zero.

    The reachability gap is the point worth keeping: a layer can be BLOCKING at one station and
    unreachable from every other, and from a check list alone that looks identical to a layer
    nobody needed to wire.
    """
    issues = [f for disp, fs in _tracked() for f in pptx_validate.structural_findings(disp, fs)]
    return (FAIL if issues else PASS), issues


def check_pptx_font_size_bound(strict: bool):
    """No font size exceeds its own deck's slide height — 0 findings tree-wide, so it gates.

    A size in that band passes all three other layers: the package is well-formed, the part is
    individually valid, and `ST_TextFontSize` permits 1pt..4000pt. Measured 261105 at 220000
    centipoints (2200pt) in an agent-built deck, from python-pptx's `font.size` taking a `Length`
    and storing centipoints. Rationale, derivation and margins: `pptx_validate.font_size_findings`.

    The second assertion is the one that keeps this honest. A scan like this fails SILENTLY when
    the element names or the namespace drift — it finds nothing, reports clean, and stops being a
    gate without a sound. So the check also asserts the scan still SEES font sizes across the
    corpus (58,450 attributes over the 100 decks on disk at landing; 23,417 over the 37 tracked).
    """
    files = _tracked()
    if not files:
        return PASS, []
    issues: list[str] = []
    seen = 0
    for disp, fs in files:
        try:
            with zipfile.ZipFile(fs) as zf:
                seen += len(pptx_validate.font_size_attrs(zf))
                issues += pptx_validate.font_size_findings(disp, fs, zf)
        except (zipfile.BadZipFile, OSError) as exc:
            issues.append(f"{disp}: cannot open package ({exc})")
    if not seen:
        issues.append(f"PROBE FAILURE — zero font-size attributes across {len(files)} tracked "
                      "deck(s); the scan has stopped seeing its own subject (element names or "
                      "namespace drift), so a clean result here means nothing")
    return (FAIL if issues else PASS), issues


def check_pptx_font_size_bound_fires(strict: bool):
    """Control: the font-size bound still goes RED on a deliberately absurd size.

    A check nobody has watched fail is worth little, and this family of check degrades into a
    no-op quietly. So a sabotaged copy of a tracked deck — one `@sz` rewritten to the measured
    220000 centipoints — must produce a finding, and the pristine source must not. Both
    directions are asserted: a weakened check fails the first, and a check that fires on
    everything fails the second.

    The sabotaged package is built in a temporary directory and never written into the tree.

    The anchor asserts itself, because the first draft of this control did not and reported the
    bound as broken. It rewrote the first ` sz="` in the part, which was
    `<p:ph type="sldNum" sz="quarter"/>` — a placeholder-size ENUM, not a font size at all. The
    scan ignored it, correctly, and the control read that as a weakened check. So the anchor is
    now a font-size value the census itself reported, unique within the part, and the rewrite is
    confirmed through the census before any verdict is drawn.
    """
    source = None
    for disp, fs in _tracked():
        try:
            with zipfile.ZipFile(fs) as zf:
                if pptx_validate.font_size_findings(disp, fs, zf):
                    continue  # not a usable control: already red
                # Anchor on a size the census reported, on a slide part, whose literal
                # `sz="<value>"` occurs exactly once in that part — so the rewrite cannot land on
                # a different element, and cannot land twice.
                for entry, _el, raw in pptx_validate.font_size_attrs(zf):
                    if not entry.startswith("ppt/slides/slide") or not raw.isdigit():
                        continue
                    if zf.read(entry).count(f'sz="{raw}"'.encode()) == 1:
                        source = (disp, fs, entry, raw)
                        break
            if source:
                break
        except (zipfile.BadZipFile, OSError):
            continue
    if source is None:
        return (FAIL if strict else SKIP), [
            "no clean tracked deck with a uniquely-anchorable slide-part font size to sabotage"]
    disp, fs, part, raw = source

    with tempfile.TemporaryDirectory(prefix="pptx-fontsize-control-") as td:
        dst = os.path.join(td, "sabotaged.pptx")
        hit = 0
        with zipfile.ZipFile(fs) as zin, zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == part:
                    data, hit = data.replace(f'sz="{raw}"'.encode(), b'sz="220000"'), hit + 1
                zout.writestr(item, data)
        if hit != 1:
            return FAIL, [f"control rewrote {hit} parts, expected exactly 1 ({disp} {part})"]
        with zipfile.ZipFile(dst) as zf:
            landed = [(e, el, v) for e, el, v in pptx_validate.font_size_attrs(zf)
                      if e == part and v == "220000"]
            red = pptx_validate.font_size_findings("control", dst, zf)
        layer = pptx_validate.structural_findings("control", dst)

    issues: list[str] = []
    if len(landed) != 1:
        # Precondition, not a verdict: without this the control's own miss reads as a check miss.
        return FAIL, [f"control sabotage did not land as one font-size attribute in {disp} "
                      f"{part} (census found {len(landed)} at 220000) — the anchor is wrong, "
                      f"so this says nothing about the bound"]
    if not red:
        issues.append(f"the font-size bound did NOT fire on 220000 centipoints (2200pt) in "
                      f"{disp} {part} — the check has been weakened or removed")
    if not any("font size" in s for s in layer):
        issues.append("structural_findings() did not surface the sabotaged font size — the "
                      "bound is no longer wired into the layer the commit gate runs")
    return (FAIL if issues else PASS), issues
