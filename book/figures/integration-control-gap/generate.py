#!/usr/bin/env python3
"""Generate the integration control-gap reconstruction in TikZ and SVG."""
from pathlib import Path
import html,json
r=Path(__file__).resolve().parents[3]
tex=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Latex,font=\magefigurefont\fontsize{9}{11}\selectfont]',r'\hyphenpenalty=10000'];checks=[]
alt='Control-gap reconstruction, not an execution trace. The integration fallback retries a rebase conflict with -X theirs. An audit detects the dangerous automatic resolution and evaluates it as unsafe, but only warns and leaves the fallback available. Observed incompatible edits made merge automation fail to load. The durable repair removed the retry and requires escalation for conflicts without a sanctioned resolution.'
svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 336 285" width="336" height="285" role="img" aria-labelledby="title desc" font-family="\'Source Sans 3\', sans-serif">','<title id="title">A warning did not prevent unsafe integration</title>','<desc id="desc">'+alt+'</desc>','<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z"/></marker></defs>']
def txt(y,t,bold=False,tt=None):
 s=tt or t;tex.append(r'\node[anchor=base,inner sep=0pt,font=\magefigurefont\fontsize{9}{11}\selectfont'+(r'\bfseries' if bold else '')+'] at (168,'+str(y)+') {'+s+'};');svg.append(f'<text x="168" y="{y}" text-anchor="middle" font-size="9"'+(' font-weight="700"' if bold else '')+'>'+html.escape(t)+'</text>')
 if tt is None:checks.append(dict(text=t,bold=bold,italic=False))
def box(y,h,title,lines,dashed=False):
 tex.append(r'\draw[rounded corners=3pt,line width=.7pt'+(',dashed' if dashed else '')+f'] (6,{y}) rectangle (330,{y+h});');svg.append(f'<rect x="6" y="{y}" width="324" height="{h}" rx="3" fill="white" stroke="#111" stroke-width=".7"'+(' stroke-dasharray="4 3"' if dashed else '')+'/>');txt(y+12,title,True)
 for i,t in enumerate(lines):
  txt(y+23+i*11,t)
rows=[(2,29,'UNSAFE FALLBACK AVAILABLE',['Rebase conflict: retry with -X theirs']), (43,29,'AUDIT / SENSOR',['Detects dangerous automatic resolution']), (84,21,'VERDICT: UNSAFE',[]), (117,29,'WARNING ONLY',['Does not prevent operation']), (158,21,'UNSAFE FALLBACK REMAINS',[]), (191,40,'OBSERVED FAILURE',['Incompatible edits combined;','merge automation fails to load']), (243,40,'DURABLE REPAIR',['Remove -X theirs retry; require escalation','on conflicts without a sanctioned resolution'])]
for i,(y,h,title,lines) in enumerate(rows):
 box(y,h,title,lines,title=='WARNING ONLY')
 if i<len(rows)-1:
  y2=rows[i+1][0];tex.append(f'\\draw[->,line width=.7pt] (168,{y+h}) -- (168,{y2});');svg.append(f'<path d="M168 {y+h}V{y2}" fill="none" stroke="#111" stroke-width=".7" marker-end="url(#arrow)"/>')
tex.append(r'\end{tikzpicture}');svg.append('</svg>');(r/'book/tikz/figures/judgment-without-consequence.tex').write_text('\n'.join(tex)+'\n');(r/'book/assets/judgment-without-consequence.svg').write_text('\n'.join(svg)+'\n')
f=r/'book/tikz/typography-review.json';d=json.loads(f.read_text());next(x for x in d['figures'] if x['source']=='book/assets/judgment-without-consequence.svg')['checks']=checks;f.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
f=r/'book/tikz/layout-review.json';d=json.loads(f.read_text());next(x for x in d['figures'] if x['source']=='book/assets/judgment-without-consequence.svg')['contracts']={};f.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')
