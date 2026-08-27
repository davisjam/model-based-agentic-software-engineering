"""Skill checks over the packaged plugin: manifest + structure, bundle freshness (no drift vs sources),
and bundle link integrity (nothing dangles once the plugin is copied to a cache and installed)."""
from __future__ import annotations

import glob
import json
import os
import re
import sys
import tempfile

import bundle_skill  # the SSOT of the managed-skill set + the install/refresh partition (INV-5/INV-6)
from tests.common import BUNDLED_SKILLS, FAIL, PASS, ROOT, SKILL, SKILLS, run


def check_skill_structure():
    """For every shipped skill: SKILL.md frontmatter. Bundled skills (generated from catalogue sources)
    also ship a bundler-emitted `principles.md`; a mirror-carrying skill ships its reference tree. An
    authored skill ships neither — its resources live in its own dir. Plus the plugin + marketplace
    manifests (once, at plugin level)."""
    issues = []
    try:
        pj = json.load(open(os.path.join(SKILL, ".claude-plugin", "plugin.json"), encoding="utf-8"))
        issues += [f"plugin.json: missing `{k}`" for k in ("name", "description") if not pj.get(k)]
    except Exception as ex:  # noqa: BLE001 — surfaced as a test issue, not swallowed
        issues.append(f"plugin.json: {ex}")
    try:
        mj = json.load(open(os.path.join(ROOT, ".claude-plugin", "marketplace.json"), encoding="utf-8"))
        issues += [f"marketplace.json: missing `{k}`" for k in ("name", "owner", "plugins") if not mj.get(k)]
    except Exception as ex:  # noqa: BLE001 — surfaced as a test issue
        issues.append(f"marketplace.json: {ex}")
    for name, sdir, has_ref in SKILLS:
        skmd = os.path.join(sdir, "SKILL.md")
        if not os.path.isfile(skmd):
            issues.append(f"{name}: SKILL.md missing")
            continue
        fm = re.match(r"^---\n(.*?)\n---\n", open(skmd, encoding="utf-8").read(), re.S)
        if not fm:
            issues.append(f"{name}: SKILL.md has no YAML frontmatter")
        elif not re.search(r"^description:\s*\S", fm.group(1), re.M):
            issues.append(f"{name}: SKILL.md frontmatter has no non-empty `description`")
        if name in BUNDLED_SKILLS:  # only generated skills carry a bundler-emitted principles.md
            principles = os.path.join(sdir, "principles.md")
            if not (os.path.isfile(principles) and os.path.getsize(principles) > 500):
                issues.append(f"{name}: principles.md missing or too small")
        if has_ref:
            ref = os.path.join(sdir, "alignment", "mechanisms")  # the census now lives beneath alignment/
            for fn in ("INDEX.md", "ABSTRACTIONS.md", "README.md"):
                if not os.path.isfile(os.path.join(ref, fn)):
                    issues.append(f"{name}: alignment/mechanisms/{fn} missing")
            n = len(glob.glob(os.path.join(ref, "agent", "*", "*.md"))) + \
                len(glob.glob(os.path.join(ref, "models-bridge", "*", "*.md")))
            if n < 30:
                issues.append(f"{name}: alignment/mechanisms has only {n} entries (expected 30+)")
    return (FAIL if issues else PASS), issues


def check_skill_drift():
    """Regenerate the bundle and assert it matches what's committed (no stale bundle). Scoped to the
    GENERATED skill dirs — an authored skill (`bundle_skill.py` never emits it) must not read as drift."""
    r = run([sys.executable, "bundle_skill.py"])
    if r.returncode != 0:
        return FAIL, [f"bundle_skill.py failed (rc={r.returncode}): {r.stderr.strip()[:200]}"]
    pathspecs = [f"plugin/mage/skills/{n}" for n in sorted(BUNDLED_SKILLS)]
    d = run(["git", "status", "--porcelain", "--"] + pathspecs)
    changed = [ln for ln in d.stdout.splitlines() if ln.strip()]
    if changed:
        return FAIL, ["bundle is STALE vs its sources — run `bundle_skill.py` and commit:"] + changed[:12]
    return PASS, []


def check_bundle_links():
    """Every relative link inside the installed skill must resolve. A plugin is copied to a cache and
    can't reach outside its own dir, so a dangling `../../downloads/...` handoff (an entry citing a
    template the bundler didn't vendor) would break once installed. External / anchor-only links are
    out of scope (same as the markdown checks)."""
    issues = []
    for name, sdir, _ in SKILLS:
        for f in glob.glob(os.path.join(sdir, "**", "*.md"), recursive=True):
            base = os.path.dirname(f)
            for m in re.findall(r"\]\(([^)]+)\)", open(f, encoding="utf-8").read()):
                if m.startswith(("http://", "https://", "mailto:", "#", "//")):
                    continue
                tgt = m.split("#", 1)[0]
                if tgt and not os.path.exists(os.path.normpath(os.path.join(base, tgt))):
                    issues.append(f"{name}/{os.path.relpath(f, sdir)} -> {m} (missing in bundle)")
    return (FAIL if issues else PASS), issues


# ── INV-5 / INV-6 — the local-adapter plug convention (Phase-1b design §3.6) ──────────────────────────
_ADAPTER_HEADING = "## Local adapter"
# A declared file overlay: `<base>.md` → `<base>.local.md`, both in backticks, arrow either glyph.
_OVERLAY_RE = re.compile(r"`([^`]+\.md)`\s*(?:→|->)\s*`([^`]+\.local\.md)`")


def _adapter_block(skill_md_text: str) -> str | None:
    """The `## Local adapter` section body (heading → next `## ` heading or EOF), or None if absent."""
    i = skill_md_text.find(_ADAPTER_HEADING)
    if i == -1:
        return None
    rest = skill_md_text[i + len(_ADAPTER_HEADING):]
    nxt = re.search(r"^## ", rest, re.M)
    return rest[: nxt.start()] if nxt else rest


def check_skill_local_adapter():
    """INV-5 (plug-partition wiring): every MANAGED skill declares a `## Local adapter` block; every
    declared file overlay names a real upstream base file and its correct `*.local.md` sibling; every
    `*.local.md` present in a skill has a base file AND a matching declaration (no orphan overlay). The
    partition is disjoint by construction — this asserts the DECLARATIONS match the tree."""
    issues: list[str] = []
    managed = {s.name for s in bundle_skill.SPECS}
    for name, sdir, _ in SKILLS:
        skmd = os.path.join(sdir, "SKILL.md")
        text = open(skmd, encoding="utf-8").read() if os.path.isfile(skmd) else ""
        block = _adapter_block(text)
        if name in managed and block is None:
            issues.append(f"{name}: managed skill has no `## Local adapter` block in SKILL.md")
        declared: set[str] = set()
        for base_rel, overlay_rel in (_OVERLAY_RE.findall(block) if block else []):
            declared.add(overlay_rel.replace("\\", "/"))
            if not os.path.isfile(os.path.join(sdir, base_rel)):
                issues.append(f"{name}: declared overlay base `{base_rel}` does not exist")
            if overlay_rel != base_rel[:-3] + ".local.md":
                issues.append(f"{name}: `{overlay_rel}` is not the `.local.md` sibling of `{base_rel}`")
        for f in glob.glob(os.path.join(sdir, "**", "*.local.md"), recursive=True):
            rel = os.path.relpath(f, sdir).replace("\\", "/")
            base = rel[: -len(".local.md")] + ".md"
            if not os.path.isfile(os.path.join(sdir, base)):
                issues.append(f"{name}: orphan overlay `{rel}` — no base `{base}`")
            if rel not in declared:
                issues.append(f"{name}: overlay `{rel}` present but not declared in `## Local adapter`")
    return (FAIL if issues else PASS), issues


def check_refresh_preserves_local():
    """INV-6 (refresh preserves local): failure-injection over the install/refresh partition. Install a
    managed skill to a temp dir, write a synthetic `*.local.md` overlay + a `local/` drop-in, tamper an
    upstream file, then `--refresh` and assert: both adopter files survive byte-for-byte, the tampered
    upstream file is overwritten clean, the manifest body lists no adopter path, and the result dict
    reports the preserved files."""
    issues: list[str] = []
    name = "self-governance"  # a generated, managed skill
    OVERLAY, DROPIN = "HOUSE-OVERLAY-SENTINEL\n", "LOCAL-DROPIN-SENTINEL\n"
    with tempfile.TemporaryDirectory() as tmp:
        bundle_skill.install_skill(name, tmp, refresh=False)
        dest = os.path.join(tmp, name)
        overlay_p = os.path.join(dest, "principles.local.md")
        dropin_p = os.path.join(dest, "local", "adopter-note.md")
        os.makedirs(os.path.dirname(dropin_p), exist_ok=True)
        with open(overlay_p, "w", encoding="utf-8") as fh:
            fh.write(OVERLAY)
        with open(dropin_p, "w", encoding="utf-8") as fh:
            fh.write(DROPIN)
        up_p = os.path.join(dest, "principles.md")
        pristine = open(up_p, encoding="utf-8").read()
        with open(up_p, "a", encoding="utf-8") as fh:
            fh.write("\nTAMPERED-BY-ADOPTER\n")

        r = bundle_skill.install_skill(name, tmp, refresh=True)

        if open(overlay_p, encoding="utf-8").read() != OVERLAY:
            issues.append("refresh clobbered principles.local.md (adopter overlay not preserved)")
        if open(dropin_p, encoding="utf-8").read() != DROPIN:
            issues.append("refresh clobbered local/adopter-note.md (adopter drop-in not preserved)")
        if open(up_p, encoding="utf-8").read() != pristine:
            issues.append("refresh did not overwrite the tampered upstream principles.md")
        manifest = os.path.join(dest, bundle_skill.MANIFEST_NAME)
        body = [ln.strip() for ln in open(manifest, encoding="utf-8")
                if ln.strip() and not ln.startswith("#")]
        leaked = [ln for ln in body if ln.endswith(".local.md") or ln.split("/")[0] == "local"]
        if leaked:
            issues.append(f"manifest body lists adopter-owned path(s): {leaked}")
        if "principles.local.md" not in r["preserved"] or "local/adopter-note.md" not in r["preserved"]:
            issues.append(f"refresh result under-reported preserved files: {r['preserved']}")
    return (FAIL if issues else PASS), issues


def check_self_communicate_manifest():
    """The self-communicate skill's `manifest.json` is the SSOT for its composition; the per-leg AGENTS.md
    routers and the mage-*-style.md exports are GENERATED views. This runs the manifest's OWN bidirectional
    structural validation (manifest -> filesystem: every declared source / router / input / overlay base
    exists; filesystem -> manifest: every substantive leg resource is accounted for; dependency + overlay
    checks) and fails on DRIFT — a committed AGENTS.md that no longer equals the manifest render, or a
    non-reproducible export. Derived from the manifest, so no second copy of the skill inventory lives here
    (boring + mandatory: it catches file deletion, rename, or partial integration immediately)."""
    import importlib.util
    import pathlib
    skill = os.path.join(ROOT, "plugin", "mage", "skills", "self-communicate")
    root = pathlib.Path(skill)
    issues: list[str] = []

    def _load(name, path):
        spec = importlib.util.spec_from_file_location(name, path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    man = _load("_sc_manifest", os.path.join(skill, "manifest.py"))
    # (1-7) structural validation, bidirectional
    issues += man.validate(root)
    m = man.load(root)
    # (8) router drift — a committed AGENTS.md must equal the manifest render
    for leg_key, leg in m["legs"].items():
        dest = root / leg["router"]["path"]
        want = man.render_router(leg_key, leg)
        have = dest.read_text(encoding="utf-8") if dest.is_file() else "<missing>"
        if have != want:
            issues.append(f"{leg['router']['path']}: drifted from the manifest render — regenerate with "
                          f"`python3 manifest.py build`")
    # (9) export reproducibility — rendering a distribution export twice is byte-identical
    sty = _load("_sc_style", os.path.join(ROOT, "book", "build_writing_style.py"))
    entry = m["skill"]["entrypoint"]
    for leg_key, leg in m["legs"].items():
        legd = {**leg, "_entrypoint": entry}
        if sty.render(leg_key, legd) != sty.render(leg_key, legd):
            issues.append(f"{leg['distribution']['path']}: export render is not reproducible")
    return (FAIL if issues else PASS), issues
