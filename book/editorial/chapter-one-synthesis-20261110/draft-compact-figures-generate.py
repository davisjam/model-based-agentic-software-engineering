from pathlib import Path
import html,json,hashlib
OUT=Path(__file__).parent
ROOT=Path('/private/tmp/mage-docable-glimpse-20261109')

def scene(stem,w,h,title,desc,nodes,edges,headers=[]):
    # Preserve deliberate peer alignment and a compact native publication footprint.
    # SVG/TikZ are paired realizations of this authored teaching scene; auto-layout
    # is not used because matching the half-width prose slot is load-bearing.
    sf='Source Sans 3'
    z=lambda n:round(n*2.2,4)  # web natural scale; print TikZ retains authored bp
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{z(w)}" height="{z(h)}" viewBox="0 0 {z(w)} {z(h)}" role="img" aria-labelledby="title desc">',f'<title id="title">{html.escape(title)}</title>',f'<desc id="desc">{html.escape(desc)}</desc>', '<!-- Authored paired SVG/TikZ scene: compact peer geometry must preserve the half-width or summary slot. -->', '<defs><marker id="arrow" markerWidth="13.2" markerHeight="13.2" refX="11.44" refY="6.6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L11.44,6.6 L0,13.2 Z" fill="black"/></marker></defs>',f'<rect width="{z(w)}" height="{z(h)}" fill="white"/>', '<style>text{font-family:"Source Sans 3",Arial,sans-serif;fill:black}</style>', '<g fill="black">']
    tex=[r'\begin{tikzpicture}[x=1bp,y=-1bp,font=\fontsize{10}{12}\selectfont,',r'edge/.style={-{Stealth[length=4.2bp,width=3.6bp]},line width=.65bp},',r'compactbox/.style={draw=black,line width=.65bp,rounded corners=2.5bp,fill=white,align=center,inner sep=0pt},',r'compactlabel/.style={align=center,inner sep=0pt}]',f'\\path[use as bounding box] (0,0) rectangle ({w},{h});']
    for n in nodes:
        id,x,y,nw,nh,lines,size,bold=n
        cx=x+nw/2;cy=y+nh/2
        svg.append(f'<rect x="{z(x)}" y="{z(y)}" width="{z(nw)}" height="{z(nh)}" rx="5.5" fill="white" stroke="black" stroke-width="1.43"/>')
        for i,line in enumerate(lines):
            yy=cy+(i-(len(lines)-1)/2)*12+size*.33
            svg.append(f'<text x="{z(cx)}" y="{z(yy)}" text-anchor="middle" font-size="{z(size)}" font-weight="{700 if bold else 400}">{html.escape(line)}</text>')
        body=r'\\'.join(r'\textbf{'+line+'}' if bold else line for line in lines)
        tex.append(f'\\draw[draw=black,line width=.65bp,rounded corners=2.5bp,fill=white] ({x},{y}) rectangle ({x+nw},{y+nh});')
        tex.append(f'\\node[inner sep=0pt,outer sep=0pt,align=center,font=\\fontsize{{{size}}}{{12}}\\selectfont] ({id}) at ({cx},{cy}) {{{body}}};')
    for cx,cy,line in headers:
        svg.append(f'<text x="{z(cx)}" y="{z(cy+3.3)}" text-anchor="middle" font-size="22" font-weight="700">{html.escape(line)}</text>')
        tex.append(f'\\node[inner sep=0pt,outer sep=0pt,align=center,font=\\bookfigurefont\\bfseries\\fontsize{{10}}{{12}}\\selectfont] at ({cx},{cy}) {{{line}}};')
    for pts in edges:
        path='M'+' L'.join(f'{z(x)},{z(y)}' for x,y in pts)
        svg.append(f'<path d="{path}" fill="none" stroke="black" stroke-width="1.43" marker-end="url(#arrow)"/>')
        tex.append(r'\draw[edge] '+' -- '.join(f'({x},{y})' for x,y in pts)+';')
    svg += ['</g>','</svg>']
    tex += [r'\end{tikzpicture}']
    (OUT/f'{stem}.svg').write_text('\n'.join(svg)+'\n')
    (OUT/f'{stem}.tex').write_text('\n'.join(tex)+'\n')
    return {'width':w,'height':h,'title':title,'alt':desc,'nodes':nodes,'edges':edges,'headers':headers}

scenes={}
scenes['reasoning-horizon']=scene('reasoning-horizon',204,218.4,'Representation and the reasoning horizon','Finite working state makes representation matter. Two parallel paths compare raw code, which requires reconstructing relevant structure at higher reconstruction cost, with purposeful abstraction, which supports retrieval of relevant structure at lower reconstruction cost. The comparison describes burden, not guaranteed outcomes.',[
 ('premise',9,.4,186,34,['Finite working state','Representation matters'],10,True),
 ('raw',.4,68,94,35,['Raw code'],10,True),
 ('abstraction',109.6,68,94,35,['Purposeful','abstraction'],10,True),
 ('reconstruct',.4,124,94,36,['Reconstruct','relevant structure'],10,False),
 ('retrieve',109.6,124,94,36,['Retrieve','relevant structure'],10,False),
 ('higher',.4,181,94,37,['Higher','reconstruction cost'],9.5,False),
 ('lower',109.6,181,94,37,['Lower','reconstruction cost'],9.5,False),
], [[(102,34.4),(102,49.4),(47.4,49.4),(47.4,68)],[(102,49.4),(156.6,49.4),(156.6,68)],[(47.4,103),(47.4,124)],[(156.6,103),(156.6,124)],[(47.4,160),(47.4,181)],[(156.6,160),(156.6,181)]])
scenes['substrate-to-method']=scene('substrate-to-method',312,100,'From agentic machinery to MAGE','Two rows connect substrate properties to engineering problems and MAGE responses: finite working state to the Representation Problem and Modeling; probabilistic agentic work to the Enforcement Problem and Alignment.',[
 ('finite',.4,23.4,91.2,31,['Finite working','state'],10,False),
 ('representation',114,23.4,103.6,31,['Representation','Problem'],10,True),
 ('modeling',239.6,23.4,72,31,['Modeling'],10,True),
 ('probabilistic',.4,68.4,91.2,31,['Probabilistic','agentic work'],10,False),
 ('enforcement',114,68.4,103.6,31,['Enforcement','Problem'],10,True),
 ('alignment',239.6,68.4,72,31,['Alignment'],10,True),
], [[(91.6,38.9),(114,38.9)],[(217.6,38.9),(239.6,38.9)],[(91.6,83.9),(114,83.9)],[(217.6,83.9),(239.6,83.9)]],[(46,6,'SUBSTRATE'),(165.8,6,'PROBLEM'),(275.6,6,'RESPONSE')])
(OUT/'scene.json').write_text(json.dumps(scenes,indent=2)+'\n')
# Reuse the real book font profile and shared TikZ style, preserving final type size.
proof=r'''\documentclass{article}
\usepackage[paperwidth=22cm,paperheight=22cm,margin=1cm]{geometry}
\newcommand{\DoNotLoadEpstopdf}{}
\input{book/tikz/mage-figures.sty}
\usepackage[active,tightpage]{preview}
\PreviewEnvironment{tikzpicture}
\setlength\PreviewBorder{3pt}
\begin{document}
'''+''.join('\\input{'+str(OUT/f'{stem}.tex')+'}\n' for stem in scenes)+r'\end{document}'
(OUT/'proof.tex').write_text(proof)
