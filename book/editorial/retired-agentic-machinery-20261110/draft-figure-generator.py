from pathlib import Path
import html, json
OUT=Path('/private/tmp/mage14-20261110/figure')
items=[]
def rect(x,y,w,h,fill=0,stroke=.65,r=3):items.append(dict(kind='rect',x=x,y=y,w=w,h=h,fill=fill,stroke=stroke,r=r))
def text(x,y,lines,size=10.5,bold=False,italic=False,anchor='middle',rotate=0):
 if isinstance(lines,str):lines=[lines]
 items.append(dict(kind='text',x=x,y=y,lines=lines,size=size,bold=bold,italic=italic,anchor=anchor,rotate=rotate))
def edge(points,width=.7,dash=False):items.append(dict(kind='edge',points=points,width=width,dash=dash))
# Main teaching regions. The environment gets the heavy border; ordinary subpanels stay white.
rect(0,0,420,100,fill=5,stroke=.55)
rect(0,122,420,205,fill=0,stroke=.85)
rect(0,403,420,110,fill=5,stroke=1.25)
# A: development is a causal chain, distinct from a deployment's inference-time surroundings.
text(10,13,'MODEL DEVELOPMENT',11.5,True,anchor='start')
text(10,28,'General-purpose capabilities acquired through training',10,anchor='start')
rect(10,39,166,53);rect(192,39,98,53);rect(306,39,104,53)
text(93,49,'Training data',10.5,True)
text(93,73,['Open-source code','Other text and code','Additional training data'],10)
text(241,65,['Pretraining and','post-training'],10.5)
text(358,65,['Foundation model','(trained weights)'],10.5)
edge([(176,65),(192,65)]);edge([(290,65),(306,65)])
# B: one agent consists of a deployed foundation model plus a harness.
rect(10,150,273,166,stroke=.55);rect(294,150,116,166,stroke=.55)
text(210,135,'AGENTIC MACHINERY — THE ACTING AGENT',11.5,True)
text(146.5,161,'FOUNDATION MODEL',10.8,True)
text(82,176,'Property',9.5,italic=True)
text(226,176,'Engineering implication',9.5,italic=True)
text(352,163,'AGENTIC HARNESS',10.8,True)
properties=[(['Broad semantic','reasoning'],['Delegated','implementation']),(['Probabilistic output'],['Independent','assurance']),(['Bounded working','state'],['External','representations']),(['Inexpensive repeated','reasoning'],['Scalable','governance'])]
harness=[['Tool-mediated','action'],['Context','management'],['Interposition'],['Parallel','execution']]
for cy,(prop,imp),cap in zip([198,232,266,300],properties,harness):
 text(82,cy,prop,10.5);edge([(151,cy),(170,cy)],.5);text(226,cy,imp,10.5);text(352,cy,cap,10.5)
# Put the training-to-inference connection in the clear left port of the model.
edge([(358,92),(358,111),(25,111),(25,150)],.7)
# C: The codebase is the object being changed, not only material placed in context.
text(10,416,'ENGINEERED ENVIRONMENT',11.5,True,anchor='start')
text(106,436,'Existing system',10.8,True)
text(106,448,'System being changed',9.5,italic=True)
text(315,436,'Engineering structure',10.8,True)
for cy,label in zip([461,474,487,500],['Codebase','Architecture and design','Documentation and configuration','Tests and operational state']):text(106,cy,label,10.2)
for cy,label in zip([454,470,486,502],['Models and obligations','Instructions and procedures','Tools and permissions','Evidence and controls']):text(315,cy,label,10.5)
# Distinct interactions. Each label sits beside its connector, never over the shaft.
edge([(35,327),(35,403)],.7)
text(94,363,['Actions and','changes'],10)
edge([(160,403),(160,327)],.7)
text(220,363,['Guidance','Supplies system','knowledge; influences','reasoning'],9.5)
edge([(290,403),(290,327)],.85)
text(358,363,['Governance','Constrains actions;','controls acceptance','of selected results'],9.5)
# External engineer: a short principal connection and a lighter optional weight-changing route.
rect(310,527,80,24,stroke=.8)
text(350,539,'Engineer',10.8,True)
edge([(350,527),(350,513)],1.0)
text(337,520,'Engineers and maintains',10.5,anchor='end')
edge([(390,539),(440,539),(440,65),(420,65)],.5,True)
text(430,238,['Model training or fine-tuning (when available)'],9.5,rotate=90)
# One explicit content/geometry scene produces both editable formats.
(OUT/'agentic-substrate.scene.json').write_text(json.dumps(items,indent=2)+'\n')
def esc(s):
 for old,new in [('\\',r'\textbackslash{}'),('&',r'\&'),('%',r'\%'),('_',r'\_'),('#',r'\#')]:s=s.replace(old,new)
 return s
tex=[r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth,font=\fontsize{10.5}{12.5}\selectfont]']
for it in items:
 k=it['kind']
 if k=='rect':
  tex.append(r'\draw[draw=black,line width='+str(it['stroke'])+r'pt,rounded corners='+str(it['r'])+r'pt,fill=black!'+str(it['fill'])+'] ('+str(it['x'])+','+str(it['y'])+') rectangle ('+str(it['x']+it['w'])+','+str(it['y']+it['h'])+');')
 elif k=='edge':
  tex.append(r'\draw[-Stealth,line width='+str(it['width'])+r'pt'+(',dashed,black!60' if it['dash'] else '')+'] '+' -- '.join('('+str(x)+','+str(y)+')' for x,y in it['points'])+';')
 else:
  font=(r'\bfseries' if it['bold'] else '')+(r'\itshape' if it['italic'] else '')+r'\fontsize{'+str(it['size'])+'}{'+str(it['size']+2)+'}'+r'\selectfont'
  opts=['inner sep=0pt','outer sep=0pt','align=center' if it['anchor']=='middle' else 'align=left','anchor='+({'middle':'center','start':'west','end':'east'}[it['anchor']]),'font='+font]
  if it['rotate']:opts.append('rotate='+str(it['rotate']))
  tex.append(r'\node['+','.join(opts)+'] at ('+str(it['x'])+','+str(it['y'])+') {'+r'\\'.join(esc(s) for s in it['lines'])+'};')
tex.append(r'\end{tikzpicture}')
(OUT/'agentic-substrate.tex').write_text('\n'.join(tex)+'\n')
svg=['<svg xmlns="http://www.w3.org/2000/svg" width="446" height="557" viewBox="-3 -3 446 557" role="img" aria-labelledby="title desc">','<title id="title">Commodity intelligence and its engineered environment</title>','<desc id="desc">Training data, including open-source code and other data, is used in pretraining and post-training to produce foundation-model weights. A deployed model provides four properties, each paired with an engineering implication, while the harness supplies tool action, context management, interposition and parallel execution. The agent changes an existing system. The engineered environment supplies guidance and governs selected actions and results. The engineer principally engineers and maintains that environment, with training or fine-tuning shown as an optional route.</desc>','<rect x="-3" y="-3" width="446" height="557" fill="white"/>','<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"/></marker></defs>','<style>text{font-family:"Source Sans 3",Arial,sans-serif;fill:#000}.edge{fill:none;stroke:#000;marker-end:url(#arrow);stroke-linejoin:miter}</style>']
for it in items:
 k=it['kind']
 if k=='rect':
  gray=round(255*(1-it['fill']/100));svg.append(f'<rect x="{it["x"]}" y="{it["y"]}" width="{it["w"]}" height="{it["h"]}" rx="{it["r"]}" fill="rgb({gray},{gray},{gray})" stroke="#000" stroke-width="{it["stroke"]}"/>')
 elif k=='edge':
  attrs=f' stroke-width="{it["width"]}"'+(' stroke-dasharray="3 2" style="stroke:#666"' if it['dash'] else '')
  svg.append('<path class="edge" d="'+' '.join(('M' if i==0 else 'L')+f' {x} {y}' for i,(x,y) in enumerate(it['points']))+'"'+attrs+'/>')
 else:
  # Emit individual line elements so text remains editable and the source audit does not concatenate wrapped words.
  lineh=it['size']+2;y0=it['y']-(len(it['lines'])-1)*lineh/2+it['size']*.33
  for i,line in enumerate(it['lines']):
   attrs=f'x="{it["x"]}" y="{y0+i*lineh}" font-size="{it["size"]}" text-anchor="{it["anchor"]}"'
   if it['bold']:attrs+=' font-weight="700"'
   if it['italic']:attrs+=' font-style="italic"'
   if it['rotate']:attrs+=f' transform="translate({it["x"]} {it["y"]}) rotate({-it["rotate"]}) translate({-it["x"]} {-it["y"]})"'
   svg.append('<text '+attrs+'>'+html.escape(line)+'</text>')
svg.append('</svg>');(OUT/'agentic-substrate.svg').write_text('\n'.join(svg)+'\n')
