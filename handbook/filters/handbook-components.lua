--[[
handbook-components.lua — render the semantic callout vocabulary.

The canonical manuscript names MEANING, not presentation: a block is a definition, a decision, a
tradeoff. This filter turns each semantic Div into the renderer-specific presentation:
  * typst: a call to a template function `#hb-callout(kind: ..., title: ...)[ body ]`, with a label
           so the block can be cross-referenced. The Typst template decides what a "decision" looks
           like (a lightly ruled, titled block); the manuscript never says "draw a gray box".
  * web  : a Material admonition `!!! <kind> "Title"` with the body indented four spaces. Custom
           kinds (definition, decision, tradeoff, case-study, key-idea, exercise) are styled by the
           handbook stylesheet; built-in kinds (note, warning, example, quote) use the theme default.

`figure` and `table` are handled by figures.lua / the native table path, not here.
]]

-- The deliberately small, closed vocabulary (keep in sync with scripts/lint.py KNOWN_BLOCKS).
local CALLOUTS = {
  definition = true, example = true, ["case-study"] = true, decision = true,
  tradeoff = true, warning = true, note = true, exercise = true,
  ["code-example"] = true, quotation = true, ["key-idea"] = true, ["mage-moment"] = true,
}

-- Web admonition qualifier per kind (Material built-ins reused where they fit).
local WEB_QUALIFIER = {
  quotation = "quote", ["code-example"] = "example",
}

local function titlecase(kind)
  local words = {}
  for w in kind:gmatch("[^%-]+") do
    words[#words + 1] = w:sub(1, 1):upper() .. w:sub(2)
  end
  return table.concat(words, " ")
end

local function indent(md)
  local lines = {}
  for line in (md .. "\n"):gmatch("(.-)\n") do
    if line == "" then lines[#lines + 1] = "" else lines[#lines + 1] = "    " .. line end
  end
  return table.concat(lines, "\n")
end

function Div(el)
  local kind = nil
  for _, c in ipairs(el.classes) do
    if CALLOUTS[c] then kind = c; break end
  end
  if not kind then return nil end

  -- Use the author's explicit title if given; otherwise let the renderer show the kind label alone.
  local title = el.attributes["title"]

  if FORMAT == "typst" then
    local body = pandoc.write(pandoc.Pandoc(el.content), "typst"):gsub("%s+$", "")
    local title_arg = title and ('"' .. title:gsub('"', '\\"') .. '"') or "none"
    local t = "#hb-callout(kind: \"" .. kind .. "\", title: " .. title_arg .. ")[\n"
      .. body .. "\n]"
    if el.identifier ~= "" then t = t .. "\n<" .. el.identifier .. ">" end
    return pandoc.RawBlock("typst", t)
  else
    local qualifier = WEB_QUALIFIER[kind] or kind
    local body = pandoc.write(pandoc.Pandoc(el.content), "gfm"):gsub("%s+$", "")
    local heading = title and (' "' .. title:gsub('"', '\\"') .. '"') or (' "' .. titlecase(kind) .. '"')
    local adm = '!!! ' .. qualifier .. heading .. '\n\n' .. indent(body) .. "\n"
    local blocks = {}
    if el.identifier ~= "" then
      blocks[#blocks + 1] = pandoc.RawBlock(FORMAT, '<a id="' .. el.identifier .. '"></a>')
    end
    blocks[#blocks + 1] = pandoc.RawBlock(FORMAT, adm)
    return blocks
  end
end
