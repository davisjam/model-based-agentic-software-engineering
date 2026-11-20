#!/usr/bin/env python3
"""Generate paired SVG and native TikZ for the Appendix B admission workflow.

One geometry preserves artifact/activity/decision/evidence distinctions in both
outputs. Source coordinates are print points; text remains at 10pt.
"""
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[3]
KEY='priority-to-accepted-work'
W,H=444,318
ALT='An illustrative workflow progresses from priority to design, work order, agent implementation, acceptance gate, and integrated work. Engineering models supply scope and context to the work order and obligations to the gate. Independent acceptance evidence feeds the gate separately. Rejected work returns for repair; unresolved judgment goes to a human. An interrupted agent preserves durable commits and partial artifacts for recovery to inspect before resuming.'
# Reserve clearance below the planning row without scaling any text.
def Y(y):
 return y+12 if y>=99 else y

def tex(s):
 return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}'}.get(c,c) for c in s)
class Drawing:
 def __init__(self):
  self.labels=[]
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="1332" height="954" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc"><title id="title">From priority to accepted work</title><desc id="desc">{escape(ALT)}</desc><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4.7" refY="2.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="black"/></marker></defs><rect width="{W}" height="{H}" fill="white"/>']
  self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({W},{H});\n']
 def text(self,x,y,s,size=10,bold=False,anchor='middle'):
  y=Y(y)
  self.labels.append((s,bold))
  self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+f'" fill="black">{escape(s)}</text>')
  a={'start':'base west','middle':'base','end':'base east'}[anchor]
  self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{'+(r'\bfseries ' if bold else '')+f'\\fontsize{{{size}}}{{{size*1.2}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
 def line(self,pts,dash=False,arrow=True):
  pts=[(x,Y(y)) for x,y in pts]
  self.s.append('<path d="'+' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts))+'" fill="none" stroke="black" stroke-width=".8"'+(' stroke-dasharray="3 2"' if dash else '')+(' marker-end="url(#arrow)"' if arrow else '')+'/>')
  self.t.append('\\draw[line width=.8bp'+(',dash pattern=on 3bp off 2bp' if dash else '')+(',-{Stealth[length=4.5bp,width=3.8bp]}' if arrow else '')+'] '+' -- '.join(f'({x},{y})' for x,y in pts)+';\n')
 def box(self,x,y,w,h,lines,activity=False,evidence=False):
  y0=y
  y=Y(y)
  rx=8 if activity else 0
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="white" stroke="black" stroke-width=".8"/>')
  self.t.append(f'\\path[fill=white,draw=black,line width=.8bp,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
  if evidence:
   self.s.append(f'<rect x="{x+3}" y="{y+3}" width="{w-6}" height="{h-6}" fill="white" stroke="black" stroke-width=".5"/>')
   self.t.append(f'\\path[fill=white,draw=black,line width=.5bp] ({x+3},{y+3}) rectangle ({x+w-3},{y+h-3});\n')
  for i,s in enumerate(lines):self.text(x+w/2,y0+h/2-(len(lines)-1)*6+3.4+i*12,s)
 def diamond(self,cx,cy,w,h,lines):
  cy0=cy
  cy=Y(cy)
  pts=[(cx,cy-h/2),(cx+w/2,cy),(cx,cy+h/2),(cx-w/2,cy)]
  self.s.append('<polygon points="'+' '.join(f'{x},{y}'for x,y in pts)+'" fill="white" stroke="black" stroke-width=".8"/>')
  self.t.append('\\path[fill=white,draw=black,line width=.8bp] '+' -- '.join(f'({x},{y})' for x,y in pts)+' -- cycle;\n')
  for i,s in enumerate(lines):self.text(cx,cy0-(len(lines)-1)*6+3.4+i*12,s)
 def save(self):
  (ROOT/f'book/assets/{KEY}.svg').write_text('\n'.join(self.s)+'</svg>\n')
  (ROOT/f'book/tikz/figures/{KEY}.tex').write_text(''.join(self.t)+'\\end{tikzpicture}\n')

def build():
 d=Drawing()
 # Shared inputs are routed before the main flow, with dashed edges.
 d.line([(195,25),(195,35),(270,35)],True,False)
 d.line([(270,35),(370,35),(370,54)],True)
 d.text(337,29,'scope + context')
 d.line([(270,35),(270,96),(190,96),(190,99)],True)
 d.s.append('<circle cx="270" cy="35" r="1.5" fill="black"/>')
 d.t.append('\\fill[black] (270,35) circle[radius=1.5bp];\n')
 d.text(265,107,'obligations')
 # Main progression; ordinary artifacts are square and activities rounded.
 d.line([(100,70),(145,70)])
 d.line([(245,70),(310,70)])
 d.line([(370,86),(370,109)])
 d.line([(310,129),(240,129)])
 d.line([(140,129),(110,129)])
 d.text(125,119,'accept')
 # Repair has its own route back into the implementation activity.
 d.line([(215,145),(230,162),(340,162),(340,149)])
 d.text(277,156,'repair')
 # Escalation goes to human judgment rather than silently passing the gate.
 d.line([(165,144),(120,173),(60,173),(60,210)])
 d.text(80,167,'escalate')
 # Work is examined; completion reports are not the acceptance evidence.
 d.line([(405,149),(405,183),(250,183),(250,205)])
 d.text(329,178,'check the work')
 d.line([(190,205),(190,159)],True)
 # Interruption preserves artifacts which recovery inspects before resuming.
 d.line([(430,129),(441,129),(441,228),(430,228)])
 d.text(370,199,'if interrupted')
 d.line([(370,247),(370,265)])
 d.box(145,1,100,24,['Engineering models'])
 d.box(10,54,90,32,['Priority'])
 d.box(145,54,100,32,['Design'])
 d.box(310,54,120,32,['Work order'])
 d.box(310,109,120,40,['Agent','implementation'],True)
 d.diamond(190,129,100,60,['Acceptance','gate'])
 d.box(10,109,100,40,['Integrated','work'])
 d.box(10,210,100,38,['Human judgment','(unresolved)'],True)
 d.box(125,205,145,45,['Independent','acceptance evidence'],evidence=True)
 d.box(310,209,120,38,['Durable commits','+ partial artifacts'])
 d.box(310,265,120,30,['Recovery: inspect','before resuming'],True)
 d.line([(10,282),(35,282)]);d.text(42,285,'work progression',anchor='start')
 d.line([(10,299),(35,299)],True);d.text(42,302,'context or evidence',anchor='start')
 d.save()
 return d
if __name__=='__main__':build()
