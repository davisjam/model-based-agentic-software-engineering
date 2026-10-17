"""Carry explicit TikZ book-reference link regions through PDF inclusion.

PDF inclusion drops annotations. The pool records their native rectangles; the
book emits ordinary tagged hyperref links over those same regions. No PDF rewrite
or inferred linkification of arbitrary labels is involved.
"""
from __future__ import annotations
import re

PREFIX = 'magebook:'
LABEL = re.compile(r'[A-Za-z0-9:_.-]+')
REFERENCE = re.compile(r'\b(?:chapter|figure|table|section)\s*[~\s]\s*\d+(?:\.\d+)*\b|\bappendix\s+(?:part\s+)?(?:[A-Z]|[IVX]+)\b', re.I)
ORIGIN_SETUP = r'''
\providecommand{\magefigureorigin}[3]{}
\makeatletter
\newcommand{\magerecordfigureorigin}[1]{\leavevmode\savepos\write\@auxout{\string\magefigureorigin{#1}{\the\lastxpos}{\the\lastypos}}}
\makeatother
'''


def group(text, start):
    """Read one balanced TeX argument, preserving nested formatting commands."""
    if start >= len(text) or text[start] != '{':
        raise ValueError('Expected braced TikZ reference argument')
    depth = 1
    i = start + 1
    while i < len(text):
        if text[i] == '\\':
            i += 2
            continue
        if text[i] == '{': depth += 1
        if text[i] == '}': depth -= 1
        if depth == 0: return text[start+1:i], i+1
        i += 1
    raise ValueError('Unclosed TikZ reference argument')


def check_source(text):
    """Reject explicit numbered references that were left as inert text.

    This deliberately does not infer links from ordinary diagram labels. Bare
    section numbers in navigation diagrams still need editorial review.
    """
    text = re.sub(r'(?<!\\)%[^\n]*', '', text)
    while match := re.search(r'\\magebookref\s*\{', text):
        _, end = group(text, match.end()-1)
        while end < len(text) and text[end].isspace(): end += 1
        body, end = group(text, end)
        if re.search(r'\\magebookref\b', body):
            raise ValueError('Nested TikZ book references create conflicting click regions')
        text = text[:match.start()] + ' ' + text[end:]
    text = re.sub(r'\\(?:textbf|textit|emph|textrm|textsf|texttt)\b', '', text)
    text = text.replace('{', '').replace('}', '').replace('\\ ', ' ').replace('~', ' ')
    if match := REFERENCE.search(text):
        raise ValueError('Unlinked TikZ book reference: ' + match[0])


def aux_destinations(text):
    result = {}
    for match in re.finditer(r'\\newlabel\{([^}]+)\}\{', text):
        fields, _ = group(text, match.end()-1)
        args, pos = [], 0
        while pos < len(fields) and fields[pos] == '{':
            arg, pos = group(fields, pos)
            args.append(arg)
        if len(args) >= 4: result[match[1]] = args[3]
    return result


def page_links(page):
    links = []
    for reference in page.get('/Annots', []):
        annotation = reference.get_object()
        action = annotation.get('/A', {})
        uri = str(action.get('/URI', ''))
        if not uri.startswith(PREFIX):
            continue
        target = uri[len(PREFIX):]
        if not LABEL.fullmatch(target):
            raise ValueError('Unsafe TikZ reference label: ' + target)
        rect = [float(v) for v in annotation['/Rect']]
        left, bottom = float(page.mediabox.left), float(page.mediabox.bottom)
        rect = [rect[0]-left, rect[1]-bottom, rect[2]-left, rect[3]-bottom]
        if not (0 <= rect[0] < rect[2] <= float(page.mediabox.width) and
                0 <= rect[1] < rect[3] <= float(page.mediabox.height)):
            raise ValueError('TikZ reference lies outside its cropped page: ' + target)
        links.append({'target': target, 'rect_bp': rect})
    return links


def overlay(links, available):
    if not links:
        return ''
    rows = []
    for link in links:
        target = link['target']
        if not LABEL.fullmatch(target) or target not in available:
            raise ValueError('Missing TikZ book-reference destination: ' + target)
        x0,y0,x1,y1 = link['rect_bp']
        # Both PDFs use hyperref's one-TeX-point annotation margin. The pool
        # rectangle already includes it; avoid adding the same margin twice.
        margin = 72 / 72.27
        x0, y0, x1, y1 = x0+margin, y0+margin, x1-margin, y1-margin
        if x0 >= x1 or y0 >= y1:
            raise ValueError('TikZ link region is too small: ' + target)
        rows.append(r'\makebox[0pt][l]{\hspace{'+f'{x0:.4f}'+r'bp}\raisebox{'+f'{y0:.4f}'+
                    r'bp}[0pt][0pt]{\hyperref['+target+r']{\phantom{\rule{'+
                    f'{x1-x0:.4f}'+r'bp}{'+f'{y1-y0:.4f}'+r'bp}}}}}%')
    return '\n'.join(rows)+'\n'


def verify_book(pdf, aux, manifest):
    """Check every carried region's size, placement and internal destination."""
    from pathlib import Path
    from pypdf import PdfReader
    reader = PdfReader(pdf)
    destinations = reader.named_destinations
    labels = aux_destinations(Path(aux).read_text())
    origins = {m[1]: (int(m[2])/65536*72/72.27, int(m[3])/65536*72/72.27)
               for m in re.finditer(r'\\magefigureorigin\{([^}]+)\}\{(\d+)\}\{(\d+)\}', Path(aux).read_text())}
    total = 0
    for source, info in manifest.items():
        expected = info.get('links', [])
        if not expected: continue
        anchor = 'tikz-candidate:' + Path(source).stem
        page_number = reader.get_destination_page_number(destinations[anchor])
        actual = []
        for ref in reader.pages[page_number].get('/Annots', []):
            annot = ref.get_object()
            dest = annot.get('/Dest', annot.get('/A', {}).get('/D'))
            if isinstance(dest, str):
                actual.append((str(dest), [float(v) for v in annot['/Rect']]))
        def close(a, b): return abs(a-b) < .025
        # LuaTeX records the graphic's actual baseline origin at shipout. Never
        # infer it from the links being tested: an entire displaced set could pass.
        origin = origins[Path(source).stem]
        bounds = reader.pages[page_number].mediabox
        def matches():
            remaining = list(actual)
            for item in expected:
                target = labels[item['target']]
                if target not in destinations: return False
                wanted = [v+origin[i%2] for i,v in enumerate(item['rect_bp'])]
                if not (float(bounds.left) <= wanted[0] < wanted[2] <= float(bounds.right)
                        and float(bounds.bottom) <= wanted[1] < wanted[3] <= float(bounds.top)):
                    return False
                found = next((i for i,(d,r) in enumerate(remaining)
                              if d == target and all(close(a,b) for a,b in zip(r,wanted))), None)
                if found is None: return False
                remaining.pop(found)
            return True
        if not matches():
            raise ValueError('Missing, misplaced or misdirected TikZ book links: ' + source)
        total += len(expected)
    print(f'TikZ internal references: {total} clickable regions verified in assembled PDF.', flush=True)
    return total
