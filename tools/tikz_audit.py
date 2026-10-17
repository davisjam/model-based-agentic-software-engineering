#!/usr/bin/env python3
"""Audit compiled TikZ geometry, inspired by the repository's SVG figure sensors.

Uses actual PDF character positions and vector paint order, not TeX source regexes.
Heuristic findings are audit-only by default; --strict makes them blocking. This
cannot establish semantic fidelity, node ownership, or complete clipping visibility.
"""
from __future__ import annotations
import argparse
from collections import Counter
import json
import hashlib
from pathlib import Path
import math
import re
import pymupdf as fitz

PT_TO_BP = 72 / 72.27


def inside(point, polygon):
    x, y = point
    hit = False
    for a, b in zip(polygon, polygon[1:] + polygon[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            hit = not hit
    return hit


def paths(drawing):
    """Flatten each PDF subpath separately, retaining curves and rectangles."""
    result, current = [], []
    for item in drawing['items']:
        op = item[0]
        if op == 're':
            r = item[1]
            result.append([tuple(r.tl), tuple(r.tr), tuple(r.br), tuple(r.bl), tuple(r.tl)])
        elif op == 'qu':
            q = item[1]
            result.append([tuple(q.ul), tuple(q.ur), tuple(q.lr), tuple(q.ll), tuple(q.ul)])
        elif op in ('l', 'c'):
            start = tuple(item[1])
            if current and math.dist(current[-1], start) > .01:
                result.append(current); current = []
            if not current: current.append(start)
            if op == 'l': current.append(tuple(item[2]))
            else:
                a,b,c,d = item[1:]
                for step in range(1,17):
                    t=step/16; u=1-t
                    current.append((u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*d.x,
                                    u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*d.y))
    if current:
        if drawing.get('closePath') and current[-1] != current[0]: current.append(current[0])
        result.append(current)
    return result


def samples(rect):
    return [(rect.x0+rect.width*x, rect.y0+rect.height*y)
            for x in (.2,.5,.8) for y in (.2,.5,.8)]


def clipped_segment(a, b, rect):
    """Liang–Barsky: detect even short segments crossing a glyph core."""
    dx,dy=b[0]-a[0],b[1]-a[1]; low,high=0.,1.
    for p,q in [(-dx,a[0]-rect.x0),(dx,rect.x1-a[0]),(-dy,a[1]-rect.y0),(dy,rect.y1-a[1])]:
        if abs(p)<1e-12:
            if q<0:return None
        elif p<0:low=max(low,q/p)
        else:high=min(high,q/p)
        if low>high:return None
    return ((a[0]+low*dx,a[1]+low*dy),(a[0]+high*dx,a[1]+high*dy))


def intersects_segment(a,b,rect):
    return clipped_segment(a,b,rect) is not None


def painted_segments(drawing):
    """Respect dash phase and gaps along each flattened subpath."""
    match=re.fullmatch(r'\[([^]]*)\]\s*([-+\d.eE]+)',(drawing.get('dashes') or '[] 0').strip())
    pattern=[float(x) for x in match[1].split()] if match else []
    if len(pattern)%2:pattern*=2
    if not pattern or sum(pattern)<=0:
        return [pair for path in drawing['paths'] for pair in zip(path,path[1:])]
    result=[]
    for path in drawing['paths']:
        phase=float(match[2])%sum(pattern);index=0
        while phase>=pattern[index]:
            phase-=pattern[index];index=(index+1)%len(pattern)
        remaining=pattern[index]-phase
        for a,b in zip(path,path[1:]):
            length=math.dist(a,b)
            if length<1e-9:continue
            pos=0
            while pos<length-1e-9:
                if remaining<1e-9:
                    index=(index+1)%len(pattern);remaining=pattern[index];continue
                amount=min(remaining,length-pos)
                if index%2==0:
                    result.append(tuple((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])) for t in (pos/length,(pos+amount)/length)))
                pos+=amount;remaining-=amount
    return result


def audit_page(page, minimum_font=9, maximum_font=14):
    findings=[]
    def add(code, text, rect, detail):
        findings.append(dict(code=code,text=text[:160],bbox=[round(v,2) for v in rect],detail=detail))
    labels=[]
    for span in page.get_texttrace():
        if span['type']==3 or span['opacity']<.1:continue
        chars=[]
        for char in span['chars']:
            if chr(char[0]).isspace():continue
            box=fitz.Rect(char[3])
            # The middle 70% excludes font ascent/descent slack and kerning fringes.
            box=fitz.Rect(box.x0+.12*box.width,box.y0+.15*box.height,
                          box.x1-.12*box.width,box.y1-.15*box.height)
            if box.width>0 and box.height>0:chars.append(box)
        if not chars:continue
        text=''.join(chr(c[0]) for c in span['chars'])
        label=dict(span=span,chars=chars,text=text,rect=fitz.Rect(span['bbox']))
        labels.append(label)
        # Single math symbols/subscripts are exempt from prose font-band checks.
        if sum(c.isalpha() for c in text)>=4 and not minimum_font*PT_TO_BP-.08 <= span['size'] <= maximum_font*PT_TO_BP+.08:
            add('font-band',text,label['rect'],f"Rendered size {span['size']/PT_TO_BP:.2f} TeX pt; band {minimum_font}–{maximum_font} pt")
        if any(not page.rect.contains(c) for c in chars):
            add('page-overflow',text,label['rect'],'Glyph core extends outside the PDF page')
    for i,left in enumerate(labels):
        for right in labels[i+1:]:
            if not left['rect'].intersects(right['rect']):continue
            hits=[a & b for a in left['chars'] for b in right['chars']
                  if a.intersects(b) and (a & b).get_area() > .25*min(a.get_area(),b.get_area())]
            if hits:
                add('text-overlap',left['text']+' / '+right['text'],left['rect']|right['rect'],
                    f'{len(hits)} character-core intersections between separate text runs')
    drawings=[]
    for drawing in page.get_drawings():
        drawing['paths']=paths(drawing)
        drawing['segments']=painted_segments(drawing)
        drawings.append(drawing)
    fills=[d for d in drawings if d.get('fill') is not None and d.get('fill_opacity',0)>=.9]
    def covered(point, d):
        if not d['rect'].contains(fitz.Point(point)):return False
        flags=[inside(point,p) for p in d['paths'] if len(p)>=3]
        return sum(flags)%2==1 if d.get('even_odd') else any(flags)
    stroke_hits=[]
    for label in labels:
        for d in fills:
            if d['seqno']<=label['span']['seqno'] or not d['rect'].intersects(label['rect']):continue
            hits=sum(sum(covered(p,d) for p in samples(c))>=5 for c in label['chars'])
            if hits:
                add('text-occlusion',label['text'],label['rect'],f'{hits} glyph cores covered by a later opaque fill (paint {d["seqno"]})')
        for d in drawings:
            if d.get('color') is None or d.get('stroke_opacity',0)<.5 or max(d['color'])>.65:continue
            if not (d['rect']+(-.5,-.5,.5,.5)).intersects(label['rect']):continue
            hit=[]
            for c in label['chars']:
                for a,b in d['segments']:
                    clipped=clipped_segment(a,b,c)
                    if clipped is None:continue
                    # Sample ON the clipped stroke; an off-line fill must not mask it.
                    u,v=clipped
                    points=[(u[0]+t*(v[0]-u[0]),u[1]+t*(v[1]-u[1])) for t in (.2,.5,.8)]
                    if all(any(f['seqno']>d['seqno'] and covered(point,f) for f in fills) for point in points):continue
                    hit.append(c);break
            if hit:stroke_hits.append((d['seqno'],label,len(hit)))
    totals=Counter()
    for seq,label,count in stroke_hits:totals[seq]+=count
    for seq,label,count in stroke_hits:
        if totals[seq]>=2:
            add('stroke-through-text',label['text'],label['rect'],
                f'Dark vector stroke crosses {count} glyph cores here, {totals[seq]} total (paint {seq})')
    return findings


def audit_pdf(pdf, manifest=None, output=None, annotated=None, minimum_font=9, maximum_font=14):
    doc=fitz.open(pdf)
    names={int(v['page']):k for k,v in (manifest or {}).items()}
    findings=[]
    for i,page in enumerate(doc,1):
        for finding in audit_page(page,minimum_font,maximum_font):
            finding.update(page=i,source=names.get(i,f'page-{i}'))
            findings.append(finding)
            if annotated:
                mark=page.add_rect_annot(fitz.Rect(finding['bbox']))
                mark.set_colors(stroke=(1,0,0));mark.set_info(content=finding['code']+': '+finding['detail']);mark.update()
    report={'pdf':str(pdf),'pdf_sha256':hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),'pages':len(doc),'mode':'audit-only','counts':dict(Counter(f['code'] for f in findings)),
            'limitations':['Glyph cores approximate ink; mathematical layout and deliberate overlays may flag.',
                          'Complex clipping, nonzero winding holes and rotated glyph ink are not fully modeled.',
                          'Geometry cannot prove semantic fidelity, arrow meaning, or node ownership.'],
            'findings':findings}
    if output:
        Path(output).parent.mkdir(parents=True,exist_ok=True)
        Path(output).write_text(json.dumps(report,indent=2)+'\n')
    if annotated:doc.save(annotated)
    doc.close()
    print(f'TikZ geometry audit: {report["pages"]} pages; {len(findings)} findings; {report["counts"]}',flush=True)
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path)
    parser.add_argument('--manifest',type=Path)
    parser.add_argument('--output',type=Path)
    parser.add_argument('--annotated',type=Path)
    parser.add_argument('--strict',action='store_true')
    args=parser.parse_args()
    report=audit_pdf(args.pdf,json.loads(args.manifest.read_text()) if args.manifest else None,args.output,args.annotated)
    raise SystemExit(1 if args.strict and report['findings'] else 0)
