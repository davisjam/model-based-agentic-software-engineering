#!/usr/bin/env python3
"""Paired SVG/TikZ recovery triptych using one explicit geometry.

Compress vertical spacing at native print size; retain all labels and edge meanings.
"""
from pathlib import Path
from html import escape
import argparse
OUTPUT_DIR=None

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
  root=Path(__file__).resolve().parents[3] if OUTPUT_DIR is None else None
  svg_path=(root/f'book/assets/{self.key}.svg') if OUTPUT_DIR is None else OUTPUT_DIR/f'{self.key}.svg'
  tex_path=(root/f'book/tikz/figures/{self.key}.tex') if OUTPUT_DIR is None else OUTPUT_DIR/f'{self.key}.tex'
  svg_path.write_text('\n'.join(self.s)+'</svg>\n')
  tex_path.write_text(''.join(self.t)+'\\end{tikzpicture}\n')

def build():
 d=Drawing('recovering-and-extending-governance','Recovering and extending governance in an existing system','Three complementary practices for an existing system. Recover models by distinguishing legitimate implementation patterns, latent concepts worth representing, and mechanical cleanup. Active alignment changes implementation until obligations hold; passive alignment checks subsequent changes against the retained models. Expand the alignment kernel incrementally while protecting established obligations.',w=444,h=184)
 d.text(73,13,'(a) Recover models',bold=True)
 d.text(222,13,'(b) Establish alignment',bold=True)
 d.text(373,13,'(c) Expand governance',bold=True)
 d.line([(148,25),(148,184)],arrow=False)
 d.line([(297,25),(297,184)],arrow=False)
 # A: classify findings before selecting the appropriate remedy.
 d.line([(74,49),(74,61)])
 d.line([(24,72),(10,72),(10,167)],arrow=False)
 for y in (101,134,167):d.line([(10,y),(24,y)])
 d.box(5,23,138,26,['Implementation patterns','+ engineering knowledge'])
 d.box(24,61,112,22,['Classify findings'],activity=True)
 d.box(24,88,112,26,['Legitimate patterns','retain / exempt'])
 d.box(24,121,112,26,['Latent concepts','represent explicitly'],gray=True)
 d.box(24,154,112,26,['Mechanical cleanup','local fix / codemod'])
 # B: establish alignment, then retain checks for later changes.
 d.line([(222,49),(222,61)])
 d.line([(280,83),(289,83),(289,118),(270,118),(270,105)])
 d.text(263,118,'repeat',anchor='end')
 d.line([(222,105),(222,136)])
 d.text(214,117,'once aligned',anchor='end')
 d.text(214,129,'retain checks',anchor='end')
 d.box(164,23,116,26,['Models + obligations'],gray=True)
 d.rect(164,61,116,44,rx=3)
 d.text(222,73,'Active alignment',bold=True)
 d.text(222,87,'Modify and evaluate')
 d.text(222,99,'until obligations hold')
 d.rect(164,136,116,44,rx=3)
 d.text(222,149,'Passive alignment',bold=True)
 d.text(222,163,'Check later changes')
 d.text(222,175,'admit or reject')
 # C: later layers retain the kernel's established obligations.
 for radius,shade in [(58,False),(40,False),(18,True)]:
  d.s.append(f'<circle cx="372" cy="98" r="{radius}" fill="'+('#eaeaea' if shade else 'white')+'" stroke="black" stroke-width=".8"/>')
  d.t.append(f'\\path[draw,fill='+('black!8' if shade else 'white')+f',line width=.8bp] (372,98) circle[radius={radius}bp];\n')
 d.text(372,56,'New models')
 d.text(372,78,'Prior models')
 d.text(372,102,'Kernel',bold=True)
 d.text(372,168,'Expand under')
 d.text(372,180,'existing constraints.')
 d.save();return d
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--output-dir',type=Path,default=OUTPUT_DIR)
 args=parser.parse_args()
 OUTPUT_DIR=args.output_dir
 if OUTPUT_DIR is not None: OUTPUT_DIR.mkdir(parents=True,exist_ok=True)
 build()
