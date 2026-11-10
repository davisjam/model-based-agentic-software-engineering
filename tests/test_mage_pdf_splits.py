"""A publication build ships the whole-book editions and must NOT build the local-only section PDFs.

This file held the opposite assertion until 261106, when the author withdrew the 21 per-section PDFs
from CI and from the published site: he wants them for his own review, and nothing linked to them.
The scope now lives as data in book/book-manifest.json's `build_artifacts`, and these tests hold both
surfaces to it — the Pages workflow and the pre-push hook — so neither can drift from the declaration
and neither can disagree with the other.
"""
import fnmatch
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "book"))
sys.path.insert(0, str(ROOT / "tools"))
import build_book
import latex_reuse


WORKFLOW = ROOT / ".github" / "workflows" / "pages.yml"
MANIFEST = json.loads((ROOT / "book" / "book-manifest.json").read_text(encoding="utf-8"))

#: The publication environment, as GitHub Actions actually sets it (both variables, not one).
PUBLICATION_ENV = {"CI": "true", "GITHUB_ACTIONS": "true"}


def declared(scope):
    """The artifacts book-manifest.json declares at `scope` — the one source these tests check against."""
    return [a for a in MANIFEST["build_artifacts"] if a["scope"] == scope]


def workflow_book_builds():
    """Every `python3 book/build_book.py …` invocation in the published workflow, as argv.

    Read out of the YAML so the assertions below grade the workflow AS IT WILL RUN, never a diff.
    """
    commands = [shlex.split(line) for line in WORKFLOW.read_text().splitlines()
                if re.match(r"\s*python3 book/build_book\.py\s", line)]
    assert commands, f"no build_book.py invocation found in {WORKFLOW} — the probe is wrong, not the workflow"
    return commands


def workflow_upload_paths(artifact_name):
    """The `path: |` block of the workflow's named upload-artifact step, as a list of globs.

    Stdlib block-parse (this repo declares no YAML dependency for the test tier). It asserts its own
    preconditions: a probe that silently found nothing would report an empty, passing upload.
    """
    lines = WORKFLOW.read_text().splitlines()
    starts = [i for i, line in enumerate(lines) if line.strip() == f"name: {artifact_name}"]
    assert len(starts) == 2, (f"expected the {artifact_name} artifact to be uploaded once and "
                              f"downloaded once; found {len(starts)} `name:` lines")
    index = starts[0]
    while index < len(lines) and lines[index].strip() != "path: |":
        index += 1
        assert index - starts[0] < 12, f"no `path: |` block within 12 lines of the {artifact_name} upload"
    indent = len(lines[index]) - len(lines[index].lstrip())
    paths = []
    for line in lines[index + 1:]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if len(line) - len(line.lstrip()) <= indent:
            break
        paths.append(stripped)
    assert paths, f"parsed an empty path block for {artifact_name} — the probe is wrong"
    return paths


class ArtifactScopeDeclarationTests(unittest.TestCase):
    """The declaration itself must stay well-formed, or every test below grades a typo."""

    def test_scopes_come_from_the_closed_set(self):
        for artifact in MANIFEST["build_artifacts"]:
            with self.subTest(artifact=artifact["id"]):
                self.assertIn(artifact["scope"], ("published", "local-only"))
                self.assertTrue(artifact["glob"].startswith("book/"), "a glob is repo-relative")

    def test_the_published_pdf_glob_names_the_manifest_filename(self):
        """`pdf_filename` is the single source for the shipped PDF's name; the glob must not fork it."""
        self.assertIn("book/" + MANIFEST["pdf_filename"],
                      [a["glob"] for a in declared("published")])

    def test_the_section_pdfs_are_declared_local_only(self):
        """The author's 261106 decision, as data. Flipping this to `published` is the reversal, and it
        must be taken here — not by editing a workflow or a flag."""
        sections = build_book._BUILD_ARTIFACTS["section-pdfs"]
        self.assertEqual(sections["scope"], "local-only")
        self.assertTrue(build_book._artifact_is_local_only("section-pdfs"))


class PublicationScopeTests(unittest.TestCase):
    def test_a_local_only_artifact_is_skipped_only_on_a_publication_run(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertTrue(build_book._pdf_split_enabled(["--pdf"]),
                            "a local run builds the author's review PDFs")
            self.assertFalse(build_book._pdf_split_enabled(["--pdf", "--no-split"]),
                             "--no-split stays the manual full-edition-only escape")
        with patch.dict(os.environ, PUBLICATION_ENV, clear=True):
            self.assertFalse(build_book._pdf_split_enabled(["--pdf"]),
                             "a publication run must not build a local-only artifact")
        with patch.dict(os.environ, {"CI": "true"}, clear=True):
            self.assertTrue(build_book._pdf_split_enabled(["--pdf"]),
                            "GITHUB_ACTIONS is the publication signal; a bare CI=true is any wrapper, "
                            "and the upload globs are the publication-side defense")

    def test_publication_does_not_build_the_local_only_section_pdfs(self):
        """Grade the workflow's own argv with the production predicate, under the real Actions env."""
        builds = workflow_book_builds()
        self.assertEqual(len(builds), 1, "expected one book build in the workflow")
        self.assertFalse(build_book._pdf_split_enabled(builds[0], PUBLICATION_ENV),
                         f"{' '.join(builds[0])} would build the section PDFs in CI; they are "
                         f"declared local-only in book/book-manifest.json")

    def test_the_site_artifact_carries_exactly_the_published_globs(self):
        """The upload is the publication boundary. A bare `book/*.pdf` here is what published the 21
        section PDFs until 261106, so the narrowing is a second defense behind the build skip."""
        uploaded = workflow_upload_paths("book-editions")
        self.assertEqual(sorted(uploaded), sorted(a["glob"] for a in declared("published")))
        for artifact in declared("local-only"):
            for glob in uploaded:
                with self.subTest(uploaded=glob, local_only=artifact["id"]):
                    self.assertFalse(
                        fnmatch.fnmatch(artifact["glob"].replace("*", "02-Chapter2"), glob),
                        f"the {glob} upload would sweep the local-only {artifact['id']}")

    def test_pre_push_builds_the_local_only_section_pdfs(self):
        """The author's review path keeps them, and runs the IDENTICAL command the workflow runs —
        the scope difference comes from the declaration, never from a flag at one call site."""
        result = subprocess.run(
            [sys.executable, str(ROOT / "hooks" / "pre-push")], cwd=ROOT,
            env=dict(os.environ, GC_PREPUSH_PLAN="1", GC_PREPUSH_ALL="1"),
            input="", text=True, capture_output=True, check=True,
        )
        commands = [shlex.split(line.split(": ", 1)[1]) for line in result.stdout.splitlines()
                    if line.startswith("PLAN step [book PDF]: ")]
        builds = [argv for argv in commands if "book/build_book.py" in argv and "--pdf" in argv]
        self.assertEqual(len(builds), 1, "expected one book build in the pre-push plan")
        # Compare past argv[0]: the hook runs the live interpreter by absolute path, the workflow
        # spells `python3`. The arguments are what must match.
        self.assertEqual(builds[0][1:], workflow_book_builds()[0][1:],
                         "pre-push and publication must run the same command")
        self.assertTrue(build_book._pdf_split_enabled(builds[0], {}),
                        "pre-push must keep refreshing the author's review PDFs")


class ExcerptPreparationTests(unittest.TestCase):
    def test_unlabelled_figures_gain_anchors_before_excerpt_reference_resolution(self):
        import concurrent.futures
        import mage_assets
        import mage_cover
        import mage_latex

        with tempfile.TemporaryDirectory() as temporary, contextlib.ExitStack() as stack:
            root = Path(temporary)
            (root / 'book').mkdir()
            (root / 'book/references.bib').write_text('')
            (root / 'book/book-manifest.json').write_text(json.dumps(
                {'title': 'Book', 'subtitle': 'A subtitle', 'author': 'An author'}))
            slug = '0.6-preface'
            record = {'slug': slug, 'part': 0, 'part_title': 'Orientation'}
            original = (r'\chapter*{Preface}\label{chapter:' + slug + '}\n'
                        r'\autoref{mage-list-figure-0}' + '\n'
                        r'\begin{figure}\includegraphics{book/assets/example.svg}' + '\n'
                        r'\caption[Example]{An example without an authored label.}\end{figure}')

            def prepare_record(item):
                _, current = item
                path = root / current['_build_directory'] / (slug + '.tex')
                path.write_text(original)
                return path.relative_to(root).as_posix()

            def pool_figures(chapters, directory):
                for chapter in chapters:
                    self.assertIn(r'\label{mage-list-figure-0}', (root / chapter).read_text())

            for obj, name, kwargs in [
                (mage_latex, 'ROOT', {'new': root}),
                (mage_latex, 'sync', {}),
                (mage_latex, 'inline', {'side_effect': lambda text: text}),
                (mage_latex, '_prepare_record', {'side_effect': prepare_record}),
                (mage_latex.book_ir, 'book_records', {'side_effect': lambda **kwargs: [dict(record)]}),
                (mage_latex.bb, '_harvest_concept_tags', {'return_value': ({}, {})}),
                (mage_latex.bb, 'build_index_entries', {'return_value': []}),
                (mage_assets, 'pool_figures', {'side_effect': pool_figures}),
                (mage_cover, 'cover_tex', {'return_value': 'Cover'}),
                (concurrent.futures, 'ProcessPoolExecutor',
                 {'new': concurrent.futures.ThreadPoolExecutor}),
            ]:
                stack.enter_context(patch.object(obj, name, **kwargs))
            labels = stack.enter_context(patch.object(
                mage_latex, 'native_float_lists', wraps=mage_latex.native_float_lists))

            full = mage_latex.prepare_pdf()
            self.assertEqual(labels.call_count, 1)
            self.assertIn(r'\chapter*{List of Figures}', full.read_text())
            excerpt = mage_latex.prepare_pdf(slugs=[slug], name='excerpt')
            self.assertEqual(labels.call_count, 2, 'each preparation supplies labels exactly once')
            self.assertNotIn(r'\chapter*{List of Figures}', excerpt.read_text())
            chapter = excerpt.parent / (slug + '.tex')
            self.assertEqual(chapter.read_text().count(r'\label{mage-list-figure-0}'), 1)
            self.assertIn(r'\autoref{mage-list-figure-0}', chapter.read_text(),
                          'an excerpt-local figure reference must remain a live link')


class SectionArtworkTests(unittest.TestCase):
    """Exercise the split orchestration with the real publication pass and reuse key.

    Only the expensive TeX/PDF tools are replaced. The fixture's original artwork
    and native artwork differ, so compiling the unprojected chapter cannot pass.
    """

    def setUp(self):
        import book_ir
        import latex_build
        import mage_latex
        import mage_tikz_links
        import mage_tikz_review
        import pdf_structure

        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.book = self.root / 'book'
        self.base = self.book / 'tikz'
        (self.base / 'receipts').mkdir(parents=True)
        self.pool = self.root / 'native.pdf'
        self.pool.write_bytes(b'native figure pool')
        self.sources = ['book/assets/book-map.svg', 'book/assets/example.svg']
        self.manifest = {source: {'page': index + 1, 'links': []}
                         for index, source in enumerate(self.sources)}
        self.manifest[self.sources[0]]['links'] = [
            {'target': 'book-map', 'rect_bp': [1, 2, 30, 12]},
            {'target': 'example', 'rect_bp': [1, 20, 30, 30]},
        ]
        policy = {'version': 1, 'web': 'color', 'pdf_default': 'paired',
                  'approved_monochrome': {source: {'approved_date': '2026-11-09'}
                                          for source in self.sources}}
        (self.base / 'publication.json').write_text(json.dumps(policy))
        for source in self.sources:
            (self.base / 'receipts' / (Path(source).stem + '.json')).write_text(
                json.dumps({'alt': Path(source).stem}))

        def patched(obj, name, *args, **kwargs):
            replacement = patch.object(obj, name, *args, **kwargs)
            self.addCleanup(replacement.stop)
            return replacement.start()

        patched(build_book, 'HERE', self.book)
        patched(latex_reuse, 'ROOT', self.root)
        patched(latex_reuse, 'engine_identity', return_value='fixture-engine')
        patched(latex_reuse, 'thread_cache_claimer', return_value=lambda: self.root / 'tex-cache')
        patched(mage_tikz_review, 'ROOT', self.root)
        patched(mage_tikz_review, 'BASE', self.base)
        patched(book_ir, 'parse_book', return_value=None)
        self.sections = [('FrontMatter', ['0.1-how-to-read-this-book']),
                         ('Chapter1', ['1.1-example'])]
        patched(build_book, '_pdf_split_sections', return_value=self.sections)
        patched(build_book, '_split_jobs', return_value=1)
        patched(build_book, '_pdf_page_count', return_value=1)
        self.candidates = patched(mage_tikz_review, 'compile_candidates',
                                  return_value=(self.pool, self.manifest))
        patched(mage_latex, 'prepare_pdf', side_effect=self.prepare)
        patched(mage_latex, 'pdf_sources', side_effect=self.read_sources)
        self.compiled = patched(latex_build, 'compile_tex', side_effect=self.compile)
        patched(pdf_structure, 'check_pdf')
        self.verified = patched(mage_tikz_links, 'verify_book')
        self.environment = patch.dict(os.environ, {'MAGE_PDF_SPLIT_FORCE': ''})
        self.environment.start()
        self.addCleanup(self.environment.stop)

    def prepare(self, *, slugs, name):
        directory = self.book / 'build' / name
        directory.mkdir(parents=True, exist_ok=True)
        chapter = directory / (slugs[0] + '.tex')
        guide = name.endswith('FrontMatter')
        source = self.sources[0 if guide else 1]
        label = Path(source).stem
        figure = ('\\begin{figure}[htbp]\n\\centering\n'
                  f'\\includegraphics[width=\\linewidth]{{{source}}}\n'
                  f'\\caption{{The {label}.}}\\label{{{label}}}\n\\end{{figure}}\n')
        if guide:
            text = ('\\chapter*{How to Read This Book}\n'
                    '\\addcontentsline{toc}{chapter}{How to Read This Book}\n\n'
                    'Inventory.\n\nFirst time here?\n\nLooking for a refresher?\n\n'
                    'Chapter 1 begins the argument.\n\n' + figure + '\n'
                    '\\begin{itemize}\n\\item Read Chapter 1.\n\\end{itemize}\n')
        else:
            text = '\\chapter{Example}\n' + figure
        chapter.write_text(text)
        driver = directory / (name + '.tex')
        driver.write_text('\\begin{document}\n\\input{' +
                          chapter.relative_to(self.root).as_posix() + '}\n\\end{document}')
        return driver

    def read_sources(self, driver):
        text = driver.read_text()
        chapters = [(self.root / name).read_text()
                    for name in re.findall(r'\\input\{([^}]+)\}', text)]
        return text, chapters, ''

    def compile(self, driver, **kwargs):
        text, chapters, _ = self.read_sources(driver)
        self.assertIn(r'\magerecordfigureorigin', text)
        self.assertIn('{native.pdf}', chapters[0])
        self.assertNotIn('.svg}', chapters[0])
        if driver.stem.endswith('FrontMatter'):
            self.assertIn(r'\begin{minipage}', chapters[0])
            self.assertIn(r'\begin{bookinlinefigure}', chapters[0])
        pdf = driver.with_suffix('.pdf')
        pdf.write_bytes(b'%PDF fixture ' + self.pool.read_bytes())
        return pdf

    def build(self):
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            return build_book.build_pdf_split()

    def test_split_compiles_approved_artwork_and_layout_then_reuses_identical_inputs(self):
        self.assertEqual(self.build(), 0)
        self.candidates.assert_called_once()
        self.assertEqual(self.compiled.call_count, 2)
        self.assertEqual(self.verified.call_count, 2)
        guide_manifest = self.verified.call_args_list[0].args[2]
        self.assertEqual(set(guide_manifest), {self.sources[0]})
        self.assertEqual([link['target'] for link in guide_manifest[self.sources[0]]['links']],
                         ['book-map'])
        for call in self.verified.call_args_list:
            self.assertEqual(call.kwargs['anchor_prefix'], 'tikz-figure:')
        self.assertEqual(self.build(), 0)
        self.assertEqual(self.compiled.call_count, 2, 'identical projected inputs should reuse')

        self.pool.write_bytes(b'revised native figure pool')
        self.assertEqual(self.build(), 0)
        self.assertEqual(self.compiled.call_count, 4, 'changed native artwork must recompile')

    def test_failed_native_link_verification_does_not_publish_or_stamp(self):
        self.verified.side_effect = ValueError('misdirected TikZ book links')
        self.assertEqual(self.build(), 1)
        self.assertEqual(list(self.book.glob('mage-book-*.pdf')), [])
        self.assertEqual(list(self.book.rglob('*.cache.json')), [])


class SectionReuseKeyTests(unittest.TestCase):
    """The change-aware reuse is only sound if its key covers every input and its guard fails open.

    These exercise the key and the guard directly rather than through a LaTeX run: a compile is
    minutes, and what needs pinning is which changes DO and DO NOT invalidate a stamped PDF.
    """

    def key(self, *, driver="driver text", chapters=None, bibliography="@book{k,title={T}}",
            assets=None):
        return build_book._section_cache_key(driver, chapters or ["chapter one"], bibliography,
                                             assets or [])

    def test_identical_inputs_give_the_same_key(self):
        self.assertEqual(self.key(), self.key())

    def test_every_input_channel_changes_the_key(self):
        baseline = self.key()
        for label, changed in (
            ("driver", self.key(driver="driver text ")),
            ("chapters", self.key(chapters=["chapter one!"])),
            ("chapter count", self.key(chapters=["chapter one", "chapter two"])),
            ("bibliography", self.key(bibliography="@book{k,title={U}}")),
        ):
            with self.subTest(channel=label):
                self.assertNotEqual(baseline, changed, f"a {label} edit must invalidate the stamp")

    def test_shared_latex_inputs_are_all_real_files(self):
        """A typo in the shared-input tuple would silently stop covering that file."""
        for relative in build_book._SECTION_KEY_INPUTS:
            with self.subTest(input=relative):
                self.assertTrue((ROOT / relative).is_file(), f"{relative} is not a file")

    def test_a_shared_input_edit_changes_the_key(self):
        """A declared shared input reaches the key by CONTENT, so editing one recompiles.

        Exercised through a temporary file added to the declared tuple rather than by editing
        `latex/house.sty` in place: several agents and the author share this checkout, and a test that
        briefly rewrites a tracked file every compiler here reads would break whichever build was
        running at the time.
        """
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            probe = Path(directory) / "shared-probe.sty"
            relative = probe.relative_to(ROOT).as_posix()
            probe.write_bytes(b"% one")
            with patch.object(build_book, "_SECTION_KEY_INPUTS",
                              build_book._SECTION_KEY_INPUTS + (relative,)):
                first = self.key()
                self.assertNotEqual(BASELINE_KEY, first,
                                    "an added shared input must participate in the key")
                probe.write_bytes(b"% two")
                self.assertNotEqual(first, self.key(),
                                    "editing a shared input must invalidate the stamp")
                probe.unlink()
                self.assertNotEqual(first, self.key(),
                                    "a vanished shared input must invalidate the stamp")
            self.assertEqual(BASELINE_KEY, self.key(),
                             "the key must return to baseline once the probe is withdrawn")

    def test_an_asset_edit_changes_the_key(self):
        """The figure pool is content-addressed by NAME; the bytes are hashed too."""
        with tempfile.TemporaryDirectory(dir=ROOT) as directory:
            asset = Path(directory) / "probe.pdf"
            relative = asset.relative_to(ROOT).as_posix()
            asset.write_bytes(b"one")
            first = self.key(assets=[relative])
            asset.write_bytes(b"two")
            self.assertNotEqual(first, self.key(assets=[relative]))
            asset.unlink()
            self.assertNotEqual(first, self.key(assets=[relative]),
                                "a vanished asset must invalidate the stamp, not be ignored")

    def test_guard_requires_key_digest_and_a_present_pdf(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            stamp.write_text(json.dumps({
                "key": "abc",
                "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest()}))
            with patch.dict(os.environ, {}, clear=True):
                self.assertTrue(build_book._section_is_current(stamp, "abc", pdf))
                self.assertFalse(build_book._section_is_current(stamp, "different", pdf),
                                 "a changed key must recompile")
                pdf.write_bytes(b"%PDF-1.7 tampered")
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "a PDF that no longer matches the stamp must recompile")
                pdf.unlink()
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "a deleted PDF must recompile")

    def test_guard_fails_open_on_a_missing_or_corrupt_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            with patch.dict(os.environ, {}, clear=True):
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "no stamp must mean compile")
                stamp.write_text("{not json")
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf),
                                 "an unreadable stamp must mean compile")

    def test_force_env_ignores_a_valid_stamp(self):
        with tempfile.TemporaryDirectory() as directory:
            stamp = Path(directory) / "s.cache.json"
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            stamp.write_text(json.dumps({
                "key": "abc",
                "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest()}))
            with patch.dict(os.environ, {"MAGE_PDF_SPLIT_FORCE": "1"}):
                self.assertFalse(build_book._section_is_current(stamp, "abc", pdf))

    def test_the_section_stamp_is_the_shared_record_plus_a_page_annotation(self):
        """The record this build writes is `stamp_payload`'s, with `pages` riding alongside.

        What this pins is the JOIN between a writer and a guard that now live in different files. A
        rename inside the shared module would not fail here as an error — it would read as a stamp
        that never matches, so every section recompiles on every run and nothing says why. The
        three-field shape is also what every section stamp currently on disk carries.
        """
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            record = {**latex_reuse.stamp_payload("abc", pdf), "pages": 28}
            self.assertEqual(list(record), ["key", "output_sha256", "pages"])
            self.assertEqual(record["output_sha256"],
                             hashlib.sha256(pdf.read_bytes()).hexdigest())
            stamp = Path(directory) / "s.cache.json"
            stamp.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
            with patch.dict(os.environ, {}, clear=True):
                self.assertTrue(build_book._section_is_current(stamp, "abc", pdf))

    def test_the_page_count_annotates_the_stamp_and_decides_nothing(self):
        """`pages` is this caller's own note, deliberately outside the shared record.

        So the guard must ignore it — a wrong or absent page count is not a reason to recompile a
        PDF whose bytes and inputs both check out. Pinned because the opposite is the tempting
        tidy-up: folding `pages` into `stamp_payload` would make every other caller's stamps
        narrower than this one's and turn a cosmetic field into a cache-invalidating one.
        """
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            payload = latex_reuse.stamp_payload("abc", pdf)
            stamp = Path(directory) / "s.cache.json"
            for label, record in (("absent", payload),
                                  ("wrong", {**payload, "pages": 999}),
                                  ("right", {**payload, "pages": 28})):
                with self.subTest(pages=label):
                    stamp.write_text(json.dumps(record), encoding="utf-8")
                    with patch.dict(os.environ, {}, clear=True):
                        self.assertTrue(build_book._section_is_current(stamp, "abc", pdf))

    def test_a_stamp_written_before_the_shared_record_landed_is_still_honoured(self):
        """Migrating the writer must not invalidate the stamps already on the author's disk.

        The literal below is the pre-migration format, frozen on purpose: reading it from the
        shared module would make this test agree with whatever the module says today, which is the
        one thing it must not do.
        """
        with tempfile.TemporaryDirectory() as directory:
            pdf = Path(directory) / "s.pdf"
            pdf.write_bytes(b"%PDF-1.7 pretend")
            stamp = Path(directory) / "s.cache.json"
            stamp.write_text(json.dumps({
                "key": "abc",
                "output_sha256": hashlib.sha256(pdf.read_bytes()).hexdigest(),
                "pages": 28}, indent=2) + "\n", encoding="utf-8")
            with patch.dict(os.environ, {}, clear=True):
                self.assertTrue(build_book._section_is_current(stamp, "abc", pdf))

    def test_the_build_does_not_spell_the_stamp_fields_itself(self):
        """The fourth hand-rolled copy of the record is the failure this migration closed.

        Three call sites wrote the record through the shared module while this one still spelled
        `output_sha256` out; the duplicate was invisible because it was correct, which is what a
        duplicate always is on the day it lands. So the check is on the spelling, not the value —
        and it reads the source rather than the behaviour, because a re-hand-rolled record would
        pass every behavioural test here and drift the next time the shared format moves.
        """
        source = (ROOT / "book" / "build_book.py").read_text(encoding="utf-8")
        self.assertNotIn("output_sha256", source,
                         "the stamp's field names belong to latex_reuse.stamp_payload")
        self.assertIn("latex_reuse.stamp_payload(", source)


# Captured at import, before any test mutates a shared input, so the edit test compares against a
# genuinely clean baseline rather than against a key taken after a sibling subTest restored a file.
BASELINE_KEY = build_book._section_cache_key("driver text", ["chapter one"], "@book{k,title={T}}", [])


if __name__ == "__main__":
    unittest.main()
