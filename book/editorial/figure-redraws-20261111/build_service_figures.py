#!/usr/bin/env python3
"""House-style model comparisons. Service edges are supplied from reviewed evidence."""
from pathlib import Path
from html import escape
OUT=Path(__file__).resolve().parent
class Figure:
 def __init__(self,w,h,title,bw):
  self.bw=bw;self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z" fill="#222"/></marker></defs><style>text {{font-family:"Source Sans 3","Source Sans Pro",sans-serif;fill:#111}} .edge {{fill:none;stroke:#222;stroke-width:1.2;marker-end:url(#arrow)}}</style><rect x="0" y="0" width="{w}" height="{h}" fill="white"/>']
 def text(self,x,y,t,bold=False,size=20):self.parts.append(f'<text x="{x}" y="{y}" text-anchor="middle" style="font-size:{size}px;'+('font-weight:bold;'if bold else '')+f'">{escape(t)}</text>')
 def box(self,x,y,w,h,lines,size=20,leading=23):
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="'+('#eeeeee'if self.bw else '#e5edf5')+'" stroke="#333" stroke-width="1.2"/>')
  for i,t in enumerate(lines):self.text(x+w/2,y+h/2+(6 if size==18 else 7)+(i-(len(lines)-1)/2)*leading,t,size=size)
 def edge(self,d):self.parts.append(f'<path d="{d}" class="edge"/>')
 def path(self,d,color='#666'):self.parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.2"/>')
 def save(self,name):
  p=OUT/(name+('-bw'if self.bw else '-color')+'.svg');p.write_text(''.join(self.parts)+'</svg>\n');return p

def observed(bw):
 f=Figure(362,158,'Illustrative observed calls compared with declared permissions',bw)
 f.text(90.5,18,'Observed calls',True,18);f.text(271.5,18,'Declared permissions',True,18)
 f.path('M181,29 V150','#aaa')
 for dx in [0,181]:
  f.box(6+dx,35,60,42,['web'],size=18,leading=19)
  f.box(90+dx,35,80,42,['report','service'],size=18,leading=19)
  f.box(90+dx,105,80,36,['renderer'],size=18,leading=19)
  f.edge(f'M{66+dx},56 H{90+dx}')
  if dx:f.edge(f'M{130+dx},77 V105')
 f.edge('M36,77 V123 H90')
 f.path('M53,110 L61,118 M53,118 L61,110','#222')
 return f.save('figure-2-16-house')

def service(bw):
 f=Figure(782,345,'Selected declared service invocations in DocAble',bw)
 f.box(120,15,140,55,['Internet']);f.box(120,120,140,55,['web'])
 f.edge('M190,70 V120')
 f.box(515,120,150,55,['worker'])
 f.box(15,260,160,64,['document','editor']);f.box(215,260,140,64,['others'])
 f.path('M190,175 V225 M95,225 H285','#222')
 for x in [95,285]:f.edge(f'M{x},225 V260')
 f.box(405,260,145,64,['generation']);f.box(575,260,100,64,['render']);f.box(700,260,70,64,['OCR'])
 f.path('M590,175 V225 M477.5,225 H735','#222')
 for x in [477.5,625,735]:f.edge(f'M{x},225 V260')
 return f.save('figure-2-17-house')

if __name__=='__main__':
 for fn in [observed,service]:
  for bw in [False,True]:print(fn(bw))
