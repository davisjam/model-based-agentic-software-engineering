#!/usr/bin/env python3
"""manifest.py — validate the self-communicate structural model and render its generated views.

`manifest.json` is the machine-readable composition model of the skill. This module is its consumer:

  - `render_router(leg)` — produce a leg's `AGENTS.md` (a generated navigation VIEW over the manifest).
  - `build_routers(root)` — write every leg's `AGENTS.md`.
  - `validate(root)`      — the bidirectional structural-integrity checks (manifest -> filesystem: every
                            declared path exists; filesystem -> manifest: every substantive leg resource is
                            accounted for), plus overlay/dependency/input checks.

Ownership: the Markdown/py resources are the substantive guidance; the manifest models their composition;
SKILL.md orchestrates; AGENTS.md and the mage-*-style.md exports are GENERATED (do not hand-edit). Keep
this stdlib-only (it ships inside the portable skill). Run standalone: `python3 manifest.py [validate|build]`.
"""

from __future__ import annotations

import json
import pathlib
import sys

SKILL_ROOT = pathlib.Path(__file__).resolve().parent
LEG_DIRS = ("writing", "drawing", "presenting")
#: File extensions treated as SUBSTANTIVE skill resources for the filesystem -> manifest check.
_SUBSTANTIVE_SUFFIXES = (".md", ".py")


def load(root: pathlib.Path = SKILL_ROOT) -> dict:
    return json.loads((root / "manifest.json").read_text(encoding="utf-8"))


def _overlay_locals(leg: dict) -> dict[str, str]:
    """base-resource -> local-overlay path, for the leg's declared overlays."""
    return {o["base"]: o["local"] for o in leg.get("overlays", [])}


def _rel_to_leg(resource: str, leg_key: str) -> str:
    """A manifest resource path (`writing/voice.md`) rendered leg-relative for the router that lives in the
    leg dir (`voice.md`)."""
    prefix = f"{leg_key}/"
    return resource[len(prefix):] if resource.startswith(prefix) else resource


def render_router(leg_key: str, leg: dict) -> str:
    """The generated `AGENTS.md` for one leg: title, purpose, router intro, and the ordered conceptual
    layers (each a numbered item naming its resources and its short description). A view over the manifest —
    never hand-authored."""
    overlays = _overlay_locals(leg)
    lines = [f"# {leg['title']}", "", leg["description"], "", leg["router_intro"], ""]
    for i, layer in enumerate(leg["layers"], 1):
        names = []
        for res in layer["resources"]:
            rel = _rel_to_leg(res, leg_key)
            if res in overlays:
                names.append(f"`{rel}` + `{_rel_to_leg(overlays[res], leg_key)}`")
            else:
                names.append(f"`{rel}`")
        joined = ", ".join(names)
        lines.append(f"{i}. **{layer['title']}** — {joined}")
        lines.append(f"   {layer['description']}")
    lines += ["", "> Generated from `../manifest.json` — do not edit by hand.",
              "> Keep the root `../SKILL.md` authoritative for cross-leg routing and shared principles."]
    return "\n".join(lines) + "\n"


def build_routers(root: pathlib.Path = SKILL_ROOT) -> list[pathlib.Path]:
    """Write every leg's generated `AGENTS.md`. Returns the paths written."""
    m = load(root)
    written = []
    for leg_key, leg in m["legs"].items():
        path = root / leg["router"]["path"]
        path.write_text(render_router(leg_key, leg), encoding="utf-8")
        written.append(path)
    return written


def _declared_resources(m: dict) -> dict[str, set[str]]:
    """Return the sets of manifest-declared skill-relative paths, by role, for the accounting check."""
    layer, overlay, distinct_inputs, routers, support = set(), set(), set(), set(), set(m.get("support", []))
    for leg in m["legs"].values():
        for lyr in leg["layers"]:
            layer.update(lyr["resources"])
        for ov in leg.get("overlays", []):
            overlay.add(ov["base"])
            overlay.add(ov["local"])
        distinct_inputs.update(leg["distribution"]["inputs"])
        routers.add(leg["router"]["path"])
    return {"layer": layer, "overlay": overlay, "inputs": distinct_inputs, "routers": routers, "support": support}


def validate(root: pathlib.Path = SKILL_ROOT) -> list[str]:
    """Bidirectional structural-integrity checks. Returns a list of problem strings (empty == clean).
    Each message names the offending path or manifest key directly."""
    problems: list[str] = []
    try:
        m = load(root)
    except (OSError, json.JSONDecodeError) as e:
        return [f"manifest.json unreadable: {e}"]

    # skill entrypoint exists (check 6 seed)
    ep = m["skill"]["entrypoint"]
    if not (root / ep).is_file():
        problems.append(f"skill.entrypoint {ep!r} does not exist")

    decl = _declared_resources(m)
    all_accounted = decl["layer"] | decl["overlay"] | decl["inputs"] | decl["routers"] | decl["support"]

    for leg_key, leg in m["legs"].items():
        # (1) layer resources exist
        layer_ids = set()
        for lyr in leg["layers"]:
            layer_ids.add(lyr["id"])
            for res in lyr["resources"]:
                if not (root / res).is_file():
                    problems.append(f"{leg_key}: layer {lyr['id']!r} resource {res!r} does not exist")
        # (4) dependencies name declared layer ids
        for dep in leg.get("dependencies", []):
            if dep not in layer_ids:
                problems.append(f"{leg_key}: dependency {dep!r} is not a declared layer id")
        # (5) overlay bases exist (the local overlay is optional — absent is fine)
        for ov in leg.get("overlays", []):
            if not (root / ov["base"]).is_file():
                problems.append(f"{leg_key}: overlay base {ov['base']!r} does not exist")
            if not ov.get("optional", False) and not (root / ov["local"]).is_file():
                problems.append(f"{leg_key}: required overlay local {ov['local']!r} does not exist")
        # (2) router destination lives in a real directory
        rpath = leg["router"]["path"]
        if not (root / rpath).parent.is_dir():
            problems.append(f"{leg_key}: router destination {rpath!r} is in a non-existent directory")
        # (2) + (3) distribution inputs exist (a REQUIRED source; an optional overlay input is exempt)
        optional_inputs = {ov["local"] for ov in leg.get("overlays", []) if ov.get("optional", False)}
        for src in leg["distribution"]["inputs"]:
            if src in optional_inputs:
                continue
            if not (root / src).is_file():
                problems.append(f"{leg_key}: distribution input {src!r} (generator "
                                f"{leg['distribution'].get('generator')!r}) does not exist")

    # (7) filesystem -> manifest: every substantive file under a leg dir is accounted for.
    for leg_key in LEG_DIRS:
        d = root / leg_key
        if not d.is_dir():
            problems.append(f"leg directory {leg_key}/ does not exist")
            continue
        for f in sorted(d.iterdir()):
            if not f.is_file() or f.suffix not in _SUBSTANTIVE_SUFFIXES:
                continue
            rel = f"{leg_key}/{f.name}"
            if rel in all_accounted:
                continue
            if rel in decl["routers"]:  # generated router — expected
                continue
            problems.append(f"orphan resource {rel!r}: exists under {leg_key}/ but is not represented in "
                            f"manifest.json (add it to a layer/overlay, or to `support`)")
    return problems


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "validate"
    if cmd == "validate":
        issues = validate()
        for i in issues:
            print(f"  MANIFEST: {i}")
        print(f"manifest validate: {len(issues)} issue(s)")
        return 1 if issues else 0
    if cmd == "build":
        for p in build_routers():
            print(f"router: {p.relative_to(SKILL_ROOT)}")
        return 0
    print(f"usage: manifest.py [validate|build]  (got {cmd!r})")
    return 2


if __name__ == "__main__":
    sys.exit(main())
