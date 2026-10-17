"""Authoritative LaTeX chapters with a deterministic Pandoc compatibility projection.

Semantic div attributes live in a readable JSON comment on each bookbox environment;
all prose is ordinary LaTeX. Metadata lives in the adjacent .yaml file. The Markdown
projection is generated, never edited. Unknown raw LaTeX fails closed.
"""
from __future__ import annotations
import copy
from functools import lru_cache
import json
from pathlib import Path
import re
import subprocess
import yaml


@lru_cache(maxsize=512)
def pandoc(text, source, target, *args):
    run = subprocess.run(['pandoc', '-f', source, '-t', target, *args], input=text,
                         text=True, capture_output=True, check=True)
    if run.stderr.strip():
        raise ValueError(run.stderr)
    return run.stdout


def write_source(md: Path):
    ast = json.loads(pandoc(md.read_text(), 'markdown', 'json'))
    original = md.read_text()
    metadata = re.match(r'^---\n(.*?)\n---', original, re.S)
    if not metadata: raise ValueError(f'Missing metadata: {md}')
    ast.pop('meta')
    md.with_suffix('.yaml').write_text(metadata.group(1) + '\n')
    def emit(blocks):
        chunks = []
        for block in blocks:
            if block['t'] == 'Div':
                attrs, children = block['c']
                kind = attrs[1][0] if attrs[1] else 'note'
                title = dict(attrs[2]).get('title', '')
                title_tex = pandoc(title, 'markdown', 'latex').strip()
                chunks.append('\\begin{bookbox}{' + kind + '}{' + title_tex + '} % handbook-attrs: ' + json.dumps([attrs[0], attrs[1], [kv for kv in attrs[2] if kv[0] != 'title']], ensure_ascii=False)
                              + '\n' + emit(children) + '\n\\end{bookbox}')
            else:
                one = dict(ast, meta={}, blocks=[block])
                chunks.append(pandoc(json.dumps(one), 'json', 'latex', '--natbib', '--wrap=preserve').strip())
        return '\n\n'.join(chunks)
    tex = md.with_suffix('.tex')
    tex.write_text('% Authoritative manuscript. Edit this file; the sibling Markdown is generated.\n'
                   + emit(ast['blocks']) + '\n')
    return tex


def read_ast(tex: Path):
    tex = Path(tex)
    return copy.deepcopy(_read_ast_cached(tex, tex.stat().st_mtime_ns, tex.with_suffix(".yaml").stat().st_mtime_ns))


@lru_cache(maxsize=64)
def _read_ast_cached(tex: Path, tex_mtime, yaml_mtime):
    text = tex.read_text()
    attrs = []
    def begin(m):
        attr = json.loads(m.group(1))
        # Native environment arguments are authoritative; JSON holds ancillary
        # web attributes and stable IDs, never an alternative title/kind source.
        line = m.group(0)
        offset = len(r'\begin{bookbox}')
        args = []
        for _ in range(2):
            while line[offset].isspace(): offset += 1
            if line[offset] != '{': raise ValueError('Malformed bookbox arguments')
            start = offset + 1
            offset += 1
            depth = 1
            while depth:
                if line[offset] == '\\':
                    offset += 2
                    continue
                if line[offset] == '{': depth += 1
                if line[offset] == '}': depth -= 1
                offset += 1
            args.append(line[start:offset-1])
        kind, title_tex = args
        attr[1] = [kind] + attr[1][1:]
        title_ast = pandoc(title_tex, 'latex+raw_tex', 'json')
        if re.search(r'"t":\s*"Raw(?:Block|Inline)"', title_ast):
            raise ValueError(f'Unsupported raw LaTeX in box title: {title_tex}')
        title = pandoc(title_ast, 'json', 'markdown').strip() if title_tex else ''
        ancillary = {k:v for k,v in attr[2] if k != 'title'}
        if title: ancillary['title'] = title
        attr[2] = list(map(list, ancillary.items()))
        attrs.append(attr)
        return '\n\nHANDBOOKDIVSTART' + str(len(attrs)-1) + '\n\n'
    text = re.sub(r'^\\begin\{bookbox\}.*? % handbook-attrs: (.*)$', begin, text, flags=re.M)
    text = text.replace('\\end{bookbox}', '\n\nHANDBOOKDIVEND\n\n')
    text = re.sub(r'\\begin\{minipage\}\[[^]]*\]\{\\linewidth\}\\raggedright', '', text)
    text = text.replace(r'\end{minipage}', '').replace(r'\noalign{}', '').replace(r'\arraybackslash', '').replace(r'\endlastfoot', '')
    # Pandoc's writer repeats longtable column headings for continuation pages.
    # They are presentation, not a second authored row.
    text = re.sub(r'\\endfirsthead.*?\\endhead', '', text, flags=re.S)
    ast = json.loads(pandoc(text, 'latex+raw_tex', 'json'))
    def reject_raw(node):
        if isinstance(node, list):
            for child in node: reject_raw(child)
        elif isinstance(node, dict):
            # Pandoc retains the original citation command as its display fallback.
            # The citation record, not that fallback, drives all outputs.
            if node.get('t') == 'Cite':
                for citation in node['c'][0]:
                    reject_raw(citation['citationPrefix'])
                    reject_raw(citation['citationSuffix'])
                return
            if node.get('t') in ('RawBlock', 'RawInline'):
                raise ValueError(f'Unsupported raw LaTeX in {tex}: {node["c"]}')
            for child in node.values(): reject_raw(child)
    reject_raw(ast)
    stack = [[]]
    for block in ast['blocks']:
        marker = ''
        if block['t'] in ('Para', 'Plain'):
            marker = ''.join(x.get('c','') for x in block['c'] if x['t']=='Str')
        if marker.startswith('HANDBOOKDIVSTART'):
            index = int(marker.removeprefix('HANDBOOKDIVSTART'))
            node = {'t':'Div','c':[attrs[index],[]]}
            stack[-1].append(node)
            stack.append(node['c'][1])
        elif marker == 'HANDBOOKDIVEND':
            if len(stack)==1: raise ValueError('Unbalanced bookbox')
            stack.pop()
        else:
            stack[-1].append(block)
    if len(stack)!=1: raise ValueError('Unclosed bookbox')
    def restore_tables(value):
        if isinstance(value, list): return [restore_tables(x) for x in value]
        if not isinstance(value, dict): return value
        if value.get('t') == 'Image' and value['c'][1] == [{'t':'Str', 'c':'image'}]:
            value['c'][1] = []
        if value.get('t') == 'Div' and not value['c'][0][1] and len(value['c'][1]) == 1 and value['c'][1][0]['t'] == 'Table':
            table = value['c'][1][0]
            table['c'][0] = value['c'][0]
            return restore_tables(table)
        return {k: restore_tables(v) for k,v in value.items()}
    ast['blocks'] = restore_tables(stack[0])
    ast['meta'] = json.loads(pandoc('---\n' + tex.with_suffix('.yaml').read_text() + '---\n', 'markdown', 'json'))['meta']
    # Normalize citation display inlines and tight/loose list details through the
    # same Markdown reader used by all existing semantic validators.
    return json.loads(pandoc(pandoc(json.dumps(ast), 'json', 'markdown', '--standalone'), 'markdown', 'json'))


def markdown_projection(ast, tex):
    text = pandoc(json.dumps(ast), 'json', 'markdown', '--standalone', '--wrap=preserve')
    text = text.replace('---\n', '---\n# GENERATED from ' + tex.name + ' and ' + tex.with_suffix('.yaml').name + '; DO NOT EDIT this Markdown projection.\n', 1)
    return re.sub(r'\[\^([^]]+)\]', lambda m: '[^' + tex.stem + '-' + m.group(1) + ']', text)


def project(tex: Path):
    ast = read_ast(tex)
    text = markdown_projection(ast, tex)
    tex.with_suffix('.md').write_text(text)
    return ast

def sync_all(check=False):
    root = Path(__file__).resolve().parents[1]
    stale = []
    for folder in ('chapters', 'frontmatter'):
        for tex in sorted((root / folder).glob('*.tex')):
            ast = read_ast(tex)
            content = markdown_projection(ast, tex)
            md = tex.with_suffix('.md')
            if not md.exists() or md.read_text() != content:
                stale.append(md)
                if not check: md.write_text(content)
    if check and stale:
        raise SystemExit('Stale Handbook projections: ' + ', '.join(str(p) for p in stale))
    return stale


if __name__ == '__main__':
    import sys
    if sys.argv[1] == 'sync':
        sync_all('--check' in sys.argv)
    else:
        for name in sys.argv[2:]:
            path = Path(name)
            if sys.argv[1] == 'migrate': write_source(path)
            elif sys.argv[1] == 'project': project(path)
            else: raise SystemExit('Expected migrate, project, or sync [--check]')
