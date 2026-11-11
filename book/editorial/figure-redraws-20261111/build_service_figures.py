#!/usr/bin/env python3
"""House-style model comparisons. Service edges are supplied from reviewed evidence."""
from pathlib import Path
from html import escape
OUT=Path(__file__).resolve().parent
class Figure:
 def __init__(self,w,h,title,bw):
  self.bw=bw;self.parts=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{escape(title)}</title><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0 0 L8 4 L0 8 Z" fill="#222"/></marker></defs><style>text {{font-family:"Source Sans 3","Source Sans Pro",sans-serif;fill:#111}} .edge {{fill:none;stroke:#222;stroke-width:1.2;marker-end:url(#arrow)}}</style><rect x="0" y="0" width="{w}" height="{h}" fill="white"/>']
 def text(self,x,y,t,bold=False,size=20):self.parts.append(f'<text x="{x}" y="{y}" text-anchor="middle" style="font-size:{size}px;'+('font-weight:bold;'if bold else '')+f'">{escape(t)}</text>')
 def box(self,x,y,w,h,lines):
  self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="4" fill="'+('#eeeeee'if self.bw else '#e5edf5')+'" stroke="#333" stroke-width="1.2"/>')
  for i,t in enumerate(lines):self.text(x+w/2,y+h/2+7+(i-(len(lines)-1)/2)*23,t)
 def edge(self,d):self.parts.append(f'<path d="{d}" class="edge"/>')
 def path(self,d,color='#666'):self.parts.append(f'<path d="{d}" fill="none" stroke="{color}" stroke-width="1.2"/>')
 def save(self,name):
  p=OUT/(name+('-bw'if self.bw else '-color')+'.svg');p.write_text(''.join(self.parts)+'</svg>\n');return p

def observed(bw):
 f=Figure(782,315,'Illustrative observed calls compared with declared permissions',bw)
 f.text(191,32,'Observed calls',True,21);f.text(591,32,'Declared permissions',True,21)
 f.path('M391,52 V302','#aaa')
 for dx in [0,400]:
  f.box(20+dx,80,120,65,['web']);f.box(227+dx,80,140,65,['report','service']);f.box(227+dx,230,140,58,['renderer'])
  f.edge(f'M{140+dx},112.5 H{227+dx}')
  if dx:f.edge(f'M{297+dx},145 V230')
 f.edge('M80,145 V259 H227')
 f.path('M129,242 L141,254 M129,254 L141,242','#222')
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
