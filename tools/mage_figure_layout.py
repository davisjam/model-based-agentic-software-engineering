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


def apply_figure_print_layout(latex: str, path: Path = LAYOUT) -> str:
    data = _layout(path)
    widths = {}
    flush_after = set()
    for label, rule in data.items():
        if rule.get('inset_placement') not in (None, 'flow'):
            raise ValueError('Invalid inset placement for ' + label)
        if not isinstance(rule.get('flush_after', False), bool):
            raise ValueError('Invalid float boundary for ' + label)
        if rule.get('flush_after'):
            flush_after.add(label)
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
        # A reviewed exhibit must precede the following discussion. The later
        # pairing pass inserts its native companion before this flush too.
        if label[1] in flush_after:
            content += '\n' + r'\clearpage' + '\n'
        return content

    return re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', figure, latex, flags=re.S)
