#!/usr/bin/env python3
"""Paired monochrome SVG/TikZ blueprints, using one explicit geometry.

Gray identifies flexible reasoning; square artifacts, rounded mechanisms,
diamonds and heavy enforcement boundaries carry distinct roles.
"""
from pathlib import Path
from html import escape
ROOT=Path(__file__).resolve().parents[3]

def tex(s):
 return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}'}.get(c,c) for c in s)
class Drawing:
 def __init__(self,key,title,alt,w=440,h=340):
  self.key,self.title,self.alt,self.w,self.h=key,title,alt,w,h;self.labels=[]
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w*3}" height="{h*3}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">{escape(alt)}</desc><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4.7" refY="2.5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="black"/></marker></defs><rect width="{w}" height="{h}" fill="white"/>']
  self.t=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({w},{h});\n']
 def text(self,x,y,s,size=10,bold=False,anchor='middle'):
  self.labels.append((s,bold))
  self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="Source Sans 3,Arial,sans-serif" font-size="{size}" font-weight="'+('bold' if bold else 'normal')+f'" fill="black">{escape(s)}</text>')
  a={'start':'base west','middle':'base','end':'base east'}[anchor]
  self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{'+(r'\bfseries 'if bold else '')+f'\\fontsize{{{size}}}{{{size*1.2}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
 def line(self,pts,dash=False,arrow=True,heavy=False):
  width=1.8 if heavy else .8
  self.s.append('<path d="'+' '.join(('M'if i==0 else'L')+f'{x},{y}'for i,(x,y)in enumerate(pts))+'" fill="none" stroke="black" stroke-width="'+str(width)+'"'+(' stroke-dasharray="3 2"'if dash else'')+(' marker-end="url(#arrow)"'if arrow else'')+'/>')
  self.t.append(f'\\draw[line width={width}bp'+(',dash pattern=on 3bp off 2bp'if dash else'')+(',-{Stealth[length=4.5bp,width=3.8bp]}'if arrow else'')+'] '+' -- '.join(f'({x},{y})'for x,y in pts)+';\n')
 def rect(self,x,y,w,h,rx=0,gray=False,heavy=False):
  fill='#eaeaea'if gray else'white';width=1.6 if heavy else .8
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="black" stroke-width="{width}"/>')
  self.t.append(f'\\path[fill='+('black!8'if gray else'white')+f',draw=black,line width={width}bp,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
 def box(self,x,y,w,h,lines,activity=False,gray=False):
  self.rect(x,y,w,h,8 if activity else 0,gray)
  for i,s in enumerate(lines):self.text(x+w/2,y+h/2-(len(lines)-1)*6+3.4+i*12,s)
 def diamond(self,cx,cy,w,h,lines):
  pts=[(cx,cy-h/2),(cx+w/2,cy),(cx,cy+h/2),(cx-w/2,cy)]
  self.s.append('<polygon points="'+' '.join(f'{x},{y}'for x,y in pts)+'" fill="white" stroke="black" stroke-width=".8"/>')
  self.t.append('\\path[fill=white,draw=black,line width=.8bp] '+' -- '.join(f'({x},{y})'for x,y in pts)+' -- cycle;\n')
  for i,s in enumerate(lines):self.text(cx,cy-(len(lines)-1)*6+3.4+i*12,s)
 def save(self):
  (ROOT/f'book/assets/{self.key}.svg').write_text('\n'.join(self.s)+'</svg>\n')
  (ROOT/f'book/tikz/figures/{self.key}.tex').write_text(''.join(self.t)+'\\end{tikzpicture}\n')

def deployment():
 d=Drawing('handbook-derived-iam','Model-driven deployment with explicit authority boundaries','Flexible engineering judgment selects intended calls. A typed call contract is checked by parity against the current authoritative dependency map. That map and environment-specific deployment identities feed deterministic grant derivation, a concrete grant plan, application, and per-grant results. Installed IAM bindings govern invocation at a separate runtime boundary. Service-name correspondence is not an IAM check. Moving model authority requires a separate consumer migration.',h=348)
 # Enforcement is the installed platform control, not model parity or grant planning.
 d.rect(315,218,123,124,heavy=True)
 d.text(376.5,232,'Cloud IAM boundary',bold=True)
 d.line([(70,40),(70,65)])
 d.line([(140,88),(180,88)],dash=True,arrow=False);d.text(160,81,'parity')
 d.line([(240,110),(240,142)])
 d.line([(382.5,110),(382.5,126),(270,126),(270,142)])
 d.line([(240,182),(240,202)])
 d.line([(240,238),(240,261)])
 d.line([(180,280),(145,280)])
 d.line([(300,280),(307,280),(307,261),(325,261)])
 d.line([(380,278),(380,294)])
 d.box(0,0,140,40,['Engineer / agent','selects intended calls'],True,True)
 d.box(0,65,140,45,['Typed call contract','verified mirror'])
 d.box(180,65,120,45,['Dependency map','current authority'])
 d.box(325,65,115,45,['Deployment identities','and service names'])
 d.box(180,142,120,40,['Derive concrete grants'],True)
 d.box(180,202,120,36,['Grant plan'])
 d.box(180,261,120,38,['Apply grants'],True)
 d.box(0,259,145,43,['Per-grant results','granted / failed / dry-run'])
 d.box(325,244,110,34,['Installed bindings'])
 d.diamond(380,312,104,36,['Allow call?'])
 d.text(380,338,'allow / refuse')
 d.text(70,133,'Later: migrate consumers,')
 d.text(70,145,'then transfer authority.')
 d.text(70,196,'Service-name parity')
 d.text(70,208,'does not verify IAM.')
 d.text(72.5,321,'Failed application:')
 d.text(72.5,333,'report and fix forward.')
 d.save();return d

def mutation():
 d=Drawing('handbook-typed-changeset','Controlled mutation separates proposals from effects','A flexible producer emits a typed proposal. The resolver uses current document state. A before-value comparison reports mismatches by default; it is not the hard admission gate. Within the controlled application boundary, the supported operation vocabulary and selected guards determine whether the applier may mutate the resolved target. Per-operation results include refusal and failure. Successful session edits and remediation-pass mutations produce distinct attribution records. Unmigrated direct edits remain outside this route.',h=332)
 d.rect(0,125,440,143,heavy=True);d.text(5,121,'Controlled application boundary',bold=True,anchor='start')
 d.line([(130,20),(165,20)])
 d.line([(225,40),(225,70)])
 d.line([(380,40),(380,90),(290,90)])
 d.line([(180,40),(180,55),(70,55),(70,70)],dash=True)
 d.line([(165,90),(130,90)],dash=True)
 d.line([(220,110),(220,135)])
 d.line([(130,165),(170,165)])
 d.line([(270,165),(325,165)]);d.text(297,158,'pass')
 d.line([(220,195),(220,218)]);d.text(242,211,'refuse')
 d.line([(377.5,185),(377.5,204),(285,204),(285,218)])
 d.line([(227.5,258),(227.5,278),(100,278),(100,292)])
 d.line([(405,185),(405,275),(340,275),(340,292)]);d.text(397,244,'on mutation',anchor='end')
 d.box(0,0,130,40,['Flexible producer','proposes edits'],True,True)
 d.box(165,0,125,40,['Typed proposal','operation + target'])
 d.box(325,0,115,40,['Current document','state'])
 d.box(165,70,125,40,['Resolve current target'],True)
 d.box(5,70,125,40,['Before-value compare','audit by default'],True)
 d.box(5,145,125,40,['Supported operation','vocabulary'])
 d.diamond(220,165,100,60,['Selected','guards'])
 d.box(325,145,105,40,['Apply mutation'],True)
 d.box(160,218,135,40,['Per-operation result','applied / refused / failed'])
 d.box(0,292,200,36,['Session log','successful session ops only'])
 d.box(240,292,200,36,['Pass attribution','remediation mutations'])
 d.save();return d

def delegation():
 d=Drawing('handbook-model-guided-delegation','Governed delegation with bounded guidance and separate admission','A work order supplies target scope and declared phase identity. Engineering models and target scope feed bounded context selection, which guides an agent but does not enforce every obligation. Selected dispatch checks evaluate the brief and resolved phase state; absence of completion evidence is not a positive DONE match. The implementing agent preserves durable artifacts. Completion review evaluates landed work and independent evidence before recording acceptance. Interrupted or unresolved work is inspected before reassignment.',h=342)
 d.rect(310,65,130,85,heavy=True);d.text(306,61,'Dispatch boundary',bold=True,anchor='end')
 d.rect(150,237,150,61,heavy=True)
 # Scope and model facts guide context selection.
 d.line([(130,20),(165,20)])
 d.line([(130,90),(145,90),(145,32),(165,32)])
 d.line([(285,20),(325,20)])
 d.line([(380,40),(380,75)])
 d.line([(285,90),(355,90)],dash=True)
 d.line([(380,135),(380,170)]);d.text(395,163,'allow')
 d.line([(330,105),(300,105),(300,145),(225,145),(225,170)]);d.text(269,140,'refuse')
 d.line([(380,210),(380,250)]);d.text(386,229,'complete',anchor='start');d.text(386,241,'or partial',anchor='start')
 d.line([(325,270),(285,270)])
 d.line([(165,270),(130,270)])
 d.line([(65,210),(65,225),(225,225),(225,250)],dash=True)
 d.line([(380,290),(380,323),(285,323)]);d.text(337,316,'interrupted')
 d.line([(225,290),(225,308)])
 d.box(0,0,130,40,['Work order','scope + declared phase'])
 d.box(165,0,120,40,['Bounded context','selection'],True)
 d.box(325,0,110,40,['Brief + selected','context'])
 d.box(0,70,130,40,['Engineering models'])
 d.box(165,70,120,40,['Reconciled','phase state'])
 d.diamond(380,105,100,60,['Dispatch','checks'])
 d.text(225,126,'Absence is not DONE.')
 d.box(325,170,110,40,['Implementing agent','flexible reasoning'],True,True)
 d.box(165,170,120,40,['Refuse assignment','invalid brief; or DONE','without valid override'])
 d.box(0,170,130,40,['Independent checks','and review evidence'])
 d.box(325,250,110,40,['Durable work','commits + artifacts'])
 d.box(165,250,120,40,['Completion review'],True)
 d.box(0,250,130,40,['Accepted completion','phase state updated'])
 d.box(165,308,120,30,['Inspect / reconcile','before redispatch'],True)
 d.save();return d

def build():return [deployment(),mutation(),delegation()]
if __name__=='__main__':build()
