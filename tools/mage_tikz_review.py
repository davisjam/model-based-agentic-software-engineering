#!/usr/bin/env python3
"""Compile native grayscale artwork for the full book and paired figure review.

Assembly leaves production manuscript/assets unchanged. Authored revisions to
color originals are reflected in both editions. Candidate PDFs are included at
native print size with alternate text; the publisher receives editable sources.
"""
from __future__ import annotations
import argparse,hashlib,json,os,re,shutil,sys,subprocess,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import latex_build,mage_assets,mage_latex,mage_tikz_links
from mage_cover import _text
from pypdf import PdfReader
BASE=ROOT/'book/tikz'
BUILD=ROOT/'latex/build/tikz'

# ───────────────────────── Shared figure pool: one compile, two consumers ─────────────────────────
# `compile_candidates()` has TWO consumers per book push and they do identical work:
#
#   1. the grayscale-candidate gate, run as `mage_tikz_review.py --figures-only`;
#   2. the book PDF build, which pools the finished figure pages into the edition and needs this
#      function's return values to do it.
#
# Both land in `latex/build/tikz/`. Pre-push orders them (1) then (2) through a phase dependency;
# the publishing workflow runs (2) then (1) inside one job. So the second consumer reuses the
# first's artifact when every input digests the same — and reuse is keyed on CONTENT, never on which
# consumer ran first, because the two surfaces disagree about the order and neither is wrong.
#
# Contents, never mtimes: the drivers are rewritten on every call, so an mtime always looks new.
#
# The stamp is written only AFTER the compile converges and all four gates pass (page count,
# monochrome raster, print envelope, geometry/typography audits), so it asserts "this exact PDF
# passed these exact checks on these exact inputs". Reuse re-asserts the second half by re-digesting
# the published artifacts rather than trusting the stamp. Every failure direction falls through to
# compiling: a changed key, a missing or unparseable stamp, an artifact that no longer matches it, a
# missing audit output. `MAGE_TIKZ_POOL_FORCE=1` ignores the stamp entirely.
STAMP=BUILD/'candidates-pool-stamp.json'

#: Shared inputs the pool's PDF and its audits derive from, beyond the per-figure sources: the TikZ
#: preamble the driver inputs, the house style the font reference typesets under, and the gate code
#: whose verdicts the stamp stands for.
_POOL_SHARED_INPUTS=('book/tikz/mage-figures.sty','latex/house.sty','latex/book-fonts.tex',
                     'tools/mage_tikz_review.py','tools/latex_build.py','tools/tikz_audit.py',
                     'tools/mage_tikz_typography.py','tools/mage_tikz_links.py')

#: Audit outputs a reusing consumer must find on disk — the compile path's side effects, which a
#: later reader (the publication pooling, the figure-review book) expects to be present.
_POOL_ARTIFACTS=('candidates.pdf','pages.json','geometry-audit.json','typography-audit.json')

#: Set by `compile_candidates()` so a caller — and the timing harness — can tell reuse from compile.
_pool_reused=None

#: The font-metrics proof the typography audit measures the book's real body faces from. Hoisted to
#: module scope so the reuse key can digest it: a change here changes the audit's reference and must
#: invalidate the pool, which a string buried in the function body could not express.
_FONT_DRIVER_TEX=r'''\documentclass[12pt]{book}
\usepackage[mage]{house}
\begin{document}
\pagestyle{empty}
Body text. \textbf{Bold text.} \textit{Italic text.} \textbf{\textit{Bold italic text.}}
\end{document}
'''

def _sha(data:bytes)->str:
    return hashlib.sha256(data).hexdigest()

def _engine_banner()->str:
    """The compiler's own version line. A toolchain change must invalidate the pool: the frozen CI
    image and this host run different LuaLaTeX builds, and their output is not interchangeable."""
    engine=shutil.which('lualatex')
    if not engine:return 'absent'
    try:
        return subprocess.run([engine,'--version'],capture_output=True,text=True,
                              timeout=60).stdout.splitlines()[0].strip()
    except (OSError,subprocess.SubprocessError,IndexError):
        return 'unknown'

def _pool_key_for(partial,paths,driver_text,font_driver_text):
    """The pool key, or None when this run must neither reuse nor stamp.

    A `--partial` run compiles a SUBSET, so its artifact must never be stamped (a later full consumer
    would reuse an incomplete pool) and must never reuse one (a full pool does not answer the subset's
    question). Returning None closes BOTH directions at once — the same hazard class as a limited-mode
    flag that is safe in its real caller and destructive in a test caller, so it is a guard in code
    rather than a warning comment."""
    if partial:return None
    return _pool_cache_key(paths,driver_text,font_driver_text)

def _pool_cache_key(paths,driver_text,font_driver_text)->str:
    """Digest every input the pool's PDF, manifest and audits derive from."""
    parts=[b'pool-v1',driver_text.encode(),font_driver_text.encode(),
           _engine_banner().encode(),
           f'{mage_latex.FIGURE_WIDTH_BP}x{mage_latex.FIGURE_HEIGHT_BP}'.encode()]
    for path in paths:
        parts.append(path.read_bytes())
        parts.append((BASE/'receipts'/f'{path.stem}.json').read_bytes())
    for name in ('inventory.json','layout-review.json','typography-review.json'):
        parts.append((BASE/name).read_bytes())
    for relative in _POOL_SHARED_INPUTS:
        candidate=ROOT/relative
        parts.append(candidate.read_bytes() if candidate.is_file() else b'<absent>')
    return _sha(b'\x00'.join(parts))

def _pool_reuse(key:str):
    """Return `(pdf, manifest)` when a stamped, still-verifying pool matches `key`; else None."""
    if os.environ.get('MAGE_TIKZ_POOL_FORCE'):return None
    try:
        stamp=json.loads(STAMP.read_text())
    except (OSError,ValueError):
        return None
    if stamp.get('key')!=key:return None
    for name in _POOL_ARTIFACTS:
        if not (BUILD/name).is_file():return None
    # Re-verify the artifacts themselves rather than trusting the stamp's word for them.
    for name in ('candidates.pdf','pages.json'):
        if stamp.get('digests',{}).get(name)!=_sha((BUILD/name).read_bytes()):return None
    try:
        manifest=json.loads((BUILD/'pages.json').read_text())
    except ValueError:
        return None
    return BUILD/'candidates.pdf',manifest

def _pool_stamp_write(key:str)->None:
    """Record the key and the artifact digests, AFTER every gate has passed."""
    STAMP.write_text(json.dumps({'key':key,'digests':{name:_sha((BUILD/name).read_bytes())
                                                      for name in ('candidates.pdf','pages.json')}},
                                indent=2)+'\n')

def inventory():
    records=json.loads((BASE/'inventory.json').read_text())
    for i in range(1,8):records.append({'source':f'assets/nav-subway-p{i}.svg','chapter':f'Chapter {i}','caption':'Book chapter navigation'})
    return records

def candidates():
    return [r for r in inventory() if not r['source'].endswith('.jpg')]

def compile_candidates(partial=False):
    global _pool_reused
    _pool_reused=None
    BUILD.mkdir(parents=True,exist_ok=True)
    records=candidates()
    if partial:records=[r for r in records if (BASE/'figures'/f"{Path(r['source']).stem}.tex").exists()]
    paths=[BASE/'figures'/f"{Path(r['source']).stem}.tex" for r in records]
    for r,p in zip(records,paths):
        if not p.exists():raise ValueError('Missing candidate: '+str(p))
        mage_tikz_links.check_source(p.read_text())
        receipt=BASE/'receipts'/f'{p.stem}.json'
        info=json.loads(receipt.read_text())
        if not info.get('alt'):raise ValueError('Missing alternate text: '+str(receipt))
    driver=BUILD/'candidates.tex'
    driver.write_text(r'''\documentclass{article}
\usepackage[paperwidth=22cm,paperheight=22cm,margin=1cm]{geometry}
\newcommand{\DoNotLoadEpstopdf}{}
\def\magecollectlinks{}
\input{book/tikz/mage-figures.sty}
\usepackage[active,tightpage]{preview}
\PreviewEnvironment{tikzpicture}
\setlength\PreviewBorder{3pt}
\begin{document}
'''+ '\n'.join(r'\input{'+p.relative_to(ROOT).as_posix()+'}' for p in paths)+r'\end{document}')
    key=_pool_key_for(partial,paths,driver.read_text(),_FONT_DRIVER_TEX)   # None on a --partial run
    if key is not None:
        shared=_pool_reuse(key)
        if shared:
            _pool_reused=True
            print(f'Native TikZ pool: reusing {len(shared[1])} verified candidates '
                  f'(inputs unchanged; artifacts re-verified).',flush=True)
            return shared
    pdf=latex_build.compile_tex(driver)
    pages=PdfReader(pdf).pages
    if len(pages)!=len(paths):raise ValueError('Candidate page count differs from source count')
    # Raster verification catches visible colour even when PGF temporarily selects
    # unused colour-cycle operators in otherwise monochrome PDF content streams.
    import numpy as np
    from PIL import Image
    with tempfile.TemporaryDirectory(prefix='mage-monochrome-') as scratch:
        prefix=Path(scratch)/'page'
        subprocess.run(['pdftoppm','-scale-to','900','-png',str(pdf),str(prefix)],check=True,capture_output=True)
        for image in Path(scratch).glob('page-*.png'):
            rgb=np.asarray(Image.open(image).convert('RGB')).astype(int)
            if np.any(rgb.max(axis=2)-rgb.min(axis=2)>2):
                raise ValueError('Visible colour in monochrome candidate: '+image.name)
    manifest={}
    for i,(record,page) in enumerate(zip(records,pages),1):
        w,h=float(page.mediabox.width),float(page.mediabox.height)
        if w>mage_latex.FIGURE_WIDTH_BP or h>mage_latex.FIGURE_HEIGHT_BP:
            raise ValueError(f"Candidate exceeds print envelope: {record['source']} ({w:.1f}x{h:.1f}bp)")
        manifest['book/'+record['source']]={'page':i,'width_pt':w,'height_pt':h,'links':mage_tikz_links.page_links(page)}
    (BUILD/'pages.json').write_text(json.dumps(manifest,indent=2)+'\n')
    from tikz_audit import audit_pdf
    layout=json.loads((BASE/'layout-review.json').read_text())['figures']
    if partial:layout=[r for r in layout if r['source'] in manifest]
    if len(layout)!=len(manifest) or {r['source'] for r in layout}!=set(manifest):
        raise ValueError('Layout review must cover every candidate exactly once')
    geometry=audit_pdf(pdf,manifest,BUILD/'geometry-audit.json',BUILD/'geometry-audit.pdf',
                       layout_contracts={r['source']:r.get('contracts',{}) for r in layout})
    layout_failures=[f for f in geometry['findings'] if f['code'] in
                     {'terminal-clearance','peer-alignment','layout-contract'}]
    if layout_failures:
        raise ValueError('Figure spacing differs from review: '+json.dumps(layout_failures[:8]))
    from mage_tikz_typography import audit_pdf as audit_typography, reference_fonts
    # Use the real book style as the reference, so this gate follows future
    # edition font changes and catches local TikZ overrides/fallbacks too.
    font_driver=BUILD/'body-font-reference.tex'
    font_driver.write_text(_FONT_DRIVER_TEX)
    body_fonts=reference_fonts(latex_build.compile_tex(font_driver))
    typography=json.loads((BASE/'typography-review.json').read_text())
    if partial:
        typography['figures']=[r for r in typography['figures'] if r['source'] in manifest]
    audit_typography(pdf,manifest,typography,BUILD/'typography-audit.json',body_fonts)
    print(f'Native TikZ pool: {len(pages)} candidates, all fit at their authored text sizes.',flush=True)
    _pool_reused=False
    if key is not None:_pool_stamp_write(key)   # only now: every gate above has passed
    return pdf,manifest

def source_bundle():
    """Self-contained editable vector source package, independent of book assembly."""
    target=ROOT/'latex/build/mage-tikz-source.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(BASE.rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(ROOT))
        archive.write(ROOT/'latex/book-fonts.tex', 'latex/book-fonts.tex')
        for path in sorted((ROOT/'book/fonts').rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(ROOT))
        archive.writestr('main.tex',(BUILD/'candidates.tex').read_text().replace(r'\def\magecollectlinks{}', ''))
        archive.writestr('README.txt',
            'Editable MAGE grayscale figure trials. Run lualatex -no-shell-escape main.tex twice from this directory.\n'
            'Requires TeX Live2025 or newer with pgfplots, preview, fontspec. Fonts are bundled under their license.\n'
            'One cropped page per candidate, ordered by book/tikz/inventory.json, then seven navigation maps.\n'
            'Receipts record source context, redesign and editorial questions. Original photograph excluded.\n')
    print('Editable TikZ source archive:',target,flush=True)
    return target

def _original_source(mapping, path, options):
    source = mapping.get(path, path)
    pooled = (ROOT / source).with_suffix('.pages.json')
    if pooled.exists():
        page = re.search(r'(?:^|,)page=(\d+)', options)
        if not page:
            raise ValueError('Missing original pool page: ' + path)
        source = json.loads(pooled.read_text())[page[1]]
    return source


def _verify_monochrome_original(path, options):
    """A declared monochrome original must actually render without color."""
    import fitz
    import numpy as np
    page = re.search(r'(?:^|,)page=(\d+)', options)
    with fitz.open(ROOT / path) as doc:
        pix = doc[int(page[1])-1 if page else 0].get_pixmap(colorspace=fitz.csRGB, alpha=False)
        rgb = np.frombuffer(pix.samples, dtype=np.uint8).reshape(-1, 3).astype(int)
        if np.any(rgb.max(axis=1) - rgb.min(axis=1) > 2):
            raise ValueError('Visible color in declared monochrome original: ' + path)


def publication_figures(driver, pool, manifest, anchor_prefix='tikz-figure:'):
    """Use reviewed monochrome figures; pair the rest for author review.

    Preserve original floats, captions, numbering and links. Legacy candidates
    remain in the source archive but are not inserted into the current manuscript.
    Already-monochrome originals are explicitly registered and raster-checked.
    Validate all coverage before rewriting any generated chapter.
    """
    driver_text = driver.read_text()
    chapters = [ROOT / p for p in re.findall(r'\\input\{([^}]+)\}', driver_text)]
    available = set(re.findall(r'\\label\{([^}]+)\}', driver_text + '\n' +
                              '\n'.join(p.read_text() for p in chapters)))
    originals_path = BASE / 'monochrome-originals.json'
    monochrome = json.loads(originals_path.read_text()) if originals_path.exists() else {}
    policy = json.loads((BASE / 'publication.json').read_text())
    if (policy.get('version') != 1 or policy.get('web') != 'color' or
            policy.get('pdf_default') != 'paired'):
        raise ValueError('Unsupported figure publication policy')
    approved = policy['approved_monochrome']
    if not isinstance(approved, dict):
        raise ValueError('Monochrome approvals must be keyed by figure source')
    for source, decision in approved.items():
        if source not in manifest or source in monochrome:
            raise ValueError('Approval has no replaceable monochrome candidate: ' + source)
        if not isinstance(decision, dict) or not decision.get('approved_date'):
            raise ValueError('Missing figure approval date: ' + source)
    used, pairings, replacements, retained, approved_figures = [], [], {}, [], []

    def image(source, label):
        if source not in manifest:
            raise ValueError('Missing publication grayscale figure: ' + source)
        info = manifest[source]
        receipt = json.loads((BASE / 'receipts' / f'{Path(source).stem}.json').read_text())
        alt, stem = _text(str(receipt['alt'])), Path(source).stem
        used.append(source)
        record = {'source': source, 'original_label': label, 'candidate_page': info['page']}
        (approved_figures if source in approved else pairings).append(record)
        return (r'\leavevmode\hypertarget{' + anchor_prefix + stem + '}{}%\n' +
                r'\magerecordfigureorigin{' + stem + '}%\n' +
                mage_tikz_links.overlay(info.get('links', []), available) +
                r'\includegraphics[page=' + str(info['page']) + ',alt={' + alt + '}]{' +
                pool.relative_to(ROOT).as_posix() + '}')

    for chapter in chapters:
        text = chapter.read_text()
        sidecar = chapter.with_suffix('.assets.json')
        mapping = {a['pdf']: a['source'] for a in json.loads(sidecar.read_text())} if sidecar.exists() else {}
        # Process original graphic positions only; a candidate must never pair with itself.
        floats = list(re.finditer(r'\\begin\{figure\}(?:\[[^]]*\])?.*?\\end\{figure\}', text, re.S))
        edits = []
        has_navigation_pair = False
        for block in floats:
            original = block[0]
            graphics = list(mage_assets.graphics(original))
            if len(graphics) != 1:
                raise ValueError('Expected one graphic per original figure')
            graphic_start, graphic_end, options, path = graphics[0]
            source = _original_source(mapping, path, options)
            if source.endswith('.jpg'):
                continue
            if source in monochrome:
                _verify_monochrome_original(path, options)
                retained.append(source)
                continue
            label = re.search(r'\\label\{([^}]+)\}', original)
            if not label:
                raise ValueError('Original figure has no stable label: ' + source)
            if source in approved:
                # Replace only the artwork. Keep its numbered caption, label,
                # placement and all figure references in the manuscript.
                edits.append((block.start() + graphic_start, block.start() + graphic_end,
                              image(source, label[1])))
                continue
            # Consecutive floats retain figure order while allowing surrounding
            # prose to fill the page. Forcing a clearpage here strands the prose
            # preceding every pair, even when both drawings can float together.
            extra = ('\n\\begin{figure}[tbp]\n\\centering\n' + image(source, label[1]) +
                     '\n' + r'\caption*{Black-and-white version of Figure~\ref*{' + label[1] +
                     '}.}\n\\end{figure}\n')
            edits.append((block.end(), block.end(), extra))
        for start, end, options, path in mage_assets.graphics(text):
            if any(block.start() <= start < block.end() for block in floats):
                continue
            source = _original_source(mapping, path, options)
            if source.endswith('.jpg'):
                continue
            if not re.fullmatch(r'book/(?:latex/)?assets/nav-subway-p\d+\.(?:pdf|svg)', source):
                raise ValueError('Unpaired inline graphic: ' + source)
            number = re.search(r'nav-subway-p(\d+)', source)[1]
            source = f'book/assets/nav-subway-p{number}.svg'
            if source in approved:
                edits.append((start, end, image(source, 'navigation-' + number)))
                continue
            has_navigation_pair = True
            edits.append((end, end, '\n\\par\\medskip\n' + image(source, 'navigation-' + number) +
                          r'\par{\small Black-and-white navigation map.}\par' + '\n'))
        for start, end, replacement in sorted(edits, reverse=True):
            text = text[:start] + replacement + text[end:]
        if has_navigation_pair and r'\clearpage' in text:
            # Two navigation maps must share the orientation page with its
            # question, principle and vocabulary. Tighten paragraph spacing
            # locally, preserving the authored size of both maps and all type.
            opening, separator, rest = text.partition(r'\clearpage')
            heading_end = opening.index('\n') + 1
            opening = (opening[:heading_end] + '\\begingroup\\setlength{\\parskip}{3pt}\n' +
                       opening[heading_end:] + '\\par\\endgroup\n')
            text = opening + separator + rest
        replacements[chapter] = text
    all_sources = used + retained
    if len(all_sources) != len(set(all_sources)):
        raise ValueError(f'Publication figure mismatch: duplicates={len(all_sources)-len(set(all_sources))}')
    unused_approvals = set(approved) - set(used)
    if unused_approvals:
        raise ValueError('Approved figures absent from manuscript: ' + ', '.join(sorted(unused_approvals)))
    active = {source: manifest[source] for source in used}
    for chapter, text in replacements.items():
        chapter.write_text(text)
    driver.write_text(driver_text.replace(r'\begin{document}', mage_tikz_links.ORIGIN_SETUP + r'\begin{document}', 1))
    (driver.parent / 'grayscale-figures.json').write_text(json.dumps(active, indent=2) + '\n')
    (driver.parent / 'figure-pairings.json').write_text(json.dumps({
        'pairs': pairings, 'approved_monochrome': approved_figures, 'monochrome_originals': retained,
        'unused_archived_candidates': sorted(set(manifest)-set(used))}, indent=2) + '\n')
    print(f'PDF artwork: {len(pairings)} color/black-and-white pairs; '
          f'{len(approved_figures)} approved black-and-white figures; '
          f'{len(retained)} already-monochrome originals retained.', flush=True)
    return active

def review_book(pool,manifest):
    driver=mage_latex.prepare_pdf(name='mage-figure-review')
    active = publication_figures(driver, pool, manifest, anchor_prefix='tikz-candidate:')
    pairings = json.loads((driver.parent / 'figure-pairings.json').read_text())['pairs']
    driver_text, chapters, _ = mage_latex.pdf_sources(driver)
    pdf=latex_build.compile_tex(driver)
    from pdf_structure import check_pdf
    source = driver_text + '\n' + '\n'.join(chapters)
    check_pdf(pdf, headings=mage_latex.bb._expected_chapter_headings(source),
              sections=len(re.findall(r'\\section\*?\{', source)),
              tables=source.count(r'\begin{longtable}') + source.count(r'\begin{table}'),
              figures=source.count(r'\begin{figure}'))
    mage_tikz_links.verify_book(pdf,driver.with_suffix('.aux'),active)
    output=ROOT/'latex/build/mage-figure-review.pdf';shutil.copy2(pdf,output)
    (BUILD/'pairings.json').write_text(json.dumps(pairings,indent=2)+'\n')
    notes=['MAGE figure review — editorial questions', '']
    for record in candidates():
        stem=Path(record['source']).stem
        receipt=json.loads((BASE/'receipts'/f'{stem}.json').read_text())
        questions=receipt.get('questions',[])
        if questions:
            notes.extend([record['source'],str(questions),''])
    (BUILD/'review-notes.txt').write_text('\n'.join(notes)+'\n')
    source_bundle()
    print('Paired review book:',output,flush=True)
    return output

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--partial',action='store_true',help='Compile available candidates only, for development')
    parser.add_argument('--figures-only',action='store_true')
    a=parser.parse_args()
    if a.partial and not a.figures_only:parser.error('--partial requires --figures-only')
    pool,manifest=compile_candidates(a.partial)
    if not a.figures_only:review_book(pool,manifest)
