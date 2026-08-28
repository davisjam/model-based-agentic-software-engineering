"""book/bookmath.py — render a small LaTeX math subset to MathML (web) and Typst math (PDF).

One source, two projections — the same pattern the book uses for its IR (HTML + Typst from one walk).
Math is authored ONCE as a constrained LaTeX subset; `to_mathml()` emits MathML for the static web
build (rendered natively by the browser — no JavaScript, no webfonts, no build dependency, so the
`catalog.py` clone-and-run guarantee holds and the server stays a dumb static host), and `to_typst()`
emits Typst math atoms for the print edition.

The subset is deliberately small — exactly the constructs the book uses (variables, numbers, sub/superscripts,
`\\prod`/`\\sum`/`\\arg\\min` with limits, `\\text`, `\\boxed`, a fixed operator table, grouping). Anything
outside it raises `MathError` so a typo fails the build loud rather than mis-rendering silently.

Public API:
  to_mathml(latex, display=False) -> str   # a <math> element
  to_typst(latex)                -> str   # Typst math atoms (no surrounding `$`)
  is_boxed(latex)                -> bool  # top-level \\boxed{…} (rendered as a bordered box by the caller)
  strip_boxed(latex)             -> str   # inner LaTeX of a top-level \\boxed{…}
"""

from __future__ import annotations

import html
import re

__all__ = ["MathError", "to_mathml", "to_typst", "is_boxed", "strip_boxed"]


class MathError(ValueError):
    """A math string used a construct outside the supported subset (fail-loud at build time)."""


# ── Operator / symbol table ──────────────────────────────────────────────────────────────────────
# Each entry: LaTeX command (sans backslash) → (mathml glyph, typst atom). Single-char operators
# (=, +, -, etc.) are handled directly in the tokenizer/emitter, not here.
_SYMBOLS: dict[str, tuple[str, str]] = {
    "cdot": ("⋅", "dot.op"),
    "times": ("×", "times"),
    "neq": ("≠", "eq.not"),
    "leq": ("≤", "<="),
    "geq": ("≥", ">="),
    "le": ("≤", "<="),
    "ge": ("≥", ">="),
    "in": ("∈", "in"),
    "rightarrow": ("→", "arrow.r"),
    "longrightarrow": ("⟶", "arrow.r.long"),
    "to": ("→", "arrow.r"),
    "uparrow": ("↑", "arrow.t"),
    "ldots": ("…", "dots.h"),
    "dots": ("…", "dots.h"),
    "mid": ("∣", "|"),
    "approx": ("≈", "approx"),
    "cup": ("∪", "union"),
    "cap": ("∩", "sect"),
}

# Big operators that take under/over limits in display style.
_BIGOPS: dict[str, tuple[str, str]] = {
    "prod": ("∏", "product"),
    "sum": ("∑", "sum"),
    "min": ("min", "min"),
    "max": ("max", "max"),
    "lim": ("lim", "lim"),
}

# Named operators rendered upright (function-style). `\arg\min` is combined by the parser.
_NAMEDOPS = {"arg", "log", "exp"}

# Spacing commands → (MathML width in em, Typst spacing atom).
_SPACING: dict[str, tuple[str, str]] = {
    "quad": ("1", "quad"),
    "qquad": ("2", "quad quad"),
    ",": ("0.17", "thin"),
    ";": ("0.28", "med"),
    ":": ("0.22", "med"),
    " ": ("0.25", "space"),
}

# Delimiter-sizing commands — transparent (we render the delimiter that follows normally).
_SIZERS = {"bigl", "bigr", "Bigl", "Bigr", "left", "right"}

_SINGLE_OPS = set("=+-*<>|,")  # rendered as <mo>; also parens/brackets handled separately


# ── Tokenizer ────────────────────────────────────────────────────────────────────────────────────

def _tokenize(s: str) -> list[tuple[str, str]]:
    toks: list[tuple[str, str]] = []
    i, n = 0, len(s)
    while i < n:
        c = s[i]
        if c.isspace():
            i += 1
            continue
        if c == "\\":
            j = i + 1
            if j < n and s[j].isalpha():
                k = j
                while k < n and s[k].isalpha():
                    k += 1
                name = s[j:k]
                if name in ("text", "mathrm", "operatorname"):
                    # capture the {…} content RAW (spaces preserved — text runs are literal, not math)
                    p = k
                    while p < n and s[p].isspace():
                        p += 1
                    if p >= n or s[p] != "{":
                        raise MathError(f"\\{name} must be followed by {{…}}")
                    depth, q, buf = 1, p + 1, []
                    while q < n and depth > 0:
                        ch = s[q]
                        if ch == "{":
                            depth += 1
                        elif ch == "}":
                            depth -= 1
                            if depth == 0:
                                break
                        buf.append(ch)
                        q += 1
                    if depth != 0:
                        raise MathError(f"unbalanced {{ after \\{name}")
                    toks.append(("text", "".join(buf)))
                    i = q + 1
                    continue
                toks.append(("cmd", name))
                i = k
            elif j < n:
                toks.append(("cmd", s[j]))  # e.g. \{  \}  \,  \;
                i = j + 1
            else:
                raise MathError("trailing backslash")
            continue
        if c in "{}":
            toks.append(("lbrace" if c == "{" else "rbrace", c))
            i += 1
            continue
        if c == "_":
            toks.append(("sub", c)); i += 1; continue
        if c == "^":
            toks.append(("sup", c)); i += 1; continue
        if c.isdigit() or c == ".":
            k = i
            while k < n and (s[k].isdigit() or s[k] == "."):
                k += 1
            toks.append(("num", s[i:k])); i = k; continue
        if c.isalpha():
            toks.append(("var", c)); i += 1; continue
        if c in "()[]":
            toks.append(("delim", c)); i += 1; continue
        if c in _SINGLE_OPS:
            toks.append(("op", c)); i += 1; continue
        raise MathError(f"unexpected character {c!r} in math")
    return toks


# ── Parser → AST (nodes are small dicts) ──────────────────────────────────────────────────────────
# node kinds: var, num, op, text, sym, row, sub, sup, subsup, bigop, boxed

class _P:
    def __init__(self, toks: list[tuple[str, str]]) -> None:
        self.t = toks
        self.i = 0

    def peek(self) -> tuple[str, str] | None:
        return self.t[self.i] if self.i < len(self.t) else None

    def next(self) -> tuple[str, str]:
        tok = self.t[self.i]; self.i += 1; return tok

    def parse_row(self, until: str | None = None) -> dict:
        nodes: list[dict] = []
        while True:
            tok = self.peek()
            if tok is None:
                break
            if until and tok[0] == until:
                break
            nodes.append(self.parse_element())
        return {"k": "row", "kids": nodes}

    def parse_element(self) -> dict:
        base = self.parse_atom()
        sub = sup = None
        # collect an optional _ and ^ in either order
        for _ in range(2):
            tok = self.peek()
            if tok and tok[0] == "sub" and sub is None:
                self.next(); sub = self.parse_atom()
            elif tok and tok[0] == "sup" and sup is None:
                self.next(); sup = self.parse_atom()
            else:
                break
        if sub is not None and sup is not None:
            return {"k": "subsup", "base": base, "sub": sub, "sup": sup}
        if sub is not None:
            return {"k": "sub", "base": base, "sub": sub}
        if sup is not None:
            return {"k": "sup", "base": base, "sup": sup}
        return base

    def parse_atom(self) -> dict:
        tok = self.peek()
        if tok is None:
            raise MathError("unexpected end of math (expected an atom)")
        kind, val = tok
        if kind == "lbrace":
            self.next()
            row = self.parse_row(until="rbrace")
            if self.peek() is None or self.peek()[0] != "rbrace":
                raise MathError("unbalanced { in math")
            self.next()
            return row
        if kind == "text":
            self.next(); return {"k": "text", "v": val}
        if kind == "num":
            self.next(); return {"k": "num", "v": val}
        if kind == "var":
            self.next(); return {"k": "var", "v": val}
        if kind == "op":
            self.next(); return {"k": "op", "v": val}
        if kind == "delim":
            self.next(); return {"k": "op", "v": val, "fence": True}
        if kind == "cmd":
            return self.parse_cmd()
        raise MathError(f"unexpected token {tok!r} in math")

    def parse_cmd(self) -> dict:
        _, name = self.next()
        if name == "boxed":
            if self.peek() is None or self.peek()[0] != "lbrace":
                raise MathError("\\boxed must be followed by {…}")
            self.next()
            row = self.parse_row(until="rbrace")
            self.next()
            return {"k": "boxed", "kid": row}
        if name == "arg":
            # combine \arg\min / \arg\max into one named big-operator so limits sit under it
            nxt = self.peek()
            if nxt and nxt[0] == "cmd" and nxt[1] in ("min", "max"):
                self.next()
                return {"k": "bigop", "ml": f"arg {nxt[1]}", "ty": f'op("arg {nxt[1]}")', "named": True}
            return {"k": "op", "v": "arg", "named": True}
        if name in _BIGOPS:
            ml, ty = _BIGOPS[name]
            return {"k": "bigop", "ml": ml, "ty": ty, "named": name in ("min", "max", "lim")}
        if name in _NAMEDOPS:
            return {"k": "op", "v": name, "named": True}
        if name in _SYMBOLS:
            ml, ty = _SYMBOLS[name]
            return {"k": "sym", "ml": ml, "ty": ty}
        if name in _SIZERS:
            # \bigl( etc. — the sizing is transparent; render the delimiter that follows normally.
            return self.parse_atom()
        if name in ("{", "}"):
            return {"k": "op", "v": name, "fence": True}
        if name in _SPACING:
            ml_w, ty = _SPACING[name]
            return {"k": "space", "ml": ml_w, "ty": ty}
        raise MathError(f"unsupported math command \\{name}")


def _parse(latex: str) -> dict:
    p = _P(_tokenize(latex))
    row = p.parse_row()
    if p.peek() is not None:
        raise MathError("trailing tokens in math (unbalanced braces?)")
    return row


# ── MathML emitter ────────────────────────────────────────────────────────────────────────────────

def _ml(node: dict) -> str:
    k = node["k"]
    if k == "row":
        inner = "".join(_ml(c) for c in node["kids"])
        return inner if len(node["kids"]) == 1 else f"<mrow>{inner}</mrow>"
    if k == "num":
        return f'<mn>{html.escape(node["v"])}</mn>'
    if k == "var":
        return f'<mi>{html.escape(node["v"])}</mi>'
    if k == "op":
        if node.get("named"):
            return f'<mi>{html.escape(node["v"])}</mi>'
        return f'<mo>{html.escape(node["v"])}</mo>'
    if k == "sym":
        return f'<mo>{node["ml"]}</mo>'
    if k == "text":
        return f'<mtext>{html.escape(node["v"])}</mtext>'
    if k == "space":
        return f'<mspace width="{node["ml"]}em"></mspace>'
    if k == "bigop":
        return f'<mo>{html.escape(node["ml"])}</mo>' if not node.get("named") else f'<mo movablelimits="true">{html.escape(node["ml"])}</mo>'
    if k == "sub":
        return f"<msub>{_ml(node['base'])}{_ml(node['sub'])}</msub>"
    if k == "sup":
        return f"<msup>{_ml(node['base'])}{_ml(node['sup'])}</msup>"
    if k == "subsup":
        b = node["base"]
        if b["k"] == "bigop":
            return f"<munderover>{_ml(b)}{_ml(node['sub'])}{_ml(node['sup'])}</munderover>"
        return f"<msubsup>{_ml(b)}{_ml(node['sub'])}{_ml(node['sup'])}</msubsup>"
    if k == "boxed":
        return _ml(node["kid"])  # the border is applied by the HTML wrapper, not menclose
    raise MathError(f"cannot emit MathML for node {k}")


# a big operator carrying ONLY a subscript (\arg\min_R) should still render the limit UNDER it
def _ml_fix_bigop_sub(node: dict) -> dict:
    if node["k"] == "sub" and node["base"]["k"] == "bigop":
        return {"k": "under", "base": node["base"], "sub": node["sub"]}
    return node


def _ml2(node: dict) -> str:
    node = _ml_fix_bigop_sub(node)
    if node["k"] == "under":
        return f"<munder>{_ml(node['base'])}{_ml(node['sub'])}</munder>"
    if node["k"] == "row":
        inner = "".join(_ml2(c) for c in node["kids"])
        return inner if len(node["kids"]) == 1 else f"<mrow>{inner}</mrow>"
    return _ml(node)


def to_mathml(latex: str, display: bool = False) -> str:
    node = _parse(latex)
    body = _ml2(node)
    disp = ' display="block"' if display else ""
    cls = "book-math-display" if display else "book-math-inline"
    return f'<math xmlns="http://www.w3.org/1998/Math/MathML"{disp} class="{cls}">{body}</math>'


# ── Typst emitter ─────────────────────────────────────────────────────────────────────────────────

def _ty(node: dict) -> str:
    k = node["k"]
    if k == "row":
        return " ".join(_ty(c) for c in node["kids"] if _ty(c))
    if k == "num":
        return node["v"]
    if k == "var":
        return node["v"]
    if k == "op":
        v = node["v"]
        if node.get("named"):
            return f'op("{v}")'
        return {"=": "=", "+": "+", "-": "-", "*": "*", "<": "<", ">": ">", "|": "|",
                ",": ",", "(": "(", ")": ")", "[": "[", "]": "]", "{": "{", "}": "}"}.get(v, v)
    if k == "sym":
        return node["ty"]
    if k == "text":
        return f'"{node["v"]}"'
    if k == "space":
        return node["ty"]
    if k == "bigop":
        return node["ty"]
    if k == "sub":
        return f"{_grp(node['base'])}_({_ty(node['sub'])})"
    if k == "sup":
        return f"{_grp(node['base'])}^({_ty(node['sup'])})"
    if k == "subsup":
        return f"{_grp(node['base'])}_({_ty(node['sub'])})^({_ty(node['sup'])})"
    if k == "boxed":
        return _ty(node["kid"])  # the border is applied by the Typst wrapper
    raise MathError(f"cannot emit Typst for node {k}")


def _grp(node: dict) -> str:
    t = _ty(node)
    # wrap a multi-atom base so the sub/sup binds to all of it
    if node["k"] in ("row",) and len(node.get("kids", [])) > 1:
        return f"({t})"
    return t


def to_typst(latex: str) -> str:
    return _ty(_parse(latex))


# ── boxed helpers (top-level \boxed{…}) ───────────────────────────────────────────────────────────

_BOXED_RE = re.compile(r"^\s*\\boxed\s*\{(?P<body>.*)\}\s*$", re.S)


def is_boxed(latex: str) -> bool:
    m = _BOXED_RE.match(latex)
    if not m:
        return False
    # balanced-brace check so `\boxed{a}{b}` is not mistaken for a single box
    body = m.group("body")
    depth = 0
    for ch in body:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth < 0:
                return False
    return depth == 0


def strip_boxed(latex: str) -> str:
    m = _BOXED_RE.match(latex)
    if not m:
        raise MathError("strip_boxed on a non-boxed expression")
    return m.group("body")
