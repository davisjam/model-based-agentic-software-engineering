--[[
figures.lua — render semantic figure blocks.

A figure is authored as a fenced Div carrying a stable id, an `alt` attribute (the accessibility
text), an image, and one or more caption paragraphs (omittable on an `.unnumbered` figure — a
captionless one renders as a plain alt-tagged illustration, with no caption element at all):

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
  * epub : a NATIVE Pandoc Figure/Image (same caption + alt), never raw HTML — Pandoc's ePub
           writer collects media into the container only from Image AST nodes, so a raw <img>
           would ship a dangling reference.

Two per-figure attributes modulate the defaults:
  * `.unnumbered` — an UNNUMBERED figure: no "Figure N." caption prefix, no claim on the figure
    counter (crossrefs.lua skips it), no `@fig-x` cross-reference (nothing resolves to a number).
    For orientation figures whose prose never points at them (the Introduction's).
  * `width="NN%"` — the rendered width in the PDF as a fraction of the text block (default 82%).

WRAPPED floats (PDF only). A figure Div — or a `.table` Div wrapping one captioned table — may
carry `wrap="right"` (+ optional `wrap-width="2.05in"`): the PDF renders it as a narrow right-hand
column with the FOLLOWING prose paragraphs flowing beside it, via the family's one side-float
engine (/book/typst/side-float.typ; the handbook caller is #hb-wrapped in typst/components.typ).
The Div handler tags the float's rendered Typst with a WRAP sentinel comment; the Blocks handler
then absorbs the run of following Para blocks (generously — the engine wraps only what covers the
float's height and returns the rest to the full measure) and emits one #hb-wrapped(...) call.
The web and ePub editions are reflowable and IGNORE the wrap attributes: a wrapped figure renders
as an ordinary figure, and a `.table` wrapper Div is unwrapped to its plain table.
]]

-- PDF wrap path: sentinel prefix the Div handler plants on a wrap-marked float's RawBlock; the
-- Blocks handler consumes it. Never reaches the output (Blocks strips it in the same Pandoc run).
local WRAP_SENTINEL = "// HB%-WRAP width=([%d%.]+in)\n"
local WRAP_DEFAULT_WIDTH = "2.05in"
-- Absorb following prose up to this budget: comfortably more than any float is tall (the engine
-- returns the surplus to the full measure), small enough to keep the generated call readable.
local WRAP_MAX_WORDS = 320

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
local function typst_src(src) return (src:gsub("^%.%./", "/handbook/")) end -- -> /handbook/figures/... (typst --root = catalogue root)
local function web_src(src)   return (src:gsub("^%.%./", "")) end    -- -> figures/... (copied next to md)

-- A block's body re-serialized by a fresh `pandoc.write` would re-emit a citeproc-resolved Cite as
-- a native `@key` (and the typst PDF then fails on a label with no bibliography). Unwrap every Cite
-- to its resolved content first — the same guard handbook-components.lua applies to callout bodies.
local function resolve_cites(blocks)
  return pandoc.walk_block(pandoc.Div(blocks), {
    Cite = function(c) return c.content end,
  }).content
end

local function wrap_sentinel(el)
  return "// HB-WRAP width=" .. (el.attributes["wrap-width"] or WRAP_DEFAULT_WIDTH) .. "\n"
end

function Div(el)
  -- A `.table` Div exists only to modulate ONE captioned table (today: `wrap="right"`). The PDF
  -- wrap path tags the pandoc-rendered table with the WRAP sentinel for the Blocks handler; every
  -- other path (web, ePub, an unmarked Div) unwraps it to its plain content.
  if el.classes:includes("table") then
    if FORMAT == "typst" and el.attributes["wrap"] == "right" then
      local body = pandoc.write(pandoc.Pandoc(resolve_cites(el.content)), "typst"):gsub("%s+$", "")
      return pandoc.RawBlock("typst", wrap_sentinel(el) .. body)
    end
    return el.content
  end

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
  local wrapped = el.attributes["wrap"] == "right"
  -- In wrap mode the image spans its narrow box column, so the authored default is the full cell.
  local width = el.attributes["width"] or (wrapped and "100%" or "82%")

  local has_caption = #caption_inlines > 0

  if FORMAT == "typst" then
    local parts = {
      "#hb-figure(",
      '  image("' .. typst_src(image.src) .. '", alt: "' .. alt:gsub('"', '\\"') .. '", width: ' .. width .. "),",
    }
    if has_caption then
      local cap = pandoc.write(pandoc.Pandoc({ pandoc.Plain(caption_inlines) }), "typst"):gsub("%s+$", "")
      table.insert(parts, "  caption: [" .. cap .. "],")
    end
    if unnumbered then table.insert(parts, "  numbered: false,") end
    table.insert(parts, ")" .. (el.identifier ~= "" and (" <" .. el.identifier .. ">") or ""))
    local rendered = table.concat(parts, "\n")
    if wrapped then rendered = wrap_sentinel(el) .. rendered end
    return pandoc.RawBlock("typst", rendered)
  elseif FORMAT:match("^epub") then
    -- The authored `../figures/…` src is kept as-is; build.py's --resource-path resolves it and
    -- the ePub writer embeds the file. The Image's own caption carries the alt text.
    local num = (not unnumbered) and el.attributes["data-number"] or nil
    local img = pandoc.Image({ pandoc.Str(alt) }, image.src)
    if not (has_caption or num) then
      return pandoc.Para({ img })
    end
    local cap = {}
    if num then
      table.insert(cap, pandoc.Strong({ pandoc.Str("Figure " .. num .. ".") }))
      table.insert(cap, pandoc.Space())
    end
    for _, inl in ipairs(caption_inlines) do table.insert(cap, inl) end
    return pandoc.Figure(pandoc.Plain({ img }), { pandoc.Plain(cap) }, pandoc.Attr(el.identifier))
  else
    local num = (not unnumbered) and el.attributes["data-number"] or nil
    local label = num and ("Figure " .. num .. ". ") or ""
    -- A wrap-marked (print-narrow) figure is drawn for a ~2in column; the web edition ignores the
    -- wrap but must not stretch the narrow artwork to the full content column (hb-narrow caps it).
    local classes = wrapped and "handbook-figure hb-narrow" or "handbook-figure"
    local lines = {
      '<figure id="' .. el.identifier .. '" class="' .. classes .. '">',
      '<img src="' .. web_src(image.src) .. '" alt="' .. alt:gsub('"', "&quot;") .. '">',
    }
    if has_caption or label ~= "" then
      local cap_html = pandoc.write(pandoc.Pandoc({ pandoc.Plain(caption_inlines) }), "html"):gsub("%s+$", "")
      table.insert(lines, "<figcaption>" .. label .. cap_html .. "</figcaption>")
    end
    table.insert(lines, "</figure>")
    local html = table.concat(lines, "\n")
    return pandoc.RawBlock(FORMAT, html)
  end
end

-- PDF wrap assembly. Element filters run before list filters, so by the time this sees a block
-- list every wrap-marked float is already a sentinel-tagged RawBlock (Div handlers above). For
-- each, absorb the run of immediately following Para blocks (up to WRAP_MAX_WORDS — the engine
-- wraps only what covers the float's height and returns the surplus to the full measure) and
-- emit the one #hb-wrapped(...) call. Anything other than a Para (a heading, a table, a callout)
-- ends the absorbed run: only plain prose flows beside a wrapped float.
local function indent(s)
  return (s:gsub("\n", "\n  "))
end

function Blocks(blocks)
  if FORMAT ~= "typst" then return nil end
  local out = pandoc.Blocks({})
  local i = 1
  while i <= #blocks do
    local b = blocks[i]
    local width = (b.t == "RawBlock" and b.format == "typst") and b.text:match("^" .. WRAP_SENTINEL) or nil
    if width then
      local fixed = b.text:gsub("^" .. WRAP_SENTINEL, "")
      local absorbed, words = {}, 0
      local j = i + 1
      while j <= #blocks and blocks[j].t == "Para" and words < WRAP_MAX_WORDS do
        table.insert(absorbed, blocks[j])
        local _, n = pandoc.utils.stringify(blocks[j]):gsub("%S+", "")
        words = words + n
        j = j + 1
      end
      local prose = pandoc.write(pandoc.Pandoc(resolve_cites(absorbed)), "typst"):gsub("%s+$", "")
      out:insert(pandoc.RawBlock("typst", table.concat({
        "#hb-wrapped([",
        "  " .. indent(fixed),
        "], wrapped: [",
        "  " .. indent(prose),
        "], box-width: " .. width .. ")",
      }, "\n")))
      i = j
    else
      out:insert(b)
      i = i + 1
    end
  end
  return out
end
