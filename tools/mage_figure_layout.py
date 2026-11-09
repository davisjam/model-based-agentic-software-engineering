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
