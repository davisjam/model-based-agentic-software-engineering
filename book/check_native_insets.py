"""Native inset presence and one-authored-opening-per-page gate.

Print continuations share the original title and are not new inset openings.
This includes the repeated artifact heading on full-width inset figure pages.
The margin and blank-page sensors independently check overflow and whitespace.
"""
from collections import Counter
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
CONTINUED = re.compile(r'\s+\(continued\)\s*$')


def title_findings(titles, pages):
    """Check original openings separately from repeated continuation headings."""
    normalize = lambda s: re.sub(r'[^a-z0-9]+', '', s.lower())
    expected = Counter(normalize('INSET ' + title) for title in titles
                       if not CONTINUED.search(title))
    continuations = {normalize('INSET ' + CONTINUED.sub('', title))
                     for title in titles if CONTINUED.search(title)}
    findings = [f'continuation has no original inset: {title!r}'
                for title in sorted(continuations - expected.keys())]
    if not expected:
        return findings
    # Longest first prevents a short title from also matching a longer one.
    pattern = re.compile('(' + '|'.join(re.escape(title) for title in
                                      sorted(expected, key=len, reverse=True))
                         + ')(continued)?')
    found = Counter()
    for number, page in enumerate(pages, 1):
        opening_on_page = Counter()
        present = set()
        for match in pattern.finditer(normalize(page)):
            title, continued = match.groups()
            present.add(title)
            if not continued:
                found[title] += 1
                opening_on_page[title] += 1
        # Generated continuation headings are not authored openings. Preserve
        # the original density rule: at most one new inset opens on each page.
        count = sum(opening_on_page.values())
        # A tinted continuation page can look occupied to the raster whitespace
        # sensor even when it contains only its artifact heading and folio.
        remainder = pattern.sub('', normalize(page))
        if present and not opening_on_page and not re.search(r'[a-z]', remainder):
            findings.append(f'page {number} contains only an inset continuation heading')
        if count > 1:
            findings.append(f'page {number} opens {count} insets: {sorted(opening_on_page)}')
    findings += [f'inset {title!r}: expected {count} opening title(s), found {found[title]}'
                 for title, count in expected.items() if found[title] != count]
    return findings


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
    pages = subprocess.run(['pdftotext', str(pdf), '-'], check=True, capture_output=True,
                           text=True).stdout.split('\f')
    return title_findings(titles, pages)
