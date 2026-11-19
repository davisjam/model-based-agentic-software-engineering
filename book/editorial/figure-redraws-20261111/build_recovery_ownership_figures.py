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
    # Compact horizontal path, with the forbidden shortcut below the states.
    # Keep the existing 10.5 pt text; remove internal title, legend and footer.
    f=Figure('recovery-ordering-model','Recovery-Ordering Model',440,94,bw)
    for x,name,detail,col in [(2,'FALLBACK_STAGED','(artifact local)','blue'),(152,'FALLBACK_UPLOADED','(artifact persisted)','blue'),(302,'DB_UPDATED','(DB refers to artifact)','green')]:
        f.rect(x,22,136,34,col)
        f.text(x+68,36,name,10.5,True,anchor='middle')
        f.text(x+68,49,detail,10.5,anchor='middle')
    f.path('M138,39 H151','(138,39) -- (151,39)')
    f.path('M288,39 H301','(288,39) -- (301,39)')
    f.path('M70,56 V70 H370 V57','(70,56) -- (70,70) -- (370,70) -- (370,57)',dashed=True,red=True)
    f.cross(220,70,3.5)
    f.rich(125,88,[('Forbidden:',True),(' update DB before upload',False)],10.5)
    return f.save()

def ownership(bw=False):
    # Keep the four-state row; successful B release returns beneath a separate
    # stale-A callout. Rejected operations are annotations, never transitions.
    f=Figure('in-flight-ownership-states','Ownership Under Contention',444,148,bw)
    for x,w,col in [(15,69,'blue'),(121,72,'blue'),(235,78,'yellow'),(361,72,'blue')]:
        f.rect(x,40,w,38,col)
    f.text(49.5,63,'Unowned',11,anchor='middle')
    for x,who in [(157,'(A, 7)'),(397,'(B, 8)')]:
        f.text(x,55,'Owned',11,True,anchor='middle')
        f.text(x,69,who,11,anchor='middle')
    f.text(274,63,'Reclaimable',11,anchor='middle')
    for a,b in [(84,120),(193,234),(313,360)]:
        f.path(f'M{a},59 H{b}',f'({a},59) -- ({b},59)')
    for x,label in [(103,'claim(A, 7)'),(214,'expire'),(337,'claim(B, 8)')]:
        f.text(x,30,label,11,anchor='middle')
        f.path(f'M{x},34 V55',f'({x},34) -- ({x},55)',False,width=.65)
    f.path('M382,78 L370,87','(382,78) -- (370,87)',False,width=.65)
    f.text(325,98,'release(A, 7): rejected',10.5,anchor='middle',red=True)
    f.text(325,111,'current claim remains (B, 8)',10.5,anchor='middle')
    f.path('M415,78 V123 H49.5 V79','(415,78) -- (415,123) -- (49.5,123) -- (49.5,79)')
    f.text(222,141,'release(B, 8)',11,anchor='middle')
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
