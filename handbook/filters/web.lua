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
