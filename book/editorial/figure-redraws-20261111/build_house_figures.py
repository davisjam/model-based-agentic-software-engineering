#!/usr/bin/env python3
"""Book-style revision of archived author reference figures (2026-11-11).

Preserve topology and requested words; SVG remains editable. The original
reference builder and artifacts are retained unchanged alongside this revision.
"""
from pathlib import Path
import xml.etree.ElementTree as ET
import re
import build_reference_figures as reference

OUT = Path(__file__).resolve().parent
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
def name(e): return e.tag.rsplit('}', 1)[-1]
def content(e): return ''.join(e.itertext())
def text(x,y,words,size=19,bold=False,italic=False):
    e=ET.Element('{'+NS+'}text', {'x':str(x),'y':str(y),'style':f'font-size:{size}px;'+('font-weight:bold;' if bold else '')+('font-style:italic;' if italic else '')})
    e.text=words
    return e


def correct_mutation_categories(root, bw):
    """Distinguish report-only computations from mutation; keep seam orthogonal.

    Grounding: system-models/remediation_graph.py MutationKind.READ_ONLY and
    PdfAltTextSpecificityCritiquePass (ReadOnly, report-only). This teaching
    fragment shows three behaviors, not every registry category or runtime path.
    """
    for e in list(root):
        tag=name(e);t=content(e)
        if tag=='rect' and (e.get('x'),e.get('y')) in [('289','126'),('281','509')]:
            x,y,w,h=[float(e.get(k)) for k in ('x','y','width','height')]
            ellipse=ET.Element('{'+NS+'}ellipse',{'cx':str(x+w/2),'cy':str(y+h/2),'rx':str(w/2),'ry':str(h/2),'fill':'white','stroke':'#333','stroke-width':'1.2'})
            root.insert(list(root).index(e),ellipse);root.remove(e);continue
        if tag=='text' and t=='Validate':e.text='Check alt-text'
        if tag=='text' and t=='(direct edit)':e.text='(read-only)'
        if tag=='text' and t=='(apply seam)':e.text='(direct edit)'
        if tag=='text' and t=='validate).':e.text='check).'
        # Reflow the mutation annotation into three indented bullets.
        if tag=='text' and (e.get('x') in ['590','606']) and 350<=float(e.get('y','0'))<=444:
            root.remove(e);continue
        if tag=='path' and e.get('d')=='M579,382 L498,426':root.remove(e);continue
        if tag=='rect' and e.get('y')=='584':e.set('height','168')
        if tag=='path' and e.get('d')=='M376,608 V683':e.set('d','M376,608 V735')
        # Make room for the third legend entry, without shrinking type.
        if tag in ['rect','text'] and float(e.get('y','0'))>=726:
            e.set('y',str(float(e.get('y'))+36))
    root.append(text(600,327,'Mutation behavior:',18.5,True))
    for y,first,second in [(350,'typed patch —','produces a patch'),(392,'direct edit —','edits document'),(434,'read-only —','no document edits')]:
        root.append(text(600,y,'•',18.5))
        root.append(text(616,y,first,18.5))
        root.append(text(616,y+20,second,18.5))
    root.append(ET.Element('{'+NS+'}ellipse',{'cx':'68','cy':'710','rx':'21','ry':'11.5','fill':'white','stroke':'#333','stroke-width':'1.2'}))
    root.append(text(101,715,'= Read-only (no document edits)',17.5))
    root.set('height','786');root.set('viewBox','0 70 782 786')
    for e in root:
        if name(e)=='rect' and e.get('x')=='0' and e.get('y')=='70':e.set('height','786')
    for e in root:
        if name(e)=='desc':e.text='Illustrative remediation computations with read-only, typed-patch and direct-edit behaviors; solid data flow and dashed control dependencies. The apply seam is shown separately.'

class HouseFigure(reference.Figure):
    def leader(self,d,x,y):
        self.add(f'<path d="{d}" class="leader"/>')
    def save(self, original_name):
        number='2-10' if '2-10' in original_name else '2-9'
        root=ET.fromstring(''.join(self.parts)+'</svg>')
        is_state=number=='2-10'
        height=586 if is_state else 750
        root.set('height',str(height));root.set('viewBox',f'0 70 782 {height}')
        for e in list(root):
            tag=name(e);t=content(e)
            if tag=='style':
                e.text="text {font-family:'Source Sans 3', 'Source Sans Pro', sans-serif;fill:#111;font-size:19px} .edge {fill:none;stroke:#222;stroke-width:1.2;marker-end:url(#arrow)} .leader {fill:none;stroke:#555;stroke-width:.8}"
            if (tag=='rect' and e.get('width') in ['782','779.5']) or (tag=='path' and e.get('fill')=='url(#header)') or (tag=='text' and t.startswith('Figure ')):
                root.remove(e);continue
            if tag=='circle' and float(e.get('r','0'))<4:
                root.remove(e);continue
            if tag=='text' and t.startswith('A typed, structural view'):
                e.text='A typed structural model of DocAble’s remediation computations.'
            if tag=='text' and t.startswith('The graph preserves'):
                e.text=t.replace('The graph preserves','The model preserves')
            if is_state and tag=='text' and t.startswith('retry (up to a limit'):
                for child in list(e):e.remove(child)
                e.text='retry (up to a limit,'
                extra=text(528,385,'e.g., n ≤ 3).');root.append(extra)
            if is_state and float(e.get('y','0'))>=542:
                root.remove(e);continue
            if is_state and tag=='path' and e.get('d')=='M457,570 V738':
                root.remove(e);continue
            if not is_state and ((tag=='path' and e.get('d')=='M602,369 L607,374 L602,379 L597,374 Z') or (tag=='rect' and e.get('x')=='598')):
                root.remove(e);continue
            if not is_state and tag=='rect':
                if e.get('y')=='584':e.set('height','132')
                if e.get('y')=='706':e.set('y','726')
            if tag=='rect' and e.get('rx'):
                e.set('rx','4');e.set('stroke','#333');e.set('stroke-width','1.2')
            if tag=='text' and e.get('textLength'):
                del e.attrib['textLength'];del e.attrib['lengthAdjust']
            if tag=='path' and e.get('class')=='edge':
                e.set('style','marker-end:url(#arrow)')
            if not is_state and tag=='text':
                if e.get('x')=='622':
                    e.set('x','606')
                    if t in ['typed patch —','direct edit —']:
                        root.append(text(590,e.get('y'),'•'))
                if t=='(e.g., classify, repair,':
                    e.text='('
                    example=ET.SubElement(e,'{'+NS+'}tspan',{'font-style':'italic'})
                    example.text='e.g.,';example.tail=' classify, repair,'
                if t=='Repair':e.set('y','286')
                if t in ['structure','metadata']:e.set('y','307')
                if t=='(typed patch)':e.set('y','326');e.set('style','font-size:18px;')
                if t=='= Control gate (executes if condition holds)':
                    e.text='= Control gate';root.append(text(449,692,'(executes if condition holds)',17.5))
                if float(e.get('y','0'))>=706:e.set('y',str(float(e.get('y'))+20))
                if t=='classification determines':
                    e.text='classification';root.append(text(578,208,'determines which'));root.append(text(578,228,'repairs run.'))
                if t=='which repairs run.':root.remove(e);continue
                if t=='applied to the document.':
                    e.text='applied to the';root.append(text(590,541,'document.'))
                if e.get('x')=='455':e.set('x','449')
            if tag in ['rect','path'] and e.get('fill','').startswith('url('):
                role=e.get('fill')[5:-1]
                shades={'blue':'#dddddd','purple':'#f2f2f2','green':'#bfbfbf','header':'#eeeeee','yellow':'#fafafa','red':'#dddddd'}
                colors={'blue':'#d5e5f4','purple':'#ece0ef','green':'#c6dfbb','header':'#eeeeee','yellow':'#fff3cd','red':'#ffd6d1'}
                e.set('fill','white' if is_state else (shades if self.bw else colors)[role])
                e.set('stroke','#333');e.set('stroke-width','1.2')
        canvas=ET.Element('{'+NS+'}rect',{'x':'0','y':'70','width':'782','height':str(height),'fill':'white'})
        root.insert(4,canvas)
        if is_state:
            root.append(ET.Element('{'+NS+'}path',{'d':'M48,536 H738','stroke':'#777','stroke-width':'.8','fill':'none'}))
            root.append(text(48,563,'Key properties (examples)',22,True))
            root.append(text(48,590,'• At most N retry attempts (e.g., N = 3).',20))
            root.append(text(48,617,'• A job eventually reaches Succeeded or Failed.',20))
            root.append(text(48,644,'• Only one worker actively executes the job at a time.',20))
        if not is_state:correct_mutation_categories(root,self.bw)
        p=OUT/f'figure-{number}-house-{"bw" if self.bw else "color"}.svg'
        p.write_bytes(ET.tostring(root,encoding='utf-8',xml_declaration=True))
        return p

reference.Figure=HouseFigure
if __name__=='__main__':
    for fn in [reference.figure29,reference.figure210]:
        for bw in [False,True]:print(fn(bw))
