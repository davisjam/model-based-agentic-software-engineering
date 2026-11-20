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
 def diamond(self,cx,cy,w,h,lines,heavy=False):
  width=1.6 if heavy else .8
  pts=[(cx,cy-h/2),(cx+w/2,cy),(cx,cy+h/2),(cx-w/2,cy)]
  self.s.append('<polygon points="'+' '.join(f'{x},{y}'for x,y in pts)+f'" fill="white" stroke="black" stroke-width="{width}"/>')
  self.t.append(f'\\path[fill=white,draw=black,line width={width}bp] '+' -- '.join(f'({x},{y})'for x,y in pts)+' -- cycle;\n')
  for i,s in enumerate(lines):self.text(cx,cy-(len(lines)-1)*6+3.4+i*12,s)
 def save(self):
  (ROOT/f'book/assets/{self.key}.svg').write_text('\n'.join(self.s)+'</svg>\n')
  (ROOT/f'book/tikz/figures/{self.key}.tex').write_text(''.join(self.t)+'\\end{tikzpicture}\n')

def substitution():
 d=Drawing('handbook-substitutable-reasoning','Substitutable reasoning with stable domain obligations','Task and workflow models guide two alternative engines: a pass-graph executor or a planning agent. Capability and selection knowledge informs model choice within an engine. Both engines produce typed proposals governed by an operation model and applied to the current artifact through a controlled application boundary. Separate evaluation and an acceptance model guide acceptance. Restricting mutation authority requires more than a typed request interface.',w=444,h=234)
 d.rect(0,44,440,88,rx=3,gray=True)
 d.text(147,57,'Alternative reasoning engines',bold=True)
 # Task and workflow models guide the engine; routing is subordinate inside it.
 d.line([(50,28),(50,44)])
 d.line([(175,28),(175,44)])
 d.line([(370,28),(370,78)])
 d.line([(312,92),(299,92),(299,65),(78,65),(78,78)],dash=True)
 d.line([(222,65),(222,78)],dash=True)
 # Both alternatives produce proposals, not direct artifact mutations.
 d.line([(78,106),(78,122),(50,122),(50,145)])
 d.line([(222,106),(222,122),(78,122)],arrow=False)
 d.line([(100,160),(115,160)])
 d.line([(220,160),(235,160)])
 d.line([(330,160),(345,160)])
 d.line([(50,200),(50,188),(145,188),(145,175)])
 d.line([(177.5,200),(177.5,175)])
 d.line([(392.5,175),(392.5,198)]);d.text(401,189,'findings',anchor='start')
 d.line([(330,216),(347.5,216)])
 d.line([(282.5,200),(282.5,187),(360,187),(360,175)])
 d.box(0,0,100,28,['Task model'])
 d.box(115,0,135,28,['Workflow model','pass graph / revisable plan'])
 d.box(265,0,175,28,['Capability + selection model'])
 d.box(12,78,132,28,['Pass-graph executor'],True)
 d.box(156,78,132,28,['Planning agent'],True)
 d.box(312,78,116,28,['Select a capable model'],True)
 d.box(0,145,100,30,['Typed proposals'])
 d.rect(115,145,105,30,rx=3,heavy=True)
 d.text(167.5,157,'Controlled');d.text(167.5,169,'application')
 d.box(235,145,95,30,['Resulting artifact'])
 d.box(345,145,95,30,['Separate','evaluation'],True)
 d.box(0,200,100,32,['Current artifact'])
 d.box(125,200,105,32,['Operation model'])
 d.box(235,200,95,32,['Acceptance model'])
 d.diamond(392.5,216,90,36,['Accept?'],heavy=True)
 d.save();return d

def selection():
 d=Drawing('handbook-model-based-test-selection','Model-based regression-test selection','Component and declared dependency models derive a change-impact model: the affected subsystems. Validation coverage maps the affected set to selected checks. The validation execution model supplies modes and interpretation policy; actual execution produces records and findings for acceptance. Recognized gaps widen execution to the full suite. Separate dependency and coverage evidence plus full-run comparisons challenge selection, leading to revised models or broader validation; these observations do not prove universal completeness.',w=444,h=234)
 # Selection: representations and their consumers remain visibly distinct.
 d.line([(68,28),(68,43),(45,43),(45,56)])
 d.line([(226,28),(226,43),(68,43)],arrow=False)
 d.line([(380,28),(380,43),(285,43),(285,56)])
 d.line([(90,71),(105,71)])
 d.line([(225,71),(240,71)])
 d.line([(330,71),(345,71)])
 d.line([(394.5,86),(394.5,105),(167.5,105),(167.5,126)])
 # Recognized uncertainty widens execution; it does not authorize skipping.
 d.line([(135,86),(135,114),(145,114),(145,126)])
 d.text(128,100,'recognized gaps:',anchor='end');d.text(128,112,'run all',anchor='end')
 # Execution and interpretation consume a model, not the selector's prose report.
 d.line([(100,144),(120,144)])
 d.line([(215,144),(235,144)])
 d.line([(330,144),(355,144)])
 d.line([(50,162),(50,180),(397,180),(397,165)])
 d.text(107,174,'acceptance policy',anchor='start')
 # Challenge evidence addresses omissions without claiming an independent proof.
 d.line([(210,216),(235,216)],dash=True)
 d.line([(330,216),(345,216)])
 d.box(0,0,136,28,['Component +','dependency models'])
 d.box(158,0,136,28,['Change record'])
 d.box(316,0,128,28,['Validation coverage','model'])
 d.box(0,56,90,30,['Derive impact'],True)
 d.box(105,56,120,30,['Change-impact model','affected subsystems'])
 d.box(240,56,90,30,['Select checks'],True)
 d.box(345,56,99,30,['Selected checks'])
 d.box(0,126,100,36,['Execution model','mode + policy'])
 d.box(120,126,95,36,['Execute checks'],True)
 d.box(235,126,95,36,['Execution records','+ findings'])
 d.diamond(397,144,84,42,['Accept?'],heavy=True)
 d.box(0,200,210,32,['Dependency / coverage evidence','+ full-run comparisons'])
 d.box(235,200,95,32,['Challenge','selection'],True)
 d.box(345,200,99,32,['Revise models','or broaden runs'],True)
 d.save();return d

def mutation():
 d=Drawing('handbook-typed-changeset','Controlled mutation separates proposals from effects','A flexible producer emits a typed proposal. The resolver uses the document structure model of current artifact state. A before-value comparison reports mismatches by default; it is not the hard admission gate. Within the controlled application boundary, the supported operation vocabulary and selected guards determine whether the applier may mutate the resolved target. Per-operation results include refusal and failure. Successful session edits and remediation-pass mutations produce distinct attribution records. Unmigrated direct edits remain outside this route.',h=332)
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
 d.box(325,0,115,40,['Document structure','model / current state'])
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
 d=Drawing('handbook-model-guided-delegation','Governed delegation with bounded guidance and separate admission','A work order supplies target scope and declared phase identity. Component and constraint models and target scope feed bounded context selection, which guides an agent but does not enforce every obligation. Lifecycle policy and reconciled observed phase state remain distinct inputs to selected dispatch checks; absence of completion evidence is not a positive DONE match. The implementing agent preserves durable artifacts. Completion review evaluates landed work and independent evidence before recording acceptance. Interrupted or unresolved work is inspected before reassignment.',h=342)
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
 d.box(0,70,130,40,['Component +','constraint models'])
 d.box(165,70,120,40,['Lifecycle policy +','reconciled phase state'])
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


def build(): return [substitution(),selection(),mutation(),delegation()]
if __name__=="__main__":build()
