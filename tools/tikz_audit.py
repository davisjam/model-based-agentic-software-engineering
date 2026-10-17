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


def box_nodes(page, drawings=None):
    """Conservative rendered rectangular nodes, including rounded corners.

    Require four straight boundary sides and actual contained text. Ellipses,
    unlabelled chart marks and broad panels containing smaller boxes are excluded.
    Node identity is reviewed text, never a guessed same-row semantic role.
    PDF clipping/overpainting is not a node-ownership model: this conservative
    candidate set still requires visual review of reported findings.
    """
    nodes=[]
    for d in drawings if drawings is not None else page.get_drawings():
        r=d['rect']
        if d.get('color') is None or r.width<18 or r.height<12:continue
        points=paths(d)
        if not points or not any(math.dist(p[0],p[-1])<.1 for p in points if len(p)>3):continue
        sides=set()
        for item in d['items']:
            if item[0]=='re':sides.update(('left','right','top','bottom'))
            if item[0]!='l':continue
            a,b=item[1:]
            if abs(a.x-b.x)<.05:
                if abs(a.x-r.x0)<.1:sides.add('left')
                if abs(a.x-r.x1)<.1:sides.add('right')
            if abs(a.y-b.y)<.05:
                if abs(a.y-r.y0)<.1:sides.add('top')
                if abs(a.y-r.y1)<.1:sides.add('bottom')
        if len(sides)!=4:continue
        text=' '.join(page.get_textbox(r).split())
        if any(c.isalpha() for c in text):nodes.append({'rect':r,'text':text,'paint':d['seqno']})
    return [n for n in nodes if not any(n is not m and n['rect'].contains(m['rect'])
            and n['rect'].get_area()>m['rect'].get_area()*1.2 for m in nodes)]


def terminal_approaches(page):
    """Measure recognizable straight-shaft, filled-outline arrow approaches.

    Includes the arrowhead in the approach length. A bend or intersecting branch
    rail terminates the usable straight run. Restrict to text-bearing box targets;
    chart arrows, open tips, curved shafts and nonrectangular nodes are not inferred.
    """
    drawings=page.get_drawings();nodes=box_nodes(page,drawings)
    heads=[d for d in drawings if d.get('fill') is not None and max(d['fill'])<.4
           and 1<max(d['rect'].width,d['rect'].height)<=12
           and all(item[0] in ('l','c') for item in d['items'])
           and len(paths(d))==1
           and math.dist(paths(d)[0][0],paths(d)[0][-1])<.1]
    shafts=[d for d in drawings if d.get('fill') is None and d.get('color') is not None
            and d.get('stroke_opacity',0)>.5 and max(d['color'])<.65
            and all(item[0]=='l' for item in d['items'])]
    # Panel borders can crowd an arrowhead just as a separate branch rail can.
    # Include their straight sides even when PDF encodes a rectangle as `re` or
    # combines rounded corners and straight edges in the same drawing.
    segments=[]
    head_paints={h['seqno'] for h in heads}
    for d in drawings:
        if d['seqno'] in head_paints:continue
        if d.get('color') is None or d.get('stroke_opacity',0)<=.5 or max(d['color'])>=.65:continue
        for item in d['items']:
            if item[0]=='l':segments.append((tuple(item[1]),tuple(item[2])))
            elif item[0]=='re':
                r=item[1];corners=[r.tl,r.tr,r.br,r.bl,r.tl]
                segments.extend((tuple(a),tuple(b)) for a,b in zip(corners,corners[1:]))
    results=[];seen=set()
    for d in shafts:
        for path in paths(d):
            if len(path)<2 or math.dist(path[0],path[-1])<.1:continue
            # Either end can carry an arrow, including bidirectional connectors.
            for run in (path,list(reversed(path))):
                start,end=run[-2:];length=math.dist(start,end)
                if length<.05:continue
                ux,uy=(end[0]-start[0])/length,(end[1]-start[1])/length
                # Merge collinear PDF segments; PDF operation splitting is not a bend.
                for previous in reversed(run[:-2]):
                    if abs((start[0]-previous[0])*uy-(start[1]-previous[1])*ux)>.05:break
                    if (start[0]-previous[0])*ux+(start[1]-previous[1])*uy<0:break
                    start=previous
                shaft_ux,shaft_uy=ux,uy
                for h in heads:
                    ux,uy=shaft_ux,shaft_uy
                    if not (h['rect']+(-.7,-.7,.7,.7)).contains(fitz.Point(end)):continue
                    vertices=paths(h)[0]
                    # PGF can reverse a sub-head-length terminal shaft when the
                    # arrowhead itself extends back past the last bend. Recover
                    # its direction from the pointed outline and nearby target.
                    if length<4:
                        opposite=max(vertices,key=lambda v:-(v[0]-end[0])*ux-(v[1]-end[1])*uy)
                        if any(not n['rect'].contains(fitz.Point(opposite)) and n['rect'].contains(fitz.Point(opposite[0]-2*ux,opposite[1]-2*uy)) for n in nodes):ux,uy=-ux,-uy
                    tip=max(vertices,key=lambda v:(v[0]-end[0])*ux+(v[1]-end[1])*uy)
                    advance=(tip[0]-end[0])*ux+(tip[1]-end[1])*uy
                    if advance<.3 or abs((tip[0]-end[0])*uy-(tip[1]-end[1])*ux)>.5:continue
                    neighbors=sorted((v for v in vertices if math.dist(v,tip)>.05),key=lambda v:math.dist(v,tip))[:2]
                    if not neighbors or not all(abs((v[0]-tip[0])*uy-(v[1]-tip[1])*ux) <= 2*abs((v[0]-tip[0])*ux+(v[1]-tip[1])*uy)+.05 for v in neighbors):continue
                    target=next((n for n in nodes if not n['rect'].contains(fitz.Point(tip))
                           and n['rect'].contains(fitz.Point(tip[0]+2*ux,tip[1]+2*uy))),None)
                    if target is None:continue
                    key=(h['seqno'],target['paint'])
                    if key in seen:continue
                    seen.add(key)
                    distance=(tip[0]-start[0])*ux+(tip[1]-start[1])*uy
                    # A separately drawn T-junction is as relevant as an explicit bend.
                    for a,b in segments:
                        vx,vy=b[0]-a[0],b[1]-a[1];cross=ux*vy-uy*vx
                        if abs(cross)<1e-6:continue
                        ax,ay=a[0]-tip[0],a[1]-tip[1]
                        t=(ax*vy-ay*vx)/cross;s=(ax*uy-ay*ux)/cross
                        if -distance+.1<t<-.1 and -.001<=s<=1.001:distance=-t
                    direction=('right' if ux>0 else 'left') if abs(ux)>.99 else ('down' if uy>0 else 'up') if abs(uy)>.99 else 'diagonal'
                    results.append({'target':target['text'],'target_bbox':list(target['rect']),
                        'tip_bp':list(tip),'approach_pt':distance/PT_TO_BP,'direction':direction,
                        'bbox':list(fitz.Rect(start,tip).normalize()+(-2,-2,2,2))})
    return results


def layout_findings(page, contract=None, minimum_approach=9):
    """Explicit peer semantics plus conservative terminal geometry.

    Contract: peer_groups[{name,labels,align,equal_height,equal_width,tolerance_pt}],
    terminal_exceptions[{target,direction,minimum_pt,reason}]. Labels select one
    containing node by exact normalized phrase; ambiguous/missing selectors fail.
    The 9pt floor is a lower bound; 12pt remains the normal editorial aim.
    """
    contract=contract or {};findings=[];nodes=box_nodes(page);approaches=terminal_approaches(page)
    def add(code,text,rect,detail):
        findings.append({'code':code,'text':text,'bbox':list(rect),'detail':detail})
    def selected(label,items,key):
        label=' '.join(label.split())
        pattern=r'(?<!\w)'+re.escape(label)+r'(?!\w)'
        return [n for n in items if re.search(pattern,n[key])]
    exceptions={}
    for e in contract.get('terminal_exceptions',[]):
        hits=[a for a in selected(e['target'],approaches,'target') if a['direction']==e['direction']]
        if len(hits)!=1 or not str(e.get('reason','')).strip() or not 0<=e.get('minimum_pt',-1)<=minimum_approach:
            add('layout-contract',e.get('target',''),page.rect,'Terminal exception must uniquely match one target/direction, state a reason, and specify a floor from 0 to 9pt');continue
        if id(hits[0]) in exceptions:
            add('layout-contract',e['target'],page.rect,'Duplicate terminal exception');continue
        exceptions[id(hits[0])]=e
    for a in approaches:
        exception=exceptions.get(id(a))
        floor=exception['minimum_pt'] if exception else minimum_approach
        if exception and a['approach_pt']+.05>=floor:
            add('reviewed-terminal-exception',a['target'],a['bbox'],
                f"{a['approach_pt']:.2f}pt measured; normal floor {minimum_approach:g}pt; reviewed floor {floor:g}pt: {exception['reason']}")
            findings[-1]['reviewed']=True
        if a['approach_pt']+.05<floor:
            add('terminal-clearance',a['target'],a['bbox'],
                f"{a['approach_pt']:.2f}pt from last bend/branch/start to arrowtip; floor {floor:g}pt, editorial aim 12pt; direction {a['direction']}")
    alignments={'top':lambda r:r.y0,'center_y':lambda r:(r.y0+r.y1)/2,'bottom':lambda r:r.y1,
                'left':lambda r:r.x0,'center_x':lambda r:(r.x0+r.x1)/2,'right':lambda r:r.x1}
    for group in contract.get('peer_groups',[]):
        labels=group.get('labels',[]);hits=[selected(s,nodes,'text') for s in labels]
        if len(labels)<2 or any(len(h)!=1 for h in hits) or len({h[0]['paint'] for h in hits if len(h)==1})!=len(labels):
            add('layout-contract',group.get('name','peer group'),page.rect,'Peer labels must resolve uniquely to at least two distinct rendered boxes');continue
        members=[h[0] for h in hits];rect=fitz.Rect(members[0]['rect'])
        for n in members[1:]:rect|=n['rect']
        tolerance=group.get('tolerance_pt',1)*PT_TO_BP
        if not 0<=tolerance<=3*PT_TO_BP:raise ValueError('Peer tolerance must be between 0 and 3pt')
        checks=[]
        for axis in group.get('align',[]):
            if axis not in alignments:raise ValueError('Unknown peer alignment: '+axis)
            checks.append((axis,[alignments[axis](n['rect']) for n in members]))
        for dimension in ('height','width'):
            if group.get('equal_'+dimension):checks.append((dimension,[getattr(n['rect'],dimension) for n in members]))
        if not checks:
            add('layout-contract',group.get('name','peer group'),rect,'Peer groups require at least one alignment or size constraint')
        for name,values in checks:
            delta=max(values)-min(values)
            if delta>tolerance+.05:
                add('peer-alignment',group.get('name',' / '.join(labels)),rect,
                    f"Reviewed peers differ in {name} by {delta/PT_TO_BP:.2f}pt (tolerance {tolerance/PT_TO_BP:g}pt)")
    return findings


def audit_page(page, minimum_font=9, maximum_font=14, layout_contract=None):
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
    findings.extend(layout_findings(page,layout_contract))
    return findings


def audit_pdf(pdf, manifest=None, output=None, annotated=None, minimum_font=9, maximum_font=14, layout_contracts=None):
    doc=fitz.open(pdf)
    names={int(v['page']):k for k,v in (manifest or {}).items()}
    findings=[];terminal_count=0
    unknown=set(layout_contracts or {})-set(names.values())
    if unknown:raise ValueError('Layout contracts have no manifest page: '+', '.join(sorted(unknown)))
    for i,page in enumerate(doc,1):
        terminal_count+=len(terminal_approaches(page))
        for finding in audit_page(page,minimum_font,maximum_font,(layout_contracts or {}).get(names.get(i))):
            finding.update(page=i,source=names.get(i,f'page-{i}'))
            findings.append(finding)
            if annotated:
                mark=page.add_rect_annot(fitz.Rect(finding['bbox']))
                mark.set_colors(stroke=(1,0,0));mark.set_info(content=finding['code']+': '+finding['detail']);mark.update()
    report={'pdf':str(pdf),'pdf_sha256':hashlib.sha256(Path(pdf).read_bytes()).hexdigest(),'pages':len(doc),'mode':'audit-only','counts':dict(Counter(f['code'] for f in findings)),
            'limitations':['Glyph cores approximate ink; mathematical layout and deliberate overlays may flag.',
                          'Complex clipping, nonzero winding holes and rotated glyph ink are not fully modeled.',
                          'Geometry cannot prove semantic fidelity, arrow meaning, or node ownership.',
                          'Terminal sensor covers filled Stealth/Latex-style arrowheads, straight shafts and rectangular text nodes only; 9pt floor, 12pt aim.',
                          'Peer equality is checked only for explicitly reviewed label groups, not inferred for arbitrary same-row panels.'],
            'findings':findings,'unresolved_count':sum(not f.get('reviewed',False) for f in findings),
            'checked_terminal_approaches':terminal_count,
            'reviewed_peer_groups':sum(len(c.get('peer_groups',[])) for c in (layout_contracts or {}).values())}
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
    parser.add_argument('--layout-contracts',type=Path,help='Reviewed source-to-layout-contract JSON mapping')
    parser.add_argument('--strict',action='store_true')
    args=parser.parse_args()
    report=audit_pdf(args.pdf,json.loads(args.manifest.read_text()) if args.manifest else None,args.output,args.annotated,layout_contracts=json.loads(args.layout_contracts.read_text()) if args.layout_contracts else None)
    raise SystemExit(1 if args.strict and report['unresolved_count'] else 0)
