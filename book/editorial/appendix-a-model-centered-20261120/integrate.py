#!/usr/bin/env python3
"""Parent-run integration of the reviewed figure rows; does not build the book."""
import argparse, hashlib, json, shutil
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
rows = json.loads((HERE / 'registry-additions.json').read_text())
p = argparse.ArgumentParser(); p.add_argument('--apply', action='store_true'); args=p.parse_args()
def load(path): return json.loads((ROOT / path).read_text())
def save(path,data):
    dest=ROOT/path; old=dest.read_text()
    # Preserve each shared file's existing Unicode-escape convention.
    ascii_mode='\\u' in old and not any(ord(c)>127 for c in old)
    if args.apply: dest.write_text(json.dumps(data,indent=2,ensure_ascii=ascii_mode)+'\n')
    print(('updated ' if args.apply else 'would update ')+path)
def upsert(items,row,key='source'):
    idx=next((i for i,x in enumerate(items) if x.get(key)==row[key]),None)
    if idx is None: items.append(row); return 1
    items[idx]=row; return 0
for row in rows:
    for field,path in [('source_sha256',row['source']),('candidate_sha256',row['fidelity-review']['candidate'])]:
        assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==row['fidelity-review'][field],path+' changed after review'
inv=load('book/tikz/inventory.json')
for row in rows: upsert(inv,row['inventory'])
save('book/tikz/inventory.json',inv)
for name in ['layout-review','typography-review','style-review','fidelity-review','grayscale-review']:
    path='book/tikz/'+name+'.json'; d=load(path); items=d if isinstance(d,list) else d['figures']
    before_checks=sum(len(x.get('checks',[])) for x in items)
    added=sum(upsert(items,row[name]) for row in rows)
    if isinstance(d,dict):
        for k in ['candidate_count','checked_count']:
            if k in d:d[k]+=added
        if 'check_count' in d:d['check_count']+=sum(len(x.get('checks',[])) for x in items)-before_checks
        d['last_revised_date']='2026-11-20'
    save(path,d)
d=load('book/tikz/publication.json')
for row in rows:d['approved_monochrome'][row['source']]=row['publication']
save('book/tikz/publication.json',d)
d=load('book-models/figure-caption-tiers.json')
for row in rows:d['tiers'][row['source'].removeprefix('book/')]=row['caption-tier']
save('book-models/figure-caption-tiers.json',d)
for row in rows:
    src=HERE/'receipts'/Path(row['receipt']).name; dst=ROOT/row['receipt']
    if args.apply:shutil.copyfile(src,dst)
    print(('copied ' if args.apply else 'would copy ')+row['receipt'])
