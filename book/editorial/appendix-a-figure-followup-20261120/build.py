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
 d.text(70,196,'Service-name parity')
 d.text(70,208,'does not verify IAM.')
 d.text(72.5,321,'Failed application:')
 d.text(72.5,333,'report and fix forward.')
 d.save();return d


def substitution():
 d=Drawing('handbook-substitutable-reasoning','Substitutable reasoning with stable domain obligations','Task and workflow models guide two alternative engines: a pass-graph executor or a planning agent. Capability and selection knowledge informs model choice within an engine. Both engines produce typed proposals governed by an operation model and applied to the current artifact through a controlled application boundary. Separate evaluation and an acceptance model guide acceptance. Restricting mutation authority requires more than a typed request interface.',w=444,h=234)
 d.rect(0,44,290,88,rx=3,gray=True)
 d.text(145,57,'Two alternative engines',bold=True)
 d.text(370,123,'Shared model selection',bold=True)
 # Task and workflow models guide the engine; routing is subordinate inside it.
 d.line([(50,28),(50,44)])
 d.line([(175,28),(175,44)])
 d.line([(370,28),(370,78)],heavy=True)
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
 d.line([(320,216),(347.5,216)]);d.text(333.5,209,'policy')
 d.line([(275,200),(275,187),(360,187),(360,175)])
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
 d.box(235,200,85,32,['Acceptance','model'])
 d.diamond(392.5,216,90,36,['Accept?'],heavy=True)
 d.save();return d

def selection():
 d=Drawing('handbook-model-based-test-selection','Model-based regression-test selection','Component and declared dependency models derive a change-impact model: the affected subsystems. Validation coverage maps the affected set to selected checks. The validation execution model supplies modes and interpretation policy; actual execution produces records and findings for acceptance. Recognized gaps widen execution to the full suite. Separate dependency and coverage evidence plus full-run comparisons challenge selection, leading to revised models or broader validation; these observations do not prove universal completeness.',w=444,h=234)
 d.s[0]=d.s[0].replace('height="702"','height="756"').replace('viewBox="0 0 444 234"','viewBox="0 -18 444 252"').replace('<rect width="444" height="234"','<rect y="-18" width="444" height="252"')
 d.t[1]='\\path[use as bounding box] (0,-18) rectangle (444,234);\n'
 d.line([(427,216),(440,216),(440,-12),(68,-12),(68,0)],dash=True)
 d.line([(371,-12),(371,0)],dash=True)
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
 d.line([(330,144),(350,144)])
 d.line([(50,162),(50,180),(390,180),(390,165)])
 d.text(107,174,'acceptance policy',anchor='start')
 # Challenge evidence addresses omissions without claiming an independent proof.
 d.line([(210,216),(235,216)],dash=True)
 d.line([(330,216),(345,216)])
 d.box(0,0,136,28,['Component +','dependency models'])
 d.box(158,0,136,28,['Change record'])
 d.box(316,0,110,28,['Validation coverage','model'])
 d.box(0,56,90,30,['Derive impact'],True)
 d.box(105,56,120,30,['Change-impact model','affected subsystems'])
 d.box(240,56,90,30,['Select checks'],True)
 d.box(345,56,82,30,['Selected checks'])
 d.box(0,126,100,36,['Execution model','mode + policy'])
 d.box(120,126,95,36,['Execute checks'],True)
 d.box(235,126,95,36,['Execution records','+ findings'])
 d.diamond(390,144,80,42,['Accept?'],heavy=True)
 d.box(0,200,210,32,['Dependency / coverage evidence','+ full-run comparisons'])
 d.box(235,200,95,32,['Challenge','selection'],True)
 d.box(345,200,82,32,['Revise models','or broaden runs'],True)
 d.save();return d

def mutation():
 d=Drawing('handbook-typed-changeset','Controlled mutation separates proposals from effects','A flexible producer emits a typed proposal. The resolver uses the document structure model of current artifact state. A before-value comparison reports mismatches by default; it is not the hard admission gate. Within the controlled application boundary, the supported operation vocabulary and selected guards determine whether the applier may mutate the resolved target. Per-operation results include refusal and failure. Successful session edits and remediation-pass mutations produce distinct attribution records. Unmigrated direct edits remain outside this route.',h=332)
 d.rect(0,125,440,143,heavy=True);d.text(5,121,'Controlled application boundary',bold=True,anchor='start')
 d.line([(130,20),(165,20)])
 d.line([(225,40),(225,70)])
 d.line([(380,40),(380,90),(290,90)])
 d.line([(180,40),(180,55),(70,55),(70,70)],dash=True)
 d.line([(180,100),(130,100)],dash=True)
 d.text(155,77,'diagnostic');d.text(155,89,'evidence')
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
 d.box(180,70,110,40,['Resolve current target'],True)
 d.box(5,70,125,40,['Before-value compare','audit by default'],True)
 d.box(5,145,125,40,['Supported operation','vocabulary'])
 d.diamond(220,165,100,60,['Selected','guards'])
 d.box(325,145,105,40,['Apply mutation'],True)
 d.box(160,218,135,40,['Per-operation result','applied / refused / failed'])
 d.box(0,292,200,36,['Session log','successful session ops only'])
 d.box(240,292,200,36,['Pass attribution','remediation mutations'])
 d.save();return d

def delegation():
 d=Drawing('handbook-model-guided-delegation','Governed delegation with parallel dispatch and completion decisions','The work order and component/constraint models feed bounded context selection. Lifecycle policy and reconciled phase state feed the dispatch decision: is the assignment authorized? A refused assignment does not execute without repair or a valid override. An authorized agent preserves durable work, which is both inspected at completion and evaluated by independent checks. Checks produce review evidence; the completion decision asks whether obligations are satisfied. Interrupted or unresolved work is inspected and reconciled before redispatch. Absence of state is not evidence of DONE.',h=354)
 # The two consequential decisions share a column, size, and heavy diamond treatment.
 d.line([(65,40),(65,55)])
 d.line([(160,20),(145,20),(145,72),(130,72)])
 d.line([(65,89),(65,105)])
 d.line([(130,123),(162,123)])
 d.line([(377.5,40),(377.5,48),(222,48),(222,95)])
 d.line([(282,123),(315,123)]);d.text(298.5,116,'allow')
 d.line([(222,151),(222,175)]);d.text(245,166,'refuse')
 d.line([(377.5,141),(377.5,175)]);d.text(385,155,'complete',anchor='start');d.text(385,167,'or partial',anchor='start')
 # Durable work supplies checks and completion; checks produce, rather than equal, review evidence.
 d.line([(345,215),(345,226),(145,226),(145,195),(130,195)])
 d.line([(400,215),(400,238),(250,238),(250,253.07)])
 d.line([(65,215),(65,250)])
 d.text(73,238,'produce',anchor='start')
 d.line([(130,268),(162,268)])
 d.line([(282,268),(315,268)]);d.text(298.5,261,'accept')
 d.line([(222,296),(222,315)]);d.text(228,309,'unresolved',anchor='start')
 d.line([(435,195),(440,195),(440,332),(285,332)])
 d.text(367,325,'interrupted')
 d.box(0,0,130,40,['Work order','scope + declared phase'])
 d.box(160,0,125,40,['Component +','constraint models'])
 d.box(315,0,125,40,['Lifecycle policy +','reconciled phase state'])
 d.box(0,55,130,34,['Bounded context','selection'],True)
 d.text(327,69,'Absence is not DONE.')
 d.box(0,105,130,36,['Brief + selected','context'])
 d.diamond(222,123,120,56,['Dispatch?','authorized?'],heavy=True)
 d.box(315,105,120,36,['Implementing agent','flexible reasoning'],True,True)
 d.box(160,175,125,40,['Refuse assignment','invalid brief; or DONE','without valid override'])
 d.box(315,175,120,40,['Durable work','commits + artifacts'])
 d.box(0,175,130,40,['Independent checks'],True)
 d.box(0,250,130,36,['Review evidence','checks + other findings'])
 d.diamond(222,268,120,56,['Completion?','obligations met?'],heavy=True)
 d.box(315,250,120,36,['Accepted completion','phase state updated'])
 d.box(160,315,125,34,['Inspect / reconcile','before redispatch'],True)
 d.save();return d


def build(): return [deployment(),mutation(),substitution(),delegation(),selection()]
if __name__=="__main__":build()
