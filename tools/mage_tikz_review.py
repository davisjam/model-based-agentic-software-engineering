#!/usr/bin/env python3
"""Compile native grayscale candidates and place each after its original in a review book.

Production manuscript/assets stay unchanged. Candidate PDFs are included at native
print size with alternate text; the publisher receives the editable TikZ sources.
"""
from __future__ import annotations
import argparse,json,re,shutil,sys,subprocess,tempfile,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import latex_build,mage_assets,mage_latex
from mage_cover import _text
from pypdf import PdfReader
BASE=ROOT/'book/tikz'
BUILD=ROOT/'latex/build/tikz'

def inventory():
    records=json.loads((BASE/'inventory.json').read_text())
    for i in range(1,8):records.append({'source':f'assets/nav-subway-p{i}.svg','chapter':f'Chapter {i}','caption':'Book chapter navigation'})
    return records

def candidates():
    return [r for r in inventory() if not r['source'].endswith('.jpg')]

def compile_candidates(partial=False):
    BUILD.mkdir(parents=True,exist_ok=True)
    records=candidates()
    if partial:records=[r for r in records if (BASE/'figures'/f"{Path(r['source']).stem}.tex").exists()]
    paths=[BASE/'figures'/f"{Path(r['source']).stem}.tex" for r in records]
    for r,p in zip(records,paths):
        if not p.exists():raise ValueError('Missing candidate: '+str(p))
        receipt=BASE/'receipts'/f'{p.stem}.json'
        info=json.loads(receipt.read_text())
        if not info.get('alt'):raise ValueError('Missing alternate text: '+str(receipt))
    driver=BUILD/'candidates.tex'
    driver.write_text(r'''\documentclass{article}
\usepackage[paperwidth=22cm,paperheight=22cm,margin=1cm]{geometry}
\newcommand{\DoNotLoadEpstopdf}{}
\input{book/tikz/mage-figures.sty}
\usepackage[active,tightpage]{preview}
\PreviewEnvironment{tikzpicture}
\setlength\PreviewBorder{3pt}
\begin{document}
'''+ '\n'.join(r'\input{'+p.relative_to(ROOT).as_posix()+'}' for p in paths)+r'\end{document}')
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
        if w>450 or h>420:raise ValueError(f"Candidate exceeds print envelope: {record['source']} ({w:.1f}x{h:.1f}pt)")
        manifest['book/'+record['source']]={'page':i,'width_pt':w,'height_pt':h}
    (BUILD/'pages.json').write_text(json.dumps(manifest,indent=2)+'\n')
    from tikz_audit import audit_pdf
    audit_pdf(pdf,manifest,BUILD/'geometry-audit.json',BUILD/'geometry-audit.pdf')
    print(f'Native TikZ pool: {len(pages)} candidates, all fit at their authored text sizes.',flush=True)
    return pdf,manifest

def source_bundle():
    """Self-contained editable vector source package, independent of book assembly."""
    target=ROOT/'latex/build/mage-tikz-source.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(BASE.rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(ROOT))
        for path in sorted((ROOT/'book/fonts/SourceSerif4').rglob('*')):
            if path.is_file():archive.write(path,path.relative_to(ROOT))
        archive.writestr('main.tex',(BUILD/'candidates.tex').read_text())
        archive.writestr('README.txt',
            'Editable MAGE grayscale figure trials. Run lualatex -no-shell-escape main.tex twice from this directory.\n'
            'Requires TeX Live2025 or newer with pgfplots, preview, fontspec. Fonts are bundled under their license.\n'
            'One cropped page per candidate, ordered by book/tikz/inventory.json, then seven navigation maps.\n'
            'Receipts record source context, redesign and editorial questions. Original photograph excluded.\n')
    print('Editable TikZ source archive:',target,flush=True)
    return target

def review_book(pool,manifest):
    driver=mage_latex.prepare_pdf(name='mage-figure-review')
    driver_text=driver.read_text()
    chapters=[ROOT/p for p in re.findall(r'\\input\{([^}]+)\}',driver_text)]
    pairings=[]
    def candidate(source,label):
        if source not in manifest:raise ValueError('No compiled TikZ candidate for '+source)
        p=manifest[source];info=json.loads((BASE/'receipts'/f'{Path(source).stem}.json').read_text())
        alt=_text(str(info['alt']))
        pairings.append({'source':source,'original_label':label,'candidate_page':p['page']})
        return (r'\includegraphics[page='+str(p['page'])+',alt={'+alt+'}]{'+pool.relative_to(ROOT).as_posix()+'}')
    for chapter in chapters:
        text=chapter.read_text();side=chapter.with_suffix('.assets.json')
        mapping={a['pdf']:a['source'] for a in json.loads(side.read_text())} if side.exists() else {}
        def paired(match):
            original=match[0];graphics=list(mage_assets.graphics(original))
            if len(graphics)!=1:raise ValueError('Expected exactly one graphic per original figure')
            source=mapping.get(graphics[0][3],graphics[0][3])
            pooled=(ROOT/source).with_suffix('.pages.json')
            if pooled.exists():
                page=re.search(r'(?:^|,)page=(\d+)',graphics[0][2])
                if not page:raise ValueError('Missing original pool page')
                source=json.loads(pooled.read_text())[page[1]]
            if source.endswith('.jpg'):return original # Photography is not redrawn as invented geometry.
            label=re.search(r'\\label\{([^}]+)\}',original)
            if not label:raise ValueError('Original figure has no stable review label')
            image=candidate(source,label[1])
            return original+'\n\\clearpage\n\\begin{figure}[p]\n\\centering\n'+image+'\n'+r'\caption*{Grayscale TikZ candidate for Figure~\ref*{'+label[1]+'}. Original immediately precedes this candidate.}\n\\end{figure}\n\\clearpage\n'
        text=re.sub(r'\\begin\{figure\}(?:\[[^]]*\])?.*?\\end\{figure\}',paired,text,flags=re.S)
        # Orientation maps are inline graphics, outside numbered figure environments.
        for start,end,options,path in reversed(list(mage_assets.graphics(text))):
            source=path
            pooled=(ROOT/path).with_suffix('.pages.json')
            if pooled.exists():
                page=re.search(r'(?:^|,)page=(\d+)',options)
                if page:source=json.loads(pooled.read_text())[page[1]]
            m=re.fullmatch(r'book/(?:latex/)?assets/nav-subway-p(\d+)\.(?:pdf|svg)',source)
            if m:
                source=f'book/assets/nav-subway-p{m[1]}.svg'
                text=text[:end]+'\n\\par\\medskip\n'+candidate(source,'navigation-'+m[1])+r'\par{\small Grayscale TikZ navigation candidate.}\par'+'\n'+text[end:]
        chapter.write_text(text)
    expected=set(manifest)
    actual=[p['source'] for p in pairings]
    if len(actual)!=len(set(actual)) or set(actual)!=expected:
        raise ValueError(f'Review pairing mismatch missing={expected-set(actual)}, extra={set(actual)-expected}')
    # Pool the originals only after the source-to-candidate mapping is established.
    mage_assets.pool_figures([str(p.relative_to(ROOT)) for p in chapters],driver.parent)
    pdf=latex_build.compile_tex(driver)
    from pdf_structure import check_pdf
    check_pdf(pdf,headings=40,sections=124,tables=43,figures=145+len(pairings))
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
