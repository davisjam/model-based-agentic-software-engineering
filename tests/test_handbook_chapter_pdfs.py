"""A publication build ships the whole handbook editions and must NOT build the local-only chapter PDFs.

The author withdrew the 15 per-chapter PDFs from CI and from the published site on 261106: he wants
them for his own review, built at pre-push. The scope lives as data in `handbook/book.yaml`'s
`build_artifacts`, under the SAME vocabulary the MAGE book uses — `tools/latex_reuse.py` owns the
closed `{published, local-only}` set and both books' consumers read it, so there is one distinction
and not two. These tests hold every surface to the declaration: the Pages workflow, the pre-push
hook, the web emitter that used to link the chapter PDFs, and the reuse key and stamp guard.

The handbook differs from the book in one way these tests pin: the book's section PDFs were
ORPHANS, while the handbook's chapter PDFs carried 30 inbound links from the deployed site. A link
to an unpublished artifact is worse than either choice and no gate in this repo would catch it, so
the links went with the artifact and `test_no_surface_links_a_chapter_pdf` keeps them gone.
"""
import fnmatch
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
import unittest.mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))
sys.path.insert(0, str(ROOT / "handbook" / "scripts"))
import latex_reuse
import latex_pdf
import yaml

WORKFLOW = ROOT / ".github" / "workflows" / "pages.yml"
BOOK_YAML = ROOT / "handbook" / "book.yaml"
MANIFEST = yaml.safe_load(BOOK_YAML.read_text(encoding="utf-8"))
ARTIFACTS = latex_reuse.build_artifacts(MANIFEST)

#: The publication environment, as GitHub Actions actually sets it (both variables, not one).
PUBLICATION_ENV = {"CI": "true", "GITHUB_ACTIONS": "true"}

#: A representative chapter stem, used to expand the local-only glob into a concrete path when
#: checking whether a publish pattern would sweep it. Derived from book.yaml, never hand-written.
SAMPLE_STEM = Path(MANIFEST["chapters"][0]).stem


def declared(scope):
    """The artifacts book.yaml declares at `scope` — the one source these tests check against."""
    return [a for a in MANIFEST["build_artifacts"] if a["scope"] == scope]


def workflow_handbook_publish_lines():
    """Every shell line in the workflow that copies something into the published `_site` tree.

    Read out of the YAML so the assertions grade the workflow AS IT WILL RUN, never a diff.
    """
    lines = [line.strip() for line in WORKFLOW.read_text().splitlines()
             if re.match(r"(cp|rsync|mv)\s", line.strip()) and "_site" in line]
    assert lines, f"no _site copy lines found in {WORKFLOW} — the probe is wrong, not the workflow"
    return lines


def makefile_target_argv(target):
    """The argv of a one-command Makefile target, as the workflow's `make` invocation would run it.

    This is the JOIN that makes "pre-push and CI run the identical command" a checkable claim: the
    workflow runs `make -C handbook book`, the hook runs the script directly, and the Makefile is
    what says those are the same thing.
    """
    lines = (ROOT / "handbook" / "Makefile").read_text().splitlines()
    starts = [i for i, line in enumerate(lines) if line.startswith(f"{target}:")]
    assert len(starts) == 1, f"expected exactly one `{target}:` rule in handbook/Makefile"
    recipe = []
    for line in lines[starts[0] + 1:]:
        if not line.startswith("\t"):
            break                      # a rule's recipe ends at the first non-tab line
        recipe.append(line.strip())
    assert len(recipe) == 1, f"the `{target}` rule is no longer a single command: {recipe}"
    expanded = recipe[0].replace("$(PY)", "python3").replace("$(SCRIPTS)", "handbook/scripts")
    return shlex.split(expanded)


class ArtifactScopeDeclarationTests(unittest.TestCase):
    """The declaration itself must stay well-formed, or every test below grades a typo."""

    def test_scopes_come_from_the_closed_set(self):
        for artifact in MANIFEST["build_artifacts"]:
            with self.subTest(artifact=artifact["id"]):
                self.assertIn(artifact["scope"], latex_reuse.SCOPES)
                self.assertTrue(artifact["glob"].startswith("handbook/"), "a glob is repo-relative")
                self.assertTrue(artifact["note"].strip(), "every artifact says what it is")

    def test_the_vocabulary_is_shared_with_the_book_not_forked(self):
        """Two manifests, ONE distinction. A second vocabulary would defeat declaring scope at all."""
        book = json.loads((ROOT / "book" / "book-manifest.json").read_text(encoding="utf-8"))
        book_scopes = {a["scope"] for a in book["build_artifacts"]}
        handbook_scopes = {a["scope"] for a in MANIFEST["build_artifacts"]}
        self.assertTrue(book_scopes | handbook_scopes <= set(latex_reuse.SCOPES),
                        "both books' scopes must come from tools/latex_reuse.py's closed set")

    def test_an_unknown_scope_is_an_error_not_a_new_mode(self):
        """Fail loudly: an unrecognized scope would otherwise read as 'not local-only' and publish."""
        with self.assertRaises(ValueError):
            latex_reuse.artifact_scope({"x": {"scope": "internal"}}, "x")

    def test_the_chapter_pdfs_are_declared_local_only(self):
        """The author's 261106 decision, as data. Flipping this to `published` is the reversal, and
        it must be taken here — not by editing a workflow or a flag."""
        self.assertEqual(ARTIFACTS["handbook-chapter-pdfs"]["scope"], "local-only")
        self.assertTrue(latex_reuse.is_local_only(ARTIFACTS, "handbook-chapter-pdfs"))

    def test_the_declaration_writes_down_what_stopped_being_verified(self):
        """A local-only scope withdraws gates; the rule says name them where the declaration lives.

        Presence only — this cannot tell whether the prose is still CURRENT. It stops a scope flip
        that writes no consequence at all, which is the failure the rule was written against.
        """
        text = BOOK_YAML.read_text(encoding="utf-8")
        self.assertIn("WHAT A LOCAL-ONLY SCOPE COSTS", text)
        self.assertIn("placement rule", text)


class PublicationScopeTests(unittest.TestCase):
    def test_a_local_only_artifact_is_built_everywhere_but_a_publication_run(self):
        self.assertTrue(latex_reuse.builds_local_only(ARTIFACTS, "handbook-chapter-pdfs", env={}),
                        "a local run builds the author's review PDFs")
        self.assertFalse(
            latex_reuse.builds_local_only(ARTIFACTS, "handbook-chapter-pdfs", env=PUBLICATION_ENV),
            "a publication run must not build a local-only artifact")
        self.assertTrue(
            latex_reuse.builds_local_only(ARTIFACTS, "handbook-chapter-pdfs", env={"CI": "true"}),
            "GITHUB_ACTIONS is the publication signal; a bare CI=true is any local wrapper")
        self.assertTrue(latex_reuse.builds_local_only(ARTIFACTS, "handbook-pdf", env=PUBLICATION_ENV),
                        "a published artifact is built on a publication run")

    def test_the_site_artifact_publishes_no_local_only_glob(self):
        """The copies into `_site` are the publication boundary. Until 261106 one of them was
        `cp handbook/dist/chapters/*.pdf _site/book/se-handbook/chapters/`."""
        published = workflow_handbook_publish_lines()
        for artifact in declared("local-only"):
            concrete = artifact["glob"].replace("*", SAMPLE_STEM)
            for line in published:
                with self.subTest(line=line, local_only=artifact["id"]):
                    sources = [word for word in shlex.split(line) if not word.startswith("-")][1:-1]
                    for source in sources:
                        self.assertFalse(
                            fnmatch.fnmatch(concrete, source) or
                            fnmatch.fnmatch(concrete, source.rstrip("/.") + "/*"),
                            f"`{line}` would publish the local-only {artifact['id']}")

    def test_the_workflow_asserts_no_chapter_pdf_into_the_site(self):
        """The old publish step derived a stem set from book.yaml and hard-failed on a missing
        chapter PDF. That assertion must be gone too, or CI reds on an artifact it no longer builds."""
        text = WORKFLOW.read_text()
        self.assertNotIn("se-handbook/chapters", text)
        self.assertNotIn("handbook/dist/chapters", text)

    def test_pre_push_builds_the_local_only_chapter_pdfs(self):
        """The author's review path keeps them, and runs the same build the workflow runs — the
        scope difference comes from the declaration, never from a flag at one call site."""
        result = subprocess.run(
            [sys.executable, str(ROOT / "hooks" / "pre-push")], cwd=ROOT,
            env=dict(os.environ, GC_PREPUSH_PLAN="1", GC_PREPUSH_ALL="1"),
            input="", text=True, capture_output=True, check=True,
        )
        commands = [shlex.split(line.split(": ", 1)[1]) for line in result.stdout.splitlines()
                    if line.startswith("PLAN step [handbook PDF]: ")]
        builds = [argv for argv in commands
                  if "handbook/scripts/build.py" in argv and "pdf" in argv]
        self.assertEqual(len(builds), 1, f"expected one handbook build in the plan; got {commands}")
        # Compare past argv[0]: the hook runs the live interpreter by absolute path, the Makefile
        # spells `python3`. The arguments are what must match.
        self.assertEqual(builds[0][1:], makefile_target_argv("book")[1:],
                         "pre-push and `make -C handbook book` must run the same build")

    def test_the_scope_gate_skips_the_handbook_render_when_no_handbook_input_moved(self):
        """A push touching neither book nor handbook must pay nothing for either render.

        Driven through the hook's real stdin protocol over a REAL commit pair found in history,
        rather than a hand-picked sha (which would rot) or a synthetic env knob (which would test a
        knob). Skips loudly if recent history has no such pair, so it cannot pass by finding nothing.
        """
        pair = self._out_of_scope_commit_pair()
        if pair is None:
            self.skipTest("no recent commit pair touches neither book nor handbook scope")
        parent, child = pair
        result = subprocess.run(
            [sys.executable, str(ROOT / "hooks" / "pre-push")], cwd=ROOT,
            env=dict(os.environ, GC_PREPUSH_PLAN="1"),
            input=f"refs/heads/main {child} refs/heads/main {parent}\n",
            text=True, capture_output=True, check=True,
        )
        output = result.stdout + result.stderr
        self.assertIn("handbook PDF SKIPPED", output)
        self.assertNotIn("PLAN step [handbook PDF]", output)

    @staticmethod
    def _out_of_scope_commit_pair():
        """A (parent, child) pair whose diff touches no path the book or handbook gate watches."""
        watched = ("handbook/", "book/", "book-models/", "latex/", "tools/", "hooks/",
                   ".github/workflows/pages.yml")
        shas = subprocess.run(["git", "log", "--format=%H", "-60"], cwd=ROOT,
                              text=True, capture_output=True, check=True).stdout.split()
        for parent, child in zip(shas[1:], shas):
            files = subprocess.run(["git", "diff", "--name-only", f"{parent}..{child}"], cwd=ROOT,
                                   text=True, capture_output=True, check=True).stdout.split()
            if files and not any(path.startswith(watched) for path in files):
                return parent, child
        return None


class ChapterLinkWithdrawalTests(unittest.TestCase):
    """A published link to an unpublished file is worse than either choice, and nothing here would
    catch it: the links were raw HTML so MkDocs' strict mode would not chase them, and the site link
    checker skips the whole CI-built `book/se-handbook/` subtree."""

    def test_no_surface_links_a_chapter_pdf(self):
        for relative in ("handbook/scripts/build.py", "handbook/web/css/handbook.css"):
            text = (ROOT / relative).read_text(encoding="utf-8")
            with self.subTest(surface=relative):
                self.assertNotIn('href="chapters/', text)
                self.assertNotIn("hb-chapter-dl {", text)
                self.assertNotIn("hb-toc-pdf {", text)

    def test_the_whole_handbook_pdf_stays_linked(self):
        """The withdrawal is per-chapter only; the published edition keeps its download affordance.
        Asserted so a future tidy-up cannot read this change as 'remove the PDF links'."""
        text = (ROOT / "handbook" / "scripts" / "build.py").read_text(encoding="utf-8")
        self.assertIn('href="software-engineering-handbook.pdf"', text)


class ChapterReuseKeyTests(unittest.TestCase):
    """The change-aware reuse is only sound if its key covers every input and its guard fails open."""

    INPUTS = dict(shared_inputs=latex_pdf._CHAPTER_KEY_INPUTS,
                  asset_inputs=["handbook/figures/x.pdf"], texts=["driver"])

    def key(self, **override):
        return latex_reuse.cache_key("handbook-chapter-pdf-cache-v1", **{**self.INPUTS, **override})

    def test_identical_inputs_give_the_same_key(self):
        self.assertEqual(self.key(), self.key())

    def test_every_input_channel_changes_the_key(self):
        base = self.key()
        self.assertNotEqual(base, self.key(texts=["driver2"]))
        self.assertNotEqual(base, self.key(asset_inputs=["handbook/figures/y.pdf"]))
        self.assertNotEqual(base, self.key(asset_inputs=[]))
        self.assertNotEqual(base, latex_reuse.cache_key("other-version", **self.INPUTS))

    def test_a_generated_figure_is_keyed_by_its_SOURCE_svg(self):
        """`rsvg-convert` is not byte-reproducible, so hashing the GENERATED figure PDF churns the
        key on every prepare and reuse never hits for a chapter that has a figure. Measured 261106:
        11 generated figure PDFs changed across one prepare while all 15 drivers stayed identical,
        and reuse hit 8 of 15 — exactly the chapters with no SVG. The key hashes the source instead.
        """
        mapping = latex_pdf._svg_source_map()
        self.assertTrue(mapping, "no handbook SVG figures found — the probe is wrong, not the build")
        generated_name, source = sorted(mapping.items())[0]
        assets = latex_pdf._key_assets(
            r"\includegraphics[width=1in]{handbook/generated/latex/" + generated_name + "}")
        self.assertEqual(assets, [source], "a generated figure must key by its source SVG")
        self.assertTrue(source.endswith(".svg") and (ROOT / source).is_file())

    def test_a_non_generated_graphic_keys_by_its_own_path(self):
        assets = latex_pdf._key_assets(r"\includegraphics{handbook/assets/cover-artwork.png}")
        self.assertEqual(assets, ["handbook/assets/cover-artwork.png"])

    def test_an_untraceable_generated_figure_fails_loudly(self):
        """A silent fall-back would reintroduce the every-run key churn INVISIBLY: the build would
        still pass, just never reuse. The loud failure is the whole defense."""
        with self.assertRaises(RuntimeError) as caught:
            latex_pdf._key_assets(r"\includegraphics{handbook/generated/latex/nonesuch-xyz.pdf}")
        self.assertIn("traces to no source SVG", str(caught.exception))

    def test_every_live_chapter_driver_traces_all_of_its_figures(self):
        """The real drivers, not a synthetic one — skipped only when none have been emitted yet."""
        generated = ROOT / "handbook" / "generated" / "latex"
        drivers = sorted(p for p in generated.glob("*.tex")
                         if p.stem != "software-engineering-handbook")
        if not drivers:
            self.skipTest("no chapter drivers on disk; run `make -C handbook book` first")
        with_figures = 0
        for driver in drivers:
            assets = latex_pdf._key_assets(driver.read_text(encoding="utf-8"))
            with_figures += bool(assets)
            for asset in assets:
                with self.subTest(driver=driver.stem, asset=asset):
                    self.assertFalse(asset.startswith("handbook/generated/"),
                                     "no key input may be a regenerated artifact")
                    self.assertTrue((ROOT / asset).is_file())
        self.assertTrue(with_figures, "no driver included a figure — the probe is grading nothing")

    def test_the_renderer_identity_is_in_the_key(self):
        """An rsvg upgrade changes how a figure renders; the stamp must not survive it."""
        self.assertIn("rsvg-convert", latex_pdf._rsvg_identity())
        base = latex_reuse.cache_key("v", shared_inputs=(), asset_inputs=[],
                                     texts=["driver", latex_pdf._rsvg_identity()])
        other = latex_reuse.cache_key("v", shared_inputs=(), asset_inputs=[],
                                      texts=["driver", "rsvg-convert version 9.9.9"])
        self.assertNotEqual(base, other)

    def test_shared_latex_inputs_are_all_real_files(self):
        """A typo'd path hashes as `<absent>` forever and silently stops covering a real gate input."""
        for relative in latex_pdf._CHAPTER_KEY_INPUTS:
            with self.subTest(input=relative):
                self.assertTrue((ROOT / relative).is_file(), f"{relative} is not a file")

    def test_a_shared_input_edit_changes_the_key(self):
        """Add a temp file to the declared tuple rather than editing a tracked one: several agents
        and the author share this checkout, and rewriting `latex/house.sty` even briefly would break
        whichever build was running."""
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            probe = Path(directory) / "probe.sty"
            probe.write_text("a", encoding="utf-8")
            relative = str(probe.relative_to(ROOT))
            inputs = dict(self.INPUTS, shared_inputs=self.INPUTS["shared_inputs"] + (relative,))
            before = latex_reuse.cache_key("v", **inputs)
            probe.write_text("b", encoding="utf-8")
            after = latex_reuse.cache_key("v", **inputs)
            self.assertNotEqual(before, after, "a shared-input edit must invalidate the key")
            probe.unlink()
            self.assertNotEqual(after, latex_reuse.cache_key("v", **inputs),
                                "an input that disappears must invalidate the key")

    def test_guard_requires_the_key_the_digest_and_a_present_pdf(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "c.pdf"
            stamp = Path(directory) / "c.cache.json"
            pdf.write_bytes(b"%PDF-1.7 body")
            digest = hashlib.sha256(pdf.read_bytes()).hexdigest()
            stamp.write_text(json.dumps({"key": "K", "output_sha256": digest}), encoding="utf-8")
            self.assertTrue(latex_reuse.is_current(stamp, "K", pdf))
            self.assertFalse(latex_reuse.is_current(stamp, "OTHER", pdf), "a changed key recompiles")
            pdf.write_bytes(b"%PDF-1.7 tampered")
            self.assertFalse(latex_reuse.is_current(stamp, "K", pdf),
                             "a PDF that no longer matches its stamp recompiles")
            pdf.unlink()
            self.assertFalse(latex_reuse.is_current(stamp, "K", pdf), "a missing PDF recompiles")

    def test_guard_fails_open_on_a_missing_or_corrupt_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "c.pdf"
            pdf.write_bytes(b"%PDF-1.7 body")
            self.assertFalse(latex_reuse.is_current(Path(directory) / "absent.json", "K", pdf))
            corrupt = Path(directory) / "corrupt.json"
            corrupt.write_text("{not json", encoding="utf-8")
            self.assertFalse(latex_reuse.is_current(corrupt, "K", pdf))

    def test_force_ignores_a_valid_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "c.pdf"
            stamp = Path(directory) / "c.cache.json"
            pdf.write_bytes(b"%PDF-1.7 body")
            stamp.write_text(json.dumps(
                {"key": "K", "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest()}),
                encoding="utf-8")
            self.assertTrue(latex_reuse.is_current(stamp, "K", pdf))
            self.assertFalse(latex_reuse.is_current(stamp, "K", pdf, force=True))

    def test_a_single_artifact_stamp_keeps_its_original_spelling(self):
        """36 stamps are already on disk between the two books. The single-artifact record must stay
        `output_sha256` or every one of them reads as a cache miss on the next run."""
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "c.pdf"
            pdf.write_bytes(b"%PDF-1.7 body")
            payload = latex_reuse.stamp_payload("K", pdf)
            self.assertEqual(sorted(payload), ["key", "output_sha256"])
            self.assertEqual(payload["output_sha256"],
                             hashlib.sha256(pdf.read_bytes()).hexdigest())

    def test_several_artifacts_are_verified_together(self):
        """The shape a multi-artifact consumer needs — e.g. the TikZ candidate pool, which verifies
        two artifacts and requires four audit side effects before a reuse is equivalent."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            one, two = root / "candidates.pdf", root / "pages.json"
            one.write_bytes(b"%PDF-1.7 pool")
            two.write_text("{}", encoding="utf-8")
            audit = root / "geometry-audit.json"
            audit.write_text("[]", encoding="utf-8")
            stamp = root / "stamp.json"
            stamp.write_text(json.dumps(latex_reuse.stamp_payload("K", [one, two])),
                             encoding="utf-8")
            self.assertEqual(sorted(json.loads(stamp.read_text())), ["digests", "key"])
            self.assertTrue(latex_reuse.is_current(stamp, "K", [one, two], present=[audit]))
            # Each artifact is re-digested, not taken on the stamp's word.
            two.write_text('{"tampered": 1}', encoding="utf-8")
            self.assertFalse(latex_reuse.is_current(stamp, "K", [one, two], present=[audit]))
            two.write_text("{}", encoding="utf-8")
            self.assertTrue(latex_reuse.is_current(stamp, "K", [one, two], present=[audit]))
            # A missing SIDE EFFECT the compile would have produced also loses the reuse.
            audit.unlink()
            self.assertFalse(latex_reuse.is_current(stamp, "K", [one, two], present=[audit]),
                             "a reuse must be equivalent to the compile, side effects included")

    def test_artifacts_sharing_a_basename_fail_rather_than_collide(self):
        """The digest map is keyed by basename, so a collision would silently verify one file twice."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "a").mkdir()
            (root / "b").mkdir()
            one, two = root / "a" / "out.pdf", root / "b" / "out.pdf"
            for path in (one, two):
                path.write_bytes(b"%PDF-1.7")
            with self.assertRaises(ValueError):
                latex_reuse.stamp_payload("K", [one, two])
            self.assertFalse(latex_reuse.is_current(root / "absent.json", "K", [one, two]),
                             "the guard fails open rather than raising at a reuse decision")

    def test_force_requested_reads_the_named_variables_only(self):
        with unittest.mock.patch.dict(os.environ, {}, clear=True):
            self.assertFalse(latex_reuse.force_requested("HANDBOOK_CHAPTER_PDF_FORCE"))
        with unittest.mock.patch.dict(os.environ, {"HANDBOOK_CHAPTER_PDF_FORCE": "1"}, clear=True):
            self.assertTrue(latex_reuse.force_requested("HANDBOOK_CHAPTER_PDF_FORCE"))


class ChapterPoolTests(unittest.TestCase):
    def test_the_default_is_four_workers_and_the_clamp_holds(self):
        """4 on the book's interleaved measurement (overlap 94-98% of linear to 4, 78% at 6, and 6
        not faster in wall-clock); the clamp stops a typo oversubscribing the push gate's host."""
        cases = {"": 4, "1": 1, "4": 4, "6": 6, "99": 6, "0": 1, "-3": 1, "nonsense": 4}
        for value, expected in cases.items():
            env = {"HANDBOOK_CHAPTER_PDF_JOBS": value} if value else {}
            with unittest.mock.patch.dict(os.environ, env, clear=True):
                with self.subTest(value=value or "(unset)"):
                    self.assertEqual(latex_reuse.pool_workers("HANDBOOK_CHAPTER_PDF_JOBS"), expected)

    def test_a_unit_that_reuses_is_never_compiled_and_a_failure_is_attributed(self):
        """Exercise the fan-out without LaTeX: a reused unit must not reach `compile_tex`, and a
        raising check must come back as an attributed error rather than an exception."""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            kept = root / "kept.pdf"
            kept.write_bytes(b"%PDF-1.7 kept")
            stamp = root / "kept.cache.json"
            stamp.write_text(json.dumps(
                {"key": "K", "output_sha256": hashlib.sha256(kept.read_bytes()).hexdigest()}),
                encoding="utf-8")
            reuse = latex_reuse.Unit("kept", root / "kept.tex", kept, stamp, "K",
                                     lambda pdf: self.fail("a reused unit must not be checked"))
            source = root / "fresh.tex"
            source.write_text("x", encoding="utf-8")
            fresh = latex_reuse.Unit("fresh", source, root / "fresh.pdf",
                                     root / "fresh.cache.json", "K2",
                                     lambda pdf: None)
            compiled = []

            def fake_compile(src, texmf_cache=None):
                compiled.append(Path(src).stem)
                pdf = root / (Path(src).stem + ".out.pdf")
                pdf.write_bytes(b"%PDF-1.7 fresh")
                return pdf

            with unittest.mock.patch.object(latex_reuse, "compile_tex", fake_compile):
                results = latex_reuse.compile_units([reuse, fresh], jobs=2,
                                                    cache_name="handbook-test")
            self.assertEqual([r.name for r in results], ["kept", "fresh"], "order is unit order")
            self.assertEqual([r.reused for r in results], [True, False])
            self.assertEqual(compiled, ["fresh"], "only the stale unit compiles")
            self.assertEqual([r.error for r in results], [None, None])
            self.assertTrue((root / "fresh.cache.json").is_file(),
                            "a passing unit is stamped after its check")

            rejecting = latex_reuse.Unit(
                "bad", source, root / "bad.pdf", root / "bad.cache.json", "K3",
                lambda pdf: (_ for _ in ()).throw(RuntimeError("structure gate failed")))
            with unittest.mock.patch.object(latex_reuse, "compile_tex", fake_compile):
                [result] = latex_reuse.compile_units([rejecting], jobs=1, cache_name="handbook-test")
            self.assertIn("bad", result.error)
            self.assertIn("structure gate failed", result.error)
            self.assertFalse((root / "bad.cache.json").is_file(),
                             "a unit that fails its check must NOT be stamped")


if __name__ == "__main__":
    unittest.main()
