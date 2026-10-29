"""Native, live-type MAGE cover shared by PDF, ePub and landing thumbnails."""
from pathlib import Path
import json

from latex_build import compile_tex

ROOT = Path(__file__).resolve().parents[1]


def _text(value: str) -> str:
    return ''.join({'&': r'\&', '%': r'\%', '$': r'\$', '#': r'\#', '_': r'\_',
                    '{': r'\{', '}': r'\}', '\\': r'\textbackslash{}'}.get(c, c) for c in value)


def cover_tex() -> str:
    manifest = json.loads((ROOT / 'book/book-manifest.json').read_text())
    display = _text(manifest.get('cover_display_title', 'MAGE'))
    expansion = _text(manifest['title'].upper())
    subtitle = _text(manifest.get('subtitle', ''))
    author = _text(manifest['author'].upper())
    return r'''
\clearpage
\begingroup
\definecolor{covercream}{HTML}{FDF8F0}
\definecolor{coverink}{HTML}{1D2733}
\definecolor{covermuted}{HTML}{5B5346}
\definecolor{coveraccent}{HTML}{9E4A2F}
\newgeometry{left=.5in,right=.5in,top=.42in,bottom=.42in}
\pagecolor{covercream}
\thispagestyle{empty}
% The illustration is decorative. The title and author remain live tagged text.
\AddToHookNext{shipout/background}{%
  \begin{bookdecorative}
  \begin{tikzpicture}[remember picture,overlay]
    \begin{scope}
      \clip (current page.north west) rectangle ([yshift=-9.75in]current page.north east);
      \node[anchor=north west,inner sep=0pt,yshift=2.125in] at (current page.north west) {\includegraphics[artifact,width=8.5in,height=12.75in]{book/assets/cover-artwork.png}};
    \end{scope}
  \end{tikzpicture}
  \end{bookdecorative}}
\setlength{\parskip}{0pt}
\setlength{\parindent}{0pt}
\begin{center}
{\bookserif\bfseries\fontsize{78}{82}\selectfont\color{coverink}''' + display + r'''\par}
\vspace{0in}
{\bookserif\fontsize{13.5}{16}\selectfont\addfontfeatures{LetterSpace=12}\color{covermuted}''' + expansion + r'''\par}
\vspace{-.05in}
{\bookserif\itshape\fontsize{12}{15}\selectfont\color{coverink}''' + subtitle + r'''\par}
\vspace{-.12in}
{\color{coveraccent}\rule{.45in}{1pt}\par}
\vspace{-.04in}
{\bookserif\fontsize{11.5}{14}\selectfont\addfontfeatures{LetterSpace=18}\color{coverink}''' + author + r'''\par}
\end{center}
\vfill
\noindent\hspace{.1in}{\bookserif\fontsize{8}{10}\selectfont\addfontfeatures{LetterSpace=18}\color{coverink}FIRST EDITION}\par
\clearpage
\restoregeometry
\pagecolor{bookpaper}
\endgroup
'''


def write_cover_source(work_dir: Path) -> Path:
    work_dir = Path(work_dir)
    work_dir.mkdir(parents=True, exist_ok=True)
    source = work_dir / 'mage-cover.tex'
    source.write_text(r'\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III}}' + '\n'
                      + r'\documentclass[12pt,oneside]{book}' + '\n'
                      + r'\usepackage[mage]{house}' + '\n'
                      + r'\begin{document}' + cover_tex() + r'\end{document}' + '\n')
    return source


def render_cover_pdf(work_dir: Path) -> Path:
    return compile_tex(write_cover_source(work_dir))


if __name__ == '__main__':
    render_cover_pdf(ROOT / 'latex/build/cover')
