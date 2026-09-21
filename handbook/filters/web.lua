--[[
web.lua — web/ePub-target escape hatch and cleanup.

The mirror of typst.lua. On a Markdown/web/ePub target this filter passes a `.raw-html` Div through
as raw HTML and drops `.raw-typst` (which means nothing outside the PDF). It also strips any stray
raw-Typst that leaked toward the web or ePub build.

No-op when the Typst writer is active. On the ePub writer, raw output is emitted in format "html"
(the ePub writer honors "html" raw blocks, not blocks named after the writer itself).
]]

if FORMAT == "typst" then return {} end

local EPUB = FORMAT:match("^epub") ~= nil
local RAW = EPUB and "html" or FORMAT

-- GFM drops heading identifiers, so a `#sec-x` cross-reference link would have no target. Emit an
-- explicit HTML anchor before each identified heading so section cross-references resolve on the web.
-- The ePub writer keeps heading identifiers natively, so it needs no anchor shim.
function Header(el)
  if EPUB then return nil end
  if el.identifier ~= "" then
    return { pandoc.RawBlock(FORMAT, '<a id="' .. el.identifier .. '"></a>'), el }
  end
  return nil
end

-- Captioned tables (`: caption {#tbl-x}` — Pandoc parses the attribute into the Table's id and
-- leaves the caption clean). GFM can express neither the caption nor the id: the gfm writer
-- re-emits the caption as a literal trailing paragraph — "caption {#tbl-x}", raw attribute visible
-- to readers — and no element carries the id, so a "Table N" cross-reference dangles. Render such
-- a table to raw HTML instead: <table id="tbl-x"> with a <caption> carrying the "Table N." prefix
-- from the number crossrefs.lua stashed in `data-number` (mirroring figures.lua's web caption).
-- The ePub writer handles caption + id natively, so there only the "Table N." prefix is added —
-- the number the PDF's Typst counter supplies, so the body's "Table 1" reference reads the same.
function Table(el)
  local num = el.attributes["data-number"]
  if num then
    el.attributes["data-number"] = nil
    local old = el.caption.long
    local prefix = pandoc.Inlines({ pandoc.Strong({ pandoc.Str("Table " .. num .. ".") }),
                                    pandoc.Space() })
    local newlong = pandoc.Blocks({})
    if #old > 0 and (old[1].t == "Plain" or old[1].t == "Para") then
      local ctor = (old[1].t == "Para") and pandoc.Para or pandoc.Plain
      newlong:insert(ctor(prefix .. old[1].content))
      for i = 2, #old do newlong:insert(old[i]) end
    else
      newlong:insert(pandoc.Plain(prefix))
      for i = 1, #old do newlong:insert(old[i]) end
    end
    el.caption = { long = newlong }
  end
  if EPUB then
    return num and el or nil
  end
  if el.identifier == "" and #el.caption.long == 0 then
    return nil -- an uncaptioned, id-less table survives the gfm path untouched
  end
  return pandoc.RawBlock("html", pandoc.write(pandoc.Pandoc({ el }), "html"))
end

-- Math: Pandoc's gfm writer emits GitHub math syntax (```math fences / $`…`$), which MkDocs
-- Material shows as literal TeX. Render math to HTML at build time instead — a small
-- recursive-descent renderer over the manuscript's TeX subset: command glyphs, `\text{…}` upright
-- runs, `^`/`_` scripts (single atom or braced group), italicized letter identifiers, and a true
-- minus sign for `-`. FAIL LOUD on any TeX command outside the glyph table (the build must not
-- silently leak raw TeX to the web). The PDF path is untouched — the typst writer renders the
-- same Math node as native Typst math.
local TEX_TO_GLYPH = {
  ["\\land"] = "∧", ["\\wedge"] = "∧", ["\\lor"] = "∨", ["\\vee"] = "∨",
  ["\\neg"] = "¬", ["\\lnot"] = "¬", ["\\Rightarrow"] = "⇒", ["\\Leftarrow"] = "⇐",
  ["\\Leftrightarrow"] = "⇔", ["\\rightarrow"] = "→", ["\\leftarrow"] = "←",
  ["\\to"] = "→", ["\\models"] = "⊨", ["\\vdash"] = "⊢", ["\\times"] = "×",
  ["\\approx"] = "≈", ["\\mid"] = "∣", ["\\cdot"] = "·", ["\\ldots"] = "…",
}

local function math_escape(s)
  return (s:gsub("&", "&amp;"):gsub("<", "&lt;"):gsub(">", "&gt;"))
end

-- Index of the "}" matching the "{" at position i (nil when unbalanced).
local function group_end(s, i)
  local depth = 0
  for j = i, #s do
    local c = s:sub(j, j)
    if c == "{" then depth = depth + 1
    elseif c == "}" then
      depth = depth - 1
      if depth == 0 then return j end
    end
  end
  return nil
end

local render_tex -- forward declaration (render_atom and render_tex are mutually recursive)

-- Render the single atom starting at position i: a braced group, a \command, or one character.
-- Returns the rendered HTML and the position after the atom.
local function render_atom(tex, s, i)
  local c = s:sub(i, i)
  if c == "{" then
    local e = group_end(s, i)
    if not e then
      error("web.lua: unbalanced '{' in math '" .. tex .. "'")
    end
    return render_tex(tex, s:sub(i + 1, e - 1)), e + 1
  elseif c == "\\" then
    local cmd = s:match("^\\%a+", i)
    if not cmd then
      error("web.lua: stray '\\' in math '" .. tex .. "'")
    end
    local j = i + #cmd
    if cmd == "\\text" then
      if s:sub(j, j) ~= "{" then
        error("web.lua: \\text without a braced argument in math '" .. tex .. "'")
      end
      local e = group_end(s, j)
      if not e then
        error("web.lua: unbalanced '{' in math '" .. tex .. "'")
      end
      -- Upright prose inside math, spaces preserved exactly as authored.
      return '<span class="math-text">' .. math_escape(s:sub(j + 1, e - 1)) .. "</span>", e + 1
    end
    local glyph = TEX_TO_GLYPH[cmd]
    if not glyph then
      error("web.lua: no HTML rendering for TeX token '" .. cmd ..
            "' in math '" .. tex .. "' — extend TEX_TO_GLYPH")
    end
    return glyph, j
  elseif c:match("%a") then
    return "<em>" .. c .. "</em>", i + 1 -- a letter identifier, italic per math convention
  elseif c == "-" then
    return "−", i + 1 -- a true minus sign, not a hyphen
  else
    return math_escape(c), i + 1
  end
end

render_tex = function(tex, s)
  local out = {}
  local i = 1
  while i <= #s do
    local c = s:sub(i, i)
    if c:match("%s") then
      table.insert(out, " ")
      i = i + 1
    elseif c == "^" or c == "_" then
      local tag = (c == "^") and "sup" or "sub"
      local html, ni = render_atom(tex, s, i + 1)
      table.insert(out, "<" .. tag .. ">" .. html .. "</" .. tag .. ">")
      i = ni
    else
      local html, ni = render_atom(tex, s, i)
      table.insert(out, html)
      i = ni
    end
  end
  return table.concat(out)
end

local function tex_to_html(tex)
  return render_tex(tex, tex)
end

function Math(el)
  local cls = (el.mathtype == "DisplayMath") and "math display" or "math inline"
  return pandoc.RawInline(RAW, '<span class="' .. cls .. '">' .. tex_to_html(el.text) .. "</span>")
end

function Div(el)
  if el.classes:includes("raw-html") then
    return pandoc.RawBlock(RAW, pandoc.utils.stringify(el.content))
  end
  if el.classes:includes("raw-typst") then
    return {} -- PDF-only escape hatch; absent from the web
  end
  return nil
end

function RawBlock(el)
  if el.format == "typst" then return {} end
  return nil
end

function RawInline(el)
  if el.format == "typst" then return {} end
  return nil
end
