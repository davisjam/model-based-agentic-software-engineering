#!/usr/bin/env python3
"""Editable SVG recreations of the author's supplied Figures 2.9 and 2.10.

Hand-authored SVG is intentional: the request requires the supplied typography,
annotation leaders, diagram geometry and text verbatim, not automatic relayout.
No raster is embedded. Only the optional proof rendering requires rsvg-convert.
"""
from pathlib import Path
from html import escape
import argparse
import subprocess
import re

OUT = Path(__file__).resolve().parent
W, H = 782, 800

class Figure:
    def __init__(self, number, title, subtitle, bw=False):
        self.bw = bw
        self.parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-labelledby="title desc">
<title id="title">Figure {number}: {escape(title)}</title>
<desc id="desc">Editable vector recreation of the author-supplied reference. {escape(subtitle)}</desc>
<defs>
  <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 Z" fill="#282828"/></marker>
  <marker id="brown-arrow" markerWidth="12" markerHeight="10" refX="11" refY="5" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L12,5 L0,10 Z" fill="{'#444444' if bw else '#83472b'}"/></marker>
  <linearGradient id="header" x2="0" y2="1"><stop stop-color="{'#e7e7e7' if bw else '#e9ebf3'}"/><stop offset="1" stop-color="{'#efefef' if bw else '#e1e6f1'}"/></linearGradient>
  <linearGradient id="blue" x2="0" y2="1"><stop stop-color="{'#eeeeee' if bw else '#e2eef8'}"/><stop offset="1" stop-color="{'#d7d7d7' if bw else '#cfe3f5'}"/></linearGradient>
  <linearGradient id="purple" x2="0" y2="1"><stop stop-color="{'#f4f4f4' if bw else '#f1eaf4'}"/><stop offset="1" stop-color="{'#e6e6e6' if bw else '#e5ddea'}"/></linearGradient>
  <linearGradient id="green" x2="0" y2="1"><stop stop-color="{'#f1f1f1' if bw else '#edf9df'}"/><stop offset="1" stop-color="{'#e1e1e1' if bw else '#e0f3d3'}"/></linearGradient>
  <linearGradient id="yellow" x2="0" y2="1"><stop stop-color="{'#fafafa' if bw else '#fff9db'}"/><stop offset="1" stop-color="{'#ececec' if bw else '#fff0bf'}"/></linearGradient>
  <linearGradient id="red" x2="0" y2="1"><stop stop-color="{'#eeeeee' if bw else '#ffe8e5'}"/><stop offset="1" stop-color="{'#d8d8d8' if bw else '#ffd6d1'}"/></linearGradient>
</defs>
<style>text {{ font-family: 'Times New Roman', Times, 'Liberation Serif', serif; fill:#111; font-size:19px; }} .edge {{ fill:none; stroke:#282828; stroke-width:2.25; marker-end:url(#arrow); }} .leader {{ fill:none; stroke:#333; stroke-width:1.25; }} .bold {{ font-weight:bold; }}</style>
<rect width="782" height="800" fill="white"/>
<rect x="0.75" y="14.5" width="779.5" height="784.5" rx="20" fill="white" stroke="#aeb1ba" stroke-width="1.2"/>
<path d="M21,15 H760 Q780,15 780,35 V69 H1 V35 Q1,15 21,15 Z" fill="url(#header)"/>
''']
        self.text(34, 50, f'Figure {number}   {title}', size=29, bold=True)
        self.text(34, 95, subtitle, size=21.5, italic=True)
    def add(self,s): self.parts.append(s)
    def text(self,x,y,content,size=19,bold=False,italic=False,anchor=None):
        attrs=f'x="{x}" y="{y}" font-size="{size}"'
        # Use inline style so the shared default does not override authored sizes.
        attrs+=f' style="font-size:{size}px;'+('font-weight:bold;' if bold else '')+('font-style:italic;' if italic else '')+'"'
        if anchor:attrs+=f' text-anchor="{anchor}"'
        self.add(f'<text {attrs}>{escape(content)}</text>')
    def rich(self,x,y,parts,size=19,anchor=None,italic=False):
        attrs=f'x="{x}" y="{y}" style="font-size:{size}px;'+('font-style:italic;' if italic else '')+'"'
        if anchor:attrs+=f' text-anchor="{anchor}"'
        body=''.join('<tspan'+(' font-weight="bold"' if part[1] else '')+(' font-style="italic"' if len(part)>2 and part[2]=='italic' else '')+'>'+escape(part[0])+'</tspan>' for part in parts)
        self.add(f'<text xml:space="preserve" {attrs}>{body}</text>')
    def lines(self,x,y,lines,leading=20,size=19,italic=False):
        for i,t in enumerate(lines):self.text(x,y+i*leading,t,size=size,italic=italic)
    def rect(self,x,y,w,h,color='blue',rx=14,stroke=None):
        colors={'blue':'#30556f','purple':'#6b4a6a','green':'#3b6537','yellow':'#b7831b','red':'#8b4240'}
        stroke=stroke or ('#444' if self.bw else colors[color])
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="url(#{color})" stroke="{stroke}" stroke-width="1.6"/>')
    def diamond(self,cx,cy,w,h):
        l,r,t,b=cx-w/2,cx+w/2,cy-h/2,cy+h/2
        # Rounded diamond: quadratic corners match the supplied reference.
        a=min(8,w*.075,h*.125)
        d=f'M{cx-a},{t+a/2} Q{cx},{t} {cx+a},{t+a/2} L{r-a},{cy-a} Q{r+2},{cy} {r-a},{cy+a} L{cx+a},{b-a/2} Q{cx},{b} {cx-a},{b-a/2} L{l+a},{cy+a} Q{l-2},{cy} {l+a},{cy-a} Z'
        self.add(f'<path d="{d}" fill="url(#purple)" stroke="{"#555" if self.bw else "#6b4a6a"}" stroke-width="1.6"/>')
    def edge(self,d,dashed=False,marker='arrow'):
        self.add(f'<path d="{d}" class="edge"'+(' stroke-dasharray="9 6"' if dashed else '')+f' style="marker-end:url(#{marker})"/>')
    def leader(self,d,x,y):
        self.add(f'<path d="{d}" class="leader"/><circle cx="{x}" cy="{y}" r="3.5" fill="#303030"/>')
    def save(self,name):
        p=OUT/(name+('-bw' if self.bw else '-color')+'.svg')
        svg=''.join(self.parts)+'</svg>\n'
        if self.bw:
            def gray(match):
                h=match.group()[1:];h=''.join(c*2 for c in h) if len(h)==3 else h
                v=round(sum(int(h[i:i+2],16)*w for i,w in zip((0,2,4),(.2126,.7152,.0722))))
                return '#'+f'{v:02x}'*3
            svg=re.sub(r'#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b',gray,svg)
        p.write_text(svg,encoding='utf-8');return p


def figure29(bw=False):
    f=Figure('2.9','Remediation Graph (Typed)','A typed, structural view of DocAble’s remediation computations.',bw)
    f.rect(289,126,191,58)
    f.text(384.5,150,'Classify',size=20,bold=True,anchor='middle')
    f.text(384.5,172,'(format, needs)',size=20,anchor='middle')
    f.edge('M386,184 V211 Q386,223 374,223 H286 Q274,223 274,236 V252',True)
    f.edge('M386,184 V211 Q386,223 398,223 H490 Q502,223 502,236 V252',True)
    f.diamond(274,306,190,108);f.diamond(502,306,190,108)
    for cx,word in [(274,'structure'),(502,'metadata')]:
        f.text(cx,290,'Repair',size=20,bold=True,anchor='middle')
        f.text(cx,311,word,size=20,bold=True,anchor='middle')
        f.text(cx,332,'(typed patch)',size=19,anchor='middle')
    f.edge('M274,358 V372 Q274,384 286,384 H331 Q343,384 343,396 V412')
    f.edge('M502,358 V372 Q502,384 490,384 H446 Q434,384 434,396 V412')
    f.rect(281,414,211,56)
    f.text(386.5,438,'Apply patches',size=20,bold=True,anchor='middle')
    f.text(386.5,459,'(apply seam)',size=20,anchor='middle')
    f.edge('M386.5,470 V507')
    f.rect(281,509,211,61,'green')
    f.text(386.5,535,'Validate',size=20,bold=True,anchor='middle')
    f.text(386.5,557,'(direct edit)',size=20,anchor='middle')
    f.text(56,149,'Computation:',bold=True)
    f.lines(56,169,['a registered','remediation step','(e.g., classify, repair,','validate).'])
    f.leader('M204,173 L282,156',282,156)
    f.text(578,168,'Control gate:',bold=True)
    f.lines(578,188,['classification determines','which repairs run.'])
    f.leader('M566,182 Q542,206 518,250',518,250)
    f.text(69,368,'Data flow:',bold=True)
    f.lines(69,389,['produces','information','used by another','computation.'])
    f.leader('M184,398 L274,425',274,425)
    f.text(590,357,'Mutation behavior:',bold=True)
    f.add('<path d="M602,369 L607,374 L602,379 L597,374 Z" fill="none" stroke="#222" stroke-width="1.6"/>')
    f.lines(622,381,['typed patch —','produces a patch'])
    f.add('<rect x="598" y="413" width="9" height="9" fill="none" stroke="#222" stroke-width="1.5"/>')
    f.lines(622,424,['direct edit —','mutates document'])
    f.leader('M579,382 L498,426',498,426)
    f.text(590,480,'Apply seam:',bold=True)
    f.lines(590,501,['where patches are','applied to the document.'])
    f.leader('M579,499 L498,460',498,460)
    f.add(f'<rect x="25" y="584" width="734" height="112" rx="16" fill="{"#f5f5f5" if bw else "#f6f7fb"}" stroke="#e1e2e8" stroke-width="1.1"/>')
    f.text(46,608,'Node (computation) type',size=19,bold=True)
    f.text(400,608,'Dependency (edge) type',size=19,bold=True)
    f.add('<path d="M376,608 V683" stroke="#b9bbc4" stroke-width="1.2"/>')
    f.rect(47,623,42,23,rx=5)
    f.text(101,639,'= Direct edit (mutates document)',size=17.5)
    f.diamond(68,669,43,31)
    f.text(101,674,'= Typed patch (produces a patch)',size=17.5)
    f.edge('M401,633 H445')
    f.text(455,639,'= Data flow (payload)',size=17.5)
    f.edge('M401,668 H445',True)
    f.text(455,674,'= Control gate (executes if condition holds)',size=17.5)
    f.parts[-1]=f.parts[-1].replace('<text ', '<text textLength="297" lengthAdjust="spacingAndGlyphs" ',1)
    f.add(f'<rect x="12" y="706" width="758" height="85" rx="15" fill="{"#f7f7f7" if bw else "#fffbed"}"/>')
    f.rich(390,732,[('125',True),(' registered computations; ',False),('57',True),(' typed composition relations.',False)],size=22,anchor='middle')
    f.lines(390,759,['The graph preserves computation identity, mutation behavior, apply seams, and','declared dependencies—not the code implementing each computation.'],size=20,leading=22,italic=True)
    # Center both footer lines while preserving ordinary editable text.
    for i in range(len(f.parts)-2,len(f.parts)):
        f.parts[i]=f.parts[i].replace('<text ','<text text-anchor="middle" ',1)
    return f.save('figure-2-9-reference')


def figure210(bw=False):
    f=Figure('2.10','Job Execution with Retries','A state model for a remediation job, including retries.',bw)
    f.add('<circle cx="56" cy="249" r="9" fill="#292929" stroke="#111" stroke-width="1"/>')
    f.edge('M65,249 H104')
    f.rect(105,223,127,52,stroke='#484c53')
    f.text(168.5,254,'Pending',size=20,anchor='middle')
    f.edge('M232,249 L299,248',marker='brown-arrow')
    f.rect(300,222,135,52)
    f.text(367.5,253,'Running',size=20,anchor='middle')
    f.edge('M435,248 L522,249')
    f.rect(523,223,150,54,'green')
    f.text(598,255,'Succeeded',size=20,anchor='middle')
    f.edge('M367.5,274 V337')
    f.edge('M295,379 C265,360 266,307 304,273')
    f.edge('M442,374 C482,354 466,303 433,273')
    f.rect(295,339,147,64,'yellow')
    f.text(368.5,366,'Retrying',size=20,bold=True,anchor='middle')
    f.rich(368.5,387,[('(attempt = ',False),('n',False,'italic'),(')',False)],size=20,anchor='middle')
    f.edge('M368.5,403 V450')
    f.rect(295,452,147,53,'red')
    f.text(368.5,484,'Failed',size=20,anchor='middle')
    f.lines(242,150,['A worker executes the','next computation for the job.'])
    f.leader('M361,178 L366,216',366,216)
    f.add('<circle cx="361" cy="178" r="2.3" fill="#303030"/>')
    f.lines(630,143,['Job completes','with a corrected','document.'])
    f.leader('M619,164 Q602,183 595,216',595,216)
    f.text(528,345,'On a repairable failure,')
    f.rich(528,365,[('retry (up to a limit, e.g., ',False),('n',False,'italic'),(' ≤ 3).',False)])
    f.leader('M517,344 L463,363',463,363)
    f.lines(528,457,['If retries are exhausted','or the error is not repairable,','the job fails.'])
    f.leader('M517,457 L449,478',449,478)
    f.add('<rect x="25" y="542" width="729" height="214" rx="16" fill="white" stroke="#cfd1d7" stroke-width="1.3"/>')
    f.text(48,570,'State meaning',size=22,bold=True)
    f.text(484,570,'Key properties (examples)',size=22,bold=True)
    f.add('<path d="M457,570 V738" stroke="#9da0a8" stroke-width="1.3"/>')
    states=[('Pending','accepted, not yet running','blue'),('Running','executing a computation','blue'),('Retrying','will re-execute after a failure','yellow'),('Succeeded','completed successfully','green'),('Failed','terminated with an error','red')]
    for i,(name,meaning,color) in enumerate(states):
        y=601+i*32
        f.rect(49,y-15,41,21,color,rx=5)
        f.rich(103,y,[(name,True),(' — '+meaning,False)],size=19)
    f.text(490,601,'•',size=20);f.rich(510,601,[('At most ',False),('N',False,'italic'),(' retry attempts',False)],size=19)
    f.rich(510,622,[('(e.g., ',False),('N',False,'italic'),(' = 3).',False)],size=19)
    f.text(490,653,'•',size=20);f.text(510,653,'A job eventually reaches',size=19)
    f.text(510,674,'Succeeded or Failed.',size=20)
    f.text(490,706,'•',size=20);f.text(510,706,'Only one worker actively',size=19)
    f.text(510,727,'executes the job at a time.',size=19)
    return f.save('figure-2-10-reference')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--render-dir',type=Path,help='Optional PNG/PDF proof directory (not canonical book assets).')
    args=parser.parse_args()
    outputs=[fn(bw) for fn in [figure29,figure210] for bw in [False,True]]
    if args.render_dir:
        args.render_dir.mkdir(parents=True,exist_ok=True)
        for p in outputs:
            subprocess.run(['rsvg-convert','--width','1564','--output',str(args.render_dir/(p.stem+'.png')),str(p)],check=True)
            subprocess.run(['rsvg-convert','--format','pdf','--output',str(args.render_dir/(p.stem+'.pdf')),str(p)],check=True)
    for p in outputs:print(p)

if __name__=='__main__':main()
