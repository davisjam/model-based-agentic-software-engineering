"""Keep inset figures at normal page width in the generated print edition.

Native manuscript boxes remain intact. In print, prose uses breakable bookboxes.
Reviewed compact figures use ordinary floats with a fitted inset panel; other
figures keep their decorated page segments. The publication pass preserves the
same inset identity for each native-size monochrome partner.
"""
from __future__ import annotations

import re
import hashlib
from dataclasses import dataclass, field


@dataclass
class _Environment:
    name: str
    start: int
    opening_end: int
    parent: '_Environment | None'
    closing_start: int = 0
    end: int = 0
    children: list['_Environment'] = field(default_factory=list)


def _argument(text: str, pos: int) -> tuple[str, int]:
    while pos < len(text) and text[pos].isspace():
        pos += 1
    if pos >= len(text) or text[pos] != '{':
        raise ValueError('Expected a braced bookbox argument')
    start, depth = pos + 1, 1
    pos += 1
    while pos < len(text):
        if text[pos] == '\\':
            pos += 2
            continue
        if text[pos] == '%':
            newline = text.find('\n', pos)
            pos = len(text) if newline < 0 else newline + 1
            continue
        if text[pos] == '{':
            depth += 1
        elif text[pos] == '}':
            depth -= 1
            if not depth:
                return text[start:pos], pos + 1
        pos += 1
    raise ValueError('Unclosed bookbox argument')


def _environments(text: str) -> list[_Environment]:
    """Read generated environments, ignoring comments and literal code."""
    pattern = re.compile(r'\\(?:begin|end)\{([^{}]+)\}|\\verb\*?(.)|\\.|%', re.S)
    stack, result = [], []
    pos = 0
    while match := pattern.search(text, pos):
        pos = match.end()
        token = match[0]
        if token == '%':
            newline = text.find('\n', pos)
            pos = len(text) if newline < 0 else newline + 1
            continue
        if match[2] is not None:
            end = text.find(match[2], pos)
            if end < 0:
                raise ValueError('Unclosed inline verbatim command')
            pos = end + 1
            continue
        name = match[1]
        if name is None:
            continue
        if token.startswith(r'\begin'):
            if name in {'verbatim', 'Verbatim', 'lstlisting', 'minted'}:
                end = text.find(r'\end{' + name + '}', pos)
                if end < 0:
                    raise ValueError('Unclosed literal environment: ' + name)
                pos = end + len(r'\end{' + name + '}')
                continue
            env = _Environment(name, match.start(), pos, stack[-1] if stack else None)
            if env.parent:
                env.parent.children.append(env)
            result.append(env)
            stack.append(env)
        else:
            if not stack or stack[-1].name != name:
                raise ValueError('Unbalanced generated LaTeX environment: ' + name)
            env = stack.pop()
            env.closing_start, env.end = match.start(), pos
    if stack:
        raise ValueError('Unclosed generated LaTeX environment: ' + stack[-1].name)
    return result


def _only_space_or_comments(text: str) -> bool:
    return not re.sub(r'%[^\n]*', '', text).strip()


def isolate_inset_figures(text: str, *, flow_labels: set[str] | frozenset[str] = frozenset()) -> str:
    """Lift direct inset figures out of tcolorbox without altering artwork.

    Refuse a figure nested in a list, quote or another box: silently lifting it
    would change that structure. Such authored input needs an explicit boundary.
    Adjacent figures share one segment; no empty continuation box is emitted.
    """
    environments = _environments(text)
    boxes: dict[int, tuple[_Environment, list[_Environment]]] = {}
    for figure in (env for env in environments if env.name == 'figure'):
        ancestors = []
        parent = figure.parent
        while parent:
            ancestors.append(parent)
            parent = parent.parent
        containing = [env for env in ancestors if env.name == 'bookbox']
        if not containing:
            continue
        box = containing[0]
        if len(containing) != 1 or figure.parent is not box:
            raise ValueError('Inset figure must be a direct child of one bookbox; '
                             'close its nested list, quote or box before the figure')
        if any(env.name != 'document' for env in ancestors[1:]):
            raise ValueError('A bookbox containing figures must be at document level')
        boxes.setdefault(box.start, (box, []))[1].append(figure)

    replacements = []
    for box, figures in boxes.values():
        family, pos = _argument(text, box.opening_end)
        title, body_start = _argument(text, pos)
        opening = text[box.start:body_start]
        closing = text[box.closing_start:box.end]
        groups: list[list[_Environment]] = []
        for figure in figures:
            if groups and _only_space_or_comments(text[groups[-1][-1].end:figure.start]):
                groups[-1].append(figure)
            else:
                groups.append([figure])
        labels = [re.search(r'\\label\{([^}]+)\}', text[figure.start:figure.end])
                  for figure in figures]
        flowing = [label is not None and label[1] in flow_labels for label in labels]
        # A box has one placement mode. Mixing deferred construction with live
        # floats can invert figure counters, so partial declarations fail closed.
        if any(flowing) and not all(flowing):
            raise ValueError('Declare flow placement for every figure in an inset: ' + title)
        flow = bool(flowing) and all(flowing)
        queue_key = hashlib.sha256(text[box.start:box.end].encode()).hexdigest()[:16]
        parts = []
        cursor = body_start
        for index, group in enumerate(groups):
            prose = text[cursor:group[0].start]
            # The initial box carries its semantic title and any author label.
            # Subsequent segments exist only when there is intervening prose.
            if index == 0 or not _only_space_or_comments(prose):
                heading = opening if index == 0 else (
                    r'\begin{bookbox}{' + family + '}{' + title + ' (continued)}')
                parts.append(heading + prose + closing)
            else:
                parts.append(prose)
            floats = text[group[0].start:group[-1].end]
            if flow:
                # A normal float can share a page with prose. Its fitted panel
                # carries inset identity without coloring an otherwise empty page.
                # Retain figure environments for caption/tagging and publication
                # pairing; only the decoration lives inside each float.
                floats = re.sub(r'(\\begin\{figure\}(?:\[[^]]*\])?)',
                    lambda m: m[0] + '\n' + r'\begin{bookinsetfigure}{' + family + '}{' + title + '}', floats)
                floats = floats.replace(r'\end{figure}',
                    r'\end{bookinsetfigure}' + '\n' + r'\end{figure}')
                parts.append('\n' + floats + '\n')
            else:
                floats = re.sub(r'\\begin\{figure\}(?:\[[^]]*\])?',
                                lambda _: r'\begin{figure}[p]', floats)
                parts.append('\n' + r'\bookinsetfigurepagesdefer{' + queue_key + '}{' + family + '}{' + title + '}{\n'
                             + floats + '\n}\n')
            cursor = group[-1].end
        tail = text[cursor:box.closing_start]
        if not _only_space_or_comments(tail):
            parts.append(r'\begin{bookbox}{' + family + '}{' + title + ' (continued)}'
                         + tail + closing)
        else:
            parts.append(tail)
        replacements.append((box.start, box.end, '\n'.join(parts)))
    for start, end, replacement in reversed(replacements):
        text = text[:start] + replacement + text[end:]
    return text
