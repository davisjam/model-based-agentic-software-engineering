#!/usr/bin/env python3
"""pptx_validate.py — OOXML validity gate for committed .pptx decks.

Two PowerPoint needs-repair corruptions shipped in course decks that every cheap scan tolerated:
a stray `.git/` scaffold zipped into the package (OPC parts with no content type), then a shape
whose `<p:txBody>` carried zero `<a:p>` paragraphs (CT_TextBody requires at least one). stdlib
zip scans, python-pptx, and LibreOffice all accept both; PowerPoint rejects both. This tool runs
the checks that actually see them:

  1. OPC part coverage (stdlib, always on) — every zip entry must be content-typed via
     `[Content_Types].xml` (Default extension or Override part name), and no foreign entries
     (`.git/`, `__MACOSX/`, `.DS_Store`, `~$` lock files, absolute or parent-escaping names).
     Catches the foreign-parts class even on a checkout with no .NET.
  2. OOXML schema validation (DocumentFormat.OpenXml's OpenXmlValidator, via the
     tools/pptx-validate-harness .NET project) — the genuine schema validator; reports what
     PowerPoint rejects on. Needs a .NET SDK, so it follows the html-validate promotion
     pattern: runs when the toolchain resolves, SKIPs when it does not (bare checkouts stay
     green); real validation errors FAIL.
  3. Structural / referential (stdlib, always on) — the defects that are invisible to a schema
     validator because each part is individually valid: a dangling animation target, a duplicate
     shape id, a `custGeom` missing its geometry, and a font size that passes `ST_TextFontSize`
     and is absurd at human scale. See `structural_findings`. BLOCKING since 261105.

Known pre-existing schema findings are grandfathered in `tools/pptx-validate-baseline.json`
(matched on repo path + error Id + part URI); anything NEW fails. Drain the baseline to
promote those decks to fully clean.

Usage:
  python3 tools/pptx_validate.py <file.pptx> [...]   # validate specific files
  python3 tools/pptx_validate.py --staged            # validate staged *.pptx blobs (pre-commit)
  python3 tools/pptx_validate.py --all-tracked       # validate every git-tracked *.pptx

Exit codes: 0 = clean (schema layer may SKIP if .NET absent); 1 = findings; 2 = usage/setup error.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
import zipfile

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(TOOLS_DIR)
HARNESS_DIR = os.path.join(TOOLS_DIR, "pptx-validate-harness")
BASELINE_PATH = os.path.join(TOOLS_DIR, "pptx-validate-baseline.json")

#: Zip entries that are junk regardless of content-typing — the foreign-parts corruption class
#: (a git-init'd scratch dir was once zipped straight into a shipped deck).
_FOREIGN_SEGMENTS = {".git", "__MACOSX"}
_FOREIGN_BASENAMES = {".DS_Store", "Thumbs.db"}


# ---------------------------------------------------------------- OPC part coverage (stdlib)

def opc_findings(display_path: str, fs_path: str) -> list[str]:
    """OPC part-coverage findings for one package: uncovered (content-type-less) entries and
    foreign junk entries. Empty list = clean."""
    findings: list[str] = []
    try:
        zf = zipfile.ZipFile(fs_path)
    except (zipfile.BadZipFile, OSError) as ex:
        return [f"{display_path}: not a readable zip package ({ex})"]
    with zf:
        names = zf.namelist()
        if "[Content_Types].xml" not in names:
            return [f"{display_path}: missing [Content_Types].xml — not an OPC package"]
        ct = zf.read("[Content_Types].xml").decode("utf-8", "replace")
        defaults = {e.lower() for e in re.findall(r'<Default[^>]*Extension="([^"]+)"', ct)}
        overrides = set(re.findall(r'<Override[^>]*PartName="([^"]+)"', ct))
        for name in names:
            if name == "[Content_Types].xml" or name.endswith("/"):
                continue
            segs = name.split("/")
            base = segs[-1]
            if (any(s in _FOREIGN_SEGMENTS for s in segs) or base in _FOREIGN_BASENAMES
                    or base.startswith("~$")):
                findings.append(f"{display_path}: foreign zip entry `{name}` (not a document part)")
                continue
            if name.startswith("/") or ".." in segs:
                findings.append(f"{display_path}: unsafe zip entry name `{name}`")
                continue
            # OPC's extension rule is "substring after the last dot" — unlike splitext, a
            # dot-leading name like `.rels` DOES have the extension `rels`.
            ext = base.rsplit(".", 1)[1].lower() if "." in base else ""
            if f"/{name}" not in overrides and ext not in defaults:
                findings.append(
                    f"{display_path}: zip entry `{name}` has no content type "
                    f"(no Default for `.{ext}`, no Override) — PowerPoint refuses the package")
    return findings


# ------------------------------------------------------- OOXML schema validation (.NET layer)

def resolve_dotnet() -> "str | None":
    """Locate a dotnet executable; None = toolchain absent (callers SKIP the schema layer)."""
    found = shutil.which("dotnet")
    if found:
        return found
    fallback = "/usr/local/share/dotnet/dotnet"
    return fallback if os.path.exists(fallback) else None


def _dotnet_env(dotnet: str) -> dict:
    env = dict(os.environ)
    env.setdefault("DOTNET_ROOT", os.path.dirname(dotnet))
    env.setdefault("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
    env.setdefault("DOTNET_NOLOGO", "1")
    return env


def _harness_dll() -> str:
    return os.path.join(HARNESS_DIR, "bin", "Release", "net8.0", "ooxml-validate.dll")


def ensure_harness(dotnet: str) -> "tuple[str | None, str]":
    """Build the harness if missing/stale. Returns (dll_path, "") on success or
    (None, reason) when the toolchain cannot produce it (callers SKIP, not FAIL)."""
    dll = _harness_dll()
    sources = [os.path.join(HARNESS_DIR, "Program.cs"),
               os.path.join(HARNESS_DIR, "ooxml-validate.csproj")]
    if os.path.exists(dll) and all(
            os.path.getmtime(dll) >= os.path.getmtime(s) for s in sources):
        return dll, ""
    try:
        r = subprocess.run(
            [dotnet, "build", HARNESS_DIR, "-c", "Release", "--nologo", "-v", "q"],
            capture_output=True, text=True, timeout=300, env=_dotnet_env(dotnet))
    except (subprocess.TimeoutExpired, OSError) as ex:
        return None, f"harness build could not run ({type(ex).__name__})"
    if r.returncode != 0 or not os.path.exists(dll):
        tail = (r.stdout + r.stderr).strip().splitlines()[-3:]
        return None, "harness build failed (toolchain/restore): " + " | ".join(tail)
    return dll, ""


def schema_findings(dotnet: str, files: "list[tuple[str, str]]") -> "tuple[list[tuple[str, str, str, str]], str]":
    """Run OpenXmlValidator over (display_path, fs_path) pairs.

    Returns (findings, skip_reason): findings are (display_path, error_id, part_uri, detail)
    tuples; a non-empty skip_reason means the layer could not run (toolchain) — SKIP, not FAIL.
    """
    dll, why = ensure_harness(dotnet)
    if dll is None:
        return [], why
    display_by_fs = {fs: disp for disp, fs in files}
    try:
        r = subprocess.run([dotnet, dll, *[fs for _, fs in files]],
                           capture_output=True, text=True,
                           timeout=120 + 10 * len(files), env=_dotnet_env(dotnet))
    except (subprocess.TimeoutExpired, OSError) as ex:
        return [], f"harness run could not complete ({type(ex).__name__})"
    findings: list[tuple[str, str, str, str]] = []
    for line in r.stdout.splitlines():
        parts = line.split("\t")
        if parts[0] == "ERROR" and len(parts) >= 6:
            disp = display_by_fs.get(parts[1], parts[1])
            findings.append((disp, parts[2], parts[3],
                             f"{parts[5]} at {parts[4]} in {parts[3]}"))
        elif parts[0] == "OPENFAIL" and len(parts) >= 3:
            disp = display_by_fs.get(parts[1], parts[1])
            findings.append((disp, "OPENFAIL", "", parts[2]))
    if r.returncode not in (0, 1):  # 0/1 are the harness's defined verdicts; anything else is a crash
        return [], f"harness exited {r.returncode}: {(r.stderr or r.stdout).strip()[:200]}"
    return findings, ""


def load_baseline() -> "set[tuple[str, str, str]]":
    """Grandfathered (repo_path, error_id, part_uri) triples — pre-existing findings that do not
    block. Anything not in this set fails; drain the file to zero to retire it."""
    if not os.path.exists(BASELINE_PATH):
        return set()
    with open(BASELINE_PATH, encoding="utf-8") as fh:
        data = json.load(fh)
    return {(e["path"], e["id"], e["part"]) for e in data.get("grandfathered", [])}


# ------------------------------------------------------------------------------- file listing

def _git_lines(*args: str) -> list[str]:
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True)
    if r.returncode != 0:
        print(f"pptx-validate: git {' '.join(args)} failed: {r.stderr.strip()}", file=sys.stderr)
        sys.exit(2)
    return [ln for ln in r.stdout.splitlines() if ln.strip()]


def tracked_pptx() -> list[str]:
    return _git_lines("ls-files", "*.pptx")


def staged_pptx() -> list[str]:
    return [p for p in _git_lines("diff", "--cached", "--name-only", "--diff-filter=ACMR")
            if p.lower().endswith(".pptx")]


# ------------------------------------------------- structural / referential (stdlib, AUDIT-ONLY)

_PML = "{http://schemas.openxmlformats.org/presentationml/2006/main}"
_DML = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
_SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")

#: The three DrawingML elements whose `@sz` is `ST_TextFontSize` — a font height in CENTIPOINTS
#: (hundredths of a point). Deliberately NOT "any element with an `sz` attribute": `p:ph/@sz` is
#: an enum (`full`/`half`/`quarter`) and `a:ln/@w` is EMU, so a blanket scan mixes three units.
_SZ_ELEMENTS = (f"{_DML}rPr", f"{_DML}defRPr", f"{_DML}endParaRPr")
#: `ST_TextFontSize` accepts 100..400000 — 1pt to 4000pt. The ceiling is the reason a schema
#: validator is blind to an absurd size, and the floor is why the ÷100 unit errors ARE caught by it.
_ST_TEXTFONTSIZE_MAX = 400000
#: 12700 EMU = 1pt, so EMU // 127 = centipoints.
_EMU_PER_CENTIPOINT = 127


def _slide_entries(zf: zipfile.ZipFile) -> "list[tuple[int, str]]":
    """Slide parts in presentation order-ish (by filename index), as (index, entry name)."""
    out = []
    for name in zf.namelist():
        m = _SLIDE_RE.match(name)
        if m:
            out.append((int(m.group(1)), name))
    return sorted(out)


def slide_height_centipoints(zf: zipfile.ZipFile) -> "tuple[int | None, str]":
    """The deck's OWN slide height, in centipoints — the ceiling a font size is bounded against.

    Derived per package rather than hardcoded: a deck declares its page size in
    `ppt/presentation.xml`, and 4:3, 16:9 and a custom page size are all legitimate. Returns
    (centipoints, "") or (None, reason) — a caller that cannot resolve the height must report a
    probe failure, never silently skip the bound.
    """
    try:
        pres = ET.fromstring(zf.read("ppt/presentation.xml"))
    except (KeyError, ET.ParseError, OSError) as exc:
        return None, f"cannot read ppt/presentation.xml ({type(exc).__name__}: {exc})"
    sld_sz = pres.find(f"{_PML}sldSz")
    cy = (sld_sz.get("cy") or "") if sld_sz is not None else ""
    if not cy.isdigit() or int(cy) <= 0:
        return None, "ppt/presentation.xml declares no usable p:sldSz/@cy"
    return int(cy) // _EMU_PER_CENTIPOINT, ""


def font_size_attrs(zf: zipfile.ZipFile) -> "list[tuple[str, str, str]]":
    """Every DrawingML font-size attribute in the package, as (part entry, element localname,
    raw `@sz`). Scans EVERY xml part, not only slides: an agent sets a font size on a notes slide
    or a layout as easily as on a slide, and the bound is the same everywhere.

    Exposed separately from the bound so a caller can assert the scan still SEES something. The
    danger with this shape of check is the silent false negative — get the namespace wrong and it
    finds nothing and reports clean forever, which is how a gate stops gating without a sound.
    """
    out: list[tuple[str, str, str]] = []
    for name in zf.namelist():
        if not name.endswith(".xml"):
            continue
        try:
            root = ET.fromstring(zf.read(name))
        except (ET.ParseError, OSError):
            continue  # the slide loop below and the OPC/schema layers report unreadable parts
        for el in root.iter():
            if el.tag in _SZ_ELEMENTS and el.get("sz") is not None:
                out.append((name, el.tag.split("}")[-1], el.get("sz")))
    return out


def font_size_findings(display_path: str, fs_path: str, zf: zipfile.ZipFile) -> list[str]:
    """A font size that passes `ST_TextFontSize` and is nonsense at human scale.

    `font.size` in python-pptx is declared as a `Length` and STORED as centipoints — the setter
    divides by 127 — so the one property whose stored unit differs from its declared unit is also
    the one an agent reaches for most. Hand it a value already scaled to centipoints and it writes
    a size 100x too large: `Emu(2200 * 12700)` is `Pt(2200)`, and 2200pt lands in the package
    where 22pt was meant. Measured 261105, written by an agent building a deck, and **all three
    existing layers of this tool passed it**: the package is well-formed, every part is
    individually valid, and `ST_TextFontSize` permits 100..400000 centipoints (1pt..4000pt), so a
    schema validator has no opinion. It was caught by reading the emitted XML.

    The bound is DERIVED, not chosen: a font taller than the slide itself cannot render one line
    on that slide, whatever the house style. That needs no judgment about what looks right, and it
    closes the whole class rather than the one instance — every 100x error that survives
    `ST_TextFontSize` is caught. An intended size S writes 100*S points; the package is rejected
    outright above 4000pt, so the surviving band is S <= 40pt, and 100*S exceeds a 540pt slide for
    every S > 5.4pt. Nothing a human would call a body or title size escapes.

    Measured margin on this corpus (261105, 37 tracked decks, 23,417 font-size attributes): the
    largest size anywhere is 8600 centipoints (86pt, a template layout's defRPr), the largest on a
    text-bearing run is 8000 (80pt, a big numeral). Against a 540pt slide the bound sits 6.3x above
    everything shipped and 4.1x below the measured bug. The ceiling is NOT the house 20-40pt band
    on purpose: the Act I decks and the talks ship 52-86pt title and numeral text, and a check
    tuned to one deck family would condemn the others.

    No FLOOR is enforced, and the measurement is the reason. `ST_TextFontSize`'s own minimum of
    100 already rejects every divide-by-100 and divide-by-127 unit error (a size handed to the
    attribute in points, or in EMU, lands below 1pt and the schema layer fails it). The residual
    schema-legal window is 1pt..8pt, where this corpus ships legitimate values — a 3pt blank run
    and 5pt `endParaRPr` used as tight vertical spacers — and no plausible write-it-wrong path
    produces that band. A floor there would need a text-bearing-vs-spacer discrimination to buy
    nothing.
    """
    ceiling, why = slide_height_centipoints(zf)
    if ceiling is None:
        return [f"{display_path}: PROBE FAILURE — {why}; refusing to bound font sizes "
                f"without the deck's own slide height"]
    findings: list[str] = []
    for entry, element, raw in font_size_attrs(zf):
        if not raw.isdigit():
            findings.append(f"{display_path} {entry}: a:{element}/@sz={raw!r} is not an integer")
            continue
        sz = int(raw)
        if sz > ceiling:
            findings.append(
                f"{display_path} {entry}: a:{element} font size {sz} centipoints = {sz / 100:g}pt "
                f"exceeds the deck's own slide height of {ceiling / 100:g}pt — no glyph that size "
                f"renders on the slide. ST_TextFontSize permits up to "
                f"{_ST_TEXTFONTSIZE_MAX / 100:g}pt, so the schema layer cannot see this. Usual "
                f"cause: a centipoint value handed to a points API — a 100x error, e.g. "
                f"`font.size = Emu(2200 * 12700)` where `Pt(22)` was meant")
    return findings


def structural_findings(display_path: str, fs_path: str) -> list[str]:
    """Defects that every other layer in this tool tolerates — three PowerPoint-fatal, one absurd.

    Measured 261103 on a deck PowerPoint refused to open: zip integrity clean (151 entries, 0
    dups, testzip() None), python-pptx opened all 29 slides, and this tool reported 0 OPC / 0
    schema with the schema layer confirmed run. The actual defects were *referential* and
    *structural*, and both are invisible to a schema validator because each part is individually
    valid:

      1. A `<p:spTgt spid="N">` animation target naming a shape id absent from its own slide
         (the slide's animated shapes had been deleted). PowerPoint offers to REPAIR and strips
         the author's entire `<p:timing>` build on acceptance — unrecoverable, there being no
         regenerate path for a hand-built animation.
      2. A duplicate `cNvPr/@id` within one slide.
      3. A `custGeom` missing its `<a:rect>` or `<a:pathLst>`.
      4. A font size that is schema-legal and absurd at human scale — see
         `font_size_findings`. PowerPoint opens such a deck happily; the defect is that a
         2200pt heading renders as one clipped glyph where 22pt was meant. Same gap, different
         direction: the schema bounds the TYPE and has no notion of a readable size.

    WHY THIS LIVES HERE rather than in each caller: the scan was pasted into eight agent briefs
    in one session, and the pasted copies were WRONG in a way that inverts the result. Shape ids
    on a slide are `p:cNvPr` (PresentationML); `a:cNvPr` (DrawingML) occurs only inside charts,
    diagrams and some graphic frames. A scan keyed on DrawingML alone finds almost no shape ids
    and reports nearly every animation target as dangling — on 261104 that reported 7 of 9 Act III
    decks as structurally broken, six of which had been opened in PowerPoint and confirmed clean.
    So the union of both namespaces is taken, and a slide that yields NO shape ids while carrying
    animation targets is reported as a PROBE failure rather than silently producing findings.

    BLOCKING since 261105, at the author's direction, after the fix-wave drained to zero. The
    promotion history is worth keeping because it is the AUDIT-ONLY-first pattern working as
    intended: the layer landed audit-only, its first --all-tracked run surfaced THREE latent
    duplicate-id findings nobody knew about (2-4 Failure-Aware Engineering slides 4 and 5, which
    had SHIPPED, plus a WIP deck under book/_design/), those were fixed, and only then did it
    start gating. Had it landed blocking it would have broken every commit in the checkout on
    day one.

    The root cause of all three was one helper: `book/_design/2-4-redux-build/scripts/buildlib.py`
    `clone_into` deep-copied a shape element without reassigning its `cNvPr` id, so every clone
    carried its source's. Fixed there too, so the class is closed at the emitter rather than only
    at the artifacts.

    Sabotage-verified: injecting one bad spid into a copy of a clean deck reports the dangling
    target by name, perturbing an id reports the duplicate, and rewriting one `@sz` to 220000
    reports the absurd font size.
    """
    findings: list[str] = []
    try:
        zf = zipfile.ZipFile(fs_path)
    except (zipfile.BadZipFile, OSError) as exc:
        return [f"{display_path}: cannot open package ({exc})"]  # the OPC layer reports this too
    with zf:
        for idx, entry in _slide_entries(zf):
            try:
                root = ET.fromstring(zf.read(entry))
            except ET.ParseError as exc:
                findings.append(f"{display_path} slide {idx}: unparseable XML ({exc})")
                continue

            ids = [c.get("id") for c in root.iter(f"{_PML}cNvPr")]
            ids += [c.get("id") for c in root.iter(f"{_DML}cNvPr")]
            ids = [i for i in ids if i is not None]
            targets = [t.get("spid") for t in root.iter(f"{_PML}spTgt")]
            targets = [t for t in targets if t is not None]

            if targets and not ids:
                # The precondition the pasted copies lacked. Without it a namespace mistake
                # reports every target as dangling, which condemns correct decks.
                findings.append(
                    f"{display_path} slide {idx}: PROBE FAILURE — {len(targets)} animation "
                    f"target(s) but zero shape ids found; refusing to report dangling targets")
                continue

            dangling = sorted(set(targets) - set(ids))
            if dangling:
                findings.append(
                    f"{display_path} slide {idx}: dangling spTgt spid(s) {dangling} — "
                    f"PowerPoint will offer to repair and strip this slide's build")

            dupes = sorted({i for i in ids if ids.count(i) > 1})
            if dupes:
                findings.append(f"{display_path} slide {idx}: duplicate cNvPr/@id {dupes}")

            for geom in root.iter(f"{_DML}custGeom"):
                missing = [part for part in ("rect", "pathLst")
                           if geom.find(f"{_DML}{part}") is None]
                if missing:
                    findings.append(
                        f"{display_path} slide {idx}: custGeom missing {', '.join(missing)}")

        findings += font_size_findings(display_path, fs_path, zf)
    return findings


# --------------------------------------------------------------------------------------- main

def validate(files: "list[tuple[str, str]]") -> int:
    """Validate (display_path, fs_path) pairs; print plan + results; return exit code."""
    # A `~$<name>.pptx` sibling is PowerPoint's open-file lock, not a deck: it is a tiny
    # non-zip blob, so every layer reports it as corrupt and the run goes red while the deck
    # beside it is fine. It is never tracked, so --staged/--all-tracked cannot reach one; an
    # explicit glob can, and does exactly when an author has a deck open. Skip loudly rather
    # than silently — the caller named it, so it deserves a line.
    locks = [disp for disp, _fs in files if os.path.basename(disp).startswith("~$")]
    files = [(disp, fs) for disp, fs in files if not os.path.basename(disp).startswith("~$")]
    print(f"pptx-validate: plan — OPC part coverage (stdlib) + structural/referential (stdlib) "
          f"+ OOXML schema (OpenXmlValidator) over {len(files)} file(s)")
    for lock in locks:
        print(f"  [skip] {lock} — PowerPoint lock file, not a deck (the deck is open in an editor)")
    opc = [f for disp, fs in files for f in opc_findings(disp, fs)]
    structural = [f for disp, fs in files for f in structural_findings(disp, fs)]

    dotnet = resolve_dotnet()
    schema: list[tuple[str, str, str, str]] = []
    baselined: list[tuple[str, str, str, str]] = []
    skip_reason = ""
    if dotnet is None:
        skip_reason = "dotnet not found — OOXML schema layer skipped (OPC layer still enforced)"
    else:
        raw, skip_reason = schema_findings(dotnet, files)
        baseline = load_baseline()
        for disp, eid, part, detail in raw:
            (baselined if (disp, eid, part) in baseline else schema).append(
                (disp, eid, part, detail))

    for f in opc:
        print(f"  [FAIL/opc] {f}")
    for disp, eid, _part, detail in schema:
        print(f"  [FAIL/schema] {disp}: {eid} — {detail}")
    for f in structural:
        print(f"  [FAIL/structural] {f}")
    for disp, eid, _part, _detail in baselined:
        print(f"  [baselined] {disp}: {eid} (grandfathered in tools/pptx-validate-baseline.json)")
    if skip_reason:
        print(f"  [skip] {skip_reason}")

    # structural GATES since 261105 (promoted after the fix-wave drained tree-wide to 0).
    bad = len(opc) + len(schema) + len(structural)
    print(f"pptx-validate: result — {len(files)} file(s), {len(opc)} OPC finding(s), "
          f"{len(schema)} schema finding(s) ({len(baselined)} baselined), "
          f"{len(structural)} structural finding(s), "
          f"schema layer {'SKIPPED' if skip_reason else 'ran'}")
    return 1 if bad else 0


def main(argv: list[str]) -> int:
    if not argv:
        print(__doc__)
        return 2
    if argv == ["--staged"]:
        staged = staged_pptx()
        if not staged:
            return 0  # nothing to validate; stay silent and fast in the common commit
        with tempfile.TemporaryDirectory(prefix="pptx-validate-") as td:
            pairs = []
            for i, path in enumerate(staged):
                blob = subprocess.run(["git", "show", f":{path}"], cwd=ROOT,
                                      capture_output=True)
                if blob.returncode != 0:
                    print(f"pptx-validate: cannot read staged blob :{path}", file=sys.stderr)
                    return 2
                fs = os.path.join(td, f"{i}-{os.path.basename(path)}")
                with open(fs, "wb") as fh:
                    fh.write(blob.stdout)
                pairs.append((path, fs))
            return validate(pairs)
    if argv == ["--all-tracked"]:
        return validate([(p, os.path.join(ROOT, p)) for p in tracked_pptx()])
    if any(a.startswith("-") for a in argv):
        print(__doc__)
        return 2
    return validate([(os.path.relpath(os.path.abspath(a), ROOT)
                      if os.path.abspath(a).startswith(ROOT + os.sep) else a,
                      os.path.abspath(a)) for a in argv])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
