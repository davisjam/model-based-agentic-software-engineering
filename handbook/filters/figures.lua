--[[
figures.lua — render semantic figure blocks.

A figure is authored as a fenced Div carrying a stable id, an `alt` attribute (the accessibility
text), an image, and one or more caption paragraphs:

    ::: {.figure #fig-x alt="description of the image for a screen reader"}
    ![](../figures/area/name.svg)

    The visible caption, which may contain *emphasis*.
    :::

Alt text and caption are kept structurally distinct, per the accessibility requirement. This filter
runs AFTER citeproc. It emits:
  * typst: a native `#figure(...)` with the image `alt:` set (tagged-PDF accessibility) and a label,
           so Typst owns figure numbering and `@fig-x` references resolve to it.
  * web  : a semantic <figure>/<figcaption> with the id as an anchor and "Figure N." prepended,
           where N is the number crossrefs.lua computed and stashed in `data-number`.

Two per-figure attributes modulate the defaults:
  * `.unnumbered` — an UNNUMBERED figure: no "Figure N." caption prefix, no claim on the figure
    counter (crossrefs.lua skips it), no `@fig-x` cross-reference (nothing resolves to a number).
    For orientation figures whose prose never points at them (the Introduction's).
  * `width="NN%"` — the rendered width in the PDF as a fraction of the text block (default 82%).
]]

local function split_image_and_caption(blocks)
  local image, caption = nil, {}
  for _, blk in ipairs(blocks) do
    local found_here = nil
    if blk.t == "Para" or blk.t == "Plain" then
      for _, inl in ipairs(blk.content) do
        if inl.t == "Image" then found_here = inl; break end
      end
    end
    if found_here and not image then
      image = found_here
    else
      table.insert(caption, blk)
    end
  end
  return image, caption
end

-- Normalize the authored image path (relative to chapters/) for each renderer's root.
local function typst_src(src) return (src:gsub("^%.%./", "/")) end   -- -> /figures/...
local function web_src(src)   return (src:gsub("^%.%./", "")) end    -- -> figures/... (copied next to md)

function Div(el)
  if not el.classes:includes("figure") then return nil end

  local image, caption = split_image_and_caption(el.content)
  if image == nil then return nil end -- malformed; the linter reports this, leave for inspection

  local alt = el.attributes["alt"] or ""
  local caption_inlines = {}
  for _, blk in ipairs(caption) do
    if blk.content then
      for _, inl in ipairs(blk.content) do table.insert(caption_inlines, inl) end
    end
  end

  local unnumbered = el.classes:includes("unnumbered")
  local width = el.attributes["width"] or "82%"

  if FORMAT == "typst" then
    local cap = pandoc.write(pandoc.Pandoc({ pandoc.Plain(caption_inlines) }), "typst"):gsub("%s+$", "")
    local parts = {
      "#hb-figure(",
      '  image("' .. typst_src(image.src) .. '", alt: "' .. alt:gsub('"', '\\"') .. '", width: ' .. width .. "),",
      "  caption: [" .. cap .. "],",
    }
    if unnumbered then table.insert(parts, "  numbered: false,") end
    table.insert(parts, ")" .. (el.identifier ~= "" and (" <" .. el.identifier .. ">") or ""))
    return pandoc.RawBlock("typst", table.concat(parts, "\n"))
  else
    local cap_html = pandoc.write(pandoc.Pandoc({ pandoc.Plain(caption_inlines) }), "html"):gsub("%s+$", "")
    local num = (not unnumbered) and el.attributes["data-number"] or nil
    local label = num and ("Figure " .. num .. ". ") or ""
    local html = table.concat({
      '<figure id="' .. el.identifier .. '" class="handbook-figure">',
      '<img src="' .. web_src(image.src) .. '" alt="' .. alt:gsub('"', "&quot;") .. '">',
      "<figcaption>" .. label .. cap_html .. "</figcaption>",
      "</figure>",
    }, "\n")
    return pandoc.RawBlock(FORMAT, html)
  end
end
