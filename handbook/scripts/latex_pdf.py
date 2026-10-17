"""Print the authoritative Handbook through the shared LuaLaTeX house style."""
from pathlib import Path
import copy
import json
import re
import shutil
import subprocess
import sys
import _common as C
import latex_source as L
sys.path.insert(0, str(C.GC_ROOT/'tools'))
from latex_build import compile_tex, bold_table_headers


def build_pdf(book, only=None):
    import build as B
    B._gate()
    directory, numbers = B._chapter_directory_args(book)
    float_args = B._float_offset_args(book)
    offsets = B._float_offsets(book)
    chapter_targets = {p.stem: 'chap-' + C.meta_to_py(C.pandoc_ast(p)['meta']).get('id', p.stem) for p in C.chapter_files(book)}
    generated=C.GENERATED/'latex'; generated.mkdir(parents=True,exist_ok=True)
    C.DIST.mkdir(exist_ok=True)
    chunks=[]
    paths=[p for p in C.frontmatter_files(book)] + C.chapter_files(book)
    if only: paths=[p for p in paths if p.stem==only]
    for path in paths:
        ast=json.loads(B._run(['pandoc',str(path),'-f','markdown','-t','json'] + directory + float_args.get(path, []) + B.COMMON_PRE+B._bib_args(book)))
        meta=C.meta_to_py(ast['meta'])
        image_alts={}
        def walk(node):
            if isinstance(node,list): return [walk(n) for n in node]
            if not isinstance(node,dict): return node
            node=copy.deepcopy(node)
            if node.get('t')=='Cite': return {'t':'Span','c':[['',[],[]],walk(node['c'][1])]}
            if node.get('t')=='Div' and 'figure' in node['c'][0][1]:
                children=node['c'][1]
                caption=dict(node['c'][0][2]).get('alt') or C._stringify(children[1:])
                if children and children[0]['t'] in ('Para','Plain'):
                    for inline in children[0]['c']:
                        if inline['t']=='Image': inline['c'][0][2].append(['alt',caption])
            if node.get('t')=='Table':
                count=len(node['c'][2])
                node['c'][2]=[[align, {'t':'ColWidth','c':1/count}] for align, width in node['c'][2]]
            if node.get('t')=='Header' and node['c'][1][0] == 'summary':
                node['c'][1][0] = path.stem + '-summary'
            if node.get('t')=='Link':
                href=node['c'][2][0]
                if '.md' in href and not '://' in href:
                    stem=Path(href.split('#')[0]).stem
                    node['c'][2][0]='#'+(href.split('#',1)[1] if '#' in href else chapter_targets.get(stem,stem))
            if node.get('t')=='Image':
                src=node['c'][2][0]
                image=(path.parent/src).resolve()
                if image.suffix=='.svg':
                    pdf=generated/(image.parent.name+'-'+image.stem+'.pdf')
                    subprocess.run(['rsvg-convert','--format=pdf','--output',str(pdf),str(image)],check=True)
                    image=pdf
                node['c'][2][0]=str(image.relative_to(C.GC_ROOT))
                image_alts[node['c'][2][0]]=dict(node['c'][0][2]).get('alt') or C._stringify(node['c'][1]) or 'Diagram illustrating '+meta.get('title',path.stem)
                node['c'][0][2]=[['width','95%'],['height','4in']]
            if 'c' in node: node['c']=walk(node['c'])
            return node
        ast["blocks"]=walk(ast["blocks"])
        figure_no, table_no = offsets.get(path, (0, 0))
        def emit(blocks):
            nonlocal figure_no, table_no
            out=[]
            pending=[]
            def flush():
                if pending:
                    rendered=L.pandoc(json.dumps(dict(ast,meta={},blocks=pending)), 'json','latex','--top-level-division=chapter')
                    def graphic(match):
                        alt=L.pandoc(image_alts.get(match.group(2), 'Book figure'), 'markdown','latex').strip()
                        return r'\includegraphics[keepaspectratio,alt={'+alt+'},'+(match.group(1) or '')+']{'+match.group(2)+'}'
                    rendered=re.sub(r'\\includegraphics(?:\[([^]]*)\])?\{([^}]+)\}',graphic,rendered)
                    rendered=bold_table_headers(rendered)
                    # booktabs 2025 row hooks conflict with experimental table tagging.
                    # Native rules preserve the same borders and semantic table cells.
                    rendered=rendered.replace(r'\toprule',r'\hline').replace(r'\midrule',r'\hline').replace(r'\bottomrule',r'\hline').replace(r'\noalign{}','')
                    if any(block['t']=='Table' for block in pending):
                        rendered=r'\tagpdfsetup{table/header-rows={1}}'+ '\n' + rendered
                    out.append(rendered)
                    pending.clear()
            for block in blocks:
                if block['t']=='Div':
                    flush()
                    attr,children=block['c']; kind=attr[1][0] if attr[1] else 'note'
                    title=dict(attr[2]).get('title','')
                    anchor = ('\\hypertarget{'+attr[0]+'}{}\\label{'+attr[0]+'}\n') if attr[0] else ''
                    if kind == 'figure':
                        numbered = attr[0] and 'unnumbered' not in attr[1]
                        if numbered: figure_no += 1
                        out += [anchor, '\\begin{samepage}\n\\begin{center}', emit(children[:1]), '\\end{center}']
                        out += ['{\\small '+ ('\\textbf{Figure '+str(figure_no)+'.} ' if numbered else '') + emit(children[1:])+'\\par}\n\\end{samepage}']
                    elif kind == 'table':
                        out += [anchor,emit(children)]
                    else:
                        title=L.pandoc(title,'markdown','latex').strip()
                        out += [anchor,'\\begin{bookbox}{'+kind.replace('_',' ')+'}{'+title+'}',emit(children),'\\end{bookbox}']
                else:
                    pending.append(block)
            flush()
            return '\n'.join(out)
        title=L.pandoc(meta.get('title',path.stem),'markdown','latex').strip()
        number=numbers.get(path,0)
        heading=('\\setcounter{chapter}{'+str(number-1)+'}\n\\chapter{' if number else '\\chapter*{')+title+'}\n'
        chunk=heading+'\\setcounter{table}{'+str(offsets.get(path,(0,0))[1])+'}\n'+'\\hypertarget{chap-'+meta.get('id',path.stem)+'}{}\\label{chap-'+meta.get('id',path.stem)+'}\n'+emit(ast['blocks'])
        chunks.append(chunk)
        stem=path.stem if path.parent==C.CHAPTERS else '0-'+path.stem
        local_labels=set(re.findall(r'\\label\{([^}]+)\}',chunk))
        standalone=re.sub(r'\\hyperref\[([^]]+)\]', lambda m: m.group(0) if m.group(1) in local_labels else r'\href{../software-engineering-handbook.pdf\#nameddest='+m.group(1)+'}', chunk)
        (generated/(stem+'.tex')).write_text(preamble()+standalone+'\n\\end{document}\n')
    title=L.pandoc(book['title'],'markdown','latex').strip()
    full=generated/'software-engineering-handbook.tex'
    front_count=0 if only else len(C.frontmatter_files(book))
    full.write_text(preamble()+cover_and_imprint(book)+'\n'.join(chunks[:front_count])+
                    '\\clearpage\n\\tableofcontents\n\\clearpage\\pagenumbering{arabic}\n'+
                    '\n'.join(chunks[front_count:])+'\n\\end{document}\n')
    compiled = compile_tex(full)
    from pdf_structure import check_pdf
    source = full.read_text()
    check_pdf(compiled, headings=len(paths),
              sections=len(re.findall(r"\\section\*?\{", source)),
              tables=source.count(r"\begin{longtable}"),
              figures=len(re.findall(r"\\includegraphics\[[^]]*\balt=", source)))
    shutil.copy2(compiled,B.PDF_OUT)
    if not only:
        B.CHAPTERS_PDF_DIR.mkdir(parents=True,exist_ok=True)
        for path in paths:
            stem=path.stem if path.parent==C.CHAPTERS else '0-'+path.stem
            shutil.copy2(compile_tex(generated/(stem+'.tex')),B.CHAPTERS_PDF_DIR/(stem+'.pdf'))


def preamble():
    book=C.yaml.safe_load((C.HANDBOOK/'book.yaml').read_text())
    title=L.pandoc(book['title'], 'markdown', 'latex').strip()
    author=L.pandoc(book['author'], 'markdown', 'latex').strip()
    metadata='\\hypersetup{pdftitle={'+title+'},pdfauthor={'+author+'}}\n'
    return '\\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}\n\\documentclass[11pt,oneside]{book}\n\\usepackage{house}\n\\usepackage{unicode-math}\n\\counterwithout{table}{chapter}\n\\definecolor{covercream}{HTML}{FBF7F2}\n\\setlength{\\emergencystretch}{2em}\n'+metadata+'\\begin{document}\n\\pagestyle{plain}\n'
def cover_and_imprint(book):
    import build as B
    def escape(value): return L.pandoc(str(value), 'markdown', 'latex').strip()
    words=book['title'].split()
    last_modified=subprocess.run(['git','log','-1','--format=%cs','--','handbook/chapters','handbook/frontmatter','handbook/book.yaml'],cwd=C.GC_ROOT,text=True,capture_output=True,check=True).stdout.strip() or str(book['first_published'])
    template=r'''
\hypersetup{pageanchor=false}
\newgeometry{left=0.6in,right=0.6in,top=0.42in,bottom=0.42in}
\AddToHookNext{shipout/background}{%
\begin{tikzpicture}[remember picture,overlay]
\fill[covercream] (current page.south west) rectangle (current page.north east);
\begin{scope}
\clip ([yshift=1.25in]current page.south west) rectangle (current page.north east);
\node[anchor=north west,inner sep=0pt] at ([yshift=5.83in]current page.north west) {\includegraphics[artifact,width=8.5in]{handbook/assets/cover-artwork.png}};
\end{scope}
\end{tikzpicture}}
\begin{titlepage}\thispagestyle{empty}
\begingroup\centering\bookserif\linespread{1}\selectfont\setlength{\parskip}{0pt}
{\fontsize{15}{18}\selectfont\color{bookmuted} @COMPANION@\par}
\vspace{0.08in}{\fontsize{56}{60}\selectfont\bfseries @DOMINANT@\par}
\vspace{0.08in}{\fontsize{14.5}{18}\selectfont\itshape\color{bookaccent} @SUBTITLE@\par}
\vspace{0.12in}{\color{bookaccent}\rule{0.45in}{1pt}\par}
\vspace{0.10in}{\fontsize{11.5}{14}\selectfont\bfseries @AUTHOR@\par}
\endgroup
\vfill\noindent{\bookserif\fontsize{8}{10}\selectfont FIRST EDITION\par}
\end{titlepage}
\restoregeometry
\thispagestyle{empty}\noindent\vspace*{0.4in}
{\noindent © @AUTHORCASE@, @COPYRIGHT@\par}
\smallskip{\small\color{bookmuted}\noindent Edition @EDITION@ — first published @FIRST@ · last modified @MODIFIED@\par}
\medskip{\small\color{bookmuted}\noindent @FUNDING@\par}
\clearpage
\pagenumbering{roman}\hypersetup{pageanchor=true}
'''
    values={'COMPANION':' '.join(words[:-1]).upper(),'DOMINANT':words[-1].upper(),'SUBTITLE':book.get('subtitle',''),'AUTHOR':book['author'].upper(),'AUTHORCASE':book['author'],'COPYRIGHT':book['copyright_years'],'EDITION':book['edition'],'FIRST':book['first_published'],'MODIFIED':last_modified,'FUNDING':B.NSF_ACK}
    for name,value in values.items(): template=template.replace('@'+name+'@',escape(value))
    return template


def render_cover_pdf(work_dir, book=None):
    """Compile a fresh one-page native cover for web/ePub thumbnails.

    Never reads an existing full-book PDF, so cover metadata/artwork cannot go stale.
    """
    work_dir=Path(work_dir)
    work_dir.mkdir(parents=True,exist_ok=True)
    if book is None:
        book=C.yaml.safe_load((C.HANDBOOK/'book.yaml').read_text())
    cover=cover_and_imprint(book).split(r'\end{titlepage}',1)[0]+r'\end{titlepage}'
    source=work_dir/'handbook-cover.tex'
    source.write_text(preamble()+cover+'\n\\end{document}\n')
    return compile_tex(source)
