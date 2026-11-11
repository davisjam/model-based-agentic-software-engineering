#!/usr/bin/env python3
"""Editable SVG and native TikZ for the author's working-set triptych.

Reflow the supplied three equal panels for full-width book typography. Labels,
bullet wording and connectivity are shared by both vector realizations.
"""
from pathlib import Path
from html import escape
import argparse, subprocess
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
KEY='interlude-execution-unit'
W,H=444,548

def tex(s):
    return ''.join({'&':r'\&','%':r'\%','$':r'\$','#':r'\#','_':r'\_','{':r'\{','}':r'\}','\\':r'\textbackslash{}'}.get(c,c) for c in s)

class Figure:
    def __init__(self):
        self.s=[f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W*3}" height="{H*3}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc"><title id="title">Evolution of DocAble’s document working set</title><desc id="desc">Three equal panels: whole-document execution, page-chunked execution, and skeletonized execution. Chunking partitions execution; skeletonization separates resident structure from externally stored media. Media access and the GenAI connection are distinct.</desc><defs><marker id="arrow" markerWidth="5" markerHeight="5" refX="4.6" refY="2.5" orient="auto-start-reverse" markerUnits="userSpaceOnUse"><path d="M0,0 L5,2.5 L0,5 Z" fill="#222"/></marker></defs><rect width="{W}" height="{H}" fill="white"/><style>text{{font-family:'Source Sans 3','Arial',sans-serif;fill:#171717;}}path,rect{{stroke-linejoin:round;}}</style>''']
        self.t=['% Consolidated working-set triptych; shared SVG/native geometry.\n',r'\begin{tikzpicture}[x=1bp,y=-1bp,>=Stealth]'+'\n',f'\\path[use as bounding box] (0,0) rectangle ({W},{H});\n']
    def text(self,x,y,s,size=10.2,bold=False,anchor='start'):
        self.s.append(f'<text x="{x}" y="{y}" text-anchor="{anchor}" style="font-size:{size}px;'+('font-weight:bold;' if bold else '')+f'">{escape(s)}</text>')
        a={'start':'base west','middle':'base','end':'base east'}[anchor];face=r'\bfseries ' if bold else ''
        self.t.append(f'\\node[anchor={a},inner sep=0pt,font={{{face}\\fontsize{{{size}}}{{{size*1.2:g}}}\\selectfont}}] at ({x},{y}) {{{tex(s)}}};\n')
    def rect(self,x,y,w,h,gray=0,rx=3,stroke=True):
        color=round(255*(1-gray/100));fill=f'#{color:02x}{color:02x}{color:02x}'
        self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{fill}" stroke="'+('#444' if stroke else 'none')+'" stroke-width=".65"/>')
        self.t.append(f'\\path[fill=black!{gray},'+('draw=black!75,line width=.65bp,' if stroke else '')+f'rounded corners={rx}bp] ({x},{y}) rectangle ({x+w},{y+h});\n')
    def line(self,pts,arrow=True,dashed=False,both=False):
        coords=' '.join(('M' if i==0 else 'L')+f'{x},{y}' for i,(x,y) in enumerate(pts))
        self.s.append(f'<path d="{coords}" fill="none" stroke="#222" stroke-width=".8"'+(' stroke-dasharray="3 2"' if dashed else '')+(' marker-end="url(#arrow)"' if arrow else '')+(' marker-start="url(#arrow)"' if both else '')+'/>')
        opt='line width=.8bp'+(',-{Stealth[length=4.5bp,width=3.8bp]}' if arrow and not both else '')+(',{Stealth[length=4.5bp,width=3.8bp]}-{Stealth[length=4.5bp,width=3.8bp]}' if both else '')+(',dash pattern=on 3bp off 2bp' if dashed else '')
        self.t.append('\\draw['+opt+'] '+' -- '.join(f'({x},{y})'for x,y in pts)+';\n')
    def box(self,x,y,w,h,lines,gray=0,bold=False):
        self.rect(x,y,w,h,gray)
        start=y+h/2-(len(lines)-1)*6+3.4
        for i,s in enumerate(lines):self.text(x+w/2,start+i*12,s,10.4,bold,anchor='middle')
    def bullets(self,x,y,items):
        for lines in items:
            self.text(x,y,'•',10.4)
            for i,s in enumerate(lines):self.text(x+10,y+i*12,s,10.2)
            y+=len(lines)*12+5
    def save(self):
        svg='\n'.join(self.s)+'</svg>\n';native=''.join(self.t)+'\\end{tikzpicture}\n'
        (ROOT/f'book/assets/{KEY}.svg').write_text(svg)
        (OUT/f'{KEY}-bw.svg').write_text(svg)
        (ROOT/f'book/tikz/figures/{KEY}.tex').write_text(native)
        return ROOT/f'book/assets/{KEY}.svg'

def build():
    f=Figure()
    # Equal panels; no internal overall heading, which belongs in the caption.
    for x,top,bottom in [(1,'(a) Whole-document','execution'),(151,'(b) Page-chunked','execution'),(301,'(c) Skeletonized','execution')]:
        f.rect(x,1,142,546,0,4)
        f.rect(x+1,2,140,42,4,2,False)
        f.rect(x+1,420,140,126,3,2,False)
        f.text(x+71,18,top,11.2,True,'middle');f.text(x+71,32,bottom,11.2,True,'middle')
    # (a) Whole document; input and output reflowed vertically for type size.
    f.box(38,81,68,26,['Document'])
    f.line([(72,107),(72,151)])
    f.rect(18,152,108,127)
    f.text(72,171,'Worker',11.2,True,'middle')
    f.box(26,183,92,29,['Structure'])
    f.box(26,223,92,42,['Media','(all resident)'],18)
    f.line([(72,279),(72,349)])
    f.box(38,350,68,26,['Output'])
    # (b) Three workers retain chunk structure and media. Shared buses preserve
    # the reference's fan-out and merge without a false inter-worker sequence.
    f.box(190,65,66,26,['Document'])
    f.line([(223,91),(223,104),(163,104),(163,297)],False)
    for y,pages in [(118,'Pages 1–10'),(192,'Pages 11–20'),(266,'Pages 21–30')]:
        f.rect(174,y,108,62)
        f.text(228,y+14,'Worker',11.2,True,'middle');f.text(228,y+27,pages,10.4,anchor='middle')
        f.box(179,y+34,53,22,['Structure'])
        f.box(237,y+34,40,22,['Media'],18)
        f.line([(163,y+31),(174,y+31)])
        f.line([(282,y+31),(291,y+31)],False)
    f.line([(291,149),(291,338),(223,338),(223,348)])
    f.box(192,349,62,24,['Merge'])
    f.line([(223,373),(223,390)])
    f.box(192,391,62,24,['Output'])
    # (c) Residency changes independently of execution partitioning.
    f.box(338,81,68,26,['Document'])
    f.line([(372,107),(372,151)])
    f.rect(319,152,106,113)
    f.text(372,170,'Worker',11.2,True,'middle')
    f.text(372,184,'(skeletonized)',10.4,anchor='middle')
    f.box(326,194,92,25,['Structure'])
    f.box(326,231,92,25,['Media references'],18)
    f.box(307,333,66,43,['GenAI','service'])
    f.box(383,333,53,43,['External','media'],18)
    f.line([(340,265),(340,333)],both=True)
    # Separate, continuous request and return paths replace the broken arrow
    # in the supplied reference. They are media access, not persistent residency.
    f.line([(416,265),(416,333)],dashed=True)
    f.line([(397,333),(397,265)],dashed=True)
    # Exact reference bullet wording; explicit line breaks maintain 10pt+ text.
    f.bullets(8,436,[['One worker retains the','complete document.'],['Structure and all media','are resident.'],['Memory scales with the','document payload.']])
    f.bullets(158,432,[['The document is','partitioned into page','chunks.'],['Each worker retains','the chunk’s structure','and media.'],['A smaller working set','per worker reduces','memory.']])
    f.bullets(308,436,[['The worker retains','structure and media','references.'],['Media is not resident,','but streamed on demand.'],['Media is processed by a','GenAI service.']])
    return f.save()

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--render-dir',type=Path);a=p.parse_args();source=build();print(source)
    if a.render_dir:
        a.render_dir.mkdir(parents=True,exist_ok=True)
        subprocess.run(['rsvg-convert','--width','1600','--output',str(a.render_dir/(KEY+'.png')),str(source)],check=True)
