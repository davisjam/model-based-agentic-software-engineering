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

-- READ FURTHER: the curated end-of-chapter reading list. Not a callout — it renders as a QUIET box
-- (no tint, no left rule), a set of hanging-indent bibliographic entries under a small "READ FURTHER"
-- label. Both spellings accepted; `read_further` is canonical (keep in sync with _common.py).
local READ_FURTHER = { read_further = true, ["read-further"] = true }

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

-- A block's body is re-serialized here by a fresh `pandoc.write`, which does NOT know citeproc ran
-- earlier in the pipeline: it would re-emit a resolved bibliographic Cite as a native `@key`, and
-- the typst PDF then fails on a label that has no bibliography. citeproc has already populated each
-- Cite's `.content` with the formatted citation inlines, so unwrap every Cite to that content before
-- writing. Cross-reference cites (@fig/@sec) are already RawInlines by this point (crossrefs.lua), so
-- only real bibliographic cites remain — unwrapping them yields exactly the rendered citation text.
local function resolve_cites(content)
  return pandoc.walk_block(pandoc.Div(content), {
    Cite = function(c) return c.content end,
  }).content
end

function Div(el)
  -- READ FURTHER first: a distinct component, rendered as a quiet box (PDF) / quiet admonition (web).
  -- The entries are ordinary paragraphs — one bibliographic citation plus a short "why read this"
  -- sentence — so there are no numbered [1] citations; the renderer supplies the hanging indent.
  for _, c in ipairs(el.classes) do
    if READ_FURTHER[c] then
      local content = resolve_cites(el.content)
      if FORMAT == "typst" then
        local body = pandoc.write(pandoc.Pandoc(content), "typst"):gsub("%s+$", "")
        return pandoc.RawBlock("typst", "#hb-read-further[\n" .. body .. "\n]")
      else
        local body = pandoc.write(pandoc.Pandoc(content), "gfm"):gsub("%s+$", "")
        local adm = '!!! read-further "Read Further"\n\n' .. indent(body) .. "\n"
        return pandoc.RawBlock(FORMAT, adm)
      end
    end
  end

  local kind = nil
  for _, c in ipairs(el.classes) do
    if CALLOUTS[c] then kind = c; break end
  end
  if not kind then return nil end

  -- Use the author's explicit title if given; otherwise let the renderer show the kind label alone.
  local title = el.attributes["title"]
  local content = resolve_cites(el.content)

  if FORMAT == "typst" then
    local body = pandoc.write(pandoc.Pandoc(content), "typst"):gsub("%s+$", "")
    local title_arg = title and ('"' .. title:gsub('"', '\\"') .. '"') or "none"
    local t = "#hb-callout(kind: \"" .. kind .. "\", title: " .. title_arg .. ")[\n"
      .. body .. "\n]"
    if el.identifier ~= "" then t = t .. "\n<" .. el.identifier .. ">" end
    return pandoc.RawBlock("typst", t)
  else
    local qualifier = WEB_QUALIFIER[kind] or kind
    local body = pandoc.write(pandoc.Pandoc(content), "gfm"):gsub("%s+$", "")
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
