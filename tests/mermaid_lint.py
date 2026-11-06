"""Mermaid edge-label footgun lint.

Mermaid parses `[` / `]` as node-shape syntax, and `~>` is not a valid arrow; either one
placed INSIDE an edge-label pipe (`A -->|label| B`) breaks the diagram at render time with a
cryptic parser error rather than a clear "bad label" message. This check catches the footgun
at lint time with a precise file:line and the offending label.

Governance conversion (author 260804): the FILL-IN Structure-diagram wave hit this on a
mermaid diagram; rather than fix only the instance, the class is converted to a control here.
"""
from __future__ import annotations

import os
import re
import sys

from tests.common import FAIL, PASS, ROOT, rel

sys.path.insert(0, os.path.join(ROOT, "tools"))
import pruned_walk  # noqa: E402 — the shared pruning walk; `tools/` is a flat script directory

# Pipe-delimited segments on a line; in a mermaid flowchart these are edge labels.
_PIPE = re.compile(r"\|([^|]*)\|")
# The three render-breaking tokens the author named.
_BANNED = ("[", "]", "~>")


def check_mermaid_edge_labels():
    """Fail if any mermaid edge-label pipe contains `[`, `]`, or `~>` (mermaid render footguns)."""
    findings = []
    # PRUNED, not filtered: a `recursive=True` glob expanded all of `book/` (5,788 directory opens,
    # every directory scanned twice because the trailing component is not `**`) and then dropped the
    # design drafts from the results. `named("_design")` is the same exclusion the filter was — a file
    # under a directory called `_design` at any depth — decided before the descent. `node_modules`
    # joins it as a SCOPE correction, not a speed one: the glob handed this lint 388 vendored npm
    # READMEs to walk for mermaid fences. 696 opens, same findings (0 before, 0 after).
    for md in sorted(pruned_walk.walk_files(
            os.path.join(ROOT, "book"), (".md",),
            discard=pruned_walk.named("_design", "node_modules"), skip_hidden=True)):
        with open(md, encoding="utf-8") as fh:
            text = fh.read()
        in_mermaid = False
        for lineno, line in enumerate(text.splitlines(), 1):
            stripped = line.strip()
            if stripped.startswith("```mermaid"):
                in_mermaid = True
                continue
            if in_mermaid and stripped.startswith("```"):
                in_mermaid = False
                continue
            if not in_mermaid:
                continue
            for seg in _PIPE.findall(line):
                hit = [b for b in _BANNED if b in seg]
                if hit:
                    toks = ", ".join(repr(h) for h in hit)
                    findings.append(
                        f"{rel(md)}:{lineno}: mermaid edge-label |{seg.strip()}| contains {toks} "
                        f"— breaks the parser; keep [ ] and ~> out of edge-label pipes "
                        f"(use a plain word, or &rarr; for an arrow)"
                    )
    return (FAIL if findings else PASS), findings


if __name__ == "__main__":
    status, out = check_mermaid_edge_labels()
    for f in out:
        print(f)
    print(f"{status}: {len(out)} mermaid edge-label finding(s)")
    sys.exit(1 if out else 0)
