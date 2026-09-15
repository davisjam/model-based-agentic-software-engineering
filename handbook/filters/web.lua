--[[
web.lua — web-target escape hatch and cleanup.

The mirror of typst.lua. On a Markdown/web target this filter passes a `.raw-html` Div through as raw
HTML and drops `.raw-typst` (which means nothing on the web). It also strips any stray raw-Typst that
leaked toward the web build.

No-op unless a Markdown-family writer is active.
]]

if FORMAT == "typst" then return {} end

-- GFM drops heading identifiers, so a `#sec-x` cross-reference link would have no target. Emit an
-- explicit HTML anchor before each identified heading so section cross-references resolve on the web.
function Header(el)
  if el.identifier ~= "" then
    return { pandoc.RawBlock(FORMAT, '<a id="' .. el.identifier .. '"></a>'), el }
  end
  return nil
end

-- Math: Pandoc's gfm writer emits GitHub math syntax (```math fences / $`…`$), which MkDocs
-- Material shows as literal TeX. Render math to HTML at build time instead: map each TeX token to
-- its glyph, italicize single-letter identifiers, and FAIL LOUD on a token this table does not
-- cover (the build must not silently leak raw TeX to the web). The PDF path is untouched — the
-- typst writer renders the same Math node as native Typst math.
local TEX_TO_GLYPH = {
  ["\\land"] = "∧", ["\\wedge"] = "∧", ["\\lor"] = "∨", ["\\vee"] = "∨",
  ["\\neg"] = "¬", ["\\lnot"] = "¬", ["\\Rightarrow"] = "⇒", ["\\Leftarrow"] = "⇐",
  ["\\Leftrightarrow"] = "⇔", ["\\rightarrow"] = "→", ["\\leftarrow"] = "←",
  ["\\to"] = "→", ["\\models"] = "⊨", ["\\vdash"] = "⊢", ["\\times"] = "×",
}

local function tex_to_html(tex)
  local out = {}
  for tok in tex:gmatch("%S+") do
    if tok:sub(1, 1) == "\\" then
      local glyph = TEX_TO_GLYPH[tok]
      if not glyph then
        error("web.lua: no HTML rendering for TeX token '" .. tok ..
              "' in math '" .. tex .. "' — extend TEX_TO_GLYPH")
      end
      table.insert(out, glyph)
    elseif tok:match("^%a$") then
      table.insert(out, "<em>" .. tok .. "</em>")
    else
      table.insert(out, tok)
    end
  end
  return table.concat(out, " ")
end

function Math(el)
  local cls = (el.mathtype == "DisplayMath") and "math display" or "math inline"
  return pandoc.RawInline(FORMAT, '<span class="' .. cls .. '">' .. tex_to_html(el.text) .. "</span>")
end

function Div(el)
  if el.classes:includes("raw-html") then
    return pandoc.RawBlock(FORMAT, pandoc.utils.stringify(el.content))
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
