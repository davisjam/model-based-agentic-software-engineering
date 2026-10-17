#!/usr/bin/env python3
"""Native LaTeX manuscript, deterministic web/model projections, and strict PDF builds."""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import hashlib
import inspect
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'book'))
import book_ir
import build_book as bb


def pandoc(text, source='markdown', target='latex', *extra):
    if target == 'latex': extra = (*extra, '--syntax-highlighting=none')
    result = subprocess.run(['pandoc', '-f', source, '-t', target, '--wrap=none', *extra], input=text + "\n", text=True, capture_output=True, check=True)
    if result.stderr.strip():
        raise RuntimeError(result.stderr)
    return result.stdout.strip()


FOOTNOTES = {}

def prepare(text):
    while '[note:' in text:
        start = text.index('[note:')
        end, depth = start + 6, 1
        while depth:
            if text[end] == '[': depth += 1
            elif text[end] == ']': depth -= 1
            end += 1
        note = text[start + 6:end - 1].strip()
        text = text[:start] + r'`\mageaside{' + inline(note) + '}`{=latex}' + text[end:]
    text = bb._FOOTNOTE_REF_RE.sub(lambda m: r'`\magefootnote{' + m[1] + '}{' + inline(FOOTNOTES[m[1]]) + '}`{=latex}', text)
    text = re.sub(r'\[cite:\s*([^\]]+)\]', lambda m: r'`\citep{' + m[1].strip().replace(';', ',') + '}`{=latex}', text)
    text = re.sub(r'\[ref:([^\]]+)\]', lambda m: r'`\autoref{' + m[1] + '}`{=latex}', text)
    text = re.sub(r'(?<!\()\{\{([^}]+)\}\}', lambda m: r'`\magevalue{' + m[1] + '}`{=latex}', text)
    # Chapter references resolve through the existing identity registry; links remain
    # portable to the online complete edition while this is a standalone chapter.
    return text


def inline(text):
    return pandoc(prepare(text), 'markdown-smart+raw_attribute+tex_math_single_backslash', 'latex')


def unique_labels(text):
    seen = {}
    def label(match):
        key = match[1]
        count = seen.get(key, 0)
        seen[key] = count + 1
        return r'\label{' + key + ('-' + str(count) if count else '') + '}'
    return re.sub(r'\\label\{([^}]+)\}', label, text)


def migrate(source: Path, destination: Path, driver_enabled=True, raw_override=None):
    source, destination = source.resolve(), destination.resolve()
    raw = source.read_text() if raw_override is None else raw_override
    # Standalone metadata terminators may immediately follow prose; keep them as
    # dedicated native comments rather than raw HTML inside a Pandoc paragraph.
    raw = re.sub(r'(?m)^(<!--[^\n]*-->)$', r'\n\1\n', raw)
    global FOOTNOTES
    raw, FOOTNOTES = bb.collect_footnote_defs(raw)
    title_match = re.search(r'<!-- chapter-title:\s*(.*?)\s*-->', raw) or re.search(r'^# (.+)$', raw, re.M)
    title = title_match[1] if title_match else source.stem
    destination.parent.mkdir(parents=True, exist_ok=True)
    rec = dict(slug=source.stem, part=2, chapter=1, title=title, body_md=raw)
    chapter = book_ir._parse_chapter(rec)
    result = ['% Authoritative LaTeX manuscript; Markdown is a generated compatibility projection.']
    pending_caption = None
    pending_label = None
    assets = []
    for block in chapter.blocks:
        text = block.raw
        if block.kind is book_ir.BlockKind.DIRECTIVE:
            result.extend('% ' + line for line in text.splitlines())
            match = re.match(r'<!--\s*(label|table):\s*(.*?)\s*-->', text)
            if match and match[1] == 'label': pending_label = match[2]
            if match and match[1] == 'table': pending_caption = match[2]
            continue
        if block.kind is book_ir.BlockKind.FIGURE:
            match = re.match(r'<!-- figure:\s*(.*?)\s*\|\s*(.*?)\s*-->', text, re.S)
            if not match: raise ValueError(text)
            asset, caption = match.groups()
            short_match = re.search(r'\s*\[short:\s*(.*?)\]', caption)
            short = '[' + inline(short_match[1]) + ']' if short_match else ''
            caption = re.sub(r'\s*\[short:.*?\]', '', caption)
            path = ROOT / 'book' / asset
            if not path.exists(): raise FileNotFoundError(path)
            pdf = ROOT / 'book/latex/assets' / (path.stem + '-' + hashlib.sha256(str(path.relative_to(ROOT)).encode()).hexdigest()[:10] + '.pdf')
            pdf.parent.mkdir(parents=True, exist_ok=True)
            if path.suffix == '.svg':
                if not pdf.exists() or path.stat().st_mtime > pdf.stat().st_mtime:
                    subprocess.run(['rsvg-convert', '--format=pdf', '--output', str(pdf), str(path)], check=True)
            else: pdf = path
            assets.append({'source': str(path.relative_to(ROOT)), 'pdf': str(pdf.relative_to(ROOT))})
            label = block.label or pending_label
            result.append('\\begin{figure}[htbp]\n\\centering\n\\includegraphics[width=\\linewidth]{' + str(pdf.relative_to(ROOT)) + '}\n\\caption' + short + '{' + inline(caption) + '}\n' + (r'\label{' + label + '}\n' if label else '') + r'\end{figure}')
            pending_label = None
        elif block.kind is book_ir.BlockKind.BLOCKQUOTE:
            inner = re.sub(r'^> ?', '', text, flags=re.M)
            match = re.match(r'####\s+(.*?)\s*\{#([^}]+)\}\n+', inner)
            if match:
                heading, label = match.groups()
                prefix = re.match(r'^Inset\s*[—–-]\s*', heading)
                result.append(('% mage-box-prefix: ' + (prefix[0] if prefix else '')).rstrip())
                result.append(r'\begin{bookbox}{inset}{' + inline(re.sub(r'^Inset\s*[—–-]\s*', '', heading)) + '}\n' + r'\label{' + label + '}\n' + inline(inner[match.end():]) + '\n' + r'\end{bookbox}')
            else: result.append(inline(re.sub(r'^(>\s*)#(#{1,5} )', r'\1\2', text, flags=re.M)))
        elif block.kind is book_ir.BlockKind.TABLE:
            pending_caption = block.caption
            pending_label = block.label
            ast = json.loads(pandoc(prepare(text), 'markdown-smart+raw_attribute+tex_math_single_backslash', 'json'))
            table = ast['blocks'][0]
            if pending_caption:
                caption = re.sub(r'\s*\[short:.*?\]', '', pending_caption)
                caption_ast = json.loads(pandoc(prepare(caption), 'markdown-smart+raw_attribute+tex_math_single_backslash', 'json'))
                short_match = re.search(r'\[short:\s*(.*?)\]', pending_caption)
                short = json.loads(pandoc(prepare(short_match[1]), 'markdown-smart+raw_attribute', 'json'))['blocks'][0]['c'] if short_match else None
                table['c'][1] = [short, caption_ast['blocks']]
            if pending_label: table['c'][0][0] = pending_label
            latex = pandoc(json.dumps(ast), 'json', 'latex')
            result.append('{\\footnotesize\n' + latex + '\n}')
            pending_label = pending_caption = None
        elif block.kind is book_ir.BlockKind.CODE:
            language = text.splitlines()[0].lstrip('`').strip()
            result.append('% mage-code-language: ' + (language or 'text') + '\n' + pandoc(text, 'markdown', 'latex'))
        elif block.kind is book_ir.BlockKind.EQ:
            equation = re.match(r'<!-- eq:\s*(.*?)\s*-->', text, re.S)[1]
            equation = re.sub(r'(?<!\\)\$', lambda m: r'\$', equation)
            result.append('\\[\n' + equation + '\n\\]')
        elif block.kind is book_ir.BlockKind.OTHER and block.directive == 'coda-rule':
            result.append(r'\magerule{}')
        elif block.kind is book_ir.BlockKind.HEADING and block.heading_level == 1:
            result.append(r'\chapter{' + inline(title) + '}')
        elif block.kind is book_ir.BlockKind.HEADING:
            result.append(inline(text[1:]))
        elif block.kind in { book_ir.BlockKind.PARA, book_ir.BlockKind.LIST, book_ir.BlockKind.ORDERED_LIST, book_ir.BlockKind.CODE}:
            result.append(inline(text))
        else:
            raise ValueError(f'Unsupported manuscript block: {block.kind}: {text[:100]}')
    native = '\n\n'.join(result)
    native = re.sub(r'(\\(?:sub)*section\{[^\n]+\}\\label\{)([^}]+)(\})', lambda m: m[1] + 'heading:' + m[2] + m[3], native)
    explicit = set(re.findall(r'\{#([A-Za-z0-9_-]+)\}', raw))
    auto = [label for label in re.findall(r'\\label\{heading:([^}]+)\}', native) if label not in explicit]
    native = '\n'.join('% mage-auto-heading: ' + label for label in auto) + '\n' + native
    destination.write_text(unique_labels(native) + '\n')
    destination.with_suffix('.assets.json').write_text(json.dumps(assets, indent=2) + '\n')
    if not driver_enabled: return
    bibliography = (ROOT / 'book/references.bib').read_text()
    bibliography = re.sub(r'^%.*$', '', bibliography, flags=re.M)
    (destination.parent / 'references.bib').write_text(bibliography)
    driver = destination.parent / 'main.tex'
    chapter_commands = '\n'.join(r'\expandafter\def\csname magechapter' + key + r'\endcsname{Chapter ' + str(number) + '}' for key, number in bb._CHAPTER_LABELS.items())
    driver.write_text(r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[12pt,openany]{book}
\usepackage[mage]{house}
\usepackage{longtable,booktabs,array,calc}
\usepackage[numbers]{natbib}
\setlength{\emergencystretch}{2em}
\providecommand{\tightlist}{\setlength{\itemsep}{0pt}\setlength{\parskip}{0pt}}
\providecommand{\pandocbounded}[1]{#1}
\newcommand{\magechapter}[1]{\csname magechapter#1\endcsname}
''' + chapter_commands + r'''
\begin{document}
\setcounter{chapter}{1}
\input{''' + str(destination.relative_to(ROOT)) + r'''}
\bibliographystyle{book/latex/mageplainnat}
\bibliography{''' + str(destination.parent.relative_to(ROOT)) + r'''/references}
\end{document}
''')


def argument(text, command):
    """Read a balanced mandatory TeX argument (captions can contain emphasis)."""
    start = text.index(command) + len(command)
    if text[start] == '[':
        start = text.index(']', start) + 1
    if text[start] != '{': raise ValueError(command)
    depth = 1
    pos = start + 1
    while depth:
        if text[pos] == '{' and text[pos - 1] != '\\': depth += 1
        if text[pos] == '}' and text[pos - 1] != '\\': depth -= 1
        pos += 1
    return text[start + 1:pos - 1]


def guard_native(text):
    """Pandoc's default reader discards unknown macros; audit its raw-preserving AST first."""
    ast = json.loads(pandoc(text, 'latex+raw_tex', 'json'))
    formatting = {r'\arraybackslash', r'\noalign{}', r'\endhead', r'\endlastfoot', r'\endfirsthead', r'\toprule', r'\midrule', r'\bottomrule', r'\raggedleft', r'\raggedright', r'\centering'}
    def walk(value):
        if isinstance(value, dict):
            if value.get('t') in ('RawInline', 'RawBlock') and value['c'][1].strip() not in formatting:
                raise ValueError('Unsupported LaTeX in compatibility projection: ' + repr(value))
            for child in value.values(): walk(child)
        elif isinstance(value, list):
            for child in value: walk(child)
    walk(ast)


def strip_noops(value):
    if isinstance(value, list):
        return [strip_noops(child) for child in value if not (isinstance(child, dict) and child.get('t') in ('RawInline', 'RawBlock') and child.get('c') == ['html', ''])]
    if isinstance(value, dict): return {key: strip_noops(child) for key, child in value.items()}
    return value


def compatibility(source: Path, output: Path):
    """Project native source into legacy Markdown for existing model/web consumers."""
    source = source.resolve()
    text = source.read_text().replace(r'\mbox{}', '')
    box_prefixes = [value.rstrip() + ' ' if value.strip() else ''
                    for value in re.findall(r'^% mage-box-prefix:[ \t]*(.*)$', text, re.M)]
    text = re.sub(r'^% mage-box-prefix:.*$', '', text, flags=re.M)
    code_languages = re.findall(r'^% mage-code-language: (.*)$', text, re.M)
    text = re.sub(r'^% mage-code-language: .*$', '', text, flags=re.M)
    text = re.sub(r'(\\label\{)heading:([^}]+)(\})', r'\1\2\3', text)
    auto_headings = re.findall(r'^% mage-auto-heading: (.*)$', text, re.M)
    text = re.sub(r'^% mage-auto-heading: .*$', '', text, flags=re.M)
    synthetic_chapter = r'\chapter{' not in text
    if synthetic_chapter: text = r'\chapter{MAGEPROJECTIONONLY}' + '\n' + text
    replacements = {}
    def token(value):
        key = 'MAGETOKEN' + str(len(replacements)) + 'END'
        replacements[key] = value
        return key
    text = re.sub(r'\\textquotesingle(?:\{\}| )', lambda m: token("'"), text)
    text = text.replace('"', token('"'))
    text = text.replace('{[}', token('[')).replace('{]}', token(']'))
    text = text.replace(r'\item[$\square$]', r'\item ' + token('☐') + ' ')
    def md(value):
        guard_native(value)
        ast = json.loads(pandoc(value, 'latex', 'json'))
        def clean(value):
            if isinstance(value, list):
                result = []
                for child in value:
                    if isinstance(child, dict) and child.get('t') == 'Div': result.extend(clean(child['c'][1]))
                    else: result.append(clean(child))
                return result
            if isinstance(value, dict):
                if value.get('t') in ('RawInline', 'RawBlock') and value.get('c', ['', ''])[1].strip() in {r'\arraybackslash', r'\noalign{}', r'\endhead', r'\endlastfoot', r'\endfirsthead', r'\toprule', r'\midrule', r'\bottomrule', r'\raggedleft', r'\raggedright', r'\centering'}:
                    return dict(value, c=['html', ''])
                if value.get('t') in ('RawInline', 'RawBlock'):
                    raise ValueError('Unsupported LaTeX in nested projection: ' + repr(value))
                return {k: clean(v) for k,v in value.items()}
            return value
        return pandoc(json.dumps(strip_noops(clean(ast))), 'json', 'markdown-smart-tex_math_dollars+tex_math_single_backslash-multiline_tables-grid_tables-simple_tables+pipe_tables', '--markdown-headings=atx')
    text = re.sub(r'\\magevalue\{([^}]+)\}', lambda m: token('{{' + m[1] + '}}'), text)
    text = re.sub(r'\\autoref\{([^}]+)\}', lambda m: token('[ref:' + m[1] + ']'), text)
    text = re.sub(r'\\cite[pt]\{([^}]+)\}', lambda m: token('[cite: ' + m[1].replace(',', ';') + ']'), text)
    footnotes = {}
    while r'\magefootnote{' in text:
        start = text.index(r'\magefootnote{')
        key = argument(text[start:], r'\magefootnote')
        prefix = r'\magefootnote{' + key + '}'
        body = argument(text[start:], prefix)
        full = prefix + '{' + body + '}'
        footnotes[key] = md(body)
        text = text[:start] + token('[^' + key + ']') + text[start + len(full):]
    while r'\mageaside{' in text:
        start = text.index(r'\mageaside{')
        body = argument(text[start:], r'\mageaside')
        full = r'\mageaside{' + body + '}'
        text = text[:start] + token('[note: ' + md(body) + ']') + text[start + len(full):]
    text = re.sub(r'^% (<!--.*?-->)$', lambda m: '\n\n' + token(m[1]) + '\n\n', text, flags=re.M)
    text = re.sub(r'\\magevalue\{([^}]+)\}', lambda m: token('{{' + m[1] + '}}'), text)
    text = text.replace(r'\magerule{}', token('<!-- coda-rule -->'))
    text = re.sub(r'\\\[(.*?)\\\]', lambda m: '\n\n' + token('<!-- eq: ' + m[1].strip().replace(r'\$', '$') + ' -->') + '\n\n', text, flags=re.S)
    text = re.sub(r'\\autoref\{([^}]+)\}', lambda m: token('[ref:' + m[1] + ']'), text)
    text = re.sub(r'\\cite[pt]\{([^}]+)\}', lambda m: token('[cite: ' + m[1].replace(',', ';') + ']'), text)
    assets = {a['pdf']:a['source'].removeprefix('book/') for a in json.loads(source.with_suffix('.assets.json').read_text())}
    def figure(match):
        content = match[0]
        path = re.search(r'\\includegraphics\[[^]]*\]\{([^}]+)\}', content)[1]
        caption = md(argument(content, r'\caption'))
        short = re.search(r'\\caption\[([^]]+)\]', content)
        if short: caption += ' [short: ' + md(short[1]) + ']'
        label = argument(content, r'\label') if r'\label{' in content else None
        return '\n\n' + token(('<!-- label: ' + label + ' -->\n' if label else '') + '<!-- figure: ' + assets[path] + ' | ' + caption + ' -->') + '\n\n'
    text = re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', figure, text, flags=re.S)
    def box(match):
        content = match[0]
        heading = re.search(r'\\begin\{bookbox\}\{[^}]+\}\{([^}]+)\}', content)
        label = argument(content, r'\label')
        body = content[heading.end():].replace(r'\label{' + label + '}', '').replace(r'\end{bookbox}', '')
        quote = '#### ' + (box_prefixes.pop(0) if box_prefixes else '') + md(heading[1]) + ' {#' + label + '}\n\n' + md(body)
        return '\n\n' + token('\n'.join('> ' + line if line else '>' for line in quote.splitlines())) + '\n\n'
    text = re.sub(r'\\begin\{bookbox\}.*?\\end\{bookbox\}', box, text, flags=re.S)
    text = text.replace('{\\footnotesize\n', '').replace('\n}\n', '\n')
    # Pandoc's LaTeX reader treats leading numeric text in ragged p columns as
    # a dimension argument. Protect cell contents before its table parser.
    text = re.sub(r'(?<=& )([0-9][0-9,.]*)', lambda m: token(m[1]), text)
    text = re.sub(r'\\endfirsthead.*?\\endhead', lambda m: r'\endhead', text, flags=re.S)
    guard_native(text)
    ast = json.loads(pandoc(text, 'latex', 'json'))
    def reject_raw(value):
        if isinstance(value, dict):
            if value.get('t') in ('RawInline', 'RawBlock') and value.get('c', ['', ''])[1].strip() in {r'\arraybackslash', r'\noalign{}', r'\endhead', r'\endlastfoot', r'\endfirsthead', r'\toprule', r'\midrule', r'\bottomrule', r'\raggedleft', r'\raggedright', r'\centering'}:
                value['c'] = ['html', '']
                return
            if value.get('t') in ('RawInline', 'RawBlock'):
                raise ValueError('Unsupported LaTeX in compatibility projection: ' + repr(value))
            for child in value.values(): reject_raw(child)
        elif isinstance(value, list):
            for child in value: reject_raw(child)
    reject_raw(ast)
    ast = strip_noops(ast)
    if synthetic_chapter: ast['blocks'].pop(0)
    def restore_code(value):
        if isinstance(value, dict):
            if value.get('t') == 'CodeBlock': value['c'][0][1] = [code_languages.pop(0) if code_languages else 'text']
            for child in value.values(): restore_code(child)
        elif isinstance(value, list):
            for child in value: restore_code(child)
    restore_code(ast)
    for i, block in enumerate(ast['blocks']):
        wrapper_id = ''
        if block['t'] == 'Div' and len(block['c'][1]) == 1 and block['c'][1][0]['t'] == 'Table':
            wrapper_id = block['c'][0][0]
            block = block['c'][1][0]
        if block['t'] != 'Table': continue
        table = block['c']
        caption_ast = dict(ast, blocks=table[1][1])
        caption = pandoc(json.dumps(caption_ast), 'json', 'markdown-smart-tex_math_dollars+tex_math_single_backslash', '--markdown-headings=atx')
        if table[1][0]:
            short_ast = dict(ast, blocks=[{'t':'Plain', 'c':table[1][0]}])
            caption += ' [short: ' + pandoc(json.dumps(short_ast), 'json', 'markdown-smart-tex_math_dollars+tex_math_single_backslash') + ']'
        table[1] = [None, []]
        table_id = table[0][0] or wrapper_id
        table[0][0] = ''
        def flatten(value):
            if isinstance(value, list):
                result = []
                for child in value:
                    if isinstance(child, dict) and child.get('t') == 'Div': result.extend(flatten(child['c'][1]))
                    else: result.append(flatten(child))
                return result
            if isinstance(value, dict): return {k: flatten(v) for k, v in value.items()}
            return value
        block = flatten(block)
        table_md = pandoc(json.dumps(dict(ast, blocks=[block])), 'json', 'markdown-smart-tex_math_dollars+tex_math_single_backslash-multiline_tables-grid_tables-simple_tables+pipe_tables', '--markdown-headings=atx')
        table_md = re.sub(r'(?<=\|):(-+)(?=\|)', r'\1', table_md)
        text_marker = '<!-- label: ' + table_id + ' -->\n<!-- table: ' + caption + ' -->\n' + table_md
        ast['blocks'][i] = {'t':'Para', 'c':[{'t':'Str', 'c':token(text_marker)}]}
    for block in ast['blocks']:
        if block['t'] == 'BulletList':
            for item in block['c']:
                for part in item:
                    if part['t'] == 'Para': part['t'] = 'Plain'
    result = pandoc(json.dumps(ast), 'json', 'markdown-smart-tex_math_dollars+tex_math_single_backslash', '--markdown-headings=atx')
    if footnotes:
        result += '\n\n' + '\n\n'.join('[^' + k + ']: ' + v for k, v in footnotes.items())
    # Resolve nested placeholders introduced by captions, boxes, and footnotes.
    for _ in range(len(replacements) + 1):
        previous = result
        for key, value in replacements.items(): result = result.replace(key, value)
        if result == previous: break
    if re.search(r'MAGETOKEN[0-9]+END', result):
        raise ValueError('Unresolved native-projection placeholder')
    result = result.replace('%7B%7Bproduct_url%7D%7D', '{{product_url}}')
    for label in auto_headings:
        result = result.replace(' {#' + label + '}', '')
    notice = '<!-- GENERATED from ' + str(source.relative_to(ROOT)) + '; edit the LaTeX source, then run tools/mage_latex.py sync. -->\n\n'
    output.write_text(notice + result + '\n')



MANIFEST = ROOT / 'book/latex/native-sources.json'


def author_sources():
    directories = ['frontmatter', 'part1', 'part2', 'part3', 'part4', 'part5', 'part6', 'part7', 'conclusion', 'backmatter']
    directories += ['appendix-stacks', 'appendix-skill-recipe', 'appendix-field-guide', 'appendix-models', 'appendix-evidence-ledger', 'appendix-engineering-moves', 'appendix-product-lifecycle', 'appendix-adopting-genai', 'appendix-crazy-ideas', 'appendix-operators-reference']
    sources = [p for directory in directories for p in sorted((ROOT / 'book' / directory).glob('*.md'))]
    sources += [ROOT / 'book/appendix-part-1-practice.md', ROOT / 'book/appendix-part-2-evidence.md']
    return sources


def migrate_all():
    records = []
    for source in author_sources():
        relative = source.relative_to(ROOT / 'book')
        destination = ROOT / 'book/latex/sources' / relative.with_suffix('.tex')
        migrate(source, destination, driver_enabled=False)
        records.append({'source': str(destination.relative_to(ROOT)), 'projection': str(source.relative_to(ROOT))})
        print('Migrated', relative, flush=True)
    MANIFEST.write_text(json.dumps({'version': 1, 'sources': records}, indent=2) + '\n')


def sync(check=False):
    manifest = json.loads(MANIFEST.read_text())
    stale = []
    renderer_version = subprocess.check_output(['pandoc', '--version'], text=True).splitlines()[0]
    engine_hash = hashlib.sha256((renderer_version + ''.join(inspect.getsource(function) for function in (pandoc, argument, guard_native, strip_noops, compatibility))).encode()).hexdigest()
    for record in manifest['sources']:
        source, projection = ROOT / record['source'], ROOT / record['projection']
        source_hash = hashlib.sha256(source.read_bytes() + source.with_suffix('.assets.json').read_bytes()).hexdigest()
        projection_hash = hashlib.sha256(projection.read_bytes()).hexdigest() if projection.exists() else None
        if manifest.get('engine_hash') == engine_hash and record.get('source_hash') == source_hash and record.get('projection_hash') == projection_hash:
            continue
        with tempfile.TemporaryDirectory(prefix='mage-projection-') as directory:
            target = Path(directory) / 'projection.md'
            compatibility(source, target)
            data = target.read_bytes()
        if not projection.exists() or projection.read_bytes() != data:
            stale.append(record['projection'])
            if not check: projection.write_bytes(data)
        if not check:
            record['source_hash'] = source_hash
            record['projection_hash'] = hashlib.sha256(data).hexdigest()
    if not check:
        manifest['engine_hash'] = engine_hash
        manifest['renderer_version'] = renderer_version
        MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
    if check and stale: raise SystemExit('Stale native-LaTeX projections:\n' + '\n'.join(stale))
    print(f'MAGE LaTeX: {len(manifest["sources"])} sources checked; {len(stale)} projections ' + ('stale' if check else 'updated'))




def _prepare_record(task):
    index, record = task
    directory = ROOT / record['_build_directory']
    slug = record['slug']
    raw = record['body_md']
    occurrences = {}
    def index_marker(match):
        kind = 'def' if match[1] == 'index-def' else 'ex'
        key = (match[2], kind)
        occurrence = occurrences.get(key, 0)
        occurrences[key] = occurrence + 1
        anchor = record['_index_anchors'][(match[2], kind, occurrence)]
        return match[0] + '\n\n<!-- latex-index-anchor: ' + anchor + ' -->'
    raw = re.sub(r'<!-- (index-def|index-example): ([^ >]+) -->', index_marker, raw)
    orientation = ''
    if record.get('is_part_page'):
        part = record['part']
        asset = ROOT / f'book/assets/nav-subway-p{part}.svg'
        asset_pdf = ROOT / f'book/latex/assets/nav-subway-p{part}.pdf'
        subprocess.run(['rsvg-convert', '--format=pdf', '--output', str(asset_pdf), str(asset)], check=True)
        vocab = json.loads((ROOT / 'book-models/nav-model.json').read_text())['parts'][str(part)]
        orientation = r'\chapter*{' + inline(f'Chapter {part}: ' + record['part_title']) + '}\\label{part:' + str(part) + '}\n'
        orientation += r'\includegraphics[width=\linewidth,alt={Book chapter navigation}]{' + str(asset_pdf.relative_to(ROOT)) + '}\n\\par\\medskip\n'
        orientation += r'\textbf{' + inline(bb._PART_OPENER_QUESTION_LABEL.upper()) + '}\\par\n' + inline(bb._PART_OPENER_QUESTIONS[part]) + '\n\\par\\medskip\n'
        principle = re.search(r'(?m)^<!-- principlebox -->.*?^(>[^\n]*(?:\n>[^\n]*)*)', raw, re.S)
        if principle:
            for anchor in re.findall(r'<!-- latex-index-anchor: ([^ >]+) -->', principle[0]):
                orientation += r'\phantomsection\label{' + anchor + '}\n'
            quote = re.sub(r'^> ?', '', principle[1], flags=re.M)
            title, _, body = quote.partition('\n')
            orientation += r'\begin{bookbox}{principle}{' + inline(title.lstrip('# ')) + '}\n' + inline(body) + '\n' + r'\end{bookbox}' + '\n'
            raw = raw[:principle.start()] + raw[principle.end():]
        for label, field in [('Carrying forward','carrying_forward'),('New here','new_here_vocab')]:
            if vocab.get(field): orientation += '\n\\par\\medskip\n' + r'\textbf{' + label.upper() + '}\\par\n' + inline(' · '.join(vocab[field])) + '\n'
        orientation += '\n\\clearpage\n'
    raw = bb._apply_gh_refs(bb._apply_design_tokens(bb._apply_part_refs(bb._apply_metrics(raw, bb._load_metrics()))))
    raw = re.sub(r'\[\[([^]|]+)(?:\|([^]]+))?\]\]', lambda m: '[' + (m[2] or m[1]) + '](../ABSTRACTIONS.html#' + m[1] + ')', raw)
    raw = re.sub(r'\[\+([^]]+)\+\]', r'*\1*', raw)
    md_source = directory / (slug + '.md')
    tex_source = directory / (slug + '.tex')
    md_source.write_text('<!-- chapter-title: ' + record['chapter_title'] + ' -->\n\n# ' + record['chapter_title'] + '\n\n' + raw)
    migrate(md_source, tex_source, driver_enabled=False)
    latex = tex_source.read_text().replace('█', r'\rule{.5em}{.8em}').replace('░', r'\textcolor{gray}{\rule{.5em}{.8em}}').replace(r'\item[$\square$]', r'\item[{\fbox{\rule{0pt}{.45em}\hspace{.45em}}}]')
    def code_size(match):
        longest = max(map(len, match[1].splitlines()), default=0)
        size = r'\fontsize{8.5}{10.5}\selectfont' if longest > 96 else (r'\fontsize{9}{11}\selectfont' if longest > 88 else r'\footnotesize')
        return '{' + size + '\n' + match[0] + '\n}'
    latex = re.sub(r'\\begin\{verbatim\}(.*?)\\end\{verbatim\}', code_size, latex, flags=re.S)
    def local_box_headings(match):
        value = match[0]
        while (heading := re.search(r'\\(?:sub)*section\*?(?=\{)', value)):
            command = heading[0]
            title = argument(value[heading.start():], command)
            full = command + '{' + title + '}'
            value = value[:heading.start()] + r'\par\noindent\textbf{' + title + r'}\par' + value[heading.start() + len(full):]
        return value
    latex = re.sub(r'\\begin\{(quote|bookbox)\}.*?\\end\{\1\}', local_box_headings, latex, flags=re.S)
    def concise_caption(match):
        body = argument(match[0], r'\caption')
        plain = pandoc(body, 'latex', 'plain')
        short = bb._derive_short(plain)
        return r'\caption[' + inline(short) + ']{' + body + '}'
    latex = re.sub(r'\\caption\{(?:[^{}]|\{[^{}]*\})*\}', concise_caption, latex)
    def accessible_figure(match):
        content = match[0]
        caption = pandoc(argument(content, r'\caption'), 'latex', 'plain')
        from mage_cover import _text
        return content.replace(r'\includegraphics[', r'\includegraphics[height=.66\textheight,keepaspectratio,alt={' + _text(caption) + '},', 1)
    latex = re.sub(r'\\begin\{figure\}.*?\\end\{figure\}', accessible_figure, latex, flags=re.S)

    from latex_build import bold_table_headers, single_page_tables
    latex = bold_table_headers(latex)
    latex = re.sub(r'\\(?:toprule|midrule|bottomrule)(?:\\noalign\{\})?', lambda m: r'\hline', latex)
    # This five-column comparison fits at its normal table size on one page.
    # Float it intact instead of stranding the final row on a continuation page.
    latex = single_page_tables(latex, {'semantic-commitment-spectrum'})
    # Headings repeat between chapters; make destination identities unambiguous.
    latex = re.sub(r'(\\(?:sub)*section\{[^\n]+\}\\label\{)([^}]+)(\})', lambda m: m[1] + slug + ':' + m[2] + m[3], latex)
    # Each record retains its explicit chapter title and a unique chapter anchor.
    latex = latex.replace('\\chapter{', '\\chapter*{', 1)
    latex = latex.replace('\\chapter*{' + inline(record['chapter_title']) + '}', '\\chapter*{' + inline(record['chapter_title']) + '}\n\\phantomsection\\label{chapter:' + slug + '}\n\\addcontentsline{toc}{chapter}{' + inline(record['chapter_title']) + '}', 1)
    if not record.get('is_part_page') and not record.get('is_matter') and not record.get('_group_start'):
        latex = re.sub(r'\\(sub)*section(?=[{*])', lambda m: r'\subsubsection' if m[1] else r'\subsection', latex)
        prefix = f"{record['part']}.{record['chapter']} " if 0 < record['part'] < 9 and record.get('chapter',0) else ''
        latex = latex.replace(r'\chapter*{', r'\section*{' + prefix, 1)
    counters = r'\setcounter{chapter}{' + str(record['part'] if isinstance(record['part'], int) else 0) + '}\n'
    chapter_letter = re.match(r'Appendix ([A-Z]) [—–-]', record['part_title'])
    counters += r'\renewcommand{\thechapter}{' + (chapter_letter[1] if chapter_letter else r'\arabic{chapter}') + '}\n'
    counters += r'\setcounter{section}{' + str(record.get('chapter',0)) + '}\n' + r'\setcounter{subsection}{0}' + '\n'
    if '_figure_start' in record:
        counters += r'\setcounter{figure}{' + str(record['_figure_start']) + r'}\setcounter{table}{' + str(record['_table_start']) + '}' + '\n'
    elif record.get('_group_start'):
        counters += r'\setcounter{figure}{0}\setcounter{table}{0}' + '\n'
    latex = orientation + counters + latex
    latex = re.sub(r'^% <!-- latex-index-anchor: ([^ >]+) -->$', lambda m: r'\phantomsection\label{' + m[1] + '}', latex, flags=re.M)
    latex = re.sub(r'^\\chapter[^\n]+', lambda m: m[0].replace(',', r'\magecomma{}'), latex, flags=re.M)
    if slug == '0.3-the-mage-method-at-a-glance':
        # Keep this reference sheet on one page with compact introductory text,
        # caption spacing and a scoped figure height.
        latex = (r'\clearpage\newgeometry{top=.5in,bottom=.5in,left=1.125in,right=1.125in}\begingroup\small\captionsetup{font=footnotesize}' + '\n'
                 + latex.replace('[htbp]', '[!htbp]').replace('height=.66', 'height=.50') + '\n' + r'\clearpage\endgroup\restoregeometry' + '\n')
    if slug == 'appendix-a-composing-a-stack':
        latex = latex.replace('[htbp]', '[!htbp]').replace('height=.66', 'height=.50')
    tex_source.write_text(latex)
    print('Prepared native print chapter', slug, flush=True)
    return str(tex_source.relative_to(ROOT))

def native_float_lists(chapters):
    """Printed locators without experimental TOC destination-structure links."""
    entries = {'figure': [], 'longtable': []}
    for chapter in chapters:
        path = ROOT / chapter
        def collect(match):
            content, kind = match[0], match[1]
            if kind == 'table': kind = 'longtable'
            cap = re.search(r'\\caption(?:\[([^]]*)\])?', content)
            if not cap: return content
            body = argument(content[cap.start():], cap[0])
            # The optional short title is group 1 of the caption match.
            title = cap[1] or inline(bb._derive_short(pandoc(body, 'latex', 'plain')))
            label = argument(content, r'\label') if r'\label{' in content else None
            if label is None:
                label = 'mage-list-' + kind + '-' + str(len(entries[kind]))
                full = cap[0] + '{' + body + '}'
                content = content.replace(full, full + r'\label{' + label + '}', 1)
            entries[kind].append(r'\noindent\ref*{' + label + r'}\quad ' + title + r'\dotfill\pageref*{' + label + r'}\par\smallskip')
            return content
        value = re.sub(r'\\begin\{(figure|longtable|table)\}.*?\\end\{\1\}', collect, path.read_text(), flags=re.S)
        path.write_text(value)
    return '\n'.join(r'\chapter*{List of ' + title + '}' + '\n{\\small\n' + '\n'.join(entries[kind]) + '\n}' for kind, title in [('figure','Figures'),('longtable','Tables')])


def native_index(entries, chapters):
    available = {label for chapter in chapters for label in re.findall(r'\\label\{([^}]+)\}', (ROOT / chapter).read_text())}
    order = {Path(chapter).stem: index for index, chapter in enumerate(chapters)}
    rows = [r'\chapter*{Index}\label{mage-index}', r'{\small\raggedright']
    letter = None
    required = set()
    for entry in entries:
        initial = entry['term'][0].upper()
        initial = initial if initial.isalpha() else '#'
        if initial != letter:
            rows.append(r'\par\medskip\textbf{' + (r'\#' if initial == '#' else initial) + r'}\par')
            letter = initial
        term = inline(' '.join(entry['term'].split()))
        if entry.get('kind') == 'curated':
            definition = entry['def'][1]
            examples = [anchor for _, anchor in entry['examples']]
            required.update([definition, *examples])
            rows.append(term + r'\par\quad definition of, \pageref{' + definition + r'}\par')
            if examples:
                rows.append(r'\quad examples of, ' + ', '.join(r'\pageref{' + anchor + '}' for anchor in examples) + r'\par')
        else:
            labels = ['chapter:' + page['slug'] for page in sorted(entry['refs'], key=lambda page: order[page['slug']])]
            required.update(labels)
            rows.append(term + ', ' + ', '.join(r'\pageref{' + label + '}' for label in labels) + r'\par')
    missing = required - available
    if missing: raise RuntimeError('Native index missing locator anchors: ' + repr(sorted(missing)))
    rows.extend(['}', r'\clearpage'])
    return '\n'.join(rows)


def resolve_external_references(chapters):
    """Keep selected references live; resolve external ones from the verified full-book aux."""
    available = {label for chapter in chapters for label in re.findall(r'\\label\{([^}]+)\}', (ROOT / chapter).read_text())}
    aux = ROOT / 'book/latex/build/mage-book.aux'
    external = {}
    if aux.exists():
        for line in aux.read_text().splitlines():
            if not line.startswith(r'\newlabel{'): continue
            key = argument(line, r'\newlabel')
            rest = argument(line, r'\newlabel{' + key + '}')
            fields = []
            while rest.startswith('{'):
                field = argument(rest, '')
                fields.append(field)
                rest = rest[len(field)+2:]
            if len(fields) >= 4:
                kind = fields[3].split('.')[0]
                title = {'figure':'Figure', 'table':'Table', 'chapter':'Chapter', 'section':'Section', 'subsection':'Section', 'subsubsection':'Section'}.get(kind)
                if title and fields[0]: external[key] = title + '~' + fields[0]
    for chapter in chapters:
        path = ROOT / chapter
        def reference(match):
            key = match[1]
            if key in available: return match[0]
            if key not in external:
                raise RuntimeError('Build the full native PDF before excerpts; no verified external reference for ' + key)
            return external[key]
        path.write_text(re.sub(r'\\autoref\{([^}]+)\}', reference, path.read_text()))


def prepare_pdf(slugs=None, name="mage-book"):
    """Compile a resolved native manuscript assembled from canonical TeX sources.

    The established book-record assembly still supplies dynamic catalogue appendices,
    metrics and chapter identities. Its Markdown input is generated by sync().
    """
    import shutil
    import latex_build
    sync(check=True)
    if not re.fullmatch(r'[A-Za-z0-9_-]+', name): raise ValueError('Invalid PDF basename')
    if slugs is not None and name == 'mage-book': raise ValueError('Excerpts require a distinct PDF basename')
    directory = ROOT / 'book/latex/build'
    if name != 'mage-book': directory = directory / name
    directory.mkdir(parents=True, exist_ok=True)
    records = book_ir.book_records(include_appendices=True, for_print=True)
    index_registry, index_maps = bb._harvest_concept_tags(records)
    index_entries = bb.build_index_entries(records, index_registry)
    for record in records:
        record['_build_directory'] = str(directory.relative_to(ROOT))
        record['_index_anchors'] = index_maps.get(record['slug'], {})
    if slugs is not None:
        previous = None
        figures = tables = 0
        for record in records:
            if record['part'] != previous:
                figures = tables = 0
            record['_figure_start'], record['_table_start'] = figures, tables
            full_chapter = ROOT / 'book/latex/build' / (record['slug'] + '.tex')
            if not full_chapter.exists():
                raise RuntimeError('Build the full native PDF before excerpts: ' + str(full_chapter))
            full_text = full_chapter.read_text()
            figures += full_text.count(r'\begin{figure}')
            tables += sum(r'\caption' in block for block in re.findall(
                r'\\begin\{(?:longtable|table)\}.*?\\end\{(?:longtable|table)\}', full_text, flags=re.S))
            previous = record['part']
        selected = set(slugs)
        records = [record for record in records if record['slug'] in selected]
        missing = selected - {record['slug'] for record in records}
        if missing: raise ValueError('Unknown print slugs: ' + repr(sorted(missing)))
    previous_part = None
    for record in records:
        record['_group_start'] = record['part'] != previous_part
        previous_part = record['part']
    chapters = []
    from concurrent.futures import ProcessPoolExecutor
    with ProcessPoolExecutor(max_workers=4) as executor:
        chapters = list(executor.map(_prepare_record, enumerate(records)))
    if slugs is not None: resolve_external_references(chapters)
    from mage_assets import pool_figures
    pool_figures(chapters, directory)
    bib = (ROOT / 'book/references.bib').read_text()
    bib = re.sub(r'^%.*$', '', bib, flags=re.M)
    (directory / 'references.bib').write_text(bib)
    manifest = json.loads((ROOT / 'book/book-manifest.json').read_text())
    if not re.fullmatch(r'[A-Za-z0-9_-]+', name): raise ValueError('Invalid PDF basename')
    driver = directory / (name + '.tex')
    driver.write_text(r'''\DocumentMetadata{lang=en-US,pdfversion=2.0,testphase={phase-III,table,math}}
\documentclass[12pt,openany]{book}
\usepackage[mage]{house}
\usepackage[numbers]{natbib}
\setlength{\emergencystretch}{2em}
\renewcommand{\bibsection}{\chapter*{\bibname}\label{mage-bibliography}}
\DeclareRobustCommand{\magecomma}{,}
\newcommand{\mageaside}[1]{\footnote{#1}}
\newcommand{\magefootnote}[2]{\footnote{#2}}
\newcommand{\magerule}[1]{\begin{center}\rule{0.5\linewidth}{0.4pt}\end{center}}
\begin{document}
\begin{titlepage}
\centering\vspace*{1in}
{\bookserif\fontsize{54}{60}\selectfont MAGE\par}
\vspace{0.4in}
{\booksans\Large ''' + inline(manifest['title']) + r'''\par}
\vspace{0.2in}
{\large ''' + inline(manifest['subtitle']) + r'''\par}
\vfill
{\Large ''' + inline(manifest['author']) + r'''\par}
\end{titlepage}
\tableofcontents
''' + '\n'.join(r'\input{' + chapter + '}' for chapter in chapters) + r'''
\bibliographystyle{book/latex/mageplainnat}
\bibliography{book/latex/build/references}
\end{document}
''')
    groups = {}
    for record in records: groups.setdefault(record['part'], record)
    contents = [r'\chapter*{Contents}', r'{\small\setlength{\parskip}{3pt}', r'\textbf{THE BOOK}\par']
    appendix_started = False
    for part, record in groups.items():
        is_appendix = record['slug'].startswith('appendix')
        if is_appendix and not appendix_started:
            contents.append(r'\medskip\textbf{APPENDICES}\par')
            appendix_started = True
        title = (f'Chapter {part}: ' if isinstance(part,int) and 0 < part < 9 else '') + record['part_title']
        contents.append(inline(title) + r'\dotfill\pageref{chapter:' + record['slug'] + '}\\par')
    contents.extend([r'Bibliography\dotfill\pageref{mage-bibliography}\par', '}', r'\clearpage'])
    driver.write_text(driver.read_text().replace(r'\tableofcontents', '\n'.join(contents)).replace(r'\bibliographystyle{book/latex/mageplainnat}', r'\phantomsection\label{mage-bibliography}' + '\n' + r'\bibliographystyle{book/latex/mageplainnat}'))
    if slugs is None:
        text = driver.read_text()
        preface = next((chapter for chapter in chapters if Path(chapter).stem.endswith('preface')), None)
        if preface:
            text = text.replace(r'\input{' + preface + '}', r'\input{' + preface + '}' + '\n' + native_float_lists(chapters))
        index = native_index(index_entries, chapters)
        text = text.replace(r'\phantomsection\label{mage-bibliography}', index + '\n' + r'\phantomsection\label{mage-bibliography}')
        text = text.replace(r'Bibliography\dotfill', r'Index\dotfill\pageref{mage-index}\par' + '\n' + r'Bibliography\dotfill')
        driver.write_text(text)
    driver.write_text(driver.read_text().replace(r'\bibliography{book/latex/build/references}', r'\bibliography{' + str(directory.relative_to(ROOT)) + '/references}'))
    driver.write_text(driver.read_text().replace(r'\phantomsection\label{mage-bibliography}', ''))
    if not any(re.search(r'\\cite[pt]\{', (ROOT / chapter).read_text()) for chapter in chapters):
        text = driver.read_text()
        text = re.sub(r'^\\bibliograph(?:y|ystyle)\{[^}]*\}\n?', '', text, flags=re.M)
        text = re.sub(r'^Bibliography\\dotfill[^\n]*\n?', '', text, flags=re.M)
        driver.write_text(text)
    from mage_cover import cover_tex
    driver.write_text(re.sub(r'\\begin\{titlepage\}.*?\\end\{titlepage\}', lambda m: cover_tex(), driver.read_text(), flags=re.S))
    return driver


def pdf_sources(driver):
    driver_text = Path(driver).read_text()
    chapters = [ (ROOT / path).read_text() for path in re.findall(r'\\input\{([^}]+)\}', driver_text)]
    database = re.search(r'\\bibliography\{([^}]+)\}', driver_text)
    bibliography = (ROOT / (database[1] + '.bib')).read_text() if database else ''
    return driver_text, chapters, bibliography


def build_pdf():
    import shutil
    import latex_build
    driver = prepare_pdf()
    driver_text, chapter_texts, bibliography = pdf_sources(driver)
    import render_citations
    canonical = {entry['key']: {'type':entry['type'], 'fields':entry['fields']} for entry in render_citations.parse_bib((ROOT / 'book/references.bib').read_text())}
    projected = {entry['key']: {'type':entry['type'], 'fields':entry['fields']} for entry in render_citations.parse_bib(bibliography)}
    if canonical != projected: raise RuntimeError('Native PDF bibliography changes canonical fields or keys')
    expected = {key for rec in book_ir.book_records(include_appendices=True, for_print=True) for key in bb.iter_cite_keys(rec['body_md'])}
    emitted = {key.strip() for text in chapter_texts for group in re.findall(r'\\cite[pt]\{([^}]+)\}', text) for key in group.split(',')}
    if expected != emitted:
        raise RuntimeError(f'Native PDF citation mismatch: missing {sorted(expected-emitted)}; unexpected {sorted(emitted-expected)}')
    pdf = latex_build.compile_tex(driver)
    destination = ROOT / 'book/mage-book.pdf'
    shutil.copy2(pdf, destination)
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['migrate', 'compatibility', 'migrate-all', 'sync', 'pdf'])
    parser.add_argument('source', type=Path, nargs='?')
    parser.add_argument('output', type=Path, nargs='?')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    if args.command == 'pdf': build_pdf()
    elif args.command == 'migrate-all': migrate_all()
    elif args.command == 'sync': sync(args.check)
    elif args.command == 'migrate': migrate(args.source, args.output)
    else: compatibility(args.source, args.output)
