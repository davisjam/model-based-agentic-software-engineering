"""Native full-width inset presence and one-inset-per-page gate.

The shared LaTeX box occupies the text measure and breaks in normal flow, so the
former right-float outside-strip test does not apply. The production margin and
blank-page sensors independently check overflow and abandoned page space.
"""
from collections import Counter
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def check(pdf: Path):
    sys.path.insert(0, str(ROOT / 'tools'))
    import mage_latex
    driver = ROOT / 'book/latex/build/mage-book.tex'
    _, chapters, _ = mage_latex.pdf_sources(driver)
    titles = []
    prefix = r'\begin{bookbox}{inset}'
    for chapter in chapters:
        for match in re.finditer(re.escape(prefix), chapter):
            title = mage_latex.argument(chapter[match.start():], prefix)
            titles.append(mage_latex.pandoc(title, 'latex', 'plain'))
    normalize = lambda s: re.sub(r'[^a-z0-9]+', '', s.lower())
    pages = subprocess.run(['pdftotext', str(pdf), '-'], check=True, capture_output=True,
                           text=True).stdout.split('\f')
    expected = Counter(normalize('INSET ' + title) for title in titles)
    found, by_page = Counter(), {}
    for number, page in enumerate(pages, 1):
        text = normalize(page)
        hits = []
        for title in expected:
            count = text.count(title)
            found[title] += count
            hits.extend([title] * count)
        if hits:
            by_page[number] = hits
    findings = [f'inset {title!r}: expected {count} title(s), found {found[title]}'
                for title, count in expected.items() if found[title] != count]
    findings += [f'page {page} opens {len(titles)} insets: {titles}'
                 for page, titles in by_page.items() if len(titles) > 1]
    return findings
