#!/usr/bin/env python3
"""A.8 reference-matched paired artwork; one geometry, native text in both outputs.
Adapted from book/editorial/appendix-a-figure-followup-20261120/build.py Drawing.
"""
from pathlib import Path
from html import escape
import json, argparse
from PIL import ImageFont
parser=argparse.ArgumentParser()
parser.add_argument('--repo-root',type=Path,default=None)
parser.add_argument('--output-dir',type=Path,default=Path(__file__).resolve().parent)
args=parser.parse_args()
candidates=[Path(__file__).resolve().parent,*Path(__file__).resolve().parents,Path.cwd(),*Path.cwd().parents]
ROOT=args.repo_root or next((p for p in candidates if (p/'book/fonts/SourceSans3').is_dir()),None)
if ROOT is None: parser.error('provide --repo-root containing book/fonts/SourceSans3')
OUT=args.output_dir
OUT.mkdir(parents=True,exist_ok=True)
KEY='handbook-recovery-architecture'
W,H=440,312
S=W/450
TITLE='Three commitments in job recovery'
ALT=('A document job enters an in-flight accounting lease in Redis, storing job ID and issue epoch, not worker identity. '
'The inline chunkless path bypasses the protected merge claim; the merge path must win a database compare-and-set. '
'Both paths persist the artifact before updating durable job state and reaching completed or failed status. '
'A separate recovery panel distinguishes stale-lease reissue, guarded stale release, interrupted effects, and interrupted publication. '
'Three assurance rows distinguish the runtime claim constraint, bounded interleaving exploration, and temporal delivery and sweep assumptions.')
CAPTION=('Three commitments in job recovery. The Redis lease records in-flight work by job ID and issue epoch; it does not identify an owning worker. '
'A database compare-and-set protects acquisition of the selected merge claim, while publication persists the artifact before updating durable job state. '
'The inline path bypasses that merge claim. These operations cross separate stores; recovery and assurance address their different failure windows.')
def tex(s):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','→':r'$\rightarrow$','•':r'\textbullet{}'}.get(c,c) for c in s)
class Drawing:
    def __init__(self):
        self.labels=[];self.rects=[]
        self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W*3}" height="{H*3}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc"><title id="title">{escape(TITLE)}</title><desc id="desc">{escape(ALT)}</desc><defs><marker id="arrow" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2 L0,4 Z" fill="black"/></marker></defs><rect width="440" height="312" fill="white"/>']
        self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({W},{H});\n']
    def text(self,x,y,s,size=9.2,bold=False,italic=False,anchor='middle',owner=None):
        x*=S
        self.labels.append(dict(x=x,y=y,text=s,size=size,bold=bold,italic=italic,anchor=anchor,owner=owner))
        self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+'" font-style="'+('italic' if italic else 'normal')+f'" fill="black">{escape(s)}</text>')
        a={'middle':'base','start':'base west','end':'base east'}[anchor]
        mods=(r'\bfseries ' if bold else '')+(r'\itshape ' if italic else '')
        self.t.append(f'\\node[anchor={a},inner sep=0pt,outer sep=0pt,font={{{mods}\\fontsize{{{size}bp}}{{{size*1.2}bp}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
    def rect(self,name,x,y,w,h,gray=False,rx=0):
        x*=S;w*=S
        self.rects.append(dict(name=name,x=x,y=y,w=w,h=h))
        self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="'+('#eaeaea' if gray else 'white')+'" stroke="black" stroke-width="0.8"/>')
        self.t.append(f'\\path[fill='+('black!8' if gray else 'white')+f',draw=black,line width=.8bp,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
    def line(self,pts,arrow=True):
        pts=[(x*S,y) for x,y in pts]
        self.s.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts))+'" fill="none" stroke="black" stroke-width="0.9"'+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
        self.t.append(r'\draw[line width=.9bp'+(r',-{Stealth[length=5bp,width=4bp]}' if arrow else '')+'] '+' -- '.join(f'({x},{y})' for x,y in pts)+';\n')
    def bullet(self,x,y,s,owner=None):
        self.text(x,y,'•',owner=owner);self.text(x+7,y,s,anchor='start',owner=owner)
    def save(self):
        (OUT/f'{KEY}.svg').write_text('\n'.join(self.s)+'</svg>\n')
        (OUT/f'{KEY}.tex').write_text(''.join(self.t)+r'\end{tikzpicture}'+'\n')
        (OUT/'caption.txt').write_text(CAPTION+'\n')
        (OUT/'caption.tex').write_text(r'\caption[Three commitments in job recovery]{\emph{Three commitments in job recovery.} '+tex(CAPTION.split('. ',1)[1])+r'}'+'\n')
        (OUT/'labels.json').write_text(json.dumps(self.labels,indent=2))
        (OUT/'alt.txt').write_text(ALT+'\n')
        (OUT/'geometry.json').write_text(json.dumps(dict(width=W,height=H,alt=ALT,labels=self.labels,boxes=self.rects),indent=2))
d=Drawing()
# Exact target topology: two upper branches; the inline path bypasses merge claim.
d.line([(109,30),(109,53)],False)
d.line([(60,53),(163,53)],False)
d.line([(60,53),(60,67)]);d.line([(163,53),(163,67)])
d.line([(36,119),(36,211)])
d.line([(151,119),(151,140)])
d.line([(155,192),(155,211)])
d.line([(110,263),(110,281)])
d.rect('job',50,2,118,28)
d.text(109,14,'Document job',10.8,True,owner='job');d.text(109,25,'(job ID)',9.5,owner='job')
d.text(25,44,'Inline path',9.4,True,True);d.text(25,54,'(chunkless)',9.4,True,True)
d.text(192,44,'Merge path',9.4,True,True);d.text(192,54,'(with claim)',9.4,True,True)
d.rect('lease',3,67,217,52)
d.text(111.5,79,'1. In-flight lease',10.8,True,owner='lease')
d.text(111.5,90,'(job accounting in Redis)',9.5,owner='lease')
d.bullet(19,103,'Job ID + issue epoch; no worker ID','lease')
d.bullet(19,114,'Conditional reissue after staleness check','lease')
d.rect('claim',73,140,151,52)
d.text(148.5,152,'2. Protected effect claim',10.8,True,owner='claim')
d.text(148.5,163,'(merge path only)',9.5,owner='claim')
d.bullet(83,176,'Database compare-and-set (CAS)','claim')
d.bullet(83,187,'One winner for this merge claim','claim')
d.rect('publication',2,211,218,52)
d.text(111,223,'3. Publication',10.8,True,owner='publication')
d.text(111,234,'(persist result and update job)',9.5,owner='publication')
d.bullet(18,247,'Persist artifact (e.g., PDF)','publication')
d.bullet(18,258,'Then update job row (state, outcome)','publication')
d.rect('terminal',41,281,140,27)
d.text(111,293,'Terminal job',10.8,True,owner='terminal');d.text(111,304,'(completed or failed)',9.5,owner='terminal')
d.rect('recovery',262,36,186,102)
d.text(273,49,'Failure and recovery',10.8,True,anchor='start',owner='recovery')
for y,s in [(62,'Lease stale → conditional reissue'),(84,'Guarded stale release → ignore'),(106,'Effect interrupted → inspect claim'),(117,'Publication interrupted → inspect')]:d.bullet(277,y,s,'recovery')
for y,s in [(73,'(recheck staleness)'),(95,'(epoch mismatch)'),(128,'artifact and durable job state')]:d.text(284,y,s,anchor='start',owner='recovery')
d.rect('assurance',262,151,186,134)
d.text(272,164,'Distinct assurance mechanisms',10.8,True,anchor='start',owner='assurance')
rows=[('runtime',174,['Runtime','constraint'],['Atomic compare-and-set','protects the selected','merge claim.']),('explore',211,['Explicit-state','exploration'],['Bounded exploration of','stale-release and','recovery interleavings.']),('temporal',248,['Temporal','analysis'],['Delivery and sweep','assumptions govern','eventual termination.'])]
for name,y,head,body in rows:
    d.rect(name+'-body',272,y,169,31,rx=1)
    d.rect(name+'-head',272,y,64,31,gray=True,rx=1)
    for i,s in enumerate(head):d.text(304,y+12+i*10,s,9.2,True,owner=name+'-head')
    for i,s in enumerate(body):d.text(340,y+8+i*10,s,9.0,anchor='start',owner=name+'-body')
d.save()
# Verify actual font advances at geometry scale (not a character-count heuristic).
errors=[]
for item in d.labels:
    stem=('BoldIt' if item['italic'] else 'Bold') if item['bold'] else ('It' if item['italic'] else 'Regular')
    font=ImageFont.truetype(str(ROOT/f'book/fonts/SourceSans3/SourceSans3-{stem}.ttf'),round(item['size']*100))
    width=font.getlength(item['text'])/100
    left=item['x']-width/2 if item['anchor']=='middle' else item['x']-width if item['anchor']=='end' else item['x']
    box=next((r for r in d.rects if r['name']==item['owner']),None)
    if box and (left<box['x']+2 or left+width>box['x']+box['w']-2):errors.append(dict(text=item['text'],left=left,right=left+width,box=box))
(OUT/'font-fit.json').write_text(json.dumps(errors,indent=2))
print('font fit findings:',len(errors))
print('\n'.join(e['text'] for e in errors))
