#!/usr/bin/env python3
"""House-style vector redraws of the author's recovery and ownership references.

Native SVG and TikZ share the same authored geometry and text. SVG is intentional
for the precise annotation leaders and forbidden bypasses supplied by the author.
"""
from pathlib import Path
from html import escape
import argparse,re,subprocess
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent

def tex(s):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','~':r'\textasciitilde{}','^':r'\textasciicircum{}','\\':r'\textbackslash{}'}.get(c,c) for c in s)

class Figure:
    def __init__(self,key,title,w,h,bw=False):
        self.key,self.w,self.h,self.bw=key,w,h,bw
        self.s=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w*2}" height="{(h-20)*2}" viewBox="0 0 {w} {h-20}" role="img" aria-labelledby="title desc"><title id="title">{escape(title)}</title><desc id="desc">Author-reference redraw with editable text, explicit states, and permitted and prohibited transitions.</desc><defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5.4" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L6,3 L0,6 Z" fill="#222222"/></marker><marker id="forbidden-arrow" markerWidth="6" markerHeight="6" refX="5.4" refY="3" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L6,3 L0,6 Z" fill="{'#222222' if bw else '#a92020'}"/></marker></defs><rect width="{w}" height="{h-20}" fill="white"/><style>text{{font-family:'Source Sans 3','Arial',sans-serif;fill:#171717;}}path,rect,circle{{stroke-linejoin:round;}}</style><g transform="translate(0,-20)">''']
        self.t=['% Author-reference redraw; geometry and labels generated with the SVG.\n',r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({w},{h-20});\n',r'\begin{scope}[yshift=20bp]'+'\n']
    def text(self,x,y,s,size=10.5,bold=False,italic=False,anchor='start',red=False):
        color='#222222' if self.bw or not red else '#a92020'
        self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="font-size:{size}px;'+('font-weight:bold;' if bold else '')+('font-style:italic;' if italic else '')+f'fill:{color}">{escape(s)}</text>')
        a={'start':'base west','middle':'base','end':'base east'}[anchor]
        face=(r'\bfseries ' if bold else '')+(r'\itshape ' if italic else '')
        self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{{face}\\fontsize{{{size}}}{{{size*1.2:g}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
    def rich(self,x,y,parts,size=10.5):
        self.s.append(f'<text xml:space="preserve" x="{x}" y="{y}" style="font-size:{size}px">'+''.join('<tspan'+(' font-weight="bold"' if bold else '')+'>'+escape(s)+'</tspan>' for s,bold in parts)+'</text>')
        body=''.join(r'\textbf{'+tex(s)+'}' if b else tex(s) for s,b in parts)
        self.t.append(f'\\node[anchor=base west,inner sep=0pt,font=\\fontsize{{{size}}}{{{size*1.2:g}}}\\selectfont] at ({x},{y}) {{{body}}};\n')
    def rect(self,x,y,w,h,color='blue',rx=4):
        colors={'blue':('#d9eaf7','#315f83'),'green':('#e2f3d5','#3e7134'),'yellow':('#fff4cf','#b4871c'),'panel':('#ffffff','#d1d1d1')}
        grays={'blue':('#eeeeee','#444444'),'green':('#e9e9e9','#444444'),'yellow':('#f7f7f7','#444444'),'panel':('#ffffff','#cccccc')}
        fill,stroke=(grays if self.bw else colors)[color]
        self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="0.75"/>')
        g={'blue':7,'green':9,'yellow':3,'panel':0}[color]
        self.t.append(f'\\draw[fill=black!{g},draw=black!{25 if color=="panel" else 75},line width=.65pt,rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
    def circle(self,x,y,r):
        self.s.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="#111111"/>');self.t.append(f'\\fill ({x},{y}) circle ({r}bp);\n')
    def path(self,svg,tikz,arrow=True,dashed=False,red=False,width=1.15):
        color='#222222' if self.bw or not red else '#a92020'
        self.s.append(f'<path d="{svg}" fill="none" stroke="{color}" stroke-width="{width}"'+(' stroke-dasharray="5 3"' if dashed else '')+(f' marker-end="url(#{"forbidden-arrow" if red else "arrow"})"' if arrow else '')+'/>')
        opts=f'line width={width}bp'+(',-{Stealth[length=5.5bp,width=4.5bp]}' if arrow else '')+(',dash pattern=on 5bp off 3bp' if dashed else '')
        self.t.append(f'\\draw[{opts}] {tikz};\n')
    def cross(self,x,y,r=4):
        c='#222222' if self.bw else '#a92020'
        self.s.append(f'<path d="M{x-r},{y-r} L{x+r},{y+r} M{x-r},{y+r} L{x+r},{y-r}" stroke="{c}" stroke-width="2.3"/>')
        self.t.append(f'\\draw[line width=2.3bp] ({x-r},{y-r}) -- ({x+r},{y+r}) ({x-r},{y+r}) -- ({x+r},{y-r});\n')
    def save(self):
        svg='\n'.join(self.s)+'</g></svg>\n'
        path=OUT/(self.key+'-bw.svg') if self.bw else ROOT/'book/assets'/(self.key+'.svg')
        path.write_text(svg)
        if self.bw:(ROOT/'book/tikz/figures'/(self.key+'.tex')).write_text(''.join(self.t)+r'\end{scope}'+'\n'+r'\end{tikzpicture}'+'\n')
        return path

def recovery(bw=False):
    f=Figure('recovery-ordering-model','Recovery-Ordering Model',230,417,bw)
    f.text(115,39,'A state model for publishing',11,italic=True,anchor='middle')
    f.text(115,52,'a recovered artifact.',11,italic=True,anchor='middle')
    f.circle(77.5,70,5.3)
    f.path('M77.5,75.3 V90','(77.5,75.3) -- (77.5,90)')
    for y,name,detail,col in [(91,'FALLBACK_STAGED','(artifact exists locally)','blue'),(174,'FALLBACK_UPLOADED','(artifact durably stored)','blue'),(257,'DB_UPDATED','(database refers to artifact)','green')]:
        f.rect(5,y,145,42,col)
        f.text(77.5,y+17,name,10.5,True,anchor='middle');f.text(77.5,y+31,detail,10.5,anchor='middle')
    f.path('M77.5,133 V173','(77.5,133) -- (77.5,173)')
    f.path('M77.5,216 V256','(77.5,216) -- (77.5,256)')
    f.path('M150,112 C166,112 166,260 150,278','(150,112) .. controls (166,112) and (166,260) .. (150,278)',dashed=True,red=True)
    f.cross(162,194)
    for i,s in enumerate(['Forbidden:','update DB','before','upload']):f.text(171,174+i*13,s,10.3,bold=(i==0),red=True)
    f.path('M26,325 H64','(26,325) -- (64,325)')
    f.text(73,328,'Permitted transition',10.5)
    f.path('M26,346 H64','(26,346) -- (64,346)',dashed=True,red=True);f.cross(47,346,3.2)
    f.text(73,349,'Prohibited transition',10.5)
    for i,s in enumerate(['The artifact must be published','(durably stored) before the database','may refer to it.']):f.text(115,378+i*13,s,10.5,italic=True,anchor='middle')
    return f.save()

def ownership(bw=False):
    f=Figure('in-flight-ownership-states','Ownership Under Contention',444,412,bw)
    f.text(222,39,'A behavioral model for job ownership with generations.',11,italic=True,anchor='middle')
    for x,w,col in [(15,69,'blue'),(121,72,'blue'),(235,78,'yellow'),(361,72,'blue')]:f.rect(x,90,w,38,col)
    f.text(49.5,113,'Unowned',11,anchor='middle')
    for x,who in [(157,'(A, 7)'),(397,'(B, 8)')]:
        f.text(x,105,'Owned',11,True,anchor='middle');f.text(x,119,who,11,anchor='middle')
    f.text(274,113,'Reclaimable',11,anchor='middle')
    for sv,tz in [('M84,105 C96,100 109,100 120,104','(84,105) .. controls (96,100) and (109,100) .. (120,104)'),('M193,104 C207,102 220,102 234,104','(193,104) .. controls (207,102) and (220,102) .. (234,104)'),('M313,104 C329,102 345,102 360,104','(313,104) .. controls (329,102) and (345,102) .. (360,104)')]:f.path(sv,tz)
    for x,s in [(103,'claim(A, 7)'),(214,'expire'),(337,'claim(B, 8)')]:
        f.text(x,74,s,11,anchor='middle');f.path(f'M{x},80 Q{x+2},91 {x},102',f'({x},80) .. controls ({x+2},91) .. ({x},102)',False,width=.65)
    f.path('M157,128 C174,155 207,156 272,156 C327,156 358,149 375,129','(157,128) .. controls (174,155) and (207,156) .. (272,156) .. controls (327,156) and (358,149) .. (375,129)',dashed=True,red=True)
    f.cross(188,151,4)
    f.text(258,174,'release(A, 7) (rejected: stale generation)',10.5,anchor='middle',red=True)
    f.path('M397,128 C397,242 49.5,242 49.5,129','(397,128) .. controls (397,242) and (49.5,242) .. (49.5,129)')
    f.text(226,230,'release(B, 8)',11,anchor='middle')
    f.rect(10,250,424,132,'panel',rx=6)
    f.text(21,267,'State meaning',11.5,True);f.text(240,267,'Key transitions',11.5,True)
    f.path('M226,265 V373','(226,265) -- (226,373)',False,width=.65)
    f.rect(21,279,23,13,rx=3);f.rich(52,289,[('Unowned',True),(' — no active claim',False)])
    f.rect(21,308,23,13,rx=3);f.rich(52,318,[('Owned(w, g)',True),(' — job held by worker w',False)],10)
    f.text(52,331,'with generation g',10.5)
    f.rect(21,344,23,13,'yellow',rx=3);f.rich(52,354,[('Reclaimable',True),(' — previous claim',False)],10)
    f.text(52,367,'expired, job can be claimed',10.5)
    f.text(242,289,'•',10.5);f.rich(252,289,[('claim(w, g):',True),(' acquire the job with',False)],10)
    f.text(252,302,'generation g',10.5)
    f.text(242,323,'•',10.5);f.rich(252,323,[('expire:',True),(' previous claim',False)],10)
    f.text(252,336,'becomes invalid',10.5)
    f.text(242,354,'•',10.5);f.rich(252,354,[('release(w, g):',True),(' release only if',False)],10)
    f.text(252,367,'the current claim matches (w, g)',10.5)
    f.text(222,400,'A release may modify a job only if it still holds the current generation.',10.5,italic=True,anchor='middle')
    return f.save()

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--render-dir',type=Path);a=p.parse_args()
    paths=[fn(bw) for fn in [recovery,ownership] for bw in [False,True]]
    if a.render_dir:
        a.render_dir.mkdir(parents=True,exist_ok=True)
        for path in paths:
            subprocess.run(['rsvg-convert','--width','1400','--output',str(a.render_dir/(path.stem+'.png')),str(path)],check=True)
    for path in paths:print(path)
if __name__=='__main__':main()
