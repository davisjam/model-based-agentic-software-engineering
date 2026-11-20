#!/usr/bin/env python3
"""Parent-run integration for the reviewed book-map follow-up only."""
from pathlib import Path
import argparse,json,hashlib,shutil
ROOT=Path(__file__).resolve().parents[3]; HERE=Path(__file__).resolve().parent
p=argparse.ArgumentParser();p.add_argument('--apply',action='store_true');args=p.parse_args()
rows=json.loads((HERE/'registry-updates.json').read_text());src='book/assets/book-map.svg'
for k,path in [('source_sha256',src),('candidate_sha256','book/tikz/figures/book-map.tex')]:
 assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==rows['fidelity-review'][k],path+' changed after review'
def save(path,data):
 target=ROOT/path;old=target.read_text();ascii_mode='\\u' in old and not any(ord(c)>127 for c in old)
 if args.apply:target.write_text(json.dumps(data,indent=2,ensure_ascii=ascii_mode)+'\n')
 print(('updated ' if args.apply else 'would update ')+path)
for name in ['inventory','layout-review','typography-review','style-review','fidelity-review','grayscale-review']:
 path='book/tikz/'+name+'.json';data=json.loads((ROOT/path).read_text());items=data if isinstance(data,list) else data['figures']
 index=next(i for i,x in enumerate(items) if x['source'] in [src,src.removeprefix('book/')])
 old_count=len(items[index].get('checks',[]));items[index]=rows[name]
 if isinstance(data,dict):
  if 'check_count' in data:data['check_count']+=len(items[index].get('checks',[]))-old_count
  data['last_revised_date']='2026-11-20'
 save(path,data)
path='book/tikz/publication.json';data=json.loads((ROOT/path).read_text());data['approved_monochrome'][src]=rows['publication'];save(path,data)
if args.apply:shutil.copyfile(HERE/'receipt.json',ROOT/'book/tikz/receipts/book-map.json')
print(('copied 'if args.apply else 'would copy ')+'book/tikz/receipts/book-map.json')
