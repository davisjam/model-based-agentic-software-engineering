"""Two rules about the publishing workflow's steps: they can run their gates, and they do not BE them.

THE FAILURE CLASS, second and third costumes. Its first — a gate the runner never invokes — is held in
the workbench's own suite (`workbench/test/gate-reachability.test.ts`). The second is below: the runner
DOES reach the gate and the gate cannot execute, because what it needs is not there yet. The third is
`check_ci_steps_invoke_gates_rather_than_embedding_them`, at the end of this file: the runner reaches
the gate by REIMPLEMENTING it, which is how one invariant comes to have two thresholds.

The instance, 261002. `workbench/test/parity.test.ts` holds the TypeScript rule set against
`workbench/validate.py` — the independent second implementation of the same rules — by shelling out to
it. `validate.py` exits 2 with "missing dependency" when PyYAML is absent, and the test's `execFileSync`
throws on a non-zero exit. There is no skip path, deliberately: a parity suite that skipped when its
second implementation could not start would report green while comparing nothing. The workflow installed
PyYAML twice, both times in steps that run LATER, so the node suite reached `validate.py` before anything
had installed what it imports. The published build failed. Patched by moving the install into the step
that depends on it, which fixes the instance and leaves the next one free to happen.

WHY IT IS A DERIVATION, NOT A PAIR OF HARDCODED NAMES. The required packages are read from
`validate.py`'s own imports: every top-level import that is not in the standard library. So adding
`import requests` to the validator makes this check demand it in CI, with no edit here. The script to
read is itself derived — found by scanning the node suite for `execFileSync("python3", [...])` — so
pointing the suite at a second Python file extends the coverage automatically. Only the import-name →
pip-name map is authored, because no mechanical rule derives "pyyaml" from "yaml".

WHAT IT DOES NOT DO. It does not invent a dependency manifest the repo does not have, and it does not
try to decide in general which step needs which package. The claim is narrow and checkable: a step that
runs a suite with a known shell-out must install that shell-out's imports before invoking it. Steps that
run nothing of the kind are not examined.

Three things must hold, and the first two exist because a probe that finds nothing is usually a broken
probe rather than a clean repo:

  - **The derivation found its subject.** The node suite shells out to at least one Python script, that
    script parses, and it imports at least one third-party module. A silent empty set would make the
    rule below vacuous while it reported PASS.
  - **Some CI step runs the suite.** If none does, the suite is not gating the published site at all —
    which is the sibling failure, and worth a finding here too.
  - **Each such step installs every derived package, earlier in its own `run` block.** Line order
    inside the block is the whole subject: the 261002 defect was an install that existed and ran after.

NOT A YAML PARSER. `catalog.py` is stdlib-only by design, so there is no PyYAML to lean on, and adding
one for this would trade a dependency for a convenience. The scanner below reads only what the rule
needs — the `run:` block scalars and the `- name:` that heads each step — and documents the shape it
assumes. A workflow written in flow style would read as "no step runs the suite", which fails loudly
rather than passing quietly.
"""
from __future__ import annotations

import ast
import os
import re
import sys

from tests.common import FAIL, PASS, ROOT

WORKFLOW = os.path.join(".github", "workflows", "pages.yml")

#: Where the node suite lives, and the command that runs it. `npm test` is the shorthand the workflow
#: and the pre-push hook both use; `npm run test` is the long form.
SUITE_DIR = "workbench"
SUITE_INVOCATION = re.compile(r"\bnpm\s+(?:test\b|run\s+test\b(?!:))")

#: Import name -> pip name, for the cases where they differ. Nothing derives "pyyaml" from "yaml"; a
#: name absent here is assumed to install under its import name, which is true of `jsonschema`.
PIP_NAME = {"yaml": "pyyaml"}

#: `execFileSync("python3", ["<script>", ...])` in the node suite — how it reaches a Python gate.
PY_SHELLOUT = re.compile(r"""execFileSync\(\s*["']python3?["']\s*,\s*\[\s*["']([^"']+\.py)["']""")


class Step:
    """One workflow step: its name, its `run` block, and the block's lines."""

    def __init__(self, name: str, lineno: int, body: list[str]) -> None:
        self.name = name
        self.lineno = lineno          # 1-based line of the `run:` key, for the message
        self.body = body

    def line_of(self, pattern: re.Pattern[str]) -> int | None:
        """Index within the block of the first line the pattern matches."""
        for i, line in enumerate(self.body):
            if pattern.search(line):
                return i
        return None


def _steps(text: str) -> list[Step]:
    """Every `run:` block scalar in the workflow, with the `- name:` that heads its step.

    The shape assumed, which is the shape every step in this file uses: a step opens with `- name: …`
    and its script is a `run: |` block whose lines are indented past the `run:` key. An inline
    `run: cmd` is read as a one-line block.
    """
    steps: list[Step] = []
    lines = text.split("\n")
    name = "<unnamed>"
    i = 0
    while i < len(lines):
        line = lines[i]
        named = re.match(r"\s*-\s+name:\s*(.+?)\s*$", line)
        if named:
            name = named.group(1)
        run = re.match(r"(\s*)run:\s*(.*)$", line)
        if run:
            indent, rest = len(run.group(1)), run.group(2).strip()
            if rest in ("|", "|-", ">", ">-"):
                body: list[str] = []
                i += 1
                while i < len(lines):
                    nxt = lines[i]
                    if nxt.strip() and (len(nxt) - len(nxt.lstrip())) <= indent:
                        break
                    body.append(nxt)
                    i += 1
                steps.append(Step(name, i - len(body), body))
                continue
            if rest:
                steps.append(Step(name, i + 1, [rest]))
        i += 1
    return steps


def _python_gates() -> tuple[list[str], list[str]]:
    """Python scripts the node suite shells out to, and anything that stopped the search.

    Read from the suite's own sources rather than listed, so a second shell-out is covered the day it
    lands. Paths are relative to `workbench/`, which is how the suite invokes them.
    """
    issues: list[str] = []
    suite = os.path.join(ROOT, SUITE_DIR, "test")
    if not os.path.isdir(suite):
        return [], [f"{SUITE_DIR}/test/ is missing — the derivation cannot read the suite"]
    scripts: set[str] = set()
    for name in sorted(os.listdir(suite)):
        if not name.endswith(".ts"):
            continue
        with open(os.path.join(suite, name), encoding="utf-8") as fh:
            for match in PY_SHELLOUT.finditer(fh.read()):
                scripts.add(match.group(1))
    return sorted(scripts), issues


def _third_party_imports(script_rel: str) -> tuple[list[str], list[str]]:
    """Pip names a script needs, from its own top-level imports.

    `sys.stdlib_module_names` is the authority on what needs no install, so the set tracks the Python
    that runs rather than a list someone remembered to update. Imports inside the `try/except
    ImportError` guard still count: the guard is how the script REPORTS the absence, not a way to run
    without the package.
    """
    path = os.path.join(ROOT, SUITE_DIR, script_rel)
    if not os.path.isfile(path):
        return [], [f"{SUITE_DIR}/{script_rel} does not exist, but the node suite shells out to it"]
    with open(path, encoding="utf-8") as fh:
        try:
            tree = ast.parse(fh.read(), filename=path)
        except SyntaxError as exc:
            return [], [f"{SUITE_DIR}/{script_rel} does not parse ({exc}) — its imports cannot be read"]
    roots: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            roots.update(a.name.split(".")[0] for a in node.names)
        elif isinstance(node, ast.ImportFrom) and node.level == 0 and node.module:
            roots.add(node.module.split(".")[0])
    external = {r for r in roots if r not in sys.stdlib_module_names and r != "__future__"}
    return sorted(PIP_NAME.get(r, r) for r in external), []


def _installed_before(step: Step, invoked_at: int) -> set[str]:
    """Packages a `pip install` in this block names on a line before `invoked_at`.

    Version specifiers, quotes and flags are stripped; `-r <file>` is followed, so moving the pins into
    a requirements file does not read as a missing install.
    """
    found: set[str] = set()
    for line in step.body[:invoked_at]:
        if "pip install" not in line:
            continue
        tail = line.split("pip install", 1)[1]
        tokens = tail.replace("'", " ").replace('"', " ").split()
        want_requirements = False
        for token in tokens:
            if want_requirements:
                want_requirements = False
                req = os.path.join(ROOT, token)
                if os.path.isfile(req):
                    with open(req, encoding="utf-8") as fh:
                        for row in fh:
                            row = row.strip()
                            if row and not row.startswith("#"):
                                found.add(re.split(r"[<>=!~\[;]", row)[0].strip().lower())
                continue
            if token in ("-r", "--requirement"):
                want_requirements = True
                continue
            if token.startswith("-"):
                continue
            found.add(re.split(r"[<>=!~\[;]", token)[0].strip().lower())
    return found


def _findings(workflow_text: str, required: list[str]) -> list[str]:
    """The rule, over supplied inputs, so the negative control can drive it with a broken workflow."""
    issues: list[str] = []
    running = [(s, at) for s in _steps(workflow_text)
               if (at := s.line_of(SUITE_INVOCATION)) is not None]
    if not running:
        return [f"no step in {WORKFLOW} runs the {SUITE_DIR} node suite. That suite is the only gate "
                f"holding the TypeScript rule set against its Python twin; nothing published is checked "
                f"against it."]
    for step, invoked_at in running:
        installed = _installed_before(step, invoked_at)
        missing = [pkg for pkg in required if pkg.lower() not in installed]
        if missing:
            issues.append(
                f"{WORKFLOW}:{step.lineno} step {step.name!r} runs the {SUITE_DIR} node suite without "
                f"installing {', '.join(missing)} earlier in the same block. The suite shells out to a "
                f"Python gate that imports it; that gate exits 2 on a missing dependency and the test's "
                f"execFileSync throws. An install in a LATER step is what broke the 261002 push — the "
                f"packages were in this file twice, both times after the step that needed them.")
    return issues


def check_ci_installs_what_the_suite_shells_out_to():
    """The CI step running the workbench node suite installs that suite's Python dependencies first."""
    issues: list[str] = []
    scripts, probe_issues = _python_gates()
    issues += probe_issues
    if not scripts:
        issues.append(f"found no `execFileSync(\"python3\", …)` in {SUITE_DIR}/test/*.ts. Either the "
                      f"parity suite stopped exercising its Python twin, or this derivation's pattern "
                      f"has gone stale — both make the rule below vacuous.")
    required: set[str] = set()
    for script in scripts:
        pkgs, script_issues = _third_party_imports(script)
        issues += script_issues
        required.update(pkgs)
    if scripts and not required:
        issues.append(f"derived no third-party imports from {', '.join(scripts)} — the rule would pass "
                      f"by requiring nothing. If the gate really is stdlib-only now, delete this check.")

    path = os.path.join(ROOT, WORKFLOW)
    if not os.path.isfile(path):
        issues.append(f"{WORKFLOW} is missing — the publishing workflow cannot be checked")
        return FAIL, issues
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    issues += _findings(text, sorted(required))
    return (FAIL if issues else PASS), issues


def check_ci_dependency_rule_fires():
    """Negative control: the rule reports an install ordered after the suite, and a missing one."""
    issues: list[str] = []
    required = ["jsonschema", "pyyaml"]

    # The 261002 defect exactly: the install is in the file, in a later step.
    late = ("jobs:\n  build:\n    steps:\n      - name: Suite\n        run: |\n"
            "          npm ci\n          npm test\n"
            "      - name: Book\n        run: |\n          python3 -m pip install pyyaml jsonschema\n")
    found = _findings(late, required)
    if len(found) != 1 or "without installing" not in found[0]:
        issues.append(f"an install ordered after the suite must be reported, got {found}")

    # Same block, still after the invocation — the ordering is the subject, not the presence.
    after = ("jobs:\n  build:\n    steps:\n      - name: Suite\n        run: |\n"
             "          npm test\n          python3 -m pip install pyyaml jsonschema\n")
    if len(_findings(after, required)) != 1:
        issues.append("an install BELOW the invocation in the same block must be reported")

    # One of two present is still a finding, and the message names only the one missing.
    partial = ("jobs:\n  build:\n    steps:\n      - name: Suite\n        run: |\n"
               "          python3 -m pip install \"pyyaml>=6,<7\"\n          npm test\n")
    found = _findings(partial, required)
    if len(found) != 1 or "jsonschema" not in found[0] or "pyyaml" in found[0]:
        issues.append(f"a partial install must report exactly what is missing, got {found}")

    # The patched shape must pass, including the pinned-and-quoted spelling the workflow uses.
    good = ("jobs:\n  build:\n    steps:\n      - name: Suite\n        run: |\n"
            "          python3 -m pip install \"pyyaml>=6,<7\" jsonschema\n          npm ci\n"
            "          npx tsc --noEmit\n          npm test\n")
    if _findings(good, required):
        issues.append(f"the patched workflow must pass, got {_findings(good, required)}")

    # A requirements file is followed rather than read as an absence.
    req_rel = os.path.join("book", "requirements-pdf.txt")
    if os.path.isfile(os.path.join(ROOT, req_rel)):
        via_file = ("jobs:\n  build:\n    steps:\n      - name: Suite\n        run: |\n"
                    f"          python3 -m pip install -r {req_rel}\n          npm test\n")
        with open(os.path.join(ROOT, req_rel), encoding="utf-8") as fh:
            pinned = [re.split(r"[<>=!~\[;]", r.strip())[0].strip().lower()
                      for r in fh if r.strip() and not r.strip().startswith("#")]
        if pinned and _findings(via_file, [pinned[0]]):
            issues.append(f"`pip install -r {req_rel}` must satisfy a package that file pins")

    # A workflow that runs the suite nowhere is the sibling failure, and must not read as clean.
    none_at_all = "jobs:\n  build:\n    steps:\n      - name: Build\n        run: |\n          npm run build\n"
    if "no step" not in (_findings(none_at_all, required) or [""])[0]:
        issues.append("a workflow that never runs the suite must be reported")

    # And `npm run test:browser` must not be mistaken for the node suite: the browser tier shells out
    # to no Python, so counting it would demand an install in a step that needs none.
    browser_only = ("jobs:\n  build:\n    steps:\n      - name: Browser\n        run: |\n"
                    "          npm run test:browser\n")
    if "no step" not in (_findings(browser_only, required) or [""])[0]:
        issues.append("`npm run test:browser` must not be read as the node suite")

    return (FAIL if issues else PASS), issues


# ----------------------------------------------------------------------------------------------
# Third costume: a step that does not INVOKE a gate but IS one, in YAML
# ----------------------------------------------------------------------------------------------

#: A relative module specifier inside a workflow's `run:` block — `from "./src/x.ts"`,
#: `require("../lib/y.js")`. An inline program reaching into a source tree this way is a second
#: implementation of something the package already has a script for.
#:
#: Relative only, deliberately. A bare specifier (`import yaml`, `from "node:fs"`) names a package or
#: a stdlib module and says nothing about reimplementing a gate; a relative one can only resolve
#: inside the repo. Narrow and true beats broad and arguable.
SOURCE_IMPORT = re.compile(r"""(?:\bfrom\s+|\brequire\s*\(\s*)["'](\.{1,2}/[^"']+)["']""")

#: How a `run:` block opens an inline program. Reported alongside the import, because it is what the
#: author must replace with a script name.
INLINE_LAUNCH = re.compile(r"--eval|--input-type|\bnode\s+-e\b|\bpython3?\s+-c\b")


def _embedded_gate_findings(workflow_text: str) -> list[str]:
    """Steps whose `run:` block imports a source module. Takes text, so the control can drive it."""
    issues: list[str] = []
    for step in _steps(workflow_text):
        for line in step.body:
            found = SOURCE_IMPORT.search(line)
            if not found:
                continue
            launch = next((ln.strip() for ln in step.body if INLINE_LAUNCH.search(ln)), None)
            issues.append(
                f"{WORKFLOW}:{step.lineno} step {step.name!r} runs an inline program that imports "
                f"{found.group(1)!r}"
                + (f" (launched by `{launch}`)" if launch else "")
                + ". A runner that imports a package's source is a SECOND implementation of whatever "
                "that source gates, and the two drift on the number nobody can see: UX-I1 was "
                "asserted here as `violations.length === 0` while the package's own suite compared "
                "the same list against a baseline that tolerated one standing violation. Two pushes "
                "failed at a threshold that had never been run locally. Move the logic into the "
                "package, give it a script, and invoke the script — the step keeps its name and its "
                "isolated failure, and loses only the second number.")
    return issues


def check_ci_steps_invoke_gates_rather_than_embedding_them():
    """No workflow step reimplements a gate inline; it invokes the package script that owns it."""
    path = os.path.join(ROOT, WORKFLOW)
    if not os.path.isfile(path):
        return FAIL, [f"{WORKFLOW} is missing — the publishing workflow cannot be checked"]
    with open(path, encoding="utf-8") as fh:
        text = fh.read()

    issues: list[str] = []
    # A probe that finds nothing is usually a broken probe. Both guards below fail loudly rather than
    # letting a parse that reads zero steps report a clean workflow.
    steps = _steps(text)
    if len(steps) < 5:
        issues.append(f"read {len(steps)} `run:` block(s) from {WORKFLOW} — the step scanner has gone "
                      f"stale, and a rule over no steps passes by examining nothing")
    if not any("npm run" in line for step in steps for line in step.body):
        issues.append(f"no step in {WORKFLOW} invokes `npm run` — either the workflow stopped using "
                      f"package scripts or this scan is not reading the blocks")
    issues += _embedded_gate_findings(text)
    return (FAIL if issues else PASS), issues


def check_ci_embedded_gate_rule_fires():
    """Negative control: the rule reports the inline parity step this repo used to ship."""
    issues: list[str] = []

    # The step as it actually was, before `npm run check:parity` replaced it. Verbatim shape: an
    # `--input-type=module --eval` importing the registry and deciding the threshold on the spot.
    was = ("jobs:\n  build:\n    steps:\n      - name: UX-I1 affordance parity\n"
           "        run: |\n"
           "          node --input-type=module --eval '\n"
           "            import { CAPABILITIES, checkAffordanceParity } from \"./src/app/capabilities.ts\";\n"
           "            const violations = checkAffordanceParity();\n"
           "            process.exit(violations.length === 0 ? 0 : 1);\n"
           "          '\n")
    found = _embedded_gate_findings(was)
    if len(found) != 1:
        issues.append(f"the inline parity step must be reported exactly once, got {len(found)}: {found}")
    elif "capabilities.ts" not in found[0] or "UX-I1 affordance parity" not in found[0]:
        issues.append(f"the report must name the module and the step, got {found[0]!r}")

    # The patched shape — the one this repo now ships — must pass.
    now = ("jobs:\n  build:\n    steps:\n      - name: UX-I1 affordance parity\n"
           "        run: npm run check:parity\n")
    if _embedded_gate_findings(now):
        issues.append(f"invoking the script must pass, got {_embedded_gate_findings(now)}")

    # `require` is the other spelling, and a step that reaches a sibling tree is the same defect.
    req = ("jobs:\n  build:\n    steps:\n      - name: Audit\n        run: |\n"
           "          node -e 'const g = require(\"../lib/gate.js\"); process.exit(g.ok() ? 0 : 1)'\n")
    if len(_embedded_gate_findings(req)) != 1:
        issues.append("a `require` of a relative path must be reported too")

    # What the rule deliberately does NOT flag, asserted so a later wave does not "fix" it into a
    # broad ban that goes red at HEAD. A bare specifier names a package or the stdlib, and reading a
    # DATA file is not reimplementing a gate — the handbook's chapter-PDF assertion does exactly that.
    benign = ("jobs:\n  build:\n    steps:\n      - name: Chapters\n        run: |\n"
              "          python3 - <<'EOF'\n"
              "          import pathlib, yaml\n"
              "          book = yaml.safe_load(open(\"handbook/book.yaml\", encoding=\"utf-8\"))\n"
              "          raise SystemExit(0)\n"
              "          EOF\n"
              "      - name: Name\n        run: |\n"
              "          PDF=$(python3 -c \"import json; print(json.load(open('m.json'))['f'])\")\n")
    if _embedded_gate_findings(benign):
        issues.append(f"a data-reading inline program must not be flagged, got "
                      f"{_embedded_gate_findings(benign)}")

    # And a workflow the scanner cannot read must not read as clean. `_steps` finds nothing in flow
    # style, which is why the live check guards on a step floor rather than trusting an empty result.
    flow = "jobs: {build: {steps: [{name: Suite, run: npm test}]}}\n"
    if _steps(flow):
        issues.append("flow style was expected to defeat the block scanner; the guard's premise moved")

    return (FAIL if issues else PASS), issues
