--[[
typst.lua — PDF-target escape hatch and cleanup.

Presentation escape hatches (spec §15) are deliberately marked in the source and belong to exactly
one renderer. A `.raw-typst` Div carries Typst markup that must reach the PDF but means nothing to
the web; its sibling `.raw-html` belongs to the web. On the typst target this filter passes
`.raw-typst` through and drops `.raw-html`. It also strips any stray raw-HTML that leaked toward the
PDF, which Typst cannot render.

No-op unless the typst writer is active.
]]

if FORMAT ~= "typst" then return {} end

function Div(el)
  if el.classes:includes("raw-typst") then
    return pandoc.RawBlock("typst", pandoc.utils.stringify(el.content))
  end
  if el.classes:includes("raw-html") then
    return {} -- web-only escape hatch; absent from the PDF
  end
  return nil
end

-- A `.coda` heading gets the stable identifier the print template keys on: pandoc emits the
-- identifier as the heading's Typst label, and handbook.typ's level-2 show-rule renders the
-- "Coda: " prefix of an <hb-coda>-labeled heading in the chapter-eyebrow label face. The web
-- projection keeps the pandoc-derived identifier; this filter runs only on the typst target.
function Header(el)
  if el.classes:includes("coda") then
    el.identifier = "hb-coda"
    return el
  end
  return nil
end

function RawBlock(el)
  if el.format == "html" then return {} end
  return nil
end

function RawInline(el)
  if el.format == "html" then return {} end
  return nil
end
