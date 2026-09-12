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


# --------------------------------------------------------------------------------------- main

def validate(files: "list[tuple[str, str]]") -> int:
    """Validate (display_path, fs_path) pairs; print plan + results; return exit code."""
    print(f"pptx-validate: plan — OPC part coverage (stdlib) + OOXML schema (OpenXmlValidator) "
          f"over {len(files)} file(s)")
    opc = [f for disp, fs in files for f in opc_findings(disp, fs)]

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
    for disp, eid, _part, _detail in baselined:
        print(f"  [baselined] {disp}: {eid} (grandfathered in tools/pptx-validate-baseline.json)")
    if skip_reason:
        print(f"  [skip] {skip_reason}")

    bad = len(opc) + len(schema)
    print(f"pptx-validate: result — {len(files)} file(s), {len(opc)} OPC finding(s), "
          f"{len(schema)} schema finding(s) ({len(baselined)} baselined), "
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
