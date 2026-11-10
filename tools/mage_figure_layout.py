"""Reviewed print widths for original artwork, keyed by stable figure labels.

Native monochrome candidates retain their authored point sizes; the publication
pairing pass runs later. This does not authorize a monochrome replacement or
wrap an inset, and it preserves the complete caption and alternate text.
"""
from __future__ import annotations
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
LAYOUT = ROOT / 'book/data/figure-print-layout.json'


def _layout(path: Path) -> dict:
    data = json.loads(path.read_text())
    if data.get('version') != 1 or not isinstance(data.get('figures'), dict):
        raise ValueError('Unsupported figure print layout')
    return data['figures']


def inset_flow_labels(path: Path = LAYOUT) -> set[str]:
    """Explicitly reviewed inset figures may share pages with their prose."""
    return {label for label, rule in _layout(path).items()
            if rule.get('inset_placement') == 'flow'}


def inset_inline_labels(path: Path = LAYOUT) -> set[str]:
    """Reviewed complete insets retain nonfloating figures within their prose."""
    return {label for label, rule in _layout(path).items()
            if rule.get('inset_placement') == 'inline'}


def apply_figure_print_layout(latex: str, path: Path = LAYOUT) -> str:
    data = _layout(path)
    widths = {}
    placements = {}
    for label, rule in data.items():
        if rule.get('inset_placement') not in (None, 'flow', 'inline'):
            raise ValueError('Invalid inset placement for ' + label)
        if rule.get('float_placement') not in (None, '!htb'):
            raise ValueError('Invalid scoped float placement for ' + label)
        if rule.get('float_placement'):
            if rule.get('inset_placement'):
                raise ValueError('Scoped float placement cannot override an inset mode: ' + label)
            placements[label] = rule['float_placement']
        if not isinstance(rule.get('flush_after', False), bool):
            raise ValueError('Invalid float boundary for ' + label)
        if rule.get('flush_after'):
            raise ValueError('Figure layouts cannot force a page boundary: ' + label)
        width = rule.get('width_bp')
        if (rule.get('placement') != 'centered' or isinstance(width, bool) or
                not isinstance(width, (int, float)) or not 180 <= width <= 450):
            raise ValueError('Invalid centered print width for ' + label)
        widths[label] = width

    def figure(match):
        content = match[0]
        label = re.search(r'\\label\{([^}]+)\}', content)
        if label is None or label[1] not in widths:
            return content
        # Exact token replacement leaves graphic alt text, height limit and
        # caption braces alone. Every original comes from the common projector.
        if content.count(r'width=\linewidth') != 1:
            raise ValueError('Expected one original width for ' + label[1])
        content = content.replace(r'width=\linewidth',
                                  'width=' + str(widths[label[1]]) + 'bp', 1)
        if label[1] in placements:
            # Reviewed medium figures should use pages with explanatory text.
            # The publication pass preserves this opt-in on the native partner.
            content = re.sub(r'\\begin\{figure\}(?:\[[^]]*\])?',
                             lambda _: r'\begin{figure}[' + placements[label[1]] + ']',
                             content, count=1)
        return content

    return re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', figure, latex, flags=re.S)


def reading_guide_columns(latex: str) -> str:
    """Keep the compact map beside the chapter overview and the reading routes.

    The tagged book class conflicts with wrapfig's paragraph hooks. Two aligned
    columns provide the same narrow right-hand placement without wrapping a list
    or changing body size. Run after monochrome substitution so no image scales.
    """
    marker = r'\addcontentsline{toc}{chapter}{How to Read This Book}'
    if latex.count(marker) != 1:
        raise ValueError('Reading guide must retain its chapter heading')
    prefix, body = latex.split(marker, 1)
    figures = list(re.finditer(r'\\begin\{figure\}.*?\\end\{figure\}', body, re.S))
    if len(figures) != 1 or r'\label{book-map}' not in figures[0][0]:
        raise ValueError('Reading guide requires exactly its approved book map')
    figure = figures[0]
    prose, routes = body[:figure.start()].strip(), body[figure.end():].strip()
    if r'\begin{itemize}' in prose or r'\begin{itemize}' not in routes:
        raise ValueError('Reading routes must follow the introductory paragraphs')
    paragraphs = prose.split('\n\n')
    if len(paragraphs) != 4:
        raise ValueError('Reading guide requires its inventory, two signposts, and overview')
    introduction = '\n\n'.join(paragraphs[:3])
    navigation = paragraphs[3] + '\n\n' + routes
    navigation = re.sub(r'\bChapter (\d+)', r'Chapter~\1', navigation)
    artwork = re.sub(r'^\\begin\{figure\}(?:\[[^]]*\])?', '', figure[0])
    artwork = artwork.removesuffix(r'\end{figure}')
    alt = ('The Preface and seven chapters lead to the Conclusion. '
           'Chapters 2--5 form the software-engineering case.')
    return (prefix + marker + '\n\n' + introduction + '\n\n' +
            r'\noindent\begin{minipage}[t]{.53\linewidth}\vspace{0pt}' +
            r'\raggedright\setlength{\parskip}{0.25\baselineskip}' + '\n' + navigation + '\n' +
            r'\end{minipage}\hfill\begin{minipage}[t]{.45\linewidth}\vspace{0pt}' + '\n' +
            r'\begin{bookinlinefigure}{' + alt + '}' + artwork +
            r'\end{bookinlinefigure}\end{minipage}\par' + '\n')


def theory_perspectives_columns(latex: str) -> str:
    """Keep the theory's semantic table beside its opening paragraph.

    Use aligned columns, as in the reading guide, rather than wrapfig's
    incompatible tagged-paragraph hooks. The source remains an ordinary table
    for HTML and EPUB. Refuse extra content instead of silently dropping it.
    """
    start = '% <!-- print-columns-start: theory-perspectives -->'
    end = '% <!-- print-columns-end: theory-perspectives -->'
    if start not in latex and end not in latex:
        return latex
    if latex.count(start) != 1 or latex.count(end) != 1:
        raise ValueError('Theory perspectives require one complete column boundary')
    before, body = latex.split(start, 1)
    body, after = body.split(end, 1)
    if re.search(r'\\(?:begin\{bookbox\}|(?:sub)*section\b|footnote\b)', body):
        raise ValueError('Theory perspectives cannot span an inset or heading')
    tables = list(re.finditer(r'\\begin\{longtable\}.*?\\end\{longtable\}', body, re.S))
    if len(tables) != 1 or r'\label{theory-perspectives}' not in tables[0][0]:
        raise ValueError('Theory perspectives require their single labeled table')
    table = tables[0]
    prose = body[:table.start()].strip()
    if prose.endswith(r'{\footnotesize'):
        prose = prose.removesuffix(r'{\footnotesize').strip()
        if body[table.end():].strip() != '}':
            raise ValueError('Unexpected content after theory perspectives')
    elif body[table.end():].strip():
        raise ValueError('Unexpected content after theory perspectives')
    preamble, content = table[0].split(r'\caption', 1)
    caption, content = content.split(r'\tabularnewline', 1)
    header, content = content.split(r'\endfirsthead', 1)
    _, content = content.split(r'\endhead', 1)
    footer, rows = content.split(r'\endlastfoot', 1)
    rows = rows.removesuffix(r'\end{longtable}')
    tabular = re.sub(r'\\begin\{longtable\}(?:\[[^]]*\])?',
                     lambda _: r'\begin{tabular}', preamble, count=1)
    # Caption and table stay in the right column, with generous row leading.
    columns = (r'\noindent\begin{minipage}[t]{.41\linewidth}\vspace{0pt}'
               r'\raggedright\setlength{\parskip}{.25\baselineskip}' + '\n' + prose + '\n' +
               r'\end{minipage}\hfill\begin{minipage}[t]{.57\linewidth}\vspace{0pt}' + '\n' +
               r'\small\booktablecaptionstyle\renewcommand{\arraystretch}{1.25}' + '\n' +
               r'\captionof{table}' + caption + '\n' + tabular + header + rows + footer +
               r'\end{tabular}\end{minipage}\par' + '\n')
    return before + columns + after


def reasoning_horizon_columns(latex: str) -> str:
    """Place the compact comparison beside its ordinary closing prose.

    The tagged book format cannot use wrapfig's paragraph hooks. This locally
    aligned pair preserves body size, accessible artwork and caption numbering,
    and refuses to span an inset or section heading.
    """
    start = '% <!-- print-columns-start: reasoning-horizon-fig -->'
    end = '% <!-- print-columns-end: reasoning-horizon-fig -->'
    if start not in latex and end not in latex:
        return latex
    if latex.count(start) != 1 or latex.count(end) != 1:
        raise ValueError('Reasoning-horizon columns require one complete boundary')
    before, body = latex.split(start, 1)
    body, after = body.split(end, 1)
    if re.search(r'\\(?:begin\{bookbox\}|(?:sub)*section\b|footnote\b)', body):
        raise ValueError('Compact comparison cannot cross an inset or heading')
    figures = list(re.finditer(r'\\begin\{figure\}(?:\[[^]]*\])?.*?\\end\{figure\}', body, re.S))
    if len(figures) != 1 or r'\label{reasoning-horizon-fig}' not in figures[0][0]:
        raise ValueError('Compact comparison requires its single labeled figure')
    figure = figures[0]
    prose = (body[:figure.start()] + body[figure.end():]).strip()
    artwork = re.sub(r'^\\begin\{figure\}(?:\[[^]]*\])?', '', figure[0])
    artwork = artwork.removesuffix(r'\end{figure}')
    from mage_cover import _text
    receipt = json.loads((ROOT / 'book/tikz/receipts/reasoning-horizon.json').read_text())
    alt = _text(receipt['alt'])
    columns = (r'\noindent\begin{minipage}[t]{.50\linewidth}\vspace{0pt}'
               r'\raggedright\setlength{\parskip}{.45\baselineskip}' + '\n' + prose + '\n' +
               r'\end{minipage}\hfill\begin{minipage}[t]{.48\linewidth}\vspace{0pt}' + '\n' +
               r'\begin{bookinlinefigure}{' + alt + '}' + artwork +
               r'\end{bookinlinefigure}\end{minipage}\par' + '\n')
    return before + columns + after


def claims_spread(latex: str) -> str:
    """The approved claims and their diagram share one verso–recto section.

    Preserve the authored prose and body size. Only this deliberately facing-page
    reference spread gets a parity boundary; ordinary sections still flow.
    """
    if r'\label{mage-method}' not in latex:
        return latex
    figures = list(re.finditer(r'\\begin\{figure\}.*?\\end\{figure\}', latex, re.S))
    if len(figures) != 1 or r'\label{mage-method}' not in figures[0][0]:
        raise ValueError('The claims spread requires one approved monochrome diagram')
    lists = list(re.finditer(r'\\begin\{enumerate\}.*?\\end\{enumerate\}', latex, re.S))
    if not lists or sum(block[0].count(r'\item') for block in lists) != 6:
        raise ValueError('The claims spread must retain its six-claim list')
    if any(latex[a.end():b.start()].strip() for a, b in zip(lists, lists[1:])):
        raise ValueError('Cannot merge claim lists across intervening content')
    # The block projector emits each numbered paragraph as a separate list.
    # Rejoin this one semantic list so six default top/bottom margins do not
    # consume the space intended for its prose. The item bodies stay verbatim.
    items = []
    for block in lists:
        content = block[0].split(r'\item', 1)[1].removesuffix(r'\end{enumerate}')
        items.append(r'\item' + content)
    latex = (latex[:lists[0].start()] + r'\begin{enumerate}' + '\n'
             + '\n'.join(items) + r'\end{enumerate}' + latex[lists[-1].end():])
    left, right = latex.split(r'\end{enumerate}', 1)
    left += r'\end{enumerate}'
    heading = r'\chapter*{What This Book Argues}'
    compact_heading = (r'\begingroup\makeatletter'
                       r'\patchcmd{\@makeschapterhead}{\vskip18pt}{\vskip6pt}{}'
                       r'{\errmessage{Reference heading spacing changed}}'
                       + heading + r'\makeatother\endgroup')
    left = left.replace(heading, compact_heading, 1)
    # The house environment selects enumitem or native tagged-list keys for the
    # active LaTeX format. CI and the older local format use different interfaces.
    left = left.replace(r'\begin{enumerate}', r'\begin{bookclaims}')
    left = left.replace(r'\end{enumerate}', r'\end{bookclaims}')
    # Pandoc's compact-list declaration would otherwise override the reviewed gaps.
    left = left.replace(r'\tightlist', '')
    figure = figures[0][0]
    artwork = re.sub(r'^\\begin\{figure\}(?:\[[^]]*\])?', '', figure)
    artwork = artwork.removesuffix(r'\end{figure}')
    alt = ('The six claims connect commodity intelligence and scale to Modeling, '
           'Alignment and governance conversion. The conversion loop adapts both '
           'models and controls. Reorganization of engineering work is a prediction.')
    right = right.replace(figure, r'\begin{bookinlinefigure}{' + alt + '}' + artwork + r'\end{bookinlinefigure}')
    # After clearpage the counter names the next page. Insert only the parity leaf
    # needed to start on a left-hand page, in both complete and excerpt editions.
    parity = r'\clearpage\ifodd\value{page}\null\thispagestyle{empty}\newpage\fi'
    return parity + '\n' + left + '\n\\clearpage\n' + right
