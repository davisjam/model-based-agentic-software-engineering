"""Pool SVG figures on separate PDF pages so Cairo shares their embedded fonts."""
from __future__ import annotations
import hashlib
import os
import tempfile
from functools import lru_cache
from xml.sax.saxutils import escape
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def svg_render_context():
    """Pin this renderer to bundled static Sans faces, without changing host fonts.

    Some Cairo/Pango combinations select a named variable-font instance but
    embed its default ExtraLight outlines. Fontconfig must therefore choose the
    actual bundled 400/700 upright/italic files, not a same-named system face.
    Other families retain the caller's normal configuration and fallbacks.
    """
    fonts = sorted((ROOT / 'book/fonts/SourceSans3').glob('*.ttf'))
    if len(fonts) != 4:
        raise RuntimeError('SVG rendering requires the four bundled Source Sans 3 faces')
    directory = ROOT / 'book/latex/assets/fontconfig'
    directory.mkdir(parents=True, exist_ok=True)
    inherited = os.environ.get('FONTCONFIG_FILE', 'fonts.conf')
    accept = ''.join('<pattern><patelt name="file"><string>' +
                     escape(str(font)) + '</string></patelt></pattern>' for font in fonts)
    config = ('<?xml version="1.0"?>\n'
              '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">\n'
              '<fontconfig><include>' + escape(inherited) + '</include>'
              '<dir>' + escape(str(fonts[0].parent)) + '</dir>'
              '<cachedir>' + escape(str(directory / 'cache')) + '</cachedir>'
              '<selectfont><rejectfont><pattern><patelt name="family">'
              '<string>Source Sans 3</string></patelt></pattern></rejectfont>'
              '<acceptfont>' + accept + '</acceptfont></selectfont></fontconfig>\n')
    digest = hashlib.sha256(b'mage-svg-static-sans-fc-v1')
    digest.update(config.encode())
    for font in fonts:
        digest.update(font.name.encode())
        digest.update(font.read_bytes())
    identity = digest.hexdigest()
    target = directory / (identity[:16] + '.conf')
    if not target.exists():
        # Separate section builds can initialize the same configuration together.
        # Publish only a complete file; readers must never see a partial XML file.
        with tempfile.NamedTemporaryFile(mode='w', dir=directory,
                                         prefix='fonts-', suffix='.tmp', delete=False) as stream:
            stream.write(config)
            pending = Path(stream.name)
        try:
            pending.replace(target)
        finally:
            pending.unlink(missing_ok=True)
    env = os.environ.copy()
    env['FONTCONFIG_FILE'] = str(target)
    # macOS otherwise uses CoreText and ignores this Fontconfig selection.
    env['PANGOCAIRO_BACKEND'] = 'fc'
    return env, identity


@lru_cache(maxsize=1)
def _rsvg_version():
    return subprocess.check_output(['rsvg-convert', '--version'])


def svg_render_identity():
    """Font policy, font bytes, and converter version invalidate generated assets."""
    _, fonts = svg_render_context()
    return hashlib.sha256(fonts.encode() + _rsvg_version()).digest()


def convert_svgs(sources, destination):
    env, _ = svg_render_context()
    subprocess.run(['rsvg-convert', '--format=pdf', '--output', str(destination),
                    *map(str, sources)], check=True, env=env)


def render_svg_cached(source, destination):
    """Render standalone/navigation assets with the same font policy as the pool."""
    digest = hashlib.sha256(svg_render_identity())
    digest.update(source.read_bytes())
    identity = digest.hexdigest()
    stamp = destination.with_suffix(destination.suffix + '.render-key')
    if destination.exists() and stamp.exists() and stamp.read_text() == identity:
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    convert_svgs([source], destination)
    stamp.write_text(identity)


def graphics(text):
    """Yield image spans, options and paths, respecting braces inside alt text."""
    for match in re.finditer(r'\\includegraphics\[', text):
        start = match.end()
        pos, braces = start, 0
        while pos < len(text):
            char = text[pos]
            escaped = pos > 0 and text[pos - 1] == '\\'
            if not escaped:
                if char == '{': braces += 1
                elif char == '}': braces -= 1
                elif char == ']' and not braces: break
            pos += 1
        if pos >= len(text) or text[pos + 1:pos + 2] != '{':
            raise ValueError('Unrecognized includegraphics syntax')
        end = text.index('}', pos + 2)
        yield match.start(), end + 1, text[start:pos], text[pos + 2:end]


def uncropped_svg(source, directory):
    """Expand only generated viewports when original SVG text lies outside them.

    Probe a larger canvas first: pdftotext omits glyphs already outside the
    original crop. Authored SVG files and all their labels remain unchanged.
    """
    raw = source.read_text()
    tag = re.search(r'<svg\b[^>]*>', raw, re.S)
    view = re.search(r'viewBox=["\']([^"\']+)', tag[0]) if tag else None
    if not view:
        raise ValueError(f'SVG needs an explicit viewBox: {source}')
    x, y, width, height = map(float, re.split(r'[,\s]+', view[1].strip()))
    key = hashlib.sha256((raw + 'viewport-v2').encode() + svg_render_identity()).hexdigest()[:16]
    target = directory / (source.stem + '-' + key + '.svg')
    if target.exists():
        return target
    def viewport(bounds):
        left, top, w, h = bounds
        root = tag[0]
        for attr, value in [('viewBox', f'{left} {top} {w} {h}'),
                            ('width', str(w)), ('height', str(h))]:
            pattern = r'\b' + attr + r'=["\'][^"\']*["\']'
            if re.search(pattern, root):
                root = re.sub(pattern, attr + '="' + value + '"', root)
            else:
                root = root[:-1] + ' ' + attr + '="' + value + '">'
        return raw[:tag.start()] + root + raw[tag.end():]
    probe = target.with_suffix('.probe.svg')
    probe_pdf = target.with_suffix('.probe.pdf')
    px, py, pw, ph = x - width / 2, y - height / 2, width * 2, height * 2
    probe.write_text(viewport((px, py, pw, ph)))
    convert_svgs([probe], probe_pdf)
    result = subprocess.run(['pdftotext', '-bbox', str(probe_pdf), '-'],
                            check=True, capture_output=True, text=True)
    xml = ET.fromstring(result.stdout)
    page = next(e for e in xml.iter() if e.tag.endswith('page'))
    words = [e for e in page.iter() if e.tag.endswith('word')]
    if words:
        sx, sy = pw / float(page.get('width')), ph / float(page.get('height'))
        left = min(float(e.get('xMin')) for e in words) * sx + px
        right = max(float(e.get('xMax')) for e in words) * sx + px
        top = min(float(e.get('yMin')) for e in words) * sy + py
        bottom = max(float(e.get('yMax')) for e in words) * sy + py
        if left < x or right > x + width or top < y or bottom > y + height:
            margin = 8
            left, top = min(x, left - margin), min(y, top - margin)
            right, bottom = max(x + width, right + margin), max(y + height, bottom + margin)
            raw = viewport((left, top, right - left, bottom - top))
            print(f'Expanded generated SVG viewport: {source.name}', flush=True)
    if raw == source.read_text():
        raw = viewport((x, y, width, height))
    target.write_text(raw)
    probe.unlink()
    probe_pdf.unlink()
    return target


def pool_figures(chapters, directory):
    """Rewrite generated chapter graphics to pages of an immutable vector pool."""
    paths = [ROOT / p for p in chapters]
    mapping = {}
    for chapter in paths:
        sidecar = chapter.with_suffix('.assets.json')
        if sidecar.exists():
            for asset in json.loads(sidecar.read_text()):
                if asset['source'].endswith('.svg'):
                    mapping[asset['pdf']] = ROOT / asset['source']
    texts = {p: p.read_text() for p in paths}
    used = set()
    for text in texts.values():
        for _, _, _, asset in graphics(text):
            nav = re.fullmatch(r'book/latex/assets/nav-subway-p(\d+)\.pdf', asset)
            if nav:
                mapping[asset] = ROOT / f'book/assets/nav-subway-p{nav[1]}.svg'
            if asset in mapping:
                used.add(mapping[asset])
    if not used:
        return
    sources = sorted(used)
    normalized_dir = ROOT / 'book/latex/assets/normalized'
    normalized_dir.mkdir(parents=True, exist_ok=True)
    normalized = [uncropped_svg(source, normalized_dir) for source in sources]
    digest = hashlib.sha256(b'pooled-svg-v3')
    digest.update(svg_render_identity())
    for source in sources:
        digest.update(str(source.relative_to(ROOT)).encode())
        digest.update(source.read_bytes())
    for prepared in normalized:
        digest.update(prepared.read_bytes())
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    pool = directory / ('figures-' + digest.hexdigest()[:16] + '.pdf')
    if not pool.exists():
        temporary = pool.with_suffix('.tmp.pdf')
        convert_svgs(normalized, temporary)
        # Multiple input SVGs must remain distinct pages at their own dimensions.
        from pypdf import PdfReader
        combined = PdfReader(temporary)
        if len(combined.pages) != len(sources):
            raise RuntimeError('SVG pool lost figure pages')
        for page, source, prepared in zip(combined.pages, sources, normalized):
            svg = ET.fromstring(prepared.read_text())
            expected = [float(svg.get('width')) * .75, float(svg.get('height')) * .75]
            if any(abs(float(a) - b) > .02
                   for a, b in zip([page.mediabox.width, page.mediabox.height], expected)):
                raise RuntimeError(f'SVG pool changed figure dimensions: {source}')
        temporary.replace(pool)
    pages = {source: index for index, source in enumerate(sources, 1)}
    pool.with_suffix(".pages.json").write_text(json.dumps({str(index): source.relative_to(ROOT).as_posix() for source, index in pages.items()}, indent=2) + "\n")
    relative = pool.relative_to(ROOT).as_posix()
    for chapter, text in texts.items():
        for start, end, options, asset in reversed(list(graphics(text))):
            if asset in mapping and mapping[asset] in pages:
                replacement = (r'\includegraphics[page=' + str(pages[mapping[asset]])
                               + ',' + options + ']{' + relative + '}')
                text = text[:start] + replacement + text[end:]
        chapter.write_text(text)
    print(f'Pooled {len(sources)} vector figures: {pool.stat().st_size:,} bytes', flush=True)
