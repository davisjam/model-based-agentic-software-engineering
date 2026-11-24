#!/usr/bin/env python3
"""Generate the Chapter 4 map's SVG and TikZ from one model and canonical titles."""
from pathlib import Path
import argparse
import html
import json
import re
import fitz

ROOT = Path(__file__).resolve().parents[1]
STEM = 'mage-in-practice-map'


def panels(root=ROOT):
    data = json.loads((root / 'book/data/mage-practice-map.json').read_text())
    identities = json.loads((root / 'book-models/chapter_identity_declared.json').read_text())['chapters']
    native = json.loads((root / 'book/latex/native-sources.json').read_text())['sources']
    for row in data['panels']:
        filename = next(x['filename'] for x in identities if x['label'] == row['section'])
        source = next(x['source'] for x in native if x['projection'] == 'book/' + filename)
        title = re.search(r'<!-- chapter-title:\s*(.*?)\s*-->', (root / source).read_text())[1]
        number = re.match(r'(\d+\.\d+)-', Path(filename).name)[1]
        row['heading'] = f'§{number}  {title}'
        row['target'] = Path(filename).stem
    return data['panels']


def render(rows):
    from mage_ch4_figures import render_map
    return render_map(rows)


def generate(check=False):
    values=render(panels())
    paths=[ROOT/f'book/assets/{STEM}.svg',ROOT/f'book/tikz/figures/{STEM}.tex']
    for path,value in zip(paths,values):
        if check:
            if not path.exists() or path.read_text()!=value:raise ValueError('Stale chapter map: '+str(path))
        elif not path.exists() or path.read_text()!=value:path.write_text(value)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true')
    generate(p.parse_args().check)
